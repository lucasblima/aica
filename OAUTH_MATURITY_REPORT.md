# Relatório de Maturidade OAuth - AICA
## Google Cloud OAuth Verification Readiness Assessment

**Data:** 2 de Janeiro de 2026
**Projeto:** AICA - Life OS
**URL de Produção:** https://aica-5562559893.southamerica-east1.run.app
**Status:** 🟡 Parcialmente Pronto (Requer Ajustes)

---

## Sumário Executivo

A análise do projeto AICA identificou que a aplicação possui **boa estrutura base** para aprovação OAuth do Google Cloud, com páginas de privacidade e termos de uso já implementadas. No entanto, existem **gaps críticos** que precisam ser resolvidos antes da submissão para verificação, especialmente relacionados a:

1. **Escopos OAuth sensíveis/restritos** sendo solicitados
2. **Verificação de domínio** necessária
3. **Vídeo de demonstração** ausente
4. **Homepage pública** com descrição adequada

---

## 1. Análise de Páginas Públicas

### ✅ Elementos Existentes

| Recurso | Status | URL/Localização |
|---------|--------|-----------------|
| Landing Page | ✅ Existe | `/landing` |
| Política de Privacidade | ✅ Existe | `/privacy` |
| Termos de Serviço | ✅ Existe | `/terms` |
| Links no Footer | ✅ Existem | `MinimalFooter.tsx` |

### Detalhes da Landing Page (`/landing`)

**Arquivo:** `src/modules/onboarding/components/landing-v3/LandingPageV3.tsx`

**Conteúdo Presente:**
- **Título:** "Conheça a si mesmo"
- **Subtítulo:** "O sistema operacional para sua vida. Privado, tangível, transformador."
- **Features:** Fale, Reflita, Evolua
- **Meta description:** "Aica - Conheça a si mesmo através do sistema operacional para sua vida."
- **CTA:** "Começar Agora"

**Links no Footer:**
- ✅ Privacidade → `/privacy`
- ✅ Termos → `/terms`
- ⚠️ Contato → `mailto:hello@aica.app` (email diferente do usado na privacy policy)

---

## 2. Análise da Política de Privacidade

**Arquivo:** `src/pages/PrivacyPolicyPage.tsx`

### ✅ Requisitos Atendidos (LGPD + Google)

| Seção | Status | Notas |
|-------|--------|-------|
| Introdução | ✅ | Identifica responsável e propósito |
| Informações Coletadas | ✅ | Lista dados pessoais e automáticos |
| Como Usamos Dados | ✅ | 7 propósitos listados |
| IA e Processamento | ✅ | Menciona Google Gemini |
| Compartilhamento | ✅ | Provedores, integrações, legal |
| Segurança | ✅ | Criptografia, RLS, auditorias |
| Direitos LGPD | ✅ | 7 direitos listados |
| Retenção | ✅ | Política de exclusão |
| Cookies | ✅ | 3 tipos descritos |
| Menores | ✅ | 18+ requisito |
| Transferências Internacionais | ✅ | Mencionado |
| Alterações | ✅ | Processo de notificação |
| Contato | ✅ | contato@comtxae.com |

### ⚠️ Lacunas Identificadas

1. **Google OAuth/Calendar não é mencionado especificamente**
   - A política menciona "calendário" genericamente
   - Deveria detalhar que acessamos Google Calendar via OAuth

2. **Escopos específicos não são descritos**
   - Falta explicar quais permissões do Google são solicitadas
   - Usuário não sabe que solicitamos acesso de ESCRITA ao calendário

3. **Data dinâmica**
   - A data de atualização é gerada dinamicamente (`new Date()`)
   - Deveria ser uma data fixa para auditoria

---

## 3. Análise dos Escopos OAuth

**Arquivo:** `src/services/googleAuthService.ts:33-38`

### Escopos Solicitados

```javascript
const GOOGLE_CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar',         // ⚠️ SENSITIVE - Full access
    'https://www.googleapis.com/auth/calendar.events',  // ⚠️ SENSITIVE - Events management
    'https://www.googleapis.com/auth/calendar.readonly', // SENSITIVE - Read only
    'https://www.googleapis.com/auth/userinfo.email',   // Non-sensitive
];
```

### 🔴 Análise Crítica dos Escopos

| Escopo | Classificação | Necessidade Real | Recomendação |
|--------|---------------|------------------|--------------|
| `calendar` | **SENSITIVE** | Questionável | ❌ Remover - é redundante com `calendar.events` |
| `calendar.events` | **SENSITIVE** | Sim, se criar eventos | ⚠️ Justificar no vídeo |
| `calendar.readonly` | **SENSITIVE** | Sim | ✅ Manter |
| `userinfo.email` | Non-sensitive | Sim | ✅ Manter |

### Problemas Identificados

1. **Escopos Redundantes**
   - `calendar` já inclui `calendar.events` e `calendar.readonly`
   - Solicitar todos é desnecessário e levanta bandeiras vermelhas

2. **Princípio do Mínimo Privilégio Violado**
   - Se a app só precisa LER eventos, usar apenas `calendar.readonly`
   - Se precisa CRIAR eventos, usar `calendar.events` (não precisa do `calendar`)

