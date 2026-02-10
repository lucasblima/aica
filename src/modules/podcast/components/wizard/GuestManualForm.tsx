/**
 * Guest Manual Form - Step 1b of Guest Identification Wizard
 *
 * Manual form for entering guest contact information in Direct Contact workflow.
 * Collects: name, phone, email
 *
 * Features:
 * - Real-time validation as user types
 * - Error messages with LGPD-compliant privacy notice
 * - Input masking for phone numbers
 */

import React, { useState, useEffect } from 'react';
import {
  validateName,
  validatePhone,
  validateEmail,
  formatPhone,
} from '../../utils/validation';

export interface GuestManualFormProps {
  initialData?: {
    name: string;
    phone: string;
    email: string;
  };
  onSubmit: (data: { name: string; phone: string; email: string }) => void;
  onBack: () => void;
}

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
}

export const GuestManualForm: React.FC<GuestManualFormProps> = ({
  initialData,
  onSubmit,
  onBack,
}) => {
  // Form state
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
  });

  // Error state
  const [errors, setErrors] = useState<FormErrors>({});

  // Touched state (to show errors only after user interacts with field)
  const [touched, setTouched] = useState({
    name: false,
    phone: false,
    email: false,
  });

  // Handle input changes
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle field blur (validate when user leaves field)
  const handleBlur = (field: keyof typeof formData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Validate field
    let validationResult;
    switch (field) {
      case 'name':
        validationResult = validateName(formData.name);
        break;
      case 'phone':
        validationResult = validatePhone(formData.phone);
        break;
      case 'email':
        validationResult = validateEmail(formData.email);
        break;
    }

    if (!validationResult.isValid) {
      setErrors((prev) => ({ ...prev, [field]: validationResult.error }));
    }
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const nameValidation = validateName(formData.name);
    const phoneValidation = validatePhone(formData.phone);
    const emailValidation = validateEmail(formData.email);

    const newErrors: FormErrors = {};

    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.error;
    }

    if (!phoneValidation.isValid) {
      newErrors.phone = phoneValidation.error;
    }

    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }

    setErrors(newErrors);

    // Mark all fields as touched
    setTouched({ name: true, phone: true, email: true });

    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
      });
    }
  };

  // Check if form is valid (for button state)
  const isFormValid =
    formData.name.trim() !== '' &&
    formData.phone.trim() !== '' &&
    formData.email.trim() !== '' &&
    Object.keys(errors).length === 0;

  return (
    <form onSubmit={handleSubmit} className="ceramic-card p-8 space-y-6">
      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-ceramic-text-primary">
          Dados do Convidado
        </h2>
        <p className="text-ceramic-text-secondary">
          Preencha as informações de contato
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-5">
        {/* Name Field */}
        <div>
          <label
            htmlFor="guest-name"
            className="block text-sm font-medium text-ceramic-text-primary mb-2"
          >
            Nome completo <span className="text-ceramic-error">*</span>
          </label>
          <input
            id="guest-name"
            type="text"
            data-testid="guest-manual-name"
            placeholder="Ex: João Silva"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            className={`
              ceramic-input w-full
              ${touched.name && errors.name ? 'border-ceramic-error focus:ring-ceramic-error' : ''}
            `}
          />
          {touched.name && errors.name && (
            <p className="text-ceramic-error text-sm mt-1">{errors.name}</p>
          )}
        </div>

        {/* Phone Field */}
        <div>
          <label
            htmlFor="guest-phone"
            className="block text-sm font-medium text-ceramic-text-primary mb-2"
          >
            Telefone <span className="text-ceramic-error">*</span>
          </label>
          <input
            id="guest-phone"
            type="tel"
            data-testid="guest-manual-phone"
            placeholder="(11) 99999-9999"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            onBlur={() => handleBlur('phone')}
            className={`
              ceramic-input w-full
              ${touched.phone && errors.phone ? 'border-ceramic-error focus:ring-ceramic-error' : ''}
            `}
          />
          {touched.phone && errors.phone && (
            <p className="text-ceramic-error text-sm mt-1">{errors.phone}</p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label
            htmlFor="guest-email"
            className="block text-sm font-medium text-ceramic-text-primary mb-2"
          >
            Email <span className="text-ceramic-error">*</span>
          </label>
          <input
            id="guest-email"
            type="email"
            data-testid="guest-manual-email"
            placeholder="joao@exemplo.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            className={`
              ceramic-input w-full
              ${touched.email && errors.email ? 'border-ceramic-error focus:ring-ceramic-error' : ''}
            `}
          />
          {touched.email && errors.email && (
            <p className="text-ceramic-error text-sm mt-1">{errors.email}</p>
          )}
        </div>
      </div>

      {/* Privacy Info Box - LGPD Compliance */}
      <div className="ceramic-inset p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="text-xl flex-shrink-0">ℹ️</div>
          <div className="text-sm text-ceramic-text-secondary leading-relaxed">
            <strong className="text-ceramic-text-primary">
              Privacidade e Segurança:
            </strong>{' '}
            Seus dados são confidenciais e serão usados apenas para enviar o
            convite do podcast. Não compartilhamos com terceiros e você pode
            solicitar a exclusão a qualquer momento (LGPD).
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-between">
        <button
          type="button"
          data-testid="guest-manual-back"
          onClick={onBack}
          className="ceramic-button-secondary px-6 py-3 rounded-xl font-bold transition-all"
        >
          ◀ Voltar
        </button>

        <button
          type="submit"
          data-testid="guest-manual-submit"
          disabled={!isFormValid}
          className={`
            px-6 py-3 rounded-xl font-bold transition-all
            ${
              isFormValid
                ? 'ceramic-button-primary'
                : 'bg-ceramic-cool text-ceramic-text-tertiary cursor-not-allowed'
            }
          `}
        >
          Continuar ▶
        </button>
      </div>
    </form>
  );
};

export default GuestManualForm;
