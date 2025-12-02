import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CreatePodcastDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (title: string, description: string) => Promise<void>;
}

export const CreatePodcastDialog: React.FC<CreatePodcastDialogProps> = ({ isOpen, onClose, onSubmit }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(title, description);
            // Reset form
            setTitle('');
            setDescription('');
            onClose();
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className="bg-ceramic-base w-full max-w-md rounded-3xl p-8 shadow-2xl animate-scale-in relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-ceramic-text-tertiary hover:text-ceramic-text-primary transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-2xl font-bold text-ceramic-text-primary mb-6">Novo Podcast</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">Nome do Podcast</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Sal na Veia"
                            className="w-full p-4 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20 transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">Descrição</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Sobre o que é o seu podcast?"
                            rows={3}
                            className="w-full p-4 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20 transition-all resize-none"
                        />
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-6 rounded-xl font-bold text-ceramic-text-secondary hover:bg-black/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!title.trim() || isSubmitting}
                            className="flex-1 py-3 px-6 rounded-xl bg-ceramic-text-primary text-ceramic-base font-bold shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all"
                        >
                            {isSubmitting ? 'Criando...' : 'Criar Podcast'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
