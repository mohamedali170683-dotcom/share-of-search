import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * YouTube Channel API (using YouTube Data API v3)
 *
 * This endpoint fetches complete channel information including:
 * - Total video count (accurate)
 * - Total view count
 * - Subscriber count
 * - Recent videos list
 *
 * Features:
 * - Multiple API key rotation (YOUTUBE_API_KEY, YOUTUBE_API_KEY_2, etc.)
 * - In-memory caching with 24-hour TTL to reduce API calls
 * - Quota exceeded detection and automatic key switching
 */

// ============================================
// API KEY ROTATION
// ============================================

interface ApiKeyState {
  key: string;
  quotaExceeded: boolean;
  quotaResetTime?: number; // Unix timestamp when quota should reset
}

// Load all available API keys from environment
function getApiKeys(): ApiKeyState[] {
  const keys: ApiKeyState[] = [];

  // Primary key
  if (process.env.YOUTUBE_API_KEY) {
    keys.push({ key: process.env.YOUTUBE_API_KEY, quotaExceeded: false });
  }

  // Additional keys (YOUTUBE_API_KEY_2, YOUTUBE_API_KEY_3, etc.)
  for (let i = 2; i <= 10; i++) {
    const key = process.env[`YOUTUBE_API_KEY_${i}`];
    if (key) {
      keys.push({ key, quotaExceeded: false });
    }
  }

  return keys;
}

// In-memory storage for API key states (persists across requests in same serverless instance)
let apiKeyStates: ApiKeyState[] | null = null;

function getApiKeyStates(): ApiKeyState[] {
  if (!apiKeyStates) {
    apiKeyStates = getApiKeys();
  }

  // Check if any quota-exceeded keys should be reset (quota resets at midnight PT)
  const now = Date.now();
  for (const state of apiKeyStates) {
    if (state.quotaExceeded && state.quotaResetTime && now > state.quotaResetTime) {
      console.log('[YouTube API] Resetting quota status for key (new day)');
      state.quotaExceeded = false;
      state.quotaResetTime = undefined;
    }
  }

  return apiKeyStates;
}

function getAvailableApiKey(): string | null {
  const states = getApiKeyStates();
  const available = states.find(s => !s.quotaExceeded);
  return available?.key || null;
}

function markKeyQuotaExceeded(key: string): void {
  const states = getApiKeyStates();
  const state = states.find(s => s.key === key);
  if (state) {
    state.quotaExceeded = true;
    // Set reset time to next midnight PT (UTC-8)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(8, 0, 0, 0); // Midnight PT = 8:00 UTC
    if (tomorrow <= now) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    state.quotaResetTime = tomorrow.getTime();
    console.log(`[YouTube API] Marked key as quota exceeded, will reset at ${tomorrow.toISOString()}`);
  }
}

// ============================================
// CACHING
// ============================================

interface CachedChannel {
  data: ChannelStatistics;
  timestamp: number;
  locationCode?: number;
}

// In-memory cache for channel lookups (24-hour TTL)
const channelCache = new Map<string, CachedChannel>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(identifier: string, locationCode?: number): string {
  return `${identifier.toLowerCase()}:${locationCode || 'global'}`;
}

function getCachedChannel(identifier: string, locationCode?: number): ChannelStatistics | null {
  const key = getCacheKey(identifier, locationCode);
  const cached = channelCache.get(key);

  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    console.log(`[YouTube API] Cache HIT for "${identifier}" (age: ${Math.round((Date.now() - cached.timestamp) / 60000)}min)`);
    return cached.data;
  }

  if (cached) {
    console.log(`[YouTube API] Cache EXPIRED for "${identifier}"`);
    channelCache.delete(key);
  }

  return null;
}

function setCachedChannel(identifier: string, data: ChannelStatistics, locationCode?: number): void {
  const key = getCacheKey(identifier, locationCode);
  channelCache.set(key, { data, timestamp: Date.now(), locationCode });
  console.log(`[YouTube API] Cached channel "${data.channelTitle}" for "${identifier}"`);

  // Also cache by channelId for direct lookups
  if (data.channelId && data.channelId !== identifier) {
    const idKey = getCacheKey(data.channelId, locationCode);
    channelCache.set(idKey, { data, timestamp: Date.now(), locationCode });
  }
}

// ============================================
// TYPES
// ============================================

