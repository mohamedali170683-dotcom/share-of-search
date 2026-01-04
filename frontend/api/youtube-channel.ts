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
 * Resolve a channel identifier (handle, custom URL, or ID) to a channel ID
 */
async function resolveChannelId(
  identifier: string,
  apiKey: string
): Promise<{ channelId: string | null; error?: string }> {
  // Already a channel ID
  if (identifier.startsWith('UC') && identifier.length === 24) {
    return { channelId: identifier };
  }

  // Handle format (@username)
  const handle = identifier.startsWith('@') ? identifier : `@${identifier}`;

  try {
    // First try to search by handle
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'channel');
    searchUrl.searchParams.set('q', handle);
    searchUrl.searchParams.set('maxResults', '5');
    searchUrl.searchParams.set('key', apiKey);

    const searchResponse = await fetch(searchUrl.toString());

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('YouTube search API error:', errorData);
      return { channelId: null, error: `API error: ${searchResponse.status}` };
    }

    const searchData = await searchResponse.json();
    const items = searchData.items || [];

    // Find exact match for handle
    for (const item of items) {
      const channelId = item.id?.channelId || item.snippet?.channelId;
      if (channelId) {
        // Verify this is the right channel by fetching its details
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

    // If no exact match, return the first result
    if (items.length > 0) {
      const channelId = items[0].id?.channelId || items[0].snippet?.channelId;
      if (channelId) {
        return { channelId };
      }
    }

    return { channelId: null, error: 'Channel not found' };
  } catch (error) {
    console.error('Error resolving channel ID:', error);
    return { channelId: null, error: `Exception: ${error}` };
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
    const { channelIdentifier, includeVideos = true, maxVideos = 50 } = req.body;

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

    console.log(`Fetching YouTube channel data for: ${channelIdentifier}`);

    // Resolve channel identifier to ID
    const { channelId, error: resolveError } = await resolveChannelId(channelIdentifier, apiKey);

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
