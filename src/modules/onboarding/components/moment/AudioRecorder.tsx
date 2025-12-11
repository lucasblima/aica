/**
 * Audio Recorder Component
 * Step 2.6 - Optional audio recording for moment reflection
 *
 * Features:
 * - Record audio from microphone
 * - Visual feedback during recording
 * - Timer display
 * - Playback preview
 * - Delete/Retry options
 * - Max duration enforcement
 *
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Trash2, Play } from 'lucide-react';

export interface AudioRecording {
  blob: Blob;
  duration: number;
  url: string;
}

interface AudioRecorderProps {
  onRecordingComplete: (recording: AudioRecording) => void;
  maxDuration?: number; // seconds
  currentRecording?: AudioRecording;
  onRemoveRecording?: () => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  maxDuration = 120,
  currentRecording,
  onRemoveRecording,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        onRecordingComplete({ blob, duration, url });
        setDuration(0);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      // Timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const next = prev + 1;
          if (next >= maxDuration) {
            stopRecording();
            return prev;
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Toggle playback
  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle audio end
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => setIsPlaying(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-[#2B1B17] mb-2">
          Quer gravar um áudio?
        </h2>
        <p className="text-[#5C554B] text-sm">
          Deixe a reflexão ser ainda mais pessoal (opcional, máx {maxDuration / 60} minuto{maxDuration > 60 ? 's' : ''})
        </p>
      </div>

      {!currentRecording ? (
        <div className="space-y-4">
          {/* Record Button */}
          <motion.button
            onClick={isRecording ? stopRecording : startRecording}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full py-8 rounded-lg font-bold transition-all flex flex-col items-center justify-center gap-3 ${
              isRecording
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-[#6B9EFF] text-white hover:bg-[#5A8FEF]'
            }`}
          >
            {isRecording ? (
              <>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-5 h-5 bg-red-500 rounded-full"
                />
                <span className="text-lg">
                  Gravando... {formatDuration(duration)}
                </span>
              </>
            ) : (
              <>
                <Mic size={32} />
                <span className="text-lg">Clique para Gravar</span>
              </>
            )}
          </motion.button>

          {/* Skip option */}
          <button
            onClick={() => {/* Skip audio */}}
            className="w-full text-[#6B9EFF] font-semibold text-sm hover:underline transition-all"
          >
            Pular esta parte
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Recording Preview */}
          <div className="bg-[#F8F7F5] rounded-lg p-6 border border-[#E8E6E0]">
            <p className="text-xs text-[#948D82] font-semibold mb-3 uppercase tracking-wide">
              Sua Gravação:
            </p>

            {/* Audio Player */}
            <div className="flex gap-3 items-center mb-4">
              <button
                onClick={togglePlayback}
                className="w-10 h-10 rounded-full bg-[#6B9EFF] text-white flex items-center justify-center hover:bg-[#5A8FEF] transition-all"
              >
                <Play size={16} fill="currentColor" />
              </button>
              <audio
                ref={audioRef}
                src={currentRecording.url}
                className="flex-1 h-8"
              />
            </div>

            <p className="text-xs text-[#948D82]">
              Duração: {formatDuration(currentRecording.duration)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onRemoveRecording}
              className="flex-1 px-4 py-3 border border-[#E8E6E0] text-[#5C554B] font-semibold rounded-lg hover:bg-[#F8F7F5] transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              Deletar
            </button>
            <button
              onClick={() => startRecording()}
              className="flex-1 px-4 py-3 border border-[#E8E6E0] text-[#5C554B] font-semibold rounded-lg hover:bg-[#F8F7F5] transition-all"
            >
              Tentar Novamente
            </button>
          </div>

          {/* Use recording confirmation */}
          <div className="bg-green-50 border border-[#51CF66] rounded-lg p-4 text-center">
            <p className="text-sm text-[#2B1B17]">
              <strong>✓</strong> Sua gravação será salva com o momento
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AudioRecorder;
