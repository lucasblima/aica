import { ArrowUpRight, ArrowDownRight, RefreshCw, DollarSign } from 'lucide-react';
import type { ExchangeRateData } from './useExchangeRate';
import { Tooltip } from './Tooltip';

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
      <div className="flex items-center gap-3 bg-ceramic-base border border-ceramic-border rounded-xl px-4 py-3" title="Nao foi possivel obter a cotacao atual. O simulador usara o valor padrao configurado na barra lateral.">
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
    <div className="flex items-center gap-4 bg-ceramic-base border border-ceramic-border rounded-xl px-4 py-3" title="Cotacao em tempo real das moedas que impactam os custos de infraestrutura (USD) e o calculo de margem.">
      {/* USD/BRL */}
      <div className="flex items-center gap-2">
        <Tooltip text="Cotacao do dolar americano em reais. Usado para converter custos de Supabase, Cloud Run e Gemini para BRL.">
          <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center cursor-help">
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
        </Tooltip>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-ceramic-text-primary">
              USD/BRL
            </span>
            <span className="text-base font-bold text-ceramic-text-primary">
              R$ {data.usdBrl.toFixed(4)}
            </span>
            <Tooltip text={isPositive ? 'Dolar subiu — seus custos em reais aumentam.' : 'Dolar caiu — seus custos em reais diminuem.'}>
              <span className={`flex items-center text-xs font-medium cursor-help ${isPositive ? 'text-red-500' : 'text-green-600'}`}>
                {isPositive ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(data.usdBrlVariation).toFixed(2)}%
              </span>
            </Tooltip>
          </div>
          <div className="text-xs text-ceramic-text-secondary" title="Preco de compra e venda do dolar. A diferenca entre eles e o spread bancario.">
            Compra: {data.usdBrlBid.toFixed(4)} | Venda: {data.usdBrlAsk.toFixed(4)}
          </div>
        </div>
      </div>

      {/* EUR/BRL */}
      {data.eurBrl > 0 && (
        <>
          <div className="w-px h-8 bg-ceramic-border" />
          <Tooltip text="Cotacao do euro em reais. Referencia para clientes europeus ou custos em euro.">
            <div className="cursor-help">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-ceramic-text-primary">EUR/BRL</span>
                <span className="text-base font-bold text-ceramic-text-primary">
                  R$ {data.eurBrl.toFixed(4)}
                </span>
              </div>
            </div>
          </Tooltip>
        </>
      )}

      {/* Apply button */}
      {ratesDiffer && onApplyRate && (
        <>
          <div className="w-px h-8 bg-ceramic-border" />
          <button
            onClick={() => onApplyRate(parseFloat(data.usdBrl.toFixed(2)))}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg px-3 py-1.5 transition-colors"
            title="Substitui o cambio manual na barra lateral pelo valor atual do mercado."
          >
            <RefreshCw className="w-3 h-3" />
            Atualizar simulador
          </button>
        </>
      )}

      {/* Last update */}
      <div className="ml-auto text-xs text-ceramic-text-secondary" title="Horario da ultima atualizacao da cotacao pela API do Banco Central.">
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
