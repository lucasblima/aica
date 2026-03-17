import React, { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Sparkles, Loader2, Circle, ArrowUpRight, RotateCcw, Info } from 'lucide-react';
import { useConversationSummary } from '@/hooks/useConversationSummary';
import type { ConversationTopic, ActionItem, TimelineEntry } from '@/services/gmailSummarizeService';

// --- Animation variants ---

const staggerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08 },
    },
};

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// --- Helpers ---

const SENTIMENT_COLORS = {
    positive: '#0F9D58',
    neutral: '#F4B400',
    negative: '#EA4335',
} as const;

const TREND_LABELS: Record<string, string> = {
    improving: 'Melhorando',
    stable: 'Estavel',
    declining: 'Declinando',
};

const TREND_ARROWS: Record<string, string> = {
    improving: '\u2197',
    stable: '\u2192',
    declining: '\u2198',
};

const SENTIMENT_LABELS: Record<string, string> = {
    positive: 'Positivo',
    neutral: 'Neutro',
    negative: 'Negativo',
};

function formatPeriod(period: string): string {
    const [year, month] = period.split('-');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const idx = parseInt(month, 10) - 1;
    return `${monthNames[idx] || month} ${year}`;
}

function formatDateRange(first: string, last: string): string {
    const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    return `${fmt(first)} \u2014 ${fmt(last)}`;
}

const INSUFFICIENT_DATA_KEYWORDS = [
    'sem dados suficientes',
    'poucos emails',
    'análise pendente',
    'nenhum email encontrado',
    'dados insuficientes',
];

function isInsufficientData(summary: { totalEmails: number; sentiment: { overall: string; trend: string; description: string } }): boolean {
    if (summary.totalEmails < 3) return true;
    const desc = summary.sentiment.description.toLowerCase();
    return summary.sentiment.overall === 'neutral'
        && summary.sentiment.trend === 'stable'
        && INSUFFICIENT_DATA_KEYWORDS.some((kw) => desc.includes(kw));
}

// --- Skeleton loader ---

function SummarySkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="space-y-2">
                <div className="h-4 bg-ceramic-cool rounded w-48" />
                <div className="h-3 bg-ceramic-cool/60 rounded w-32" />
            </div>
            <div className="space-y-2">
                <div className="h-3 bg-ceramic-cool rounded w-full" />
                <div className="h-3 bg-ceramic-cool rounded w-5/6" />
                <div className="h-3 bg-ceramic-cool rounded w-4/6" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="h-10 bg-ceramic-cool/60 rounded-lg" />
                <div className="h-10 bg-ceramic-cool/60 rounded-lg" />
                <div className="h-10 bg-ceramic-cool/60 rounded-lg" />
                <div className="h-10 bg-ceramic-cool/60 rounded-lg" />
            </div>
            <div className="space-y-3">
                <div className="h-3 bg-ceramic-cool rounded w-40" />
                <div className="h-3 bg-ceramic-cool/60 rounded w-56" />
                <div className="h-3 bg-ceramic-cool/60 rounded w-48" />
            </div>
        </div>
    );
}

// --- Sub-components ---

function TopicCard({ topic }: { topic: ConversationTopic }) {
    const color = SENTIMENT_COLORS[topic.sentiment];
    return (
        <motion.div
            variants={fadeUp}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-ceramic-cool/40 cursor-default"
        >
            <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
            />
            <span className="text-sm text-ceramic-text-primary truncate flex-1">
                {topic.topic}
            </span>
            <span className="text-xs text-ceramic-text-secondary tabular-nums flex-shrink-0">
                {topic.count} emails
            </span>
        </motion.div>
    );
}

function ActionItemRow({ item }: { item: ActionItem }) {
    return (
        <motion.div variants={fadeUp} className="flex items-start gap-2.5 py-1">
            <Circle className="w-3.5 h-3.5 text-ceramic-text-secondary/50 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-ceramic-text-secondary leading-relaxed">
                {item.item}
            </span>
        </motion.div>
    );
}

function TimelineDot({ entry }: { entry: TimelineEntry }) {
    const color = SENTIMENT_COLORS[entry.sentiment];
    return (
        <motion.div variants={fadeUp} className="flex gap-3">
            <div className="flex flex-col items-center">
                <span
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                    style={{ backgroundColor: color }}
                />
                <div className="w-px flex-1 bg-ceramic-border/40 mt-1" />
            </div>
            <div className="pb-4">
                <span className="text-xs font-medium text-ceramic-text-secondary">
                    {formatPeriod(entry.period)}
                </span>
                <p className="text-sm text-ceramic-text-secondary/80 leading-relaxed mt-0.5">
                    {entry.summary}
                </p>
            </div>
        </motion.div>
    );
}

// --- Main section ---

