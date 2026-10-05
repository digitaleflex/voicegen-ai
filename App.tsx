
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { generateSpeech, generateBatchSpeech, analyzeContent, enhanceScript } from './services/geminiService';
import { 
  Language, 
  VoiceName, 
  AudioResult, 
  HistoryItem, 
  AcousticConfig, 
  ProsodyStyle, 
  VoiceMetadata, 
  PronunciationRule, 
  WordTimestamp, 
  QueuedSegment, 
  BatchProgress,
  Project,
  ProjectFormData
} from './types';
import { 
  subscribeToProjects, 
  createProject, 
  updateProject, 
  deleteProject, 
  duplicateProject 
} from './services/projectService';
import { ProjectModal } from './components/ProjectModal';
import { ProjectDrawer } from './components/ProjectDrawer';
import { CONTENT_TYPES, FORMATS, VISUAL_STYLES } from './constants/projectOptions';
import { convertPcmToMp3 } from './utils/mp3Converter';
import { createWavBlob } from './utils/audioConverter';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { AudioWaveform } from './components/AudioWaveform';

// Config PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs`;

// Constants
const MAX_CHARS = 30000;

// Icons
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const AudioIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const TrashIcon = ({ size = 16 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const PlayIcon = ({ className = "w-4 h-4" }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const PauseIcon = ({ className = "w-4 h-4" }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>;
const LoadingSpinner = ({ className = "h-5 w-5 text-white" }) => <svg className={`animate-spin ${className}`} viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const MagicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
const WaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10c.5 0 1 .5 1.5 1s1 .5 1.5.5 1-.5 1.5-1 1-.5 1.5-.5 1 .5 1.5 1 1 .5 1.5.5 1-.5 1.5-1 1-.5 1.5-.5 1 .5 1.5 1 1 .5 1.5.5 1-.5 1.5-1 1-.5 1.5-.5 1 .5 1.5 1"/></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const EraserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const BookIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
const QueueIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </svg>
);

const VOICES_DB: VoiceMetadata[] = [
  { id: 'Charon', label: 'Léa - Narratrice Tech', tags: ['Documentaire', 'Tech', 'Sérieux'], description: 'Voix profonde et posée, idéale pour les narrations techniques.', previewText: 'Bienvenue dans ce module sur les infrastructures cloud.' },
  { id: 'Kore', label: 'Marc - Coach Corporate', tags: ['Formation', 'Business', 'News'], description: 'Direct et professionnel, parfait pour les messages d\'entreprise.', previewText: 'Nous allons voir ensemble les objectifs du trimestre.' },
  { id: 'Puck', label: 'Chloé - Voix Énergique', tags: ['E-learning', 'Jeune', 'Pub'], description: 'Dynamique et pétillante, capte l\'attention immédiatement.', previewText: 'Salut ! Prêt pour une nouvelle aventure d\'apprentissage ?' },
  { id: 'Fenrir', label: 'Paul - Conteur Chaleureux', tags: ['Formation', 'Narration', 'Podcast'], description: 'Chaleureux et rassurant, idéal pour les contenus longs.', previewText: 'Il était une fois une nouvelle méthode de management.' },
  { id: 'Zephyr', label: 'Sophie - Voix Zen', tags: ['Méditation', 'E-learning', 'Doux'], description: 'Poétique et calme, parfaite pour les sujets apaisants.', previewText: 'Prenez une grande inspiration et concentrez-vous.' }
];

const LANGS = [
  { id: Language.FRENCH, label: 'Français', flag: '🇫🇷' },
  { id: Language.ENGLISH, label: 'English', flag: '🇺🇸' },
  { id: Language.SPANISH, label: 'Español', flag: '🇪🇸' },
  { id: Language.GERMAN, label: 'Deutsch', flag: '🇩🇪' },
  { id: Language.ITALIAN, label: 'Italiano', flag: '🇮🇹' },
];

const INITIAL_SCRIPT = "Bienvenue dans VoxGen Ultra, le studio de synthèse vocale haute précision.\n\nCe système permet de segmenter vos narrations complexes en séquences indépendantes.\n\nAjoutez chaque segment à la file d'attente pour générer un rendu audio fluide et parfaitement calibré.";

const App: React.FC = () => {
  // --- States ---
  const [text, setText] = useState<string>(INITIAL_SCRIPT);
  const [editorMode, setEditorMode] = useState<'segments' | 'text'>('segments');
  const [segments, setSegments] = useState<Array<{ id: string; text: string }>>([
    { id: 'seg-1', text: "Bienvenue dans VoxGen Ultra, le studio de synthèse vocale haute précision." },
    { id: 'seg-2', text: "Ce système permet de segmenter vos narrations complexes en séquences indépendantes." },
    { id: 'seg-3', text: "Ajoutez chaque segment à la file d'attente pour générer un rendu audio fluide et parfaitement calibré." }
  ]);
  const [batchQueue, setBatchQueue] = useState<QueuedSegment[]>([]);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>(Language.FRENCH);
  const [selectedVoiceId, setSelectedVoiceId] = useState<VoiceName>('Fenrir');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [genStage, setGenStage] = useState<string>('');
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAutoVoice, setIsAutoVoice] = useState<boolean>(true);
  const [detectedStyle, setDetectedStyle] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [exportFormat, setExportFormat] = useState<'WAV' | 'AAC' | 'MP3'>('MP3');
  const [activeTab, setActiveTab] = useState<'stability' | 'pronunciation' | 'synchro' | 'batch'>('stability');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<VoiceName | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- Project System States (Firestore Persisted) ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isProjectsLoading, setIsProjectsLoading] = useState<boolean>(true);
  const [isProjectDrawerOpen, setIsProjectDrawerOpen] = useState<boolean>(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [projectModalMode, setProjectModalMode] = useState<'create' | 'edit'>('create');
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectSaveStatus, setProjectSaveStatus] = useState<string | null>(null);

  // Firestore Real-Time Listener
  useEffect(() => {
    setIsProjectsLoading(true);
    const unsubscribe = subscribeToProjects(
      (loadedProjects) => {
        setProjects(loadedProjects);
        setIsProjectsLoading(false);

        // Si aucun projet n'est actif, sélectionner le premier s'il existe
        setActiveProject((current) => {
          if (!current && loadedProjects.length > 0) {
            return loadedProjects[0];
          }
          if (current) {
            const updated = loadedProjects.find(p => p.id === current.id);
            return updated || current;
          }
          return null;
        });
      },
      (err) => {
        console.error('Error fetching projects:', err);
        setIsProjectsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Synchronisation lors du changement de projet actif
  const handleSelectProject = (project: Project) => {
    setActiveProject(project);
    if (project.script) {
      handleContinuousTextChange(project.script);
    }
    if (project.voice) {
      setSelectedVoiceId(project.voice);
    }
    if (project.language) {
      setLanguage(project.language);
    }
    setIsProjectDrawerOpen(false);
  };

  // Création / Modification d'un projet
  const handleSaveProjectForm = async (formData: ProjectFormData) => {
    if (projectModalMode === 'create') {
      const newProj = await createProject(formData, text, selectedVoiceId);
      setActiveProject(newProj);
      if (formData.language) {
        setLanguage(formData.language);
      }
    } else if (projectModalMode === 'edit' && projectToEdit) {
      await updateProject(projectToEdit.id, {
        ...formData,
        script: text,
        voice: selectedVoiceId
      });
      if (activeProject && activeProject.id === projectToEdit.id) {
        setActiveProject(prev => prev ? {
          ...prev,
          ...formData,
          script: text,
          voice: selectedVoiceId,
          updatedAt: Date.now()
        } : null);
      }
    }
  };

  // Sauvegarde rapide du script actuel dans le projet actif
  const handleQuickSaveCurrentProject = async () => {
    if (!activeProject) {
      setProjectModalMode('create');
      setProjectToEdit(null);
      setIsProjectModalOpen(true);
      return;
    }

    try {
      setProjectSaveStatus('Sauvegarde...');
      await updateProject(activeProject.id, {
        script: text,
        voice: selectedVoiceId,
        language: language
      });
      setProjectSaveStatus('Sauvegardé !');
      setTimeout(() => setProjectSaveStatus(null), 2500);
    } catch (err: any) {
      console.error('Failed to quick save:', err);
      setProjectSaveStatus('Erreur de sauvegarde');
      setTimeout(() => setProjectSaveStatus(null), 3000);
    }
  };

  // Duplication de projet
  const handleDuplicateProject = async (project: Project) => {
    try {
      const duplicated = await duplicateProject(project);
      setActiveProject(duplicated);
      if (duplicated.script) {
        handleContinuousTextChange(duplicated.script);
      }
    } catch (err) {
      console.error('Error duplicating project:', err);
    }
  };

  // Suppression de projet
  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      if (activeProject && activeProject.id === projectId) {
        const remaining = projects.filter(p => p.id !== projectId);
        setActiveProject(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };
  
  // Lexique de prononciation
  const [pronunciationRules, setPronunciationRules] = useState<PronunciationRule[]>(() => {
    const saved = localStorage.getItem('voxgen_pronunciation');
    return saved ? JSON.parse(saved) : [];
  });

  // Acoustic Controls
  const [acousticConfig, setAcousticConfig] = useState<AcousticConfig>({
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0,
    prosody: 'Neutral',
    pauseDuration: 1.0,
    diction: 0.8,
    roomReverb: 'None',
    expressivity: 0.7,
    speakingRate: 1.0, // FORCÉ À 1.0
    stability: 0.7,
    isSegmented: true,
    addFinalPadding: true,
    normalizeText: true,
    pronunciationRules: []
  });

  useEffect(() => {
    setAcousticConfig(prev => ({ ...prev, pronunciationRules }));
    localStorage.setItem('voxgen_pronunciation', JSON.stringify(pronunciationRules));
  }, [pronunciationRules]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pronunciation Editor Inputs
  const [newRuleWord, setNewRuleWord] = useState('');
  const [newRulePhonetic, setNewRulePhonetic] = useState('');

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const lineCount = text.split('\n').length;
  const wordCount = useMemo(() => text.trim() ? text.trim().split(/\s+/).length : 0, [text]);

  const filteredVoices = useMemo(() => {
    return VOICES_DB.filter(v => {
      const matchesSearch = v.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           v.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFilter = activeFilter === 'All' || v.tags.includes(activeFilter);
      return matchesSearch && matchesFilter;
    });
  }, [searchTerm, activeFilter]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const fileName = file.name.toLowerCase();
      let importedText = "";
      if (fileName.endsWith(".txt")) importedText = await file.text();
      else if (fileName.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        importedText = result.value;
      } else if (fileName.endsWith(".pdf")) {
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: any) => item.str).join(" ") + "\n";
        }
        importedText = fullText;
      }
      if (importedText) {
        setText(importedText);
        const parsed = importedText.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
        setSegments(parsed.map((p, idx) => ({ id: `seg-${Date.now()}-${idx}`, text: p })));
      }
    } catch (err) { setError("Erreur de lecture du fichier."); }
  };

  // Synchronisation des segments édités individuellement
  const handleSegmentTextChange = (id: string, newText: string) => {
    setSegments(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, text: newText } : s);
      setText(updated.map(s => s.text).join('\n\n'));
      return updated;
    });
  };

  // Synchronisation lors de la saisie continue
  const handleContinuousTextChange = (newText: string) => {
    setText(newText);
    const rawBlocks = newText.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    if (rawBlocks.length === 0) {
      setSegments([{ id: `seg-${Date.now()}-0`, text: newText.trim() }]);
    } else {
      setSegments(rawBlocks.map((blk, idx) => ({
        id: `seg-${idx + 1}`,
        text: blk
      })));
    }
  };

  // Ajout d'un nouveau segment
  const handleAddSegment = () => {
    const newId = `seg-${Date.now()}`;
    setSegments(prev => {
      const updated = [...prev, { id: newId, text: "" }];
      setText(updated.map(s => s.text).join('\n\n'));
      return updated;
    });
  };

  // Suppression d'un segment
  const handleRemoveSegment = (id: string) => {
    setSegments(prev => {
      const updated = prev.filter(s => s.id !== id);
      setText(updated.map(s => s.text).join('\n\n'));
      return updated;
    });
  };

  // Ajout / Retrait d'un segment à la file d'attente (Bouton Queue)
  const handleToggleQueueSegment = (segment: { id: string; text: string }) => {
    if (!segment.text.trim()) return;
    setBatchQueue(prev => {
      const exists = prev.some(item => item.id === segment.id || (item.text === segment.text && segment.text.length > 0));
      if (exists) {
        return prev.filter(item => item.id !== segment.id && item.text !== segment.text);
      } else {
        const newItem: QueuedSegment = {
          id: segment.id || `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          text: segment.text.trim(),
          voice: selectedVoiceId,
          language: language,
          status: 'pending',
          addedAt: Date.now()
        };
        return [...prev, newItem];
      }
    });
  };

  // Tout mettre en file d'attente
  const handleQueueAllSegments = () => {
    const validSegments = segments.filter(s => s.text.trim().length > 0);
    if (validSegments.length === 0) return;

    setBatchQueue(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const existingTexts = new Set(prev.map(p => p.text));
      const newItems: QueuedSegment[] = validSegments
        .filter(s => !existingIds.has(s.id) && !existingTexts.has(s.text.trim()))
        .map(s => ({
          id: s.id,
          text: s.text.trim(),
          voice: selectedVoiceId,
          language: language,
          status: 'pending',
          addedAt: Date.now()
        }));
      return [...prev, ...newItems];
    });
  };

  // Retirer un élément de la file
  const handleRemoveFromQueue = (id: string) => {
    setBatchQueue(prev => prev.filter(item => item.id !== id));
  };

  // Vider la file
  const handleClearQueue = () => {
    setBatchQueue([]);
    setBatchProgress(null);
  };

  // Exécution du traitement par lot (Batch Processing)
  const handleProcessBatch = async () => {
    if (batchQueue.length === 0 || isProcessingBatch) return;

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setPreviewingVoiceId(null);
    }

    setIsProcessingBatch(true);
    setError(null);
    setGenStage(`Batch : initialisation de ${batchQueue.length} segments...`);
    setActiveTab('batch');

    try {
      setBatchQueue(prev => prev.map(item => ({ ...item, status: 'processing' })));

      const batchOutput = await generateBatchSpeech(
        batchQueue.map(item => ({
          id: item.id,
          text: item.text,
          voice: item.voice,
          language: item.language
        })),
        language,
        selectedVoiceId,
        acousticConfig,
        (progress: BatchProgress) => {
          setBatchProgress(progress);
          setGenStage(`Batch ${progress.current}/${progress.total} : Synthèse...`);
          setBatchQueue(prev => prev.map((item, idx) => {
            if (idx < progress.current - 1) return { ...item, status: 'completed' };
            if (idx === progress.current - 1) return { ...item, status: 'processing' };
            return item;
          }));
        }
      );

      // Met à jour les résultats par segment dans la file
      setBatchQueue(prev => prev.map(item => {
        const match = batchOutput.segmentResults.find(sr => sr.id === item.id || sr.text === item.text);
        return {
          ...item,
          status: 'completed',
          audioResult: match ? match.audioResult : undefined
        };
      }));

      // Affecte le master consolidé au lecteur principal et à la forme d'onde Recharts
      setAudioResult(batchOutput.masterResult);
      if (batchOutput.masterResult.pcmData && batchOutput.masterResult.pcmData.byteLength > 0) {
        setDuration(batchOutput.masterResult.pcmData.byteLength / (2 * 24000));
      }
      setCurrentTime(0);
      setIsPlaying(false);
    } catch (err: any) {
      setError(err.message || "Erreur durant le traitement par lot.");
      setBatchQueue(prev => prev.map(item => item.status === 'processing' ? { ...item, status: 'error', error: err.message } : item));
    } finally {
      setIsProcessingBatch(false);
      setBatchProgress(null);
      setGenStage('');
    }
  };

  const insertTextAtCursor = (insertion: string) => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd } = textareaRef.current;
    const newText = text.substring(0, selectionStart) + insertion + text.substring(selectionEnd);
    setText(newText);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + insertion.length;
      }
    }, 0);
  };

  const handleManualPause = () => {
    const duration = prompt("Durée de la pause en secondes (ex: 1, 2.5) :", "1");
    if (duration === null) return;
    const tag = duration.trim() === "" ? "[pause]" : `[pause:${duration.trim()}s]`;
    insertTextAtCursor(tag);
  };

  const handleEnhanceScript = async () => {
    if (!text.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhanceScript(text);
      setText(enhanced);
    } catch (err) { setError("Erreur lors de l'optimisation."); }
    finally { setIsEnhancing(false); }
  };

  const handleGenerate = async () => {
    if (!text.trim() || text.length > MAX_CHARS) return;

    // Stop any active preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setPreviewingVoiceId(null);
    }

    setIsGenerating(true);
    setError(null);
    setAudioResult(null);
    try {
      if (isAutoVoice) {
        setGenStage('Analyse contextuelle...');
        const analysis = await analyzeContent(text);
        setSelectedVoiceId(analysis.recommendedVoice);
        setLanguage(analysis.language);
        setDetectedStyle(analysis.style);
      }
      setGenStage('Synthèse Stablisée...');
      const result = await generateSpeech(text, language, selectedVoiceId, acousticConfig);
      setAudioResult(result);
      if (result.pcmData && result.pcmData.byteLength > 0) {
        setDuration(result.pcmData.byteLength / (2 * 24000));
      }
      setCurrentTime(0);
      setIsPlaying(false);
      setActiveTab('synchro');
    } catch (err: any) { setError(err.message || "Erreur de génération."); }
    finally { setIsGenerating(false); setGenStage(''); }
  };

  const handleDownload = async () => {
    if (!audioResult) return;
    let blob: Blob;
    let extension: string;
    
    switch (exportFormat) {
      case 'WAV':
        blob = createWavBlob(audioResult.pcmData, 24000);
        extension = 'wav';
        break;
      case 'MP3':
      default:
        blob = convertPcmToMp3(audioResult.pcmData, 24000);
        extension = 'mp3';
        break;
    }

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `voxgen-${selectedVoiceId.toLowerCase()}-${Date.now()}.${extension}`;
    a.click();
  };

  const handleAddPronunciation = () => {
    if (!newRuleWord.trim() || !newRulePhonetic.trim()) return;
    const newRule: PronunciationRule = {
      id: Date.now().toString(),
      word: newRuleWord.trim(),
      phonetic: newRulePhonetic.trim()
    };
    setPronunciationRules([...pronunciationRules, newRule]);
    setNewRuleWord('');
    setNewRulePhonetic('');
  };

  const removePronunciation = (id: string) => {
    setPronunciationRules(pronunciationRules.filter(r => r.id !== id));
  };

  const handleVoicePreview = async (e: React.MouseEvent, voice: VoiceMetadata) => {
    e.stopPropagation();
    
    // Stop previous preview if any
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    if (previewingVoiceId === voice.id) {
      setPreviewingVoiceId(null);
      return;
    }

    setPreviewingVoiceId(voice.id);
    try {
      const res = await generateSpeech(voice.previewText, language, voice.id, acousticConfig);
      const audio = new Audio(res.url);
      previewAudioRef.current = audio;
      audio.onended = () => {
        setPreviewingVoiceId(null);
        previewAudioRef.current = null;
      };
      audio.onerror = () => {
        setPreviewingVoiceId(null);
        previewAudioRef.current = null;
      };
      await audio.play();
    } catch (err) { 
      console.error("Preview failed", err);
      setPreviewingVoiceId(null);
    }
  };

  // Synchronisation audio-texte et gestion lecture
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleLoadedMetadata = () => {
      if (audio.duration && !Number.isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioResult]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  };

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  const activeWordIndex = useMemo(() => {
    if (!audioResult) return -1;
    return audioResult.timestamps.findIndex(t => 
      currentTime >= t.startTime && currentTime <= (t.startTime + t.duration)
    );
  }, [currentTime, audioResult]);

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-800 font-['Inter'] flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 py-2.5 px-6 flex justify-between items-center z-40 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-md shadow-indigo-100 text-white">
              <WaveIcon />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none text-slate-900">VoxGen <span className="text-indigo-600">ULTRA</span></h1>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Studio & Projets</p>
            </div>
          </div>

          {/* Active Project Pill & Selector */}
          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            {activeProject ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
                <span className="text-xs">
                  {CONTENT_TYPES.find(c => c.id === activeProject.contentType)?.icon || '🎬'}
                </span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-800 truncate max-w-[180px]">
                      {activeProject.title}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                      {activeProject.format}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium truncate max-w-[180px]">
                    {activeProject.contentType} • {activeProject.visualStyle}
                  </span>
                </div>

                <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setProjectModalMode('edit');
                      setProjectToEdit(activeProject);
                      setIsProjectModalOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition-all cursor-pointer"
                    title="Paramètres du projet"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickSaveCurrentProject}
                    className="px-2 py-1 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    title="Sauvegarder le script dans Firestore"
                  >
                    {projectSaveStatus || '💾 Sauvegarder'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold italic">Aucun projet sélectionné</span>
              </div>
            )}

            {/* Open Drawer Button */}
            <button
              type="button"
              onClick={() => setIsProjectDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
            >
              <span>📁 Projets</span>
              {projects.length > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-slate-800 rounded-full text-[9px] font-black">
                  {projects.length}
                </span>
              )}
            </button>

            {/* Quick New Project Button */}
            <button
              type="button"
              onClick={() => {
                setProjectModalMode('create');
                setProjectToEdit(null);
                setIsProjectModalOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              <span>+ Nouveau Projet</span>
            </button>
          </div>
        </div>

        <div className="flex gap-2.5 items-center">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold hover:bg-white hover:border-indigo-200 transition-all text-slate-600 cursor-pointer">
            <UploadIcon /> Importer document
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black border border-emerald-100 shadow-2xs">
            <CheckIcon /> CLOUD FIRESTORE ACTIF
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden bg-slate-50/20">
        
        {/* Panel 1: Script Editor Station with Batch Segments & Queuing */}
        <section className="w-[42%] flex flex-col border-r border-slate-100 bg-white shadow-2xl z-20 overflow-hidden">
          {/* Header toolbar */}
          <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-700">Studio Script</h3>
              
              {/* View Switcher: Segments vs Continuous */}
              <div className="flex bg-slate-200/70 p-0.5 rounded-lg ml-2">
                <button
                  type="button"
                  onClick={() => setEditorMode('segments')}
                  className={`px-2.5 py-1 rounded-md text-[9px] font-black transition-all cursor-pointer ${
                    editorMode === 'segments'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Édition par segments pour la file d'attente batch"
                >
                  SEGMENTS ({segments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('text')}
                  className={`px-2.5 py-1 rounded-md text-[9px] font-black transition-all cursor-pointer ${
                    editorMode === 'text'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Éditeur plein texte continu"
                >
                  CONTINU
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {editorMode === 'segments' && (
                <button
                  type="button"
                  onClick={handleQueueAllSegments}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 rounded-lg text-[9px] font-black transition-all shadow-sm cursor-pointer"
                  title="Ajouter tous les segments valides à la file d'attente"
                >
                  <QueueIcon className="w-3 h-3" />
                  <span>+ TOUT QUEUE</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleManualPause}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 hover:border-indigo-400 transition-all shadow-sm cursor-pointer"
                title="Insérer une balise de pause temporelle"
              >
                <ClockIcon /> PAUSE
              </button>
              <button 
                type="button"
                onClick={handleEnhanceScript} 
                disabled={isEnhancing || !text.trim()} 
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all border cursor-pointer ${isEnhancing ? 'bg-indigo-50 border-indigo-100 text-indigo-400' : 'bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
                title="Optimisation stylistique IA"
              >
                {isEnhancing ? <LoadingSpinner className="w-3 h-3 text-indigo-400" /> : <MagicIcon />} OPTIMISER
              </button>
              <button
                type="button"
                onClick={() => {
                  setText('');
                  setSegments([{ id: `seg-${Date.now()}`, text: '' }]);
                }}
                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                title="Effacer le script"
              >
                <EraserIcon />
              </button>
            </div>
          </div>
          
          {/* Main Editor Body */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* Active Project Banner */}
            {activeProject && (
              <div className="px-4 py-2 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-white border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2 text-xs truncate">
                  <span className="font-extrabold text-slate-700 truncate">
                    Projet : {activeProject.title}
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    {activeProject.format}
                  </span>
                  <span className="text-[10px] text-slate-500 hidden md:inline">
                    • {activeProject.contentType}
                  </span>
                  <span className="text-[10px] text-slate-500 hidden lg:inline">
                    • {activeProject.visualStyle}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleQuickSaveCurrentProject}
                  className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 underline cursor-pointer flex-shrink-0"
                >
                  {projectSaveStatus || 'Enregistrer le script'}
                </button>
              </div>
            )}

            {editorMode === 'segments' ? (
              /* Segmented Script Editor */
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/40">
                <div className="flex items-center justify-between px-1 pb-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Séquences de narration ({segments.length})
                  </span>
                  <span className="text-[9px] font-medium text-slate-400">
                    Chaque segment peut être mis en file d'attente
                  </span>
                </div>

                {segments.map((seg, idx) => {
                  const isQueued = batchQueue.some(q => q.id === seg.id || (q.text === seg.text && seg.text.trim().length > 0));
                  const segWordCount = seg.text.trim() ? seg.text.trim().split(/\s+/).length : 0;

                  return (
                    <div 
                      key={seg.id}
                      className={`p-3.5 rounded-2xl border transition-all duration-200 bg-white ${
                        isQueued 
                          ? 'border-indigo-300 shadow-md shadow-indigo-100/40 ring-1 ring-indigo-200' 
                          : 'border-slate-200 shadow-sm hover:border-slate-300'
                      }`}
                    >
                      {/* Segment Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider ${
                            isQueued ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {segWordCount} mots · {seg.text.length} car.
                          </span>
                        </div>

                        {/* Queue Button for this segment */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleQueueSegment(seg)}
                            disabled={!seg.text.trim()}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer disabled:opacity-30 ${
                              isQueued
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                : 'bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200'
                            }`}
                            title={isQueued ? "Retirer ce segment de la file" : "Ajouter ce segment à la file d'attente"}
                          >
                            <QueueIcon className="w-3.5 h-3.5" />
                            <span>{isQueued ? 'Dans la file' : 'Queue'}</span>
                          </button>

                          {segments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSegment(seg.id)}
                              className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all cursor-pointer"
                              title="Supprimer ce segment"
                            >
                              <TrashIcon size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Segment Textarea */}
                      <textarea
                        rows={2}
                        className="w-full p-2.5 text-[14px] font-medium text-slate-700 bg-slate-50/60 rounded-xl border border-slate-100 focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all resize-y leading-relaxed"
                        placeholder={`Texte du segment #${idx + 1}...`}
                        value={seg.text}
                        onChange={(e) => handleSegmentTextChange(seg.id, e.target.value)}
                      />
                    </div>
                  );
                })}

                {/* Add Segment Button */}
                <button
                  type="button"
                  onClick={handleAddSegment}
                  className="w-full py-2.5 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-indigo-50/50 hover:border-indigo-400 transition-all cursor-pointer"
                >
                  <PlusIcon />
                  <span>Ajouter un segment</span>
                </button>
              </div>
            ) : (
              /* Continuous Free Text Area */
              <div className="flex-1 flex overflow-hidden">
                <div ref={lineNumbersRef} className="w-12 bg-slate-50/50 border-r border-slate-100 text-right pr-3 pt-6 text-[10px] font-bold text-slate-300 select-none overflow-hidden">
                  {Array.from({ length: lineCount }).map((_, i) => (
                    <div key={i} className="h-7 leading-7 tabular-nums">{i + 1}</div>
                  ))}
                </div>
                
                <textarea 
                  ref={textareaRef}
                  onScroll={handleScroll}
                  className="flex-1 p-6 text-[17px] font-medium text-slate-700 bg-white border-none focus:ring-0 outline-none transition-all resize-none leading-7 placeholder:text-slate-200 custom-scrollbar"
                  placeholder="Saisissez votre script professionnel..."
                  value={text}
                  onChange={(e) => handleContinuousTextChange(e.target.value)}
                  spellCheck={false}
                />
              </div>
            )}

            {/* Floating Style & Words Tag */}
            <div className="p-3 bg-white/95 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-600 flex-shrink-0">
              <div className="flex items-center gap-2">
                {detectedStyle && (
                  <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    STYLE: {detectedStyle}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span>{wordCount.toLocaleString()} MOTS</span>
                <span className={`${text.length > MAX_CHARS ? 'text-red-500' : 'text-slate-300'}`}>|</span>
                <span>{text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} CAR.</span>
              </div>
            </div>

            {/* Bottom Sticky Batch Queue Notification & Quick Actions */}
            {batchQueue.length > 0 && (
              <div className="bg-slate-900 text-white p-3 px-4 flex items-center justify-between border-t border-slate-800 shadow-inner flex-shrink-0 animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-100">
                      File d'attente : {batchQueue.length} segment{batchQueue.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-[8px] text-slate-400 font-medium">
                      {batchQueue.filter(q => q.status === 'completed').length} terminé(s) · {batchQueue.filter(q => q.status === 'pending').length} en attente
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('batch')}
                    className="text-[9px] font-black uppercase px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-all cursor-pointer"
                  >
                    Gérer la file
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessBatch}
                    disabled={isProcessingBatch}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase rounded-lg tracking-wider transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
                    title="Lancer la synthèse batch de tous les segments mis en file"
                  >
                    {isProcessingBatch ? (
                      <LoadingSpinner className="w-3 h-3 text-white" />
                    ) : (
                      <PlayIcon className="w-3 h-3" />
                    )}
                    <span>Traiter le lot ({batchQueue.length})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Panel 2: Voice Catalog */}
        <section className="flex-1 flex flex-col bg-[#F9FAFF] border-r border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 bg-white shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AudioIcon />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Library</h3>
              </div>
              <button onClick={() => setIsAutoVoice(!isAutoVoice)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all flex items-center gap-2 ${isAutoVoice ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {isAutoVoice && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                IA CONTEXTUELLE {isAutoVoice ? 'ON' : 'OFF'}
              </button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-3.5 flex items-center text-slate-300"><SearchIcon /></div>
              <input 
                type="text" placeholder="Rechercher une voix..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[12px] font-medium focus:bg-white outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {filteredVoices.map(voice => (
              <div 
                key={voice.id} 
                onClick={() => { setSelectedVoiceId(voice.id); setIsAutoVoice(false); }}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer group ${selectedVoiceId === voice.id ? 'bg-white border-indigo-600 shadow-xl shadow-indigo-200/20' : 'bg-white border-slate-100 shadow-sm'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${selectedVoiceId === voice.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:text-indigo-600'}`}>
                      <AudioIcon />
                    </div>
                    <div>
                      <h4 className={`font-black text-[15px] ${selectedVoiceId === voice.id ? 'text-indigo-900' : 'text-slate-900'}`}>{voice.label}</h4>
                      <div className="flex gap-1.5 mt-1">
                        {voice.tags.slice(0, 2).map(t => <span key={t} className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded-md border border-slate-100">{t}</span>)}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleVoicePreview(e, voice)} 
                    className={`p-2 rounded-lg transition-all ${previewingVoiceId === voice.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white'}`}
                    disabled={previewingVoiceId !== null && previewingVoiceId !== voice.id}
                  >
                    {previewingVoiceId === voice.id ? (
                      <LoadingSpinner className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <PlayIcon className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Panel 3: Engine, Pronunciation & Batch Queue Controls */}
        <section className="w-[22%] flex flex-col bg-white overflow-y-auto custom-scrollbar border-l border-slate-100 shadow-sm z-30">
          <div className="flex border-b border-slate-100 bg-slate-50/30">
            <button 
              onClick={() => setActiveTab('stability')}
              className={`flex-1 py-3 text-[9px] font-black uppercase tracking-wider transition-all ${activeTab === 'stability' ? 'text-indigo-600 bg-white border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Moteur
            </button>
            <button 
              onClick={() => setActiveTab('pronunciation')}
              className={`flex-1 py-3 text-[9px] font-black uppercase tracking-wider transition-all ${activeTab === 'pronunciation' ? 'text-indigo-600 bg-white border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Lexique
            </button>
            <button 
              onClick={() => setActiveTab('synchro')}
              className={`flex-1 py-3 text-[9px] font-black uppercase tracking-wider transition-all ${activeTab === 'synchro' ? 'text-indigo-600 bg-white border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Sync
            </button>
            <button 
              onClick={() => setActiveTab('batch')}
              className={`flex-1 py-3 text-[9px] font-black uppercase tracking-wider transition-all relative flex items-center justify-center gap-1 ${activeTab === 'batch' ? 'text-indigo-600 bg-white border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <span>File</span>
              {batchQueue.length > 0 && (
                <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded-full text-[8px] font-black">
                  {batchQueue.length}
                </span>
              )}
            </button>
          </div>
          
          {activeTab === 'stability' && (
            <div className="p-6 space-y-8 animate-fadeIn">
              <div className="space-y-4">
                 <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div> PARAMÈTRES CRITIQUES
                 </label>
                 
                 <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-600">DÉBIT (FIXÉ)</span>
                      <span className="text-indigo-600 font-black text-[11px]">1.0x</span>
                    </div>
                    <div className="w-full h-1 bg-indigo-600/20 rounded-lg relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 w-full bg-indigo-600 opacity-20"></div>
                    </div>
                    <p className="text-[8px] text-slate-400 italic">Le débit est verrouillé à 1.0 pour garantir la stabilité du moteur de rendu et l'alignement synchronisé.</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-600">STABILITÉ NEURALE</span>
                      <span className="text-indigo-600 font-black text-[11px]">{Math.round(acousticConfig.stability * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.1" 
                      value={acousticConfig.stability}
                      onChange={(e) => setAcousticConfig({...acousticConfig, stability: parseFloat(e.target.value)})}
                      className="w-full h-1 bg-white border border-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                 </div>
              </div>

              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Options du Cahier Technique</label>
                <div className="space-y-2">
                  {[
                    { id: 'isSegmented', label: 'Segmentation auto', desc: 'Génération token par token' },
                    { id: 'addFinalPadding', label: 'Padding final (450ms)', desc: 'Stabilisation de fin' },
                    { id: 'normalizeText', label: 'Normalisation stricte', desc: 'Nettoyage syntaxique' }
                  ].map(opt => (
                    <label key={opt.id} className="flex items-center p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-indigo-200 transition-all group">
                      <div className="flex-1">
                        <div className="text-[10px] font-black text-slate-700">{opt.label}</div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={(acousticConfig as any)[opt.id]}
                        onChange={(e) => setAcousticConfig({...acousticConfig, [opt.id]: e.target.checked})}
                        className="w-4 h-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pronunciation' && (
            <div className="p-6 space-y-6 animate-fadeIn">
               <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                 <BookIcon /> LEXIQUE DE PRÉCISION
               </label>
               
               <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Mot original</label>
                    <input type="text" placeholder="Gemini" value={newRuleWord} onChange={(e) => setNewRuleWord(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[12px] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Phonétique</label>
                    <input type="text" placeholder="Jèminaille" value={newRulePhonetic} onChange={(e) => setNewRulePhonetic(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[12px] outline-none" />
                  </div>
                  <button onClick={handleAddPronunciation} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 flex items-center justify-center gap-2">
                    <PlusIcon /> AJOUTER
                  </button>
               </div>

               <div className="space-y-2">
                  {pronunciationRules.map(rule => (
                    <div key={rule.id} className="p-3 bg-white border border-slate-100 rounded-xl flex justify-between items-center">
                      <div className="min-w-0">
                        <div className="text-[11px] font-black text-slate-900 truncate">{rule.word}</div>
                        <div className="text-[10px] font-bold text-indigo-500 italic truncate">➜ {rule.phonetic}</div>
                      </div>
                      <button onClick={() => removePronunciation(rule.id)} className="p-1.5 text-slate-200 hover:text-red-500 rounded-lg transition-all">
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'synchro' && (
            <div className="p-6 space-y-6 animate-fadeIn h-full flex flex-col">
               <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                 <SparklesIcon /> DYNAMIC HIGHLIGHTER
               </label>
               
               {audioResult ? (
                 <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 overflow-y-auto custom-scrollbar">
                    <div className="flex flex-wrap gap-1.5 leading-relaxed text-[13px]">
                        {audioResult.timestamps.map((t, i) => (
                            <span 
                                key={i}
                                className={`px-1 rounded transition-all duration-150 ${activeWordIndex === i ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' : 'text-slate-400'}`}
                            >
                                {t.word}
                            </span>
                        ))}
                    </div>
                 </div>
               ) : (
                 <div className="flex-1 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center p-8 text-center">
                    <div className="p-4 bg-slate-50 rounded-full mb-4 text-slate-300"><SparklesIcon /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Générez un audio pour activer le surlignage</p>
                 </div>
               )}
               
               <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                 <p className="text-[9px] text-indigo-700 font-bold leading-relaxed">
                   SYCHRONISATION : Alignement word-by-word précis basé sur l'analyse de durée phonémique du moteur Gemini.
                 </p>
               </div>
            </div>
          )}

          {activeTab === 'batch' && (
            <div className="p-5 space-y-4 animate-fadeIn h-full flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                  <QueueIcon className="w-3.5 h-3.5" /> FILE D'ATTENTE BATCH
                </label>
                <span className="text-[9px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                  {batchQueue.length} {batchQueue.length > 1 ? 'segments' : 'segment'}
                </span>
              </div>

              {/* Progress Indicator if processing */}
              {batchProgress && (
                <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-2 animate-fadeIn shadow-sm">
                  <div className="flex justify-between items-center text-[10px] font-black text-indigo-900 uppercase">
                    <span className="flex items-center gap-1.5">
                      <LoadingSpinner className="w-3 h-3 text-indigo-600" />
                      Traitement lot
                    </span>
                    <span>{batchProgress.current} / {batchProgress.total}</span>
                  </div>
                  <div className="w-full h-1.5 bg-indigo-200/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${batchProgress.percentage}%` }}
                    />
                  </div>
                  <p className="text-[8px] text-indigo-700 font-bold truncate">
                    {batchProgress.stage}
                  </p>
                </div>
              )}

              {/* Queue actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleProcessBatch}
                  disabled={batchQueue.length === 0 || isProcessingBatch}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-200/50 transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isProcessingBatch ? (
                    <>
                      <LoadingSpinner className="w-3.5 h-3.5 text-white" />
                      <span>Synthèse ({batchProgress?.current || 1}/{batchQueue.length})...</span>
                    </>
                  ) : (
                    <>
                      <PlayIcon className="w-3.5 h-3.5" />
                      <span>Lancer la file ({batchQueue.length})</span>
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleQueueAllSegments}
                    className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold border border-slate-200 transition-all text-center cursor-pointer"
                  >
                    + Tout ajouter
                  </button>
                  {batchQueue.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearQueue}
                      disabled={isProcessingBatch}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg text-[9px] font-bold border border-slate-200 hover:border-red-200 transition-all cursor-pointer"
                      title="Vider la file d'attente"
                    >
                      Vider
                    </button>
                  )}
                </div>
              </div>

              {/* Queue items list */}
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                {batchQueue.length === 0 ? (
                  <div className="h-44 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center p-4 text-center">
                    <div className="p-3 bg-slate-50 rounded-full mb-2 text-slate-300">
                      <QueueIcon className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      La file d'attente est vide
                    </p>
                    <p className="text-[9px] text-slate-400 mt-1">
                      Cliquez sur "Queue" sur un segment dans l'éditeur pour l'ajouter ici.
                    </p>
                  </div>
                ) : (
                  batchQueue.map((item, index) => (
                    <div 
                      key={item.id}
                      className={`p-2.5 bg-white border rounded-xl transition-all shadow-sm ${
                        item.status === 'processing' 
                          ? 'border-indigo-400 ring-1 ring-indigo-200 bg-indigo-50/20' 
                          : item.status === 'completed'
                          ? 'border-emerald-200'
                          : item.status === 'error'
                          ? 'border-red-200'
                          : 'border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded">
                            #{index + 1}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">
                            {item.voice || selectedVoiceId}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {item.status === 'pending' && (
                            <span className="text-[8px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                              Attente
                            </span>
                          )}
                          {item.status === 'processing' && (
                            <span className="text-[8px] font-bold px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded flex items-center gap-1">
                              <LoadingSpinner className="w-2.5 h-2.5 text-indigo-700" /> En cours
                            </span>
                          )}
                          {item.status === 'completed' && (
                            <span className="text-[8px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded flex items-center gap-1">
                              <CheckIcon /> Prêt
                            </span>
                          )}
                          {item.status === 'error' && (
                            <span className="text-[8px] font-bold px-1.5 py-0.2 bg-red-100 text-red-700 rounded">
                              Échec
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveFromQueue(item.id)}
                            disabled={isProcessingBatch}
                            className="p-1 text-slate-300 hover:text-red-500 rounded transition-all cursor-pointer"
                            title="Retirer de la file"
                          >
                            <TrashIcon size={12} />
                          </button>
                        </div>
                      </div>

                      <p className="text-[10px] font-medium text-slate-700 line-clamp-2 leading-relaxed">
                        {item.text}
                      </p>

                      {item.audioResult && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[8px] font-bold text-slate-400">
                            ~{Math.round(item.audioResult.pcmData.byteLength / (2 * 24000))}s
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (item.audioResult) {
                                setAudioResult(item.audioResult);
                                setDuration(item.audioResult.pcmData.byteLength / (2 * 24000));
                                setCurrentTime(0);
                                setIsPlaying(false);
                              }
                            }}
                            className="text-[8px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                          >
                            Écouter segment
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer & Export */}
      <footer className="bg-white border-t border-slate-100 p-6 shadow-2xl z-50 flex-shrink-0">
        <div className="max-w-[1400px] mx-auto flex items-center gap-10">
          <div className="flex-1">
            {audioResult ? (
              <div className="bg-white rounded-2xl p-4 border-2 border-indigo-100 flex flex-col gap-3 animate-slideUp shadow-xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlayback}
                      className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md shadow-indigo-200 active:scale-95 flex items-center justify-center cursor-pointer"
                      title={isPlaying ? "Mettre en pause" : "Écouter l'audio"}
                    >
                      {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-indigo-600 tracking-[0.2em] uppercase">
                          MASTER RENDU STABILISÉ
                        </span>
                        <span className="text-[8px] font-black px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                          QUALITÉ STUDIO
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-semibold mt-0.5">
                        Voix : <span className="text-slate-800 font-bold">{selectedVoiceId}</span> · {LANGS.find(l => l.id === language)?.label || language}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.pause();
                        }
                        setAudioResult(null);
                        setCurrentTime(0);
                        setIsPlaying(false);
                      }}
                      className="p-2 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                      title="Supprimer l'audio"
                    >
                      <TrashIcon size={18} />
                    </button>
                  </div>
                </div>

                {/* Visual Waveform via Recharts */}
                <AudioWaveform
                  pcmData={audioResult.pcmData}
                  duration={duration}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onPlayPause={togglePlayback}
                  onSeek={handleSeek}
                />

                {/* Hidden HTML5 Audio Element */}
                <audio ref={audioRef} src={audioResult.url} className="hidden" preload="auto" />
              </div>
            ) : (
              <div className="bg-slate-50/40 rounded-2xl p-7 border-2 border-dashed border-slate-100 flex items-center justify-center">
                <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span> Studio prêt pour rendu haute fidélité
                </p>
              </div>
            )}
          </div>

          <div className="w-80 flex flex-col gap-3">
             <div className="flex items-center justify-between px-1">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">FORMAT</span>
               <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                  {['MP3', 'WAV'].map(f => (
                    <button key={f} onClick={() => setExportFormat(f as any)} className={`px-4 py-1 rounded-md text-[9px] font-black transition-all ${exportFormat === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                      {f}
                    </button>
                  ))}
               </div>
             </div>

             <div className="flex gap-2">
                <button 
                  onClick={handleGenerate} 
                  disabled={!text.trim() || isGenerating || text.length > MAX_CHARS}
                  className={`flex-1 py-4 rounded-2xl font-black text-sm shadow-2xl transition-all ${isGenerating ? 'bg-slate-200 text-slate-400' : 'bg-indigo-900 text-white hover:bg-black hover:-translate-y-1'}`}
                >
                  {isGenerating ? (
                    <div className="flex items-center justify-center gap-2">
                      <LoadingSpinner className="h-4 w-4 text-indigo-600" />
                      <span className="text-[10px] uppercase tracking-widest">{genStage}</span>
                    </div>
                  ) : (
                    <span className="flex items-center justify-center gap-2 tracking-[0.1em] font-black text-[11px]">
                      GÉNÉRER AUDIO STABLE <PlayIcon className="w-4 h-4" />
                    </span>
                  )}
                </button>

                {audioResult && (
                  <button onClick={handleDownload} className="px-5 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-2xl hover:bg-indigo-700 transition-all">
                    <DownloadIcon />
                  </button>
                )}
             </div>
             {error && <p className="text-[9px] text-red-500 font-bold text-center uppercase">{error}</p>}
          </div>
        </div>
      </footer>

      {/* Project Modal (Create / Edit) */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProjectForm}
        initialProject={projectToEdit}
        mode={projectModalMode}
      />

      {/* Project Drawer (List, Filter, Select, Duplicate, Delete) */}
      <ProjectDrawer
        isOpen={isProjectDrawerOpen}
        onClose={() => setIsProjectDrawerOpen(false)}
        projects={projects}
        activeProjectId={activeProject?.id || null}
        onSelectProject={handleSelectProject}
        onOpenCreateModal={() => {
          setProjectModalMode('create');
          setProjectToEdit(null);
          setIsProjectDrawerOpen(false);
          setIsProjectModalOpen(true);
        }}
        onOpenEditModal={(proj) => {
          setProjectModalMode('edit');
          setProjectToEdit(proj);
          setIsProjectDrawerOpen(false);
          setIsProjectModalOpen(true);
        }}
        onDuplicateProject={handleDuplicateProject}
        onDeleteProject={handleDeleteProject}
        isLoading={isProjectsLoading}
      />

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-slideUp { animation: slideUp 0.4s ease-out forwards; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #eef2f6; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
