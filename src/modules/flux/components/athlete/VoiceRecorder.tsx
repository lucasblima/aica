/**
 * VoiceRecorder — microphone button with MediaRecorder + Gemini transcription
 *
 * Records audio locally via MediaRecorder API, sends to transcribe-audio
 * Edge Function (Gemini 2.5 Flash) for transcription in Portuguese.
 */

import { Mic, MicOff, Square, X, Loader2 } from 'lucide-react';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export interface VoiceRecorderProps {
  onTranscriptChange: (transcript: string, durationSeconds: number) => void;
  initialTranscript?: string;
}

export function VoiceRecorder({ onTranscriptChange, initialTranscript }: VoiceRecorderProps) {
  const {
    isRecording,
    isTranscribing,
    isSupported,
    transcript,
    duration,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
  } = useVoiceRecorder();

  const displayTranscript = transcript || initialTranscript || '';

  const handleStop = () => {
    stopRecording();
    // Transcript will be set async after transcription completes
  };

  // Sync transcript to parent when it changes
  if (transcript && transcript !== initialTranscript) {
    onTranscriptChange(transcript, duration);
  }

  const handleClear = () => {
    clearTranscript();
    onTranscriptChange('', 0);
  };

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-ceramic-cool/40">
        <MicOff className="w-4 h-4 text-ceramic-text-secondary" />
        <span className="text-xs text-ceramic-text-secondary">
          Gravacao de voz nao suportada neste navegador
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Recording controls */}
      <div className="flex items-center gap-2">
        {isRecording ? (
          <button
            type="button"
            onClick={handleStop}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            <span>{formatDuration(duration)}</span>
            <Square className="w-3 h-3" />
          </button>
        ) : isTranscribing ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200/50 text-amber-700 text-xs font-bold rounded-xl">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Transcrevendo...</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2 bg-ceramic-cool hover:bg-ceramic-cool/80 text-ceramic-text-primary text-xs font-bold rounded-xl transition-colors"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Gravar audio</span>
          </button>
        )}

        {displayTranscript && !isRecording && !isTranscribing && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          >
            <X className="w-3 h-3" />
            <span>Limpar</span>
          </button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Transcript display */}
      {displayTranscript && (
        <div className="px-3 py-2.5 rounded-xl bg-ceramic-cool/30 border border-ceramic-border/30">
          <p className="text-xs text-ceramic-text-secondary italic leading-relaxed">
            &ldquo;{displayTranscript}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
