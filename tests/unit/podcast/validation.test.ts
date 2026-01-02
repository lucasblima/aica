/**
 * Unit tests for validation utilities
 * Testing guest contact information validation functions
 * Target coverage: >90%
 */

import { describe, it, expect } from 'vitest';
import {
  validateName,
  validatePhone,
  validateEmail,
  formatPhone,
  type ValidationResult,
} from '@/modules/podcast/utils/validation';

describe('validateName', () => {
  describe('Valid names', () => {
    it('should accept simple name', () => {
      const result = validateName('João Silva');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept name with accents', () => {
      const result = validateName('José María González');
      expect(result.isValid).toBe(true);
    });

    it('should accept name with apostrophes', () => {
      const result = validateName("O'Brien");
      expect(result.isValid).toBe(true);
    });

    it('should accept name with hyphens', () => {
      const result = validateName('Jean-Claude Van Damme');
      expect(result.isValid).toBe(true);
    });

    it('should accept complex international name', () => {
      const result = validateName("François O'Connor-García");
      expect(result.isValid).toBe(true);
    });

    it('should accept name with ç, ã, õ', () => {
      const result = validateName('João Gonçalves');
      expect(result.isValid).toBe(true);
    });

    it('should accept name with German umlaut', () => {
      const result = validateName('Müller');
      expect(result.isValid).toBe(true);
    });

    it('should accept minimum length name (3 chars)', () => {
      const result = validateName('Ana');
      expect(result.isValid).toBe(true);
    });

    it('should accept long name up to 150 characters', () => {
      const longName = 'A'.repeat(150);
      const result = validateName(longName);
      expect(result.isValid).toBe(true);
    });

    it('should trim whitespace and validate', () => {
      const result = validateName('  João Silva  ');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Invalid names', () => {
    it('should reject empty string', () => {
      const result = validateName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nome é obrigatório');
    });

    it('should reject whitespace-only string', () => {
      const result = validateName('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nome é obrigatório');
    });

    it('should reject name shorter than 3 characters', () => {
      const result = validateName('Jo');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nome deve ter pelo menos 3 caracteres');
    });

    it('should reject name longer than 150 characters', () => {
      const longName = 'A'.repeat(151);
      const result = validateName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nome muito longo (máximo 150 caracteres)');
    });

    it('should reject name with numbers', () => {
      const result = validateName('João123');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nome contém caracteres inválidos');
    });

    it('should reject name with special symbols', () => {
      const result = validateName('João@Silva');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nome contém caracteres inválidos');
    });

    it('should reject name with parentheses', () => {
      const result = validateName('João (Silva)');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nome contém caracteres inválidos');
    });
  });
});

describe('validatePhone', () => {
  describe('Valid phones', () => {
    it('should accept 11-digit mobile number', () => {
      const result = validatePhone('11987654321');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept formatted mobile number', () => {
      const result = validatePhone('(11) 98765-4321');
      expect(result.isValid).toBe(true);
    });

    it('should accept mobile with +55 country code', () => {
      const result = validatePhone('+5511987654321');
      expect(result.isValid).toBe(true);
    });

    it('should accept formatted phone with +55 and spaces', () => {
      const result = validatePhone('+55 11 98765-4321');
      expect(result.isValid).toBe(true);
    });

    it('should accept 10-digit landline number', () => {
      const result = validatePhone('1133334444');
      expect(result.isValid).toBe(true);
    });

    it('should accept formatted landline', () => {
      const result = validatePhone('(11) 3333-4444');
      expect(result.isValid).toBe(true);
    });

    it('should accept landline with +55', () => {
      const result = validatePhone('+551133334444');
      expect(result.isValid).toBe(true);
    });

    it('should accept phone with spaces between digits', () => {
      const result = validatePhone('11 9 8765-4321');
      expect(result.isValid).toBe(true);
    });

    it('should trim whitespace and validate', () => {
      const result = validatePhone('  11987654321  ');
      expect(result.isValid).toBe(true);
    });

    it('should accept +55 with parentheses format', () => {
      const result = validatePhone('+55 (11) 98765-4321');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Invalid phones', () => {
    it('should reject empty string', () => {
      const result = validatePhone('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Telefone é obrigatório');
    });

    it('should reject whitespace-only string', () => {
      const result = validatePhone('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Telefone é obrigatório');
    });

    it('should reject phone with too few digits', () => {
      const result = validatePhone('119876543');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Telefone inválido');
    });

    it('should reject phone with too many digits', () => {
      const result = validatePhone('119876543210');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Telefone inválido');
    });

    it('should reject phone with letters', () => {
      const result = validatePhone('11abc987654');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Telefone inválido');
    });

    it('should reject incomplete phone with formatting', () => {
      const result = validatePhone('(11) 9876-543');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Telefone inválido');
    });

    it('should reject +55 with insufficient digits', () => {
      const result = validatePhone('+5511987654');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Telefone inválido');
    });
  });
});

describe('validateEmail', () => {
  describe('Valid emails', () => {
    it('should accept simple email', () => {
      const result = validateEmail('joao@exemplo.com');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept email with dots in local part', () => {
      const result = validateEmail('joao.silva@exemplo.com');
      expect(result.isValid).toBe(true);
    });

    it('should accept email with numbers', () => {
      const result = validateEmail('joao123@exemplo.com');
      expect(result.isValid).toBe(true);
    });

    it('should accept email with subdomain', () => {
      const result = validateEmail('joao@mail.exemplo.com');
      expect(result.isValid).toBe(true);
    });

    it('should accept email with hyphen in domain', () => {
      const result = validateEmail('joao@exemplo-mail.com');
      expect(result.isValid).toBe(true);
    });

    it('should accept email with underscore', () => {
      const result = validateEmail('joao_silva@exemplo.com');
      expect(result.isValid).toBe(true);
    });

    it('should accept email with plus sign', () => {
      const result = validateEmail('joao+newsletter@exemplo.com');
      expect(result.isValid).toBe(true);
    });

    it('should trim whitespace and validate', () => {
      const result = validateEmail('  joao@exemplo.com  ');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Invalid emails', () => {
    it('should reject empty string', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email é obrigatório');
    });

    it('should reject whitespace-only string', () => {
      const result = validateEmail('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email é obrigatório');
    });

    it('should reject email without @', () => {
      const result = validateEmail('joaoexemplo.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email inválido');
    });

    it('should reject email without domain', () => {
      const result = validateEmail('joao@');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email inválido');
    });

    it('should reject email without local part', () => {
      const result = validateEmail('@exemplo.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email inválido');
    });

    it('should reject email without TLD', () => {
      const result = validateEmail('joao@exemplo');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email inválido');
    });

    it('should reject email with spaces', () => {
      const result = validateEmail('joao silva@exemplo.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email inválido');
    });

    it('should reject email with multiple @', () => {
      const result = validateEmail('joao@@exemplo.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email inválido');
    });
  });
});

describe('formatPhone', () => {
  describe('11-digit mobile numbers', () => {
    it('should format plain 11-digit number', () => {
      const formatted = formatPhone('11987654321');
      expect(formatted).toBe('(11) 98765-4321');
    });

    it('should format number that already has formatting', () => {
      const formatted = formatPhone('(11) 98765-4321');
      expect(formatted).toBe('(11) 98765-4321');
    });

    it('should format number with +55 prefix', () => {
      const formatted = formatPhone('+5511987654321');
      expect(formatted).toBe('(11) 98765-4321');
    });

    it('should format number with +55 and formatting', () => {
      const formatted = formatPhone('+55 (11) 98765-4321');
      expect(formatted).toBe('(11) 98765-4321');
    });

    it('should format number with spaces', () => {
      const formatted = formatPhone('11 9 8765 4321');
      expect(formatted).toBe('(11) 98765-4321');
    });
  });

  describe('10-digit landline numbers', () => {
    it('should format plain 10-digit number', () => {
      const formatted = formatPhone('1133334444');
      expect(formatted).toBe('(11) 3333-4444');
    });

    it('should format landline that already has formatting', () => {
      const formatted = formatPhone('(11) 3333-4444');
      expect(formatted).toBe('(11) 3333-4444');
    });

    it('should format landline with +55 prefix', () => {
      const formatted = formatPhone('+551133334444');
      expect(formatted).toBe('(11) 3333-4444');
    });

    it('should format landline with +55 and formatting', () => {
      const formatted = formatPhone('+55 (11) 3333-4444');
      expect(formatted).toBe('(11) 3333-4444');
    });
  });

  describe('Edge cases', () => {
    it('should return original if not 10 or 11 digits', () => {
      const formatted = formatPhone('123456789');
      expect(formatted).toBe('123456789');
    });

    it('should return original if too many digits', () => {
      const formatted = formatPhone('119876543210');
      expect(formatted).toBe('119876543210');
    });

    it('should handle empty string', () => {
      const formatted = formatPhone('');
      expect(formatted).toBe('');
    });

    it('should handle string with only special characters', () => {
      const formatted = formatPhone('()-');
      expect(formatted).toBe('()-');
    });
  });
});
