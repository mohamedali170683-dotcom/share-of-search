import React, { useState } from 'react';
import type { QuickWinOpportunity } from '../types';

interface QuickWinsPanelProps {
  quickWins: QuickWinOpportunity[];
}

const getEffortBadgeClass = (effort: 'low' | 'medium' | 'high'): string => {
  switch (effort) {
    case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
    case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
  }
};

const getPositionBadgeClass = (position: number): string => {
  if (position <= 3) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
  if (position <= 10) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
  return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
};

export const QuickWinsPanel: React.FC<QuickWinsPanelProps> = ({ quickWins }) => {
  const [filter, setFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [sortBy, setSortBy] = useState<'uplift' | 'volume' | 'position'>('uplift');

  const filteredWins = quickWins
    .filter(qw => filter === 'all' || qw.effort === filter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'volume': return b.searchVolume - a.searchVolume;
        case 'position': return a.currentPosition - b.currentPosition;
        default: return b.clickUplift - a.clickUplift;
      }
    });

  const totalPotential = filteredWins.reduce((sum, qw) => sum + qw.clickUplift, 0);
  const lowEffortCount = quickWins.filter(qw => qw.effort === 'low').length;

  if (quickWins.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Quick Wins Found</h3>
        <p className="text-gray-500 dark:text-gray-400">
          You don't have keywords in positions 4-20 with significant optimization potential.
          This could mean you're already well-optimized!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
              </svg>
              Quick Wins
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Keywords in positions 4-20 with high improvement potential
            </p>
          </div>

          {/* Summary Stats */}
          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                +{totalPotential.toLocaleString()}
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300">clicks potential</div>
            </div>
            <div className="text-center px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {lowEffortCount}
              </div>
              <div className="text-xs text-green-700 dark:text-green-300">low effort</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Effort:</span>
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              {(['all', 'low', 'medium', 'high'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setFilter(option)}
                  className={`px-3 py-1 text-sm capitalize ${
                    filter === option
                      ? 'bg-amber-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'uplift' | 'volume' | 'position')}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <option value="uplift">Click Uplift</option>
              <option value="volume">Search Volume</option>
              <option value="position">Current Position</option>
            </select>
          </div>

          <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
            {filteredWins.length} opportunities
          </span>
        </div>
      </div>

      {/* Quick Wins List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {filteredWins.slice(0, 10).map((qw, idx) => (
          <div key={idx} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <div className="flex items-start gap-4">
              {/* Rank Number */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <span className="text-sm font-bold text-amber-700 dark:text-amber-300">#{idx + 1}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {qw.keyword}
                  </h4>
                  {qw.category && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {qw.category}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {/* Position Movement */}
                  <div className="flex items-center gap-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPositionBadgeClass(qw.currentPosition)}`}>
                      #{qw.currentPosition}
                    </span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPositionBadgeClass(qw.targetPosition)}`}>
                      #{qw.targetPosition}
                    </span>
                  </div>

                  {/* Volume */}
                  <span className="text-gray-500 dark:text-gray-400">
                    {qw.searchVolume.toLocaleString()} vol
                  </span>

                  {/* Effort */}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEffortBadgeClass(qw.effort)}`}>
                    {qw.effort} effort
                  </span>
                </div>

                {/* URL */}
                {qw.url && (
                  <div className="mt-1 text-xs text-gray-400 dark:text-gray-500 truncate">
                    {qw.url}
                  </div>
                )}
              </div>

              {/* Uplift */}
              <div className="flex-shrink-0 text-right">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  +{qw.clickUplift.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  +{qw.upliftPercentage}% clicks
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {filteredWins.length > 10 && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 text-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing 10 of {filteredWins.length} opportunities
          </span>
        </div>
      )}
    </div>
  );
};
