/**
 * CoachInviteLinkService Tests
 *
 * Run with:
 *   npx vitest run src/modules/flux/services/__tests__/coachInviteLinkService.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Supabase mock ──────────────────────────────────────────────────────────
// vi.mock factory is hoisted — no top-level variable references allowed.
// We expose internal mocks via __mocks on the module export.

vi.mock('@/services/supabaseClient', () => {
  // Shared state containers
  const state = {
    selectResult: { data: null as unknown, error: null as unknown },
    insertResult: { data: null as unknown, error: null as unknown },
    updateResult: { error: null as unknown },
    user: { id: 'user-mock-123' } as { id: string } | null,
  };

  const insertSpy = vi.fn();
  const updateSpy = vi.fn();
  const selectEqSpy = vi.fn();

  // Build a from() that returns a smart proxy:
  // - .select('*')  → select chain (eq → eq → order → resolve)
  // - .insert(...)  → insert chain (select → single → resolve)
  // - .update(...)  → update chain (eq → resolve)
  const mockFrom = vi.fn().mockImplementation(() => {
    // Select chain: .select().eq().eq().order()
    // The select chain also needs to handle getMyLinks: .select().order() (no eq)
    const selectTerminal = vi.fn().mockImplementation(() => Promise.resolve(state.selectResult));

    const selectChainObj: Record<string, ReturnType<typeof vi.fn>> = {};
    selectChainObj.order = selectTerminal;
    selectChainObj.eq = selectEqSpy.mockImplementation(() => selectChainObj);

    const selectFn = vi.fn().mockImplementation(() => selectChainObj);

    // Insert chain: .insert().select().single()
    const insertSingleFn = vi.fn().mockImplementation(() => Promise.resolve(state.insertResult));
    const insertSelectFn = vi.fn().mockReturnValue({ single: insertSingleFn });

    insertSpy.mockImplementation(() => ({
      select: insertSelectFn,
    }));

    // Update chain: .update().eq()
    const updateEqFn = vi.fn().mockImplementation(() => Promise.resolve(state.updateResult));
    updateSpy.mockImplementation(() => ({
      eq: updateEqFn,
    }));

    return {
      select: selectFn,
      insert: insertSpy,
      update: updateSpy,
    };
  });

  const mockGetUser = vi.fn().mockImplementation(() =>
    Promise.resolve({ data: { user: state.user }, error: null })
  );

  return {
    supabase: {
      from: mockFrom,
      auth: { getUser: mockGetUser },
    },
    __mocks: { state, insertSpy, updateSpy, mockFrom, selectEqSpy, mockGetUser },
  };
});

// Stub crypto.getRandomValues for deterministic token generation
beforeAll(() => {
  vi.stubGlobal('crypto', {
    getRandomValues: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = i * 17;
      }
      return array;
    }),
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { __mocks } = await vi.importMock<any>('@/services/supabaseClient');
const { state, insertSpy, updateSpy, mockFrom, selectEqSpy, mockGetUser } = __mocks;

// Must import AFTER mock setup
import { CoachInviteLinkService, type CoachInviteLink } from '../coachInviteLinkService';

// ── Helpers ────────────────────────────────────────────────────────────────

const DEFAULT_HEALTH_CONFIG: CoachInviteLink['health_config'] = {
  requires_cardio_exam: true,
  requires_clearance_cert: false,
  allow_parq_onboarding: true,
};

function makeFakeLink(overrides: Partial<CoachInviteLink> = {}): CoachInviteLink {
  return {
    id: 'link-1',
    user_id: 'user-mock-123',
    token: 'ABC12345',
    max_uses: 10,
    current_uses: 3,
    health_config: { ...DEFAULT_HEALTH_CONFIG },
    group_id: null,
    expires_at: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('CoachInviteLinkService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.selectResult = { data: null, error: null };
    state.insertResult = { data: null, error: null };
    state.updateResult = { error: null };
    state.user = { id: 'user-mock-123' };
  });

  // ── findActiveLink ───────────────────────────────────────────────────

  describe('findActiveLink', () => {
    it('returns a matching link when health_config and group_id match', async () => {
      const link = makeFakeLink();
      state.selectResult = { data: [link], error: null };

      const result = await CoachInviteLinkService.findActiveLink(DEFAULT_HEALTH_CONFIG);

      expect(result).toEqual(link);
      expect(mockFrom).toHaveBeenCalledWith('coach_invite_links');
      expect(selectEqSpy).toHaveBeenCalledWith('is_active', true);
      expect(selectEqSpy).toHaveBeenCalledWith('user_id', 'user-mock-123');
    });

    it('returns null when user is not authenticated', async () => {
      state.user = null;

      const result = await CoachInviteLinkService.findActiveLink(DEFAULT_HEALTH_CONFIG);

      expect(result).toBeNull();
      // Should not even call from()
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('returns null when no active links exist', async () => {
      state.selectResult = { data: [], error: null };

      const result = await CoachInviteLinkService.findActiveLink(DEFAULT_HEALTH_CONFIG);

      expect(result).toBeNull();
    });

    it('returns null when data is null', async () => {
      state.selectResult = { data: null, error: null };

      const result = await CoachInviteLinkService.findActiveLink(DEFAULT_HEALTH_CONFIG);

      expect(result).toBeNull();
    });

    it('skips links where health_config does not match', async () => {
      const mismatchedLink = makeFakeLink({
        health_config: {
          requires_cardio_exam: false,
          requires_clearance_cert: false,
          allow_parq_onboarding: true,
        },
      });
      state.selectResult = { data: [mismatchedLink], error: null };

      const result = await CoachInviteLinkService.findActiveLink(DEFAULT_HEALTH_CONFIG);

      expect(result).toBeNull();
    });

    it('filters by group_id — matches when group_id equals groupId param', async () => {
      const groupLink = makeFakeLink({ group_id: 'group-A' });
      const noGroupLink = makeFakeLink({ group_id: null });
      state.selectResult = { data: [groupLink, noGroupLink], error: null };

      const result = await CoachInviteLinkService.findActiveLink(DEFAULT_HEALTH_CONFIG, 'group-A');
      expect(result).toEqual(groupLink);
    });

    it('matches null group_id when groupId param is null', async () => {
      const noGroupLink = makeFakeLink({ group_id: null });
      state.selectResult = { data: [noGroupLink], error: null };

      const result = await CoachInviteLinkService.findActiveLink(DEFAULT_HEALTH_CONFIG, null);
      expect(result).toEqual(noGroupLink);
    });

    it('skips links that have reached max_uses', async () => {
      const exhaustedLink = makeFakeLink({ current_uses: 10, max_uses: 10 });
      state.selectResult = { data: [exhaustedLink], error: null };

      const result = await CoachInviteLinkService.findActiveLink(DEFAULT_HEALTH_CONFIG);

      expect(result).toBeNull();
    });

    it('skips expired links', async () => {
      const expiredLink = makeFakeLink({
        expires_at: '2020-01-01T00:00:00Z',
      });
      state.selectResult = { data: [expiredLink], error: null };

      const result = await CoachInviteLinkService.findActiveLink(DEFAULT_HEALTH_CONFIG);

      expect(result).toBeNull();
    });
  });

  // ── createLink ───────────────────────────────────────────────────────

  describe('createLink', () => {
    it('creates a link with generated token and correct payload', async () => {
      const createdLink = makeFakeLink({ token: 'generated' });
      state.insertResult = { data: createdLink, error: null };

      const { data, error } = await CoachInviteLinkService.createLink(DEFAULT_HEALTH_CONFIG, 20);

      expect(error).toBeNull();
      expect(data).toEqual(createdLink);
      expect(insertSpy).toHaveBeenCalled();

      const insertPayload = insertSpy.mock.calls[0][0];
      expect(insertPayload).toMatchObject({
        max_uses: 20,
        health_config: DEFAULT_HEALTH_CONFIG,
      });
      expect(typeof insertPayload.token).toBe('string');
      expect(insertPayload.token.length).toBe(8);
      // No group_id when not provided
      expect(insertPayload.group_id).toBeUndefined();
    });

    it('includes group_id in insert when provided', async () => {
      state.insertResult = { data: makeFakeLink({ group_id: 'grp-1' }), error: null };

      await CoachInviteLinkService.createLink(DEFAULT_HEALTH_CONFIG, 10, 'grp-1');

      const insertPayload = insertSpy.mock.calls[0][0];
      expect(insertPayload.group_id).toBe('grp-1');
    });

    it('does NOT include group_id when groupId is null', async () => {
      state.insertResult = { data: makeFakeLink(), error: null };

      await CoachInviteLinkService.createLink(DEFAULT_HEALTH_CONFIG, 10, null);

      const insertPayload = insertSpy.mock.calls[0][0];
      expect(insertPayload).not.toHaveProperty('group_id');
    });

    it('returns error when insert fails', async () => {
      const dbError = { message: 'duplicate token', code: '23505' };
      state.insertResult = { data: null, error: dbError };

      const { data, error } = await CoachInviteLinkService.createLink(DEFAULT_HEALTH_CONFIG);

      expect(data).toBeNull();
      expect(error).toEqual(dbError);
    });
  });

  // ── getOrCreateLink ──────────────────────────────────────────────────

  describe('getOrCreateLink', () => {
    it('returns existing link when findActiveLink matches', async () => {
      const existingLink = makeFakeLink();
      state.selectResult = { data: [existingLink], error: null };

      const { data, error } = await CoachInviteLinkService.getOrCreateLink(DEFAULT_HEALTH_CONFIG);

      expect(error).toBeNull();
      expect(data).toEqual(existingLink);
      expect(insertSpy).not.toHaveBeenCalled();
    });

    it('creates a new link when no active link exists', async () => {
      state.selectResult = { data: [], error: null };
      const newLink = makeFakeLink({ id: 'new-link' });
      state.insertResult = { data: newLink, error: null };

      const { data, error } = await CoachInviteLinkService.getOrCreateLink(
        DEFAULT_HEALTH_CONFIG,
        15,
        'grp-2'
      );

      expect(error).toBeNull();
      expect(data).toEqual(newLink);
      expect(insertSpy).toHaveBeenCalled();
    });
  });

  // ── deactivateLink ───────────────────────────────────────────────────

  describe('deactivateLink', () => {
    it('updates is_active to false for the given link ID', async () => {
      state.updateResult = { error: null };

      const { error } = await CoachInviteLinkService.deactivateLink('link-42');

      expect(error).toBeNull();
      expect(updateSpy).toHaveBeenCalled();
      const updatePayload = updateSpy.mock.calls[0][0];
      expect(updatePayload.is_active).toBe(false);
      expect(typeof updatePayload.updated_at).toBe('string');
    });

    it('returns error when update fails', async () => {
      const dbError = { message: 'not found', code: 'PGRST116' };
      state.updateResult = { error: dbError };

      const { error } = await CoachInviteLinkService.deactivateLink('link-99');

      expect(error).toEqual(dbError);
    });
  });

  // ── getMyLinks ───────────────────────────────────────────────────────

  describe('getMyLinks', () => {
    it('returns all links for the current user', async () => {
      const links = [makeFakeLink({ id: 'a' }), makeFakeLink({ id: 'b' })];
      state.selectResult = { data: links, error: null };

      const { data, error } = await CoachInviteLinkService.getMyLinks();

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
      expect(data[0].id).toBe('a');
      expect(data[1].id).toBe('b');
    });

    it('returns empty array when data is null', async () => {
      state.selectResult = { data: null, error: null };

      const { data } = await CoachInviteLinkService.getMyLinks();

      expect(data).toEqual([]);
    });
  });
});
