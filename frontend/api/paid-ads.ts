import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Paid Ads SOV API
 * Uses DataForSEO Labs API to get actual paid search performance data
 *
 * Metrics:
 * - Paid keywords count and top keywords
 * - Estimated paid traffic (ETV)
 * - Estimated ad spend
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
 * Fetch paid keywords for a domain using ranked_keywords endpoint
 */
async function fetchPaidKeywords(
  domain: string,
  locationCode: number,
  auth: string
): Promise<DomainPaidData | null> {
  try {
    // Get the correct language for this location
    const languageCode = getLanguageForLocation(locationCode);
    console.log(`Fetching paid keywords for ${domain} (location: ${locationCode}, lang: ${languageCode})`);

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
          limit: 100,
          order_by: ['keyword_data.keyword_info.search_volume,desc'],
        }]),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Paid keywords API error for ${domain}: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`Paid keywords response for ${domain}:`, JSON.stringify(data).substring(0, 800));

    const task = data?.tasks?.[0];
    if (task?.status_message !== 'Ok.') {
      console.log(`API status for ${domain}: ${task?.status_message}`);
    }

    const result = task?.result?.[0];
    const items = result?.items || [];
    const totalCount = result?.total_count || 0;
    const metrics = result?.metrics?.paid || {};

    // Extract top keywords
    const topKeywords: PaidKeyword[] = items.slice(0, 20).map((item: any) => ({
      keyword: item.keyword_data?.keyword || '',
      searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
      cpc: item.keyword_data?.keyword_info?.cpc || 0,
      position: item.ranked_serp_element?.serp_item?.rank_group || 0,
      url: item.ranked_serp_element?.serp_item?.url || '',
      competition: item.keyword_data?.keyword_info?.competition || 0,
    }));

    // Calculate estimated spend from keywords
    let estimatedSpend = metrics.estimated_paid_traffic_cost || 0;
    if (!estimatedSpend && topKeywords.length > 0) {
      // Estimate from CPC and traffic
      estimatedSpend = topKeywords.reduce((sum, kw) => {
        const ctr = kw.position <= 1 ? 0.15 : kw.position <= 3 ? 0.08 : 0.03;
        return sum + (kw.searchVolume * ctr * kw.cpc);
      }, 0);
    }

    // Position distribution
    const positionDistribution = {
      pos1: metrics.pos_1 || 0,
      pos2_3: metrics.pos_2_3 || 0,
      pos4_10: metrics.pos_4_10 || 0,
      pos11_plus: (metrics.pos_11_20 || 0) + (metrics.pos_21_30 || 0) + (metrics.pos_31_40 || 0),
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
        positionDistribution.pos11_plus * 20
      ) / totalPositions;
    }

    return {
      domain,
      paidKeywordsCount: totalCount,
      estimatedTraffic: metrics.etv || 0,
      estimatedSpend: Math.round(estimatedSpend),
      avgPosition: Math.round(avgPosition * 10) / 10,
      topKeywords,
      positionDistribution,
    };
  } catch (error) {
    console.error(`Error fetching paid keywords for ${domain}:`, error);
    return null;
  }
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

    // Fetch data for all domains in parallel
    const allDomains = [domain, ...competitorDomains];
    const results = await Promise.all(
      allDomains.map(d => fetchPaidKeywords(d, locationCode, auth))
    );

    const yourDomainData = results[0];
    const competitorData = results.slice(1).filter((d): d is DomainPaidData => d !== null);

    // Calculate SOV
    const { sov, totalMarket } = calculateSOV(yourDomainData, competitorData);

    const response: PaidAdsResponse = {
      yourDomain: yourDomainData,
      competitors: competitorData,
      sov,
      totalMarket,
      timestamp: new Date().toISOString(),
      debug: {
        apiStatus: 'ok',
        method: 'DataForSEO Labs ranked_keywords (paid)',
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
