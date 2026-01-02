import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Social Mentions API
 * Fetches brand mentions from social media platforms using Apify actors
 *
 * Uses free/affordable actors:
 * - apify/instagram-hashtag-scraper (free tier available)
 * - clockworks/tiktok-scraper (free tier available)
 * - streamers/reddit-scraper-lite (free tier available)
 */

interface SocialMention {
  platform: 'instagram' | 'tiktok' | 'youtube' | 'reddit';
  text: string;
  url?: string;
  engagement: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
  author?: string;
  timestamp?: string;
}

interface BrandMentions {
  brand: string;
  mentions: SocialMention[];
  totalMentions: number;
  totalEngagement: number;
  byPlatform: Record<string, { count: number; engagement: number }>;
}

interface SocialSOVResponse {
  yourBrand: BrandMentions;
  competitors: BrandMentions[];
  sov: {
    byMentions: number;
    byEngagement: number;
  };
  timestamp: string;
}

/**
 * Run an Apify actor and wait for results
 */
async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  apiToken: string,
  timeoutMs: number = 60000
): Promise<unknown[]> {
  try {
    console.log(`Starting actor ${actorId} with input:`, JSON.stringify(input));

    // Start the actor run
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }
    );

    const responseText = await runResponse.text();
    console.log(`Actor ${actorId} start response (${runResponse.status}):`, responseText.substring(0, 500));

    if (!runResponse.ok) {
      console.error(`Actor ${actorId} start failed with status ${runResponse.status}`);
      return [];
    }

    let runData;
    try {
      runData = JSON.parse(responseText);
    } catch {
      console.error(`Actor ${actorId} returned invalid JSON`);
      return [];
    }

    const runId = runData.data?.id;

    if (!runId) {
      console.error(`No run ID returned for actor ${actorId}`);
      return [];
    }

    // Poll for completion
    const pollInterval = 3000;
    let elapsed = 0;

    while (elapsed < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      elapsed += pollInterval;

      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiToken}`
      );

      if (!statusResponse.ok) continue;

      const statusData = await statusResponse.json();
      const status = statusData.data?.status;

      if (status === 'SUCCEEDED') {
        const datasetId = statusData.data?.defaultDatasetId;
        console.log(`Actor ${actorId} succeeded, dataset: ${datasetId}`);
        if (!datasetId) return [];

        const datasetResponse = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiToken}&limit=50`
        );

        if (!datasetResponse.ok) {
          console.error(`Failed to fetch dataset for ${actorId}`);
          return [];
        }
        const items = await datasetResponse.json();
        console.log(`Actor ${actorId} returned ${items.length} items`);
        return items;
      }

      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        console.error(`Actor ${actorId} run ${status}`);
        return [];
      }
    }

    console.error(`Actor ${actorId} timed out`);
    return [];
  } catch (error) {
    console.error(`Actor ${actorId} error:`, error);
    return [];
  }
}

/**
 * Fetch Instagram mentions using hashtag scraper
 */
async function fetchInstagramMentions(
  brandName: string,
  apiToken: string
): Promise<SocialMention[]> {
  const mentions: SocialMention[] = [];

  try {
    // Use Instagram Hashtag Scraper
    const hashtag = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const results = await runApifyActor(
      'apify/instagram-hashtag-scraper',
      {
        hashtags: [hashtag],
        resultsLimit: 20,
      },
      apiToken,
      45000
    ) as Array<{
      caption?: string;
      shortCode?: string;
      likesCount?: number;
      commentsCount?: number;
      videoViewCount?: number;
      ownerUsername?: string;
      timestamp?: string;
    }>;

    for (const item of results) {
      mentions.push({
        platform: 'instagram',
        text: item.caption || '',
        url: item.shortCode ? `https://instagram.com/p/${item.shortCode}` : undefined,
        engagement: {
          likes: item.likesCount || 0,
          comments: item.commentsCount || 0,
          views: item.videoViewCount || 0,
        },
        author: item.ownerUsername,
        timestamp: item.timestamp,
      });
    }
  } catch (error) {
    console.error('Instagram scraper error:', error);
  }

  return mentions;
}

/**
 * Fetch TikTok mentions
 */
async function fetchTikTokMentions(
  brandName: string,
  apiToken: string
): Promise<SocialMention[]> {
  const mentions: SocialMention[] = [];

  try {
    // Use TikTok Scraper
    const results = await runApifyActor(
      'clockworks/free-tiktok-scraper',
      {
        searchQueries: [brandName],
        resultsPerPage: 20,
      },
      apiToken,
      45000
    ) as Array<{
      text?: string;
      desc?: string;
      webVideoUrl?: string;
      diggCount?: number;
      commentCount?: number;
      shareCount?: number;
      playCount?: number;
      authorMeta?: { name?: string };
      createTime?: number;
    }>;

    for (const item of results) {
      mentions.push({
        platform: 'tiktok',
        text: item.text || item.desc || '',
        url: item.webVideoUrl,
        engagement: {
          likes: item.diggCount || 0,
          comments: item.commentCount || 0,
          shares: item.shareCount || 0,
          views: item.playCount || 0,
        },
        author: item.authorMeta?.name,
        timestamp: item.createTime ? new Date(item.createTime * 1000).toISOString() : undefined,
      });
    }
  } catch (error) {
    console.error('TikTok scraper error:', error);
  }

  return mentions;
}

