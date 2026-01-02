# Épicos para Aprovação Google Cloud OAuth

## Visão Geral do Projeto

**Objetivo:** Obter aprovação do Google Cloud para uso de escopos OAuth sensíveis (Google Calendar API)

**Status Atual:** 🟡 70% Pronto
**Meta:** 🟢 100% Pronto para Submissão
**Timeline Estimado:** 7-10 dias úteis

### Diagrama de Dependências

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE DEPENDÊNCIAS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐     ┌──────────────┐                                     │
│   │   ÉPICO 1    │     │   ÉPICO 2    │                                     │
│   │   Escopos    │     │   Domínio    │                                     │
│   │   OAuth      │     │   Próprio    │                                     │
│   └──────┬───────┘     └──────┬───────┘                                     │
│          │                    │                                              │
│          │    ┌───────────────┘                                             │
│          │    │                                                              │
│          ▼    ▼                                                              │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│   │   ÉPICO 3    │     │   ÉPICO 5    │     │   ÉPICO 4    │               │
│   │   Privacy    │◄────│   Branding   │     │    Vídeo     │               │
│   │   Policy     │     │   Contato    │     │    Demo      │               │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘               │
│          │                    │                    │                        │
│          └────────────────────┼────────────────────┘                        │
│                               │                                              │
│                               ▼                                              │
│                        ┌──────────────┐                                     │
│                        │   ÉPICO 6    │                                     │
│                        │  Submissão   │                                     │
│                        │   Final      │                                     │
│                        └──────────────┘                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Legenda de Status

| Símbolo | Significado |
|---------|-------------|
| ⬜ | Não iniciado |
| 🔄 | Em progresso |
| ✅ | Concluído |
| 🚫 | Bloqueado |
| ⚠️ | Atenção necessária |

---

## ÉPICO 1: Correção de Escopos OAuth

### 📋 Informações Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | 🔴 ALTA - BLOQUEANTE |
| **Esforço Estimado** | 4-6 horas |
| **Responsável** | Dev Backend/Auth |
| **Status** | ⬜ Não iniciado |

### 🎯 Descrição do Problema

O código atual em `src/services/googleAuthService.ts` solicita **escopos redundantes e excessivos**:

```javascript
// PROBLEMA ATUAL (linha 33-38)
const GOOGLE_CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar',         // REDUNDANTE
    'https://www.googleapis.com/auth/calendar.events',  // REDUNDANTE
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
];
```

**Por que é problemático:**
1. `calendar` já inclui `calendar.events` e `calendar.readonly`
2. Viola o princípio do mínimo privilégio do Google
3. Aumenta fricção no consent screen
4. Documentação (`docs/features/GOOGLE_CALENDAR_INTEGRATION.md:190-198`) diz "read-only" mas código solicita escrita

### ✅ Critérios de Aceitação

- [ ] Apenas escopos estritamente necessários são solicitados
- [ ] Cada escopo tem justificativa documentada
- [ ] Código e documentação estão alinhados
- [ ] Testes de integração passam com novos escopos
- [ ] OAuth consent screen mostra apenas escopos mínimos

### 📝 Tarefas

#### 1.1 Análise de Requisitos de Escopo
- [ ] Listar todas as funcionalidades que usam Google Calendar
- [ ] Determinar se app precisa apenas LEITURA ou também ESCRITA
- [ ] Documentar decisão com justificativa

**Funcionalidades atuais que usam Calendar:**
| Funcionalidade | Arquivo | Escopo Necessário |
|----------------|---------|-------------------|
| Exibir eventos na timeline | `AgendaView.tsx` | `calendar.readonly` |
| Sincronizar eventos | `googleCalendarService.ts` | `calendar.readonly` |
| Criar eventos (futuro?) | N/A | `calendar.events` |

#### 1.2 Atualizar googleAuthService.ts
- [ ] Remover escopos redundantes
- [ ] Adicionar comentários explicativos
- [ ] Criar constantes separadas para diferentes níveis de acesso

**Arquivo:** `src/services/googleAuthService.ts`

