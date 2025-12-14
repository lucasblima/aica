/**
 * Unit Tests - Connection Hooks
 *
 * Tests for the main Connection module hooks:
 * - useConnectionSpaces
 * - useSpace
 * - useSpaceMembers
 *
 * Uses Vitest and React Testing Library with mocked services.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type {
  ConnectionSpace,
  ConnectionMember,
  CreateSpacePayload,
  UpdateSpacePayload,
  AddMemberPayload,
  Archetype
} from '../../../src/modules/connections/types';

// ============================================================================
// MOCKS - Must be at top level for vi.mock hoisting
// ============================================================================

// Mock useAuth hook
vi.mock('../../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    isLoading: false,
    isAuthenticated: true,
    session: null
  }))
}));

// Mock connection space service - define inline to avoid hoisting issues
vi.mock('../../../src/modules/connections/services/connectionSpaceService', () => ({
  getConnectionSpaces: vi.fn(),
  getConnectionSpacesByArchetype: vi.fn(),
  getConnectionSpaceById: vi.fn(),
  createConnectionSpace: vi.fn(),
  updateConnectionSpace: vi.fn(),
  deleteConnectionSpace: vi.fn(),
  toggleFavorite: vi.fn(),
  updateLastAccessed: vi.fn()
}));

// Mock space service
vi.mock('../../../src/modules/connections/services/spaceService', () => ({
  spaceService: {
    getSpaces: vi.fn(),
    getSpacesByArchetype: vi.fn(),
    getSpaceById: vi.fn(),
    createSpace: vi.fn(),
    updateSpace: vi.fn(),
    deleteSpace: vi.fn(),
    toggleFavorite: vi.fn(),
    updateLastAccessed: vi.fn()
  }
}));

// Mock member service
vi.mock('../../../src/modules/connections/services/memberService', () => ({
  memberService: {
    getMembers: vi.fn(),
    getMemberById: vi.fn(),
    addMember: vi.fn(),
    updateMember: vi.fn(),
    removeMember: vi.fn(),
    updateRole: vi.fn(),
    isAdmin: vi.fn()
  }
}));

// Import hooks after mocks
import { useConnectionSpaces } from '../../../src/modules/connections/hooks/useConnectionSpaces';
import { useSpace } from '../../../src/modules/connections/hooks/useSpace';
import { useSpaceMembers } from '../../../src/modules/connections/hooks/useSpaceMembers';
import * as connectionSpaceService from '../../../src/modules/connections/services/connectionSpaceService';
import { spaceService } from '../../../src/modules/connections/services/spaceService';
import { memberService } from '../../../src/modules/connections/services/memberService';

// Create typed references to mocked services after import
const mockConnectionSpaceService = connectionSpaceService as any;
const mockSpaceService = spaceService as any;
const mockMemberService = memberService as any;

// ============================================================================
// TEST DATA
// ============================================================================

const mockSpaces: ConnectionSpace[] = [
  {
    id: 'space-1',
    user_id: 'test-user-id',
    archetype: 'habitat',
    name: 'My Apartment',
    subtitle: 'Cozy home',
    description: 'My main living space',
    icon: '🏠',
    color_theme: 'earthy',
    is_active: true,
    is_favorite: true,
    last_accessed_at: '2025-12-14T10:00:00Z',
    settings: {},
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-12-14T10:00:00Z'
  },
  {
    id: 'space-2',
    user_id: 'test-user-id',
    archetype: 'ventures',
    name: 'Tech Startup',
    subtitle: 'AI SaaS',
    description: 'My startup project',
    icon: '💼',
    color_theme: 'precise',
    is_active: true,
    is_favorite: false,
    last_accessed_at: '2025-12-13T10:00:00Z',
    settings: {},
    created_at: '2025-02-01T00:00:00Z',
    updated_at: '2025-12-13T10:00:00Z'
  },
  {
    id: 'space-3',
    user_id: 'test-user-id',
    archetype: 'habitat',
    name: 'Beach House',
    subtitle: 'Vacation home',
    description: 'Weekend getaway',
    icon: '🏖️',
    color_theme: 'earthy',
    is_active: true,
    is_favorite: false,
    last_accessed_at: '2025-12-12T10:00:00Z',
    settings: {},
    created_at: '2025-03-01T00:00:00Z',
    updated_at: '2025-12-12T10:00:00Z'
  }
];

const mockMembers: ConnectionMember[] = [
  {
    id: 'member-1',
    space_id: 'space-1',
    user_id: 'test-user-id',
    role: 'owner',
    permissions: {},
    context_data: {},
    is_active: true,
    joined_at: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'member-2',
    space_id: 'space-1',
    external_name: 'John Doe',
    external_email: 'john@example.com',
    role: 'member',
    permissions: {},
    context_data: {},
    is_active: true,
    joined_at: '2025-01-15T00:00:00Z',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z'
  }
];

// ============================================================================
// TESTS - useConnectionSpaces
// ============================================================================

describe('useConnectionSpaces', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Fetching spaces', () => {
    it('should fetch spaces for authenticated user', async () => {
      mockConnectionSpaceService.getConnectionSpaces.mockResolvedValue(mockSpaces);

      const { result } = renderHook(() => useConnectionSpaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.spaces).toEqual(mockSpaces);
      expect(result.current.error).toBeNull();
      expect(result.current.totalCount).toBe(3);
      expect(mockConnectionSpaceService.getConnectionSpaces).toHaveBeenCalledWith('test-user-id');
    });

    it('should handle loading state', async () => {
      let resolvePromise: (value: ConnectionSpace[]) => void;
      const promise = new Promise<ConnectionSpace[]>(resolve => {
        resolvePromise = resolve;
      });

      mockConnectionSpaceService.getConnectionSpaces.mockReturnValue(promise);

      const { result } = renderHook(() => useConnectionSpaces());

      // Initially loading should be true
      expect(result.current.isLoading).toBe(true);
      expect(result.current.spaces).toEqual([]);

      // Resolve the promise
      resolvePromise!(mockSpaces);

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.spaces).toEqual(mockSpaces);
    });

    it('should handle error state', async () => {
      const mockError = new Error('Failed to fetch spaces');
      mockConnectionSpaceService.getConnectionSpaces.mockRejectedValue(mockError);

      const { result } = renderHook(() => useConnectionSpaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.spaces).toEqual([]);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('Failed to fetch spaces');
    });

    it('should filter by archetype', async () => {
      const habitatSpaces = mockSpaces.filter(s => s.archetype === 'habitat');
      mockConnectionSpaceService.getConnectionSpacesByArchetype.mockResolvedValue(habitatSpaces);

      const { result } = renderHook(() =>
        useConnectionSpaces({ archetype: 'habitat' as Archetype })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.spaces).toEqual(habitatSpaces);
      expect(result.current.spaces).toHaveLength(2);
      expect(result.current.spaces.every(s => s.archetype === 'habitat')).toBe(true);
      expect(mockConnectionSpaceService.getConnectionSpacesByArchetype).toHaveBeenCalledWith('test-user-id', 'habitat');
    });

    it('should not auto-fetch when autoFetch is false', async () => {
      const { result } = renderHook(() =>
        useConnectionSpaces({ autoFetch: false })
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.spaces).toEqual([]);
      expect(mockConnectionSpaceService.getConnectionSpaces).not.toHaveBeenCalled();
    });
  });

  describe('CRUD operations', () => {
    beforeEach(() => {
      mockConnectionSpaceService.getConnectionSpaces.mockResolvedValue([]);
    });

    it('should create a new space', async () => {
      const newSpace: ConnectionSpace = {
        id: 'space-new',
        user_id: 'test-user-id',
        archetype: 'academia',
        name: 'React Course',
        icon: '🎓',
        color_theme: 'serene',
        is_active: true,
        is_favorite: false,
        settings: {},
        created_at: '2025-12-14T12:00:00Z',
        updated_at: '2025-12-14T12:00:00Z'
      };

      mockConnectionSpaceService.createConnectionSpace.mockResolvedValue(newSpace);

      const { result } = renderHook(() => useConnectionSpaces({ autoFetch: false }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const createPayload: CreateSpacePayload = {
        archetype: 'academia',
        name: 'React Course',
        icon: '🎓',
        color_theme: 'serene'
      };

      let created: ConnectionSpace;
      await act(async () => {
        created = await result.current.create(createPayload);
      });

      expect(created!).toEqual(newSpace);
      expect(result.current.spaces).toContain(newSpace);
      expect(mockConnectionSpaceService.createConnectionSpace).toHaveBeenCalledWith('test-user-id', createPayload);
    });

    it('should update an existing space', async () => {
      mockConnectionSpaceService.getConnectionSpaces.mockResolvedValue(mockSpaces);

      const updatedSpace: ConnectionSpace = {
        ...mockSpaces[0],
        name: 'Updated Apartment',
        updated_at: '2025-12-14T13:00:00Z'
      };

      mockConnectionSpaceService.updateConnectionSpace.mockResolvedValue(updatedSpace);

      const { result } = renderHook(() => useConnectionSpaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updatePayload: UpdateSpacePayload = {
        name: 'Updated Apartment'
      };

      let updated: ConnectionSpace;
      await act(async () => {
        updated = await result.current.update('space-1', updatePayload);
      });

      expect(updated!.name).toBe('Updated Apartment');
      expect(result.current.spaces.find(s => s.id === 'space-1')?.name).toBe('Updated Apartment');
    });

    it('should delete a space', async () => {
      mockConnectionSpaceService.getConnectionSpaces.mockResolvedValue(mockSpaces);
      mockConnectionSpaceService.deleteConnectionSpace.mockResolvedValue();

      const { result } = renderHook(() => useConnectionSpaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.spaces.length;

      await act(async () => {
        await result.current.remove('space-1');
      });

      expect(result.current.spaces).toHaveLength(initialCount - 1);
      expect(result.current.spaces.find(s => s.id === 'space-1')).toBeUndefined();
    });

    it('should toggle favorite status', async () => {
      mockConnectionSpaceService.getConnectionSpaces.mockResolvedValue(mockSpaces);
      mockConnectionSpaceService.toggleFavorite.mockResolvedValue();

      const { result } = renderHook(() => useConnectionSpaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const space = result.current.spaces.find(s => s.id === 'space-2');
      expect(space?.is_favorite).toBe(false);

      await act(async () => {
        await result.current.toggleFavorite('space-2', true);
      });

      const updatedSpace = result.current.spaces.find(s => s.id === 'space-2');
      expect(updatedSpace?.is_favorite).toBe(true);
    });
  });

  describe('Utility functions', () => {
    beforeEach(() => {
      mockConnectionSpaceService.getConnectionSpaces.mockResolvedValue(mockSpaces);
    });

    it('should get space by ID', async () => {
      const { result } = renderHook(() => useConnectionSpaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const space = result.current.getById('space-1');
      expect(space).toBeDefined();
      expect(space?.id).toBe('space-1');
      expect(space?.name).toBe('My Apartment');
    });

    it('should get spaces by archetype', async () => {
      const { result } = renderHook(() => useConnectionSpaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const habitatSpaces = result.current.getByArchetype('habitat' as Archetype);
      expect(habitatSpaces).toHaveLength(2);
      expect(habitatSpaces.every(s => s.archetype === 'habitat')).toBe(true);
    });

    it('should return favorites list', async () => {
      const { result } = renderHook(() => useConnectionSpaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.favorites).toHaveLength(1);
      expect(result.current.favorites[0].id).toBe('space-1');
      expect(result.current.favorites[0].is_favorite).toBe(true);
    });

    it('should return spaces grouped by archetype', async () => {
      const { result } = renderHook(() => useConnectionSpaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.byArchetype.habitat).toHaveLength(2);
      expect(result.current.byArchetype.ventures).toHaveLength(1);
      expect(result.current.byArchetype.academia).toHaveLength(0);
      expect(result.current.byArchetype.tribo).toHaveLength(0);
    });

    it('should refresh spaces', async () => {
      const { result } = renderHook(() => useConnectionSpaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callCount = mockConnectionSpaceService.getConnectionSpaces.mock.calls.length;

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockConnectionSpaceService.getConnectionSpaces.mock.calls.length).toBeGreaterThan(callCount);
    });
  });
});

// ============================================================================
// TESTS - useSpace
// ============================================================================

describe('useSpace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single space by ID', async () => {
    const spaceWithMembers = {
      ...mockSpaces[0],
      members: mockMembers
    };

    mockSpaceService.getSpaceById.mockResolvedValue(spaceWithMembers);

    const { result } = renderHook(() => useSpace('space-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.space).toBeDefined();
    expect(result.current.space?.id).toBe('space-1');
    expect(result.current.space?.members).toEqual(mockMembers);
    expect(result.current.error).toBeNull();
    expect(mockSpaceService.getSpaceById).toHaveBeenCalledWith('space-1');
  });

  it('should return null for non-existent space', async () => {
    const notFoundError = new Error('Space not found');
    mockSpaceService.getSpaceById.mockRejectedValue(notFoundError);

    const { result } = renderHook(() => useSpace('non-existent'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.space).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should handle unauthorized access', async () => {
    const unauthorizedError = new Error('Failed to fetch space: Permission denied');
    mockSpaceService.getSpaceById.mockRejectedValue(unauthorizedError);

    const { result } = renderHook(() => useSpace('unauthorized-space'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.space).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('Permission denied');
  });

  it('should update space', async () => {
    const spaceWithMembers = {
      ...mockSpaces[0],
      members: mockMembers
    };

    mockSpaceService.getSpaceById.mockResolvedValue(spaceWithMembers);

    const updatedSpace = {
      ...mockSpaces[0],
      name: 'Updated Name'
    };

    mockSpaceService.updateSpace.mockResolvedValue(updatedSpace);

    const { result } = renderHook(() => useSpace('space-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updatePayload: UpdateSpacePayload = { name: 'Updated Name' };
    let updated: ConnectionSpace;
    await act(async () => {
      updated = await result.current.updateSpace(updatePayload);
    });

    expect(updated!.name).toBe('Updated Name');
    expect(mockSpaceService.updateSpace).toHaveBeenCalledWith('space-1', updatePayload);
  });

  it('should delete space', async () => {
    const spaceWithMembers = {
      ...mockSpaces[0],
      members: mockMembers
    };

    mockSpaceService.getSpaceById.mockResolvedValue(spaceWithMembers);
    mockSpaceService.deleteSpace.mockResolvedValue();

    const { result } = renderHook(() => useSpace('space-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteSpace();
    });

    expect(result.current.space).toBeNull();
    expect(mockSpaceService.deleteSpace).toHaveBeenCalledWith('space-1');
  });

  it('should not fetch when spaceId is undefined', async () => {
    const { result } = renderHook(() => useSpace(undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.space).toBeNull();
    expect(mockSpaceService.getSpaceById).not.toHaveBeenCalled();
  });
});

// ============================================================================
// TESTS - useSpaceMembers
// ============================================================================

describe('useSpaceMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch members for a space', async () => {
    mockMemberService.getMembers.mockResolvedValue(mockMembers);
    mockMemberService.isAdmin.mockResolvedValue(true);

    const { result } = renderHook(() => useSpaceMembers('space-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.members).toEqual(mockMembers);
    expect(result.current.members).toHaveLength(2);
    expect(result.current.error).toBeNull();
    expect(mockMemberService.getMembers).toHaveBeenCalledWith('space-1');
  });

  it('should handle empty member list', async () => {
    mockMemberService.getMembers.mockResolvedValue([]);
    mockMemberService.isAdmin.mockResolvedValue(false);

    const { result } = renderHook(() => useSpaceMembers('empty-space'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.members).toEqual([]);
    expect(result.current.members).toHaveLength(0);
  });

  it('should check admin status correctly', async () => {
    mockMemberService.getMembers.mockResolvedValue(mockMembers);
    mockMemberService.isAdmin.mockResolvedValue(true);

    const { result } = renderHook(() => useSpaceMembers('space-1'));

    await waitFor(() => {
      expect(result.current.isAdminLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(mockMemberService.isAdmin).toHaveBeenCalledWith('space-1');
  });

  it('should add a new member', async () => {
    mockMemberService.getMembers.mockResolvedValue(mockMembers);
    mockMemberService.isAdmin.mockResolvedValue(true);

    const newMember: ConnectionMember = {
      id: 'member-3',
      space_id: 'space-1',
      external_name: 'Jane Smith',
      external_email: 'jane@example.com',
      role: 'member',
      permissions: {},
      context_data: {},
      is_active: true,
      joined_at: '2025-12-14T12:00:00Z',
      created_at: '2025-12-14T12:00:00Z',
      updated_at: '2025-12-14T12:00:00Z'
    };

    mockMemberService.addMember.mockResolvedValue(newMember);

    const { result } = renderHook(() => useSpaceMembers('space-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const payload: AddMemberPayload = {
      external_name: 'Jane Smith',
      external_email: 'jane@example.com',
      role: 'member'
    };

    let added: ConnectionMember;
    await act(async () => {
      added = await result.current.addMember(payload);
    });

    expect(added!).toEqual(newMember);
    expect(result.current.members).toContain(newMember);
    expect(mockMemberService.addMember).toHaveBeenCalledWith('space-1', payload);
  });

  it('should remove a member', async () => {
    mockMemberService.getMembers.mockResolvedValue(mockMembers);
    mockMemberService.isAdmin.mockResolvedValue(true);
    mockMemberService.removeMember.mockResolvedValue();

    const { result } = renderHook(() => useSpaceMembers('space-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCount = result.current.members.length;

    await act(async () => {
      await result.current.removeMember('member-2');
    });

    expect(result.current.members).toHaveLength(initialCount - 1);
    expect(result.current.members.find(m => m.id === 'member-2')).toBeUndefined();
    expect(mockMemberService.removeMember).toHaveBeenCalledWith('member-2');
  });

  it('should update member role', async () => {
    mockMemberService.getMembers.mockResolvedValue(mockMembers);
    mockMemberService.isAdmin.mockResolvedValue(true);

    const updatedMember = {
      ...mockMembers[1],
      role: 'admin' as const
    };

    mockMemberService.updateRole.mockResolvedValue(updatedMember);

    const { result } = renderHook(() => useSpaceMembers('space-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateRole('member-2', 'admin');
    });

    const member = result.current.members.find(m => m.id === 'member-2');
    expect(member?.role).toBe('admin');
    expect(mockMemberService.updateRole).toHaveBeenCalledWith('member-2', 'admin');
  });

  it('should refresh members', async () => {
    mockMemberService.getMembers.mockResolvedValue(mockMembers);
    mockMemberService.isAdmin.mockResolvedValue(true);

    const { result } = renderHook(() => useSpaceMembers('space-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const callCount = mockMemberService.getMembers.mock.calls.length;

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockMemberService.getMembers.mock.calls.length).toBeGreaterThan(callCount);
  });

  it('should not fetch when spaceId is undefined', async () => {
    const { result } = renderHook(() => useSpaceMembers(undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.members).toEqual([]);
    expect(mockMemberService.getMembers).not.toHaveBeenCalled();
  });
});
