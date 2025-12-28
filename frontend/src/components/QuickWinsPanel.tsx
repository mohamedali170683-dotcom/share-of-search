import React, { useState, useMemo } from 'react';
import type { QuickWinOpportunity, SearchIntent, FunnelStage } from '../types';

// Intent badge configuration
const getIntentBadgeClass = (intent?: SearchIntent): string => {
  switch (intent) {
    case 'informational': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
    case 'navigational': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300';
    case 'commercial': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';
    case 'transactional': return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
    default: return '';
  }
};

const getIntentLabel = (intent?: SearchIntent): string => {
  switch (intent) {
    case 'informational': return 'Info';
    case 'navigational': return 'Nav';
    case 'commercial': return 'Comm';
    case 'transactional': return 'Trans';
    default: return '';
  }
};

const getFunnelBadgeClass = (stage?: FunnelStage): string => {
  switch (stage) {
    case 'awareness': return 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300';
    case 'consideration': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300';
    case 'decision': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300';
    default: return '';
  }
};

const getFunnelLabel = (stage?: FunnelStage): string => {
  switch (stage) {
    case 'awareness': return 'Awareness';
    case 'consideration': return 'Consider';
    case 'decision': return 'Decision';
    default: return '';
  }
};

const getFunnelIcon = (stage?: FunnelStage): string => {
  switch (stage) {
    case 'awareness': return '👀';
    case 'consideration': return '🤔';
    case 'decision': return '💰';
    default: return '';
  }
};

