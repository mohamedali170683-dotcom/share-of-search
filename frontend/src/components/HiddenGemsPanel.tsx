import React, { useState } from 'react';
import type { HiddenGem } from '../types';

interface HiddenGemsPanelProps {
  hiddenGems: HiddenGem[];
}

const getOpportunityConfig = (opportunity: HiddenGem['opportunity']) => {
  switch (opportunity) {
    case 'first-mover':
      return {
        icon: '🚀',
        label: 'First Mover',
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-800'
      };
    case 'easy-win':
      return {
        icon: '🎯',
        label: 'Easy Win',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800'
      };
    case 'rising-trend':
      return {
        icon: '📈',
        label: 'Rising Trend',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800'
      };
  }
};

const getKDColor = (kd: number): string => {
  if (kd <= 20) return 'text-green-600 dark:text-green-400';
  if (kd <= 35) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-orange-600 dark:text-orange-400';
};

const getKDBarWidth = (kd: number): string => {
  return `${Math.min(100, kd)}%`;
};

const getKDBarColor = (kd: number): string => {
  if (kd <= 20) return 'bg-green-500';
  if (kd <= 35) return 'bg-yellow-500';
  return 'bg-orange-500';
};

export const HiddenGemsPanel: React.FC<HiddenGemsPanelProps> = ({ hiddenGems }) => {
  const [filterOpportunity, setFilterOpportunity] = useState<'all' | HiddenGem['opportunity']>('all');
  const [sortBy, setSortBy] = useState<'potential' | 'volume' | 'difficulty'>('potential');

  const filteredGems = hiddenGems
    .filter(gem => filterOpportunity === 'all' || gem.opportunity === filterOpportunity)
    .sort((a, b) => {
      switch (sortBy) {
        case 'volume':
          return b.searchVolume - a.searchVolume;
        case 'difficulty':
          return a.keywordDifficulty - b.keywordDifficulty;
        case 'potential':
        default:
          return b.potentialClicks - a.potentialClicks;
      }
    });

  const opportunityCounts = {
    'first-mover': hiddenGems.filter(g => g.opportunity === 'first-mover').length,
    'easy-win': hiddenGems.filter(g => g.opportunity === 'easy-win').length,
    'rising-trend': hiddenGems.filter(g => g.opportunity === 'rising-trend').length
  };

  const handleExport = () => {
    const csv = [
      ['Keyword', 'Search Volume', 'Keyword Difficulty', 'Position', 'Opportunity', 'Potential Clicks', 'Category', 'Reasoning'].join(','),
      ...filteredGems.map(gem => [
        `"${gem.keyword}"`,
        gem.searchVolume,
        gem.keywordDifficulty,
        gem.position || 'Not ranking',
        gem.opportunity,
        gem.potentialClicks,
        gem.category || '',
        `"${gem.reasoning}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hidden-gems.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (hiddenGems.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Hidden Gems Found</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Hidden Gems require Keyword Difficulty data from the API.<br />
          Make sure your API is configured to return keyword difficulty scores.
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
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              Hidden Gems
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Low competition keywords with high potential - your easiest wins
            </p>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterOpportunity('all')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filterOpportunity === 'all'
                  ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
              }`}
            >
              All ({hiddenGems.length})
            </button>
            <button
              onClick={() => setFilterOpportunity('easy-win')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filterOpportunity === 'easy-win'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200'
              }`}
            >
              🎯 Easy Win ({opportunityCounts['easy-win']})
            </button>
            <button
              onClick={() => setFilterOpportunity('first-mover')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filterOpportunity === 'first-mover'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200'
              }`}
            >
              🚀 First Mover ({opportunityCounts['first-mover']})
            </button>
            <button
              onClick={() => setFilterOpportunity('rising-trend')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filterOpportunity === 'rising-trend'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200'
              }`}
            >
              📈 Rising ({opportunityCounts['rising-trend']})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="potential">Potential Clicks</option>
              <option value="volume">Search Volume</option>
              <option value="difficulty">Difficulty (Low First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {filteredGems.reduce((sum, g) => sum + g.potentialClicks, 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Potential Clicks</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {filteredGems.length > 0
                ? Math.round(filteredGems.reduce((sum, g) => sum + g.keywordDifficulty, 0) / filteredGems.length)
                : 0}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Avg Keyword Difficulty</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {filteredGems.reduce((sum, g) => sum + g.searchVolume, 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Search Volume</p>
          </div>
        </div>
      </div>

      {/* Gems List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {filteredGems.map((gem, idx) => {
          const config = getOpportunityConfig(gem.opportunity);
          return (
            <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Opportunity Badge */}
                <div className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color} ${config.borderColor} border`}>
                  {config.icon} {config.label}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {gem.keyword}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {gem.reasoning}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Volume</span>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {gem.searchVolume.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">KD</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden max-w-[60px]">
                          <div
                            className={`h-full ${getKDBarColor(gem.keywordDifficulty)}`}
                            style={{ width: getKDBarWidth(gem.keywordDifficulty) }}
                          />
                        </div>
                        <span className={`font-semibold ${getKDColor(gem.keywordDifficulty)}`}>
                          {gem.keywordDifficulty}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Position</span>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {gem.position ? `#${gem.position}` : 'Not ranking'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Potential</span>
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        +{gem.potentialClicks.toLocaleString()} clicks
                      </p>
                    </div>
                  </div>

                  {gem.category && (
                    <div className="mt-2">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        {gem.category}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
