# Deployment Checklist - Guest Identification Wizard (Staging)

## Pre-Deployment (24 horas antes)

### Code Quality
- [ ] Todos os testes E2E passando
- [ ] TypeScript compilation sem erros (`npm run build`)
- [ ] Linter limpo (`npm run lint`)
- [ ] Code review aprovado (GitHub PR)
- [ ] Não há console.logs ou debug code
- [ ] Não há TODOs ou FIXMEs críticos
- [ ] Dependências atualizadas (verificar vulnerabilidades com `npm audit`)

### Database
- [ ] Backup do banco de dados feito
- [ ] Migrations testadas localmente
- [ ] Script de migration validado: `supabase/migrations/20241210000000_add_guest_contact_fields.sql`
- [ ] RLS policies validadas
- [ ] Índices criados e otimizados
- [ ] Verificar compatibilidade com dados existentes
- [ ] Nenhum dado órfão após migration

### Documentation
- [ ] README.md atualizado
- [ ] docs/podcast/ARCHITECTURE.md atualizado
- [ ] API docs atualizados (se aplicável)
- [ ] Changelog atualizado com novas features
- [ ] Team notificado sobre mudanças (Slack/Email)

---

## Deployment Phase

### 1. Database Migration (15 min)

#### Validação Pré-Migration
```bash
# Conectar ao projeto staging
supabase link --project-ref <staging-project-ref>

# Dry run para verificar mudanças
supabase db push --dry-run --linked

# Verificar status atual
supabase db remote commit pull
```

#### Aplicar Migration
```bash
# Backup automático (verificar se está habilitado)
# Aplicar migrations em staging
supabase db push --linked

# Verificar logs
supabase functions logs
```

#### Validações Pós-Migration
- [ ] Colunas `guest_phone` e `guest_email` criadas na tabela `episodes`
- [ ] Índices criados corretamente:
  - `idx_episodes_guest_phone`
  - `idx_episodes_guest_email`
- [ ] RLS policies ativas e funcionando
- [ ] Constraints aplicadas (NULL permitido)
- [ ] Nenhum erro de constraint ou foreign key
- [ ] Query performance aceitável (testar SELECT com novas colunas)

#### Teste de Integridade
```sql
-- Verificar estrutura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'episodes'
  AND column_name IN ('guest_phone', 'guest_email');

-- Verificar RLS
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'episodes';

-- Testar insert
INSERT INTO episodes (user_id, guest_name, guest_phone, guest_email)
VALUES (auth.uid(), 'Test Guest', '+5511999999999', 'test@example.com');
```

### 2. Build & Deploy (10 min)

#### Pre-Build Validation
```bash
# Limpar cache
rm -rf node_modules/.vite
rm -rf dist

# Reinstalar dependências (garantir consistência)
npm ci

# Verificar TypeScript
npx tsc --noEmit

# Build local
npm run build
```

#### Build Validations
- [ ] Build completo sem erros
- [ ] Sem warnings críticos
- [ ] Bundle size aceitável (verificar `dist/` folder)
- [ ] Source maps gerados (para debug)

#### Deploy to Staging
```bash
# Commit final (se houver ajustes)
git add .
git commit -m "chore: Pre-deployment validation for guest identification wizard"

# Deploy via CI/CD ou manual
git push origin main

# OU deploy direto para staging branch
git push origin main:staging
```

#### Deployment Validations
- [ ] Deployment logs limpos (Vercel/Netlify dashboard)
- [ ] Build bem-sucedido na plataforma
- [ ] Environment variables corretas em staging
- [ ] App inicia sem erros 500
- [ ] Nenhum erro de hydration

### 3. Post-Deployment Tests (30 min após deploy)

#### Health Checks (5 min)
- [ ] App carrega (homepage): `https://staging.yourdomain.com`
- [ ] API endpoints respondendo (Network tab)
- [ ] Database conectado (verificar queries no Supabase)
- [ ] Authentication funcionando (login/logout)
- [ ] Roteamento funcionando (navegação entre páginas)
- [ ] Assets carregando (imagens, CSS, JS)

#### Feature Tests - Guest Identification Wizard (15 min)

##### Acesso ao Wizard
- [ ] Biblioteca de podcasts carrega
- [ ] Dashboard carrega sem erros
- [ ] Botão "Criar Episódio" visível e clicável
- [ ] Wizard modal abre corretamente
- [ ] Animações funcionando suavemente

