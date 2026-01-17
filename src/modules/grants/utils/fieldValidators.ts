/**
 * Field Validators for Organization Wizard
 * Issue #100 - Validacoes de CNPJ, email e telefone
 *
 * Funcoes de validacao para campos do wizard de organizacoes.
 */

// =============================================================================
// CNPJ Validation
// =============================================================================

/**
 * Remove caracteres nao numericos do CNPJ
 */
export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Formata CNPJ para exibicao (XX.XXX.XXX/XXXX-XX)
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cleanCNPJ(cnpj);
  if (cleaned.length !== 14) return cnpj;

  return cleaned.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Valida CNPJ com digito verificador
 * Retorna null se valido, mensagem de erro se invalido
 */
export function validateCNPJ(value: unknown): string | null {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return null; // Campo opcional vazio e valido
  }

  const cnpj = cleanCNPJ(value);

  // Verifica tamanho
  if (cnpj.length !== 14) {
    return 'CNPJ deve ter 14 digitos';
  }

  // Verifica CNPJs invalidos conhecidos
  const invalidCNPJs = [
    '00000000000000',
    '11111111111111',
    '22222222222222',
    '33333333333333',
    '44444444444444',
    '55555555555555',
    '66666666666666',
    '77777777777777',
    '88888888888888',
    '99999999999999',
  ];

  if (invalidCNPJs.includes(cnpj)) {
    return 'CNPJ invalido';
  }

  // Calcula primeiro digito verificador
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;

  // Loop ascendente convencional (mais legível)
  for (let i = 0; i < size; i++) {
    sum += parseInt(numbers.charAt(i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) {
    return 'CNPJ invalido (digito verificador)';
  }

  // Calcula segundo digito verificador
  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;

  // Loop ascendente convencional (mais legível)
  for (let i = 0; i < size; i++) {
    sum += parseInt(numbers.charAt(i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) {
    return 'CNPJ invalido (digito verificador)';
  }

  return null; // Valido
}

// =============================================================================
// Email Validation
// =============================================================================

/**
 * Valida formato de email
 * Retorna null se valido, mensagem de erro se invalido
 */
export function validateEmail(value: unknown): string | null {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return null; // Campo opcional vazio e valido
  }

  const email = value.trim().toLowerCase();

  // RFC 5322 compliant regex (simplified)
  const emailRegex = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;

  if (!emailRegex.test(email)) {
    return 'Email invalido';
  }

  // Verifica se tem dominio com pelo menos 2 caracteres
  const parts = email.split('@');
  if (parts.length !== 2) {
    return 'Email invalido';
  }

  const domain = parts[1];
  if (!domain.includes('.')) {
    return 'Email deve ter um dominio valido (ex: @dominio.com)';
  }

  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) {
    return 'Email deve ter uma extensao valida (ex: .com, .org, .br)';
  }

  return null; // Valido
}

// =============================================================================
// Phone Validation
// =============================================================================

/**
 * Remove caracteres nao numericos do telefone
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Formata telefone brasileiro para exibicao
 * Suporta: (XX) XXXX-XXXX ou (XX) XXXXX-XXXX
 */
export function formatPhone(phone: string): string {
  const cleaned = cleanPhone(phone);

  if (cleaned.length === 10) {
    // Fixo: (XX) XXXX-XXXX
    return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }

  if (cleaned.length === 11) {
    // Celular: (XX) XXXXX-XXXX
    return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }

  // Se nao encaixar, retorna original
  return phone;
}

/**
 * Valida telefone brasileiro
 * Aceita fixo (10 digitos) ou celular (11 digitos)
 * Retorna null se valido, mensagem de erro se invalido
 */
export function validatePhone(value: unknown): string | null {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return null; // Campo opcional vazio e valido
  }

  const phone = cleanPhone(value);

  // Verifica tamanho (10 = fixo, 11 = celular)
  if (phone.length < 10 || phone.length > 11) {
    return 'Telefone deve ter 10 ou 11 digitos';
  }

  // Verifica DDD valido (11-99)
  const ddd = parseInt(phone.substring(0, 2));
  if (ddd < 11 || ddd > 99) {
    return 'DDD invalido';
  }

  // Se for celular (11 digitos), deve comecar com 9
  if (phone.length === 11 && phone.charAt(2) !== '9') {
    return 'Celular deve comecar com 9';
  }

  // Se for fixo (10 digitos), nao pode comecar com 9
  if (phone.length === 10 && phone.charAt(2) === '9') {
    return 'Para celular, inclua os 11 digitos';
  }

  return null; // Valido
}

// =============================================================================
// URL Validation
// =============================================================================

/**
 * Valida URL de website
 * Retorna null se valido, mensagem de erro se invalido
 */
export function validateURL(value: unknown): string | null {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return null; // Campo opcional vazio e valido
  }

  const url = value.trim();

  // Tenta criar URL para validacao
  try {
    const parsed = new URL(url);

    // Verifica protocolo
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return 'URL deve comecar com http:// ou https://';
    }

    // Verifica hostname
    if (!parsed.hostname || parsed.hostname.length < 3) {
      return 'URL deve ter um dominio valido';
    }

    return null; // Valido
  } catch {
    // Se falhar ao criar URL, tenta adicionar https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      try {
        new URL(`https://${url}`);
        return 'URL deve comecar com https://';
      } catch {
        return 'URL invalida';
      }
    }
    return 'URL invalida';
  }
}

// =============================================================================
// CEP Validation
// =============================================================================

/**
 * Remove caracteres nao numericos do CEP
 */
export function cleanCEP(cep: string): string {
  return cep.replace(/\D/g, '');
}

/**
 * Formata CEP para exibicao (XXXXX-XXX)
 */
export function formatCEP(cep: string): string {
  const cleaned = cleanCEP(cep);
  if (cleaned.length !== 8) return cep;

  return cleaned.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

/**
 * Valida CEP brasileiro
 * Retorna null se valido, mensagem de erro se invalido
 */
export function validateCEP(value: unknown): string | null {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return null; // Campo opcional vazio e valido
  }

  const cep = cleanCEP(value);

  if (cep.length !== 8) {
    return 'CEP deve ter 8 digitos';
  }

  // CEPs invalidos conhecidos
  if (['00000000', '11111111', '22222222', '33333333', '44444444',
       '55555555', '66666666', '77777777', '88888888', '99999999'].includes(cep)) {
    return 'CEP invalido';
  }

  return null; // Valido
}

// =============================================================================
// Validation Map
// =============================================================================

/**
 * Mapa de validadores por nome de campo
 */
export const FIELD_VALIDATORS: Record<string, (value: unknown) => string | null> = {
  document_number: validateCNPJ,
  email: validateEmail,
  phone: validatePhone,
  website: validateURL,
  address_zip: validateCEP,
};

/**
 * Obtem validador para um campo especifico
 */
export function getFieldValidator(fieldName: string): ((value: unknown) => string | null) | undefined {
  return FIELD_VALIDATORS[fieldName];
}

/**
 * Valida um campo pelo nome
 * Retorna null se valido ou campo sem validador, mensagem de erro se invalido
 */
export function validateField(fieldName: string, value: unknown): string | null {
  const validator = FIELD_VALIDATORS[fieldName];
  if (!validator) return null;
  return validator(value);
}
