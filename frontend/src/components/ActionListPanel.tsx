import React, { useState } from 'react';
import type { ActionItem } from '../types';

interface ActionListPanelProps {
  actions: ActionItem[];
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

export const ActionListPanel: React.FC<ActionListPanelProps> = ({ actions }) => {
  const [filterType, setFilterType] = useState<'all' | ActionItem['actionType']>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredActions = actions.filter(
    action => filterType === 'all' || action.actionType === filterType
  );

  const typeCounts = {
    optimize: actions.filter(a => a.actionType === 'optimize').length,
    create: actions.filter(a => a.actionType === 'create').length,
    monitor: actions.filter(a => a.actionType === 'monitor').length,
    investigate: actions.filter(a => a.actionType === 'investigate').length
  };

  const totalEstimatedUplift = actions.reduce((sum, a) => sum + a.estimatedUplift, 0);

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

          {/* Total Uplift */}
          <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-center">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              +{totalEstimatedUplift.toLocaleString()}
            </div>
            <div className="text-xs text-indigo-700 dark:text-indigo-300">total estimated clicks</div>
          </div>
        </div>
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

          return (
            <div key={action.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              {/* Main Row */}
              <div
                className="px-6 py-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : action.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Priority Rank */}
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${getPriorityColor(action.priority)}`}>
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
                    </div>

                    <h4 className="font-medium text-gray-900 dark:text-white">{action.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{action.description}</p>

                    {(action.keyword || action.category) && (
                      <div className="flex gap-2 mt-2">
                        {action.keyword && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                            🔑 {action.keyword}
                          </span>
                        )}
                        {action.category && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                            📁 {action.category}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Uplift & Expand */}
                  <div className="flex-shrink-0 flex items-center gap-3">
                    {action.estimatedUplift > 0 && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          +{action.estimatedUplift.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">clicks</div>
                      </div>
                    )}
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
