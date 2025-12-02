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

        // Simple parsing logic (mocked for now, can be enhanced with regex or AI)
        // Example input: "Buy milk #urgent @todo"
        const title = inputValue;
        const priority = 'medium'; // Default
        const status = 'todo'; // Default

        await onAddTask({
            title,
            priority,
            status,
            description: 'Created via Atlas Quick Add'
        });

        setInputValue('');
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
                placeholder="Adicionar nova tarefa... (Ex: 'Revisar contrato #urgente')"
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
