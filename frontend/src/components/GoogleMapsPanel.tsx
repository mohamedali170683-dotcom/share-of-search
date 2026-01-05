import { useState, useEffect } from 'react';

interface BusinessListing {
  placeId: string;
  title: string;
  domain?: string;
  url?: string;
  address?: string;
  phone?: string;
  rating?: number;
  ratingCount?: number;
  priceLevel?: string;
  category?: string;
  additionalCategories?: string[];
  latitude?: number;
  longitude?: number;
  mainImage?: string;
  isClaimed?: boolean;
  rank: number;
  ratingDistribution?: {
    star1: number;
    star2: number;
    star3: number;
    star4: number;
    star5: number;
  };
}

interface BrandLocalData {
  name: string;
  listings: BusinessListing[];
  totalListings: number;
  avgRating: number;
  totalReviews: number;
  topRank: number;
  categories: string[];
}

interface GoogleMapsResponse {
  yourBrand: BrandLocalData | null;
  competitors: BrandLocalData[];
  allListings: BusinessListing[];
  sov: {
    byListings: number;
    byReviews: number;
  };
  searchedKeywords: string[];
  location: string;
  timestamp: string;
  methodology?: {
    visibilityFormula: string;
    reviewSOVFormula: string;
    brandMatchingMethod: string;
    dataSource: string;
  };
  debug?: {
    totalListingsFetched: number;
    apiStatus: string;
  };
}

interface SavedAnalysis {
  id: string;
  brandName: string;
  data: GoogleMapsResponse;
  createdAt: string;
}

interface GoogleMapsPanelProps {
  brandName: string;
  competitors: string[];
  locationCode?: number;
  languageCode?: string;
}

const STORAGE_KEY = 'google-maps-analyses';

interface LocalInsights {
  summary: string;
  keyConclusion: string;
  priorityAction: string;
  reviewStrategy: string;
  competitorThreat: string;
  quickWins: string[];
  // Legacy fields for backwards compatibility
  strengths?: string[];
  opportunities?: string[];
  competitorInsight?: string;
}

