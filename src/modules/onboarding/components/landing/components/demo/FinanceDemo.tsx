import { useState } from 'react';
import { financeDemo } from '../../data/demoData';

export function FinanceDemo() {
  const [hoveredBar, setHoveredBar] = useState<{
    month: string;
    type: 'income' | 'expense';
    value: number;
  } | null>(null);

  const { months } = financeDemo;
  const maxValue = Math.max(...months.flatMap((m) => [m.income, m.expense]));

  const barHeight = (value: number) => {
    return Math.round((value / maxValue) * 128);
  };

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString('pt-BR')}`;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-center gap-6 md:gap-10">
        {months.map((m) => (
          <div key={m.month} className="flex flex-col items-center gap-1">
            {/* Bars container */}
            <div className="flex items-end gap-1.5 h-32">
              {/* Income bar */}
              <div
                className="relative w-8 md:w-10 rounded-t-lg bg-ceramic-success/80 transition-all duration-300 hover:bg-ceramic-success cursor-pointer"
                style={{ height: `${barHeight(m.income)}px` }}
                onMouseEnter={() =>
                  setHoveredBar({ month: m.month, type: 'income', value: m.income })
                }
                onMouseLeave={() => setHoveredBar(null)}
              >
                {hoveredBar?.month === m.month &&
                  hoveredBar.type === 'income' && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ceramic-text-primary text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none">
                      {formatCurrency(m.income)}
                    </div>
                  )}
              </div>

              {/* Expense bar */}
              <div
                className="relative w-8 md:w-10 rounded-t-lg bg-ceramic-error/70 transition-all duration-300 hover:bg-ceramic-error cursor-pointer"
                style={{ height: `${barHeight(m.expense)}px` }}
                onMouseEnter={() =>
                  setHoveredBar({
                    month: m.month,
                    type: 'expense',
                    value: m.expense,
                  })
                }
                onMouseLeave={() => setHoveredBar(null)}
              >
                {hoveredBar?.month === m.month &&
                  hoveredBar.type === 'expense' && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ceramic-text-primary text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none">
                      {formatCurrency(m.expense)}
                    </div>
                  )}
              </div>
            </div>

            {/* Month label */}
            <span className="text-xs font-medium text-ceramic-text-secondary">
              {m.month}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-ceramic-success/80" />
          <span className="text-[11px] text-ceramic-text-secondary">Receita</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-ceramic-error/70" />
          <span className="text-[11px] text-ceramic-text-secondary">Despesa</span>
        </div>
      </div>
    </div>
  );
}