```javascript
// SOLUÇÃO PROPOSTA

/**
 * Escopos OAuth para Google Calendar
 *
 * IMPORTANTE: Seguimos o princípio do mínimo privilégio.
 * Solicitamos APENAS os escopos necessários para as funcionalidades atuais.
 *
 * Documentação de escopos:
 * https://developers.google.com/calendar/api/auth
 */

// Escopo para LEITURA apenas (recomendado para início)
const GOOGLE_CALENDAR_SCOPES_READONLY = [
    'https://www.googleapis.com/auth/calendar.readonly',  // Leitura de eventos
    'https://www.googleapis.com/auth/userinfo.email',     // Identificação do usuário
];

// Escopo para LEITURA + ESCRITA (quando criar eventos for implementado)
const GOOGLE_CALENDAR_SCOPES_READWRITE = [
    'https://www.googleapis.com/auth/calendar.events',    // Criar/editar eventos
    'https://www.googleapis.com/auth/userinfo.email',     // Identificação do usuário
];

// Usar escopo readonly por padrão
const GOOGLE_CALENDAR_SCOPES = GOOGLE_CALENDAR_SCOPES_READONLY;
```

#### 1.3 Atualizar Documentação
- [ ] Atualizar `docs/features/GOOGLE_CALENDAR_INTEGRATION.md`
- [ ] Remover menções a escopos não utilizados
- [ ] Adicionar seção de justificativa de escopos

#### 1.4 Testes
- [ ] Testar fluxo OAuth com novos escopos
- [ ] Verificar que todas funcionalidades continuam funcionando
- [ ] Testar revogação e reconexão

### 🔗 Arquivos Relacionados

| Arquivo | Ação |
|---------|------|
| `src/services/googleAuthService.ts` | Modificar escopos |
| `src/services/googleCalendarService.ts` | Verificar compatibilidade |
| `docs/features/GOOGLE_CALENDAR_INTEGRATION.md` | Atualizar documentação |
| `src/hooks/useGoogleCalendarEvents.ts` | Verificar uso |

### 📊 Métricas de Sucesso

- Redução de 4 escopos para 2 escopos
- Zero erros de permissão após mudança
- Documentação 100% alinhada com código

---

## ÉPICO 2: Configuração de Domínio Próprio

### 📋 Informações Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | 🔴 ALTA - BLOQUEANTE |
| **Esforço Estimado** | 1-2 dias |
| **Responsável** | DevOps/Infra |
| **Status** | ⬜ Não iniciado |
| **Dependências** | Nenhuma |

### 🎯 Descrição do Problema

A URL de produção atual é um domínio genérico do Cloud Run:
```
https://aica-5p22u2w6jq-rj.a.run.app
```

**Por que é problemático:**
1. Google não aceita domínios de terceiros (Cloud Run, Vercel, etc.) para verificação OAuth
2. Domínio não pode ser verificado no Google Search Console
3. Transmite imagem não profissional
4. Emails de contato (`hello@aica.app`, `contato@comtxae.com`) não correspondem ao domínio real

### ✅ Critérios de Aceitação

- [ ] Domínio próprio registrado e configurado
- [ ] SSL/HTTPS funcionando corretamente
- [ ] Domínio verificado no Google Search Console
- [ ] Cloud Run Domain Mapping configurado
- [ ] Todos os links e redirects atualizados
- [ ] OAuth redirect URIs atualizados no Google Cloud Console

### 📝 Tarefas

#### 2.1 Escolha e Registro de Domínio
- [ ] Avaliar opções de domínio disponíveis:
  | Opção | Disponibilidade | Custo Anual | Recomendação |
  |-------|-----------------|-------------|--------------|
  | `aica.life` | Verificar | ~$30 | ⭐ Preferido |
  | `aica.app` | Verificar | ~$20 | Segunda opção |
  | `aicaos.com` | Verificar | ~$15 | Terceira opção |
  | `useaica.com` | Verificar | ~$15 | Alternativa |

- [ ] Registrar domínio escolhido
- [ ] Configurar DNS inicial

#### 2.2 Configuração no Google Cloud
- [ ] Acessar Cloud Run no Google Cloud Console
- [ ] Configurar Domain Mapping para o serviço `aica`
- [ ] Gerar certificado SSL gerenciado pelo Google
- [ ] Aguardar propagação DNS (até 48h)

**Comandos úteis:**
```bash
# Verificar domínio atual
gcloud run services describe aica --region=southamerica-east1 --format="value(status.url)"

# Adicionar domain mapping
gcloud run domain-mappings create --service=aica --domain=SEU_DOMINIO --region=southamerica-east1

# Verificar status do mapping
gcloud run domain-mappings describe --domain=SEU_DOMINIO --region=southamerica-east1
```

