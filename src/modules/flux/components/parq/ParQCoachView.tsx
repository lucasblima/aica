/**
 * ParQCoachView — Coach's read-only view of athlete's PAR-Q + document review
 *
 * Shows PAR-Q status, classic answers, follow-up details,
 * uploaded documents, and review actions (approve/reject).
 */

import React, { useState } from 'react';
import type { ParQResponse, AthleteDocument, ParQStatus, UploadDocumentInput } from '../../types/parq';
import { ParQStatusBadge } from './ParQStatusBadge';
import { MedicalDocumentUpload } from './MedicalDocumentUpload';
import { PARQ_CLASSIC_QUESTIONS, PARQ_FOLLOWUP_CATEGORIES, DOCUMENT_TYPE_LABELS } from './ParQQuestionConstants';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface ParQCoachViewProps {
  athleteName: string;
  parqStatus: ParQStatus | null;
  latestResponse: ParQResponse | null;
  documents: AthleteDocument[];
  isLoadingStatus?: boolean;
  onReviewDocument: (docId: string, status: 'approved' | 'rejected', notes?: string) => Promise<boolean>;
  onViewDocument: (doc: AthleteDocument) => Promise<string | null>;
  onUploadDocument: (input: Omit<UploadDocumentInput, 'athlete_id'>) => Promise<AthleteDocument | null>;
  /** @deprecated Coach should never fill PAR-Q. Kept for API compat but not rendered. */
  onFillParQ?: () => void;
  isUploading?: boolean;
}

