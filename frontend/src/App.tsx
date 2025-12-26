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
  const [analyzedDomain, setAnalyzedDomain] = useState<string>('');
  const [brandName, setBrandName] = useState<string>('');
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [lastFetchConfig, setLastFetchConfig] = useState<{
    login: string;
    password: string;
    domain: string;
    locationCode: number;
    languageCode: string;
  } | null>(null);

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
  }) => {
    try {
      setIsLoading(true);
      setError(null);
      setAnalyzedDomain(config.domain);
      setLastFetchConfig(config);
      setTrendsData(null); // Reset trends when fetching new data

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
          config.password
        )
      ]);

      // Update brand keywords with fresh data
      setBrandKeywords(brandData.brandKeywords);
      setBrandName(brandData.brandName);

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
      const trends = await getTrends(
        lastFetchConfig.domain,
        lastFetchConfig.locationCode,
        lastFetchConfig.languageCode,
        lastFetchConfig.login,
        lastFetchConfig.password
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
            title="Share of Search"
            value={sosResult ? `${sosResult.shareOfSearch}%` : '—'}
            subtitle="Brand awareness in search"
            borderColor="emerald"
            tooltip="SOS = Your Brand Search Volume / Total Brand Search Volumes × 100. Measures brand awareness through search behavior."
            details={sosResult ? [
              { label: 'Your Brand Volume', value: sosResult.brandVolume.toLocaleString() },
              { label: 'Total Brand Volume', value: sosResult.totalBrandVolume.toLocaleString() }
            ] : undefined}
          />

          <MetricCard
            title="Share of Voice"
            value={sovResult ? `${sovResult.shareOfVoice}%` : '—'}
            subtitle="Visibility-weighted market share"
            borderColor="orange"
            tooltip="SOV = Sum(Keyword Volume × CTR at Position) / Total Market Volume × 100. Weights search volume by actual click probability based on ranking position."
            details={sovResult ? [
              { label: 'Visible Volume', value: sovResult.visibleVolume.toLocaleString() },
              { label: 'Total Market Volume', value: sovResult.totalMarketVolume.toLocaleString() }
            ] : undefined}
          />

          <MetricCard
            title="Growth Gap"
            value={gapResult ? `${gapResult.gap > 0 ? '+' : ''}${gapResult.gap}pp` : '—'}
            subtitle="SOV - SOS differential"
            borderColor={gapResult ? getGapColor(gapResult.gap) : 'blue'}
            tooltip="Gap = SOV - SOS. Positive gap indicates growth potential (visibility exceeds awareness). Negative gap suggests missing market opportunities."
            interpretation={gapResult ? getGapInterpretation(gapResult.interpretation) : undefined}
          />
        </div>

        {/* Insights Panel */}
        {sosResult && sovResult && gapResult && (
          <div className="mb-8 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Analysis Insights</h3>
                {analyzedDomain && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {analyzedDomain}
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Share of Search Insight */}
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <h4 className="font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                  Share of Search: {sosResult.shareOfSearch}%
                </h4>
                <p className="text-sm text-emerald-700 mb-3">
                  {sosResult.shareOfSearch >= 30
                    ? `Strong brand awareness! ${brandName || 'Your brand'} captures a significant portion of branded searches in this market.`
                    : sosResult.shareOfSearch >= 15
                    ? `Good brand presence. ${brandName || 'Your brand'} has moderate visibility among competing brands.`
                    : `Room for growth. ${brandName || 'Your brand'} has opportunities to increase brand awareness through marketing campaigns.`}
                </p>
                <div className="text-xs text-emerald-600 bg-emerald-100 p-2 rounded">
                  <strong>What it means:</strong> SOS measures how often people search for your brand compared to all brand searches in your industry. A higher SOS indicates stronger brand awareness and recall.
                </div>
              </div>

              {/* Share of Voice Insight */}
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                  <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                  Share of Voice: {sovResult.shareOfVoice}%
                </h4>
                <p className="text-sm text-orange-700 mb-3">
                  {sovResult.shareOfVoice >= 25
                    ? `Excellent visibility! Your site captures a large share of organic clicks for relevant keywords.`
                    : sovResult.shareOfVoice >= 10
                    ? `Decent organic presence. There's potential to improve rankings and capture more market share.`
                    : `Low visibility. Focus on SEO improvements to rank higher for valuable keywords.`}
                </p>
                <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
                  <strong>What it means:</strong> SOV shows your actual visibility in search results, weighted by click probability. Higher rankings for high-volume keywords significantly boost SOV.
                </div>
              </div>

              {/* Growth Gap Insight */}
              <div className={`p-4 rounded-lg border md:col-span-2 ${
                gapResult.gap > 2
                  ? 'bg-emerald-50 border-emerald-200'
                  : gapResult.gap < -2
                  ? 'bg-red-50 border-red-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <h4 className={`font-semibold mb-2 flex items-center gap-2 ${
                  gapResult.gap > 2 ? 'text-emerald-800' : gapResult.gap < -2 ? 'text-red-800' : 'text-blue-800'
                }`}>
                  <span className={`w-3 h-3 rounded-full ${
                    gapResult.gap > 2 ? 'bg-emerald-500' : gapResult.gap < -2 ? 'bg-red-500' : 'bg-blue-500'
                  }`}></span>
                  Growth Gap Analysis: {gapResult.gap > 0 ? '+' : ''}{gapResult.gap}pp
                </h4>
                <div className={`text-sm mb-3 ${
                  gapResult.gap > 2 ? 'text-emerald-700' : gapResult.gap < -2 ? 'text-red-700' : 'text-blue-700'
                }`}>
                  {gapResult.gap > 2 ? (
                    <>
                      <p className="mb-2"><strong>Growth Potential Detected!</strong></p>
                      <p>Your organic visibility (SOV) exceeds your brand awareness (SOS). This is a positive signal indicating:</p>
                      <ul className="list-disc ml-5 mt-1">
                        <li>Good SEO performance relative to brand recognition</li>
                        <li>Your content reaches users who may not know your brand yet</li>
                        <li>Opportunity to convert visibility into brand loyalty</li>
                      </ul>
                    </>
                  ) : gapResult.gap < -2 ? (
                    <>
                      <p className="mb-2"><strong>Missing Opportunities Identified</strong></p>
                      <p>Your brand awareness (SOS) exceeds your organic visibility (SOV). This suggests:</p>
                      <ul className="list-disc ml-5 mt-1">
                        <li>People know your brand but can't find you in search results</li>
                        <li>SEO improvements needed to match brand strength</li>
                        <li>Potential loss of traffic to competitors for non-branded searches</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <p className="mb-2"><strong>Balanced Performance</strong></p>
                      <p>Your brand awareness and organic visibility are well-aligned:</p>
                      <ul className="list-disc ml-5 mt-1">
                        <li>Consistent brand and SEO performance</li>
                        <li>Focus on scaling both metrics together</li>
                        <li>Monitor for shifts in either direction</li>
                      </ul>
                    </>
                  )}
                </div>
                <div className={`text-xs p-2 rounded ${
                  gapResult.gap > 2 ? 'bg-emerald-100 text-emerald-600' : gapResult.gap < -2 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  <strong>Recommendation:</strong> {
                    gapResult.gap > 2
                      ? 'Invest in brand marketing campaigns to convert your search visibility into lasting brand awareness.'
                      : gapResult.gap < -2
                      ? 'Prioritize SEO to ensure customers who know your brand can find you through organic search.'
                      : 'Maintain your balanced approach while looking for opportunities to grow both metrics.'
                  }
                </div>
              </div>
            </div>
          </div>
        )}

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
            <KeywordTable type="sos" keywords={brandKeywords} />
          )}

          {sovResult && (
            <KeywordTable type="sov" keywords={sovResult.keywordBreakdown} />
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
