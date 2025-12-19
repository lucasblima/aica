# AICA Life OS

<div align="center">

**Sistema Operacional de Vida Integral**
*Plataforma integrada para gestão de vida pessoal e profissional*

[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green.svg)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38bdf8.svg)](https://tailwindcss.com/)

</div>

---

## 📋 Visão Geral

AICA Life OS é uma plataforma completa que unifica gestão de vida pessoal e profissional em um único sistema integrado. Combina autoconhecimento, produtividade, conexões significativas e crescimento profissional através de módulos especializados.

### Módulos Principais

- **🌟 Minha Jornada** - Autoconhecimento e desenvolvimento pessoal através de momentos diários, perguntas de reflexão e sistema de consciência
- **🎯 Meu Dia (Atlas)** - Gestão inteligente de tarefas com matriz de Eisenhower e sincronização Google Calendar
- **🎙️ Estúdio (Podcast Copilot)** - Produção profissional de podcasts com IA (pesquisa de convidados, roteiros, pautas)
- **🤝 Conexões** - Rede de conexões profissionais organizadas por contexto (Habitat, Academia, Ventures, Tribo)
- **💼 Captação (Grants)** - Gestão de oportunidades e projetos de financiamento
- **💰 Finanças** - Controle financeiro integrado

---

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18.x ou superior
- npm ou yarn
- Conta Supabase (backend)
- API Key do Google Gemini

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/aica-frontend.git
cd aica-frontend

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais

# Inicie o servidor de desenvolvimento
npm run dev
```

O aplicativo estará disponível em `http://localhost:3000`

**Para instruções completas de setup e deployment**, consulte: [SETUP_AND_DEPLOYMENT.md](./SETUP_AND_DEPLOYMENT.md)

---

## 🏗️ Arquitetura

### Stack Tecnológico

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Ceramic Design System
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **IA**: Google Gemini API
- **Build**: Vite
- **State Management**: React Query + Context API
- **Routing**: React Router v6

### Estrutura do Projeto

```
aica-frontend/
├── src/
│   ├── modules/          # Módulos principais do sistema
│   │   ├── journey/      # Minha Jornada (moments, questions, CP)
│   │   ├── studio/       # Estúdio Podcast
│   │   ├── connections/  # Rede de Conexões
│   │   ├── grants/       # Captação de Recursos
│   │   ├── finance/      # Gestão Financeira
│   │   └── onboarding/   # Fluxo de boas-vindas
│   ├── components/       # Componentes compartilhados
│   ├── services/         # Integrações (Supabase, Gemini, Calendar)
│   ├── hooks/            # React hooks customizados
│   ├── router/           # Configuração de rotas
│   └── providers/        # Context providers globais
├── supabase/
│   ├── migrations/       # Migrações do banco de dados
│   └── functions/        # Edge Functions (gemini-chat, etc.)
├── docs/                 # Documentação organizada
│   ├── architecture/     # Arquitetura e decisões técnicas
│   ├── features/         # Documentação de funcionalidades
│   ├── design/           # Design system e UI/UX
│   ├── deployment/       # Guias de deployment
│   ├── testing/          # Testes E2E e estratégias
│   └── delivery/         # Histórico de entregas
└── tests/
    └── e2e/              # Testes end-to-end (Playwright)
```

---

## 📚 Documentação

A documentação está organizada por categoria em `docs/`:

### 🏛️ Arquitetura & Design
- [Arquitetura Geral](./docs/architecture/) - Diagramas, fluxos e decisões técnicas
- [Design System Ceramic](./docs/design/CERAMIC_DESIGN_SYSTEM_GUIDANCE.md) - Sistema de design do projeto
- [Guia de UI/UX](./docs/design/UI_UX_GUIDELINES.md) - Padrões de interface

### ⚙️ Features & Integrações
- [Google Calendar Integration](./docs/features/GOOGLE_CALENDAR_INTEGRATION.md) - Sincronização de calendário
- [Daily Questions AI](./docs/features/DAILY_QUESTIONS_AI_DRIVEN.md) - Perguntas diárias com IA
- [Journey Schema Validation](./docs/features/JOURNEY_SCHEMA_VALIDATION_COMPLETE.md) - Sistema de validação
- [Efficiency Score System](./docs/features/EFFICIENCY_SCORE_SYSTEM.md) - Gamificação e pontuação

### 🚀 Deployment & Testing
- [Deployment Guide](./docs/deployment/) - Guias de implantação
- [E2E Testing](./docs/testing/) - Testes end-to-end com Playwright
- [Migration Guide](./docs/deployment/MIGRATION_GUIDE.md) - Migrações de banco de dados

### 📦 Entregas & Sprints
- [Delivery History](./docs/delivery/) - Histórico de entregas e sprints completados

---

## 🧪 Testes

```bash
# Rodar testes E2E
npm run test:e2e

# Rodar testes em modo UI
npm run test:e2e:ui

# Rodar build de produção
npm run build
```

---

## 🎨 Design System

O projeto utiliza o **Ceramic Design System**, um sistema de design personalizado com:

- Efeitos de relevo (emboss/deboss)
- Paleta de cores neutra e acessível
- Componentes com estados interativos
- Suporte WCAG 2.1 AA

Consulte: [Ceramic Design System Guide](./docs/design/CERAMIC_DESIGN_SYSTEM_GUIDANCE.md)

---

## 🤝 Desenvolvimento

### Scripts Disponíveis

```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build
npm run test:e2e     # Testes E2E
npm run type-check   # Verificação de tipos TypeScript
```

### Estrutura de Branches

- `main` - Branch principal (produção)
- `develop` - Branch de desenvolvimento
- `feature/*` - Features em desenvolvimento
- `fix/*` - Correções de bugs

---

## 🔒 Segurança & Privacidade

AICA Life OS implementa:

- Row Level Security (RLS) em todas as tabelas Supabase
- Criptografia de dados sensíveis
- Autenticação via Supabase Auth
- Políticas de privacidade LGPD/GDPR compliant

Consulte: [Privacy & Security](./docs/security/PRIVACY_AND_SECURITY.md)

---

## 📝 Licença

[Adicionar informações de licença]

---

## 👥 Equipe

[Adicionar informações da equipe]

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte a [documentação](./docs/)
2. Verifique o [guia de setup](./SETUP_AND_DEPLOYMENT.md)
3. Entre em contato com a equipe

---

<div align="center">

**Desenvolvido com ❤️ pela equipe AICA**

</div>
