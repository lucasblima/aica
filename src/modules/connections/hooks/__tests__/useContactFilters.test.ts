/**
 * useContactFilters Hook Unit Tests
 * Issue #92: feat(whatsapp): Exibir lista de contatos sincronizados com UI rica
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContactFilters } from '../useContactFilters';
import type { ContactNetwork } from '@/types/memoryTypes';

// Mock contacts data
const createMockContact = (overrides: Partial<ContactNetwork> = {}): ContactNetwork => ({
  id: `contact-${Math.random().toString(36).substr(2, 9)}`,
  user_id: 'user-1',
  name: 'Test Contact',
  phone_number: '+5511999999999',
  health_score: 75,
  last_interaction_at: new Date().toISOString(),
  relationship_type: 'contact',
  ...overrides,
});

describe('useContactFilters', () => {
  const NOW = new Date('2026-01-25T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('returns all contacts when no filters applied', () => {
      const contacts = [
        createMockContact({ name: 'Alice' }),
        createMockContact({ name: 'Bob' }),
      ];

      const { result } = renderHook(() => useContactFilters(contacts));

      expect(result.current.filteredContacts).toHaveLength(2);
      expect(result.current.filters.activeFilter).toBe('all');
    });

    it('calculates stats correctly', () => {
      const contacts = [
        createMockContact({ name: 'Alice', health_score: 80 }),
        createMockContact({ name: 'Bob', health_score: 30 }),
        createMockContact({
          name: 'Charlie',
          last_interaction_at: new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      ];

      const { result } = renderHook(() => useContactFilters(contacts));

      expect(result.current.stats.total).toBe(3);
      expect(result.current.stats.atRisk).toBe(1); // Bob with score 30
    });
  });

  describe('filter by type', () => {
    it('filters by favorites', () => {
      const contacts = [
        createMockContact({ id: 'fav-1', name: 'Favorite' }),
        createMockContact({ id: 'normal-1', name: 'Normal' }),
      ];

      const { result } = renderHook(() =>
        useContactFilters(contacts, { favoriteIds: ['fav-1'] })
      );

      act(() => {
        result.current.setActiveFilter('favorites');
      });

      expect(result.current.filteredContacts).toHaveLength(1);
      expect(result.current.filteredContacts[0].name).toBe('Favorite');
    });

    it('filters by recent (within 7 days)', () => {
      const contacts = [
        createMockContact({
          name: 'Recent',
          last_whatsapp_message_at: new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        }),
        createMockContact({
          name: 'Old',
          last_whatsapp_message_at: new Date(NOW.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      ];

      const { result } = renderHook(() => useContactFilters(contacts));

      act(() => {
        result.current.setActiveFilter('recent');
      });

      expect(result.current.filteredContacts).toHaveLength(1);
      expect(result.current.filteredContacts[0].name).toBe('Recent');
    });

    it('filters by at_risk (health_score < 40)', () => {
      const contacts = [
        createMockContact({ name: 'Healthy', health_score: 80 }),
        createMockContact({ name: 'AtRisk', health_score: 30 }),
      ];

      const { result } = renderHook(() => useContactFilters(contacts));

      act(() => {
        result.current.setActiveFilter('at_risk');
      });

      expect(result.current.filteredContacts).toHaveLength(1);
      expect(result.current.filteredContacts[0].name).toBe('AtRisk');
    });

    it('filters by inactive (no interaction > 30 days)', () => {
      const contacts = [
        createMockContact({
          name: 'Active',
          last_interaction_at: new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        }),
        createMockContact({
          name: 'Inactive',
          last_interaction_at: new Date(NOW.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      ];

      const { result } = renderHook(() => useContactFilters(contacts));

      act(() => {
        result.current.setActiveFilter('inactive');
      });

      expect(result.current.filteredContacts).toHaveLength(1);
      expect(result.current.filteredContacts[0].name).toBe('Inactive');
    });
  });

  describe('search', () => {
    it('filters by name', () => {
      const contacts = [
        createMockContact({ name: 'Alice Smith' }),
        createMockContact({ name: 'Bob Jones' }),
      ];

      const { result } = renderHook(() => useContactFilters(contacts));

      act(() => {
        result.current.setSearchQuery('alice');
      });

      expect(result.current.filteredContacts).toHaveLength(1);
      expect(result.current.filteredContacts[0].name).toBe('Alice Smith');
    });

    it('filters by phone number', () => {
      const contacts = [
        createMockContact({ name: 'Alice', phone_number: '+5511999999999' }),
        createMockContact({ name: 'Bob', phone_number: '+5521888888888' }),
      ];

      const { result } = renderHook(() => useContactFilters(contacts));

      act(() => {
        result.current.setSearchQuery('9999');
      });

      expect(result.current.filteredContacts).toHaveLength(1);
      expect(result.current.filteredContacts[0].name).toBe('Alice');
    });

    it('handles accented characters', () => {
      const contacts = [
        createMockContact({ name: 'José' }),
        createMockContact({ name: 'Maria' }),
      ];

      const { result } = renderHook(() => useContactFilters(contacts));

      act(() => {
        result.current.setSearchQuery('jose');
      });

      expect(result.current.filteredContacts).toHaveLength(1);
      expect(result.current.filteredContacts[0].name).toBe('José');
    });
  });

  describe('sorting', () => {
    it('sorts by name ascending (default)', () => {
      const contacts = [
        createMockContact({ name: 'Charlie' }),
        createMockContact({ name: 'Alice' }),
        createMockContact({ name: 'Bob' }),
      ];

      const { result } = renderHook(() => useContactFilters(contacts));

      expect(result.current.filteredContacts[0].name).toBe('Alice');
      expect(result.current.filteredContacts[1].name).toBe('Bob');
      expect(result.current.filteredContacts[2].name).toBe('Charlie');
    });

    it('sorts by health_score', () => {
      const contacts = [
        createMockContact({ name: 'Low', health_score: 30 }),
        createMockContact({ name: 'High', health_score: 90 }),
        createMockContact({ name: 'Mid', health_score: 60 }),
      ];

      const { result } = renderHook(() => useContactFilters(contacts));

      act(() => {
        result.current.setSortField('health_score');
      });

      expect(result.current.filteredContacts[0].name).toBe('Low');
      expect(result.current.filteredContacts[2].name).toBe('High');
    });

    it('toggles sort order', () => {
      const contacts = [
        createMockContact({ name: 'Alice' }),
        createMockContact({ name: 'Charlie' }),
      ];

      const { result } = renderHook(() => useContactFilters(contacts));

      expect(result.current.filters.sortOrder).toBe('asc');
      expect(result.current.filteredContacts[0].name).toBe('Alice');

      act(() => {
        result.current.toggleSortOrder();
      });

      expect(result.current.filters.sortOrder).toBe('desc');
      expect(result.current.filteredContacts[0].name).toBe('Charlie');
    });
  });

  describe('reset', () => {
    it('resets all filters to default', () => {
      const contacts = [createMockContact()];

      const { result } = renderHook(() => useContactFilters(contacts));

      act(() => {
        result.current.setActiveFilter('favorites');
        result.current.setSearchQuery('test');
        result.current.setSortField('health_score');
      });

      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.filters.activeFilter).toBe('all');
      expect(result.current.filters.searchQuery).toBe('');
      expect(result.current.filters.sortField).toBe('name');
    });
  });
});