interface QuickWinsPanelProps {
  quickWins: QuickWinOpportunity[];
  onDiscardChange?: (discardedKeywords: Set<string>) => void;
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

export const QuickWinsPanel: React.FC<QuickWinsPanelProps> = ({ quickWins, onDiscardChange }) => {
  const [effortFilter, setEffortFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [funnelFilter, setFunnelFilter] = useState<'all' | FunnelStage>('all');
  const [sortBy, setSortBy] = useState<'uplift' | 'volume' | 'position' | 'recommended'>('uplift');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [discardedKeywords, setDiscardedKeywords] = useState<Set<string>>(new Set());
  const [showDiscarded, setShowDiscarded] = useState(false);

  // Count recommended items
  const recommendedCount = quickWins.filter(qw => qw.isRecommended && !discardedKeywords.has(qw.keyword)).length;

  // Calculate funnel stage distribution
  const funnelCounts = useMemo(() => {
    const active = quickWins.filter(qw => !discardedKeywords.has(qw.keyword));
    return {
      awareness: active.filter(qw => qw.searchIntent?.funnelStage === 'awareness').length,
      consideration: active.filter(qw => qw.searchIntent?.funnelStage === 'consideration').length,
      decision: active.filter(qw => qw.searchIntent?.funnelStage === 'decision').length,
      unknown: active.filter(qw => !qw.searchIntent?.funnelStage).length
    };
  }, [quickWins, discardedKeywords]);

  const toggleDiscard = (keyword: string) => {
    setDiscardedKeywords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyword)) {
        newSet.delete(keyword);
      } else {
        newSet.add(keyword);
      }
      onDiscardChange?.(newSet);
      return newSet;
    });
  };

  const filteredWins = quickWins
    .filter(qw => effortFilter === 'all' || qw.effort === effortFilter)
    .filter(qw => funnelFilter === 'all' || qw.searchIntent?.funnelStage === funnelFilter)
    .filter(qw => showDiscarded || !discardedKeywords.has(qw.keyword))
    .sort((a, b) => {
      switch (sortBy) {
        case 'volume': return b.searchVolume - a.searchVolume;
        case 'position': return a.currentPosition - b.currentPosition;
        case 'recommended':
          // Recommended first, then by uplift
          if (a.isRecommended && !b.isRecommended) return -1;
          if (!a.isRecommended && b.isRecommended) return 1;
          return b.clickUplift - a.clickUplift;
        default: return b.clickUplift - a.clickUplift;
      }
    });

  const activeWins = quickWins.filter(qw => !discardedKeywords.has(qw.keyword));
  const totalPotential = activeWins.reduce((sum, qw) => sum + qw.clickUplift, 0);
  const lowEffortCount = activeWins.filter(qw => qw.effort === 'low').length;

  const handleExport = () => {
    const csv = [
      ['Keyword', 'Current Position', 'Target Position', 'Search Volume', 'Current Clicks', 'Potential Clicks', 'Click Uplift', 'Uplift %', 'Effort', 'Category', 'URL', 'Reasoning'].join(','),
      ...activeWins.map(qw => [
        `"${qw.keyword}"`,
        qw.currentPosition,
        qw.targetPosition,
        qw.searchVolume,
        qw.currentClicks,
        qw.potentialClicks,
        qw.clickUplift,
        qw.upliftPercentage,
        qw.effort,
        qw.category || '',
        `"${qw.url || ''}"`,
        `"${qw.reasoning || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quick-wins.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

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
              Keywords in positions 4-20 with high improvement potential. Click any row for details.
            </p>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Summary Stats */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
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

          {/* Funnel Stage Distribution */}
          <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">Funnel:</span>
            {funnelCounts.awareness > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300" title="Awareness stage keywords">
                👀 {funnelCounts.awareness}
              </span>
            )}
            {funnelCounts.consideration > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" title="Consideration stage keywords">
                🤔 {funnelCounts.consideration}
              </span>
            )}
            {funnelCounts.decision > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" title="Decision stage keywords">
                💰 {funnelCounts.decision}
              </span>
            )}
          </div>

          {discardedKeywords.size > 0 && (
            <div className="text-center px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                {discardedKeywords.size}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">dismissed</div>
            </div>
          )}
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
                  onClick={() => setEffortFilter(option)}
                  className={`px-3 py-1 text-sm capitalize ${
                    effortFilter === option
                      ? 'bg-amber-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Funnel Stage Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Funnel:</span>
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                onClick={() => setFunnelFilter('all')}
                className={`px-3 py-1 text-sm ${
                  funnelFilter === 'all'
                    ? 'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFunnelFilter('awareness')}
                className={`px-3 py-1 text-sm ${
                  funnelFilter === 'awareness'
                    ? 'bg-sky-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                title="Top of funnel - informational & navigational intent"
              >
                👀 Aware
              </button>
              <button
                onClick={() => setFunnelFilter('consideration')}
                className={`px-3 py-1 text-sm ${
                  funnelFilter === 'consideration'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                title="Middle of funnel - commercial intent"
              >
                🤔 Consider
              </button>
              <button
                onClick={() => setFunnelFilter('decision')}
                className={`px-3 py-1 text-sm ${
                  funnelFilter === 'decision'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                title="Bottom of funnel - transactional intent"
              >
                💰 Decision
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'uplift' | 'volume' | 'position' | 'recommended')}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {recommendedCount > 0 && (
                <option value="recommended">Recommended ({recommendedCount})</option>
              )}
              <option value="uplift">Click Uplift</option>
              <option value="volume">Search Volume</option>
              <option value="position">Current Position</option>
            </select>
          </div>

          {discardedKeywords.size > 0 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showDiscarded}
                onChange={(e) => setShowDiscarded(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-gray-600 dark:text-gray-300">Show dismissed ({discardedKeywords.size})</span>
            </label>
          )}

          <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
            {filteredWins.length} opportunities
          </span>
        </div>
      </div>

      {/* Quick Wins List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {filteredWins.slice(0, 20).map((qw, idx) => {
          const isDiscarded = discardedKeywords.has(qw.keyword);
          const isExpanded = expandedIdx === idx;

          return (
            <div
              key={idx}
              className={`transition-colors ${isDiscarded ? 'opacity-50 bg-gray-50 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
            >
              <div
                className="px-6 py-4 cursor-pointer"
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              >
                <div className="flex items-start gap-4">
                  {/* Rank Number */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isDiscarded ? 'bg-gray-100 dark:bg-gray-700' : 'bg-amber-100 dark:bg-amber-900/30'
                  }`}>
                    <span className={`text-sm font-bold ${isDiscarded ? 'text-gray-400' : 'text-amber-700 dark:text-amber-300'}`}>
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className={`text-sm font-medium truncate ${isDiscarded ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        {qw.keyword}
                      </h4>
                      {qw.isRecommended && !isDiscarded && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-1" title={qw.recommendedReason}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Recommended
                        </span>
                      )}
                      {qw.category && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {qw.category}
                        </span>
                      )}
                      {qw.searchIntent && (
                        <>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getIntentBadgeClass(qw.searchIntent.mainIntent)}`}>
                            {getIntentLabel(qw.searchIntent.mainIntent)}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getFunnelBadgeClass(qw.searchIntent.funnelStage)}`}>
                            {getFunnelIcon(qw.searchIntent.funnelStage)} {getFunnelLabel(qw.searchIntent.funnelStage)}
                          </span>
                        </>
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

                  {/* Uplift & Actions */}
                  <div className="flex-shrink-0 flex items-start gap-3">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${isDiscarded ? 'text-gray-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        +{qw.clickUplift.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        +{qw.upliftPercentage}% clicks
                      </div>
                    </div>

                    {/* Discard Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDiscard(qw.keyword);
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        isDiscarded
                          ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                          : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
                      }`}
                      title={isDiscarded ? 'Restore this opportunity' : 'Dismiss this opportunity'}
                    >
                      {isDiscarded ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>

                    {/* Expand indicator */}
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expanded Reasoning */}
              {isExpanded && qw.reasoning && (
                <div className="px-6 pb-4 ml-12">
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <h5 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Why This Is a Quick Win
                    </h5>

                    {/* Render multi-section reasoning */}
                    <div className="space-y-3">
                      {qw.reasoning.split('\n\n').map((section, sectionIdx) => {
                        // Check if section has a bold header (e.g., **Strategic Value:**)
                        const boldMatch = section.match(/^\*\*(.+?):\*\*\s*(.*)$/s);
                        if (boldMatch) {
                          return (
                            <div key={sectionIdx} className="bg-amber-100/50 dark:bg-amber-800/30 rounded p-3">
                              <h6 className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1">
                                {boldMatch[1]}
                              </h6>
                              <p className="text-sm text-amber-700 dark:text-amber-300">
                                {boldMatch[2]}
                              </p>
                            </div>
                          );
                        }
                        return (
                          <p key={sectionIdx} className="text-sm text-amber-700 dark:text-amber-300">
                            {section}
                          </p>
                        );
                      })}
                    </div>

                    <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-700">
                      <h6 className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">Suggested Actions:</h6>
                      <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                        {qw.currentPosition >= 4 && qw.currentPosition <= 10 && (
                          <>
                            <li>• Improve content depth and add more relevant information</li>
                            <li>• Optimize title tag and meta description for higher CTR</li>
                            <li>• Add internal links from high-authority pages</li>
                          </>
                        )}
                        {qw.currentPosition >= 11 && qw.currentPosition <= 15 && (
                          <>
                            <li>• Focus on building quality backlinks to this page</li>
                            <li>• Expand content to cover related subtopics</li>
                            <li>• Improve page speed and Core Web Vitals</li>
                          </>
                        )}
                        {qw.currentPosition >= 16 && (
                          <>
                            <li>• Consider creating fresh, more comprehensive content</li>
                            <li>• Analyze top-ranking competitors for content gaps</li>
                            <li>• Review and improve E-E-A-T signals on the page</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {filteredWins.length > 20 && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 text-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing 20 of {filteredWins.length} opportunities
          </span>
        </div>
      )}
    </div>
  );
};
