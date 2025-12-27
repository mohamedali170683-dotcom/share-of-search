import React from 'react';
import type { Project } from '../types';
import { formatDate } from '../services/projectStorage';

interface ProjectCardProps {
  project: Project;
  onView: (project: Project) => void;
  onDelete: (projectId: string) => void;
}

const getGapColor = (gap: number): string => {
  if (gap > 2) return 'text-emerald-600';
  if (gap < -2) return 'text-red-600';
  return 'text-blue-600';
};

const getGapBgColor = (gap: number): string => {
  if (gap > 2) return 'bg-emerald-50';
  if (gap < -2) return 'bg-red-50';
  return 'bg-blue-50';
};

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onView, onDelete }) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete analysis for "${project.domain}"?`)) {
      onDelete(project.id);
    }
  };

  return (
    <div
      onClick={() => onView(project)}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
              {project.domain}
            </h3>
            <p className="text-xs text-gray-500">{formatDate(project.createdAt)}</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          title="Delete project"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Brand & Location */}
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
          {project.brandName}
        </span>
        <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
          {project.locationName}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-emerald-50 rounded-lg">
          <div className="text-lg font-bold text-emerald-600">{project.sos.shareOfSearch}%</div>
          <div className="text-xs text-emerald-700">SOS</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-lg font-bold text-orange-600">{project.sov.shareOfVoice}%</div>
          <div className="text-xs text-orange-700">SOV</div>
        </div>
        <div className={`text-center p-3 rounded-lg ${getGapBgColor(project.gap.gap)}`}>
          <div className={`text-lg font-bold ${getGapColor(project.gap.gap)}`}>
            {project.gap.gap > 0 ? '+' : ''}{project.gap.gap}pp
          </div>
          <div className={`text-xs ${getGapColor(project.gap.gap)}`}>Gap</div>
        </div>
      </div>

      {/* Competitors count */}
      {project.competitors.length > 0 && (
        <div className="mt-3 text-xs text-gray-500">
          {project.competitors.length} competitor{project.competitors.length !== 1 ? 's' : ''} analyzed
        </div>
      )}
    </div>
  );
};
