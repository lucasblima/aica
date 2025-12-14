# Habitat Archetype

> **Philosophy:** "Logistica da serenidade" - Silent, inevitable home maintenance
> **Design:** Earthy tones (browns, taupes, muted greens), grounded cards, control panel metaphor
> **Icon:** 🏠 Condominio e residencia

## Overview

The Habitat archetype is the **physical anchor** for managing your home, apartment, or property. It handles logistics, inventory, maintenance, and financial tracking with a calm, stable, and grounded design philosophy.

## Core Features

### 1. Property Management
- Property type classification (apartment, house, condo, room)
- Complete address and building information
- Property specifications (bedrooms, bathrooms, parking, area)
- Financial tracking (condominium fees, rent, property tax)
- Building contacts (portaria, sindico, administradora)

### 2. Inventory Tracking
- Comprehensive item catalog (appliances, furniture, electronics, decor)
- Brand, model, and serial number tracking
- Purchase information (date, price, location)
- Warranty management with expiration alerts
- Room/location assignment
- Status tracking (active, maintenance, sold, disposed)

### 3. Maintenance Management
- Maintenance record creation and tracking
- Category classification (preventiva, corretiva, melhoria, emergencia)
- Urgency levels (baixa, normal, alta, emergencia)
- Scheduling and completion tracking
- Service provider information
- Cost estimation and tracking
- Integration with transactions for expense management

### 4. Financial Overview
- Monthly cost summaries (condominium + rent + property tax)
- Maintenance cost tracking and estimation
- Integration with connection transactions for expense splitting

## Database Schema

### Tables

#### `habitat_properties`
Stores property information.

```sql
- id (UUID, PK)
- space_id (UUID, FK -> connection_spaces)
- property_type (TEXT)
- address_line1, address_line2, city, state, postal_code, country
- building_name, unit_number, floor_number
- bedrooms, bathrooms, parking_spots, area_sqm
- condominium_fee, rent_value, property_tax_annual
- portaria_phone, sindico_name, sindico_phone
- administradora_name, administradora_phone, administradora_email
- created_at, updated_at
```

#### `habitat_inventory`
Tracks household items and appliances.

```sql
- id (UUID, PK)
- property_id (UUID, FK -> habitat_properties)
- name (TEXT)
- category (TEXT) -- eletrodomestico, moveis, eletronicos, decoracao, ferramentas, outros
- brand, model, serial_number
- purchase_date, purchase_price, purchase_location
- warranty_expiry, warranty_document_id, warranty_notes
- room, notes, status
- created_at, updated_at
```

#### `habitat_maintenance`
Manages maintenance records.

```sql
- id (UUID, PK)
- property_id (UUID, FK -> habitat_properties)
- inventory_item_id (UUID, FK -> habitat_inventory, optional)
- title, description
- category (TEXT) -- preventiva, corretiva, melhoria, emergencia
- urgency (TEXT) -- baixa, normal, alta, emergencia
- scheduled_date, completed_at
- provider_name, provider_phone, provider_email, provider_notes
- estimated_cost, actual_cost, transaction_id
- status (TEXT) -- pending, scheduled, in_progress, completed, cancelled
- created_at, updated_at
```

#### `habitat_documents`
Stores property and item documents.

```sql
- id (UUID, PK)
- property_id (UUID, FK -> habitat_properties)
- inventory_item_id (UUID, FK -> habitat_inventory, optional)
- title, document_type
- file_url, file_name, file_size_kb
- uploaded_at, notes
```

## Architecture

### Directory Structure

```
habitat/
├── types.ts                    # TypeScript types and interfaces
├── services/                   # Data access layer
│   ├── propertyService.ts      # Property CRUD operations
│   ├── inventoryService.ts     # Inventory CRUD operations
│   ├── maintenanceService.ts   # Maintenance CRUD operations
│   └── index.ts                # Service exports
├── hooks/                      # React hooks
│   ├── useProperty.ts          # Property state management
│   ├── useInventory.ts         # Inventory state management
│   ├── useMaintenance.ts       # Maintenance state management
│   └── index.ts                # Hook exports
├── components/                 # Reusable UI components
│   ├── HabitatDashboard.tsx    # Main dashboard view
│   ├── PropertyCard.tsx        # Property information card
│   ├── InventoryGrid.tsx       # Inventory grid layout
│   ├── InventoryItemCard.tsx   # Individual item card
│   ├── MaintenanceTracker.tsx  # Maintenance list/tracker
│   ├── WarrantyAlertsCard.tsx  # Warranty expiration alerts
│   ├── CondoContacts.tsx       # Building contacts display
│   └── index.ts                # Component exports
├── views/                      # Page-level components
│   ├── HabitatHome.tsx         # Main entry point
│   ├── PropertyDetail.tsx      # Property details page
│   ├── MaintenanceView.tsx     # Maintenance management page
│   ├── InventoryView.tsx       # Inventory management page
│   └── index.ts                # View exports
└── index.ts                    # Main module export
```

