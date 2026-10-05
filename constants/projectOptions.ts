import { ContentType, ProjectFormat, VisualStyle, Language } from '../types';

export const CONTENT_TYPES: Array<{
  id: ContentType;
  label: string;
  icon: string;
  description: string;
  suggestedFormat: ProjectFormat;
}> = [
  {
    id: 'court métrage',
    label: 'Court métrage',
    icon: '🎬',
    description: 'Fiction, scènes narratives & dialogues cinématiques',
    suggestedFormat: '16:9'
  },
  {
    id: 'storytelling',
    label: 'Storytelling',
    icon: '📖',
    description: 'Récits immersifs, chroniques & histoires audio/vidéo',
    suggestedFormat: '16:9'
  },
  {
    id: 'TikTok',
    label: 'TikTok',
    icon: '⚡',
    description: 'Format ultra-dynamique vertical avec accroche rapide',
    suggestedFormat: '9:16'
  },
  {
    id: 'Instagram Reel',
    label: 'Instagram Reel',
    icon: '📸',
    description: 'Contenu percutant vertical optimisé engagement & esthétique',
    suggestedFormat: '9:16'
  },
  {
    id: 'YouTube Short',
    label: 'YouTube Short',
    icon: '▶️',
    description: 'Mini-capsules verticales éducatives ou divertissantes',
    suggestedFormat: '9:16'
  },
  {
    id: 'publicité',
    label: 'Publicité',
    icon: '📢',
    description: 'Spots promotionnels, pitchs produits & annonces impactantes',
    suggestedFormat: '16:9'
  },
  {
    id: 'documentaire',
    label: 'Documentaire',
    icon: '🌍',
    description: 'Reportages, sciences, histoire & voix off institutionnelle',
    suggestedFormat: '16:9'
  },
  {
    id: 'histoire pour enfants',
    label: 'Histoire pour enfants',
    icon: '🧸',
    description: 'Contes merveilleux, ton doux, ludique et expressif',
    suggestedFormat: '1:1'
  },
  {
    id: 'clip musical',
    label: 'Clip musical',
    icon: '🎵',
    description: 'Paroles, visuels synchronisés & univers artistiques',
    suggestedFormat: '16:9'
  }
];

export const FORMATS: Array<{
  id: ProjectFormat;
  label: string;
  sub: string;
  icon: string;
  aspectClass: string;
}> = [
  {
    id: '9:16',
    label: '9:16 Vertical',
    sub: 'TikTok, Reels, Shorts',
    icon: '📱',
    aspectClass: 'w-6 h-10'
  },
  {
    id: '16:9',
    label: '16:9 Paysage',
    sub: 'YouTube, Cinéma, Écrans',
    icon: '🖥️',
    aspectClass: 'w-10 h-6'
  },
  {
    id: '1:1',
    label: '1:1 Carré',
    sub: 'Instagram Feed, Carrousel',
    icon: '⏹️',
    aspectClass: 'w-8 h-8'
  }
];

export const VISUAL_STYLES: Array<{
  id: VisualStyle;
  label: string;
  color: string;
  bgGradient: string;
  badge: string;
}> = [
  {
    id: 'Cinématique Réaliste',
    label: 'Cinématique Réaliste',
    color: '#3b82f6',
    bgGradient: 'from-slate-900 to-blue-950',
    badge: '35mm / 8K Film'
  },
  {
    id: 'Cyberpunk / Néo-Tokyo',
    label: 'Cyberpunk / Néo-Tokyo',
    color: '#ec4899',
    bgGradient: 'from-purple-950 to-pink-900',
    badge: 'Néon & Synthwave'
  },
  {
    id: 'Minimaliste Studio',
    label: 'Minimaliste Studio',
    color: '#64748b',
    bgGradient: 'from-slate-100 to-slate-200',
    badge: 'Clean & Épuré'
  },
  {
    id: 'Animation 3D Pixar',
    label: 'Animation 3D Pixar',
    color: '#f59e0b',
    bgGradient: 'from-amber-500 to-orange-600',
    badge: '3D Doux & Coloré'
  },
  {
    id: 'Anime Japonais',
    label: 'Anime Japonais',
    color: '#8b5cf6',
    bgGradient: 'from-indigo-900 to-purple-800',
    badge: 'Studio Ghibli / Shōnen'
  },
  {
    id: 'Vintage Rétro 90s',
    label: 'Vintage Rétro 90s',
    color: '#d97706',
    bgGradient: 'from-stone-800 to-amber-950',
    badge: 'Grain VHS & Pellicule'
  },
  {
    id: 'Documentaire Épuré',
    label: 'Documentaire Épuré',
    color: '#10b981',
    bgGradient: 'from-emerald-950 to-teal-900',
    badge: 'Nature & Terroir'
  },
  {
    id: 'Aquarelle Douce',
    label: 'Aquarelle Douce',
    color: '#06b6d4',
    bgGradient: 'from-sky-100 to-teal-100',
    badge: 'Pastel & Poétique'
  },
  {
    id: 'Luxe & Élégance',
    label: 'Luxe & Élégance',
    color: '#eab308',
    bgGradient: 'from-zinc-950 to-neutral-900',
    badge: 'Or Noir & Typo Fine'
  },
  {
    id: 'Vibrant Pop Art',
    label: 'Vibrant Pop Art',
    color: '#ef4444',
    bgGradient: 'from-rose-600 to-yellow-500',
    badge: 'Fort Contraste Comics'
  }
];
