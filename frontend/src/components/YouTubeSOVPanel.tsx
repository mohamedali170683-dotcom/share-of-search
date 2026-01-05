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
  ownedChannelVideos?: YouTubeVideo[]; // Videos fetched directly from owned channels
  sov: {
    byCount: number;
    byViews: number;
  };
  ownedMediaStats?: {
    totalVideos: number;
    totalViews: number;
  };
  searchedKeywords: string[];
  timestamp: string;
  methodology?: {
    sovByCountFormula: string;
    sovByViewsFormula: string;
    brandComparisonMethod: string;
    ownedMediaMethod: string;
    limitations: string[];
  };
  debug?: {
    totalVideosFetched: number;
    channelVideosFetched?: number;
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

const DISMISSED_VIDEOS_KEY = 'youtube-dismissed-videos';

interface OwnedChannel {
  id: string;
  name: string;
  url?: string;
  // YouTube Data API v3 statistics (accurate counts)
  channelId?: string; // Resolved YouTube channel ID (UC...)
  videoCount?: number; // Total videos on channel (from API)
  subscriberCount?: number;
  viewCount?: number; // Total channel views
  lastFetched?: string; // When stats were fetched
}

// ChannelConfig - used for localStorage schema documentation
type ChannelConfigSchema = {
  ownedChannels: OwnedChannel[];
  competitorChannels?: Record<string, OwnedChannel[]>; // competitor name -> channels
};

// Export to avoid unused warning
export type { ChannelConfigSchema };

interface YouTubeInsights {
  // New concise format
  summary: string;
  keyGap: string;
  topAction: string;
  competitorThreat: string;
  earnedMediaInsight?: string; // New: insight about earned media sources
  // Legacy format (for backwards compatibility)
  strengths?: string[];
  opportunities?: string[];
  competitorInsight?: string;
  contentRecommendation?: string;
  priorityAction?: string;
}

interface EarnedMediaSource {
  channelName: string;
  videoCount: number;
  totalViews: number;
}

export function YouTubeSOVPanel({ brandName, competitors, locationCode = 2840, languageCode = 'en' }: YouTubeSOVPanelProps) {
  const [data, setData] = useState<YouTubeSOVResponse | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  // AI Insights
  const [insights, setInsights] = useState<YouTubeInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Channel ownership tracking - now supports multiple channels
  const [showChannelInput, setShowChannelInput] = useState(false);
  const [channelInput, setChannelInput] = useState('');
  const [ownedChannels, setOwnedChannels] = useState<OwnedChannel[]>([]);
  const [competitorChannels, setCompetitorChannels] = useState<Record<string, OwnedChannel[]>>({});

  // Drill-down state for visual breakdown
  const [selectedMediaType, setSelectedMediaType] = useState<'owned' | 'earned' | null>(null);
  const [showCompetitorChannelInput, setShowCompetitorChannelInput] = useState<string | null>(null);
  const [competitorChannelInput, setCompetitorChannelInput] = useState('');

  // Dismissed irrelevant videos (stored in localStorage)
  const [dismissedVideoIds, setDismissedVideoIds] = useState<string[]>([]);

  // Legacy compatibility - single channel ID for matching
  const ownedChannelId = ownedChannels.length > 0 ? ownedChannels[0].id : null;

  // Load saved channel info on mount
  useEffect(() => {
    const savedChannel = localStorage.getItem(CHANNEL_STORAGE_KEY);
    if (savedChannel) {
      try {
        const channelInfo = JSON.parse(savedChannel);
        const brandConfig = channelInfo[brandName.toLowerCase()];
        if (brandConfig) {
          // Handle both old format (single channel) and new format (multiple channels)
          if (brandConfig.ownedChannels) {
            setOwnedChannels(brandConfig.ownedChannels);
            setCompetitorChannels(brandConfig.competitorChannels || {});
          } else if (brandConfig.channelId) {
            // Migrate old format
            setOwnedChannels([{ id: brandConfig.channelId, name: brandConfig.channelName || brandConfig.channelId }]);
          }
        }
      } catch {
        console.error('Failed to load channel info');
      }
    }
  }, [brandName]);

  // Load dismissed videos from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_VIDEOS_KEY);
    if (dismissed) {
      try {
        const dismissedByBrand = JSON.parse(dismissed);
        setDismissedVideoIds(dismissedByBrand[brandName.toLowerCase()] || []);
      } catch {
        console.error('Failed to load dismissed videos');
      }
    }
  }, [brandName]);

  // Dismiss a video as irrelevant
  const dismissVideo = (videoId: string) => {
    const existing = localStorage.getItem(DISMISSED_VIDEOS_KEY);
    const dismissedByBrand = existing ? JSON.parse(existing) : {};
    const brandDismissed = dismissedByBrand[brandName.toLowerCase()] || [];
    if (!brandDismissed.includes(videoId)) {
      brandDismissed.push(videoId);
      dismissedByBrand[brandName.toLowerCase()] = brandDismissed;
      localStorage.setItem(DISMISSED_VIDEOS_KEY, JSON.stringify(dismissedByBrand));
      setDismissedVideoIds(brandDismissed);
    }
  };


  // Check if a video is relevant to the brand context (comprehensive relevance filter)
  // This filter works for ANY brand by detecting common irrelevant content patterns
  const isVideoRelevantToBrand = (video: YouTubeVideo, brand: string): boolean => {
    const titleLower = video.title.toLowerCase();
    const channelLower = (video.channelName || '').toLowerCase();
    const brandLower = brand.toLowerCase();

    // ============================================
    // GENERIC IRRELEVANT CONTENT DETECTION
    // These patterns indicate entertainment/unrelated content for ANY brand
    // ============================================

    // Entertainment/Media channels - almost always irrelevant for business brands
    const entertainmentChannelPatterns = [
      'comedy', 'funny', 'humor', 'jokes', 'sketch', 'parody', 'satire',
      'music', 'vevo', 'records', 'official artist', 'lyrics',
      'movie', 'film', 'trailer', 'cinema', 'hollywood',
      'tv show', 'series', 'episode', 'netflix', 'hbo', 'disney', 'amazon prime', 'hulu', 'peacock',
      'gaming', 'gamer', 'gameplay', 'let\'s play', 'twitch', 'esports',
      'cooking', 'recipe', 'chef', 'kitchen', 'food network', 'tasty',
      'vlog', 'daily vlog', 'lifestyle', 'family vlog',
    ];

    // Entertainment content in titles - generic patterns
    const entertainmentTitlePatterns = [
      'official video', 'official music', 'music video', 'lyric video', 'audio',
      'full movie', 'full episode', 'trailer', 'teaser', 'behind the scenes',
      'comedy', 'funny', 'hilarious', 'prank', 'challenge', 'react',
      'feat.', 'ft.', '(official)', '[official]',
      'gameplay', 'walkthrough', 'let\'s play', 'playthrough',
      'mukbang', 'asmr', 'relaxing', 'sleep', 'meditation',
      'recipe', 'how to cook', 'cooking', 'baking',
      'unboxing' // unless combined with product context
    ];

    // Check if this looks like entertainment content
    const isEntertainmentChannel = entertainmentChannelPatterns.some(p => channelLower.includes(p));
    const hasEntertainmentTitle = entertainmentTitlePatterns.some(p => titleLower.includes(p));

    // ============================================
    // BRAND-SPECIFIC IRRELEVANT PATTERNS
    // Common words that share brand names but are unrelated
    // ============================================
    const brandSpecificIrrelevant: Record<string, string[]> = {
      // Tire brands with common word conflicts
      'continental': ['breakfast', 'hotel', 'airline', 'flight', 'drift', 'divide', 'congress', 'army'],
      'michelin': ['star', 'restaurant', 'chef', 'dining', 'guide', 'gourmet', 'bib gourmand'],
      'bridgestone': ['golf', 'country club', 'pga', 'invitational'],
      'goodyear': ['blimp', 'airship'],
      'pirelli': ['calendar', 'model', 'photoshoot'],
      // Tech brands
      'apple': ['fruit', 'recipe', 'pie', 'cider', 'orchard', 'farm'],
      'amazon': ['rainforest', 'river', 'jungle', 'wildlife', 'tribe'],
      'oracle': ['tarot', 'psychic', 'fortune', 'prophecy', 'spiritual'],
      'shell': ['beach', 'seashell', 'ocean', 'craft'],
      // Other common conflicts
      'crown': ['royal', 'king', 'queen', 'princess', 'monarchy', 'tiara'],
      'target': ['shooting', 'archery', 'bullseye', 'aim'],
      'visa': ['immigration', 'passport', 'embassy', 'travel document'],
      'jaguar': ['animal', 'wildlife', 'zoo', 'cat', 'jungle'],
      'puma': ['animal', 'wildlife', 'zoo', 'cat'],
      'dove': ['bird', 'soap', 'chocolate'], // context dependent
    };

    const brandPatterns = brandSpecificIrrelevant[brandLower] || [];
    const hasBrandSpecificIrrelevant = brandPatterns.some(p => titleLower.includes(p));

    // ============================================
    // POSITIVE CONTEXT DETECTION
    // Keywords that indicate business/product relevance
    // ============================================

    // Generic business/product context (works for any industry)
    const businessContextKeywords = [
      // Product-related
      'review', 'test', 'comparison', 'vs', 'versus', 'best', 'top',
      'unboxing', 'hands on', 'hands-on', 'first look', 'first impression',
      'guide', 'tutorial', 'how to', 'tips', 'advice',
      'buy', 'purchase', 'price', 'cost', 'worth it', 'value',
      'quality', 'performance', 'durability', 'reliability',
      'pros and cons', 'honest', 'real', 'truth about',
      // Industry mentions
      'industry', 'market', 'business', 'company', 'brand', 'manufacturer',
      'product', 'service', 'solution', 'technology', 'innovation',
      'launch', 'release', 'new', 'latest', 'updated', '2024', '2025', '2026',
      // Automotive specific (common for tire brands)
      'tire', 'tyre', 'wheel', 'car', 'vehicle', 'auto', 'automotive',
      'driving', 'road', 'race', 'racing', 'motorsport', 'f1', 'formula',
      'suv', 'truck', 'sedan', 'brake', 'suspension', 'handling',
      // German automotive terms
      'reifen', 'fahrzeug', 'wagen', 'pkw', 'lkw',
    ];

    const hasBusinessContext = businessContextKeywords.some(k => titleLower.includes(k));

    // ============================================
    // DECISION LOGIC
    // ============================================

    // 1. If from entertainment channel AND no business context → filter out
    if (isEntertainmentChannel && !hasBusinessContext) {
      return false;
    }

    // 2. If title has entertainment patterns AND no business context → filter out
    if (hasEntertainmentTitle && !hasBusinessContext) {
      return false;
    }

    // 3. If has brand-specific irrelevant pattern AND no business context → filter out
    if (hasBrandSpecificIrrelevant && !hasBusinessContext) {
      return false;
    }

    // 4. If brand name not in title at all, require business context
    if (!titleLower.includes(brandLower) && !hasBusinessContext) {
      return false;
    }

    // 5. Otherwise, consider it potentially relevant
    return true;
  };

  // Save channel info (new format with multiple channels)
  const saveChannelConfig = (channels: OwnedChannel[], compChannels: Record<string, OwnedChannel[]>) => {
    const existing = localStorage.getItem(CHANNEL_STORAGE_KEY);
    const channelInfo = existing ? JSON.parse(existing) : {};
    channelInfo[brandName.toLowerCase()] = {
      ownedChannels: channels,
      competitorChannels: compChannels,
    };
    localStorage.setItem(CHANNEL_STORAGE_KEY, JSON.stringify(channelInfo));
    setOwnedChannels(channels);
    setCompetitorChannels(compChannels);
  };

  // Fetch channel stats from YouTube Data API v3
  // Pass locationCode for regional channel matching (e.g., "Michelin Deutschland" for Germany)
  const fetchChannelStats = async (channelIdentifier: string, useLocationCode: boolean = true): Promise<Partial<OwnedChannel>> => {
    try {
      console.log(`[YouTube] Fetching stats for: "${channelIdentifier}", locationCode: ${useLocationCode ? locationCode : 'none'}`);

      const response = await fetch('/api/youtube-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelIdentifier,
          includeVideos: false,
          locationCode: useLocationCode ? locationCode : undefined, // Pass location for regional matching
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn(`[YouTube] API error for "${channelIdentifier}":`, errorData.error, '- Status:', response.status, '- Debug:', errorData.debug);
        // If it's a 500 error about API key, show more specific message
        if (response.status === 500 && errorData.error?.includes('API key')) {
          console.error('[YouTube] YOUTUBE_API_KEY is not configured on the server');
        }
        // If quota exceeded, log clearly
        if (response.status === 429 || errorData.debug?.quotaExceeded) {
          console.error('[YouTube] API quota exceeded - daily limit reached. Try again tomorrow.');
        }
        return {};
      }

      const data = await response.json();
      if (data.channel) {
        console.log(`[YouTube] Success for "${channelIdentifier}": ${data.channel.channelTitle} (${data.channel.videoCount} videos)`);
        return {
          channelId: data.channel.channelId,
          name: data.channel.channelTitle || channelIdentifier,
          videoCount: data.channel.videoCount,
          subscriberCount: data.channel.subscriberCount,
          viewCount: data.channel.viewCount,
          url: data.channel.customUrl ? `https://youtube.com/${data.channel.customUrl}` : undefined,
          lastFetched: new Date().toISOString(),
        };
      }
      console.warn(`[YouTube] No channel data returned for "${channelIdentifier}"`);
      return {};
    } catch (error) {
      console.warn(`[YouTube] Failed to fetch channel stats for "${channelIdentifier}":`, error);
      return {};
    }
  };

  // Add a new owned channel (with optional API lookup)
  const addOwnedChannel = async (channelId: string, channelName: string) => {
    // Start with basic info
    const newChannel: OwnedChannel = { id: channelId, name: channelName };

    // Try to fetch stats from YouTube Data API
    const stats = await fetchChannelStats(channelId);
    if (stats.channelId || stats.videoCount) {
      Object.assign(newChannel, stats);
      if (stats.name) newChannel.name = stats.name; // Use official channel name
    }

    const updated = [...ownedChannels, newChannel];
    saveChannelConfig(updated, competitorChannels);
  };

  // Remove an owned channel
  const removeOwnedChannel = (channelId: string) => {
    const updated = ownedChannels.filter(c => c.id !== channelId);
    saveChannelConfig(updated, competitorChannels);
  };

  // Add a competitor channel (with optional stats)
  const addCompetitorChannel = async (competitorName: string, channelId: string, channelName: string, stats?: Partial<OwnedChannel>) => {
    const newChannel: OwnedChannel = { id: channelId, name: channelName, ...stats };

    // If no stats provided, try to fetch them
    if (!stats?.videoCount) {
      const fetchedStats = await fetchChannelStats(channelId);
      if (fetchedStats.videoCount !== undefined) {
        Object.assign(newChannel, fetchedStats);
        if (fetchedStats.name) newChannel.name = fetchedStats.name;
      }
    }

    const existing = competitorChannels[competitorName] || [];
    const updated = { ...competitorChannels, [competitorName]: [...existing, newChannel] };
    saveChannelConfig(ownedChannels, updated);
  };

  // Remove a competitor channel
  const removeCompetitorChannel = (competitorName: string, channelId: string) => {
    const existing = competitorChannels[competitorName] || [];
    const updated = { ...competitorChannels, [competitorName]: existing.filter(c => c.id !== channelId) };
    saveChannelConfig(ownedChannels, updated);
  };

  // Auto-fetch competitor YouTube channel using YouTube API search
  const [isFetchingCompetitor, setIsFetchingCompetitor] = useState<string | null>(null);

  const autoFetchCompetitorChannel = async (competitorName: string) => {
    setIsFetchingCompetitor(competitorName);
    try {
      // Use YouTube API to search for the official channel by brand name
      // Pass locationCode for location-aware search (e.g., "Michelin Deutschland" for Germany)
      const response = await fetch('/api/youtube-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelIdentifier: competitorName, // Search by brand name
          includeVideos: false,
          locationCode, // Pass location for regional channel matching
        }),
      });

      if (!response.ok) {
        console.warn(`Failed to fetch ${competitorName} channel from YouTube API`);
        return;
      }

      const data = await response.json();

      if (data.channel) {
        // Add with stats from YouTube API
        await addCompetitorChannel(competitorName, data.channel.customUrl || data.channel.channelId, data.channel.channelTitle, {
          channelId: data.channel.channelId,
          videoCount: data.channel.videoCount,
          viewCount: data.channel.viewCount,
          subscriberCount: data.channel.subscriberCount,
          url: data.channel.customUrl ? `https://youtube.com/${data.channel.customUrl}` : undefined,
          lastFetched: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(`Error auto-fetching ${competitorName} channel:`, error);
    } finally {
      setIsFetchingCompetitor(null);
    }
  };

  // Auto-fetch all competitor channels
  const autoFetchAllCompetitorChannels = async () => {
    for (const competitor of competitors) {
      const existing = competitorChannels[competitor] || [];
      if (existing.length === 0) {
        await autoFetchCompetitorChannel(competitor);
      }
    }
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

  // State for loading channel stats
  const [isAddingChannel, setIsAddingChannel] = useState(false);

  const handleAddChannel = async () => {
    const channelId = parseChannelInput(channelInput);
    if (channelId) {
      // Check if already exists
      if (!ownedChannels.some(c => c.id.toLowerCase() === channelId.toLowerCase())) {
        setIsAddingChannel(true);
        try {
          await addOwnedChannel(channelId, channelInput);
        } finally {
          setIsAddingChannel(false);
        }
      }
      setShowChannelInput(false);
      setChannelInput('');
    }
  };

  const handleAddCompetitorChannel = (competitorName: string) => {
    const channelId = parseChannelInput(competitorChannelInput);
    if (channelId) {
      const existing = competitorChannels[competitorName] || [];
      if (!existing.some(c => c.id.toLowerCase() === channelId.toLowerCase())) {
        addCompetitorChannel(competitorName, channelId, competitorChannelInput);
      }
      setShowCompetitorChannelInput(null);
      setCompetitorChannelInput('');
    }
  };

  const handleClearAllChannels = () => {
    const existing = localStorage.getItem(CHANNEL_STORAGE_KEY);
    const channelInfo = existing ? JSON.parse(existing) : {};
    delete channelInfo[brandName.toLowerCase()];
    localStorage.setItem(CHANNEL_STORAGE_KEY, JSON.stringify(channelInfo));
    setOwnedChannels([]);
    setCompetitorChannels({});
  };

  // Normalize a string for fuzzy matching (remove special chars, spaces, etc.)
  const normalizeForMatch = (str: string): string => {
    return str.toLowerCase()
      .replace(/@/g, '')
      .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
      .trim();
  };

  // Check if a video matches any of the given channels
  const matchesAnyChannel = (video: YouTubeVideo, channels: OwnedChannel[]): boolean => {
    if (channels.length === 0) return false;

    const channelIdLower = video.channelId?.toLowerCase() || '';
    const channelNameLower = video.channelName?.toLowerCase() || '';
    const channelNameNormalized = normalizeForMatch(video.channelName || '');

    for (const channel of channels) {
      const ownedIdLower = channel.id.toLowerCase();
      const ownedIdNormalized = normalizeForMatch(channel.id);
      const ownedNameNormalized = normalizeForMatch(channel.name);

      // Match by exact channel ID
      if (channelIdLower === ownedIdLower) return true;

      // Match by channel ID contains
      if (channelIdLower.includes(ownedIdLower) || ownedIdLower.includes(channelIdLower)) return true;

      // Match by normalized channel name (fuzzy match)
      if (channelNameNormalized && ownedIdNormalized) {
        if (channelNameNormalized.includes(ownedIdNormalized) || ownedIdNormalized.includes(channelNameNormalized)) {
          return true;
        }
      }

      // Match by channel name
      if (ownedNameNormalized) {
        if (channelNameNormalized.includes(ownedNameNormalized) || ownedNameNormalized.includes(channelNameNormalized)) {
          return true;
        }
        // Also check raw lowercase match
        const ownedNameLower = channel.name.toLowerCase().replace('@', '');
        if (channelNameLower.includes(ownedNameLower) || ownedNameLower.includes(channelNameLower)) {
          return true;
        }
      }
    }

    return false;
  };

  // Determine if a video is owned media (from brand's channel)
  const getMediaType = (video: YouTubeVideo): 'owned' | 'earned' | 'unknown' => {
    if (ownedChannels.length === 0) return 'unknown';
    return matchesAnyChannel(video, ownedChannels) ? 'owned' : 'earned';
  };

  // Compute earned media sources breakdown (which channels are talking about the brand)
  const computeEarnedMediaSources = (earnedVideos: YouTubeVideo[]): EarnedMediaSource[] => {
    const sourceMap = new Map<string, { videoCount: number; totalViews: number }>();

    for (const video of earnedVideos) {
      const channelName = video.channelName || 'Unknown Channel';
      const existing = sourceMap.get(channelName) || { videoCount: 0, totalViews: 0 };
      sourceMap.set(channelName, {
        videoCount: existing.videoCount + 1,
        totalViews: existing.totalViews + video.viewsCount,
      });
    }

    // Sort by total views descending
    return Array.from(sourceMap.entries())
      .map(([channelName, stats]) => ({
        channelName,
        videoCount: stats.videoCount,
        totalViews: stats.totalViews,
      }))
      .sort((a, b) => b.totalViews - a.totalViews);
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

  // Generate AI insights when data is loaded (either from fetch or localStorage)
  useEffect(() => {
    // Only generate if we have data, no existing insights, and not already loading
    if (data && !insights && !isLoadingInsights && data.allVideos && data.allVideos.length > 0) {
      const brandVideos = data.allVideos.filter((v: YouTubeVideo) => v.isBrandOwned);
      const ownedVideos = ownedChannelId ? brandVideos.filter((v: YouTubeVideo) => {
        const channelIdLower = v.channelId?.toLowerCase() || '';
        const channelNameNormalized = (v.channelName || '').toLowerCase().replace(/@/g, '').replace(/[^a-z0-9]/g, '');
        const ownedIdLower = ownedChannelId.toLowerCase();
        const ownedIdNormalized = ownedChannelId.toLowerCase().replace(/@/g, '').replace(/[^a-z0-9]/g, '');
        return channelIdLower === ownedIdLower ||
               channelIdLower.includes(ownedIdLower) ||
               channelNameNormalized.includes(ownedIdNormalized) ||
               ownedIdNormalized.includes(channelNameNormalized);
      }) : [];
      const earnedVideos = ownedChannelId ? brandVideos.filter((v: YouTubeVideo) => !ownedVideos.includes(v)) : [];
      const ownedViewsCount = ownedVideos.reduce((sum: number, v: YouTubeVideo) => sum + v.viewsCount, 0);
      const earnedViewsCount = earnedVideos.reduce((sum: number, v: YouTubeVideo) => sum + v.viewsCount, 0);
      const earnedSources = computeEarnedMediaSources(earnedVideos);
      fetchAIInsights(data, ownedVideos.length, earnedVideos.length, ownedViewsCount, earnedViewsCount, earnedSources);
    }
  }, [data, insights, isLoadingInsights, ownedChannelId]);

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
    // Also generate AI insights for loaded analysis
    if (analysis.data.allVideos && analysis.data.allVideos.length > 0) {
      const brandVideos = analysis.data.allVideos.filter((v: YouTubeVideo) => v.isBrandOwned);
      const ownedVideos = ownedChannelId ? brandVideos.filter((v: YouTubeVideo) => {
        const channelIdLower = v.channelId?.toLowerCase() || '';
        const channelNameNormalized = (v.channelName || '').toLowerCase().replace(/@/g, '').replace(/[^a-z0-9]/g, '');
        const ownedIdLower = ownedChannelId.toLowerCase();
        const ownedIdNormalized = ownedChannelId.toLowerCase().replace(/@/g, '').replace(/[^a-z0-9]/g, '');
        return channelIdLower === ownedIdLower ||
               channelIdLower.includes(ownedIdLower) ||
               channelNameNormalized.includes(ownedIdNormalized) ||
               ownedIdNormalized.includes(channelNameNormalized);
      }) : [];
      const earnedVideos = ownedChannelId ? brandVideos.filter((v: YouTubeVideo) => !ownedVideos.includes(v)) : [];
      const ownedViewsCount = ownedVideos.reduce((sum: number, v: YouTubeVideo) => sum + v.viewsCount, 0);
      const earnedViewsCount = earnedVideos.reduce((sum: number, v: YouTubeVideo) => sum + v.viewsCount, 0);
      const earnedSources = computeEarnedMediaSources(earnedVideos);
      fetchAIInsights(analysis.data, ownedVideos.length, earnedVideos.length, ownedViewsCount, earnedViewsCount, earnedSources);
    }
  };

  const deleteCurrentAnalysis = () => {
    if (!brandName) return;

    // Read directly from localStorage to ensure we have the latest data
    const saved = localStorage.getItem(STORAGE_KEY);
    let currentAnalyses: SavedAnalysis[] = [];
    if (saved) {
      try {
        currentAnalyses = JSON.parse(saved);
      } catch {
        // If parse fails, treat as empty
      }
    }

    // Clear saved analyses for this brand
    const filtered = currentAnalyses.filter(
      a => a && a.brandName && a.brandName.toLowerCase() !== brandName.toLowerCase()
    );
    setSavedAnalyses(filtered);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    // Also clear the channel info for this brand
    handleClearAllChannels();

    // Reset state
    setData(null);
    setError(null);
    setInsights(null);
    setInsightsError(null);
    setSelectedMediaType(null);
  };

  const fetchAIInsights = async (
    youtubeData: YouTubeSOVResponse,
    ownedCount?: number,
    earnedCount?: number,
    ownedViews?: number,
    earnedViews?: number,
    earnedSources?: EarnedMediaSource[]
  ) => {
    setIsLoadingInsights(true);
    setInsightsError(null);

    try {
      // Build competitor channel stats from stored data
      const competitorChannelStats: Record<string, { name: string; videoCount?: number; viewCount?: number }[]> = {};
      for (const comp of competitors) {
        const channels = competitorChannels[comp] || [];
        if (channels.length > 0) {
          competitorChannelStats[comp] = channels.map(ch => ({
            name: ch.name,
            videoCount: ch.videoCount,
            viewCount: ch.viewCount,
          }));
        }
      }

      const response = await fetch('/api/generate-channel-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'youtube',
          brandName,
          youtubeData: {
            yourBrand: youtubeData.yourBrand,
            competitors: youtubeData.competitors,
            allVideos: youtubeData.allVideos,
            sov: youtubeData.sov,
            ownedVideosCount: ownedCount,
            earnedVideosCount: earnedCount,
            ownedViews,
            earnedViews,
            competitorChannelStats,
            earnedMediaSources: earnedSources,
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

  const fetchYouTubeSOV = async () => {
    if (!brandName) return;

    setIsLoading(true);
    setError(null);

    // Auto-fetch competitor YouTube channels using YouTube API search
    // Accumulate all fetched channels first, then save once at the end to avoid stale closure issues
    const fetchCompetitorChannelsPromise = (async () => {
      const competitorsToFetch = competitors.filter(comp => {
        const existing = competitorChannels[comp] || [];
        return existing.length === 0; // Only fetch if not already configured
      });

      if (competitorsToFetch.length === 0) return;

      // Accumulate all fetched channels
      const fetchedChannels: Record<string, OwnedChannel> = {};
      let quotaExceeded = false;

      // Limit to top 3 competitors to conserve API quota
      const topCompetitors = competitorsToFetch.slice(0, 3);
      console.log(`[YouTube] Auto-fetching ${topCompetitors.length} competitor channels (of ${competitorsToFetch.length}):`, topCompetitors);

      // Fetch competitors sequentially to detect quota exceeded early and stop
      for (const competitor of topCompetitors) {
        if (quotaExceeded) {
          console.warn('[YouTube] Stopping auto-fetch - quota exceeded');
          break;
        }

        try {
          console.log(`[YouTube] Auto-fetching channel for: "${competitor}" (locationCode: ${locationCode})`);
          // Use YouTube API to search for the official channel by brand name
          // Pass locationCode for location-aware search (e.g., "Michelin Deutschland" for Germany)
          const response = await fetch('/api/youtube-channel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channelIdentifier: competitor, // Search by brand name
              includeVideos: false, // Just need stats, not video list
              locationCode, // Pass location for regional channel matching
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.channel) {
              console.log(`[YouTube] Found channel for "${competitor}": ${data.channel.channelTitle} (${data.channel.videoCount} videos)`);
              // Store fetched channel
              fetchedChannels[competitor] = {
                id: data.channel.customUrl || data.channel.channelId,
                name: data.channel.channelTitle,
                channelId: data.channel.channelId,
                videoCount: data.channel.videoCount,
                viewCount: data.channel.viewCount,
                subscriberCount: data.channel.subscriberCount,
                url: data.channel.customUrl ? `https://youtube.com/${data.channel.customUrl}` : undefined,
                lastFetched: new Date().toISOString(),
              };
            } else {
              console.warn(`[YouTube] No channel data for "${competitor}"`);
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.warn(`[YouTube] Failed to fetch "${competitor}": ${response.status}`, errorData);
            // Check if quota exceeded
            if (response.status === 429 || errorData.debug?.quotaExceeded) {
              console.error('[YouTube] API quota exceeded - stopping auto-fetch');
              quotaExceeded = true;
            }
          }
        } catch (error) {
          console.warn(`[YouTube] Error auto-fetching "${competitor}" channel:`, error);
        }
      }

      // Save all fetched channels at once
      if (Object.keys(fetchedChannels).length > 0) {
        // Get fresh state from localStorage to avoid stale closure
        const savedChannel = localStorage.getItem(CHANNEL_STORAGE_KEY);
        const channelInfo = savedChannel ? JSON.parse(savedChannel) : {};
        const brandConfig = channelInfo[brandName.toLowerCase()] || {};
        const currentCompetitorChannels = brandConfig.competitorChannels || {};

        // Merge fetched channels with existing
        const mergedCompetitorChannels = { ...currentCompetitorChannels };
        for (const [competitor, channel] of Object.entries(fetchedChannels)) {
          mergedCompetitorChannels[competitor] = [channel];
        }

        saveChannelConfig(ownedChannels, mergedCompetitorChannels);
        console.log('Auto-fetched competitor channels:', Object.keys(fetchedChannels));
      }
    })();

    try {
      const response = await fetch('/api/youtube-sov', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          competitors: competitors.slice(0, 3),
          locationCode,
          languageCode,
          // Pass owned channels so API can fetch their videos directly
          ownedChannels: ownedChannels.map(c => ({ id: c.id, name: c.name })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch YouTube data');
      }

      const result = await response.json();
      setData(result);
      saveAnalysis(result);

      // Wait for competitor channel fetching to complete before generating insights
      await fetchCompetitorChannelsPromise;

      // Auto-generate AI insights after successful fetch
      if (result.allVideos && result.allVideos.length > 0) {
        // Calculate owned/earned for insights (using current channel if set)
        const brandVideos = result.allVideos.filter((v: YouTubeVideo) => v.isBrandOwned);
        const ownedVideos = ownedChannelId ? brandVideos.filter((v: YouTubeVideo) => {
          const channelIdLower = v.channelId?.toLowerCase() || '';
          const channelNameNormalized = (v.channelName || '').toLowerCase().replace(/@/g, '').replace(/[^a-z0-9]/g, '');
          const ownedIdLower = ownedChannelId.toLowerCase();
          const ownedIdNormalized = ownedChannelId.toLowerCase().replace(/@/g, '').replace(/[^a-z0-9]/g, '');
          return channelIdLower === ownedIdLower ||
                 channelIdLower.includes(ownedIdLower) ||
                 channelNameNormalized.includes(ownedIdNormalized) ||
                 ownedIdNormalized.includes(channelNameNormalized);
        }) : [];
        const earnedVideos = ownedChannelId ? brandVideos.filter((v: YouTubeVideo) => !ownedVideos.includes(v)) : [];
        const ownedViewsCount = ownedVideos.reduce((sum: number, v: YouTubeVideo) => sum + v.viewsCount, 0);
        const earnedViewsCount = earnedVideos.reduce((sum: number, v: YouTubeVideo) => sum + v.viewsCount, 0);
        const earnedSources = computeEarnedMediaSources(earnedVideos);

        fetchAIInsights(result, ownedVideos.length, earnedVideos.length, ownedViewsCount, earnedViewsCount, earnedSources);
      }
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
          <span className="font-medium text-blue-800 dark:text-blue-200">How is YouTube SOV Calculated? (Formulas & Methodology)</span>
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
              <p className="font-bold">Formula: SOS = (Your Brand Videos / Total Identified Brand Videos) × 100</p>
              {data && (
                <p className="mt-2 text-blue-600 dark:text-blue-400">
                  <strong>Your Calculation:</strong> ({data.yourBrand.totalVideosInTop20} / {data.yourBrand.totalVideosInTop20 + data.competitors.reduce((sum, c) => sum + c.totalVideosInTop20, 0)}) × 100 = <strong>{data.sov.byCount}%</strong>
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
              <p className="font-bold">Formula: SOV = (Your Brand Video Views / Total Brand Video Views) × 100</p>
              {data && (
                <p className="mt-2 text-blue-600 dark:text-blue-400">
                  <strong>Your Calculation:</strong> ({formatViews(data.yourBrand.totalViews)} / {formatViews(data.yourBrand.totalViews + data.competitors.reduce((sum, c) => sum + c.totalViews, 0))}) × 100 = <strong>{data.sov.byViews}%</strong>
                </p>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Brand Comparison Method</h4>
            <p className="text-blue-700 dark:text-blue-300">
              <strong>Step 1:</strong> Search YouTube for each brand name (your brand + competitors).<br/>
              <strong>Step 2:</strong> Collect videos from search results (up to 100 per search).<br/>
              <strong>Step 3:</strong> Filter videos where the <strong>video title contains the brand name</strong>.<br/>
              <strong>Step 4:</strong> Count videos and sum views for each brand.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Owned Media Calculation</h4>
            <p className="text-blue-700 dark:text-blue-300">
              <strong>Method 1 (DataForSEO):</strong> Search YouTube for your channel name/handle, then filter results to only videos from your channel. Limited to ~100-200 videos.<br/>
              <strong>Method 2 (YouTube Data API v3):</strong> When configured, we fetch accurate channel statistics directly from YouTube, including total video count, subscriber count, and total views.
            </p>
            {ownedChannels.some(c => c.videoCount !== undefined) && (
              <div className="mt-2 bg-emerald-50 dark:bg-emerald-900/30 rounded p-2">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  YouTube Data API Active - Showing accurate channel statistics
                </p>
              </div>
            )}
          </div>

          {/* API Limitations Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
            <h4 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Important Limitations
            </h4>
            <ul className="text-yellow-700 dark:text-yellow-300 text-xs space-y-1">
              <li>• <strong>DataForSEO is a SEARCH API</strong>, not a channel listing API. It cannot retrieve ALL videos from a channel.</li>
              <li>• Owned channel videos are limited to what appears in YouTube search results (typically 100-200 videos max).</li>
              <li>• If your channel has 400+ videos, only ~100-150 may be captured via search.</li>
              {ownedChannels.some(c => c.videoCount !== undefined) ? (
                <li className="text-emerald-700 dark:text-emerald-400">• <strong>YouTube Data API v3 is configured</strong> - accurate channel video counts are shown above.</li>
              ) : (
                <li>• For complete channel video counts, add <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">YOUTUBE_API_KEY</code> to environment variables.</li>
              )}
              <li>• Brand matching is based on video titles only - videos without brand name in title are not counted.</li>
            </ul>
            {data?.methodology?.limitations && data.methodology.limitations.length > 0 && (
              <div className="mt-2 pt-2 border-t border-yellow-300 dark:border-yellow-700">
                <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Analysis-specific notes:</p>
                {data.methodology.limitations.slice(0, 3).map((lim, i) => (
                  <p key={i} className="text-xs text-yellow-600 dark:text-yellow-400">• {lim}</p>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-semibold mb-2">Data Sources (Combined)</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></span>
                <div>
                  <p className="text-blue-700 dark:text-blue-300">
                    <strong>YouTube Data API v3</strong> (for your brand): Provides accurate channel statistics including total video count, subscriber count, and total views. Used for SOV calculations when configured.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                <div>
                  <p className="text-blue-700 dark:text-blue-300">
                    <strong>DataForSEO SERP API</strong> (for competitors): Fetches videos from YouTube search results (up to 100 per search). Used for competitor analysis since we don't have direct access to their channel statistics.
                  </p>
                </div>
              </div>
            </div>
            {ownedChannels.some(c => c.videoCount !== undefined) && (
              <div className="mt-3 bg-emerald-50 dark:bg-emerald-900/30 rounded p-2">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Your SOV is calculated using accurate YouTube API data for your brand vs. search-based data for competitors.
                </p>
              </div>
            )}
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

  // Initial state - show fetch button
  if (!data && !isLoading && !error) {
    return (
      <div className="space-y-6">
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
  const hasVideos = data.allVideos && data.allVideos.length > 0;

  return (
    <div className="space-y-6">
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
      {(() => {
        // Check if we have YouTube API stats for accurate SOV calculation
        const hasYouTubeAPIStats = ownedChannels.some(c => c.videoCount !== undefined);
        const yourBrandVideoCount = hasYouTubeAPIStats
          ? ownedChannels.reduce((sum, c) => sum + (c.videoCount || 0), 0)
          : data.yourBrand.totalVideosInTop20;
        const yourBrandViews = hasYouTubeAPIStats
          ? ownedChannels.reduce((sum, c) => sum + (c.viewCount || 0), 0)
          : data.yourBrand.totalViews;

        // Recalculate SOV with YouTube API data
        const competitorVideos = data.competitors.reduce((sum, c) => sum + c.totalVideosInTop20, 0);
        const competitorViews = data.competitors.reduce((sum, c) => sum + c.totalViews, 0);
        const totalVideos = yourBrandVideoCount + competitorVideos;
        const totalViews = yourBrandViews + competitorViews;

        const adjustedSOVByCount = totalVideos > 0
          ? Math.round((yourBrandVideoCount / totalVideos) * 100 * 10) / 10
          : 0;
        const adjustedSOVByViews = totalViews > 0
          ? Math.round((yourBrandViews / totalViews) * 100 * 10) / 10
          : 0;

        // Use adjusted values if we have YouTube API stats, otherwise use original
        const displaySOVByCount = hasYouTubeAPIStats ? adjustedSOVByCount : data.sov.byCount;
        const displaySOVByViews = hasYouTubeAPIStats ? adjustedSOVByViews : data.sov.byViews;

        // Gap analysis: difference between content share and attention share
        const contentAttentionGap = displaySOVByViews - displaySOVByCount;
        const hasSignificantGap = Math.abs(contentAttentionGap) >= 5;

        return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-l-4 border-red-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Share of Content</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{displaySOVByCount}%</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {yourBrandVideoCount.toLocaleString()} videos in your library
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Your share of total YouTube content vs competitors
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
                <p className="text-sm text-gray-500 dark:text-gray-400">Share of Attention</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{displaySOVByViews}%</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatViews(yourBrandViews)} total views
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Your share of viewer engagement (30+ sec watches)
            </p>
          </div>
        </div>

        {/* Gap Analysis Insight */}
        {hasSignificantGap && (
          <div className={`rounded-lg p-4 ${contentAttentionGap > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'}`}>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${contentAttentionGap > 0 ? 'bg-emerald-100 dark:bg-emerald-800' : 'bg-amber-100 dark:bg-amber-800'}`}>
                {contentAttentionGap > 0 ? (
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`font-semibold text-sm ${contentAttentionGap > 0 ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-200'}`}>
                  {contentAttentionGap > 0 ? 'High-Performing Content' : 'Content Opportunity Gap'}
                </p>
                <p className={`text-xs mt-1 ${contentAttentionGap > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  {contentAttentionGap > 0
                    ? `Your content is outperforming: ${displaySOVByCount}% of videos generate ${displaySOVByViews}% of attention (+${Math.abs(contentAttentionGap).toFixed(1)}pp). Your videos are highly engaging - consider producing more content.`
                    : `Content underperforming: ${displaySOVByCount}% of videos only capture ${displaySOVByViews}% of attention (-${Math.abs(contentAttentionGap).toFixed(1)}pp). Focus on improving video quality, thumbnails, titles, or topics.`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* What is a YouTube View - Methodology Note */}
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <strong>How we measure:</strong> "Share of Content" = your video library size vs competitors. "Share of Attention" = your share of YouTube views (counted when viewers watch 30+ seconds). A gap between these metrics reveals if your content strategy needs more volume or better engagement.
          </p>
        </div>
      </div>
        );
      })()}

      {/* Brand Comparison with Competitor Channels */}
      {allBrands.some(b => b.totalVideosInTop20 > 0) && (() => {
        // Check if we have YouTube API stats for your brand
        const hasYouTubeAPIStats = ownedChannels.some(c => c.videoCount !== undefined);
        const yourBrandVideoCount = hasYouTubeAPIStats
          ? ownedChannels.reduce((sum, c) => sum + (c.videoCount || 0), 0)
          : allBrands[0]?.totalVideosInTop20 || 0;
        const yourBrandViews = hasYouTubeAPIStats
          ? ownedChannels.reduce((sum, c) => sum + (c.viewCount || 0), 0)
          : allBrands[0]?.totalViews || 0;

        // Check which competitors have YouTube API stats
        const competitorsWithAPIStats = competitors.filter(comp => {
          const channels = competitorChannels[comp] || [];
          return channels.some(c => c.videoCount !== undefined);
        });
        const hasAnyCompetitorAPIStats = competitorsWithAPIStats.length > 0;

        // Recalculate max views including YouTube API data for all brands
        const getCompetitorStats = (compName: string) => {
          const channels = competitorChannels[compName] || [];
          const hasAPIStats = channels.some(c => c.videoCount !== undefined);
          if (hasAPIStats) {
            return {
              videoCount: channels.reduce((sum, c) => sum + (c.videoCount || 0), 0),
              viewCount: channels.reduce((sum, c) => sum + (c.viewCount || 0), 0),
              hasAPI: true,
            };
          }
          const brand = allBrands.find(b => b.name.toLowerCase() === compName.toLowerCase());
          return {
            videoCount: brand?.totalVideosInTop20 || 0,
            viewCount: brand?.totalViews || 0,
            hasAPI: false,
          };
        };

        const allViews = [yourBrandViews, ...competitors.map(c => getCompetitorStats(c).viewCount)];
        const adjustedMaxViews = Math.max(...allViews, 1);

        return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Brand Comparison
            </h3>
            {!hasAnyCompetitorAPIStats && (
              <button
                onClick={autoFetchAllCompetitorChannels}
                disabled={isFetchingCompetitor !== null}
                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
              >
                {isFetchingCompetitor ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Fetching...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Auto-fetch Competitor Channels
                  </>
                )}
              </button>
            )}
          </div>
          {(hasYouTubeAPIStats || hasAnyCompetitorAPIStats) && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {hasYouTubeAPIStats && hasAnyCompetitorAPIStats
                ? 'All brands use accurate counts from YouTube Data API'
                : hasYouTubeAPIStats
                ? 'Your brand uses accurate counts from YouTube Data API'
                : `${competitorsWithAPIStats.length} competitor(s) use YouTube API data`}
            </p>
          )}

          {/* Disclaimer about channel verification */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Channel Verification</p>
                <p className="text-amber-700 dark:text-amber-300">
                  Auto-detected channels may not always be the official brand channel. Please verify each channel is correct by clicking the link.
                  If incorrect, click the <span className="font-mono bg-amber-100 dark:bg-amber-800 px-1 rounded">×</span> to remove and manually add the correct channel URL or handle (e.g., @ContinentalCorporation).
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  <strong>Views shown</strong> are <strong>total channel lifetime views</strong> from YouTube Data API. <strong>Changing a channel will affect all metrics</strong> (video counts, views, SOV calculations).
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {allBrands.map((brand, idx) => {
              const isYourBrand = idx === 0;
              const compChannels = !isYourBrand ? (competitorChannels[brand.name] || []) : [];
              const compStats = !isYourBrand ? getCompetitorStats(brand.name) : null;

              // Use YouTube API stats when available
              const displayVideoCount = isYourBrand
                ? (hasYouTubeAPIStats ? yourBrandVideoCount : brand.totalVideosInTop20)
                : (compStats?.hasAPI ? compStats.videoCount : brand.totalVideosInTop20);
              const displayViews = isYourBrand
                ? (hasYouTubeAPIStats ? yourBrandViews : brand.totalViews)
                : (compStats?.hasAPI ? compStats.viewCount : brand.totalViews);
              const hasAPIStats = isYourBrand ? hasYouTubeAPIStats : compStats?.hasAPI;

              const viewsPercentage = adjustedMaxViews > 0 ? (displayViews / adjustedMaxViews) * 100 : 0;

              // Get channel URL for display
              const getChannelUrl = (ch: OwnedChannel) => {
                if (ch.channelId) return `https://youtube.com/channel/${ch.channelId}`;
                if (ch.id.startsWith('@')) return `https://youtube.com/${ch.id}`;
                if (ch.id.startsWith('UC')) return `https://youtube.com/channel/${ch.id}`;
                return `https://youtube.com/@${ch.id}`;
              };

              // For your brand, get channel info from ownedChannels
              const yourChannels = isYourBrand ? ownedChannels : compChannels;
              const primaryChannel = yourChannels[0];

              return (
                <div key={brand.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${isYourBrand ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {brand.name}
                        </span>
                        {isYourBrand && (
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full">
                            Your Brand
                          </span>
                        )}
                        {hasAPIStats && (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs rounded-full">
                            YouTube API
                          </span>
                        )}
                      </div>
                      {/* Show channel URL under brand name */}
                      {primaryChannel && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <a
                            href={getChannelUrl(primaryChannel)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
                          >
                            <svg className="w-3 h-3 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                            <span className="truncate max-w-[180px]">{primaryChannel.name || primaryChannel.id}</span>
                          </a>
                          {/* Remove button for all channels (brand and competitors) */}
                          <button
                            onClick={() => isYourBrand ? removeOwnedChannel(primaryChannel.id) : removeCompetitorChannel(brand.name, primaryChannel.id)}
                            className="text-gray-400 hover:text-red-600 text-xs ml-1"
                            title="Remove channel"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {displayVideoCount.toLocaleString()} videos
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                        ({formatViews(displayViews)} views)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${isYourBrand ? 'bg-red-500' : 'bg-gray-400 dark:bg-gray-500'}`}
                      style={{ width: `${viewsPercentage}%` }}
                    />
                  </div>

                  {/* Your brand channel management - only show if no channel configured */}
                  {isYourBrand && ownedChannels.length === 0 && (
                    <div className="mt-1">
                      {showChannelInput ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={channelInput}
                            onChange={(e) => setChannelInput(e.target.value)}
                            placeholder={`@${brand.name.replace(/\s+/g, '')} or channel URL`}
                            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            onKeyDown={(e) => e.key === 'Enter' && !isAddingChannel && handleAddChannel()}
                            disabled={isAddingChannel}
                          />
                          <button
                            onClick={handleAddChannel}
                            disabled={isAddingChannel}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            {isAddingChannel ? (
                              <>
                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                                Fetching...
                              </>
                            ) : 'Add'}
                          </button>
                          <button
                            onClick={() => { setShowChannelInput(false); setChannelInput(''); }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                            disabled={isAddingChannel}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowChannelInput(true)}
                          className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          + Add your YouTube channel
                        </button>
                      )}
                    </div>
                  )}

                  {/* Competitor channel management - only show if no channel configured */}
                  {!isYourBrand && compChannels.length === 0 && (
                    <div className="mt-1">
                      {showCompetitorChannelInput === brand.name ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={competitorChannelInput}
                            onChange={(e) => setCompetitorChannelInput(e.target.value)}
                            placeholder={`@${brand.name.replace(/\s+/g, '')} or channel URL`}
                            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCompetitorChannel(brand.name)}
                          />
                          <button
                            onClick={() => handleAddCompetitorChannel(brand.name)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => { setShowCompetitorChannelInput(null); setCompetitorChannelInput(''); }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowCompetitorChannelInput(brand.name)}
                          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          + Add {brand.name}'s YouTube channel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Top Performing Videos Section - Split by Owned vs Earned */}
          {data.allVideos && data.allVideos.length > 0 && (() => {
            // Helper to get video type
            const getVideoType = (title: string) => {
              const titleLower = title.toLowerCase();
              if (titleLower.includes('review')) return 'Review';
              if (titleLower.includes('comparison') || titleLower.includes('vs')) return 'Comparison';
              if (titleLower.includes('tutorial') || titleLower.includes('how to')) return 'Tutorial';
              if (titleLower.includes('unboxing')) return 'Unboxing';
              if (titleLower.includes('test') || titleLower.includes('testing')) return 'Test/Analysis';
              if (titleLower.includes('ad') || titleLower.includes('commercial') || titleLower.includes('spot')) return 'Advertisement';
              if (titleLower.includes('launch') || titleLower.includes('reveal') || titleLower.includes('new')) return 'Product Launch';
              return 'Content';
            };

            // Split ALL videos into owned vs earned (across brand AND competitors)
            const allOwnedVideos = data.allVideos.filter(v => getMediaType(v) === 'owned');
            const allEarnedVideos = data.allVideos
              .filter(v => getMediaType(v) === 'earned')
              .filter(v => !dismissedVideoIds.includes(v.videoId))
              .filter(v => isVideoRelevantToBrand(v, data.yourBrand.name));

            // Further split by brand vs competitor
            const brandOwnedVideos = allOwnedVideos.filter(v => v.isBrandOwned);
            const competitorOwnedVideos = allOwnedVideos.filter(v => !v.isBrandOwned);
            const brandEarnedVideos = allEarnedVideos.filter(v => v.isBrandOwned);
            const competitorEarnedVideos = allEarnedVideos.filter(v => !v.isBrandOwned);

            // Get top 3 for each category
            const topBrandOwned = brandOwnedVideos.sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 3);
            const topCompetitorOwned = competitorOwnedVideos.sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 3);
            const topBrandEarned = brandEarnedVideos.sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 3);
            const topCompetitorEarned = competitorEarnedVideos.sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 3);

            const renderVideoCard = (video: YouTubeVideo, idx: number, colorClass: string, bgClass: string) => {
              const videoType = getVideoType(video.title);
              const isBrandVideo = video.isBrandOwned;

              return (
                <a
                  key={video.videoId}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${colorClass}`}
                >
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs flex-shrink-0 ${bgClass}`}>
                    #{idx + 1}
                  </div>
                  {video.thumbnail && (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-20 h-12 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-xs line-clamp-2">{video.title}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]">{video.channelName}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {formatViews(video.viewsCount)}
                      </span>
                      {isBrandVideo && (
                        <span className="text-xs px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {data.yourBrand.name}
                        </span>
                      )}
                      <span className="text-xs px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {videoType}
                      </span>
                    </div>
                  </div>
                </a>
              );
            };

            return (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Top Performing Videos
                  <span className="text-xs font-normal text-gray-500">(by views)</span>
                </h4>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* OWNED MEDIA - Official Channel Content */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-emerald-200 dark:border-emerald-800">
                      <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                      <h5 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        Owned Media
                      </h5>
                      <span className="text-xs text-gray-500">(Official channels)</span>
                    </div>

                    {/* Brand Owned */}
                    <div>
                      <h6 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        {data.yourBrand.name}
                      </h6>
                      {topBrandOwned.length > 0 ? (
                        <div className="space-y-2">
                          {topBrandOwned.map((video, idx) => renderVideoCard(
                            video, idx,
                            'border-emerald-200 dark:border-emerald-800',
                            'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic py-2">No owned videos found. Add your YouTube channel above.</p>
                      )}
                    </div>

                    {/* Competitor Owned */}
                    <div>
                      <h6 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                        Competitors
                      </h6>
                      {topCompetitorOwned.length > 0 ? (
                        <div className="space-y-2">
                          {topCompetitorOwned.map((video, idx) => renderVideoCard(
                            video, idx,
                            'border-emerald-200 dark:border-emerald-800',
                            'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic py-2">No competitor channel videos found.</p>
                      )}
                    </div>
                  </div>

                  {/* EARNED MEDIA - Third-party Content */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-purple-200 dark:border-purple-800">
                      <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                      <h5 className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                        Earned Media
                      </h5>
                      <span className="text-xs text-gray-500">(Reviews & mentions)</span>
                    </div>

                    {/* Brand Earned */}
                    <div>
                      <h6 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        About {data.yourBrand.name}
                      </h6>
                      {topBrandEarned.length > 0 ? (
                        <div className="space-y-2">
                          {topBrandEarned.map((video, idx) => renderVideoCard(
                            video, idx,
                            'border-purple-200 dark:border-purple-800',
                            'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic py-2">No earned media found for {data.yourBrand.name}.</p>
                      )}
                    </div>

                    {/* Competitor Earned */}
                    <div>
                      <h6 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                        About Competitors
                      </h6>
                      {topCompetitorEarned.length > 0 ? (
                        <div className="space-y-2">
                          {topCompetitorEarned.map((video, idx) => renderVideoCard(
                            video, idx,
                            'border-purple-200 dark:border-purple-800',
                            'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic py-2">No competitor earned media found.</p>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 italic">
                  <strong>Owned</strong> = content from official brand channels. <strong>Earned</strong> = reviews and mentions by third-party creators.
                  {topBrandOwned.length === 0 && topBrandEarned.length > 0 && (
                    <span className="text-amber-600 dark:text-amber-400"> Your brand has earned coverage but no official channel - consider creating owned content.</span>
                  )}
                </p>
              </div>
            );
          })()}
        </div>
        );
      })()}

      {/* Owned vs Earned Media Visual Breakdown */}
      {hasVideos && ownedChannels.length > 0 && (() => {
        // Use channel videos fetched directly from API if available
        const channelVideos = data.ownedChannelVideos || [];

        // Check if we have accurate stats from YouTube Data API v3
        const hasYouTubeAPIStats = ownedChannels.some(c => c.videoCount !== undefined);

        // Calculate accurate owned video count from YouTube Data API
        const accurateOwnedVideoCount = hasYouTubeAPIStats
          ? ownedChannels.reduce((sum, c) => sum + (c.videoCount || 0), 0)
          : null;

        // Calculate accurate owned views from YouTube Data API
        const accurateOwnedViews = hasYouTubeAPIStats
          ? ownedChannels.reduce((sum, c) => sum + (c.viewCount || 0), 0)
          : null;

        // If we have channel data, use it for owned media (more accurate)
        // Otherwise fall back to matching from search results
        const brandVideos = data.allVideos.filter(v => v.isBrandOwned);
        const ownedVideosFromSearch = brandVideos.filter(v => getMediaType(v) === 'owned');
        const earnedVideos = brandVideos.filter(v => getMediaType(v) === 'earned');

        // Use the better data source for owned videos list (for display)
        const ownedVideos = channelVideos.length > 0 ? channelVideos : ownedVideosFromSearch;

        // Use accurate count from YouTube API if available, otherwise use search results
        const ownedVideoCount = accurateOwnedVideoCount ?? ownedVideos.length;

        // Calculate stats - use YouTube API stats if available
        const ownedViews = accurateOwnedViews ??
          (data.ownedMediaStats?.totalViews || ownedVideos.reduce((sum, v) => sum + v.viewsCount, 0));
        const earnedViews = earnedVideos.reduce((sum, v) => sum + v.viewsCount, 0);
        const totalBrandViews = ownedViews + earnedViews;
        const ownedPercent = totalBrandViews > 0 ? Math.round((ownedViews / totalBrandViews) * 100) : 0;
        const earnedPercent = totalBrandViews > 0 ? Math.round((earnedViews / totalBrandViews) * 100) : 0;

        // Donut chart dimensions
        const size = 200;
        const strokeWidth = 40;
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const ownedLength = (ownedPercent / 100) * circumference;
        const earnedLength = (earnedPercent / 100) * circumference;

        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Owned vs Earned Media
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                (click segments to drill down)
              </span>
            </h3>

            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Donut Chart */}
              <div className="relative flex-shrink-0">
                <svg width={size} height={size} className="transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth={strokeWidth}
                    className="dark:stroke-gray-700"
                  />
                  {/* Owned segment (clickable) */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${ownedLength} ${circumference}`}
                    strokeDashoffset="0"
                    className={`cursor-pointer transition-all hover:opacity-80 ${selectedMediaType === 'owned' ? 'stroke-emerald-600' : ''}`}
                    onClick={() => setSelectedMediaType(selectedMediaType === 'owned' ? null : 'owned')}
                  />
                  {/* Earned segment (clickable) */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${earnedLength} ${circumference}`}
                    strokeDashoffset={`-${ownedLength}`}
                    className={`cursor-pointer transition-all hover:opacity-80 ${selectedMediaType === 'earned' ? 'stroke-purple-600' : ''}`}
                    onClick={() => setSelectedMediaType(selectedMediaType === 'earned' ? null : 'earned')}
                  />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {ownedVideoCount + earnedVideos.length}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">total videos</span>
                  {hasYouTubeAPIStats && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">via YouTube API</span>
                  )}
                </div>
              </div>

              {/* Legend & Stats */}
              <div className="flex-1 space-y-4">
                {/* Owned */}
                <button
                  onClick={() => setSelectedMediaType(selectedMediaType === 'owned' ? null : 'owned')}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedMediaType === 'owned'
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-500'
                      : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 bg-emerald-500 rounded-full"></span>
                      <div>
                        <span className="font-semibold text-emerald-800 dark:text-emerald-200">Owned Media</span>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          {hasYouTubeAPIStats ? `From ${ownedChannels.length} channel${ownedChannels.length > 1 ? 's' : ''} (YouTube API)` : `From your ${ownedChannels.length} channel${ownedChannels.length > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{ownedVideoCount.toLocaleString()}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">{formatViews(ownedViews)} views ({ownedPercent}%)</p>
                    </div>
                  </div>
                </button>

                {/* Earned */}
                <button
                  onClick={() => setSelectedMediaType(selectedMediaType === 'earned' ? null : 'earned')}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedMediaType === 'earned'
                      ? 'bg-purple-100 dark:bg-purple-900/40 border-purple-500'
                      : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:border-purple-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 bg-purple-500 rounded-full"></span>
                      <div>
                        <span className="font-semibold text-purple-800 dark:text-purple-200">Earned Media</span>
                        <p className="text-xs text-purple-600 dark:text-purple-400">Reviews & mentions by others</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{earnedVideos.length}</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">{formatViews(earnedViews)} views ({earnedPercent}%)</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Info about data source */}
            {hasYouTubeAPIStats && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 mt-4">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <strong>Accurate counts from YouTube Data API:</strong> Your {ownedChannels.length} channel{ownedChannels.length > 1 ? 's have' : ' has'} {ownedVideoCount.toLocaleString()} total videos.
                  Earned media shows {earnedVideos.length} videos mentioning "{data.yourBrand.name}" from other channels.
                </p>
              </div>
            )}
            {!hasYouTubeAPIStats && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                Based on {brandVideos.length} videos mentioning "{data.yourBrand.name}" in search results.
                Add your YouTube channel to see accurate video counts from the YouTube Data API.
              </p>
            )}

            {/* Earned Media Sources Breakdown with Video Context */}
            {earnedVideos.length > 0 && (() => {
              // Filter out dismissed and irrelevant videos
              const filteredEarnedVideos = earnedVideos.filter(v =>
                !dismissedVideoIds.includes(v.videoId) &&
                isVideoRelevantToBrand(v, data.yourBrand.name)
              );

              // Count filtered out videos
              const irrelevantCount = earnedVideos.filter(v =>
                !dismissedVideoIds.includes(v.videoId) &&
                !isVideoRelevantToBrand(v, data.yourBrand.name)
              ).length;
              const dismissedCount = earnedVideos.filter(v => dismissedVideoIds.includes(v.videoId)).length;

              const sources = computeEarnedMediaSources(filteredEarnedVideos);
              if (sources.length === 0 && filteredEarnedVideos.length === 0) {
                // Show message if all videos were filtered out
                if (irrelevantCount > 0 || dismissedCount > 0) {
                  return (
                    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        All earned media videos were filtered out ({irrelevantCount} irrelevant, {dismissedCount} dismissed).
                        {dismissedCount > 0 && (
                          <button
                            onClick={() => {
                              // Clear all dismissed videos for this brand
                              const existing = localStorage.getItem(DISMISSED_VIDEOS_KEY);
                              const dismissedByBrand = existing ? JSON.parse(existing) : {};
                              dismissedByBrand[brandName.toLowerCase()] = [];
                              localStorage.setItem(DISMISSED_VIDEOS_KEY, JSON.stringify(dismissedByBrand));
                              setDismissedVideoIds([]);
                            }}
                            className="ml-2 text-purple-600 hover:text-purple-700 underline"
                          >
                            Restore dismissed
                          </button>
                        )}
                      </p>
                    </div>
                  );
                }
                return null;
              }

              // Get the best video from each source for context
              const getTopVideoForSource = (channelName: string) => {
                return filteredEarnedVideos
                  .filter(v => v.channelName === channelName)
                  .sort((a, b) => b.viewsCount - a.viewsCount)[0];
              };

              // Categorize video by title
              const getVideoCategory = (title: string) => {
                const t = title.toLowerCase();
                if (t.includes('review')) return { label: 'Review', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' };
                if (t.includes('comparison') || t.includes(' vs ')) return { label: 'Comparison', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' };
                if (t.includes('tutorial') || t.includes('how to')) return { label: 'Tutorial', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' };
                if (t.includes('unboxing')) return { label: 'Unboxing', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300' };
                if (t.includes('test')) return { label: 'Test', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' };
                if (t.includes('top') || t.includes('best')) return { label: 'Best-of List', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' };
                return { label: 'Mention', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' };
              };

              return (
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-purple-800 dark:text-purple-200 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Who's Talking About {data.yourBrand.name}?
                      <span className="text-xs font-normal text-gray-500">({sources.length} channels)</span>
                    </h4>
                    {(irrelevantCount > 0 || dismissedCount > 0) && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {irrelevantCount > 0 && `${irrelevantCount} filtered`}
                        {irrelevantCount > 0 && dismissedCount > 0 && ', '}
                        {dismissedCount > 0 && (
                          <>
                            {dismissedCount} dismissed
                            <button
                              onClick={() => {
                                const existing = localStorage.getItem(DISMISSED_VIDEOS_KEY);
                                const dismissedByBrand = existing ? JSON.parse(existing) : {};
                                dismissedByBrand[brandName.toLowerCase()] = [];
                                localStorage.setItem(DISMISSED_VIDEOS_KEY, JSON.stringify(dismissedByBrand));
                                setDismissedVideoIds([]);
                              }}
                              className="ml-1 text-purple-600 hover:text-purple-700 underline"
                            >
                              (restore)
                            </button>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {sources.slice(0, 5).map((source, idx) => {
                      const topVideo = getTopVideoForSource(source.channelName);
                      const category = topVideo ? getVideoCategory(topVideo.title) : null;

                      return (
                        <div
                          key={source.channelName}
                          className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 flex items-center justify-center bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                                {idx + 1}
                              </span>
                              <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                                {source.channelName}
                              </span>
                            </div>
                            <div className="text-right text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">{source.videoCount} video{source.videoCount > 1 ? 's' : ''}</span>
                              <span className="mx-1">•</span>
                              <span>{formatViews(source.totalViews)} views</span>
                            </div>
                          </div>
                          {topVideo && (
                            <div className="flex items-start gap-2 mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-purple-200 dark:border-purple-700">
                              <a
                                href={topVideo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-2 flex-1 hover:opacity-80 transition-opacity"
                              >
                                {topVideo.thumbnail && (
                                  <img
                                    src={topVideo.thumbnail}
                                    alt={topVideo.title}
                                    className="w-16 h-10 object-cover rounded flex-shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-1 font-medium">{topVideo.title}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-500">{formatViews(topVideo.viewsCount)} views</span>
                                    {category && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${category.color}`}>
                                        {category.label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </a>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dismissVideo(topVideo.videoId);
                                }}
                                className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                                title="Dismiss as irrelevant"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {sources.length > 5 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                        + {sources.length - 5} more channels
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-3 italic">
                    Earned media = videos by other creators mentioning your brand. Click ✕ to dismiss irrelevant videos.
                  </p>
                </div>
              );
            })()}

            {/* Drill-down video list */}
            {selectedMediaType && (() => {
              // Filter earned videos to exclude dismissed and irrelevant
              const displayEarnedVideos = earnedVideos.filter(v =>
                !dismissedVideoIds.includes(v.videoId) &&
                isVideoRelevantToBrand(v, data.yourBrand.name)
              );
              const videosToShow = selectedMediaType === 'owned' ? ownedVideos : displayEarnedVideos;

              return (
                <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className={`font-semibold ${selectedMediaType === 'owned' ? 'text-emerald-700 dark:text-emerald-300' : 'text-purple-700 dark:text-purple-300'}`}>
                      {selectedMediaType === 'owned' ? 'Owned' : 'Earned'} Media Videos ({selectedMediaType === 'owned' ? ownedVideoCount.toLocaleString() : displayEarnedVideos.length})
                      {selectedMediaType === 'owned' && hasYouTubeAPIStats && ownedVideos.length < ownedVideoCount && (
                        <span className="text-xs font-normal text-gray-500 ml-2">
                          (showing {ownedVideos.length} from search)
                        </span>
                      )}
                    </h4>
                    <button
                      onClick={() => setSelectedMediaType(null)}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Close ✕
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {videosToShow.map((video, idx) => (
                      <div
                        key={video.videoId}
                        className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border ${
                          selectedMediaType === 'owned'
                            ? 'border-emerald-200 dark:border-emerald-800'
                            : 'border-purple-200 dark:border-purple-800'
                        }`}
                      >
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          {video.thumbnail && (
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-20 h-12 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{video.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {video.channelName} • {formatViews(video.viewsCount)} views
                              {video.publishedDate && ` • ${formatDate(video.publishedDate)}`}
                            </p>
                          </div>
                        </a>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          selectedMediaType === 'owned'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        }`}>
                          {selectedMediaType === 'owned' && channelVideos.length > 0 ? `#${idx + 1}` : `#${video.rank || idx + 1}`}
                        </span>
                        {selectedMediaType === 'earned' && (
                          <button
                            onClick={() => dismissVideo(video.videoId)}
                            className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Dismiss as irrelevant"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    {videosToShow.length === 0 && (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                        No {selectedMediaType} media videos found.
                        {selectedMediaType === 'owned' && !hasYouTubeAPIStats && ' Add your YouTube channel to see owned media.'}
                        {selectedMediaType === 'earned' && dismissedVideoIds.length > 0 && (
                          <button
                            onClick={() => {
                              const existing = localStorage.getItem(DISMISSED_VIDEOS_KEY);
                              const dismissedByBrand = existing ? JSON.parse(existing) : {};
                              dismissedByBrand[brandName.toLowerCase()] = [];
                              localStorage.setItem(DISMISSED_VIDEOS_KEY, JSON.stringify(dismissedByBrand));
                              setDismissedVideoIds([]);
                            }}
                            className="ml-2 text-purple-600 hover:text-purple-700 underline"
                          >
                            Restore dismissed videos
                          </button>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* AI Strategic Insights - Conclusion section */}
      {hasVideos && (isLoadingInsights || insights || insightsError) && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl shadow-sm p-6 border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Conclusion & Recommendations
              {isLoadingInsights && (
                <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400">(generating...)</span>
              )}
            </h3>
          </div>

          {isLoadingInsights && (
            <div className="flex items-center justify-center py-6">
              <svg className="w-5 h-5 animate-spin text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-gray-600 dark:text-gray-300 text-sm">Analyzing data...</span>
            </div>
          )}

          {insightsError && (
            <div className="text-center py-3">
              <p className="text-red-600 dark:text-red-400 text-sm mb-2">{insightsError}</p>
              <button
                onClick={() => {
                  const brandVideos = data.allVideos.filter(v => v.isBrandOwned);
                  const ownedVideos = ownedChannelId ? brandVideos.filter(v => getMediaType(v) === 'owned') : [];
                  const earnedVideos = ownedChannelId ? brandVideos.filter(v => getMediaType(v) === 'earned') : [];
                  const ownedViews = ownedVideos.reduce((sum, v) => sum + v.viewsCount, 0);
                  const earnedViews = earnedVideos.reduce((sum, v) => sum + v.viewsCount, 0);
                  const earnedSources = computeEarnedMediaSources(earnedVideos);
                  fetchAIInsights(data, ownedVideos.length, earnedVideos.length, ownedViews, earnedViews, earnedSources);
                }}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          )}

          {insights && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border-l-4 border-indigo-500">
                <p className="text-gray-800 dark:text-gray-200 text-sm">{insights.summary}</p>
              </div>

              {/* Key insights in compact grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border-l-3 border-red-500">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 text-xs uppercase tracking-wide mb-1">Gap</h4>
                  <p className="text-red-700 dark:text-red-300 text-xs">{insights.keyGap}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border-l-3 border-emerald-500">
                  <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 text-xs uppercase tracking-wide mb-1">Action</h4>
                  <p className="text-emerald-700 dark:text-emerald-300 text-xs">{insights.topAction}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border-l-3 border-orange-500">
                  <h4 className="font-semibold text-orange-800 dark:text-orange-200 text-xs uppercase tracking-wide mb-1">Threat</h4>
                  <p className="text-orange-700 dark:text-orange-300 text-xs">{insights.competitorThreat}</p>
                </div>
              </div>

              {/* Earned Media Insight */}
              {insights.earnedMediaInsight && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border-l-3 border-purple-500">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-200 text-xs uppercase tracking-wide mb-1">Earned Media</h4>
                  <p className="text-purple-700 dark:text-purple-300 text-xs">{insights.earnedMediaInsight}</p>
                </div>
              )}

              {/* Regenerate button */}
              <div className="text-center pt-1">
                <button
                  onClick={() => {
                    setInsights(null);
                    const brandVideos = data.allVideos.filter(v => v.isBrandOwned);
                    const ownedVideos = ownedChannelId ? brandVideos.filter(v => getMediaType(v) === 'owned') : [];
                    const earnedVideos = ownedChannelId ? brandVideos.filter(v => getMediaType(v) === 'earned') : [];
                    const ownedViews = ownedVideos.reduce((sum, v) => sum + v.viewsCount, 0);
                    const earnedViews = earnedVideos.reduce((sum, v) => sum + v.viewsCount, 0);
                    const earnedSources = computeEarnedMediaSources(earnedVideos);
                    fetchAIInsights(data, ownedVideos.length, earnedVideos.length, ownedViews, earnedViews, earnedSources);
                  }}
                  className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-xs font-medium"
                >
                  Regenerate
                </button>
              </div>
            </div>
          )}
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
