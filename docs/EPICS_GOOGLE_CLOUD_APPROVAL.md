# Epicos para Aprovacao Google Cloud OAuth + Beta Launch

## Visao Geral do Projeto

**Objetivo:** Preparar a plataforma AICA para lancamento beta publico, incluindo aprovacao Google OAuth para escopos sensiveis (Google Calendar API).

**Status Atual:** 🟡 55% Pronto
**Meta:** 🟢 100% Pronto para Beta Launch
**Ultima Atualizacao:** 2026-02-13

### Infraestrutura Atual (Configurada)

| Servico | Dominio | Regiao | Status |
|---------|---------|--------|--------|
| `aica` (prod) | https://aica.guru | southamerica-east1 | ✅ Ativo |
| `aica-dev` (staging) | https://dev.aica.guru | us-central1 | ✅ Ativo |
| `aica-agents` (backend) | — | southamerica-east1 | ✅ Ativo |
| Firebase Hosting | aica-guru.web.app → aica.guru | Edge CDN | ✅ Ativo |
| Supabase | uzywajqzbdbrfammshdg.supabase.co | — | ✅ Ativo |

### Diagrama de Dependencias

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE DEPENDENCIAS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   ┌──────────────┐     ┌──────────────┐                                   │
│   │   EPICO 1    │     │   EPICO 2    │                                   │
│   │   Escopos    │     │   Dominio    │                                   │
│   │   OAuth      │     │   Proprio    │                                   │
│   │   ✅ FEITO   │     │   ✅ FEITO   │                                   │
│   └──────┬───────┘     └──────┬───────┘                                   │
│          │                    │                                            │
│          │    ┌───────────────┘                                            │
│          │    │                                                            │
│          ▼    ▼                                                            │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐             │
│   │   EPICO 3    │     │   EPICO 5    │     │   EPICO 4    │             │
│   │   Privacy    │◄────│   Branding   │     │    Video     │             │
│   │   Policy     │     │   Contato    │     │    Demo      │             │
│   │   ⬜ Pendente │     │   🔄 Parcial │     │   ⬜ Pendente │             │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘             │
│          │                    │                    │                      │
│          └────────────────────┼────────────────────┘                      │
│                               │                                            │
│                               ▼                                            │
│                        ┌──────────────┐                                   │
│                        │   EPICO 6    │                                   │
│                        │  Submissao   │                                   │
│                        │   Final      │                                   │
│                        │   ⬜ Pendente │                                   │
│                        └──────────────┘                                   │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Legenda de Status

| Simbolo | Significado |
|---------|-------------|
| ⬜ | Nao iniciado |
| 🔄 | Em progresso |
| ✅ | Concluido |
| 🚫 | Bloqueado |

---

## EPICO 1: Correcao de Escopos OAuth ✅ CONCLUIDO

### Informacoes Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | ✅ CONCLUIDO |
| **Data Conclusao** | 2026-02-13 |

### O que foi feito

Removidos 2 escopos desnecessarios (`contacts.readonly`, `contacts.other.readonly`) que eram solicitados mas nunca usados. `googleContactsService.ts` e `contactSyncService.ts` sao dead code — nunca importados.

### Tarefas

- [x] **1.1** Analisar requisitos de escopo — apenas `calendar.readonly` e `userinfo.email` sao usados
- [x] **1.2** Atualizar `src/services/googleAuthService.ts` — removidos `GOOGLE_CONTACTS_SCOPES`, `ALL_GOOGLE_SCOPES` agora tem apenas 2 escopos
- [x] **1.3** Atualizar documentacao `docs/features/GOOGLE_CALENDAR_INTEGRATION.md` — corrigido storage (DB, nao localStorage), scopes atualizados
- [ ] **1.4** Testar fluxo OAuth com novos escopos em dev.aica.guru (precisa deploy staging)

### Escopos Finais

```
https://www.googleapis.com/auth/calendar.readonly   ← Leitura de eventos
https://www.googleapis.com/auth/userinfo.email       ← Email do usuario
```

### Dead Code Identificado (nao removido — baixa prioridade)

| Arquivo | Status |
|---------|--------|
| `src/services/googleContactsService.ts` | Dead code — nunca importado |
| `src/services/contactSyncService.ts` | Dead code — nunca importado |

---

