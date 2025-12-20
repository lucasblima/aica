import React from 'react';
import { ChevronLeft, Mic, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StudioLayoutProps {
    children: React.ReactNode;
    title: string;
    status?: 'draft' | 'recording' | 'published';
    onExit: () => void;
    variant?: 'scrollable' | 'fixed';
    /** Studio mode - when true, applies reductive design (everything else vanishes) */
    isStudioMode?: boolean;
}

/**
 * StudioLayout - Layout for podcast studio/preparation modes
 *
 * Implements Reductive Design Principle:
 * - In Studio mode (isStudioMode=true): EVERYTHING else vanishes, only essential controls remain
 * - In Preparation mode (isStudioMode=false): Full UI with navigation and context
 *
 * The transition honors spatial depth - stepping into studio mode feels like "entering a room"
 */
export const StudioLayout: React.FC<StudioLayoutProps> = ({
    children,
    title,
    status = 'draft',
    onExit,
    variant = 'scrollable',
    isStudioMode = false
}) => {
    return (
        <div className="h-screen bg-ceramic-base relative overflow-hidden flex flex-col">
            {/* Floating Header - Vanishes in studio mode (reductive) */}
            <AnimatePresence>
                {!isStudioMode && (
                    <motion.header
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-4 py-2 rounded-full backdrop-blur-md bg-white/70 shadow-ceramic-btn border border-white/20"
                    >
                        {/* Back Button */}
                        <button
                            onClick={onExit}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors group"
                            title="Voltar para o Aica"
                        >
                            <ChevronLeft className="w-5 h-5 text-ceramic-text-secondary group-hover:text-ceramic-text-primary transition-colors" />
                        </button>

                        {/* Divider */}
                        <div className="w-px h-4 bg-ceramic-text-secondary/20" />

                        {/* Title */}
                        <h1 className="text-sm font-bold text-ceramic-text-primary max-w-[200px] truncate">
                            {title || 'Novo Episódio'}
                        </h1>

                        {/* Status Indicator */}
                        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-ceramic-base/50 border border-ceramic-text-secondary/10">
                            {status === 'recording' ? (
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                            ) : (
                                <Circle className="w-2 h-2 text-ceramic-text-secondary fill-current" />
                            )}
                            <span className="text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary">
                                {status === 'recording' ? 'Gravando' : status === 'published' ? 'Publicado' : 'Rascunho'}
                            </span>
                        </div>
                    </motion.header>
                )}
            </AnimatePresence>

            {/* Main Content - Spatial transition based on mode */}
            <AnimatePresence mode="wait">
                <motion.main
                    initial={{ opacity: 0, scale: isStudioMode ? 1.02 : 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: isStudioMode ? 0.98 : 0.95 }}
                    transition={{
                        duration: 0.4,
                        ease: [0.4, 0, 0.2, 1]
                    }}
                    className={`
                        w-full h-full
                        ${isStudioMode ? 'pt-0' : 'pt-24'}
                        ${isStudioMode ? 'px-0' : 'px-4'}
                        pb-8
                        ${variant === 'scrollable' ? 'overflow-y-auto' : 'overflow-hidden flex flex-col'}
                    `}
                >
                    {children}
                </motion.main>
            </AnimatePresence>

            {/* Exit button for studio mode - minimal, floating */}
            {isStudioMode && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={onExit}
                    className="fixed top-4 left-4 z-50 ceramic-concave w-10 h-10 flex items-center justify-center hover:scale-95 transition-transform"
                    title="Sair do modo studio"
                >
                    <ChevronLeft className="w-5 h-5 text-ceramic-text-secondary" />
                </motion.button>
            )}
        </div>
    );
};
