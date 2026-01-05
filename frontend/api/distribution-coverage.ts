import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Distribution Coverage API
 *
 * For MANUFACTURERS (Continental, Michelin, etc.):
 * Analyzes which local retailers/dealers carry their products
 *
 * Process:
 * 1. Search generic category terms ("tire shop near me")
 * 2. Get top retailers from results
 * 3. For each retailer:
 *    a. Fetch Google Maps Place Details (description, attributes)
 *    b. Crawl their website for brand mentions
 * 4. Calculate: "X% of local tire shops carry Continental"
 */

interface RetailerBrandInfo {
  retailerName: string;
  placeId: string;
  address?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  rank: number;
  // Brand detection results
  brandsFound: string[];
  brandDetectionSource: 'place_details' | 'website' | 'both' | 'none';
  carriesYourBrand: boolean;
  carriesCompetitors: string[];
  // Raw data for debugging
  placeDescription?: string;
  websiteSnippet?: string;
}

interface DistributionCoverageResponse {
  searchTerm: string;
  location: string;
  totalRetailersAnalyzed: number;
  // Your brand stats
  yourBrand: {
    name: string;
    retailersCarrying: number;
    coveragePercent: number;
    topRetailers: string[];
  };
  // Competitor stats
  competitors: {
    name: string;
    retailersCarrying: number;
    coveragePercent: number;
  }[];
  // Detailed retailer info
  retailers: RetailerBrandInfo[];
  // Methodology
  methodology: {
    searchTermUsed: string;
    retailersAnalyzed: number;
    detectionMethods: string[];
    formula: string;
  };
  timestamp: string;
}

/**
 * Fetch Google Maps search results
 */
