# Design: Finance Incremental Import

**Session:** `feat-finance-incremental-import`
**Date:** 2026-03-12
**Status:** Approved (v2 — post spec review)

---

## Problem

When a user re-imports a bank statement (PDF/CSV) for a month that was partially imported, the system blocks with "Já existe extrato para este período". The user must manually delete the old statement before re-importing, which is poor UX.

Additionally, there is no email import path for finance statements — only manual upload via the web UI. The existing `receive-email-import` Edge Function only handles WhatsApp exports (`.txt`/`.zip`).

## Decision

**Approach A — Hash-Only Dedup** (approved by user):

- Remove period overlap as a blocking error
- Trust SHA-256 transaction hash for deduplication (`upsert` + `ignoreDuplicates: true`)
- Allow multiple statement records per period
- Extend email import (`receive-email-import`) to accept PDF/CSV and route to Finance pipeline

## Design

### Part 1: Incremental Import (Upload Manual)

#### `statementService.ts` Changes

**`checkPeriodOverlap`** — Changes from blocker to informational:
- Still queries overlapping completed statements
- Returns overlap info but does NOT throw or mark as failed
- Caller logs: "adicionando transações novas ao período existente"

**`saveParsedData`** (lines 245-264) — Changes:
```typescript
// Before:
if (otherOverlaps.length > 0) {
  await markFailed(statementId, "Período sobreposto com: ...");
  throw new Error("Período sobreposto");
}

// After:
if (otherOverlaps.length > 0) {
  console.info(`Período sobreposto com ${otherOverlaps.length} extrato(s) — continuando com dedup por hash`);
  // Continue processing — hash dedup will handle duplicates
}
```

**`processCSVStatement`** (lines 526-550) — TWO additional throw sites must be relaxed:
1. **Overlap throw** (line 529): `throw new Error('Já existe extrato para este período: ...')` → change to `console.info` and continue
2. **Duplicate file throw** (lines 548-550): `throw new Error('Este extrato já foi importado anteriormente.')` → change to informational return

**`processCSVStatement` transaction insert** (lines 637-648) — CRITICAL:
- Currently uses plain `.insert()` (NOT upsert) → will throw on duplicate `hash_id` constraint
- Must change to `.upsert(..., { onConflict: 'hash_id', ignoreDuplicates: true })` to match `saveTransactions` behavior

**`checkDuplicate` (file hash)** — Relaxed:
- Keep return type as `boolean` (no breaking change to callers)
- Change behavior: return `false` always (or remove the check entirely)
- The caller in `StatementUpload.tsx` handles the UI message change

**`saveTransactions`** — No changes needed:
- Already uses `upsert` with `ignoreDuplicates: true`
- Already tracks skipped count via hash collision detection
- Returns: `{ inserted: number, skipped: number }`

**Dead code cleanup**: After removing the overlap block in `saveParsedData`, the `hasOverlap` destructured variable becomes unused. Clean up or remove the destructuring.

#### `StatementUpload.tsx` UI Changes

**Both CSV branches** (cached CSV path at lines 341-388 AND fallback path) must be updated:

**Overlap detected:**
- Instead of error, shows info message: "Período parcialmente importado. Adicionando apenas transações novas."
- After processing: "12 novas transações adicionadas (38 já existiam)"

**Duplicate file detected:**
- Shows info: "Este arquivo já foi importado anteriormente. Nenhuma transação nova encontrada."
- Not an error — user can dismiss and continue

### Part 2: Email Import for Finance

#### `receive-email-import` Edge Function Extension

**Step 1 — Update `ALLOWED_EXTENSIONS`:**
```typescript
// Before:
const ALLOWED_EXTENSIONS = ['.txt', '.zip'];

// After:
const ALLOWED_EXTENSIONS = ['.txt', '.zip', '.pdf', '.csv'];
```
Without this change, `.pdf` and `.csv` files are rejected at line 527 before any routing logic executes.

**Step 2 — File routing by extension:**

| Extension | Pipeline | Storage Bucket |
|-----------|----------|----------------|
| `.txt`, `.zip` | WhatsApp → `ingest-whatsapp-export` | `whatsapp-exports/` |
| `.pdf` | Finance → `gemini-chat` (action: parse_statement) | `finance-statements/` |
| `.csv` | Finance → Deno CSV parser (ported logic) | `finance-statements/` |

**Step 3 — Set `import_type` in initial log insert:**
The `email_import_log` insert (line 379) must include `import_type` based on the detected extension:
```typescript
// In the initial insert:
import_type: isFinanceFile ? 'finance' : 'whatsapp'
```
The `updateLog` helper only updates `status` and `rejection_reason` — it cannot set `import_type` retroactively.

**IMPORTANT**: There is no `parse-bank-statement` Edge Function. PDF parsing is done client-side via `pdfProcessingService.processPDFFile()` which calls `gemini-chat` Edge Function. For the email path, we need to either:
- Call `gemini-chat` with `action: 'parse_statement'` from within `receive-email-import` (preferred — reuses existing Gemini parsing)
- Or create a new `parse-bank-statement` Edge Function (more isolated but duplicates logic)

**Recommended**: Call `gemini-chat` internally since it already has the Gemini parsing logic.

