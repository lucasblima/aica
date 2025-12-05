import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Mic,
    MicOff,
    Play,
    Pause,
    Monitor,
    MessageSquare,
    Users,
    Check,
    ChevronUp,
    ChevronDown,
    Snowflake,
    Gift,
    AlertCircle,
    Radio,
    Volume2
} from 'lucide-react';
import { Dossier, Topic } from '../types';

// Category config
const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
    'geral': { icon: Mic, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    'quebra-gelo': { icon: Snowflake, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
    'patrocinador': { icon: Gift, color: 'text-amber-600', bgColor: 'bg-amber-100' },
    'polêmicas': { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
};

interface ProductionTopic extends Topic {
    sponsorScript?: string; // Script for sponsor reads
}

interface ProductionModeProps {
    dossier: Dossier;
    projectId: string;
    topics: ProductionTopic[];
    onBack: () => void;
    onOpenTeleprompter: () => void;
    onFinish: () => void;
}

export const ProductionMode: React.FC<ProductionModeProps> = ({
    dossier,
    projectId,
    topics: initialTopics,
    onBack,
    onOpenTeleprompter,
    onFinish
}) => {
    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Topics State
    const [topics, setTopics] = useState<ProductionTopic[]>(initialTopics);
    const [currentTopicIndex, setCurrentTopicIndex] = useState(0);

    // Chat State
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; text: string }>>([]);
    const [chatInput, setChatInput] = useState('');

    // Co-Host State
    const [coHostMode, setCoHostMode] = useState<'off' | 'monitor' | 'active'>('off');

    // Timer
    useEffect(() => {
        if (isRecording && !isPaused) {
            intervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRecording, isPaused]);

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleToggleRecording = () => {
        if (!isRecording) {
            setIsRecording(true);
            setIsPaused(false);
        } else {
            setIsPaused(!isPaused);
        }
    };

    const handleMarkTopicDone = (topicId: string) => {
        setTopics(prev => prev.map(t =>
            t.id === topicId ? { ...t, completed: true } : t
        ));

        // Move to next uncompleted topic
        const nextIndex = topics.findIndex((t, idx) => idx > currentTopicIndex && !t.completed);
        if (nextIndex !== -1) {
            setCurrentTopicIndex(nextIndex);
        }
    };

    const handleSendChat = () => {
        if (!chatInput.trim()) return;
        setChatMessages(prev => [...prev, { role: 'user', text: chatInput }]);
        setChatInput('');

        // Mock AI response
        setTimeout(() => {
            setChatMessages(prev => [...prev, {
                role: 'model',
                text: 'Boa pergunta! Posso sugerir aprofundar esse tema.'
            }]);
        }, 1000);
    };

    const currentTopic = topics[currentTopicIndex];
    const CategoryIcon = currentTopic ? CATEGORY_CONFIG[currentTopic.categoryId || 'geral']?.icon || Mic : Mic;

    return (
        <div className="h-screen bg-ceramic-base flex flex-col overflow-hidden">
            {/* Header */}
            <header className="flex-none bg-gradient-to-r from-red-600 to-red-500 px-6 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                        <div className="flex items-center gap-3">
                            {isRecording && (
                                <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                            )}
                            <span className="text-white font-bold">
                                {isRecording ? 'GRAVANDO' : 'PRODUÇÃO'}
                            </span>
                        </div>
                        <div className="text-white/80">
                            {dossier.guestName}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-white font-mono text-2xl font-bold">
                            {formatTime(recordingTime)}
                        </span>
                        <button
                            onClick={onOpenTeleprompter}
                            className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold transition-colors flex items-center gap-2"
                        >
                            <Monitor className="w-4 h-4" />
                            Teleprompter
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden">
                {/* Left: Pauta (Read-only with progress) */}
                <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-[#E5E3DC] overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-[#E5E3DC] flex items-center justify-between">
                        <h2 className="font-bold text-ceramic-text-primary">Pauta do Dia</h2>
                        <span className="text-sm text-ceramic-text-secondary">
                            {topics.filter(t => t.completed).length} / {topics.length} abordados
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {topics.map((topic, idx) => {
                            const config = CATEGORY_CONFIG[topic.categoryId || 'geral'] || CATEGORY_CONFIG['geral'];
                            const Icon = config.icon;
                            const isCurrent = idx === currentTopicIndex;
                            const isPast = idx < currentTopicIndex || topic.completed;

                            return (
                                <motion.div
                                    key={topic.id}
                                    initial={false}
                                    animate={{
                                        backgroundColor: isCurrent ? '#FFFBEB' : 'transparent',
                                        borderLeftWidth: isCurrent ? 4 : 0,
                                        borderLeftColor: '#F59E0B'
                                    }}
                                    className={`p-4 border-b border-[#E5E3DC] ${isPast && !isCurrent ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                                            {topic.completed ? (
                                                <Check className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <Icon className={`w-4 h-4 ${config.color}`} />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium ${topic.completed ? 'line-through text-ceramic-text-tertiary' : 'text-ceramic-text-primary'}`}>
                                                {topic.text}
                                            </p>
                                            {topic.sponsorScript && isCurrent && (
                                                <p className="text-xs text-amber-600 mt-1 italic">
                                                    Script: {topic.sponsorScript}
                                                </p>
                                            )}
                                        </div>

                                        {isCurrent && !topic.completed && (
                                            <button
                                                onClick={() => handleMarkTopicDone(topic.id)}
                                                className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-sm font-bold hover:bg-green-200 transition-colors"
                                            >
                                                Concluir
                                            </button>
                                        )}

                                        <span className={`text-xs px-2 py-1 rounded-full ${config.bgColor} ${config.color} font-bold`}>
                                            {topic.categoryId === 'quebra-gelo' ? '❄️' :
                                                topic.categoryId === 'patrocinador' ? '🎁' :
                                                    topic.categoryId === 'polêmicas' ? '⚠️' : '🎤'}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Navigation */}
                    <div className="p-3 border-t border-[#E5E3DC] flex items-center justify-between">
                        <button
                            onClick={() => setCurrentTopicIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentTopicIndex === 0}
                            className="p-2 rounded-xl bg-[#EBE9E4] hover:bg-white disabled:opacity-50 transition-colors"
                        >
                            <ChevronUp className="w-5 h-5" />
                        </button>
                        <span className="text-sm text-ceramic-text-secondary">
                            Tópico {currentTopicIndex + 1} de {topics.length}
                        </span>
                        <button
                            onClick={() => setCurrentTopicIndex(prev => Math.min(topics.length - 1, prev + 1))}
                            disabled={currentTopicIndex === topics.length - 1}
                            className="p-2 rounded-xl bg-[#EBE9E4] hover:bg-white disabled:opacity-50 transition-colors"
                        >
                            <ChevronDown className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Right: Co-Host + Chat */}
                <div className="flex flex-col gap-4 overflow-hidden">
                    {/* Co-Host Panel */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E3DC] p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-ceramic-text-primary flex items-center gap-2">
                                <Radio className="w-4 h-4 text-indigo-500" />
                                Co-Host Aica
                            </h3>
                            <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">
                                Em Desenvolvimento
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setCoHostMode('monitor')}
                                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${coHostMode === 'monitor'
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : 'bg-[#EBE9E4] text-ceramic-text-secondary hover:bg-white'
                                    }`}
                            >
                                Monitorar
                            </button>
                            <button
                                onClick={() => setCoHostMode('active')}
                                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${coHostMode === 'active'
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : 'bg-[#EBE9E4] text-ceramic-text-secondary hover:bg-white'
                                    }`}
                            >
                                Co-Host
                            </button>
                        </div>
                    </div>

                    {/* Chat */}
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-[#E5E3DC] overflow-hidden flex flex-col">
                        <div className="p-3 border-b border-[#E5E3DC] flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-indigo-500" />
                            <span className="font-bold text-sm text-ceramic-text-primary">Chat</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {chatMessages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-2.5 rounded-xl text-sm ${msg.role === 'user'
                                            ? 'bg-ceramic-text-primary text-white rounded-tr-none'
                                            : 'bg-[#F7F6F4] text-ceramic-text-primary rounded-tl-none'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-2 border-t border-[#E5E3DC]">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                    placeholder="Pergunte algo..."
                                    className="flex-1 px-3 py-2 rounded-xl bg-[#EBE9E4] text-sm outline-none focus:ring-2 focus:ring-indigo-400/50"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Audio Controls */}
            <div className="flex-none bg-white border-t border-[#E5E3DC] p-4">
                <div className="flex items-center justify-center gap-6">
                    <button
                        onClick={handleToggleRecording}
                        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 ${isRecording && !isPaused
                                ? 'bg-red-500'
                                : 'bg-gradient-to-br from-red-500 to-red-600'
                            }`}
                    >
                        {isRecording && !isPaused ? (
                            <Pause className="w-8 h-8 text-white" />
                        ) : (
                            <Mic className="w-8 h-8 text-white" />
                        )}
                    </button>

                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[#EBE9E4]">
                        <Volume2 className="w-4 h-4 text-ceramic-text-secondary" />
                        <div className="w-32 h-2 rounded-full bg-[#D6D3CD]">
                            <div className="w-1/2 h-full rounded-full bg-green-500" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EBE9E4]">
                        <Users className="w-4 h-4 text-ceramic-text-secondary" />
                        <span className="text-sm text-ceramic-text-primary font-medium">
                            Convidado Conectado
                        </span>
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>

                    <button
                        onClick={onFinish}
                        className="px-6 py-3 rounded-xl bg-ceramic-text-primary text-white font-bold hover:scale-105 active:scale-95 transition-all"
                    >
                        Finalizar Gravação
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductionMode;
