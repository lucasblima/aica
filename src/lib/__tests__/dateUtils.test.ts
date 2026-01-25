/**
 * dateUtils Unit Tests
 * Issue #92: feat(whatsapp): Exibir lista de contatos sincronizados com UI rica
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatRelativeTime,
  formatLastInteraction,
  getDaysSince,
  isWithinDays,
  isRecent,
  isStale,
} from '../dateUtils';

describe('dateUtils', () => {
  // Mock current date to 2026-01-25 12:00:00
  const NOW = new Date('2026-01-25T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatRelativeTime', () => {
    it('returns empty string for null/undefined', () => {
      expect(formatRelativeTime(null)).toBe('');
      expect(formatRelativeTime(undefined)).toBe('');
    });

    it('returns empty string for invalid date', () => {
      expect(formatRelativeTime('invalid')).toBe('');
      expect(formatRelativeTime(NaN)).toBe('');
    });

    it('returns "agora" for less than 1 minute ago', () => {
      const thirtySecsAgo = new Date(NOW.getTime() - 30 * 1000);
      expect(formatRelativeTime(thirtySecsAgo)).toBe('agora');
    });

    it('returns minutes ago', () => {
      const fiveMinAgo = new Date(NOW.getTime() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinAgo)).toBe('5min atrás');
    });

    it('returns short format for minutes', () => {
      const fiveMinAgo = new Date(NOW.getTime() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinAgo, { short: true })).toBe('5m');
    });

    it('returns "há X minutos" format with prefix', () => {
      const fiveMinAgo = new Date(NOW.getTime() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinAgo, { useHaPrefix: true })).toBe('há 5 minutos');
    });

    it('returns hours ago', () => {
      const twoHoursAgo = new Date(NOW.getTime() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo)).toBe('2h atrás');
    });

    it('returns "Ontem" for yesterday', () => {
      const yesterday = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(yesterday)).toBe('Ontem');
    });

    it('returns days ago for 2-6 days', () => {
      const threeDaysAgo = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeDaysAgo)).toBe('3 dias atrás');
    });

    it('returns weeks ago for 1-3 weeks', () => {
      const twoWeeksAgo = new Date(NOW.getTime() - 14 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoWeeksAgo)).toBe('2 semanas atrás');
    });

    it('returns months ago for older dates', () => {
      const twoMonthsAgo = new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoMonthsAgo)).toBe('2 meses atrás');
    });

    // Future dates
    it('returns "Amanhã" for tomorrow', () => {
      const tomorrow = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(tomorrow)).toBe('Amanhã');
    });

    it('returns "em X dias" for future dates', () => {
      const threeDaysLater = new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeDaysLater)).toBe('em 3 dias');
    });
  });

  describe('formatLastInteraction', () => {
    it('returns "Sem interação" for null', () => {
      expect(formatLastInteraction(null)).toBe('Sem interação');
      expect(formatLastInteraction(undefined)).toBe('Sem interação');
    });

    it('returns formatted time with "há" prefix', () => {
      const twoHoursAgo = new Date(NOW.getTime() - 2 * 60 * 60 * 1000);
      expect(formatLastInteraction(twoHoursAgo)).toBe('há 2 horas');
    });
  });

  describe('getDaysSince', () => {
    it('returns -1 for null/undefined', () => {
      expect(getDaysSince(null)).toBe(-1);
      expect(getDaysSince(undefined)).toBe(-1);
    });

    it('returns -1 for invalid date', () => {
      expect(getDaysSince('invalid')).toBe(-1);
    });

    it('returns 0 for today', () => {
      expect(getDaysSince(NOW)).toBe(0);
    });

    it('returns correct days for past dates', () => {
      const fiveDaysAgo = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
      expect(getDaysSince(fiveDaysAgo)).toBe(5);
    });
  });

  describe('isWithinDays', () => {
    it('returns false for null', () => {
      expect(isWithinDays(null, 7)).toBe(false);
    });

    it('returns true for dates within range', () => {
      const threeDaysAgo = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(isWithinDays(threeDaysAgo, 7)).toBe(true);
    });

    it('returns false for dates outside range', () => {
      const tenDaysAgo = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000);
      expect(isWithinDays(tenDaysAgo, 7)).toBe(false);
    });
  });

  describe('isRecent', () => {
    it('returns true for dates within 7 days', () => {
      const threeDaysAgo = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(isRecent(threeDaysAgo)).toBe(true);
    });

    it('returns false for dates older than 7 days', () => {
      const tenDaysAgo = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000);
      expect(isRecent(tenDaysAgo)).toBe(false);
    });
  });

  describe('isStale', () => {
    it('returns false for dates within 30 days', () => {
      const twentyDaysAgo = new Date(NOW.getTime() - 20 * 24 * 60 * 60 * 1000);
      expect(isStale(twentyDaysAgo)).toBe(false);
    });

    it('returns true for dates older than 30 days', () => {
      const fortyDaysAgo = new Date(NOW.getTime() - 40 * 24 * 60 * 60 * 1000);
      expect(isStale(fortyDaysAgo)).toBe(true);
    });
  });
});
