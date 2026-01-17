# Google OAuth Verification Checklist - AICA Life OS

Checklist completo para aprovacao OAuth do Google Cloud para o projeto AICA Life OS.

**Ultima atualizacao:** 2026-01-16
**Projeto:** AICA Life OS
**Ambiente:** Staging (southamerica-east1)

---

## Sumario

1. [Domain Verification](#1-domain-verification)
2. [Required Pages](#2-required-pages)
3. [Privacy Policy Requirements](#3-privacy-policy-requirements)
4. [OAuth Consent Screen](#4-oauth-consent-screen)
5. [Scope Justification](#5-scope-justification)
6. [Demo Video Guide](#6-demo-video-guide)
7. [AICA-Specific Configuration](#7-aica-specific-configuration)
8. [Submission Checklist](#8-submission-checklist)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Domain Verification

### Pre-requisitos de Dominio

- [ ] Dominio proprio registrado (NAO usar *.run.app, *.vercel.app, etc.)
- [ ] SSL/HTTPS configurado e valido
- [ ] Dominio verificado no Google Search Console
- [ ] DNS propagado completamente (pode levar ate 48h)

### Passos para Verificacao no Search Console

1. Acessar: https://search.google.com/search-console
2. Clicar em "Adicionar propriedade" > "Dominio"
3. Adicionar registro TXT no DNS:

```dns
Tipo: TXT
Nome: @ (raiz)
Valor: google-site-verification=CODIGO_FORNECIDO
TTL: 3600
```

4. Aguardar verificacao (ate 48h para propagacao DNS)
5. Confirmar status "Verificado" no Search Console

### Validacao

- [ ] Acessar https://search.google.com/search-console
- [ ] Confirmar que o dominio aparece como "Verificado"
- [ ] Testar acesso HTTPS no dominio (sem erros de certificado)

---

## 2. Required Pages

### Paginas Obrigatorias

| Pagina | URL Padrao | Status |
|--------|------------|--------|
| Homepage | `https://[dominio]/` ou `/landing` | [ ] Criada |
| Privacy Policy | `https://[dominio]/privacy` | [ ] Criada |
| Terms of Service | `https://[dominio]/terms` | [ ] Criada |

### Requisitos das Paginas

- [ ] Homepage publica e acessivel (sem login necessario)
- [ ] Privacy Policy no MESMO dominio da aplicacao
- [ ] Terms of Service no MESMO dominio da aplicacao
- [ ] Links funcionais entre todas as paginas
- [ ] Navegacao clara para encontrar Privacy e Terms
- [ ] Paginas respondem em menos de 3 segundos
- [ ] Nenhuma pagina retorna erro 404 ou 500

### Conteudo Minimo

**Homepage:**
- [ ] Nome do aplicativo
- [ ] Descricao do proposito
- [ ] Link para Privacy Policy no footer
- [ ] Link para Terms of Service no footer

**Privacy Policy:**
- [ ] Data de ultima atualizacao
- [ ] Email de contato
- [ ] Secao sobre Google APIs (ver secao 3)

**Terms of Service:**
- [ ] Data de ultima atualizacao
- [ ] Email de contato
- [ ] Termos de uso claros

---

## 3. Privacy Policy Requirements

### Secoes Obrigatorias para OAuth

- [ ] Secao especifica sobre integracao com Google APIs
- [ ] Lista de TODOS os escopos OAuth solicitados
- [ ] Explicacao de USO para cada escopo
- [ ] Como dados sao armazenados
- [ ] Como dados sao compartilhados (ou que NAO sao compartilhados)
- [ ] Instrucoes de como revogar acesso
- [ ] Link para Google API Services User Data Policy

### Template de Secao Google Calendar

```html
<section id="google-calendar-integration">
  <h2>Integracao com Google Calendar</h2>

  <h3>Permissoes Solicitadas</h3>
  <ul>
    <li>
      <strong>calendar.readonly</strong>: Permite leitura dos seus eventos de calendario.
      Usamos para sincronizar seus compromissos com o AICA Life OS.
    </li>
    <li>
      <strong>userinfo.email</strong>: Permite identificar sua conta Google.
      Usamos para associar a integracao ao seu perfil.
    </li>
  </ul>

  <h3>Como Usamos Seus Dados</h3>
  <p>
    Os dados do seu Google Calendar sao usados exclusivamente para:
  </p>
  <ul>
    <li>Exibir seus eventos na interface do AICA Life OS</li>
    <li>Sincronizar compromissos com o sistema de tarefas</li>
    <li>Gerar insights sobre sua rotina</li>
  </ul>

  <h3>Armazenamento de Dados</h3>
  <p>
    Tokens de acesso sao armazenados de forma segura no Supabase,
    criptografados em repouso. Dados de eventos sao processados
    em tempo real e nao sao armazenados permanentemente.
  </p>

  <h3>Compartilhamento de Dados</h3>
  <p>
    <strong>NAO compartilhamos</strong> seus dados do Google com terceiros.
    Seus dados sao usados exclusivamente para funcionalidades do AICA Life OS.
  </p>

  <h3>Como Revogar Acesso</h3>
  <p>Voce pode revogar o acesso a qualquer momento:</p>
  <ol>
    <li>Nas configuracoes do AICA Life OS, clique em "Desconectar Google"</li>
    <li>Ou acesse diretamente:
      <a href="https://myaccount.google.com/permissions">
        Permissoes da Conta Google
      </a>
    </li>
  </ol>

  <h3>Conformidade</h3>
  <p>
    O AICA Life OS esta em conformidade com a
    <a href="https://developers.google.com/terms/api-services-user-data-policy">
      Google API Services User Data Policy
    </a>
    , incluindo os requisitos de Limited Use.
  </p>
</section>
```

### Checklist de Conformidade

- [ ] Privacy Policy menciona "Google Calendar" explicitamente
- [ ] Cada escopo tem explicacao de uso
- [ ] Instrucoes claras para revogacao
- [ ] Link funcional para Google API Services User Data Policy
- [ ] Data de atualizacao visivel
- [ ] Email de contato valido

---

## 4. OAuth Consent Screen

### Configuracao no Google Cloud Console

Acessar: https://console.cloud.google.com/apis/credentials/consent

### Informacoes Basicas

- [ ] **App name**: AICA Life OS
- [ ] **User support email**: [seu-email@dominio.com]
- [ ] **App logo**: PNG 120x120px (sem transparencia)
- [ ] **App homepage**: https://[dominio]/
- [ ] **App privacy policy**: https://[dominio]/privacy
- [ ] **App terms of service**: https://[dominio]/terms

### Dominios Autorizados

- [ ] Dominio principal adicionado (ex: aicalifeos.com)
- [ ] Subdominio staging, se aplicavel
- [ ] NENHUM dominio *.run.app, *.vercel.app

### Escopos Configurados

Para AICA Life OS (funcionalidade atual):

| Escopo | Tipo | Adicionado |
|--------|------|------------|
| `openid` | Non-sensitive | [ ] |
| `userinfo.email` | Non-sensitive | [ ] |
| `userinfo.profile` | Non-sensitive | [ ] |
| `calendar.readonly` | Sensitive | [ ] |

> **IMPORTANTE**: Apenas adicione escopos que o codigo REALMENTE utiliza.
> Escopos nao utilizados causam rejeicao.

### Usuarios de Teste (Modo Testing)

- [ ] Adicionar emails de teste
- [ ] Maximo 100 usuarios em modo teste
- [ ] Documentar usuarios de teste para submissao

---

## 5. Scope Justification

### Escopos Atuais do AICA Life OS

Baseado em analise do codigo em:
- `src/services/googleAuthService.ts`
- `src/hooks/useGoogleAuth.ts`

#### Escopo: `calendar.readonly`

**Status**: Sensitive (requer verificacao)

**Justificativa:**

```markdown
## Justificativa para calendar.readonly

### Por que precisamos deste escopo
O AICA Life OS sincroniza eventos do Google Calendar para:
1. Exibir compromissos na agenda integrada
2. Considerar eventos ao sugerir horarios para tarefas
3. Gerar insights sobre rotina e disponibilidade

### Como usamos os dados
- Leitura de eventos do calendario principal
- Exibicao de compromissos na interface
- Analise de padroes para sugestoes de produtividade

### Por que nao usamos escopo menor
- `calendar.readonly` e o escopo mais restritivo que permite leitura de eventos
- Nao existem escopos mais granulares para leitura de calendario

### Conformidade
Nosso uso esta em conformidade com a Google API Services User Data Policy:
- Limited Use: Dados usados apenas para funcionalidade descrita
- Secure handling: Tokens armazenados com criptografia
- Appropriate access: Acesso apenas quando usuario inicia sincronizacao
```

#### Escopo: `userinfo.email`

**Status**: Non-sensitive

**Justificativa:**

```markdown
## Justificativa para userinfo.email

### Por que precisamos deste escopo
Identificacao da conta Google conectada para:
1. Associar tokens ao usuario correto
2. Exibir email da conta conectada nas configuracoes
3. Permitir gerenciamento de multiplas contas

### Como usamos os dados
- Armazenamento seguro do email associado aos tokens
- Exibicao nas configuracoes da integracao

### Conformidade
Escopo nao-sensitivo, usado conforme diretrizes padrao.
```

### Escopos a REMOVER (se presentes no codigo legado)

| Escopo | Motivo para Remover |
|--------|---------------------|
| `calendar` (full) | Redundante com calendar.readonly |
| `calendar.events` | Nao utilizado (so lemos eventos) |
| `contacts.readonly` | Feature nao implementada |
| `contacts.other.readonly` | Feature nao implementada |

### Validacao de Escopos no Codigo

Executar para verificar uso real:

```bash
# Verificar onde escopos sao definidos
grep -rn "googleapis.com/auth" src/

# Verificar se CRIA eventos (justificaria calendar.events)
grep -rn "createEvent\|insertEvent\|events.insert" src/

# Se nao ha criacao de eventos, remover calendar.events
```

---

## 6. Demo Video Guide

### Especificacoes Tecnicas

| Requisito | Valor |
|-----------|-------|
| Duracao | 3-5 minutos |
| Resolucao | Minimo 1080p (1920x1080) |
| Formato | MP4 (H.264) |
| Hospedagem | YouTube (Nao Listado) |
| Audio | Narracao clara em ingles ou portugues |

### Estrutura do Video

#### Intro (0:00 - 0:30)

```
"This video demonstrates how AICA Life OS integrates with
Google Calendar to help users manage their productivity.

AICA Life OS is a personal operating system that combines
task management, calendar sync, and AI-powered insights."
```

#### Fluxo de Autorizacao (0:30 - 2:00)

**Acoes a demonstrar:**
1. Usuario na pagina de configuracoes
2. Clique no botao "Conectar Google Calendar"
3. Popup de consentimento do Google aparece
4. **PAUSAR e destacar os escopos solicitados:**
   - "View your calendars" (calendar.readonly)
   - "See your email address" (userinfo.email)
5. Usuario clica em "Permitir"
6. Redirect de volta para AICA Life OS
7. Mensagem de sucesso

**Narracao sugerida:**
```
"When the user clicks 'Connect Google Calendar', they are
redirected to Google's consent screen.

Here you can see the permissions we request:
- 'View your calendars' allows us to read calendar events
- 'See your email address' identifies the connected account

After granting permission, the user returns to AICA Life OS
with the integration active."
```

#### Uso dos Dados (2:00 - 3:30)

**Acoes a demonstrar:**
1. Mostrar eventos do Google Calendar na interface
2. Demonstrar como eventos aparecem na agenda
3. Mostrar sincronizacao funcionando
4. Destacar beneficio para o usuario

**Narracao sugerida:**
```
"Now we can see how AICA Life OS uses the calendar data.

Events from Google Calendar appear in the unified agenda,
allowing users to view all their commitments in one place.

The system uses this information to suggest optimal times
for tasks and provide productivity insights."
```

#### Desconexao (3:30 - 4:15)

**Acoes a demonstrar:**
1. Ir para configuracoes
2. Mostrar opcao "Desconectar Google Calendar"
3. Clicar e confirmar desconexao
4. Mostrar que dados foram removidos

**Narracao sugerida:**
```
"Users can revoke access at any time through the settings.

Clicking 'Disconnect Google Calendar' removes all stored
tokens and stops the synchronization.

Users can also revoke access through their Google Account
permissions page."
```

#### Encerramento (4:15 - 4:45)

```
"AICA Life OS follows Google's API Services User Data Policy
and only accesses the minimum data necessary for functionality.

Thank you for reviewing our integration."
```

### Checklist do Video

- [ ] Video tem entre 3-5 minutos
- [ ] Resolucao minima 1080p
- [ ] Consent screen visivel e pausado
- [ ] Escopos claramente mostrados
- [ ] Demonstra uso REAL dos dados
- [ ] Mostra como revogar acesso
- [ ] Audio claro e audivel
- [ ] Hospedado no YouTube (Nao Listado)

---

## 7. AICA-Specific Configuration

### URLs do Ambiente Staging

| Componente | URL |
|------------|-----|
| Frontend | https://aica-staging-5p22u2w6jq-rj.a.run.app |
| Supabase | https://uzywajqzbdbrfammshdg.supabase.co |
| Region | southamerica-east1 (Sao Paulo) |

### Variaveis de Ambiente

```env
# Google OAuth
VITE_GOOGLE_OAUTH_CLIENT_ID=[client-id-do-google-cloud]

# URLs (atuais - precisam ser substituidas por dominio proprio)
VITE_FRONTEND_URL=https://aica-staging-5p22u2w6jq-rj.a.run.app

# Supabase
VITE_SUPABASE_URL=https://uzywajqzbdbrfammshdg.supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

### Redirect URIs Autorizados

Configurar no Google Cloud Console > Credentials > OAuth 2.0 Client IDs:

```
# Producao (dominio proprio - OBRIGATORIO para verificacao)
https://aicalifeos.com/auth/callback
https://aicalifeos.com/

# Staging (temporario - NAO sera aceito para verificacao)
https://aica-staging-5p22u2w6jq-rj.a.run.app/auth/callback
https://aica-staging-5p22u2w6jq-rj.a.run.app/
```

### Arquivos Relevantes

| Arquivo | Descricao |
|---------|-----------|
| `src/services/googleAuthService.ts` | Servico principal de autenticacao Google |
| `src/hooks/useGoogleAuth.ts` | Hook React para autenticacao |
| `src/services/googleCalendarService.ts` | Servico de sincronizacao Calendar |
| `src/services/googleCalendarTokenService.ts` | Gerenciamento de tokens |
| `src/views/AgendaView.tsx` | View que usa a integracao |

### Escopos Atualmente Configurados

Encontrados em `src/services/googleAuthService.ts`:

```typescript
// Escopos minimos (RECOMENDADO)
const GOOGLE_SCOPES_MINIMAL = [
  'https://www.googleapis.com/auth/calendar.readonly', // Read calendar events
  'https://www.googleapis.com/auth/userinfo.email',    // Get user email
];

// Escopos extras para contatos (NAO USAR ate feature implementada)
const GOOGLE_SCOPES_CONTACTS = [
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/contacts.other.readonly',
];
```

### Acoes Pendentes para AICA

- [ ] Adquirir dominio proprio (aicalifeos.com ou similar)
- [ ] Configurar DNS e SSL para dominio proprio
- [ ] Criar paginas /privacy e /terms no dominio proprio
- [ ] Migrar OAuth para usar dominio proprio
- [ ] Remover escopos nao utilizados do codigo
- [ ] Verificar dominio no Google Search Console
- [ ] Atualizar redirect URIs no Google Cloud Console

---

## 8. Submission Checklist

### Dados para Formulario de Verificacao

```yaml
App Information:
  App name: AICA Life OS
  User support email: suporte@aicalifeos.com
  App logo: [Upload PNG 120x120px]

App Domain:
  Homepage: https://aicalifeos.com/
  Privacy Policy: https://aicalifeos.com/privacy
  Terms of Service: https://aicalifeos.com/terms

Authorized Domains:
  - aicalifeos.com

Scopes:
  Non-sensitive:
    - openid
    - userinfo.email
    - userinfo.profile
  Sensitive:
    - calendar.readonly

Sensitive Scope Justification:
  calendar.readonly: |
    AICA Life OS synchronizes Google Calendar events to provide
    an integrated productivity experience. We read events to:
    1. Display appointments in the unified agenda
    2. Suggest optimal times for tasks
    3. Generate productivity insights

    We use calendar.readonly (not calendar) because we only need
    read access - we do not create or modify events.

Demo Video:
  URL: https://youtu.be/[VIDEO_ID]
  Duration: 4 minutes
  Language: English

Test Credentials (if needed):
  Email: test@aicalifeos.com
  Password: [senha-de-teste]
  Instructions: |
    1. Login with provided credentials
    2. Go to Settings > Integrations
    3. Click "Connect Google Calendar"
    4. Follow OAuth flow
```

### Checklist Final

#### Infraestrutura

- [ ] Dominio proprio configurado e funcionando
- [ ] SSL valido (sem erros de certificado)
- [ ] Dominio verificado no Google Search Console
- [ ] DNS completamente propagado

#### Codigo

- [ ] Apenas escopos realmente utilizados
- [ ] Sem escopos redundantes (ex: calendar + calendar.readonly)
- [ ] Tratamento de erros OAuth implementado
- [ ] Revogacao de tokens funcionando
- [ ] Tokens armazenados de forma segura

#### Documentacao

- [ ] Privacy Policy com secao Google APIs
- [ ] Todos escopos documentados na Privacy Policy
- [ ] Data de atualizacao visivel
- [ ] Email de contato correto e funcional
- [ ] Terms of Service atualizado

#### OAuth Consent Screen

- [ ] Nome do app correto
- [ ] Logo configurado (120x120px PNG)
- [ ] URLs de homepage, privacy e terms corretas
- [ ] Dominios autorizados listados
- [ ] Escopos corretos adicionados

#### Video

- [ ] Duracao entre 3-5 minutos
- [ ] Resolucao minima 1080p
- [ ] Mostra consent screen com pausa
- [ ] Demonstra uso real dos dados
- [ ] Mostra como revogar acesso
- [ ] Hospedado no YouTube (Nao Listado)

#### Justificativas

- [ ] Uma justificativa por escopo sensitive
- [ ] Justificativas claras e objetivas
- [ ] Demonstram necessidade real
- [ ] Mencionam conformidade com Google policies

---

## 9. Troubleshooting

### Problemas Comuns de Rejeicao

#### "Domain not verified"

**Causa:** Dominio nao verificado no Google Search Console ou usando dominio temporario.

**Solucao:**
1. Adquirir dominio proprio
2. Adicionar registro TXT de verificacao
3. Aguardar propagacao DNS (ate 48h)
4. Confirmar verificacao no Search Console

#### "Privacy policy doesn't disclose data usage"

**Causa:** Privacy Policy incompleta ou sem secao sobre Google APIs.

**Solucao:**
1. Adicionar secao especifica sobre integracao Google
2. Listar todos os escopos OAuth
3. Explicar uso de cada escopo
4. Adicionar instrucoes de revogacao
5. Incluir link para Google API Services User Data Policy

#### "Scopes not justified"

**Causa:** Escopos solicitados que nao sao demonstrados no uso real.

**Solucao:**
1. Demonstrar uso REAL no video
2. Remover escopos nao utilizados
3. Escrever justificativa detalhada para cada escopo
4. Verificar que codigo realmente usa os escopos

#### "Video doesn't show consent screen"

**Causa:** Video nao mostra claramente a tela de consentimento.

**Solucao:**
1. Gravar novo video com pausa na consent screen
2. Garantir que escopos sao visiveis
3. Usar resolucao alta (1080p minimo)
4. Narrar quais permissoes estao sendo solicitadas

#### "Application homepage not accessible"

**Causa:** Homepage requer login ou esta com erro.

**Solucao:**
1. Criar landing page publica
2. Garantir que homepage nao requer autenticacao
3. Verificar que pagina carrega em menos de 3 segundos
4. Testar em navegador anonimo

---

## Links Uteis

### Documentacao Oficial

- [Sensitive Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [Restricted Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)
- [OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies)
- [API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)

### Ferramentas

- [Google Cloud Console](https://console.cloud.google.com)
- [Google Search Console](https://search.google.com/search-console)
- [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
- [OAuth Playground](https://developers.google.com/oauthplayground)

### Escopos por API

- [Calendar API Scopes](https://developers.google.com/calendar/api/auth)
- [Gmail API Scopes](https://developers.google.com/gmail/api/auth/scopes)
- [Drive API Scopes](https://developers.google.com/drive/api/guides/api-specific-auth)

---

## Historico de Versoes

| Data | Versao | Alteracoes |
|------|--------|------------|
| 2026-01-16 | 1.0 | Versao inicial do checklist |

---

**Maintainers:** Lucas Boscacci Lima + Claude Opus 4.5
