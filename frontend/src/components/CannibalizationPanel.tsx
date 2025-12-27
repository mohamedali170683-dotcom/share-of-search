import React, { useState } from 'react';
import type { CannibalizationIssue } from '../types';

interface CannibalizationPanelProps {
  issues: CannibalizationIssue[];
}

const getRecommendationConfig = (recommendation: CannibalizationIssue['recommendation']) => {
  switch (recommendation) {
    case 'consolidate':
      return {
        icon: '🔄',
        label: 'Consolidate',
        description: 'Merge content into a single authoritative page',
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-800'
      };
    case 'redirect':
      return {
        icon: '➡️',
        label: 'Redirect',
        description: '301 redirect weaker pages to the strongest',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800'
      };
    case 'differentiate':
      return {
        icon: '🎯',
        label: 'Differentiate',
        description: 'Update pages to target different intents',
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800'
      };
  }
};

const getImpactColor = (impact: number): string => {
  if (impact >= 500) return 'text-red-600 dark:text-red-400';
  if (impact >= 200) return 'text-amber-600 dark:text-amber-400';
  return 'text-gray-600 dark:text-gray-400';
};

export const CannibalizationPanel: React.FC<CannibalizationPanelProps> = ({ issues }) => {
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [filterRecommendation, setFilterRecommendation] = useState<'all' | CannibalizationIssue['recommendation']>('all');

  const filteredIssues = issues.filter(
    issue => filterRecommendation === 'all' || issue.recommendation === filterRecommendation
  );

  const recommendationCounts = {
    consolidate: issues.filter(i => i.recommendation === 'consolidate').length,
    redirect: issues.filter(i => i.recommendation === 'redirect').length,
    differentiate: issues.filter(i => i.recommendation === 'differentiate').length
  };

  const totalImpact = issues.reduce((sum, i) => sum + i.impactScore, 0);

  const handleExport = () => {
    const csv = [
      ['Keyword', 'Search Volume', 'Competing URLs', 'Best Position', 'Impact Score', 'Recommendation'].join(','),
      ...filteredIssues.map(issue => [
        `"${issue.keyword}"`,
        issue.searchVolume,
        issue.competingUrls.length,
        Math.min(...issue.competingUrls.map(u => u.position)),
        issue.impactScore,
        issue.recommendation
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cannibalization-issues.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (issues.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
        <svg className="w-16 h-16 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Cannibalization Issues</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Great! No keyword cannibalization detected in your rankings.
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
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Cannibalization Issues
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Pages competing against each other for the same keywords
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

      {/* Summary */}
      <div className="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {issues.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Issues Found</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              ~{totalImpact.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Clicks Lost</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {issues.reduce((sum, i) => sum + i.competingUrls.length, 0)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">URLs Affected</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterRecommendation('all')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterRecommendation === 'all'
                ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
            }`}
          >
            All ({issues.length})
          </button>
          <button
            onClick={() => setFilterRecommendation('consolidate')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterRecommendation === 'consolidate'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200'
            }`}
          >
            🔄 Consolidate ({recommendationCounts.consolidate})
          </button>
          <button
            onClick={() => setFilterRecommendation('redirect')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterRecommendation === 'redirect'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200'
            }`}
          >
            ➡️ Redirect ({recommendationCounts.redirect})
          </button>
          <button
            onClick={() => setFilterRecommendation('differentiate')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterRecommendation === 'differentiate'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200'
            }`}
          >
            🎯 Differentiate ({recommendationCounts.differentiate})
          </button>
        </div>
      </div>

      {/* Issues List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {filteredIssues.map((issue, idx) => {
          const config = getRecommendationConfig(issue.recommendation);
          const isExpanded = expandedIssue === issue.keyword;

          return (
            <div key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <button
                onClick={() => setExpandedIssue(isExpanded ? null : issue.keyword)}
                className="w-full p-4 text-left"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Recommendation Badge */}
                  <div className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color} ${config.borderColor} border`}>
                    {config.icon} {config.label}
                  </div>

                  {/* Keyword */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {issue.keyword}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {issue.competingUrls.length} competing URLs
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <span className="text-gray-500 dark:text-gray-400">Volume</span>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {issue.searchVolume.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500 dark:text-gray-400">Impact</span>
                      <p className={`font-semibold ${getImpactColor(issue.impactScore)}`}>
                        -{issue.impactScore.toLocaleString()}
                      </p>
                    </div>
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
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  <div className={`p-4 rounded-lg ${config.bgColor} ${config.borderColor} border mb-4`}>
                    <p className={`text-sm font-medium ${config.color}`}>
                      Recommendation: {config.description}
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            URL
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Position
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Visible Volume
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {issue.competingUrls.map((url, urlIdx) => (
                          <tr key={urlIdx}>
                            <td className="px-4 py-2 text-gray-900 dark:text-white truncate max-w-[300px]">
                              <a
                                href={url.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                              >
                                {url.url}
                              </a>
                            </td>
                            <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">
                              #{url.position}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">
                              {url.visibleVolume.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
