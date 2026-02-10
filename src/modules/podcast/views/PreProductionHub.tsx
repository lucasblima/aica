/**
 * Pre-Production Hub Component
 *
 * Central hub for pre-production tasks before recording:
 * - Guest research review
 * - Pauta (outline) building
 * - Guest approval link generation and sending
 * - AI chat for supplementary research
 *
 * Workflow: GuestIdentificationWizard → PreProductionHub → ProductionMode
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  MessageSquare,
  Send,
  Mic,
  User,
  Calendar,
  Clock,
  MapPin,
} from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { GuestApprovalLinkDialog } from '../components/GuestApprovalLinkDialog';
import type { Dossier, Topic } from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('PreProductionHub');

// ============================================================================
// TYPES
// ============================================================================

interface GuestData {
  name: string;
  fullName?: string;
  title?: string;
  theme?: string;
  season?: string;
  location?: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

interface PreProductionHubProps {
  guestData: GuestData;
  projectId: string;
  onGoToProduction: (dossier: Dossier, projectId: string, topics: Topic[]) => void;
  onBack: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PreProductionHub: React.FC<PreProductionHubProps> = ({
  guestData,
  projectId,
  onGoToProduction,
  onBack,
}) => {
  // State
  const [isLoadingEpisode, setIsLoadingEpisode] = useState(true);
  const [episode, setEpisode] = useState<any>(null);
  const [guestResearch, setGuestResearch] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  // Load episode and research data
  useEffect(() => {
    loadEpisodeData();
  }, [projectId]);

  const loadEpisodeData = async () => {
    try {
      setIsLoadingEpisode(true);

      // Fetch episode
      const { data: episodeData, error: episodeError } = await supabase
        .from('podcast_episodes')
        .select('*')
        .eq('id', projectId)
        .single();

      if (episodeError) throw episodeError;
      setEpisode(episodeData);

      // Fetch guest research
      const { data: researchData, error: researchError } = await supabase
        .from('podcast_guest_research')
        .select('*')
        .eq('episode_id', projectId)
        .maybeSingle();

      if (researchError && researchError.code !== 'PGRST116') {
        throw researchError;
      }

      setGuestResearch(researchData);
    } catch (error) {
      log.error('Error loading episode data:', error);
    } finally {
      setIsLoadingEpisode(false);
    }
  };

  const handleSendApproval = () => {
    setShowApprovalDialog(true);
  };

  const handleCloseApprovalDialog = () => {
    setShowApprovalDialog(false);
  };

  const handleGoToProduction = () => {
    // Prepare dossier from episode data
    const dossier: Dossier = {
      guestName: guestData.name,
      episodeTheme: guestData.theme || 'Tema padrão',
      biography: episode?.biography || '',
      controversies: episode?.controversies || [],
      suggestedTopics: [],
      iceBreakers: episode?.ice_breakers || [],
      technicalSheet: episode?.technical_sheet || {},
    };

    // Prepare empty topics (will be generated in production mode)
    const topics: Topic[] = [];

    onGoToProduction(dossier, projectId, topics);
  };

  if (isLoadingEpisode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ceramic-base to-ceramic-cool flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-ceramic-text-secondary font-medium">Carregando episodio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ceramic-base to-ceramic-cool">
      {/* Header */}
      <div className="bg-ceramic-base border-b border-ceramic-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-ceramic-base rounded-lg transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5 text-ceramic-text-secondary" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-ceramic-text-primary">
                  Pre-Producao
                </h1>
                <p className="text-sm text-ceramic-text-secondary">
                  {guestData.name} • {guestData.theme || 'Sem tema definido'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSendApproval}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" />
                Enviar Aprovação
              </button>
              <button
                onClick={handleGoToProduction}
                className="px-4 py-2 bg-gradient-to-r from-ceramic-success to-ceramic-success/90 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                Ir para Gravação
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Guest Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Guest Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-ceramic-base rounded-2xl shadow-sm border border-ceramic-border p-6"
            >
              <h2 className="text-lg font-bold text-ceramic-text-primary mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-ceramic-info" />
                Informações do Convidado
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-ceramic-text-secondary uppercase tracking-wide">Nome</p>
                  <p className="text-sm font-medium text-ceramic-text-primary">{guestData.name}</p>
                </div>
                {guestData.fullName && (
                  <div>
                    <p className="text-xs text-ceramic-text-secondary uppercase tracking-wide">
                      Nome Completo
                    </p>
                    <p className="text-sm font-medium text-ceramic-text-primary">{guestData.fullName}</p>
                  </div>
                )}
                {guestData.title && (
                  <div>
                    <p className="text-xs text-ceramic-text-secondary uppercase tracking-wide">Título</p>
                    <p className="text-sm font-medium text-ceramic-text-primary">{guestData.title}</p>
                  </div>
                )}
                {episode?.guest_email && (
                  <div>
                    <p className="text-xs text-ceramic-text-secondary uppercase tracking-wide">Email</p>
                    <p className="text-sm font-medium text-ceramic-text-primary">{episode.guest_email}</p>
                  </div>
                )}
                {episode?.guest_phone && (
                  <div>
                    <p className="text-xs text-ceramic-text-secondary uppercase tracking-wide">Telefone</p>
                    <p className="text-sm font-medium text-ceramic-text-primary">{episode.guest_phone}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Episode Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-ceramic-base rounded-2xl shadow-sm border border-ceramic-border p-6"
            >
              <h2 className="text-lg font-bold text-ceramic-text-primary mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-ceramic-success" />
                Detalhes do Episódio
              </h2>
              <div className="space-y-3">
                {guestData.theme && (
                  <div>
                    <p className="text-xs text-ceramic-text-secondary uppercase tracking-wide">Tema</p>
                    <p className="text-sm font-medium text-ceramic-text-primary">{guestData.theme}</p>
                  </div>
                )}
                {guestData.season && (
                  <div>
                    <p className="text-xs text-ceramic-text-secondary uppercase tracking-wide">Temporada</p>
                    <p className="text-sm font-medium text-ceramic-text-primary">
                      Temporada {guestData.season}
                    </p>
                  </div>
                )}
                {guestData.scheduledDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-ceramic-text-tertiary" />
                    <div>
                      <p className="text-xs text-ceramic-text-secondary">
                        {new Date(guestData.scheduledDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}
                {guestData.scheduledTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-ceramic-text-tertiary" />
                    <p className="text-xs text-ceramic-text-secondary">{guestData.scheduledTime}</p>
                  </div>
                )}
                {guestData.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-ceramic-text-tertiary" />
                    <p className="text-xs text-ceramic-text-secondary">{guestData.location}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column: Research & Pauta */}
          <div className="lg:col-span-2 space-y-6">
            {/* Guest Research */}
            {guestResearch && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-ceramic-base rounded-2xl shadow-sm border border-ceramic-border p-6"
              >
                <h2 className="text-lg font-bold text-ceramic-text-primary mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-ceramic-accent" />
                  Pesquisa do Convidado
                </h2>
                {guestResearch.biography && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-ceramic-text-primary mb-2">Biografia</h3>
                    <p className="text-sm text-ceramic-text-secondary whitespace-pre-wrap">
                      {guestResearch.biography}
                    </p>
                  </div>
                )}
                {guestResearch.approved_by_guest !== null && (
                  <div
                    className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                      guestResearch.approved_by_guest
                        ? 'bg-ceramic-success/10 border border-ceramic-success/30'
                        : 'bg-ceramic-warning/10 border border-ceramic-warning/30'
                    }`}
                  >
                    <CheckCircle
                      className={`w-5 h-5 ${
                        guestResearch.approved_by_guest ? 'text-ceramic-success' : 'text-ceramic-warning'
                      }`}
                    />
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          guestResearch.approved_by_guest ? 'text-ceramic-text-primary' : 'text-ceramic-text-primary'
                        }`}
                      >
                        {guestResearch.approved_by_guest
                          ? 'Aprovado pelo convidado'
                          : 'Aguardando aprovação do convidado'}
                      </p>
                      {guestResearch.approval_notes && (
                        <p className="text-xs text-ceramic-text-secondary mt-1">
                          {guestResearch.approval_notes}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Pauta Builder Placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-ceramic-base rounded-2xl shadow-sm border border-ceramic-border p-6"
            >
              <h2 className="text-lg font-bold text-ceramic-text-primary mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-ceramic-warning" />
                Pauta do Episódio
              </h2>
              <div className="text-center py-8">
                <p className="text-ceramic-text-secondary">
                  Construtor de pauta será implementado em breve
                </p>
                <p className="text-sm text-ceramic-text-tertiary mt-2">
                  Aqui você poderá criar e organizar tópicos para o episódio
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Guest Approval Link Dialog */}
      <GuestApprovalLinkDialog
        isOpen={showApprovalDialog}
        onClose={handleCloseApprovalDialog}
        episodeId={projectId}
        guestName={guestData.name}
        guestEmail={episode?.guest_email}
        guestPhone={episode?.guest_phone}
      />
    </div>
  );
};

export default PreProductionHub;