interface ChannelStatistics {
  channelId: string;
  channelTitle: string;
  customUrl?: string;
  description?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

interface VideoItem {
  videoId: string;
  title: string;
  description?: string;
  publishedAt: string;
  thumbnailUrl?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  duration?: string;
}

interface YouTubeChannelResponse {
  channel: ChannelStatistics | null;
  recentVideos: VideoItem[];
  error?: string;
  quotaUsed?: number;
}

/**
 * Location code to country/region name mapping for search queries
 */
const LOCATION_NAMES: Record<number, { name: string; language: string }> = {
  2276: { name: 'Germany', language: 'de' },
  2250: { name: 'France', language: 'fr' },
  2826: { name: 'United Kingdom', language: 'en' },
  2840: { name: 'United States', language: 'en' },
  2724: { name: 'Spain', language: 'es' },
  2380: { name: 'Italy', language: 'it' },
  2528: { name: 'Netherlands', language: 'nl' },
  2056: { name: 'Belgium', language: 'fr' },
  2756: { name: 'Switzerland', language: 'de' },
  2040: { name: 'Austria', language: 'de' },
  2616: { name: 'Poland', language: 'pl' },
  2203: { name: 'Czech Republic', language: 'cs' },
  2076: { name: 'Brazil', language: 'pt' },
  2484: { name: 'Mexico', language: 'es' },
  2124: { name: 'Canada', language: 'en' },
  2036: { name: 'Australia', language: 'en' },
  2392: { name: 'Japan', language: 'ja' },
  2410: { name: 'South Korea', language: 'ko' },
  2156: { name: 'China', language: 'zh' },
  2356: { name: 'India', language: 'en' },
};

/**
 * German location name variants for brand searches
 */
const GERMAN_LOCATION_VARIANTS = ['Deutschland', 'Germany', 'DE', 'German'];

/**
 * Search for a channel with multiple query strategies
 * Prioritizes regional/local channels when locationCode is provided
 */
async function searchChannelWithStrategies(
  brandName: string,
  apiKey: string,
  locationCode?: number
): Promise<{ channelId: string; channelTitle: string; subscriberCount: number } | null> {
  const locationInfo = locationCode ? LOCATION_NAMES[locationCode] : null;

  // Build search queries - prioritize location-specific searches
  const searchQueries: string[] = [];

  // For Germany, use specific German terms first
  if (locationCode === 2276) {
    searchQueries.push(`${brandName} Deutschland`);
    searchQueries.push(`${brandName} Germany`);
    searchQueries.push(`${brandName} DE`);
  } else if (locationInfo) {
    searchQueries.push(`${brandName} ${locationInfo.name}`);
  }

  // Then try generic searches
  searchQueries.push(`${brandName} official`);
  searchQueries.push(brandName);

  // Store all found channels with their subscriber counts for ranking
  const foundChannels: Array<{
    channelId: string;
    channelTitle: string;
    subscriberCount: number;
    matchScore: number;
    customUrl?: string;
  }> = [];

  // YouTube uses ISO 3166-1 alpha-2 country codes
  const regionCodes: Record<number, string> = {
    2276: 'DE', 2250: 'FR', 2826: 'GB', 2840: 'US', 2724: 'ES',
    2380: 'IT', 2528: 'NL', 2056: 'BE', 2756: 'CH', 2040: 'AT',
    2616: 'PL', 2203: 'CZ', 2076: 'BR', 2484: 'MX', 2124: 'CA',
    2036: 'AU', 2392: 'JP', 2410: 'KR', 2156: 'CN', 2356: 'IN',
  };

  // Location keywords to look for in channel titles/descriptions
  const locationKeywords: Record<number, string[]> = {
    2276: ['deutschland', 'germany', 'german', 'de', 'deutsch'],
    2250: ['france', 'french', 'français', 'fr'],
    2826: ['uk', 'united kingdom', 'britain', 'british'],
    2840: ['usa', 'us', 'united states', 'america', 'american'],
    2724: ['spain', 'spanish', 'españa', 'es'],
    2380: ['italy', 'italian', 'italia', 'it'],
  };

  const targetLocationKeywords = locationCode ? (locationKeywords[locationCode] || [locationInfo?.name.toLowerCase()]) : [];

  // Try each search query (limit to 2 to save API quota - reduced from 3)
  console.log(`[YouTube API] Searching for "${brandName}" with ${Math.min(searchQueries.length, 2)} strategies (of ${searchQueries.length})`);

  let quotaExceeded = false;

  for (let i = 0; i < Math.min(searchQueries.length, 2); i++) {
    const query = searchQueries[i];

    // Skip remaining queries if quota is exceeded
    if (quotaExceeded) break;

    try {
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('type', 'channel');
      searchUrl.searchParams.set('q', query);
      searchUrl.searchParams.set('maxResults', '5'); // Reduced from 10 to save quota
      searchUrl.searchParams.set('key', apiKey);

      // Add region code if available
      if (locationCode && regionCodes[locationCode]) {
        searchUrl.searchParams.set('regionCode', regionCodes[locationCode]);
      }

      console.log(`[YouTube API] Search query ${i + 1}: "${query}"${locationCode ? ` (region: ${regionCodes[locationCode]})` : ''}`);

      const searchResponse = await fetch(searchUrl.toString());
      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error(`[YouTube API] Search failed for "${query}": ${searchResponse.status} - ${errorText}`);

        // Check for quota exceeded error
        if (searchResponse.status === 403 && errorText.includes('quotaExceeded')) {
          console.error('[YouTube API] QUOTA EXCEEDED - stopping all API calls');
          quotaExceeded = true;
          break;
        }
        continue;
      }

      const searchData = await searchResponse.json();
      const items = searchData.items || [];

      for (const item of items) {
        const channelId = item.id?.channelId || item.snippet?.channelId;
        const channelTitle = item.snippet?.title || '';

        if (!channelId) continue;

        // Skip if already found
        if (foundChannels.some(c => c.channelId === channelId)) continue;

        // Fetch full channel details
        const statsUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
        statsUrl.searchParams.set('part', 'statistics,snippet,brandingSettings');
        statsUrl.searchParams.set('id', channelId);
        statsUrl.searchParams.set('key', apiKey);

        const statsResponse = await fetch(statsUrl.toString());
        if (!statsResponse.ok) continue;

        const statsData = await statsResponse.json();
        const channel = statsData.items?.[0];
        if (!channel) continue;

        const subscriberCount = parseInt(channel.statistics?.subscriberCount || '0', 10);
        const title = channel.snippet?.title || channelTitle;
        const description = (channel.snippet?.description || '').toLowerCase();
        const customUrl = channel.snippet?.customUrl || '';
        const country = channel.snippet?.country?.toLowerCase() || '';

        // Calculate match score
        let matchScore = 0;
        const titleLower = title.toLowerCase();
        const brandLower = brandName.toLowerCase();
        const customUrlLower = customUrl.toLowerCase();

        // CRITICAL: Check if this is the brand's channel (brand name in title)
        if (titleLower.includes(brandLower)) {
          matchScore += 100;
        } else {
          // If brand name not in title, heavily penalize (likely not the right channel)
          matchScore -= 200;
        }

        // STRONG BONUS: Location match in channel title (e.g., "Michelin Deutschland")
        // This is the most important factor for regional channels
        let hasLocationMatch = false;
        for (const keyword of targetLocationKeywords) {
          if (titleLower.includes(keyword) || customUrlLower.includes(keyword)) {
            matchScore += 200; // Very strong bonus for regional match
            hasLocationMatch = true;
            break;
          }
        }

        // Country match from channel settings
        if (locationCode && regionCodes[locationCode]) {
          const targetCountry = regionCodes[locationCode].toLowerCase();
          if (country === targetCountry) {
            matchScore += 50;
          }
        }

        // Official indicators
        if (titleLower.includes('official') || description.includes('official')) {
          matchScore += 30;
        }

        // Subscriber count bonus (larger channels are more likely to be official)
        if (subscriberCount > 10000) matchScore += 10;
        if (subscriberCount > 100000) matchScore += 20;
        if (subscriberCount > 1000000) matchScore += 30;

        // Penalize if clearly not the brand
        if (titleLower.includes('fan') || titleLower.includes('unofficial') || titleLower.includes('news')) {
          matchScore -= 100;
        }

        // Penalize global channel if we're looking for regional and found a regional one
        if (locationCode && !hasLocationMatch && foundChannels.some(c => c.matchScore > 200)) {
          matchScore -= 50; // Prefer regional over global
        }

        foundChannels.push({
          channelId,
          channelTitle: title,
          subscriberCount,
          matchScore,
          customUrl,
        });

        console.log(`  Found: "${title}" (score: ${matchScore}, subs: ${subscriberCount}, location: ${hasLocationMatch ? 'YES' : 'no'})`);
      }
    } catch (error) {
      console.warn(`Search query "${query}" failed:`, error);
    }
  }

