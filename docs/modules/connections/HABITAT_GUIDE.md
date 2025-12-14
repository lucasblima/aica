# Habitat Archetype Guide

**Living Spaces Management**

## Overview

The **Habitat** archetype is your physical anchor for managing shared living spaces such as apartments, condos, family homes, and residential properties. Following the philosophy of "Logistica da Serenidade" (Logistics of Serenity), Habitat provides silent, inevitable home maintenance tracking with an earthy, grounded design.

### Purpose

- Manage property details and specifications
- Track household inventory and warranties
- Schedule and monitor maintenance tasks
- Store important documents and contacts
- Split expenses and financial tracking

### Design Philosophy

Habitat embodies a **control panel aesthetic** - stable, grounded, and predictable. Think of it as the dashboard for your home life, where everything is organized and accessible at a glance.

**Color Scheme:**
- Primary: Terracotta/Amber tones (#b45309, #f59e0b)
- Secondary: Stone grays (#292524, #78716c)
- Backgrounds: Warm gradients from stone-50 to amber-50
- Accents: Browns, taupes, muted earth tones

**Visual Elements:**
- Heavy borders (2px) for stability
- Generous padding and whitespace
- Emoji-based icons (🏠, 🔧, 📦, 📄)
- Typography-focused design with clear hierarchy

---

## Database Schema

### Tables

#### 1. habitat_properties
Main property information and metadata.

```sql
id                    UUID PRIMARY KEY
space_id              UUID (connection space reference)
property_type         TEXT (apartment, house, condo, etc.)
property_name         TEXT
address_line1         TEXT
address_line2         TEXT
city, state           TEXT
postal_code           TEXT
country               TEXT (default 'Brazil')

-- Specifications
total_area_sqm        NUMERIC
bedrooms_count        INTEGER
bathrooms_count       INTEGER
parking_spaces_count  INTEGER
floor_number          INTEGER
has_elevator          BOOLEAN
has_pool              BOOLEAN
has_gym               BOOLEAN
has_garden            BOOLEAN

-- Financial tracking
monthly_rent          NUMERIC
monthly_condo_fee     NUMERIC
monthly_iptu          NUMERIC

-- Building contacts
building_portaria     TEXT
building_sindico      TEXT
building_administradora TEXT
portaria_phone        TEXT
sindico_phone         TEXT
admin_phone           TEXT
admin_email           TEXT

-- Metadata
notes                 TEXT
photo_urls            TEXT[]
is_primary            BOOLEAN (default FALSE)
created_at, updated_at TIMESTAMPTZ
```

#### 2. habitat_inventory
Comprehensive item catalog with warranty tracking.

```sql
id                    UUID PRIMARY KEY
property_id           UUID (habitat property reference)
space_id              UUID (connection space reference)

-- Item information
item_name             TEXT NOT NULL
brand                 TEXT
model                 TEXT
serial_number         TEXT
category              TEXT (appliance, furniture, electronics, etc.)

-- Purchase information
purchased_at          DATE
purchase_price        NUMERIC
purchase_location     TEXT

-- Warranty
warranty_months       INTEGER
warranty_expires_at   DATE

-- Status
status                TEXT (active, broken, donated, sold)

-- Documentation
photo_urls            TEXT[]
manual_url            TEXT
receipt_url           TEXT
notes                 TEXT

created_at, updated_at TIMESTAMPTZ
```

**Inventory Categories:**
- appliance (geladeira, fogão, micro-ondas)
- furniture (sofá, mesa, cama)
- electronics (TV, computador, roteador)
- kitchen (panelas, pratos, talheres)
- bathroom (chuveiro, vaso)
- tools (furadeira, martelo)
- decor (quadros, plantas)
- other

#### 3. habitat_maintenance
Maintenance scheduling and tracking.

```sql
id                    UUID PRIMARY KEY
property_id           UUID (habitat property reference)
space_id              UUID (connection space reference)
inventory_item_id     UUID (optional - specific item)

-- Maintenance details
title                 TEXT NOT NULL
description           TEXT
category              TEXT (preventive, corrective, inspection, upgrade)

-- Scheduling
scheduled_date        DATE
completed_at          TIMESTAMPTZ

-- Provider
service_provider      TEXT
provider_contact      TEXT

-- Costs
estimated_cost        NUMERIC
actual_cost           NUMERIC

-- Status
status                TEXT (scheduled, in_progress, completed, cancelled)
urgency               TEXT (low, medium, high, emergency)

-- Notes
notes                 TEXT
photo_urls            TEXT[]

created_at, updated_at TIMESTAMPTZ
```

**Maintenance Categories:**
- preventive (regular AC cleaning, HVAC service)
- corrective (fix broken appliance, repair leak)
- inspection (annual fire alarm test, pest control)
- upgrade (install new fixture, paint room)

**Urgency Levels:**
- emergency: Immediate action required (water leak, no power)
- high: Soon as possible (broken AC, fridge issue)
- medium: This week (squeaky door, minor fix)
- low: When convenient (cosmetic upgrade)

#### 4. habitat_documents
Document storage metadata.

```sql
id                    UUID PRIMARY KEY
property_id           UUID (habitat property reference)
space_id              UUID (connection space reference)
inventory_item_id     UUID (optional - specific item)

-- Document information
document_name         TEXT NOT NULL
document_type         TEXT (deed, contract, manual, warranty, receipt, etc.)
file_path             TEXT
file_url              TEXT

-- Categorization
category              TEXT
tags                  TEXT[]

-- Metadata
uploaded_at           TIMESTAMPTZ
expires_at            DATE

notes                 TEXT
created_at, updated_at TIMESTAMPTZ
```

---

## Components

### HabitatDashboard
**Path:** `src/modules/connections/habitat/components/HabitatDashboard.tsx`

Main dashboard view for a property.

**Features:**
- Property overview card with financial summary
- Maintenance alerts (urgent and upcoming)
- Warranty expiration alerts
- Quick stats (total items, active maintenance, monthly costs)
- Navigation to detailed views

**Props:**
```tsx
{
  spaceId: string;
}
```

**Usage:**
```tsx
import { HabitatDashboard } from '@/modules/connections/habitat';

<HabitatDashboard spaceId="uuid-of-habitat-space" />
```

### PropertyCard
**Path:** `src/modules/connections/habitat/components/PropertyCard.tsx`

Display property information and contacts.

**Features:**
- Address and specifications display
- Monthly financial summary (rent + condo fee + IPTU)
- Building contacts (portaria, sindico, administradora)
- Click-to-call and click-to-email functionality
- Edit action button

**Props:**
```tsx
{
  property: HabitatProperty;
  onEdit?: () => void;
}
```

### InventoryGrid
**Path:** `src/modules/connections/habitat/components/InventoryGrid.tsx`

Grid view of inventory items with filtering.

**Features:**
- Responsive grid layout (1-4 columns)
- Category filter dropdown
- Status filter dropdown
- Search by item name
- Empty state when no items

**Props:**
```tsx
{
  propertyId: string;
  onItemClick?: (item: InventoryItem) => void;
}
```

### InventoryItemCard
**Path:** `src/modules/connections/habitat/components/InventoryItemCard.tsx`

Individual inventory item card.

**Features:**
- Item name, brand, model display
- Category icon
- Purchase date and price
- Warranty countdown badge
- Status indicator (active, broken, etc.)
- Click handler

**Props:**
```tsx
{
  item: InventoryItem;
  onClick?: () => void;
}
```

### MaintenanceTracker
**Path:** `src/modules/connections/habitat/components/MaintenanceTracker.tsx`

List of maintenance records with filtering.

**Features:**
- Status filtering (all, scheduled, in_progress, completed)
- Urgency indicators (colored badges)
- Service provider information
- Quick complete/cancel actions
- Empty states

**Props:**
```tsx
{
  propertyId: string;
  onRecordClick?: (record: MaintenanceRecord) => void;
}
```

### WarrantyAlertsCard
**Path:** `src/modules/connections/habitat/components/WarrantyAlertsCard.tsx`

Display items with expiring warranties.

**Features:**
- List of items with warranties expiring soon
- Days remaining countdown
- Warning colors (red < 30 days, amber < 90 days)
- Empty state when no expiring warranties

**Props:**
```tsx
{
  propertyId: string;
  daysThreshold?: number; // default 90
}
```

### CondoContacts
**Path:** `src/modules/connections/habitat/components/CondoContacts.tsx`

Building contacts display with quick actions.

**Features:**
- Portaria, sindico, administradora cards
- Phone numbers with tel: links
- Email addresses with mailto: links
- Empty state when no contacts

**Props:**
```tsx
{
  property: HabitatProperty;
}
```

---

## Views

### HabitatHome
**Path:** `src/modules/connections/habitat/views/HabitatHome.tsx`

Main entry point for Habitat archetype.

**Route:** `/connections/habitat/:spaceId`

**Features:**
- Gradient background (stone to amber)
- Dashboard wrapper
- Loading and error states

### PropertyDetail
**Path:** `src/modules/connections/habitat/views/PropertyDetail.tsx`

Detailed view of a specific property.

**Route:** `/connections/habitat/:spaceId/property/:propertyId`

**Features:**
- Full property information
- Condo contacts section
- Maintenance tracker
- Inventory grid
- Back navigation

### MaintenanceView
**Path:** `src/modules/connections/habitat/views/MaintenanceView.tsx`

Full maintenance management interface.

**Route:** `/connections/habitat/:spaceId/maintenance`

**Features:**
- Advanced filtering (status, urgency, upcoming)
- Summary cards (total, scheduled, in progress, completed)
- Full maintenance list
- Quick actions (complete, cancel, edit)
- Add new maintenance button

### InventoryView
**Path:** `src/modules/connections/habitat/views/InventoryView.tsx`

Full inventory management interface.

**Route:** `/connections/habitat/:spaceId/inventory`

**Features:**
- Category and status filters
- Search functionality
- Stats summary (total items, categories, warranty alerts)
- Full inventory grid
- Add new item button
- Empty states

---

## Services & Hooks

### Services
Located in `src/modules/connections/habitat/services/`

**propertyService.ts**
- `getPropertiesBySpace(spaceId)` - Get all properties in a space
- `getPropertyById(propertyId)` - Get single property
- `createProperty(payload)` - Create new property
- `updateProperty(propertyId, payload)` - Update property
- `deleteProperty(propertyId)` - Delete property
- `calculateFinancialSummary(property)` - Calculate monthly costs
- `formatPropertyAddress(property)` - Format full address string

**inventoryService.ts**
- `getInventoryByProperty(propertyId)` - Get all items for property
- `createInventoryItem(payload)` - Add new item
- `updateInventoryItem(itemId, payload)` - Update item
- `deleteInventoryItem(itemId)` - Delete item
- `getWarrantyAlerts(propertyId, daysThreshold)` - Get expiring warranties
- `getInventoryByCategory(propertyId, category)` - Filter by category
- `searchInventory(propertyId, query)` - Search by name

**maintenanceService.ts**
- `getMaintenanceByProperty(propertyId)` - Get all records
- `createMaintenanceRecord(payload)` - Schedule maintenance
- `updateMaintenanceRecord(recordId, payload)` - Update record
- `deleteMaintenanceRecord(recordId)` - Delete record
- `completeMaintenanceRecord(recordId, actualCost)` - Mark as done
- `getUrgentMaintenance(propertyId)` - Get high priority items
- `getUpcomingMaintenance(propertyId, days)` - Get scheduled items
- `getMaintenanceSummary(propertyId)` - Aggregate statistics

### Hooks
Located in `src/modules/connections/habitat/hooks/`

**useProperty.ts**
```tsx
const {
  properties,
  loading,
  error,
  createProperty,
  updateProperty,
  deleteProperty,
  refresh
} = useProperty(spaceId);
```

**useInventory.ts**
```tsx
const {
  items,
  loading,
  error,
  createItem,
  updateItem,
  deleteItem,
  warrantyAlerts,
  filterByCategory,
  searchItems
} = useInventory(propertyId);
```

**useMaintenance.ts**
```tsx
const {
  records,
  loading,
  error,
  summary,
  createRecord,
  updateRecord,
  deleteRecord,
  completeRecord,
  urgentRecords,
  upcomingRecords
} = useMaintenance(propertyId);
```

---

## Setup Instructions

### 1. Run Database Migration

```bash
# Apply the Habitat migration
supabase migration up 20251214100000_connection_habitat

# Verify tables were created
supabase db tables list | grep habitat
```

### 2. Create Your First Habitat Space

```tsx
import { supabase } from '@/lib/supabase';

// Create a connection space for your home
const { data: space } = await supabase
  .from('connection_spaces')
  .insert({
    user_id: currentUserId,
    archetype: 'habitat',
    name: 'Minha Casa',
    subtitle: 'Apartamento familiar',
    icon: '🏠',
    color_theme: 'amber-warmth'
  })
  .select()
  .single();

// Create the property
const { data: property } = await supabase
  .from('habitat_properties')
  .insert({
    space_id: space.id,
    property_type: 'apartment',
    property_name: 'Apt 501',
    address_line1: 'Rua das Flores, 123',
    city: 'São Paulo',
    state: 'SP',
    postal_code: '01234-567',
    bedrooms_count: 3,
    bathrooms_count: 2,
    monthly_rent: 3500.00,
    monthly_condo_fee: 800.00,
    monthly_iptu: 200.00
  })
  .select()
  .single();
```

### 3. Add Inventory Items

```tsx
import { inventoryService } from '@/modules/connections/habitat';

await inventoryService.createInventoryItem({
  property_id: property.id,
  space_id: space.id,
  item_name: 'Geladeira Brastemp Frost Free',
  brand: 'Brastemp',
  model: 'BRM56HK',
  category: 'appliance',
  purchased_at: '2023-06-15',
  purchase_price: 3200.00,
  warranty_months: 12,
  status: 'active'
});
```

### 4. Schedule Maintenance

```tsx
import { maintenanceService } from '@/modules/connections/habitat';

await maintenanceService.createMaintenanceRecord({
  property_id: property.id,
  space_id: space.id,
  title: 'Limpeza do ar-condicionado',
  description: 'Manutenção preventiva semestral',
  category: 'preventive',
  scheduled_date: '2025-07-01',
  urgency: 'medium',
  status: 'scheduled',
  estimated_cost: 150.00
});
```

---

## Example Workflows

### Workflow 1: Moving Into a New Apartment

**Goal:** Set up complete home management for a new residence.

**Steps:**

1. **Create Habitat Space**
   ```tsx
   // Create connection space
   const space = await createConnectionSpace({
     archetype: 'habitat',
     name: 'Novo Apartamento',
     subtitle: 'Jardim Paulista',
     icon: '🏠'
   });
   ```

2. **Add Property Details**
   ```tsx
   const property = await propertyService.createProperty({
     space_id: space.id,
     property_type: 'apartment',
     address_line1: 'Av. Paulista, 1000',
     city: 'São Paulo',
     state: 'SP',
     bedrooms_count: 2,
     bathrooms_count: 1,
     monthly_rent: 2800.00,
     monthly_condo_fee: 650.00,
     building_portaria: 'João Silva',
     portaria_phone: '(11) 98765-4321'
   });
   ```

3. **Add Building Contacts**
   ```tsx
   await propertyService.updateProperty(property.id, {
     building_sindico: 'Maria Santos',
     sindico_phone: '(11) 91234-5678',
     building_administradora: 'Condomínios SP',
     admin_phone: '(11) 3333-4444',
     admin_email: 'contato@condominiossp.com.br'
   });
   ```

4. **Catalog Major Items**
   ```tsx
   // Add refrigerator
   await inventoryService.createInventoryItem({
     property_id: property.id,
     item_name: 'Geladeira',
     brand: 'Consul',
     category: 'appliance',
     warranty_months: 12,
     purchased_at: new Date()
   });

   // Add sofa
   await inventoryService.createInventoryItem({
     property_id: property.id,
     item_name: 'Sofá 3 lugares',
     brand: 'Tok&Stok',
     category: 'furniture'
   });
   ```

5. **Schedule Initial Maintenance**
   ```tsx
   // Schedule AC cleaning
   await maintenanceService.createMaintenanceRecord({
     property_id: property.id,
     title: 'Primeira limpeza AC',
     category: 'preventive',
     scheduled_date: addMonths(new Date(), 3),
     urgency: 'low'
   });
   ```

### Workflow 2: Tracking Warranty Expirations

**Goal:** Monitor warranty expirations and schedule replacements.

**Steps:**

1. **Check Warranty Alerts**
   ```tsx
   const { warrantyAlerts } = useInventory(propertyId);

   // Shows items expiring in next 90 days
   console.log(warrantyAlerts);
   ```

2. **Review Expiring Items**
   ```tsx
   warrantyAlerts.forEach(alert => {
     console.log(`${alert.item_name} - ${alert.daysRemaining} days left`);
   });
   ```

3. **Schedule Extended Warranty Purchase or Replacement**
   ```tsx
   // If warranty expires soon and item is valuable
   if (alert.daysRemaining < 30 && alert.purchase_price > 1000) {
     await maintenanceService.createMaintenanceRecord({
       property_id: propertyId,
       inventory_item_id: alert.id,
       title: `Renovar garantia - ${alert.item_name}`,
       category: 'preventive',
       scheduled_date: alert.warranty_expires_at,
       urgency: 'medium'
     });
   }
   ```

### Workflow 3: Managing Recurring Maintenance

**Goal:** Set up and track preventive maintenance schedules.

**Steps:**

1. **Create Preventive Maintenance Records**
   ```tsx
   // AC cleaning every 6 months
   await maintenanceService.createMaintenanceRecord({
     property_id: propertyId,
     title: 'Limpeza ar-condicionado sala',
     category: 'preventive',
     scheduled_date: '2025-07-01',
     urgency: 'medium',
     service_provider: 'ClimaTec',
     provider_contact: '(11) 5555-6666',
     estimated_cost: 150.00
   });

   // Water heater inspection annually
   await maintenanceService.createMaintenanceRecord({
     property_id: propertyId,
     title: 'Inspeção aquecedor de água',
     category: 'inspection',
     scheduled_date: '2025-12-01',
     urgency: 'low',
     estimated_cost: 200.00
   });
   ```

2. **Monitor Upcoming Maintenance**
   ```tsx
   const { upcomingRecords } = useMaintenance(propertyId);

   // Get maintenance scheduled in next 30 days
   const next30Days = upcomingRecords.filter(r =>
     differenceInDays(r.scheduled_date, new Date()) <= 30
   );
   ```

3. **Complete Maintenance and Record Costs**
   ```tsx
   await maintenanceService.completeMaintenanceRecord(
     recordId,
     165.00 // actual cost
   );
   ```

4. **Reschedule Recurring Tasks**
   ```tsx
   // After completing AC cleaning, schedule next one
   await maintenanceService.createMaintenanceRecord({
     property_id: propertyId,
     title: 'Limpeza ar-condicionado sala',
     category: 'preventive',
     scheduled_date: addMonths(completedRecord.completed_at, 6),
     urgency: 'medium',
     service_provider: 'ClimaTec'
   });
   ```

### Workflow 4: Emergency Repair Management

**Goal:** Quickly handle urgent repairs and track costs.

**Steps:**

1. **Create Emergency Record**
   ```tsx
   const emergencyRecord = await maintenanceService.createMaintenanceRecord({
     property_id: propertyId,
     title: 'Vazamento no banheiro',
     description: 'Água vazando do encanamento sob a pia',
     category: 'corrective',
     scheduled_date: new Date(), // Today
     urgency: 'emergency',
     status: 'scheduled'
   });
   ```

2. **Update with Provider Information**
   ```tsx
   await maintenanceService.updateMaintenanceRecord(emergencyRecord.id, {
     service_provider: 'Encanador 24h',
     provider_contact: '(11) 99999-8888',
     estimated_cost: 300.00,
     status: 'in_progress'
   });
   ```

3. **Complete and Log Actual Cost**
   ```tsx
   await maintenanceService.completeMaintenanceRecord(
     emergencyRecord.id,
     420.00, // Actual cost was higher
   );
   ```

4. **Add Photos and Notes**
   ```tsx
   await maintenanceService.updateMaintenanceRecord(emergencyRecord.id, {
     notes: 'Substituiu cano inteiro. Problema resolvido.',
     photo_urls: [
       'https://storage/before.jpg',
       'https://storage/after.jpg'
     ]
   });
   ```

---

## Best Practices

### Organization

1. **One Property per Space**
   - Keep each residence in its own connection space
   - Use property_name to differentiate if multiple properties

2. **Categorize Inventory**
   - Use consistent categories (appliance, furniture, electronics)
   - Add brands and models for valuable items
   - Track serial numbers for warranty claims

3. **Schedule Preventive Maintenance**
   - Set reminders for AC cleaning (6 months)
   - Annual inspections (fire alarms, water heater)
   - Seasonal tasks (gutter cleaning, garden maintenance)

### Financial Tracking

1. **Track All Costs**
   - Record both estimated and actual costs
   - Use monthly_rent, monthly_condo_fee, monthly_iptu for recurring
   - Track maintenance actual_cost for budget planning

2. **Link to Transactions**
   - Use connection_transactions for expense splitting
   - Link maintenance costs to transaction records
   - Generate monthly expense reports

### Documentation

1. **Store Important Documents**
   - Lease agreements
   - Appliance manuals
   - Warranty certificates
   - Service provider contacts

2. **Take Photos**
   - Before/after maintenance
   - Inventory items
   - Property condition for move-in/move-out

### Maintenance

1. **Prioritize by Urgency**
   - emergency: Water leaks, electrical issues (same day)
   - high: AC broken in summer, fridge not cooling (within 3 days)
   - medium: Squeaky door, paint touch-up (this week)
   - low: Cosmetic upgrades (when convenient)

2. **Build Provider Relationships**
   - Save trusted service provider contacts
   - Track their performance in notes
   - Reschedule with same provider if good service

---

## Integration Points

### Connection Transactions
Link maintenance costs to shared expenses:

```tsx
// Create transaction for maintenance cost
const transaction = await transactionService.createTransaction({
  space_id: spaceId,
  description: `Manutenção: ${maintenance.title}`,
  amount: maintenance.actual_cost,
  type: 'expense',
  split_type: 'equal', // Split among members
  transaction_date: maintenance.completed_at
});

// Update maintenance with transaction reference
await maintenanceService.updateMaintenanceRecord(maintenance.id, {
  transaction_id: transaction.id
});
```

### Connection Documents
Link property documents to document storage:

```tsx
// Upload document
const document = await documentService.uploadDocument({
  space_id: spaceId,
  file_name: 'Contrato de Aluguel.pdf',
  category: 'contract'
});

// Create habitat_document reference
await habitatDocumentService.create({
  property_id: propertyId,
  space_id: spaceId,
  document_name: 'Contrato de Aluguel',
  document_type: 'contract',
  file_url: document.file_path
});
```

### Google Calendar
Sync maintenance schedules:

```tsx
// Create connection_event for maintenance
const event = await eventService.createEvent({
  space_id: spaceId,
  title: maintenance.title,
  description: maintenance.description,
  starts_at: maintenance.scheduled_date,
  event_type: 'maintenance',
  google_event_id: syncedGoogleEventId
});
```

---

## Troubleshooting

### Issue: Warranty dates not calculating correctly

**Solution:**
```tsx
// Ensure warranty_expires_at is calculated on insert
const warrantyExpiresAt = addMonths(
  new Date(item.purchased_at),
  item.warranty_months
);

await inventoryService.createInventoryItem({
  ...itemData,
  warranty_expires_at: warrantyExpiresAt
});
```

### Issue: Maintenance not showing in upcoming list

**Solution:**
- Check that status is 'scheduled' (not 'completed' or 'cancelled')
- Verify scheduled_date is in the future
- Ensure property_id and space_id match

### Issue: Can't see properties from other members

**Solution:**
- Verify you're a member of the connection space
- Check RLS policies are enabled
- Confirm space_id is correct

---

## Additional Resources

- **Database Schema:** `supabase/migrations/20251214100000_connection_habitat.sql`
- **Type Definitions:** `src/modules/connections/habitat/types.ts`
- **Implementation Summary:** `docs/HABITAT_IMPLEMENTATION_SUMMARY.md`
- **Base Connection Schema:** `docs/CONNECTION_ARCHETYPES_README.md`

---

**Last Updated:** December 14, 2025
**Version:** 1.0.0
**Status:** Production Ready
