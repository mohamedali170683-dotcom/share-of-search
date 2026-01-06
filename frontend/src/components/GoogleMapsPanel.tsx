import { useState, useEffect, useCallback, useMemo } from 'react';

// Location data structure for hierarchical selection
interface LocationOption {
  code: number;
  name: string;
  type: 'country' | 'region' | 'city';
  parent?: number; // parent location code
  coordinates?: { lat: number; lng: number };
}

// Common locations database (DataForSEO location codes)
const LOCATIONS: LocationOption[] = [
  // Countries
  { code: 2840, name: 'United States', type: 'country', coordinates: { lat: 39.8, lng: -98.5 } },
  { code: 2826, name: 'United Kingdom', type: 'country', coordinates: { lat: 54.0, lng: -2.0 } },
  { code: 2124, name: 'Canada', type: 'country', coordinates: { lat: 56.1, lng: -106.3 } },
  { code: 2036, name: 'Australia', type: 'country', coordinates: { lat: -25.3, lng: 133.8 } },
  { code: 2276, name: 'Germany', type: 'country', coordinates: { lat: 51.2, lng: 10.5 } },
  { code: 2250, name: 'France', type: 'country', coordinates: { lat: 46.2, lng: 2.2 } },
  { code: 2724, name: 'Spain', type: 'country', coordinates: { lat: 40.5, lng: -3.7 } },
  { code: 2380, name: 'Italy', type: 'country', coordinates: { lat: 41.9, lng: 12.6 } },
  { code: 2528, name: 'Netherlands', type: 'country', coordinates: { lat: 52.1, lng: 5.3 } },
  { code: 2756, name: 'Switzerland', type: 'country', coordinates: { lat: 46.8, lng: 8.2 } },

  // US States/Regions
  { code: 21137, name: 'California', type: 'region', parent: 2840, coordinates: { lat: 36.8, lng: -119.4 } },
  { code: 21167, name: 'Texas', type: 'region', parent: 2840, coordinates: { lat: 31.0, lng: -100.0 } },
  { code: 21142, name: 'Florida', type: 'region', parent: 2840, coordinates: { lat: 27.7, lng: -81.7 } },
  { code: 21174, name: 'New York', type: 'region', parent: 2840, coordinates: { lat: 43.0, lng: -75.5 } },
  { code: 21148, name: 'Illinois', type: 'region', parent: 2840, coordinates: { lat: 40.6, lng: -89.2 } },
  { code: 21159, name: 'Massachusetts', type: 'region', parent: 2840, coordinates: { lat: 42.4, lng: -71.4 } },
  { code: 21176, name: 'Washington', type: 'region', parent: 2840, coordinates: { lat: 47.8, lng: -120.7 } },
  { code: 21139, name: 'Colorado', type: 'region', parent: 2840, coordinates: { lat: 39.0, lng: -105.8 } },
  { code: 21145, name: 'Georgia', type: 'region', parent: 2840, coordinates: { lat: 32.2, lng: -83.4 } },
  { code: 21133, name: 'Arizona', type: 'region', parent: 2840, coordinates: { lat: 34.0, lng: -111.1 } },

  // UK Regions
  { code: 20339, name: 'England', type: 'region', parent: 2826, coordinates: { lat: 52.4, lng: -1.2 } },
  { code: 20362, name: 'Scotland', type: 'region', parent: 2826, coordinates: { lat: 56.5, lng: -4.2 } },
  { code: 20379, name: 'Wales', type: 'region', parent: 2826, coordinates: { lat: 52.1, lng: -3.8 } },

  // US Cities
  { code: 1014221, name: 'New York City', type: 'city', parent: 21174, coordinates: { lat: 40.7, lng: -74.0 } },
  { code: 1014218, name: 'Los Angeles', type: 'city', parent: 21137, coordinates: { lat: 34.1, lng: -118.2 } },
  { code: 1014211, name: 'Chicago', type: 'city', parent: 21148, coordinates: { lat: 41.9, lng: -87.6 } },
  { code: 1014231, name: 'Houston', type: 'city', parent: 21167, coordinates: { lat: 29.8, lng: -95.4 } },
  { code: 1014226, name: 'Phoenix', type: 'city', parent: 21133, coordinates: { lat: 33.4, lng: -112.1 } },
  { code: 1014227, name: 'San Francisco', type: 'city', parent: 21137, coordinates: { lat: 37.8, lng: -122.4 } },
  { code: 1014217, name: 'Miami', type: 'city', parent: 21142, coordinates: { lat: 25.8, lng: -80.2 } },
  { code: 1014204, name: 'Boston', type: 'city', parent: 21159, coordinates: { lat: 42.4, lng: -71.1 } },
  { code: 1014238, name: 'Seattle', type: 'city', parent: 21176, coordinates: { lat: 47.6, lng: -122.3 } },
  { code: 1014210, name: 'Denver', type: 'city', parent: 21139, coordinates: { lat: 39.7, lng: -105.0 } },
  { code: 1014200, name: 'Atlanta', type: 'city', parent: 21145, coordinates: { lat: 33.7, lng: -84.4 } },
  { code: 1014207, name: 'Dallas', type: 'city', parent: 21167, coordinates: { lat: 32.8, lng: -96.8 } },
  { code: 1014237, name: 'San Diego', type: 'city', parent: 21137, coordinates: { lat: 32.7, lng: -117.2 } },

  // UK Cities
  { code: 1006886, name: 'London', type: 'city', parent: 20339, coordinates: { lat: 51.5, lng: -0.1 } },
  { code: 1006912, name: 'Manchester', type: 'city', parent: 20339, coordinates: { lat: 53.5, lng: -2.2 } },
  { code: 1006893, name: 'Birmingham', type: 'city', parent: 20339, coordinates: { lat: 52.5, lng: -1.9 } },
  { code: 1006883, name: 'Edinburgh', type: 'city', parent: 20362, coordinates: { lat: 55.95, lng: -3.2 } },
  { code: 1006884, name: 'Glasgow', type: 'city', parent: 20362, coordinates: { lat: 55.9, lng: -4.3 } },

  // Canadian Cities
  { code: 1002293, name: 'Toronto', type: 'city', parent: 2124, coordinates: { lat: 43.7, lng: -79.4 } },
  { code: 1002287, name: 'Vancouver', type: 'city', parent: 2124, coordinates: { lat: 49.3, lng: -123.1 } },
  { code: 1002286, name: 'Montreal', type: 'city', parent: 2124, coordinates: { lat: 45.5, lng: -73.6 } },

  // Australian Cities
  { code: 1000286, name: 'Sydney', type: 'city', parent: 2036, coordinates: { lat: -33.9, lng: 151.2 } },
  { code: 1000282, name: 'Melbourne', type: 'city', parent: 2036, coordinates: { lat: -37.8, lng: 145.0 } },
  { code: 1000275, name: 'Brisbane', type: 'city', parent: 2036, coordinates: { lat: -27.5, lng: 153.0 } },

  // German Cities
  { code: 1003854, name: 'Berlin', type: 'city', parent: 2276, coordinates: { lat: 52.5, lng: 13.4 } },
  { code: 1003883, name: 'Munich', type: 'city', parent: 2276, coordinates: { lat: 48.1, lng: 11.6 } },
  { code: 1003863, name: 'Frankfurt', type: 'city', parent: 2276, coordinates: { lat: 50.1, lng: 8.7 } },
  { code: 1003873, name: 'Hamburg', type: 'city', parent: 2276, coordinates: { lat: 53.6, lng: 10.0 } },
];

