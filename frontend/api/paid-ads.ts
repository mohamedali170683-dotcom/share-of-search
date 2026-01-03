import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Paid Ads SOV API
 * Uses DataForSEO Google Ads Transparency API (SERP API)
 * This provides actual Google Ads data from Google's Ads Transparency Center
 *
 * Two-step approach:
 * 1. Find advertisers using ads_advertisers endpoint (search by brand keyword)
 * 2. Get their ads using ads_search endpoint
 */

interface AdvertiserInfo {
  advertiserId: string;
  name: string;
  domain?: string;
  verificationStatus?: string;
  adCount: number;
}

interface AdInfo {
  advertiserName: string;
  advertiserId: string;
  domain?: string;
  format: string;
  platform: string;
  firstShown?: string;
  lastShown?: string;
}

interface PaidAdsData {
  name: string;
  advertiserId?: string;
  adCount: number;
  platforms: string[];
  formats: string[];
  isVerified: boolean;
}

interface PaidAdsResponse {
  yourBrand: PaidAdsData | null;
  competitors: PaidAdsData[];
  sov: {
    byAdCount: number;
  };
  totalMarket: {
    totalAds: number;
  };
  allAdvertisers: AdvertiserInfo[];
  timestamp: string;
  debug?: {
    apiStatus: string;
    advertisersFound: number;
    method: string;
  };
}

/**
 * Fetch advertisers by keyword using Google Ads Transparency API
 * This searches the Google Ads Transparency Center for advertisers
 */
async function fetchAdvertisersByKeyword(
  keyword: string,
  locationCode: number,
  auth: string
): Promise<{ advertisers: AdvertiserInfo[]; status: string }> {
  const advertisers: AdvertiserInfo[] = [];

  try {
    console.log(`Searching advertisers for keyword: "${keyword}" (location: ${locationCode})`);

    const response = await fetch(
      'https://api.dataforseo.com/v3/serp/google/ads_advertisers/live/advanced',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          keyword,
          location_code: locationCode,
        }]),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ads advertisers API error: ${response.status} - ${errorText}`);
      return { advertisers: [], status: `API error: ${response.status}` };
    }

    const data = await response.json();
    console.log(`Ads advertisers response:`, JSON.stringify(data).substring(0, 1500));

    const taskStatus = data?.tasks?.[0]?.status_message || 'unknown';
    const items = data?.tasks?.[0]?.result?.[0]?.items || [];

    console.log(`Found ${items.length} advertiser items for "${keyword}"`);

    for (const item of items) {
      // Handle different item types from the API
      if (item.type === 'ads_advertiser' || item.type === 'ads_multi_account_advertiser') {
        advertisers.push({
          advertiserId: item.advertiser_id || '',
          name: item.title || item.advertiser_name || '',
          domain: item.domain || '',
          verificationStatus: item.verification_status || 'unknown',
          adCount: item.ads_count || item.approximate_ads_count || 0,
        });
      } else if (item.type === 'ads_domain') {
        advertisers.push({
          advertiserId: item.advertiser_id || '',
          name: item.domain || '',
          domain: item.domain || '',
          verificationStatus: item.verification_status || 'unknown',
          adCount: item.ads_count || 0,
        });
      }
    }

    return { advertisers, status: taskStatus };
  } catch (error) {
    console.error(`Advertisers API exception for "${keyword}":`, error);
    return { advertisers: [], status: `Exception: ${error}` };
  }
}

/**
 * Fetch ads for a specific domain using Google Ads Search API
 * This searches the Google Ads Transparency Center for ads by domain
 */
async function fetchAdsByDomain(
  domain: string,
  locationCode: number,
  auth: string
): Promise<{ ads: AdInfo[]; status: string }> {
  const ads: AdInfo[] = [];

  try {
    console.log(`Fetching ads for domain: "${domain}"`);

    const response = await fetch(
      'https://api.dataforseo.com/v3/serp/google/ads_search/live/advanced',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          target: domain,
          location_code: locationCode,
          depth: 100,
          platform: 'all',
          format: 'all',
        }]),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ads search API error: ${response.status} - ${errorText}`);
      return { ads: [], status: `API error: ${response.status}` };
    }

    const data = await response.json();
    console.log(`Ads search response for ${domain}:`, JSON.stringify(data).substring(0, 1000));

    const taskStatus = data?.tasks?.[0]?.status_message || 'unknown';
    const items = data?.tasks?.[0]?.result?.[0]?.items || [];

    console.log(`Found ${items.length} ads for domain "${domain}"`);

    for (const item of items) {
      ads.push({
        advertiserName: item.advertiser_name || '',
        advertiserId: item.advertiser_id || '',
        domain: item.domain || domain,
        format: item.format || 'unknown',
        platform: item.platform || 'unknown',
        firstShown: item.first_shown || '',
        lastShown: item.last_shown || '',
      });
    }

    return { ads, status: taskStatus };
  } catch (error) {
    console.error(`Ads search API exception for "${domain}":`, error);
    return { ads: [], status: `Exception: ${error}` };
  }
}

/**
 * Match advertiser to brand by name similarity
 */
