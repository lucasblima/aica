# Habitat Archetype - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      HABITAT ARCHETYPE                          │
│              🏠 Logistica da Serenidade                         │
│                                                                 │
│  Philosophy: Silent, inevitable home maintenance                │
│  Design: Earthy tones, grounded cards, control panel           │
└─────────────────────────────────────────────────────────────────┘
```

## Layer Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                         VIEW LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │ HabitatHome  │  │PropertyDetail│  │MaintenanceView│           │
│  │              │  │              │  │              │            │
│  │  Dashboard   │  │  Full Info   │  │  Advanced    │            │
│  │  Overview    │  │  Contacts    │  │  Filtering   │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                   │
│                      ┌──────────────┐                            │
│                      │ InventoryView│                            │
│                      │              │                            │
│                      │  Grid Layout │                            │
│                      │  Search/Filter│                           │
│                      └──────────────┘                            │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                      COMPONENT LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │ PropertyCard │  │ InventoryGrid│  │ Maintenance  │            │
│  │              │  │              │  │   Tracker    │            │
│  │  Info + $$$  │  │  Grid + Srch │  │  List View   │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │InventoryItem │  │ CondoContacts│  │WarrantyAlerts│            │
│  │     Card     │  │              │  │     Card     │            │
│  │  + Warranty  │  │ Click-to-Call│  │  Expiring    │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                         HOOK LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │ useProperty  │  │ useInventory │  │useMaintenance│            │
│  │              │  │              │  │              │            │
│  │  State Mgmt  │  │  State Mgmt  │  │  State Mgmt  │            │
│  │  CRUD Ops    │  │  Filtering   │  │  Filtering   │            │
│  │  Helpers     │  │  Search      │  │  Summary     │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐                              │
│  │usePropertyId │  │useWarranty   │                              │
│  │              │  │   Alerts     │                              │
│  │  Single Item │  │  30-day      │                              │
│  └──────────────┘  └──────────────┘                              │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Property   │  │  Inventory   │  │ Maintenance  │            │
│  │   Service    │  │   Service    │  │   Service    │            │
│  │              │  │              │  │              │            │
│  │  CRUD        │  │  CRUD        │  │  CRUD        │            │
│  │  Calculate$  │  │  Warranty    │  │  Complete    │            │
│  │  FormatAddr  │  │  Search      │  │  Urgent      │            │
│  │              │  │  Filter      │  │  Summary     │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    SUPABASE POSTGRES                     │    │
│  │                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │    │
│  │  │   habitat_   │  │   habitat_   │  │   habitat_   │  │    │
│  │  │  properties  │  │  inventory   │  │ maintenance  │  │    │
│  │  │              │  │              │  │              │  │    │
│  │  │  Property    │  │  Items +     │  │  Schedule +  │  │    │
│  │  │  Info + $$$  │  │  Warranty    │  │  Provider    │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │    │
│  │                                                          │    │
│  │  ┌──────────────┐                                       │    │
│  │  │   habitat_   │                                       │    │
│  │  │  documents   │                                       │    │
│  │  │              │                                       │    │
│  │  │  Files +     │                                       │    │
│  │  │  Metadata    │                                       │    │
│  │  └──────────────┘                                       │    │
│  │                                                          │    │
│  │  RLS: is_connection_space_member()                      │    │
│  │  RLS: is_connection_space_admin()                       │    │
│  └──────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow - Property Creation

```
User Action (View Layer)
    │
    ├──> Click "Add Property" button
    │
    ▼
Component Layer (HabitatDashboard)
    │
    ├──> Form submission with property data
    │
    ▼
Hook Layer (useProperty)
    │
    ├──> createNewProperty(payload)
    │
    ▼
Service Layer (propertyService)
    │
    ├──> createProperty(payload)
    │    - Validates data
    │    - Calls Supabase
    │
    ▼
Database Layer (Supabase)
    │
    ├──> INSERT INTO habitat_properties
    │    - RLS checks space membership
    │    - Returns new property
    │
    ▼
Service Layer
    │
    ├──> Returns property object
    │
    ▼
Hook Layer
    │
    ├──> Updates local state
    │    - Adds to properties array
    │    - Triggers re-render
    │
    ▼
Component Layer
    │
    ├──> Displays new property
    │    - Shows PropertyCard
    │    - Updates dashboard
    │
    ▼
User sees new property instantly (optimistic update)
```

## Data Flow - Warranty Alerts

```
Component Mount (HabitatDashboard)
    │
    ▼
Hook Layer (useWarrantyAlerts)
    │
    ├──> Fetches alerts on mount
    │    - propertyId + daysThreshold (30)
    │
    ▼
