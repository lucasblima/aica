/**
 * EmailCategoryBadge — pill badge showing email category with icon.
 */

import React from 'react';
import { Zap, Info, Newspaper, Receipt, Heart, Bell } from 'lucide-react';
import type { EmailCategory } from '../types';

interface EmailCategoryBadgeProps {
  category: EmailCategory;
  confidence?: number;
  size?: 'sm' | 'md';
}

interface CategoryConfig {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
}

const CATEGORY_CONFIG: Record<EmailCategory, CategoryConfig> = {
  actionable: {
    label: 'Ação',
    Icon: Zap,
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
  },
  informational: {
    label: 'Info',
    Icon: Info,
    bgColor: 'bg-ceramic-info/10',
    textColor: 'text-ceramic-info',
  },
  newsletter: {
    label: 'Newsletter',
    Icon: Newspaper,
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
  receipt: {
    label: 'Recibo',
    Icon: Receipt,
    bgColor: 'bg-ceramic-success/10',
    textColor: 'text-ceramic-success',
  },
  personal: {
    label: 'Pessoal',
    Icon: Heart,
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-700',
  },
  notification: {
    label: 'Notificação',
    Icon: Bell,
    bgColor: 'bg-ceramic-warning/10',
    textColor: 'text-ceramic-warning',
  },
};

export function EmailCategoryBadge({ category, confidence, size = 'sm' }: EmailCategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category];
  if (!config) return null;

  const { label, Icon, bgColor, textColor } = config;

  const sizeClasses = size === 'sm'
    ? 'px-1.5 py-0.5 text-[10px] gap-0.5'
    : 'px-2 py-1 text-xs gap-1';

  const iconSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  return (
    <span
      className={`inline-flex items-center rounded-lg font-medium ${bgColor} ${textColor} ${sizeClasses}`}
      title={confidence != null ? `Confianca: ${Math.round(confidence * 100)}%` : undefined}
    >
      <Icon className={iconSize} />
      {label}
    </span>
  );
}
