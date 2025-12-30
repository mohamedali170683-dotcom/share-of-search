import React, { useState, useEffect } from 'react';
import type { CompetitorStrength, BrandContext } from '../types';

interface CompetitorStrengthPanelProps {
  competitors: CompetitorStrength[];
  yourBrand: string;
  brandContext?: BrandContext;
  isLoadingInsights?: boolean;
}

export const CompetitorStrengthPanel: React.FC<CompetitorStrengthPanelProps> = ({
  competitors,
  yourBrand,
  brandContext
}) => {
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(
    competitors[0]?.competitor || null
  );
  const [strategicInsight, setStrategicInsight] = useState<string>('');
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [insightGenerated, setInsightGenerated] = useState(false);

  const selected = competitors.find(c => c.competitor === selectedCompetitor);

  // Generate strategic insight when component mounts or data changes
  useEffect(() => {
    const generateInsight = async () => {
      if (!brandContext || competitors.length === 0 || insightGenerated) return;

      setIsGeneratingInsight(true);
      try {
        const competitorSummary = competitors.map(c => {
          const total = c.headToHead.youWin + c.headToHead.theyWin + c.headToHead.ties;
          const winRate = Math.round((c.headToHead.youWin / total) * 100);
          return `${c.competitor}: ${winRate}% win rate (${c.headToHead.youWin} wins, ${c.headToHead.theyWin} losses), ${c.estimatedSOV}% SOV, dominates in: ${c.dominantCategories.slice(0, 2).join(', ') || 'none'}`;
        }).join('\n');

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
            brandContext: {
              ...brandContext,
              competitorData: competitors.map(c => ({
                name: c.competitor,
                sov: c.estimatedSOV,
                headToHead: c.headToHead,
                dominantCategories: c.dominantCategories
              }))
            },
            customPrompt: `Analyze the competitive landscape for ${yourBrand || brandContext.brandName}.
              Competitor breakdown:
              ${competitorSummary}

              Write 2-3 sentences of strategic insight about:
              1. Which competitor poses the biggest threat and why
              2. Where ${yourBrand || brandContext.brandName} has competitive advantages to leverage
              3. One specific tactical recommendation to improve competitive position`
          })
        });

        if (response.ok) {
          const data = await response.json();
          const insight = data.reasonings?.['competitor-strategic-analysis'] || data.reasonings?.['competitor-insight'] || '';
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
  }, [brandContext, competitors, yourBrand, insightGenerated]);

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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Competitor Strength Analysis
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Head-to-head comparison with your main competitors
        </p>

        {/* AI Strategic Insight */}
        {(isGeneratingInsight || strategicInsight) && (
          <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {isGeneratingInsight ? (
                  <svg className="w-5 h-5 text-red-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                  </svg>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                  {isGeneratingInsight ? 'Generating Competitive Intelligence...' : 'AI Competitive Insight'}
                </h4>
                {strategicInsight ? (
                  <p className="text-sm text-red-700 dark:text-red-300">{strategicInsight}</p>
                ) : (
                  <p className="text-sm text-red-600 dark:text-red-400 italic">Analyzing your competitive landscape...</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Competitor Selector */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          {competitors.map((comp) => {
            const isSelected = selectedCompetitor === comp.competitor;
            const isWinning = comp.headToHead.youWin > comp.headToHead.theyWin;

            return (
              <button
                key={comp.competitor}
                onClick={() => setSelectedCompetitor(comp.competitor)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-red-500 text-white shadow-md'
                    : isWinning
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  {comp.competitor}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-red-600' : isWinning ? 'bg-green-200 dark:bg-green-800' : 'bg-red-200 dark:bg-red-800'
                  }`}>
                    {comp.estimatedSOV}%
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Competitor Detail */}
      {selected && (
        <div className="p-6">
          {/* Head-to-Head Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Your Brand */}
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-center">
              <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">{yourBrand || 'Your Brand'}</div>
              <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                {selected.headToHead.youWin}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">keywords won</div>
            </div>

            {/* VS */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">VS</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selected.headToHead.ties} ties
                </div>
              </div>
            </div>

            {/* Competitor */}
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-center">
              <div className="text-sm text-red-600 dark:text-red-400 mb-1">{selected.competitor}</div>
              <div className="text-3xl font-bold text-red-700 dark:text-red-300">
                {selected.headToHead.theyWin}
              </div>
              <div className="text-xs text-red-600 dark:text-red-400">keywords won</div>
            </div>
          </div>

          {/* Win Rate Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                You: {Math.round((selected.headToHead.youWin / (selected.headToHead.youWin + selected.headToHead.theyWin + selected.headToHead.ties)) * 100)}%
              </span>
              <span className="text-red-600 dark:text-red-400 font-medium">
                {selected.competitor}: {Math.round((selected.headToHead.theyWin / (selected.headToHead.youWin + selected.headToHead.theyWin + selected.headToHead.ties)) * 100)}%
              </span>
            </div>
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${(selected.headToHead.youWin / (selected.headToHead.youWin + selected.headToHead.theyWin + selected.headToHead.ties)) * 100}%` }}
              />
              <div
                className="h-full bg-gray-400 dark:bg-gray-500"
                style={{ width: `${(selected.headToHead.ties / (selected.headToHead.youWin + selected.headToHead.theyWin + selected.headToHead.ties)) * 100}%` }}
              />
              <div
                className="h-full bg-red-500"
                style={{ width: `${(selected.headToHead.theyWin / (selected.headToHead.youWin + selected.headToHead.theyWin + selected.headToHead.ties)) * 100}%` }}
              />
            </div>
          </div>

          {/* Categories They Dominate */}
          {selected.dominantCategories.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Categories Where {selected.competitor} is Strong
              </h4>
              <div className="flex flex-wrap gap-2">
                {selected.dominantCategories.map((cat, idx) => (
                  <span key={idx} className="px-3 py-1 bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full text-sm">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Keyword Battles */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Keywords You're Winning */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Keywords You're Winning
                </h4>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {selected.topWinningKeywords.map((battle, idx) => (
                  <div key={idx} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">{battle.keyword}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {battle.searchVolume.toLocaleString()} vol
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">#{battle.yourPosition}</span>
                        <span className="text-gray-400">vs</span>
                        <span className="text-red-600 dark:text-red-400">#{battle.competitorPosition}</span>
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">
                        +{battle.visibilityDifference.toLocaleString()} visible
                      </div>
                    </div>
                  </div>
                ))}
                {selected.topWinningKeywords.length === 0 && (
                  <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No winning keywords found
                  </div>
                )}
              </div>
            </div>

            {/* Keywords They're Winning */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-red-800 dark:text-red-300 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Keywords They're Winning
                </h4>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {selected.topLosingKeywords.map((battle, idx) => (
                  <div key={idx} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">{battle.keyword}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {battle.searchVolume.toLocaleString()} vol
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-red-600 dark:text-red-400 font-medium">#{battle.yourPosition}</span>
                        <span className="text-gray-400">vs</span>
                        <span className="text-emerald-600 dark:text-emerald-400">#{battle.competitorPosition}</span>
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400">
                        -{battle.visibilityDifference.toLocaleString()} visible
                      </div>
                    </div>
                  </div>
                ))}
                {selected.topLosingKeywords.length === 0 && (
                  <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No losing keywords found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Insight Box */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Insight
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {selected.headToHead.youWin > selected.headToHead.theyWin
                ? `You're outperforming ${selected.competitor} overall! Focus on defending your winning positions and attacking their weak spots in ${selected.dominantCategories[0] || 'key categories'}.`
                : `${selected.competitor} is currently outperforming you. Prioritize improving rankings for high-volume keywords where they rank in top 3 and you don't.`
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
