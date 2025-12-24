/**
 * Audio Utilities for Podcast Production
 *
 * Helper functions for audio processing, encoding, and streaming.
 * Used primarily for Gemini Live real-time audio streaming.
 *
 * Migrated from: _deprecated/modules/podcast/services/audioUtils.ts
 * Wave 4.2: Utility Migration
 *
 * @module studio/utils/audioUtils
 */

/**
 * Convert Float32Array to 16-bit PCM format required by Gemini API
 *
 * @param float32Array - Audio data in Float32 format (-1.0 to 1.0)
 * @returns ArrayBuffer containing 16-bit PCM data
 */
export function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;

  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    // Clamp value to -1.0 to 1.0 range
    const clamped = Math.max(-1, Math.min(1, float32Array[i]));

    // Convert to 16-bit signed integer
    const sample = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(offset, sample, true); // true = little-endian
  }

  return buffer;
}

/**
 * Convert base64 string to ArrayBuffer
 *
 * @param base64 - Base64-encoded string
 * @returns Decoded ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

/**
 * Convert ArrayBuffer to base64 string
 *
 * @param buffer - ArrayBuffer to encode
 * @returns Base64-encoded string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;

  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return window.btoa(binary);
}

/**
 * Downsample audio buffer from microphone sample rate to target rate
 *
 * Gemini API expects 16kHz audio, but most microphones output at 44.1kHz or 48kHz.
 * This function performs simple linear interpolation downsampling.
 *
 * @param buffer - Input audio buffer
 * @param inputSampleRate - Source sample rate (e.g., 48000)
 * @param outputSampleRate - Target sample rate (default: 16000 for Gemini)
 * @returns Downsampled Float32Array
 */
export function downsampleBuffer(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number = 16000
): Float32Array {
  // No downsampling needed if rates match
  if (inputSampleRate === outputSampleRate) {
    return buffer;
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);

    // Average samples in the window
    let accum = 0;
    let count = 0;

    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }

    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

/**
 * Calculate audio level from buffer (for UI visualization)
 *
 * @param buffer - Audio buffer to analyze
 * @returns Average audio level (0-100)
 */
export function calculateAudioLevel(buffer: Float32Array): number {
  const sum = buffer.reduce((acc, val) => acc + Math.abs(val), 0);
  const avgLevel = (sum / buffer.length) * 100;
  return Math.min(100, avgLevel); // Cap at 100
}
