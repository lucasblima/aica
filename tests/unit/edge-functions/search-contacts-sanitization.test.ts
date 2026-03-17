import { describe, it, expect } from 'vitest';

/**
 * Tests for PostgREST filter sanitization patterns used in search-contacts.
 * These regex patterns strip PostgREST operators to prevent filter injection.
 *
 * The actual sanitization in search-contacts/index.ts:
 *   - Query (user input): .replace(/[',.*()]/g, '')
 *   - Phone numbers: .replace(/[^+\d]/g, '')
 */

// Extract the sanitization patterns used in the Edge Function
const sanitizeQuery = (input: string): string => input.replace(/[',.*()]/g, '');
const sanitizePhone = (input: string): string => input.replace(/[^+\d]/g, '');

describe('search-contacts sanitization', () => {
  describe('sanitizeQuery — strips PostgREST operators from user input', () => {
    it('passes through normal search terms', () => {
      expect(sanitizeQuery('João Silva')).toBe('João Silva');
      expect(sanitizeQuery('maria')).toBe('maria');
      expect(sanitizeQuery('Dr Pedro')).toBe('Dr Pedro');
    });

    it('strips single quotes (SQL injection vector)', () => {
      expect(sanitizeQuery("test' OR '1'='1")).toBe('test OR 1=1');
      expect(sanitizeQuery("O'Brien")).toBe('OBrien');
    });

    it('strips PostgREST filter operators (commas, dots, parens, asterisks)', () => {
      // Comma injection: could add extra filter conditions
      expect(sanitizeQuery('test,id.eq.1')).toBe('testideq1');
      // Dot injection: could specify column.operator patterns
      expect(sanitizeQuery('name.eq.admin')).toBe('nameeqadmin');
      // Parentheses: could alter grouping
      expect(sanitizeQuery('test(or)hack')).toBe('testorhack');
      // Asterisk: could be used as wildcard operator
      expect(sanitizeQuery('test*')).toBe('test');
    });

    it('strips combined attack patterns', () => {
      expect(sanitizeQuery("'),name.eq.admin--")).toBe('nameeqadmin--');
      expect(sanitizeQuery("test,phone_number.eq.'*'")).toBe('testphone_numbereq');
    });

    it('handles empty and whitespace input', () => {
      expect(sanitizeQuery('')).toBe('');
      expect(sanitizeQuery('   ')).toBe('   ');
    });
  });

  describe('sanitizePhone — whitelist only digits and +', () => {
    it('passes through valid phone numbers', () => {
      expect(sanitizePhone('+5511987654321')).toBe('+5511987654321');
      expect(sanitizePhone('5511987654321')).toBe('5511987654321');
    });

    it('strips non-phone characters', () => {
      expect(sanitizePhone('+55 (11) 98765-4321')).toBe('+5511987654321');
      expect(sanitizePhone('phone: 123')).toBe('123');
    });

    it('strips SQL injection attempts', () => {
      expect(sanitizePhone("' OR '1'='1")).toBe('11');
      expect(sanitizePhone("5511987654321'; DROP TABLE--")).toBe('5511987654321');
    });

    it('strips PostgREST operator injection', () => {
      expect(sanitizePhone('+55,id.eq.1')).toBe('+551');
      expect(sanitizePhone('123.456')).toBe('123456');
    });

    it('handles empty input', () => {
      expect(sanitizePhone('')).toBe('');
    });
  });
});