##### Step 0 - Seleção de Tipo
- [ ] Step 0 (seleção tipo) renderiza
- [ ] Cards "Figura Pública" e "Contato Direto" visíveis
- [ ] Hover states funcionando
- [ ] Seleção atualiza estado
- [ ] Botão "Continuar" habilitado após seleção

##### Step 1a - Public Figure Flow
- [ ] Input de nome renderiza
- [ ] Input de referência renderiza
- [ ] Botão "Buscar Perfil" funcional
- [ ] Loading state durante busca
- [ ] Resultados da busca AI aparecem
- [ ] Perfis listados corretamente
- [ ] Seleção de perfil funciona
- [ ] Preview do perfil selecionado

##### Step 1b - Common Person Flow
- [ ] Formulário manual renderiza (`GuestManualForm`)
- [ ] Input de nome funcional
- [ ] Input de telefone com máscara
- [ ] Input de email com validação
- [ ] Validação em tempo real funciona
- [ ] Mensagens de erro aparecem corretamente
- [ ] Botão "Continuar" habilitado quando válido

##### Step 3 - Detalhes do Episódio
- [ ] Step 3 renderiza
- [ ] Informações do guest preenchidas (read-only)
- [ ] Campos de episódio (título, descrição, etc.)
- [ ] Preview de pauta gerada
- [ ] Botão "Criar Episódio" funcional

##### Criação e Persistência
- [ ] Episódio criado no banco de dados
- [ ] `user_id` foi salvo corretamente
- [ ] `guest_phone` foi salvo (fluxo common person)
- [ ] `guest_email` foi salvo (fluxo common person)
- [ ] `guest_name` foi salvo
- [ ] `guest_bio` foi salvo (fluxo public figure)
- [ ] Episódio aparece na lista de episódios
- [ ] Modal fecha após criação bem-sucedida
- [ ] Mensagem de sucesso exibida

#### Data Integrity (5 min)
- [ ] RLS policies funcionando (usuário só vê seus episódios)
- [ ] Criar episódio com User A e verificar que User B não vê
- [ ] Nenhum episódio órfão (`user_id` sempre preenchido)
- [ ] Foreign keys respeitadas
- [ ] Timestamps (`created_at`, `updated_at`) corretos

#### Performance (5 min)
- [ ] Wizard abre em < 2s
- [ ] Form valida em tempo real sem lag
- [ ] Busca AI retorna em < 5s
- [ ] Episódio criado em < 5s
- [ ] Sem memory leaks (Chrome DevTools Memory tab)
- [ ] Sem re-renders desnecessários (React DevTools Profiler)
- [ ] Bundle size aceitável (< 500KB gzipped para chunk do wizard)

#### Error Handling
- [ ] Erro de rede tratado graciosamente
- [ ] Erro de autenticação redireciona para login
- [ ] Erro de validação mostra mensagens claras
- [ ] Erro de criação mostra toast/notification
- [ ] Logs de erro enviados (Sentry/monitoring)

---

## Rollback Plan

### Critérios para Rollback
- Erro crítico que impede uso do wizard
- Perda de dados
- Bug de segurança (RLS bypass)
- Performance degradada (> 10s para criar episódio)
- Erro 500 em > 10% das requisições

### Rollback Procedure

#### 1. Reverter Código (5 min)
```bash
# Identificar commit a reverter
git log --oneline -10

# Reverter commit específico
git revert <commit-hash>

# OU reverter múltiplos commits
git revert <commit-hash-1>..<commit-hash-2>

# Push para staging
git push origin main:staging

# Verificar deploy automático ou trigger manualmente
```

#### 2. Reverter Database (SE NECESSÁRIO - 10 min)
```bash
# OPÇÃO 1: Reset completo (CUIDADO: apaga dados!)
# Apenas em emergência
supabase db reset --linked

# OPÇÃO 2: Migration down (preferível)
# Criar migration de reversão
supabase migration new rollback_guest_contact_fields

# Editar migration:
# DROP INDEX IF EXISTS idx_episodes_guest_phone;
# DROP INDEX IF EXISTS idx_episodes_guest_email;
# ALTER TABLE episodes DROP COLUMN IF EXISTS guest_phone;
# ALTER TABLE episodes DROP COLUMN IF EXISTS guest_email;

# Aplicar
supabase db push --linked

# OPÇÃO 3: Restaurar backup
# Via Supabase Dashboard > Database > Backups
# Selecionar backup pré-deployment
```

#### 3. Verificar Rollback (5 min)
- [ ] App carrega normalmente
- [ ] Wizard antigo funciona (se aplicável)
- [ ] Nenhum erro 500
- [ ] Database consistente

