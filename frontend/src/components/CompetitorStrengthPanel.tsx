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

  // Get your SOS from the remaining percentage
  const competitorTotalSOV = competitors.reduce((sum, c) => sum + c.estimatedSOV, 0);
  const yourSOV = Math.max(0, 100 - competitorTotalSOV);

  // Get your performance metrics from first competitor (they all have the same data since it's YOUR data)
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

Your brand has ${yourSOV.toFixed(1)}% Share of Search.

Competitor Share of Search (based on brand keyword search volumes):
${competitorSummary}

Write 2-3 sentences of strategic insight about:
1. Who is your biggest competitor by brand awareness
2. What this means for your market position
3. One specific actionable recommendation to improve brand visibility`
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
  }, [brandContext, competitors, yourBrand, yourSOV, insightGenerated]);

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

  // Prepare data for SOS chart - sorted by SOS percentage
  const allBrands = [
    { name: yourBrand || 'Your Brand', sov: yourSOV, volume: 0, isYou: true },
    ...competitors.map(c => ({ name: c.competitor, sov: c.estimatedSOV, volume: c.brandSearchVolume, isYou: false }))
  ].sort((a, b) => b.sov - a.sov);

  const maxSOV = Math.max(...allBrands.map(b => b.sov), 1);

  return (
    <div className="space-y-6">
      {/* Header Card with AI Insight */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Share of Search - Brand Awareness
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            How often people search for each brand (based on branded keyword volume)
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
                  {isGeneratingInsight ? 'Analyzing Brand Landscape...' : 'AI Strategic Insight'}
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
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Brand Search Volume Distribution</h4>
          <div className="space-y-3">
            {allBrands.map((brand, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-32 flex-shrink-0">
                  <span className={`text-sm font-medium truncate block ${brand.isYou ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {brand.name}
                    {brand.isYou && <span className="text-xs ml-1">(You)</span>}
                  </span>
                </div>
                <div className="flex-1 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden relative">
                  <div
                    className={`h-full rounded-lg transition-all duration-500 ${
                      brand.isYou
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        : 'bg-gradient-to-r from-indigo-400 to-indigo-300 dark:from-indigo-500 dark:to-indigo-400'
                    }`}
                    style={{ width: `${Math.max(5, (brand.sov / maxSOV) * 100)}%` }}
                  />
                  <div className="absolute inset-y-0 left-3 flex items-center">
                    <span className="text-sm font-bold text-white drop-shadow-sm">
                      {brand.sov.toFixed(1)}%
                    </span>
                  </div>
                  {!brand.isYou && brand.volume > 0 && (
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <span className="text-xs text-gray-600 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 px-2 py-0.5 rounded">
                        {brand.volume.toLocaleString()} searches/mo
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Competitor Details Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Competitor Brand Search Volumes</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monthly branded search volume for each competitor
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Competitor
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Brand Search Volume
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Share of Search
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Relative Size
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {competitors.map((comp, idx) => {
                const relativeToYou = yourSOV > 0 ? (comp.estimatedSOV / yourSOV) : 0;
                return (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900 dark:text-white">{comp.competitor}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-gray-900 dark:text-white font-medium">
                        {comp.brandSearchVolume.toLocaleString()}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">/mo</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`font-bold ${
                        comp.estimatedSOV > yourSOV ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                      }`}>
                        {comp.estimatedSOV.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        relativeToYou > 1.5 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                        relativeToYou > 1 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                        relativeToYou > 0.5 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                      }`}>
                        {relativeToYou > 1 ? `${relativeToYou.toFixed(1)}x larger` :
                         relativeToYou > 0 ? `${(1/relativeToYou).toFixed(1)}x smaller` : 'N/A'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Your SEO Performance Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your SEO Performance</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Your keyword rankings across {totalKeywords} tracked keywords
          </p>
        </div>

        <div className="px-6 py-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{yourMetrics.strongKeywords}</div>
              <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Top 3 Positions</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">High visibility</div>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{yourMetrics.moderateKeywords}</div>
              <div className="text-sm text-amber-700 dark:text-amber-300 font-medium">Positions 4-10</div>
              <div className="text-xs text-amber-600 dark:text-amber-400">Page 1</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{yourMetrics.weakKeywords}</div>
              <div className="text-sm text-red-700 dark:text-red-300 font-medium">Position 11+</div>
              <div className="text-xs text-red-600 dark:text-red-400">Need improvement</div>
            </div>
          </div>

          {/* Position Distribution Bar */}
          {totalKeywords > 0 && (
            <>
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
                <span>Strong (1-3)</span>
                <span>Moderate (4-10)</span>
                <span>Weak (11+)</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Data Explanation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h5 className="text-sm font-medium text-blue-800 dark:text-blue-300">What is Share of Search?</h5>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              Share of Search measures brand awareness by comparing how often people search for each brand name.
              This is calculated from actual Google search volume data for branded keywords (e.g., "Continental tires", "Michelin reviews").
              A higher Share of Search indicates stronger brand recognition in the market.
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-2">
              <strong>Note:</strong> To see competitor keyword rankings, run a separate analysis on their domain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
