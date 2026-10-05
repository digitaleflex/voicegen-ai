
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AudioResult, Language, VoiceName, AcousticConfig, PronunciationRule, WordTimestamp, BatchProgress, BatchSegmentItem } from "../types";
import { decodeBase64, createWavBlob, concatPcmBuffers, generateSilence } from "../utils/audioConverter";

/**
 * Applique les règles de prononciation personnalisées (Lexique)
 */
function applyPronunciationRules(text: string, rules: PronunciationRule[]): string {
  let processedText = text;
  const sortedRules = [...rules].sort((a, b) => b.word.length - a.word.length);
  
  for (const rule of sortedRules) {
    if (!rule.word.trim() || !rule.phonetic.trim()) continue;
    const escapedWord = rule.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
    processedText = processedText.replace(regex, rule.phonetic);
  }
  return processedText;
}

/**
 * Normalisation stricte du texte
 */
function normalizeText(text: string): string {
  let normalized = text;
  if (!/[.!?]$/.test(normalized.trim())) {
    normalized = normalized.trim() + ".";
  }
  return normalized;
}

/**
 * Estime les timestamps des mots en se basant sur la durée totale et la complexité des mots.
 * Supporte un offset temporel de départ pour le batch processing multi-segments.
 */
async function estimateWordTimestamps(text: string, totalDuration: number, startOffset: number = 0): Promise<WordTimestamp[]> {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return [];

  // On calcule le poids de chaque mot basé sur sa longueur (les mots longs durent plus longtemps)
  const weights = words.map(w => w.length + 2); // +2 pour compenser les pauses naturelles inter-mots
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  let currentTime = startOffset;
  return words.map((word, i) => {
    const duration = (weights[i] / totalWeight) * totalDuration;
    const timestamp = {
      word,
      startTime: currentTime,
      duration: duration
    };
    currentTime += duration;
    return timestamp;
  });
}

export async function analyzeContent(text: string): Promise<{ language: Language; recommendedVoice: VoiceName; style: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse ce texte pour la synthèse vocale. 
      1. Identifie la langue (French, English, Spanish, German, Italian).
      2. Détermine le style.
      3. Recommande la meilleure voix parmi : 'Charon', 'Kore', 'Puck', 'Fenrir', 'Zephyr'.
      Texte: "${text.substring(0, 1000)}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            language: { type: Type.STRING },
            recommendedVoice: { type: Type.STRING },
            style: { type: Type.STRING }
          },
          required: ["language", "recommendedVoice", "style"]
        }
      }
    });
    const json = JSON.parse(response.text);
    return {
      language: (Object.values(Language).includes(json.language as Language) ? json.language : Language.ENGLISH) as Language,
      recommendedVoice: json.recommendedVoice as VoiceName,
      style: json.style
    };
  } catch (error) {
    return { language: Language.FRENCH, recommendedVoice: 'Fenrir', style: 'Standard' };
  }
}

export async function enhanceScript(text: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Optimise la ponctuation pour un TTS fluide sans changer les mots. Texte : "${text}"`,
    });
    return response.text.trim();
  } catch (err) {
    return text;
  }
}

/**
 * Synthétise un segment de texte unique vers un buffer PCM
 */
async function synthesizeSegment(
  ai: GoogleGenAI,
  segmentText: string,
  voice: VoiceName,
  config: AcousticConfig
): Promise<Uint8Array> {
  const sampleRate = 24000;
  let processed = applyPronunciationRules(segmentText, config.pronunciationRules || []);
  if (config.normalizeText) processed = normalizeText(processed);

  // Sub-segmentation si le texte est long (> 500 chars)
  const maxSegmentLength = 500;
  let subChunks: string[] = [];

  if (config.isSegmented && processed.length > maxSegmentLength) {
    const initial = processed.split(/(?<=[.!?])\s+/);
    for (const chunk of initial) {
      if (chunk.length > maxSegmentLength) {
        const parts = chunk.match(new RegExp(`.{1,${maxSegmentLength}}(?:\\s|$)`, 'g')) || [chunk];
        subChunks.push(...parts.map(s => s.trim()).filter(s => s.length > 0));
      } else {
        subChunks.push(chunk.trim());
      }
    }
  } else {
    subChunks = [processed];
  }

  const chunkPcmList: Uint8Array[] = [];

  for (const chunk of subChunks) {
    if (!chunk.trim()) continue;
    const prompt = `Read clearly: "${chunk.replace(/"/g, "'")}"`;

    const models = ["gemini-2.5-flash-preview-tts", "gemini-3.1-flash-tts-preview"];
    let audioDecoded: Uint8Array | null = null;
    let lastErr: any = null;

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              },
            },
          },
        });

        const audioPart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (audioPart?.inlineData?.data) {
          audioDecoded = decodeBase64(audioPart.inlineData.data);
          break;
        }
      } catch (e) {
        lastErr = e;
      }
    }

    if (audioDecoded) {
      chunkPcmList.push(audioDecoded);
      if (subChunks.length > 1) {
        chunkPcmList.push(generateSilence(180, sampleRate));
      }
    } else {
      console.error("Subchunk synthesis failed:", chunk, lastErr);
      if (subChunks.length === 1) throw lastErr || new Error("Audio segment non généré.");
    }
  }

  if (chunkPcmList.length === 0) {
    throw new Error("Impossible de synthétiser le segment.");
  }

  return concatPcmBuffers(chunkPcmList);
}