#### 2.3 Verificação no Google Search Console
- [ ] Acessar [Google Search Console](https://search.google.com/search-console)
- [ ] Adicionar propriedade com domínio
- [ ] Escolher método de verificação (DNS TXT recomendado)
- [ ] Adicionar registro TXT no DNS
- [ ] Confirmar verificação

**Registro DNS necessário:**
```
Tipo: TXT
Nome: @ (ou domínio raiz)
Valor: google-site-verification=CÓDIGO_FORNECIDO
TTL: 3600
```

#### 2.4 Atualizar Configurações da Aplicação
- [ ] Atualizar `cloudbuild.yaml`:
  ```yaml
  _VITE_FRONTEND_URL: https://SEU_DOMINIO
  ```
- [ ] Atualizar `.env.example`:
  ```env
  VITE_FRONTEND_URL=https://SEU_DOMINIO
  ```
- [ ] Atualizar redirect URIs no Google Cloud Console OAuth

#### 2.5 Atualizar Google Cloud Console OAuth
- [ ] Acessar [Google Cloud Console - APIs & Services - Credentials](https://console.cloud.google.com/apis/credentials)
- [ ] Editar OAuth 2.0 Client ID
- [ ] Atualizar Authorized JavaScript origins:
  ```
  https://SEU_DOMINIO
  ```
- [ ] Atualizar Authorized redirect URIs:
  ```
  https://SEU_DOMINIO
  https://gppebtrshbvuzatmebhr.supabase.co/auth/v1/callback
  ```

#### 2.6 Atualizar OAuth Consent Screen
- [ ] Acessar [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
- [ ] Atualizar Application home page: `https://SEU_DOMINIO/landing`
- [ ] Atualizar Application privacy policy link: `https://SEU_DOMINIO/privacy`
- [ ] Atualizar Application terms of service link: `https://SEU_DOMINIO/terms`
- [ ] Adicionar `SEU_DOMINIO` em Authorized domains

### 🔗 Arquivos Relacionados

| Arquivo | Ação |
|---------|------|
| `cloudbuild.yaml` | Atualizar `_VITE_FRONTEND_URL` |
| `.env.example` | Atualizar URLs |
| `docs/features/GOOGLE_CALENDAR_INTEGRATION.md` | Atualizar redirect URIs |
| `Dockerfile` | Verificar se precisa ajuste |

### 📊 Métricas de Sucesso

- Domínio próprio respondendo em < 200ms
- SSL válido (A+ no SSL Labs)
- Verificação Search Console: ✅ Verificado
- Zero erros de redirect OAuth

---

## ÉPICO 3: Atualização da Política de Privacidade

### 📋 Informações Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | 🔴 ALTA |
| **Esforço Estimado** | 2-4 horas |
| **Responsável** | Dev Frontend + Legal |
| **Status** | ⬜ Não iniciado |
| **Dependências** | ÉPICO 1 (escopos definidos) |

### 🎯 Descrição do Problema

A política de privacidade atual (`src/pages/PrivacyPolicyPage.tsx`) não menciona especificamente:
1. Integração com Google Calendar API
2. Escopos OAuth solicitados
3. Como os dados do Google são processados e armazenados
4. Política de dados de usuário do Google (API Services User Data Policy)

**Por que é problemático:**
- Google requer disclosure explícito de escopos na Privacy Policy
- Falta de transparência pode resultar em rejeição
- Não está em conformidade com Google API Services User Data Policy

### ✅ Critérios de Aceitação

- [ ] Seção específica sobre Google Calendar API adicionada
- [ ] Todos os escopos OAuth listados com explicação
- [ ] Link para Google API Services User Data Policy incluído
- [ ] Explicação de como dados são armazenados/compartilhados
- [ ] Data de atualização é FIXA (não dinâmica)
- [ ] Linguagem clara e acessível

### 📝 Tarefas

#### 3.1 Adicionar Seção Google Calendar API
- [ ] Criar nova seção após "4. Inteligência Artificial"
- [ ] Incluir todos os elementos requeridos pelo Google

**Código a adicionar em `src/pages/PrivacyPolicyPage.tsx`:**

```jsx
{/* Google Calendar Integration - NOVA SEÇÃO */}
<section>
  <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">
    5. Integração com Google Calendar
  </h2>

  <p className="text-[#5C554B] leading-relaxed mb-4">
    A Aica oferece integração opcional com o Google Calendar para sincronizar
    seus eventos e compromissos com nossa plataforma. Esta integração é
    completamente voluntária e você pode conectar ou desconectar a qualquer momento.
  </p>

  <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">
    5.1. Permissões Solicitadas (Escopos OAuth)
  </h3>
  <p className="text-[#5C554B] leading-relaxed mb-4">
    Quando você autoriza a conexão com o Google Calendar, solicitamos
    as seguintes permissões:
  </p>
  <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
    <li>
      <strong>Visualizar eventos do calendário</strong>
      (<code>calendar.readonly</code>): Permite que a Aica leia seus eventos
      para exibi-los em sua timeline pessoal
    </li>
    <li>
      <strong>Ver seu endereço de email</strong>
      (<code>userinfo.email</code>): Usado para identificar sua conta Google
      e associar corretamente seus dados
    </li>
  </ul>

  <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">
    5.2. Como Usamos Seus Dados do Google Calendar
  </h3>
  <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
    <li>Exibir seus eventos na timeline da Aica</li>
    <li>Sincronizar compromissos para gestão integrada de agenda</li>
    <li>Gerar insights sobre sua rotina e produtividade</li>
    <li>Permitir que você visualize conflitos de horário</li>
  </ul>

  <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">
    5.3. Armazenamento de Dados
  </h3>
  <p className="text-[#5C554B] leading-relaxed mb-4">
    Os tokens de acesso ao Google Calendar são armazenados de forma segura
    em nosso banco de dados com criptografia. Seus eventos são sincronizados
    temporariamente para exibição e não são armazenados permanentemente em
    nossos servidores.
  </p>

  <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">
    5.4. Compartilhamento de Dados
  </h3>
  <p className="text-[#5C554B] leading-relaxed mb-4">
    <strong>Não compartilhamos</strong> seus dados do Google Calendar com
    terceiros. Os dados são usados exclusivamente para fornecer as
    funcionalidades da Aica.
  </p>

  <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">
    5.5. Revogação de Acesso
  </h3>
  <p className="text-[#5C554B] leading-relaxed mb-4">
    Você pode revogar o acesso da Aica ao seu Google Calendar a qualquer momento:
  </p>
  <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
    <li>Nas configurações da Aica: clique em "Desconectar Google Calendar"</li>
    <li>
      Na sua conta Google: acesse{' '}
      <a
        href="https://myaccount.google.com/permissions"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#6B9EFF] hover:underline"
      >
        Permissões de conta Google
      </a>
    </li>
  </ul>

  <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">
    5.6. Conformidade com Políticas do Google
  </h3>
  <p className="text-[#5C554B] leading-relaxed">
    O uso dos dados do Google Calendar pela Aica está em conformidade com a{' '}
    <a
      href="https://developers.google.com/terms/api-services-user-data-policy"
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#6B9EFF] hover:underline"
    >
      Política de Dados de Usuário dos Serviços de API do Google
    </a>
    , incluindo os requisitos de Uso Limitado.
  </p>
</section>
```

#### 3.2 Corrigir Data de Atualização
- [ ] Substituir data dinâmica por data fixa
- [ ] Atualizar sempre que houver mudanças significativas

**De:**
```jsx
<p className="text-sm text-[#5C554B] mb-8">
  Última atualização: {new Date().toLocaleDateString('pt-BR', { ... })}
</p>
```

**Para:**
```jsx
<p className="text-sm text-[#5C554B] mb-8">
  Última atualização: 15 de janeiro de 2026
</p>
```

#### 3.3 Renumerar Seções
- [ ] Atualizar numeração das seções subsequentes (6, 7, 8...)
- [ ] Verificar índice/sumário se houver

#### 3.4 Adicionar Referência à Política do Google
- [ ] Incluir link para Google API Services User Data Policy
- [ ] Mencionar conformidade com "Limited Use" requirements

#### 3.5 Revisão Legal
- [ ] Revisar texto com equipe jurídica (se disponível)
- [ ] Garantir conformidade com LGPD
- [ ] Verificar linguagem clara e acessível

### 🔗 Arquivos Relacionados

| Arquivo | Ação |
|---------|------|
| `src/pages/PrivacyPolicyPage.tsx` | Adicionar seção Google Calendar |
| `src/pages/TermsOfServicePage.tsx` | Verificar menções a Google |

### 📊 Métricas de Sucesso

- 100% dos escopos documentados na Privacy Policy
- Link para Google User Data Policy presente
- Data fixa de atualização
- Zero ambiguidades sobre uso de dados Google

---

## ÉPICO 4: Criação do Vídeo de Demonstração

### 📋 Informações Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | 🔴 ALTA - BLOQUEANTE |
| **Esforço Estimado** | 4-6 horas |
| **Responsável** | Product/Marketing |
| **Status** | ⬜ Não iniciado |
| **Dependências** | ÉPICO 1, ÉPICO 2 |

### 🎯 Descrição do Problema

Google requer um vídeo de demonstração para verificação de escopos sensíveis. O vídeo deve:
1. Mostrar o fluxo completo de autorização OAuth
2. Demonstrar a tela de consentimento com todos os escopos
3. Mostrar como os dados são realmente usados na aplicação
4. Ser hospedado no YouTube como "Não listado"

**Por que é necessário:**
- Requisito obrigatório para escopos SENSITIVE
- Permite que Google valide uso legítimo dos dados
- Demonstra transparência e boas práticas

### ✅ Critérios de Aceitação

- [ ] Vídeo de 3-5 minutos gravado em alta qualidade
- [ ] Mostra fluxo OAuth completo (início ao fim)
- [ ] Tela de consentimento claramente visível
- [ ] Demonstra USO REAL dos dados do Calendar
- [ ] Audio claro explicando cada etapa
- [ ] Upload no YouTube como "Não listado"
- [ ] Link funcional e acessível

### 📝 Tarefas

#### 4.1 Preparação do Ambiente
- [ ] Configurar ambiente de demonstração limpo
- [ ] Criar conta de teste com eventos no Google Calendar
- [ ] Garantir que domínio próprio está funcionando (ÉPICO 2)
- [ ] Testar fluxo OAuth completo antes de gravar

#### 4.2 Criar Roteiro do Vídeo

**Roteiro Sugerido (3-5 minutos):**

```markdown
## ROTEIRO - Vídeo de Demonstração OAuth AICA

### INTRO (0:00 - 0:30)
[Tela: Landing page da AICA]
NARRAÇÃO: "Este vídeo demonstra como a AICA, uma plataforma de gestão
de vida pessoal, utiliza a integração com o Google Calendar para
ajudar usuários a gerenciar sua agenda."

### CONTEXTO (0:30 - 1:00)
[Tela: Dashboard logado da AICA]
NARRAÇÃO: "A AICA permite que usuários visualizem seus compromissos
do Google Calendar diretamente na timeline da aplicação, facilitando
a gestão integrada de tarefas e eventos."

### FLUXO DE AUTORIZAÇÃO (1:00 - 2:30)
[Tela: Página de Agenda/Connections]
NARRAÇÃO: "Vamos demonstrar o processo de conexão com o Google Calendar."

1. [Clicar em "Conectar Google Calendar"]
   NARRAÇÃO: "O usuário inicia a conexão clicando no botão de autorização."

2. [Popup Google OAuth aparece]
   NARRAÇÃO: "A tela de consentimento do Google é exibida, mostrando
   claramente os escopos solicitados."

3. [PAUSAR na tela de consentimento - mostrar escopos]
   NARRAÇÃO: "Como podem ver, solicitamos apenas dois escopos:
   - Visualizar eventos do calendário (calendar.readonly)
   - Ver o endereço de email (userinfo.email)
   Não solicitamos permissão para criar ou modificar eventos."

4. [Clicar em "Permitir"]
   NARRAÇÃO: "Após o usuário conceder permissão, é redirecionado de
   volta para a aplicação."

### DEMONSTRAÇÃO DE USO (2:30 - 4:00)
[Tela: Timeline/Agenda da AICA com eventos]
NARRAÇÃO: "Agora os eventos do Google Calendar aparecem na timeline."

1. [Mostrar eventos sincronizados]
   NARRAÇÃO: "Os eventos são exibidos com título, horário e detalhes."

2. [Navegar pela agenda]
   NARRAÇÃO: "O usuário pode navegar entre dias e ver todos os compromissos."

3. [Mostrar integração com tarefas da AICA]
   NARRAÇÃO: "Os eventos do Calendar são integrados com as tarefas
   pessoais da AICA, permitindo uma visão unificada."

### DESCONEXÃO (4:00 - 4:30)
[Tela: Configurações]
NARRAÇÃO: "O usuário pode revogar o acesso a qualquer momento."

1. [Clicar em "Desconectar"]
2. [Mostrar confirmação]
   NARRAÇÃO: "Após desconectar, os tokens são removidos e os dados
   do Calendar não são mais acessados."

### ENCERRAMENTO (4:30 - 5:00)
[Tela: Landing page]
NARRAÇÃO: "A integração com Google Calendar da AICA segue todas as
diretrizes de privacidade e uso mínimo de dados, proporcionando
valor real ao usuário sem comprometer sua privacidade."

[Exibir: Logo AICA + URL + Link Privacy Policy]
```

#### 4.3 Gravação do Vídeo
- [ ] Usar software de gravação de tela (OBS, Loom, etc.)
- [ ] Gravar em resolução mínima 1080p
- [ ] Garantir áudio claro (usar microfone externo se possível)
- [ ] Gravar múltiplas tomadas se necessário

**Ferramentas recomendadas:**
| Ferramenta | Tipo | Gratuito |
|------------|------|----------|
| OBS Studio | Gravação de tela | ✅ |
| Loom | Gravação + narração | Freemium |
| Camtasia | Edição profissional | ❌ |
| DaVinci Resolve | Edição gratuita | ✅ |

#### 4.4 Edição do Vídeo
- [ ] Cortar partes desnecessárias
- [ ] Adicionar zoom em áreas importantes (consent screen)
- [ ] Adicionar legendas/texto explicativo
- [ ] Incluir logo da AICA no início e fim
- [ ] Exportar em formato adequado (MP4, H.264)

#### 4.5 Upload no YouTube
- [ ] Criar/acessar canal YouTube da AICA
- [ ] Upload do vídeo
- [ ] Configurar como **"Não listado"** (IMPORTANTE!)
- [ ] Adicionar título descritivo
- [ ] Adicionar descrição com links

**Configurações do YouTube:**
```
Título: AICA - Google Calendar Integration OAuth Demo
Descrição:
  Demonstração do fluxo de autorização OAuth para integração
  com Google Calendar na plataforma AICA.

  Website: https://SEU_DOMINIO
  Privacy Policy: https://SEU_DOMINIO/privacy

  Escopos solicitados:
  - calendar.readonly
  - userinfo.email

Visibilidade: NÃO LISTADO
Categoria: Ciência e tecnologia
```

#### 4.6 Documentar Link do Vídeo
- [ ] Salvar URL do vídeo
- [ ] Testar acesso ao link (deve funcionar sem login)
- [ ] Adicionar link ao formulário de verificação OAuth

### 🔗 Arquivos Relacionados

| Arquivo | Ação |
|---------|------|
| N/A | Vídeo é externo |

### 📊 Métricas de Sucesso

- Vídeo acessível via link não listado
- Duração entre 3-5 minutos
- Todas as etapas do OAuth claramente visíveis
- Consent screen mostra escopos corretos

---

## ÉPICO 5: Consistência de Branding e Contato

### 📋 Informações Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | 🟡 MÉDIA |
| **Esforço Estimado** | 1-2 horas |
| **Responsável** | Dev Frontend |
| **Status** | ⬜ Não iniciado |
| **Dependências** | ÉPICO 2 (domínio) |

### 🎯 Descrição do Problema

Existem inconsistências nos emails de contato e branding:

| Local | Email Atual | Problema |
|-------|-------------|----------|
| Footer (`MinimalFooter.tsx`) | `hello@aica.app` | Domínio diferente |
| Privacy Policy | `contato@comtxae.com` | Domínio diferente |
| Domínio real | `*.run.app` | Genérico Cloud Run |

**Por que é problemático:**
- Confunde usuários sobre email oficial
- Google pode questionar legitimidade
- Transmite falta de profissionalismo

### ✅ Critérios de Aceitação

- [ ] Email de contato único e consistente em todo o app
- [ ] Email usa domínio próprio (após ÉPICO 2)
- [ ] OAuth consent screen usa mesmo branding
- [ ] Nome da aplicação consistente

### 📝 Tarefas

#### 5.1 Definir Email Oficial
- [ ] Escolher email único baseado no domínio próprio
- [ ] Sugestões:
  | Email | Propósito |
  |-------|-----------|
  | `contato@[dominio]` | Geral |
  | `suporte@[dominio]` | Suporte técnico |
  | `privacidade@[dominio]` | Questões de privacidade |

#### 5.2 Atualizar Footer
**Arquivo:** `src/modules/onboarding/components/landing-v2/MinimalFooter.tsx`

```jsx
// ANTES (linha 29)
{ label: 'Contato', href: 'mailto:hello@aica.app' },

// DEPOIS
{ label: 'Contato', href: 'mailto:contato@SEU_DOMINIO' },
```

#### 5.3 Atualizar Privacy Policy
**Arquivo:** `src/pages/PrivacyPolicyPage.tsx`

```jsx
// ANTES (linha 224)
<p className="text-[#5C554B]"><strong>E-mail:</strong> contato@comtxae.com</p>

// DEPOIS
<p className="text-[#5C554B]"><strong>E-mail:</strong> contato@SEU_DOMINIO</p>
```

#### 5.4 Atualizar Terms of Service
**Arquivo:** `src/pages/TermsOfServicePage.tsx`

```jsx
// Verificar e atualizar email se houver
```

#### 5.5 Verificar OAuth Consent Screen
- [ ] Acessar Google Cloud Console > OAuth consent screen
- [ ] Verificar nome da aplicação: "AICA" ou "AICA - Life OS"
- [ ] Verificar logo está configurado
- [ ] Verificar support email está correto

#### 5.6 Configurar Email no Domínio
- [ ] Configurar registros MX para email
- [ ] Opções:
  | Serviço | Custo | Complexidade |
  |---------|-------|--------------|
  | Google Workspace | $6/mês | Baixa |
  | Zoho Mail | Grátis | Média |
  | Forward Email | Grátis | Baixa |
  | ImprovMX | Grátis | Baixa |

### 🔗 Arquivos Relacionados

| Arquivo | Ação |
|---------|------|
| `src/modules/onboarding/components/landing-v2/MinimalFooter.tsx` | Atualizar email |
| `src/pages/PrivacyPolicyPage.tsx` | Atualizar email |
| `src/pages/TermsOfServicePage.tsx` | Verificar email |

### 📊 Métricas de Sucesso

- Um único email de contato em todo o app
- Email funcional e recebendo mensagens
- Branding consistente entre app e OAuth consent

---

## ÉPICO 6: Preparação para Submissão

### 📋 Informações Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | 🟡 MÉDIA |
| **Esforço Estimado** | 2-4 horas |
| **Responsável** | Product Owner |
| **Status** | ⬜ Não iniciado |
| **Dependências** | TODOS os épicos anteriores |

### 🎯 Descrição do Problema

Antes de submeter para verificação, é necessário:
1. Preparar credenciais de teste para equipe Google
2. Escrever justificativas detalhadas para cada escopo
3. Compilar toda documentação necessária
4. Preencher formulário de verificação corretamente

### ✅ Critérios de Aceitação

- [ ] Conta de teste funcional criada
- [ ] Justificativas de escopo escritas e revisadas
- [ ] Checklist de pré-submissão 100% completo
- [ ] Formulário de verificação preenchido
- [ ] Backup de todas as configurações

### 📝 Tarefas

#### 6.1 Criar Conta de Teste
- [ ] Criar conta de teste no Supabase/app
- [ ] Não usar dados reais/sensíveis
- [ ] Documentar credenciais em local seguro

**Template de credenciais:**
```
Email: google-review@SEU_DOMINIO
Senha: [senha segura]
Instruções:
1. Acesse https://SEU_DOMINIO/landing
2. Clique em "Começar Agora"
3. Faça login com as credenciais acima
4. Navegue até Agenda > Conectar Google Calendar
```

#### 6.2 Escrever Justificativas de Escopo
- [ ] Criar documento com justificativas

**Template de Justificativa:**

```markdown
## Justificativa de Escopos OAuth - AICA

### Escopo: calendar.readonly

**Por que precisamos deste escopo:**
A AICA é uma plataforma de gestão de vida pessoal que ajuda usuários
a organizar sua rotina. A sincronização com Google Calendar permite
que usuários visualizem todos seus compromissos em um único lugar,
integrado com suas tarefas e metas pessoais.

**Como usamos os dados:**
- Leitura de eventos para exibição na timeline da aplicação
- Sincronização periódica para manter dados atualizados
- Integração com sistema de tarefas para evitar conflitos de horário

**Por que não usamos um escopo menor:**
O escopo calendar.readonly é o mínimo necessário para leitura de eventos.
Não existe escopo mais restrito que atenda nossa necessidade.

**Alternativas consideradas:**
- calendar.events.readonly não existe como escopo separado
- Solicitar eventos específicos requer calendar.readonly

---

### Escopo: userinfo.email

**Por que precisamos deste escopo:**
Necessário para identificar qual conta Google está conectada e
associar corretamente os tokens ao usuário da plataforma.

**Como usamos os dados:**
- Exibir email da conta conectada na interface
- Identificar conta para gerenciamento de tokens
- Permitir que usuário saiba qual conta está sincronizada

**Por que não usamos um escopo menor:**
Este é o escopo mínimo para identificação de usuário.
```

#### 6.3 Preparar Documentação de Suporte
- [ ] Compilar links importantes:
  | Documento | URL |
  |-----------|-----|
  | Homepage | https://SEU_DOMINIO/landing |
  | Privacy Policy | https://SEU_DOMINIO/privacy |
  | Terms of Service | https://SEU_DOMINIO/terms |
  | Vídeo Demo | [YouTube URL] |

- [ ] Screenshot da tela de consentimento
- [ ] Screenshot do uso dos dados na aplicação

#### 6.4 Preencher Formulário de Verificação
- [ ] Acessar Google Cloud Console > OAuth consent screen
- [ ] Clicar em "Prepare for verification"
- [ ] Preencher todos os campos obrigatórios:

**Campos do Formulário:**
```
✅ App Information
   - App name: AICA - Life OS
   - User support email: contato@SEU_DOMINIO
   - App logo: [upload logo]

✅ App Domain
   - Application home page: https://SEU_DOMINIO/landing
   - Application privacy policy link: https://SEU_DOMINIO/privacy
   - Application terms of service link: https://SEU_DOMINIO/terms

✅ Authorized domains
   - SEU_DOMINIO

✅ Developer contact information
   - Email: contato@SEU_DOMINIO

✅ Scopes
   - calendar.readonly
   - userinfo.email

✅ Sensitive scope justification
   - [Texto da justificativa]

✅ Demo video
   - [YouTube URL não listado]

✅ Test credentials
   - [Credenciais de teste]
```

#### 6.5 Revisão Final
- [ ] Executar checklist completo (ver abaixo)
- [ ] Pedir revisão de outra pessoa
- [ ] Testar todos os links
- [ ] Verificar vídeo está acessível

#### 6.6 Submeter para Verificação
- [ ] Clicar em "Submit for verification"
- [ ] Documentar data/hora da submissão
- [ ] Monitorar email para feedback do Google

### 🔗 Checklist Final de Pré-Submissão

```markdown
## CHECKLIST - Pronto para Submissão OAuth

### Infraestrutura
- [ ] Domínio próprio configurado e funcionando
- [ ] SSL válido (HTTPS)
- [ ] Domínio verificado no Google Search Console

### Código
- [ ] Escopos OAuth são mínimos necessários
- [ ] Código não solicita escopos não utilizados
- [ ] Tratamento de erros OAuth implementado

### Páginas Públicas
- [ ] Homepage acessível: https://SEU_DOMINIO/landing
- [ ] Privacy Policy acessível: https://SEU_DOMINIO/privacy
- [ ] Terms of Service acessível: https://SEU_DOMINIO/terms
- [ ] Links funcionam corretamente

### Privacy Policy
- [ ] Seção específica sobre Google Calendar
- [ ] Todos os escopos listados e explicados
- [ ] Link para Google User Data Policy
- [ ] Data de atualização fixa
- [ ] Email de contato correto

### OAuth Consent Screen
- [ ] Nome correto: "AICA" ou "AICA - Life OS"
- [ ] Logo configurado
- [ ] Homepage URL correta
- [ ] Privacy Policy URL correta
- [ ] Terms URL correta
- [ ] Support email correto
- [ ] Authorized domains configurados

### Vídeo de Demonstração
- [ ] Vídeo gravado e editado
- [ ] Upload no YouTube como "Não listado"
- [ ] Link testado e acessível
- [ ] Mostra consent screen claramente
- [ ] Demonstra uso real dos dados

### Credenciais de Teste
- [ ] Conta de teste criada
- [ ] Credenciais documentadas
- [ ] Conta tem dados de exemplo

### Justificativas
- [ ] Justificativa para cada escopo escrita
- [ ] Revisada por outra pessoa
- [ ] Clara e objetiva

### Branding
- [ ] Email de contato consistente
- [ ] Nome do app consistente
- [ ] Logo correto em todos os lugares
```

### 📊 Métricas de Sucesso

- Formulário 100% preenchido
- Zero campos obrigatórios faltando
- Todos os links funcionais
- Submissão aceita sem erros

---

## Timeline Estimado

```
Semana 1:
├── Dia 1-2: ÉPICO 1 (Escopos OAuth)
├── Dia 2-3: ÉPICO 2 (Domínio) - Início
└── Dia 3-4: ÉPICO 3 (Privacy Policy)

Semana 2:
├── Dia 5-6: ÉPICO 2 (Domínio) - Conclusão + DNS propagação
├── Dia 6-7: ÉPICO 4 (Vídeo Demo)
├── Dia 7-8: ÉPICO 5 (Branding)
└── Dia 8-9: ÉPICO 6 (Submissão)

Semana 3:
└── Aguardar revisão do Google (3-5 dias úteis)
```

---

## Recursos Úteis

### Documentação Google
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

*Documento criado em 02/01/2026*
*Última atualização: 02/01/2026*
