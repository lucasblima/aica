# Finance Module — Production-Ready Audit Report

**Date:** 2026-02-28
**Session:** `audit-finance-production-ready`
**Module:** `src/modules/finance/` (41 files, ~13.5K LOC)

---

## Executive Summary

| Auditor | Critical | High | Medium | Low | Total |
|---------|----------|------|--------|-----|-------|
| UI/UX | 7 | 5 | 6 | 3 | 21 |
| Backend | 5 | 8 | 8 | 4 | 25 |
| Security/Perf | 1 | 6 | 5 | 4 | 16 |
| **TOTAL** | **13** | **19** | **19** | **11** | **62** |

**Verdict:** Module is feature-complete but needs 13 critical + 19 high fixes before production-grade.

---

## CRITICAL FINDINGS (13)

### UI/UX Critical (7)

| # | File | Issue | Category |
|---|------|-------|----------|
| U1 | CategoryTrendChart.tsx:141 | SVG `fill="white"` not using Ceramic tokens | ceramic |
| U2 | FinanceSearchPanel.tsx:159-204 | Non-ceramic button colors in mode selector | ceramic |
| U3 | MonthComparisonView.tsx:351-352 | Hardcoded `text-emerald-600`, `text-red-500` for deltas | ceramic |
| U4 | MonthComparisonView.tsx:410-449 | Income/expense colors using Material Design tokens | ceramic |
| U5 | RecategorizeModal.tsx:41-59 | CATEGORY_COLORS uses raw Tailwind color pairs | ceramic |
| U6 | TransactionListView.tsx:56-75 | Same CATEGORY_COLORS issue | ceramic |
| U7 | StatementUpload.tsx:275 | Processing stage param never rendered | upload-ux |

### Backend Critical (5)

| # | File | Issue | Category |
|---|------|-------|----------|
| B1 | financeService.ts:172 | Division by zero in `getBurnRate()` when previousMonth=0 | edge-case |
| B2 | useTransactions.ts:109-112 | Missing filter dependencies in useEffect | hook-pattern |
| B3 | pdfProcessingService.ts:199 | Unsafe `any` type casting on Gemini response, balance always 0 | typescript |
| B4 | statementService.ts:315-320 | `ignoreDuplicates` silently drops transactions, no feedback | error-handling |
| B5 | financeAgentService.ts:171 | Missing validation of Gemini response shape | error-handling |

### Security Critical (1)

| # | File | Issue | Category |
|---|------|-------|----------|
| S1 | migration 20251208:54-59 | finance_processing_logs missing INSERT RLS policy | rls |

---

## HIGH FINDINGS (19)

### UI/UX High (5)

| # | File | Issue | Category |
|---|------|-------|----------|
| U8 | ExpenseChart.tsx:141 | SVG tooltip `fill="white"` not themed | ceramic |
| U9 | TrendLineChart.tsx:256 | SVG tooltip `fill="white"` not themed | ceramic |
| U10 | FinanceCard.tsx:147,195 | `text-etched` class not in Ceramic DS | ceramic |
| U11 | CSVUpload.tsx:146-147 | Info color used for success state (semantic mismatch) | consistency |
| U12 | RecategorizeModal.tsx:214-216 | `bg-amber-500` should be `bg-ceramic-accent` | ceramic |

### Backend High (8)

| # | File | Issue | Category |
|---|------|-------|----------|
| B6 | csvParserService.ts:278 | Negative amounts misclassified for credit cards | validation |
| B7 | ofxParserService.ts:71-76 | Silently skips invalid transactions, no logging | error-handling |
| B8 | statementService.ts:429 | `.single()` throws 406, wrongly treated as "found" | supabase |
| B9 | financeAgentService.ts:96-100 | NaN amount corrupts AI context totals | validation |
| B10 | useFinanceFileSearch.ts:262 | No retry on corpus creation failure | error-handling |
| B11 | financeDigestService.ts:73-91 | No validation of Edge Function response shape | validation |
| B12 | recurringDetectionService.ts:87-104 | Unbounded Map growth, OOM risk on large datasets | edge-case |
| B13 | financeAgentService.ts:254-298 | getUserSessions no LIMIT, N+1 query | supabase |

### Security High (6)

| # | File | Issue | Category |
|---|------|-------|----------|
| S2 | financeAgentService.ts:72-86 | N queries without token expiry check, cascade risk | auth |
| S3 | statementService.ts:149-151 | MIME type validation client-only, spoofable | input-sanitization |
| S4 | financeAgentService.ts:254-298 | getUserSessions no LIMIT, unbounded query | query-efficiency |
| S5 | migration 20251206:72 | Missing composite index (user_id, processing_status) | query-efficiency |
| S6 | financeService.ts:22-25 | `SELECT *` when only (type, amount) needed | query-efficiency |
| S7 | migration 20251208:239-240 | SECURITY DEFINER without ownership check | rls |

---

## MEDIUM FINDINGS (19)

### UI/UX Medium (6)