export function ConversationSummarySection() {
    const { summary, isLoading, loadingPhase, error, summarize, clear } = useConversationSummary();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = email.trim();
        if (!trimmed) return;
        summarize(trimmed, name.trim() || undefined);
    };

    return (
        <div>
            <div className="border-t border-ceramic-border/60 pt-6">
                {/* Section header */}
                <div className="flex items-center gap-2.5 mb-4">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-semibold text-ceramic-text-primary">
                        Resumo de Conversas
                    </h2>
                </div>

                <AnimatePresence mode="wait">
                    {/* --- Input state --- */}
                    {!summary && !isLoading && (
                        <motion.div
                            key="input"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                        >
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Email do contato..."
                                        required
                                        className="flex-1 px-4 py-2.5 bg-ceramic-cool/70 backdrop-blur-sm rounded-xl text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-shadow"
                                    />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Nome (opcional)"
                                        className="w-36 px-4 py-2.5 bg-ceramic-cool/70 backdrop-blur-sm rounded-xl text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-shadow"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-ceramic-text-secondary/60">
                                        Análise o histórico de emails com qualquer contato
                                    </p>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors"
                                    >
                                        Gerar Resumo
                                    </button>
                                </div>
                            </form>

                            {error && (
                                <div className="mt-3 px-4 py-2.5 bg-ceramic-error/10 rounded-xl">
                                    <p className="text-sm text-ceramic-error">{error}</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* --- Loading state --- */}
                    {isLoading && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="flex items-center gap-2.5 mb-5">
                                <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                                <motion.span
                                    key={loadingPhase}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-sm text-ceramic-text-secondary"
                                >
                                    {loadingPhase === 'fetching'
                                        ? 'Buscando emails...'
                                        : 'Analisando com IA...'}
                                </motion.span>
                            </div>
                            <SummarySkeleton />
                        </motion.div>
                    )}

                    {/* --- Summary display --- */}
                    {summary && !isLoading && (
                        <motion.div
                            key="summary"
                            variants={staggerVariants}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0 }}
                            className="space-y-6"
                        >
                            {/* Contact header */}
                            <motion.div variants={fadeUp}>
                                <p className="text-base font-semibold text-ceramic-text-primary">
                                    {summary.contactName}
                                </p>
                                <p className="text-xs text-ceramic-text-secondary mt-0.5">
                                    <span className="font-mono">{summary.contactEmail}</span>
                                    <span className="mx-1.5">&middot;</span>
                                    {summary.totalEmails} emails
                                    <span className="mx-1.5">&middot;</span>
                                    {formatDateRange(summary.dateRange.first, summary.dateRange.last)}
                                </p>
                            </motion.div>

                            {/* Summary paragraph */}
                            <motion.div variants={fadeUp}>
                                <p className="text-sm text-ceramic-text-secondary leading-relaxed">
                                    {summary.summary}
                                </p>
                            </motion.div>

                            {/* Topics grid */}
                            {summary.topics.length > 0 && (
                                <motion.div variants={fadeUp}>
                                    <h3 className="text-xs font-semibold text-ceramic-text-secondary uppercase tracking-wider mb-2.5">
                                        Topicos
                                    </h3>
                                    <motion.div
                                        variants={staggerVariants}
                                        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                                    >
                                        {summary.topics.map((t) => (
                                            <TopicCard key={t.topic} topic={t} />
                                        ))}
                                    </motion.div>
                                </motion.div>
                            )}

                            {/* Action items */}
                            {summary.actionItems.length > 0 && (
                                <motion.div variants={fadeUp}>
                                    <h3 className="text-xs font-semibold text-ceramic-text-secondary uppercase tracking-wider mb-2.5">
                                        Itens pendentes
                                    </h3>
                                    <motion.div variants={staggerVariants} className="space-y-1">
                                        {summary.actionItems
                                            .filter((a) => a.status === 'pending')
                                            .map((a, i) => (
                                                <ActionItemRow key={i} item={a} />
                                            ))}
                                    </motion.div>
                                </motion.div>
                            )}

                            {/* Sentiment */}
                            <motion.div variants={fadeUp}>
                                {isInsufficientData(summary) ? (
                                    <div className="rounded-xl px-4 py-3 bg-ceramic-info/10 border border-ceramic-info/20">
                                        <div className="flex items-start gap-2.5">
                                            <Info className="w-4 h-4 text-ceramic-info flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-ceramic-text-primary">
                                                    Dados insuficientes para análise
                                                </p>
                                                <p className="text-sm text-ceramic-text-secondary leading-relaxed mt-0.5">
                                                    Poucos emails encontrados para este contato. Adicione mais conversas para uma análise mais rica.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="rounded-xl px-4 py-3"
                                        style={{
                                            backgroundColor: `${SENTIMENT_COLORS[summary.sentiment.overall]}08`,
                                        }}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: SENTIMENT_COLORS[summary.sentiment.overall] }}
                                            />
                                            <span className="text-sm font-medium text-ceramic-text-primary">
                                                {SENTIMENT_LABELS[summary.sentiment.overall]}
                                            </span>
                                            <ArrowUpRight
                                                className="w-3.5 h-3.5"
                                                style={{ color: SENTIMENT_COLORS[summary.sentiment.overall] }}
                                            />
                                            <span className="text-xs text-ceramic-text-secondary">
                                                {TREND_LABELS[summary.sentiment.trend]} {TREND_ARROWS[summary.sentiment.trend]}
                                            </span>
                                        </div>
                                        <p className="text-sm text-ceramic-text-secondary leading-relaxed">
                                            {summary.sentiment.description}
                                        </p>
                                    </div>
                                )}
                            </motion.div>

                            {/* Timeline */}
                            {summary.timeline.length > 0 && (
                                <motion.div variants={fadeUp}>
                                    <h3 className="text-xs font-semibold text-ceramic-text-secondary uppercase tracking-wider mb-3">
                                        Linha do tempo
                                    </h3>
                                    <motion.div variants={staggerVariants}>
                                        {summary.timeline.map((entry) => (
                                            <TimelineDot key={entry.period} entry={entry} />
                                        ))}
                                    </motion.div>
                                </motion.div>
                            )}

                            {/* New search button */}
                            <motion.div variants={fadeUp} className="pt-2">
                                <button
                                    onClick={clear}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Nova busca
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
