import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    variant?: 'danger' | 'warning';
    isOpen: boolean;
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    title,
    message,
    confirmText,
    cancelText = 'Cancelar',
    variant = 'warning',
    isOpen,
    isLoading = false,
    onConfirm,
    onCancel
}) => {
    const isDanger = variant === 'danger';
    const Icon = isDanger ? AlertTriangle : AlertCircle;

    const iconColor = isDanger ? 'text-ceramic-error' : 'text-ceramic-warning';
    const bgColor = isDanger ? 'bg-ceramic-error/10' : 'bg-ceramic-warning/10';
    const borderColor = isDanger ? 'border-ceramic-error/20' : 'border-ceramic-warning/20';
    const buttonBg = isDanger ? 'bg-ceramic-error' : 'bg-ceramic-warning';
    const buttonHover = isDanger ? 'hover:bg-ceramic-error/90' : 'hover:bg-ceramic-warning/90';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[4px]">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-ceramic-base w-full max-w-md rounded-3xl shadow-2xl relative border border-ceramic-text-secondary/10"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-2xl ${bgColor} ${borderColor} border-2 flex items-center justify-center`}>
                                    <Icon className={`w-6 h-6 ${iconColor}`} />
                                </div>
                                <h2 className="text-xl font-bold text-ceramic-text-primary">
                                    {title}
                                </h2>
                            </div>
                            <button
                                onClick={onCancel}
                                className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                                disabled={isLoading}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <p className="text-ceramic-text-secondary leading-relaxed">
                                {message}
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 p-6 border-t border-ceramic-text-secondary/10">
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={isLoading}
                                className="flex-1 px-6 py-3 rounded-xl ceramic-card font-bold text-ceramic-text-secondary hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {cancelText}
                            </button>

                            <button
                                type="button"
                                onClick={onConfirm}
                                disabled={isLoading}
                                className={`flex-1 px-6 py-3 rounded-xl ${buttonBg} ${buttonHover} text-white font-bold shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2`}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    confirmText
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
