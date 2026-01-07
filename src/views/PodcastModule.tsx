import React, { useState } from 'react';
import { Mic, Calendar, CheckCircle2, FileText, Sparkles, X, Play, MoreVertical, Search, Headphones } from 'lucide-react';
import { HeaderGlobal } from '../components';

interface Episode {
    id: string;
    guest: string;
    topic: string;
    date: string;
    status: 'scheduled' | 'recorded' | 'published';
    questions: string[];
    research: { title: string; source: string }[];
}

const MOCK_EPISODES: Episode[] = [
    {
        id: '1',
        guest: 'Ana Silva',
        topic: 'Futuro da IA no Brasil',
        date: '2025-12-05',
        status: 'scheduled',
        questions: [
            'Como você vê a adoção de IA nas empresas brasileiras?',
            'Quais são os maiores desafios éticos hoje?',
            'O que podemos esperar para os próximos 5 anos?'
        ],
        research: [
            { title: 'Relatório de IA 2024 - Brasil', source: 'TechReport' },
            { title: 'Entrevista anterior da Ana sobre Ética', source: 'Podcast X' }
        ]
    },
    {
        id: '2',
        guest: 'Carlos Souza',
        topic: 'Sustentabilidade Corporativa',
        date: '2025-12-10',
        status: 'scheduled',
        questions: [],
        research: []
    },
    {
        id: '3',
        guest: 'Mariana Costa',
        topic: 'Liderança Feminina',
        date: '2025-11-20',
        status: 'published',
        questions: [],
        research: []
    }
];

interface PodcastModuleProps {
    userEmail?: string;
    onLogout: () => void;
    onBack: () => void;
}

