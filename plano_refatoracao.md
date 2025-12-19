# Plano de Refatoração: Protocolo "Solo-Dev"

## 0. As Leis de Ferro
* [ ] **Branching:** Criar branches descartáveis para cada fase (ex: `refach/auth-swap`, `refach/purge-legacy`).
* [ ] **Green Build:** O projeto DEVE compilar sem erros antes de qualquer commit. Rodar `npm run build` ou `tsc` localmente.
* [ ] **Reversibilidade:** Se algo quebrar e demorar >1h para arrumar, `git reset --hard` e repense a estratégia.

## 1. Mapa de Risco e Diagnóstico
* [ ] **Ponto Crítico:** `App.tsx` (684 linhas). Gerencia sessão, roteamento e estado global de forma acoplada.
* [ ] **Lixo Tóxico:** 
    - `src/modules/podcast`: Referenciado no `App.tsx` e `src/views/PodcastCopilotView.tsx`.
    - `src/modules/atlas`: Fortemente acoplado ao `AgendaView.tsx` e `grantTaskSync.ts`.
* [ ] **Dívida Técnica:** Diversos imports diretos do Supabase em componentes de UI, dificultando testes isolados.

## 2. Ordem de Execução (Lógica de Desacoplamento Seguro)

### Fase A: Autenticação Cirúrgica (High Stakes)
*Objetivo: Migrar para `useAuth` sem quebrar o login atual.*
1. **Auditoria (Safety Net):**
   - Criar `src/components/debug/TestAuth.tsx` para validar o hook `useAuth`.
   - Adicionar temporariamente no `App.tsx` para garantir que `isAuthenticated` e `user` refletem o estado real do Supabase.
2. **Substituição (Swap):**
   - No `AppContent`, remover os `useEffect` de monitoramento de auth (linhas 156-220).
   - Substituir estados locais (`isAuthenticated`, `userId`, `userEmail`) pela desestruturação do `useAuth()`.
   - Validar se o fluxo de redirecionamento para `/landing` permanece íntegro.
3. **Limpeza:** Remover imports não utilizados em `App.tsx` (`supabase` client direto, etc).

### Fase B: O Grande Expurgo (Limpeza de Legado)
*Objetivo: Remover código morto SEM quebrar o build.*
4. **Desplugue Atlas (The Silent Killer):**
   - **AgendaView.tsx:** Remover imports de `useAtlasTasks`, `TaskCreationInput`, `TaskList`, `ProjectList`.
   - Limpar o `useMemo` de `mergedMatrixTasks` e referências ao `AtlasTask`.
   - **grantTaskSync.ts:** Desativar ou remover funções que interagem com o Atlas, garantindo que o módulo `grants` não quebre ao tentar sincronizar.
5. **Desplugue Podcast:**
   - Remover `PodcastCopilotView` e `GuestApprovalPage` do lazy loading no `App.tsx`.
   - Remover as rotas `/podcast` e `/guest-approval` do `Routes`.
6. **Quarentena (Move):**
   - Mover `src/modules/podcast` e `src/modules/atlas` para `src/_deprecated/`.
   - Rodar build final para garantir que nenhum import oculto foi esquecido.

### Fase C: Reestruturação Arquitetural
7. **Router Extraction:** 
   - Criar `src/routes/AppRouter.tsx`.
   - Mover toda a estrutura de `<Routes>` do `App.tsx` para lá.
8. **Provider Consolidation:** 
   - Criar `src/providers/AppProviders.tsx` para encapsular `NavigationProvider`, `StudioProvider` e outros.
9. **App.tsx Minimalista:**
   - Reduzir `App.tsx` para apenas ~20 linhas de orquestração de Providers e Router.