## EPICO 2: Configuracao de Dominio Proprio ✅ CONCLUIDO

### Informacoes Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | ✅ CONCLUIDO |
| **Data Conclusao** | 2026-02-11 |

### O que foi feito

- [x] Dominio `aica.guru` registrado na Hostinger
- [x] DNS configurado (A record, CNAMEs para dev e www)
- [x] Firebase Hosting como edge proxy para producao (aica.guru → Cloud Run SP)
- [x] Cloud Run domain mapping para dev (dev.aica.guru → aica-dev Iowa)
- [x] SSL/HTTPS provisionado automaticamente (Firebase + Cloud Run)
- [x] OAuth redirect URIs atualizados: `https://aica.guru/auth/callback`, `https://dev.aica.guru/auth/callback`
- [x] Supabase Auth Site URL atualizado para `https://aica.guru`
- [x] CORS em 10 Edge Functions atualizado com ambos dominios
- [x] `cloudbuild.yaml` atualizado com Step 4 (Firebase deploy automatico em prod)
- [x] Cloud Build SA com `roles/firebase.admin`

### Verificacao Search Console (PENDENTE)

- [ ] **2.1** Verificar dominio no Google Search Console (DNS TXT record)
- [ ] **2.2** Confirmar verificacao aprovada

---

## EPICO 3: Atualizacao da Politica de Privacidade

### Informacoes Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | 🔴 ALTA |
| **Esforco Estimado** | 2-4 horas |
| **Status** | ⬜ Nao iniciado |
| **Dependencias** | EPICO 1 (escopos definidos) |

### Descricao

A politica de privacidade (`src/pages/PrivacyPolicyPage.tsx`) nao menciona a integracao com Google Calendar API, escopos OAuth, ou conformidade com Google API Services User Data Policy.

### Tarefas

- [ ] **3.1** Adicionar secao Google Calendar API — escopos, uso de dados, armazenamento, revogacao
- [ ] **3.2** Corrigir data de atualizacao (trocar data dinamica por fixa)
- [ ] **3.3** Adicionar link para Google API Services User Data Policy
- [ ] **3.4** Atualizar email de contato para `contato@aica.guru`
- [ ] **3.5** Verificar conformidade LGPD

### Arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/PrivacyPolicyPage.tsx` | Adicionar secao Google Calendar |
| `src/pages/TermsOfServicePage.tsx` | Verificar mencoes a Google |

---

## EPICO 4: Criacao do Video de Demonstracao

### Informacoes Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | 🔴 ALTA - BLOQUEANTE |
| **Esforco Estimado** | 4-6 horas |
| **Status** | ⬜ Nao iniciado |
| **Dependencias** | EPICO 1, EPICO 2 ✅ |

### Descricao

Google requer video de demonstracao para verificacao de escopos sensiveis. Deve mostrar fluxo OAuth completo, consent screen, e uso real dos dados.

### Tarefas

- [ ] **4.1** Preparar ambiente de demonstracao em aica.guru
- [ ] **4.2** Criar roteiro do video (3-5 min) — intro, fluxo OAuth, consent screen, uso real, desconexao
- [ ] **4.3** Gravar video em 1080p+ com OBS/Loom
- [ ] **4.4** Editar — zoom na consent screen, legendas, logo AICA
- [ ] **4.5** Upload no YouTube como "Nao listado"

### Configuracoes do YouTube

```
Titulo: AICA - Google Calendar Integration OAuth Demo
Descricao:
  Demonstracao do fluxo OAuth para integracao
  com Google Calendar na plataforma AICA.

  Website: https://aica.guru
  Privacy Policy: https://aica.guru/privacy

  Escopos: calendar.readonly, userinfo.email

Visibilidade: NAO LISTADO
```

---

## EPICO 5: Consistencia de Branding e Contato

### Informacoes Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | 🟡 MEDIA |
| **Esforco Estimado** | 2-3 horas |
| **Status** | 🔄 Parcial (dominio configurado, emails pendentes) |
| **Dependencias** | EPICO 2 ✅ |

### Descricao

Emails de contato inconsistentes entre footer, privacy policy, e OAuth consent screen. Agora que temos dominio proprio, unificar tudo com `@aica.guru`.

### Tarefas

