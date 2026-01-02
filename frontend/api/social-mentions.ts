import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Social Mentions API
 * Fetches brand mentions from social media platforms using Apify actors
 *
 * Actors used:
 * - Social Insight Scraper (Instagram, TikTok, YouTube): $30/mo
 * - Reddit Scraper Pro: $20/mo
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

// Apify Actor IDs
const ACTORS = {
  socialInsight: 'insiteco/social-insight-scraper',
  redditPro: 'harshmaur/reddit-scraper-pro',
};

/**
 * Run an Apify actor and wait for results
 */
async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  apiToken: string
): Promise<unknown[]> {
  // Start the actor run
  const runResponse = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );

  if (!runResponse.ok) {
    const error = await runResponse.text();
    throw new Error(`Failed to start Apify actor ${actorId}: ${error}`);
  }

  const runData = await runResponse.json();
  const runId = runData.data?.id;

  if (!runId) {
    throw new Error(`No run ID returned for actor ${actorId}`);
  }

  // Poll for completion (max 2 minutes)
  const maxWaitTime = 120000;
  const pollInterval = 5000;
  let elapsed = 0;

  while (elapsed < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    elapsed += pollInterval;

    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apiToken}`
    );

    if (!statusResponse.ok) continue;

    const statusData = await statusResponse.json();
    const status = statusData.data?.status;

    if (status === 'SUCCEEDED') {
      // Fetch the dataset
      const datasetId = statusData.data?.defaultDatasetId;
      if (!datasetId) return [];

      const datasetResponse = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiToken}`
      );

      if (!datasetResponse.ok) return [];
      return await datasetResponse.json();
    }

    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      console.error(`Actor ${actorId} run ${status}`);
      return [];
    }
  }

  console.error(`Actor ${actorId} timed out after ${maxWaitTime}ms`);
  return [];
}

/**
 * Fetch mentions from Social Insight Scraper (Instagram, TikTok, YouTube)
 */
async function fetchSocialInsightMentions(
  brandName: string,
  apiToken: string
): Promise<SocialMention[]> {
  const mentions: SocialMention[] = [];

  try {
    // Search for brand mentions across platforms
    const results = await runApifyActor(
      ACTORS.socialInsight,
      {
        searchQueries: [brandName],
        platforms: ['instagram', 'tiktok', 'youtube'],
        maxResults: 50, // Limit to conserve credits
      },
      apiToken
    ) as Array<{
      platform?: string;
      text?: string;
      caption?: string;
      description?: string;
      url?: string;
      likes?: number;
      likeCount?: number;
      comments?: number;
      commentCount?: number;
      shares?: number;
      shareCount?: number;
      views?: number;
      viewCount?: number;
      playCount?: number;
      author?: string;
      username?: string;
      timestamp?: string;
      createdAt?: string;
    }>;

    for (const item of results) {
      const platform = (item.platform?.toLowerCase() || 'unknown') as SocialMention['platform'];
      if (!['instagram', 'tiktok', 'youtube'].includes(platform)) continue;

      mentions.push({
        platform,
        text: item.text || item.caption || item.description || '',
        url: item.url,
        engagement: {
          likes: item.likes || item.likeCount || 0,
          comments: item.comments || item.commentCount || 0,
          shares: item.shares || item.shareCount || 0,
          views: item.views || item.viewCount || item.playCount || 0,
        },
        author: item.author || item.username,
        timestamp: item.timestamp || item.createdAt,
      });
    }
  } catch (error) {
    console.error('Social Insight Scraper error:', error);
  }

  return mentions;
}

/**
 * Fetch mentions from Reddit Scraper Pro
 */
async function fetchRedditMentions(
  brandName: string,
  apiToken: string
): Promise<SocialMention[]> {
  const mentions: SocialMention[] = [];

  try {
    const results = await runApifyActor(
      ACTORS.redditPro,
      {
        searchQuery: brandName,
        maxResults: 50,
        sort: 'relevance',
        timeFilter: 'month', // Last month
      },
      apiToken
    ) as Array<{
      title?: string;
      selftext?: string;
      body?: string;
      url?: string;
      permalink?: string;
      score?: number;
      upvotes?: number;
      num_comments?: number;
      numComments?: number;
      author?: string;
      created_utc?: number;
      createdAt?: string;
    }>;

    for (const item of results) {
      mentions.push({
        platform: 'reddit',
        text: item.title || item.selftext || item.body || '',
        url: item.url || (item.permalink ? `https://reddit.com${item.permalink}` : undefined),
        engagement: {
          likes: item.score || item.upvotes || 0,
          comments: item.num_comments || item.numComments || 0,
        },
        author: item.author,
        timestamp: item.created_utc
          ? new Date(item.created_utc * 1000).toISOString()
          : item.createdAt,
      });
    }
  } catch (error) {
    console.error('Reddit Scraper error:', error);
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
        error: 'Apify API token not configured. Add APIFY_API_TOKEN to environment variables.'
      });
    }

    // Validate competitors
    const validCompetitors = Array.isArray(competitors)
      ? competitors.filter((c): c is string => typeof c === 'string').slice(0, 3)
      : [];

    console.log(`Fetching social mentions for ${brandName} and ${validCompetitors.length} competitors...`);

    // Fetch mentions for your brand (parallel across platforms)
    const [socialMentions, redditMentions] = await Promise.all([
      fetchSocialInsightMentions(brandName, apiToken),
      fetchRedditMentions(brandName, apiToken),
    ]);

    const yourMentions = aggregateMentions(brandName, [...socialMentions, ...redditMentions]);

    // Fetch mentions for competitors (sequentially to avoid rate limits)
    const competitorMentionsData: BrandMentions[] = [];

    for (const competitor of validCompetitors) {
      const [compSocial, compReddit] = await Promise.all([
        fetchSocialInsightMentions(competitor, apiToken),
        fetchRedditMentions(competitor, apiToken),
      ]);
      competitorMentionsData.push(aggregateMentions(competitor, [...compSocial, ...compReddit]));
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