| # | File | Issue |
|---|------|-------|
| U13 | GoalTracker.tsx:30-31 | Hardcoded hex `#F59E0B` instead of CSS variable |
| U14 | FinanceEmptyState.tsx | Missing error state for upload failures |
| U15 | CSVUpload.tsx | Success message auto-closes in 2s, easy to miss |
| U16 | DriveFilePicker.tsx:251-254 | "PDF em breve" not visually disabled |
| U17 | StatementUpload.tsx:401-402 | Status icon always info color, should vary by stage |
| U18 | TransactionListView.tsx:335-336 | `hover:bg-red-50` uses Material Design token |

### Backend Medium (8)

| # | File | Issue |
|---|------|-------|
| B14 | csvParserService.ts:202-205 | No handling of quoted CSV fields (commas in descriptions) |
| B15 | pdfProcessingService.ts:55-100 | onProgress callback not wrapped in try-catch |
| B16 | statementService.ts:319 | Hardcoded ignoreDuplicates, no way to update transactions |
| B17 | exportService.ts:34-60 | No file size guard for very large exports |
| B18 | financeService.ts:143-179 | getBurnRate assumes date continuity |
| B19 | useFinanceFileSearch.ts:64-437 | No cleanup on unmount, potential memory leak |
| B20 | budgetService.ts:10-30 | No month/year validation |
| B21 | accountService.ts:31-62 | No color/icon field validation |

### Security Medium (5)

| # | File | Issue |
|---|------|-------|
| S8 | statementService.ts:55-67 | getStatements no LIMIT, fetches all on load |
| S9 | pdfProcessingService.ts:21 | PDF.js 500KB+ loaded eagerly, blocks bundle |
| S10 | migration 20251203:10-11 | Missing CHECK constraint on amount field |
| S11 | financeAgentService.ts:23 | GeminiClient.getInstance() not null-checked |
| S12 | migration 20251208:452-475 | XSS risk if categorization keywords displayed unescaped |

---

## LOW FINDINGS (11)

| # | File | Issue |
|---|------|-------|
| U19 | FinanceCard.tsx:26-27 | Minimal loading skeleton in compact mode |
| U20 | MonthlyDigestCard.tsx:92 | No retry button on digest generation failure |
| U21 | AccountManagement.tsx | Delete button missing Trash icon |
| B22 | financeService.ts | No request deduplication for concurrent calls |
| B23 | pdfProcessingService.ts:21 | Hardcoded PDF.js worker path |
| B24 | goalService.ts:47-79 | No validation that target_amount > 0 |
| B25 | pdfProcessingService.ts:273-310 | generateMarkdown() orphaned, never called |
| S13 | financeDigestService.ts | Digest not cached with TTL |
| S14 | migration 20251208:96 | transaction_hash nullable but dedup assumes non-null |
| S15 | migration 20251203:37-38 | Missing composite index (user_id, date, type) |
| S16 | statementService.ts:451 | Missing GIN index on raw_data_snapshot JSONB |

---

## PRIORITIZED IMPLEMENTATION PLAN

### Sprint 1 — Critical Fixes (block production)

**Week 1: Backend & Security Critical**
1. Fix division by zero in getBurnRate() [B1]
2. Fix useTransactions filter dependencies [B2]
3. Add ParsedTransaction type, fix balance=0 [B3]
4. Add upsert feedback for duplicate detection [B4]
5. Validate Gemini response shape [B5]
6. Add INSERT RLS policy on finance_processing_logs [S1]
7. Add SECURITY DEFINER ownership check [S7]

**Week 2: UI/UX Critical — Ceramic Compliance**
8. Create shared CATEGORY_COLORS map using ceramic tokens [U5, U6]
9. Fix MonthComparisonView colors [U3, U4]
10. Fix SVG fills in charts [U1]
11. Fix FinanceSearchPanel button colors [U2]
12. Fix StatementUpload processing stage display [U7]

### Sprint 2 — High Priority (production quality)

**Week 3: Backend High**
13. Fix credit card amount classification [B6]
14. Add OFX skip logging with counts [B7]
15. Fix `.single()` → `.maybeSingle()` [B8]
16. Add NaN guard in buildContext [B9]
17. Add corpus retry logic [B10]
18. Validate digest response shape [B11]
19. Cap recurring detection Map size [B12]
20. Add LIMIT to getUserSessions [B13]

**Week 4: Security High + UI High**
21. Add token expiry check before batch queries [S2]
22. Add PDF magic bytes validation [S3]
23. Add composite index (user_id, processing_status) [S5]
24. Fix SELECT * → select('type, amount') [S6]
25. Fix SVG tooltip fills [U8, U9]
26. Replace text-etched with ceramic token [U10]
27. Fix CSVUpload semantic color [U11]
28. Fix RecategorizeModal amber → ceramic-accent [U12]

### Sprint 3 — Medium (quality polish)

29-47. All medium findings in order of impact.

### Backlog — Low

48-58. All low findings as time permits.

---

## KEY METRICS

- **Ceramic DS Compliance:** ~60% → Target 95%+
- **Error Handling Coverage:** ~70% → Target 95%+
- **Input Validation:** ~40% → Target 90%+
- **Query Optimization:** ~50% → Target 85%+
- **Accessibility (WCAG 2.1 AA):** Not assessed in depth (needs dedicated pass)
