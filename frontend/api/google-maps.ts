import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Google Maps Local SEO API
 * Uses DataForSEO SERP Google Maps API to analyze local business presence
 *
 * Metrics:
 * - Local pack visibility
 * - Google Maps rankings for brand searches
 * - Review count and ratings
 * - Category rankings
 * - Competitor local presence comparison
 */

interface BusinessListing {
  placeId: string;
  title: string;
  domain?: string;
  url?: string;
  address?: string;
  phone?: string;
  rating?: number;
  ratingCount?: number;
  priceLevel?: string;
  category?: string;
  additionalCategories?: string[];
  latitude?: number;
  longitude?: number;
  mainImage?: string;
  isClaimed?: boolean;
  rank: number;
  ratingDistribution?: {
    star1: number;
    star2: number;
    star3: number;
    star4: number;
    star5: number;
  };
}

interface BrandLocalData {
  name: string;
  listings: BusinessListing[];
  totalListings: number;
  avgRating: number;
  totalReviews: number;
  topRank: number;
  categories: string[];
}

interface GoogleMapsResponse {
  yourBrand: BrandLocalData | null;
  competitors: BrandLocalData[];
  allListings: BusinessListing[];
  sov: {
    byListings: number;
    byReviews: number;
  };
  searchedKeywords: string[];
  location: string;
  timestamp: string;
  methodology: {
    visibilityFormula: string;
    reviewSOVFormula: string;
    brandMatchingMethod: string;
    dataSource: string;
  };
  debug?: {
    totalListingsFetched: number;
    apiStatus: string;
  };
}

/**
 * Fetch Google Maps results for a keyword/brand
 */
