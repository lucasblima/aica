/**
 * Supabase Mock Factory
 *
 * Provides a comprehensive mock of the Supabase client for integration testing.
 * Includes support for:
 * - Auth operations (getUser)
 * - Database operations (select, insert, update, delete)
 * - Query chaining (.from().select().eq(), etc.)
 * - RLS (Row-Level Security) behavior simulation
 */

import { vi } from 'vitest';

export interface MockUser {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
}

export interface MockAuthResponse {
  data: {
    user: MockUser | null;
  };
  error: null | { message: string };
}

export interface MockQueryResponse<T = any> {
  data: T | null;
  error: null | { message: string; code?: string };
}

/**
 * In-memory data store for mock database
 */
export class MockDatabase {
  private data: Map<string, any[]> = new Map();

  constructor() {
    this.reset();
  }

  reset() {
    this.data = new Map([
      ['connection_spaces', []],
      ['connection_members', []],
      ['connection_invitations', []],
      ['connection_events', []],
      ['connection_transactions', []],
      ['connection_documents', []]
    ]);
  }

  getTable(tableName: string): any[] {
    return this.data.get(tableName) || [];
  }

  setTable(tableName: string, records: any[]) {
    this.data.set(tableName, records);
  }

  insert(tableName: string, record: any): any {
    const table = this.getTable(tableName);
    const newRecord = {
      ...record,
      id: record.id || `mock-${tableName}-${Date.now()}-${Math.random()}`,
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString()
    };
    table.push(newRecord);
    return newRecord;
  }

  update(tableName: string, filters: Record<string, any>, updates: any): any[] {
    const table = this.getTable(tableName);
    const updatedRecords: any[] = [];

    for (let i = 0; i < table.length; i++) {
      if (this.matchesFilters(table[i], filters)) {
        table[i] = {
          ...table[i],
          ...updates,
          updated_at: new Date().toISOString()
        };
        updatedRecords.push(table[i]);
      }
    }

    return updatedRecords;
  }

  delete(tableName: string, filters: Record<string, any>): any[] {
    const table = this.getTable(tableName);
    const deletedRecords: any[] = [];
    const remainingRecords: any[] = [];

    for (const record of table) {
      if (this.matchesFilters(record, filters)) {
        deletedRecords.push(record);
      } else {
        remainingRecords.push(record);
      }
    }

    this.setTable(tableName, remainingRecords);
    return deletedRecords;
  }

  select(tableName: string, filters: Record<string, any> = {}, options: {
    single?: boolean;
    order?: { column: string; ascending: boolean }[];
  } = {}): any[] {
    let table = this.getTable(tableName);

    // Apply filters
    const filtered = table.filter(record => this.matchesFilters(record, filters));

    // Apply ordering
    if (options.order && options.order.length > 0) {
      filtered.sort((a, b) => {
        for (const orderBy of options.order!) {
          const aVal = a[orderBy.column];
          const bVal = b[orderBy.column];

          if (aVal === bVal) continue;

          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;

          const comparison = aVal < bVal ? -1 : 1;
          return orderBy.ascending ? comparison : -comparison;
        }
        return 0;
      });
    }

    return filtered;
  }

  private matchesFilters(record: any, filters: Record<string, any>): boolean {
    return Object.entries(filters).every(([key, value]) => {
      if (value === undefined) return true;
      return record[key] === value;
    });
  }
}

/**
 * Query builder for chainable Supabase-like API
 */
export class MockQueryBuilder {
  private tableName: string;
  private filters: Record<string, any> = {};
  private orderBy: { column: string; ascending: boolean }[] = [];
  private selectSingle = false;
  private currentUser: MockUser | null = null;

  constructor(
    private db: MockDatabase,
    tableName: string,
    currentUser: MockUser | null
  ) {
    this.tableName = tableName;
    this.currentUser = currentUser;
  }

  select(columns: string = '*') {
    // In real implementation, columns would filter fields
    // For simplicity, we return all fields
    return this;
  }

  eq(column: string, value: any) {
    this.filters[column] = value;
    return this;
  }

  order(column: string, options: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    this.orderBy.push({
      column,
      ascending: options.ascending !== false
    });
    return this;
  }

  single() {
    this.selectSingle = true;
    return this;
  }

  async then(resolve: (result: MockQueryResponse) => void) {
    try {
      // Check if this is an insert operation
      if ((this as any)._insertRecord) {
        const result = await this.executeInsert();
        resolve(result);
        return;
      }

      // Check if this is an update operation
      if ((this as any)._updateData) {
        const result = await this.executeUpdate();
        resolve(result);
        return;
      }

      // Otherwise, it's a select operation
      // Simulate RLS - check if user has access
      if (!this.currentUser && this.requiresAuth()) {
        resolve({
          data: null,
          error: { message: 'User not authenticated', code: '401' }
        });
        return;
      }

      const results = this.db.select(this.tableName, this.filters, {
        single: this.selectSingle,
        order: this.orderBy
      });

      if (this.selectSingle) {
        if (results.length === 0) {
          resolve({
            data: null,
            error: { message: 'No rows found', code: 'PGRST116' }
          });
        } else if (results.length > 1) {
          resolve({
            data: null,
            error: { message: 'Multiple rows returned', code: 'PGRST116' }
          });
        } else {
          resolve({ data: results[0], error: null });
        }
      } else {
        resolve({ data: results, error: null });
      }
    } catch (error: any) {
      resolve({
        data: null,
        error: { message: error.message }
      });
    }
  }