3. **Documentação menciona diferente**
   - Em `docs/features/GOOGLE_CALENDAR_INTEGRATION.md:190-198` diz:
     > "Read-only access to calendar events"
     > "No write permissions (safe and minimal)"
   - Mas o código solicita ESCRITA!

---

## 4. Análise de Branding e Identidade

### ✅ Elementos de Marca Existentes

| Elemento | Status | Arquivo |
|----------|--------|---------|
| Nome | ✅ AICA | Consistente em todo projeto |
| Tagline | ✅ "Life OS" | index.html, landing |
| Favicon | ✅ Existe | `public/favicon.svg` (letra A em fundo indigo) |
| Logo Principal | ✅ Existe | `public/assets/images/logo-aica-blue.png` |
| Logo Alternativo | ✅ Existe | `public/assets/images/logo-aica-white.png` |

### Design do Logo

O logo principal (`logo-aica-blue.png`) apresenta:
- Três anéis entrelaçados (triquetra estilizada)
- Letra "A" central em branco
- Ramos de folhas verdes simbolizando crescimento
- Nome "Aica" abaixo em fonte serif
- Fundo azul (#4A5BC2 aproximado)

### ⚠️ Inconsistências de Marca

1. **Favicon vs Logo Principal**
   - Favicon: Simples "A" em fundo indigo (#6366f1)
   - Logo: Design elaborado com anéis e folhas
   - Cores diferentes entre os dois

2. **Emails de Contato Inconsistentes**
   - Footer: `hello@aica.app`
   - Privacy Policy: `contato@comtxae.com`
   - Nenhum é um domínio oficial verificável

---

## 5. Configurações de Produção

### Configuração OAuth (cloudbuild.yaml)

```yaml
_VITE_GOOGLE_OAUTH_CLIENT_ID: '5562559893-1ufv0knok8k4679kr35p7aqdhp55drg0.apps.googleusercontent.com'
_VITE_FRONTEND_URL: https://aica-5562559893.southamerica-east1.run.app
```

### Redirect URIs Configurados

De acordo com `docs/features/GOOGLE_CALENDAR_INTEGRATION.md`:
- Development: `http://localhost:5173`, `http://localhost:5174`
- Production: Domínio personalizado necessário

### ⚠️ Problemas de Domínio

1. **URL de Produção é Cloud Run genérico**
   - `aica-5562559893.southamerica-east1.run.app` não é um domínio próprio
   - Google pode rejeitar por não ser domínio verificável

2. **Domínios mencionados nos emails não correspondem**
   - `aica.app` (email no footer)
   - `comtxae.com` (email na privacy)
   - `*.run.app` (URL real)

---

## 6. Comparação com Requisitos Google OAuth Verification

### Requisitos para Escopos SENSITIVE

| Requisito | Status | Notas |
|-----------|--------|-------|
| Homepage acessível | ✅ | `/landing` funciona |
| Descrição clara do app | ⚠️ | Muito genérico, falta explicar uso do Calendar |
| Política de Privacidade | ⚠️ | Existe mas falta detalhes de Google OAuth |
| Privacy Policy no mesmo domínio | ✅ | Mesmo domínio |
| Link para Privacy na homepage | ⚠️ | No footer, não destacado |
| Verificação de domínio | ❌ | Cloud Run não é domínio próprio |
| Vídeo de demonstração | ❌ | Não existe |
| Justificativa de escopos | ❌ | Escopos redundantes |
| Princípio do mínimo | ❌ | Solicita mais do que necessário |

---

## 7. GAPs Identificados e Prioridade

### 🔴 CRÍTICOS (Bloqueiam Aprovação)

| # | Gap | Impacto | Esforço |
|---|-----|---------|---------|
| 1 | Escopos OAuth redundantes/excessivos | Alto | Baixo |
| 2 | Domínio não verificável (Cloud Run) | Alto | Médio |
| 3 | Vídeo de demonstração ausente | Alto | Médio |
| 4 | Privacy Policy não menciona Google Calendar/OAuth | Alto | Baixo |

### 🟡 IMPORTANTES (Podem Causar Rejeição)

| # | Gap | Impacto | Esforço |
|---|-----|---------|---------|
| 5 | Emails de contato inconsistentes | Médio | Baixo |
| 6 | Documentação desatualizada (diz readonly, código faz write) | Médio | Baixo |
| 7 | Data da Privacy Policy dinâmica | Baixo | Baixo |
| 8 | Descrição do app na landing muito genérica | Médio | Médio |

### 🟢 MELHORIAS RECOMENDADAS

| # | Gap | Impacto | Esforço |
|---|-----|---------|---------|
| 9 | Unificar favicon e logo | Baixo | Médio |
| 10 | Adicionar seção "Como usamos o Google Calendar" | Baixo | Baixo |
| 11 | Cookie consent banner | Baixo | Médio |

---

## 8. Plano de Ação Recomendado

### Fase 1: Correções Críticas (1-2 dias)

#### 1.1 Corrigir Escopos OAuth

**Arquivo:** `src/services/googleAuthService.ts`

```javascript
// ANTES (problemático)
const GOOGLE_CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
];

// DEPOIS (mínimo necessário)
// Se só precisa LER:
const GOOGLE_CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
];

// OU se precisa CRIAR eventos:
const GOOGLE_CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
];
```

#### 1.2 Atualizar Privacy Policy

Adicionar seção específica sobre Google Calendar:

```jsx
{/* Google Calendar Integration */}
<section>
  <h2>X. Integração com Google Calendar</h2>
  <p>
    A Aica oferece integração opcional com o Google Calendar.
    Quando você autoriza esta conexão, solicitamos as seguintes permissões:
  </p>
  <ul>
    <li><strong>Leitura de eventos:</strong> Para exibir seus compromissos na timeline da Aica</li>
    <li><strong>Email:</strong> Para identificar sua conta Google</li>
  </ul>
  <p>
    Seus dados do Google Calendar são processados de acordo com as
    <a href="https://developers.google.com/terms/api-services-user-data-policy">
      Políticas de Dados de Usuário do Google
    </a>.
  </p>
</section>
```

#### 1.3 Unificar Emails de Contato

Escolher UM email oficial e usar em todos os lugares:
- Footer: atualizar de `hello@aica.app` para o email oficial
- Privacy Policy: manter ou atualizar `contato@comtxae.com`

### Fase 2: Domínio e Infraestrutura (3-5 dias)

#### 2.1 Configurar Domínio Próprio

1. Registrar domínio (ex: `aica.app` ou `aica.com.br`)
2. Configurar Cloud Run Domain Mapping
3. Verificar domínio no Google Search Console
4. Atualizar URLs no Google Cloud Console

#### 2.2 Atualizar OAuth Consent Screen

No Google Cloud Console:
1. Application name: "AICA - Life OS"
2. Application home page: `https://aica.app` (domínio próprio)
3. Privacy policy link: `https://aica.app/privacy`
4. Terms of service link: `https://aica.app/terms`
5. Authorized domains: `aica.app`

### Fase 3: Vídeo de Demonstração (2-3 dias)

#### 3.1 Criar Vídeo de Demonstração

Requisitos do Google:
- Mostrar fluxo completo de autorização OAuth
- Demonstrar uso REAL dos escopos solicitados
- Duração: 2-5 minutos
- Upload no YouTube como "Não listado"

**Roteiro Sugerido:**

1. **Intro (30s)**
   - "Este vídeo demonstra como a AICA utiliza a integração com Google Calendar"

2. **Fluxo de Autorização (1min)**
   - Mostrar botão "Conectar Google Calendar"
   - Popup de consentimento do Google
   - Escopos sendo solicitados
   - Aceite do usuário

3. **Uso dos Dados (2min)**
   - Eventos do calendário aparecendo na timeline
   - Como os dados são exibidos
   - Benefício para o usuário

4. **Desconexão (30s)**
   - Como revogar acesso
   - O que acontece com os dados

### Fase 4: Submissão (1 dia)

1. Verificar todos os requisitos
2. Preencher formulário de verificação
3. Anexar link do vídeo
4. Aguardar revisão (3-5 dias úteis)

---

## 9. Checklist Final para Submissão

### Antes de Submeter

- [ ] Escopos OAuth são o MÍNIMO necessário
- [ ] Domínio próprio configurado e verificado
- [ ] Privacy Policy atualizada com seção Google Calendar
- [ ] Privacy Policy com data FIXA (não dinâmica)
- [ ] Emails de contato consistentes
- [ ] Landing page com descrição clara do uso de Calendar
- [ ] Vídeo de demonstração no YouTube (não listado)
- [ ] OAuth Consent Screen configurado corretamente
- [ ] Todos os redirect URIs atualizados
- [ ] Documentação interna atualizada

### Informações para Formulário Google

| Campo | Valor |
|-------|-------|
| App Name | AICA - Life OS |
| App Type | Web Application |
| User Type | External |
| Homepage | https://[seu-dominio]/landing |
| Privacy Policy | https://[seu-dominio]/privacy |
| Terms of Service | https://[seu-dominio]/terms |
| Scopes | calendar.readonly, userinfo.email |
| Video URL | [YouTube URL] |

---

## 10. Conclusão

O projeto AICA está **70% pronto** para aprovação OAuth do Google Cloud. As principais ações necessárias são:

1. **Imediato:** Reduzir escopos OAuth para o mínimo necessário
2. **Curto prazo:** Atualizar Privacy Policy com detalhes de Google Calendar
3. **Médio prazo:** Configurar domínio próprio verificável
4. **Antes de submeter:** Criar vídeo de demonstração

Estimativa total: **7-10 dias** para estar pronto para submissão.

---

## Referências

- [Sensitive Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies)
- [Verification Requirements](https://support.google.com/cloud/answer/13464321)
- [OAuth App Verification Help](https://support.google.com/cloud/answer/13463073)
- [Configure OAuth Consent Screen](https://developers.google.com/workspace/guides/configure-oauth-consent)

---

*Relatório gerado por análise automatizada em 02/01/2026*
