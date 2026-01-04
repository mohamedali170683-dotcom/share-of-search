import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * YouTube SOV API
 * Fetches YouTube video rankings using DataForSEO SERP API
 *
 * Metrics:
 * - Share of Search: Count of videos mentioning brand in title / Total brand-mentioned videos
 * - Share of Voice: Total views on brand videos / Total views on all identified brand videos
 *
 * Brand matching: Based on video title containing brand name (not channel name)
 *
 * NEW: Also fetches videos directly from owned channels to properly count owned media
 */

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
  isFromOwnedChannel?: boolean; // True if this video came from fetching channel videos directly
}

interface OwnedChannelInfo {
  id: string;
  name: string;
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
  ownedChannelVideos: YouTubeVideo[]; // Videos fetched directly from owned channels
  sov: {
    byCount: number;
    byViews: number;
  };
  ownedMediaStats: {
    totalVideos: number;
    totalViews: number;
  };
  searchedKeywords: string[];
  timestamp: string;
  debug?: {
    totalVideosFetched: number;
    channelVideosFetched: number;
    apiStatus: string;
  };
}

/**
 * Fetch YouTube SERP results for a keyword
 */
async function fetchYouTubeSERP(
  keyword: string,
  locationCode: number,
  languageCode: string,
  auth: string
): Promise<{ videos: YouTubeVideo[]; status: string }> {
  const videos: YouTubeVideo[] = [];

  try {
    console.log(`Calling YouTube SERP API for "${keyword}" (location: ${locationCode}, lang: ${languageCode})`);

    const response = await fetch(
      'https://api.dataforseo.com/v3/serp/youtube/organic/live/advanced',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          keyword,
          location_code: locationCode,
          language_code: languageCode,
          device: 'desktop',
          block_depth: 100,
        }]),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`YouTube SERP failed for "${keyword}": ${response.status} - ${errorText}`);
      return { videos: [], status: `API error: ${response.status}` };
    }

    const data = await response.json();

    // Log full response for debugging
    console.log(`YouTube API response for "${keyword}":`, JSON.stringify(data).substring(0, 500));

    const taskStatus = data?.tasks?.[0]?.status_message || 'unknown';
    const items = data?.tasks?.[0]?.result?.[0]?.items || [];

    console.log(`YouTube SERP for "${keyword}": status=${taskStatus}, items=${items.length}`);

    for (const item of items) {
      if (item.type === 'youtube_video') {
        videos.push({
          videoId: item.video_id || '',
          title: item.title || '',
          url: item.url || '',
          channelId: item.channel_id || '',
          channelName: item.channel_name || '',
          viewsCount: item.views_count || 0,
          duration: item.duration || '',
          publishedDate: item.published_date || '',
          rank: item.rank_group || 0,
          thumbnail: item.thumbnail?.url,
        });
      }
    }

    return { videos, status: taskStatus };
  } catch (error) {
    console.error(`YouTube SERP error for "${keyword}":`, error);
    return { videos: [], status: `Exception: ${error}` };
  }
}

/**
 * Fetch videos from a specific YouTube channel by searching for channel content
 * Uses the channel handle/name as a search term to find their videos
 */