#### 4. Comunicação
- [ ] Notificar team via Slack/Email
- [ ] Documentar causa do rollback
- [ ] Criar postmortem (docs/postmortems/)
- [ ] Planejar correção

### Sign-off de Rollback
- [ ] Tech Lead aprova: ________ (nome)
- [ ] DevOps confirma: ________ (nome)
- [ ] Product Owner notificado: ________ (nome)

---

## Post-Deploy Monitoring (24h)

### Logs e Monitoramento (verificar a cada 2h nas primeiras 6h)

#### Application Logs
- [ ] Nenhum erro 500 relacionado ao wizard
- [ ] Nenhuma falha de RLS
- [ ] Nenhuma falha de database connection
- [ ] Nenhum erro de TypeScript/runtime
- [ ] Logs estruturados corretamente

#### Database Logs (Supabase Dashboard)
- [ ] Query performance aceitável (< 100ms para INSERTs)
- [ ] Nenhum deadlock
- [ ] Nenhum erro de constraint
- [ ] Connection pool saudável

#### Error Tracking (Sentry/similar)
- [ ] Error rate < 5%
- [ ] Nenhum erro crítico (severity: high)
- [ ] Stack traces legíveis
- [ ] Source maps funcionando

### Metrics e Analytics

#### Usage Metrics
- [ ] Wizard completion rate > 0% (pelo menos 1 episódio criado)
- [ ] Wizard abandonment rate < 50%
- [ ] Common person flow usado (verificar guest_phone/email no DB)
- [ ] Public figure flow usado

#### Performance Metrics
- [ ] Response time médio < 2s (wizard load)
- [ ] Response time p95 < 5s
- [ ] Database query time < 100ms
- [ ] Nenhum timeout

#### Business Metrics
- [ ] Episódios criados com sucesso
- [ ] Taxa de erro de criação < 5%
- [ ] Distribuição entre public figure / common person

### User Feedback

#### Internal Testing
- [ ] Team fez teste manual em staging
- [ ] QA aprovou funcionalidade
- [ ] Product Owner validou UX
- [ ] Nenhum bug crítico encontrado
- [ ] Feedback documentado

#### Feedback Collection
- [ ] Criar canal de feedback (Slack #staging-feedback)
- [ ] Documentar issues encontradas
- [ ] Priorizar fixes para produção

---

## Sign-Off Final

### Deployment Approval

- [ ] **Tech Lead**: ________ (assinatura/nome)
  - Data/Hora: __________
  - Notas: ________________________________________

- [ ] **QA Engineer**: ________ (assinatura/nome)
  - Data/Hora: __________
  - Testes executados: ________________________________________

- [ ] **Product Owner**: ________ (assinatura/nome)
  - Data/Hora: __________
  - Aprovação para Production: ☐ Sim ☐ Não ☐ Pendente

### Status Final
- ☐ ✅ Aprovado para Production
- ☐ ⚠️ Aprovado com ressalvas (documentar abaixo)
- ☐ ❌ Não aprovado (necessário rollback)

---

## Notes & Observations

### Deployment Notes
```
Data: __________
Hora início: __________
Hora fim: __________
Duração total: __________

Issues encontradas:
-

Workarounds aplicados:
-

Performance observations:
-

Next steps:
-
```

### Lessons Learned
```
O que funcionou bem:
-

O que pode melhorar:
-

Ações para próximo deployment:
-
```

---

## Appendix

### Useful Commands

#### Database
```bash
# Connect to staging DB
supabase link --project-ref <staging-ref>

# Check migration status
supabase migration list

# Execute SQL
supabase db execute --file query.sql
```

#### Debugging
```bash
# Check build locally
npm run build && npm run preview

# Check TypeScript
npx tsc --noEmit

# Analyze bundle
npm run build -- --analyze
```

#### Monitoring
```bash
# Tail logs (if using Vercel)
vercel logs <deployment-url> --follow

# Check Supabase logs
supabase functions logs --tail
```

### Emergency Contacts
- **Tech Lead**: [nome] ([telefone/Slack])
- **DevOps**: [nome] ([telefone/Slack])
- **Product Owner**: [nome] ([email/Slack])
- **On-Call Engineer**: [telefone/Slack]

### Links
- Staging URL: https://staging.yourdomain.com
- Supabase Dashboard: https://app.supabase.com/project/<project-ref>
- CI/CD Pipeline: [link]
- Monitoring Dashboard: [link]
- Error Tracking: [link]
