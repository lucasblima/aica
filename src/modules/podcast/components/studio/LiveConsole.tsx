import React, { useState } from 'react';
import { MessageSquare, Send, Mic, Headphones, Sparkles, Captions } from 'lucide-react';
import { LiveMode } from '../../hooks/useGeminiLive';

interface LiveConsoleProps {
    liveMode: LiveMode;
    connectionStatus: string;
    transcript: string;
    audioLevel: number;
    onStartSession: (mode: 'monitor' | 'cohost') => void;
    onStopSession: () => void;
    onSendMessage: (text: string) => void;
    chatMessages: any[];
    isChatLoading: boolean;
}

export const LiveConsole: React.FC<LiveConsoleProps> = ({
    liveMode,
    connectionStatus,
    transcript,
    audioLevel,
    onStartSession,
    onStopSession,
    onSendMessage,
    chatMessages,
    isChatLoading
}) => {
    const [chatInput, setChatInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim()) {
            onSendMessage(chatInput);
            setChatInput('');
        }
    };

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Control Buttons */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => liveMode === 'monitor' ? onStopSession() : onStartSession('monitor')}
                    className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 ${liveMode === 'monitor'
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-inner'
                            : 'bg-white border-[#E5E3DC] text-[#5C554B] hover:bg-[#F0EFE9] shadow-sm'
                        }`}
                >
                    <Headphones className={`w-6 h-6 ${liveMode === 'monitor' ? 'animate-pulse' : ''}`} />
                    <div className="text-center">
                        <div className="text-xs font-bold">Monitorar</div>
                        <div className="text-[10px] opacity-70">Ouvir & Transcrever</div>
                    </div>
                </button>

                <button
                    onClick={() => liveMode === 'cohost' ? onStopSession() : onStartSession('cohost')}
                    className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 ${liveMode === 'cohost'
                            ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-inner'
                            : 'bg-white border-[#E5E3DC] text-[#5C554B] hover:bg-[#F0EFE9] shadow-sm'
                        }`}
                >
                    <Sparkles className={`w-6 h-6 ${liveMode === 'cohost' ? 'animate-pulse' : ''}`} />
                    <div className="text-center">
                        <div className="text-xs font-bold">Co-Host Aica</div>
                        <div className="text-[10px] opacity-70">Interagir & Falar</div>
                    </div>
                </button>
            </div>

            {/* Audio Visualizer */}
            <div className="h-12 bg-[#E5E3DC] rounded-lg overflow-hidden flex items-center justify-center relative">
                <div
                    className="absolute left-0 top-0 bottom-0 bg-green-400 transition-all duration-75 ease-out opacity-50"
                    style={{ width: `${audioLevel}%` }}
                />
                <div className="flex gap-1 relative z-10">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="w-1 bg-[#5C554B]/20 rounded-full transition-all duration-75"
                            style={{
                                height: Math.max(4, Math.random() * (audioLevel / 2)),
                                opacity: i / 20 < audioLevel / 100 ? 1 : 0.3
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Transcript Area */}
            <div className="flex-1 ceramic-card rounded-xl overflow-hidden flex flex-col bg-white/50">
                <div className="p-2 bg-[#E5E3DC] text-xs font-bold text-[#5C554B] flex items-center gap-2">
                    <Captions className="w-3 h-3" />
                    Transcrição em Tempo Real
                </div>
                <div className="flex-1 p-3 overflow-y-auto text-sm text-[#5C554B] leading-relaxed">
                    {transcript || <span className="text-[#948D82] italic">Aguardando áudio...</span>}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 ceramic-card rounded-xl overflow-hidden flex flex-col bg-white/50">
                <div className="p-2 bg-[#E5E3DC] text-xs font-bold text-[#5C554B] flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" />
                    Chat de Controle
                </div>

                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                    {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-2 rounded-lg text-sm ${msg.role === 'user'
                                    ? 'bg-[#5C554B] text-white'
                                    : 'bg-indigo-50 text-indigo-800 border border-indigo-100'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isChatLoading && (
                        <div className="flex justify-start">
                            <div className="bg-[#E5E3DC] p-2 rounded-lg flex gap-1">
                                <div className="w-1.5 h-1.5 bg-[#948D82] rounded-full animate-bounce" />
                                <div className="w-1.5 h-1.5 bg-[#948D82] rounded-full animate-bounce delay-100" />
                                <div className="w-1.5 h-1.5 bg-[#948D82] rounded-full animate-bounce delay-200" />
                            </div>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-2 border-t border-[#E5E3DC]">
                    <div className="relative">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Enviar comando..."
                            className="w-full pl-3 pr-10 py-2 rounded-lg bg-[#F0EFE9] text-sm focus:outline-none"
                        />
                        <button
                            type="submit"
                            disabled={!chatInput.trim() || isChatLoading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5C554B] disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
