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
    FileUp,
    History,
    Save
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
import { supabase } from '../../../services/supabaseClient';
import { PautaGeneratorPanel } from '../components/PautaGeneratorPanel';
import { GuestApprovalLinkDialog } from '../components/GuestApprovalLinkDialog';
import { StudioLayout } from '../components/StudioLayout';
import { Wand2 } from 'lucide-react';
import { useSavedPauta } from '../hooks/useSavedPauta';
import { fetchUrlContent, processFileContent } from '../services/contentExtractionService';
import { pautaGeneratorService } from '../services/pautaGeneratorService';

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

// Helper function to get category color by ID
const getCategoryColor = (categoryId: string): string => {
    const colorMap: Record<string, string> = {
        'quebra-gelo': '#06B6D4',
        'geral': '#3B82F6',
        'patrocinador': '#F59E0B',
        'polêmicas': '#EF4444',
        'abertura': '#10B981',
        'aprofundamento': '#8B5CF6',
        'fechamento': '#F59E0B',
    };
    return colorMap[categoryId] || '#3B82F6';
};

interface GuestData {
    name: string;
    fullName?: string;
    title?: string;
    theme?: string;
    email?: string;
    phone?: string;
}

interface PreProductionHubProps {
    guestData: GuestData;
    projectId?: string;
    onGoToProduction: (dossier: Dossier, projectId: string, topics: Topic[]) => void;
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
    const [showPautaGenerator, setShowPautaGenerator] = useState(false);
    const [showPautaVersions, setShowPautaVersions] = useState(false);
    const [showApprovalDialog, setShowApprovalDialog] = useState(false);

    // Hook para gerenciar pautas salvas
    const {
        activePauta,
        activePautaAsGenerated,
        versions,
        isLoading: isLoadingPauta,
        setActiveVersion,
        refresh: refreshPautas
    } = useSavedPauta(projectId);

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

    // Sources Dialog State
    const [sourceText, setSourceText] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [isProcessingSources, setIsProcessingSources] = useState(false);

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

    // Load saved pauta when it becomes available
    useEffect(() => {
        if (activePautaAsGenerated && !dossier && !isLoadingPauta) {
            console.log('[PreProductionHub] Loading saved pauta:', {
                hasPauta: !!activePautaAsGenerated,
                hasQuestions: !!activePautaAsGenerated?.questions,
                count: activePautaAsGenerated?.questions?.length || 0
            });

            // Convert saved pauta to local format
            const savedDossier: Dossier = {
                guestName: activePauta?.pauta.guest_name || guestData?.name || '',
                episodeTheme: activePauta?.pauta.theme || guestData?.theme || '',
                biography: activePautaAsGenerated.biography,
                technicalSheet: activePautaAsGenerated.technicalSheet,
                controversies: activePautaAsGenerated.controversies?.map(c => c.summary) || [],
                suggestedTopics: activePautaAsGenerated.questions
                    ?.filter(q => q.category !== 'quebra-gelo')
                    .map(q => q.text) || [],
                iceBreakers: activePautaAsGenerated.iceBreakers
            };
            setDossier(savedDossier);

            // Convert questions to topics format
            const savedTopics: Topic[] = [];
            const savedCategories: TopicCategory[] = [];

            // Add main topics
            activePautaAsGenerated.questions?.forEach((q, idx) => {
                // Ensure category exists
                const catId = q.category.toLowerCase().replace(/\s+/g, '-');
                if (!savedCategories.find(c => c.id === catId)) {
                    savedCategories.push({
                        id: catId,
                        name: q.category.charAt(0).toUpperCase() + q.category.slice(1),
                        color: getCategoryColor(catId),
                        episode_id: projectId || ''
                    });
                }

                // Create main topic
                savedTopics.push({
                    id: `saved-${Date.now()}-${idx}`,
                    text: q.text,
                    completed: false,
                    order: idx,
                    archived: false,
                    categoryId: catId
                });

                // Add follow-ups as subtopics
                q.followUps?.forEach((fu, fuIdx) => {
                    savedTopics.push({
                        id: `saved-fu-${Date.now()}-${idx}-${fuIdx}`,
                        text: fu,
                        completed: false,
                        order: idx + 0.1 * (fuIdx + 1),
                        archived: false,
                        categoryId: catId
                    });
                });
            });

            // Ensure ice breakers category exists
            if (!savedCategories.find(c => c.id === 'quebra-gelo')) {
                savedCategories.unshift({
                    id: 'quebra-gelo',
                    name: 'Quebra-Gelo',
                    color: getCategoryColor('quebra-gelo'),
                    episode_id: projectId || ''
                });
            }

            // Add ice breakers as topics
            activePautaAsGenerated.iceBreakers?.forEach((ib, idx) => {
                savedTopics.push({
                    id: `ice-${Date.now()}-${idx}`,
                    text: ib,
                    completed: false,
                    order: -1 + idx * 0.1,
                    archived: false,
                    categoryId: 'quebra-gelo'
                });
            });

            setTopics(savedTopics);
            setCategories(savedCategories);

            console.log('[PreProductionHub] Saved pauta loaded successfully:', {
                topics: savedTopics.length,
                categories: savedCategories.length,
                dossier: {
                    guest: savedDossier.guestName,
                    theme: savedDossier.episodeTheme,
                    bioLength: savedDossier.biography.length
                }
            });
        }
    }, [activePautaAsGenerated, activePauta, isLoadingPauta, dossier, guestData, projectId]);

