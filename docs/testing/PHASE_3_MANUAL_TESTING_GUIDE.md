# Phase 3: Manual Testing Guide - Guest Approval System

## Overview

This document provides comprehensive manual testing instructions for Phase 3 of the podcast guest identification feature. It covers:

- **Workflow 1:** Public Figure (Automatic Research)
- **Workflow 2:** Common Person (Manual Entry)
- **Workflow 3:** Guest Approval Process

## Prerequisites

- Application running: `npm run dev`
- Supabase project configured (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY in .env)
- Authentication configured and user logged in
- E2E tests should pass: `npm run test:e2e`

---

## Test Execution Steps

### Phase 3.1: Test Public Figure Workflow (Pesquisa Automática)

**Objective:** Validate that users can create podcast episodes with public figures using automatic research via Gemini API.

#### Test Case 1.1: Navigate to Podcast Module
1. Go to podcast section in application
2. Locate "Nova Entrevista" or "Create Episode" button
3. Click to open Guest Identification Wizard

**Expected Result:**
- Guest Identification Wizard modal opens
- Step 0 displays with two options visible:
  - "Figura Pública" (with search icon)
  - "Pessoa Comum" (with form icon)
- Help tip visible at bottom

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

#### Test Case 1.2: Select Public Figure Option
1. In Step 0, click on "Figura Pública" card
2. Observe transition to Step 1a

**Expected Result:**
- Step 1a appears with form: "Quem será entrevistado?"
- Two input fields visible:
  - Guest Name input
  - Reference/Profession input
- "Buscar Perfil" button is DISABLED (grayed out)
- Progress bar shows ~25% complete

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

#### Test Case 1.3: Search for Public Figure
1. In Step 1a, enter guest name: "Elon Musk"
2. Enter reference: "CEO Tesla"
3. Click "Buscar Perfil" button
4. Wait for search to complete (may show "Buscando..." indicator)

**Expected Result:**
- Loading state displays briefly (if Gemini API is responsive)
- Step 2 appears after ~3-5 seconds
- Step 2 title shows: "Confirme o convidado"
- Guest profile card displays:
  - Guest name: "Elon Musk"
  - Profile summary/biography
  - (Optional) Technical details, controversies, news

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

#### Test Case 1.4: Confirm Profile (Step 2)
1. Review guest profile displayed
2. Click "Confirmar" or "Prosseguir" button to confirm

**Expected Result:**
- Step 3 appears with title: "Tema da Conversa"
- Guest name displayed at top: "Elon Musk"
- Form fields visible:
  - Theme selector: "Automático (AICA)" [selected by default]
  - Season field (default: "1")
  - Location selector
  - Optional: Date/Time fields
- "Concluir" button is ENABLED

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

#### Test Case 1.5: Complete Episode Creation (Step 3)
1. Keep default theme setting (Automático)
2. Set season to "1"
3. (Optional) Set date: "2025-12-20", time: "14:00"
4. Click "Concluir" button

**Expected Result:**
- Wizard modal closes
- PreProduction Hub loads with episode details:
  - Guest name: "Elon Musk"
  - Episode metadata visible
  - Pauta section appears (Topics, Research, Chat)
- "Enviar Aprovação" button visible in header
- Episode successfully created in database

**Verification:**
- Check Supabase Console → Tables → podcast_episodes
- New row should exist with:
  - guest_name: "Elon Musk"
  - user_id: [current user ID]
  - episode_id: [UUID, generated]
  - status: likely "draft" or "pre_production"

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

#### Test Case 1.6: Access Approval UI (Public Figure)
1. In PreProduction Hub, locate "Enviar Aprovação" button
2. Click button

**Expected Result:**
- Guest Approval Link Dialog modal opens
- Modal shows:
  - Guest name: "Elon Musk"
  - "Gerar e Enviar Link" button (or similar)
  - Three delivery method options:
    - Email (if guest_email exists in database)
    - WhatsApp (if guest_phone exists)
    - Link Only (always available)

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

### Phase 3.2: Test Common Person Workflow (Cadastro Manual)

**Objective:** Validate that users can create podcast episodes with common people using manual form entry.

#### Test Case 2.1: Navigate and Select Common Person
1. Click "Nova Entrevista" to open Guest Identification Wizard
2. In Step 0, click "Pessoa Comum" card

**Expected Result:**
- Step 1b (Manual Form) appears immediately
- Form shows three fields:
  - "Nome Completo" input (with placeholder: "Ex: João Silva")
  - "Telefone/WhatsApp" input (with placeholder: "(11) 99999-9999")
  - "Email" input (with placeholder: "joao@exemplo.com")
- Info box visible explaining data usage: "...será usada para pauta e lembretes"
- "Prosseguir" button is DISABLED until all fields valid

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

