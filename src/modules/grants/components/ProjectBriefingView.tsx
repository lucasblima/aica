import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Building2,
  FileText,
  Lightbulb,
  TrendingUp,
  Users,
  Target,
  Leaf,
  MessageSquare,
  ArrowRight,
  Save,
  Sparkles,
  Loader2
} from 'lucide-react';
import type { BriefingData } from '../types';
import { generateAutoBriefing } from '../services/briefingAIService';

/**
 * ProjectBriefingView Component
 * Full-screen view for collecting project context with collapsible sections
 * Features auto-save, character count, and progress tracking
 */

interface ProjectBriefingViewProps {
  projectId: string;
  opportunityTitle: string;
  initialBriefing?: BriefingData;
  onSave: (briefing: BriefingData) => Promise<void>;
  onContinue: () => void;
}

interface BriefingSection {
  id: keyof BriefingData;
  title: string;
  icon: React.ReactNode;
  help: string;
  placeholder: string;
  minChars?: number;
  maxChars?: number;
}

const BRIEFING_SECTIONS: BriefingSection[] = [
  {
    id: 'company_context',
    title: 'Contexto da Empresa',
    icon: <Building2 className="w-5 h-5" />,
    help: 'Descreva sua empresa, área de atuação, histórico e principais conquistas',
    placeholder: 'Ex: Somos uma startup de biotecnologia fundada em 2020...',
    minChars: 100,
    maxChars: 2000
  },
  {
    id: 'project_description',
    title: 'Descrição do Projeto',
    icon: <FileText className="w-5 h-5" />,
    help: 'Explique o projeto que você deseja submeter ao edital',
    placeholder: 'Ex: Desenvolvimento de uma plataforma de diagnóstico...',
    minChars: 150,
    maxChars: 3000
  },
  {
    id: 'technical_innovation',
    title: 'Inovação Técnica',
    icon: <Lightbulb className="w-5 h-5" />,
    help: 'Destaque os aspectos inovadores e tecnológicos do projeto',
    placeholder: 'Ex: Utilizamos machine learning para...',
    minChars: 100,
    maxChars: 2000
  },
  {
    id: 'market_differential',
    title: 'Diferencial de Mercado',
    icon: <TrendingUp className="w-5 h-5" />,
    help: 'Explique como seu projeto se diferencia da concorrência',
    placeholder: 'Ex: Nossa solução é a única no mercado brasileiro que...',
    minChars: 100,
    maxChars: 1500
  },
  {
    id: 'team_expertise',
    title: 'Expertise da Equipe',
    icon: <Users className="w-5 h-5" />,
    help: 'Descreva a formação e experiência da equipe envolvida',
    placeholder: 'Ex: Nossa equipe conta com PhDs em biologia molecular...',
    minChars: 100,
    maxChars: 1500
  },
  {
    id: 'expected_results',
    title: 'Resultados Esperados',
    icon: <Target className="w-5 h-5" />,
    help: 'Liste os resultados e impactos esperados do projeto',
    placeholder: 'Ex: Esperamos desenvolver um protótipo funcional em 12 meses...',
    minChars: 100,
    maxChars: 2000
  },
  {
    id: 'sustainability',
    title: 'Sustentabilidade',
    icon: <Leaf className="w-5 h-5" />,
    help: 'Explique como o projeto será sustentável após o financiamento',
    placeholder: 'Ex: Planejamos gerar receita através de licenciamento...',
    minChars: 100,
    maxChars: 1500
  },
  {
    id: 'additional_notes',
    title: 'Notas Adicionais',
    icon: <MessageSquare className="w-5 h-5" />,
    help: 'Informações complementares que podem ajudar na geração da proposta',
    placeholder: 'Ex: Já possuímos parcerias com universidades...',
    maxChars: 2000
  }
];

