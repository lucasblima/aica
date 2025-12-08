import React from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    FileText,
    Scissors,
    Newspaper,
    Share2,
    Sparkles,
    Clock
} from 'lucide-react';
import { Dossier } from '../types';

interface PostProductionHubProps {
    dossier: Dossier;
    projectId: string;
    recordingDuration?: number;
    onBack: () => void;
}

const COMING_SOON_FEATURES = [
    {
        id: 'transcription',
        icon: FileText,
        title: 'Transcrição Automática',
        description: 'Transcrição completa em texto do episódio com timestamps',
        color: 'from-blue-400 to-blue-500',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600'
    },
    {
        id: 'cuts',
        icon: Scissors,
        title: 'Cortes & Shorts',
        description: 'Geração automática de cortes para TikTok, Reels e Shorts',
        color: 'from-purple-400 to-purple-500',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600'
    },
    {
        id: 'blog',
        icon: Newspaper,
        title: 'Blog Posts',
        description: 'Artigos otimizados para SEO baseados no conteúdo do episódio',
        color: 'from-green-400 to-green-500',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600'
    },
    {
        id: 'social',
        icon: Share2,
        title: 'Publicação em Redes',
        description: 'Publicação automática no Instagram, TikTok e YouTube',
        color: 'from-pink-400 to-pink-500',
        iconBg: 'bg-pink-100',
        iconColor: 'text-pink-600'
    }
];

export const PostProductionHub: React.FC<PostProductionHubProps> = ({
    dossier,
    projectId,
    recordingDuration = 0,
    onBack
}) => {
    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hrs > 0) return `${hrs}h ${mins}min`;
        return `${mins} minutos`;
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
                                Pós-Produção
                            </h1>
                            <p className="text-sm text-ceramic-text-secondary">
                                {dossier.guestName} • {dossier.episodeTheme}
                            </p>
                        </div>
                    </div>

                    {recordingDuration > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-100 text-green-700">
                            <Clock className="w-4 h-4" />
                            <span className="font-bold text-sm">
                                Duração: {formatDuration(recordingDuration)}
                            </span>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                    {/* Success Message */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Sparkles className="w-10 h-10 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-ceramic-text-primary mb-2">
                            Gravação Concluída! 🎉
                        </h2>
                        <p className="text-ceramic-text-secondary">
                            O episódio com {dossier.guestName} foi salvo com sucesso.
                        </p>
                    </motion.div>

                    {/* Coming Soon Features */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-ceramic-text-primary mb-4">
                            Funcionalidades em Desenvolvimento
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {COMING_SOON_FEATURES.map((feature, index) => (
                                <motion.div
                                    key={feature.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="relative bg-white rounded-2xl shadow-sm border border-[#E5E3DC] p-6 overflow-hidden group hover:shadow-md transition-shadow"
                                >
                                    {/* Coming Soon Badge */}
                                    <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                                        Em breve
                                    </div>

                                    {/* Gradient Overlay (subtle) */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity`} />

                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center flex-shrink-0`}>
                                            <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-ceramic-text-primary mb-1">
                                                {feature.title}
                                            </h4>
                                            <p className="text-sm text-ceramic-text-secondary">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Inspirational Note */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 text-center"
                    >
                        <p className="text-sm text-indigo-800 italic">
                            "A visão do Aica Studio é ser como o Opus Clip: transformar automaticamente
                            seu episódio em conteúdo otimizado para todas as plataformas."
                        </p>
                        <p className="text-xs text-indigo-600 mt-2 font-medium">
                            — Roadmap Aica 2025
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default PostProductionHub;