async function fetchChannelVideos(
  channelInfo: OwnedChannelInfo,
  locationCode: number,
  languageCode: string,
  auth: string
): Promise<{ videos: YouTubeVideo[]; status: string }> {
  try {
    // Search for the channel's videos using various search strategies
    // Strategy 1: Search using channel handle (e.g., "@ContinentalTires")
    // Strategy 2: Search using channel name directly
    const searchTerms: string[] = [];

    // If it's a handle (starts with @), use it directly
    if (channelInfo.id.startsWith('@')) {
      searchTerms.push(channelInfo.id);
    } else if (channelInfo.id.startsWith('UC')) {
      // It's a channel ID - search using the channel name
      searchTerms.push(channelInfo.name);
    } else {
      // Could be a custom URL or name
      searchTerms.push(channelInfo.id);
      if (channelInfo.name !== channelInfo.id) {
        searchTerms.push(channelInfo.name);
      }
    }

    console.log(`Fetching channel videos for: ${searchTerms.join(', ')}`);

    // Fetch videos for each search term in parallel
    const allResults = await Promise.all(
      searchTerms.map(async (term) => {
        const response = await fetch(
          'https://api.dataforseo.com/v3/serp/youtube/organic/live/advanced',
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify([{
              keyword: term,
              location_code: locationCode,
              language_code: languageCode,
              device: 'desktop',
              block_depth: 200, // Get more results for channel videos
            }]),
          }
        );

        if (!response.ok) {
          console.error(`Channel search failed for "${term}": ${response.status}`);
          return [];
        }

        const data = await response.json();
        const items = data?.tasks?.[0]?.result?.[0]?.items || [];

        console.log(`Channel search for "${term}": ${items.length} items`);

        return items
          .filter((item: Record<string, unknown>) => item.type === 'youtube_video')
          .map((item: Record<string, unknown>) => ({
            videoId: item.video_id || '',
            title: item.title || '',
            url: item.url || '',
            channelId: item.channel_id || '',
            channelName: item.channel_name || '',
            viewsCount: item.views_count || 0,
            duration: item.duration || '',
            publishedDate: item.published_date || '',
            rank: item.rank_group || 0,
            thumbnail: (item.thumbnail as { url?: string })?.url,
            isFromOwnedChannel: true,
          }));
      })
    );

    // Combine and filter to only include videos from the target channel
    const combinedVideos = allResults.flat();

    // Normalize channel identifiers for matching
    const normalizeId = (id: string) => id.toLowerCase().replace(/@/g, '').replace(/[^a-z0-9]/g, '');
    const targetIds = [
      normalizeId(channelInfo.id),
      normalizeId(channelInfo.name),
    ].filter(Boolean);

    // Filter to only videos from this channel
    const channelVideos = combinedVideos.filter((video: YouTubeVideo) => {
      const videoChannelId = normalizeId(video.channelId || '');
      const videoChannelName = normalizeId(video.channelName || '');

      return targetIds.some(targetId =>
        videoChannelId.includes(targetId) ||
        targetId.includes(videoChannelId) ||
        videoChannelName.includes(targetId) ||
        targetId.includes(videoChannelName)
      );
    });

    console.log(`Found ${channelVideos.length} videos from channel ${channelInfo.name}`);

    // Deduplicate by video ID
    const uniqueVideos = Array.from(
      new Map(channelVideos.map((v: YouTubeVideo) => [v.videoId, v])).values()
    );

    return { videos: uniqueVideos, status: 'ok' };
  } catch (error) {
    console.error(`Channel fetch error for "${channelInfo.name}":`, error);
    return { videos: [], status: `Exception: ${error}` };
  }
}

/**
 * Check if a video mentions a brand in its title
 * Only uses title matching for cleaner brand attribution
 */
function videoMentionsBrand(video: YouTubeVideo, brandName: string): boolean {
  const titleLower = video.title.toLowerCase();
  const brandLower = brandName.toLowerCase();

  // Direct brand name in title
  if (titleLower.includes(brandLower)) return true;

  // Check for brand words (words > 3 chars) to catch variations
  const brandWords = brandLower.split(/\s+/);
  if (brandWords.some(word => word.length > 3 && titleLower.includes(word))) {
    return true;
  }

  return false;
}

/**
 * Aggregate videos for a brand across search results
 * Uses title-based matching only
 */
function aggregateBrandVideos(
  allVideos: YouTubeVideo[],
  brandName: string
): BrandYouTubeData {
  const brandVideos = allVideos.filter(v => videoMentionsBrand(v, brandName));

  // Deduplicate by video ID
  const uniqueVideos = Array.from(
    new Map(brandVideos.map(v => [v.videoId, v])).values()
  );

  const totalViews = uniqueVideos.reduce((sum, v) => sum + v.viewsCount, 0);

  return {
    name: brandName,
    videos: uniqueVideos.slice(0, 20),
    totalVideosInTop20: uniqueVideos.length,
    totalViews,
  };
}

/**
 * Calculate YouTube SOV
 */
