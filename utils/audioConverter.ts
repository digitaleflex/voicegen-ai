
/**
 * Decodes a base64 string to a Uint8Array
 */
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Concatenates multiple Uint8Array PCM buffers
 */
export function concatPcmBuffers(buffers: Uint8Array[]): Uint8Array {
  const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const b of buffers) {
    result.set(b, offset);
    offset += b.length;
  }
  return result;
}

/**
 * Generates silence PCM data (16-bit mono)
 * @param durationMs duration in milliseconds
 * @param sampleRate usually 24000
 */
export function generateSilence(durationMs: number, sampleRate: number = 24000): Uint8Array {
  const numSamples = Math.floor((durationMs / 1000) * sampleRate);
  return new Uint8Array(numSamples * 2); // 16-bit = 2 bytes per sample
}

/**
 * Encapsulates raw PCM data into a WAV container
 * Gemini TTS returns 24kHz mono PCM 16-bit
 */
export function createWavBlob(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF chunk descriptor
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + pcmData.length, true); // chunk size
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // fmt sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // subchunk1size (16 for PCM)
  view.setUint16(20, 1, true); // audio format (1 for PCM)
  view.setUint16(22, 1, true); // num channels (1 for mono)
  view.setUint32(24, sampleRate, true); // sample rate
  view.setUint32(28, sampleRate * 2, true); // byte rate (sampleRate * numChannels * bitsPerSample/8)
  view.setUint16(32, 2, true); // block align (numChannels * bitsPerSample/8)
  view.setUint16(34, 16, true); // bits per sample

  // data sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, pcmData.length, true); // subchunk2size

  return new Blob([header, pcmData], { type: 'audio/wav' });
}
