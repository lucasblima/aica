import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    ArrowRight,
    Sparkles,
    FileText,
    User,
    Newspaper,
    MessageSquare,
    Plus,
    Loader2,
    GripVertical,
    Check,
    Mic,
    Gift,
    Snowflake,
    AlertCircle,
    Upload,
    Link as LinkIcon,
    FileUp
} from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dossier, Topic, TopicCategory } from '../types';
import { generateDossier } from '../services/geminiService';

// Category Icons mapping
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'geral': <Mic className="w-4 h-4" />,
    'quebra-gelo': <Snowflake className="w-4 h-4" />,
    'patrocinador': <Gift className="w-4 h-4" />,
    'polêmicas': <AlertCircle className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
    'geral': 'bg-blue-100 text-blue-700 border-blue-200',
    'quebra-gelo': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'patrocinador': 'bg-amber-100 text-amber-700 border-amber-200',
    'polêmicas': 'bg-red-100 text-red-700 border-red-200',
};

interface GuestData {
    name: string;
    fullName?: string;
    title?: string;
    theme?: string;
}

interface PreProductionHubProps {
    guestData: GuestData;
    projectId?: string;
    onGoToProduction: (dossier: Dossier, projectId: string) => void;
    onBack: () => void;
}

// Tabs for the research panel
type ResearchTab = 'bio' | 'ficha' | 'news';

// Sortable Item Component
interface SortableTopicItemProps {
    topic: Topic;
    onToggle: (id: string) => void;
}

