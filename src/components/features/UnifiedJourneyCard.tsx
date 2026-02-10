import React, { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Sparkles, ChevronRight, Flame, BookOpen, X } from 'lucide-react';

interface UnifiedJourneyCardProps {
  // Dados temporais
  currentWeek: number;
  totalWeeks: number;
  percentLived: number;

  // Dados de jornada
  level: number;
  levelName: string;
  streakDays: number;
  totalMoments: number;
  totalQuestions: number;
  totalReflections: number;

  // Último momento registrado
  lastMoment?: {
    text: string;
    date: string;
    mood?: string;
  };

  // Pergunta do dia
  dailyQuestion: string;
  hasPendingQuestion: boolean;

  // Callbacks
  onRegisterMoment: (text: string) => void;
  onAnswerQuestion: (answer: string) => void;
  onExpand: () => void;
}

export const UnifiedJourneyCard: React.FC<UnifiedJourneyCardProps> = ({
  currentWeek,
  totalWeeks,
  percentLived,
  level,
  levelName,
  streakDays,
  totalMoments,
  totalQuestions,
  totalReflections,
  lastMoment,
  dailyQuestion,
  hasPendingQuestion,
  onRegisterMoment,
  onAnswerQuestion,
  onExpand
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<'moment' | 'question'>('moment');

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    if (activeTab === 'moment') {
      onRegisterMoment(inputValue);
    } else {
      onAnswerQuestion(inputValue);
    }
    setInputValue('');
    setIsExpanded(false);
  };

  return (
    <LayoutGroup>
      <motion.div
        layout
        className={`ceramic-card overflow-hidden transition-all duration-500 ${
          isExpanded
            ? 'fixed inset-4 z-50 rounded-[40px]'
            : 'rounded-[32px]'
        }`}
      >
        {/* === ESTADO DE REPOUSO === */}
        {!isExpanded && (
          <motion.div
            layout
            className="p-6 cursor-pointer"
            onClick={() => setIsExpanded(true)}
          >
            {/* Header: Contexto Temporal + Gamificação */}
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-ceramic-accent" />
                  <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest">
                    Minha Jornada
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-ceramic-text-primary text-etched">
                    {percentLived}%
                  </span>
                  <span className="text-sm text-ceramic-text-secondary">
                    vivido
                  </span>
                </div>
                <p className="text-xs text-ceramic-text-secondary mt-1">
                  Semana {currentWeek.toLocaleString()} de {totalWeeks.toLocaleString()}
                </p>
              </div>

              {/* Badge de Nível */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Flame className="w-3 h-3 text-ceramic-warning" />
                    <span className="text-xs font-bold text-ceramic-text-primary">
                      {streakDays} dias
                    </span>
                  </div>
                  <span className="text-[10px] text-ceramic-text-secondary">
                    {levelName}
                  </span>
                </div>
                <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                  <span className="text-lg font-black text-ceramic-accent">{level}</span>
                </div>
              </div>
            </div>

            {/* A Trilha — Barra de Progresso */}
            <div className="relative h-3 w-full mb-6">
              {/* Sulco (fundo) */}
              <div className="absolute inset-0 ceramic-groove rounded-full" />

              {/* Progresso */}
              <motion.div
                className="absolute left-0 top-0 bottom-0 rounded-full"
                style={{
                  width: `${percentLived}%`,
                  background: 'linear-gradient(90deg, #D97706 0%, #F59E0B 100%)',
                  boxShadow: '0 0 8px rgba(217, 119, 6, 0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
                }}
                initial={{ width: 0 }}
                animate={{ width: `${percentLived}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />

              {/* Indicador "Agora" */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${percentLived}%` }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, type: "spring" }}
              >
                <div className="relative">
                  <div className="w-5 h-5 bg-ceramic-base border-4 border-ceramic-accent rounded-full shadow-md" />
                  {/* Pulso se há pendência */}
                  {hasPendingQuestion && (
                    <div className="absolute inset-0 rounded-full bg-ceramic-accent animate-ping opacity-30" />
                  )}
                </div>
              </motion.div>
            </div>

            {/* Último Momento ou Pergunta Pendente */}
            {hasPendingQuestion ? (
              <div className="ceramic-tray p-4 rounded-2xl">
                <p className="text-sm text-ceramic-text-primary font-medium mb-2 leading-relaxed">
                  "{dailyQuestion}"
                </p>
                <div className="ceramic-inset h-11 flex items-center px-4 rounded-full">
                  <span className="text-sm text-ceramic-text-secondary/60">
                    ✍️ Toque para responder...
                  </span>
                </div>
              </div>
            ) : lastMoment ? (
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-ceramic-base/50">
                <div className="ceramic-inset w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-ceramic-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ceramic-text-secondary mb-1">
                    Último momento · {lastMoment.date}
                  </p>
                  <p className="text-sm text-ceramic-text-primary truncate">
                    {lastMoment.text}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-ceramic-text-secondary/50 flex-shrink-0" />
              </div>
            ) : (
              <div className="ceramic-inset h-11 flex items-center justify-center px-4 rounded-full">
                <span className="text-sm text-ceramic-text-secondary/60">
                  ✍️ Registrar primeiro momento...
                </span>
              </div>
            )}

            {/* Stats compactos */}
            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-ceramic-text-secondary/10">
              <Stat value={totalMoments} label="Momentos" />
              <Stat value={totalQuestions} label="Perguntas" />
              <Stat value={totalReflections} label="Reflexões" />
            </div>
          </motion.div>
        )}

        {/* === ESTADO EXPANDIDO === */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              {/* Header Expandido */}
              <div className="flex items-center justify-between p-6 pb-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-ceramic-accent" />
                  <span className="text-lg font-bold text-ceramic-text-primary">
                    Minha Jornada
                  </span>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="ceramic-card p-2 rounded-full hover:scale-95 transition-transform"
                >
                  <X className="w-5 h-5 text-ceramic-text-secondary" />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-6 mb-4">
                <div className="ceramic-trough p-1 rounded-full flex">
                  <button
                    onClick={() => setActiveTab('moment')}
                    className={`flex-1 py-2 text-sm font-bold rounded-full transition-all ${
                      activeTab === 'moment'
                        ? 'ceramic-card text-ceramic-text-primary'
                        : 'text-ceramic-text-secondary'
                    }`}
                  >
                    Registrar Momento
                  </button>
                  <button
                    onClick={() => setActiveTab('question')}
                    className={`flex-1 py-2 text-sm font-bold rounded-full transition-all relative ${
                      activeTab === 'question'
                        ? 'ceramic-card text-ceramic-text-primary'
                        : 'text-ceramic-text-secondary'
                    }`}
                  >
                    Pergunta do Dia
                    {hasPendingQuestion && (
                      <span className="absolute top-1 right-3 w-2 h-2 bg-ceramic-accent rounded-full" />
                    )}
                  </button>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 px-6 pb-6 overflow-y-auto">
                {activeTab === 'question' && (
                  <div className="mb-4 p-4 rounded-2xl bg-ceramic-accent/5 border border-ceramic-accent/20">
                    <p className="text-base text-ceramic-text-primary font-medium leading-relaxed">
                      "{dailyQuestion}"
                    </p>
                  </div>
                )}

                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    activeTab === 'moment'
                      ? "O que aconteceu de significativo?"
                      : "Sua reflexão..."
                  }
                  className="w-full ceramic-tray p-4 rounded-2xl text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 resize-none focus:outline-none min-h-[120px]"
                />

                <div className="flex justify-end mt-4">
                  <motion.button
                    onClick={handleSubmit}
                    disabled={!inputValue.trim()}
                    className="ceramic-card px-6 py-3 rounded-full font-bold text-ceramic-accent disabled:opacity-40 disabled:cursor-not-allowed"
                    whileTap={{ scale: 0.95 }}
                  >
                    Cristalizar ✨
                  </motion.button>
                </div>

                {/* Timeline de Momentos (se houver) */}
                {totalMoments > 0 && (
                  <div className="mt-8">
                    <h4 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest mb-4">
                      Momentos Recentes
                    </h4>
                    <p className="text-sm text-ceramic-text-secondary italic">
                      {totalMoments} momento(s) registrado(s)
                    </p>
                  </div>
                )}
              </div>

              {/* Footer com Stats */}
              <div className="px-6 py-4 border-t border-ceramic-text-secondary/10">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="ceramic-concave w-8 h-8 flex items-center justify-center">
                      <span className="text-sm font-black text-ceramic-accent">{level}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ceramic-text-primary">{levelName}</p>
                      <p className="text-[10px] text-ceramic-text-secondary flex items-center gap-1">
                        <Flame className="w-3 h-3 text-ceramic-warning" />
                        {streakDays} dias de sequência
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-black text-ceramic-text-primary">{percentLived}%</p>
                    <p className="text-[10px] text-ceramic-text-secondary">
                      Semana {currentWeek.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Botão para ver jornada completa */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                    onExpand();
                  }}
                  className="w-full ceramic-card px-4 py-3 rounded-full font-bold text-sm text-ceramic-accent hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Ver Jornada Completa (Nova Experiência ✨)
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Backdrop quando expandido */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/5 backdrop-blur-[2px] z-40"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
};

// Componente auxiliar
const Stat = ({ value, label }: { value: number; label: string }) => (
  <div className="text-center">
    <p className="text-lg font-bold text-ceramic-text-primary">{value}</p>
    <p className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider">{label}</p>
  </div>
);
