import React, { useState } from 'react';
import type { Opportunity, OpportunityType, BrandContext } from '../types';

interface OpportunitiesPanelProps {
  opportunities: Opportunity[];
  brandContext?: BrandContext;
  onDiscardChange?: (discardedIds: Set<string>) => void;
  isLoadingReasoning?: boolean;
}

const TYPE_CONFIG: Record<OpportunityType, { label: string; icon: string; color: string; bgColor: string; borderColor: string }> = {
  'quick-win': {
    label: 'Quick Win',
    icon: '⚡',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800'
  },
  'hidden-gem': {
    label: 'Hidden Gem',
    icon: '💎',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800'
  },
  'content-gap': {
    label: 'Content Gap',
    icon: '📝',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  'cannibalization': {
    label: 'Cannibalization',
    icon: '⚠️',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800'
  }
};

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

export const OpportunitiesPanel: React.FC<OpportunitiesPanelProps> = ({
  opportunities,
  onDiscardChange,
  isLoadingReasoning = false
}) => {
  const [typeFilter, setTypeFilter] = useState<'all' | OpportunityType>('all');
  const [effortFilter, setEffortFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'potential' | 'volume' | 'effort'>('priority');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [discardedIds, setDiscardedIds] = useState<Set<string>>(new Set());
  const [showDiscarded, setShowDiscarded] = useState(false);

  const toggleDiscard = (id: string) => {
    setDiscardedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      onDiscardChange?.(newSet);
      return newSet;
    });
  };

  const effortOrder = { low: 0, medium: 1, high: 2 };

  const filteredOpportunities = opportunities
    .filter(opp => typeFilter === 'all' || opp.type === typeFilter)
    .filter(opp => effortFilter === 'all' || opp.effort === effortFilter)
    .filter(opp => showDiscarded || !discardedIds.has(opp.id))
    .sort((a, b) => {
      switch (sortBy) {
        case 'potential': return b.clickPotential - a.clickPotential;
        case 'volume': return b.searchVolume - a.searchVolume;
        case 'effort': return effortOrder[a.effort] - effortOrder[b.effort];
        default: return b.priority - a.priority;
      }
    });

  const activeOpportunities = opportunities.filter(opp => !discardedIds.has(opp.id));
  const totalPotential = activeOpportunities.reduce((sum, opp) => sum + opp.clickPotential, 0);
  const lowEffortCount = activeOpportunities.filter(opp => opp.effort === 'low').length;
  const typeCounts = activeOpportunities.reduce((acc, opp) => {
    acc[opp.type] = (acc[opp.type] || 0) + 1;
    return acc;
  }, {} as Record<OpportunityType, number>);

  const handleExport = () => {
    const csv = [
      ['Keyword', 'Type', 'Priority', 'Search Volume', 'Click Potential', 'Effort', 'Position', 'Target Position', 'Category', 'Reasoning'].join(','),
      ...activeOpportunities.map(opp => [
        `"${opp.keyword}"`,
        opp.type,
        opp.priority,
        opp.searchVolume,
        opp.clickPotential,
        opp.effort,
        opp.currentPosition || '',
        opp.targetPosition || '',
        opp.category || '',
        `"${(opp.reasoning || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'opportunities.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (opportunities.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Opportunities Found</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Run an analysis to discover keyword opportunities for your brand.
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
              Opportunities
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Prioritized keyword opportunities with AI-powered strategic insights
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isLoadingReasoning && (
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating AI insights...
              </div>
            )}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
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
          {Object.entries(typeCounts).map(([type, count]) => (
            <div key={type} className={`text-center px-3 py-2 rounded-lg ${TYPE_CONFIG[type as OpportunityType].bgColor}`}>
              <div className={`text-lg font-bold ${TYPE_CONFIG[type as OpportunityType].color}`}>
                {count}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{TYPE_CONFIG[type as OpportunityType].label}s</div>
            </div>
          ))}
          {discardedIds.size > 0 && (
            <div className="text-center px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-lg font-bold text-gray-500 dark:text-gray-400">
                {discardedIds.size}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">dismissed</div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Type:</span>
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 text-sm ${
                  typeFilter === 'all'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                All
              </button>
              {(Object.keys(TYPE_CONFIG) as OpportunityType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1 text-sm ${
                    typeFilter === type
                      ? 'bg-amber-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {TYPE_CONFIG[type].icon}
                </button>
              ))}
            </div>
          </div>

          {/* Effort Filter */}
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

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <option value="priority">Priority</option>
              <option value="potential">Click Potential</option>
              <option value="volume">Search Volume</option>
              <option value="effort">Effort (Low First)</option>
            </select>
          </div>

          {discardedIds.size > 0 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showDiscarded}
                onChange={(e) => setShowDiscarded(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-gray-600 dark:text-gray-300">Show dismissed ({discardedIds.size})</span>
            </label>
          )}

          <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
            {filteredOpportunities.length} opportunities
          </span>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {filteredOpportunities.slice(0, 30).map((opp, idx) => {
          const isDiscarded = discardedIds.has(opp.id);
          const isExpanded = expandedId === opp.id;
          const config = TYPE_CONFIG[opp.type];

          return (
            <div
              key={opp.id}
              className={`transition-colors ${isDiscarded ? 'opacity-50 bg-gray-50 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
            >
              <div
                className="px-6 py-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : opp.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Rank & Type Badge */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isDiscarded ? 'bg-gray-100 dark:bg-gray-700' : config.bgColor
                    }`}>
                      <span className={`text-sm font-bold ${isDiscarded ? 'text-gray-400' : config.color}`}>
                        #{idx + 1}
                      </span>
                    </div>
                    <span className="text-lg" title={config.label}>{config.icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className={`text-sm font-medium truncate ${isDiscarded ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        {opp.keyword}
                      </h4>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${config.bgColor} ${config.color}`}>
                        {config.label}
                      </span>
                      {opp.category && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {opp.category}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {/* Position Movement (for quick-wins) */}
                      {opp.currentPosition && opp.targetPosition && (
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPositionBadgeClass(opp.currentPosition)}`}>
                            #{opp.currentPosition}
                          </span>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPositionBadgeClass(opp.targetPosition)}`}>
                            #{opp.targetPosition}
                          </span>
                        </div>
                      )}

                      {/* KD (for hidden gems) */}
                      {opp.keywordDifficulty !== undefined && (
                        <span className="text-gray-500 dark:text-gray-400">
                          KD: {opp.keywordDifficulty}
                        </span>
                      )}

                      {/* Volume */}
                      <span className="text-gray-500 dark:text-gray-400">
                        {opp.searchVolume.toLocaleString()} vol
                      </span>

                      {/* Effort */}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEffortBadgeClass(opp.effort)}`}>
                        {opp.effort} effort
                      </span>
                    </div>

                    {/* URL */}
                    {opp.url && (
                      <div className="mt-1 text-xs text-gray-400 dark:text-gray-500 truncate">
                        {opp.url}
                      </div>
                    )}
                  </div>

                  {/* Click Potential & Actions */}
                  <div className="flex-shrink-0 flex items-start gap-3">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${isDiscarded ? 'text-gray-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        +{opp.clickPotential.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        clicks potential
                      </div>
                    </div>

                    {/* Discard Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDiscard(opp.id);
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
              {isExpanded && (
                <div className="px-6 pb-4 ml-12">
                  <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
                    <h5 className={`text-sm font-medium ${config.color} mb-2 flex items-center gap-2`}>
                      {opp.isLoading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Generating AI insight...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Strategic Insight
                        </>
                      )}
                    </h5>

                    {opp.reasoning ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {opp.reasoning}
                      </p>
                    ) : opp.isLoading ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        Generating personalized strategic analysis...
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        Strategic insight will be generated shortly.
                      </p>
                    )}

                    {/* Cannibalization specific info */}
                    {opp.type === 'cannibalization' && opp.competingUrls && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <h6 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Competing URLs:</h6>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          {opp.competingUrls.map((u, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="font-medium">#{u.position}</span>
                              <span className="truncate">{u.url}</span>
                            </li>
                          ))}
                        </ul>
                        {opp.recommendation && (
                          <div className="mt-2 text-xs">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Recommendation: </span>
                            <span className="capitalize text-gray-600 dark:text-gray-400">{opp.recommendation}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {filteredOpportunities.length > 30 && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 text-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing 30 of {filteredOpportunities.length} opportunities
          </span>
        </div>
      )}
    </div>
  );
};
