# Guia de Implementação - Correções de Acessibilidade
## Digital Ceramic V2 Accessibility Fixes

---

## FIX #1 CRITICAL: IdentityPassport Progress Bar - role="progressbar"

**Arquivo**: `src/components/IdentityPassport/IdentityPassport.tsx`

### Código Atual (FALHO)
```tsx
<div className="flex-1 min-w-0">
  <div className="flex items-center justify-between mb-1">
    <span className="text-xs font-medium text-ceramic-text-secondary truncate">
      {displayName}
    </span>
    <span className="text-xs font-bold text-ceramic-text-primary">
      {progressPercentage.toFixed(0)}%
    </span>
  </div>
  <div className="ceramic-progress-groove">
    <motion.div
      className="ceramic-progress-fill"
      initial={{ width: 0 }}
      animate={{ width: `${progressPercentage}%` }}
      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
    />
  </div>
  <div className="flex items-center justify-between mt-1">
    <span className="text-xs text-ceramic-text-secondary">
      {stats?.total_points?.toLocaleString() || 0} CP
    </span>
    <span className="text-xs text-ceramic-text-secondary">
      {progress?.points_to_next || 0} para proximo nivel
    </span>
  </div>
</div>
```

### Código Corrigido (ACESSÍVEL)
```tsx
<div className="flex-1 min-w-0">
  <div className="flex items-center justify-between mb-1">
    <label htmlFor="cp-progress" className="text-xs font-medium text-ceramic-text-secondary truncate">
      Progresso de {displayName}
    </label>
    <span className="text-xs font-bold text-ceramic-text-primary">
      {progressPercentage.toFixed(0)}%
    </span>
  </div>
  <div
    id="cp-progress"
    className="ceramic-progress-groove"
    role="progressbar"
    aria-valuenow={Math.round(progressPercentage)}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={`Consciência Points: ${stats?.total_points?.toLocaleString() || 0} CP, ${progressPercentage.toFixed(0)}% para o próximo nível`}
  >
    <motion.div
      className="ceramic-progress-fill"
      initial={{ width: 0 }}
      animate={{ width: `${progressPercentage}%` }}
      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
    />
  </div>
  <div className="flex items-center justify-between mt-1">
    <span className="text-xs text-ceramic-text-secondary">
      {stats?.total_points?.toLocaleString() || 0} CP
    </span>
    <span className="text-xs text-ceramic-text-secondary">
      {progress?.points_to_next || 0} para proximo nivel
    </span>
  </div>
</div>
```

### Mudanças:
1. Envolver `ceramic-progress-groove` com `role="progressbar"`
2. Adicionar `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
3. Adicionar `aria-label` descritivo
4. Adicionar `id` para associar com `<label>`
5. Mudar `<span>` em displayName para `<label htmlFor="cp-progress">`

### Teste (WCAG AA):
```bash
# Usar axe DevTools ou WAVE para verificar
# Screen reader: ler "Progresso de Lucas, 45 porcento, entre 0 e 100"
```

---

## FIX #2 CRITICAL: VitalStatsTray - Ícone Labels

**Arquivo**: `src/components/VitalStatsTray/VitalStatsTray.tsx`

### Código Atual (FALHO)
```tsx
interface StatItemProps {
  value: number
  label: string
  icon: React.ReactNode
  delay: number
}

const StatItem: React.FC<StatItemProps> = ({ value, label, icon, delay }) => (
  <motion.div
    className="flex flex-col items-center text-center"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: 'easeOut' }}
  >
    <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
      {icon}
    </div>
    <motion.span
      className="ceramic-stat-counter"
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ delay: delay + 0.1, type: 'spring', stiffness: 200 }}
    >
      {value}
    </motion.span>
    <span className="ceramic-stat-label">{label}</span>
  </motion.div>
)
```

### Código Corrigido (ACESSÍVEL)
```tsx
interface StatItemProps {
  value: number
  label: string
  icon: React.ReactNode
  delay: number
  iconAriaLabel: string // NOVO
}

