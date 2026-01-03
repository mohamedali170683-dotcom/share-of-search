import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Paid Ads SOV API
 * Uses DataForSEO Labs API historical_rank_overview endpoint
 * This provides historical paid advertising data going back to October 2020
 *
 * Metrics:
 * - Paid keywords count (SERPs containing domain)
 * - Estimated paid traffic (ETV)
 * - Estimated ad spend
 * - Position distribution for paid ads
 * - Competitor comparison
 */

// Map location codes to their primary language code for DataForSEO Labs API
const LOCATION_LANGUAGE_MAP: Record<number, string> = {
  2840: 'en', // United States
  2826: 'en', // United Kingdom
  2124: 'en', // Canada
  2036: 'en', // Australia
  2276: 'de', // Germany
  2250: 'fr', // France
  2380: 'it', // Italy
  2724: 'es', // Spain
  2528: 'nl', // Netherlands
  2756: 'de', // Switzerland (German)
  2040: 'de', // Austria
  2056: 'nl', // Belgium (Dutch)
  2616: 'pl', // Poland
  2752: 'sv', // Sweden
  2578: 'no', // Norway
  2208: 'da', // Denmark
  2246: 'fi', // Finland
  2392: 'ja', // Japan
  2410: 'ko', // South Korea
  2156: 'zh', // China
  2076: 'pt', // Brazil
  2484: 'es', // Mexico
  2356: 'en', // India
};

function getLanguageForLocation(locationCode: number): string {
  return LOCATION_LANGUAGE_MAP[locationCode] || 'en';
}

/**
 * Get date range for last 6 months of data
 */
function getDateRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const dateTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // Go back 6 months
  const fromDate = new Date(now);
  fromDate.setMonth(fromDate.getMonth() - 6);
  const dateFrom = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-01`;

  return { dateFrom, dateTo };
}

interface PaidKeyword {
  keyword: string;
  searchVolume: number;
  cpc: number;
  position: number;
  url: string;
  competition: number;
}

interface DomainPaidData {
  domain: string;
  paidKeywordsCount: number;
  estimatedTraffic: number;
  estimatedSpend: number;
  avgPosition: number;
  topKeywords: PaidKeyword[];
  positionDistribution: {
    pos1: number;
    pos2_3: number;
    pos4_10: number;
    pos11_plus: number;
  };
}

interface PaidAdsResponse {
  yourDomain: DomainPaidData | null;
  competitors: DomainPaidData[];
  sov: {
    byTraffic: number;
    byKeywords: number;
    bySpend: number;
  };
  totalMarket: {
    totalTraffic: number;
    totalKeywords: number;
    totalSpend: number;
  };
  timestamp: string;
  debug?: {
    apiStatus: string;
    method: string;
    yourKeywordsFound: number;
    competitorsAnalyzed: number;
  };
}

/**
 * Fetch historical paid data for a domain using historical_rank_overview endpoint
 * This endpoint provides historical paid advertising data going back to October 2020
 */
async function fetchHistoricalPaidData(
  domain: string,
  locationCode: number,
  auth: string
): Promise<DomainPaidData | null> {
  try {
    const languageCode = getLanguageForLocation(locationCode);
    const { dateFrom, dateTo } = getDateRange();

    console.log(`Fetching historical paid data for ${domain} (location: ${locationCode}, lang: ${languageCode}, from: ${dateFrom}, to: ${dateTo})`);

    const response = await fetch(
      'https://api.dataforseo.com/v3/dataforseo_labs/google/historical_rank_overview/live',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          target: domain,
          location_code: locationCode,
          language_code: languageCode,
          date_from: dateFrom,
          date_to: dateTo,
        }]),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Historical rank API error for ${domain}: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`Historical rank response for ${domain}:`, JSON.stringify(data).substring(0, 2000));

    const task = data?.tasks?.[0];
    if (task?.status_code !== 20000) {
      console.error(`API error for ${domain}: status_code=${task?.status_code}, message=${task?.status_message}`);
      return null;
    }

    const result = task?.result?.[0];
    if (!result) {
      console.log(`No result data for ${domain}`);
      return null;
    }

    const items = result?.items || [];
    console.log(`Domain ${domain}: ${items.length} months of historical data`);

    // Get the most recent month's data or aggregate across months
    // Items are ordered by date, find the most recent with paid data
    let latestPaidMetrics: any = null;
    let totalPaidTraffic = 0;
    let totalPaidSpend = 0;
    let totalPaidCount = 0;
    let monthsWithData = 0;

    for (const item of items) {
      const paidMetrics = item?.metrics?.paid;
      if (paidMetrics && (paidMetrics.etv > 0 || paidMetrics.count > 0)) {
        if (!latestPaidMetrics) {
          latestPaidMetrics = paidMetrics;
        }
        totalPaidTraffic += paidMetrics.etv || 0;
        totalPaidSpend += paidMetrics.estimated_paid_traffic_cost || 0;
        totalPaidCount += paidMetrics.count || 0;
        monthsWithData++;
      }
    }

    // Use aggregated averages if we have multiple months
    const avgMonthlyTraffic = monthsWithData > 0 ? Math.round(totalPaidTraffic / monthsWithData) : 0;
    const avgMonthlySpend = monthsWithData > 0 ? Math.round(totalPaidSpend / monthsWithData) : 0;
    const avgMonthlyCount = monthsWithData > 0 ? Math.round(totalPaidCount / monthsWithData) : 0;

    // If no paid data found, return null
    if (!latestPaidMetrics && avgMonthlyCount === 0) {
      console.log(`No paid data found for ${domain} in historical data`);
      return null;
    }

    const metrics = latestPaidMetrics || {};

    // Position distribution from latest month
    const positionDistribution = {
      pos1: metrics.pos_1 || 0,
      pos2_3: metrics.pos_2_3 || 0,
      pos4_10: metrics.pos_4_10 || 0,
      pos11_plus: (metrics.pos_11_20 || 0) + (metrics.pos_21_30 || 0) +
                  (metrics.pos_31_40 || 0) + (metrics.pos_41_50 || 0),
    };

    // Calculate average position
    let avgPosition = 0;
    const totalPositions = positionDistribution.pos1 + positionDistribution.pos2_3 +
                          positionDistribution.pos4_10 + positionDistribution.pos11_plus;
    if (totalPositions > 0) {
      avgPosition = (
        positionDistribution.pos1 * 1 +
        positionDistribution.pos2_3 * 2.5 +
        positionDistribution.pos4_10 * 7 +
        positionDistribution.pos11_plus * 25
      ) / totalPositions;
    }

    console.log(`Domain ${domain}: avgMonthlyTraffic=${avgMonthlyTraffic}, avgMonthlySpend=${avgMonthlySpend}, avgMonthlyCount=${avgMonthlyCount}, monthsWithData=${monthsWithData}`);

    return {
      domain,
      paidKeywordsCount: avgMonthlyCount,
      estimatedTraffic: avgMonthlyTraffic,
      estimatedSpend: avgMonthlySpend,
      avgPosition: Math.round(avgPosition * 10) / 10,
      topKeywords: [], // Historical endpoint doesn't provide individual keywords
      positionDistribution,
    };
  } catch (error) {
    console.error(`Error fetching historical paid data for ${domain}:`, error);
    return null;
  }
}

/**
 * Fetch top paid keywords using ranked_keywords endpoint (supplementary data)
 */
async function fetchTopPaidKeywords(
  domain: string,
  locationCode: number,
  auth: string
): Promise<PaidKeyword[]> {
  try {
    const languageCode = getLanguageForLocation(locationCode);

    const response = await fetch(
      'https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          target: domain,
          location_code: locationCode,
          language_code: languageCode,
          item_types: ['paid'],
          limit: 20,
          order_by: ['keyword_data.keyword_info.search_volume,desc'],
        }]),
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const task = data?.tasks?.[0];
    if (task?.status_code !== 20000) return [];

    const items = task?.result?.[0]?.items || [];

    return items.slice(0, 20).map((item: any) => ({
      keyword: item.keyword_data?.keyword || '',
      searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
      cpc: item.keyword_data?.keyword_info?.cpc || 0,
      position: item.ranked_serp_element?.serp_item?.rank_group || 0,
      url: item.ranked_serp_element?.serp_item?.url || '',
      competition: item.keyword_data?.keyword_info?.competition || 0,
    }));
  } catch (error) {
    console.error(`Error fetching top paid keywords for ${domain}:`, error);
    return [];
  }
}

/**
 * Combined function to get paid data from historical endpoint + top keywords
 */
async function fetchPaidData(
  domain: string,
  locationCode: number,
  auth: string
): Promise<DomainPaidData | null> {
  // Fetch historical data and top keywords in parallel
  const [historicalData, topKeywords] = await Promise.all([
    fetchHistoricalPaidData(domain, locationCode, auth),
    fetchTopPaidKeywords(domain, locationCode, auth),
  ]);

  if (!historicalData) {
    // If no historical data, try to build from keywords alone
    if (topKeywords.length > 0) {
      // Estimate metrics from keywords
      const estimatedTraffic = topKeywords.reduce((sum, kw) => {
        const ctr = kw.position <= 1 ? 0.12 : kw.position <= 3 ? 0.06 : 0.02;
        return sum + Math.round(kw.searchVolume * ctr);
      }, 0);

      const estimatedSpend = topKeywords.reduce((sum, kw) => {
        const ctr = kw.position <= 1 ? 0.12 : kw.position <= 3 ? 0.06 : 0.02;
        return sum + (kw.searchVolume * ctr * kw.cpc);
      }, 0);

      return {
        domain,
        paidKeywordsCount: topKeywords.length,
        estimatedTraffic,
        estimatedSpend: Math.round(estimatedSpend),
        avgPosition: topKeywords.reduce((sum, kw) => sum + kw.position, 0) / topKeywords.length || 0,
        topKeywords,
        positionDistribution: {
          pos1: topKeywords.filter(kw => kw.position === 1).length,
          pos2_3: topKeywords.filter(kw => kw.position >= 2 && kw.position <= 3).length,
          pos4_10: topKeywords.filter(kw => kw.position >= 4 && kw.position <= 10).length,
          pos11_plus: topKeywords.filter(kw => kw.position > 10).length,
        },
      };
    }
    return null;
  }

  // Merge historical data with top keywords
  return {
    ...historicalData,
    topKeywords,
  };
}

/**
 * Calculate SOV metrics
 */
function calculateSOV(
  yourDomain: DomainPaidData | null,
  competitors: DomainPaidData[]
): {
  sov: { byTraffic: number; byKeywords: number; bySpend: number };
  totalMarket: { totalTraffic: number; totalKeywords: number; totalSpend: number };
} {
  const allDomains = yourDomain ? [yourDomain, ...competitors] : competitors;

  const totalTraffic = allDomains.reduce((sum, d) => sum + d.estimatedTraffic, 0);
  const totalKeywords = allDomains.reduce((sum, d) => sum + d.paidKeywordsCount, 0);
  const totalSpend = allDomains.reduce((sum, d) => sum + d.estimatedSpend, 0);

  const yourTraffic = yourDomain?.estimatedTraffic || 0;
  const yourKeywords = yourDomain?.paidKeywordsCount || 0;
  const yourSpend = yourDomain?.estimatedSpend || 0;

  return {
    sov: {
      byTraffic: totalTraffic > 0
        ? Math.round((yourTraffic / totalTraffic) * 100 * 10) / 10
        : 0,
      byKeywords: totalKeywords > 0
        ? Math.round((yourKeywords / totalKeywords) * 100 * 10) / 10
        : 0,
      bySpend: totalSpend > 0
        ? Math.round((yourSpend / totalSpend) * 100 * 10) / 10
        : 0,
    },
    totalMarket: {
      totalTraffic,
      totalKeywords,
      totalSpend,
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
    const { domain, competitors = [], locationCode = 2840 } = req.body;

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'domain is required' });
    }

    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      return res.status(500).json({
        error: 'DataForSEO credentials not configured'
      });
    }

    const auth = Buffer.from(`${login}:${password}`).toString('base64');

    console.log(`Fetching paid ads data for ${domain} and competitors (location: ${locationCode})`);

    // Get competitor domains - extract domain from brand names if needed
    const competitorDomains = Array.isArray(competitors)
      ? competitors
          .filter((c): c is string => typeof c === 'string')
          .slice(0, 4)
          .map(c => c.toLowerCase().includes('.') ? c : `${c.toLowerCase()}.com`)
      : [];

    // Fetch data for all domains in parallel using historical + keywords endpoints
    const allDomains = [domain, ...competitorDomains];
    const results = await Promise.all(
      allDomains.map(d => fetchPaidData(d, locationCode, auth))
    );

    const yourDomainData = results[0];
    const competitorData = results.slice(1).filter((d): d is DomainPaidData => d !== null);

    // Calculate SOV
    const { sov, totalMarket } = calculateSOV(yourDomainData, competitorData);

    const { dateFrom, dateTo } = getDateRange();

    const response: PaidAdsResponse = {
      yourDomain: yourDomainData,
      competitors: competitorData,
      sov,
      totalMarket,
      timestamp: new Date().toISOString(),
      debug: {
        apiStatus: 'ok',
        method: `DataForSEO historical_rank_overview (${dateFrom} to ${dateTo})`,
        yourKeywordsFound: yourDomainData?.paidKeywordsCount || 0,
        competitorsAnalyzed: competitorData.length,
      },
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Paid Ads API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
