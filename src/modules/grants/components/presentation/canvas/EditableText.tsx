/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * EditableText - Inline editable text component
 * Issue #117 - Presentation Generator
 *
 * Provides contentEditable functionality for slide text editing
 * with auto-save on blur.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import type { EditableTextProps } from '@/modules/grants/types/presentation';

export function EditableText({
  value,
  onChange,
  tag = 'p',
  className = '',
  editMode = false,
  placeholder = '',
  multiline = false,
}: EditableTextProps) {
  const elementRef = useRef<HTMLElement>(null);
  const previousValueRef = useRef<string>(value);

  // Update element content when value changes externally
  useEffect(() => {
    if (elementRef.current && elementRef.current.textContent !== value) {
      elementRef.current.textContent = value;
      previousValueRef.current = value;
    }
  }, [value]);

  // Handle blur event (save changes)
  const handleBlur = useCallback(() => {
    if (elementRef.current) {
      const newValue = elementRef.current.textContent || '';
      if (newValue !== previousValueRef.current) {
        onChange(newValue);
        previousValueRef.current = newValue;
      }
    }
  }, [onChange]);

  // Handle paste event (strip formatting)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  // Handle keydown (prevent line breaks if not multiline)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      elementRef.current?.blur();
    }
  }, [multiline]);

  const Tag = tag;

  if (!editMode) {
    return (
      <Tag className={className}>
        {value || placeholder}
      </Tag>
    );
  }

  return (
    <Tag
      ref={elementRef as React.RefObject<any>}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      className={`${className} outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-sm transition-all`}
      data-placeholder={placeholder}
    >
      {value}
    </Tag>
  );
}

export default EditableText;