## Usage Examples

### Basic Setup

```tsx
import { HabitatHome } from '@/modules/connections/habitat';

function MyApp() {
  const spaceId = 'your-space-id';

  return <HabitatHome spaceId={spaceId} />;
}
```

### Using Hooks

```tsx
import { useProperty, useInventory, useMaintenance } from '@/modules/connections/habitat';

function PropertyManager({ spaceId }: { spaceId: string }) {
  const {
    properties,
    loading,
    createNewProperty,
    updateExistingProperty
  } = useProperty(spaceId);

  const primaryProperty = properties[0];

  const {
    items,
    createItem,
    filterByCategory
  } = useInventory(primaryProperty?.id || '');

  const {
    records,
    createRecord,
    completeRecord
  } = useMaintenance(primaryProperty?.id || '');

  // ... component logic
}
```

### Using Services Directly

```tsx
import {
  createProperty,
  getPropertiesBySpace,
  createInventoryItem,
  createMaintenanceRecord
} from '@/modules/connections/habitat';

// Create a new property
const newProperty = await createProperty({
  space_id: spaceId,
  property_type: 'apartment',
  address_line1: 'Rua Example, 123',
  city: 'Sao Paulo',
  bedrooms: 2,
  bathrooms: 1
});

// Add an inventory item
const newItem = await createInventoryItem({
  property_id: newProperty.id,
  name: 'Geladeira',
  category: 'eletrodomestico',
  brand: 'Brastemp',
  warranty_expiry: '2025-12-31'
});

// Schedule maintenance
const newMaintenance = await createMaintenanceRecord({
  property_id: newProperty.id,
  title: 'Limpeza de ar condicionado',
  category: 'preventiva',
  urgency: 'normal',
  scheduled_date: '2025-01-15'
});
```

## Design Specifications

### Color Palette
- **Primary:** Earthy browns (#78350f, #92400e)
- **Secondary:** Stone grays (#57534e, #78716c)
- **Accents:** Muted greens, taupes
- **Backgrounds:** Stone-50 to amber-50 gradients

### Component Patterns
- **Cards:** Heavy borders (2px), rounded corners (lg/xl), subtle shadows
- **Typography:** Bold headings, medium body text, stone color palette
- **Icons:** Emoji-based for warmth and accessibility
- **Spacing:** Generous padding (p-6), clear visual hierarchy

### User Experience
- **Grounded:** Stable, predictable interactions
- **Control Panel:** Dashboard-like layout with clear sections
- **Silent Maintenance:** Minimal notifications, calm aesthetic
- **Quick Actions:** Prominent CTAs for common tasks

## Integration Points

### Connection Spaces
- Each Habitat property belongs to a `connection_space`
- RLS policies ensure proper access control
- Members can view/edit based on permissions

### Connection Transactions
- Maintenance costs can be linked to transactions
- Supports expense splitting among members
- Financial summaries aggregate property costs

### Connection Documents
- Warranty documents reference `connection_documents`
- Property deeds and contracts can be attached
- File management integrated with space storage

## Roadmap

### Phase 1: Core Features (Completed)
- [x] Property management
- [x] Inventory tracking
- [x] Maintenance scheduling
- [x] Warranty alerts
- [x] Financial summaries

### Phase 2: Enhanced Features (Future)
- [ ] Utility readings tracking (water, electricity, gas)
- [ ] Recurring maintenance schedules
- [ ] Photo attachments for items
- [ ] QR code generation for items
- [ ] Maintenance history graphs
- [ ] Expense analytics and trends

### Phase 3: Advanced Features (Future)
- [ ] Integration with IoT devices
- [ ] Automated warranty tracking via email
- [ ] Service provider marketplace
- [ ] Shared shopping lists
- [ ] Document OCR and auto-filing

## Testing

### Unit Tests
```bash
# Test services
npm test src/modules/connections/habitat/services

# Test hooks
npm test src/modules/connections/habitat/hooks
```

### Integration Tests
```bash
# Test full flows
npm test src/modules/connections/habitat/integration
```

## Contributing

When adding features to Habitat:

1. Follow the earthy design philosophy
2. Maintain the grounded, stable aesthetic
3. Keep interactions calm and predictable
4. Use emoji icons consistently
5. Ensure proper TypeScript typing
6. Add comprehensive error handling
7. Update this README with new features

## License

Part of the Aica frontend project.
