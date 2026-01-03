import { useState, useEffect } from 'react';

interface PaidKeyword {
  keyword: string;
  searchVolume: number;
  cpc: number;
  position: number;
  url: string;
  competition: number;
}

interface DomainPaidData {
  domain: string;
  paidKeywordsCount: number;
  estimatedTraffic: number;
  estimatedSpend: number;
  avgPosition: number;
  topKeywords: PaidKeyword[];
  positionDistribution: {
    pos1: number;
    pos2_3: number;
    pos4_10: number;
    pos11_plus: number;
  };
}

interface PaidAdsResponse {
  yourDomain: DomainPaidData | null;
  competitors: DomainPaidData[];
  sov: {
    byTraffic: number;
    byKeywords: number;
    bySpend: number;
  };
  totalMarket: {
    totalTraffic: number;
    totalKeywords: number;
    totalSpend: number;
  };
  timestamp: string;
  debug?: {
    apiStatus: string;
    method: string;
    yourKeywordsFound: number;
    competitorsAnalyzed: number;
  };
}

interface SavedAnalysis {
  id: string;
  domain: string;
  data: PaidAdsResponse;
  createdAt: string;
}

interface PaidAdsPanelProps {
  domain: string;
  brandName: string;
  competitors: string[];
  locationCode?: number;
  languageCode?: string;
}

const STORAGE_KEY = 'paid-ads-analyses';

