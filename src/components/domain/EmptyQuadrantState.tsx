import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Target, Clock, Archive, LucideIcon } from 'lucide-react';
import { Quadrant } from '@/types';

interface EmptyQuadrantStateProps {
    quadrantType: Quadrant;
}

interface QuadrantInfo {
    icon: LucideIcon;
    message: string;
    hint: string;
    color: string;
}

const QUADRANT_INFO: Record<Quadrant, QuadrantInfo> = {
    'urgent-important': {
        icon: Zap,
        message: '\u{1F534} Nenhuma tarefa urgente — bom sinal!',
        hint: 'Arraste tarefas para cá ou use "AICA Auto" para priorizar automaticamente',
        color: 'text-ceramic-error'
    },
    'important': {
        icon: Target,
        message: '\u{1F7E2} Nenhuma tarefa importante agendada',
        hint: 'Planeje tarefas importantes antes que se tornem urgentes',
        color: 'text-ceramic-info'
    },
    'urgent': {
        icon: Clock,
        message: '\u{1F7E1} Nenhuma tarefa urgente pendente',
        hint: 'Considere delegar tarefas urgentes mas não importantes',
        color: 'text-amber-500'
    },
    'low': {
        icon: Archive,
        message: '\u{26AA} Zona limpa — foco no que importa',
        hint: 'Tarefas que não são urgentes nem importantes podem ser eliminadas',
        color: 'text-ceramic-text-secondary'
    }
};

export const EmptyQuadrantState: React.FC<EmptyQuadrantStateProps> = ({ quadrantType }) => {
    const info = QUADRANT_INFO[quadrantType];
    const Icon = info.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center py-12 px-4 border-2 border-dashed border-ceramic-text-secondary/20 rounded-xl bg-ceramic-text-secondary/5"
        >
            <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="mb-4"
            >
                <div className="ceramic-concave w-16 h-16 mx-auto flex items-center justify-center">
                    <Icon className={`w-8 h-8 ${info.color}`} />
                </div>
            </motion.div>

            <h4 className="text-sm font-bold text-ceramic-text-primary mb-2">
                {info.message}
            </h4>

            <p className="text-xs text-ceramic-text-secondary max-w-xs mx-auto">
                {info.hint}
            </p>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4"
            >
                <div className="inline-flex items-center gap-2 text-xs text-ceramic-text-tertiary">
                    <div className="w-2 h-2 rounded-full bg-ceramic-accent animate-pulse" />
                    Arraste tarefas aqui
                </div>
            </motion.div>
        </motion.div>
    );
};
