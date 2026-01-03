import { useState, useEffect } from 'react';

interface YouTubeVideo {
  videoId: string;
  title: string;
  url: string;
  channelId: string;
  channelName: string;
  viewsCount: number;
  duration: string;
  publishedDate: string;
  rank: number;
  thumbnail?: string;
  isBrandOwned?: boolean;
  mediaType?: 'owned' | 'earned' | 'unknown';
}

interface BrandYouTubeData {
  name: string;
  videos: YouTubeVideo[];
  totalVideosInTop20: number;
  totalViews: number;
}

interface YouTubeSOVResponse {
  yourBrand: BrandYouTubeData;
  competitors: BrandYouTubeData[];
  allVideos: YouTubeVideo[];
  sov: {
    byCount: number;
    byViews: number;
  };
  searchedKeywords: string[];
  timestamp: string;
  debug?: {
    totalVideosFetched: number;
    apiStatus: string;
  };
}

interface SavedAnalysis {
  id: string;
  brandName: string;
  data: YouTubeSOVResponse;
  createdAt: string;
  channelInfo?: {
    channelId?: string;
    channelName?: string;
  };
}

interface YouTubeSOVPanelProps {
  brandName: string;
  competitors: string[];
  locationCode?: number;
  languageCode?: string;
}

const STORAGE_KEY = 'youtube-sov-analyses';

const CHANNEL_STORAGE_KEY = 'youtube-channel-info';