**PDF email import flow:**
1. Webhook validates signature (Svix/Resend)
2. Resolve user by sender email (`lookup_user_by_email`)
3. Check rate limit (existing: 10/day — shared with WhatsApp imports)
4. **Pre-download size check**: If Resend webhook payload includes `att.size` or `att.content_length`, reject files >10MB before downloading. If not available, proceed to download.
5. Download PDF attachment via Resend API
6. **Post-download size validation**: Max 10MB for PDF/CSV (Finance limit), not 100MB (WhatsApp limit). This is the fallback if pre-download metadata wasn't available.
7. Upload to `finance-statements/{user_id}/email_{timestamp}.pdf`
8. Extract text from PDF (using Deno PDF library or pass raw to Gemini)
9. Call Gemini via `gemini-chat` action to parse transactions
10. Save transactions with incremental dedup (hash-based upsert)
11. Send confirmation email (HTML template matching existing Ceramic style)

**CSV email import flow:**
- Similar to PDF but CSV parsing logic must be **ported to Deno** (browser `FileReader` API not available)
- Create `supabase/functions/_shared/csvParser.ts` with Deno-compatible CSV parser
- Reuse bank format detection logic (header matching) from `csvParserService`
- Effort: Medium (not trivial)

**Error handling:**
- Parse failure → send error email to user (HTML template)
- Unsupported file type → send "formato não suportado" email
- Rate limit exceeded → send "limite diário atingido" email
- File too large (>10MB) → send "arquivo muito grande" email

#### Database Migration

**`email_import_log` table** — Add `import_type` discriminator column:
```sql
ALTER TABLE email_import_log ADD COLUMN import_type TEXT NOT NULL DEFAULT 'whatsapp';
-- Values: 'whatsapp', 'finance'
```

This allows:
- Separate audit trails for WhatsApp vs Finance email imports
- Future: separate rate limits per import type if needed
- Current rate limit RPC (`count_user_email_imports_today`) counts all types together (acceptable for now)

### Part 3: Confirmation Email Template

Templates must be **HTML** (not plain text) to match existing `confirmationEmailHTML` function in `receive-email-import`. Use Ceramic-inspired styling (warm palette, gradient header).

**Success template structure:**
```html
<!-- Subject: ✅ Extrato importado — {bankName} {month}/{year} -->
<div style="...ceramic gradient header...">
  <h1>Extrato Importado</h1>
</div>
<div style="...body...">
  <p>Banco: {bankName}</p>
  <p>Período: {periodStart} — {periodEnd}</p>
  <p>Novas transações: {inserted}</p>
  <p>Já existentes (ignoradas): {skipped}</p>
  <a href="https://aica.guru/finance">Ver detalhes</a>
</div>
```

**Error template:** Same structure with error styling.

## Files to Modify

| File | Change | Effort |
|------|--------|--------|
| `src/modules/finance/services/statementService.ts` | Relax `checkPeriodOverlap` in `saveParsedData` AND `processCSVStatement` (2 overlap throws + 1 duplicate throw); change `processCSVStatement` `.insert()` to `.upsert()` | Medium |
| `src/modules/finance/components/StatementUpload.tsx` | Info messages instead of errors for overlap/duplicate in both CSV branches | Medium |
| `supabase/functions/receive-email-import/index.ts` | Update `ALLOWED_EXTENSIONS` to include `.pdf`/`.csv`; add file routing to Finance pipeline; add 10MB size check (pre+post download); set `import_type` in initial `email_import_log` insert | High |
| `supabase/functions/_shared/csvParser.ts` | **NEW**: Deno-compatible CSV parser (ported from `csvParserService`) | Medium |
| `supabase/migrations/YYYYMMDD_email_import_type.sql` | **NEW**: Add `import_type` column to `email_import_log` | Low |

## Risks & Mitigations

1. **Transaction duplicates from description changes**: Banks may change transaction descriptions between extracts (e.g., "PIX" → "PIX - FULANO"), generating different hashes. Acceptable — user can delete manually. Future: fuzzy matching.

2. **Multiple statements per month**: Dashboard may show 2-3 statements for March. Mitigation: UI shows most recent as primary.

3. **Email spoofing**: Mitigated by `lookup_user_by_email` resolution + rate limiting (10/day).

4. **PDF parsing failure via email**: User gets error email with failure reason.

5. **Size limit mismatch**: Email system allows 100MB attachments but Finance caps at 10MB. Mitigation: explicit 10MB check for finance files before storage upload, with error email sent.

6. **CSV parser browser/Deno incompatibility**: `csvParserService` uses `FileReader` (browser-only). Mitigation: port to `_shared/csvParser.ts` using `TextDecoder`.

## Out of Scope

- Auto-deleting old statements on re-import
- Merging multiple statements into one
- Category editing via email
- New bank format support (uses existing parsers)
- Fuzzy transaction matching (future enhancement)
- Separate rate limits per import type (shared 10/day is fine for now)

## Testing Strategy

- Unit tests: `statementService` overlap/dedup relaxation (both `saveParsedData` and `processCSVStatement`)
- Unit tests: `_shared/csvParser.ts` Deno CSV parser
- Unit tests: `receive-email-import` file routing logic
- Integration: end-to-end PDF re-import (manual upload)
- Integration: end-to-end CSV re-import (manual upload)
- Manual: email import flow (send PDF to `import@import.aica.guru`)