const SortableTopicItem: React.FC<SortableTopicItemProps> = ({ topic, onToggle }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: topic.id, data: { type: 'Topic', topic } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F7F6F4] group transition-colors bg-white border border-transparent hover:border-[#E5E3DC]"
        >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="w-4 h-4 text-ceramic-text-tertiary opacity-0 group-hover:opacity-100" />
            </div>
            <button
                onClick={() => onToggle(topic.id)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${topic.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-ceramic-text-tertiary hover:border-green-400'
                    }`}
            >
                {topic.completed && <Check className="w-3 h-3" />}
            </button>
            <span className={`text-sm flex-1 ${topic.completed ? 'line-through text-ceramic-text-tertiary' : 'text-ceramic-text-primary'}`}>
                {topic.text}
            </span>
        </div>
    );
};

export const PreProductionHub: React.FC<PreProductionHubProps> = ({
    guestData,
    projectId,
    onGoToProduction,
    onBack
}) => {
    // State
    const [isResearching, setIsResearching] = useState(false);
    const [dossier, setDossier] = useState<Dossier | null>(null);
    const [activeTab, setActiveTab] = useState<ResearchTab>('bio');
    const [showSourcesDialog, setShowSourcesDialog] = useState(false);
    const [hasLowContext, setHasLowContext] = useState(false);

    // Topics State
    const [categories, setCategories] = useState<TopicCategory[]>([
        { id: 'quebra-gelo', name: 'Quebra-Gelo', color: '#06B6D4', episode_id: projectId || '' },
        { id: 'geral', name: 'Geral', color: '#3B82F6', episode_id: projectId || '' },
        { id: 'patrocinador', name: 'Patrocinador', color: '#F59E0B', episode_id: projectId || '' },
    ]);

    const [topics, setTopics] = useState<Topic[]>([]);
    const [newTopicText, setNewTopicText] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('geral');
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    // Chat State
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; text: string; sources?: number[] }>>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Start Deep Research on mount
    useEffect(() => {
        handleStartResearch();
    }, []);

    const handleStartResearch = async () => {
        setIsResearching(true);
        try {
            const result = await generateDossier(guestData.name, guestData.theme || '');
            setDossier(result);

            // Check if low context (mock for now)
            if (!result.biography || result.biography.length < 200) {
                setHasLowContext(true);
                setShowSourcesDialog(true);
            }

            // Convert dossier topics to Topic objects
            const generatedTopics: Topic[] = result.suggestedTopics.map((text, idx) => ({
                id: `topic-${Date.now()}-${idx}`,
                text,
                completed: false,
                order: idx,
                archived: false,
                categoryId: 'geral'
            }));

            // Add ice breakers as a category
            const iceBreakers: Topic[] = result.iceBreakers.map((text, idx) => ({
                id: `ice-${Date.now()}-${idx}`,
                text,
                completed: false,
                order: idx,
                archived: false,
                categoryId: 'quebra-gelo'
            }));

            setTopics([...generatedTopics, ...iceBreakers]);
        } catch (error) {
            console.error('Research failed:', error);
        } finally {
            setIsResearching(false);
        }
    };

    const handleAddTopic = () => {
        if (!newTopicText.trim()) return;

        const newTopic: Topic = {
            id: `topic-${Date.now()}`,
            text: newTopicText.trim(),
            completed: false,
            order: topics.filter(t => t.categoryId === selectedCategory).length,
            archived: false,
            categoryId: selectedCategory
        };

        setTopics(prev => [...prev, newTopic]);
        setNewTopicText('');
    };

    const handleToggleTopic = (id: string) => {
        setTopics(prev => prev.map(t =>
            t.id === id ? { ...t, completed: !t.completed } : t
        ));
    };

    // DnD Handlers
    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find the topics
        const activeTopic = topics.find(t => t.id === activeId);
        const overTopic = topics.find(t => t.id === overId);

        if (!activeTopic) return;

        // If dragging over a category container (we'll use category IDs as droppable IDs)
        if (categories.some(c => c.id === overId)) {
            const categoryId = overId;
            if (activeTopic.categoryId !== categoryId) {
                setTopics(prev => {
                    return prev.map(t =>
                        t.id === activeId ? { ...t, categoryId } : t
                    );
                });
            }
            return;
        }

        // If dragging over another topic
        if (overTopic && activeTopic.categoryId !== overTopic.categoryId) {
            setTopics(prev => {
                return prev.map(t =>
                    t.id === activeId ? { ...t, categoryId: overTopic.categoryId } : t
                );
            });
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        if (activeId !== overId) {
            setTopics((items) => {
                const oldIndex = items.findIndex((t) => t.id === activeId);
                const newIndex = items.findIndex((t) => t.id === overId);

                // Only reorder if in same category (category change handled in DragOver)
                if (items[oldIndex].categoryId === items[newIndex].categoryId) {
                    return arrayMove(items, oldIndex, newIndex);
                }
                return items;
            });
        }
    };

    const handleSendChat = async () => {
        if (!chatInput.trim() || isChatLoading) return;

        const userMessage = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsChatLoading(true);

        // Simulate AI response with sources
        await new Promise(r => setTimeout(r, 1500));

        setChatMessages(prev => [...prev, {
            role: 'model',
            text: `Baseado nas informações sobre ${guestData.name}, ${userMessage.toLowerCase().includes('polêmica')
                ? 'as principais polêmicas envolvem questões urbanísticas e políticas públicas.'
                : 'posso ajudar com mais detalhes sobre esse tópico.'}`,
            sources: [1, 3] // Mock source references
        }]);
        setIsChatLoading(false);
    };

    const handleGoToProduction = () => {
        if (dossier && projectId) {
            // Pass the ordered topics to production
            const productionDossier = {
                ...dossier,
                suggestedTopics: topics.filter(t => t.categoryId === 'geral').map(t => t.text),
                iceBreakers: topics.filter(t => t.categoryId === 'quebra-gelo').map(t => t.text)
            };
            onGoToProduction(productionDossier, projectId);
        }
    };

    return (
        <div className="h-screen bg-ceramic-base flex flex-col overflow-hidden">
            {/* Header */}
            <header className="flex-none bg-white/80 backdrop-blur-md border-b border-[#E5E3DC] px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 rounded-xl hover:bg-[#EBE9E4] transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-ceramic-text-secondary" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-ceramic-text-primary">
                                {guestData.fullName || guestData.name}
                            </h1>
                            <p className="text-sm text-ceramic-text-secondary">
                                {guestData.title} • {guestData.theme || 'Tema automático'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleGoToProduction}
                        disabled={!dossier || isResearching}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2"
                    >
                        Ir para Gravação
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main Content - 2 Columns */}
            <div className="flex-1 grid grid-cols-2 gap-6 p-6 overflow-hidden">
                {/* Left Column: Pauta (Topics) */}
                <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-[#E5E3DC] overflow-hidden">
                    <div className="p-4 border-b border-[#E5E3DC] flex items-center justify-between">
                        <h2 className="font-bold text-ceramic-text-primary flex items-center gap-2">
                            <FileText className="w-5 h-5 text-amber-500" />
                            Pauta
                        </h2>
                        {isResearching && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Gerando...
                            </span>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="space-y-4">
                                {categories.map((category) => (
                                    <div key={category.id} className="space-y-2">
                                        {/* Category Header (Droppable) */}
                                        <SortableContext
                                            id={category.id}
                                            items={topics.filter(t => t.categoryId === category.id).map(t => t.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${CATEGORY_COLORS[category.id] || 'bg-gray-100 text-gray-700'}`}>
                                                {CATEGORY_ICONS[category.id] || <Mic className="w-4 h-4" />}
                                                <span className="font-bold text-sm">{category.name}</span>
                                                <span className="text-xs opacity-70">
                                                    ({topics.filter(t => t.categoryId === category.id).length})
                                                </span>
                                            </div>

                                            <div className="space-y-1 pl-2 min-h-[10px]">
                                                {topics
                                                    .filter(t => t.categoryId === category.id && !t.archived)
                                                    .map((topic) => (
                                                        <SortableTopicItem
                                                            key={topic.id}
                                                            topic={topic}
                                                            onToggle={handleToggleTopic}
                                                        />
                                                    ))}
                                            </div>
                                        </SortableContext>
                                    </div>
                                ))}
                            </div>

                            <DragOverlay>
                                {activeDragId ? (
                                    <div className="flex items-center gap-2 p-2 rounded-lg bg-white shadow-xl border border-amber-200 opacity-90 cursor-grabbing">
                                        <GripVertical className="w-4 h-4 text-ceramic-text-tertiary" />
                                        <span className="text-sm text-ceramic-text-primary font-bold">
                                            {topics.find(t => t.id === activeDragId)?.text}
                                        </span>
                                    </div>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    </div>

                    {/* Add Topic */}
                    <div className="p-4 border-t border-[#E5E3DC]">
                        <div className="flex gap-2 mb-2">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${selectedCategory === cat.id
                                            ? CATEGORY_COLORS[cat.id] || 'bg-gray-200'
                                            : 'bg-[#EBE9E4] text-ceramic-text-secondary hover:bg-white'
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newTopicText}
                                onChange={(e) => setNewTopicText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                                placeholder="Nova pergunta ou tópico..."
                                className="flex-1 px-4 py-3 rounded-xl bg-[#EBE9E4] text-sm text-ceramic-text-primary placeholder-ceramic-text-tertiary border-none focus:ring-2 focus:ring-amber-400/50 outline-none shadow-inner"
                            />
                            <button
                                onClick={handleAddTopic}
                                disabled={!newTopicText.trim()}
                                className="p-3 rounded-xl bg-ceramic-text-primary text-ceramic-base disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Research + Chat */}
                <div className="flex flex-col gap-4 overflow-hidden">
                    {/* Research Panel */}
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-[#E5E3DC] overflow-hidden flex flex-col">
                        {/* Tabs */}
                        <div className="flex border-b border-[#E5E3DC]">
                            {[
                                { id: 'bio' as ResearchTab, label: 'Bio', icon: User },
                                { id: 'ficha' as ResearchTab, label: 'Ficha', icon: FileText },
                                { id: 'news' as ResearchTab, label: 'News', icon: Newspaper },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${activeTab === tab.id
                                            ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/50'
                                            : 'text-ceramic-text-secondary hover:text-ceramic-text-primary hover:bg-[#F7F6F4]'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {isResearching ? (
                                <div className="h-full flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center mb-4 animate-pulse">
                                        <Sparkles className="w-8 h-8 text-amber-500" />
                                    </div>
                                    <h3 className="font-bold text-ceramic-text-primary mb-2">
                                        Deep Research em andamento...
                                    </h3>
                                    <p className="text-sm text-ceramic-text-secondary">
                                        Coletando informações sobre {guestData.name}
                                    </p>
                                </div>
                            ) : dossier ? (
                                <AnimatePresence mode="wait">
                                    {activeTab === 'bio' && (
                                        <motion.div
                                            key="bio"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="prose prose-sm max-w-none"
                                        >
                                            <p className="text-ceramic-text-primary leading-relaxed whitespace-pre-line">
                                                {dossier.biography}
                                            </p>
                                        </motion.div>
                                    )}
                                    {activeTab === 'ficha' && (
                                        <motion.div
                                            key="ficha"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="space-y-3"
                                        >
                                            {dossier.technicalSheet ? (
                                                <>
                                                    {dossier.technicalSheet.fullName && (
                                                        <div className="p-3 rounded-xl bg-[#F7F6F4]">
                                                            <span className="text-xs font-bold text-ceramic-text-tertiary uppercase">Nome Completo</span>
                                                            <p className="text-ceramic-text-primary">{dossier.technicalSheet.fullName}</p>
                                                        </div>
                                                    )}
                                                    {dossier.technicalSheet.birthInfo && (
                                                        <div className="p-3 rounded-xl bg-[#F7F6F4]">
                                                            <span className="text-xs font-bold text-ceramic-text-tertiary uppercase">Nascimento</span>
                                                            <p className="text-ceramic-text-primary">
                                                                {dossier.technicalSheet.birthInfo.date} - {dossier.technicalSheet.birthInfo.city}, {dossier.technicalSheet.birthInfo.state}
                                                            </p>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-ceramic-text-secondary text-center py-8">
                                                    Ficha técnica não disponível
                                                </p>
                                            )}
                                        </motion.div>
                                    )}
                                    {activeTab === 'news' && (
                                        <motion.div
                                            key="news"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="space-y-3"
                                        >
                                            {dossier.controversies && dossier.controversies.length > 0 ? (
                                                dossier.controversies.map((item, idx) => (
                                                    <div key={idx} className="p-3 rounded-xl bg-red-50 border border-red-100">
                                                        <p className="text-sm text-red-800">{item}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-ceramic-text-secondary text-center py-8">
                                                    Nenhuma notícia ou polêmica encontrada
                                                </p>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            ) : (
                                <div className="h-full flex items-center justify-center text-ceramic-text-secondary">
                                    Clique em "Iniciar Pesquisa" para começar
                                </div>
                            )}
                        </div>

                        {/* Add Sources Button */}
                        {!isResearching && (
                            <div className="p-3 border-t border-[#E5E3DC]">
                                <button
                                    onClick={() => setShowSourcesDialog(true)}
                                    className="w-full py-2 px-4 rounded-xl text-sm font-bold text-ceramic-text-secondary hover:text-ceramic-text-primary hover:bg-[#F7F6F4] transition-colors flex items-center justify-center gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    Adicionar Fontes Personalizadas
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Chat Panel */}
                    <div className="h-64 bg-white rounded-2xl shadow-sm border border-[#E5E3DC] overflow-hidden flex flex-col">
                        <div className="p-3 border-b border-[#E5E3DC] flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-indigo-500" />
                            <span className="font-bold text-sm text-ceramic-text-primary">Chat com Aica</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {chatMessages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user'
                                            ? 'bg-ceramic-text-primary text-white rounded-tr-none'
                                            : 'bg-[#F7F6F4] text-ceramic-text-primary rounded-tl-none'
                                        }`}>
                                        {msg.text}
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="flex gap-1 mt-2">
                                                {msg.sources.map(s => (
                                                    <span key={s} className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 text-xs font-bold">
                                                        [{s}]
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isChatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-[#F7F6F4] p-3 rounded-xl rounded-tl-none flex gap-1">
                                        <div className="w-2 h-2 bg-ceramic-text-tertiary rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-ceramic-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                        <div className="w-2 h-2 bg-ceramic-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-2 border-t border-[#E5E3DC]">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                    placeholder="Pergunte algo sobre o convidado..."
                                    className="flex-1 px-3 py-2 rounded-xl bg-[#EBE9E4] text-sm text-ceramic-text-primary placeholder-ceramic-text-tertiary border-none focus:ring-2 focus:ring-indigo-400/50 outline-none"
                                />
                                <button
                                    onClick={handleSendChat}
                                    disabled={!chatInput.trim() || isChatLoading}
                                    className="p-2 rounded-xl bg-indigo-500 text-white disabled:opacity-50 transition-all hover:bg-indigo-600"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Sources Dialog */}
            <AnimatePresence>
                {showSourcesDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowSourcesDialog(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-ceramic-base rounded-2xl shadow-2xl p-6 space-y-4"
                        >
                            {hasLowContext && (
                                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-amber-800 text-sm">Poucas informações públicas</p>
                                        <p className="text-xs text-amber-700">Adicione material para enriquecer a pesquisa</p>
                                    </div>
                                </div>
                            )}

                            <h3 className="text-lg font-bold text-ceramic-text-primary">Adicionar Fontes</h3>

                            <div className="space-y-3">
                                <button className="w-full p-4 rounded-xl border-2 border-dashed border-[#D6D3CD] hover:border-amber-400 hover:bg-amber-50/50 transition-colors flex items-center gap-3 group">
                                    <div className="w-10 h-10 rounded-xl bg-[#EBE9E4] group-hover:bg-amber-100 flex items-center justify-center transition-colors">
                                        <FileUp className="w-5 h-5 text-ceramic-text-secondary group-hover:text-amber-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-ceramic-text-primary text-sm">Upload de Arquivo</p>
                                        <p className="text-xs text-ceramic-text-tertiary">PDF, TXT, DOCX</p>
                                    </div>
                                </button>

                                <button className="w-full p-4 rounded-xl border-2 border-dashed border-[#D6D3CD] hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors flex items-center gap-3 group">
                                    <div className="w-10 h-10 rounded-xl bg-[#EBE9E4] group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                                        <LinkIcon className="w-5 h-5 text-ceramic-text-secondary group-hover:text-indigo-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-ceramic-text-primary text-sm">Colar Link</p>
                                        <p className="text-xs text-ceramic-text-tertiary">YouTube, artigos, redes sociais</p>
                                    </div>
                                </button>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                                        Texto Livre
                                    </label>
                                    <textarea
                                        placeholder="Cole aqui informações relevantes sobre o convidado..."
                                        className="w-full h-24 p-3 rounded-xl bg-[#EBE9E4] text-sm text-ceramic-text-primary placeholder-ceramic-text-tertiary resize-none border-none focus:ring-2 focus:ring-amber-400/50 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowSourcesDialog(false)}
                                    className="flex-1 py-3 rounded-xl text-ceramic-text-secondary font-bold hover:bg-[#EBE9E4] transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => setShowSourcesDialog(false)}
                                    className="flex-1 py-3 rounded-xl bg-ceramic-text-primary text-ceramic-base font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    Adicionar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PreProductionHub;