export function ParQCoachView({
  athleteName,
  parqStatus,
  latestResponse,
  documents,
  isLoadingStatus = false,
  onReviewDocument,
  onViewDocument,
  onUploadDocument,
  onFillParQ,
  isUploading = false,
}: ParQCoachViewProps) {
  const [expandedFollowUp, setExpandedFollowUp] = useState(false);
  const [reviewingDocId, setReviewingDocId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  if (isLoadingStatus) {
    return (
      <div className="ceramic-card p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-ceramic-text-secondary animate-spin" />
          <span className="text-sm text-ceramic-text-secondary">Carregando status PAR-Q...</span>
        </div>
      </div>
    );
  }

  const handleViewDoc = async (doc: AthleteDocument) => {
    setViewingDocId(doc.id);
    const url = await onViewDocument(doc);
    if (url) window.open(url, '_blank');
    setViewingDocId(null);
  };

  const handleReview = async (docId: string, status: 'approved' | 'rejected') => {
    setReviewingDocId(docId);
    await onReviewDocument(docId, status, reviewNotes.trim() || undefined);
    setReviewingDocId(null);
    setReviewNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Header: Status + Expiration */}
      <div className="ceramic-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-ceramic-text-primary" />
            <h3 className="text-base font-bold text-ceramic-text-primary">
              Saúde & PAR-Q
            </h3>
          </div>
          {parqStatus && (
            <ParQStatusBadge status={parqStatus.clearance_status} size="md" />
          )}
        </div>

        {!parqStatus?.has_parq ? (
          <div className="space-y-3">
            <p className="text-sm text-ceramic-text-secondary">
              {athleteName} ainda não preencheu o questionário PAR-Q+.
              O atleta deve preencher o PAR-Q pelo portal do atleta.
            </p>
          </div>
        ) : (
          <div className="space-y-2 text-xs text-ceramic-text-secondary">
            {parqStatus.risk_level && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Nível de risco:</span>
                <span className={`font-bold ${
                  parqStatus.risk_level === 'low' ? 'text-ceramic-success' :
                  parqStatus.risk_level === 'intermediate' ? 'text-ceramic-warning' :
                  'text-ceramic-error'
                }`}>
                  {parqStatus.risk_level === 'low' ? 'Baixo' :
                   parqStatus.risk_level === 'intermediate' ? 'Intermediário' : 'Alto'}
                </span>
              </div>
            )}
            {parqStatus.expires_at && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Validade:</span>
                <span className={parqStatus.is_expired ? 'text-ceramic-error font-bold' : ''}>
                  {new Date(parqStatus.expires_at).toLocaleDateString('pt-BR')}
                  {parqStatus.is_expired && ' (expirado)'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Classic Answers (7 questions) */}
      {latestResponse && (
        <div className="ceramic-card p-4">
          <h4 className="text-sm font-bold text-ceramic-text-primary mb-3">
            Perguntas Clássicas (PAR-Q+)
          </h4>
          <div className="space-y-2">
            {PARQ_CLASSIC_QUESTIONS.map((q, i) => {
              const CLASSIC_KEYS = [
                'q1_cardiac_condition',
                'q2_chest_pain_activity',
                'q3_chest_pain_rest',
                'q4_dizziness_balance',
                'q5_bone_joint_problem',
                'q6_blood_pressure_meds',
                'q7_other_physical_reason',
              ] as const;
              const answer = latestResponse[CLASSIC_KEYS[i]] as boolean;

              return (
                <div
                  key={q.id}
                  className={`flex items-start gap-2 p-2 rounded-lg ${
                    answer ? 'bg-ceramic-error/5' : 'bg-ceramic-success/5'
                  }`}
                >
                  {answer ? (
                    <AlertTriangle className="w-4 h-4 text-ceramic-error flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-ceramic-success flex-shrink-0 mt-0.5" />
                  )}
                  <p className="text-xs text-ceramic-text-primary leading-relaxed">
                    {q.text}
                  </p>
                  <span className={`text-xs font-bold flex-shrink-0 ${
                    answer ? 'text-ceramic-error' : 'text-ceramic-success'
                  }`}>
                    {answer ? 'SIM' : 'NÃO'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Follow-ups (collapsible) */}
          {latestResponse.followup_answers && Object.keys(latestResponse.followup_answers).length > 0 && (
            <div className="mt-3 pt-3 border-t border-ceramic-text-secondary/10">
              <button
                onClick={() => setExpandedFollowUp(!expandedFollowUp)}
                className="flex items-center gap-2 text-sm font-bold text-ceramic-text-primary hover:text-ceramic-accent transition-colors"
              >
                {expandedFollowUp ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Follow-up Detalhado
              </button>

              {expandedFollowUp && (
                <div className="mt-2 space-y-3">
                  {PARQ_FOLLOWUP_CATEGORIES.map((block) => {
                    const answers = latestResponse.followup_answers?.[block.category as keyof typeof latestResponse.followup_answers];
                    if (!answers || typeof answers !== 'object') return null;
                    const hasAny = Object.values(answers as Record<string, boolean>).some(Boolean);
                    if (!hasAny) return null;

                    return (
                      <div key={block.category} className="space-y-1">
                        <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                          {block.label}
                        </p>
                        {block.questions.map((q) => {
                          const val = (answers as Record<string, boolean>)[q.id];
                          if (!val) return null;
                          return (
                            <div key={q.id} className="flex items-start gap-2 pl-2">
                              <AlertTriangle className="w-3 h-3 text-ceramic-warning flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-ceramic-text-primary">{q.text}</p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Restrictions */}
          {latestResponse.restrictions && latestResponse.restrictions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-ceramic-text-secondary/10">
              <p className="text-xs font-bold text-ceramic-warning mb-2">Restrições Identificadas:</p>
              <ul className="space-y-1">
                {latestResponse.restrictions.map((r, i) => (
                  <li key={i} className="text-xs text-ceramic-text-secondary pl-3 relative">
                    <span className="absolute left-0">·</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Documents Section */}
      <div className="ceramic-card p-4">
        <h4 className="text-sm font-bold text-ceramic-text-primary mb-3">
          Documentos Médicos ({documents.length})
        </h4>

        {documents.length > 0 ? (
          <div className="space-y-2 mb-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="ceramic-inset p-3 rounded-lg space-y-2"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-ceramic-text-primary truncate">
                      {doc.title}
                    </p>
                    <p className="text-[10px] text-ceramic-text-secondary">
                      {DOCUMENT_TYPE_LABELS[doc.document_type]} ·{' '}
                      {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  {/* Review status badge */}
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    doc.review_status === 'approved'
                      ? 'bg-ceramic-success/15 text-ceramic-success'
                      : doc.review_status === 'rejected'
                      ? 'bg-ceramic-error/15 text-ceramic-error'
                      : 'bg-ceramic-warning/15 text-ceramic-warning'
                  }`}>
                    {doc.review_status === 'approved' ? 'Aprovado' :
                     doc.review_status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                  </span>

                  {/* View button */}
                  <button
                    onClick={() => handleViewDoc(doc)}
                    disabled={viewingDocId === doc.id}
                    className="p-1.5 hover:bg-ceramic-cool rounded-lg transition-colors"
                    title="Ver documento"
                  >
                    {viewingDocId === doc.id ? (
                      <Loader2 className="w-4 h-4 text-ceramic-text-secondary animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 text-ceramic-info" />
                    )}
                  </button>
                </div>

                {/* Review actions (only for pending docs) */}
                {doc.review_status === 'pending' && (
                  <div className="flex items-center gap-2 pt-2 border-t border-ceramic-text-secondary/10">
                    <input
                      type="text"
                      value={reviewingDocId === doc.id ? reviewNotes : ''}
                      onChange={(e) => {
                        setReviewingDocId(doc.id);
                        setReviewNotes(e.target.value);
                      }}
                      onFocus={() => setReviewingDocId(doc.id)}
                      placeholder="Notas (opcional)"
                      className="flex-1 ceramic-inset px-2 py-1 rounded text-xs text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-ceramic-accent/50"
                    />
                    <button
                      onClick={() => handleReview(doc.id, 'approved')}
                      disabled={reviewingDocId === doc.id && reviewingDocId !== doc.id}
                      className="flex items-center gap-1 px-2 py-1 bg-ceramic-success/15 hover:bg-ceramic-success/25 text-ceramic-success rounded text-xs font-bold transition-colors"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Aprovar
                    </button>
                    <button
                      onClick={() => handleReview(doc.id, 'rejected')}
                      className="flex items-center gap-1 px-2 py-1 bg-ceramic-error/15 hover:bg-ceramic-error/25 text-ceramic-error rounded text-xs font-bold transition-colors"
                    >
                      <XCircle className="w-3 h-3" />
                      Rejeitar
                    </button>
                  </div>
                )}

                {/* Review notes (if already reviewed) */}
                {doc.review_notes && doc.review_status !== 'pending' && (
                  <p className="text-[10px] text-ceramic-text-secondary italic pt-1">
                    Notas: {doc.review_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ceramic-text-secondary mb-4">
            Nenhum documento médico enviado.
          </p>
        )}

        {/* Upload section */}
        <div className="pt-3 border-t border-ceramic-text-secondary/10">
          <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
            Enviar Documento
          </p>
          <MedicalDocumentUpload
            athleteId=""
            parqResponseId={latestResponse?.id}
            onUpload={onUploadDocument}
            isUploading={isUploading}
          />
        </div>
      </div>
    </div>
  );
}
