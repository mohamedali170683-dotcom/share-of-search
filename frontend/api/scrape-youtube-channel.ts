import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Scrape YouTube Channel from Website
 *
 * This endpoint:
 * 1. Fetches the competitor's website
 * 2. Looks for YouTube channel links in the HTML
 * 3. Returns the channel identifier for use with YouTube Data API
 */

interface ScrapeResult {
  found: boolean;
  channelUrl?: string;
  channelId?: string;
  channelHandle?: string;
  source?: string;
  error?: string;
}

/**
 * Extract YouTube channel info from a URL
 */
function parseYouTubeUrl(url: string): { type: string; id: string } | null {
  const patterns = [
    { regex: /youtube\.com\/channel\/([^\/\?\&]+)/, type: 'channel' },
    { regex: /youtube\.com\/@([^\/\?\&]+)/, type: 'handle' },
    { regex: /youtube\.com\/c\/([^\/\?\&]+)/, type: 'custom' },
    { regex: /youtube\.com\/user\/([^\/\?\&]+)/, type: 'user' },
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern.regex);
    if (match) {
      return { type: pattern.type, id: match[1] };
    }
  }

  return null;
}

/**
 * Scrape a website for YouTube channel links
 */
async function scrapeWebsiteForYouTube(domain: string): Promise<ScrapeResult> {
  // Normalize domain
  let url = domain.trim();
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }
  if (!url.includes('www.') && !url.includes('://www.')) {
    url = url.replace('://', '://www.');
  }

  try {
    console.log(`Scraping ${url} for YouTube channel...`);

    // Fetch the main page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SearchShareBot/1.0)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      // Try without www
      const altUrl = url.replace('://www.', '://');
      const altResponse = await fetch(altUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SearchShareBot/1.0)',
          'Accept': 'text/html',
        },
        redirect: 'follow',
      });

      if (!altResponse.ok) {
        return { found: false, error: `Failed to fetch website: ${response.status}` };
      }

      const html = await altResponse.text();
      return extractYouTubeFromHtml(html, altUrl);
    }

    const html = await response.text();
    return extractYouTubeFromHtml(html, url);

  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return { found: false, error: `Scraping error: ${error}` };
  }
}

/**
 * Extract YouTube channel links from HTML
 */
function extractYouTubeFromHtml(html: string, sourceUrl: string): ScrapeResult {
  // Look for YouTube links in the HTML
  const youtubePatterns = [
    /href=["']?(https?:\/\/(?:www\.)?youtube\.com\/(?:channel|c|user|@)[^"'\s>]+)["']?/gi,
    /href=["']?(https?:\/\/(?:www\.)?youtube\.com\/@[^"'\s>]+)["']?/gi,
  ];

  const foundUrls: string[] = [];

  for (const pattern of youtubePatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        foundUrls.push(match[1]);
      }
    }
  }

  // Also look for YouTube in social media sections (common patterns)
  const socialPatterns = [
    /["']youtube["'][^>]*href=["']?([^"'\s>]+youtube\.com[^"'\s>]*)["']?/gi,
    /href=["']?([^"'\s>]*youtube\.com\/(?:channel|c|user|@)[^"'\s>]*)["']?[^>]*(?:social|youtube|footer|connect)/gi,
  ];

  for (const pattern of socialPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].includes('youtube.com')) {
        foundUrls.push(match[1]);
      }
    }
  }

  // Deduplicate and filter
  const uniqueUrls = [...new Set(foundUrls)]
    .filter(url => {
      // Filter out generic YouTube links (not channel links)
      return url.includes('/channel/') ||
             url.includes('/@') ||
             url.includes('/c/') ||
             url.includes('/user/');
    });

  if (uniqueUrls.length === 0) {
    return { found: false, error: 'No YouTube channel link found on website' };
  }

  // Take the first valid channel URL
  const channelUrl = uniqueUrls[0];
  const parsed = parseYouTubeUrl(channelUrl);

  if (!parsed) {
    return { found: false, error: 'Could not parse YouTube URL' };
  }

  return {
    found: true,
    channelUrl,
    channelId: parsed.type === 'channel' ? parsed.id : undefined,
    channelHandle: parsed.type === 'handle' ? `@${parsed.id}` :
                   parsed.type === 'custom' || parsed.type === 'user' ? parsed.id : undefined,
    source: sourceUrl,
  };
}

/**
 * Fetch channel stats from YouTube Data API
 */
async function fetchChannelStats(channelIdentifier: string, apiKey: string): Promise<{
  channelId?: string;
  channelTitle?: string;
  videoCount?: number;
  viewCount?: number;
  subscriberCount?: number;
} | null> {
  try {
    // First, resolve the identifier to a channel ID if needed
    let channelId = channelIdentifier;

    if (!channelIdentifier.startsWith('UC')) {
      // Search for the channel
      const handle = channelIdentifier.startsWith('@') ? channelIdentifier : `@${channelIdentifier}`;
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('type', 'channel');
      searchUrl.searchParams.set('q', handle);
      searchUrl.searchParams.set('maxResults', '1');
      searchUrl.searchParams.set('key', apiKey);

      const searchResponse = await fetch(searchUrl.toString());
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        channelId = searchData.items?.[0]?.id?.channelId;
      }
    }

    if (!channelId) {
      return null;
    }

    // Fetch channel statistics
    const statsUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
    statsUrl.searchParams.set('part', 'snippet,statistics');
    statsUrl.searchParams.set('id', channelId);
    statsUrl.searchParams.set('key', apiKey);

    const statsResponse = await fetch(statsUrl.toString());
    if (!statsResponse.ok) {
      return null;
    }

    const statsData = await statsResponse.json();
    const channel = statsData.items?.[0];

    if (!channel) {
      return null;
    }

    return {
      channelId: channel.id,
      channelTitle: channel.snippet?.title,
      videoCount: parseInt(channel.statistics?.videoCount || '0', 10),
      viewCount: parseInt(channel.statistics?.viewCount || '0', 10),
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0', 10),
    };
  } catch (error) {
    console.error('Error fetching channel stats:', error);
    return null;
  }
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
    const { domain, brandName, fetchStats = true } = req.body;

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'domain is required' });
    }

    // Step 1: Scrape website for YouTube channel
    const scrapeResult = await scrapeWebsiteForYouTube(domain);

    if (!scrapeResult.found) {
      return res.status(200).json({
        found: false,
        domain,
        brandName,
        error: scrapeResult.error,
      });
    }

    // Step 2: If we have YouTube API key and fetchStats is true, get channel stats
    const apiKey = process.env.YOUTUBE_API_KEY;
    let channelStats = null;

    if (apiKey && fetchStats) {
      const identifier = scrapeResult.channelId || scrapeResult.channelHandle;
      if (identifier) {
        channelStats = await fetchChannelStats(identifier, apiKey);
      }
    }

    return res.status(200).json({
      found: true,
      domain,
      brandName,
      channelUrl: scrapeResult.channelUrl,
      channelId: channelStats?.channelId || scrapeResult.channelId,
      channelHandle: scrapeResult.channelHandle,
      channelTitle: channelStats?.channelTitle,
      videoCount: channelStats?.videoCount,
      viewCount: channelStats?.viewCount,
      subscriberCount: channelStats?.subscriberCount,
      source: scrapeResult.source,
    });

  } catch (error) {
    console.error('Scrape YouTube channel error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
