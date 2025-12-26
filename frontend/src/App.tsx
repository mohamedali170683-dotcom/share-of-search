import { useState, useEffect } from 'react';
import { MetricCard, KeywordTable, APIConfigPanel, TrendsPanel } from './components';
import type { BrandKeyword, RankedKeyword, SOSResult, SOVResult, GrowthGapResult } from './types';
import { getSampleData, calculateMetrics, getRankedKeywords, getBrandKeywords, getTrends, exportToCSV } from './services/api';
import type { TrendsData } from './services/api';

function App() {
  const [brandKeywords, setBrandKeywords] = useState<BrandKeyword[]>([]);
  const [rankedKeywords, setRankedKeywords] = useState<RankedKeyword[]>([]);
  const [sosResult, setSosResult] = useState<SOSResult | null>(null);
  const [sovResult, setSovResult] = useState<SOVResult | null>(null);
  const [gapResult, setGapResult] = useState<GrowthGapResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>('');
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [lastFetchConfig, setLastFetchConfig] = useState<{
    login: string;
    password: string;
    domain: string;
    locationCode: number;
    languageCode: string;
    customCompetitors?: string[];
  } | null>(null);
  // Store actual competitors from brand-keywords API for use in trends
  const [actualCompetitors, setActualCompetitors] = useState<string[]>([]);

  // Custom metric overrides from table filters
  const [customSOS, setCustomSOS] = useState<{ sos: number; brandVolume: number; totalVolume: number } | null>(null);
  const [customSOV, setCustomSOV] = useState<{ sov: number; visibleVolume: number; totalVolume: number } | null>(null);

  // Handler for SOS changes from KeywordTable competitor selection
  const handleSOSChange = (_selectedBrands: string[], sos: number, brandVolume: number, totalVolume: number) => {
    setCustomSOS({ sos, brandVolume, totalVolume });
  };

  // Handler for SOV changes from KeywordTable category filter
  const handleSOVChange = (filteredSOV: number, visibleVolume: number, totalVolume: number) => {
    if (filteredSOV === 0 && visibleVolume === 0 && totalVolume === 0) {
      // No filters active - reset to original
      setCustomSOV(null);
    } else {
      setCustomSOV({ sov: filteredSOV, visibleVolume, totalVolume });
    }
  };

  // Calculate effective metrics (custom if set, otherwise original)
  const effectiveSOS = customSOS?.sos ?? sosResult?.shareOfSearch ?? 0;
  const effectiveSOV = customSOV?.sov ?? sovResult?.shareOfVoice ?? 0;
  const effectiveGap = Math.round((effectiveSOV - effectiveSOS) * 10) / 10;

  // Load sample data on mount
  useEffect(() => {
    loadSampleData();
  }, []);

  const loadSampleData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSampleData();
      setBrandKeywords(data.brandKeywords);

      const results = await calculateMetrics(data.brandKeywords, data.rankedKeywords);
      setSosResult(results.sos);
      setSovResult(results.sov);
      setGapResult(results.gap);
      setRankedKeywords(results.sov.keywordBreakdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sample data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchData = async (config: {
    login: string;
    password: string;
    domain: string;
    locationCode: number;
    languageCode: string;
    customCompetitors?: string[];
  }) => {
    try {
      setIsLoading(true);
      setError(null);
      setLastFetchConfig(config);
      setTrendsData(null); // Reset trends when fetching new data
      setCustomSOS(null); // Reset custom metrics when fetching new data
      setCustomSOV(null);

      // Fetch both ranked keywords and brand keywords in parallel
      const [rankedData, brandData] = await Promise.all([
        getRankedKeywords(
          config.domain,
          config.locationCode,
          config.languageCode,
          100,
          config.login,
          config.password
        ),
        getBrandKeywords(
          config.domain,
          config.locationCode,
          config.languageCode,
          config.login,
          config.password,
          config.customCompetitors // Pass custom competitors to API
        )
      ]);

      // Update brand keywords with fresh data
      setBrandKeywords(brandData.brandKeywords);
      setBrandName(brandData.brandName);
      // Store actual competitors for trends API - these are the competitors
      // actually used in the analysis (either custom or auto-detected)
      setActualCompetitors(brandData.competitors || []);

      // Calculate with the new data
      const calcResults = await calculateMetrics(brandData.brandKeywords, rankedData.results);
      setSosResult(calcResults.sos);
      setSovResult(calcResults.sov);
      setGapResult(calcResults.gap);
      setRankedKeywords(calcResults.sov.keywordBreakdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchTrends = async () => {
    if (!lastFetchConfig) return;

    try {
      setTrendsLoading(true);
      // Use actualCompetitors (from brand-keywords API) so trends match main analysis
      // These are the same competitors used to calculate the current SOS
      const trends = await getTrends(
        lastFetchConfig.domain,
        lastFetchConfig.locationCode,
        lastFetchConfig.languageCode,
        lastFetchConfig.login,
        lastFetchConfig.password,
        actualCompetitors.length > 0 ? actualCompetitors : undefined
      );
      setTrendsData(trends);
    } catch (err) {
      console.error('Failed to fetch trends:', err);
      // Don't set error state - trends are optional
    } finally {
      setTrendsLoading(false);
    }
  };

  const handleExport = () => {
    if (sosResult && sovResult && gapResult) {
      exportToCSV(
        brandKeywords,
        rankedKeywords,
        sosResult.shareOfSearch,
        sovResult.shareOfVoice,
        gapResult.gap
      );
    }
  };

  const getGapInterpretation = (interpretation: string) => {
    switch (interpretation) {
      case 'growth_potential':
        return { type: 'growth_potential' as const, message: 'Growth Potential' };
      case 'missing_opportunities':
        return { type: 'missing_opportunities' as const, message: 'Missing Opportunities' };
      default:
        return { type: 'balanced' as const, message: 'Balanced' };
    }
  };

  const getGapColor = (gap: number): 'emerald' | 'orange' | 'red' | 'blue' => {
    if (gap > 2) return 'emerald';
    if (gap < -2) return 'red';
    return 'blue';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">SearchShare Pro</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadSampleData}
                disabled={isLoading}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={handleExport}
                disabled={!sosResult || !sovResult}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* API Configuration */}
        <APIConfigPanel onFetchData={handleFetchData} isLoading={isLoading} />

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title={customSOS ? "Share of Search (Filtered)" : "Share of Search"}
            value={sosResult ? `${customSOS?.sos ?? sosResult.shareOfSearch}%` : '—'}
            subtitle={customSOS ? "Based on selected competitors" : "Brand awareness in search"}
            borderColor="emerald"
            tooltip="SOS = Your Brand Search Volume / Total Brand Search Volumes × 100. Measures brand awareness through search behavior."
            details={sosResult ? [
              { label: 'Your Brand Volume', value: (customSOS?.brandVolume ?? sosResult.brandVolume).toLocaleString() },
              { label: 'Total Brand Volume', value: (customSOS?.totalVolume ?? sosResult.totalBrandVolume).toLocaleString() }
            ] : undefined}
            insight={sosResult ? {
              summary: effectiveSOS >= 30
                ? `Strong brand awareness! ${brandName || 'Your brand'} captures a significant portion of branded searches.`
                : effectiveSOS >= 15
                ? `Good brand presence. ${brandName || 'Your brand'} has moderate visibility among competitors.`
                : `Room for growth. Consider brand marketing to increase awareness.`,
              explanation: 'SOS measures how often people search for your brand compared to all brand searches in your industry.'
            } : undefined}
          />

          <MetricCard
            title={customSOV ? "Share of Voice (Filtered)" : "Share of Voice"}
            value={sovResult ? `${customSOV?.sov ?? sovResult.shareOfVoice}%` : '—'}
            subtitle={customSOV ? "Based on selected filters" : "Visibility-weighted market share"}
            borderColor="orange"
            tooltip="SOV = Sum(Keyword Volume × CTR at Position) / Total Market Volume × 100. Weights search volume by actual click probability based on ranking position."
            details={sovResult ? [
              { label: 'Visible Volume', value: (customSOV?.visibleVolume ?? sovResult.visibleVolume).toLocaleString() },
              { label: 'Total Market Volume', value: (customSOV?.totalVolume ?? sovResult.totalMarketVolume).toLocaleString() }
            ] : undefined}
            insight={sovResult ? {
              summary: effectiveSOV >= 25
                ? `Excellent visibility! Your site captures a large share of organic clicks.`
                : effectiveSOV >= 10
                ? `Decent organic presence. There's potential to improve rankings.`
                : `Low visibility. Focus on SEO to rank higher for valuable keywords.`,
              explanation: 'SOV shows your actual visibility in search results, weighted by click probability based on position.'
            } : undefined}
          />

          <MetricCard
            title={customSOS || customSOV ? "Growth Gap (Filtered)" : "Growth Gap"}
            value={gapResult ? `${effectiveGap > 0 ? '+' : ''}${effectiveGap}pp` : '—'}
            subtitle={customSOS || customSOV ? "Based on filtered metrics" : "SOV - SOS differential"}
            borderColor={gapResult ? getGapColor(effectiveGap) : 'blue'}
            tooltip="Gap = SOV - SOS. Positive gap indicates growth potential (visibility exceeds awareness). Negative gap suggests missing market opportunities."
            interpretation={gapResult ? getGapInterpretation(
              effectiveGap > 2 ? 'growth_potential' : effectiveGap < -2 ? 'missing_opportunities' : 'balanced'
            ) : undefined}
            insight={gapResult ? {
              summary: effectiveGap > 2
                ? `Growth Potential! Your visibility exceeds brand awareness - opportunity to convert searches into loyalty.`
                : effectiveGap < -2
                ? `Missing Opportunities. Your brand awareness exceeds visibility - focus on SEO improvements.`
                : `Balanced performance. Brand awareness and visibility are well-aligned.`,
              explanation: effectiveGap > 2
                ? 'Invest in brand marketing to convert search visibility into lasting brand awareness.'
                : effectiveGap < -2
                ? 'Prioritize SEO to ensure customers who know your brand can find you organically.'
                : 'Maintain your balanced approach while looking for opportunities to grow both metrics.'
            } : undefined}
          />
        </div>

        {/* Trends Section */}
        {sosResult && sovResult && lastFetchConfig && (
          <div className="mb-8">
            {!trendsData && !trendsLoading && (
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <div className="flex flex-col items-center gap-4">
                  <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Historical Trends Available</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      See how your Share of Search and Share of Voice have changed over the past 12 months
                    </p>
                  </div>
                  <button
                    onClick={handleFetchTrends}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Load Historical Trends
                  </button>
                </div>
              </div>
            )}
            <TrendsPanel data={trendsData} isLoading={trendsLoading} />
          </div>
        )}

        {/* Tables */}
        <div className="space-y-6">
          {brandKeywords.length > 0 && (
            <KeywordTable
              type="sos"
              keywords={brandKeywords}
              onSelectedCompetitorsChange={handleSOSChange}
            />
          )}

          {sovResult && (
            <KeywordTable
              type="sov"
              keywords={sovResult.keywordBreakdown}
              onFilteredSOVChange={handleSOVChange}
            />
          )}
        </div>

        {/* Loading Overlay */}
        {isLoading && !sosResult && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-500">
              <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Loading data...</span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            SearchShare Pro - Share of Search & Share of Voice Analytics
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
