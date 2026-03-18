import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Check,
  AlertCircle,
  Loader2,
  ArrowLeft,
  FileText,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('GuestApprovalPage');

interface GuestApprovalData {
  episodeId: string;
  guestName: string;
  guestEmail?: string;
  biography?: string;
  technicalSheet?: any;
  keyFacts?: string[];
  controversies?: any[];
}

interface ApprovalStatus {
  approved: boolean | null;
  notes: string;
  approvedAt?: string;
}

export const GuestApprovalPage: React.FC = () => {
  const { episodeId, approvalToken } = useParams<{ episodeId: string; approvalToken: string }>();
  const navigate = useNavigate();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestData, setGuestData] = useState<GuestApprovalData | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>({
    approved: null,
    notes: '',
  });
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load guest data and verify approval token
  useEffect(() => {
    loadGuestApprovalData();
  }, [episodeId, approvalToken]);

  const loadGuestApprovalData = async () => {
    if (!episodeId || !approvalToken) {
      setError('Link de aprovação inválido');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch episode and verify approval token
      const { data: episode, error: episodeError } = await supabase
        .from('podcast_episodes')
        .select(
          `
          id,
          title,
          guest_name,
          guest_email,
          approval_token,
          approval_token_created_at
        `
        )
        .eq('id', episodeId)
        .maybeSingle();

      if (episodeError) {
        throw new Error('Episódio não encontrado');
      }

      if (!episode) {
        throw new Error('Episódio não encontrado');
      }

      // Verify approval token
      if (episode.approval_token !== approvalToken) {
        throw new Error('Link de aprovação inválido ou expirado');
      }

      // Check if token is not too old (e.g., 30 days)
      if (episode.approval_token_created_at) {
        const tokenAge = Date.now() - new Date(episode.approval_token_created_at).getTime();
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        if (tokenAge > thirtyDaysInMs) {
          throw new Error('Link de aprovação expirado');
        }
      }

      // Fetch guest research data
      const { data: guestResearch, error: researchError } = await supabase
        .from('podcast_guest_research')
        .select(
          `
          biography,
          technical_sheet,
          key_facts,
          controversies,
          approved_by_guest,
          approval_notes
        `
        )
        .eq('episode_id', episodeId)
        .maybeSingle();

      if (researchError && researchError.code !== 'PGRST116') {
        log.error('Error fetching guest research:', researchError);
      }

      // Set guest data
      setGuestData({
        episodeId,
        guestName: episode.guest_name || 'Convidado',
        guestEmail: episode.guest_email,
        biography: guestResearch?.biography,
        technicalSheet: guestResearch?.technical_sheet,
        keyFacts: guestResearch?.key_facts,
        controversies: guestResearch?.controversies,
      });

      // Load existing approval status if available
      if (guestResearch?.approved_by_guest !== null) {
        setApprovalStatus({
          approved: guestResearch.approved_by_guest,
          notes: guestResearch.approval_notes || '',
          approvedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      log.error('Error loading approval data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!episodeId) return;

    setIsSubmitting(true);
    setSubmissionStatus('idle');

    try {
      // Update podcast_guest_research with approval
      const { error: updateError } = await supabase
        .from('podcast_guest_research')
        .update({
          approved_by_guest: true,
          approved_at: new Date().toISOString(),
          approval_notes: approvalStatus.notes,
        })
        .eq('episode_id', episodeId);

      if (updateError && updateError.code !== 'PGRST116') {
        throw updateError;
      }

      setApprovalStatus({
        approved: true,
        notes: approvalStatus.notes,
        approvedAt: new Date().toISOString(),
      });

      setSubmissionStatus('success');
    } catch (err) {
      log.error('Error approving:', err);
      setSubmissionStatus('error');
      setError('Erro ao salvar aprovação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!episodeId || !approvalStatus.notes.trim()) {
      setError('Por favor, indique a razão da rejeição');
      return;
    }

    setIsSubmitting(true);
    setSubmissionStatus('idle');

    try {
      // Update podcast_guest_research with rejection
      const { error: updateError } = await supabase
        .from('podcast_guest_research')
        .update({
          approved_by_guest: false,
          approved_at: new Date().toISOString(),
          approval_notes: approvalStatus.notes,
        })
        .eq('episode_id', episodeId);

      if (updateError && updateError.code !== 'PGRST116') {
        throw updateError;
      }

      setApprovalStatus({
        approved: false,
        notes: approvalStatus.notes,
        approvedAt: new Date().toISOString(),
      });

      setSubmissionStatus('success');
    } catch (err) {
      log.error('Error rejecting:', err);
      setSubmissionStatus('error');
      setError('Erro ao salvar rejeição');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ceramic-base to-ceramic-cool p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-ceramic-accent hover:text-ceramic-accent/80 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="bg-ceramic-base rounded-2xl shadow-sm border border-ceramic-border p-6">
            <h1 className="text-3xl font-bold text-ceramic-text-primary mb-2">
              Aprovação de Informações
            </h1>
            {guestData && (
              <p className="text-ceramic-text-secondary">
                Olá <span className="font-semibold">{guestData.guestName}</span>! Por favor, revise suas
                informações abaixo e confirme se estão corretas.
              </p>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-ceramic-base rounded-2xl shadow-sm border border-ceramic-border p-12 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-ceramic-accent/10 flex items-center justify-center mb-4 animate-spin">
              <Loader2 className="w-6 h-6 text-ceramic-accent" />
            </div>
            <p className="text-ceramic-text-secondary font-medium">Carregando dados...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-ceramic-error/10 rounded-2xl shadow-sm border border-ceramic-error/30 p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-ceramic-error flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-bold text-ceramic-error mb-1">Erro ao Carregar</h2>
                <p className="text-ceramic-error text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && guestData && !error && (
          <div className="space-y-6">
            {/* Biography Section */}
            {guestData.biography && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-ceramic-base rounded-2xl shadow-sm border border-ceramic-border p-6"
              >
                <h2 className="text-xl font-bold text-ceramic-text-primary mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-ceramic-accent" />
                  Biografia
                </h2>
                <div className="prose prose-sm max-w-none">
                  <p className="text-ceramic-text-primary whitespace-pre-wrap leading-relaxed">
                    {guestData.biography}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Key Facts Section */}
            {guestData.keyFacts && guestData.keyFacts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-ceramic-base rounded-2xl shadow-sm border border-ceramic-border p-6"
              >
                <h2 className="text-xl font-bold text-ceramic-text-primary mb-4">Fatos Principais</h2>
                <ul className="space-y-2">
                  {guestData.keyFacts.map((fact, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-ceramic-success flex-shrink-0 mt-0.5" />
                      <span className="text-ceramic-text-primary">{fact}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Technical Sheet Section */}
            {guestData.technicalSheet && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-ceramic-base rounded-2xl shadow-sm border border-ceramic-border p-6"
              >
                <h2 className="text-xl font-bold text-ceramic-text-primary mb-4">Ficha Técnica</h2>
                <div className="space-y-3">
                  {Object.entries(guestData.technicalSheet || {}).map(([key, value]) => (
                    <div key={key} className="border-b border-ceramic-border pb-2 last:border-b-0">
                      <p className="text-sm font-medium text-ceramic-text-secondary capitalize">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-ceramic-text-primary mt-1">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Controversies Section */}
            {guestData.controversies && guestData.controversies.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-ceramic-warning/10 rounded-2xl shadow-sm border border-ceramic-warning/30 p-6"
              >
                <h2 className="text-xl font-bold text-ceramic-text-primary mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-ceramic-warning" />
                  Possíveis Controvérsias
                </h2>
                <div className="space-y-3">
                  {guestData.controversies.map((controversy, idx) => (
                    <div key={idx} className="bg-ceramic-base p-3 rounded-lg border border-ceramic-warning/30">
                      <p className="text-sm text-ceramic-text-primary">
                        {typeof controversy === 'object'
                          ? controversy.title || JSON.stringify(controversy)
                          : String(controversy)}
                      </p>
                      {typeof controversy === 'object' && controversy.description && (
                        <p className="text-xs text-ceramic-text-secondary mt-1">{controversy.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Approval Status */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`rounded-2xl shadow-sm border p-6 ${
                approvalStatus.approved === null
                  ? 'bg-ceramic-accent/10 border-ceramic-accent/30'
                  : approvalStatus.approved
                    ? 'bg-ceramic-success/10 border-ceramic-success/30'
                    : 'bg-ceramic-error/10 border-ceramic-error/30'
              }`}
            >
              {approvalStatus.approved === null ? (
                <>
                  <h3 className="text-lg font-bold text-ceramic-text-primary mb-4">
                    O que você acha destas informações?
                  </h3>
                  <div className="space-y-3">
                    <textarea
                      value={approvalStatus.notes}
                      onChange={(e) =>
                        setApprovalStatus({
                          ...approvalStatus,
                          notes: e.target.value,
                        })
                      }
                      placeholder="Se houver correções necessárias, descreva aqui (obrigatório para rejeição)..."
                      className="w-full p-3 border border-ceramic-accent/40 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-tertiary focus:ring-2 focus:ring-ceramic-accent focus:border-transparent outline-none resize-vertical min-h-24"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleApprove}
                        disabled={isSubmitting}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-ceramic-success to-ceramic-success/90 text-white font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Aprovar
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={isSubmitting || !approvalStatus.notes.trim()}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-ceramic-error to-ceramic-error/80 text-white font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4" />
                            Rejeitar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      approvalStatus.approved
                        ? 'bg-ceramic-success/10'
                        : 'bg-ceramic-error/10'
                    }`}
                  >
                    {approvalStatus.approved ? (
                      <Check className="w-6 h-6 text-ceramic-success" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-ceramic-error" />
                    )}
                  </div>
                  <h3
                    className={`text-lg font-bold mb-2 ${
                      approvalStatus.approved
                        ? 'text-ceramic-text-primary'
                        : 'text-ceramic-text-primary'
                    }`}
                  >
                    {approvalStatus.approved
                      ? 'Informações Aprovadas! ✓'
                      : 'Informações Rejeitadas'}
                  </h3>
                  <p
                    className={`text-sm mb-4 ${
                      approvalStatus.approved
                        ? 'text-ceramic-success'
                        : 'text-ceramic-error'
                    }`}
                  >
                    {approvalStatus.approvedAt &&
                      `Enviado em ${new Date(approvalStatus.approvedAt).toLocaleDateString('pt-BR')}`}
                  </p>
                  {approvalStatus.notes && (
                    <div
                      className={`mt-4 p-3 rounded-lg text-left ${
                        approvalStatus.approved
                          ? 'bg-ceramic-success/10 border border-ceramic-success/30'
                          : 'bg-ceramic-error/10 border border-ceramic-error/30'
                      }`}
                    >
                      <p className="text-xs font-medium mb-1 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        Comentários:
                      </p>
                      <p
                        className={`text-sm whitespace-pre-wrap ${
                          approvalStatus.approved
                            ? 'text-ceramic-text-primary'
                            : 'text-ceramic-text-primary'
                        }`}
                      >
                        {approvalStatus.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Error Message */}
            {submissionStatus === 'error' && (
              <div className="bg-ceramic-error/10 rounded-2xl shadow-sm border border-ceramic-error/30 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-ceramic-error flex-shrink-0 mt-0.5" />
                <p className="text-sm text-ceramic-error">
                  Erro ao salvar sua resposta. Por favor, tente novamente.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestApprovalPage;
