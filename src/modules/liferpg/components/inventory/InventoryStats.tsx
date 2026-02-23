/**
 * InventoryStats — Total value, low condition alerts, expiring items.
 */

import React from 'react';

interface InventoryStatsProps {
  totalItems: number;
  totalValue: number;
  lowConditionCount: number;
  categories: string[];
  locations: string[];
}

export const InventoryStats: React.FC<InventoryStatsProps> = ({
  totalItems,
  totalValue,
  lowConditionCount,
  categories,
  locations,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-ceramic-base rounded-xl p-3 shadow-ceramic-emboss text-center">
        <div className="text-2xl font-bold text-ceramic-text-primary">{totalItems}</div>
        <div className="text-[10px] text-ceramic-text-secondary mt-0.5">Itens totais</div>
      </div>

      <div className="bg-ceramic-base rounded-xl p-3 shadow-ceramic-emboss text-center">
        <div className="text-2xl font-bold text-ceramic-text-primary">
          R${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
        </div>
        <div className="text-[10px] text-ceramic-text-secondary mt-0.5">Valor total</div>
      </div>

      {lowConditionCount > 0 && (
        <div className="bg-ceramic-error/10 rounded-xl p-3 shadow-ceramic-emboss text-center">
          <div className="text-2xl font-bold text-ceramic-error">{lowConditionCount}</div>
          <div className="text-[10px] text-ceramic-error mt-0.5">Condicao ruim</div>
        </div>
      )}

      <div className="bg-ceramic-base rounded-xl p-3 shadow-ceramic-emboss text-center">
        <div className="text-2xl font-bold text-ceramic-text-primary">{categories.length}</div>
        <div className="text-[10px] text-ceramic-text-secondary mt-0.5">Categorias</div>
      </div>

      {locations.length > 0 && (
        <div className="col-span-2 sm:col-span-4 bg-ceramic-base rounded-xl p-3 shadow-ceramic-emboss">
          <div className="text-[10px] text-ceramic-text-secondary mb-1">Locais</div>
          <div className="flex flex-wrap gap-1">
            {locations.map((loc) => (
              <span
                key={loc}
                className="text-[10px] px-2 py-0.5 rounded-full bg-ceramic-cool text-ceramic-text-primary"
              >
                {loc}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
