/**
 * RecurrenceChip — Small badge showing recurrence info (e.g., "Diariamente")
 */

import React from 'react';
import { Repeat } from 'lucide-react';
import { describeRRuleInPortuguese } from '@/services/taskRecurrenceService';

interface RecurrenceChipProps {
  rule: string;
}

export const RecurrenceChip: React.FC<RecurrenceChipProps> = ({ rule }) => {
  const label = describeRRuleInPortuguese(rule);
  if (!label) return null;

  return (
    <span className="inline-flex items-center gap-1 bg-ceramic-info/10 text-ceramic-info text-xs rounded-full px-2 py-0.5">
      <Repeat className="w-3 h-3" />
      {label}
    </span>
  );
};