// Mock Google Maps Search Result Card Component
function MockSearchResultCard({
  result,
  isYourBrand,
  isCompetitor
}: {
  result: { title: string; rating?: number; ratingCount?: number; address?: string };
  isYourBrand: boolean;
  isCompetitor: string | null;
}) {
  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${
      isYourBrand
        ? 'border-green-400 bg-green-50 dark:bg-green-900/30 ring-2 ring-green-400'
        : isCompetitor
          ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/20'
          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
    }`}>
      {/* Placeholder image */}
      <div className="w-20 h-20 bg-gray-300 dark:bg-gray-600 rounded-lg flex-shrink-0 flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={`font-medium text-sm truncate ${isYourBrand ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
            {result.title}
          </h4>
          {isYourBrand && (
            <span className="text-xs px-1.5 py-0.5 bg-green-500 text-white rounded flex-shrink-0">You</span>
          )}
          {isCompetitor && (
            <span className="text-xs px-1.5 py-0.5 bg-orange-500 text-white rounded flex-shrink-0">{isCompetitor}</span>
          )}
        </div>
        {result.rating && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-sm font-medium text-gray-900 dark:text-white">{result.rating.toFixed(1)}</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-3 h-3 ${star <= Math.round(result.rating!) ? 'text-yellow-400' : 'text-gray-300'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            {result.ratingCount && (
              <span className="text-xs text-gray-500">({result.ratingCount.toLocaleString()})</span>
            )}
          </div>
        )}
        {result.address && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{result.address}</p>
        )}
        <div className="flex gap-2 mt-2">
          <span className="text-xs text-blue-600 dark:text-blue-400">Directions</span>
          <span className="text-xs text-blue-600 dark:text-blue-400">Website</span>
        </div>
      </div>
    </div>
  );
}

