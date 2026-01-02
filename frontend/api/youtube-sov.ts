import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * YouTube SOV API
 * Fetches YouTube video rankings using DataForSEO SERP API
 * Calculates Share of Voice based on video presence and engagement
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
  sov: {
    byCount: number;
    byViews: number;
  };
  searchedKeywords: string[];
  timestamp: string;
}

/**
 * Fetch YouTube SERP results for a keyword
 */
async function fetchYouTubeSERP(
  keyword: string,
  locationCode: number,
  languageCode: string,
  auth: string
): Promise<YouTubeVideo[]> {
  const videos: YouTubeVideo[] = [];

  try {
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
          depth: 20,
        }]),
      }
    );

    if (!response.ok) {
      console.error(`YouTube SERP failed for "${keyword}": ${response.status}`);
      return [];
    }

    const data = await response.json();
    const items = data?.tasks?.[0]?.result?.[0]?.items || [];

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

    console.log(`YouTube SERP for "${keyword}": ${videos.length} videos found`);
  } catch (error) {
    console.error(`YouTube SERP error for "${keyword}":`, error);
  }

  return videos;
}

/**
 * Check if a video belongs to a brand (by channel name matching)
 */
function videoBelongsToBrand(video: YouTubeVideo, brandName: string): boolean {
  const channelLower = video.channelName.toLowerCase();
  const brandLower = brandName.toLowerCase();

  // Direct match
  if (channelLower.includes(brandLower)) return true;

  // Handle common brand variations
  const brandWords = brandLower.split(/\s+/);
  if (brandWords.some(word => word.length > 3 && channelLower.includes(word))) {
    return true;
  }

  return false;
}

/**
 * Aggregate videos for a brand across search results
 */
function aggregateBrandVideos(
  allVideos: YouTubeVideo[],
  brandName: string
): BrandYouTubeData {
  const brandVideos = allVideos.filter(v => videoBelongsToBrand(v, brandName));

  // Deduplicate by video ID
  const uniqueVideos = Array.from(
    new Map(brandVideos.map(v => [v.videoId, v])).values()
  );

  const top20Videos = uniqueVideos.filter(v => v.rank <= 20);
  const totalViews = top20Videos.reduce((sum, v) => sum + v.viewsCount, 0);

  return {
    name: brandName,
    videos: top20Videos.slice(0, 10), // Return top 10 for display
    totalVideosInTop20: top20Videos.length,
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

  // Count-based SOV
  const totalIdentifiedVideos = yourVideosInTop20 + competitorVideosInTop20;
  const byCount = totalIdentifiedVideos > 0
    ? Math.round((yourVideosInTop20 / totalIdentifiedVideos) * 100 * 10) / 10
    : 0;

  // Views-based SOV (engagement weighted)
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
    const { brandName, competitors = [], locationCode = 2840, languageCode = 'en' } = req.body;

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

    // Prepare search keywords (brand + competitors)
    const validCompetitors = Array.isArray(competitors)
      ? competitors.filter((c): c is string => typeof c === 'string').slice(0, 4)
      : [];

    const searchKeywords = [brandName, ...validCompetitors];

    console.log(`Fetching YouTube data for: ${searchKeywords.join(', ')}`);

    // Fetch YouTube results for each keyword
    const allVideos: YouTubeVideo[] = [];

    for (const keyword of searchKeywords) {
      const videos = await fetchYouTubeSERP(keyword, locationCode, languageCode, auth);
      allVideos.push(...videos);
    }

    console.log(`Total videos collected: ${allVideos.length}`);

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
      sov,
      searchedKeywords: searchKeywords,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('YouTube SOV error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
