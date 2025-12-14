# Connections Integration Tests

This directory contains integration tests for the Connections module service layer using a mocked Supabase client.

## Overview

The integration tests verify that service methods correctly interact with Supabase and handle:
- Data validation and error handling
- RLS (Row-Level Security) behavior
- Business logic and permissions
- CRUD operations

## Test Structure

### `services.test.ts`

Comprehensive tests for the three main services:

#### 1. **spaceService Tests**
- `getSpaces()` - Query with user_id filter, ordering, active status
- `getSpacesByArchetype()` - Filter by archetype type
- `getSpaceById()` - Fetch single space with members
- `createSpace()` - Insert new space with defaults
- `updateSpace()` - Update and return updated data
- `deleteSpace()` - Soft delete (set is_active=false)
- `toggleFavorite()` - Toggle favorite status
- `updateLastAccessed()` - Update timestamp

#### 2. **memberService Tests**
- `getMembers()` - Query by space_id, active status only
- `getMemberById()` - Fetch single member
- `addMember()` - Insert with validation (user_id or external_name required)
- `updateMember()` - Update member data with permission check
- `removeMember()` - Soft delete, prevent removing owner
- `updateRole()` - Update role field, prevent changing owner
- `isAdmin()` - Check if user is space owner or admin member

#### 3. **invitationService Tests**
- `createInvitation()` - Generate token, insert, validate email
- `getInvitationByToken()` - Retrieve by token
- `acceptInvitation()` - Update status, add member, check expiration
- `rejectInvitation()` - Update status only
- `getSpaceInvitations()` - List all invitations for space
- `cancelInvitation()` - Delete invitation
- `resendInvitation()` - Create new invitation with fresh token

## Mock Implementation

### Supabase Mock (`tests/mocks/supabaseMock.ts`)

The mock provides:

**Features:**
- In-memory database with table storage
- Query chaining (`.from().select().eq().order()`)
- RLS behavior simulation (auth checks)
- CRUD operations (insert, update, delete, select)
- Support for `.single()` queries
- Proper error handling

**Mock Factory Functions:**
```typescript
createMockSupabase(options?: {
  user?: MockUser | null;
  db?: MockDatabase;
})
```

**Helper Functions:**
```typescript
createMockUser(overrides?)      // Create test user
createMockSpace(overrides?)     // Create test space
createMockMember(overrides?)    // Create test member
createMockInvitation(overrides?) // Create test invitation
```

**MockDatabase API:**
```typescript
db.reset()                      // Clear all tables
db.getTable(name)               // Get table data
db.insert(table, record)        // Insert record
db.update(table, filters, data) // Update records
db.delete(table, filters)       // Delete records
db.select(table, filters, opts) // Query records
```

## Running Tests

```bash
# Run all integration tests
npm run test:integration

# Run only connections integration tests
npm run test:integration -- tests/integration/connections

# Watch mode
npm run test:watch -- tests/integration/connections

# With coverage
npm run test:coverage -- tests/integration/connections
```

## Test Patterns

### Basic Test Structure

```typescript
describe('ServiceName', () => {
  let mockDb: MockDatabase;
  let mockUser: MockUser;

  beforeEach(async () => {
    // Get mocked supabase instance
    const { supabase } = await import('@/lib/supabase');
    mockDb = (supabase as any)._mockDb;
    mockDb.reset();

    // Set authenticated user
    mockUser = createMockUser({ id: 'test-user-123' });
    (supabase as any)._mockSetUser(mockUser);
  });

  it('should do something', async () => {
    // Arrange: Set up test data
    mockDb.insert('connection_spaces', createMockSpace({
      id: 'space-1',
      user_id: 'test-user-123'
    }));

    // Act: Call service method
    const result = await service.method();

    // Assert: Verify results
    expect(result).toBeDefined();
    expect(result.id).toBe('space-1');
  });
});
```

### Testing Permissions

```typescript
it('should check admin permissions', async () => {
  // Arrange: Space owned by someone else
  mockDb.insert('connection_spaces', createMockSpace({
    user_id: 'other-user'
  }));

  // Act & Assert
  await expect(
    service.restrictedMethod()
  ).rejects.toThrow('permission');
});
```

### Testing Unauthenticated Access

```typescript
it('should require authentication', async () => {
  // Arrange: Remove user
  const { supabase } = await import('@/lib/supabase');
  (supabase as any)._mockSetUser(null);

  // Act & Assert
  await expect(
    service.method()
  ).rejects.toThrow('not authenticated');
});
```

### Testing Soft Deletes

```typescript
it('should soft delete', async () => {
  // Arrange
  mockDb.insert('table', createMockRecord({
    id: 'record-1',
    is_active: true
  }));

  // Act
  await service.delete('record-1');

  // Assert
  const records = mockDb.getTable('table');
  expect(records[0].is_active).toBe(false);
});
```

## Key Testing Principles

1. **Isolation**: Each test resets the database and user state
2. **Arrange-Act-Assert**: Clear test structure
3. **Mock RLS**: Authentication and authorization checks
4. **Data Validation**: Test edge cases and validation rules
5. **Error Handling**: Verify error messages and states
6. **Async Handling**: Proper async/await usage

## Extending Tests

### Adding New Service Tests

1. Import the service:
   ```typescript
   import { newService } from '@/modules/connections/services/newService';
   ```

2. Create a describe block:
   ```typescript
   describe('NewService Integration Tests', () => {
     let mockDb: MockDatabase;
     let mockUser: MockUser;

     beforeEach(async () => {
       const { supabase } = await import('@/lib/supabase');
       mockDb = (supabase as any)._mockDb;
       mockDb.reset();
       mockUser = createMockUser({ id: 'test-user-123' });
       (supabase as any)._mockSetUser(mockUser);
     });

     // Add tests...
   });
   ```

3. Add test cases for each method

### Adding Mock Helpers

Add to `tests/mocks/supabaseMock.ts`:

```typescript
export function createMockNewEntity(overrides: Partial<any> = {}): any {
  return {
    id: `entity-${Date.now()}`,
    // ... default fields
    ...overrides
  };
}
```

## Debugging Tips

### View Mock Database State

```typescript
it('debug test', async () => {
  const { supabase } = await import('@/lib/supabase');
  const mockDb = (supabase as any)._mockDb;

  console.log('Spaces:', mockDb.getTable('connection_spaces'));
  console.log('Members:', mockDb.getTable('connection_members'));
  console.log('Current User:', (supabase as any)._mockGetUser());
});
```

### Check Query Filters

The mock applies filters using exact matching:
```typescript
mockDb.select('table', {
  user_id: 'test-user-123',
  is_active: true
});
```

### Verify Updates

```typescript
it('verify update', async () => {
  // ... update operation

  const updated = mockDb.getTable('table')[0];
  console.log('Updated record:', updated);
  expect(updated.field).toBe('expected');
});
```

## Related Documentation

- [E2E Tests](../../e2e/connections/README.md) - End-to-end UI tests
- [Service Layer](../../../src/modules/connections/services/README.md) - Service implementations
- [Connection Archetypes](../../../docs/CONNECTION_ARCHETYPES_README.md) - Architecture overview

## Test Coverage Goals

Target coverage for service layer:
- **Statements**: 90%+
- **Branches**: 85%+
- **Functions**: 95%+
- **Lines**: 90%+

Run `npm run test:coverage` to check current coverage.