export function YouTubeSOVPanel({ brandName, competitors, locationCode = 2840, languageCode = 'en' }: YouTubeSOVPanelProps) {
  const [data, setData] = useState<YouTubeSOVResponse | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  // Channel ownership tracking
  const [showChannelInput, setShowChannelInput] = useState(false);
  const [channelInput, setChannelInput] = useState('');
  const [ownedChannelId, setOwnedChannelId] = useState<string | null>(null);
  const [ownedChannelName, setOwnedChannelName] = useState<string | null>(null);

  // Load saved channel info on mount
  useEffect(() => {
    const savedChannel = localStorage.getItem(CHANNEL_STORAGE_KEY);
    if (savedChannel) {
      try {
        const channelInfo = JSON.parse(savedChannel);
        if (channelInfo[brandName.toLowerCase()]) {
          setOwnedChannelId(channelInfo[brandName.toLowerCase()].channelId || null);
          setOwnedChannelName(channelInfo[brandName.toLowerCase()].channelName || null);
        }
      } catch {
        console.error('Failed to load channel info');
      }
    }
  }, [brandName]);

  // Save channel info
  const saveChannelInfo = (channelId: string, channelName: string) => {
    const existing = localStorage.getItem(CHANNEL_STORAGE_KEY);
    const channelInfo = existing ? JSON.parse(existing) : {};
    channelInfo[brandName.toLowerCase()] = { channelId, channelName };
    localStorage.setItem(CHANNEL_STORAGE_KEY, JSON.stringify(channelInfo));
    setOwnedChannelId(channelId);
    setOwnedChannelName(channelName);
  };

  // Extract channel ID from URL or use direct ID
  const parseChannelInput = (input: string): string | null => {
    const trimmed = input.trim();
    // YouTube channel URL patterns
    const patterns = [
      /youtube\.com\/channel\/([^\/\?]+)/,
      /youtube\.com\/@([^\/\?]+)/,
      /youtube\.com\/c\/([^\/\?]+)/,
      /youtube\.com\/user\/([^\/\?]+)/,
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) return match[1];
    }

    // If not a URL, assume it's a direct channel ID or handle
    if (trimmed.startsWith('UC') || trimmed.startsWith('@')) {
      return trimmed;
    }

    return trimmed || null;
  };

  const handleSetChannel = () => {
    const channelId = parseChannelInput(channelInput);
    if (channelId) {
      saveChannelInfo(channelId, channelInput);
      setShowChannelInput(false);
      setChannelInput('');
    }
  };

  const handleClearChannel = () => {
    const existing = localStorage.getItem(CHANNEL_STORAGE_KEY);
    const channelInfo = existing ? JSON.parse(existing) : {};
    delete channelInfo[brandName.toLowerCase()];
    localStorage.setItem(CHANNEL_STORAGE_KEY, JSON.stringify(channelInfo));
    setOwnedChannelId(null);
    setOwnedChannelName(null);
  };

  // Normalize a string for fuzzy matching (remove special chars, spaces, etc.)
  const normalizeForMatch = (str: string): string => {
    return str.toLowerCase()
      .replace(/@/g, '')
      .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
      .trim();
  };

  // Determine if a video is owned media (from brand's channel)
  const getMediaType = (video: YouTubeVideo): 'owned' | 'earned' | 'unknown' => {
    if (!ownedChannelId) return 'unknown';

    const channelIdLower = video.channelId?.toLowerCase() || '';
    const channelNameLower = video.channelName?.toLowerCase() || '';
    const channelNameNormalized = normalizeForMatch(video.channelName || '');
    const ownedIdLower = ownedChannelId.toLowerCase();
    const ownedIdNormalized = normalizeForMatch(ownedChannelId);

    // Match by exact channel ID
    if (channelIdLower === ownedIdLower) return 'owned';

    // Match by channel ID contains
    if (channelIdLower.includes(ownedIdLower) || ownedIdLower.includes(channelIdLower)) return 'owned';

    // Match by normalized channel name (fuzzy match)
    if (channelNameNormalized && ownedIdNormalized) {
      if (channelNameNormalized.includes(ownedIdNormalized) || ownedIdNormalized.includes(channelNameNormalized)) {
        return 'owned';
      }
    }

    // Match by channel name/handle if provided separately
    if (ownedChannelName) {
      const ownedNameNormalized = normalizeForMatch(ownedChannelName);
      if (channelNameNormalized.includes(ownedNameNormalized) || ownedNameNormalized.includes(channelNameNormalized)) {
        return 'owned';
      }
      // Also check raw lowercase match
      const ownedNameLower = ownedChannelName.toLowerCase().replace('@', '');
      if (channelNameLower.includes(ownedNameLower) || ownedNameLower.includes(channelNameLower)) {
        return 'owned';
      }
    }

    return 'earned';
  };

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

  const saveAnalysis = (analysisData: YouTubeSOVResponse) => {
    const newAnalysis: SavedAnalysis = {
      id: `${brandName}-${Date.now()}`,
      brandName,
      data: analysisData,
      createdAt: new Date().toISOString(),
    };

    // Remove old analysis for same brand, keep max 10 analyses
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

    // Clear current data if we deleted the current analysis
    const deleted = savedAnalyses.find(a => a.id === id);
    if (deleted && data && deleted.data.timestamp === data.timestamp) {
      setData(null);
    }
  };

  const loadAnalysis = (analysis: SavedAnalysis) => {
    setData(analysis.data);
  };

  const deleteCurrentAnalysis = () => {
    if (!brandName) return;

    const filtered = savedAnalyses.filter(
      a => a && a.brandName && a.brandName.toLowerCase() !== brandName.toLowerCase()
    );
    setSavedAnalyses(filtered);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    setData(null);
  };

  const fetchYouTubeSOV = async () => {
    if (!brandName) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/youtube-sov', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          competitors: competitors.slice(0, 3),
          locationCode,
          languageCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch YouTube data');
      }

      const result = await response.json();
      setData(result);
      saveAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch YouTube SOV');
    } finally {
      setIsLoading(false);
    }
  };

  const formatViews = (views: number): string => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  // Methodology explanation component
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
          <span className="font-medium text-blue-800 dark:text-blue-200">How is YouTube SOV Calculated?</span>
        </div>
        <svg className={`w-5 h-5 text-blue-600 transition-transform ${showMethodology ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMethodology && (
        <div className="mt-4 space-y-4 text-sm text-blue-800 dark:text-blue-200">
          <div>
            <h4 className="font-semibold mb-2">Share of Search (by Video Count)</h4>
            <p className="text-blue-700 dark:text-blue-300 mb-2">
              Measures how many videos in YouTube search results mention your brand in their title compared to competitors.
            </p>
            <div className="bg-white dark:bg-gray-800 rounded p-3 font-mono text-xs">
              <p>SOS = (Your Brand Videos / Total Identified Brand Videos) × 100</p>
              {data && (
                <p className="mt-2 text-blue-600 dark:text-blue-400">
                  = ({data.yourBrand.totalVideosInTop20} / {data.yourBrand.totalVideosInTop20 + data.competitors.reduce((sum, c) => sum + c.totalVideosInTop20, 0)}) × 100 = <strong>{data.sov.byCount}%</strong>
                </p>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Share of Voice (by Views)</h4>
            <p className="text-blue-700 dark:text-blue-300 mb-2">
              Measures your brand's audience reach based on total views on videos mentioning your brand.
            </p>
            <div className="bg-white dark:bg-gray-800 rounded p-3 font-mono text-xs">
              <p>SOV = (Your Brand Video Views / Total Brand Video Views) × 100</p>
              {data && (
                <p className="mt-2 text-blue-600 dark:text-blue-400">
                  = ({formatViews(data.yourBrand.totalViews)} / {formatViews(data.yourBrand.totalViews + data.competitors.reduce((sum, c) => sum + c.totalViews, 0))}) × 100 = <strong>{data.sov.byViews}%</strong>
                </p>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Brand Matching Method</h4>
            <p className="text-blue-700 dark:text-blue-300">
              Videos are matched to brands based on <strong>video title</strong> containing the brand name.
              This ensures we capture videos that are explicitly about the brand, not just uploaded by the brand's channel.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Data Source</h4>
            <p className="text-blue-700 dark:text-blue-300">
              Results are fetched from YouTube search via DataForSEO SERP API.
              We analyze up to 100 videos per search keyword for comprehensive coverage.
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
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
              }`}
            >
              <button
                onClick={() => loadAnalysis(analysis)}
                className="flex-1 text-left"
              >
                <p className="font-medium text-gray-900 dark:text-white text-sm">{analysis.brandName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDateTime(analysis.createdAt)} • SOV: {analysis.data.sov.byViews}%
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

  // Owned vs Earned Channel Setup Component (shown before and after analysis)
  const ChannelSetupSection = () => (
    <div className="bg-gradient-to-r from-emerald-50 to-purple-50 dark:from-emerald-900/20 dark:to-purple-900/20 rounded-xl shadow-sm p-6 border border-emerald-200 dark:border-emerald-800">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl shadow flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            Track Owned vs Earned Media
            {ownedChannelId && (
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs rounded-full font-normal">
                ✓ Configured
              </span>
            )}
          </h3>
          {!ownedChannelId ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Set your official YouTube channel to distinguish between:
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-start gap-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full mt-1 flex-shrink-0"></span>
                  <div>
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Owned Media</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Videos from your channel</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-3 h-3 bg-purple-500 rounded-full mt-1 flex-shrink-0"></span>
                  <div>
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Earned Media</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Reviews, mentions by others</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Your channel: <span className="font-semibold text-emerald-700 dark:text-emerald-300">{ownedChannelName || ownedChannelId}</span>
                </p>
              </div>
              <button
                onClick={handleClearChannel}
                className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Change
              </button>
            </div>
          )}

          {!ownedChannelId && (
            <>
              {showChannelInput ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={channelInput}
                      onChange={(e) => setChannelInput(e.target.value)}
                      placeholder="e.g., @ContinentalTires or channel URL"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleSetChannel}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setShowChannelInput(false); setChannelInput(''); }}
                      className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Supports: @handle, youtube.com/channel/..., youtube.com/@..., or channel ID
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setShowChannelInput(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Set Your YouTube Channel
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Initial state - show fetch button
  if (!data && !isLoading && !error) {
    return (
      <div className="space-y-6">
        {/* Owned vs Earned Setup - Prominent at top */}
        <ChannelSetupSection />

        <SavedAnalysesSection />
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              YouTube Share of Voice
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
              Analyze your brand's presence in YouTube search results compared to competitors.
              See which videos rank for brand searches and measure your share of voice by views.
            </p>
            <button
              onClick={fetchYouTubeSOV}
              className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              Analyze YouTube Presence
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
          <svg className="w-6 h-6 animate-spin text-red-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-gray-600 dark:text-gray-300">Fetching YouTube data (analyzing up to 100 videos per keyword)...</span>
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Failed to Fetch YouTube Data</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchYouTubeSOV}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const allBrands = [data.yourBrand, ...data.competitors];
  const maxViews = Math.max(...allBrands.map(b => b.totalViews), 1);
  const hasVideos = data.allVideos && data.allVideos.length > 0;

  return (
    <div className="space-y-6">
      {/* Owned vs Earned Setup - Always visible at top */}
      <ChannelSetupSection />

      {/* Methodology Explanation */}
      <MethodologySection />

      {/* Saved Analyses */}
      <SavedAnalysesSection />

      {/* Analysis timestamp */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>Analysis from: {formatDateTime(data.timestamp)}</span>
        <span>Keywords: {data.searchedKeywords?.join(', ')}</span>
      </div>

      {/* Debug info if no videos found */}
      {data.debug && data.debug.totalVideosFetched === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">No YouTube videos found</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                API Status: {data.debug.apiStatus}. Searched for: {data.searchedKeywords?.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SOV Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-l-4 border-red-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Share of Search (by video count)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.sov.byCount}%</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {data.yourBrand.totalVideosInTop20} brand videos identified in search results
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Share of Voice (by views)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.sov.byViews}%</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatViews(data.yourBrand.totalViews)} total views on brand videos
          </p>
        </div>
      </div>

      {/* Brand Comparison */}
      {allBrands.some(b => b.totalVideosInTop20 > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Brand Comparison
          </h3>
          <div className="space-y-4">
            {allBrands.map((brand, idx) => {
              const isYourBrand = idx === 0;
              const viewsPercentage = maxViews > 0 ? (brand.totalViews / maxViews) * 100 : 0;

              return (
                <div key={brand.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isYourBrand ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {brand.name}
                      </span>
                      {isYourBrand && (
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full">
                          Your Brand
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {brand.totalVideosInTop20} videos
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                        ({formatViews(brand.totalViews)} views)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${isYourBrand ? 'bg-red-500' : 'bg-gray-400 dark:bg-gray-500'}`}
                      style={{ width: `${viewsPercentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Owned vs Earned Media Stats */}
      {hasVideos && ownedChannelId && (() => {
        const brandVideos = data.allVideos.filter(v => v.isBrandOwned);
        const ownedVideos = brandVideos.filter(v => getMediaType(v) === 'owned');
        const earnedVideos = brandVideos.filter(v => getMediaType(v) === 'earned');
        const ownedViews = ownedVideos.reduce((sum, v) => sum + v.viewsCount, 0);
        const earnedViews = earnedVideos.reduce((sum, v) => sum + v.viewsCount, 0);
        const totalBrandViews = ownedViews + earnedViews;
        const ownedPercent = totalBrandViews > 0 ? Math.round((ownedViews / totalBrandViews) * 100) : 0;
        const earnedPercent = totalBrandViews > 0 ? Math.round((earnedViews / totalBrandViews) * 100) : 0;

        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Owned vs Earned Media Breakdown
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                  <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Owned Media</span>
                </div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{ownedVideos.length} videos</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{formatViews(ownedViews)} views ({ownedPercent}%)</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                  <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Earned Media</span>
                </div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{earnedVideos.length} videos</p>
                <p className="text-xs text-purple-600 dark:text-purple-400">{formatViews(earnedViews)} views ({earnedPercent}%)</p>
              </div>
            </div>
            {/* Visual bar */}
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${ownedPercent}%` }}
                title={`Owned: ${ownedPercent}%`}
              />
              <div
                className="h-full bg-purple-500 transition-all"
                style={{ width: `${earnedPercent}%` }}
                title={`Earned: ${earnedPercent}%`}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Share of views from {brandVideos.length} brand videos (mentioning "{data.yourBrand.name}" in title)
            </p>
          </div>
        );
      })()}

      {/* All Videos in Search Results */}
      {hasVideos && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Videos in Search Results
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
              ({data.allVideos.length} videos found)
            </span>
          </h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {data.allVideos.map((video) => {
              const mediaType = getMediaType(video);
              return (
                <a
                  key={video.videoId}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    video.isBrandOwned
                      ? mediaType === 'owned'
                        ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800'
                      : ''
                  }`}
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">#{video.rank}</span>
                  </div>
                  {video.thumbnail && (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-24 h-14 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {video.title}
                      </h4>
                      {video.isBrandOwned && (
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full flex-shrink-0">
                          Brand Mention
                        </span>
                      )}
                      {video.isBrandOwned && ownedChannelId && mediaType === 'owned' && (
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs rounded-full flex-shrink-0">
                          Owned
                        </span>
                      )}
                      {video.isBrandOwned && ownedChannelId && mediaType === 'earned' && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full flex-shrink-0">
                          Earned
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {video.channelName} • {formatViews(video.viewsCount)} views • {video.duration}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(video.publishedDate)}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* No videos found message */}
      {!hasVideos && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200">No Videos Found in Search Results</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                The YouTube API didn't return any video results for the searched keywords.
                This could mean the API doesn't have data for this region or the keywords didn't match any videos.
              </p>
              {data.searchedKeywords && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                  Searched for: {data.searchedKeywords.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center gap-3">
        <button
          onClick={fetchYouTubeSOV}
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
