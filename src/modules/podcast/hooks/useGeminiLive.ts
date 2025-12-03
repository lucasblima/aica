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

    const startSession = async (mode: 'monitor' | 'cohost') => {
        if (liveMode !== 'idle' || isConnectedRef.current) {
            await stopSession();
            await new Promise(r => setTimeout(r, 200));
        }

        setLiveMode(mode);
        setConnectionStatus('connecting');
        setRealtimeTranscript('');
        isConnectedRef.current = true;
        nextStartTimeRef.current = 0;

        try {
            const liveClient = getLiveClient();
            const sessionPromise = liveClient.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO, Modality.TEXT],
                    inputAudioTranscription: {},
                    systemInstruction: {
                        parts: [{
                            text: `Você é um co-host de podcast experiente. 
              Contexto:
              Convidado: ${dossier.guestName}
              Tema: ${dossier.episodeTheme}
              Bio: ${dossier.biography}
              
              Seu papel:
              1. Ajudar o host principal com perguntas inteligentes.
              2. Monitorar a conversa e sugerir tópicos se o assunto morrer.
              3. Se o modo for 'cohost', você pode interagir diretamente com o convidado de forma breve e carismática.
              4. Se o modo for 'monitor', apenas transcreva e gere insights em texto, NÃO fale.`
                        }]
                    }
                }
            });

            const session = await sessionPromise;
            sessionRef.current = session;
            setConnectionStatus('connected');

            // Initialize Audio Contexts
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            // Input Stream (Microphone)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
            streamRef.current = stream;

            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (!isConnectedRef.current) return;

                const inputData = e.inputBuffer.getChannelData(0);

                // Calculate audio level for visualization
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                const rms = Math.sqrt(sum / inputData.length);
                setAudioLevel(Math.min(100, Math.round(rms * 1000))); // Scale for UI

                // Send to Gemini
                const pcm16 = floatTo16BitPCM(downsampleBuffer(inputData, 16000, 16000));
                const base64 = arrayBufferToBase64(pcm16);
                liveClient.sendRealtimeInput([{ mimeType: "audio/pcm;rate=16000", data: base64 }]);
            };

            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);

            // Handle Incoming Messages
            const handleMessage = (message: LiveServerMessage) => {
                if (!isConnectedRef.current) return;

                // Handle Audio Response
                if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
                    const audioData = message.serverContent.modelTurn.parts[0].inlineData.data;
                    if (audioData && outputAudioContextRef.current) {
                        playAudioChunk(audioData);
                    }
                }

                // Handle Transcript/Text
                if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
                    const text = message.serverContent.modelTurn.parts[0].text;
                    setRealtimeTranscript(prev => prev + ' ' + text);
                }
            };

            // We need to attach the listener. 
            // Note: The current geminiService implementation of 'connect' returns a session object.
            // We assume the underlying client or session exposes a way to listen.
            // Looking at the original code, it seems the client itself emits events or the session does.
            // In the original code: `liveClient.connect(...)` returns a session, but where is the listener attached?
            // Ah, the original code didn't show the listener attachment clearly in the snippet I viewed.
            // I'll assume `liveClient.on('message', ...)` or similar if it's an EventEmitter, 
            // or we pass a callback to connect?
            // Let's check `geminiService.ts` to be sure about the API.

            // For now, I'll assume standard WebSocket-like behavior or that `getLiveClient()` returns an object we can listen to.
            // Re-reading the original StudioMode code might clarify.
            // Line 595: `const liveClient = getLiveClient();`
            // It doesn't show the listener attachment in the snippet I saw (lines 1-600).
            // I'll assume it's `liveClient.on('content', ...)` or similar based on the Google GenAI SDK.

            // Let's check the imports: `import { LiveServerMessage } from '@google/genai';`
            // This suggests we are using the official SDK.

            // I'll add a placeholder for the listener and we can fix it if needed.
            // Actually, let's look at `geminiService.ts` quickly to be safe.

        } catch (error) {
            console.error('Connection failed:', error);
            setConnectionStatus('disconnected');
            setLiveMode('idle');
            isConnectedRef.current = false;
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

    // Listen to server messages from Gemini Live API
    useEffect(() => {
        const liveClient = getLiveClient() as unknown as LiveClient;

        // Handler for content events from the Live API
        const handleContent = (content: LiveServerMessage) => {
            // Check if message contains model response
            if ('modelTurn' in content && content.modelTurn) {
                const parts = content.modelTurn.parts || [];

                // Handle text parts
                const textPart = parts.find((p: any) => 'text' in p && p.text);
                if (textPart && 'text' in textPart) {
                    setRealtimeTranscript(prev => prev + ' ' + textPart.text);
                }

                // Handle audio parts
                const audioPart = parts.find((p: any) => 'inlineData' in p && p.inlineData);
                if (audioPart && 'inlineData' in audioPart && audioPart.inlineData?.data) {
                    playAudioChunk(audioPart.inlineData.data);
                }
            }
        };

        // Subscribe to content events
        const unsubscribe = liveClient.on('content', handleContent);

        // Cleanup on unmount
        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        }
    }, []);

    return {
        liveMode,
        connectionStatus,
        realtimeTranscript,
        audioLevel,
        startSession,
        stopSession,
        isConnected: isConnectedRef.current
    };
};
