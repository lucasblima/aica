/**
 * AccountSelector Component
 *
 * Horizontal pill/chip selector for filtering by financial account.
 */

import React from 'react';
import type { FinanceAccount } from '../types';

interface AccountSelectorProps {
  accounts: FinanceAccount[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  accounts,
  selectedId,
  onSelect,
}) => {
  const activeAccounts = accounts.filter((a) => a.is_active);

  if (activeAccounts.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {/* "Todas" option */}
      <button
        onClick={() => onSelect(null)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
          whitespace-nowrap transition-all duration-200 flex-shrink-0
          ${
            selectedId === null
              ? 'bg-ceramic-accent text-white shadow-sm'
              : 'ceramic-inset text-ceramic-text-secondary hover:text-ceramic-text-primary'
          }
        `}
      >
        Todas
      </button>

      {activeAccounts.map((account) => (
        <button
          key={account.id}
          onClick={() => onSelect(account.id)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
            whitespace-nowrap transition-all duration-200 flex-shrink-0
            ${
              selectedId === account.id
                ? 'bg-ceramic-accent text-white shadow-sm'
                : 'ceramic-inset text-ceramic-text-secondary hover:text-ceramic-text-primary'
            }
          `}
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: account.color }}
          />
          <span>{account.account_name}</span>
          {account.bank_name && (
            <span className={`text-[10px] ${
              selectedId === account.id ? 'text-white/70' : 'text-ceramic-text-secondary'
            }`}>
              {account.bank_name}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default AccountSelector;
