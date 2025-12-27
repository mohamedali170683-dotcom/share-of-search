import type { Project } from '../types';

const STORAGE_KEY = 'searchshare_projects';
const MAX_PROJECTS = 10;

// Generate unique ID
const generateId = (): string => {
  return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get all projects from localStorage
export const getProjects = (): Project[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const projects = JSON.parse(data) as Project[];
    // Sort by date, newest first
    return projects.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Failed to load projects:', error);
    return [];
  }
};

// Save a new project
export const saveProject = (projectData: Omit<Project, 'id' | 'createdAt'>): Project => {
  const projects = getProjects();

  const newProject: Project = {
    ...projectData,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  // Add new project at the beginning
  projects.unshift(newProject);

  // Keep only the most recent projects
  const trimmedProjects = projects.slice(0, MAX_PROJECTS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedProjects));
  } catch (error) {
    console.error('Failed to save project:', error);
  }

  return newProject;
};

// Get a single project by ID
export const getProject = (id: string): Project | null => {
  const projects = getProjects();
  return projects.find(p => p.id === id) || null;
};

// Delete a project
export const deleteProject = (id: string): boolean => {
  const projects = getProjects();
  const filteredProjects = projects.filter(p => p.id !== id);

  if (filteredProjects.length === projects.length) {
    return false; // Project not found
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredProjects));
    return true;
  } catch (error) {
    console.error('Failed to delete project:', error);
    return false;
  }
};

// Clear all projects
export const clearAllProjects = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear projects:', error);
  }
};

// Format date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