  // If quota exceeded and no results, throw specific error
  if (quotaExceeded && foundChannels.length === 0) {
    throw new Error('QUOTA_EXCEEDED');
  }

  // Sort by match score (descending), then by subscriber count
  foundChannels.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return b.subscriberCount - a.subscriberCount;
  });

  if (foundChannels.length > 0) {
    const best = foundChannels[0];
    console.log(`✓ Best match for "${brandName}": ${best.channelTitle} (score: ${best.matchScore}, subs: ${best.subscriberCount})`);
    return {
      channelId: best.channelId,
      channelTitle: best.channelTitle,
      subscriberCount: best.subscriberCount,
    };
  }

  return null;
}

/**
 * Resolve a channel identifier (handle, custom URL, or ID) to a channel ID
 */
async function resolveChannelId(
  identifier: string,
  apiKey: string,
  locationCode?: number
): Promise<{ channelId: string | null; error?: string }> {
  // Already a channel ID
  if (identifier.startsWith('UC') && identifier.length === 24) {
    return { channelId: identifier };
  }

  // Handle format (@username) - search directly
  if (identifier.startsWith('@')) {
    const handle = identifier;
    console.log(`[YouTube API] Resolving handle: ${handle}`);

    try {
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('type', 'channel');
      searchUrl.searchParams.set('q', handle);
      searchUrl.searchParams.set('maxResults', '5');
      searchUrl.searchParams.set('key', apiKey);

      const searchResponse = await fetch(searchUrl.toString());

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const items = searchData.items || [];
        console.log(`[YouTube API] Handle search returned ${items.length} results for ${handle}`);

        if (items.length > 0) {
          // Try to find best match by checking customUrl
          const handleLower = handle.toLowerCase().replace('@', '');

          for (const item of items) {
            const channelId = item.id?.channelId || item.snippet?.channelId;
            if (!channelId) continue;

            // Verify channel and check customUrl
            const verifyUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
            verifyUrl.searchParams.set('part', 'snippet');
            verifyUrl.searchParams.set('id', channelId);
            verifyUrl.searchParams.set('key', apiKey);

            const verifyResponse = await fetch(verifyUrl.toString());
            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              const channel = verifyData.items?.[0];
              const customUrl = (channel?.snippet?.customUrl || '').toLowerCase().replace('@', '');

              // Check for match (exact or partial)
              if (customUrl === handleLower || customUrl.includes(handleLower) || handleLower.includes(customUrl)) {
                console.log(`Found exact match for ${handle}: ${channel?.snippet?.title} (${channelId})`);
                return { channelId };
              }
            }
          }

          // If no exact match, return first result
          const firstChannelId = items[0].id?.channelId || items[0].snippet?.channelId;
          if (firstChannelId) {
            console.log(`No exact match for ${handle}, using first result: ${firstChannelId}`);
            return { channelId: firstChannelId };
          }
        }
      } else {
        const errorText = await searchResponse.text();
        console.error(`[YouTube API] Search API error for ${handle}: ${searchResponse.status} - ${errorText}`);
        // Check for quota exceeded
        if (searchResponse.status === 403 && errorText.includes('quotaExceeded')) {
          return { channelId: null, error: 'YouTube API quota exceeded. Try again tomorrow.' };
        }
      }
    } catch (error) {
      console.error('[YouTube API] Error resolving handle:', error);
    }
  }

  // For brand names (not handles), use multi-strategy search
  try {
    const result = await searchChannelWithStrategies(identifier, apiKey, locationCode);
    if (result) {
      return { channelId: result.channelId };
    }
    return { channelId: null, error: 'Channel not found' };
  } catch (error) {
    if (error instanceof Error && error.message === 'QUOTA_EXCEEDED') {
      return { channelId: null, error: 'YouTube API quota exceeded. Try again tomorrow.' };
    }
    throw error;
  }
}

