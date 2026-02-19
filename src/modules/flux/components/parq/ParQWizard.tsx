/**
 * ParQWizard — Multi-step PAR-Q+ questionnaire wizard
 *
 * 6 steps: Intro → Classic (7 yes/no) → Follow-up → Result → Sign → Upload
 * Uses slide transitions via CSS. Touch-friendly, mobile-first.
 */

import React from 'react';
import type { ParQWizardStep, FollowUpCategory, ParQRiskLevel, UploadDocumentInput, AthleteDocument } from '../../types/parq';
import { PARQ_CLASSIC_QUESTIONS, PARQ_FOLLOWUP_CATEGORIES } from './ParQQuestionConstants';
import { ParQStatusBadge } from './ParQStatusBadge';
import { MedicalDocumentUpload } from './MedicalDocumentUpload';
import {
  ClipboardCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  PenTool,
  Upload,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface ParQWizardProps {
  athleteName: string;
  athleteId: string;
  // Wizard state (from useParQ hook)
  step: ParQWizardStep;
  classicAnswers: boolean[];
  followUpAnswers: Record<string, Record<string, boolean>>;
  activeFollowUpCategories: FollowUpCategory[];
  calculatedRisk: ParQRiskLevel | null;
  calculatedClearance: 'cleared' | 'cleared_with_restrictions' | 'blocked' | null;
  restrictions: string[];
  signatureText: string;
  isSubmitting: boolean;
  submitError: string | null;
  // Actions
  setStep: (step: ParQWizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setClassicAnswer: (index: number, value: boolean) => void;
  setFollowUpAnswer: (category: FollowUpCategory, questionId: string, value: boolean) => void;
  setSignatureText: (text: string) => void;
  submitParQ: () => Promise<boolean>;
  onComplete: () => void;
  // Document upload
  onUploadDocument?: (input: Omit<UploadDocumentInput, 'athlete_id'>) => Promise<AthleteDocument | null>;
  isUploading?: boolean;
}

const STEP_ORDER: ParQWizardStep[] = ['intro', 'classic', 'followup', 'result', 'sign', 'upload'];

export function ParQWizard({
  athleteName,
  athleteId,
  step,
  classicAnswers,
  followUpAnswers,
  activeFollowUpCategories,
  calculatedRisk,
  calculatedClearance,
  restrictions,
  signatureText,
  isSubmitting,
  submitError,
  setStep,
  nextStep,
  prevStep,
  setClassicAnswer,
  setFollowUpAnswer,
  setSignatureText,
  submitParQ,
  onComplete,
  onUploadDocument,
  isUploading = false,
}: ParQWizardProps) {
  const stepIndex = STEP_ORDER.indexOf(step);
  const totalSteps = activeFollowUpCategories.length > 0 ? 6 : 5; // skip followup if no "yes"

  // Progress calculation
  const getProgress = () => {
    const effectiveSteps = activeFollowUpCategories.length > 0
      ? STEP_ORDER
      : STEP_ORDER.filter(s => s !== 'followup');
    const idx = effectiveSteps.indexOf(step);
    return Math.round(((idx + 1) / effectiveSteps.length) * 100);
  };

  const handleSubmitAndContinue = async () => {
    const success = await submitParQ();
    if (success) {
      if (calculatedClearance === 'blocked' || calculatedClearance === 'cleared_with_restrictions') {
        setStep('upload');
      } else {
        onComplete();
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-ceramic-base">
      {/* Progress bar */}
      <div className="sticky top-0 z-10 bg-ceramic-base/95 backdrop-blur-sm px-6 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider">
            PAR-Q+
          </span>
          <span className="text-[10px] text-ceramic-text-secondary">
            {getProgress()}%
          </span>
        </div>
        <div className="h-1.5 bg-ceramic-cool rounded-full overflow-hidden">
          <div
            className="h-full bg-ceramic-accent rounded-full transition-all duration-500"
            style={{ width: `${getProgress()}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-6 py-4">
        {/* ========== INTRO ========== */}
        {step === 'intro' && (
          <div className="flex flex-col items-center text-center space-y-6 py-8">
            <div className="w-20 h-20 rounded-full bg-ceramic-accent/10 flex items-center justify-center">
              <ClipboardCheck className="w-10 h-10 text-ceramic-accent" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-ceramic-text-primary">
                Questionário PAR-Q+
              </h1>
              <p className="text-sm text-ceramic-text-secondary max-w-sm">
                Olá, <strong>{athleteName}</strong>! Antes de iniciar seus treinos,
                precisamos avaliar sua prontidão para atividade física.
              </p>
            </div>
            <div className="ceramic-card p-4 text-left space-y-2 max-w-sm">
              <p className="text-xs font-bold text-ceramic-text-primary">O que é o PAR-Q+?</p>
              <p className="text-xs text-ceramic-text-secondary leading-relaxed">
                O Questionário de Prontidão para Atividade Física (PAR-Q+) é uma ferramenta
                validada internacionalmente para identificar se você precisa de liberação
                médica antes de iniciar um programa de exercícios.
              </p>
              <p className="text-xs text-ceramic-text-secondary leading-relaxed">
                São 7 perguntas simples de sim/não. Leva menos de 2 minutos.
              </p>
            </div>
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-8 py-3 bg-ceramic-accent hover:bg-ceramic-accent/90 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all"
            >
              <span>Iniciar</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ========== CLASSIC QUESTIONS ========== */}
        {step === 'classic' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-lg font-black text-ceramic-text-primary">
                Perguntas de Prontidão
              </h2>
              <p className="text-xs text-ceramic-text-secondary mt-1">
                Responda SIM ou NÃO para cada pergunta
              </p>
            </div>

            {PARQ_CLASSIC_QUESTIONS.map((q, index) => (
              <div
                key={q.id}
                className="ceramic-card p-4 space-y-3"
              >
                <p className="text-sm text-ceramic-text-primary leading-relaxed">
                  <span className="font-bold text-ceramic-accent mr-1">{index + 1}.</span>
                  {q.text}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setClassicAnswer(index, true)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${
                      classicAnswers[index] === true
                        ? 'bg-ceramic-error text-white shadow-md scale-[1.02]'
                        : 'ceramic-inset text-ceramic-text-secondary hover:bg-ceramic-error/10 hover:text-ceramic-error'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    SIM
                  </button>
                  <button
                    onClick={() => setClassicAnswer(index, false)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${
                      classicAnswers[index] === false
                        ? 'bg-ceramic-success text-white shadow-md scale-[1.02]'
                        : 'ceramic-inset text-ceramic-text-secondary hover:bg-ceramic-success/10 hover:text-ceramic-success'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    NÃO
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========== FOLLOW-UP QUESTIONS ========== */}
        {step === 'followup' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-lg font-black text-ceramic-text-primary">
                Perguntas Complementares
              </h2>
              <p className="text-xs text-ceramic-text-secondary mt-1">
                Baseado nas suas respostas, precisamos de mais detalhes
              </p>
            </div>

            {PARQ_FOLLOWUP_CATEGORIES.filter(block =>
              activeFollowUpCategories.includes(block.category)
            ).map((block) => (
              <FollowUpAccordion
                key={block.category}
                block={block}
                answers={followUpAnswers[block.category] || {}}
                onAnswerChange={(qId, value) =>
                  setFollowUpAnswer(block.category, qId, value)
                }
              />
            ))}
          </div>
        )}

        {/* ========== RESULT ========== */}
        {step === 'result' && (
          <div className="flex flex-col items-center text-center space-y-6 py-8">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
              calculatedRisk === 'low'
                ? 'bg-ceramic-success/10'
                : calculatedRisk === 'intermediate'
                ? 'bg-ceramic-warning/10'
                : 'bg-ceramic-error/10'
            }`}>
              {calculatedRisk === 'low' ? (
                <ShieldCheck className="w-10 h-10 text-ceramic-success" />
              ) : calculatedRisk === 'intermediate' ? (
                <ShieldAlert className="w-10 h-10 text-ceramic-warning" />
              ) : (
                <ShieldX className="w-10 h-10 text-ceramic-error" />
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-ceramic-text-primary">
                {calculatedRisk === 'low'
                  ? 'Tudo certo!'
                  : calculatedRisk === 'intermediate'
                  ? 'Atenção necessária'
                  : 'Liberação médica necessária'}
              </h2>
              <p className="text-sm text-ceramic-text-secondary max-w-sm">
                {calculatedRisk === 'low'
                  ? 'Você está liberado(a) para iniciar atividade física. Sem restrições identificadas.'
                  : calculatedRisk === 'intermediate'
                  ? 'Algumas condições foram identificadas. Você pode treinar com restrições. Recomendamos acompanhamento médico.'
                  : 'Condições de risco foram identificadas. Você precisa de um atestado médico de liberação antes de iniciar os treinos.'}
              </p>
            </div>

            {calculatedClearance && (
              <ParQStatusBadge
                status={calculatedClearance === 'cleared' ? 'cleared' : calculatedClearance === 'cleared_with_restrictions' ? 'cleared_with_restrictions' : 'blocked'}
                size="md"
              />
            )}

            {restrictions.length > 0 && (
              <div className="ceramic-card p-4 text-left w-full max-w-sm">
                <p className="text-xs font-bold text-ceramic-warning mb-2">
                  Restrições identificadas:
                </p>
                <ul className="space-y-1">
                  {restrictions.map((r, i) => (
                    <li key={i} className="text-xs text-ceramic-text-secondary flex items-start gap-1.5">
                      <span className="text-ceramic-warning mt-0.5">·</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ========== SIGN ========== */}
        {step === 'sign' && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-ceramic-accent/10 flex items-center justify-center mx-auto mb-4">
                <PenTool className="w-8 h-8 text-ceramic-accent" />
              </div>
              <h2 className="text-lg font-black text-ceramic-text-primary">
                Termo de Consentimento
              </h2>
            </div>

            <div className="ceramic-inset p-4 rounded-xl text-xs text-ceramic-text-secondary leading-relaxed space-y-2">
              <p>
                Declaro que as informações fornecidas neste questionário são verdadeiras
                e completas. Entendo que:
              </p>
              <ul className="space-y-1 pl-4">
                <li>· A prática de atividade física envolve riscos inerentes</li>
                <li>· Devo informar meu treinador sobre qualquer mudança na minha condição de saúde</li>
                <li>· Este questionário tem validade de 12 meses</li>
                <li>· Se minha condição de saúde mudar, devo preencher novamente</li>
              </ul>
              {calculatedRisk === 'high' && (
                <p className="text-ceramic-error font-bold mt-2">
                  Entendo que preciso apresentar atestado médico de liberação para atividade
                  física antes de iniciar os treinos.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                Assinatura Digital (nome completo)
              </label>
              <input
                type="text"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                placeholder="Digite seu nome completo"
                className="w-full ceramic-inset px-4 py-3 rounded-xl text-base text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 font-serif italic"
              />
            </div>

            {submitError && (
              <div className="flex items-center gap-2 text-ceramic-error text-xs">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
          </div>
        )}

        {/* ========== UPLOAD ========== */}
        {step === 'upload' && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-ceramic-warning/10 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-ceramic-warning" />
              </div>
              <h2 className="text-lg font-black text-ceramic-text-primary">
                Enviar Atestado Médico
              </h2>
              <p className="text-sm text-ceramic-text-secondary mt-2">
                {calculatedRisk === 'high'
                  ? 'Para sua segurança, envie um atestado médico de liberação para atividade física. Seu coach irá analisar.'
                  : 'Recomendamos enviar um atestado médico para acompanhamento. Você pode enviar agora ou depois.'}
              </p>
            </div>

            {onUploadDocument && (
              <MedicalDocumentUpload
                athleteId={athleteId}
                onUpload={onUploadDocument}
                isUploading={isUploading}
              />
            )}

            {calculatedRisk !== 'high' && (
              <button
                onClick={onComplete}
                className="w-full text-center text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary underline transition-colors"
              >
                Pular e enviar depois
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation footer */}
      {step !== 'intro' && (
        <div className="sticky bottom-0 bg-ceramic-base/95 backdrop-blur-sm border-t border-ceramic-text-secondary/10 px-6 py-4">
          <div className="flex items-center gap-3">
            {step !== 'upload' && (
              <button
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2.5 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            )}
            <div className="flex-1" />
            {step === 'classic' && (
              <button
                onClick={nextStep}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-ceramic-accent hover:bg-ceramic-accent/90 text-white font-bold rounded-lg shadow-md hover:scale-105 transition-all"
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {step === 'followup' && (
              <button
                onClick={nextStep}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-ceramic-accent hover:bg-ceramic-accent/90 text-white font-bold rounded-lg shadow-md hover:scale-105 transition-all"
              >
                Ver Resultado
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {step === 'result' && (
              <button
                onClick={nextStep}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-ceramic-accent hover:bg-ceramic-accent/90 text-white font-bold rounded-lg shadow-md hover:scale-105 transition-all"
              >
                Assinar
                <PenTool className="w-4 h-4" />
              </button>
            )}
            {step === 'sign' && (
              <button
                onClick={handleSubmitAndContinue}
                disabled={isSubmitting || !signatureText.trim()}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-ceramic-accent hover:bg-ceramic-accent/90 disabled:bg-ceramic-text-secondary/20 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-md hover:scale-105 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirmar e Assinar
                  </>
                )}
              </button>
            )}
            {step === 'upload' && calculatedRisk === 'high' && (
              <button
                onClick={onComplete}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-ceramic-accent hover:bg-ceramic-accent/90 text-white font-bold rounded-lg shadow-md hover:scale-105 transition-all"
              >
                Concluir
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * FollowUpAccordion — Collapsible category block with questions
 */
function FollowUpAccordion({
  block,
  answers,
  onAnswerChange,
}: {
  block: (typeof PARQ_FOLLOWUP_CATEGORIES)[number];
  answers: Record<string, boolean>;
  onAnswerChange: (questionId: string, value: boolean) => void;
}) {
  const [expanded, setExpanded] = React.useState(true);
  const answeredCount = Object.values(answers).filter(Boolean).length;

  return (
    <div className="ceramic-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-ceramic-cool/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
        )}
        <span className="text-sm font-bold text-ceramic-text-primary flex-1">
          {block.label}
        </span>
        {answeredCount > 0 && (
          <span className="text-[10px] font-bold text-ceramic-warning bg-ceramic-warning/15 px-1.5 py-0.5 rounded">
            {answeredCount} sim
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {block.questions.map((q) => (
            <div
              key={q.id}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-ceramic-cool/30 transition-colors"
            >
              <p className="flex-1 text-xs text-ceramic-text-primary leading-relaxed pt-1">
                {q.text}
              </p>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => onAnswerChange(q.id, true)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                    answers[q.id] === true
                      ? 'bg-ceramic-error text-white'
                      : 'ceramic-inset text-ceramic-text-secondary hover:text-ceramic-error'
                  }`}
                >
                  SIM
                </button>
                <button
                  onClick={() => onAnswerChange(q.id, false)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                    answers[q.id] === false
                      ? 'bg-ceramic-success text-white'
                      : 'ceramic-inset text-ceramic-text-secondary hover:text-ceramic-success'
                  }`}
                >
                  NÃO
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
