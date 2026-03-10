/**
 * GuestInfoForm Component
 *
 * Form for manually entering guest contact information.
 * Used for "Common Person" guests who don't have public presence.
 *
 * Migrated from _deprecated/modules/podcast/components/GuestManualForm.tsx
 * Renamed: GuestManualForm → GuestInfoForm (clearer naming)
 *
 * Wave 5 - Stream 1: Setup Stage Components Migration
 * - Updated imports to new module structure
 * - Applied Ceramic Design System patterns
 * - Enhanced accessibility (WCAG 2.1 AA)
 * - Maintained framer-motion animations
 * - Preserved validation logic
 *
 * Features:
 * - Collects: Name, Phone, Email
 * - Validates: Required fields and email format
 * - Brazilian phone number formatting
 * - Real-time validation feedback
 * - Accessible error messages
 *
 * @module studio/components/workspace
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Mail, AlertCircle, Check, Send, Loader2, ExternalLink, Search, Link2 } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { fetchContactAsGuest } from '@/modules/studio/services/crossModuleService';
import type { ContactAsGuest } from '@/modules/studio/services/crossModuleService';

const log = createNamespacedLogger('GuestInfoForm');

// Validate email format (extracted for use before component renders)
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone format (Brazilian format)
const validatePhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
};

export interface GuestManualData {
  name: string;
  phone: string;
  email: string;
}

interface GuestInfoFormProps {
  /** Initial form data (for editing) */
  initialData?: Partial<GuestManualData>;
  /** Callback when form is submitted with valid data */
  onSubmit: (data: GuestManualData) => void;
  /** Optional callback for back navigation */
  onBack?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Episode ID for sending approval links */
  episodeId?: string;
  /** Base URL for guest approval portal */
  approvalBaseUrl?: string;
}

/**
 * GuestInfoForm - Manual guest information entry form
 *
 * Accessibility Features:
 * - Labels linked to inputs via htmlFor/id
 * - Required fields marked with aria-required
 * - Error messages linked via aria-describedby
 * - Live validation feedback with aria-invalid
 * - Color-coded validation states (green checkmarks, red errors)
 * - Keyboard accessible
 * - Form submission handling
 */
