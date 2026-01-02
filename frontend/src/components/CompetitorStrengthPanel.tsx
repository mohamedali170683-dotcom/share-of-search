import React, { useState, useEffect } from 'react';
import type { CompetitorStrength, BrandContext } from '../types';
import { getCompetitorAnalysis, type CompetitorKeywordAnalysis } from '../services/api';

interface CompetitorStrengthPanelProps {
  competitors: CompetitorStrength[];
  yourBrand: string;
  brandContext?: BrandContext;
  domain?: string;
  locationCode?: number;
  languageCode?: string;
}

export const CompetitorStrengthPanel: React.FC<CompetitorStrengthPanelProps> = ({
  competitors,
  yourBrand,
  brandContext,
  domain,
  locationCode,
  languageCode
}) => {
  const [strategicInsight, setStrategicInsight] = useState<string>('');
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [insightGenerated, setInsightGenerated] = useState(false);

  // Deep competitor analysis state
  const [competitorAnalysis, setCompetitorAnalysis] = useState<CompetitorKeywordAnalysis[]>([]);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null);

  // Get your SOS from the remaining percentage
  const competitorTotalSOV = competitors.reduce((sum, c) => sum + c.estimatedSOV, 0);
  const yourSOV = Math.max(0, 100 - competitorTotalSOV);

  // Fetch deep competitor analysis
  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!domain || !locationCode || !languageCode || competitors.length === 0) return;

      setIsLoadingAnalysis(true);
      setAnalysisError(null);

      try {
        const topCompetitors = competitors.slice(0, 3).map(c => c.competitor);
        const result = await getCompetitorAnalysis(domain, locationCode, languageCode, topCompetitors);
        setCompetitorAnalysis(result.competitors);
        if (result.competitors.length > 0) {
          setSelectedCompetitor(result.competitors[0].competitor);
        }
      } catch (err) {
        console.error('Failed to fetch competitor analysis:', err);
        setAnalysisError(err instanceof Error ? err.message : 'Failed to analyze competitors');
      } finally {
        setIsLoadingAnalysis(false);
      }
    };

    fetchAnalysis();
  }, [domain, locationCode, languageCode, competitors]);

  // Get all competitor brand names for filtering
  const competitorBrandNames = competitors.map(c => c.competitor.toLowerCase());
  const yourBrandName = (yourBrand || brandContext?.brandName || '').toLowerCase();

  // Generate strategic insight - wait for competitor analysis to complete
  useEffect(() => {
    const generateInsight = async () => {
      // Only generate insight once competitor analysis is loaded
      if (!brandContext || competitors.length === 0 || insightGenerated || isLoadingAnalysis) return;

      setIsGeneratingInsight(true);
      try {
        // Determine the actual leader by SOS%
        const leader = yourSOV > Math.max(...competitors.map(c => c.estimatedSOV))
          ? { name: yourBrand || brandContext.brandName, sov: yourSOV, isYou: true }
          : { name: competitors.reduce((max, c) => c.estimatedSOV > max.estimatedSOV ? c : max).competitor,
              sov: Math.max(...competitors.map(c => c.estimatedSOV)), isYou: false };

        const competitorSummary = competitors.map(c =>
          `${c.competitor}: ${c.estimatedSOV.toFixed(1)}% share of search, ${c.brandSearchVolume.toLocaleString()} brand search volume`
        ).join('\n');

        // Include detailed threat/gap analysis - FILTER OUT brand keywords
        let analysisDetails = '';
        let filteredThreats: Array<{ keyword: string; searchVolume: number; yourPosition: number | null; competitorPosition: number; competitor: string; opportunityScore: number }> = [];
        let filteredGaps: Array<{ keyword: string; searchVolume: number; yourPosition: number | null; competitorPosition: number; competitor: string; opportunityScore: number }> = [];

        if (competitorAnalysis.length > 0) {
          // Filter function to exclude brand keywords
          const isNotBrandKeyword = (keyword: string) => {
            const kw = keyword.toLowerCase();
            // Exclude if contains any competitor brand name or your brand name
            return !competitorBrandNames.some(brand => kw.includes(brand)) &&
                   !kw.includes(yourBrandName);
          };

          // Top threats by opportunity score - exclude brand keywords
          filteredThreats = competitorAnalysis
            .flatMap(c => c.threats.map(t => ({ ...t, competitor: c.competitor })))
            .filter(t => isNotBrandKeyword(t.keyword))
            .sort((a, b) => b.opportunityScore - a.opportunityScore)
            .slice(0, 5);

          // Top content gaps - exclude brand keywords
          filteredGaps = competitorAnalysis
            .flatMap(c => c.gaps.map(g => ({ ...g, competitor: c.competitor })))
            .filter(g => isNotBrandKeyword(g.keyword))
            .sort((a, b) => b.opportunityScore - a.opportunityScore)
            .slice(0, 5);

          // Summary counts
          const totalWins = competitorAnalysis.reduce((sum, c) => sum + c.summary.winsCount, 0);
          const totalThreats = competitorAnalysis.reduce((sum, c) => sum + c.summary.threatsCount, 0);
          const totalGaps = competitorAnalysis.reduce((sum, c) => sum + c.summary.gapsCount, 0);

          analysisDetails = `

COMPETITIVE KEYWORD ANALYSIS (excluding brand keywords):
- You are winning on ${totalWins} keywords against competitors
- Competitors beat you on ${totalThreats} keywords (threats)
- There are ${totalGaps} content gap opportunities

Top Generic Keyword Threats (where competitors outrank you):
${filteredThreats.length > 0 ? filteredThreats.map(t => `- "${t.keyword}" (${t.searchVolume.toLocaleString()} searches/mo): You #${t.yourPosition || 'not ranking'} vs ${t.competitor} #${t.competitorPosition}`).join('\n') : '- No significant generic keyword threats found'}

Top Content Gap Opportunities (generic keywords to target):
${filteredGaps.length > 0 ? filteredGaps.map(g => `- "${g.keyword}" (${g.searchVolume.toLocaleString()} searches/mo): ${g.competitor} #${g.competitorPosition}, You: ${g.yourPosition ? `#${g.yourPosition}` : 'Not in top 100'}`).join('\n') : '- No significant content gaps found'}`;
        }

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
            customPrompt: `You are an SEO strategist. Analyze the competitive landscape for ${yourBrand || brandContext.brandName}.

IMPORTANT: Share of Search (SOS%) measures brand awareness - the higher the percentage, the more dominant the brand.

BRAND AWARENESS (Share of Search - who leads):
- ${yourBrand || brandContext.brandName} (YOUR BRAND): ${yourSOV.toFixed(1)}% SOS
${competitorSummary}

THE LEADER: ${leader.name} leads with ${leader.sov.toFixed(1)}% Share of Search${leader.isYou ? ' - this is YOUR brand!' : ''}.
${analysisDetails}

IMPORTANT RULES:
1. NEVER recommend targeting competitor brand keywords (like "michelin tires" or "goodyear tires") - those belong to competitors
2. Only recommend GENERIC keywords (like "winter tires", "all season tires", "tire reviews")
3. Focus on the threats and gaps data provided - these are real opportunities

Write 2-3 sentences about:
1. State who leads in brand awareness (by SOS%) - if it's the user's brand, congratulate them
2. Identify the #1 priority generic keyword to improve (from the threats or gaps list)
3. Give ONE specific, actionable recommendation for that keyword`
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
  }, [brandContext, competitors, yourBrand, yourSOV, insightGenerated, competitorAnalysis, isLoadingAnalysis, competitorBrandNames, yourBrandName]);

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

  const selectedAnalysis = competitorAnalysis.find(c => c.competitor === selectedCompetitor);

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

      {/* Deep Competitor Analysis Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Competitive Keyword Analysis
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Keywords where competitors rank better than you (real ranking data)
          </p>
        </div>

        {isLoadingAnalysis ? (
          <div className="px-6 py-12 text-center">
            <svg className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400">Analyzing competitor rankings...</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">This may take a minute</p>
          </div>
        ) : analysisError ? (
          <div className="px-6 py-8 text-center">
            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400">{analysisError}</p>
          </div>
        ) : competitorAnalysis.length > 0 ? (
          <>
            {/* Competitor Tabs */}
            <div className="px-6 pt-4 flex gap-2 flex-wrap">
              {competitorAnalysis.map((comp) => (
                <button
                  key={comp.competitor}
                  onClick={() => setSelectedCompetitor(comp.competitor)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCompetitor === comp.competitor
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                  }`}
                >
                  {comp.competitor}
                  <span className="ml-2 text-xs opacity-75">
                    {comp.summary.threatsCount} threats
                  </span>
                </button>
              ))}
            </div>

            {selectedAnalysis && (
              <div className="p-6 space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{selectedAnalysis.summary.threatsCount}</div>
                    <div className="text-xs text-red-700 dark:text-red-300">Threats</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{selectedAnalysis.summary.gapsCount}</div>
                    <div className="text-xs text-amber-700 dark:text-amber-300">Content Gaps</div>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{selectedAnalysis.summary.winsCount}</div>
                    <div className="text-xs text-emerald-700 dark:text-emerald-300">Your Wins</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedAnalysis.summary.totalOverlap}</div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">Keyword Overlap</div>
                  </div>
                </div>

                {/* Threats - Keywords where competitor ranks better */}
                {selectedAnalysis.threats.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Competitive Threats - Keywords to Improve
                    </h4>
                    <div className="bg-red-50 dark:bg-red-900/10 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-red-100 dark:bg-red-900/30">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-red-800 dark:text-red-300">Keyword</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-red-800 dark:text-red-300">Volume</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-red-800 dark:text-red-300">You</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-red-800 dark:text-red-300">{selectedAnalysis.competitor}</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-red-800 dark:text-red-300">Gap</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-200 dark:divide-red-800">
                          {selectedAnalysis.threats.map((threat, idx) => (
                            <tr key={idx} className="hover:bg-red-100/50 dark:hover:bg-red-900/20">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900 dark:text-white">{threat.keyword}</div>
                                {threat.competitorUrl && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{threat.competitorUrl}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                                {threat.searchVolume.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300 font-medium">
                                  #{threat.yourPosition || '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 bg-red-200 dark:bg-red-800 rounded text-red-800 dark:text-red-200 font-medium">
                                  #{threat.competitorPosition}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-red-600 dark:text-red-400 font-bold">
                                  -{threat.positionDiff}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Content Gaps - Keywords competitor ranks for but you don't (or rank poorly) */}
                {selectedAnalysis.gaps.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                      </svg>
                      Content Gaps - Keywords Where {selectedAnalysis.competitor} Leads
                    </h4>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mb-3 -mt-1">
                      Keywords where {selectedAnalysis.competitor} ranks in top 20 but you rank outside top 50 (or not at all)
                    </p>
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-amber-100 dark:bg-amber-900/30">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-amber-800 dark:text-amber-300">Keyword</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-amber-800 dark:text-amber-300">Volume</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-amber-800 dark:text-amber-300">You</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-amber-800 dark:text-amber-300">{selectedAnalysis.competitor}</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-amber-800 dark:text-amber-300">Opportunity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-200 dark:divide-amber-800">
                          {selectedAnalysis.gaps.map((gap, idx) => (
                            <tr key={idx} className="hover:bg-amber-100/50 dark:hover:bg-amber-900/20">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900 dark:text-white">{gap.keyword}</div>
                                {gap.competitorUrl && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{gap.competitorUrl}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                                {gap.searchVolume.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded font-medium ${
                                  gap.yourPosition
                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
                                }`}>
                                  {gap.yourPosition ? `#${gap.yourPosition}` : 'Not ranked'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 bg-amber-200 dark:bg-amber-800 rounded text-amber-800 dark:text-amber-200 font-medium">
                                  #{gap.competitorPosition}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-amber-600 dark:text-amber-400 font-bold">
                                  {gap.opportunityScore.toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Your Wins */}
                {selectedAnalysis.yourWins.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Your Wins - Keywords Where You Lead
                    </h4>
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-emerald-100 dark:bg-emerald-900/30">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-emerald-800 dark:text-emerald-300">Keyword</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-emerald-800 dark:text-emerald-300">Volume</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-emerald-800 dark:text-emerald-300">You</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-emerald-800 dark:text-emerald-300">{selectedAnalysis.competitor}</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-emerald-800 dark:text-emerald-300">Lead</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-200 dark:divide-emerald-800">
                          {selectedAnalysis.yourWins.map((win, idx) => (
                            <tr key={idx} className="hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20">
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{win.keyword}</td>
                              <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                                {win.searchVolume.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 bg-emerald-200 dark:bg-emerald-800 rounded text-emerald-800 dark:text-emerald-200 font-medium">
                                  #{win.yourPosition}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300 font-medium">
                                  #{win.competitorPosition}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  +{win.positionDiff}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            <p>No competitor analysis data available.</p>
            <p className="text-sm mt-1">Deep analysis requires domain configuration.</p>
          </div>
        )}
      </div>

      {/* AI Strategic Insights - Show after analysis is loaded */}
      {competitorAnalysis.length > 0 && (() => {
        // Filter out brand keywords from priority actions
        const isNotBrandKeyword = (keyword: string) => {
          const kw = keyword.toLowerCase();
          return !competitorBrandNames.some(brand => kw.includes(brand)) &&
                 !kw.includes(yourBrandName);
        };

        const filteredThreats = competitorAnalysis
          .flatMap(c => c.threats)
          .filter(t => isNotBrandKeyword(t.keyword))
          .sort((a, b) => b.opportunityScore - a.opportunityScore)
          .slice(0, 2);

        const filteredGaps = competitorAnalysis
          .flatMap(c => c.gaps)
          .filter(g => isNotBrandKeyword(g.keyword))
          .sort((a, b) => b.opportunityScore - a.opportunityScore)
          .slice(0, 2);

        return (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-200 dark:border-purple-700">
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
              </svg>
              AI Strategic Recommendations
            </h3>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Based on generic keyword analysis (excluding brand keywords)
            </p>
          </div>
          <div className="p-6">
            {isGeneratingInsight ? (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-purple-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-purple-700 dark:text-purple-300">Analyzing competitor data and generating strategic recommendations...</span>
              </div>
            ) : strategicInsight ? (
              <div className="space-y-4">
                <p className="text-purple-900 dark:text-purple-100 leading-relaxed">{strategicInsight}</p>

                {/* Quick Action Items - Filtered to exclude brand keywords */}
                {(filteredThreats.length > 0 || filteredGaps.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-700">
                    <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-3">Priority Actions (Generic Keywords Only):</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      {filteredThreats.map((threat, idx) => (
                        <div key={`threat-${idx}`} className="flex items-start gap-2 text-sm bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                          <span className="text-red-500 font-bold flex-shrink-0">!</span>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">Improve "{threat.keyword}"</div>
                            <div className="text-gray-600 dark:text-gray-400">Move from #{threat.yourPosition} to top 3 ({threat.searchVolume.toLocaleString()} searches/mo)</div>
                          </div>
                        </div>
                      ))}
                      {filteredGaps.map((gap, idx) => (
                        <div key={`gap-${idx}`} className="flex items-start gap-2 text-sm bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                          <span className="text-amber-500 font-bold flex-shrink-0">+</span>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">Create content for "{gap.keyword}"</div>
                            <div className="text-gray-600 dark:text-gray-400">{gap.yourPosition ? `You're at #${gap.yourPosition}` : 'Not ranking'} - competitor at #{gap.competitorPosition}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-purple-600 dark:text-purple-400 italic">Strategic insights will appear after competitor analysis completes.</p>
            )}
          </div>
        </div>
        );
      })()}

      {/* Data Explanation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h5 className="text-sm font-medium text-blue-800 dark:text-blue-300">How to Use This Data</h5>
            <ul className="text-xs text-blue-700 dark:text-blue-400 mt-1 space-y-1 list-disc list-inside">
              <li><strong>Threats:</strong> Keywords where competitors outrank you - prioritize improving these</li>
              <li><strong>Content Gaps:</strong> Keywords competitors rank for but you don't (or rank outside top 50) - create new content</li>
              <li><strong>Your Wins:</strong> Keywords where you lead - protect these positions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
