import React, { useState } from 'react';
import type { ContentGap } from '../types';

interface ContentGapsPanelProps {
  contentGaps: ContentGap[];
}

const getPriorityConfig = (priority: ContentGap['priority']) => {
  switch (priority) {
    case 'high':
      return {
        icon: '🔴',
        label: 'High Priority',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800'
      };
    case 'medium':
      return {
        icon: '🟡',
        label: 'Medium',
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800'
      };
    case 'low':
      return {
        icon: '🟢',
        label: 'Low Priority',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800'
      };
  }
};

const getCoverageGap = (yours: number, expected: number): number => {
  if (expected === 0) return 0;
  return Math.round(((expected - yours) / expected) * 100);
};

export const ContentGapsPanel: React.FC<ContentGapsPanelProps> = ({ contentGaps }) => {
  const [filterPriority, setFilterPriority] = useState<'all' | ContentGap['priority']>('all');
  const [expandedGap, setExpandedGap] = useState<string | null>(null);

  const filteredGaps = contentGaps.filter(
    gap => filterPriority === 'all' || gap.priority === filterPriority
  );

  const priorityCounts = {
    high: contentGaps.filter(g => g.priority === 'high').length,
    medium: contentGaps.filter(g => g.priority === 'medium').length,
    low: contentGaps.filter(g => g.priority === 'low').length
  };

  const handleExport = () => {
    const csv = [
      ['Topic', 'Category', 'Your Coverage', 'Expected Coverage', 'Coverage Gap %', 'Total Volume', 'Priority', 'Missing Keywords'].join(','),
      ...filteredGaps.map(gap => [
        `"${gap.topic}"`,
        `"${gap.category}"`,
        gap.yourCoverage,
        gap.avgCompetitorCoverage,
        getCoverageGap(gap.yourCoverage, gap.avgCompetitorCoverage),
        gap.totalVolume,
        gap.priority,
        `"${gap.topMissingKeywords.join(', ')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'content-gaps.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (contentGaps.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
        <svg className="w-16 h-16 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Content Gaps Found</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Your content coverage appears adequate across all categories.
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
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Content Gaps
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Topics where you need more content to compete effectively
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
      <div className="px-6 py-4 bg-orange-50 dark:bg-orange-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {contentGaps.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gaps Identified</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {contentGaps.reduce((sum, g) => sum + g.totalVolume, 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Volume at Risk</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {priorityCounts.high}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">High Priority</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterPriority('all')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterPriority === 'all'
                ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
            }`}
          >
            All ({contentGaps.length})
          </button>
          <button
            onClick={() => setFilterPriority('high')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterPriority === 'high'
                ? 'bg-red-600 text-white'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200'
            }`}
          >
            🔴 High ({priorityCounts.high})
          </button>
          <button
            onClick={() => setFilterPriority('medium')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterPriority === 'medium'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200'
            }`}
          >
            🟡 Medium ({priorityCounts.medium})
          </button>
          <button
            onClick={() => setFilterPriority('low')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterPriority === 'low'
                ? 'bg-green-600 text-white'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200'
            }`}
          >
            🟢 Low ({priorityCounts.low})
          </button>
        </div>
      </div>

      {/* Gaps List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {filteredGaps.map((gap, idx) => {
          const config = getPriorityConfig(gap.priority);
          const coverageGap = getCoverageGap(gap.yourCoverage, gap.avgCompetitorCoverage);
          const isExpanded = expandedGap === gap.topic;

          return (
            <div key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <button
                onClick={() => setExpandedGap(isExpanded ? null : gap.topic)}
                className="w-full p-4 text-left"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Priority Badge */}
                  <div className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color} ${config.borderColor} border`}>
                    {config.icon} {config.label}
                  </div>

                  {/* Topic */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {gap.topic}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {gap.category}
                    </p>
                  </div>

                  {/* Coverage Comparison */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Your Coverage</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {gap.yourCoverage} pages
                      </p>
                    </div>
                    <div className="text-gray-400">vs</div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Expected</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {gap.avgCompetitorCoverage} pages
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Gap</p>
                      <p className={`font-bold ${config.color}`}>
                        -{coverageGap}%
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

                {/* Coverage Bar */}
                <div className="mt-3">
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (gap.yourCoverage / gap.avgCompetitorCoverage) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  {/* Summary Stats */}
                  <div className={`p-4 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Search Volume</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {gap.totalVolume.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Pages Needed</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          +{gap.avgCompetitorCoverage - gap.yourCoverage}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Est. Traffic Gain</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                          +{(gap.estimatedTrafficGain || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reasoning */}
                  {gap.reasoning && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <h5 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Why This Is a Gap
                      </h5>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {gap.reasoning}
                      </p>
                    </div>
                  )}

                  {/* Weak Keywords with URLs */}
                  {gap.weakKeywords && gap.weakKeywords.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Keywords Needing Improvement
                      </h5>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Keyword</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Position</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Volume</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Current URL</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {gap.weakKeywords.map((wk, wkIdx) => (
                              <tr key={wkIdx} className="bg-white dark:bg-gray-800">
                                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white font-medium">{wk.keyword}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full">
                                    #{wk.position}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 text-center">{wk.volume.toLocaleString()}</td>
                                <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={wk.url}>
                                  {wk.url || <span className="italic">No URL</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Existing URLs */}
                  {gap.existingUrls && gap.existingUrls.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Your Existing Pages in This Category
                      </h5>
                      <div className="space-y-1">
                        {gap.existingUrls.map((url, urlIdx) => (
                          <div key={urlIdx} className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded truncate">
                            {url}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Content Types */}
                  {gap.suggestedContentTypes && gap.suggestedContentTypes.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Recommended Content to Create
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {gap.suggestedContentTypes.map((contentType, ctIdx) => (
                          <span
                            key={ctIdx}
                            className="px-3 py-1 text-sm bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800"
                          >
                            {contentType}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Keywords to Target */}
                  {gap.topMissingKeywords.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Target Keywords:
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {gap.topMissingKeywords.map((kw, kwIdx) => (
                          <span
                            key={kwIdx}
                            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
