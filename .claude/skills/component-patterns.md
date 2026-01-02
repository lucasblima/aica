# Component Patterns Skill

Skill para padrões avançados de componentes React, incluindo compound components, performance, acessibilidade e animações.

---

## Quando Usar Esta Skill

Use quando precisar:
- Criar componentes reutilizáveis e flexíveis
- Otimizar performance de componentes
- Implementar acessibilidade (WCAG)
- Criar animações com Framer Motion
- Estruturar componentes complexos (wizard, timeline)

---

## Compound Components Pattern

### O que é?

Padrão onde componentes relacionados compartilham estado implicitamente, permitindo composição flexível.

### Implementação

```typescript
// src/components/Tabs/Tabs.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Context
interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within <Tabs>');
  }
  return context;
}

// Root Component
interface TabsProps {
  defaultTab: string;
  children: ReactNode;
  onChange?: (tab: string) => void;
}

function Tabs({ defaultTab, children, onChange }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onChange?.(tab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// Tab List
function TabList({ children }: { children: ReactNode }) {
  return (
    <div role="tablist" className="flex gap-2 border-b border-gray-200">
      {children}
    </div>
  );
}

// Tab Trigger
interface TabTriggerProps {
  value: string;
  children: ReactNode;
}

function TabTrigger({ value, children }: TabTriggerProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      onClick={() => setActiveTab(value)}
      className={`px-4 py-2 ${isActive ? 'border-b-2 border-blue-500' : ''}`}
    >
      {children}
    </button>
  );
}

// Tab Panel
interface TabPanelProps {
  value: string;
  children: ReactNode;
}

function TabPanel({ value, children }: TabPanelProps) {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === value;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      className="p-4"
    >
      {children}
    </div>
  );
}

// Export compound component
Tabs.List = TabList;
Tabs.Trigger = TabTrigger;
Tabs.Panel = TabPanel;

export { Tabs };
```

### Uso

```tsx
<Tabs defaultTab="tab1" onChange={(tab) => console.log(tab)}>
  <Tabs.List>
    <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
    <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
  </Tabs.List>

  <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
  <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
</Tabs>
```

---

## Render Props Pattern

### Implementação

```typescript
// src/components/DataFetcher/DataFetcher.tsx

import { useState, useEffect, ReactNode } from 'react';

interface DataFetcherProps<T> {
  url: string;
  children: (data: {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  }) => ReactNode;
}

export function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch failed');
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [url]);

  return <>{children({ data, isLoading, error, refetch: fetchData })}</>;
}
```

### Uso

```tsx
<DataFetcher<User[]> url="/api/users">
  {({ data, isLoading, error, refetch }) => {
    if (isLoading) return <Spinner />;
    if (error) return <Error message={error.message} onRetry={refetch} />;
    return <UserList users={data!} />;
  }}
</DataFetcher>
```

---

## Controlled vs Uncontrolled

### Componente Híbrido

```typescript
// src/components/Input/Input.tsx

import { useState, useCallback, ChangeEvent } from 'react';

interface InputProps {
  // Controlled
  value?: string;
  onChange?: (value: string) => void;
  // Uncontrolled
  defaultValue?: string;
  // Common
  placeholder?: string;
  disabled?: boolean;
}

export function Input({
  value: controlledValue,
  onChange,
  defaultValue = '',
  placeholder,
  disabled,
}: InputProps) {
  // Determinar se é controlled
  const isControlled = controlledValue !== undefined;

  // Estado interno para modo uncontrolled
  const [internalValue, setInternalValue] = useState(defaultValue);

  // Valor efetivo
  const value = isControlled ? controlledValue : internalValue;

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      if (!isControlled) {
        setInternalValue(newValue);
      }

      onChange?.(newValue);
    },
    [isControlled, onChange]
  );

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className="px-4 py-2 border rounded-lg"
    />
  );
}
```

---

## Performance Optimization

### Memoization

```typescript
// src/components/ExpensiveList/ExpensiveList.tsx

import { memo, useMemo, useCallback } from 'react';

interface Item {
  id: string;
  name: string;
  value: number;
}

interface ListItemProps {
  item: Item;
  onSelect: (id: string) => void;
}

// Memoizar item individual
const ListItem = memo(function ListItem({ item, onSelect }: ListItemProps) {
  console.log('Rendering item:', item.id);

  return (
    <div
      onClick={() => onSelect(item.id)}
      className="p-4 hover:bg-gray-100 cursor-pointer"
    >
      <h3>{item.name}</h3>
      <p>{item.value}</p>
    </div>
  );
});

interface ExpensiveListProps {
  items: Item[];
  filter: string;
  onItemSelect: (id: string) => void;
}

export function ExpensiveList({
  items,
  filter,
  onItemSelect,
}: ExpensiveListProps) {
  // Memoizar cálculos pesados
  const filteredItems = useMemo(() => {
    console.log('Filtering items...');
    return items.filter(item =>
      item.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [items, filter]);

  // Memoizar callbacks
  const handleSelect = useCallback((id: string) => {
    onItemSelect(id);
  }, [onItemSelect]);

  return (
    <div>
      {filteredItems.map(item => (
        <ListItem
          key={item.id}
          item={item}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
```

