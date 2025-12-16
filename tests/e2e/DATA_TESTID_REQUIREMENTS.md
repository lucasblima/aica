# Data-TestID Requirements for Dashboard Ceramic Redesign

Este documento lista todos os `data-testid` atributos necessários para que os testes de responsividade funcionem corretamente.

## IdentityPassport Component

Adicione os seguintes atributos ao arquivo `src/components/IdentityPassport/IdentityPassport.tsx`:

```tsx
// Root container
<motion.div data-testid="identity-passport" className={...}>

  // Avatar area
  <motion.div data-testid="identity-passport-avatar" className="ceramic-avatar-recessed">
    <img|div data-testid="identity-passport-avatar-image" />
  </motion.div>

  // Level badge
  <motion.div data-testid="identity-passport-badge" className="ceramic-badge-gold">
  </motion.div>

  // Progress bar section
  <div data-testid="identity-passport-progress" className="flex-1 min-w-0">
    <div data-testid="identity-passport-progress-bar" className="ceramic-progress-groove">
    </div>
  </div>

  // Profile button
  <motion.button
    data-testid="identity-passport-profile-btn"
    onClick={onOpenProfile}
  >
  </motion.button>

</motion.div>
```

## VitalStatsTray Component

Adicione os seguintes atributos ao arquivo `src/components/VitalStatsTray/VitalStatsTray.tsx`:

```tsx
// Root container
<motion.div data-testid="vital-stats-tray" className={...}>
  <div className="grid grid-cols-3 gap-8">

    // Each stat item
    <motion.div data-testid="vital-stat-item vital-stat-streak" className="flex flex-col items-center text-center">
      // Icon container
      <div data-testid="vital-stat-icon vital-stat-icon-streak" className="ceramic-concave w-10 h-10">
        {icon}
      </div>

      // Stat value (the big number)
      <motion.span data-testid="vital-stat-value vital-stat-value-streak" className="ceramic-stat-counter">
        {value}
      </motion.span>

      // Stat label
      <span data-testid="vital-stat-label vital-stat-label-streak" className="ceramic-stat-label">
        {label}
      </span>
    </motion.div>

    // Second stat (moments)
    <motion.div data-testid="vital-stat-item vital-stat-moments" className="flex flex-col items-center text-center">
      <div data-testid="vital-stat-icon vital-stat-icon-moments" className="ceramic-concave w-10 h-10">
      </div>
      <motion.span data-testid="vital-stat-value vital-stat-value-moments" className="ceramic-stat-counter">
      </motion.span>
      <span data-testid="vital-stat-label vital-stat-label-moments" className="ceramic-stat-label">
      </span>
    </motion.div>

    // Third stat (reflections)
    <motion.div data-testid="vital-stat-item vital-stat-reflections" className="flex flex-col items-center text-center">
      <div data-testid="vital-stat-icon vital-stat-icon-reflections" className="ceramic-concave w-10 h-10">
      </div>
      <motion.span data-testid="vital-stat-value vital-stat-value-reflections" className="ceramic-stat-counter">
      </motion.span>
      <span data-testid="vital-stat-label vital-stat-label-reflections" className="ceramic-stat-label">
      </span>
    </motion.div>

  </div>
</motion.div>
```

## EfficiencyFlowCard Component

Adicione os seguintes atributos ao arquivo `src/components/EfficiencyFlowCard/EfficiencyFlowCard.tsx`:

```tsx
// Root card container
<motion.div data-testid="efficiency-flow-card" className={`ceramic-device pt-8 ${className}`}>

  // Header
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
      </div>
      <div>
        <h3 className="font-bold text-ceramic-text-primary">Fluxo de Eficiencia</h3>
      </div>
    </div>

    // Range selector
    <div data-testid="efficiency-range-selector" className="ceramic-trough flex p-1 gap-1">
      <motion.button
        data-testid="efficiency-range-btn efficiency-range-btn-7d"
        data-active={value === 7}
        onClick={() => onChange(7)}
      >
        7d
      </motion.button>
      <motion.button
        data-testid="efficiency-range-btn efficiency-range-btn-14d"
        data-active={value === 14}
        onClick={() => onChange(14)}
      >
        14d
      </motion.button>
      <motion.button
        data-testid="efficiency-range-btn efficiency-range-btn-30d"
        data-active={value === 30}
        onClick={() => onChange(30)}
      >
        30d
      </motion.button>
    </div>
  </div>

  // Stats row
  {stats && (
    <div data-testid="efficiency-stats-row" className="flex gap-6 mb-6">
      <div data-testid="efficiency-stat-avg" className="text-center">
        <span className="text-2xl font-black text-ceramic-text-primary">{stats.avgScore}%</span>
        <p className="text-xs text-ceramic-text-secondary">Media</p>
      </div>
      <div data-testid="efficiency-stat-max" className="text-center">
        <span className="text-2xl font-black text-ceramic-text-primary">{stats.maxScore}%</span>
        <p className="text-xs text-ceramic-text-secondary">Maximo</p>
      </div>
      <div data-testid="efficiency-stat-excellent" className="text-center">
        <span className="text-2xl font-black text-amber-600">{stats.excellentDays}</span>
        <p className="text-xs text-ceramic-text-secondary">Excelentes</p>
      </div>
    </div>
  )}

  // Chart container
  <div data-testid="efficiency-chart-container" className="w-full overflow-hidden">
    <svg data-testid="efficiency-chart" width={500} height={180} className="overflow-visible">
      {/* Chart content */}
    </svg>
  </div>

</motion.div>
```

## ProfileModal Component

Adicione os seguintes atributos ao arquivo `src/components/ProfileModal/ProfileModal.tsx`:

