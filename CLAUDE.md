# Aica Life OS - Project Instructions for Claude Code

## Project Overview
Aica Life OS é uma aplicação React/TypeScript para gestão de vida pessoal, integrando múltiplos módulos:
- **Atlas** (Meu Dia): Task management com gamificação
- **Journey** (Minha Jornada): Consciousness points e momentos
- **Podcast**: Guest research e workflow de produção
- **WhatsApp**: Integration via Evolution API com analytics LGPD-compliant
- **Finance**: Processamento de extratos bancários
- **Grants**: PDF-first AI parsing de editais

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **AI:** Google Gemini API
- **Deploy:** Google Cloud Run
- **Auth:** Supabase Auth (@supabase/ssr para Cloud Run)

## Development Guidelines

### Commit Standards
- **100% Conventional Commits** obrigatório
- **Co-authorship** sempre incluir: `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`
- Exemplos: `feat(podcast):`, `fix(auth):`, `docs(journey):`

### Branch Naming
- Pattern: `feature/{descrição}-issue-{número}` ou `fix/{descrição}`
- Exemplos: `feature/whatsapp-gamification-integration-issue-16`

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Tailwind CSS (Ceramic design system)
- Functional components + hooks

### Testing
- Unit tests: Vitest
- E2E tests: Playwright
- Target coverage: >80%

## Architecture Notes

### Authentication
- Usa `@supabase/ssr` (NÃO `@supabase/supabase-js`) para Cloud Run
- PKCE flow obrigatório para stateless containers
- Cookie-based sessions (não localStorage)

### Database
- Row Level Security (RLS) em todas tabelas
- SECURITY DEFINER functions para operações privilegiadas
- Migrations via `supabase/migrations/`

### AI Integration
- Gemini API via Edge Functions (NÃO client-side)
- Rate limiting e error handling obrigatórios
- Custos otimizados: usar `gemini-1.5-flash` quando possível

## Common Issues

### Build Errors
Se houver erro de imports não resolvidos:
1. Verificar `package.json` - dependência instalada?
2. Executar `npm install`
3. Limpar cache: `rm -rf node_modules/.vite && npm run dev`

### OAuth Issues
- Client ID deve match Supabase Dashboard
- URLs permitidas: configurar em Supabase + Google OAuth Console
- Cloud Run pode ter múltiplas URLs (usar a mais recente)

## Agent Guidelines
Ver `.claude/AGENT_GUIDELINES.md` para workflow multiagente e práticas detalhadas.
Ver `.claude/WORK_QUEUE.md` para status de branches ativas.

---

**Last Updated:** 2026-01-02
**Maintainers:** Lucas Boscacci Lima + Claude Sonnet 4.5
