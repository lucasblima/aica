import React, { useState } from 'react';
import { MessageSquare, Send, Mic, Headphones, Sparkles, Captions, Construction } from 'lucide-react';
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
    isLiveDisabled?: boolean; // Flag to show "Coming Soon" notice
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
    isChatLoading,
    isLiveDisabled = false
}) => {
    const [chatInput, setChatInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim()) {
            onSendMessage(chatInput);
            setChatInput('');
        }
    };

    // Show "Coming Soon" banner if Live is disabled
    if (isLiveDisabled) {
        return (
            <div className="flex flex-col h-full gap-4">
                {/* Coming Soon Banner */}
                <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-8 text-center">
                    <div className="p-4 bg-white rounded-2xl shadow-lg mb-6">
                        <Construction className="w-12 h-12 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-bold text-[#5C554B] mb-2">
                        Co-Host Aica Live
                    </h3>
                    <p className="text-[#948D82] text-sm max-w-xs mb-4">
                        A integração em tempo real com Gemini será implementada em breve.
                    </p>
                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-600 text-xs font-bold rounded-full">
                            Em Desenvolvimento
                        </span>
                    </div>
                </div>

                {/* Chat Area (Still Available) */}
                <div className="flex-1 bg-white border border-[#D6D3CD]/50 rounded-xl overflow-hidden flex flex-col shadow-sm">
                    <div className="p-3 bg-[#F0EFE9] border-b border-[#D6D3CD]/30 text-xs font-bold text-[#948D82] uppercase tracking-wider flex items-center gap-2">
                        <MessageSquare className="w-3 h-3" />
                        Chat com Aica
                    </div>

                    <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scroll bg-[#FAFAF9]">
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-2.5 rounded-xl text-sm shadow-sm ${msg.role === 'user'
                                    ? 'bg-[#5C554B] text-white rounded-tr-none'
                                    : 'bg-white text-[#5C554B] border border-[#E5E3DC] rounded-tl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isChatLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-[#E5E3DC] p-3 rounded-xl rounded-tl-none flex gap-1 shadow-sm">
                                    <div className="w-1.5 h-1.5 bg-[#948D82] rounded-full animate-bounce" />
                                    <div className="w-1.5 h-1.5 bg-[#948D82] rounded-full animate-bounce delay-100" />
                                    <div className="w-1.5 h-1.5 bg-[#948D82] rounded-full animate-bounce delay-200" />
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="p-2 border-t border-[#E5E3DC] bg-white">
                        <div className="relative">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Pergunte algo à Aica..."
                                className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-[#F0EFE9] text-sm text-[#5C554B] placeholder-[#948D82] focus:outline-none focus:ring-2 focus:ring-[#D6D3CD]/50 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!chatInput.trim() || isChatLoading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#5C554B] hover:bg-[#D6D3CD]/30 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Control Buttons */}

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => liveMode === 'monitor' ? onStopSession() : onStartSession('monitor')}
                    className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 ${liveMode === 'monitor'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-[inset_2px_2px_4px_rgba(99,102,241,0.1)]'
                        : 'bg-white border-[#D6D3CD]/50 text-[#5C554B] hover:bg-[#F0EFE9] shadow-[2px_2px_5px_rgba(163,158,145,0.1)] hover:shadow-[4px_4px_10px_rgba(163,158,145,0.15)] hover:-translate-y-0.5'
                        }`}
                >
                    <Headphones className={`w-6 h-6 ${liveMode === 'monitor' ? 'animate-pulse' : ''}`} />
                    <div className="text-center">
                        <div className="text-xs font-bold uppercase tracking-wider">Monitorar</div>
                        <div className="text-[10px] opacity-70 mt-0.5">Ouvir & Transcrever</div>
                    </div>
                </button>

                <button
                    onClick={() => liveMode === 'cohost' ? onStopSession() : onStartSession('cohost')}
                    className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 ${liveMode === 'cohost'
                        ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-[inset_2px_2px_4px_rgba(168,85,247,0.1)]'
                        : 'bg-white border-[#D6D3CD]/50 text-[#5C554B] hover:bg-[#F0EFE9] shadow-[2px_2px_5px_rgba(163,158,145,0.1)] hover:shadow-[4px_4px_10px_rgba(163,158,145,0.15)] hover:-translate-y-0.5'
                        }`}
                >
                    <Sparkles className={`w-6 h-6 ${liveMode === 'cohost' ? 'animate-pulse' : ''}`} />
                    <div className="text-center">
                        <div className="text-xs font-bold uppercase tracking-wider">Co-Host Aica</div>
                        <div className="text-[10px] opacity-70 mt-0.5">Interagir & Falar</div>
                    </div>
                </button>
            </div>

            {/* Audio Visualizer */}
            <div className="h-12 bg-[#E5E3DC] rounded-xl overflow-hidden flex items-center justify-center relative shadow-[inset_2px_2px_4px_rgba(163,158,145,0.15)]">
                <div
                    className="absolute left-0 top-0 bottom-0 bg-green-400 transition-all duration-75 ease-out opacity-30"
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
            <div className="flex-1 bg-white border border-[#D6D3CD]/50 rounded-xl overflow-hidden flex flex-col shadow-sm">
                <div className="p-3 bg-[#F0EFE9] border-b border-[#D6D3CD]/30 text-xs font-bold text-[#948D82] uppercase tracking-wider flex items-center gap-2">
                    <Captions className="w-3 h-3" />
                    Transcrição em Tempo Real
                </div>
                <div className="flex-1 p-4 overflow-y-auto text-sm text-[#5C554B] leading-relaxed custom-scroll">
                    {transcript ? (
                        <p>{transcript}</p>
                    ) : (
                        <div className="h-full flex items-center justify-center text-[#948D82] italic text-xs">
                            Aguardando áudio...
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-white border border-[#D6D3CD]/50 rounded-xl overflow-hidden flex flex-col shadow-sm">
                <div className="p-3 bg-[#F0EFE9] border-b border-[#D6D3CD]/30 text-xs font-bold text-[#948D82] uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" />
                    Chat de Controle
                </div>

                <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scroll bg-[#FAFAF9]">
                    {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-2.5 rounded-xl text-sm shadow-sm ${msg.role === 'user'
                                ? 'bg-[#5C554B] text-white rounded-tr-none'
                                : 'bg-white text-[#5C554B] border border-[#E5E3DC] rounded-tl-none'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isChatLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-[#E5E3DC] p-3 rounded-xl rounded-tl-none flex gap-1 shadow-sm">
                                <div className="w-1.5 h-1.5 bg-[#948D82] rounded-full animate-bounce" />
                                <div className="w-1.5 h-1.5 bg-[#948D82] rounded-full animate-bounce delay-100" />
                                <div className="w-1.5 h-1.5 bg-[#948D82] rounded-full animate-bounce delay-200" />
                            </div>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-2 border-t border-[#E5E3DC] bg-white">
                    <div className="relative">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Enviar comando para Aica..."
                            className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-[#F0EFE9] text-sm text-[#5C554B] placeholder-[#948D82] focus:outline-none focus:ring-2 focus:ring-[#D6D3CD]/50 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!chatInput.trim() || isChatLoading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#5C554B] hover:bg-[#D6D3CD]/30 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
