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
 * Requires YOUTUBE_API_KEY environment variable
 */

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
 */
async function searchChannelWithStrategies(
  brandName: string,
  apiKey: string,
  locationCode?: number
): Promise<{ channelId: string; channelTitle: string; subscriberCount: number } | null> {
  const locationInfo = locationCode ? LOCATION_NAMES[locationCode] : null;

  // Build search queries in priority order
  const searchQueries: string[] = [];

  // 1. Brand name + location variant (e.g., "Michelin Deutschland")
  if (locationInfo) {
    if (locationCode === 2276) {
      // For Germany, try multiple variants
      for (const variant of GERMAN_LOCATION_VARIANTS) {
        searchQueries.push(`${brandName} ${variant}`);
      }
    } else {
      searchQueries.push(`${brandName} ${locationInfo.name}`);
    }
  }

  // 2. Brand name + "official" + location
  if (locationInfo) {
    searchQueries.push(`${brandName} official ${locationInfo.name}`);
  }

  // 3. Just brand name + "official"
  searchQueries.push(`${brandName} official`);
  searchQueries.push(`${brandName} official channel`);

  // 4. Just brand name
  searchQueries.push(brandName);

  // 5. Brand as handle
  const handleVariant = `@${brandName.toLowerCase().replace(/\s+/g, '')}`;
  searchQueries.push(handleVariant);

  // Store all found channels with their subscriber counts for ranking
  const foundChannels: Array<{
    channelId: string;
    channelTitle: string;
    subscriberCount: number;
    matchScore: number;
  }> = [];

  // Try each search query
  for (let i = 0; i < Math.min(searchQueries.length, 4); i++) {
    const query = searchQueries[i];

    try {
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('type', 'channel');
      searchUrl.searchParams.set('q', query);
      searchUrl.searchParams.set('maxResults', '5');
      searchUrl.searchParams.set('key', apiKey);

      // Add region code if available
      if (locationInfo) {
        // YouTube uses ISO 3166-1 alpha-2 country codes
        const regionCodes: Record<number, string> = {
          2276: 'DE', 2250: 'FR', 2826: 'GB', 2840: 'US', 2724: 'ES',
          2380: 'IT', 2528: 'NL', 2056: 'BE', 2756: 'CH', 2040: 'AT',
          2616: 'PL', 2203: 'CZ', 2076: 'BR', 2484: 'MX', 2124: 'CA',
          2036: 'AU', 2392: 'JP', 2410: 'KR', 2156: 'CN', 2356: 'IN',
        };
        const regionCode = regionCodes[locationCode!];
        if (regionCode) {
          searchUrl.searchParams.set('regionCode', regionCode);
        }
      }

      const searchResponse = await fetch(searchUrl.toString());
      if (!searchResponse.ok) continue;

      const searchData = await searchResponse.json();
      const items = searchData.items || [];

      for (const item of items) {
        const channelId = item.id?.channelId || item.snippet?.channelId;
        const channelTitle = item.snippet?.title || '';

        if (!channelId) continue;

        // Skip if already found
        if (foundChannels.some(c => c.channelId === channelId)) continue;

        // Fetch subscriber count
        const statsUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
        statsUrl.searchParams.set('part', 'statistics,snippet');
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

        // Calculate match score
        let matchScore = 0;
        const titleLower = title.toLowerCase();
        const brandLower = brandName.toLowerCase();

        // Exact brand name match in title
        if (titleLower.includes(brandLower)) matchScore += 100;

        // Official indicators
        if (titleLower.includes('official') || description.includes('official')) matchScore += 50;

        // Location match
        if (locationInfo) {
          const locLower = locationInfo.name.toLowerCase();
          if (titleLower.includes(locLower) || titleLower.includes('deutschland') || titleLower.includes('germany')) {
            matchScore += 75;
          }
        }

        // Verified/high subscriber count bonus (likely official)
        if (subscriberCount > 100000) matchScore += 30;
        if (subscriberCount > 1000000) matchScore += 20;

        // Penalize if title has other brand names (likely a fan channel)
        if (titleLower.includes('fan') || titleLower.includes('unofficial')) matchScore -= 50;

        foundChannels.push({
          channelId,
          channelTitle: title,
          subscriberCount,
          matchScore,
        });
      }
    } catch (error) {
      console.warn(`Search query "${query}" failed:`, error);
    }
  }

  // Sort by match score (descending), then by subscriber count
  foundChannels.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return b.subscriberCount - a.subscriberCount;
  });

  if (foundChannels.length > 0) {
    const best = foundChannels[0];
    console.log(`Best channel match for "${brandName}": ${best.channelTitle} (score: ${best.matchScore}, subs: ${best.subscriberCount})`);
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

  // Handle format (@username) - try exact match first
  if (identifier.startsWith('@')) {
    const handle = identifier;

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

        // Find exact match for handle
        for (const item of items) {
          const channelId = item.id?.channelId || item.snippet?.channelId;
          if (channelId) {
            const verifyUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
            verifyUrl.searchParams.set('part', 'snippet');
            verifyUrl.searchParams.set('id', channelId);
            verifyUrl.searchParams.set('key', apiKey);

            const verifyResponse = await fetch(verifyUrl.toString());
            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              const channel = verifyData.items?.[0];
              const customUrl = channel?.snippet?.customUrl?.toLowerCase();
              const handleLower = handle.toLowerCase().replace('@', '');

              if (customUrl === handleLower || customUrl === `@${handleLower}`) {
                return { channelId };
              }
            }
          }
        }

        // Return first result if no exact match
        if (items.length > 0) {
          const channelId = items[0].id?.channelId || items[0].snippet?.channelId;
          if (channelId) {
            return { channelId };
          }
        }
      }
    } catch (error) {
      console.error('Error resolving handle:', error);
    }
  }

  // For brand names (not handles), use multi-strategy search
  const result = await searchChannelWithStrategies(identifier, apiKey, locationCode);
  if (result) {
    return { channelId: result.channelId };
  }

  return { channelId: null, error: 'Channel not found' };
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

    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'YouTube API key not configured. Add YOUTUBE_API_KEY to environment variables.',
        channel: null,
        recentVideos: [],
      });
    }

    console.log(`Fetching YouTube channel data for: ${channelIdentifier}${locationCode ? ` (location: ${locationCode})` : ''}`);

    // Resolve channel identifier to ID (with location-aware search for brand names)
    const { channelId, error: resolveError } = await resolveChannelId(channelIdentifier, apiKey, locationCode);

    if (!channelId) {
      return res.status(404).json({
        error: resolveError || 'Channel not found',
        channel: null,
        recentVideos: [],
      });
    }

    console.log(`Resolved channel ID: ${channelId}`);

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

    console.log(`Channel ${channelStats.channelTitle}: ${channelStats.videoCount} total videos, ${channelStats.viewCount} total views`);

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
