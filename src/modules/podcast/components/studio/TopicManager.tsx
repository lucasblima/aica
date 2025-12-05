import React, { useState } from 'react';
import { Topic, TopicCategory, IceBreaker } from '../../types';
import { DndContext, closestCenter, DragEndEvent, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, CheckCircle2, Circle, Archive, Plus, Wand2, ChevronDown, ChevronUp } from 'lucide-react';

interface TopicManagerProps {
    topics: Topic[];
    categories: TopicCategory[];
    highlightedIds: Set<string>;
    iceBreakers: IceBreaker[];
    onAddTopic: (text: string, categoryId?: string) => void;
    onToggleTopic: (id: string) => void;
    onArchiveTopic: (id: string) => void;
    onDragEnd: (event: DragEndEvent) => void;
    onUpdateIceBreakers: (items: IceBreaker[]) => void;
    onSuggestTopic: () => void;
    isSuggesting: boolean;
}

// Sortable Item Component
const SortableItem = ({ topic, isHighlighted, categories, onToggle, onArchive }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: topic.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-start space-x-2 p-3 rounded-lg transition-all ${topic.completed ? 'bg-[#E5E3DC]/50 opacity-50' : 'bg-white hover:bg-[#F0EFE9]'
                } ${isHighlighted ? 'animate-highlight' : ''} shadow-sm border border-[#5C554B]/10`}
        >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-0.5 text-[#948D82] hover:text-[#5C554B]">
                <GripVertical className="w-4 h-4" />
            </div>
            <div onClick={() => onToggle(topic.id)} className="flex-1 flex items-start space-x-3 cursor-pointer">
                <div className={`mt-0.5 ${topic.completed ? 'text-green-500' : 'text-[#948D82] group-hover:text-[#5C554B]'}`}>
                    {topic.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </div>
                <div className="flex-1 flex items-center gap-2">
                    <span className={`text-sm ${topic.completed ? 'line-through text-[#948D82]' : 'text-[#5C554B]'}`}>
                        {topic.text}
                    </span>
                    {topic.categoryId && categories.find((c: any) => c.id === topic.categoryId) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 border border-indigo-200">
                            {categories.find((c: any) => c.id === topic.categoryId)?.name}
                        </span>
                    )}
                </div>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); onArchive(topic.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 text-[#948D82] hover:text-[#5C554B] transition-all"
                title="Arquivar"
            >
                <Archive className="w-4 h-4" />
            </button>
        </div>
    );
};

export const TopicManager: React.FC<TopicManagerProps> = ({
    topics,
    categories,
    highlightedIds,
    iceBreakers,
    onAddTopic,
    onToggleTopic,
    onArchiveTopic,
    onDragEnd,
    onUpdateIceBreakers,
    onSuggestTopic,
    isSuggesting
}) => {
    const [newTopicText, setNewTopicText] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isIceBreakersCollapsed, setIsIceBreakersCollapsed] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleAdd = () => {
        if (newTopicText.trim()) {
            onAddTopic(newTopicText, selectedCategory || undefined);
            setNewTopicText('');
        }
    };

    const activeTopics = topics.filter(t => !t.archived);

    return (
        <div className="flex flex-col h-full gap-4">
            {/* New Topic Input */}
            <div className="bg-white border border-[#D6D3CD]/50 rounded-2xl p-4 shadow-sm">
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1 custom-scroll">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm ${!selectedCategory
                            ? 'bg-[#5C554B] text-white shadow-md scale-105'
                            : 'bg-[#F0EFE9] text-[#948D82] hover:bg-[#E5E3DC] hover:text-[#5C554B]'
                            }`}
                    >
                        Geral
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm ${selectedCategory === cat.id
                                ? 'bg-indigo-600 text-white shadow-md scale-105'
                                : 'bg-[#F0EFE9] text-[#948D82] hover:bg-[#E5E3DC] hover:text-[#5C554B]'
                                }`}
                        >
                            <span className="w-2 h-2 rounded-full ring-1 ring-white/50" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newTopicText}
                        onChange={(e) => setNewTopicText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        placeholder="Nova pauta..."
                        className="flex-1 px-4 py-2.5 rounded-xl bg-[#F0EFE9] border-none shadow-[inset_2px_2px_5px_rgba(163,158,145,0.15),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] focus:outline-none text-[#5C554B] placeholder-[#948D82] text-sm font-medium transition-all focus:shadow-[inset_2px_2px_5px_rgba(163,158,145,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.5)]"
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!newTopicText.trim()}
                        className="p-2.5 bg-[#5C554B] text-white rounded-xl hover:bg-[#4A443C] disabled:opacity-50 transition-all shadow-md hover:shadow-lg active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onSuggestTopic}
                        disabled={isSuggesting}
                        className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-200 disabled:opacity-50 transition-all shadow-sm hover:shadow-md active:scale-95"
                        title="Sugerir com IA"
                    >
                        {isSuggesting ? <Wand2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Topics List */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-2.5 custom-scroll">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={activeTopics.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        {activeTopics.map(topic => (
                            <SortableItem
                                key={topic.id}
                                topic={topic}
                                isHighlighted={highlightedIds.has(topic.id)}
                                categories={categories}
                                onToggle={onToggleTopic}
                                onArchive={onArchiveTopic}
                            />
                        ))}
                    </SortableContext>
                </DndContext>

                {activeTopics.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-[#948D82] space-y-3 opacity-60">
                        <div className="p-4 bg-[#E5E3DC] rounded-full">
                            <Wand2 className="w-8 h-8" />
                        </div>
                        <span className="text-sm font-medium italic">Nenhuma pauta ativa. Adicione ou gere com IA.</span>
                    </div>
                )}
            </div>

            {/* Ice Breakers Section */}
            <div className="bg-white border border-[#D6D3CD]/50 rounded-2xl overflow-hidden shadow-sm transition-all">
                <button
                    onClick={() => setIsIceBreakersCollapsed(!isIceBreakersCollapsed)}
                    className="w-full p-3 flex items-center justify-between bg-[#F0EFE9] hover:bg-[#E5E3DC] transition-colors border-b border-[#D6D3CD]/30"
                >
                    <span className="text-xs font-bold text-[#948D82] uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        Quebra-Gelo
                    </span>
                    {isIceBreakersCollapsed ? <ChevronDown className="w-4 h-4 text-[#948D82]" /> : <ChevronUp className="w-4 h-4 text-[#948D82]" />}
                </button>

                {!isIceBreakersCollapsed && (
                    <div className="p-3 bg-white max-h-48 overflow-y-auto space-y-2 custom-scroll">
                        {iceBreakers.filter(ib => !ib.archived).map((ib, idx) => (
                            <div key={idx} className="p-3 bg-[#F7F6F4] rounded-xl text-sm text-[#5C554B] border border-[#E5E3DC] shadow-sm hover:shadow-md transition-all cursor-default">
                                {ib.text}
                            </div>
                        ))}
                        {iceBreakers.filter(ib => !ib.archived).length === 0 && (
                            <div className="text-center text-xs text-[#948D82] italic py-2">
                                Nenhum quebra-gelo disponível.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
