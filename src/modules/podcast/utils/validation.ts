/**
 * Validation utilities for podcast wizard forms
 * Provides validation functions for guest contact information
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates guest name
 * - Name is required
 * - Must have at least 3 characters
 */
export const validateName = (name: string): ValidationResult => {
  const trimmed = name.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Nome é obrigatório' };
  }

  if (trimmed.length < 3) {
    return { isValid: false, error: 'Nome deve ter pelo menos 3 caracteres' };
  }

  return { isValid: true };
};

/**
 * Validates phone number
 * - Phone is required
 * - Must have 10 or 11 digits (with or without DDD)
 * - Accepts various formats: (11) 99999-9999, 11999999999, etc.
 */
export const validatePhone = (phone: string): ValidationResult => {
  const trimmed = phone.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Telefone é obrigatório' };
  }

  // Remove all non-numeric characters
  const digitsOnly = trimmed.replace(/\D/g, '');

  // Accept 10 or 11 digits (with or without DDD)
  if (digitsOnly.length < 10 || digitsOnly.length > 11) {
    return { isValid: false, error: 'Telefone inválido' };
  }

  return { isValid: true };
};

/**
 * Validates email address
 * - Email is required
 * - Must match basic email pattern
 */
export const validateEmail = (email: string): ValidationResult => {
  const trimmed = email.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Email é obrigatório' };
  }

  // Simple email regex for validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Email inválido' };
  }

  return { isValid: true };
};

/**
 * Formats phone number to Brazilian format (11) 99999-9999
 */
export const formatPhone = (phone: string): string => {
  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.length === 11) {
    return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2, 7)}-${digitsOnly.slice(7)}`;
  }

  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2, 6)}-${digitsOnly.slice(6)}`;
  }

  return phone;
};
