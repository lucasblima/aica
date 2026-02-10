/**
 * ContactSearchBar Component
 * Debounced search input for contact list
 *
 * Issue #92: feat(whatsapp): Exibir lista de contatos sincronizados com UI rica
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ContactSearchBarProps {
  /** Current search value */
  value: string;
  /** Callback when search value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Additional CSS classes */
  className?: string;
}

export function ContactSearchBar({
  value,
  onChange,
  placeholder = 'Buscar por nome, telefone ou email...',
  debounceMs = 300,
  className,
}: ContactSearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange, value]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);

  return (
    <div className={cn('relative', className)}>
      {/* Search icon */}
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary pointer-events-none" />

      {/* Input */}
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-10 pr-10 py-2.5 rounded-lg border border-ceramic-border bg-ceramic-base',
          'text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary',
          'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
          'transition-shadow'
        )}
        aria-label="Buscar contatos"
      />

      {/* Clear button */}
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full
                     text-ceramic-text-secondary hover:text-ceramic-text-primary hover:bg-ceramic-base transition-colors"
          aria-label="Limpar busca"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default ContactSearchBar;
