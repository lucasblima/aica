# Service Status Page — Design

**Date:** 2026-02-28
**Session:** feat-service-status
**Approach:** A — Single file with inline static data

## Overview

Public page at `/status` showing current service status, recent incidents, and a changelog of system updates. All data is hardcoded in the component file — no database, no external API.

## Route

- Path: `/status`
- Access: Public (no ProtectedRoute)
- Lazy loaded like other public pages

## Layout

Same pattern as PrivacyPolicyPage/TermsOfServicePage:
- `min-h-screen bg-ceramic-base`
- Sticky header with back button
- `max-w-[900px] mx-auto` centered content
- Footer with copyright

## Sections

### 1. Status Banner
- Current overall status: `operational` | `degraded` | `outage`
- Color-coded: `ceramic-success` (green) / `ceramic-warning` (yellow) / `ceramic-error` (red)
- Icon + text (e.g., "Todos os sistemas operacionais")

### 2. Incidents Timeline
- Array `INCIDENTS` with: `date`, `title`, `description`, `severity` (outage/degraded/maintenance), `duration`, `resolved` (boolean)
- Cards with colored severity badge, date, title, description, duration
- Most recent first

### 3. Changelog
- Array `CHANGELOG` with: `date`, `type` (feat/fix/infra/docs), `description`
- List with date, colored type badge, description
- Most recent first

## Data Structure

```typescript
type Severity = 'outage' | 'degraded' | 'maintenance'
type ChangeType = 'feat' | 'fix' | 'infra' | 'docs'

interface Incident {
  date: string
  title: string
  description: string
  severity: Severity
  duration: string
  resolved: boolean
}

interface ChangelogEntry {
  date: string
  type: ChangeType
  description: string
}
```

## Files

- `src/pages/StatusPage.tsx` — Single component with inline data
- `src/router/AppRouter.tsx` — Add `/status` route (public)

## Styling

- Ceramic Design System tokens
- Same hex colors as legal pages (#2B1B17, #5C554B, #E8E6E0, #F8F7F5)
- Lucide icons for status indicators
- No external dependencies