async function fetchGoogleMaps(
  keyword: string,
  locationCode: number,
  languageCode: string,
  auth: string
): Promise<{ listings: BusinessListing[]; status: string }> {
  const listings: BusinessListing[] = [];

  try {
    console.log(`Calling Google Maps API for "${keyword}" (location: ${locationCode}, lang: ${languageCode})`);

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
          depth: 100,
        }]),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Maps API failed for "${keyword}": ${response.status} - ${errorText}`);
      return { listings: [], status: `API error: ${response.status}` };
    }

    const data = await response.json();

    const taskStatus = data?.tasks?.[0]?.status_message || 'unknown';
    const items = data?.tasks?.[0]?.result?.[0]?.items || [];

    console.log(`Google Maps for "${keyword}": status=${taskStatus}, items=${items.length}`);

    for (const item of items) {
      if (item.type === 'maps_search') {
        listings.push({
          placeId: item.place_id || '',
          title: item.title || '',
          domain: item.domain || '',
          url: item.url || '',
          address: item.address || '',
          phone: item.phone || '',
          rating: item.rating?.value || 0,
          ratingCount: item.rating?.votes_count || 0,
          priceLevel: item.price_level || '',
          category: item.category || '',
          additionalCategories: item.additional_categories || [],
          latitude: item.latitude || 0,
          longitude: item.longitude || 0,
          mainImage: item.main_image || '',
          isClaimed: item.is_claimed || false,
          rank: item.rank_group || 0,
          ratingDistribution: item.rating_distribution ? {
            star1: item.rating_distribution['1'] || 0,
            star2: item.rating_distribution['2'] || 0,
            star3: item.rating_distribution['3'] || 0,
            star4: item.rating_distribution['4'] || 0,
            star5: item.rating_distribution['5'] || 0,
          } : undefined,
        });
      }
    }

    return { listings, status: taskStatus };
  } catch (error) {
    console.error(`Google Maps error for "${keyword}":`, error);
    return { listings: [], status: `Exception: ${error}` };
  }
}

/**
 * Check if a listing matches a brand name
 */
function listingMatchesBrand(listing: BusinessListing, brandName: string): boolean {
  const titleLower = listing.title.toLowerCase();
  const brandLower = brandName.toLowerCase();

  // Direct brand name in title
  if (titleLower.includes(brandLower)) return true;

  // Check domain match
  if (listing.domain) {
    const domainLower = listing.domain.toLowerCase();
    if (domainLower.includes(brandLower.replace(/\s+/g, ''))) return true;
  }

  // Check for brand words (words > 3 chars) to catch variations
  const brandWords = brandLower.split(/\s+/);
  if (brandWords.some(word => word.length > 3 && titleLower.includes(word))) {
    return true;
  }

  return false;
}

/**
 * Aggregate listings for a brand
 */
function aggregateBrandListings(
  allListings: BusinessListing[],
  brandName: string
): BrandLocalData {
  const brandListings = allListings.filter(l => listingMatchesBrand(l, brandName));

  // Deduplicate by place ID
  const uniqueListings = Array.from(
    new Map(brandListings.map(l => [l.placeId, l])).values()
  );

  const totalReviews = uniqueListings.reduce((sum, l) => sum + (l.ratingCount || 0), 0);
  const ratingSum = uniqueListings.reduce((sum, l) => sum + ((l.rating || 0) * (l.ratingCount || 1)), 0);
  const ratingWeight = uniqueListings.reduce((sum, l) => sum + (l.ratingCount || 1), 0);
  const avgRating = ratingWeight > 0 ? Math.round((ratingSum / ratingWeight) * 10) / 10 : 0;

  // Collect all categories
  const categories = new Set<string>();
  uniqueListings.forEach(l => {
    if (l.category) categories.add(l.category);
    l.additionalCategories?.forEach(c => categories.add(c));
  });

  // Find top rank
  const topRank = uniqueListings.length > 0
    ? Math.min(...uniqueListings.map(l => l.rank))
    : 0;

  return {
    name: brandName,
    listings: uniqueListings.slice(0, 20),
    totalListings: uniqueListings.length,
    avgRating,
    totalReviews,
    topRank,
    categories: Array.from(categories).slice(0, 10),
  };
}

/**
 * Calculate Local SOV
 */
function calculateLocalSOV(
  yourBrand: BrandLocalData | null,
  competitors: BrandLocalData[]
): { byListings: number; byReviews: number } {
  const yourListings = yourBrand?.totalListings || 0;
  const competitorListings = competitors.reduce((sum, c) => sum + c.totalListings, 0);
  const totalListings = yourListings + competitorListings;

  const yourReviews = yourBrand?.totalReviews || 0;
  const competitorReviews = competitors.reduce((sum, c) => sum + c.totalReviews, 0);
  const totalReviews = yourReviews + competitorReviews;

  return {
    byListings: totalListings > 0
      ? Math.round((yourListings / totalListings) * 100 * 10) / 10
      : 0,
    byReviews: totalReviews > 0
      ? Math.round((yourReviews / totalReviews) * 100 * 10) / 10
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
    const {
      brandName,
      competitors = [],
      locationCode = 2840,
      languageCode = 'en',
      searchTerms = [], // Additional search terms like "tire shop near me", "auto repair"
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

    const validSearchTerms = Array.isArray(searchTerms)
      ? searchTerms.filter((t): t is string => typeof t === 'string').slice(0, 3)
      : [];

    // Search for brand names and additional terms
    const searchKeywords = [brandName, ...validCompetitors, ...validSearchTerms];

    console.log(`Fetching Google Maps data for: ${searchKeywords.join(', ')}`);

    // Fetch Google Maps results for ALL keywords in parallel
    const results = await Promise.all(
      searchKeywords.map(keyword => fetchGoogleMaps(keyword, locationCode, languageCode, auth))
    );

    // Collect all listings from parallel results
    const allListings: BusinessListing[] = [];
    let apiStatus = 'ok';

    for (const result of results) {
      allListings.push(...result.listings);
      if (result.status !== 'Ok.' && result.status !== 'ok') {
        apiStatus = result.status;
      }
    }

    console.log(`Total listings collected: ${allListings.length}`);

    // Deduplicate all listings by place ID
    const uniqueAllListings = Array.from(
      new Map(allListings.map(l => [l.placeId, l])).values()
    ).sort((a, b) => a.rank - b.rank);

    // Aggregate by brand
    const yourBrandData = aggregateBrandListings(allListings, brandName);
    const competitorData = validCompetitors.map(comp =>
      aggregateBrandListings(allListings, comp)
    );

    // Calculate SOV
    const sov = calculateLocalSOV(yourBrandData, competitorData);

    // Calculate totals for methodology
    const totalListings = yourBrandData.totalListings + competitorData.reduce((s, c) => s + c.totalListings, 0);
    const totalReviews = yourBrandData.totalReviews + competitorData.reduce((s, c) => s + c.totalReviews, 0);

    // Build methodology explanation
    const methodology = {
      visibilityFormula: `Visibility SOV = (Your Listings / Total Listings) × 100 = (${yourBrandData.totalListings} / ${totalListings}) × 100 = ${sov.byListings}%`,
      reviewSOVFormula: `Review SOV = (Your Reviews / Total Reviews) × 100 = (${yourBrandData.totalReviews.toLocaleString()} / ${totalReviews.toLocaleString()}) × 100 = ${sov.byReviews}%`,
      brandMatchingMethod: 'Listings are matched to brands by: 1) Searching Google Maps for brand names, 2) Filtering listings where the business title contains the brand name or domain matches the brand.',
      dataSource: 'Data is fetched from Google Maps via DataForSEO SERP API. Up to 100 listings are analyzed per search query.',
    };

    const response: GoogleMapsResponse = {
      yourBrand: yourBrandData.totalListings > 0 ? yourBrandData : null,
      competitors: competitorData.filter(c => c.totalListings > 0),
      allListings: uniqueAllListings.slice(0, 50),
      sov,
      searchedKeywords: searchKeywords,
      location: `Location code: ${locationCode}`,
      timestamp: new Date().toISOString(),
      methodology,
      debug: {
        totalListingsFetched: allListings.length,
        apiStatus,
      },
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Google Maps API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