export const GuestInfoForm: React.FC<GuestInfoFormProps> = ({
  initialData,
  onSubmit,
  onBack,
  className = '',
  episodeId,
  approvalBaseUrl = 'https://aica.guru/studio/approval',
}) => {
  const [formData, setFormData] = useState<GuestManualData>({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof GuestManualData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof GuestManualData, boolean>>>({});

  // Contact search state (Connections integration)
  const [isSearchingContacts, setIsSearchingContacts] = useState(false);
  const [contactResults, setContactResults] = useState<ContactAsGuest[]>([]);
  const [contactSearchDone, setContactSearchDone] = useState(false);
  const [importedFromConnections, setImportedFromConnections] = useState(false);

  // Approval link state
  const [isSendingApproval, setIsSendingApproval] = useState(false);
  const [approvalSent, setApprovalSent] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false);

  // Whether the approval button should be visible
  const canSendApproval = !!(episodeId && formData.email.trim() && validateEmail(formData.email));

  // Search contacts from Connections module
  const handleSearchContacts = useCallback(async () => {
    if (!formData.name.trim()) return;

    setIsSearchingContacts(true);
    setContactSearchDone(false);
    setContactResults([]);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const results = await fetchContactAsGuest(formData.name, user.id);
      setContactResults(results);
      setContactSearchDone(true);
    } catch (err) {
      log.error('Failed to search contacts:', err);
      setContactSearchDone(true);
    } finally {
      setIsSearchingContacts(false);
    }
  }, [formData.name]);

  // Auto-fill form from a matched contact
  const handleFillFromContact = useCallback((contact: ContactAsGuest) => {
    setFormData((prev) => ({
      name: contact.name || prev.name,
      phone: contact.phone ? formatPhone(contact.phone) : prev.phone,
      email: contact.email || prev.email,
    }));
    setContactResults([]);
    setContactSearchDone(false);
    setImportedFromConnections(true);
    // Mark fields as touched to trigger validation feedback
    setTouched({ name: true, phone: !!contact.phone, email: !!contact.email });
  }, []);

  // Send guest approval link via Edge Function
  const handleSendApprovalLink = useCallback(async () => {
    if (!episodeId || !formData.email.trim() || !formData.name.trim()) return;

    setIsSendingApproval(true);
    setApprovalError(null);

    try {
      const approvalUrl = `${approvalBaseUrl}/${episodeId}?guest=${encodeURIComponent(formData.name)}`;

      const { data, error } = await supabase.functions.invoke('send-guest-approval-link', {
        body: {
          episodeId,
          guestName: formData.name,
          guestEmail: formData.email,
          approvalUrl,
          method: 'email',
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao enviar link de aprovacao');
      }

      if (data && !data.success) {
        throw new Error(data.error || 'Falha no envio do email');
      }

      setApprovalSent(true);
      setShowApprovalConfirm(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao enviar link';
      setApprovalError(message);
    } finally {
      setIsSendingApproval(false);
    }
  }, [episodeId, formData.email, formData.name, approvalBaseUrl]);

  // Check if field is valid (for positive feedback)
  const isFieldValid = (field: keyof GuestManualData): boolean => {
    const value = formData[field];
    if (!value || !touched[field]) return false;

    switch (field) {
      case 'name':
        return value.trim().length >= 3;
      case 'email':
        return validateEmail(value);
      case 'phone':
        return validatePhone(value);
      default:
        return false;
    }
  };

  // Format phone number with Brazilian mask
  const formatPhone = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Apply mask based on length
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
  };

  // Handle field change
  const handleChange = (field: keyof GuestManualData, value: string) => {
    // Apply phone mask automatically
    if (field === 'phone') {
      const formatted = formatPhone(value);
      setFormData((prev) => ({ ...prev, [field]: formatted }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle field blur
  const handleBlur = (field: keyof GuestManualData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  // Validate single field
  const validateField = (field: keyof GuestManualData, value: string) => {
    let error: string | undefined;

    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = 'Nome é obrigatório';
        } else if (value.trim().length < 3) {
          error = 'Nome deve ter pelo menos 3 caracteres';
        }
        break;
      case 'email':
        if (!value.trim()) {
          error = 'Email é obrigatório';
        } else if (!validateEmail(value)) {
          error = 'Digite um email válido (ex: nome@exemplo.com)';
        }
        break;
      case 'phone':
        if (!value.trim()) {
          error = 'Telefone é obrigatório';
        } else if (!validatePhone(value)) {
          error = 'Digite um telefone válido com DDD';
        }
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const nameValid = validateField('name', formData.name);
    const emailValid = validateField('email', formData.email);
    const phoneValid = validateField('phone', formData.phone);

    setTouched({
      name: true,
      email: true,
      phone: true,
    });

    return nameValid && emailValid && phoneValid;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`max-w-md mx-auto ${className}`}
      data-testid="guest-manual-form"
    >
      {/* Header */}
      <div className="text-center space-y-2 mb-6">
        <h2 className="text-2xl font-semibold text-ceramic-text-primary">
          Dados do Convidado
        </h2>
        <p className="text-sm text-ceramic-secondary">
          Preencha as informações de contato
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div>
          <label
            htmlFor="guest-name-input"
            className="block text-sm font-medium text-ceramic-text-primary mb-1"
          >
            Nome Completo <span className="text-ceramic-error" aria-label="obrigatório">*</span>
          </label>
          <div className="relative">
            <User
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ceramic-tertiary"
              aria-hidden="true"
            />
            <input
              id="guest-name-input"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              placeholder="Ex: João Silva"
              data-testid="guest-manual-name"
              autoComplete="name"
              required
              aria-required="true"
              aria-invalid={!!(errors.name && touched.name)}
              aria-describedby={errors.name && touched.name ? 'guest-name-error' : undefined}
              className={`
                w-full pl-10 pr-10 py-2 border rounded-lg bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-tertiary
                focus:ring-2 focus:ring-ceramic-accent focus:border-transparent
                ${
                  errors.name && touched.name
                    ? 'border-ceramic-error'
                    : isFieldValid('name')
                    ? 'border-ceramic-success'
                    : 'border-ceramic-border'
                }
              `}
            />
            {isFieldValid('name') && (
              <Check
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ceramic-success"
                aria-hidden="true"
              />
            )}
          </div>
          {errors.name && touched.name && (
            <div
              id="guest-name-error"
              role="alert"
              className="flex items-center gap-1 mt-1 text-xs text-ceramic-error"
            >
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              <span>{errors.name}</span>
            </div>
          )}
        </div>

        {/* Search in Contacts (Connections integration) */}
        {formData.name.trim().length >= 3 && !importedFromConnections && (
          <div>
            <button
              type="button"
              onClick={handleSearchContacts}
              disabled={isSearchingContacts}
              aria-label="Buscar nos contatos do modulo Conexoes"
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-ceramic-border bg-ceramic-cool hover:bg-ceramic-surface-hover text-ceramic-text-primary text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isSearchingContacts ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="w-4 h-4 text-amber-500" aria-hidden="true" />
              )}
              {isSearchingContacts ? 'Buscando...' : 'Buscar nos Contatos'}
            </button>

            {/* Contact results */}
            {contactSearchDone && contactResults.length > 0 && (
              <div className="mt-2 space-y-2">
                {contactResults.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleFillFromContact(contact)}
                    className="flex items-start gap-3 w-full p-3 rounded-lg border border-ceramic-border bg-ceramic-base hover:bg-ceramic-cool text-left transition-colors"
                  >
                    <User className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ceramic-text-primary truncate">
                        {contact.name}
                      </p>
                      {contact.phone && (
                        <p className="text-xs text-ceramic-text-secondary truncate">{contact.phone}</p>
                      )}
                      {contact.bio && (
                        <p className="text-xs text-ceramic-text-secondary mt-0.5 line-clamp-2">{contact.bio}</p>
                      )}
                      <span className="inline-block mt-1 text-xs text-ceramic-tertiary">
                        {contact.source === 'contact_network' ? 'WhatsApp' : 'Espaco'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {contactSearchDone && contactResults.length === 0 && (
              <p className="mt-1 text-xs text-ceramic-tertiary">
                Nenhum contato encontrado com esse nome.
              </p>
            )}
          </div>
        )}

        {/* Imported from Connections badge */}
        {importedFromConnections && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
            <Link2 className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
            <span className="text-xs font-medium text-amber-700">Importado de Conexoes</span>
          </div>
        )}

        {/* Email Field */}
        <div>
          <label
            htmlFor="guest-email-input"
            className="block text-sm font-medium text-ceramic-text-primary mb-1"
          >
            Email <span className="text-ceramic-error" aria-label="obrigatório">*</span>
          </label>
          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ceramic-tertiary"
              aria-hidden="true"
            />
            <input
              id="guest-email-input"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="joao@exemplo.com"
              data-testid="guest-manual-email"
              autoComplete="email"
              required
              aria-required="true"
              aria-invalid={!!(errors.email && touched.email)}
              aria-describedby={errors.email && touched.email ? 'guest-email-error' : undefined}
              className={`
                w-full pl-10 pr-10 py-2 border rounded-lg bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-tertiary
                focus:ring-2 focus:ring-ceramic-accent focus:border-transparent
                ${
                  errors.email && touched.email
                    ? 'border-ceramic-error'
                    : isFieldValid('email')
                    ? 'border-ceramic-success'
                    : 'border-ceramic-border'
                }
              `}
            />
            {isFieldValid('email') && (
              <Check
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ceramic-success"
                aria-hidden="true"
              />
            )}
          </div>
          {errors.email && touched.email && (
            <div
              id="guest-email-error"
              role="alert"
              className="flex items-center gap-1 mt-1 text-xs text-ceramic-error"
            >
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              <span>{errors.email}</span>
            </div>
          )}
        </div>

        {/* Phone Field */}
        <div>
          <label
            htmlFor="guest-phone-input"
            className="block text-sm font-medium text-ceramic-text-primary mb-1"
          >
            Telefone/WhatsApp <span className="text-ceramic-error" aria-label="obrigatório">*</span>
          </label>
          <div className="relative">
            <Phone
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ceramic-tertiary"
              aria-hidden="true"
            />
            <input
              id="guest-phone-input"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
              placeholder="(11) 99999-9999"
              data-testid="guest-manual-phone"
              autoComplete="tel"
              required
              aria-required="true"
              aria-invalid={!!(errors.phone && touched.phone)}
              aria-describedby={errors.phone && touched.phone ? 'guest-phone-error' : undefined}
              className={`
                w-full pl-10 pr-10 py-2 border rounded-lg bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-tertiary
                focus:ring-2 focus:ring-ceramic-accent focus:border-transparent
                ${
                  errors.phone && touched.phone
                    ? 'border-ceramic-error'
                    : isFieldValid('phone')
                    ? 'border-ceramic-success'
                    : 'border-ceramic-border'
                }
              `}
            />
            {isFieldValid('phone') && (
              <Check
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ceramic-success"
                aria-hidden="true"
              />
            )}
          </div>
          {errors.phone && touched.phone && (
            <div
              id="guest-phone-error"
              role="alert"
              className="flex items-center gap-1 mt-1 text-xs text-ceramic-error"
            >
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              <span>{errors.phone}</span>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-4 p-3 bg-ceramic-info-bg rounded-lg border border-ceramic-info/30">
          <div className="flex items-start gap-2">
            <Check
              className="w-4 h-4 text-ceramic-info mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
            <p className="text-xs text-ceramic-info">
              Essas informações serão usadas para enviar a pauta e lembretes da entrevista.
            </p>
          </div>
        </div>

        {/* Send Approval Link Section */}
        {canSendApproval && (
          <div className="mt-4 p-3 rounded-lg bg-ceramic-cool border border-ceramic-border">
            {approvalSent ? (
              <div className="flex items-center gap-2" role="status">
                <Check className="w-4 h-4 text-ceramic-success flex-shrink-0" aria-hidden="true" />
                <p className="text-sm text-ceramic-success font-medium">
                  Link de aprovacao enviado para {formData.email}
                </p>
              </div>
            ) : showApprovalConfirm ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <ExternalLink className="w-4 h-4 text-ceramic-text-secondary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm text-ceramic-text-primary">
                    Enviar convite para <span className="font-semibold">{formData.email}</span>?
                  </p>
                </div>
                {approvalError && (
                  <div className="flex items-center gap-1.5 text-xs text-ceramic-error" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    <span>{approvalError}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSendApprovalLink}
                    disabled={isSendingApproval}
                    aria-label="Confirmar envio do link de aprovacao"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {isSendingApproval ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="w-4 h-4" aria-hidden="true" />
                    )}
                    {isSendingApproval ? 'Enviando...' : 'Confirmar Envio'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowApprovalConfirm(false); setApprovalError(null); }}
                    disabled={isSendingApproval}
                    aria-label="Cancelar envio do link de aprovacao"
                    className="px-3 py-1.5 rounded-lg border border-ceramic-border text-ceramic-text-secondary text-sm hover:bg-ceramic-cool transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowApprovalConfirm(true)}
                aria-label="Enviar link de aprovacao para o convidado"
                className="flex items-center gap-1.5 w-full px-3 py-2 rounded-lg bg-ceramic-base hover:bg-ceramic-cool border border-ceramic-border text-ceramic-text-primary text-sm font-medium transition-colors"
              >
                <Send className="w-4 h-4 text-amber-500" aria-hidden="true" />
                Enviar Link de Aprovacao
              </button>
            )}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-3 mt-6">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              data-testid="guest-manual-back"
              className="flex-1 px-4 py-2 border border-ceramic-border text-ceramic-text-primary rounded-lg hover:bg-ceramic-surface-hover transition-colors focus:outline-none focus:ring-4 focus:ring-ceramic-accent/20"
            >
              Voltar
            </button>
          )}
          <button
            type="submit"
            data-testid="guest-manual-submit"
            className="flex-1 px-4 py-2 bg-ceramic-accent text-white rounded-lg hover:bg-ceramic-accent-dark transition-colors font-medium focus:outline-none focus:ring-4 focus:ring-ceramic-accent/20"
          >
            Continuar
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default GuestInfoForm;
