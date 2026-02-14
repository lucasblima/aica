# Relatório de Maturidade OAuth - AICA
## Google Cloud OAuth Verification Readiness Assessment

**Data:** 13 de Fevereiro de 2026
**Projeto:** AICA - Life OS
**URL de Produção:** https://aica.guru
**URL de Staging:** https://dev.aica.guru
**Status:** 🟢 85% Pronto (Pendente: video demo, email Hostinger, OAuth consent screen config)

---

## Sumário Executivo

A aplicação AICA está quase pronta para submissão de verificação OAuth do Google Cloud. As correções críticas foram implementadas:

- ✅ Escopos OAuth reduzidos ao mínimo (calendar.readonly + userinfo.email)
- ✅ Domínio próprio configurado (aica.guru) com SSL
- ✅ Privacy Policy atualizada com seção dedicada Google Calendar API
- ✅ Terms of Service atualizados com detalhes da integração
- ✅ Emails de contato unificados (contato@aica.guru)
- ⬜ Vídeo de demonstração (pendente)
- ⬜ Email Hostinger configurado (pendente)
- ⬜ OAuth Consent Screen atualizado no Google Cloud Console (pendente)

---

## Status Atual

### ✅ Concluído

| Item | Status | Detalhes |
|------|--------|---------|
| Escopos OAuth | ✅ | Apenas `calendar.readonly` + `userinfo.email` |
| Domínio próprio | ✅ | `aica.guru` (prod), `dev.aica.guru` (staging) |
| SSL/HTTPS | ✅ | Firebase Hosting + Cloud Run auto-provisioned |
| Privacy Policy | ✅ | Seção 5 dedicada Google Calendar API, data fixa, email correto |
| Terms of Service | ✅ | Seção 7 com detalhes Google Calendar, email correto |
| Link Google API User Data Policy | ✅ | Na Privacy Policy (seção 5.5 + Legal Framework) |
| Emails unificados no código | ✅ | `contato@aica.guru` em todas as páginas |
| Dead code removido | ✅ | Contacts scopes, googleContactsService, contactSyncService |

### ⬜ Pendente

| Item | Responsável | Esforço |
|------|-------------|---------|
| Configurar email `contato@aica.guru` | Manual (Hostinger) | 30min |
| Atualizar OAuth Consent Screen | Manual (Google Cloud Console) | 30min |
| Verificar domínio no Google Search Console | Manual | 30min |
| Gravar vídeo de demonstração | Manual (OBS/Loom) | 4-6h |
| Criar conta de teste | Manual | 1h |

---

## Configuração OAuth

### Escopos Solicitados (Mínimos)

```
https://www.googleapis.com/auth/calendar.readonly   ← Leitura de eventos
https://www.googleapis.com/auth/userinfo.email       ← Email do usuário
```

### Arquivo: `src/services/googleAuthService.ts`

```typescript
const ALL_GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
];
```

### Redirect URIs

- Production: `https://aica.guru/auth/callback`
- Staging: `https://dev.aica.guru/auth/callback`
- Supabase Auth Site URL: `https://aica.guru`

---

## Páginas Públicas

| Página | URL | Status |
|--------|-----|--------|
| Homepage | https://aica.guru | ✅ Acessível |
| Privacy Policy | https://aica.guru/privacy | ✅ Atualizada (14 seções) |
| Terms of Service | https://aica.guru/terms | ✅ Atualizado (16 seções) |

### Privacy Policy — Seções Google-Específicas

- **Seção 5**: Integração com Google Calendar API
  - 5.1: Escopos de acesso solicitados
  - 5.2: Dados acessados e uso
  - 5.3: Armazenamento de tokens
  - 5.4: Revogação de acesso
  - 5.5: Conformidade com Google API Services User Data Policy
- **Legal Framework**: Link para Google API Services User Data Policy
- **Contato**: contato@aica.guru

---

## OAuth Consent Screen (A CONFIGURAR)

```
App name: AICA - Life OS
Support email: contato@aica.guru
Homepage: https://aica.guru
Privacy Policy: https://aica.guru/privacy
Terms of Service: https://aica.guru/terms
Authorized domains: aica.guru
Logo: public/assets/images/logo-aica-blue.png
```

---

## Checklist Pre-Submissão

```
Infraestrutura:
  [x] Domínio próprio configurado (aica.guru)
  [x] SSL/HTTPS funcionando
  [ ] Domínio verificado no Google Search Console

Código:
  [x] Escopos OAuth são mínimos necessários (calendar.readonly + userinfo.email)
  [x] Tratamento de erros OAuth implementado
  [x] Dead code de escopos removido

Páginas Públicas:
  [x] Homepage acessível: https://aica.guru
  [x] Privacy Policy atualizada: https://aica.guru/privacy
  [x] Terms of Service atualizado: https://aica.guru/terms

Privacy Policy:
  [x] Seção Google Calendar API
  [x] Escopos listados e explicados
  [x] Link para Google User Data Policy
  [x] Data fixa de atualização
  [x] Email de contato correto

OAuth Consent Screen:
  [ ] Nome: AICA - Life OS
  [ ] Logo configurado
  [ ] URLs corretas (homepage, privacy, terms)
  [ ] Support email: contato@aica.guru
  [ ] Authorized domains: aica.guru

Email:
  [x] Código unificado com contato@aica.guru
  [ ] Email funcional configurado (Hostinger forwarding)

Video de Demonstração:
  [ ] Video gravado e editado
  [ ] YouTube "Não listado"
  [ ] Consent screen claramente visível

Credenciais de Teste:
  [ ] Conta de teste criada
  [ ] Dados de exemplo populados
```

---

## Referências

- [Sensitive Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies)
- [API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)
- [OAuth Consent Screen Configuration](https://developers.google.com/workspace/guides/configure-oauth-consent)

---

*Relatório atualizado: 13/02/2026*
