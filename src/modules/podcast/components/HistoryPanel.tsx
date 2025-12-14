import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { Dossier, Project } from '../types';
import { X, Clock, User, Search, Loader2, Trash2, Calendar, MapPin } from 'lucide-react';
import { listProjects, deleteProject, listProjectsBySeason, listProjectsByStudio } from '../services/databaseService';

interface Props {
    onClose: () => void;
    onLoadDossier: (dossier: Dossier, projectId: string) => void;
}

const HistoryPanel: React.FC<Props> = ({ onClose, onLoadDossier }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);

    // Filter state
    const [filterMode, setFilterMode] = useState<'all' | 'season' | 'studio'>('all');
    const [selectedSeason, setSelectedSeason] = useState('');
    const [selectedStudio, setSelectedStudio] = useState('');

    // Get unique seasons and studios from projects
    const uniqueSeasons = Array.from(new Set(projects.map(p => p.season).filter(Boolean)));
    const uniqueStudios = Array.from(new Set(projects.map(p => p.location).filter(Boolean)));

    useEffect(() => {
        loadProjects();
    }, [filterMode, selectedSeason, selectedStudio]);

    const loadProjects = async () => {
        setLoading(true);
        try {
            let data: Project[];
            if (filterMode === 'season' && selectedSeason) {
                data = await listProjectsBySeason(selectedSeason, 50);
            } else if (filterMode === 'studio' && selectedStudio) {
                data = await listProjectsByStudio(selectedStudio, 50);
            } else {
                data = await listProjects(50);
            }
            setProjects(data);
        } catch (err) {
            console.error('Failed to load projects:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este projeto?')) return;

        setDeleting(id);
        try {
            await deleteProject(id);
            setProjects(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            console.error('Failed to delete project:', err);
            alert('Erro ao excluir projeto');
        } finally {
            setDeleting(null);
        }
    };

    const filteredProjects = projects.filter(p =>
        p.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.episode_theme.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const convertProjectToDossier = (project: Project): Dossier => {
        return {
            guestName: project.guest_name,
            episodeTheme: project.episode_theme,
            biography: project.biography,
            controversies: project.controversies || [],
            suggestedTopics: [], // Topics are loaded separately when entering studio
            iceBreakers: project.ice_breakers || []
        };
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <Clock className="w-6 h-6 mr-3 text-indigo-500" />
                        Histórico de Projetos
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-6 border-b border-zinc-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nome do convidado ou tema..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="px-6 pt-4 border-b border-zinc-800">
                    <div className="flex items-center gap-2 mb-3">
                        <button
                            onClick={() => { setFilterMode('all'); setSelectedSeason(''); setSelectedStudio(''); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterMode === 'all' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilterMode('season')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterMode === 'season' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                        >
                            Por Temporada
                        </button>
                        <button
                            onClick={() => setFilterMode('studio')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterMode === 'studio' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                        >
                            Por Estúdio
                        </button>
                    </div>

                    {/* Filter Dropdowns */}
                    {filterMode === 'season' && (
                        <div className="mb-3">
                            <select
                                value={selectedSeason}
                                onChange={e => setSelectedSeason(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Selecione uma temporada...</option>
                                {uniqueSeasons.map(season => (
                                    <option key={season} value={season as string}>{season}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {filterMode === 'studio' && (
                        <div className="mb-3">
                            <select
                                value={selectedStudio}
                                onChange={e => setSelectedStudio(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Selecione um estúdio...</option>
                                {uniqueStudios.map(studio => (
                                    <option key={studio} value={studio as string}>{studio}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-zinc-500">
                                {searchTerm ? 'Sem resultados' : 'Sem projetos'}
                            </p>
                        </div>
                    ) : (
                        filteredProjects.map((project) => (
                            <div
                                key={project.id}
                                className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 hover:border-indigo-500/50 transition-all group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <div className="h-10 w-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                                                <User className="h-5 w-5 text-indigo-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-semibold">{project.guest_name}</h3>
                                                <p className="text-xs text-zinc-500">{project.episode_theme}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-4 mt-3">
                                            <p className="text-xs text-zinc-600 flex items-center">
                                                <Clock className="w-3 h-3 mr-1" />
                                                Criado em: {formatDate(project.created_at)}
                                            </p>

                                            {project.scheduled_date && (
                                                <p className="text-xs text-emerald-500 flex items-center">
                                                    <Calendar className="w-3 h-3 mr-1" />
                                                    Agendado: {formatDate(project.scheduled_date)}
                                                </p>
                                            )}

                                            {project.location && (
                                                <p className="text-xs text-zinc-400 flex items-center">
                                                    <MapPin className="w-3 h-3 mr-1" />
                                                    {project.location}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => {
                                                onLoadDossier(convertProjectToDossier(project), project.id);
                                                onClose();
                                            }}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            Abrir
                                        </button>
                                        <button
                                            onClick={() => handleDelete(project.id)}
                                            disabled={deleting === project.id}
                                            className="p-2 hover:bg-red-900/20 text-red-400 hover:text-red-300 rounded-lg transition-colors disabled:opacity-50"
                                            title="Excluir"
                                        >
                                            {deleting === project.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistoryPanel;
