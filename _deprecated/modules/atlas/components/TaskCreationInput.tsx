import React, { useState, useEffect } from 'react';
import { Plus, Loader2, Send, Link2, X, ChevronDown, Calendar, Zap, Target, Clock, List, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskInput, TaskCategory } from '../types/plane';
import { useTaskCategorization } from '../hooks/useTaskCategorization';
import { CategorySuggestion } from './CategorySuggestion';
import { useConnectionSpaces } from '../../connections/hooks/useConnectionSpaces';
import { useProperty } from '../../connections/habitat/hooks/useProperty';
import { useEntitiesBySpace } from '../../connections/ventures/hooks/useEntity';
import { useJourneys } from '../../connections/academia/hooks/useJourneys';
import { useActiveRituals } from '../../connections/tribo/hooks/useRituals';
import { ARCHETYPE_CONFIG, type Archetype, type ConnectionSpace } from '../../connections/types';

interface TaskCreationInputProps {
    onAddTask: (task: TaskInput) => Promise<void>;
    isSyncing: boolean;
}

// Eisenhower Matrix Quadrants
const PRIORITY_QUADRANTS = [
    {
        id: 'urgent-important',
        label: 'Urgente + Importante',
        subtitle: 'Fazer Agora',
        icon: Zap,
        isUrgent: true,
        isImportant: true,
        color: 'bg-red-50 hover:bg-red-100 border-red-300 text-red-700',
        activeColor: 'bg-red-100 border-red-500 ring-2 ring-red-500',
        priority: 'urgent' as const
    },
    {
        id: 'important',
        label: 'Importante',
        subtitle: 'Planejar',
        icon: Target,
        isUrgent: false,
        isImportant: true,
        color: 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700',
        activeColor: 'bg-blue-100 border-blue-500 ring-2 ring-blue-500',
        priority: 'high' as const
    },
    {
        id: 'urgent',
        label: 'Urgente',
        subtitle: 'Delegar',
        icon: Clock,
        isUrgent: true,
        isImportant: false,
        color: 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-700',
        activeColor: 'bg-amber-100 border-amber-500 ring-2 ring-amber-500',
        priority: 'medium' as const
    },
    {
        id: 'low',
        label: 'Nem um nem outro',
        subtitle: 'Eliminar',
        icon: List,
        isUrgent: false,
        isImportant: false,
        color: 'bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700',
        activeColor: 'bg-gray-100 border-gray-500 ring-2 ring-gray-500',
        priority: 'low' as const
    }
];

const CATEGORIES: TaskCategory[] = ['Trabalho', 'Pessoal', 'Saúde', 'Educação', 'Finanças', 'Outros'];

