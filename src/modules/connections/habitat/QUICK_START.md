# Habitat Archetype - Quick Start Guide

## 1. Basic Usage

```tsx
import { HabitatHome } from '@/modules/connections/habitat';

function App() {
  return <HabitatHome spaceId="your-space-id" />;
}
```

## 2. Using Individual Views

```tsx
import {
  HabitatHome,
  PropertyDetail,
  MaintenanceView,
  InventoryView
} from '@/modules/connections/habitat';

// Property details page
<PropertyDetail propertyId="prop-123" onBack={() => navigate(-1)} />

// Full maintenance view
<MaintenanceView propertyId="prop-123" />

// Full inventory view
<InventoryView propertyId="prop-123" />
```

## 3. Using Hooks

```tsx
import { useProperty, useInventory, useMaintenance } from '@/modules/connections/habitat';

function MyComponent({ spaceId }: { spaceId: string }) {
  // Manage properties
  const {
    properties,
    loading,
    createNewProperty,
    updateExistingProperty,
    deleteExistingProperty
  } = useProperty(spaceId);

  const primaryProperty = properties[0];

  // Manage inventory
  const {
    items,
    createItem,
    updateItem,
    deleteItem,
    filterByCategory,
    searchItems
  } = useInventory(primaryProperty?.id || '');

  // Manage maintenance
  const {
    records,
    createRecord,
    updateRecord,
    completeRecord,
    filterByStatus,
    getUrgent
  } = useMaintenance(primaryProperty?.id || '');

  // Create a property
  const handleCreateProperty = async () => {
    await createNewProperty({
      space_id: spaceId,
      property_type: 'apartment',
      address_line1: 'Rua Example, 123',
      city: 'Sao Paulo',
      bedrooms: 2,
      bathrooms: 1
    });
  };

  // Add inventory item
  const handleAddItem = async () => {
    await createItem({
      property_id: primaryProperty.id,
      name: 'Geladeira',
      category: 'eletrodomestico',
      brand: 'Brastemp',
      warranty_expiry: '2025-12-31'
    });
  };

  // Schedule maintenance
  const handleScheduleMaintenance = async () => {
    await createRecord({
      property_id: primaryProperty.id,
      title: 'Limpeza de ar condicionado',
      category: 'preventiva',
      urgency: 'normal',
      scheduled_date: '2025-01-15'
    });
  };

  return (
    <div>
      {/* Your UI */}
    </div>
  );
}
```

## 4. Using Services Directly

```tsx
import {
  createProperty,
  getPropertiesBySpace,
  createInventoryItem,
  getWarrantyAlerts,
  createMaintenanceRecord,
  getMaintenanceSummary
} from '@/modules/connections/habitat';

// Fetch properties
const properties = await getPropertiesBySpace(spaceId);

// Create property
const newProperty = await createProperty({
  space_id: spaceId,
  property_type: 'house',
  address_line1: 'Av. Paulista, 1000'
});

// Add inventory
const newItem = await createInventoryItem({
  property_id: newProperty.id,
  name: 'Fogao',
  category: 'eletrodomestico'
});

// Get warranty alerts (expiring in next 30 days)
const alerts = await getWarrantyAlerts(newProperty.id, 30);

// Schedule maintenance
const maintenance = await createMaintenanceRecord({
  property_id: newProperty.id,
  title: 'Trocar filtro de agua',
  urgency: 'normal'
});

// Get maintenance summary
const summary = await getMaintenanceSummary(newProperty.id);
console.log(summary);
// {
//   total_pending: 2,
//   total_scheduled: 1,
//   total_in_progress: 1,
//   total_estimated_cost: 500.00,
//   urgent_count: 0
// }
```

## 5. Using Components Individually

```tsx
import {
  PropertyCard,
  InventoryGrid,
  MaintenanceTracker,
  WarrantyAlertsCard,
  CondoContacts
} from '@/modules/connections/habitat';

function CustomDashboard({ property }) {
  return (
    <div className="space-y-6">
      {/* Property info */}
      <PropertyCard property={property} />

      {/* Building contacts */}
      <CondoContacts property={property} />

      {/* Warranty alerts */}
      <WarrantyAlertsCard alerts={warrantyAlerts} />

      {/* Maintenance */}
      <MaintenanceTracker propertyId={property.id} />

      {/* Inventory */}
      <InventoryGrid propertyId={property.id} />
    </div>
  );
}
```

