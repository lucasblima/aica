/**
 * GuestPortalView — read-only episode portal for podcast guests
 *
 * Route: /meu-episodio
 * Mirrors the AthletePortalView (/meu-treino) pattern.
 * Shows episode info (title, theme, scheduled date, pauta topics) for
 * guests whose email matches their auth account via platform_contacts.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import { useMyContactProfiles } from '@/hooks/usePlatformContact';
import { createNamespacedLogger } from '@/lib/logger';
import {
  Loader2,
  ArrowLeft,
  Mic,
  Calendar,
  MapPin,
  FileText,
  CheckCircle,
  Circle,
} from 'lucide-react';

const log = createNamespacedLogger('GuestPortalView');

interface EpisodeData {
  id: string;
  title: string;
  episode_theme: string | null;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  location: string | null;
  guest_name: string | null;
  show_id: string;
}

interface TopicData {
  id: string;
  question_text: string;
  completed: boolean;
  order: number;
  category: string | null;
}

export default function GuestPortalView() {
  const navigate = useNavigate();
  const { profiles, isLoading: profilesLoading, error: profilesError } = useMyContactProfiles();

  const [episodes, setEpisodes] = useState<EpisodeData[]>([]);
  const [topics, setTopics] = useState<Record<string, TopicData[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch episodes linked to the guest's platform_contacts
  const fetchEpisodes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // guest_select_own_episodes RLS policy allows SELECT where
      // guest_contact_id links to platform_contacts.auth_user_id = auth.uid()
      const { data: episodeData, error: epError } = await supabase
        .from('podcast_episodes')
        .select('id, title, episode_theme, status, scheduled_date, scheduled_time, location, guest_name, show_id')
        .not('guest_contact_id', 'is', null)
        .order('created_at', { ascending: false });

      if (epError) {
        log.error('Error fetching episodes:', epError);
        setError('Erro ao carregar episodios');
        return;
      }

      if (!episodeData || episodeData.length === 0) {
        setEpisodes([]);
        return;
      }

      setEpisodes(episodeData);

      // Fetch topics for each episode
      const episodeIds = episodeData.map((ep) => ep.id);
      const { data: topicData, error: topicError } = await supabase
        .from('podcast_topics')
        .select('id, question_text, completed, order, category, episode_id')
        .in('episode_id', episodeIds)
        .order('order', { ascending: true });

      if (!topicError && topicData) {
        const grouped: Record<string, TopicData[]> = {};
        for (const topic of topicData) {
          const epId = (topic as any).episode_id;
          if (!grouped[epId]) grouped[epId] = [];
          grouped[epId].push(topic);
        }
        setTopics(grouped);
      }
    } catch (err) {
      log.error('GuestPortalView fetch error:', err);
      setError('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profilesLoading) {
      fetchEpisodes();
    }
  }, [profilesLoading, fetchEpisodes]);

  // Loading state
  if (isLoading || profilesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base">
        <Loader2 className="w-8 h-8 text-ceramic-text-secondary animate-spin mb-4" />
        <p className="text-sm text-ceramic-text-secondary">Carregando seus episodios...</p>
      </div>
    );
  }

  // No episodes found
  if (episodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base px-6">
        <div className="ceramic-card p-8 max-w-sm text-center space-y-4">
          <Mic className="w-12 h-12 text-ceramic-text-secondary mx-auto" />
          <h1 className="text-xl font-black text-ceramic-text-primary">Meu Episodio</h1>
          <p className="text-sm text-ceramic-text-secondary">
            {error || profilesError || 'Nenhum episodio vinculado a sua conta. Peca ao host para adicionar seu email no cadastro do episodio.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 mx-auto px-4 py-2 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-ceramic-base pb-16">
      {/* Header */}
      <div className="pt-8 px-6 pb-4">
        <button
          onClick={() => navigate('/')}
          className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          <div className="w-8 h-8 ceramic-inset flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
        </button>

        <div className="ceramic-card p-5 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎙️</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-ceramic-text-primary">
                Meus Episodios
              </h1>
              <p className="text-xs text-ceramic-text-secondary">
                Veja o que esta preparado para voce
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Episodes List */}
      <div className="px-6 space-y-4">
        {episodes.map((episode) => {
          const epTopics = topics[episode.id] || [];

          return (
            <div key={episode.id} className="ceramic-card p-5 space-y-4">
              {/* Episode header */}
              <div>
                <h2 className="text-lg font-bold text-ceramic-text-primary">
                  {episode.title}
                </h2>
                {episode.episode_theme && (
                  <p className="text-sm text-purple-600 font-medium mt-1">
                    {episode.episode_theme}
                  </p>
                )}
              </div>

              {/* Metadata badges */}
              <div className="flex flex-wrap gap-2">
                {episode.scheduled_date && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-ceramic-cool rounded text-xs text-ceramic-text-primary">
                    <Calendar className="w-3 h-3" />
                    {new Date(episode.scheduled_date + 'T00:00').toLocaleDateString('pt-BR')}
                    {episode.scheduled_time && ` as ${episode.scheduled_time}`}
                  </span>
                )}
                {episode.location && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-ceramic-cool rounded text-xs text-ceramic-text-primary">
                    <MapPin className="w-3 h-3" />
                    {episode.location}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                  episode.status === 'published'
                    ? 'bg-ceramic-success/20 text-ceramic-success'
                    : episode.status === 'recording'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-ceramic-cool text-ceramic-text-secondary'
                }`}>
                  {episode.status === 'draft' ? 'Em preparacao' :
                   episode.status === 'recording' ? 'Em gravacao' :
                   episode.status === 'published' ? 'Publicado' :
                   episode.status}
                </span>
              </div>

              {/* Topics / Pauta preview */}
              {epTopics.length > 0 && (
                <div className="pt-3 border-t border-ceramic-text-secondary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-ceramic-text-secondary" />
                    <h3 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                      Pauta ({epTopics.length} topicos)
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {epTopics.slice(0, 8).map((topic) => (
                      <div key={topic.id} className="flex items-center gap-2">
                        {topic.completed ? (
                          <CheckCircle className="w-3.5 h-3.5 text-ceramic-success flex-shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-ceramic-text-secondary flex-shrink-0" />
                        )}
                        <span className={`text-sm ${
                          topic.completed
                            ? 'text-ceramic-text-secondary line-through'
                            : 'text-ceramic-text-primary'
                        }`}>
                          {topic.question_text}
                        </span>
                      </div>
                    ))}
                    {epTopics.length > 8 && (
                      <p className="text-xs text-ceramic-text-secondary pl-5">
                        +{epTopics.length - 8} mais topicos
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