    // Load existing data or start research on mount
    useEffect(() => {
        if (projectId) {
            loadExistingData();
        } else {
            handleStartResearch();
        }
    }, [projectId]);

    const loadExistingData = async () => {
        if (!projectId) return;

        try {
            setIsResearching(true);

            // Check if saved pauta already exists (will be loaded by useEffect)
            if (activePautaAsGenerated) {
                console.log('[loadExistingData] Saved pauta exists, skipping research regeneration');
                setIsResearching(false);
                return;
            }

            // Load existing topics from database
            const { data: existingTopics, error: topicsError } = await supabase
                .from('podcast_topics')
                .select('*')
                .eq('episode_id', projectId)
                .order('order', { ascending: true });

            if (topicsError) throw topicsError;

            // Load existing categories
            const { data: existingCategories, error: categoriesError } = await supabase
                .from('podcast_topic_categories')
                .select('*')
                .eq('episode_id', projectId);

            if (categoriesError) throw categoriesError;

            // If we have existing topics, use them
            if (existingTopics && existingTopics.length > 0) {
                console.log('[loadExistingData] Loading existing topics:', existingTopics.length);
                const loadedTopics: Topic[] = existingTopics.map(t => ({
                    id: t.id,
                    text: t.question_text,
                    completed: t.completed || false,
                    order: t.order || 0,
                    archived: t.archived || false,
                    categoryId: t.category || 'geral'
                }));
                setTopics(loadedTopics);

                // Load categories if they exist
                if (existingCategories && existingCategories.length > 0) {
                    const loadedCategories: TopicCategory[] = existingCategories.map(c => ({
                        id: c.id,
                        name: c.name,
                        color: c.color,
                        episode_id: c.episode_id
                    }));
                    setCategories(loadedCategories);
                }
            } else {
                // No existing topics - generate new ones from dossier or research
                console.log('[loadExistingData] No existing topics, starting research');
                await handleStartResearch();
            }
        } catch (error) {
            console.error('Error loading existing data:', error);
            // Fallback to generating new research
            await handleStartResearch();
        } finally {
            setIsResearching(false);
        }
    };

