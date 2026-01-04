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
  methodology: {
    sovByCountFormula: string;
    sovByViewsFormula: string;
    brandComparisonMethod: string;
    ownedMediaMethod: string;
    limitations: string[];
  };
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
 *
 * IMPORTANT LIMITATION: DataForSEO's YouTube API is a SEARCH API, not a channel listing API.
 * It can only return videos that appear in YouTube search results (max ~100-200 per search).
 * To get ALL videos from a channel (e.g., 400+), you would need YouTube Data API v3.
 *
 * This function works around the limitation by:
 * 1. Searching for the channel name/handle
 * 2. Searching for variations (channel name + common terms)
 * 3. Filtering results to only include videos from the target channel
 */
async function fetchChannelVideos(
  channelInfo: OwnedChannelInfo,
  locationCode: number,
  languageCode: string,
  auth: string
): Promise<{ videos: YouTubeVideo[]; status: string; limitation: string }> {
  try {
    // Build multiple search terms to capture more videos
    const searchTerms: string[] = [];
    const baseName = channelInfo.name;

    // Primary search: channel name/handle
    if (channelInfo.id.startsWith('@')) {
      searchTerms.push(channelInfo.id);
      searchTerms.push(channelInfo.id.replace('@', ''));
    } else if (channelInfo.id.startsWith('UC')) {
      searchTerms.push(baseName);
    } else {
      searchTerms.push(channelInfo.id);
    }

    // Add variations to capture more videos
    if (baseName) {
      searchTerms.push(baseName);
      searchTerms.push(`${baseName} official`);
      searchTerms.push(`${baseName} channel`);
    }

    // Deduplicate search terms
    const uniqueTerms = [...new Set(searchTerms.map(t => t.toLowerCase()))].slice(0, 4);

    console.log(`Fetching channel videos with terms: ${uniqueTerms.join(', ')}`);

    // Fetch videos for each search term in parallel
    const allResults = await Promise.all(
      uniqueTerms.map(async (term) => {
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
              depth: 100, // Max depth per search
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

    const limitation = uniqueVideos.length > 0
      ? `Found ${uniqueVideos.length} videos via YouTube search. Note: This uses search results, not a full channel listing. The actual channel may have more videos.`
      : 'No videos found via search. Try using the channel handle (e.g., @ChannelName).';

    return { videos: uniqueVideos, status: 'ok', limitation };
  } catch (error) {
    console.error(`Channel fetch error for "${channelInfo.name}":`, error);
    return { videos: [], status: `Exception: ${error}`, limitation: 'Error fetching channel videos' };
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

    // Collect videos from owned channel fetches and limitations
    const ownedChannelVideos: YouTubeVideo[] = [];
    const channelLimitations: string[] = [];
    for (const result of channelResults) {
      ownedChannelVideos.push(...result.videos);
      if (result.limitation) {
        channelLimitations.push(result.limitation);
      }
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

    // Build methodology explanation
    const methodology = {
      sovByCountFormula: `SOV by Count = (Your Brand Videos / Total Brand Videos) × 100 = (${yourBrandData.totalVideosInTop20} / ${yourBrandData.totalVideosInTop20 + competitorData.reduce((s, c) => s + c.totalVideosInTop20, 0)}) × 100 = ${sov.byCount}%`,
      sovByViewsFormula: `SOV by Views = (Your Brand Views / Total Brand Views) × 100 = (${yourBrandData.totalViews.toLocaleString()} / ${(yourBrandData.totalViews + competitorData.reduce((s, c) => s + c.totalViews, 0)).toLocaleString()}) × 100 = ${sov.byViews}%`,
      brandComparisonMethod: 'Videos are matched to brands by searching YouTube for each brand name, then filtering videos where the title contains the brand name. Each brand gets credited for videos mentioning them in the title.',
      ownedMediaMethod: 'Owned media is identified by searching YouTube for your channel name/handle and filtering results to videos from your channel. Due to API limitations, this captures videos appearing in search results (typically 100-200), not the full channel library.',
      limitations: [
        'DataForSEO YouTube API is a SEARCH API, not a channel listing API. It cannot retrieve ALL videos from a channel.',
        `Owned channel search found ${uniqueOwnedChannelVideos.length} videos. Your actual channel may have significantly more videos.`,
        'For complete channel video counts, consider using the official YouTube Data API v3.',
        'Brand matching is based on video titles only - videos without the brand name in the title are not counted.',
        ...channelLimitations,
      ],
    };

    const response: YouTubeSOVResponse = {
      yourBrand: yourBrandData,
      competitors: competitorData,
      allVideos: videosWithOwnership.slice(0, 100), // Top 100 for display
      ownedChannelVideos: uniqueOwnedChannelVideos.slice(0, 200), // Up to 200 owned channel videos
      sov,
      ownedMediaStats,
      searchedKeywords: searchKeywords,
      timestamp: new Date().toISOString(),
      methodology,
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