Service Layer (inventoryService)
    │
    ├──> getWarrantyAlerts(propertyId, 30)
    │    - Queries items with warranty_expiry
    │    - Filters: warranty_expiry <= today + 30 days
    │    - Calculates days_remaining
    │
    ▼
Database Layer
    │
    ├──> SELECT FROM habitat_inventory
    │    WHERE property_id = $1
    │      AND warranty_expiry IS NOT NULL
    │      AND warranty_expiry BETWEEN NOW() AND NOW() + INTERVAL '30 days'
    │    ORDER BY warranty_expiry ASC
    │
    ▼
Service Layer
    │
    ├──> Maps results to WarrantyAlert objects
    │    - item_id, item_name
    │    - warranty_expiry
    │    - days_remaining (calculated)
    │
    ▼
Hook Layer
    │
    ├──> Sets alerts state
    │    - triggers re-render
    │
    ▼
Component Layer (WarrantyAlertsCard)
    │
    ├──> Displays alerts with countdown
    │    - Orange warning if < 30 days
    │    - Red warning if < 7 days
    │
    ▼
User sees warranty expiration warnings
```

## Integration with Connection Base

```
┌─────────────────────────────────────────────────────────┐
│              CONNECTION BASE INFRASTRUCTURE              │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ connection_  │  │ connection_  │  │ connection_  │  │
│  │   spaces     │  │   members    │  │transactions  │  │
│  │              │  │              │  │              │  │
│  │  Space       │  │  Membership  │  │  Finance     │  │
│  │  Metadata    │  │  + Roles     │  │  Splitting   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                   │                   │       │
│         └───────────────────┴───────────────────┘       │
│                             │                           │
└─────────────────────────────┼───────────────────────────┘
                              │
                              │ Foreign Keys
                              │ RLS Policies
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                   HABITAT ARCHETYPE                     │
│                                                         │
│  ┌──────────────┐                                       │
│  │   habitat_   │                                       │
│  │  properties  │                                       │
│  │              │                                       │
│  │  space_id ───┼──> connection_spaces.id              │
│  │              │    (FK, RLS enforced)                │
│  └──────────────┘                                       │
│         │                                               │
│         ├─────> habitat_inventory                      │
│         │       - property_id FK                       │
│         │                                               │
│         ├─────> habitat_maintenance                    │
│         │       - property_id FK                       │
│         │       - transaction_id ──> connection_transactions.id
│         │                                               │
│         └─────> habitat_documents                      │
│                 - property_id FK                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Component Composition

```
HabitatHome
    │
    └──> HabitatDashboard
            │
            ├──> PropertyCard
            │      │
            │      ├──> Property info
            │      ├──> Financial summary
            │      └──> Contacts preview
            │
            ├──> Alerts Row
            │      │
            │      ├──> Urgent maintenance alert
            │      ├──> Pending maintenance alert
            │      └──> Warranty expiration alert
            │
            ├──> WarrantyAlertsCard
            │      └──> List of expiring warranties
            │
            ├──> MaintenanceTracker
            │      │
            │      ├──> Status filters
            │      └──> Maintenance list
            │
            └──> Stats Summary
                   └──> Aggregated maintenance stats


PropertyDetail
    │
    ├──> PropertyCard (full info)
    │
    ├──> CondoContacts
    │      │
    │      ├──> Portaria (click-to-call)
    │      ├──> Sindico (click-to-call)
    │      └──> Administradora (click-to-call/email)
    │
    ├──> MaintenanceTracker
    │
    └──> InventoryGrid
           │
           ├──> Search bar
           ├──> Category filters
           ├──> Status filters
           └──> InventoryItemCard (multiple)
                  │
                  ├──> Item details
                  ├──> Warranty countdown
                  └──> Purchase info
```

## Type System Hierarchy