    const handleStartResearch = async () => {
        // Don't regenerate if saved pauta already exists
        if (activePautaAsGenerated) {
            console.log('[handleStartResearch] Pauta already exists, skipping regeneration');
            return;
        }

        setIsResearching(true);
        try {
            console.log('[handleStartResearch] Starting research for:', guestData.name);
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

    const handleAddSources = async () => {
        if (!sourceText.trim() && !sourceUrl.trim() && !sourceFile) {
            alert('Por favor, adicione pelo menos uma fonte.');
            return;
        }

        setIsProcessingSources(true);
        try {
            // Prepare sources content
            let additionalContext = '';

            if (sourceText.trim()) {
                additionalContext += `\n\nTexto fornecido:\n${sourceText.trim()}`;
            }

            if (sourceUrl.trim()) {
                try {
                    console.log('[handleAddSources] Fetching URL content:', sourceUrl);
                    const urlContent = await fetchUrlContent(sourceUrl.trim());
                    additionalContext += `\n\nConteúdo extraído do link (${urlContent.source}):\n${urlContent.summary}\n\nPontos relevantes:\n${urlContent.relevantPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
                } catch (error) {
                    console.error('[handleAddSources] Error fetching URL:', error);
                    alert(error instanceof Error ? error.message : 'Erro ao buscar conteúdo da URL');
                    additionalContext += `\n\nLink fornecido: ${sourceUrl.trim()}`;
                }
            }

            if (sourceFile) {
                try {
                    console.log('[handleAddSources] Processing file:', sourceFile.name);
                    const fileContent = await processFileContent(sourceFile);
                    additionalContext += `\n\nConteúdo extraído do arquivo (${fileContent.source}):\n${fileContent.summary}\n\nPontos relevantes:\n${fileContent.relevantPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
                } catch (error) {
                    console.error('[handleAddSources] Error processing file:', error);
                    alert(error instanceof Error ? error.message : 'Erro ao processar arquivo');
                    additionalContext += `\n\nArquivo anexado: ${sourceFile.name}`;
                }
            }

            // Re-generate dossier with additional context
            const enrichedPrompt = `${guestData.name}${additionalContext}`;
            const result = await generateDossier(enrichedPrompt, guestData.theme || '');
            setDossier(result);

            // Convert dossier topics to Topic objects
            const generatedTopics: Topic[] = result.suggestedTopics.map((text, idx) => ({
                id: `topic-${Date.now()}-${idx}`,
                text,
                completed: false,
                order: idx,
                archived: false,
                categoryId: 'geral'
            }));

            const iceBreakers: Topic[] = result.iceBreakers.map((text, idx) => ({
                id: `ice-${Date.now()}-${idx}`,
                text,
                completed: false,
                order: idx,
                archived: false,
                categoryId: 'quebra-gelo'
            }));

            setTopics([...generatedTopics, ...iceBreakers]);

            // Reset form
            setSourceText('');
            setSourceUrl('');
            setSourceFile(null);
            setShowSourcesDialog(false);
        } catch (error) {
            console.error('Error processing sources:', error);
            alert('Erro ao processar fontes. Tente novamente.');
        } finally {
            setIsProcessingSources(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            const validTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (validTypes.includes(file.type) || file.name.endsWith('.txt') || file.name.endsWith('.pdf') || file.name.endsWith('.docx')) {
                setSourceFile(file);
            } else {
                alert('Tipo de arquivo não suportado. Use PDF, TXT ou DOCX.');
            }
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

    // Handler para quando a pauta e gerada pelo PautaGeneratorPanel
    const handlePautaGenerated = async (
        newDossier: Dossier,
        newTopics: Topic[],
        newCategories: TopicCategory[]
    ) => {
        setDossier(newDossier);
        setTopics(newTopics);
        setCategories(newCategories);
        setShowPautaGenerator(false);
        setIsResearching(false);

        // Refresh pautas salvas para mostrar nova versao
        await refreshPautas();
    };

    const handleGoToProduction = async () => {
        if (!dossier || !projectId) return;

        try {
            // Save dossier to podcast_episodes table
            const { error } = await supabase
                .from('podcast_episodes')
                .update({
                    biography: dossier.biography,
                    controversies: dossier.controversies,
                    ice_breakers: topics.filter(t => t.categoryId === 'quebra-gelo').map(t => t.text),
                    technical_sheet: dossier.technicalSheet,
                    updated_at: new Date().toISOString()
                })
                .eq('id', projectId);

            if (error) {
                console.error('Error saving dossier:', error);
                alert(`Erro ao salvar pesquisa: ${error.message}`);
                return;
            }

            // Save topics to podcast_topics table
            // First, delete existing topics for this episode
            await supabase
                .from('podcast_topics')
                .delete()
                .eq('episode_id', projectId);

            // Insert new topics
            const topicsToSave = topics.map((topic, index) => ({
                episode_id: projectId,
                category: topic.categoryId,
                question_text: topic.text,
                completed: topic.completed,
                order: index,
                archived: topic.archived || false
            }));

            if (topicsToSave.length > 0) {
                const { error: topicsError } = await supabase
                    .from('podcast_topics')
                    .insert(topicsToSave);

                if (topicsError) {
                    console.error('Error saving topics:', topicsError);
                    // Don't block production - just log the error
                }
            }

            // Save categories to podcast_topic_categories table
            await supabase
                .from('podcast_topic_categories')
                .delete()
                .eq('episode_id', projectId);

            const categoriesToSave = categories.map(category => ({
                episode_id: projectId,
                name: category.name,
                color: category.color
            }));

            if (categoriesToSave.length > 0) {
                const { error: categoriesError } = await supabase
                    .from('podcast_topic_categories')
                    .insert(categoriesToSave);

                if (categoriesError) {
                    console.error('Error saving categories:', categoriesError);
                    // Don't block production - just log the error
                }
            }

            // Pass the ordered topics to production
            const productionDossier = {
                ...dossier,
                suggestedTopics: topics.filter(t => t.categoryId === 'geral').map(t => t.text),
                iceBreakers: topics.filter(t => t.categoryId === 'quebra-gelo').map(t => t.text)
            };

            // Pass dossier, projectId, AND topics to orchestrator
            onGoToProduction(productionDossier, projectId, topics);
        } catch (error) {
            console.error('Error in handleGoToProduction:', error);
            alert('Erro ao salvar pesquisa. Tente novamente.');
        }
    };

    return (
        <StudioLayout
            title={guestData.fullName || guestData.name}
            status="draft"
            onExit={onBack}
            variant="scrollable"
            isStudioMode={false}
        >
            {/* Subtitle under header (via modal context) */}
            <div className="text-sm text-ceramic-text-secondary mb-6 px-4">
                {guestData.title} • {guestData.theme || 'Tema automático'}
            </div>

            {/* Main Content - 2 Columns */}
            <div className="grid grid-cols-2 gap-6 px-6 pb-6 h-full">
                {/* Left Column: Pauta (Topics) */}
                <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-[#E5E3DC] overflow-hidden">
                    <div className="p-4 border-b border-[#E5E3DC] flex items-center justify-between">
                        <h2 className="font-bold text-ceramic-text-primary flex items-center gap-2">
                            <FileText className="w-5 h-5 text-amber-500" />
                            Pauta
                        </h2>
                        <div className="flex items-center gap-2">
                            {isResearching && (
                                <span className="text-xs text-amber-600 flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Gerando...
                                </span>
                            )}
                            {activePauta && !isLoadingPauta && (
                                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                                    <Save className="w-3 h-3" />
                                    <span>v{activePauta.pauta.version} salva</span>
                                    {versions.length > 1 && (
                                        <button
                                            onClick={() => setShowPautaVersions(!showPautaVersions)}
                                            className="ml-1 p-0.5 hover:bg-green-100 rounded"
                                            title="Ver versões anteriores"
                                        >
                                            <History className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={() => setShowPautaGenerator(true)}
                                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-medium flex items-center gap-1.5 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                                title="Gerar Pauta com IA (estilo NotebookLM)"
                            >
                                <Wand2 className="w-4 h-4" />
                                {activePauta ? 'Regenerar' : 'IA'}
                            </button>
                        </div>
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
                        {/* Tabs - Ceramic tactile differentiation */}
                        <div className="flex gap-1 p-1 ceramic-tray">
                            {[
                                { id: 'bio' as ResearchTab, label: 'Bio', icon: User },
                                { id: 'ficha' as ResearchTab, label: 'Ficha', icon: FileText },
                                { id: 'news' as ResearchTab, label: 'News', icon: Newspaper },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 font-bold text-sm rounded-lg transition-all ${activeTab === tab.id
                                            ? 'ceramic-concave text-ceramic-text-primary'
                                            : 'ceramic-card text-ceramic-text-secondary hover:text-ceramic-text-primary'
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
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center mb-4 animate-pulse">
                                        <Sparkles className="w-6 h-6 text-amber-500" />
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
                                                    Sem notícias ou polêmicas
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

            {/* Action Buttons - Floating at bottom */}
            <div className="fixed bottom-6 right-6 flex items-center gap-3 z-40">
                <button
                    onClick={() => setShowApprovalDialog(true)}
                    disabled={!dossier || isResearching}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2"
                    title="Gerar link de aprovação para o convidado"
                >
                    <LinkIcon className="w-5 h-5" />
                    Enviar Aprovação
                </button>
                <button
                    onClick={handleGoToProduction}
                    disabled={!dossier || isResearching}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2"
                >
                    Ir para Gravação
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>

            {/* Custom Sources Dialog */}
            <AnimatePresence>
                {showSourcesDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/5 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
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
                                <div className="p-3 rounded-xl bg-white border border-ceramic-accent/20 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-ceramic-text-primary text-sm">Poucas informações públicas</p>
                                        <p className="text-xs text-ceramic-text-secondary">Adicione material para enriquecer a pesquisa</p>
                                    </div>
                                </div>
                            )}

                            <h3 className="text-lg font-bold text-ceramic-text-primary">Adicionar Fontes</h3>

                            <div className="space-y-3">
                                {/* File Upload */}
                                <label className="w-full p-4 rounded-xl border-2 border-dashed border-[#D6D3CD] hover:border-amber-400 hover:bg-ceramic-highlight transition-colors flex items-center gap-3 group cursor-pointer">
                                    <input
                                        type="file"
                                        accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <div className="w-10 h-10 rounded-xl bg-[#EBE9E4] group-hover:bg-amber-100 flex items-center justify-center transition-colors flex-shrink-0">
                                        <FileUp className="w-5 h-5 text-ceramic-text-secondary group-hover:text-amber-600" />
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="font-bold text-ceramic-text-primary text-sm">
                                            {sourceFile ? sourceFile.name : 'Upload de Arquivo'}
                                        </p>
                                        <p className="text-xs text-ceramic-text-tertiary truncate">
                                            {sourceFile ? `${(sourceFile.size / 1024).toFixed(1)} KB` : 'PDF, TXT, DOCX'}
                                        </p>
                                    </div>
                                    {sourceFile && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setSourceFile(null);
                                            }}
                                            className="text-red-500 hover:text-red-700 p-1"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </label>

                                {/* URL Input */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider flex items-center gap-2">
                                        <LinkIcon className="w-3 h-3" />
                                        Link (YouTube, artigos, etc)
                                    </label>
                                    <input
                                        type="url"
                                        value={sourceUrl}
                                        onChange={(e) => setSourceUrl(e.target.value)}
                                        placeholder="https://youtube.com/watch?v=..."
                                        className="w-full p-3 rounded-xl bg-[#EBE9E4] text-sm text-ceramic-text-primary placeholder-ceramic-text-tertiary border-none focus:ring-2 focus:ring-indigo-400/50 outline-none"
                                    />
                                </div>

                                {/* Free Text */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                                        Texto Livre
                                    </label>
                                    <textarea
                                        value={sourceText}
                                        onChange={(e) => setSourceText(e.target.value)}
                                        placeholder="Cole aqui informações relevantes sobre o convidado..."
                                        className="w-full h-24 p-3 rounded-xl bg-[#EBE9E4] text-sm text-ceramic-text-primary placeholder-ceramic-text-tertiary resize-none border-none focus:ring-2 focus:ring-amber-400/50 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setShowSourcesDialog(false);
                                        setSourceText('');
                                        setSourceUrl('');
                                        setSourceFile(null);
                                    }}
                                    disabled={isProcessingSources}
                                    className="flex-1 py-3 rounded-xl text-ceramic-text-secondary font-bold hover:bg-[#EBE9E4] transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAddSources}
                                    disabled={isProcessingSources || (!sourceText.trim() && !sourceUrl.trim() && !sourceFile)}
                                    className="flex-1 py-3 rounded-xl bg-ceramic-text-primary text-ceramic-base font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                                >
                                    {isProcessingSources ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Processando...
                                        </>
                                    ) : (
                                        'Adicionar'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pauta Generator Modal */}
            <AnimatePresence>
                {showPautaGenerator && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowPautaGenerator(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-xl max-h-[90vh] overflow-y-auto"
                        >
                            <PautaGeneratorPanel
                                guestName={guestData.name}
                                initialTheme={guestData.theme || ''}
                                projectId={projectId}
                                onPautaGenerated={handlePautaGenerated}
                                onClose={() => setShowPautaGenerator(false)}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Guest Approval Link Dialog */}
            <GuestApprovalLinkDialog
                isOpen={showApprovalDialog}
                onClose={() => setShowApprovalDialog(false)}
                episodeId={projectId || ''}
                guestName={guestData.name}
                guestEmail={guestData.email}
                guestPhone={guestData.phone}
            />
        </StudioLayout>
    );
};

export default PreProductionHub;
