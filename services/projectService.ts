import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { Project, ProjectFormData, VoiceName } from '../types';

const PROJECTS_COLLECTION = 'projects';

export const subscribeToProjects = (
  onSuccess: (projects: Project[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(
    collection(db, PROJECTS_COLLECTION),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const projects: Project[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || 'Sans titre',
          description: data.description || '',
          contentType: data.contentType || 'storytelling',
          format: data.format || '16:9',
          language: data.language || 'French',
          visualStyle: data.visualStyle || 'Cinématique Réaliste',
          script: data.script || '',
          voice: data.voice || 'Fenrir',
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt || Date.now(),
        } as Project;
      });
      onSuccess(projects);
    },
    (err) => {
      console.error('Firestore subscribeToProjects error:', err);
      if (onError) onError(err);
    }
  );
};

export const createProject = async (
  data: ProjectFormData, 
  initialScript: string = '', 
  voice: VoiceName = 'Fenrir'
): Promise<Project> => {
  if (!data.title.trim()) {
    throw new Error('Le titre du projet est obligatoire.');
  }

  const now = Date.now();
  const payload = {
    title: data.title.trim(),
    description: data.description.trim(),
    contentType: data.contentType,
    format: data.format,
    language: data.language,
    visualStyle: data.visualStyle,
    script: initialScript,
    voice: voice,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), payload);
  return {
    id: docRef.id,
    ...payload
  };
};

export const updateProject = async (
  id: string, 
  updates: Partial<ProjectFormData & { script?: string; voice?: VoiceName }>
): Promise<void> => {
  if (!id) throw new Error('ID du projet manquant.');
  
  const docRef = doc(db, PROJECTS_COLLECTION, id);
  const now = Date.now();
  
  const payload: any = {
    updatedAt: now,
    ...updates
  };
  
  if (updates.title !== undefined) {
    if (!updates.title.trim()) throw new Error('Le titre ne peut pas être vide.');
    payload.title = updates.title.trim();
  }

  await updateDoc(docRef, payload);
};

export const deleteProject = async (id: string): Promise<void> => {
  if (!id) throw new Error('ID du projet manquant.');
  const docRef = doc(db, PROJECTS_COLLECTION, id);
  await deleteDoc(docRef);
};

export const duplicateProject = async (sourceProject: Project): Promise<Project> => {
  const now = Date.now();
  const payload = {
    title: `${sourceProject.title} (Copie)`,
    description: sourceProject.description || '',
    contentType: sourceProject.contentType,
    format: sourceProject.format,
    language: sourceProject.language,
    visualStyle: sourceProject.visualStyle,
    script: sourceProject.script || '',
    voice: sourceProject.voice || ('Fenrir' as VoiceName),
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), payload);
  return {
    id: docRef.id,
    ...payload
  };
};
