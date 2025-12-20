import React from 'react';
import { Mic, Square } from 'lucide-react';

interface AudioConsoleProps {
    isRecording: boolean;
    onToggleRecording: () => void;
    recordingDuration: number; // in seconds
    isGuestConnected: boolean;
}

export const AudioConsole: React.FC<AudioConsoleProps> = ({
    isRecording,
    onToggleRecording,
    recordingDuration,
    isGuestConnected
}) => {
    const formatDuration = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            {/* Main Console Card */}
            <div className="px-8 py-6 rounded-[2.5rem] bg-[#F0EFE9]/95 backdrop-blur-md shadow-[8px_8px_20px_rgba(163,158,145,0.25),-8px_-8px_20px_rgba(255,255,255,0.9)] border border-white/50 flex items-center gap-10">

                {/* REC Button */}
                <div className="relative group">
                    <button
                        onClick={onToggleRecording}
                        className={`
              relative w-20 h-20 rounded-full flex items-center justify-center
              transition-all duration-300
              ${isRecording
                                ? 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] scale-95'
                                : 'bg-[#E5E3DC] shadow-[6px_6px_12px_rgba(163,158,145,0.3),-6px_-6px_12px_rgba(255,255,255,0.9)] hover:shadow-[8px_8px_16px_rgba(163,158,145,0.4),-8px_-8px_16px_rgba(255,255,255,1)] hover:-translate-y-1'
                            }
            `}
                    >
                        {isRecording ? (
                            <>
                                <Square className="w-8 h-8 text-white fill-white" />
                                {/* Pulsing ring */}
                                <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-20" />
                            </>
                        ) : (
                            <Mic className="w-8 h-8 text-[#5C554B]" />
                        )}
                    </button>

                    {/* "NO AR" Label */}
                    {isRecording && (
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 animate-pulse">
                                Gravando
                            </span>
                        </div>
                    )}
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-16 bg-gradient-to-b from-transparent via-[#D6D3CD] to-transparent" />

                {/* Timer Display */}
                <div className="text-center min-w-[140px]">
                    <div className="font-mono text-4xl font-black text-[#5C554B] tabular-nums tracking-tight">
                        {formatDuration(recordingDuration)}
                    </div>
                    <div className="text-[10px] font-bold text-[#948D82] uppercase tracking-[0.2em] mt-1">
                        Duração
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-16 bg-gradient-to-b from-transparent via-[#D6D3CD] to-transparent" />

                {/* Guest Connection Status */}
                <div className="flex items-center gap-4">
                    {/* Status Dot */}
                    <div className="relative">
                        <div
                            className={`
                w-4 h-4 rounded-full transition-all duration-300 border-2 border-[#F0EFE9]
                ${isGuestConnected
                                    ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]'
                                    : 'bg-[#D6D3CD]'
                                }
              `}
                        />
                        {isGuestConnected && (
                            <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-30" />
                        )}
                    </div>

                    {/* Status Text */}
                    <div className="text-left">
                        <div className="text-sm font-bold text-[#5C554B]">
                            {isGuestConnected ? 'Conectado' : 'Aguardando'}
                        </div>
                        <div className="text-[10px] font-medium text-[#948D82] uppercase tracking-wider">
                            Convidado
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AudioConsole;