#### Test Case 2.2: Fill Manual Form with Valid Data
1. Name field: Enter "João da Silva"
2. Phone field: Enter "11987654321"
3. Email field: Enter "joao@exemplo.com"
4. Verify all fields are valid (no red error messages)

**Expected Result:**
- No validation errors displayed
- "Prosseguir" button becomes ENABLED (blue, clickable)
- All input fields show checkmarks or success state (optional)

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

#### Test Case 2.3: Validate Phone Format
1. Try entering invalid phone: "123" (too short)
2. Click outside the field to trigger validation

**Expected Result:**
- Red error message appears: "Telefone inválido (10-13 dígitos)"
- "Prosseguir" button remains DISABLED
- Clear error when valid phone entered

**Valid Phone Formats to Test:**
- "11987654321" (11 digits)
- "21998765432" (10 digits)
- "(11) 98765-4321" (formatted)
- "+5511987654321" (with country code)

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

#### Test Case 2.4: Validate Email Format
1. Enter invalid email: "emailinvalido" (no @domain)
2. Click outside field

**Expected Result:**
- Red error message: "Email inválido"
- "Prosseguir" button disabled
- Error clears when valid email entered

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

#### Test Case 2.5: Submit Manual Form
1. Fill all fields with valid data:
   - Name: "Maria Santos"
   - Phone: "21998765432"
   - Email: "maria@exemplo.com"
2. Click "Prosseguir"

**Expected Result:**
- Step 1b (Manual Form) closes
- **Step 2 is SKIPPED** (no profile confirmation for common people)
- Step 3 appears directly with "Tema da Conversa"
- Guest name shown: "Maria Santos"
- Progress bar shows ~75% complete

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

#### Test Case 2.6: Complete Episode with Manual Guest
1. In Step 3, keep theme as "Automático"
2. Set season: "1"
3. Click "Concluir"

**Expected Result:**
- Wizard closes
- PreProduction Hub loads with:
  - Guest name: "Maria Santos"
  - "Enviar Aprovação" button visible
- Episode created with guest_email and guest_phone stored

**Verification (Database):**
- Check podcast_episodes table:
  - guest_name: "Maria Santos"
  - guest_email: "maria@exemplo.com"
  - guest_phone: "21998765432"
  - guest_category: "common_person" or similar

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

#### Test Case 2.7: Access Approval UI (Common Person)
1. In PreProduction Hub, click "Enviar Aprovação"

**Expected Result:**
- Guest Approval Link Dialog opens
- Guest info shown: "Maria Santos"
- Email option available (maria@exemplo.com)
- WhatsApp option available (21998765432)
- Link Only option always available

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

### Phase 3.3: Test Guest Approval Process

**Objective:** Validate that guests can receive approval links and review/approve episode information.

#### Test Case 3.1: Generate Approval Link
1. In Guest Approval Link Dialog, select "Link Only" method
2. Click "Gerar Link" or "Gerar e Enviar"

**Expected Result:**
- Approval link generated (32-character alphanumeric token)
- Link displayed in format: `/podcast/approval/:episodeId/:approvalToken`
- "Copiar Link" button available
- Token stored in database:
  - podcast_episodes.approval_token: [32-char token]
  - podcast_episodes.approval_token_created_at: [current timestamp]

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

#### Test Case 3.2: Share Approval Link via Email
1. In Guest Approval Link Dialog, select "Email" method
2. Click "Enviar via Email"
3. (Optional) Verify email in test inbox if configured

**Expected Result:**
- Email sent successfully (no error message)
- Email contains:
  - Guest greeting: "Olá, [guest name]"
  - "Revisar Informações" button/link to approval page
  - Expiration notice: "Válido por 30 dias"
  - Instructions to review and approve
- Confirmation message in modal: "Link enviado com sucesso!"

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

#### Test Case 3.3: Verify Approval Page Structure
1. Copy approval link from dialog
2. Open in new browser tab/window (or use incognito mode for testing)
3. Visit approval URL: `http://localhost:3000/podcast/approval/:episodeId/:approvalToken`

**Expected Result:**
- Guest Approval Page loads with:
  - Guest name displayed
  - Biography section (if available from research/manual entry)
  - Technical sheet (for public figures)
  - Controversies (if applicable)
  - Key facts checkmark list (if available)
- Two action buttons:
  - "Aprovar" (green button)
  - "Requerer Alterações" (yellow button)
- Form field for approval notes (optional)

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

#### Test Case 3.4: Guest Approves Information
1. On approval page, review displayed information
2. Click "Aprovar" button
3. (Optional) Add approval notes: "Informações corretas e completas"
4. Confirm submission

**Expected Result:**
- Form submits successfully
- Database updated:
  - podcast_guest_research.approved_by_guest: true
  - podcast_guest_research.approved_at: [current timestamp]
  - podcast_guest_research.approval_notes: [optional notes]
