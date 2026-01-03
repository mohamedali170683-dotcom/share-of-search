import { useState, useEffect } from 'react';

interface AdvertiserInfo {
  advertiserId: string;
  name: string;
  domain?: string;
  verificationStatus?: string;
  adCount: number;
}

interface PaidAdsData {
  name: string;
  advertiserId?: string;
  adCount: number;
  platforms: string[];
  formats: string[];
  isVerified: boolean;
}

interface PaidAdsResponse {
  yourBrand: PaidAdsData | null;
  competitors: PaidAdsData[];
  sov: {
    byAdCount: number;
  };
  totalMarket: {
    totalAds: number;
  };
  allAdvertisers: AdvertiserInfo[];
  timestamp: string;
  debug?: {
    apiStatus: string;
    advertisersFound: number;
    method: string;
  };
}

interface SavedAnalysis {
  id: string;
  brandName: string;
  data: PaidAdsResponse;
  createdAt: string;
}

interface PaidAdsPanelProps {
  domain: string;
  brandName: string;
  competitors: string[];
  locationCode?: number;
}

const STORAGE_KEY = 'paid-ads-analyses';

export function PaidAdsPanel({ domain, brandName, competitors, locationCode = 2840 }: PaidAdsPanelProps) {
  const [data, setData] = useState<PaidAdsResponse | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  // Load saved analyses on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const analyses: SavedAnalysis[] = JSON.parse(saved);
        setSavedAnalyses(analyses);
        // Load most recent analysis for current brand
        const currentBrandAnalysis = analyses.find(a => a.brandName.toLowerCase() === brandName.toLowerCase());
        if (currentBrandAnalysis) {
          setData(currentBrandAnalysis.data);
        }
      } catch {
        console.error('Failed to load saved analyses');
      }
    }
  }, [brandName]);

  const saveAnalysis = (analysisData: PaidAdsResponse) => {
    const newAnalysis: SavedAnalysis = {
      id: `${brandName}-${Date.now()}`,
      brandName,
      data: analysisData,
      createdAt: new Date().toISOString(),
    };

    const filtered = savedAnalyses
      .filter(a => a.brandName.toLowerCase() !== brandName.toLowerCase())
      .slice(0, 9);

    const updated = [newAnalysis, ...filtered];
    setSavedAnalyses(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const deleteAnalysis = (id: string) => {
    const updated = savedAnalyses.filter(a => a.id !== id);
    setSavedAnalyses(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    const deleted = savedAnalyses.find(a => a.id === id);
    if (deleted && data && deleted.data.timestamp === data.timestamp) {
      setData(null);
    }
  };

  const loadAnalysis = (analysis: SavedAnalysis) => {
    setData(analysis.data);
  };

  const fetchPaidAds = async () => {
    if (!brandName) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/paid-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          brandName,
          competitors: competitors.slice(0, 4),
          locationCode,
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
              We use Google's Ads Transparency Center via DataForSEO to find all verified advertisers
              running ads for your brand and competitor keywords.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Share of Voice (by Ad Count)</h4>
            <p className="text-blue-700 dark:text-blue-300 mb-2">
              Measures your brand's advertising presence based on total ads run.
            </p>
            <div className="bg-white dark:bg-gray-800 rounded p-3 font-mono text-xs">
              <p>SOV = (Your Brand Ads / Total Identified Ads) × 100</p>
              {data && (
                <p className="mt-2 text-blue-600 dark:text-blue-400">
                  = ({data.yourBrand?.adCount || 0} / {data.totalMarket.totalAds}) × 100 = <strong>{data.sov.byAdCount}%</strong>
                </p>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Advertiser Matching</h4>
            <p className="text-blue-700 dark:text-blue-300">
              Advertisers are matched to brands based on their registered name or domain containing
              the brand keyword.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // Saved analyses section
  const SavedAnalysesSection = () => {
    if (savedAnalyses.length === 0) return null;

    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Previous Analyses
        </h4>
        <div className="space-y-2">
          {savedAnalyses.map((analysis) => (
            <div
              key={analysis.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                data?.timestamp === analysis.data.timestamp
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
              }`}
            >
              <button
                onClick={() => loadAnalysis(analysis)}
                className="flex-1 text-left"
              >
                <p className="font-medium text-gray-900 dark:text-white text-sm">{analysis.brandName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDateTime(analysis.createdAt)} • SOV: {analysis.data.sov.byAdCount}%
                </p>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteAnalysis(analysis.id);
                }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                title="Delete analysis"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Initial state - show fetch button
  if (!data && !isLoading && !error) {
    return (
      <div className="space-y-6">
        <SavedAnalysesSection />
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
              Analyze your brand's Google Ads presence using the Ads Transparency Center.
              See how your advertising activity compares to competitors.
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
          <span className="text-gray-600 dark:text-gray-300">Searching Google Ads Transparency Center...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <SavedAnalysesSection />
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
      </div>
    );
  }

  if (!data) return null;

  const allBrands = data.yourBrand ? [data.yourBrand, ...data.competitors] : data.competitors;
  const maxAds = Math.max(...allBrands.map(b => b.adCount), 1);

  return (
    <div className="space-y-6">
      {/* Methodology Explanation */}
      <MethodologySection />

      {/* Saved Analyses */}
      <SavedAnalysesSection />

      {/* Analysis timestamp */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>Analysis from: {formatDateTime(data.timestamp)}</span>
        <span>Method: {data.debug?.method || 'Google Ads Transparency'}</span>
      </div>

      {/* SOV Summary Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Share of Voice (by Ad Count)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.sov.byAdCount}%</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatNumber(data.yourBrand?.adCount || 0)} ads identified for your brand
        </p>
      </div>

      {/* Your Brand Stats */}
      {data.yourBrand && data.yourBrand.adCount > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Your Brand's Ad Presence
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Ads</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatNumber(data.yourBrand.adCount)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Platforms</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {data.yourBrand.platforms.join(', ')}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Ad Formats</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {data.yourBrand.formats.join(', ')}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Verification</p>
              <p className={`text-sm font-medium ${data.yourBrand.isVerified ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>
                {data.yourBrand.isVerified ? 'Verified' : 'Not Verified'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No data for your brand */}
      {(!data.yourBrand || data.yourBrand.adCount === 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200">No Ads Found for Your Brand</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                No Google Ads were found for "{brandName}" in the Ads Transparency Center.
                This could mean you're not running Google Ads, or ads aren't indexed yet.
              </p>
              {data.debug && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                  API status: {data.debug.apiStatus} | Advertisers found: {data.debug.advertisersFound}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Brand Comparison */}
      {allBrands.some(b => b.adCount > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Brand Comparison
          </h3>
          <div className="space-y-4">
            {allBrands.map((brand, idx) => {
              const isYourBrand = idx === 0 && data.yourBrand;
              const adsPercentage = maxAds > 0 ? (brand.adCount / maxAds) * 100 : 0;

              return (
                <div key={brand.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isYourBrand ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {brand.name}
                      </span>
                      {isYourBrand && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                          Your Brand
                        </span>
                      )}
                      {brand.isVerified && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                          Verified
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatNumber(brand.adCount)} ads
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${isYourBrand ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-500'}`}
                      style={{ width: `${adsPercentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Advertisers Found */}
      {data.allAdvertisers && data.allAdvertisers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Advertisers Found
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
              ({data.allAdvertisers.length} advertisers)
            </span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 font-medium">Advertiser</th>
                  <th className="pb-3 font-medium">Domain</th>
                  <th className="pb-3 font-medium text-right">Ad Count</th>
                  <th className="pb-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.allAdvertisers.map((advertiser) => (
                  <tr key={advertiser.advertiserId} className="text-sm">
                    <td className="py-3 font-medium text-gray-900 dark:text-white">
                      {advertiser.name}
                    </td>
                    <td className="py-3">
                      {advertiser.domain ? (
                        <a
                          href={`https://${advertiser.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {advertiser.domain}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 text-right text-gray-900 dark:text-white">
                      {formatNumber(advertiser.adCount)}
                    </td>
                    <td className="py-3 text-center">
                      {advertiser.verificationStatus === 'verified' || advertiser.verificationStatus === 'VERIFIED' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Verified
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Market Summary */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
        <h3 className="font-semibold mb-4">Paid Ads Market Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-blue-100 text-sm">Total Ads Identified</p>
            <p className="text-2xl font-bold">{formatNumber(data.totalMarket.totalAds)}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Advertisers Found</p>
            <p className="text-2xl font-bold">{data.debug?.advertisersFound || data.allAdvertisers.length}</p>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      {data.debug && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-xs text-gray-500 dark:text-gray-400">
          <p>Debug: API status: {data.debug.apiStatus} | Method: {data.debug.method} | Advertisers found: {data.debug.advertisersFound}</p>
          <p className="mt-1">Timestamp: {data.timestamp}</p>
        </div>
      )}

      {/* Refresh button */}
      <div className="flex justify-center">
        <button
          onClick={fetchPaidAds}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Run New Analysis
        </button>
      </div>
    </div>
  );
}
