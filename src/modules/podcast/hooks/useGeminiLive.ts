import { useState, useRef, useEffect } from 'react';
import { getLiveClient } from '../services/geminiService';
import { arrayBufferToBase64, floatTo16BitPCM, downsampleBuffer } from '../services/audioUtils';
import { Modality } from '@google/genai';
import { Dossier } from '../types';

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

    const startSession = async (mode: 'monitor' | 'cohost') => {
        if (isConnectedRef.current) {
            console.warn('Session already active');
            return;
        }

        setConnectionStatus('connecting');
        setLiveMode(mode);

        try {
            const liveClient = getLiveClient();

            // Initialize Audio Contexts
            inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
            outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });

            // Get user microphone
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

            // System instruction based on mode
            const systemInstruction = mode === 'monitor'
                ? `Você é um assistente de áudio em modo monitor. Transcreva o áudio em tempo real sem interromper.`
                : `Você é um co-host de podcast experiente. Participe da conversa de forma natural.
                   Contexto do episódio: ${dossier.guestName} - ${dossier.episodeTheme}.`;

            // Connect to Gemini Live API
            const session = await liveClient.connect({
                model: 'gemini-2.5-flash-exp',
                config: {
                    responseModalities: [Modality.AUDIO, Modality.TEXT],
                    inputAudioTranscription: {},
                    systemInstruction: {
                        parts: [{ text: systemInstruction }]
                    }
                },
                callbacks: {
                    onopen: () => {
                        console.log('[Gemini Live] WebSocket opened');
                        isConnectedRef.current = true;
                        setConnectionStatus('connected');
                    },
                    onmessage: (message) => {
                        console.log('[Gemini Live] Message received:', message);

                        // Handle server content
                        if (message.serverContent) {
                            // Process text transcript
                            const textPart = message.serverContent.modelTurn?.parts?.find(p => p.text);
                            if (textPart?.text) {
                                setRealtimeTranscript(prev => prev + ' ' + textPart.text);
                            }

                            // Process audio response
                            const audioPart = message.serverContent.modelTurn?.parts?.find(p => p.inlineData);
                            if (audioPart?.inlineData?.data) {
                                playAudioChunk(audioPart.inlineData.data);
                            }
                        }

                        // Handle turn complete
                        if (message.serverContent?.turnComplete) {
                            console.log('[Gemini Live] Turn complete');
                        }
                    },
                    onerror: (error) => {
                        console.error('[Gemini Live] WebSocket error:', error);
                        setConnectionStatus('disconnected');
                    },
                    onclose: (event) => {
                        console.log('[Gemini Live] WebSocket closed:', event.code, event.reason);
                        isConnectedRef.current = false;
                        setConnectionStatus('disconnected');
                    }
                }
            });

            sessionRef.current = session;

            // Setup audio processing pipeline
            const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            processorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

            processorRef.current.onaudioprocess = (e) => {
                if (!isConnectedRef.current || !sessionRef.current) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const downsampledBuffer = downsampleBuffer(inputData, 48000, 16000);
                const pcm16Buffer = floatTo16BitPCM(downsampledBuffer);
                const base64Audio = arrayBufferToBase64(pcm16Buffer.buffer);

                // Calculate audio level for UI
                const sum = inputData.reduce((acc, val) => acc + Math.abs(val), 0);
                const avgLevel = (sum / inputData.length) * 100;
                setAudioLevel(avgLevel);

                // Send audio to Gemini
                session.send({ realtimeInput: { audio: base64Audio } });
            };

            source.connect(processorRef.current);
            processorRef.current.connect(inputAudioContextRef.current.destination);

        } catch (error) {
            console.error('[Gemini Live] Failed to start session:', error);
            setConnectionStatus('disconnected');
            setLiveMode('idle');
            await stopSession();
        }
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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopSession();
        };
    }, []);

    return {
        liveMode,
        connectionStatus,
        realtimeTranscript,
        audioLevel,
        startSession,
        stopSession,
        isConnected: isConnectedRef.current,
        isLiveDisabled: false // Feature now enabled!
    };
};