```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      data-testid="profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      variants={backdropVariants}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        data-testid="profile-modal"
        className="relative w-full max-w-md ceramic-card p-0 overflow-hidden"
        variants={modalVariants}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
          <h2 id="profile-modal-title" data-testid="profile-modal-title" className="text-lg font-bold">
            Minha Conta
          </h2>
          <motion.button
            data-testid="profile-modal-close"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Content */}
        <div data-testid="profile-modal-content" className="p-6 space-y-6">

          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="ceramic-avatar-recessed">
              <img|div data-testid="profile-modal-avatar" />
            </div>
            <div>
              <h3 data-testid="profile-modal-name" className="font-bold text-lg">
                {userName || 'Usuario'}
              </h3>
              <p data-testid="profile-modal-email-display" className="text-sm">
                {userEmail}
              </p>
            </div>
          </div>

          {/* Account Info */}
          <div className="ceramic-stats-tray space-y-4">
            <div data-testid="profile-modal-email" className="flex items-center gap-3">
              <Mail className="w-4 h-4" />
              <div>
                <p className="text-xs">Email</p>
                <p className="text-sm font-medium">{userEmail}</p>
              </div>
            </div>
            <div data-testid="profile-modal-date" className="flex items-center gap-3">
              <Calendar className="w-4 h-4" />
              <div>
                <p className="text-xs">Membro desde</p>
                <p className="text-sm font-medium">{formattedDate}</p>
              </div>
            </div>
            <div data-testid="profile-modal-id" className="flex items-center gap-3">
              <Shield className="w-4 h-4" />
              <div>
                <p className="text-xs">ID da Conta</p>
                <p className="text-sm font-mono">{userId.slice(0, 8)}...</p>
              </div>
            </div>
          </div>

          {/* Data Sovereignty Section */}
          <div data-testid="profile-modal-danger-zone" className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4" />
              <h4 className="text-sm font-bold uppercase">
                Soberania de Dados
              </h4>
            </div>
            <p className="text-xs mb-4">
              Voce tem controle total sobre seus dados...
            </p>

            <DangerZone
              userEmail={userEmail}
              onDeleteAccount={handleDeleteAccount}
              isDeleting={isDeleting}
            />

            {/* Delete button (inside DangerZone, but add testid) */}
            <button data-testid="profile-modal-delete-account-btn" className="...">
              Deletar Conta
            </button>

            {/* Confirmation dialog */}
            {/* Add when user clicks delete */}
            <div data-testid="profile-modal-delete-confirmation" className="...">
              {/* Confirmation content */}
            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

## Summary of Required Attributes

### IdentityPassport
- `data-testid="identity-passport"` - Root
- `data-testid="identity-passport-avatar"` - Avatar area
- `data-testid="identity-passport-avatar-image"` - Avatar image/initials
- `data-testid="identity-passport-badge"` - Level badge
- `data-testid="identity-passport-progress"` - Progress section
- `data-testid="identity-passport-progress-bar"` - Progress bar
- `data-testid="identity-passport-profile-btn"` - Profile button

### VitalStatsTray
- `data-testid="vital-stats-tray"` - Root
- `data-testid="vital-stat-item vital-stat-[streak|moments|reflections]"` - Each stat item
- `data-testid="vital-stat-icon vital-stat-icon-[streak|moments|reflections]"` - Icons
- `data-testid="vital-stat-value vital-stat-value-[streak|moments|reflections]"` - Values
- `data-testid="vital-stat-label vital-stat-label-[streak|moments|reflections]"` - Labels

### EfficiencyFlowCard
- `data-testid="efficiency-flow-card"` - Root
- `data-testid="efficiency-range-selector"` - Range button container
- `data-testid="efficiency-range-btn efficiency-range-btn-[7d|14d|30d]"` - Range buttons
- `data-testid="efficiency-stats-row"` - Stats row
- `data-testid="efficiency-stat-[avg|max|excellent]"` - Individual stats
- `data-testid="efficiency-chart-container"` - Chart container
- `data-testid="efficiency-chart"` - SVG chart element

### ProfileModal
- `data-testid="profile-modal"` - Modal root
- `data-testid="profile-modal-backdrop"` - Backdrop/overlay
- `data-testid="profile-modal-title"` - Modal title
- `data-testid="profile-modal-close"` - Close button
- `data-testid="profile-modal-content"` - Scrollable content
- `data-testid="profile-modal-avatar"` - Avatar
- `data-testid="profile-modal-name"` - User name
- `data-testid="profile-modal-email-display"` - Email display
- `data-testid="profile-modal-email"` - Email info section
- `data-testid="profile-modal-date"` - Member date section
- `data-testid="profile-modal-id"` - Account ID section
- `data-testid="profile-modal-danger-zone"` - Danger zone section
- `data-testid="profile-modal-delete-account-btn"` - Delete button
- `data-testid="profile-modal-delete-confirmation"` - Confirmation dialog

## Implementation Notes

1. **Multiple classes**: Use space-separated values for elements that appear in multiple places:
   ```tsx
   data-testid="vital-stat-item vital-stat-streak"
   ```
   This allows selecting either all items or specific ones in tests.

2. **Attribute preservation**: Ensure `data-testid` attributes are preserved during refactoring and don't interfere with CSS or functionality.

3. **Accessibility**: These attributes don't affect accessibility. Screen readers will ignore them.

4. **Testing philosophy**: Each data-testid should be unique within its context to avoid selector conflicts.

## Next Steps

After adding these attributes, run the tests with:
```bash
npm run test:e2e -- dashboard-ceramic-responsive.spec.ts
```

Check the HTML report for detailed pass/fail information:
```bash
npx playwright show-report
```