// Search Simulation Component - Shows what users see on Google Maps
function SearchSimulation({
  results,
  brandName,
  locationName
}: {
  results: Array<{
    keyword: string;
    yourBrandAppears: boolean;
    yourBrandRank: number | null;
    topResults: Array<{
      rank: number;
      title: string;
      rating?: number;
      ratingCount?: number;
      address?: string;
      isYourBrand: boolean;
      isCompetitor: string | null;
    }>;
  }>;
  brandName: string;
  locationName?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % results.length);
  }, [results.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + results.length) % results.length);
  }, [results.length]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(goNext, 3000);
    return () => clearInterval(interval);
  }, [isPlaying, goNext]);

  if (results.length === 0) return null;

  const currentResult = results[currentIndex];

  return (
    <div className="bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600">
      {/* Mock Browser/App Header */}
      <div className="bg-white dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-1.5 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-sm text-gray-600 dark:text-gray-300">{currentResult.keyword}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span className="text-xs text-gray-500">Google Maps</span>
          </div>
        </div>
      </div>

      {/* Location Banner */}
      {locationName && (
        <div className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{locationName}</span>
        </div>
      )}

      {/* Results Status Banner */}
      <div className={`px-4 py-2 text-sm font-medium ${
        currentResult.yourBrandAppears
          ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
          : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
      }`}>
        {currentResult.yourBrandAppears
          ? `✓ ${brandName} appears at position #${currentResult.yourBrandRank}`
          : `✗ ${brandName} not found in top results`}
      </div>

      {/* Mock Map + Results Layout */}
      <div className="flex">
        {/* Results Panel */}
        <div className="w-full md:w-1/2 p-4 space-y-2 bg-white dark:bg-gray-800 max-h-80 overflow-y-auto">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Top {currentResult.topResults.length} results for "{currentResult.keyword}"
          </p>
          {currentResult.topResults.map((result, idx) => (
            <MockSearchResultCard
              key={idx}
              result={result}
              isYourBrand={result.isYourBrand}
              isCompetitor={result.isCompetitor}
            />
          ))}
        </div>

        {/* Mock Map */}
        <div className="hidden md:block w-1/2 bg-green-100 dark:bg-green-900/30 relative min-h-80">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p className="text-sm text-green-700 dark:text-green-300">Map View</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {currentResult.topResults.length} locations shown
              </p>
            </div>
          </div>
          {/* Map pins */}
          {currentResult.topResults.slice(0, 4).map((result, idx) => (
            <div
              key={idx}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
                result.isYourBrand ? 'z-10' : ''
              }`}
              style={{
                left: `${25 + (idx % 2) * 50}%`,
                top: `${25 + Math.floor(idx / 2) * 50}%`
              }}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
                result.isYourBrand
                  ? 'bg-green-500 text-white ring-2 ring-green-300'
                  : result.isCompetitor
                    ? 'bg-orange-500 text-white'
                    : 'bg-red-500 text-white'
              }`}>
                {idx + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <button
          onClick={goPrev}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-4">
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {results.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'bg-blue-500 w-4'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-lg ${isPlaying ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        </div>

        <button
          onClick={goNext}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Search counter */}
      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400">
        Search {currentIndex + 1} of {results.length} •
        <span className="text-green-600 dark:text-green-400 ml-1">
          {results.filter(r => r.yourBrandAppears).length} found
        </span>
        <span className="mx-1">•</span>
        <span className="text-red-600 dark:text-red-400">
          {results.filter(r => !r.yourBrandAppears).length} not found
        </span>
      </div>
    </div>
  );
}

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

interface CategorySearchResult {
  keyword: string;
  totalResults: number;
  yourBrandAppears: boolean;
  yourBrandRank: number | null;
  competitorAppearances: { name: string; rank: number }[];
  // Top results for transparency
  topResults: {
    rank: number;
    title: string;
    rating?: number;
    ratingCount?: number;
    address?: string;
    isYourBrand: boolean;
    isCompetitor: string | null;
  }[];
}

// Reputation comparison data
interface ReputationData {
  brandName: string;
  avgRating: number;
  totalReviews: number;
  totalLocations: number;
  ratingDistribution: {
    star5Percent: number;
    star4Percent: number;
    star3Percent: number;
    star2Percent: number;
    star1Percent: number;
  };
}

interface GoogleMapsResponse {
  yourBrand: BrandLocalData | null;
  competitors: BrandLocalData[];
  allListings: BusinessListing[];
  sov: {
    byListings: number;
    byReviews: number;
  };
  categoryVisibility?: {
    searchTerms: string[];
    results: CategorySearchResult[];
    brandAppearanceRate: number;
    avgRankWhenAppearing: number | null;
  };
  reputationComparison?: {
    brands: ReputationData[];
    insights: {
      highestRated: string;
      mostReviewed: string;
      yourRatingVsAvg: number;
    };
  };
  searchedKeywords: string[];
  location: string;
  timestamp: string;
  methodology?: {
    presenceFormula: string;
    reviewShareFormula: string;
    categoryVisibilityFormula?: string;
    reputationFormula?: string;
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
  industry?: string;
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

// Brand type: 'manufacturer' = makes products sold by others, 'retailer' = has physical locations
type BrandType = 'manufacturer' | 'retailer';

interface BrandInfo {
  industry: string;
  type: BrandType;
}

// Known brand-to-industry mappings for common brands
const BRAND_INDUSTRY_MAP: Record<string, BrandInfo> = {
  // Tire MANUFACTURERS (make tires, sold through dealers)
  'continental': { industry: 'tires', type: 'manufacturer' },
  'michelin': { industry: 'tires', type: 'manufacturer' },
  'bridgestone': { industry: 'tires', type: 'manufacturer' },
  'goodyear': { industry: 'tires', type: 'manufacturer' },
  'pirelli': { industry: 'tires', type: 'manufacturer' },
  'dunlop': { industry: 'tires', type: 'manufacturer' },
  'hankook': { industry: 'tires', type: 'manufacturer' },
  'yokohama': { industry: 'tires', type: 'manufacturer' },
  'cooper': { industry: 'tires', type: 'manufacturer' },
  'toyo': { industry: 'tires', type: 'manufacturer' },
  'bfgoodrich': { industry: 'tires', type: 'manufacturer' },
  'kumho': { industry: 'tires', type: 'manufacturer' },
  'falken': { industry: 'tires', type: 'manufacturer' },
  'nexen': { industry: 'tires', type: 'manufacturer' },
  // Tire RETAILERS (have physical stores)
  'firestone': { industry: 'tires', type: 'retailer' },
  'discount tire': { industry: 'tires', type: 'retailer' },
  'tire rack': { industry: 'tires', type: 'retailer' },
  'big o tires': { industry: 'tires', type: 'retailer' },
  'les schwab': { industry: 'tires', type: 'retailer' },
  // Auto brands (dealers)
  'toyota': { industry: 'auto dealer', type: 'retailer' },
  'honda': { industry: 'auto dealer', type: 'retailer' },
  'ford': { industry: 'auto dealer', type: 'retailer' },
  'chevrolet': { industry: 'auto dealer', type: 'retailer' },
  'bmw': { industry: 'auto dealer', type: 'retailer' },
  'mercedes': { industry: 'auto dealer', type: 'retailer' },
  'audi': { industry: 'auto dealer', type: 'retailer' },
  'volkswagen': { industry: 'auto dealer', type: 'retailer' },
  'nissan': { industry: 'auto dealer', type: 'retailer' },
  'hyundai': { industry: 'auto dealer', type: 'retailer' },
  // Fast food (retailers with locations)
  'mcdonalds': { industry: 'fast food', type: 'retailer' },
  'burger king': { industry: 'fast food', type: 'retailer' },
  'wendys': { industry: 'fast food', type: 'retailer' },
  'kfc': { industry: 'fast food', type: 'retailer' },
  'subway': { industry: 'fast food', type: 'retailer' },
  'dominos': { industry: 'pizza', type: 'retailer' },
  'pizza hut': { industry: 'pizza', type: 'retailer' },
  'papa johns': { industry: 'pizza', type: 'retailer' },
  // Coffee (retailers)
  'starbucks': { industry: 'coffee shop', type: 'retailer' },
  'dunkin': { industry: 'coffee shop', type: 'retailer' },
  // Hotels (retailers)
  'marriott': { industry: 'hotel', type: 'retailer' },
  'hilton': { industry: 'hotel', type: 'retailer' },
  'hyatt': { industry: 'hotel', type: 'retailer' },
  'holiday inn': { industry: 'hotel', type: 'retailer' },
};

interface InferredBrandInfo {
  industry: string;
  type: BrandType;
}

// Infer industry and brand type from brand name and competitors
function inferBrandInfo(brandName: string, competitors: string[], providedIndustry?: string): InferredBrandInfo {
  const allBrands = [brandName, ...competitors].map(b => b.toLowerCase().trim());

  // Check each brand against our known mappings (prioritize main brand)
  for (const brand of allBrands) {
    for (const [knownBrand, info] of Object.entries(BRAND_INDUSTRY_MAP)) {
      if (brand.includes(knownBrand) || knownBrand.includes(brand)) {
        return info;
      }
    }
  }

  // If a valid industry is provided (not "General"), use it with default retailer type
  if (providedIndustry && providedIndustry.toLowerCase() !== 'general') {
    return { industry: providedIndustry, type: 'retailer' };
  }

  // Keyword-based detection from brand names
  const combinedText = allBrands.join(' ');

  if (/tire|tyre|wheel|rim/i.test(combinedText)) return { industry: 'tires', type: 'manufacturer' };
  if (/auto|car|vehicle|motor|dealer/i.test(combinedText)) return { industry: 'auto service', type: 'retailer' };
  if (/pizza|burger|food|restaurant|cafe|diner/i.test(combinedText)) return { industry: 'restaurant', type: 'retailer' };
  if (/hotel|inn|resort|lodge|motel/i.test(combinedText)) return { industry: 'hotel', type: 'retailer' };
  if (/bank|credit|finance|loan/i.test(combinedText)) return { industry: 'banking', type: 'retailer' };
  if (/insurance|insure/i.test(combinedText)) return { industry: 'insurance', type: 'retailer' };
  if (/dental|dentist|orthodont/i.test(combinedText)) return { industry: 'dentist', type: 'retailer' };
  if (/doctor|medical|clinic|health/i.test(combinedText)) return { industry: 'medical clinic', type: 'retailer' };
  if (/gym|fitness|workout/i.test(combinedText)) return { industry: 'gym', type: 'retailer' };
  if (/salon|hair|beauty|spa/i.test(combinedText)) return { industry: 'salon', type: 'retailer' };
  if (/lawyer|attorney|legal/i.test(combinedText)) return { industry: 'lawyer', type: 'retailer' };
  if (/plumb|electric|hvac|contractor/i.test(combinedText)) return { industry: 'home services', type: 'retailer' };
  if (/real estate|realtor|property/i.test(combinedText)) return { industry: 'real estate', type: 'retailer' };

  // Fallback - return empty to indicate we couldn't detect
  return { industry: '', type: 'retailer' };
}

// Generate default search terms based on industry and brand type
function generateDefaultSearchTerms(industry: string, brandType: BrandType, brandName: string): string[] {
  if (!industry || industry.toLowerCase() === 'general') {
    return []; // Don't generate useless terms
  }

  const industryLower = industry.toLowerCase();
  const brandLower = brandName.toLowerCase();
  const terms: string[] = [];

  // For MANUFACTURERS: search for "[brand] dealer/authorized" rather than generic category
  if (brandType === 'manufacturer') {
    if (industryLower.includes('tire')) {
      terms.push(`${brandLower} tires dealer`);
      terms.push(`${brandLower} tires near me`);
      terms.push(`buy ${brandLower} tires`);
      terms.push(`${brandLower} authorized dealer`);
    } else {
      // Generic manufacturer terms
      terms.push(`${brandLower} dealer near me`);
      terms.push(`${brandLower} authorized dealer`);
      terms.push(`buy ${brandLower}`);
      terms.push(`${brandLower} store`);
    }
    return terms.slice(0, 4);
  }

  // For RETAILERS: use category-based searches
  if (industryLower.includes('tire')) {
    terms.push('tire shop near me');
    terms.push('best tire shop');
    terms.push('tire installation');
    terms.push('tire repair near me');
  } else if (industryLower.includes('auto') || industryLower.includes('car') || industryLower.includes('dealer')) {
    terms.push('auto repair near me');
    terms.push('car dealer near me');
    terms.push('auto service');
    terms.push('car maintenance');
  } else if (industryLower.includes('pizza')) {
    terms.push('pizza near me');
    terms.push('best pizza');
    terms.push('pizza delivery');
    terms.push('pizza takeout');
  } else if (industryLower.includes('restaurant') || industryLower.includes('food')) {
    terms.push('restaurants near me');
    terms.push('best restaurants');
    terms.push('food delivery');
    terms.push('takeout near me');
  } else if (industryLower.includes('hotel')) {
    terms.push('hotels near me');
    terms.push('best hotels');
    terms.push('hotel deals');
    terms.push('cheap hotels');
  } else if (industryLower.includes('coffee')) {
    terms.push('coffee shop near me');
    terms.push('best coffee');
    terms.push('cafe near me');
    terms.push('coffee delivery');
  } else if (industryLower.includes('dentist') || industryLower.includes('dental')) {
    terms.push('dentist near me');
    terms.push('best dentist');
    terms.push('dental clinic');
    terms.push('emergency dentist');
  } else if (industryLower.includes('gym') || industryLower.includes('fitness')) {
    terms.push('gym near me');
    terms.push('best gym');
    terms.push('fitness center');
    terms.push('24 hour gym');
  } else if (industryLower.includes('salon') || industryLower.includes('hair')) {
    terms.push('hair salon near me');
    terms.push('best salon');
    terms.push('haircut near me');
    terms.push('beauty salon');
  } else if (industryLower.includes('lawyer') || industryLower.includes('attorney')) {
    terms.push('lawyer near me');
    terms.push('best lawyer');
    terms.push('attorney near me');
    terms.push('law firm');
  } else if (industryLower.includes('bank')) {
    terms.push('bank near me');
    terms.push('best bank');
    terms.push('atm near me');
    terms.push('credit union');
  } else {
    // Generic but still useful
    terms.push(`${industryLower} near me`);
    terms.push(`best ${industryLower}`);
    terms.push(`${industryLower} services`);
    terms.push(`top ${industryLower}`);
  }

  return terms.slice(0, 4);
}

export function GoogleMapsPanel({ brandName, competitors, locationCode = 2840, languageCode = 'en', industry }: GoogleMapsPanelProps) {
  // Infer the actual industry and brand type from brand/competitors
  const brandInfo = inferBrandInfo(brandName, competitors, industry);
  const detectedIndustry = brandInfo.industry;
  const brandType = brandInfo.type;

  const [data, setData] = useState<GoogleMapsResponse | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Insights
  const [insights, setInsights] = useState<LocalInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Custom search terms - initialize with industry-based defaults
  const [searchTerms, setSearchTerms] = useState<string[]>(() => {
    if (detectedIndustry) {
      return generateDefaultSearchTerms(detectedIndustry, brandType, brandName);
    }
    return [];
  });
  const [newSearchTerm, setNewSearchTerm] = useState('');
  const [showSearchTermInput, setShowSearchTermInput] = useState(false);
  const [hasInitializedTerms, setHasInitializedTerms] = useState(false);

  // Keyword suggestions
  const [keywordSuggestions, setKeywordSuggestions] = useState<{ keyword: string; searchVolume: number }[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [industryKeyword, setIndustryKeyword] = useState(detectedIndustry || '');

  // Location selection state
  const [selectedCountry, setSelectedCountry] = useState<number>(locationCode);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [selectedCity, setSelectedCity] = useState<number | null>(null);

  // Computed location values
  const countries = useMemo(() => LOCATIONS.filter(l => l.type === 'country'), []);
  const regions = useMemo(() =>
    LOCATIONS.filter(l => l.type === 'region' && l.parent === selectedCountry),
    [selectedCountry]
  );
  const cities = useMemo(() => {
    if (selectedRegion) {
      return LOCATIONS.filter(l => l.type === 'city' && l.parent === selectedRegion);
    }
    // If no region selected, show cities directly under the country
    return LOCATIONS.filter(l => l.type === 'city' && {
      2840: [21137, 21167, 21142, 21174, 21148, 21159, 21176, 21139, 21145, 21133], // US states
      2826: [20339, 20362, 20379], // UK regions
    }[selectedCountry]?.includes(l.parent as number));
  }, [selectedCountry, selectedRegion]);

  // Get the effective location code for API calls
  const effectiveLocationCode = selectedCity || selectedRegion || selectedCountry;

  // Get the full location name for display
  const selectedLocationName = useMemo(() => {
    const parts: string[] = [];
    if (selectedCity) {
      const city = LOCATIONS.find(l => l.code === selectedCity);
      if (city) parts.push(city.name);
    }
    if (selectedRegion) {
      const region = LOCATIONS.find(l => l.code === selectedRegion);
      if (region) parts.push(region.name);
    }
    const country = LOCATIONS.find(l => l.code === selectedCountry);
    if (country) parts.push(country.name);
    return parts.join(', ');
  }, [selectedCountry, selectedRegion, selectedCity]);

  // Initialize search terms when detected industry changes (only once)
  useEffect(() => {
    if (detectedIndustry && !hasInitializedTerms && searchTerms.length === 0) {
      setSearchTerms(generateDefaultSearchTerms(detectedIndustry, brandType, brandName));
      setIndustryKeyword(detectedIndustry);
      setHasInitializedTerms(true);
    }
  }, [detectedIndustry, brandType, brandName, hasInitializedTerms, searchTerms.length]);

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
          locationCode: effectiveLocationCode,
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
    if (newSearchTerm.trim() && searchTerms.length < 5) {
      setSearchTerms([...searchTerms, newSearchTerm.trim()]);
      setNewSearchTerm('');
      setShowSearchTermInput(false);
    }
  };

  const removeSearchTerm = (term: string) => {
    setSearchTerms(searchTerms.filter(t => t !== term));
  };

  const fetchKeywordSuggestions = async (seedKeyword: string) => {
    if (!seedKeyword.trim()) return;

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch('/api/keyword-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedKeyword: seedKeyword.trim(),
          locationCode: effectiveLocationCode,
          languageCode,
          includeLocalModifiers: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const result = await response.json();
      setKeywordSuggestions(result.suggestions || []);
    } catch (err) {
      console.error('Failed to fetch keyword suggestions:', err);
      setKeywordSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const addSuggestedKeyword = (keyword: string) => {
    if (searchTerms.length < 5 && !searchTerms.includes(keyword)) {
      setSearchTerms([...searchTerms, keyword]);
    }
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

  // Location selector JSX
  const locationSelectorJSX = (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl shadow-sm p-6 border border-emerald-200 dark:border-emerald-800 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
        <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
        Search Location
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Select where to search. More specific locations give more relevant local results.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Country selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Country
          </label>
          <select
            value={selectedCountry}
            onChange={(e) => {
              setSelectedCountry(Number(e.target.value));
              setSelectedRegion(null);
              setSelectedCity(null);
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        {/* Region selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Region / State
          </label>
          <select
            value={selectedRegion || ''}
            onChange={(e) => {
              setSelectedRegion(e.target.value ? Number(e.target.value) : null);
              setSelectedCity(null);
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">All regions</option>
            {regions.map((region) => (
              <option key={region.code} value={region.code}>
                {region.name}
              </option>
            ))}
          </select>
        </div>

        {/* City selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            City
          </label>
          <select
            value={selectedCity || ''}
            onChange={(e) => {
              setSelectedCity(e.target.value ? Number(e.target.value) : null);
            }}
            disabled={cities.length === 0}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
          >
            <option value="">All cities</option>
            {cities.map((city) => (
              <option key={city.code} value={city.code}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected location display */}
      <div className="mt-4 flex items-center gap-2 text-sm">
        <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
        <span className="text-gray-600 dark:text-gray-300">Searching in:</span>
        <span className="font-medium text-emerald-700 dark:text-emerald-300">{selectedLocationName}</span>
      </div>
    </div>
  );

  // Category search terms setup JSX - rendered inline to avoid re-mount issues
  const categorySearchSetupJSX = (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl shadow-sm p-6 border border-blue-200 dark:border-blue-800 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {brandType === 'manufacturer' ? 'Dealer/Distributor Search Terms' : 'Category Search Terms'}
        {detectedIndustry && (
          <span className="text-xs font-normal px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full">
            {detectedIndustry} ({brandType})
          </span>
        )}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
        {brandType === 'manufacturer' ? (
          <><strong>Question answered:</strong> When someone searches for where to buy your products, do dealers appear?</>
        ) : (
          <><strong>Question answered:</strong> When someone searches for your service, do you show up?</>
        )}
      </p>
      {brandType === 'manufacturer' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 text-sm text-amber-700 dark:text-amber-300">
          <strong>Note:</strong> As a {detectedIndustry} manufacturer, {brandName} doesn't have retail stores.
          We're searching for dealers/distributors that carry your products. This measures your distribution visibility.
        </div>
      )}

      {/* Keyword Suggestions Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-blue-100 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Get more keyword suggestions based on your industry:
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={industryKeyword}
            onChange={(e) => setIndustryKeyword(e.target.value)}
            placeholder="Enter industry keyword (e.g., tires, pizza, dentist)"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                fetchKeywordSuggestions(industryKeyword);
              }
            }}
          />
          <button
            onClick={() => fetchKeywordSuggestions(industryKeyword)}
            disabled={isLoadingSuggestions || !industryKeyword.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoadingSuggestions ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Suggest Keywords
              </>
            )}
          </button>
        </div>

        {/* Display suggestions */}
        {keywordSuggestions.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Click to add (sorted by search volume):</p>
            <div className="flex flex-wrap gap-2">
              {keywordSuggestions.map((suggestion) => (
                <button
                  key={suggestion.keyword}
                  onClick={() => addSuggestedKeyword(suggestion.keyword)}
                  disabled={searchTerms.includes(suggestion.keyword) || searchTerms.length >= 5}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    searchTerms.includes(suggestion.keyword)
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 cursor-not-allowed'
                      : searchTerms.length >= 5
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 cursor-pointer'
                  }`}
                >
                  {suggestion.keyword}
                  {suggestion.searchVolume > 0 && (
                    <span className="ml-1 text-indigo-500 dark:text-indigo-400">
                      ({formatNumber(suggestion.searchVolume)}/mo)
                    </span>
                  )}
                  {searchTerms.includes(suggestion.keyword) && ' ✓'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected terms */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Selected search terms ({searchTerms.length}/5):
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {searchTerms.map((term) => (
          <span
            key={term}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-sm"
          >
            {term}
            <button
              onClick={() => removeSearchTerm(term)}
              className="ml-1 text-blue-600 hover:text-red-600 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        {searchTerms.length === 0 && (
          <span className="text-sm text-gray-400 dark:text-gray-500 italic">No terms selected</span>
        )}
      </div>

      {/* Manual add option */}
      {showSearchTermInput ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newSearchTerm}
            onChange={(e) => setNewSearchTerm(e.target.value)}
            placeholder="Or type custom term..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSearchTerm();
              }
            }}
          />
          <button
            onClick={addSearchTerm}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
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
          disabled={searchTerms.length >= 5}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add custom term ({5 - searchTerms.length} remaining)
        </button>
      )}
    </div>
  );

  // Initial state - show fetch button
  if (!data && !isLoading && !error) {
    return (
      <div className="space-y-6">
        {/* What We Measure Explanation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            Google Maps Analysis
          </h3>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Category Visibility */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">Category Visibility</h4>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                <strong>Question:</strong> When customers search for your service, do you appear?
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Example: "tire shop near me", "auto repair"
              </p>
            </div>

            {/* Local Footprint */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h4 className="font-semibold text-green-800 dark:text-green-200">Local Footprint</h4>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                <strong>Question:</strong> How many locations do you have vs competitors?
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Measures your presence + customer engagement (reviews)
              </p>
            </div>
          </div>
        </div>

        {/* Location Selection */}
        {locationSelectorJSX}

        {/* Category Search Setup */}
        {categorySearchSetupJSX}

        {/* Run Analysis Button */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <button
            onClick={fetchGoogleMaps}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            Analyze Local Presence
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            {searchTerms.length > 0
              ? `Will analyze: Brand searches + ${searchTerms.length} category search${searchTerms.length !== 1 ? 'es' : ''}`
              : 'Will analyze: Brand searches only (add category terms for full visibility analysis)'
            }
          </p>
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

  return (
    <div className="space-y-6">
      {/* Analysis timestamp */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>Analysis from: {formatDateTime(data.timestamp)}</span>
        <span>Location: {data.location}</span>
      </div>

      {/* ============================================ */}
      {/* SECTION 1: CATEGORY/DEALER VISIBILITY */}
      {/* ============================================ */}
      {data.categoryVisibility && data.categoryVisibility.searchTerms.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-50 dark:bg-blue-900/30 px-6 py-4 border-b border-blue-100 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              🔍 {brandType === 'manufacturer' ? 'Dealer/Distributor Visibility' : 'Category Visibility'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {brandType === 'manufacturer'
                ? `When customers search for where to buy ${brandName}, do dealers appear?`
                : 'When customers search for your service, do you show up?'}
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700">
            <div className="p-4 text-center">
              <p className={`text-3xl font-bold ${
                data.categoryVisibility.brandAppearanceRate >= 50 ? 'text-green-600' :
                data.categoryVisibility.brandAppearanceRate >= 25 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {data.categoryVisibility.brandAppearanceRate}%
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Visibility Rate</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {data.categoryVisibility.avgRankWhenAppearing ? `#${data.categoryVisibility.avgRankWhenAppearing}` : '—'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Rank</p>
            </div>
          </div>

          {/* Visual Search Simulation */}
          <div className="p-4">
            <SearchSimulation
              results={data.categoryVisibility.results}
              brandName={brandName}
              locationName={selectedLocationName}
            />
          </div>

          {/* Quick Summary Table */}
          <div className="border-t border-gray-200 dark:border-gray-700">
            <details className="group">
              <summary className="px-4 py-3 cursor-pointer list-none flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  View all {data.categoryVisibility.results.length} search results
                </span>
                <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.categoryVisibility.results.map((result) => (
                    <div
                      key={result.keyword}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        result.yourBrandAppears
                          ? 'bg-green-50 dark:bg-green-900/30'
                          : 'bg-gray-50 dark:bg-gray-700/50'
                      }`}
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{result.keyword}</span>
                      <span className={`text-sm font-medium ml-2 ${
                        result.yourBrandAppears
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-400'
                      }`}>
                        {result.yourBrandAppears ? `#${result.yourBrandRank}` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </div>

          {/* Formula */}
          {data.methodology?.categoryVisibilityFormula && (
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
              <details className="text-xs">
                <summary className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                  How is this calculated?
                </summary>
                <p className="mt-2 text-gray-600 dark:text-gray-400">{data.methodology.categoryVisibilityFormula}</p>
              </details>
            </div>
          )}
        </div>
      )}

      {/* No category terms notice */}
      {(!data.categoryVisibility || data.categoryVisibility.searchTerms.length === 0) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Category Visibility Not Measured</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Add category search terms (e.g., "tire shop near me") to measure if customers find you when searching for your service.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SECTION 2: REPUTATION COMPARISON */}
      {/* ============================================ */}
      {data.reputationComparison && data.reputationComparison.brands.length > 0 && (() => {
        const maxReviewsRep = Math.max(...data.reputationComparison.brands.map(b => b.totalReviews), 1);
        const maxLocations = Math.max(...data.reputationComparison.brands.map(b => b.totalLocations), 1);

        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="bg-yellow-50 dark:bg-yellow-900/30 px-6 py-4 border-b border-yellow-100 dark:border-yellow-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                ⭐ Reputation Comparison
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                How do customer ratings and reviews compare across brands?
              </p>
            </div>

            {/* Winner Badges */}
            <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">🏆 Highest Rated</p>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{data.reputationComparison.insights.highestRated}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">💬 Most Reviewed</p>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{data.reputationComparison.insights.mostReviewed}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">📊 You vs Avg</p>
                <p className={`font-semibold text-sm ${data.reputationComparison.insights.yourRatingVsAvg >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.reputationComparison.insights.yourRatingVsAvg >= 0 ? '+' : ''}{data.reputationComparison.insights.yourRatingVsAvg.toFixed(1)} stars
                </p>
              </div>
            </div>

            {/* Brand Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Brand</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rating</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reviews</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Locations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.reputationComparison.brands
                    .sort((a, b) => b.avgRating - a.avgRating)
                    .map((brand, idx) => {
                      const isYourBrand = brand.brandName.toLowerCase() === brandName.toLowerCase();
                      const reviewPercent = (brand.totalReviews / maxReviewsRep) * 100;
                      const locationPercent = (brand.totalLocations / maxLocations) * 100;

                      return (
                        <tr key={brand.brandName} className={isYourBrand ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                                idx === 1 ? 'bg-gray-300 text-gray-700' :
                                idx === 2 ? 'bg-amber-600 text-white' :
                                'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                              }`}>
                                {idx + 1}
                              </span>
                              <span className={`font-medium ${isYourBrand ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                                {brand.brandName}
                              </span>
                              {isYourBrand && (
                                <span className="text-xs px-1.5 py-0.5 bg-green-500 text-white rounded">You</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-lg font-bold text-yellow-600">{brand.avgRating.toFixed(1)}</span>
                            <span className="text-yellow-500 ml-0.5">★</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isYourBrand ? 'bg-green-500' : 'bg-purple-500'}`}
                                  style={{ width: `${reviewPercent}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600 dark:text-gray-400 w-16 text-right">{formatNumber(brand.totalReviews)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isYourBrand ? 'bg-green-500' : 'bg-blue-500'}`}
                                  style={{ width: `${locationPercent}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600 dark:text-gray-400 w-8 text-right">{brand.totalLocations}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Methodology */}
            {data.methodology?.reputationFormula && (
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                <details className="text-xs">
                  <summary className="text-yellow-600 dark:text-yellow-400 cursor-pointer hover:underline">
                    How is this calculated?
                  </summary>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">{data.methodology.reputationFormula}</p>
                </details>
              </div>
            )}
          </div>
        );
      })()}

      {/* ============================================ */}
      {/* SECTION 3: LOCAL FOOTPRINT */}
      {/* ============================================ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-green-50 dark:bg-green-900/30 px-6 py-4 border-b border-green-100 dark:border-green-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            📍 Local Footprint
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            How many locations do you have vs competitors?
          </p>
        </div>

        {/* Market Share Summary */}
        <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700">
          <div className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{data.sov.byListings}%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Location Share</p>
            <p className="text-xs text-gray-400 mt-1">
              {data.yourBrand?.totalListings || 0} of {(data.yourBrand?.totalListings || 0) + data.competitors.reduce((sum, c) => sum + c.totalListings, 0)} locations
            </p>
          </div>
          <div className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{data.sov.byReviews}%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Review Share</p>
            <p className="text-xs text-gray-400 mt-1">
              {formatNumber(data.yourBrand?.totalReviews || 0)} of {formatNumber((data.yourBrand?.totalReviews || 0) + data.competitors.reduce((sum, c) => sum + c.totalReviews, 0))} reviews
            </p>
          </div>
        </div>

        {/* Brand Comparison List */}
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {allBrands.map((brand) => {
            const isYourBrand = data.yourBrand && brand.name === data.yourBrand.name;
            const maxListings = Math.max(...allBrands.map(b => b.totalListings), 1);
            const listingsPercentage = (brand.totalListings / maxListings) * 100;

            return (
              <div key={brand.name} className={`p-4 ${isYourBrand ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isYourBrand ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                      {brand.name}
                    </span>
                    {isYourBrand && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-500 text-white rounded">You</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-yellow-600 font-medium">{brand.avgRating.toFixed(1)}★</span>
                    <span className="text-gray-500">|</span>
                    <span className="text-gray-600 dark:text-gray-400">{formatNumber(brand.totalReviews)} reviews</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isYourBrand ? 'bg-green-500' : 'bg-gray-400'}`}
                      style={{ width: `${listingsPercentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24 text-right">
                    {brand.totalListings} locations
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Methodology */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
          <details className="text-xs">
            <summary className="text-green-600 dark:text-green-400 cursor-pointer hover:underline">
              How is this calculated?
            </summary>
            <div className="mt-2 space-y-1 text-gray-600 dark:text-gray-400">
              {data.methodology?.presenceFormula && <p>{data.methodology.presenceFormula}</p>}
              {data.methodology?.brandMatchingMethod && <p><strong>Method:</strong> {data.methodology.brandMatchingMethod}</p>}
            </div>
          </details>
        </div>
      </div>

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