export function GoogleMapsPanel({ brandName, competitors, locationCode = 2840, languageCode = 'en' }: GoogleMapsPanelProps) {
  const [data, setData] = useState<GoogleMapsResponse | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Insights
  const [insights, setInsights] = useState<LocalInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Custom search terms
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [newSearchTerm, setNewSearchTerm] = useState('');
  const [showSearchTermInput, setShowSearchTermInput] = useState(false);

  // Load saved analyses on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const analyses: SavedAnalysis[] = JSON.parse(saved);
        setSavedAnalyses(analyses);
        const currentAnalysis = analyses.find(a => a.brandName.toLowerCase() === brandName.toLowerCase());
        if (currentAnalysis) {
          setData(currentAnalysis.data);
        }
      } catch {
        console.error('Failed to load saved analyses');
      }
    }
  }, [brandName]);

  // Generate AI insights when data is loaded
  useEffect(() => {
    if (data && !insights && !isLoadingInsights && data.yourBrand) {
      fetchAIInsights(data);
    }
  }, [data, insights, isLoadingInsights]);

  const saveAnalysis = (analysisData: GoogleMapsResponse) => {
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

  const deleteCurrentAnalysis = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let currentAnalyses: SavedAnalysis[] = [];
    if (saved) {
      try {
        currentAnalyses = JSON.parse(saved);
      } catch {
        // empty
      }
    }

    const filtered = currentAnalyses.filter(
      a => a && a.brandName && a.brandName.toLowerCase() !== brandName.toLowerCase()
    );
    setSavedAnalyses(filtered);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    setData(null);
    setError(null);
    setInsights(null);
    setInsightsError(null);
  };

  const fetchAIInsights = async (mapsData: GoogleMapsResponse) => {
    setIsLoadingInsights(true);
    setInsightsError(null);

    try {
      const response = await fetch('/api/generate-channel-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'google-maps',
          brandName,
          mapsData: {
            yourBrand: mapsData.yourBrand,
            competitors: mapsData.competitors,
            sov: mapsData.sov,
          },
          competitors,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      const result = await response.json();
      if (result.insights) {
        setInsights(result.insights);
      } else {
        setInsightsError('Could not generate insights');
      }
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : 'Failed to generate insights');
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const fetchGoogleMaps = async () => {
    if (!brandName) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/google-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          competitors: competitors.slice(0, 4),
          locationCode,
          languageCode,
          searchTerms,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Google Maps data');
      }

      const result = await response.json();
      setData(result);
      saveAnalysis(result);

      // Auto-generate insights
      if (result.yourBrand) {
        fetchAIInsights(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Google Maps data');
    } finally {
      setIsLoading(false);
    }
  };

  const addSearchTerm = () => {
    if (newSearchTerm.trim() && searchTerms.length < 3) {
      setSearchTerms([...searchTerms, newSearchTerm.trim()]);
      setNewSearchTerm('');
      setShowSearchTermInput(false);
    }
  };

  const removeSearchTerm = (term: string) => {
    setSearchTerms(searchTerms.filter(t => t !== term));
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
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

  // Star rating component
  const StarRating = ({ rating, count }: { rating: number; count?: number }) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    return (
      <div className="flex items-center gap-1">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className={`w-4 h-4 ${
                star <= fullStars
                  ? 'text-yellow-400'
                  : star === fullStars + 1 && hasHalfStar
                    ? 'text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{rating.toFixed(1)}</span>
        {count !== undefined && (
          <span className="text-xs text-gray-500 dark:text-gray-400">({formatNumber(count)})</span>
        )}
      </div>
    );
  };

  // Search terms setup
  const SearchTermsSetup = () => (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl shadow-sm p-6 border border-green-200 dark:border-green-800 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Custom Search Terms (Optional)
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Add local search terms relevant to your industry (e.g., "tire shop near me", "auto repair")
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {searchTerms.map((term) => (
          <span
            key={term}
            className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-sm"
          >
            {term}
            <button
              onClick={() => removeSearchTerm(term)}
              className="ml-1 text-green-600 hover:text-red-600 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>

      {showSearchTermInput ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newSearchTerm}
            onChange={(e) => setNewSearchTerm(e.target.value)}
            placeholder="e.g., tire shop near me"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500"
            onKeyDown={(e) => e.key === 'Enter' && addSearchTerm()}
          />
          <button
            onClick={addSearchTerm}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            Add
          </button>
          <button
            onClick={() => { setShowSearchTermInput(false); setNewSearchTerm(''); }}
            className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowSearchTermInput(true)}
          disabled={searchTerms.length >= 3}
          className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add search term ({3 - searchTerms.length} remaining)
        </button>
      )}
    </div>
  );

  // Initial state - show fetch button
  if (!data && !isLoading && !error) {
    return (
      <div className="space-y-6">
        <SearchTermsSetup />

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Local Visibility & Customer Attention
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 max-w-md mx-auto">
              Understand your brand's presence in Google Maps local search results.
            </p>
            <div className="text-left max-w-md mx-auto mb-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span><strong>Local Visibility:</strong> How often does your brand appear?</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span><strong>Customer Attention:</strong> What share of reviews do you own?</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span><strong>Competitive Position:</strong> Where do you rank vs competitors?</span>
              </div>
            </div>
            <button
              onClick={fetchGoogleMaps}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Analyze Local Presence
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
          <svg className="w-6 h-6 animate-spin text-green-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-gray-600 dark:text-gray-300">Searching Google Maps...</span>
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Failed to Fetch Data</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchGoogleMaps}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const allBrands = data.yourBrand ? [data.yourBrand, ...data.competitors] : data.competitors;
  const maxReviews = Math.max(...allBrands.map(b => b.totalReviews), 1);

  return (
    <div className="space-y-6">
      {/* Analysis timestamp */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>Analysis from: {formatDateTime(data.timestamp)}</span>
        <span>Searched: {data.searchedKeywords?.slice(0, 3).join(', ')}</span>
      </div>

      {/* Core Metrics - Visibility & Attention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Local Visibility</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.sov.byListings}%</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            How often does your brand appear in local search results?
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            {data.yourBrand?.totalListings || 0} of {(() => {
              const total = (data.yourBrand?.totalListings || 0) + data.competitors.reduce((sum, c) => sum + c.totalListings, 0);
              return total;
            })()} total listings in results
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Attention</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.sov.byReviews}%</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            What share of customer feedback do you own?
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            {formatNumber(data.yourBrand?.totalReviews || 0)} reviews ({data.yourBrand?.avgRating?.toFixed(1) || 'N/A'}★ avg)
          </p>
        </div>
      </div>

      {/* Your Brand Summary */}
      {data.yourBrand && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Your Brand: {data.yourBrand.name}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Locations</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{data.yourBrand.totalListings}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Rating</p>
              <StarRating rating={data.yourBrand.avgRating} />
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Reviews</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatNumber(data.yourBrand.totalReviews)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Best Rank</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">#{data.yourBrand.topRank}</p>
            </div>
          </div>

          {data.yourBrand.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.yourBrand.categories.map((cat) => (
                <span key={cat} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Brand Comparison */}
      {allBrands.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Brand Comparison
          </h3>
          <div className="space-y-4">
            {allBrands.map((brand) => {
              const isYourBrand = data.yourBrand && brand.name === data.yourBrand.name;
              const reviewsPercentage = maxReviews > 0 ? (brand.totalReviews / maxReviews) * 100 : 0;

              return (
                <div key={brand.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isYourBrand ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {brand.name}
                      </span>
                      {isYourBrand && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                          Your Brand
                        </span>
                      )}
                      <StarRating rating={brand.avgRating} count={brand.totalReviews} />
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {brand.totalListings} locations
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${isYourBrand ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-500'}`}
                      style={{ width: `${reviewsPercentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conclusion & Recommendation */}
      {(isLoadingInsights || insights || insightsError) && (
        <div className="bg-gradient-to-br from-indigo-50 to-green-50 dark:from-indigo-900/20 dark:to-green-900/20 rounded-xl shadow-sm p-6 border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Conclusion & Recommendation
            </h3>
          </div>

          {isLoadingInsights && (
            <div className="flex items-center justify-center py-8">
              <svg className="w-6 h-6 animate-spin text-indigo-600 mr-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-gray-600 dark:text-gray-300">Analyzing local SEO data...</span>
            </div>
          )}

          {insightsError && (
            <div className="text-center py-4">
              <p className="text-red-600 dark:text-red-400 text-sm mb-2">{insightsError}</p>
              <button
                onClick={() => data && fetchAIInsights(data)}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          )}

          {insights && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <p className="text-gray-700 dark:text-gray-300">{insights.summary}</p>
              </div>

              {/* Two Column: Key Conclusion + Priority Action */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Key Conclusion */}
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                  <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 text-sm flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Key Conclusion
                  </h4>
                  <p className="text-indigo-700 dark:text-indigo-300 text-sm">{insights.keyConclusion}</p>
                </div>

                {/* Priority Action */}
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 text-sm flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Priority Action
                  </h4>
                  <p className="text-red-700 dark:text-red-300 text-sm">{insights.priorityAction}</p>
                </div>
              </div>

              {/* Quick Wins */}
              {insights.quickWins && insights.quickWins.length > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                  <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Quick Wins
                  </h4>
                  <ul className="space-y-2">
                    {insights.quickWins.map((win, i) => (
                      <li key={i} className="text-emerald-700 dark:text-emerald-300 text-sm flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5 font-bold">{i + 1}.</span>
                        <span>{win}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Additional Insights Row */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Competitor Threat */}
                {insights.competitorThreat && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-800 dark:text-orange-200 text-sm flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Competitor Threat
                    </h4>
                    <p className="text-orange-700 dark:text-orange-300 text-sm">{insights.competitorThreat}</p>
                  </div>
                )}

                {/* Review Strategy */}
                {insights.reviewStrategy && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 text-sm flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Review Strategy
                    </h4>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm">{insights.reviewStrategy}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Listings Grouped by Category */}
      {data.allListings.length > 0 && (() => {
        // Group listings by category
        const listingsByCategory = data.allListings.reduce((acc, listing) => {
          const category = listing.category || 'Other';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(listing);
          return acc;
        }, {} as Record<string, typeof data.allListings>);

        // Sort categories by count (most listings first)
        const sortedCategories = Object.entries(listingsByCategory)
          .sort((a, b) => b[1].length - a[1].length);

        return (
          <details className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <summary className="p-6 cursor-pointer list-none">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Listings by Category
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({data.allListings.length} businesses in {sortedCategories.length} categories)
                  </span>
                </h3>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            <div className="px-6 pb-6">
              <div className="space-y-6 max-h-[700px] overflow-y-auto">
                {sortedCategories.map(([category, listings]) => {
                  const yourBrandCount = listings.filter(l =>
                    data.yourBrand && l.title.toLowerCase().includes(data.yourBrand.name.toLowerCase())
                  ).length;

                  return (
                    <div key={category} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                      {/* Category Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-full">
                            {category}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {listings.length} listing{listings.length !== 1 ? 's' : ''}
                          </span>
                          {yourBrandCount > 0 && (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                              {yourBrandCount} yours
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Listings Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {listings.map((listing) => {
                          const isYourBrand = data.yourBrand && listing.title.toLowerCase().includes(data.yourBrand.name.toLowerCase());

                          return (
                            <div
                              key={listing.placeId}
                              className={`flex items-start gap-3 p-3 rounded-lg border ${
                                isYourBrand
                                  ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                              }`}
                            >
                              <div className="flex-shrink-0 w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">#{listing.rank}</span>
                              </div>
                              {listing.mainImage && (
                                <img
                                  src={listing.mainImage}
                                  alt={listing.title}
                                  className="w-12 h-12 object-cover rounded flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                    {listing.title}
                                  </h4>
                                  {isYourBrand && (
                                    <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {listing.rating && <StarRating rating={listing.rating} count={listing.ratingCount} />}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                  {listing.address}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </details>
        );
      })()}

      {/* No listings message */}
      {data.allListings.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200">No Listings Found</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                No business listings were found for the searched brands. Try adding local search terms like "near me" or category keywords.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center gap-3">
        <button
          onClick={fetchGoogleMaps}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Run New Analysis
        </button>
        <button
          onClick={deleteCurrentAnalysis}
          className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
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
