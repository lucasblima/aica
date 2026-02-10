/**
 * DocumentTypeBadge Component
 * Issue #115 - Classification and Automatic Linking
 *
 * A badge component showing document type with color coding and confidence.
 *
 * @module modules/grants/components/documents/DocumentTypeBadge
 */

import React from 'react';
import {
  FileText,
  BookOpen,
  ScrollText,
  FileBarChart,
  Presentation,
  FileSignature,
  Megaphone,
  FileInput,
  Users,
  HelpCircle,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Supported document types for classification
 */
export type DocumentType =
  | 'projeto_rouanet'
  | 'proac'
  | 'estatuto'
  | 'relatorio'
  | 'apresentacao'
  | 'contrato'
  | 'edital'
  | 'proposta'
  | 'ata'
  | 'outros';

export interface DocumentTypeBadgeProps {
  /** The detected document type */
  type: DocumentType | string | null | undefined;
  /** Confidence score (0-1) */
  confidence?: number | null;
  /** Show confidence percentage */
  showConfidence?: boolean;
  /** Badge size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show icon */
  showIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

interface TypeConfig {
  label: string;
  fullLabel: string;
  icon: React.FC<{ className?: string }>;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const DOCUMENT_TYPE_CONFIG: Record<string, TypeConfig> = {
  projeto_rouanet: {
    label: 'Rouanet',
    fullLabel: 'Projeto Lei Rouanet',
    icon: BookOpen,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  proac: {
    label: 'ProAC',
    fullLabel: 'Projeto ProAC',
    icon: BookOpen,
    bgColor: 'bg-ceramic-accent/10',
    textColor: 'text-ceramic-accent',
    borderColor: 'border-ceramic-accent/20',
  },
  estatuto: {
    label: 'Estatuto',
    fullLabel: 'Estatuto Social',
    icon: ScrollText,
    bgColor: 'bg-ceramic-info-bg',
    textColor: 'text-ceramic-info',
    borderColor: 'border-ceramic-border',
  },
  relatorio: {
    label: 'Relatorio',
    fullLabel: 'Relatorio de Execucao',
    icon: FileBarChart,
    bgColor: 'bg-ceramic-success-bg',
    textColor: 'text-ceramic-success',
    borderColor: 'border-ceramic-success/30',
  },
  apresentacao: {
    label: 'Apresentacao',
    fullLabel: 'Apresentacao Institucional',
    icon: Presentation,
    bgColor: 'bg-ceramic-warning/10',
    textColor: 'text-ceramic-warning',
    borderColor: 'border-ceramic-warning/20',
  },
  contrato: {
    label: 'Contrato',
    fullLabel: 'Contrato',
    icon: FileSignature,
    bgColor: 'bg-ceramic-error-bg',
    textColor: 'text-ceramic-error',
    borderColor: 'border-ceramic-error/30',
  },
  edital: {
    label: 'Edital',
    fullLabel: 'Edital de Abertura',
    icon: Megaphone,
    bgColor: 'bg-ceramic-warning/10',
    textColor: 'text-ceramic-warning',
    borderColor: 'border-ceramic-warning/20',
  },
  proposta: {
    label: 'Proposta',
    fullLabel: 'Proposta de Projeto',
    icon: FileInput,
    bgColor: 'bg-ceramic-info/10',
    textColor: 'text-ceramic-info',
    borderColor: 'border-ceramic-info/20',
  },
  ata: {
    label: 'Ata',
    fullLabel: 'Ata de Reuniao',
    icon: Users,
    bgColor: 'bg-ceramic-success/10',
    textColor: 'text-ceramic-success',
    borderColor: 'border-ceramic-success/20',
  },
  outros: {
    label: 'Outros',
    fullLabel: 'Outros Documentos',
    icon: FileText,
    bgColor: 'bg-ceramic-base',
    textColor: 'text-ceramic-text-primary',
    borderColor: 'border-ceramic-border',
  },
};

// Legacy type mapping for backward compatibility
const LEGACY_TYPE_MAPPING: Record<string, string> = {
  projeto_proac: 'proac',
  estatuto_social: 'estatuto',
  relatorio_execucao: 'relatorio',
  apresentacao_institucional: 'apresentacao',
  orcamento: 'proposta',
  outro: 'outros',
};

const SIZE_CLASSES = {
  sm: {
    container: 'px-1.5 py-0.5 text-xs gap-1',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-2 py-1 text-sm gap-1.5',
    icon: 'w-4 h-4',
  },
  lg: {
    container: 'px-3 py-1.5 text-base gap-2',
    icon: 'w-5 h-5',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function normalizeType(type: string | null | undefined): string {
  if (!type) return 'outros';

  // Check for legacy mapping
  const normalized = LEGACY_TYPE_MAPPING[type] || type;

  // Return if valid type, otherwise default to 'outros'
  return DOCUMENT_TYPE_CONFIG[normalized] ? normalized : 'outros';
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-ceramic-success';
  if (confidence >= 0.6) return 'text-ceramic-warning';
  if (confidence >= 0.4) return 'text-ceramic-warning';
  return 'text-ceramic-error';
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DocumentTypeBadge({
  type,
  confidence,
  showConfidence = true,
  size = 'md',
  showIcon = true,
  className = '',
}: DocumentTypeBadgeProps) {
  const normalizedType = normalizeType(type);
  const config = DOCUMENT_TYPE_CONFIG[normalizedType] || DOCUMENT_TYPE_CONFIG.outros;
  const sizeConfig = SIZE_CLASSES[size];
  const Icon = config.icon;

  const hasConfidence = confidence !== undefined && confidence !== null;
  const confidencePercent = hasConfidence ? Math.round(confidence * 100) : null;

  return (
    <span
      className={`
        inline-flex items-center rounded-full border font-medium
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeConfig.container}
        ${className}
      `}
      title={`${config.fullLabel}${hasConfidence ? ` (${confidencePercent}% confianca)` : ''}`}
    >
      {showIcon && <Icon className={`${sizeConfig.icon} flex-shrink-0`} />}

      <span className="truncate">{config.label}</span>

      {showConfidence && hasConfidence && confidencePercent !== null && (
        <span
          className={`
            ml-0.5 font-normal opacity-75
            ${getConfidenceColor(confidence)}
          `}
        >
          {confidencePercent}%
        </span>
      )}
    </span>
  );
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * Get the configuration for a document type
 */
export function getDocumentTypeConfig(type: string | null | undefined): TypeConfig {
  const normalizedType = normalizeType(type);
  return DOCUMENT_TYPE_CONFIG[normalizedType] || DOCUMENT_TYPE_CONFIG.outros;
}

/**
 * Get all available document types
 */
export function getAvailableDocumentTypes(): Array<{ value: string; label: string }> {
  return Object.entries(DOCUMENT_TYPE_CONFIG).map(([value, config]) => ({
    value,
    label: config.fullLabel,
  }));
}

/**
 * Check if a type is valid
 */
export function isValidDocumentType(type: string | null | undefined): boolean {
  if (!type) return false;
  const normalized = LEGACY_TYPE_MAPPING[type] || type;
  return !!DOCUMENT_TYPE_CONFIG[normalized];
}

export default DocumentTypeBadge;