function matchAdvertiserToBrand(advertiser: AdvertiserInfo, brandName: string): boolean {
  const advertiserLower = advertiser.name.toLowerCase();
  const domainLower = (advertiser.domain || '').toLowerCase();
  const brandLower = brandName.toLowerCase();

  // Direct name match
  if (advertiserLower.includes(brandLower)) return true;
  if (brandLower.includes(advertiserLower) && advertiserLower.length > 3) return true;

  // Domain match
  if (domainLower.includes(brandLower)) return true;

  // Check individual brand words
  const brandWords = brandLower.split(/\s+/);
  if (brandWords.some(word => word.length > 3 && advertiserLower.includes(word))) {
    return true;
  }

  return false;
}

/**
 * Aggregate advertiser data for a brand
 */
function aggregateBrandData(
  advertisers: AdvertiserInfo[],
  ads: AdInfo[],
  brandName: string
): PaidAdsData {
  const matchedAdvertisers = advertisers.filter(a => matchAdvertiserToBrand(a, brandName));
  const totalAdCount = matchedAdvertisers.reduce((sum, a) => sum + a.adCount, 0);

  // Get unique platforms and formats from ads
  const platforms = [...new Set(ads.map(a => a.platform).filter(Boolean))];
  const formats = [...new Set(ads.map(a => a.format).filter(Boolean))];

  const isVerified = matchedAdvertisers.some(
    a => a.verificationStatus === 'verified' || a.verificationStatus === 'VERIFIED'
  );

  return {
    name: brandName,
    advertiserId: matchedAdvertisers[0]?.advertiserId,
    adCount: totalAdCount || ads.length,
    platforms: platforms.length > 0 ? platforms : ['unknown'],
    formats: formats.length > 0 ? formats : ['unknown'],
    isVerified,
  };
}

/**
 * Calculate Paid Ads SOV
 */
function calculatePaidSOV(
  yourBrand: PaidAdsData | null,
  competitors: PaidAdsData[]
): { sov: { byAdCount: number }; totalMarket: { totalAds: number } } {
  const allBrands = yourBrand ? [yourBrand, ...competitors] : competitors;
  const totalAds = allBrands.reduce((sum, b) => sum + b.adCount, 0);

  const yourAds = yourBrand?.adCount || 0;

  return {
    sov: {
      byAdCount: totalAds > 0
        ? Math.round((yourAds / totalAds) * 100 * 10) / 10
        : 0,
    },
    totalMarket: {
      totalAds,
    },
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
    const { domain, brandName, competitors = [], locationCode = 2840 } = req.body;

    // Use brandName for advertiser search, domain for ads search
    const searchBrand = brandName || domain;

    if (!searchBrand || typeof searchBrand !== 'string') {
      return res.status(400).json({ error: 'brandName or domain is required' });
    }

    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      return res.status(500).json({
        error: 'DataForSEO credentials not configured'
      });
    }

    const auth = Buffer.from(`${login}:${password}`).toString('base64');

    console.log(`Fetching paid ads data for ${searchBrand}`);

    const validCompetitors = Array.isArray(competitors)
      ? competitors.filter((c): c is string => typeof c === 'string').slice(0, 4)
      : [];

    // Search for all brands (yours + competitors)
    const allBrandKeywords = [searchBrand, ...validCompetitors];

    // Fetch advertisers for each brand keyword
    const allAdvertisers: AdvertiserInfo[] = [];
    let apiStatus = 'ok';

    for (const keyword of allBrandKeywords) {
      const result = await fetchAdvertisersByKeyword(keyword, locationCode, auth);
      allAdvertisers.push(...result.advertisers);
      if (result.status !== 'Ok.' && result.status !== 'ok') {
        apiStatus = result.status;
      }
    }

    // Deduplicate advertisers by ID
    const uniqueAdvertisers = Array.from(
      new Map(allAdvertisers.map(a => [a.advertiserId, a])).values()
    );

    console.log(`Total unique advertisers found: ${uniqueAdvertisers.length}`);

    // Fetch ads for the main domain if provided
    let yourAds: AdInfo[] = [];
    if (domain) {
      const adsResult = await fetchAdsByDomain(domain, locationCode, auth);
      yourAds = adsResult.ads;
      if (adsResult.status !== 'Ok.' && adsResult.status !== 'ok') {
        apiStatus = adsResult.status;
      }
    }

    // Aggregate data for your brand
    const yourBrandData = aggregateBrandData(uniqueAdvertisers, yourAds, searchBrand);

    // Aggregate data for competitors
    const competitorData = validCompetitors.map(comp =>
      aggregateBrandData(uniqueAdvertisers, [], comp)
    );

    // Calculate SOV
    const { sov, totalMarket } = calculatePaidSOV(yourBrandData, competitorData);

    const response: PaidAdsResponse = {
      yourBrand: yourBrandData,
      competitors: competitorData,
      sov,
      totalMarket,
      allAdvertisers: uniqueAdvertisers.slice(0, 20),
      timestamp: new Date().toISOString(),
      debug: {
        apiStatus,
        advertisersFound: uniqueAdvertisers.length,
        method: 'Google Ads Transparency API',
      },
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Paid Ads API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
