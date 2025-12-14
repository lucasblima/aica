# Connections Integration Tests - Quick Start

## Run Tests

```bash
# Run all connections integration tests
npm run test:integration -- tests/integration/connections

# Run with watch mode
npm run test:watch -- tests/integration/connections/services.test.ts

# Run with coverage
npm run test:coverage -- tests/integration/connections
```

## Expected Output

```
✓ tests/integration/connections/services.test.ts (42 tests) 819ms

Test Files  1 passed (1)
     Tests  42 passed (42)
```

## What Gets Tested

### SpaceService (14 tests)
- CRUD operations for connection spaces
- User authentication and authorization
- Soft deletes and favorites
- Archetype filtering

### MemberService (13 tests)
- Member management (add, update, remove)
- Role changes and permissions
- Owner protection
- Admin checks

### InvitationService (15 tests)
- Creating and managing invitations
- Token generation
- Accept/reject flows
- Expiration handling
- Email validation

## Test Structure

```typescript
describe('ServiceName', () => {
  let mockDb: MockDatabase;

  beforeEach(async () => {
    // Reset database before each test
    const { supabase } = await import('@/lib/supabase');
    mockDb = (supabase as any)._mockDb;
    mockDb.reset();
  });

  it('should do something', async () => {
    // Arrange
    mockDb.insert('table', createMockRecord());

    // Act
    const result = await service.method();

    // Assert
    expect(result).toBeDefined();
  });
});
```

## Key Features

### Mocked Supabase Client
- In-memory database
- Query chaining support
- RLS simulation
- Proper error handling

### Helper Functions
```typescript
createMockUser(overrides?)
createMockSpace(overrides?)
createMockMember(overrides?)
createMockInvitation(overrides?)
```

### Test Isolation
- Each test gets fresh database
- User state reset between tests
- No test interdependencies

## Files

1. **`tests/mocks/supabaseMock.ts`** - Mock Supabase client
2. **`tests/integration/connections/services.test.ts`** - Integration tests
3. **`tests/integration/connections/README.md`** - Full documentation

## Common Patterns

### Testing Authentication
```typescript
// Remove user to test RLS
const { supabase } = await import('@/lib/supabase');
(supabase as any)._mockSetUser(null);

await expect(service.method())
  .rejects.toThrow('not authenticated');
```

### Testing Permissions
```typescript
mockDb.insert('connection_spaces', createMockSpace({
  user_id: 'other-user'  // Different user
}));

await expect(service.restrictedMethod())
  .rejects.toThrow('permission');
```

### Verifying Database State
```typescript
const spaces = mockDb.getTable('connection_spaces');
expect(spaces).toHaveLength(1);
expect(spaces[0].name).toBe('Updated Name');
```

## Troubleshooting

### Tests failing with "User not authenticated"
Make sure user is set in beforeEach:
```typescript
const mockUser = createMockUser({ id: 'test-user-123' });
(supabase as any)._mockSetUser(mockUser);
```

### Tests failing with "No rows found"
Check that data is inserted with correct filters:
```typescript
mockDb.insert('connection_spaces', createMockSpace({
  user_id: 'test-user-123',  // Must match current user
  is_active: true            // Most queries filter by this
}));
```

### Mock not resetting between tests
Verify beforeEach is called:
```typescript
beforeEach(async () => {
  const { supabase } = await import('@/lib/supabase');
  mockDb = (supabase as any)._mockDb;
  mockDb.reset();  // This is critical
});
```

## Next Steps

- Read **README.md** for detailed documentation
- Check **IMPLEMENTATION_SUMMARY.md** for technical details
- Review test examples in **services.test.ts**
- Extend tests for your own services

## Performance

- **42 tests** run in ~819ms
- Average **~19ms per test**
- Mock operations are fast (in-memory)
- No network calls or database connections

## Coverage

All three main services are fully tested:
- ✅ spaceService
- ✅ memberService
- ✅ invitationService

Run coverage report:
```bash
npm run test:coverage -- tests/integration/connections
```