async function fetchGoogleMapsSearch(
  keyword: string,
  locationCode: number,
  languageCode: string,
  auth: string
): Promise<{ placeId: string; title: string; url?: string; address?: string; rating?: number; ratingCount?: number; rank: number }[]> {
  try {
    const response = await fetch(
      'https://api.dataforseo.com/v3/serp/google/maps/live/advanced',
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
          depth: 20, // Get top 20 results
        }]),
      }
    );

    if (!response.ok) {
      console.error(`Maps search failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const items = data?.tasks?.[0]?.result?.[0]?.items || [];

    return items
      .filter((item: { type: string }) => item.type === 'maps_search')
      .map((item: {
        place_id?: string;
        title?: string;
        url?: string;
        address?: string;
        rating?: { value?: number; votes_count?: number };
        rank_group?: number;
      }) => ({
        placeId: item.place_id || '',
        title: item.title || '',
        url: item.url || '',
        address: item.address || '',
        rating: item.rating?.value || 0,
        ratingCount: item.rating?.votes_count || 0,
        rank: item.rank_group || 0,
      }));
  } catch (error) {
    console.error('Maps search error:', error);
    return [];
  }
}

/**
 * Fetch Google Maps Place Details
 * Returns description, attributes, and other detailed info
 */
async function fetchPlaceDetails(
  placeId: string,
  auth: string
): Promise<{ description?: string; attributes?: string[]; brandMentions: string[] }> {
  try {
    const response = await fetch(
      'https://api.dataforseo.com/v3/business_data/google/my_business_info/task_post',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          place_id: placeId,
        }]),
      }
    );

    if (!response.ok) {
      // Try alternative endpoint
      return await fetchPlaceDetailsAlternative(placeId, auth);
    }

    const data = await response.json();
    const result = data?.tasks?.[0]?.result?.[0];

    if (!result) {
      return { brandMentions: [] };
    }

    const description = result.description || '';
    const attributes = result.attributes || [];

    // Extract brand mentions from description and attributes
    const brandMentions = extractBrandMentions(
      `${description} ${attributes.join(' ')}`
    );

    return {
      description,
      attributes,
      brandMentions,
    };
  } catch (error) {
    console.error('Place details error:', error);
    return { brandMentions: [] };
  }
}

/**
 * Alternative method using Google Maps Place Details
 */
async function fetchPlaceDetailsAlternative(
  placeId: string,
  auth: string
): Promise<{ description?: string; attributes?: string[]; brandMentions: string[] }> {
  try {
    // Use the reviews endpoint which sometimes includes business info
    const response = await fetch(
      'https://api.dataforseo.com/v3/business_data/google/reviews/task_post',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          place_id: placeId,
          depth: 10,
        }]),
      }
    );

    if (!response.ok) {
      return { brandMentions: [] };
    }

    const data = await response.json();
    const reviews = data?.tasks?.[0]?.result?.[0]?.items || [];

    // Extract brand mentions from reviews
    const reviewText = reviews
      .map((r: { review_text?: string }) => r.review_text || '')
      .join(' ');

    const brandMentions = extractBrandMentions(reviewText);

    return {
      description: `Extracted from ${reviews.length} reviews`,
      brandMentions,
    };
  } catch (error) {
    console.error('Place details alternative error:', error);
    return { brandMentions: [] };
  }
}

/**
 * Crawl a website for brand mentions
 */
async function crawlWebsiteForBrands(
  websiteUrl: string
): Promise<{ brandMentions: string[]; snippet: string }> {
  if (!websiteUrl) {
    return { brandMentions: [], snippet: '' };
  }

  try {
    // Use a simple fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(websiteUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SearchShareBot/1.0)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { brandMentions: [], snippet: '' };
    }

    const html = await response.text();

    // Extract text content (simple approach)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase();

    const brandMentions = extractBrandMentions(textContent);

    // Get a relevant snippet
    const snippet = textContent.slice(0, 500);

    return { brandMentions, snippet };
  } catch (error) {
    // Timeout or other error - silently fail
    return { brandMentions: [], snippet: '' };
  }
}

/**
 * Known tire brands for detection
 */
const TIRE_BRANDS = [
  'continental', 'michelin', 'bridgestone', 'goodyear', 'pirelli',
  'dunlop', 'hankook', 'yokohama', 'firestone', 'cooper',
  'toyo', 'bfgoodrich', 'kumho', 'falken', 'nexen',
  'general tire', 'nitto', 'sumitomo', 'fuzion', 'uniroyal',
];

/**
 * Extract brand mentions from text
 */
function extractBrandMentions(text: string): string[] {
  const textLower = text.toLowerCase();
  const found: string[] = [];

  for (const brand of TIRE_BRANDS) {
    // Check for brand name (with word boundaries where possible)
    const regex = new RegExp(`\\b${brand}\\b`, 'i');
    if (regex.test(textLower)) {
      found.push(brand);
    }
  }

  return [...new Set(found)]; // Deduplicate
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
      searchTerm = 'tire shop near me',
      locationCode = 2840,
      languageCode = 'en',
      maxRetailers = 10, // Limit to avoid timeout
    } = req.body;

    if (!brandName) {
      return res.status(400).json({ error: 'brandName is required' });
    }

    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      return res.status(500).json({ error: 'DataForSEO credentials not configured' });
    }

    const auth = Buffer.from(`${login}:${password}`).toString('base64');
    const brandLower = brandName.toLowerCase();
    const competitorNames = competitors.map((c: string) => c.toLowerCase());
    const allBrands = [brandLower, ...competitorNames];

    console.log(`[Distribution] Starting analysis for ${brandName}`);
    console.log(`[Distribution] Search term: "${searchTerm}"`);
    console.log(`[Distribution] Competitors: ${competitorNames.join(', ')}`);

    // Step 1: Search for retailers
    console.log(`[Distribution] Step 1: Searching for retailers...`);
    const searchResults = await fetchGoogleMapsSearch(searchTerm, locationCode, languageCode, auth);

    if (searchResults.length === 0) {
      return res.status(200).json({
        error: 'No retailers found for search term',
        searchTerm,
      });
    }

    console.log(`[Distribution] Found ${searchResults.length} retailers`);

    // Step 2: Analyze each retailer (limit to avoid timeout)
    const retailersToAnalyze = searchResults.slice(0, maxRetailers);
    const retailers: RetailerBrandInfo[] = [];

    console.log(`[Distribution] Step 2: Analyzing ${retailersToAnalyze.length} retailers...`);

    for (const retailer of retailersToAnalyze) {
      console.log(`[Distribution] Analyzing: ${retailer.title}`);

      let brandsFromDetails: string[] = [];
      let brandsFromWebsite: string[] = [];
      let placeDescription = '';
      let websiteSnippet = '';

      // Method 1: Try Place Details
      if (retailer.placeId) {
        const details = await fetchPlaceDetails(retailer.placeId, auth);
        brandsFromDetails = details.brandMentions;
        placeDescription = details.description || '';
      }

      // Method 2: Crawl Website
      if (retailer.url) {
        const websiteData = await crawlWebsiteForBrands(retailer.url);
        brandsFromWebsite = websiteData.brandMentions;
        websiteSnippet = websiteData.snippet;
      }

      // Combine results
      const allFoundBrands = [...new Set([...brandsFromDetails, ...brandsFromWebsite])];

      let detectionSource: RetailerBrandInfo['brandDetectionSource'] = 'none';
      if (brandsFromDetails.length > 0 && brandsFromWebsite.length > 0) {
        detectionSource = 'both';
      } else if (brandsFromDetails.length > 0) {
        detectionSource = 'place_details';
      } else if (brandsFromWebsite.length > 0) {
        detectionSource = 'website';
      }

      const carriesYourBrand = allFoundBrands.includes(brandLower);
      const carriesCompetitors = competitorNames.filter(c => allFoundBrands.includes(c));

      retailers.push({
        retailerName: retailer.title,
        placeId: retailer.placeId,
        address: retailer.address,
        website: retailer.url,
        rating: retailer.rating,
        reviewCount: retailer.ratingCount,
        rank: retailer.rank,
        brandsFound: allFoundBrands,
        brandDetectionSource: detectionSource,
        carriesYourBrand,
        carriesCompetitors,
        placeDescription,
        websiteSnippet,
      });
    }

    // Step 3: Calculate coverage stats
    console.log(`[Distribution] Step 3: Calculating coverage stats...`);

    const retailersWithBrandData = retailers.filter(r => r.brandsFound.length > 0);
    const totalAnalyzed = retailersWithBrandData.length || retailers.length;

    const yourBrandCoverage = {
      name: brandName,
      retailersCarrying: retailers.filter(r => r.carriesYourBrand).length,
      coveragePercent: totalAnalyzed > 0
        ? Math.round((retailers.filter(r => r.carriesYourBrand).length / totalAnalyzed) * 100)
        : 0,
      topRetailers: retailers
        .filter(r => r.carriesYourBrand)
        .slice(0, 5)
        .map(r => r.retailerName),
    };

    const competitorCoverage = competitorNames.map(comp => ({
      name: comp,
      retailersCarrying: retailers.filter(r => r.carriesCompetitors.includes(comp)).length,
      coveragePercent: totalAnalyzed > 0
        ? Math.round((retailers.filter(r => r.carriesCompetitors.includes(comp)).length / totalAnalyzed) * 100)
        : 0,
    }));

    // Build response
    const response: DistributionCoverageResponse = {
      searchTerm,
      location: `Location code: ${locationCode}`,
      totalRetailersAnalyzed: retailers.length,
      yourBrand: yourBrandCoverage,
      competitors: competitorCoverage,
      retailers,
      methodology: {
        searchTermUsed: searchTerm,
        retailersAnalyzed: retailers.length,
        detectionMethods: [
          'Google Maps Place Details (description, attributes)',
          'Website crawling for brand mentions',
        ],
        formula: `Coverage = (Retailers carrying brand / Total retailers analyzed) × 100`,
      },
      timestamp: new Date().toISOString(),
    };

    console.log(`[Distribution] Analysis complete. ${brandName} coverage: ${yourBrandCoverage.coveragePercent}%`);

    return res.status(200).json(response);

  } catch (error) {
    console.error('Distribution coverage error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
