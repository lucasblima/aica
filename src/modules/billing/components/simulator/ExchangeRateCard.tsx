import { ArrowUpRight, ArrowDownRight, RefreshCw, DollarSign } from 'lucide-react';
import type { ExchangeRateData } from './useExchangeRate';

interface ExchangeRateCardProps {
  data: ExchangeRateData | null;
  isLoading: boolean;
  error: string | null;
  onApplyRate?: (rate: number) => void;
  currentSimRate?: number;
}

export function ExchangeRateCard({ data, isLoading, error, onApplyRate, currentSimRate }: ExchangeRateCardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 bg-ceramic-base border border-ceramic-border rounded-xl px-4 py-3 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-ceramic-cool" />
        <div className="space-y-1.5">
          <div className="h-4 w-28 bg-ceramic-cool rounded" />
          <div className="h-3 w-20 bg-ceramic-cool rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-3 bg-ceramic-base border border-ceramic-border rounded-xl px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-ceramic-cool flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-ceramic-text-secondary" />
        </div>
        <div>
          <div className="text-sm text-ceramic-text-secondary">Cotacao indisponivel</div>
          <div className="text-xs text-ceramic-text-secondary">Usando valor padrao</div>
        </div>
      </div>
    );
  }

  const isPositive = data.usdBrlVariation >= 0;
  const ratesDiffer = currentSimRate !== undefined && Math.abs(currentSimRate - data.usdBrl) > 0.01;

  return (
    <div className="flex items-center gap-4 bg-ceramic-base border border-ceramic-border rounded-xl px-4 py-3">
      {/* USD/BRL */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-ceramic-text-primary">
              USD/BRL
            </span>
            <span className="text-base font-bold text-ceramic-text-primary">
              R$ {data.usdBrl.toFixed(4)}
            </span>
            <span className={`flex items-center text-xs font-medium ${isPositive ? 'text-red-500' : 'text-green-600'}`}>
              {isPositive ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {Math.abs(data.usdBrlVariation).toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-ceramic-text-secondary">
            Compra: {data.usdBrlBid.toFixed(4)} | Venda: {data.usdBrlAsk.toFixed(4)}
          </div>
        </div>
      </div>

      {/* EUR/BRL */}
      {data.eurBrl > 0 && (
        <>
          <div className="w-px h-8 bg-ceramic-border" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-ceramic-text-primary">EUR/BRL</span>
              <span className="text-base font-bold text-ceramic-text-primary">
                R$ {data.eurBrl.toFixed(4)}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Apply button */}
      {ratesDiffer && onApplyRate && (
        <>
          <div className="w-px h-8 bg-ceramic-border" />
          <button
            onClick={() => onApplyRate(parseFloat(data.usdBrl.toFixed(2)))}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg px-3 py-1.5 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Atualizar simulador
          </button>
        </>
      )}

      {/* Last update */}
      <div className="ml-auto text-xs text-ceramic-text-secondary">
        {formatLastUpdate(data.lastUpdate)}
      </div>
    </div>
  );
}

function formatLastUpdate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return `Atualizado: ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return '';
  }
}
