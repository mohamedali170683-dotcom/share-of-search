import React, { useState, useMemo } from 'react';
import type { ActionItem } from '../types';

interface ActionListPanelProps {
  actions: ActionItem[];
  onDiscardChange?: (discardedIds: Set<string>) => void;
}

const getActionTypeConfig = (type: ActionItem['actionType']) => {
  switch (type) {
    case 'optimize':
      return {
        icon: '🔧',
        label: 'Optimize',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800'
      };
    case 'create':
      return {
        icon: '✨',
        label: 'Create',
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-800'
      };
    case 'monitor':
      return {
        icon: '👁️',
        label: 'Monitor',
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
        borderColor: 'border-emerald-200 dark:border-emerald-800'
      };
    case 'investigate':
      return {
        icon: '🔍',
        label: 'Investigate',
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800'
      };
  }
};

const getImpactBadge = (impact: ActionItem['impact']) => {
  switch (impact) {
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    case 'medium':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
    case 'low':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

const getEffortBadge = (effort: ActionItem['effort']) => {
  switch (effort) {
    case 'low':
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
    case 'medium':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
  }
};

const getPriorityColor = (priority: number) => {
  if (priority >= 80) return 'bg-red-500';
  if (priority >= 60) return 'bg-amber-500';
  if (priority >= 40) return 'bg-blue-500';
  return 'bg-gray-400';
};

export const ActionListPanel: React.FC<ActionListPanelProps> = ({ actions, onDiscardChange }) => {
  const [filterType, setFilterType] = useState<'all' | ActionItem['actionType']>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [discardedIds, setDiscardedIds] = useState<Set<string>>(new Set());
  const [showDiscarded, setShowDiscarded] = useState(false);

  // Toggle discard state for an action
  const toggleDiscard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Filter actions by type and discard status
  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      const matchesType = filterType === 'all' || action.actionType === filterType;
      const isDiscarded = discardedIds.has(action.id);
      return matchesType && (showDiscarded || !isDiscarded);
    });
  }, [actions, filterType, discardedIds, showDiscarded]);

  const discardedCount = discardedIds.size;

  // Export to CSV
  const exportToCSV = () => {
    const activeActions = actions.filter(a => !discardedIds.has(a.id));
    const headers = ['Priority', 'Type', 'Impact', 'Effort', 'Title', 'Description', 'Keyword', 'Category', 'Est. Clicks', 'Reasoning'];
    const rows = activeActions.map((a, idx) => [
      idx + 1,
      a.actionType,
      a.impact,
      a.effort,
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.description.replace(/"/g, '""')}"`,
      a.keyword || '',
      a.category || '',
      a.estimatedUplift,
      `"${a.reasoning.replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'action-list.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Count actions excluding discarded ones
  const activeActions = actions.filter(a => !discardedIds.has(a.id));
  const typeCounts = {
    optimize: activeActions.filter(a => a.actionType === 'optimize').length,
    create: activeActions.filter(a => a.actionType === 'create').length,
    monitor: activeActions.filter(a => a.actionType === 'monitor').length,
    investigate: activeActions.filter(a => a.actionType === 'investigate').length
  };

  const totalEstimatedUplift = activeActions.reduce((sum, a) => sum + a.estimatedUplift, 0);

  if (actions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Actions Generated</h3>
        <p className="text-gray-500 dark:text-gray-400">
          We couldn't identify any specific actions based on your data.
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
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Prioritized Action List
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Recommended actions sorted by priority score
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Total Uplift */}
            <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-center">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                +{totalEstimatedUplift.toLocaleString()}
              </div>
              <div className="text-xs text-indigo-700 dark:text-indigo-300">total estimated clicks</div>
            </div>

            {/* Export Button */}
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
              title="Export to CSV"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV
            </button>
          </div>
        </div>

        {/* Dismissed Toggle */}
        {discardedCount > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => setShowDiscarded(!showDiscarded)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
            >
              <svg className={`w-4 h-4 transition-transform ${showDiscarded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {showDiscarded ? 'Hide' : 'Show'} {discardedCount} dismissed action{discardedCount !== 1 ? 's' : ''}
            </button>
            <button
              onClick={() => setDiscardedIds(new Set())}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              Restore all
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              filterType === 'all'
                ? 'bg-indigo-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            All ({actions.length})
          </button>
          {typeCounts.optimize > 0 && (
            <button
              onClick={() => setFilterType('optimize')}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                filterType === 'optimize'
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              }`}
            >
              🔧 Optimize ({typeCounts.optimize})
            </button>
          )}
          {typeCounts.create > 0 && (
            <button
              onClick={() => setFilterType('create')}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                filterType === 'create'
                  ? 'bg-purple-500 text-white'
                  : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
              }`}
            >
              ✨ Create ({typeCounts.create})
            </button>
          )}
          {typeCounts.investigate > 0 && (
            <button
              onClick={() => setFilterType('investigate')}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                filterType === 'investigate'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              }`}
            >
              🔍 Investigate ({typeCounts.investigate})
            </button>
          )}
          {typeCounts.monitor > 0 && (
            <button
              onClick={() => setFilterType('monitor')}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                filterType === 'monitor'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              👁️ Monitor ({typeCounts.monitor})
            </button>
          )}
        </div>
      </div>

      {/* Action List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {filteredActions.map((action, idx) => {
          const config = getActionTypeConfig(action.actionType);
          const isExpanded = expandedId === action.id;
          const isDiscarded = discardedIds.has(action.id);

          return (
            <div key={action.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isDiscarded ? 'opacity-50' : ''}`}>
              {/* Main Row */}
              <div
                className="px-6 py-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : action.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Priority Rank */}
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${isDiscarded ? 'bg-gray-400' : getPriorityColor(action.priority)}`}>
                      {idx + 1}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{action.priority}</div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
                        {config.icon} {config.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getImpactBadge(action.impact)}`}>
                        {action.impact} impact
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEffortBadge(action.effort)}`}>
                        {action.effort} effort
                      </span>
                      {isDiscarded && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                          Dismissed
                        </span>
                      )}
                    </div>

                    <h4 className={`font-medium ${isDiscarded ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                      {action.title}
                    </h4>
                    <p className={`text-sm mt-0.5 ${isDiscarded ? 'text-gray-400 line-through' : 'text-gray-500 dark:text-gray-400'}`}>
                      {action.description}
                    </p>

                    {(action.keyword || action.category) && (
                      <div className="flex gap-2 mt-2">
                        {action.keyword && (
                          <span className={`text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded ${isDiscarded ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                            {action.keyword}
                          </span>
                        )}
                        {action.category && (
                          <span className={`text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded ${isDiscarded ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                            {action.category}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Uplift, Discard & Expand */}
                  <div className="flex-shrink-0 flex items-center gap-3">
                    {action.estimatedUplift > 0 && !isDiscarded && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          +{action.estimatedUplift.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">clicks</div>
                      </div>
                    )}
                    {/* Discard/Restore Button */}
                    <button
                      onClick={(e) => toggleDiscard(action.id, e)}
                      className={`p-1.5 rounded-full transition-colors ${
                        isDiscarded
                          ? 'text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                          : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                      }`}
                      title={isDiscarded ? 'Restore this action' : 'Dismiss this action'}
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

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-6 pb-4 pt-0 ml-12">
                  <div className={`p-4 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
                    <h5 className={`font-medium ${config.color} mb-2`}>Why This Matters</h5>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{action.reasoning}</p>

                    <div className="mt-4 flex gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Impact:</span>
                        <span className={`font-medium capitalize ${
                          action.impact === 'high' ? 'text-red-600' :
                          action.impact === 'medium' ? 'text-amber-600' : 'text-gray-600'
                        }`}>
                          {action.impact}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Effort:</span>
                        <span className={`font-medium capitalize ${
                          action.effort === 'low' ? 'text-green-600' :
                          action.effort === 'medium' ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {action.effort}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Priority Score:</span>
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">{action.priority}/100</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredActions.length} of {actions.length} actions
          </span>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            Priority = Impact (35%) + Effort (25%) + Strategic Fit (20%) + Time to Result (20%)
          </div>
        </div>
      </div>
    </div>
  );
};