export interface BatchGenerationOutput {
  masterResult: AudioResult;
  segmentResults: {
    id?: string;
    text: string;
    audioResult: AudioResult;
  }[];
}

/**
 * Traitement par lot (Batch Processing) d'une file de segments de texte.
 * Génère l'audio pour chaque segment, les concatène avec respiration studio
 * et calcule les timestamps continus sur l'ensemble.
 */
export async function generateBatchSpeech(
  segments: (string | BatchSegmentItem)[],
  defaultLanguage: Language,
  defaultVoice: VoiceName,
  config: AcousticConfig,
  onProgress?: (progress: BatchProgress) => void
): Promise<BatchGenerationOutput> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const sampleRate = 24000;
  const masterPcmBuffers: Uint8Array[] = [];
  const masterTimestamps: WordTimestamp[] = [];
  const segmentResults: { id?: string; text: string; audioResult: AudioResult }[] = [];

  let currentMasterOffset = 0;
  const total = segments.length;

  for (let i = 0; i < total; i++) {
    const item = segments[i];
    const segmentText = typeof item === 'string' ? item : item.text;
    const segmentVoice = (typeof item === 'object' && item.voice) ? item.voice : defaultVoice;
    const segmentId = typeof item === 'object' ? item.id : undefined;

    if (!segmentText.trim()) continue;

    onProgress?.({
      current: i + 1,
      total,
      currentSegmentText: segmentText.substring(0, 60) + (segmentText.length > 60 ? '...' : '')
    });

    try {
      const segPcm = await synthesizeSegment(ai, segmentText, segmentVoice, config);
      const segDuration = (segPcm.length / 2) / sampleRate;

      // Timestamps locaux au segment
      const localTimestamps = await estimateWordTimestamps(segmentText, segDuration, 0);
      const segBlob = createWavBlob(segPcm, sampleRate);
      const segAudioResult: AudioResult = {
        blob: segBlob,
        url: URL.createObjectURL(segBlob),
        pcmData: segPcm,
        timestamps: localTimestamps
      };

      segmentResults.push({
        id: segmentId,
        text: segmentText,
        audioResult: segAudioResult
      });

      // Timestamps globaux décalés dans le master
      const globalTimestamps = await estimateWordTimestamps(segmentText, segDuration, currentMasterOffset);
      masterTimestamps.push(...globalTimestamps);

      masterPcmBuffers.push(segPcm);

      // Pause respiratoire inter-segments (300ms)
      if (i < total - 1) {
        const pauseSilence = generateSilence(300, sampleRate);
        masterPcmBuffers.push(pauseSilence);
        currentMasterOffset += segDuration + 0.3;
      } else {
        currentMasterOffset += segDuration;
      }
    } catch (err) {
      console.error(`Erreur lors de la synthèse du segment ${i + 1}:`, err);
      // Si c'est le seul segment, propager l'erreur
      if (total === 1) throw err;
    }
  }

  if (masterPcmBuffers.length === 0) {
    throw new Error("Aucun audio n'a pu être généré pour la file de segments.");
  }

  // Padding final studio
  if (config.addFinalPadding) {
    masterPcmBuffers.push(generateSilence(450, sampleRate));
  }

  const finalPcm = concatPcmBuffers(masterPcmBuffers);
  const masterBlob = createWavBlob(finalPcm, sampleRate);

  const masterResult: AudioResult = {
    blob: masterBlob,
    url: URL.createObjectURL(masterBlob),
    pcmData: finalPcm,
    timestamps: masterTimestamps
  };

  return {
    masterResult,
    segmentResults
  };
}

/**
 * Génération de parole principale avec support unifié :
 * - Texte unique (string)
 * - Liste de segments pour traitement batch (string[] ou BatchSegmentItem[])
 */
export async function generateSpeech(
  textOrSegments: string | string[] | BatchSegmentItem[], 
  language: Language, 
  voice: VoiceName, 
  config: AcousticConfig,
  onProgress?: (progress: BatchProgress) => void
): Promise<AudioResult> {
  if (Array.isArray(textOrSegments)) {
    const { masterResult } = await generateBatchSpeech(textOrSegments, language, voice, config, onProgress);
    return masterResult;
  }

  // Traitement texte unique
  const { masterResult } = await generateBatchSpeech([textOrSegments], language, voice, config, onProgress);
  return masterResult;
}
