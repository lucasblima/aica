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
        <header className="border-b border-[#D6D3CD]/50 px-6 bg-ceramic-base pt-4 pb-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button data-testid="back-to-library" onClick={onBack} className="text-xs font-bold text-ceramic-text-secondary hover:text-ceramic-text-primary uppercase tracking-wider transition-colors flex items-center gap-1">
                        ← Voltar
                    </button>
                    <div className="h-6 w-px bg-[#D6D3CD]" />
                    <div>
                        <h1 className="text-lg font-black text-ceramic-text-primary leading-none tracking-tight">{dossier.guestName}</h1>
                        <p className="text-xs font-medium text-ceramic-text-secondary leading-none mt-1">{dossier.episodeTheme}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Clock */}
                    <div className="flex items-center space-x-2 bg-[#EBE9E4] px-4 py-2 rounded-xl shadow-[inset_2px_2px_4px_rgba(163,158,145,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]">
                        <Clock className="w-4 h-4 text-ceramic-text-tertiary" />
                        <span className="font-mono text-lg font-bold text-ceramic-text-primary">{currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Timer & Controls */}
                    <div className={`flex items-center space-x-3 px-4 py-2 rounded-xl border transition-all ${isRunning ? 'bg-red-50 border-red-100 shadow-[inset_2px_2px_4px_rgba(239,68,68,0.1)]' : 'bg-[#EBE9E4] border-transparent shadow-[inset_2px_2px_4px_rgba(163,158,145,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]'}`}>
                        <span className={`font-mono text-lg font-bold w-16 text-center ${isRunning ? 'text-red-600' : 'text-ceramic-text-tertiary'}`}>{formatTime(elapsedTime)}</span>
                        <div className="flex space-x-1">
                            <button
                                onClick={onTogglePlay}
                                className={`p-1.5 rounded-lg transition-all shadow-sm ${isRunning ? 'bg-white text-red-500 hover:scale-105' : 'bg-white text-green-600 hover:scale-105'}`}
                            >
                                {isRunning ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4" fill="currentColor" />}
                            </button>
                            <button onClick={onReset} className="p-1.5 hover:bg-black/5 rounded-lg text-ceramic-text-secondary transition-colors">
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Connection Status */}
                    <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-[#EBE9E4] shadow-[inset_2px_2px_4px_rgba(163,158,145,0.15)]">
                        <SyncStatus isConnected={connectionStatus === 'connected'} />
                        <span className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">{connectionStatus}</span>
                    </div>

                    {/* Actions */}
                    {!isEditingProject ? (
                        <div className="flex gap-2">
                            <button
                                onClick={onEditProject}
                                className="p-3 text-ceramic-text-secondary hover:text-ceramic-text-primary bg-[#EBE9E4] hover:bg-white rounded-xl shadow-[2px_2px_5px_rgba(163,158,145,0.15),-2px_-2px_5px_rgba(255,255,255,0.8)] transition-all active:scale-95"
                                title="Editar Projeto"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            {onToggleLayout && (
                                <button
                                    onClick={onToggleLayout}
                                    className="p-3 text-ceramic-text-secondary hover:text-ceramic-text-primary bg-[#EBE9E4] hover:bg-white rounded-xl shadow-[2px_2px_5px_rgba(163,158,145,0.15),-2px_-2px_5px_rgba(255,255,255,0.8)] transition-all active:scale-95"
                                    title="Alterar Layout"
                                >
                                    <Layout className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={onSaveProject}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 font-bold"
                        >
                            <Save className="w-4 h-4" />
                            <span>Salvar</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};
