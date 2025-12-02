import React from 'react';
import { Clock, Play, Pause, RotateCcw, Edit2, Layout, Save } from 'lucide-react';
import { Dossier } from '../../types';

interface StudioHeaderProps {
    dossier: Dossier;
    currentTime: Date;
    isRunning: boolean;
    elapsedTime: number;
    connectionStatus: string;
    isEditingProject: boolean;
    onBack: () => void;
    onTogglePlay: () => void;
    onReset: () => void;
    onEditProject: () => void;
    onSaveProject: () => void;
    onToggleLayout?: () => void;
}

const SyncStatus: React.FC<{ isConnected: boolean }> = ({ isConnected }) => (
    <div className="relative flex h-3 w-3">
        {isConnected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
    </div>
);

export const StudioHeader: React.FC<StudioHeaderProps> = ({
    dossier,
    currentTime,
    isRunning,
    elapsedTime,
    connectionStatus,
    isEditingProject,
    onBack,
    onTogglePlay,
    onReset,
    onEditProject,
    onSaveProject,
    onToggleLayout
}) => {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <header className="border-b border-zinc-800 px-6 bg-zinc-950">
            <div className="h-16 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button onClick={onBack} className="text-xs text-zinc-500 hover:text-white uppercase tracking-wider">← Voltar para Prep</button>
                    <div className="h-6 w-px bg-zinc-800" />
                    <div>
                        <h1 className="text-sm font-bold text-white leading-none">{dossier.guestName}</h1>
                        <p className="text-xs text-zinc-500 leading-none mt-1">{dossier.episodeTheme}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center space-x-2 bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-800">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        <span className="font-mono text-xl font-bold text-white">{currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={`flex items-center space-x-3 px-4 py-2 rounded-lg border ${isRunning ? 'bg-red-950/30 border-red-900' : 'bg-zinc-900 border-zinc-800'}`}>
                        <span className={`font-mono text-xl font-bold ${isRunning ? 'text-red-500' : 'text-zinc-400'}`}>{formatTime(elapsedTime)}</span>
                        <div className="flex space-x-1">
                            <button onClick={onTogglePlay} className={`p-1 hover:bg-zinc-700 rounded ${isRunning ? 'text-yellow-500' : 'text-green-500'}`}>
                                {isRunning ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4" fill="currentColor" />}
                            </button>
                            <button onClick={onReset} className="p-1 hover:bg-zinc-700 rounded text-zinc-500"><RotateCcw className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <SyncStatus isConnected={connectionStatus === 'connected'} />
                        <span className="text-sm capitalize text-zinc-400">{connectionStatus}</span>
                    </div>
                    {!isEditingProject ? (
                        <div className="flex gap-2">
                            <button
                                onClick={onEditProject}
                                className="p-2 text-indigo-400 hover:bg-indigo-600/20 rounded-lg transition-colors"
                                title="Editar Projeto"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            {onToggleLayout && (
                                <button
                                    onClick={onToggleLayout}
                                    className="p-2 text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors"
                                    title="Alterar Layout"
                                >
                                    <Layout className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={onSaveProject}
                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            <span className="text-xs font-bold">Salvar</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};
