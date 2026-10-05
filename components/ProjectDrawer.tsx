import React, { useState } from 'react';
import { Project } from '../types';
import { CONTENT_TYPES, FORMATS, VISUAL_STYLES } from '../constants/projectOptions';

interface ProjectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (project: Project) => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (project: Project) => void;
  onDuplicateProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  isLoading: boolean;
}

export const ProjectDrawer: React.FC<ProjectDrawerProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onOpenCreateModal,
  onOpenEditModal,
  onDuplicateProject,
  onDeleteProject,
  isLoading
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  if (!isOpen) return null;

  const filteredProjects = projects.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchType = filterType === 'all' || p.contentType === filterType;
    return matchSearch && matchType;
  });

  const getContentTypeInfo = (type: string) => {
    return CONTENT_TYPES.find(c => c.id === type) || { icon: '📁', label: type };
  };

  const getVisualStyleInfo = (style: string) => {
    return VISUAL_STYLES.find(s => s.id === style) || { color: '#6366f1' };
  };

  const getFormatInfo = (fmt: string) => {
    return FORMATS.find(f => f.id === fmt) || { icon: '📐' };
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <aside className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-white z-50 shadow-2xl flex flex-col border-l border-slate-200 animate-slideInRight">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
              📁
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                Mes Projets Studio
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {projects.length} projet{projects.length > 1 ? 's' : ''} synchronisé{projects.length > 1 ? 's' : ''} Firestore
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
            >
              <span>+ Nouveau</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 space-y-2 bg-white">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un projet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 outline-none transition-all"
            />
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous ({projects.length})
            </button>
            {CONTENT_TYPES.map(ct => {
              const count = projects.filter(p => p.contentType === ct.id).length;
              if (count === 0 && filterType !== ct.id) return null;
              return (
                <button
                  key={ct.id}
                  type="button"
                  onClick={() => setFilterType(ct.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                    filterType === ct.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{ct.icon}</span>
                  <span>{ct.label}</span>
                  <span className="opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/40">
          {isLoading ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-bold">Chargement des projets...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="h-64 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mb-3">
                🎬
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-1">
                Aucun projet trouvé
              </h3>
              <p className="text-xs text-slate-500 mb-4 max-w-xs">
                {search || filterType !== 'all'
                  ? 'Aucun projet ne correspond à vos filtres.'
                  : 'Commencez par créer votre premier projet multimédia.'}
              </p>
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
              >
                + Créer un projet
              </button>
            </div>
          ) : (
            filteredProjects.map((proj) => {
              const isActive = proj.id === activeProjectId;
              const typeInfo = getContentTypeInfo(proj.contentType);
              const styleInfo = getVisualStyleInfo(proj.visualStyle);
              const formatInfo = getFormatInfo(proj.format);

              return (
                <div
                  key={proj.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 bg-white ${
                    isActive
                      ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => onSelectProject(proj)}
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm">{typeInfo.icon}</span>
                        <h4 className="text-sm font-black text-slate-900 leading-snug">
                          {proj.title}
                        </h4>
                        {isActive && (
                          <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[9px] font-black uppercase tracking-wider">
                            Actif
                          </span>
                        )}
                      </div>

                      {proj.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed">
                          {proj.description}
                        </p>
                      )}
                    </div>

                    {/* Quick Menu Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenEditModal(proj)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                        title="Modifier le projet"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicateProject(proj)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                        title="Dupliquer le projet"
                      >
                        📑
                      </button>
                      <button
                        type="button"
                        onClick={() => setProjectToDelete(proj)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        title="Supprimer le projet"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 text-[10px] font-bold">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md flex items-center gap-1">
                      <span>{formatInfo.icon}</span>
                      <span>{proj.format}</span>
                    </span>

                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md capitalize">
                      {proj.contentType}
                    </span>

                    <span 
                      className="px-2 py-0.5 rounded-md text-white font-black"
                      style={{ backgroundColor: styleInfo.color }}
                    >
                      {proj.visualStyle}
                    </span>

                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                      {proj.language}
                    </span>

                    <span className="text-slate-400 ml-auto text-[9px] font-normal">
                      {new Date(proj.updatedAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </span>
                  </div>

                  {/* Action Button to Open */}
                  <div className="mt-3 pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onSelectProject(proj)}
                      className={`w-full py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isActive
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white'
                      }`}
                    >
                      <span>{isActive ? '✓ Projet Actuel (Chargé)' : 'Charger ce projet'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold">Base de données : Cloud Firestore</span>
          <span className="text-[11px] text-emerald-600 font-black flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Synchronisé
          </span>
        </div>
      </aside>

      {/* Confirmation Modal for Delete */}
      {projectToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-xl mx-auto">
              🗑️
            </div>
            <div className="text-center">
              <h3 className="text-sm font-black text-slate-900 uppercase">
                Supprimer le projet ?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Êtes-vous sûr de vouloir supprimer définitivement <strong className="text-slate-800">« {projectToDelete.title} »</strong> ? Cette action est irréversible.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 transition-all shadow-md shadow-red-300/40 cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
