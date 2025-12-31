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
 * - Maximum 150 characters
 * - Supports special characters:
 *   - Accents: á, é, í, ó, ú, ã, õ, ç
 *   - Apostrophes: ' (e.g., O'Brien)
 *   - Hyphens: - (e.g., Jean-Claude)
 *   - Multiple spaces between names
 * - Examples: "José Maria", "O'Brien-Garcia", "François Müller"
 */
export const validateName = (name: string): ValidationResult => {
  const trimmed = name.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Nome é obrigatório' };
  }

  if (trimmed.length < 3) {
    return { isValid: false, error: 'Nome deve ter pelo menos 3 caracteres' };
  }

  if (trimmed.length > 150) {
    return { isValid: false, error: 'Nome muito longo (máximo 150 caracteres)' };
  }

  // Allow letters (including accented), spaces, hyphens, apostrophes
  // This regex accepts Unicode letters, spaces, hyphens, and apostrophes
  const validNameRegex = /^[\p{L}\s'\-]+$/u;

  if (!validNameRegex.test(trimmed)) {
    return { isValid: false, error: 'Nome contém caracteres inválidos' };
  }

  return { isValid: true };
};

/**
 * Validates Brazilian phone number
 * - Phone is required
 * - Must have 10 or 11 digits (with or without DDD)
 * - Accepts various formats:
 *   - (11) 99999-9999
 *   - 11999999999
 *   - +55 11 99999-9999
 *   - +5511999999999
 *   - 11 9 9999-9999
 * - Automatically handles +55 country code
 * - Removes all spaces, parentheses, hyphens automatically
 */
export const validatePhone = (phone: string): ValidationResult => {
  const trimmed = phone.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Telefone é obrigatório' };
  }

  // Remove all non-numeric characters
  let digitsOnly = trimmed.replace(/\D/g, '');

  // Remove +55 country code if present
  if (digitsOnly.startsWith('55') && digitsOnly.length >= 12) {
    digitsOnly = digitsOnly.slice(2);
  }

  // Accept 10 or 11 digits (with or without DDD)
  // 10 digits: (DDD) + 8 digits (landline)
  // 11 digits: (DDD) + 9 digits (mobile with 9 prefix)
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
 * Handles +55 country code automatically
 */
export const formatPhone = (phone: string): string => {
  let digitsOnly = phone.replace(/\D/g, '');

  // Remove +55 country code if present
  if (digitsOnly.startsWith('55') && digitsOnly.length >= 12) {
    digitsOnly = digitsOnly.slice(2);
  }

  if (digitsOnly.length === 11) {
    // Mobile: (11) 99999-9999
    return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2, 7)}-${digitsOnly.slice(7)}`;
  }

  if (digitsOnly.length === 10) {
    // Landline: (11) 9999-9999
    return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2, 6)}-${digitsOnly.slice(6)}`;
  }

  return phone;
};