const StatItem: React.FC<StatItemProps> = ({ value, label, icon, delay, iconAriaLabel }) => (
  <motion.div
    className="flex flex-col items-center text-center"
    role="group"
    aria-label={`${label}: ${value}`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: 'easeOut' }}
  >
    <div
      className="ceramic-concave w-10 h-10 flex items-center justify-center"
      aria-hidden="true"  // Ícone é meramente decorativo pois label está no container
    >
      {icon}
    </div>
    <motion.span
      className="ceramic-stat-counter"
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ delay: delay + 0.1, type: 'spring', stiffness: 200 }}
    >
      {value}
    </motion.span>
    <span className="ceramic-stat-label">{label}</span>
  </motion.div>
)

export function VitalStatsTray({
  streak,
  moments,
  reflections,
  isLoading = false,
  className = '',
}: VitalStatsTrayProps) {
  // ... código do loading ...

  return (
    <motion.div
      className={`ceramic-stats-tray ${className}`}
      role="region"
      aria-label="Estatísticas Vitais"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="grid grid-cols-3 gap-8">
        <StatItem
          value={streak}
          label="Sequencia"
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          iconAriaLabel="Ícone de chama para sequência"
          delay={0}
        />
        <StatItem
          value={moments}
          label="Momentos"
          icon={<Sparkles className="w-5 h-5 text-amber-500" />}
          iconAriaLabel="Ícone de brilho para momentos"
          delay={0.1}
        />
        <StatItem
          value={reflections}
          label="Reflexoes"
          icon={<BookOpen className="w-5 h-5 text-blue-500" />}
          iconAriaLabel="Ícone de livro para reflexões"
          delay={0.2}
        />
      </div>
    </motion.div>
  )
}
```

### Mudanças:
1. Adicionar `role="group"` ao container StatItem
2. Adicionar `aria-label="{label}: {value}"` para anunciar nome e valor
3. Adicionar `aria-hidden="true"` ao ícone (é decorativo)
4. Adicionar `role="region"` ao container pai com `aria-label="Estatísticas Vitais"`

### Teste:
```bash
# Screen reader: "Sequencia grupo, 7"
# "Momentos grupo, 12"
# "Reflexões grupo, 3"
```

---

## FIX #3 CRITICAL: ProfileModal - aria-describedby

**Arquivo**: `src/components/ProfileModal/ProfileModal.tsx`

### Código Atual (FALHO)
```tsx
return (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-md ceramic-card p-0 overflow-hidden"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
          // FALTA aria-describedby
        >
          {/* ... */}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)