function calculateYouTubeSOV(
  yourBrand: BrandYouTubeData,
  competitors: BrandYouTubeData[]
): { byCount: number; byViews: number } {
  const yourVideosInTop20 = yourBrand.totalVideosInTop20;
  const competitorVideosInTop20 = competitors.reduce(
    (sum, c) => sum + c.totalVideosInTop20, 0
  );

  const totalIdentifiedVideos = yourVideosInTop20 + competitorVideosInTop20;
  const byCount = totalIdentifiedVideos > 0
    ? Math.round((yourVideosInTop20 / totalIdentifiedVideos) * 100 * 10) / 10
    : 0;

  const yourViews = yourBrand.totalViews;
  const competitorViews = competitors.reduce((sum, c) => sum + c.totalViews, 0);
  const totalViews = yourViews + competitorViews;
  const byViews = totalViews > 0
    ? Math.round((yourViews / totalViews) * 100 * 10) / 10
    : 0;

  return { byCount, byViews };
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
    const {
      brandName,
      competitors = [],
      locationCode = 2840,
      languageCode = 'en',
      ownedChannels = [], // Array of { id, name } objects for owned YouTube channels
    } = req.body;

    if (!brandName || typeof brandName !== 'string') {
      return res.status(400).json({ error: 'brandName is required' });
    }

    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      return res.status(500).json({
        error: 'DataForSEO credentials not configured'
      });
    }

    const auth = Buffer.from(`${login}:${password}`).toString('base64');

    const validCompetitors = Array.isArray(competitors)
      ? competitors.filter((c): c is string => typeof c === 'string').slice(0, 4)
      : [];

    // Validate owned channels
    const validOwnedChannels: OwnedChannelInfo[] = Array.isArray(ownedChannels)
      ? ownedChannels.filter((c): c is OwnedChannelInfo =>
          c && typeof c.id === 'string' && typeof c.name === 'string'
        ).slice(0, 5)
      : [];

    const searchKeywords = [brandName, ...validCompetitors];

    console.log(`Fetching YouTube data for: ${searchKeywords.join(', ')}`);
    console.log(`Owned channels to fetch: ${validOwnedChannels.map(c => c.name).join(', ') || 'none'}`);

    // Fetch YouTube results for ALL keywords in PARALLEL to avoid timeout
    // Vercel has 30s timeout, and each request takes 5-17s, so parallel is essential
    const [keywordResults, channelResults] = await Promise.all([
      // Fetch brand/competitor search results
      Promise.all(
        searchKeywords.map(keyword => fetchYouTubeSERP(keyword, locationCode, languageCode, auth))
      ),
      // Fetch videos from owned channels in parallel
      validOwnedChannels.length > 0
        ? Promise.all(
            validOwnedChannels.map(channel => fetchChannelVideos(channel, locationCode, languageCode, auth))
          )
        : Promise.resolve([]),
    ]);

    // Collect all videos from keyword search results
    const allVideos: YouTubeVideo[] = [];
    let apiStatus = 'ok';

    for (const result of keywordResults) {
      allVideos.push(...result.videos);
      if (result.status !== 'Ok.' && result.status !== 'ok') {
        apiStatus = result.status;
      }
    }

    console.log(`Total videos from keyword search: ${allVideos.length}`);

    // Collect videos from owned channel fetches
    const ownedChannelVideos: YouTubeVideo[] = [];
    for (const result of channelResults) {
      ownedChannelVideos.push(...result.videos);
    }

    console.log(`Total videos from owned channels: ${ownedChannelVideos.length}`);

    // Deduplicate all videos by ID
    const uniqueAllVideos = Array.from(
      new Map(allVideos.map(v => [v.videoId, v])).values()
    ).sort((a, b) => a.rank - b.rank);

    // Deduplicate owned channel videos
    const uniqueOwnedChannelVideos = Array.from(
      new Map(ownedChannelVideos.map(v => [v.videoId, v])).values()
    ).sort((a, b) => b.viewsCount - a.viewsCount); // Sort by views for owned content

    // Calculate owned media stats
    const ownedMediaStats = {
      totalVideos: uniqueOwnedChannelVideos.length,
      totalViews: uniqueOwnedChannelVideos.reduce((sum, v) => sum + v.viewsCount, 0),
    };

    // Mark videos that mention the brand in title
    const videosWithOwnership = uniqueAllVideos.map(v => ({
      ...v,
      isBrandOwned: videoMentionsBrand(v, brandName),
    }));

    // Aggregate by brand
    const yourBrandData = aggregateBrandVideos(allVideos, brandName);
    const competitorData = validCompetitors.map(comp =>
      aggregateBrandVideos(allVideos, comp)
    );

    // Calculate SOV
    const sov = calculateYouTubeSOV(yourBrandData, competitorData);

    const response: YouTubeSOVResponse = {
      yourBrand: yourBrandData,
      competitors: competitorData,
      allVideos: videosWithOwnership.slice(0, 100), // Top 100 for display
      ownedChannelVideos: uniqueOwnedChannelVideos.slice(0, 200), // Up to 200 owned channel videos
      sov,
      ownedMediaStats,
      searchedKeywords: searchKeywords,
      timestamp: new Date().toISOString(),
      debug: {
        totalVideosFetched: allVideos.length,
        channelVideosFetched: ownedChannelVideos.length,
        apiStatus,
      },
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('YouTube SOV error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