- [ ] **5.1** Configurar email `contato@aica.guru` (Hostinger email forwarding ou Google Workspace)
- [ ] **5.2** Atualizar footer — `src/modules/onboarding/components/landing-v2/MinimalFooter.tsx` → `contato@aica.guru`
- [ ] **5.3** Atualizar Privacy Policy — `src/pages/PrivacyPolicyPage.tsx` → `contato@aica.guru`
- [ ] **5.4** Atualizar Terms of Service — `src/pages/TermsOfServicePage.tsx`
- [ ] **5.5** Atualizar OAuth Consent Screen no Google Cloud Console (support email, home page, privacy policy URL, terms URL)
- [ ] **5.6** Verificar logo no OAuth consent screen

### URLs para OAuth Consent Screen

```
App name: AICA - Life OS
Support email: contato@aica.guru
Homepage: https://aica.guru
Privacy Policy: https://aica.guru/privacy
Terms of Service: https://aica.guru/terms
Authorized domains: aica.guru
```

### Arquivos

| Arquivo | Acao |
|---------|------|
| `src/modules/onboarding/components/landing-v2/MinimalFooter.tsx` | Email → contato@aica.guru |
| `src/pages/PrivacyPolicyPage.tsx` | Email → contato@aica.guru |
| `src/pages/TermsOfServicePage.tsx` | Verificar/atualizar email |

---

## EPICO 6: Preparacao e Submissao Final

### Informacoes Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | 🟡 MEDIA |
| **Esforco Estimado** | 2-4 horas |
| **Status** | ⬜ Nao iniciado |
| **Dependencias** | TODOS os epicos anteriores |

### Tarefas

- [ ] **6.1** Criar conta de teste (`google-review@aica.guru`) com dados de exemplo
- [ ] **6.2** Escrever justificativas detalhadas para cada escopo OAuth
- [ ] **6.3** Verificar dominio no Google Search Console
- [ ] **6.4** Compilar documentacao de suporte (screenshots, links)
- [ ] **6.5** Preencher formulario de verificacao no Google Cloud Console
- [ ] **6.6** Revisao final — executar checklist pre-submissao
- [ ] **6.7** Submeter para verificacao

### Checklist Pre-Submissao

```
Infraestrutura:
  [x] Dominio proprio configurado (aica.guru)
  [x] SSL/HTTPS funcionando
  [ ] Dominio verificado no Google Search Console

Codigo:
  [x] Escopos OAuth sao minimos necessarios (calendar.readonly + userinfo.email)
  [x] Tratamento de erros OAuth implementado

Paginas Publicas:
  [x] Homepage acessivel: https://aica.guru
  [ ] Privacy Policy atualizada: https://aica.guru/privacy
  [ ] Terms of Service atualizado: https://aica.guru/terms

Privacy Policy:
  [ ] Secao Google Calendar API
  [ ] Escopos listados e explicados
  [ ] Link para Google User Data Policy
  [ ] Data fixa de atualizacao
  [ ] Email de contato correto

OAuth Consent Screen:
  [ ] Nome: AICA - Life OS
  [ ] Logo configurado
  [ ] URLs corretas (homepage, privacy, terms)
  [ ] Support email: contato@aica.guru
  [ ] Authorized domains: aica.guru

Video de Demonstracao:
  [ ] Video gravado e editado
  [ ] YouTube "Nao listado"
  [ ] Consent screen claramente visivel

Credenciais de Teste:
  [ ] Conta de teste criada
  [ ] Dados de exemplo populados
```

---

## Timeline Estimado

```
Semana 1 (Sprint atual):
├── EPICO 1: Correcao de Escopos OAuth (4-6h)
├── EPICO 3: Privacy Policy (2-4h)
└── EPICO 5: Branding/Email (2-3h)

Semana 2:
├── EPICO 4: Video Demo (4-6h)
├── EPICO 6: Submissao (2-4h)
└── Aguardar revisao Google (3-5 dias uteis)
```

---

## Recursos Uteis

### Documentacao Google
- [Sensitive Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies)
- [API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)
- [OAuth Consent Screen Configuration](https://developers.google.com/workspace/guides/configure-oauth-consent)

### Ferramentas
- [Google Search Console](https://search.google.com/search-console)
- [Google Cloud Console](https://console.cloud.google.com)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)
- [YouTube Studio](https://studio.youtube.com)

---

*Documento criado: 02/01/2026*
*Ultima atualizacao: 11/02/2026*
