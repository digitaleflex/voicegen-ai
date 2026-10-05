import React, { useState, useEffect } from 'react';
import { Project, ProjectFormData, ContentType, ProjectFormat, VisualStyle, Language } from '../types';
import { CONTENT_TYPES, FORMATS, VISUAL_STYLES } from '../constants/projectOptions';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProjectFormData) => Promise<void>;
  initialProject?: Project | null;
  mode: 'create' | 'edit';
}

const LANGUAGES_LIST: Array<{ id: Language; label: string; flag: string }> = [
  { id: Language.FRENCH, label: 'Français', flag: '🇫🇷' },
  { id: Language.ENGLISH, label: 'English (US)', flag: '🇺🇸' },
  { id: Language.SPANISH, label: 'Español', flag: '🇪🇸' },
  { id: Language.GERMAN, label: 'Deutsch', flag: '🇩🇪' },
  { id: Language.ITALIAN, label: 'Italiano', flag: '🇮🇹' },
];

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProject,
  mode
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<ContentType>('storytelling');
  const [format, setFormat] = useState<ProjectFormat>('16:9');
  const [language, setLanguage] = useState<Language>(Language.FRENCH);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('Cinématique Réaliste');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialProject && mode === 'edit') {
        setTitle(initialProject.title);
        setDescription(initialProject.description || '');
        setContentType(initialProject.contentType);
        setFormat(initialProject.format);
        setLanguage(initialProject.language);
        setVisualStyle(initialProject.visualStyle);
      } else {
        setTitle('');
        setDescription('');
        setContentType('storytelling');
        setFormat('16:9');
        setLanguage(Language.FRENCH);
        setVisualStyle('Cinématique Réaliste');
      }
      setFormError(null);
    }
  }, [isOpen, initialProject, mode]);

  if (!isOpen) return null;

  // Mise à jour intelligente du format recommandé lors du choix du type de contenu
  const handleContentTypeSelect = (type: ContentType) => {
    setContentType(type);
    const found = CONTENT_TYPES.find(c => c.id === type);
    if (found && mode === 'create') {
      setFormat(found.suggestedFormat);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Veuillez entrer un titre pour votre projet.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        contentType,
        format,
        language,
        visualStyle
      });
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Une erreur est survenue lors de l’enregistrement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-indigo-200">
              {mode === 'create' ? '✨' : '✏️'}
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                {mode === 'create' ? 'Nouveau Projet Studio' : 'Modifier le Projet'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Configurez le format, le type de contenu et l'univers visuel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{formError}</span>
            </div>
          )}

          {/* Section: Titre & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Titre du projet <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Les Mystères de l'Océan Profond"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Description ou Brief créatif
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Notes de production, intentions artistiques, cible audience..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Section: Type de contenu (9 options demandées) */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2">
              Type de contenu
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {CONTENT_TYPES.map((ct) => {
                const isSelected = contentType === ct.id;
                return (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => handleContentTypeSelect(ct.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{ct.icon}</span>
                      <span className={`text-xs font-black capitalize ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                        {ct.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                      {ct.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Format (9:16, 16:9, 1:1) & Langue */}
          <div className="grid grid-cols-2 gap-4">
            {/* Formats */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2">
                Format d'image (Ratio)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {FORMATS.map((fmt) => {
                  const isSelected = format === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setFormat(fmt.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-500 text-indigo-900'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <span className="text-base mb-1">{fmt.icon}</span>
                      <span className="text-xs font-black">{fmt.id}</span>
                      <span className="text-[9px] text-slate-400 truncate w-full">
                        {fmt.id === '9:16' ? 'Vertical' : fmt.id === '16:9' ? 'Paysage' : 'Carré'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Langues */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2">
                Langue de narration
              </label>
              <div className="space-y-1.5">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all cursor-pointer"
                >
                  {LANGUAGES_LIST.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.flag} {lang.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 px-1">
                  Les voix disponibles et les phonèmes seront adaptés à cette langue.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Style Visuel */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2">
              Style visuel & esthétique
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {VISUAL_STYLES.map((vs) => {
                const isSelected = visualStyle === vs.id;
                return (
                  <button
                    key={vs.id}
                    type="button"
                    onClick={() => setVisualStyle(vs.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: vs.color }}
                      />
                      <span className="text-[11px] font-black text-slate-800 leading-tight">
                        {vs.label}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {vs.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/80 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-all cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-300/40 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Enregistrement...</span>
              </>
            ) : (
              <span>{mode === 'create' ? 'Créer le projet' : 'Sauvegarder les modifications'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
