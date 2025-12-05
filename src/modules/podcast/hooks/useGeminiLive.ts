import { useState, useRef, useEffect } from 'react';
import { getLiveClient } from '../services/geminiService';
import { arrayBufferToBase64, floatTo16BitPCM, downsampleBuffer } from '../services/audioUtils';
import { LiveServerMessage, Modality } from '@google/genai';
import { Dossier } from '../types';

// Type definitions for Live API client
interface LiveClientEventMap {
    content: (content: LiveServerMessage) => void;
    [key: string]: (data: any) => void;
}

interface LiveClient {
    on<K extends keyof LiveClientEventMap>(event: K, handler: LiveClientEventMap[K]): () => void;
    off<K extends keyof LiveClientEventMap>(event: K, handler: LiveClientEventMap[K]): void;
    connect?: () => Promise<void>;
    send?: (data: any) => void;
    close?: () => Promise<void>;
}

export type LiveMode = 'idle' | 'monitor' | 'cohost';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface UseGeminiLiveProps {
    dossier: Dossier;
}

export const useGeminiLive = ({ dossier }: UseGeminiLiveProps) => {
    const [liveMode, setLiveMode] = useState<LiveMode>('idle');
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const [realtimeTranscript, setRealtimeTranscript] = useState('');
    const [audioLevel, setAudioLevel] = useState(0);

    const isConnectedRef = useRef(false);
    const sessionRef = useRef<any>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef(0);
    const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);

    const stopSession = async () => {
        isConnectedRef.current = false;
        setConnectionStatus('disconnected');
        setLiveMode('idle');

        if (sessionRef.current) {
            try { await sessionRef.current.close(); } catch (e) { console.error(e); }
            sessionRef.current = null;
        }

        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (inputAudioContextRef.current) {
            await inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }

        if (outputAudioContextRef.current) {
            await outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }

        scheduledSourcesRef.current.forEach(source => {
            try { source.stop(); } catch (e) { }
        });
        scheduledSourcesRef.current = [];
    };

    // NOTE: startSession is disabled because the Gemini Live API integration
    // requires a complete rewrite. This stub function prevents crashes.
    const startSession = async (mode: 'monitor' | 'cohost') => {
        console.warn('Gemini Live API is not yet implemented. Feature coming soon.');
        // The Live feature is disabled for now
        return;

        /* TODO: Reimplement when Gemini Live SDK is properly understood
        const liveClient = getLiveClient();
        const sessionPromise = liveClient.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO, Modality.TEXT],
                inputAudioTranscription: {},
                systemInstruction: {
                    parts: [{
                        text: `Você é um co-host de podcast experiente...`
                    }]
                }
            }
        });
        ...implementation continues...
        */
    };

    const playAudioChunk = async (base64Audio: string) => {
        if (!outputAudioContextRef.current) return;

        try {
            const binaryString = window.atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

            const audioBuffer = await outputAudioContextRef.current.decodeAudioData(bytes.buffer);
            const source = outputAudioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContextRef.current.destination);

            const currentTime = outputAudioContextRef.current.currentTime;
            const startTime = Math.max(currentTime, nextStartTimeRef.current);
            source.start(startTime);
            nextStartTimeRef.current = startTime + audioBuffer.duration;

            scheduledSourcesRef.current.push(source);
            source.onended = () => {
                scheduledSourcesRef.current = scheduledSourcesRef.current.filter(s => s !== source);
            };
        } catch (e) {
            console.error('Error playing audio chunk:', e);
        }
    };

    // NOTE: The Gemini Live API listener (liveClient.on) was removed because
    // the @google/genai SDK doesn't expose an EventEmitter-like interface.
    // This feature requires a complete rewrite to use the correct SDK patterns.
    // For now, the hook returns stub values to prevent crashes.
    //
    // TODO: Implement proper Gemini Live integration when SDK documentation improves.

    return {
        liveMode,
        connectionStatus,
        realtimeTranscript,
        audioLevel,
        startSession,
        stopSession,
        isConnected: isConnectedRef.current,
        isLiveDisabled: true // Flag to show "Coming Soon" in UI
    };
};