```
Base Types
    │
    ├──> PropertyType = 'apartment' | 'house' | 'condo' | 'room' | 'other'
    │
    ├──> InventoryCategory = 'eletrodomestico' | 'moveis' | 'eletronicos' | ...
    │
    ├──> InventoryStatus = 'active' | 'maintenance' | 'sold' | 'disposed' | 'lost'
    │
    ├──> MaintenanceCategory = 'preventiva' | 'corretiva' | 'melhoria' | 'emergencia'
    │
    ├──> MaintenanceUrgency = 'baixa' | 'normal' | 'alta' | 'emergencia'
    │
    └──> MaintenanceStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

Core Entities
    │
    ├──> HabitatProperty
    │      ├── id, space_id
    │      ├── property_type
    │      ├── address (line1, line2, city, state, postal_code, country)
    │      ├── building (name, unit_number, floor_number)
    │      ├── specs (bedrooms, bathrooms, parking_spots, area_sqm)
    │      ├── financials (condominium_fee, rent_value, property_tax_annual)
    │      ├── contacts (portaria, sindico, administradora)
    │      └── timestamps (created_at, updated_at)
    │
    ├──> InventoryItem
    │      ├── id, property_id
    │      ├── name, category, brand, model, serial_number
    │      ├── purchase (date, price, location)
    │      ├── warranty (expiry, document_id, notes)
    │      ├── location (room), notes, status
    │      └── timestamps
    │
    ├──> MaintenanceRecord
    │      ├── id, property_id, inventory_item_id
    │      ├── title, description, category, urgency
    │      ├── schedule (scheduled_date, completed_at)
    │      ├── provider (name, phone, email, notes)
    │      ├── cost (estimated_cost, actual_cost, transaction_id)
    │      ├── status
    │      └── timestamps
    │
    └──> HabitatDocument
           ├── id, property_id, inventory_item_id
           ├── title, document_type
           ├── file (url, name, size_kb)
           ├── uploaded_at, notes
           └── ...

DTOs (Data Transfer Objects)
    │
    ├──> CreateHabitatPropertyPayload
    ├──> UpdateHabitatPropertyPayload
    ├──> CreateInventoryItemPayload
    ├──> UpdateInventoryItemPayload
    ├──> CreateMaintenanceRecordPayload
    └──> UpdateMaintenanceRecordPayload

Utility Types
    │
    ├──> PropertyFinancialSummary
    │      ├── monthly_total
    │      ├── condominium_fee
    │      ├── rent_value
    │      └── property_tax_monthly
    │
    ├──> MaintenanceSummary
    │      ├── total_pending, total_scheduled, total_in_progress
    │      ├── total_estimated_cost
    │      └── urgent_count
    │
    ├──> WarrantyAlert
    │      ├── item_id, item_name
    │      ├── warranty_expiry
    │      └── days_remaining
    │
    └──> HabitatStats
           ├── total_properties, total_inventory_items, total_maintenance_records
           ├── pending_maintenance, urgent_maintenance, warranties_expiring_soon
           └── total_monthly_costs
```

## Security Model (RLS)

```
User Authentication (Supabase Auth)
    │
    ├──> auth.uid() = current user ID
    │
    ▼
Connection Space Membership
    │
    ├──> connection_space_members table
    │      - Links users to spaces
    │      - Defines roles (owner, admin, member, guest)
    │
    ▼
RLS Helper Functions
    │
    ├──> is_connection_space_member(space_id)
    │      - Returns true if user is member of space
    │      - Used for SELECT, INSERT permissions
    │
    └──> is_connection_space_admin(space_id)
           - Returns true if user is admin/owner of space
           - Used for UPDATE, DELETE permissions
    │
    ▼
Habitat Table Policies
    │
    ├──> habitat_properties
    │      - SELECT: is_connection_space_member(space_id)
    │      - INSERT: is_connection_space_member(space_id)
    │      - UPDATE: is_connection_space_admin(space_id)
    │      - DELETE: is_connection_space_admin(space_id)
    │
    ├──> habitat_inventory
    │      - SELECT: property in user's spaces
    │      - INSERT: property in user's spaces
    │      - UPDATE: property in user's spaces
    │      - DELETE: property in user's spaces (admin only)
    │
    ├──> habitat_maintenance
    │      - Similar to inventory
    │
    └──> habitat_documents
           - Similar to inventory
```

## State Management Flow

```
Initial Load
    │
    ├──> useProperty(spaceId) hook mounts
    │      │
    │      ├──> useEffect triggers refreshProperties()
    │      │      │
    │      │      ├──> Sets loading = true
    │      │      ├──> Calls getPropertiesBySpace(spaceId)
    │      │      ├──> Updates properties state
    │      │      └──> Sets loading = false
    │      │
    │      └──> Returns { properties, loading, error, ... }
    │
    ▼
User Interaction (Create)
    │
    ├──> User calls createNewProperty(payload)
    │      │
    │      ├──> Calls service createProperty(payload)
    │      ├──> Receives new property from DB
    │      ├──> Updates local state: [newProperty, ...prev]
    │      └──> Component re-renders with new data
    │
    ▼
User Interaction (Update)
    │
    ├──> User calls updateExistingProperty(payload)
    │      │
    │      ├──> Calls service updateProperty(payload)
    │      ├──> Receives updated property from DB
    │      ├──> Updates local state: map and replace
    │      └──> Component re-renders with updated data
    │
    ▼
User Interaction (Delete)
    │
    └──> User calls deleteExistingProperty(id)
           │
           ├──> Calls service deleteProperty(id)
           ├──> Updates local state: filter out deleted
           └──> Component re-renders without deleted item
```

---

This architecture provides:
- ✅ Clean separation of concerns
- ✅ Type safety throughout
- ✅ Secure data access (RLS)
- ✅ Optimistic updates
- ✅ Reusable components
- ✅ Scalable structure
