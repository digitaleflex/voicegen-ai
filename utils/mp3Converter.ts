
/**
 * Converts raw PCM 16-bit (little-endian) to MP3.
 * Gemini TTS provides 24000Hz mono.
 */
export function convertPcmToMp3(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  // Accès à lamejs via le scope global (window) car l'import ESM est instable pour cette lib
  const lame = (window as any).lamejs;
  if (!lame) {
    throw new Error("La bibliothèque LAME n'est pas chargée. Vérifiez votre connexion internet.");
  }

  // Convert Uint8Array buffer to Int16Array (16-bit PCM)
  const pcm16 = new Int16Array(pcmData.buffer);
  
  // Mp3Encoder(channels, samplerate, kbps)
  const mp3encoder = new lame.Mp3Encoder(1, sampleRate, 128);
  const mp3Data: Uint8Array[] = [];

  const sampleBlockSize = 576; // multiple of 576 is standard for LAME
  
  for (let i = 0; i < pcm16.length; i += sampleBlockSize) {
    const sampleChunk = pcm16.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  const endBuf = mp3encoder.flush();
  if (endBuf.length > 0) {
    mp3Data.push(new Uint8Array(endBuf));
  }

  return new Blob(mp3Data, { type: 'audio/mp3' });
}
