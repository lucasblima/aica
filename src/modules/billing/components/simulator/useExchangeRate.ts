import { useState, useEffect } from 'react';

export interface ExchangeRateData {
  usdBrl: number;
  eurBrl: number;
  usdBrlBid: number;
  usdBrlAsk: number;
  usdBrlVariation: number;
  lastUpdate: string;
}

interface UseExchangeRateReturn {
  data: ExchangeRateData | null;
  isLoading: boolean;
  error: string | null;
}

const AWESOME_API_URL = 'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL';
const CACHE_KEY = 'aica_exchange_rate_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCachedRate(): ExchangeRateData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function setCachedRate(data: ExchangeRateData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export function useExchangeRate(): UseExchangeRateReturn {
  const [data, setData] = useState<ExchangeRateData | null>(getCachedRate);
  const [isLoading, setIsLoading] = useState(!getCachedRate());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we have fresh cache, skip fetch
    const cached = getCachedRate();
    if (cached) {
      setData(cached);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRates() {
      try {
        const response = await fetch(AWESOME_API_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();

        const usd = json['USDBRL'];
        const eur = json['EURBRL'];

        if (!usd) throw new Error('USD-BRL data not found');

        const rateData: ExchangeRateData = {
          usdBrl: parseFloat(usd.bid),
          eurBrl: eur ? parseFloat(eur.bid) : 0,
          usdBrlBid: parseFloat(usd.bid),
          usdBrlAsk: parseFloat(usd.ask),
          usdBrlVariation: parseFloat(usd.pctChange),
          lastUpdate: usd.create_date,
        };

        if (!cancelled) {
          setData(rateData);
          setCachedRate(rateData);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao buscar cotacao');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchRates();
    return () => { cancelled = true; };
  }, []);

  return { data, isLoading, error };
}
