import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Social Mentions API
 * Fetches brand mentions from Reddit using Apify actors
 *
 * Tries multiple actors in fallback order:
 * 1. comchat/reddit-api-scraper (free tier, keyword search)
 * 2. trudax/reddit-scraper (paid, URL-based search)
 */

interface SocialMention {
  platform: 'reddit';
  text: string;
  url?: string;
  engagement: {
    likes?: number;
    comments?: number;
  };
  author?: string;
  timestamp?: string;
  subreddit?: string;
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
  note?: string;
}

/**
 * Run an Apify actor and wait for results
 */
async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  apiToken: string,
  timeoutMs: number = 25000
): Promise<unknown[]> {
  const encodedActorId = actorId.replace('/', '~');
  console.log(`Starting actor ${encodedActorId} with input:`, JSON.stringify(input));

  try {
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${encodedActorId}/runs?token=${apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }
    );

    const responseText = await runResponse.text();
    console.log(`Actor ${encodedActorId} response (${runResponse.status}):`, responseText.substring(0, 500));

    if (!runResponse.ok) {
      console.error(`Actor ${encodedActorId} failed: ${runResponse.status}`);
      return [];
    }

    let runData;
    try {
      runData = JSON.parse(responseText);
    } catch {
      console.error(`Actor ${encodedActorId} invalid JSON response`);
      return [];
    }

    const runId = runData.data?.id;
    if (!runId) {
      console.error(`No run ID for ${encodedActorId}`);
      return [];
    }

    const pollInterval = 2000;
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

      console.log(`Actor ${encodedActorId} status: ${status} (${elapsed}ms elapsed)`);

      if (status === 'SUCCEEDED') {
        const datasetId = statusData.data?.defaultDatasetId;
        if (!datasetId) return [];

        const datasetResponse = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiToken}&limit=30`
        );

        if (!datasetResponse.ok) return [];

        const items = await datasetResponse.json();
        console.log(`Actor ${encodedActorId} returned ${items.length} items`);
        return items;
      }

      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        const errorLog = statusData.data?.stats?.runTimeSecs
          ? `ran for ${statusData.data.stats.runTimeSecs}s`
          : '';
        console.error(`Actor ${encodedActorId} ${status} ${errorLog}`);
        return [];
      }
    }

    console.log(`Actor ${encodedActorId} polling timeout after ${elapsed}ms`);
    return [];
  } catch (error) {
    console.error(`Actor ${actorId} error:`, error);
    return [];
  }
}

/**
 * Parse Reddit results from various actor output formats
 */
function parseRedditResults(results: unknown[]): SocialMention[] {
  const mentions: SocialMention[] = [];

  for (const item of results) {
    if (!item || typeof item !== 'object') continue;

    const r = item as Record<string, unknown>;

    // Skip comments, only want posts
    if (r.dataType === 'comment' || r.type === 'comment') continue;

    // Try multiple field name variations
    const text = (r.title || r.body || r.selftext || r.text || r.content || '') as string;
    if (!text) continue;

    // URL variations
    let url = (r.url || r.link || r.postUrl) as string | undefined;
    if (!url && r.permalink) {
      url = `https://reddit.com${r.permalink}`;
    }

    // Score/likes variations
    const likes = (r.score || r.ups || r.upvotes || r.upVotes || 0) as number;

    // Comments count variations
    const comments = (r.numComments || r.num_comments || r.numberOfComments || r.commentCount || r.comments || 0) as number;

    // Timestamp variations
    let timestamp: string | undefined;
    if (r.createdAt) timestamp = r.createdAt as string;
    else if (r.postedAt) timestamp = r.postedAt as string;
    else if (r.timestamp) timestamp = r.timestamp as string;
    else if (r.created_utc) timestamp = new Date((r.created_utc as number) * 1000).toISOString();
    else if (r.created) timestamp = new Date((r.created as number) * 1000).toISOString();

    mentions.push({
      platform: 'reddit',
      text,
      url,
      engagement: { likes, comments },
      author: (r.author || r.authorName || r.username) as string | undefined,
      subreddit: (r.subreddit || r.subredditName || r.community) as string | undefined,
      timestamp,
    });
  }

  return mentions;
}

/**
 * Fetch Reddit mentions - tries multiple actors
 */
async function fetchRedditMentions(
  brandName: string,
  apiToken: string
): Promise<SocialMention[]> {
  // Actor 1: comchat/reddit-api-scraper - free tier, uses keyword parameter
  console.log(`Trying comchat/reddit-api-scraper for "${brandName}"...`);
  let results = await runApifyActor(
    'comchat/reddit-api-scraper',
    {
      keyword: brandName,
      maxItems: 15,
      sort: 'relevance',
      time: 'month',
    },
    apiToken,
    22000
  );

  if (results.length > 0) {
    console.log(`comchat actor returned ${results.length} results`);
    return parseRedditResults(results);
  }

  // Actor 2: Try with startUrls for Reddit search
  console.log(`Trying trudax/reddit-scraper with search URL for "${brandName}"...`);
  const searchUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(brandName)}&sort=relevance&t=month`;
  results = await runApifyActor(
    'trudax/reddit-scraper',
    {
      startUrls: [{ url: searchUrl }],
      maxItems: 15,
      proxy: { useApifyProxy: true },
    },
    apiToken,
    22000
  );

  if (results.length > 0) {
    console.log(`trudax actor returned ${results.length} results`);
    return parseRedditResults(results);
  }

  console.log(`No results from any actor for "${brandName}"`);
  return [];
}

/**
 * Aggregate mentions for a brand
 */
function aggregateMentions(brand: string, mentions: SocialMention[]): BrandMentions {
  const byPlatform: Record<string, { count: number; engagement: number }> = {};
  let totalEngagement = 0;

  for (const mention of mentions) {
    const engagement = (mention.engagement.likes || 0) + (mention.engagement.comments || 0) * 2;
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
        error: 'APIFY_API_TOKEN not configured in environment variables.'
      });
    }

    // Only take first competitor due to time constraints
    const validCompetitors = Array.isArray(competitors)
      ? competitors.filter((c): c is string => typeof c === 'string').slice(0, 1)
      : [];

    console.log(`Fetching Reddit mentions for ${brandName}...`);

    // Fetch mentions for your brand
    const yourMentionsList = await fetchRedditMentions(brandName, apiToken);
    const yourMentions = aggregateMentions(brandName, yourMentionsList);

    console.log(`Found ${yourMentions.totalMentions} mentions for ${brandName}`);

    // Fetch for one competitor only (to stay within timeout)
    const competitorMentionsData: BrandMentions[] = [];

    for (const competitor of validCompetitors) {
      console.log(`Fetching Reddit mentions for: ${competitor}...`);
      const compMentions = await fetchRedditMentions(competitor, apiToken);
      competitorMentionsData.push(aggregateMentions(competitor, compMentions));
    }

    const sov = calculateSOV(yourMentions, competitorMentionsData);

    const response: SocialSOVResponse = {
      yourBrand: yourMentions,
      competitors: competitorMentionsData,
      sov,
      timestamp: new Date().toISOString(),
      note: 'Tracking Reddit mentions via Apify actors.'
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Social mentions error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