export const ProjectBriefingView: React.FC<ProjectBriefingViewProps> = ({
  projectId,
  opportunityTitle,
  initialBriefing,
  onSave,
  onContinue
}) => {
  const [briefingData, setBriefingData] = useState<BriefingData>(
    initialBriefing || {}
  );
  const [expandedSections, setExpandedSections] = useState<Set<keyof BriefingData>>(
    new Set(['company_context'])
  );
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);

  /**
   * Auto-save with debouncing
   */
  useEffect(() => {
    if (!savePending) return;

    const timeoutId = setTimeout(async () => {
      try {
        setIsSaving(true);
        await onSave(briefingData);
        setLastSaved(new Date());
        setSavePending(false);
      } catch (error) {
        console.error('Error auto-saving briefing:', error);
      } finally {
        setIsSaving(false);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
  }, [briefingData, savePending, onSave]);

  /**
   * Update briefing field
   */
  const updateField = useCallback((field: keyof BriefingData, value: string) => {
    setBriefingData(prev => ({ ...prev, [field]: value }));
    setSavePending(true);
  }, []);

  /**
   * Handle auto-generation of briefing with AI
   */
  const handleGenerateBriefing = async () => {
    try {
      setIsGeneratingBriefing(true);

      // Gather available context
      const context = {
        editalTitle: opportunityTitle,
        // Optionally add company name and project idea from existing briefing
        companyName: briefingData.company_context ? briefingData.company_context.substring(0, 100) : undefined,
        projectIdea: briefingData.project_description ? briefingData.project_description.substring(0, 100) : undefined
      };

      // Generate briefing with AI
      const generatedBriefing = await generateAutoBriefing(context);

      // Update briefing data
      setBriefingData(generatedBriefing);
      setSavePending(true);

      // Expand all sections to show generated content
      setExpandedSections(new Set(BRIEFING_SECTIONS.map(s => s.id)));
    } catch (error) {
      console.error('Error generating briefing:', error);
      alert('Erro ao gerar briefing automaticamente. Tente novamente.');
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  /**
   * Toggle section expansion
   */
  const toggleSection = (sectionId: keyof BriefingData) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  /**
   * Calculate completion percentage
   */
  const calculateCompletion = (): number => {
    const requiredSections = BRIEFING_SECTIONS.filter(s => s.minChars);
    const completedSections = requiredSections.filter(section => {
      const content = briefingData[section.id] || '';
      return content.length >= (section.minChars || 0);
    });
    return Math.round((completedSections.length / requiredSections.length) * 100);
  };

  /**
   * Check if can continue (sempre permitido agora)
   */
  const canContinue = (): boolean => {
    return true; // Sempre pode avançar, briefing é opcional
  };

  /**
   * Get character count color
   */
  const getCharCountColor = (
    length: number,
    minChars?: number,
    maxChars?: number
  ): string => {
    if (minChars && length < minChars) return 'text-orange-600';
    if (maxChars && length > maxChars) return 'text-red-600';
    return 'text-green-600';
  };

  const completion = calculateCompletion();

  return (
    <div className="min-h-screen bg-ceramic-base">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-ceramic-base border-b border-ceramic-text-secondary/10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-ceramic-text-secondary mb-1">
                Coletando Contexto para
              </p>
              <h1 className="text-2xl font-bold text-ceramic-text-primary">
                {opportunityTitle}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleGenerateBriefing}
                disabled={isGeneratingBriefing}
                className="ceramic-concave px-4 py-2 font-bold text-ceramic-accent hover:scale-[0.98] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2"
              >
                {isGeneratingBriefing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Preencher com IA
                  </>
                )}
              </button>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  {isSaving ? (
                    <span className="text-sm text-orange-600">Salvando...</span>
                  ) : lastSaved ? (
                    <span className="text-sm text-ceramic-text-tertiary">
                      Salvo {lastSaved.toLocaleTimeString('pt-BR')}
                    </span>
                  ) : null}
                  <Save className="w-4 h-4 text-ceramic-text-tertiary" />
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ceramic-text-secondary">Progresso</span>
              <span className="font-bold text-ceramic-text-primary">{completion}%</span>
            </div>
            <div className="ceramic-trough p-2">
              <motion.div
                className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        {BRIEFING_SECTIONS.map((section, index) => {
          const isExpanded = expandedSections.has(section.id);
          const content = briefingData[section.id] || '';
          const charCount = content.length;
          const meetsMinimum = !section.minChars || charCount >= section.minChars;

          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="ceramic-card overflow-hidden"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-6 flex items-center justify-between hover:bg-black/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`ceramic-concave w-12 h-12 flex items-center justify-center ${
                    meetsMinimum ? 'text-green-600' : 'text-ceramic-text-secondary'
                  }`}>
                    {section.icon}
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-ceramic-text-primary">
                      {section.title}
                      {section.minChars && (
                        <span className="ml-2 text-sm font-normal text-red-600">*</span>
                      )}
                    </h3>
                    <p className="text-sm text-ceramic-text-secondary">
                      {section.help}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {charCount > 0 && (
                    <span
                      className={`text-sm font-medium ${getCharCountColor(
                        charCount,
                        section.minChars,
                        section.maxChars
                      )}`}
                    >
                      {charCount}
                      {section.maxChars && ` / ${section.maxChars}`}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-ceramic-text-tertiary" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-ceramic-text-tertiary" />
                  )}
                </div>
              </button>

              {/* Section Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6">
                      <div className="ceramic-tray p-4">
                        <textarea
                          value={content}
                          onChange={e => updateField(section.id, e.target.value)}
                          placeholder={section.placeholder}
                          rows={8}
                          className="w-full bg-transparent text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none resize-none"
                          maxLength={section.maxChars}
                        />
                      </div>

                      {/* Character Count Info */}
                      <div className="flex items-center justify-between mt-3 text-xs">
                        {section.minChars && (
                          <span
                            className={
                              meetsMinimum
                                ? 'text-green-600'
                                : 'text-orange-600'
                            }
                          >
                            {meetsMinimum
                              ? `Mínimo atingido (${section.minChars} caracteres)`
                              : `Mínimo: ${section.minChars} caracteres (faltam ${
                                  section.minChars - charCount
                                })`}
                          </span>
                        )}
                        {section.maxChars && charCount > section.maxChars * 0.9 && (
                          <span className="text-orange-600">
                            {section.maxChars - charCount} caracteres restantes
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-ceramic-base border-t border-ceramic-text-secondary/10 shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ceramic-text-secondary">
                {canContinue()
                  ? 'Contexto completo! Pronto para gerar a proposta.'
                  : `Complete pelo menos 80% para continuar (${completion}% completo)`}
              </p>
            </div>
            <button
              onClick={onContinue}
              disabled={!canContinue()}
              className="ceramic-concave px-8 py-3 font-bold text-ceramic-text-primary hover:scale-[0.98] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2"
            >
              Continuar para Geração
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectBriefingView;