  insert(record: any) {
    // Store the record to insert for later execution
    (this as any)._insertRecord = record;
    return this;
  }

  update(updates: any) {
    // Store the updates for later execution
    (this as any)._updateData = updates;
    return this;
  }

  private async executeInsert() {
    try {
      if (!this.currentUser && this.requiresAuth()) {
        return {
          data: null,
          error: { message: 'User not authenticated', code: '401' }
        };
      }

      const record = (this as any)._insertRecord;
      const newRecord = this.db.insert(this.tableName, record);
      return { data: this.selectSingle ? newRecord : [newRecord], error: null };
    } catch (error: any) {
      return {
        data: null,
        error: { message: error.message }
      };
    }
  }

  private async executeUpdate() {
    try {
      if (!this.currentUser && this.requiresAuth()) {
        return {
          data: null,
          error: { message: 'User not authenticated', code: '401' }
        };
      }

      const updates = (this as any)._updateData;
      const updatedRecords = this.db.update(this.tableName, this.filters, updates);

      if (this.selectSingle) {
        if (updatedRecords.length === 0) {
          return { data: null, error: null };
        }
        return { data: updatedRecords[0], error: null };
      } else {
        return { data: updatedRecords, error: null };
      }
    } catch (error: any) {
      return {
        data: null,
        error: { message: error.message }
      };
    }
  }

  async delete() {
    try {
      if (!this.currentUser && this.requiresAuth()) {
        return {
          data: null,
          error: { message: 'User not authenticated', code: '401' }
        };
      }

      const deletedRecords = this.db.delete(this.tableName, this.filters);
      return { data: deletedRecords, error: null };
    } catch (error: any) {
      return {
        data: null,
        error: { message: error.message }
      };
    }
  }

  private requiresAuth(): boolean {
    // Tables that require authentication (RLS)
    const authRequiredTables = [
      'connection_spaces',
      'connection_members',
      'connection_invitations',
      'connection_events',
      'connection_transactions',
      'connection_documents'
    ];
    return authRequiredTables.includes(this.tableName);
  }
}

/**
 * Creates a mock Supabase client
 */
export function createMockSupabase(options: {
  user?: MockUser | null;
  db?: MockDatabase;
} = {}) {
  const db = options.db || new MockDatabase();
  let currentUser = options.user || null;

  const mockSupabase = {
    auth: {
      getUser: vi.fn(async (): Promise<MockAuthResponse> => {
        return {
          data: { user: currentUser },
          error: null
        };
      }),
      signInWithPassword: vi.fn(async (credentials: { email: string; password: string }) => {
        // Simple mock - any valid email logs in
        if (credentials.email.includes('@')) {
          currentUser = {
            id: 'mock-user-id',
            email: credentials.email
          };
          return {
            data: {
              user: currentUser,
              session: { access_token: 'mock-token' }
            },
            error: null
          };
        }
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid credentials' }
        };
      }),
      signOut: vi.fn(async () => {
        currentUser = null;
        return { error: null };
      })
    },

    from: (tableName: string) => {
      const builder = new MockQueryBuilder(db, tableName, currentUser);
      return builder;
    },

    // Expose internal state for testing
    _mockDb: db,
    _mockSetUser: (user: MockUser | null) => {
      currentUser = user;
    },
    _mockGetUser: () => currentUser
  };

  return mockSupabase;
}

/**
 * Helper to create a test user
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: `mock-user-${Date.now()}`,
    email: 'test@example.com',
    ...overrides
  };
}

/**
 * Helper to create test data for connection spaces
 */
export function createMockSpace(overrides: Partial<any> = {}): any {
  return {
    id: `space-${Date.now()}`,
    user_id: 'mock-user-id',
    archetype: 'habitat',
    name: 'Test Space',
    subtitle: 'Test Subtitle',
    description: 'Test Description',
    icon: '🏠',
    color_theme: 'earth',
    is_active: true,
    is_favorite: false,
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Helper to create test data for connection members
 */
export function createMockMember(overrides: Partial<any> = {}): any {
  return {
    id: `member-${Date.now()}`,
    space_id: 'space-123',
    user_id: 'user-123',
    role: 'member',
    permissions: {},
    context_data: {},
    is_active: true,
    joined_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Helper to create test data for invitations
 */
export function createMockInvitation(overrides: Partial<any> = {}): any {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return {
    id: `invitation-${Date.now()}`,
    space_id: 'space-123',
    email: 'invitee@example.com',
    token: `token-${Date.now()}`,
    status: 'pending',
    invited_by: 'user-123',
    role: 'member',
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString(),
    ...overrides
  };
}