## 6. Type Definitions

```tsx
import type {
  HabitatProperty,
  InventoryItem,
  MaintenanceRecord,
  PropertyType,
  InventoryCategory,
  MaintenanceStatus,
  MaintenanceUrgency,
  WarrantyAlert,
  PropertyFinancialSummary
} from '@/modules/connections/habitat';

// Property type
const propertyType: PropertyType = 'apartment'; // or 'house', 'condo', 'room', 'other'

// Inventory category
const category: InventoryCategory = 'eletrodomestico'; // or 'moveis', 'eletronicos', etc.

// Maintenance status
const status: MaintenanceStatus = 'pending'; // or 'scheduled', 'in_progress', 'completed', 'cancelled'

// Maintenance urgency
const urgency: MaintenanceUrgency = 'normal'; // or 'baixa', 'alta', 'emergencia'
```

## 7. Common Patterns

### Loading States
```tsx
function MyComponent({ propertyId }) {
  const { items, loading, error } = useInventory(propertyId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (items.length === 0) return <div>No items found</div>;

  return <div>{/* Render items */}</div>;
}
```

### Filtering
```tsx
function InventoryManager({ propertyId }) {
  const { items, filterByCategory, filterByStatus, clearFilters } = useInventory(propertyId);

  return (
    <div>
      <button onClick={() => filterByCategory('eletrodomestico')}>
        Appliances
      </button>
      <button onClick={() => filterByStatus('maintenance')}>
        In Maintenance
      </button>
      <button onClick={clearFilters}>Clear</button>

      {items.map(item => <ItemCard key={item.id} item={item} />)}
    </div>
  );
}
```

### Warranty Alerts
```tsx
import { useWarrantyAlerts } from '@/modules/connections/habitat';

function WarrantyDashboard({ propertyId }) {
  const { alerts, loading } = useWarrantyAlerts(propertyId, 30); // 30 days

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h3>Expiring Warranties ({alerts.length})</h3>
      {alerts.map(alert => (
        <div key={alert.item_id}>
          {alert.item_name} - {alert.days_remaining} days remaining
        </div>
      ))}
    </div>
  );
}
```

### Maintenance Summary
```tsx
import { useMaintenanceSummary } from '@/modules/connections/habitat';

function MaintenanceStats({ propertyId }) {
  const { summary, loading } = useMaintenanceSummary(propertyId);

  if (loading || !summary) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-4 gap-4">
      <div>Pending: {summary.total_pending}</div>
      <div>Scheduled: {summary.total_scheduled}</div>
      <div>Urgent: {summary.urgent_count}</div>
      <div>Cost: R$ {summary.total_estimated_cost.toFixed(2)}</div>
    </div>
  );
}
```

## 8. Database Migration

```bash
# Run the migration
supabase migration up 20251214100000_connection_habitat

# Or apply all pending migrations
supabase db push
```

## 9. Styling

All components use Tailwind CSS with the earthy Habitat design system:

- **Primary colors:** amber-700, stone-800
- **Backgrounds:** stone-50 to amber-50 gradients
- **Borders:** 2px stone-200/300
- **Rounded corners:** lg (8px) and xl (12px)
- **Icons:** Emoji-based

To customize, override Tailwind classes or extend the theme:

```tsx
<PropertyCard
  property={property}
  className="custom-shadow custom-border"
/>
```

## 10. Error Handling

All services and hooks include error handling:

```tsx
try {
  const property = await createProperty(payload);
  console.log('Success:', property);
} catch (error) {
  console.error('Failed to create property:', error);
  // Show error message to user
}
```

Hooks expose errors in their return values:

```tsx
const { properties, loading, error } = useProperty(spaceId);

if (error) {
  // Handle error in UI
  return <ErrorMessage error={error} />;
}
```

## Need Help?

- Read the full [README.md](./README.md)
- Check [HABITAT_IMPLEMENTATION_SUMMARY.md](../../docs/HABITAT_IMPLEMENTATION_SUMMARY.md)
- Review the TypeScript types in [types.ts](./types.ts)
- Explore component examples in [components/](./components/)