export const PodcastModule: React.FC<PodcastModuleProps> = ({ userEmail, onLogout, onBack }) => {
    const [episodes, setEpisodes] = useState<Episode[]>(MOCK_EPISODES);
    const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
    const [newGuest, setNewGuest] = useState('');
    const [newTopic, setNewTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleCreateEpisode = () => {
        if (!newGuest || !newTopic) return;

        const newEpisode: Episode = {
            id: Date.now().toString(),
            guest: newGuest,
            topic: newTopic,
            date: new Date().toISOString().split('T')[0],
            status: 'scheduled',
            questions: [],
            research: []
        };

        setEpisodes([newEpisode, ...episodes]);
        setNewGuest('');
        setNewTopic('');
    };

    const handleGeneratePauta = async (episodeId: string) => {
        setIsGenerating(true);
        // Simulate AI generation
        await new Promise(resolve => setTimeout(resolve, 2000));

        setEpisodes(prev => prev.map(ep => {
            if (ep.id === episodeId) {
                return {
                    ...ep,
                    questions: [
                        `Pergunta gerada sobre ${ep.topic} 1`,
                        `Pergunta gerada sobre ${ep.topic} 2`,
                        `Pergunta gerada sobre ${ep.topic} 3`
                    ],
                    research: [
                        { title: `Artigo relevante sobre ${ep.topic}`, source: 'Web Search' }
                    ]
                };
            }
            return ep;
        }));
        setIsGenerating(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return 'bg-amber-400';
            case 'recorded': return 'bg-blue-400';
            case 'published': return 'bg-green-400';
            default: return 'bg-gray-400';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'scheduled': return 'Agendado';
            case 'recorded': return 'Gravado';
            case 'published': return 'Publicado';
            default: return status;
        }
    };

    return (
        <div className="h-screen w-full bg-[#F0EFE9] flex flex-col overflow-hidden font-sans text-[#5C554B]">
            <HeaderGlobal
                title="Copiloto de Podcast"
                subtitle="STUDIO"
                userEmail={userEmail}
                onLogout={onLogout}
            />

            <main className="flex-1 overflow-y-auto px-6 pb-32 pt-4 space-y-8">

                {/* 1. Input Area - New Episode */}
                <div className="ceramic-card p-6 bg-[#F0EFE9] shadow-card rounded-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-[#EBE9E4] shadow-inner flex items-center justify-center">
                            <Mic className="w-5 h-5 text-[#5C554B]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-[#5C554B] text-etched">Novo Episódio</h2>
                            <p className="text-xs text-[#5C554B]/70">Prepare a pauta para sua próxima gravação</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-[#5C554B]/70 ml-1">Convidado</label>
                            <input
                                type="text"
                                value={newGuest}
                                onChange={(e) => setNewGuest(e.target.value)}
                                placeholder="Nome do convidado..."
                                className="w-full p-4 bg-[#EBE9E4] shadow-inner rounded-xl text-[#5C554B] placeholder-[#5C554B]/40 border-none focus:ring-2 focus:ring-[#5C554B]/20 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-[#5C554B]/70 ml-1">Tema</label>
                            <input
                                type="text"
                                value={newTopic}
                                onChange={(e) => setNewTopic(e.target.value)}
                                placeholder="Sobre o que vão falar?"
                                className="w-full p-4 bg-[#EBE9E4] shadow-inner rounded-xl text-[#5C554B] placeholder-[#5C554B]/40 border-none focus:ring-2 focus:ring-[#5C554B]/20 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleCreateEpisode}
                            disabled={!newGuest || !newTopic}
                            className="px-6 py-3 bg-[#F0EFE9] shadow-soft active:shadow-inner rounded-xl text-[#5C554B] font-bold flex items-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Sparkles className="w-4 h-4" />
                            Criar Pauta
                        </button>
                    </div>
                </div>

                {/* 2. Episode List */}
                <div>
                    <h3 className="text-lg font-black text-[#5C554B] text-etched mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Episódios Agendados
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {episodes.map(episode => (
                            <div
                                key={episode.id}
                                onClick={() => setSelectedEpisode(episode)}
                                className="bg-[#F7F6F4] shadow-md rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-all group relative overflow-hidden"
                            >
                                {/* Status Dot */}
                                <div className="absolute top-4 right-4 flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C554B]/60">{getStatusLabel(episode.status)}</span>
                                    <div className={`w-2 h-2 rounded-full ${getStatusColor(episode.status)} shadow-[0_0_8px_rgba(0,0,0,0.1)]`}></div>
                                </div>

                                <div className="mt-2 mb-4">
                                    <h4 className="text-lg font-bold text-[#5C554B] line-clamp-1">{episode.guest}</h4>
                                    <p className="text-sm text-[#5C554B]/80 line-clamp-2 h-10">{episode.topic}</p>
                                </div>

                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#5C554B]/10">
                                    <div className="bg-[#E6E4DD] shadow-inner px-3 py-1 rounded-lg text-xs font-mono text-[#5C554B]">
                                        {new Date(episode.date).toLocaleDateString('pt-BR')}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-[#F0EFE9] shadow-soft flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronRight className="w-4 h-4 text-[#5C554B]" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* 3. Detail View Overlay (Paper on Table) */}
            {selectedEpisode && (
                <div className="fixed inset-0 z-50 bg-[#5C554B]/20 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
                    <div className="bg-[#F7F6F4] w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up relative">

                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedEpisode(null)}
                            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#EBE9E4] shadow-soft hover:shadow-inner flex items-center justify-center z-10 transition-all"
                        >
                            <X className="w-5 h-5 text-[#5C554B]" />
                        </button>

                        {/* Header */}
                        <div className="p-8 pb-4 border-b border-[#5C554B]/10 bg-[#F0EFE9]">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 rounded-full border border-[#5C554B]/20 text-xs font-bold uppercase tracking-wider text-[#5C554B]/70">
                                    Pauta de Gravação
                                </span>
                                <span className="text-xs font-mono text-[#5C554B]/50">ID: {selectedEpisode.id}</span>
                            </div>
                            <h2 className="text-3xl font-black text-[#5C554B] text-etched mb-1">{selectedEpisode.guest}</h2>
                            <p className="text-lg text-[#5C554B]/80 font-medium">{selectedEpisode.topic}</p>
                        </div>

                        {/* Content Scroll */}
                        <div className="flex-1 overflow-y-auto p-8 bg-[#F7F6F4]">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                                {/* Left Column: Questions */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-[#5C554B] flex items-center gap-2">
                                            <Mic className="w-5 h-5" />
                                            Roteiro de Perguntas
                                        </h3>
                                        <button
                                            onClick={() => handleGeneratePauta(selectedEpisode.id)}
                                            disabled={isGenerating}
                                            className="text-xs font-bold text-[#5C554B] hover:underline flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <Sparkles className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                                            {isGenerating ? 'Gerando...' : 'Gerar com IA'}
                                        </button>
                                    </div>

                                    {selectedEpisode.questions.length === 0 ? (
                                        <div className="p-8 rounded-2xl border-2 border-dashed border-[#5C554B]/10 text-center">
                                            <p className="text-[#5C554B]/50 text-sm">Nenhuma pergunta gerada ainda.</p>
                                            <button
                                                onClick={() => handleGeneratePauta(selectedEpisode.id)}
                                                className="mt-4 px-4 py-2 bg-[#EBE9E4] shadow-soft rounded-lg text-xs font-bold text-[#5C554B]"
                                            >
                                                Gerar Pauta Automática
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {selectedEpisode.questions.map((q, idx) => (
                                                <div key={idx} className="flex items-start gap-3 p-4 bg-white/50 rounded-xl hover:bg-white transition-colors group">
                                                    <div className="mt-1 w-5 h-5 rounded-full border-2 border-[#5C554B]/20 flex-shrink-0 cursor-pointer hover:border-[#5C554B] hover:bg-[#5C554B]/10 transition-all"></div>
                                                    <p className="text-[#5C554B] leading-relaxed">{q}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Right Column: Research */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-[#5C554B] flex items-center gap-2">
                                        <Search className="w-5 h-5" />
                                        Deep Research
                                    </h3>

                                    <div className="space-y-3">
                                        {selectedEpisode.research.length === 0 ? (
                                            <p className="text-sm text-[#5C554B]/50 italic">Nenhum material de apoio.</p>
                                        ) : (
                                            selectedEpisode.research.map((item, idx) => (
                                                <div key={idx} className="p-4 bg-[#EBE9E4] shadow-inner rounded-xl text-sm">
                                                    <p className="font-bold text-[#5C554B] mb-1 line-clamp-2">{item.title}</p>
                                                    <div className="flex items-center gap-1 text-[#5C554B]/60 text-xs">
                                                        <Globe className="w-3 h-3" />
                                                        {item.source}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Audio Player Placeholder */}
                                    <div className="mt-8 p-4 bg-[#5C554B] rounded-2xl text-[#F0EFE9] shadow-lg">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <Headphones className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase tracking-wider">Monitor</span>
                                            </div>
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                        </div>
                                        <div className="h-12 bg-[#F0EFE9]/10 rounded-lg flex items-center justify-center mb-2">
                                            <div className="flex gap-1 items-end h-6">
                                                {[...Array(10)].map((_, i) => (
                                                    <div key={i} className="w-1 bg-[#F0EFE9]/50 rounded-full animate-pulse" style={{ height: `${Math.random() * 100}%` }}></div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex justify-center gap-4">
                                            <button className="p-2 hover:bg-white/10 rounded-full transition-colors"><Play className="w-5 h-5 fill-current" /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper Icon
function ChevronRight({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}

function Globe({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    );
}