### Virtualization

```typescript
// src/components/VirtualList/VirtualList.tsx

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5, // Itens extras para render suave
  });

  return (
    <div
      ref={parentRef}
      className="h-[500px] overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Code Splitting

```typescript
// src/components/LazyComponents.tsx

import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

// Lazy load componentes pesados
const HeavyChart = lazy(() => import('./HeavyChart'));
const DataGrid = lazy(() => import('./DataGrid'));
const RichTextEditor = lazy(() => import('./RichTextEditor'));

// Wrapper com Suspense
export function LazyHeavyChart(props: any) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyChart {...props} />
    </Suspense>
  );
}

// Com preload
export function preloadHeavyChart() {
  return import('./HeavyChart');
}

// Uso: preloadHeavyChart() no hover do botão
```

---

## Accessibility (WCAG)

### Keyboard Navigation

```typescript
// src/components/Menu/Menu.tsx

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface MenuItem {
  id: string;
  label: string;
  onClick: () => void;
}

interface MenuProps {
  items: MenuItem[];
  trigger: React.ReactNode;
}

export function Menu({ items, trigger }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + items.length) % items.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        items[focusedIndex].onClick();
        setIsOpen(false);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // Focus management
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const buttons = menuRef.current.querySelectorAll('button');
      buttons[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  return (
    <div className="relative">
      <button
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          onKeyDown={handleKeyDown}
          className="absolute mt-2 bg-white shadow-lg rounded-lg"
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              role="menuitem"
              tabIndex={index === focusedIndex ? 0 : -1}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left ${
                index === focusedIndex ? 'bg-gray-100' : ''
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Screen Reader Support

```typescript
// src/components/Alert/Alert.tsx

interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  onDismiss?: () => void;
}

export function Alert({ type, message, onDismiss }: AlertProps) {
  // role="alert" para anúncios imediatos
  // aria-live="polite" para anúncios quando conveniente
  const role = type === 'error' ? 'alert' : 'status';
  const ariaLive = type === 'error' ? 'assertive' : 'polite';

  return (
    <div
      role={role}
      aria-live={ariaLive}
      className={`p-4 rounded-lg ${getAlertStyles(type)}`}
    >
      <span className="sr-only">{type}:</span>
      <p>{message}</p>

      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Fechar alerta"
          className="ml-auto"
        >
          <XIcon aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
```

### Focus Trap (Modal)

```typescript
// src/hooks/useFocusTrap.ts

import { useEffect, useRef } from 'react';

export function useFocusTrap<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const focusableElements = element.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus primeiro elemento
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }, []);

  return ref;
}

// Uso
function Modal({ children }) {
  const modalRef = useFocusTrap<HTMLDivElement>();

  return (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {children}
    </div>
  );
}
```

---

## Framer Motion Patterns

### Basic Animation

```typescript
// src/components/AnimatedCard/AnimatedCard.tsx

import { motion } from 'framer-motion';

export function AnimatedCard({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="p-6 bg-white rounded-2xl shadow-lg"
    >
      {children}
    </motion.div>
  );
}
```

### Stagger Animation

```typescript
// src/components/AnimatedList/AnimatedList.tsx

import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export function AnimatedList({ items }: { items: string[] }) {
  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((item, index) => (
        <motion.li
          key={index}
          variants={itemVariants}
          className="p-4 border-b"
        >
          {item}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

### Gesture Animations

```typescript
// src/components/DraggableCard/DraggableCard.tsx

import { motion, PanInfo } from 'framer-motion';

interface DraggableCardProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  children: React.ReactNode;
}

export function DraggableCard({
  onSwipeLeft,
  onSwipeRight,
  children,
}: DraggableCardProps) {
  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const threshold = 100;

    if (info.offset.x > threshold) {
      onSwipeRight?.();
    } else if (info.offset.x < -threshold) {
      onSwipeLeft?.();
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="p-6 bg-white rounded-2xl shadow-lg cursor-grab"
    >
      {children}
    </motion.div>
  );
}
```

### Layout Animation

```typescript
// src/components/ExpandableCard/ExpandableCard.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export function ExpandableCard({ title, content }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      layout
      onClick={() => setIsExpanded(!isExpanded)}
      className="p-4 bg-white rounded-xl cursor-pointer overflow-hidden"
    >
      <motion.h3 layout="position" className="font-semibold">
        {title}
      </motion.h3>

      <AnimatePresence>
        {isExpanded && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 text-gray-600"
          >
            {content}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

---

## Wizard/Multi-Step Pattern

### State Machine (XState-like)

```typescript
// src/components/Wizard/useWizardState.ts

import { useState, useCallback } from 'react';

interface WizardStep {
  id: string;
  title: string;
  isValid?: () => boolean;
}

interface WizardState<T> {
  currentStepIndex: number;
  currentStep: WizardStep;
  data: T;
  isFirstStep: boolean;
  isLastStep: boolean;
  goToNext: () => void;
  goToPrevious: () => void;
  goToStep: (index: number) => void;
  updateData: (updates: Partial<T>) => void;
  canGoNext: boolean;
}

export function useWizardState<T extends object>(
  steps: WizardStep[],
  initialData: T
): WizardState<T> {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [data, setData] = useState<T>(initialData);

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const canGoNext = currentStep.isValid?.() ?? true;

  const goToNext = useCallback(() => {
    if (canGoNext && !isLastStep) {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [canGoNext, isLastStep]);

  const goToPrevious = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [isFirstStep]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStepIndex(index);
    }
  }, [steps.length]);

  const updateData = useCallback((updates: Partial<T>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    currentStepIndex,
    currentStep,
    data,
    isFirstStep,
    isLastStep,
    goToNext,
    goToPrevious,
    goToStep,
    updateData,
    canGoNext,
  };
}
```

### Wizard Component

```typescript
// src/components/Wizard/Wizard.tsx

import { motion, AnimatePresence } from 'framer-motion';

interface WizardProps<T> {
  steps: WizardStep[];
  initialData: T;
  onComplete: (data: T) => void;
  renderStep: (
    step: WizardStep,
    state: WizardState<T>
  ) => React.ReactNode;
}

export function Wizard<T extends object>({
  steps,
  initialData,
  onComplete,
  renderStep,
}: WizardProps<T>) {
  const state = useWizardState(steps, initialData);

  const handleComplete = () => {
    onComplete(state.data);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${
                index <= state.currentStepIndex
                  ? 'text-blue-600'
                  : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index <= state.currentStepIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200'
                }`}
              >
                {index + 1}
              </div>
              <span className="ml-2 text-sm hidden sm:block">
                {step.title}
              </span>
            </div>
          ))}
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <motion.div
            className="h-full bg-blue-600 rounded-full"
            initial={{ width: 0 }}
            animate={{
              width: `${((state.currentStepIndex + 1) / steps.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={state.currentStep.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderStep(state.currentStep, state)}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={state.goToPrevious}
          disabled={state.isFirstStep}
          className="px-6 py-2 border rounded-lg disabled:opacity-50"
        >
          Voltar
        </button>

        {state.isLastStep ? (
          <button
            onClick={handleComplete}
            disabled={!state.canGoNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            Concluir
          </button>
        ) : (
          <button
            onClick={state.goToNext}
            disabled={!state.canGoNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            Próximo
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## Timeline Components

### Basic Timeline

```typescript
// src/components/Timeline/Timeline.tsx

import { format, eachDayOfInterval, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimelineEvent {
  id: string;
  title: string;
  date: Date;
  type: string;
}

interface TimelineProps {
  startDate: Date;
  endDate: Date;
  events: TimelineEvent[];
  onDayClick?: (date: Date) => void;
  onEventClick?: (event: TimelineEvent) => void;
}

export function Timeline({
  startDate,
  endDate,
  events,
  onDayClick,
  onEventClick,
}: TimelineProps) {
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getEventsForDay = (date: Date) =>
    events.filter(event => isSameDay(event.date, date));

  return (
    <div className="flex overflow-x-auto gap-2 pb-4">
      {days.map(day => {
        const dayEvents = getEventsForDay(day);
        const isCurrentDay = isToday(day);

        return (
          <div
            key={day.toISOString()}
            onClick={() => onDayClick?.(day)}
            className={`
              flex-shrink-0 w-24 p-3 rounded-xl cursor-pointer
              ${isCurrentDay ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50'}
            `}
          >
            <p className="text-xs text-gray-500">
              {format(day, 'EEE', { locale: ptBR })}
            </p>
            <p className="text-lg font-bold">
              {format(day, 'd')}
            </p>

            {dayEvents.length > 0 && (
              <div className="mt-2 space-y-1">
                {dayEvents.slice(0, 2).map(event => (
                  <div
                    key={event.id}
                    onClick={e => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    className="text-xs p-1 bg-white rounded truncate"
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <p className="text-xs text-gray-400">
                    +{dayEvents.length - 2} mais
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

## Testing Patterns

### Component Testing

```typescript
// src/components/Button/Button.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);

    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows loading state', () => {
    render(<Button isLoading>Click me</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });
});
```

### Hook Testing

```typescript
// src/hooks/useCounter.test.ts

import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it('initializes with custom value', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

---

## Links Úteis

- [React Patterns](https://reactpatterns.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
- [Testing Library](https://testing-library.com/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [A11y Project](https://www.a11yproject.com/)
