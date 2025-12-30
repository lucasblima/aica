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
      console.error('Error loading episode data:', error);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Carregando episódio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Pré-Produção
                </h1>
                <p className="text-sm text-gray-600">
                  {guestData.name} • {guestData.theme || 'Sem tema definido'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSendApproval}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" />
                Enviar Aprovação
              </button>
              <button
                onClick={handleGoToProduction}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2"
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
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
            >
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Informações do Convidado
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Nome</p>
                  <p className="text-sm font-medium text-gray-800">{guestData.name}</p>
                </div>
                {guestData.fullName && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Nome Completo
                    </p>
                    <p className="text-sm font-medium text-gray-800">{guestData.fullName}</p>
                  </div>
                )}
                {guestData.title && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Título</p>
                    <p className="text-sm font-medium text-gray-800">{guestData.title}</p>
                  </div>
                )}
                {episode?.guest_email && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                    <p className="text-sm font-medium text-gray-800">{episode.guest_email}</p>
                  </div>
                )}
                {episode?.guest_phone && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Telefone</p>
                    <p className="text-sm font-medium text-gray-800">{episode.guest_phone}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Episode Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
            >
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                Detalhes do Episódio
              </h2>
              <div className="space-y-3">
                {guestData.theme && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Tema</p>
                    <p className="text-sm font-medium text-gray-800">{guestData.theme}</p>
                  </div>
                )}
                {guestData.season && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Temporada</p>
                    <p className="text-sm font-medium text-gray-800">
                      Temporada {guestData.season}
                    </p>
                  </div>
                )}
                {guestData.scheduledDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">
                        {new Date(guestData.scheduledDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}
                {guestData.scheduledTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <p className="text-xs text-gray-500">{guestData.scheduledTime}</p>
                  </div>
                )}
                {guestData.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <p className="text-xs text-gray-500">{guestData.location}</p>
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
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
              >
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Pesquisa do Convidado
                </h2>
                {guestResearch.biography && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Biografia</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {guestResearch.biography}
                    </p>
                  </div>
                )}
                {guestResearch.approved_by_guest !== null && (
                  <div
                    className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                      guestResearch.approved_by_guest
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-yellow-50 border border-yellow-200'
                    }`}
                  >
                    <CheckCircle
                      className={`w-5 h-5 ${
                        guestResearch.approved_by_guest ? 'text-green-600' : 'text-yellow-600'
                      }`}
                    />
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          guestResearch.approved_by_guest ? 'text-green-900' : 'text-yellow-900'
                        }`}
                      >
                        {guestResearch.approved_by_guest
                          ? 'Aprovado pelo convidado'
                          : 'Aguardando aprovação do convidado'}
                      </p>
                      {guestResearch.approval_notes && (
                        <p className="text-xs text-gray-600 mt-1">
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
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
            >
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-600" />
                Pauta do Episódio
              </h2>
              <div className="text-center py-8">
                <p className="text-gray-500">
                  Construtor de pauta será implementado em breve
                </p>
                <p className="text-sm text-gray-400 mt-2">
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
