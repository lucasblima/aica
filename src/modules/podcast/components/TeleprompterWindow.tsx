import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    ChevronUp,
    ChevronDown,
    Play,
    Pause,
    Mic,
    Snowflake,
    Gift,
    AlertCircle,
    Minus,
    Plus
} from 'lucide-react';
import { Topic } from '../types';

// Category config
const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; emoji: string }> = {
    'geral': { icon: Mic, emoji: '🎤' },
    'quebra-gelo': { icon: Snowflake, emoji: '❄️' },
    'patrocinador': { icon: Gift, emoji: '🎁' },
    'polêmicas': { icon: AlertCircle, emoji: '⚠️' },
};

interface TeleprompterTopic extends Topic {
    sponsorScript?: string;
}

interface TeleprompterWindowProps {
    topics: TeleprompterTopic[];
    currentIndex: number;
    onIndexChange: (index: number) => void;
    onClose: () => void;
}

export const TeleprompterWindow: React.FC<TeleprompterWindowProps> = ({
    topics,
    currentIndex,
    onIndexChange,
    onClose
}) => {
    const [scrollSpeed, setScrollSpeed] = useState(0); // 0 = paused, 1-5 = speed levels
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | null>(null);

    const currentTopic = topics[currentIndex];
    const prevTopic = currentIndex > 0 ? topics[currentIndex - 1] : null;
    const nextTopic = currentIndex < topics.length - 1 ? topics[currentIndex + 1] : null;

    // Check if current topic is a sponsor (requires scrolling)
    const isSponsorTopic = currentTopic?.categoryId === 'patrocinador' && currentTopic.sponsorScript;

    // Auto-scroll for sponsor scripts
    useEffect(() => {
        if (isAutoScrolling && scrollRef.current && isSponsorTopic) {
            const element = scrollRef.current;
            const scrollStep = scrollSpeed * 0.5; // pixels per frame

            const scroll = () => {
                if (element.scrollTop < element.scrollHeight - element.clientHeight) {
                    element.scrollTop += scrollStep;
                    animationRef.current = requestAnimationFrame(scroll);
                } else {
                    setIsAutoScrolling(false);
                }
            };

            animationRef.current = requestAnimationFrame(scroll);
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isAutoScrolling, scrollSpeed, isSponsorTopic]);

    const handlePrevious = () => {
        if (currentIndex > 0) {
            onIndexChange(currentIndex - 1);
            setIsAutoScrolling(false);
            if (scrollRef.current) scrollRef.current.scrollTop = 0;
        }
    };

    const handleNext = () => {
        if (currentIndex < topics.length - 1) {
            onIndexChange(currentIndex + 1);
            setIsAutoScrolling(false);
            if (scrollRef.current) scrollRef.current.scrollTop = 0;
        }
    };

    const toggleAutoScroll = () => {
        if (!isAutoScrolling && scrollSpeed === 0) {
            setScrollSpeed(2); // Default speed
        }
        setIsAutoScrolling(!isAutoScrolling);
    };

    return (
        <div className="fixed inset-0 bg-[#1a1a1a] text-white flex flex-col z-[9999]">
            {/* Header Controls */}
            <header className="flex-none flex items-center justify-between px-6 py-4 bg-black/50">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-white/60 uppercase tracking-wider">Teleprompter</span>
                    <span className="text-sm text-amber-400 font-bold">
                        Tópico {currentIndex + 1} de {topics.length}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Speed Control */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10">
                        <span className="text-xs text-white/60 uppercase">Vel.</span>
                        <button
                            onClick={() => setScrollSpeed(Math.max(0, scrollSpeed - 1))}
                            className="p-1 hover:bg-white/10 rounded"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center font-bold">{scrollSpeed}</span>
                        <button
                            onClick={() => setScrollSpeed(Math.min(5, scrollSpeed + 1))}
                            className="p-1 hover:bg-white/10 rounded"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Auto-scroll toggle (only for sponsor topics) */}
                    {isSponsorTopic && (
                        <button
                            onClick={toggleAutoScroll}
                            className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 ${isAutoScrolling
                                    ? 'bg-amber-500 text-black'
                                    : 'bg-white/10 hover:bg-white/20'
                                }`}
                        >
                            {isAutoScrolling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {isAutoScrolling ? 'Pausar' : 'Rolar'}
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-white/10 hover:bg-red-500/50 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-hidden">
                {/* Previous Topic (Faded) */}
                <AnimatePresence>
                    {prevTopic && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 0.3, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full max-w-4xl text-center mb-8"
                        >
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="text-2xl">{CATEGORY_CONFIG[prevTopic.categoryId || 'geral']?.emoji}</span>
                            </div>
                            <p className="text-xl text-white/50 line-clamp-2">
                                {prevTopic.text}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Divider */}
                <div className="w-full max-w-4xl border-t border-amber-500/50 mb-8" />

                {/* Current Topic */}
                <motion.div
                    key={currentTopic?.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-4xl text-center"
                >
                    {currentTopic && (
                        <>
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <span className="text-4xl">{CATEGORY_CONFIG[currentTopic.categoryId || 'geral']?.emoji}</span>
                                <span className="text-lg uppercase tracking-wider text-amber-400 font-bold">
                                    {currentTopic.categoryId === 'quebra-gelo' ? 'Quebra-Gelo' :
                                        currentTopic.categoryId === 'patrocinador' ? 'Patrocinador' :
                                            currentTopic.categoryId === 'polêmicas' ? 'Polêmica' : 'Geral'}
                                </span>
                            </div>

                            {isSponsorTopic ? (
                                /* Scrollable sponsor script */
                                <div
                                    ref={scrollRef}
                                    className="max-h-[50vh] overflow-y-auto px-8 text-left"
                                >
                                    <p className="text-2xl leading-relaxed mb-8 text-amber-100">
                                        {currentTopic.text}
                                    </p>
                                    <div className="text-3xl leading-relaxed whitespace-pre-line">
                                        {currentTopic.sponsorScript}
                                    </div>
                                </div>
                            ) : (
                                /* Regular topic - large centered text */
                                <p className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                                    {currentTopic.text}
                                </p>
                            )}
                        </>
                    )}
                </motion.div>

                {/* Divider */}
                <div className="w-full max-w-4xl border-t border-white/20 mt-8 mb-8" />

                {/* Next Topic (Faded) */}
                <AnimatePresence>
                    {nextTopic && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 0.3, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="w-full max-w-4xl text-center"
                        >
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="text-2xl">{CATEGORY_CONFIG[nextTopic.categoryId || 'geral']?.emoji}</span>
                            </div>
                            <p className="text-xl text-white/50 line-clamp-2">
                                {nextTopic.text}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Navigation */}
            <footer className="flex-none flex items-center justify-center gap-4 px-6 py-6 bg-black/50">
                <button
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="p-4 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition-all"
                >
                    <ChevronUp className="w-8 h-8" />
                </button>

                <div className="w-32 text-center">
                    <div className="text-3xl font-bold">{currentIndex + 1}</div>
                    <div className="text-sm text-white/60">de {topics.length}</div>
                </div>

                <button
                    onClick={handleNext}
                    disabled={currentIndex === topics.length - 1}
                    className="p-4 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition-all"
                >
                    <ChevronDown className="w-8 h-8" />
                </button>
            </footer>
        </div>
    );
};

export default TeleprompterWindow;