/**
 * Fetch Reddit mentions
 */
async function fetchRedditMentions(
  brandName: string,
  apiToken: string
): Promise<SocialMention[]> {
  const mentions: SocialMention[] = [];

  try {
    // Use Reddit Scraper Lite (free)
    const results = await runApifyActor(
      'trudax/reddit-scraper-lite',
      {
        searches: [{ term: brandName, sort: 'relevance', time: 'month' }],
        maxItems: 20,
        type: 'posts',
      },
      apiToken,
      45000
    ) as Array<{
      title?: string;
      body?: string;
      url?: string;
      score?: number;
      numComments?: number;
      author?: string;
      createdAt?: string;
    }>;

    for (const item of results) {
      mentions.push({
        platform: 'reddit',
        text: item.title || item.body || '',
        url: item.url,
        engagement: {
          likes: item.score || 0,
          comments: item.numComments || 0,
        },
        author: item.author,
        timestamp: item.createdAt,
      });
    }
  } catch (error) {
    console.error('Reddit scraper error:', error);
  }

  return mentions;
}

/**
 * Aggregate mentions for a brand
 */
function aggregateMentions(brand: string, mentions: SocialMention[]): BrandMentions {
  const byPlatform: Record<string, { count: number; engagement: number }> = {};
  let totalEngagement = 0;

  for (const mention of mentions) {
    const engagement =
      (mention.engagement.likes || 0) +
      (mention.engagement.comments || 0) +
      (mention.engagement.shares || 0) +
      (mention.engagement.views || 0) / 100; // Weight views less

    totalEngagement += engagement;

    if (!byPlatform[mention.platform]) {
      byPlatform[mention.platform] = { count: 0, engagement: 0 };
    }
    byPlatform[mention.platform].count++;
    byPlatform[mention.platform].engagement += engagement;
  }

  return {
    brand,
    mentions,
    totalMentions: mentions.length,
    totalEngagement: Math.round(totalEngagement),
    byPlatform,
  };
}

/**
 * Calculate Share of Voice
 */
function calculateSOV(
  yourMentions: BrandMentions,
  competitorMentions: BrandMentions[]
): { byMentions: number; byEngagement: number } {
  const totalMentions = yourMentions.totalMentions +
    competitorMentions.reduce((sum, c) => sum + c.totalMentions, 0);

  const totalEngagement = yourMentions.totalEngagement +
    competitorMentions.reduce((sum, c) => sum + c.totalEngagement, 0);

  return {
    byMentions: totalMentions > 0
      ? Math.round((yourMentions.totalMentions / totalMentions) * 100 * 10) / 10
      : 0,
    byEngagement: totalEngagement > 0
      ? Math.round((yourMentions.totalEngagement / totalEngagement) * 100 * 10) / 10
      : 0,
  };
}

/**
 * Fetch all social mentions for a brand
 */
async function fetchAllMentions(brandName: string, apiToken: string): Promise<SocialMention[]> {
  // Run all scrapers in parallel
  const [instagram, tiktok, reddit] = await Promise.all([
    fetchInstagramMentions(brandName, apiToken),
    fetchTikTokMentions(brandName, apiToken),
    fetchRedditMentions(brandName, apiToken),
  ]);

  return [...instagram, ...tiktok, ...reddit];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
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
    const { brandName, competitors = [] } = req.body;

    if (!brandName || typeof brandName !== 'string') {
      return res.status(400).json({ error: 'brandName is required' });
    }

    const apiToken = process.env.APIFY_API_TOKEN;

    if (!apiToken) {
      return res.status(500).json({
        error: 'Social media tracking is not configured. Please add APIFY_API_TOKEN to environment variables.'
      });
    }

    // Validate competitors
    const validCompetitors = Array.isArray(competitors)
      ? competitors.filter((c): c is string => typeof c === 'string').slice(0, 3)
      : [];

    console.log(`Fetching social mentions for ${brandName}...`);

    // Fetch mentions for your brand
    const yourMentionsList = await fetchAllMentions(brandName, apiToken);
    const yourMentions = aggregateMentions(brandName, yourMentionsList);

    console.log(`Found ${yourMentions.totalMentions} mentions for ${brandName}`);

    // Fetch mentions for competitors (sequentially to avoid rate limits)
    const competitorMentionsData: BrandMentions[] = [];

    for (const competitor of validCompetitors) {
      console.log(`Fetching social mentions for competitor: ${competitor}...`);
      const compMentions = await fetchAllMentions(competitor, apiToken);
      competitorMentionsData.push(aggregateMentions(competitor, compMentions));
    }

    // Calculate SOV
    const sov = calculateSOV(yourMentions, competitorMentionsData);

    const response: SocialSOVResponse = {
      yourBrand: yourMentions,
      competitors: competitorMentionsData,
      sov,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Social mentions error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
