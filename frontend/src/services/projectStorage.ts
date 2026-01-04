import type { Project } from '../types';

const STORAGE_KEY = 'searchshare_projects';
const MAX_PROJECTS = 10;

// Generate unique ID
const generateId = (): string => {
  return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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

// Delete a project and its related analyses (YouTube, Paid Ads)
export const deleteProject = (id: string): boolean => {
  const projects = getProjects();
  const projectToDelete = projects.find(p => p.id === id);
  const filteredProjects = projects.filter(p => p.id !== id);

  if (filteredProjects.length === projects.length) {
    return false; // Project not found
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredProjects));

    // Also clean up related YouTube and Paid Ads analyses
    if (projectToDelete) {
      cleanupRelatedAnalyses(projectToDelete.brandName, projectToDelete.domain);
    }

    return true;
  } catch (error) {
    console.error('Failed to delete project:', error);
    return false;
  }
};

// Clean up YouTube, Paid Ads, and Google Maps analyses when a project is deleted
const cleanupRelatedAnalyses = (brandName: string, domain: string): void => {
  const brandLower = brandName.toLowerCase();
  const domainLower = domain.toLowerCase();

  // Clean YouTube analyses
  try {
    const youtubeData = localStorage.getItem('youtube-sov-analyses');
    if (youtubeData) {
      const analyses = JSON.parse(youtubeData);
      const filtered = analyses.filter((a: { brandName?: string }) =>
        a && a.brandName && a.brandName.toLowerCase() !== brandLower
      );
      localStorage.setItem('youtube-sov-analyses', JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Failed to clean YouTube analyses:', e);
  }

  // Clean YouTube channel info
  try {
    const channelData = localStorage.getItem('youtube-channel-info');
    if (channelData) {
      const channels = JSON.parse(channelData);
      delete channels[brandLower];
      localStorage.setItem('youtube-channel-info', JSON.stringify(channels));
    }
  } catch (e) {
    console.error('Failed to clean YouTube channel info:', e);
  }

  // Clean Paid Ads analyses
  try {
    const paidData = localStorage.getItem('paid-ads-analyses');
    if (paidData) {
      const analyses = JSON.parse(paidData);
      const filtered = analyses.filter((a: { domain?: string }) =>
        a && a.domain && a.domain.toLowerCase() !== domainLower
      );
      localStorage.setItem('paid-ads-analyses', JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Failed to clean Paid Ads analyses:', e);
  }

  // Clean Google Maps (Local SEO) analyses
  try {
    const mapsData = localStorage.getItem('google-maps-analyses');
    if (mapsData) {
      const analyses = JSON.parse(mapsData);
      const filtered = analyses.filter((a: { brandName?: string }) =>
        a && a.brandName && a.brandName.toLowerCase() !== brandLower
      );
      localStorage.setItem('google-maps-analyses', JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Failed to clean Google Maps analyses:', e);
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