export function PaidAdsPanel({ domain, brandName: _brandName, competitors, locationCode = 2840, languageCode = 'en' }: PaidAdsPanelProps) {
  // brandName available for future use
  void _brandName;
  const [data, setData] = useState<PaidAdsResponse | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'keywords' | 'competitors'>('overview');

  // Load saved analyses on mount
  useEffect(() => {
    if (!domain) return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const analyses: SavedAnalysis[] = JSON.parse(saved);
        // Filter out any invalid analyses
        const validAnalyses = analyses.filter(a => a && a.domain && typeof a.domain === 'string');
        setSavedAnalyses(validAnalyses);
        const currentAnalysis = validAnalyses.find(a => a.domain.toLowerCase() === domain.toLowerCase());
        if (currentAnalysis) {
          setData(currentAnalysis.data);
        }
      } catch {
        console.error('Failed to load saved analyses');
        // Clear corrupted data
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [domain]);

  const saveAnalysis = (analysisData: PaidAdsResponse) => {
    if (!domain) return;

    const newAnalysis: SavedAnalysis = {
      id: `${domain}-${Date.now()}`,
      domain,
      data: analysisData,
      createdAt: new Date().toISOString(),
    };

    const filtered = savedAnalyses
      .filter(a => a && a.domain && a.domain.toLowerCase() !== domain.toLowerCase())
      .slice(0, 9);

    const updated = [newAnalysis, ...filtered];
    setSavedAnalyses(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const deleteCurrentAnalysis = () => {
    if (!domain) return;

    const filtered = savedAnalyses.filter(
      a => a && a.domain && a.domain.toLowerCase() !== domain.toLowerCase()
    );
    setSavedAnalyses(filtered);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    setData(null);
  };

  const fetchPaidAds = async () => {
    if (!domain) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/paid-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          competitors: competitors.slice(0, 4),
          locationCode,
          languageCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch paid ads data');
      }

      const result = await response.json();
      setData(result);
      saveAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch paid ads data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatNumber = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Methodology explanation
  const MethodologySection = () => (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
      <button
        onClick={() => setShowMethodology(!showMethodology)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-blue-800 dark:text-blue-200">How is Paid Ads SOV Calculated?</span>
        </div>
        <svg className={`w-5 h-5 text-blue-600 transition-transform ${showMethodology ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMethodology && (
        <div className="mt-4 space-y-4 text-sm text-blue-800 dark:text-blue-200">
          <div>
            <h4 className="font-semibold mb-2">Data Source</h4>
            <p className="text-blue-700 dark:text-blue-300">
              We analyze paid search keywords where each domain appears in Google Ads results,
              using DataForSEO's ranked_keywords API with paid filter.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded p-3">
              <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">SOV by Traffic</h5>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Your paid traffic / Total market paid traffic
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded p-3">
              <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">SOV by Keywords</h5>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Your paid keywords / Total market keywords
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded p-3">
              <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">SOV by Spend</h5>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Your estimated spend / Total market spend
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Initial state
  if (!data && !isLoading && !error) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Paid Ads Share of Voice
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
              Analyze your paid search performance vs competitors. See which keywords you're bidding on,
              estimated spend, and your share of paid traffic.
            </p>
            <button
              onClick={fetchPaidAds}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analyze Paid Ads
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-center gap-3">
          <svg className="w-6 h-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-gray-600 dark:text-gray-300">Analyzing paid search data for all domains...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Failed to Fetch Paid Ads Data</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchPaidAds}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const allDomains = data.yourDomain ? [data.yourDomain, ...data.competitors] : data.competitors;
  const maxSpend = Math.max(...allDomains.map(d => d.estimatedSpend), 1);
  const hasData = data.yourDomain && data.yourDomain.paidKeywordsCount > 0;

  return (
    <div className="space-y-6">
      <MethodologySection />

      {/* Analysis info */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>Analysis from: {formatDateTime(data.timestamp)}</span>
        <span>Method: {data.debug?.method || 'DataForSEO'}</span>
      </div>

      {/* SOV Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">SOV by Traffic</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.sov.byTraffic}%</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatNumber(data.yourDomain?.estimatedTraffic || 0)} estimated paid visits/mo
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">SOV by Keywords</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.sov.byKeywords}%</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatNumber(data.yourDomain?.paidKeywordsCount || 0)} paid keywords
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">SOV by Spend</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.sov.bySpend}%</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatCurrency(data.yourDomain?.estimatedSpend || 0)}/mo estimated
          </p>
        </div>
      </div>

      {/* No data warning */}
      {!hasData && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200">No Paid Keywords Found</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                No paid search keywords were found for {domain}. This could mean:
              </p>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 list-disc list-inside space-y-1">
                <li>You're not currently running Google Ads</li>
                <li>Your ads aren't appearing in the tracked markets</li>
                <li>DataForSEO hasn't indexed your paid keywords yet</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {hasData && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4">
            {(['overview', 'keywords', 'competitors'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'keywords' && `Top Keywords (${data.yourDomain?.topKeywords.length || 0})`}
                {tab === 'competitors' && `Competitors (${data.competitors.length})`}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Overview Tab */}
      {hasData && activeTab === 'overview' && data.yourDomain && (
        <div className="space-y-6">
          {/* Your Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Your Paid Search Performance
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Paid Keywords</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(data.yourDomain.paidKeywordsCount)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Est. Traffic</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(data.yourDomain.estimatedTraffic)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Est. Spend/mo</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(data.yourDomain.estimatedSpend)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Position</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {data.yourDomain.avgPosition > 0 ? data.yourDomain.avgPosition.toFixed(1) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Position Distribution */}
          {data.yourDomain.positionDistribution && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ad Position Distribution</h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{data.yourDomain.positionDistribution.pos1}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Position 1</p>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{data.yourDomain.positionDistribution.pos2_3}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Position 2-3</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{data.yourDomain.positionDistribution.pos4_10}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Position 4-10</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{data.yourDomain.positionDistribution.pos11_plus}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Position 11+</p>
                </div>
              </div>
            </div>
          )}

          {/* Competitor Comparison */}
          {allDomains.length > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Competitor Comparison</h3>
              <div className="space-y-4">
                {allDomains.map((domainData, idx) => {
                  const isYours = idx === 0;
                  const spendPercentage = maxSpend > 0 ? (domainData.estimatedSpend / maxSpend) * 100 : 0;

                  return (
                    <div key={domainData.domain} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isYours ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {domainData.domain}
                          </span>
                          {isYours && (
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(domainData.estimatedSpend)}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                            ({formatNumber(domainData.paidKeywordsCount)} kw)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${isYours ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-500'}`}
                          style={{ width: `${spendPercentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keywords Tab */}
      {hasData && activeTab === 'keywords' && data.yourDomain && data.yourDomain.topKeywords.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Paid Keywords
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
              (by search volume)
            </span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 font-medium">Keyword</th>
                  <th className="pb-3 font-medium text-right">Volume</th>
                  <th className="pb-3 font-medium text-right">CPC</th>
                  <th className="pb-3 font-medium text-right">Position</th>
                  <th className="pb-3 font-medium text-right">Competition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.yourDomain.topKeywords.map((kw, idx) => (
                  <tr key={`${kw.keyword}-${idx}`} className="text-sm">
                    <td className="py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{kw.keyword}</span>
                      {kw.url && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {kw.url}
                        </p>
                      )}
                    </td>
                    <td className="py-3 text-right text-gray-900 dark:text-white">
                      {formatNumber(kw.searchVolume)}
                    </td>
                    <td className="py-3 text-right text-gray-900 dark:text-white">
                      ${kw.cpc.toFixed(2)}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        kw.position <= 3 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        kw.position <= 7 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        #{kw.position}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 inline-block">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${kw.competition * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Competitors Tab */}
      {hasData && activeTab === 'competitors' && data.competitors.length > 0 && (
        <div className="space-y-4">
          {data.competitors.map((comp) => (
            <div key={comp.domain} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{comp.domain}</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatNumber(comp.paidKeywordsCount)} keywords
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Est. Traffic</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(comp.estimatedTraffic)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Est. Spend</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(comp.estimatedSpend)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Avg Position</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{comp.avgPosition > 0 ? comp.avgPosition.toFixed(1) : 'N/A'}</p>
                </div>
              </div>
              {comp.topKeywords.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Top Keywords:</p>
                  <div className="flex flex-wrap gap-2">
                    {comp.topKeywords.slice(0, 8).map((kw, idx) => (
                      <span key={`${kw.keyword}-${idx}`} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300">
                        {kw.keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Market Summary */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
        <h3 className="font-semibold mb-4">Paid Search Market Overview</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-blue-100 text-sm">Total Market Traffic</p>
            <p className="text-2xl font-bold">{formatNumber(data.totalMarket.totalTraffic)}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Total Keywords</p>
            <p className="text-2xl font-bold">{formatNumber(data.totalMarket.totalKeywords)}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Total Est. Spend</p>
            <p className="text-2xl font-bold">{formatCurrency(data.totalMarket.totalSpend)}</p>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      {data.debug && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-xs text-gray-500 dark:text-gray-400">
          <p>Debug: Method: {data.debug.method} | Your keywords: {data.debug.yourKeywordsFound} | Competitors analyzed: {data.debug.competitorsAnalyzed}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center gap-3">
        <button
          onClick={fetchPaidAds}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Run New Analysis
        </button>
        <button
          onClick={deleteCurrentAnalysis}
          className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Analysis
        </button>
      </div>
    </div>
  );
}