/**
 * Fetch channel statistics
 */
async function fetchChannelStats(
  channelId: string,
  apiKey: string
): Promise<ChannelStatistics | null> {
  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/channels');
    url.searchParams.set('part', 'snippet,statistics,brandingSettings');
    url.searchParams.set('id', channelId);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error('YouTube channels API error:', response.status);
      return null;
    }

    const data = await response.json();
    const channel = data.items?.[0];

    if (!channel) {
      return null;
    }

    const stats = channel.statistics || {};
    const snippet = channel.snippet || {};

    return {
      channelId,
      channelTitle: snippet.title || '',
      customUrl: snippet.customUrl,
      description: snippet.description,
      publishedAt: snippet.publishedAt,
      thumbnailUrl: snippet.thumbnails?.default?.url,
      subscriberCount: parseInt(stats.subscriberCount || '0', 10),
      videoCount: parseInt(stats.videoCount || '0', 10),
      viewCount: parseInt(stats.viewCount || '0', 10),
    };
  } catch (error) {
    console.error('Error fetching channel stats:', error);
    return null;
  }
}

/**
 * Fetch recent videos from a channel using the uploads playlist
 */
async function fetchChannelVideos(
  channelId: string,
  apiKey: string,
  maxResults: number = 50
): Promise<VideoItem[]> {
  try {
    // First, get the uploads playlist ID
    const channelUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
    channelUrl.searchParams.set('part', 'contentDetails');
    channelUrl.searchParams.set('id', channelId);
    channelUrl.searchParams.set('key', apiKey);

    const channelResponse = await fetch(channelUrl.toString());
    if (!channelResponse.ok) {
      return [];
    }

    const channelData = await channelResponse.json();
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      return [];
    }

    // Fetch videos from the uploads playlist
    const playlistUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    playlistUrl.searchParams.set('part', 'snippet,contentDetails');
    playlistUrl.searchParams.set('playlistId', uploadsPlaylistId);
    playlistUrl.searchParams.set('maxResults', Math.min(maxResults, 50).toString());
    playlistUrl.searchParams.set('key', apiKey);

    const playlistResponse = await fetch(playlistUrl.toString());
    if (!playlistResponse.ok) {
      return [];
    }

    const playlistData = await playlistResponse.json();
    const items = playlistData.items || [];

    // Get video IDs for statistics fetch
    const videoIds = items.map((item: { contentDetails?: { videoId?: string } }) =>
      item.contentDetails?.videoId
    ).filter(Boolean);

    // Fetch video statistics
    let videoStats: Record<string, { viewCount: string; likeCount: string; commentCount: string; duration: string }> = {};
    if (videoIds.length > 0) {
      const statsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      statsUrl.searchParams.set('part', 'statistics,contentDetails');
      statsUrl.searchParams.set('id', videoIds.join(','));
      statsUrl.searchParams.set('key', apiKey);

      const statsResponse = await fetch(statsUrl.toString());
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        for (const video of statsData.items || []) {
          videoStats[video.id] = {
            viewCount: video.statistics?.viewCount || '0',
            likeCount: video.statistics?.likeCount || '0',
            commentCount: video.statistics?.commentCount || '0',
            duration: video.contentDetails?.duration || '',
          };
        }
      }
    }

    return items.map((item: { snippet?: { title?: string; description?: string; publishedAt?: string; thumbnails?: { default?: { url?: string } } }; contentDetails?: { videoId?: string } }) => {
      const snippet = item.snippet || {};
      const videoId = item.contentDetails?.videoId || '';
      const stats = videoStats[videoId] || {};

      return {
        videoId,
        title: snippet.title || '',
        description: snippet.description,
        publishedAt: snippet.publishedAt || '',
        thumbnailUrl: snippet.thumbnails?.default?.url,
        viewCount: parseInt(stats.viewCount || '0', 10),
        likeCount: parseInt(stats.likeCount || '0', 10),
        commentCount: parseInt(stats.commentCount || '0', 10),
        duration: formatDuration(stats.duration || ''),
      };
    });
  } catch (error) {
    console.error('Error fetching channel videos:', error);
    return [];
  }
}

