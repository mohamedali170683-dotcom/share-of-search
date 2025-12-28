import React, { useState } from 'react';
import type { HiddenGem, SearchIntent, FunnelStage } from '../types';

// Intent badge helpers
const getIntentBadgeClass = (intent?: SearchIntent): string => {
  switch (intent) {
    case 'informational': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
    case 'navigational': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300';
    case 'commercial': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';
    case 'transactional': return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  }
};

const getIntentLabel = (intent?: SearchIntent): string => {
  switch (intent) {
    case 'informational': return 'Info';
    case 'navigational': return 'Nav';
    case 'commercial': return 'Commercial';
    case 'transactional': return 'Transact';
    default: return '';
  }
};

const getFunnelLabel = (stage?: FunnelStage): string => {
  switch (stage) {
    case 'awareness': return 'Awareness';
    case 'consideration': return 'Consideration';
    case 'decision': return 'Decision';
    default: return '';
  }
};

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

  // Check if we're using estimated KD values
  const hasEstimatedKD = hiddenGems.some(gem => gem.reasoning?.includes('Est. KD'));

  if (hiddenGems.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
        <div className="text-center mb-6">
          <svg className="w-16 h-16 text-yellow-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Hidden Gems Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No low-competition keywords matching your brand context were found. This could mean:
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            What This Means
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
            <li>• Your keywords in positions 4-20 already have high competition</li>
            <li>• Keywords with volume &gt;200 and difficulty &lt;40 weren't found in your niche</li>
            <li>• Focus on Quick Wins and Content Gaps for opportunities instead</li>
          </ul>
        </div>

        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
            <div className="text-2xl mb-1">🚀</div>
            <div className="font-medium text-purple-700 dark:text-purple-300">First Mover</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Keywords you're not ranking for yet, but are easy to win</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <div className="text-2xl mb-1">🎯</div>
            <div className="font-medium text-green-700 dark:text-green-300">Easy Win</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">Keywords where small improvements yield big results</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <div className="text-2xl mb-1">📈</div>
            <div className="font-medium text-blue-700 dark:text-blue-300">Rising Trend</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Keywords with growing search volume (trending topics)</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      {/* Estimated KD Notice */}
      {hasEstimatedKD && (
        <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>
              <strong>Estimated difficulty:</strong> KD values are inferred from your ranking position. For precise difficulty scores, enable the Bulk Keyword Difficulty API.
            </span>
          </div>
        </div>
      )}

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

                  {(gem.category || gem.searchIntent) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {gem.category && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          {gem.category}
                        </span>
                      )}
                      {gem.searchIntent && (
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${getIntentBadgeClass(gem.searchIntent.mainIntent)}`}
                          title={`Funnel: ${getFunnelLabel(gem.searchIntent.funnelStage)}`}
                        >
                          {getIntentLabel(gem.searchIntent.mainIntent)}
                        </span>
                      )}
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
