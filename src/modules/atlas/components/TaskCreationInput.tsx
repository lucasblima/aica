import React, { useState } from 'react';
import { Plus, Loader2, Send } from 'lucide-react';
import { TaskInput } from '../types/plane';

interface TaskCreationInputProps {
    onAddTask: (task: TaskInput) => Promise<void>;
    isSyncing: boolean;
}

export const TaskCreationInput: React.FC<TaskCreationInputProps> = ({ onAddTask, isSyncing }) => {
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        // Parse tags from input
        const parsed = parseTaskInput(inputValue);

        await onAddTask({
            title: parsed.title,
            priority: parsed.priority,
            status: parsed.status,
            description: parsed.description || 'Created via Atlas Quick Add',
            target_date: parsed.targetDate
        });

        setInputValue('');
    };

    /**
     * Parses task input to extract tags and metadata
     * Supports:
     * - #urgente, #urgent → priority: urgent
     * - #importante, #important, #high → priority: high
     * - #baixa, #low → priority: low
     * - @data:YYYY-MM-DD → target_date
     * - Everything else → title
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
            // Remove tag from title
            title = title.replace(priorityMatch[0], '').trim();
        }

        // Extract date tags (@data:YYYY-MM-DD or @YYYY-MM-DD)
        const dateMatch = input.match(/@(?:data:)?(\d{4}-\d{2}-\d{2})\b/i);
        if (dateMatch) {
            targetDate = dateMatch[1];
            // Remove tag from title
            title = title.replace(dateMatch[0], '').trim();
        }

        // Extract description (text after ||)
        const descMatch = input.match(/\|\|(.+)$/);
        if (descMatch) {
            description = descMatch[1].trim();
            // Remove description from title
            title = title.replace(descMatch[0], '').trim();
        }

        // Clean up title (remove extra spaces)
        title = title.replace(/\s+/g, ' ').trim();

        return {
            title,
            priority,
            status,
            description,
            targetDate
        };
    };

    return (
        <form onSubmit={handleSubmit} className="relative group">
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
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Adicionar nova tarefa... (Ex: 'Revisar contrato #urgente @2025-12-15')"
                title="Use #urgente, #importante, #baixa para prioridade. Use @YYYY-MM-DD para data. Use || para descrição."
                className="w-full pl-10 pr-12 py-3 bg-white/50 backdrop-blur-sm border border-ceramic-border rounded-xl shadow-ceramic-input focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-ceramic-text-primary placeholder:text-ceramic-text-tertiary"
                disabled={isSyncing}
            />

            <button
                type="submit"
                disabled={!inputValue.trim() || isSyncing}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ceramic-text-tertiary hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
                <Send className="w-4 h-4" />
            </button>
        </form>
    );
};