export const TaskCreationInput: React.FC<TaskCreationInputProps> = ({ onAddTask, isSyncing }) => {
    const [inputValue, setInputValue] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<TaskCategory | undefined>(undefined);

    // Expanded form state
    const [showExpandedForm, setShowExpandedForm] = useState(false);
    const [dueDate, setDueDate] = useState('');
    const [selectedQuadrant, setSelectedQuadrant] = useState<typeof PRIORITY_QUADRANTS[0] | null>(null);
    const [description, setDescription] = useState('');

    // Form validation
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Connection linking state
    const [showConnectionSelector, setShowConnectionSelector] = useState(false);
    const [selectedSpace, setSelectedSpace] = useState<ConnectionSpace | null>(null);
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

    // Fetch connection spaces
    const { spaces, isLoading: isLoadingSpaces } = useConnectionSpaces();

    // Fetch archetype-specific entities based on selected space
    const { properties } = useProperty(selectedSpace?.id || '');
    const { entities } = useEntitiesBySpace(selectedSpace?.id);
    const { journeys } = useJourneys({
        spaceId: selectedSpace?.id || '',
        autoFetch: selectedSpace?.archetype === 'academia'
    });
    const { data: rituals } = useActiveRituals(selectedSpace?.id || '');

    // Auto-categorization hook
    const {
        suggestedCategory,
        isLoading: isCategorizing,
        debouncedCategorize,
        clearSuggestion
    } = useTaskCategorization();

    // Trigger categorization when input changes
    useEffect(() => {
        if (inputValue.trim().length >= 3) {
            debouncedCategorize(inputValue);
        } else {
            clearSuggestion();
        }
    }, [inputValue, debouncedCategorize, clearSuggestion]);

    // Validate form
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Title validation
        if (!inputValue.trim()) {
            newErrors.title = 'O título é obrigatório';
        } else if (inputValue.trim().length < 3) {
            newErrors.title = 'O título deve ter pelo menos 3 caracteres';
        } else if (inputValue.length > 500) {
            newErrors.title = 'O título deve ter no máximo 500 caracteres';
        }

        // Date validation
        if (dueDate) {
            const selectedDate = new Date(dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
                newErrors.dueDate = 'A data não pode ser no passado';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            return;
        }

        // Parse tags from input (for backward compatibility with quick add)
        const parsed = parseTaskInput(inputValue);

        // Build task input with connection references
        const taskInput: TaskInput = {
            title: inputValue.trim(),
            priority: selectedQuadrant?.priority || parsed.priority,
            status: 'todo',
            description: description.trim() || parsed.description || undefined,
            target_date: dueDate || parsed.targetDate || undefined,
            category: selectedCategory || suggestedCategory || undefined,
            is_urgent: selectedQuadrant?.isUrgent,
            is_important: selectedQuadrant?.isImportant,
        };

        // Add connection references if selected
        if (selectedSpace) {
            taskInput.connection_space_id = selectedSpace.id;

            // Add archetype-specific entity reference
            if (selectedEntityId) {
                switch (selectedSpace.archetype) {
                    case 'habitat':
                        taskInput.habitat_property_id = selectedEntityId;
                        break;
                    case 'ventures':
                        taskInput.ventures_entity_id = selectedEntityId;
                        break;
                    case 'academia':
                        taskInput.academia_journey_id = selectedEntityId;
                        break;
                    case 'tribo':
                        taskInput.tribo_ritual_id = selectedEntityId;
                        break;
                }
            }
        }

        await onAddTask(taskInput);

        // Reset state
        setInputValue('');
        setDescription('');
        setDueDate('');
        setSelectedQuadrant(null);
        setSelectedCategory(undefined);
        setSelectedSpace(null);
        setSelectedEntityId(null);
        setShowConnectionSelector(false);
        setShowExpandedForm(false);
        setErrors({});
        clearSuggestion();
    };

    const handleAcceptCategory = (category: TaskCategory) => {
        setSelectedCategory(category);
        clearSuggestion();
    };

    const handleRejectCategory = () => {
        clearSuggestion();
    };

    const handleSpaceSelect = (space: ConnectionSpace) => {
        setSelectedSpace(space);
        setSelectedEntityId(null); // Reset entity when space changes
        setShowConnectionSelector(false);
    };

    const handleRemoveConnection = () => {
        setSelectedSpace(null);
        setSelectedEntityId(null);
    };

    const handleQuadrantSelect = (quadrant: typeof PRIORITY_QUADRANTS[0]) => {
        setSelectedQuadrant(selectedQuadrant?.id === quadrant.id ? null : quadrant);
    };

    // Get archetype-specific entities
    const getArchetypeEntities = () => {
        if (!selectedSpace) return [];

        switch (selectedSpace.archetype) {
            case 'habitat':
                return properties.map(p => ({
                    id: p.id,
                    name: `${p.building_name || ''} ${p.unit_number || ''}`.trim() || 'Propriedade sem nome'
                }));
            case 'ventures':
                return entities.map(e => ({
                    id: e.id,
                    name: e.legal_name || e.trading_name || 'Entidade sem nome'
                }));
            case 'academia':
                return journeys.map(j => ({
                    id: j.id,
                    name: j.title
                }));
            case 'tribo':
                return (rituals || []).map(r => ({
                    id: r.id,
                    name: r.name
                }));
            default:
                return [];
        }
    };

    /**
     * Parses task input to extract tags and metadata (backward compatibility)
     */
    const parseTaskInput = (input: string) => {
        let title = input;
        let priority: TaskInput['priority'] = 'medium';
        const status = 'todo';
        let description: string | undefined;
        let targetDate: string | undefined;

        // Extract priority tags
        const priorityMatch = input.match(/#(urgente|urgent|importante|important|high|alta|baixa|low|medio|medium)\b/i);
        if (priorityMatch) {
            const tag = priorityMatch[1].toLowerCase();
            if (['urgente', 'urgent'].includes(tag)) {
                priority = 'urgent';
            } else if (['importante', 'important', 'high', 'alta'].includes(tag)) {
                priority = 'high';
            } else if (['baixa', 'low'].includes(tag)) {
                priority = 'low';
            } else if (['medio', 'medium'].includes(tag)) {
                priority = 'medium';
            }
        }

        // Extract date tags (@data:YYYY-MM-DD or @YYYY-MM-DD)
        const dateMatch = input.match(/@(?:data:)?(\d{4}-\d{2}-\d{2})\b/i);
        if (dateMatch) {
            targetDate = dateMatch[1];
        }

        // Extract description (text after ||)
        const descMatch = input.match(/\|\|(.+)$/);
        if (descMatch) {
            description = descMatch[1].trim();
        }

        return {
            title,
            priority,
            status,
            description,
            targetDate
        };
    };

    return (
        <div className="space-y-2">
            <form onSubmit={handleSubmit} className="space-y-3">
                {/* Main Input */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        {isSyncing ? (
                            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                        ) : (
                            <Plus className="w-5 h-5 text-ceramic-text-tertiary group-focus-within:text-indigo-500 transition-colors" />
                        )}
                    </div>

                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            if (errors.title) {
                                setErrors({ ...errors, title: '' });
                            }
                        }}
                        placeholder="Adicionar nova tarefa..."
                        className={`w-full pl-10 pr-24 py-3 bg-white/50 backdrop-blur-sm border ${
                            errors.title ? 'border-red-500' : 'border-ceramic-border'
                        } rounded-xl shadow-ceramic-input focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-ceramic-text-primary placeholder:text-ceramic-text-tertiary`}
                        disabled={isSyncing}
                    />

                    <button
                        type="button"
                        onClick={() => setShowExpandedForm(!showExpandedForm)}
                        className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ceramic-text-tertiary hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Mais opções"
                    >
                        <ChevronDown className={`w-4 h-4 transition-transform ${showExpandedForm ? 'rotate-180' : ''}`} />
                    </button>

                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isSyncing}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ceramic-text-tertiary hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>

                {/* Validation Error */}
                {errors.title && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-200"
                    >
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span className="text-sm text-red-700">{errors.title}</span>
                    </motion.div>
                )}

                {/* Expanded Form */}
                <AnimatePresence>
                    {showExpandedForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="ceramic-card p-4 rounded-2xl space-y-4 overflow-hidden"
                        >
                            {/* Date Picker */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                                    <Calendar className="w-4 h-4" />
                                    Data Limite
                                </label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => {
                                        setDueDate(e.target.value);
                                        if (errors.dueDate) {
                                            setErrors({ ...errors, dueDate: '' });
                                        }
                                    }}
                                    min={new Date().toISOString().split('T')[0]}
                                    className={`w-full px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                                        errors.dueDate ? 'border border-red-500' : ''
                                    }`}
                                />
                                {errors.dueDate && (
                                    <p className="text-sm text-red-600 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {errors.dueDate}
                                    </p>
                                )}
                            </div>

                            {/* Eisenhower Matrix Priority Grid */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                                    <Zap className="w-4 h-4" />
                                    Prioridade (Matriz Eisenhower)
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {PRIORITY_QUADRANTS.map((quadrant) => {
                                        const Icon = quadrant.icon;
                                        const isSelected = selectedQuadrant?.id === quadrant.id;

                                        return (
                                            <button
                                                key={quadrant.id}
                                                type="button"
                                                onClick={() => handleQuadrantSelect(quadrant)}
                                                className={`p-3 rounded-xl border-2 transition-all text-left ${
                                                    isSelected ? quadrant.activeColor : quadrant.color
                                                }`}
                                            >
                                                <div className="flex items-start gap-2 mb-1">
                                                    <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold leading-tight">
                                                            {quadrant.label}
                                                        </p>
                                                        <p className="text-[10px] opacity-70 mt-0.5">
                                                            {quadrant.subtitle}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Category Dropdown */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                                    <List className="w-4 h-4" />
                                    Categoria
                                </label>
                                <select
                                    value={selectedCategory || ''}
                                    onChange={(e) => setSelectedCategory(e.target.value as TaskCategory || undefined)}
                                    className="w-full px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                >
                                    <option value="">Selecione uma categoria (opcional)</option>
                                    {CATEGORIES.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                                    Descrição (opcional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Adicione detalhes sobre a tarefa..."
                                    rows={3}
                                    maxLength={5000}
                                    className="w-full px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                                />
                                <p className="text-xs text-ceramic-text-tertiary text-right">
                                    {description.length}/5000 caracteres
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>

            {/* AI Category Suggestion */}
            {(suggestedCategory || isCategorizing) && !selectedCategory && (
                <CategorySuggestion
                    category={suggestedCategory}
                    isLoading={isCategorizing}
                    onAccept={handleAcceptCategory}
                    onReject={handleRejectCategory}
                />
            )}

            {/* Connection Linking Section */}
            <div className="space-y-2">
                {!selectedSpace ? (
                    <button
                        type="button"
                        onClick={() => setShowConnectionSelector(!showConnectionSelector)}
                        className="flex items-center gap-2 text-sm text-ceramic-text-secondary hover:text-indigo-600 transition-colors"
                        disabled={isSyncing}
                    >
                        <Link2 className="w-4 h-4" />
                        <span>Vincular a conexão (opcional)</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showConnectionSelector ? 'rotate-180' : ''}`} />
                    </button>
                ) : (
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-200">
                            <span className="text-lg">{ARCHETYPE_CONFIG[selectedSpace.archetype].icon}</span>
                            <span className="text-sm text-indigo-700 font-medium">
                                {selectedSpace.name}
                            </span>
                            <button
                                onClick={handleRemoveConnection}
                                className="text-indigo-600 hover:text-indigo-800"
                                type="button"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Entity selector (if entities exist for this archetype) */}
                        {getArchetypeEntities().length > 0 && (
                            <div className="relative">
                                <select
                                    value={selectedEntityId || ''}
                                    onChange={(e) => setSelectedEntityId(e.target.value || null)}
                                    className="pl-3 pr-8 py-2 text-sm bg-white border border-ceramic-border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="">Selecione (opcional)</option>
                                    {getArchetypeEntities().map((entity) => (
                                        <option key={entity.id} value={entity.id}>
                                            {entity.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {/* Connection Space Selector Dropdown */}
                {showConnectionSelector && !selectedSpace && (
                    <div className="bg-white border border-ceramic-border rounded-lg shadow-ceramic-sm p-3 max-h-64 overflow-y-auto">
                        {isLoadingSpaces ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-ceramic-text-tertiary" />
                            </div>
                        ) : spaces.length === 0 ? (
                            <p className="text-sm text-ceramic-text-tertiary text-center py-4">
                                Nenhum espaço de conexão encontrado
                            </p>
                        ) : (
                            <div className="space-y-1">
                                {spaces.map((space) => (
                                    <button
                                        key={space.id}
                                        type="button"
                                        onClick={() => handleSpaceSelect(space)}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ceramic-bg-secondary transition-colors text-left"
                                    >
                                        <span className="text-xl">{ARCHETYPE_CONFIG[space.archetype].icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-ceramic-text-primary truncate">
                                                {space.name}
                                            </p>
                                            <p className="text-xs text-ceramic-text-tertiary">
                                                {ARCHETYPE_CONFIG[space.archetype].label}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
