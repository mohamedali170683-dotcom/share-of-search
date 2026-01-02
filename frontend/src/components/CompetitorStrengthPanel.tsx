import React, { useState, useEffect } from 'react';
import type { CompetitorStrength, BrandContext } from '../types';

interface CompetitorStrengthPanelProps {
  competitors: CompetitorStrength[];
  yourBrand: string;
  brandContext?: BrandContext;
}

export const CompetitorStrengthPanel: React.FC<CompetitorStrengthPanelProps> = ({
  competitors,
  yourBrand,
  brandContext
}) => {
  const [strategicInsight, setStrategicInsight] = useState<string>('');
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [insightGenerated, setInsightGenerated] = useState(false);

  // Calculate your brand's SOV
  const yourSOV = brandContext
    ? 100 - competitors.reduce((sum, c) => sum + c.estimatedSOV, 0)
    : 0;

  // Get your performance metrics from first competitor (they all have the same data)
  const yourMetrics = competitors[0]?.yourMetrics || { strongKeywords: 0, moderateKeywords: 0, weakKeywords: 0 };
  const totalKeywords = yourMetrics.strongKeywords + yourMetrics.moderateKeywords + yourMetrics.weakKeywords;

  // Generate strategic insight
  useEffect(() => {
    const generateInsight = async () => {
      if (!brandContext || competitors.length === 0 || insightGenerated) return;

      setIsGeneratingInsight(true);
      try {
        const competitorSummary = competitors.map(c =>
          `${c.competitor}: ${c.estimatedSOV}% share of search, ${c.brandSearchVolume.toLocaleString()} brand search volume`
        ).join('\n');

        const response = await fetch('/api/generate-reasoning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            opportunities: [{
              id: 'competitor-insight',
              keyword: 'competitor-strategic-analysis',
              type: 'content-gap',
              priority: 100,
              searchVolume: 0,
              clickPotential: 0,
              effort: 'medium',
              category: 'Strategic Analysis'
            }],
            brandContext,
            customPrompt: `Analyze the competitive landscape for ${yourBrand || brandContext.brandName}.

Your brand has ${yourSOV.toFixed(1)}% Share of Search with:
- ${yourMetrics.strongKeywords} keywords in top 3 (strong positions)
- ${yourMetrics.moderateKeywords} keywords ranked 4-10 (moderate positions)
- ${yourMetrics.weakKeywords} keywords ranked 11+ (need improvement)

Competitor Share of Search:
${competitorSummary}

Vulnerable categories where you're weak: ${competitors[0]?.vulnerableCategories?.join(', ') || 'None identified'}

Write 2-3 sentences of strategic insight about:
1. Your competitive position and biggest threat
2. Key opportunities to improve market share
3. One specific actionable recommendation`
          })
        });

        if (response.ok) {
          const data = await response.json();
          const insight = data.reasonings?.['competitor-strategic-analysis'] || '';
          if (insight) {
            setStrategicInsight(insight);
            setInsightGenerated(true);
          }
        }
      } catch (err) {
        console.error('Failed to generate competitor insight:', err);
      } finally {
        setIsGeneratingInsight(false);
      }
    };

    generateInsight();
  }, [brandContext, competitors, yourBrand, yourSOV, yourMetrics, insightGenerated]);

  if (competitors.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Competitor Data</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Competitor analysis is not available.
        </p>
      </div>
    );
  }

  // Prepare data for SOV chart
  const allBrands = [
    { name: yourBrand || 'Your Brand', sov: yourSOV, isYou: true },
    ...competitors.map(c => ({ name: c.competitor, sov: c.estimatedSOV, isYou: false }))
  ].sort((a, b) => b.sov - a.sov);

  const maxSOV = Math.max(...allBrands.map(b => b.sov));

  return (
    <div className="space-y-6">
      {/* Header Card with AI Insight */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Competitive Landscape
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Share of Search comparison based on brand keyword volume
          </p>
        </div>

        {/* AI Strategic Insight */}
        {(isGeneratingInsight || strategicInsight) && (
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-b border-indigo-200 dark:border-indigo-800">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {isGeneratingInsight ? (
                  <svg className="w-5 h-5 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-1">
                  {isGeneratingInsight ? 'Analyzing Competitive Position...' : 'AI Competitive Intelligence'}
                </h4>
                {strategicInsight ? (
                  <p className="text-sm text-indigo-700 dark:text-indigo-300">{strategicInsight}</p>
                ) : (
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 italic">Generating strategic insights...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Share of Search Bar Chart */}
        <div className="px-6 py-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Share of Search Distribution</h4>
          <div className="space-y-3">
            {allBrands.map((brand, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-28 flex-shrink-0">
                  <span className={`text-sm font-medium truncate block ${brand.isYou ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {brand.name}
                    {brand.isYou && <span className="text-xs ml-1">(You)</span>}
                  </span>
                </div>
                <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden relative">
                  <div
                    className={`h-full rounded-lg transition-all duration-500 ${
                      brand.isYou
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        : 'bg-gradient-to-r from-gray-400 to-gray-300 dark:from-gray-500 dark:to-gray-400'
                    }`}
                    style={{ width: `${(brand.sov / maxSOV) * 100}%` }}
                  />
                  <span className={`absolute inset-y-0 flex items-center text-sm font-bold ${
                    (brand.sov / maxSOV) * 100 > 30 ? 'left-3 text-white' : 'right-3 text-gray-700 dark:text-gray-300'
                  }`}>
                    {brand.sov.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Your Position Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Keyword Performance</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Based on {totalKeywords} tracked keywords
          </p>
        </div>

        {/* Position Distribution Chart */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{yourMetrics.strongKeywords}</div>
              <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Top 3</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">Strong positions</div>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{yourMetrics.moderateKeywords}</div>
              <div className="text-sm text-amber-700 dark:text-amber-300 font-medium">Position 4-10</div>
              <div className="text-xs text-amber-600 dark:text-amber-400">Page 1 visibility</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{yourMetrics.weakKeywords}</div>
              <div className="text-sm text-red-700 dark:text-red-300 font-medium">Position 11+</div>
              <div className="text-xs text-red-600 dark:text-red-400">Need improvement</div>
            </div>
          </div>

          {/* Position Distribution Bar */}
          <div className="h-6 rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-700">
            {yourMetrics.strongKeywords > 0 && (
              <div
                className="h-full bg-emerald-500 flex items-center justify-center text-xs text-white font-medium"
                style={{ width: `${(yourMetrics.strongKeywords / totalKeywords) * 100}%` }}
              >
                {Math.round((yourMetrics.strongKeywords / totalKeywords) * 100)}%
              </div>
            )}
            {yourMetrics.moderateKeywords > 0 && (
              <div
                className="h-full bg-amber-500 flex items-center justify-center text-xs text-white font-medium"
                style={{ width: `${(yourMetrics.moderateKeywords / totalKeywords) * 100}%` }}
              >
                {Math.round((yourMetrics.moderateKeywords / totalKeywords) * 100)}%
              </div>
            )}
            {yourMetrics.weakKeywords > 0 && (
              <div
                className="h-full bg-red-500 flex items-center justify-center text-xs text-white font-medium"
                style={{ width: `${(yourMetrics.weakKeywords / totalKeywords) * 100}%` }}
              >
                {Math.round((yourMetrics.weakKeywords / totalKeywords) * 100)}%
              </div>
            )}
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>Strong (Top 3)</span>
            <span>Moderate (4-10)</span>
            <span>Weak (11+)</span>
          </div>
        </div>
      </div>

      {/* Keyword Details */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Your Strongest Keywords */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800">
            <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Your Strongest Keywords
            </h4>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Top performing keywords with high visibility</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {competitors[0]?.topStrongKeywords?.map((kw, idx) => (
              <div key={idx} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{kw.keyword}</div>
                    {kw.url && (
                      <a
                        href={kw.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block mt-1"
                      >
                        {kw.url.replace(/^https?:\/\//, '').substring(0, 50)}...
                      </a>
                    )}
                    {kw.category && (
                      <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        {kw.category}
                      </span>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded text-emerald-700 dark:text-emerald-300">
                      <span className="text-sm font-bold">#{kw.yourPosition}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {kw.searchVolume.toLocaleString()} vol
                    </div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">
                      {kw.visibleVolume.toLocaleString()} visible
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(!competitors[0]?.topStrongKeywords || competitors[0].topStrongKeywords.length === 0) && (
              <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                No keywords in top 3 positions yet
              </div>
            )}
          </div>
        </div>

        {/* Keywords to Improve */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <h4 className="font-semibold text-red-800 dark:text-red-300 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
              </svg>
              Keywords to Improve
            </h4>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">High-volume keywords with weak rankings</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {competitors[0]?.keywordsToImprove?.map((kw, idx) => (
              <div key={idx} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{kw.keyword}</div>
                    {kw.url && (
                      <a
                        href={kw.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block mt-1"
                      >
                        {kw.url.replace(/^https?:\/\//, '').substring(0, 50)}...
                      </a>
                    )}
                    {kw.category && (
                      <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        {kw.category}
                      </span>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded text-red-700 dark:text-red-300">
                      <span className="text-sm font-bold">#{kw.yourPosition}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {kw.searchVolume.toLocaleString()} vol
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-400">
                      {kw.visibleVolume.toLocaleString()} visible
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(!competitors[0]?.keywordsToImprove || competitors[0].keywordsToImprove.length === 0) && (
              <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                No keywords to improve identified
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vulnerable Categories */}
      {competitors[0]?.vulnerableCategories && competitors[0].vulnerableCategories.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
            <h4 className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Vulnerable Categories
            </h4>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Categories where your visibility is weak - potential competitive threats
            </p>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-3">
              {competitors[0].vulnerableCategories.map((cat, idx) => (
                <span
                  key={idx}
                  className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-lg text-sm font-medium"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Data Transparency Note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h5 className="text-sm font-medium text-blue-800 dark:text-blue-300">About This Data</h5>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              Share of Search is calculated from brand keyword search volumes. Keyword positions and URLs shown are your actual rankings.
              To see competitor ranking data, you would need to run separate analyses for each competitor domain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
