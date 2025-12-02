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
            <div className="px-8 py-6 rounded-[2rem] backdrop-blur-xl bg-white/80 shadow-[8px_8px_20px_rgba(163,158,145,0.2),-8px_-8px_20px_rgba(255,255,255,0.9)] border border-white/40 flex items-center gap-8">

                {/* REC Button */}
                <div className="relative">
                    <button
                        onClick={onToggleRecording}
                        className={`
              relative w-20 h-20 rounded-full flex items-center justify-center
              transition-all duration-300
              ${isRecording
                                ? 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.5),inset_0_2px_4px_rgba(255,255,255,0.3)]'
                                : 'shadow-[6px_6px_12px_rgba(163,158,145,0.3),-6px_-6px_12px_rgba(255,255,255,0.9)] hover:shadow-[8px_8px_16px_rgba(163,158,145,0.4),-8px_-8px_16px_rgba(255,255,255,1)]'
                            }
              active:scale-95
            `}
                    >
                        {isRecording ? (
                            <>
                                <Square className="w-7 h-7 text-white fill-white" />
                                {/* Pulsing ring */}
                                <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-20" />
                            </>
                        ) : (
                            <Mic className="w-7 h-7 text-[#5C554B]" />
                        )}
                    </button>

                    {/* "NO AR" Label */}
                    {isRecording && (
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">
                                NO AR
                            </span>
                        </div>
                    )}
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-12 bg-[#5C554B]/10" />

                {/* Timer Display */}
                <div className="text-center min-w-[120px]">
                    <div className="font-mono text-3xl font-bold text-[#5C554B] tabular-nums">
                        {formatDuration(recordingDuration)}
                    </div>
                    <div className="text-[10px] text-[#948D82] uppercase tracking-wider mt-1">
                        Duração
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-12 bg-[#5C554B]/10" />

                {/* Guest Connection Status */}
                <div className="flex items-center gap-3">
                    {/* Status Dot */}
                    <div className="relative">
                        <div
                            className={`
                w-3 h-3 rounded-full transition-all duration-300
                ${isGuestConnected
                                    ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                                    : 'bg-gray-300'
                                }
              `}
                        />
                        {isGuestConnected && (
                            <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-30" />
                        )}
                    </div>

                    {/* Status Text */}
                    <div className="text-left">
                        <div className="text-sm font-medium text-[#5C554B]">
                            {isGuestConnected ? 'Conectado' : 'Aguardando'}
                        </div>
                        <div className="text-[10px] text-[#948D82]">
                            Convidado
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AudioConsole;
