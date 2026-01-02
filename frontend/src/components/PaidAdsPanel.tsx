import { useState } from 'react';

interface PaidCompetitor {
  domain: string;
  paidETV: number;
  paidKeywordsCount: number;
  estimatedAdSpend: number;
  avgPosition: number;
  intersections: number;
  positionDistribution: {
    pos1: number;
    pos2_3: number;
    pos4_10: number;
  };
}

interface PaidAdsResponse {
  yourDomain: PaidCompetitor | null;
  competitors: PaidCompetitor[];
  sov: {
    byTraffic: number;
    byKeywords: number;
    bySpend: number;
  };
  totalMarket: {
    totalETV: number;
    totalKeywords: number;
    totalSpend: number;
  };
  timestamp: string;
}

interface PaidAdsPanelProps {
  domain: string;
  locationCode?: number;
  languageCode?: string;
}

export function PaidAdsPanel({ domain, locationCode = 2840, languageCode = 'en' }: PaidAdsPanelProps) {
  const [data, setData] = useState<PaidAdsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Initial state - show fetch button
  if (!data && !isLoading && !error) {
    return (
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
            Analyze your paid search visibility compared to competitors.
            See estimated ad spend, traffic, and keyword overlap.
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
          <span className="text-gray-600 dark:text-gray-300">Fetching paid ads data...</span>
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

  const maxSpend = Math.max(
    data.yourDomain?.estimatedAdSpend || 0,
    ...data.competitors.map(c => c.estimatedAdSpend)
  );

  return (
    <div className="space-y-6">
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
            {formatNumber(data.yourDomain?.paidETV || 0)} estimated visits
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
              <p className="text-sm text-gray-500 dark:text-gray-400">SOV by Ad Spend</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.sov.bySpend}%</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatCurrency(data.yourDomain?.estimatedAdSpend || 0)}/month est.
          </p>
        </div>
      </div>

      {/* Your Domain Stats */}
      {data.yourDomain && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Your Paid Search Performance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Est. Traffic</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatNumber(data.yourDomain.paidETV)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Paid Keywords</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatNumber(data.yourDomain.paidKeywordsCount)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Est. Ad Spend</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(data.yourDomain.estimatedAdSpend)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Position</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {data.yourDomain.avgPosition.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No data for your domain */}
      {!data.yourDomain && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200">No Paid Ads Data Found</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                No paid search activity was detected for your domain. This could mean you're not running Google Ads,
                or the data isn't available in this market.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Competitor Comparison */}
      {data.competitors.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Paid Search Competitors
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 font-medium">Domain</th>
                  <th className="pb-3 font-medium text-right">Est. Traffic</th>
                  <th className="pb-3 font-medium text-right">Keywords</th>
                  <th className="pb-3 font-medium text-right">Est. Spend</th>
                  <th className="pb-3 font-medium text-right">Avg Pos</th>
                  <th className="pb-3 font-medium">Spend Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.competitors.map((competitor) => {
                  const spendPercentage = maxSpend > 0
                    ? (competitor.estimatedAdSpend / maxSpend) * 100
                    : 0;

                  return (
                    <tr key={competitor.domain} className="text-sm">
                      <td className="py-3">
                        <a
                          href={`https://${competitor.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          {competitor.domain}
                        </a>
                      </td>
                      <td className="py-3 text-right text-gray-900 dark:text-white">
                        {formatNumber(competitor.paidETV)}
                      </td>
                      <td className="py-3 text-right text-gray-900 dark:text-white">
                        {formatNumber(competitor.paidKeywordsCount)}
                      </td>
                      <td className="py-3 text-right text-gray-900 dark:text-white font-medium">
                        {formatCurrency(competitor.estimatedAdSpend)}
                      </td>
                      <td className="py-3 text-right text-gray-600 dark:text-gray-300">
                        {competitor.avgPosition.toFixed(1)}
                      </td>
                      <td className="py-3">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${spendPercentage}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Market Summary */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
        <h3 className="font-semibold mb-4">Paid Search Market Overview</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-blue-100 text-sm">Total Market Traffic</p>
            <p className="text-2xl font-bold">{formatNumber(data.totalMarket.totalETV)}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Total Market Keywords</p>
            <p className="text-2xl font-bold">{formatNumber(data.totalMarket.totalKeywords)}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Total Market Ad Spend</p>
            <p className="text-2xl font-bold">{formatCurrency(data.totalMarket.totalSpend)}</p>
          </div>
        </div>
      </div>

      {/* Refresh button */}
      <div className="flex justify-center">
        <button
          onClick={fetchPaidAds}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Data
        </button>
      </div>
    </div>
  );
}