/**
 * Convert ISO 8601 duration to human-readable format
 */
function formatDuration(isoDuration: string): string {
  if (!isoDuration) return '';

  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return isoDuration;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { channelIdentifier, includeVideos = true, maxVideos = 50, locationCode } = req.body;

    if (!channelIdentifier || typeof channelIdentifier !== 'string') {
      return res.status(400).json({ error: 'channelIdentifier is required (handle, custom URL, or channel ID)' });
    }

    // Get available API key (with rotation support)
    const apiKeyStates = getApiKeyStates();
    const apiKey = getAvailableApiKey();

    // Debug: Log API key status
    const totalKeys = apiKeyStates.length;
    const availableKeys = apiKeyStates.filter(s => !s.quotaExceeded).length;
    console.log(`[YouTube API] Request for: "${channelIdentifier}", API keys: ${availableKeys}/${totalKeys} available, locationCode: ${locationCode || 'none'}`);

    if (!apiKey) {
      const allExhausted = totalKeys > 0;
      console.error(`[YouTube API] ${allExhausted ? 'All API keys quota exceeded' : 'No YOUTUBE_API_KEY configured'}`);
      return res.status(allExhausted ? 429 : 500).json({
        error: allExhausted
          ? 'All YouTube API keys quota exceeded. Try again tomorrow.'
          : 'YouTube API key not configured. Add YOUTUBE_API_KEY to environment variables.',
        channel: null,
        recentVideos: [],
        debug: { apiKeyConfigured: totalKeys > 0, keysAvailable: availableKeys, totalKeys },
      });
    }

    // Check cache first (only for stats, not videos)
    const cachedChannel = getCachedChannel(channelIdentifier, locationCode);
    if (cachedChannel && !includeVideos) {
      console.log(`[YouTube API] Returning cached result for "${channelIdentifier}"`);
      return res.status(200).json({
        channel: cachedChannel,
        recentVideos: [],
        quotaUsed: 0, // No API call made
        cached: true,
      });
    }

    console.log(`[YouTube API] Fetching channel data for: ${channelIdentifier}${locationCode ? ` (location: ${locationCode})` : ''}`);

    // Resolve channel identifier to ID (with location-aware search for brand names)
    console.log(`[YouTube API] Resolving channel identifier: "${channelIdentifier}"`);
    const { channelId, error: resolveError } = await resolveChannelId(channelIdentifier, apiKey, locationCode);

    if (!channelId) {
      console.warn(`[YouTube API] Channel not found for: "${channelIdentifier}", error: ${resolveError}`);
      // Check if quota exceeded and mark the key
      const isQuotaError = resolveError?.includes('quota');
      if (isQuotaError) {
        markKeyQuotaExceeded(apiKey);
        // Try again with next available key
        const nextKey = getAvailableApiKey();
        if (nextKey) {
          console.log('[YouTube API] Retrying with next available API key...');
          const retryResult = await resolveChannelId(channelIdentifier, nextKey, locationCode);
          if (retryResult.channelId) {
            // Continue with the retry result
            const [channelStats, recentVideos] = await Promise.all([
              fetchChannelStats(retryResult.channelId, nextKey),
              includeVideos ? fetchChannelVideos(retryResult.channelId, nextKey, maxVideos) : Promise.resolve([]),
            ]);
            if (channelStats) {
              setCachedChannel(channelIdentifier, channelStats, locationCode);
              return res.status(200).json({ channel: channelStats, recentVideos, quotaUsed: includeVideos ? 4 : 2 });
            }
          }
        }
      }
      return res.status(isQuotaError ? 429 : 404).json({
        error: resolveError || 'Channel not found',
        channel: null,
        recentVideos: [],
        debug: { apiKeyConfigured: true, identifier: channelIdentifier, resolved: false, quotaExceeded: isQuotaError },
      });
    }

    console.log(`[YouTube API] Resolved channel ID: ${channelId}`);

    // Fetch channel stats and videos in parallel
    const [channelStats, recentVideos] = await Promise.all([
      fetchChannelStats(channelId, apiKey),
      includeVideos ? fetchChannelVideos(channelId, apiKey, maxVideos) : Promise.resolve([]),
    ]);

    if (!channelStats) {
      return res.status(404).json({
        error: 'Failed to fetch channel statistics',
        channel: null,
        recentVideos: [],
      });
    }

    // Cache the successful result
    setCachedChannel(channelIdentifier, channelStats, locationCode);

    console.log(`[YouTube API] Success! Channel "${channelStats.channelTitle}": ${channelStats.videoCount} total videos, ${channelStats.viewCount} total views`);

    const response: YouTubeChannelResponse = {
      channel: channelStats,
      recentVideos,
      quotaUsed: includeVideos ? 4 : 2, // Approximate quota cost
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('YouTube Channel API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: message,
      channel: null,
      recentVideos: [],
    });
  }
}