- Success message displayed: "Informações aprovadas com sucesso!"
- Page shows confirmation with timestamp and notes

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

#### Test Case 3.5: Guest Requests Changes
1. On approval page, click "Requerer Alterações"
2. Fill in required notes about what needs changing
3. Submit form

**Expected Result:**
- Form submits with approval status: "requested_changes"
- Database updated:
  - podcast_guest_research.approved_by_guest: false
  - podcast_guest_research.approval_notes: [change requests]
  - podcast_guest_research.approved_at: null
- Confirmation message: "Solicitação de alterações enviada"
- Producer can see notes in PreProduction Hub

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

#### Test Case 3.6: Expired Token Handling
1. Manually set token_created_at to 31+ days ago (or manipulate in DB for testing)
2. Visit approval URL with expired token

**Expected Result:**
- Error message: "Link de aprovação expirado (máximo 30 dias)"
- Option to request new approval link
- Page does not allow approval submission

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

#### Test Case 3.7: Invalid Token Handling
1. Visit approval URL with random/invalid token

**Expected Result:**
- Error message: "Token inválido ou não encontrado"
- No data loaded
- Option to go back or request new link

**Test Status:** ☐ PASS / ☐ FAIL / ☐ SKIP

---

## Automated E2E Tests

Run comprehensive E2E tests with:

```bash
npm run test:e2e -- podcast-guest-approval-flow.spec.ts
```

This will execute 40+ test cases covering all workflows, validation, and error scenarios.

---

## Database Verification Queries

### Verify Episode Creation
```sql
SELECT
  id,
  guest_name,
  guest_email,
  guest_phone,
  guest_category,
  user_id,
  status,
  created_at
FROM podcast_episodes
ORDER BY created_at DESC
LIMIT 5;
```

### Verify Approval Token Generation
```sql
SELECT
  id,
  guest_name,
  approval_token,
  approval_token_created_at,
  EXTRACT(DAY FROM (NOW() - approval_token_created_at)) as token_age_days
FROM podcast_episodes
WHERE approval_token IS NOT NULL
ORDER BY approval_token_created_at DESC
LIMIT 5;
```

### Verify Guest Research Data
```sql
SELECT
  id,
  episode_id,
  full_name,
  biography,
  approved_by_guest,
  approved_at,
  approval_notes
FROM podcast_guest_research
ORDER BY created_at DESC
LIMIT 5;
```

---

## Troubleshooting

### Issue: "Gemini API Error: An API Key must be set"
**Solution:**
- Ensure `VITE_GEMINI_API_KEY` is set in `.env`
- Check that API key is not empty and at least 10 characters
- Application will use mock data if API key is invalid (logged as warning)

### Issue: Approval link not generating
**Solution:**
- Check if `approval_token` column exists on `podcast_episodes` table
- Verify Supabase connection is active
- Check browser console for JavaScript errors
- Review database RLS policies on podcast_episodes table

### Issue: Email not sent
**Solution:**
- Verify `SENDGRID_API_KEY` is configured for Edge Function
- Check that guest_email is populated
- Review SendGrid email logs
- Test manually with "Link Only" option first

### Issue: Common Person step skipping doesn't work
**Solution:**
- Verify Step 2 is only shown for Public Figures (guest_category: "public_figure")
- Check GuestIdentificationWizard.tsx logic for step progression
- Ensure manual form submission triggers nextStep() with skipStep2=true

---

## Success Criteria

✅ **Phase 3 Complete When:**

1. **Public Figure Workflow**
   - ✓ Step 0 → Step 1a → Step 2 → Step 3 navigation works
   - ✓ Gemini API returns research data (or mock data if not available)
   - ✓ Episode created in database with guest_name, user_id, guest_category='public_figure'
   - ✓ Approval button visible in PreProduction Hub
   - ✓ Approval link generates with valid token

2. **Common Person Workflow**
   - ✓ Step 0 → Step 1b → Step 3 navigation works (Step 2 skipped)
   - ✓ Manual form validates name, phone, email correctly
   - ✓ Episode created with guest_email and guest_phone stored
   - ✓ Approval button accessible with correct contact info
   - ✓ Approval link can be sent via email or WhatsApp

3. **Guest Approval**
   - ✓ Public approval page loads with valid token
   - ✓ Guest can review displayed information
   - ✓ Guest can approve (sets approved_by_guest=true)
   - ✓ Guest can request changes (sets approved_by_guest=false)
   - ✓ Expired tokens (30+ days) are rejected
   - ✓ Invalid tokens show error message

---

## Sign-Off

**Tester Name:** ___________________
**Test Date:** ___________________
**Overall Status:** ☐ PASS / ☐ FAIL

**Notes:**
