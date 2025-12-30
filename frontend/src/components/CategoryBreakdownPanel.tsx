import React, { useState, useEffect } from 'react';
import type { CategorySOV, BrandContext } from '../types';

interface CategoryBreakdownPanelProps {
  categories: CategorySOV[];
  brandContext?: BrandContext;
  isLoadingInsights?: boolean;
}

const getStatusConfig = (status: CategorySOV['status']) => {
  switch (status) {
    case 'leading':
      return {
        icon: '🏆',
        label: 'Leading',
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
        borderColor: 'border-emerald-200 dark:border-emerald-800'
      };
    case 'competitive':
      return {
        icon: '💪',
        label: 'Competitive',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800'
      };
    case 'trailing':
      return {
        icon: '⚠️',
        label: 'Trailing',
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800'
      };
    case 'weak':
      return {
        icon: '🔴',
        label: 'Needs Work',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800'
      };
  }
};

const getSOVBarWidth = (sov: number): string => {
  return `${Math.min(100, sov * 3)}%`;
};

const getSOVBarColor = (status: CategorySOV['status']): string => {
  switch (status) {
    case 'leading': return 'bg-emerald-500';
    case 'competitive': return 'bg-blue-500';
    case 'trailing': return 'bg-amber-500';
    case 'weak': return 'bg-red-500';
  }
};

export const CategoryBreakdownPanel: React.FC<CategoryBreakdownPanelProps> = ({
  categories,
  brandContext
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [filterStatus, setFilterStatus] = useState<'all' | CategorySOV['status']>('all');
  const [strategicInsight, setStrategicInsight] = useState<string>('');
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [insightGenerated, setInsightGenerated] = useState(false);

  // Generate strategic insight when component mounts or data changes
  useEffect(() => {
    const generateInsight = async () => {
      if (!brandContext || categories.length === 0 || insightGenerated) return;

      setIsGeneratingInsight(true);
      try {
        const response = await fetch('/api/generate-reasoning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            opportunities: [{
              id: 'category-insight',
              keyword: 'category-strategic-analysis',
              type: 'content-gap',
              priority: 100,
              searchVolume: categories.reduce((sum, c) => sum + c.totalCategoryVolume, 0),
              clickPotential: 0,
              effort: 'medium',
              category: 'Strategic Analysis'
            }],
            brandContext: {
              ...brandContext,
              // Add category-specific context
              categoryData: categories.map(c => ({
                name: c.category,
                status: c.status,
                sov: c.yourSOV,
                keywords: c.keywordCount,
                avgPosition: c.avgPosition,
                volume: c.totalCategoryVolume
              }))
            },
            customPrompt: `Analyze the category performance for ${brandContext.brandName}.
              Categories breakdown:
              ${categories.map(c => `- ${c.category}: ${c.yourSOV}% SOV, ${c.status} status, ${c.keywordCount} keywords, avg position #${c.avgPosition}`).join('\n')}

              Write 2-3 sentences of strategic insight about:
              1. Which categories show the strongest opportunity for growth
              2. Where ${brandContext.brandName} should prioritize efforts
              3. One specific actionable recommendation based on the category data`
          })
        });

        if (response.ok) {
          const data = await response.json();
          const insight = data.reasonings?.['category-strategic-analysis'] || data.reasonings?.['category-insight'] || '';
          if (insight) {
            setStrategicInsight(insight);
            setInsightGenerated(true);
          }
        }
      } catch (err) {
        console.error('Failed to generate category insight:', err);
      } finally {
        setIsGeneratingInsight(false);
      }
    };

    generateInsight();
  }, [brandContext, categories, insightGenerated]);

  const filteredCategories = categories.filter(
    cat => filterStatus === 'all' || cat.status === filterStatus
  );

  const statusCounts = {
    leading: categories.filter(c => c.status === 'leading').length,
    competitive: categories.filter(c => c.status === 'competitive').length,
    trailing: categories.filter(c => c.status === 'trailing').length,
    weak: categories.filter(c => c.status === 'weak').length
  };

  if (categories.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Categories Found</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Category data is not available for your keywords.
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
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Category SOV Breakdown
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your Share of Voice performance by category
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-sm ${
                viewMode === 'cards'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm ${
                viewMode === 'table'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Table
            </button>
          </div>
        </div>

        {/* AI Strategic Insight */}
        {(isGeneratingInsight || strategicInsight) && (
          <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {isGeneratingInsight ? (
                  <svg className="w-5 h-5 text-purple-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                  </svg>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-1">
                  {isGeneratingInsight ? 'Generating Strategic Insight...' : 'AI Strategic Insight'}
                </h4>
                {strategicInsight ? (
                  <p className="text-sm text-purple-700 dark:text-purple-300">{strategicInsight}</p>
                ) : (
                  <p className="text-sm text-purple-600 dark:text-purple-400 italic">Analyzing your category performance...</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Summary */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterStatus === 'all'
                ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
            }`}
          >
            All ({categories.length})
          </button>
          <button
            onClick={() => setFilterStatus('leading')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterStatus === 'leading'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
            }`}
          >
            🏆 Leading ({statusCounts.leading})
          </button>
          <button
            onClick={() => setFilterStatus('competitive')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterStatus === 'competitive'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200'
            }`}
          >
            💪 Competitive ({statusCounts.competitive})
          </button>
          <button
            onClick={() => setFilterStatus('trailing')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterStatus === 'trailing'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200'
            }`}
          >
            ⚠️ Trailing ({statusCounts.trailing})
          </button>
          <button
            onClick={() => setFilterStatus('weak')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterStatus === 'weak'
                ? 'bg-red-600 text-white'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200'
            }`}
          >
            🔴 Needs Work ({statusCounts.weak})
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'cards' ? (
        <div className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((cat, idx) => {
            const config = getStatusConfig(cat.status);
            return (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-lg mr-2">{config.icon}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{cat.category}</span>
                  </div>
                  <span className={`text-sm font-medium ${config.color}`}>
                    {config.label}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* SOV Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-300">Your SOV</span>
                      <span className="font-bold text-gray-900 dark:text-white">{cat.yourSOV}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getSOVBarColor(cat.status)} rounded-full transition-all`}
                        style={{ width: getSOVBarWidth(cat.yourSOV) }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Keywords</span>
                      <p className="font-medium text-gray-900 dark:text-white">{cat.keywordCount}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Avg Position</span>
                      <p className="font-medium text-gray-900 dark:text-white">#{cat.avgPosition}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500 dark:text-gray-400">Volume</span>
                      <p className="font-medium text-gray-900 dark:text-white">{cat.totalCategoryVolume.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Top Keywords */}
                  {cat.topKeywords.length > 0 && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Top Keywords:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {cat.topKeywords.slice(0, 3).map((kw, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-xs bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 truncate max-w-[120px]"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Your SOV
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Keywords
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Avg Pos
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Volume
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCategories.map((cat, idx) => {
                const config = getStatusConfig(cat.status);
                return (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900 dark:text-white">{cat.category}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                        {config.icon} {config.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getSOVBarColor(cat.status)}`}
                            style={{ width: getSOVBarWidth(cat.yourSOV) }}
                          />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{cat.yourSOV}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600 dark:text-gray-300">
                      {cat.keywordCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600 dark:text-gray-300">
                      #{cat.avgPosition}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600 dark:text-gray-300">
                      {cat.totalCategoryVolume.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
