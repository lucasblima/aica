/**
 * GuestManualForm Component
 *
 * Form for manually entering guest contact information.
 * Used for "Common Person" guests who don't have public presence.
 *
 * Collects: Name, Phone, Email
 * Validates: Required fields and email format
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Phone, Mail, AlertCircle, Check } from 'lucide-react'

export interface GuestManualData {
  name: string
  phone: string
  email: string
}

interface GuestManualFormProps {
  initialData?: Partial<GuestManualData>
  onSubmit: (data: GuestManualData) => void
  onBack?: () => void
  className?: string
}

export const GuestManualForm: React.FC<GuestManualFormProps> = ({
  initialData,
  onSubmit,
  onBack,
  className = ''
}) => {
  const [formData, setFormData] = useState<GuestManualData>({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || ''
  })

  const [errors, setErrors] = useState<Partial<Record<keyof GuestManualData, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof GuestManualData, boolean>>>({})

  // Check if field is valid (for positive feedback)
  const isFieldValid = (field: keyof GuestManualData): boolean => {
    const value = formData[field]
    if (!value || !touched[field]) return false

    switch (field) {
      case 'name':
        return value.trim().length >= 3
      case 'email':
        return validateEmail(value)
      case 'phone':
        return validatePhone(value)
      default:
        return false
    }
  }

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Format phone number with Brazilian mask
  const formatPhone = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')

    // Apply mask based on length
    if (digits.length <= 2) {
      return digits
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    } else if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    } else {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
    }
  }

  // Validate phone format (Brazilian format)
  const validatePhone = (phone: string): boolean => {
    // Remove non-digits
    const digits = phone.replace(/\D/g, '')
    // Accept 10 or 11 digits (with or without country code)
    return digits.length >= 10 && digits.length <= 13
  }

  // Handle field change
  const handleChange = (field: keyof GuestManualData, value: string) => {
    // Apply phone mask automatically
    if (field === 'phone') {
      const formatted = formatPhone(value)
      setFormData(prev => ({ ...prev, [field]: formatted }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // Handle field blur
  const handleBlur = (field: keyof GuestManualData) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    validateField(field, formData[field])
  }

  // Validate single field
  const validateField = (field: keyof GuestManualData, value: string) => {
    let error: string | undefined

    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = 'Nome é obrigatório'
        } else if (value.trim().length < 3) {
          error = 'Nome deve ter pelo menos 3 caracteres'
        }
        break
      case 'email':
        if (!value.trim()) {
          error = 'Email é obrigatório'
        } else if (!validateEmail(value)) {
          error = 'Digite um email válido (ex: nome@exemplo.com)'
        }
        break
      case 'phone':
        if (!value.trim()) {
          error = 'Telefone é obrigatório'
        } else if (!validatePhone(value)) {
          error = 'Digite um telefone válido com DDD'
        }
        break
    }

    setErrors(prev => ({ ...prev, [field]: error }))
    return !error
  }

  // Validate all fields
  const validateForm = (): boolean => {
    const nameValid = validateField('name', formData.name)
    const emailValid = validateField('email', formData.email)
    const phoneValid = validateField('phone', formData.phone)

    setTouched({
      name: true,
      email: true,
      phone: true
    })

    return nameValid && emailValid && phoneValid
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      onSubmit(formData)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`max-w-md mx-auto ${className}`}
      data-testid="guest-manual-form"
    >
      <div className="text-center space-y-2 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Dados do Convidado
        </h2>
        <p className="text-sm text-gray-600">
          Preencha as informações de contato
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div>
          <label htmlFor="guest-name-input" className="block text-sm font-medium text-gray-700 mb-1">
            Nome Completo <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
            <input
              id="guest-name-input"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              placeholder="Ex: João Silva"
              data-testid="guest-manual-name"
              autoComplete="name"
              aria-invalid={!!(errors.name && touched.name)}
              aria-describedby={errors.name && touched.name ? 'guest-name-error' : undefined}
              className={`
                w-full pl-10 pr-10 py-2 border rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${errors.name && touched.name ? 'border-red-500' : isFieldValid('name') ? 'border-green-500' : 'border-gray-300'}
              `}
            />
            {isFieldValid('name') && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" aria-hidden="true" />
            )}
          </div>
          {errors.name && touched.name && (
            <div id="guest-name-error" role="alert" className="flex items-center gap-1 mt-1 text-xs text-red-600">
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              <span>{errors.name}</span>
            </div>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="guest-email-input" className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
            <input
              id="guest-email-input"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="joao@exemplo.com"
              data-testid="guest-manual-email"
              autoComplete="email"
              aria-invalid={!!(errors.email && touched.email)}
              aria-describedby={errors.email && touched.email ? 'guest-email-error' : undefined}
              className={`
                w-full pl-10 pr-10 py-2 border rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${errors.email && touched.email ? 'border-red-500' : isFieldValid('email') ? 'border-green-500' : 'border-gray-300'}
              `}
            />
            {isFieldValid('email') && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" aria-hidden="true" />
            )}
          </div>
          {errors.email && touched.email && (
            <div id="guest-email-error" role="alert" className="flex items-center gap-1 mt-1 text-xs text-red-600">
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              <span>{errors.email}</span>
            </div>
          )}
        </div>

        {/* Phone Field */}
        <div>
          <label htmlFor="guest-phone-input" className="block text-sm font-medium text-gray-700 mb-1">
            Telefone/WhatsApp <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
            <input
              id="guest-phone-input"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
              placeholder="(11) 99999-9999"
              data-testid="guest-manual-phone"
              autoComplete="tel"
              aria-invalid={!!(errors.phone && touched.phone)}
              aria-describedby={errors.phone && touched.phone ? 'guest-phone-error' : undefined}
              className={`
                w-full pl-10 pr-10 py-2 border rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${errors.phone && touched.phone ? 'border-red-500' : isFieldValid('phone') ? 'border-green-500' : 'border-gray-300'}
              `}
            />
            {isFieldValid('phone') && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" aria-hidden="true" />
            )}
          </div>
          {errors.phone && touched.phone && (
            <div id="guest-phone-error" role="alert" className="flex items-center gap-1 mt-1 text-xs text-red-600">
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              <span>{errors.phone}</span>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p className="text-xs text-blue-800">
              Essas informações serão usadas para enviar a pauta e lembretes da entrevista.
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 mt-6">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              data-testid="guest-manual-back"
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Voltar
            </button>
          )}
          <button
            type="submit"
            data-testid="guest-manual-submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Continuar
          </button>
        </div>
      </form>
    </motion.div>
  )
}

export default GuestManualForm