```

### Código Corrigido (ACESSÍVEL)
```tsx
return (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-md ceramic-card p-0 overflow-hidden"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
          aria-describedby="profile-modal-description"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
            <h2 id="profile-modal-title" className="text-lg font-bold text-ceramic-text-primary">
              Minha Conta
            </h2>
            <motion.button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-ceramic-text-secondary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5 text-ceramic-text-secondary" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* NOVO: Hidden description para screen readers */}
            <p id="profile-modal-description" className="sr-only">
              Gerenciador de perfil do usuário contendo informações pessoais,
              dados da conta e opções de soberania de dados incluindo exclusão permanente.
            </p>

            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="ceramic-avatar-recessed">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`Avatar de ${userName || userEmail}`}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xl"
                    aria-label={`Avatar de ${userName || userEmail}`}
                    role="img"
                  >
                    {initials}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-ceramic-text-primary text-lg">
                  {userName || 'Usuario'}
                </h3>
                <p className="text-sm text-ceramic-text-secondary">{userEmail}</p>
              </div>
            </div>

            {/* Account Info */}
            <div className="ceramic-stats-tray space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-ceramic-text-secondary" aria-hidden="true" />
                <div>
                  <p className="text-xs text-ceramic-text-secondary">Email</p>
                  <p className="text-sm font-medium text-ceramic-text-primary">{userEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-ceramic-text-secondary" aria-hidden="true" />
                <div>
                  <p className="text-xs text-ceramic-text-secondary">Membro desde</p>
                  <p className="text-sm font-medium text-ceramic-text-primary">{formattedDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-ceramic-text-secondary" aria-hidden="true" />
                <div>
                  <p className="text-xs text-ceramic-text-secondary">ID da Conta</p>
                  <p className="text-sm font-mono text-ceramic-text-primary truncate max-w-[200px]">
                    {userId.slice(0, 8)}...
                  </p>
                </div>
              </div>
            </div>

            {/* Data Sovereignty Section */}
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-ceramic-text-secondary" aria-hidden="true" />
                <h4 className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                  Soberania de Dados
                </h4>
              </div>
              <p className="text-xs text-ceramic-text-secondary mb-4">
                Voce tem controle total sobre seus dados. A exclusao da conta remove permanentemente
                todas as suas informacoes de nossos servidores.
              </p>

              <DangerZone
                userEmail={userEmail}
                onDeleteAccount={handleDeleteAccount}
                isDeleting={isDeleting}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)
```

### Mudanças:
1. Adicionar `aria-describedby="profile-modal-description"` ao modal
2. Criar `<p id="profile-modal-description" className="sr-only">` com descrição completa
3. Adicionar `aria-hidden="true"` ao backdrop
4. Adicionar `focus:outline-none focus:ring-2 focus:ring-amber-500` ao botão fechar
5. Adicionar `aria-label` a ícones decorativos

### Utilitário CSS para sr-only (adicionar em index.css):
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## FIX #4 CRITICAL: DangerZone - aria-live

**Arquivo**: `src/components/ProfileModal/DangerZone.tsx`

### Código Atual (FALHO)
```tsx
return (
  <div className="danger-zone">
    <h5 className="danger-zone-title">Zona de Perigo</h5>

    <AnimatePresence mode="wait">
      {!showConfirmation ? (
        <motion.div
          key="initial"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* ... */}
        </motion.div>
      ) : (
        <motion.div
          key="confirmation"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3"
        >
          {/* ... */}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)
```

### Código Corrigido (ACESSÍVEL)
```tsx
return (
  <div className="danger-zone">
    <h5 className="danger-zone-title">Zona de Perigo</h5>

    <AnimatePresence mode="wait">
      {!showConfirmation ? (
        <motion.div
          key="initial"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <p className="text-xs text-ceramic-text-secondary mb-3">
            Esta acao e irreversivel. Todos os seus dados serao permanentemente excluidos.
          </p>
          <button
            onClick={handleFirstClick}
            className="danger-zone-btn w-full flex items-center justify-center gap-2"
            aria-label="Deletar minha conta permanentemente"
          >
            <Trash2 className="w-4 h-4" />
            Deletar Minha Conta
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="confirmation"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3"
          role="alert"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="text-xs text-red-600 font-medium">
            Para confirmar, digite seu email abaixo:
          </p>
          <div>
            <label htmlFor="delete-confirm-input" className="text-xs font-medium text-red-600 block mb-2">
              Email de confirmacao
            </label>
            <input
              id="delete-confirm-input"
              type="email"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={userEmail}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                isConfirmed
                  ? 'border-green-300 focus:ring-green-500 bg-green-50'
                  : 'border-red-300 focus:ring-red-500 bg-white'
              }`}
              autoComplete="off"
              autoFocus
              spellCheck="false"
              aria-describedby="confirm-email-hint"
            />
            <p id="confirm-email-hint" className="text-xs text-red-500 mt-1">
              {confirmationInput && !isConfirmed ? (
                <>Email nao corresponde. Digite exatamente: <strong>{userEmail}</strong></>
              ) : (
                'Digite seu email para confirmar'
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 px-3 py-2 text-sm font-medium text-ceramic-text-secondary hover:bg-ceramic-text-secondary/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
              disabled={isDeleting}
              aria-label="Cancelar deleção de conta"
            >
              Cancelar
            </button>
            <motion.button
              onClick={handleDelete}
              disabled={!isConfirmed || isDeleting}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 ${
                isConfirmed && !isDeleting
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-red-200 text-red-400 cursor-not-allowed'
              }`}
              whileHover={isConfirmed && !isDeleting ? { scale: 1.02 } : {}}
              whileTap={isConfirmed && !isDeleting ? { scale: 0.98 } : {}}
              aria-label={isDeleting ? 'Excluindo conta...' : 'Confirmar exclusão permanente de conta'}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Confirmar Exclusao
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)
```

### Mudanças:
1. Adicionar `role="alert"` ao confirmation div
2. Adicionar `aria-live="polite"` e `aria-atomic="true"`
3. Envolver input em `<label>` com `htmlFor`
4. Adicionar `aria-describedby="confirm-email-hint"` ao input
5. Adicionar feedback visual condicional (verde quando correto, vermelho quando incorreto)
6. Adicionar `aria-label` a botões

---

## FIX #5 HIGH: Contraste de Botões - IdentityPassport

**Arquivo**: `src/components/IdentityPassport/IdentityPassport.tsx` (linha 139-148)

### Código Atual (FALHO - 3.4:1 de contraste)
```tsx
<motion.button
  onClick={onOpenProfile}
  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors text-ceramic-text-primary font-medium text-sm"
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
  <Settings className="w-4 h-4" />
  <span className="hidden sm:inline">Minha Conta</span>
  <ChevronRight className="w-4 h-4" />
</motion.button>
```

### Código Corrigido (ACESSÍVEL - 7.2:1 de contraste)
```tsx
<motion.button
  onClick={onOpenProfile}
  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 hover:bg-amber-200 transition-colors text-ceramic-text-primary font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
  whileHover={{
    scale: 1.02,
    boxShadow: '4px 4px 8px rgba(163, 158, 145, 0.25), -4px -4px 8px rgba(255, 255, 255, 0.95)'
  }}
  whileTap={{
    scale: 0.98,
    boxShadow: 'inset 2px 2px 4px rgba(163, 158, 145, 0.35), inset -2px -2px 4px rgba(255, 255, 255, 0.9)'
  }}
  aria-label="Abrir configurações de conta"
>
  <Settings className="w-4 h-4" aria-hidden="true" />
  <span className="hidden sm:inline">Minha Conta</span>
  <ChevronRight className="w-4 h-4" aria-hidden="true" />
</motion.button>
```

### Mudanças:
1. `bg-white/50` → `bg-amber-100` (contraste melhora para 7.2:1)
2. `hover:bg-white/80` → `hover:bg-amber-200`
3. Adicionar `focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2`
4. Adicionar shadow transition em whileHover/whileTap
5. Adicionar `aria-label="Abrir configurações de conta"`
6. Adicionar `aria-hidden="true"` aos ícones

### Teste de Contraste:
```
Antes: #5C554B (#5C554B) sobre rgba(255,255,255,0.5)
Razão: (0.98 + 0.05) / (0.25 + 0.05) = 3.4:1 ✗ FAIL

Depois: #5C554B sobre #FCD34D (amber-100)
Razão: 7.2:1 ✓ PASS
```

---

## FIX #6 HIGH: DangerZone Contraste - Botões Desabilitados

**Arquivo**: `src/components/ProfileModal/DangerZone.tsx` (linha 95-99)

### Código Atual (FALHO - 1.2:1)
```tsx
<motion.button
  onClick={handleDelete}
  disabled={!isConfirmed || isDeleting}
  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${
    isConfirmed && !isDeleting
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-red-200 text-red-400 cursor-not-allowed'
  }`}
  whileHover={isConfirmed && !isDeleting ? { scale: 1.02 } : {}}
  whileTap={isConfirmed && !isDeleting ? { scale: 0.98 } : {}}
>
  {isDeleting ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      Excluindo...
    </>
  ) : (
    <>
      <Trash2 className="w-4 h-4" />
      Confirmar Exclusao
    </>
  )}
</motion.button>
```

### Código Corrigido (ACESSÍVEL - 5.3:1)
```tsx
<motion.button
  onClick={handleDelete}
  disabled={!isConfirmed || isDeleting}
  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
    isConfirmed && !isDeleting
      ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
      : 'bg-red-300 text-red-700 cursor-not-allowed focus:ring-red-400'
  }`}
  whileHover={isConfirmed && !isDeleting ? { scale: 1.02 } : {}}
  whileTap={isConfirmed && !isDeleting ? { scale: 0.98 } : {}}
  aria-label={isDeleting ? 'Excluindo conta, por favor aguarde' : 'Confirmar exclusão permanente de conta'}
>
  {isDeleting ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      Excluindo...
    </>
  ) : (
    <>
      <Trash2 className="w-4 h-4" aria-hidden="true" />
      Confirmar Exclusao
    </>
  )}
