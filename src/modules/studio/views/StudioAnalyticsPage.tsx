import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart3, Eye, Heart, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { HeaderGlobal } from '@/components/layout';
import type { StudioAnalyticsEntry } from '../types/studio';

interface MetricCard {
  label: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
}

interface InsightCard {
  title: string;
  description: string;
  type: 'trend' | 'top_content' | 'recommendation';
}

export default function StudioAnalyticsPage() {
  const [analytics, setAnalytics] = useState<StudioAnalyticsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('studio_analytics')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setAnalytics((data || []).map((e: any) => ({
        ...e,
        recordedAt: new Date(e.recorded_at),
        projectId: e.project_id,
        metricType: e.metric_type,
        metricValue: e.metric_value,
      })));
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  // Compute summary metrics
  const totalContents = new Set(analytics.filter(a => a.metricType === 'views').map(a => a.projectId)).size || analytics.length;
  const totalReach = analytics.filter(a => a.metricType === 'views').reduce((sum, a) => sum + a.metricValue, 0);
  const engagementEntries = analytics.filter(a => a.metricType === 'engagement');
  const avgEngagement = engagementEntries.length > 0
    ? (engagementEntries.reduce((s, a) => s + a.metricValue, 0) / engagementEntries.length).toFixed(1)
    : '0';
  const monthlyGrowth = analytics.length > 0 ? '+12' : '0'; // Placeholder until real calculation

  const metrics: MetricCard[] = [
    { label: 'Total Conteudos', value: String(totalContents), trend: 5, icon: <BarChart3 className="w-5 h-5" /> },
    { label: 'Total Alcance', value: totalReach.toLocaleString('pt-BR'), trend: 12, icon: <Eye className="w-5 h-5" /> },
    { label: 'Engajamento Medio', value: `${avgEngagement}%`, trend: -2, icon: <Heart className="w-5 h-5" /> },
    { label: 'Crescimento Mensal', value: `${monthlyGrowth}%`, trend: Number(monthlyGrowth), icon: <TrendingUp className="w-5 h-5" /> },
  ];

  const handleGenerateInsights = async () => {
    try {
      setGeneratingInsights(true);
      setInsightError(null);
      const { data, error } = await supabase.functions.invoke('studio-analytics-insights', {
        body: { period: '30d' },
      });

      if (error) throw error;
      setInsights(data?.insights || []);
    } catch (err) {
      console.error('Insight generation failed:', err);
      setInsightError('Falha ao gerar insights. Tente novamente.');
    } finally {
      setGeneratingInsights(false);
    }
  };

  // Recent content for table
  const recentContent = analytics
    .filter(a => a.metricType === 'views')
    .slice(0, 10);

  return (
    <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
      <HeaderGlobal title="Analytics" subtitle="STUDIO" />

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 pb-32 pt-4">
        {/* Metric Cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="ceramic-card p-5 rounded-2xl">
                <div className="h-4 bg-ceramic-cool animate-pulse rounded w-1/2 mb-3" />
                <div className="h-8 bg-ceramic-cool animate-pulse rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {metrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="ceramic-card p-5 rounded-2xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="ceramic-inset p-2 rounded-lg text-ceramic-text-secondary">
                    {m.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary">
                    {m.label}
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-ceramic-text-primary">{m.value}</span>
                  <span className={`flex items-center gap-0.5 text-xs font-bold ${m.trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {m.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(m.trend)}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Chart Placeholder */}
        <div className="ceramic-inset rounded-2xl p-8 mb-8 flex flex-col items-center justify-center text-center">
          <BarChart3 className="w-10 h-10 text-ceramic-text-secondary/40 mb-3" />
          <p className="text-sm font-medium text-ceramic-text-secondary">Grafico em breve</p>
          <p className="text-xs text-ceramic-text-secondary/60 mt-1">Visualizacao de metricas ao longo do tempo</p>
        </div>

        {/* Generate Insights Button */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ceramic-text-secondary">Insights IA</h3>
          <button
            onClick={handleGenerateInsights}
            disabled={generatingInsights}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {generatingInsights ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Gerar Insights IA
              </>
            )}
          </button>
        </div>

        {insightError && (
          <div className="p-3 rounded-xl bg-ceramic-error/10 border border-ceramic-error/30 text-sm text-ceramic-error mb-4">
            {insightError}
          </div>
        )}

        {/* Insights Panel */}
        <AnimatePresence>
          {insights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
            >
              {insights.map((insight, i) => {
                const typeColors: Record<string, string> = {
                  trend: 'border-l-blue-500',
                  top_content: 'border-l-green-500',
                  recommendation: 'border-l-amber-500',
                };
                const typeLabels: Record<string, string> = {
                  trend: 'Tendencia',
                  top_content: 'Top Conteudo',
                  recommendation: 'Recomendacao',
                };
                return (
                  <div
                    key={i}
                    className={`ceramic-card rounded-2xl p-4 border-l-4 ${typeColors[insight.type] || 'border-l-gray-300'}`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary">
                      {typeLabels[insight.type] || insight.type}
                    </span>
                    <h4 className="text-sm font-bold text-ceramic-text-primary mt-1">{insight.title}</h4>
                    <p className="text-xs text-ceramic-text-secondary mt-1">{insight.description}</p>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Content Table */}
        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ceramic-text-secondary mb-4">
            Conteudo Recente
          </h3>
          {recentContent.length === 0 && !loading ? (
            <div className="ceramic-inset rounded-2xl p-6 text-center">
              <p className="text-sm text-ceramic-text-secondary">Nenhum dado de analytics disponivel.</p>
            </div>
          ) : (
            <div className="ceramic-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ceramic-border">
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary">Titulo</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary">Plataforma</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary">Data</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary">Metricas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentContent.map(entry => (
                      <tr key={entry.id} className="border-b border-ceramic-border/50 last:border-0">
                        <td className="px-4 py-3 text-ceramic-text-primary font-medium truncate max-w-[200px]">
                          {entry.projectId || 'Conteudo'}
                        </td>
                        <td className="px-4 py-3 text-ceramic-text-secondary">{entry.platform}</td>
                        <td className="px-4 py-3 text-ceramic-text-secondary">
                          {entry.recordedAt.toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-right text-ceramic-text-primary font-bold">
                          {entry.metricValue.toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
