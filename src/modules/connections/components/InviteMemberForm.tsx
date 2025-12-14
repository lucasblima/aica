import React, { useState } from 'react';
import { Mail, X, Send } from 'lucide-react';

/**
 * InviteMemberForm Component
 *
 * Form for inviting members to a connection space via email.
 * Features ceramic-style design with validation and loading states.
 *
 * @example
 * ```tsx
 * <InviteMemberForm
 *   spaceId="space-123"
 *   onInvite={async (email) => {
 *     await inviteMemberAPI(email);
 *   }}
 *   onCancel={() => setShowForm(false)}
 *   isLoading={false}
 * />
 * ```
 */

interface InviteMemberFormProps {
  /** The ID of the space to invite members to */
  spaceId: string;
  /** Callback function to handle the invite submission */
  onInvite: (email: string) => Promise<void>;
  /** Optional callback when cancel button is clicked */
  onCancel?: () => void;
  /** Optional loading state from parent component */
  isLoading?: boolean;
}

/**
 * Basic email validation regex
 * Checks for: characters@characters.domain
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const InviteMemberForm: React.FC<InviteMemberFormProps> = ({
  spaceId,
  onInvite,
  onCancel,
  isLoading = false
}) => {
  // Form state
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Validate email format
   */
  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setError('Email é obrigatório');
      return false;
    }

    if (!EMAIL_REGEX.test(value)) {
      setError('Email inválido. Use o formato: email@exemplo.com');
      return false;
    }

    setError(null);
    return true;
  };

  /**
   * Handle email input change
   */
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!validateEmail(email)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onInvite(email.trim().toLowerCase());

      // Success - clear form
      setEmail('');
      setError(null);
    } catch (err) {
      // Handle error
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao enviar convite. Tente novamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle cancel action
   */
  const handleCancel = () => {
    setEmail('');
    setError(null);
    onCancel?.();
  };

  const isButtonDisabled = isLoading || isSubmitting || !email.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
          <Mail className="w-5 h-5 text-ceramic-text-secondary" />
        </div>
        <div>
          <h3 className="text-base font-bold text-ceramic-text-primary">
            Convidar Membro
          </h3>
          <p className="text-xs text-ceramic-text-secondary">
            Envie um convite por email
          </p>
        </div>
      </div>

      {/* Email Input */}
      <div className="space-y-2">
        <label
          htmlFor="invite-email"
          className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider"
        >
          Email do Membro
        </label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          placeholder="email@exemplo.com"
          disabled={isLoading || isSubmitting}
          className={`
            w-full p-4 rounded-xl ceramic-inset
            text-ceramic-text-primary
            placeholder:text-ceramic-text-secondary/50
            focus:outline-none focus:ring-2 focus:ring-ceramic-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all
            ${error ? 'ring-2 ring-red-500' : ''}
          `}
          autoFocus
        />

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 mt-2">
            <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-500 font-medium">
              {error}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        {/* Cancel Button */}
        {onCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading || isSubmitting}
            className="
              flex-1 ceramic-card py-3 rounded-xl
              font-medium text-ceramic-text-secondary
              hover:scale-[1.02] active:scale-95
              disabled:opacity-50 disabled:hover:scale-100
              transition-all
            "
          >
            Cancelar
          </button>
        )}

        {/* Invite Button */}
        <button
          type="submit"
          disabled={isButtonDisabled}
          className="
            flex-1 ceramic-card py-3 rounded-xl
            bg-gradient-to-r from-ceramic-accent to-amber-500
            font-bold text-white
            hover:scale-[1.02] active:scale-95
            disabled:opacity-50 disabled:hover:scale-100
            disabled:from-ceramic-text-secondary disabled:to-ceramic-text-secondary
            transition-all
            flex items-center justify-center gap-2
            shadow-lg
          "
        >
          {isSubmitting || isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Enviar Convite
            </>
          )}
        </button>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-ceramic-text-secondary/70 text-center pt-2">
        O membro receberá um email com o convite para participar deste espaço
      </p>
    </form>
  );
};

export default InviteMemberForm;
