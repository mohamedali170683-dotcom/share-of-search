import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Social Mentions API
 * Fetches brand mentions from social media platforms using Apify actors
 *
 * Uses the following actors:
 * - insiteco/social-insight-scraper ($30/mo) - Instagram, TikTok, YouTube
 * - harshmaur/reddit-scraper-pro ($20/mo) - Reddit
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
    // Convert actor ID format: "owner/actor" or "owner~actor" -> URL encoded
    // Apify API expects the format: owner~actor-name in the URL
    const encodedActorId = actorId.replace('/', '~');
    console.log(`Starting actor ${encodedActorId} with input:`, JSON.stringify(input));

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
    console.log(`Actor ${encodedActorId} start response (${runResponse.status}):`, responseText.substring(0, 500));

    if (!runResponse.ok) {
      console.error(`Actor ${encodedActorId} start failed with status ${runResponse.status}`);
      return [];
    }

    let runData;
    try {
      runData = JSON.parse(responseText);
    } catch {
      console.error(`Actor ${encodedActorId} returned invalid JSON`);
      return [];
    }

    const runId = runData.data?.id;

    if (!runId) {
      console.error(`No run ID returned for actor ${encodedActorId}`);
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
        console.log(`Actor ${encodedActorId} succeeded, dataset: ${datasetId}`);
        if (!datasetId) return [];

        const datasetResponse = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiToken}&limit=50`
        );

        if (!datasetResponse.ok) {
          console.error(`Failed to fetch dataset for ${encodedActorId}`);
          return [];
        }
        const items = await datasetResponse.json();
        console.log(`Actor ${encodedActorId} returned ${items.length} items`);
        return items;
      }

      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        console.error(`Actor ${encodedActorId} run ${status}`);
        return [];
      }
    }

    console.error(`Actor ${encodedActorId} timed out`);
    return [];
  } catch (error) {
    console.error(`Actor ${actorId} error:`, error);
    return [];
  }
}

/**
 * Fetch social media insights using Social Insight Scraper
 * Actor: insiteco/social-insight-scraper
 * Supports Instagram, TikTok, and YouTube via direct URL scraping
 */
async function fetchSocialInsights(
  brandName: string,
  platform: 'instagram' | 'tiktok' | 'youtube',
  apiToken: string
): Promise<SocialMention[]> {
  const mentions: SocialMention[] = [];

  try {
    // Social Insight Scraper requires direct URLs
    // We'll search for brand-related content URLs first
    // For now, construct search URLs that the scraper can process
    const searchUrls: { url: string; inputId: string }[] = [];

    // Generate unique IDs for each input
    const generateId = () => Math.random().toString(36).substring(2, 15);

    if (platform === 'instagram') {
      // Instagram hashtag search URL
      searchUrls.push({
        url: `https://www.instagram.com/explore/tags/${brandName.toLowerCase().replace(/[^a-z0-9]/g, '')}/`,
        inputId: generateId()
      });
    } else if (platform === 'tiktok') {
      // TikTok search URL
      searchUrls.push({
        url: `https://www.tiktok.com/search?q=${encodeURIComponent(brandName)}`,
        inputId: generateId()
      });
    } else if (platform === 'youtube') {
      // YouTube search URL
      searchUrls.push({
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(brandName)}`,
        inputId: generateId()
      });
    }

    if (searchUrls.length === 0) {
      console.log(`No URLs to scrape for ${platform}`);
      return mentions;
    }

    const results = await runApifyActor(
      'insiteco~social-insight-scraper',
      {
        input: searchUrls
      },
      apiToken,
      90000 // 90 second timeout
    ) as Array<{
      url?: string;
      title?: string;
      description?: string;
      text?: string;
      caption?: string;
      likes?: number;
      likesCount?: number;
      comments?: number;
      commentsCount?: number;
      shares?: number;
      shareCount?: number;
      views?: number;
      viewCount?: number;
      playCount?: number;
      author?: string;
      username?: string;
      ownerUsername?: string;
      timestamp?: string;
      createTime?: number;
      publishedAt?: string;
    }>;

    console.log(`Social Insight Scraper (${platform}) returned ${results.length} raw items`);

    for (const item of results) {
      mentions.push({
        platform,
        text: item.caption || item.description || item.title || item.text || '',
        url: item.url,
        engagement: {
          likes: item.likes || item.likesCount || 0,
          comments: item.comments || item.commentsCount || 0,
          shares: item.shares || item.shareCount || 0,
          views: item.views || item.viewCount || item.playCount || 0,
        },
        author: item.author || item.username || item.ownerUsername,
        timestamp: item.timestamp || item.publishedAt ||
          (item.createTime ? new Date(item.createTime * 1000).toISOString() : undefined),
      });
    }
  } catch (error) {
    console.error(`Social Insight Scraper (${platform}) error:`, error);
  }

  return mentions;
}

/**
 * Fetch Reddit mentions using Reddit Scraper Pro
 * Actor: harshmaur/reddit-scraper-pro
 */
async function fetchRedditMentions(
  brandName: string,
  apiToken: string
): Promise<SocialMention[]> {
  const mentions: SocialMention[] = [];

  try {
    // Use harshmaur's Reddit Scraper Pro
    const results = await runApifyActor(
      'harshmaur~reddit-scraper-pro',
      {
        keywords: [brandName],
        maxPosts: 20,
        sort: 'relevance',
        time: 'month',
      },
      apiToken,
      90000 // 90 second timeout
    ) as Array<{
      title?: string;
      body?: string;
      selftext?: string;
      text?: string;
      url?: string;
      permalink?: string;
      score?: number;
      ups?: number;
      upvotes?: number;
      numComments?: number;
      num_comments?: number;
      commentCount?: number;
      author?: string;
      createdAt?: string;
      created_utc?: number;
      timestamp?: string;
    }>;

    console.log(`Reddit Scraper Pro returned ${results.length} raw items`);

    for (const item of results) {
      mentions.push({
        platform: 'reddit',
        text: item.title || item.body || item.selftext || item.text || '',
        url: item.url || (item.permalink ? `https://reddit.com${item.permalink}` : undefined),
        engagement: {
          likes: item.score || item.ups || item.upvotes || 0,
          comments: item.numComments || item.num_comments || item.commentCount || 0,
        },
        author: item.author,
        timestamp: item.createdAt || item.timestamp ||
          (item.created_utc ? new Date(item.created_utc * 1000).toISOString() : undefined),
      });
    }
  } catch (error) {
    console.error('Reddit Scraper Pro error:', error);
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
  // Using Social Insight Scraper for Instagram, TikTok, YouTube
  // Using Reddit Scraper Pro for Reddit
  const [instagram, tiktok, youtube, reddit] = await Promise.all([
    fetchSocialInsights(brandName, 'instagram', apiToken),
    fetchSocialInsights(brandName, 'tiktok', apiToken),
    fetchSocialInsights(brandName, 'youtube', apiToken),
    fetchRedditMentions(brandName, apiToken),
  ]);

  return [...instagram, ...tiktok, ...youtube, ...reddit];
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
