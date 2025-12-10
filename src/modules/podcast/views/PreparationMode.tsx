import React, { useState, useEffect } from 'react';
import { Search, User, MessageSquare, Zap, Loader2, ArrowRight, Clock, Calendar, Hash, MapPin, Sparkles, Wand2 } from 'lucide-react';
import { generateDossier, suggestTrendingTheme, suggestTrendingGuest } from '../services/geminiService';
import { createProject, updateProject, listProjects } from '../services/databaseService';
import { getTopics, createTopic } from '../services/databaseService';
import { Dossier, Project } from '../types';
import { TeamMemberForm } from '../components/TeamMemberForm';
import HistoryPanel from '../components/HistoryPanel';

interface Props {
  onDossierReady: (dossier: Dossier, projectId: string) => void;
  onGoToStudio: (projectId: string) => void;
  currentProjectId?: string | null;
}

const PreparationMode: React.FC<Props> = ({ onDossierReady, onGoToStudio, currentProjectId }) => {
  const [guestName, setGuestName] = useState('');
  const [theme, setTheme] = useState('');

  // Scheduling State
  const [season, setSeason] = useState('1');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [location, setLocation] = useState('Rádio Tupi');
  const [customLocation, setCustomLocation] = useState('');

  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestingGuest, setSuggestingGuest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedDossier, setSavedDossier] = useState<{ guest: string, theme: string, projectId?: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [scheduledProjects, setScheduledProjects] = useState<Project[]>([]);

  useEffect(() => {
    loadScheduledProjects();
    const saved = localStorage.getItem('aica_latest_dossier');
    // Support both new (episode_id) and legacy (project_id) localStorage keys
    const savedEpisodeId = localStorage.getItem('aica_latest_episode_id') || localStorage.getItem('aica_latest_project_id');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.guestName) {
          setSavedDossier({
            guest: parsed.guestName,
            theme: parsed.episodeTheme || 'Geral',
            projectId: savedEpisodeId || undefined
          });
        }
      } catch (e) {
        // Ignore malformed data
      }
    }
  }, []);

  const loadScheduledProjects = async () => {
    try {
      const allProjects = await listProjects(100);
      // Filter for projects that have a scheduled date
      const scheduled = allProjects.filter(p => p.scheduled_date).sort((a, b) =>
        new Date(a.scheduled_date!).getTime() - new Date(b.scheduled_date!).getTime()
      );
      setScheduledProjects(scheduled);
    } catch (err) {
      console.error("Error loading scheduled projects", err);
    }
  };

  const handleSuggestGuest = async () => {
    setSuggestingGuest(true);
    setError(null);
    try {
      const suggested = await suggestTrendingGuest();
      if (suggested) {
        setGuestName(suggested);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSuggestingGuest(false);
    }
  };

  const handleSuggestTheme = async () => {
    if (!guestName) {
      setError("Preencha o nome do convidado para sugerir um tema.");
      return;
    }
    setSuggesting(true);
    setError(null);
    try {
      const suggested = await suggestTrendingTheme(guestName);
      if (suggested) {
        setTheme(suggested);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSuggesting(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Check if project already exists
      const existingProjects = await listProjects(100);
      const existingProject = existingProjects.find(p =>
        p.guest_name?.toLowerCase() === guestName.toLowerCase()
      );

      let projectId = existingProject?.id;
      let pauta: Dossier;

      // 2. Generate pauta with AI
      pauta = await generateDossier(guestName, theme);

      const finalLocation = location === 'Outro' ? customLocation : location;
      const scheduledDateTime = (scheduledDate && scheduledTime) ? `${scheduledDate}T${scheduledTime}:00` : undefined;

      if (existingProject) {
        // Update existing project
        projectId = existingProject.id;
        await updateProject(projectId, {
          title: `${pauta.guestName} - ${pauta.episodeTheme}`,
          episode_theme: pauta.episodeTheme,
          biography: pauta.biography,
          controversies: pauta.controversies,
          ice_breakers: pauta.iceBreakers || [],
          season: season,
          scheduled_date: scheduledDateTime,
          location: finalLocation,
          updated_at: new Date().toISOString()
        });

        // We might want to add new topics or keep existing ones. 
        // For now, let's assume we keep existing topics if they exist, or add new ones if empty.
        const existingTopics = await getTopics(projectId);
        if (existingTopics.length === 0) {
          const topicPromises = pauta.suggestedTopics.map((topicText, index) =>
            createTopic(projectId!, {
              text: topicText,
              order: index,
              completed: false,
              archived: false
            })
          );
          await Promise.all(topicPromises);
        }

      } else {
        // Create new project
        const project = await createProject({
          title: `${pauta.guestName} - ${pauta.episodeTheme}`,
          guest_name: pauta.guestName,
          episode_theme: pauta.episodeTheme,
          biography: pauta.biography,
          controversies: pauta.controversies,
          ice_breakers: pauta.iceBreakers || [],
          status: 'draft',
          season: season,
          scheduled_date: scheduledDateTime,
          location: finalLocation
        });
        projectId = project.id;

        // Create initial topics
        const topicPromises = pauta.suggestedTopics.map((topicText, index) =>
          createTopic(projectId!, {
            text: topicText,
            order: index,
            completed: false,
            archived: false
          })
        );
        await Promise.all(topicPromises);
      }

      // 4. Save to localStorage (using new episode_id key)
      try {
        localStorage.setItem('aica_latest_episode_id', projectId!);
        localStorage.setItem('aica_latest_dossier', JSON.stringify(pauta));
        // Clean up legacy key if it exists
        localStorage.removeItem('aica_latest_project_id');
      } catch (e) {
        console.error("Could not save to local storage", e);
      }

      // 5. Navigate to Studio mode
      onDossierReady(pauta, projectId!);
    } catch (err: any) {
      console.error("Full error:", err);
      setError(`Falha ao gerar a pauta: ${err.message || "Verifique sua conexão e tente novamente."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSaved = () => {
    if (savedDossier && savedDossier.projectId) {
      const saved = localStorage.getItem('aica_latest_dossier');
      if (saved) {
        onDossierReady(JSON.parse(saved), savedDossier.projectId);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0EFE9] p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-[#5C554B] rounded-2xl flex items-center justify-center">
              <Zap className="h-6 w-6 text-[#F0EFE9]" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-ceramic-text-primary text-etched">
            Copiloto Uai, Ana!
          </h1>
          <p className="text-[#5C554B] text-lg">
            Modo de Preparação & Deep Research
          </p>
        </div>

        <section className="ceramic-tray p-8 rounded-[40px] border border-white/40 space-y-6">
          <form onSubmit={handleGenerate} className="space-y-6">

            {/* Guest Input */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="guest" className="block text-sm font-medium text-ceramic-text-secondary">
                  Nome do Convidado
                </label>
                <span className="text-xs text-[#948D82]">IA Auto-Complete</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-[#5C554B]" />
                </div>
                <input
                  id="guest"
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 bg-[#EBE9E4] rounded-xl shadow-[inset_4px_4px_8px_rgba(163,158,145,0.25),inset_-4px_-4px_8px_rgba(255,255,255,1.0)] border-none text-[#5C554B] placeholder:text-[#948D82] focus:ring-2 focus:ring-[#5C554B] transition-all"
                  placeholder="Ex: Eduardo Paes, Sam Altman..."
                />
                <button
                  type="button"
                  onClick={handleSuggestGuest}
                  disabled={suggestingGuest}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#5C554B] hover:text-[#948D82] disabled:opacity-30 transition-colors"
                  title="Sugerir convidado em alta"
                >
                  {suggestingGuest ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[#5C554B]" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Theme Input */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="theme" className="block text-sm font-medium text-ceramic-text-secondary">
                  Tema ou Contexto (Opcional)
                </label>
                <span className="text-xs text-[#948D82]">IA Auto-Complete</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MessageSquare className="h-5 w-5 text-[#5C554B]" />
                </div>
                <input
                  id="theme"
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 bg-[#EBE9E4] rounded-xl shadow-[inset_4px_4px_8px_rgba(163,158,145,0.25),inset_-4px_-4px_8px_rgba(255,255,255,1.0)] border-none text-[#5C554B] placeholder:text-[#948D82] focus:ring-2 focus:ring-[#5C554B] transition-all"
                  placeholder="Ex: Prefeito do Rio de Janeiro, Futuro da IA..."
                />
                <button
                  type="button"
                  onClick={handleSuggestTheme}
                  disabled={suggesting || !guestName}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#5C554B] hover:text-[#948D82] disabled:opacity-30 transition-colors"
                  title="Sugerir tema baseado em tendências"
                >
                  {suggesting ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[#5C554B]" />
                  ) : (
                    <Wand2 className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Scheduling Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-ceramic-text-secondary flex items-center">
                  <Hash className="w-4 h-4 mr-2 text-ceramic-text-secondary" />
                  Temporada
                </label>
                <input
                  type="text"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="block w-full px-4 py-2 bg-[#EBE9E4] rounded-xl shadow-[inset_4px_4px_8px_rgba(163,158,145,0.25),inset_-4px_-4px_8px_rgba(255,255,255,1.0)] border-none text-[#5C554B] placeholder:text-[#948D82] focus:ring-2 focus:ring-[#5C554B] transition-all"
                  placeholder="Ex: 1"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-ceramic-text-secondary flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-ceramic-text-secondary" />
                  Local
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="block w-full px-4 py-2 bg-[#EBE9E4] rounded-xl shadow-[inset_4px_4px_8px_rgba(163,158,145,0.25),inset_-4px_-4px_8px_rgba(255,255,255,1.0)] border-none text-[#5C554B] focus:ring-2 focus:ring-[#5C554B] transition-all"
                >
                  <option value="Rádio Tupi">Rádio Tupi</option>
                  <option value="Correio Braziliense">Correio Braziliense</option>
                  <option value="Estado de Minas">Estado de Minas</option>
                  <option value="Outro">Outro</option>
                </select>
                {location === 'Outro' && (
                  <input
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    className="block w-full mt-2 px-4 py-2 bg-[#EBE9E4] rounded-xl shadow-[inset_4px_4px_8px_rgba(163,158,145,0.25),inset_-4px_-4px_8px_rgba(255,255,255,1.0)] border-none text-[#5C554B] placeholder:text-[#948D82] focus:ring-2 focus:ring-[#5C554B] transition-all"
                    placeholder="Digite o local..."
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-ceramic-text-secondary flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-ceramic-text-secondary" />
                  Data
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="block w-full px-4 py-2 bg-[#EBE9E4] rounded-xl shadow-[inset_4px_4px_8px_rgba(163,158,145,0.25),inset_-4px_-4px_8px_rgba(255,255,255,1.0)] border-none text-[#5C554B] focus:ring-2 focus:ring-[#5C554B] transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-ceramic-text-secondary flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-ceramic-text-secondary" />
                  Horário
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="block w-full px-4 py-2 bg-[#EBE9E4] rounded-xl shadow-[inset_4px_4px_8px_rgba(163,158,145,0.25),inset_-4px_-4px_8px_rgba(255,255,255,1.0)] border-none text-[#5C554B] focus:ring-2 focus:ring-[#5C554B] transition-all"
                />
              </div>
            </div>

            {/* Team Members Section */}
            <div className="pt-4">
              <TeamMemberForm projectId={currentProjectId || ''} />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-100 border-none text-red-600 text-sm text-center shadow-[inset_2px_2px_4px_rgba(163,158,145,0.25)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-4 px-6 border-none text-base font-bold tracking-wide rounded-full text-[#5C554B] bg-[#F0EFE9] hover:bg-[#EBE9E4] focus:outline-none focus:ring-2 focus:ring-[#5C554B] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[6px_6px_12px_rgba(163,158,145,0.3),-6px_-6px_12px_rgba(255,255,255,1.0)] active:shadow-[inset_2px_2px_5px_rgba(163,158,145,0.3)]"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#5C554B]" />
                  Pesquisando e Gerando Pauta...
                </>
              ) : (
                <>
                  <Search className="-ml-1 mr-3 h-5 w-5 text-[#5C554B]" />
                  Gerar Pauta
                </>
              )}
            </button>
          </form>

          {/* Scheduled Interviews List */}
          {scheduledProjects.length > 0 && (
            <div className="mt-6 pt-6 animate-in fade-in slide-in-from-top-2">
              <h3 className="text-lg font-semibold text-[#5C554B] mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-[#5C554B]" />
                Entrevistas Agendadas (Temporada {season})
              </h3>
              <div className="space-y-3">
                {scheduledProjects.map(project => (
                  <div key={project.id} className="flex items-center justify-between p-4 bg-[#F0EFE9] rounded-2xl shadow-[5px_5px_15px_rgba(163,158,145,0.15),-5px_-5px_15px_rgba(255,255,255,0.8)] mb-4 border-none hover:shadow-[7px_7px_20px_rgba(163,158,145,0.2),-7px_-7px_20px_rgba(255,255,255,0.9)] transition-all cursor-pointer"
                    onClick={() => {
                      // Construct a partial dossier from project data to open it
                      const dossier: Dossier = {
                        guestName: project.guest_name,
                        episodeTheme: project.episode_theme,
                        biography: project.biography,
                        controversies: project.controversies,
                        suggestedTopics: [], // Will be loaded in Studio
                        iceBreakers: project.ice_breakers
                      };
                      onDossierReady(dossier, project.id);
                    }}
                  >
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-[#EBE9E4] rounded-full flex items-center justify-center mr-3 text-[#5C554B] font-bold shadow-[inset_2px_2px_4px_rgba(163,158,145,0.25)]">
                        {new Date(project.scheduled_date!).getDate()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#5C554B]">{project.guest_name}</p>
                        <p className="text-xs text-[#948D82] flex items-center">
                          <Clock className="w-3 h-3 mr-1 text-[#5C554B]" />
                          {formatDate(project.scheduled_date!)}
                          <span className="mx-2">•</span>
                          <MapPin className="w-3 h-3 mr-1 text-[#5C554B]" />
                          {project.location}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#5C554B]" />
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>

        <div className="text-center text-xs text-[#5C554B]">
          Powered by Google Gemini 1.5 Pro
        </div>

        {/* History Button */}
        <div className="text-center mt-4">
          <button
            onClick={() => setShowHistory(true)}
            className="inline-flex items-center px-4 py-2 bg-[#F0EFE9] hover:bg-[#EBE9E4] text-[#5C554B] text-sm font-medium rounded-xl transition-all shadow-[4px_4px_8px_rgba(163,158,145,0.2),-4px_-4px_8px_rgba(255,255,255,0.9)] hover:shadow-[6px_6px_12px_rgba(163,158,145,0.3),-6px_-6px_12px_rgba(255,255,255,1.0)]"
          >
            <Clock className="w-4 h-4 mr-2" />
            Ver Histórico Completo
          </button>
        </div>
      </div>

      {/* History Panel Modal */}
      {showHistory && (
        <HistoryPanel
          onClose={() => setShowHistory(false)}
          onLoadDossier={(dossier, projectId) => {
            onDossierReady(dossier, projectId);
            setShowHistory(false);
          }}
        />
      )}
    </div>
  );
};

export default PreparationMode;