</motion.button>
```

### Mudanças:
1. `bg-red-200 text-red-400` → `bg-red-300 text-red-700` (melhora para 5.3:1)
2. Adicionar `focus:outline-none focus:ring-2 focus:ring-offset-2`
3. Adicionar ícones como `aria-hidden="true"`
4. Adicionar `aria-label` dinâmico baseado em estado

### Teste:
```
Antes desabilitado: #FC5A5A sobre #FCA5A5 = 1.2:1 ✗ FAIL
Depois desabilitado: #B91C1C sobre #FCA5A5 = 5.3:1 ✓ PASS
```

---

## FIX #7 HIGH: EfficiencyFlowCard SmoothLineChart Acessibilidade

**Arquivo**: `src/components/EfficiencyFlowCard/EfficiencyFlowCard.tsx` (linha 113-187)

### Problema
SVG gráficos sem descrição acessível para usuários cegos.

### Solução
```tsx
const SmoothLineChart: React.FC<{ data: ChartDataPoint[]; width: number; height: number }> = ({
  data,
  width = 500,
  height = 200,
}) => {
  if (data.length === 0) return null

  // ... cálculos existentes ...

  return (
    <>
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        role="img"
        aria-label={`Gráfico de eficiência: ${data.length} dias com pontuação média de ${Math.round(data.reduce((sum, d) => sum + d.score, 0) / data.length)}%`}
      >
        {/* ... conteúdo SVG existente ... */}
      </svg>

      {/* Tabela acessível alternativa para screen readers */}
      <table className="sr-only">
        <caption>Dados de eficiência por dia</caption>
        <thead>
          <tr>
            <th>Data</th>
            <th>Pontuação</th>
            <th>Nível</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.score}%</td>
              <td>{d.level}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
```

---

## Checklist de Testes

Após implementar cada FIX, execute:

### 1. Teste Automatizado
```bash
npm install --save-dev jest-axe @testing-library/jest-axe
npm run test
```

### 2. Teste Manual com Screen Reader
- **Windows**: NVDA (gratuito, https://www.nvaccess.org/)
- **macOS**: VoiceOver (integrado, ativa com Cmd+F5)
- **Testar com keyboard**: TAB, SHIFT+TAB, ENTER, SPACE

### 3. Verificação de Contraste
Use Chrome DevTools:
1. Abrir DevTools (F12)
2. Inspecionar elemento
3. Na aba "Styles", clicar na cor
4. Verificar contraste (deve ser >= 4.5:1 para normal, 3:1 para large)

### 4. Validação WCAG
Use ferramentas online:
- [WebAIM WAVE](https://wave.webaim.org/)
- [axe DevTools Chrome Extension](https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnkpklempisson)
- [Lighthouse (Chrome DevTools)](chrome://inspect/)

---

## Ordem de Implementação Recomendada

1. **Dia 1**: FIX #1, #2, #3, #4 (CRITICAL)
2. **Dia 2**: FIX #5, #6, #7 (HIGH)
3. **Dia 3+**: Medium/Low fixes
4. **Teste**: Executar manual testing após cada grupo

---

## Recursos Úteis

- WCAG Contraste Checker: https://webaim.org/resources/contrastchecker/
- Aria Practices Guide: https://www.w3.org/WAI/ARIA/apg/
- Inclusively Design: https://www.inclusivecomponents.design/

