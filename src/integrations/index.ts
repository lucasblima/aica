/**
 * Integrations - Third-party service integrations
 *
 * This folder contains integrations with external services:
 * - AI/ML services (Gemini for sentiment analysis, Whisper for transcription)
 * - Feature-specific integrations (Journey rendering)
 *
 * Import from this barrel export for clean, centralized access to all integrations:
 * import { transcribeAudioWithWhisper, analyzeSentimentWithGemini } from '@/integrations'
 */

// ============ Journey Integration ============
export { renderJourney as journeyIntegration } from './journeyIntegration';

// ============ Gemini Sentiment Analysis ============
export {
  analyzeSentimentWithGemini,
  compareSentiments,
  detectEmotionalPatterns,
  generateSentimentInsights,
  batchAnalyzeSentiments,
  getCachedOrAnalyzeSentiment,
  clearSentimentCache,
  getSentimentCacheStats,
} from './geminiSentimentAnalysis';

// ============ Whisper Audio Transcription ============
export {
  transcribeAudioWithWhisper,
  detectAudioLanguage,
  transcribeWithSpeakers,
  validateAudioFile,
  getAudioDuration,
  estimateTranscriptionQuality,
  batchTranscribeAudio,
  calculateTranscriptionMetrics,
  postProcessTranscription,
  type TranscriptionMetrics,
} from './whisperTranscription';
