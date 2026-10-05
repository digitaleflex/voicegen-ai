
export enum Language {
  FRENCH = 'French',
  ENGLISH = 'English',
  SPANISH = 'Spanish',
  GERMAN = 'German',
  ITALIAN = 'Italian'
}

export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export type ProsodyStyle = 'Neutral' | 'Educational' | 'Corporate' | 'Narrative' | 'Energetic' | 'Conversational' | 'Reading' | 'Declarative';

export type ContentType = 
  | 'court métrage'
  | 'storytelling'
  | 'TikTok'
  | 'Instagram Reel'
  | 'YouTube Short'
  | 'publicité'
  | 'documentaire'
  | 'histoire pour enfants'
  | 'clip musical';

export type ProjectFormat = '9:16' | '16:9' | '1:1';

export type VisualStyle = 
  | 'Cinématique Réaliste'
  | 'Cyberpunk / Néo-Tokyo'
  | 'Minimaliste Studio'
  | 'Animation 3D Pixar'
  | 'Anime Japonais'
  | 'Vintage Rétro 90s'
  | 'Documentaire Épuré'
  | 'Aquarelle Douce'
  | 'Luxe & Élégance'
  | 'Vibrant Pop Art';

export interface Project {
  id: string;
  title: string;
  description: string;
  contentType: ContentType;
  format: ProjectFormat;
  language: Language;
  visualStyle: VisualStyle;
  script?: string;
  voice?: VoiceName;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectFormData {
  title: string;
  description: string;
  contentType: ContentType;
  format: ProjectFormat;
  language: Language;
  visualStyle: VisualStyle;
}

export interface PronunciationRule {
  id: string;
  word: string;
  phonetic: string;
}

export interface WordTimestamp {
  word: string;
  startTime: number; // en secondes
  duration: number; // en secondes
}

export interface BatchProgress {
  current: number;
  total: number;
  currentSegmentText?: string;
}

export interface BatchSegmentItem {
  id?: string;
  text: string;
  voice?: VoiceName;
  language?: Language;
}

export interface QueuedSegment {
  id: string;
  text: string;
  voice: VoiceName;
  language: Language;
  status: 'pending' | 'processing' | 'completed' | 'error';
  audioResult?: AudioResult;
  error?: string;
  addedAt: number;
}

export interface AcousticConfig {
  speed: number;
  pitch: number;
  volume: number;
  prosody: ProsodyStyle;
  pauseDuration: number;
  diction: number;
  roomReverb: string;
  expressivity: number;
  // Paramètres de stabilité (Cahier Technique)
  speakingRate: number; // Fixé à 1.0 selon les nouvelles consignes
  stability: number;    // Stabilité neurale (0.0 - 1.0)
  isSegmented: boolean; // Segmentation automatique pour textes longs
  addFinalPadding: boolean; // Padding de 300-500ms en fin de phrase
  normalizeText: boolean; // Normalisation (nombres, abréviations)
  pronunciationRules: PronunciationRule[]; // Dictionnaire de remplacement
}

export interface AudioResult {
  blob: Blob;
  url: string;
  pcmData: Uint8Array;
  timestamps: WordTimestamp[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  text: string;
  language: Language;
  voice: VoiceName;
  audioUrl: string;
  pcmData: Uint8Array;
  timestamps: WordTimestamp[];
}

export interface VoiceMetadata {
  id: VoiceName;
  label: string;
  tags: string[];
  description: string;
  previewText: string;
}
