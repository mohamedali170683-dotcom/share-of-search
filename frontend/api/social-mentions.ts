import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Social Mentions API
 * Fetches brand mentions from Reddit using Apify actors
 *
 * Currently only Reddit is supported. Other platforms (Instagram, TikTok, YouTube)
 * require scrapers that support keyword/hashtag search, which the current actors don't.
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
  timeoutMs: number = 25000 // Keep under Vercel's 30s limit
): Promise<unknown[]> {
  const encodedActorId = actorId.replace('/', '~');
  console.log(`Starting actor ${encodedActorId} with input:`, JSON.stringify(input));

  try {
    // Start the actor run
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${encodedActorId}/runs?token=${apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }
    );

    const responseText = await runResponse.text();
    console.log(`Actor ${encodedActorId} response (${runResponse.status}):`, responseText.substring(0, 300));

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

    // Poll for completion with shorter intervals
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
        // Try to get error details
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
 * Fetch Reddit mentions using harshmaur's Reddit Scraper
 */
async function fetchRedditMentions(
  brandName: string,
  apiToken: string
): Promise<SocialMention[]> {
  const mentions: SocialMention[] = [];

  try {
    // Try the regular reddit-scraper (not pro) with search functionality
    // Based on documentation, it expects 'searchPosts' and 'keywords' parameters
    const results = await runApifyActor(
      'harshmaur/reddit-scraper',
      {
        type: 'search',
        searchPosts: true,
        keyword: brandName,
        maxItems: 15,
        sort: 'relevance',
        time: 'month',
        // Include proxy config for reliability
        proxy: {
          useApifyProxy: true,
        }
      },
      apiToken,
      25000
    ) as Array<{
      title?: string;
      body?: string;
      selftext?: string;
      text?: string;
      content?: string;
      url?: string;
      permalink?: string;
      link?: string;
      score?: number;
      ups?: number;
      upvotes?: number;
      upVotes?: number;
      numComments?: number;
      num_comments?: number;
      numberOfComments?: number;
      commentCount?: number;
      author?: string;
      authorName?: string;
      subreddit?: string;
      subredditName?: string;
      createdAt?: string;
      created_utc?: number;
      postedAt?: string;
      timestamp?: string;
    }>;

    console.log(`Reddit scraper returned ${results.length} items for "${brandName}"`);

    for (const item of results) {
      const text = item.title || item.body || item.selftext || item.text || item.content || '';
      if (!text) continue;

      mentions.push({
        platform: 'reddit',
        text,
        url: item.url || item.link || (item.permalink ? `https://reddit.com${item.permalink}` : undefined),
        engagement: {
          likes: item.score || item.ups || item.upvotes || item.upVotes || 0,
          comments: item.numComments || item.num_comments || item.numberOfComments || item.commentCount || 0,
        },
        author: item.author || item.authorName,
        subreddit: item.subreddit || item.subredditName,
        timestamp: item.createdAt || item.postedAt || item.timestamp ||
          (item.created_utc ? new Date(item.created_utc * 1000).toISOString() : undefined),
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
      note: 'Currently tracking Reddit mentions only. Instagram/TikTok/YouTube require different scraper subscriptions.'
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Social mentions error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
