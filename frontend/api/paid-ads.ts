import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Paid Ads SOV API
 * Fetches paid search data using DataForSEO Labs API
 * Uses domain_metrics for your domain + competitors_domain for market context
 */

interface PaidCompetitor {
  domain: string;
  paidETV: number;
  paidKeywordsCount: number;
  estimatedAdSpend: number;
  avgPosition: number;
  intersections: number;
}

interface PaidAdsResponse {
  yourDomain: PaidCompetitor | null;
  competitors: PaidCompetitor[];
  sov: {
    byTraffic: number;
    byKeywords: number;
    bySpend: number;
  };
  totalMarket: {
    totalETV: number;
    totalKeywords: number;
    totalSpend: number;
  };
  timestamp: string;
  debug?: {
    apiStatus: string;
    metricsFound: boolean;
    competitorsFound: number;
  };
}

/**
 * Fetch domain metrics using historical_rank_overview endpoint
 * This gives us domain-level paid search metrics
 */
async function fetchDomainMetrics(
  domain: string,
  locationCode: number,
  languageCode: string,
  auth: string
): Promise<PaidCompetitor | null> {
  try {
    console.log(`Fetching historical rank overview for ${domain}`);

    // Try historical_rank_overview first - it gives overall domain metrics
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
        }]),
      }
    );

    const data = await response.json();
    console.log(`Historical rank overview response:`, JSON.stringify(data).substring(0, 1000));

    const items = data?.tasks?.[0]?.result?.[0]?.items || [];

    // Get most recent data point
    if (items.length > 0) {
      const latestData = items[0];
      const paidMetrics = latestData.metrics?.paid;

      if (paidMetrics && (paidMetrics.etv > 0 || paidMetrics.count > 0)) {
        return {
          domain,
          paidETV: paidMetrics.etv || 0,
          paidKeywordsCount: paidMetrics.count || 0,
          estimatedAdSpend: paidMetrics.estimated_paid_traffic_cost || 0,
          avgPosition: paidMetrics.pos_1 ? 1 : paidMetrics.pos_2_3 ? 2 : paidMetrics.pos_4_10 ? 5 : 10,
          intersections: 0,
        };
      }
    }

    // Fallback to ranked keywords endpoint
    console.log(`No paid metrics in historical overview, trying ranked_keywords...`);
    return await fetchDomainRankedKeywords(domain, locationCode, languageCode, auth);
  } catch (error) {
    console.error('Domain metrics error:', error);
    // Try fallback
    return await fetchDomainRankedKeywords(domain, locationCode, languageCode, auth);
  }
}

/**
 * Fallback: Get paid data from ranked_keywords endpoint
 */
async function fetchDomainRankedKeywords(
  domain: string,
  locationCode: number,
  languageCode: string,
  auth: string
): Promise<PaidCompetitor | null> {
  try {
    console.log(`Fetching ranked keywords (paid) for ${domain}`);

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
        }]),
      }
    );

    if (!response.ok) {
      console.error(`Ranked keywords API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`Ranked keywords response:`, JSON.stringify(data).substring(0, 500));

    const result = data?.tasks?.[0]?.result?.[0];
    const items = result?.items || [];
    const totalCount = result?.total_count || 0;

    if (items.length > 0 || totalCount > 0) {
      // Calculate metrics from items
      let totalETV = 0;
      let totalSpend = 0;
      let totalPosition = 0;

      for (const item of items) {
        const searchVolume = item.keyword_data?.keyword_info?.search_volume || 0;
        const position = item.ranked_serp_element?.serp_item?.rank_group || 50;
        // Estimate CTR based on position
        const ctr = position <= 3 ? 0.1 : position <= 5 ? 0.05 : 0.02;
        totalETV += searchVolume * ctr;
        totalSpend += item.keyword_data?.keyword_info?.cpc || 0;
        totalPosition += position;
      }

      return {
        domain,
        paidETV: Math.round(totalETV),
        paidKeywordsCount: totalCount || items.length,
        estimatedAdSpend: Math.round(totalSpend * totalETV),
        avgPosition: items.length > 0 ? totalPosition / items.length : 0,
        intersections: 0,
      };
    }

    return null;
  } catch (error) {
    console.error('Ranked keywords error:', error);
    return null;
  }
}

/**
 * Fetch competitors and their paid metrics using competitors_domain endpoint
 * Gets organic competitors first, then filters by paid activity
 */
async function fetchPaidCompetitors(
  domain: string,
  locationCode: number,
  languageCode: string,
  auth: string
): Promise<PaidCompetitor[]> {
  const competitors: PaidCompetitor[] = [];

  try {
    console.log(`Fetching competitors for ${domain}`);

    // Get organic competitors (they return paid metrics too)
    const response = await fetch(
      'https://api.dataforseo.com/v3/dataforseo_labs/google/competitors_domain/live',
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
          limit: 50,
        }]),
      }
    );

    const data = await response.json();
    console.log(`Competitors response:`, JSON.stringify(data).substring(0, 1500));

    // Check for API errors
    const taskError = data?.tasks?.[0]?.status_message;
    if (taskError && taskError !== 'Ok.') {
      console.log(`Competitors API status: ${taskError}`);
    }

    const items = data?.tasks?.[0]?.result?.[0]?.items || [];
    console.log(`Got ${items.length} competitor items from API`);

    for (const item of items) {
      const paidMetrics = item.metrics?.paid || {};

      // Include competitors with any paid activity
      if (paidMetrics.etv > 0 || paidMetrics.count > 0) {
        competitors.push({
          domain: item.domain || '',
          paidETV: paidMetrics.etv || 0,
          paidKeywordsCount: paidMetrics.count || 0,
          estimatedAdSpend: paidMetrics.estimated_paid_traffic_cost || 0,
          avgPosition: paidMetrics.pos_1 ? 1 : paidMetrics.pos_2_3 ? 2 : paidMetrics.pos_4_10 ? 5 : 10,
          intersections: item.intersections || 0,
        });
      }
    }

    // Sort by paid ETV descending
    competitors.sort((a, b) => b.paidETV - a.paidETV);

    console.log(`Found ${competitors.length} competitors with paid activity`);
  } catch (error) {
    console.error('Competitors Domain API error:', error);
  }

  return competitors;
}

/**
 * Calculate Paid Ads SOV
 */
function calculatePaidSOV(
  yourDomain: PaidCompetitor | null,
  competitors: PaidCompetitor[]
): {
  sov: { byTraffic: number; byKeywords: number; bySpend: number };
  totalMarket: { totalETV: number; totalKeywords: number; totalSpend: number };
} {
  const allDomains = yourDomain ? [yourDomain, ...competitors] : competitors;

  const totalETV = allDomains.reduce((sum, c) => sum + c.paidETV, 0);
  const totalKeywords = allDomains.reduce((sum, c) => sum + c.paidKeywordsCount, 0);
  const totalSpend = allDomains.reduce((sum, c) => sum + c.estimatedAdSpend, 0);

  const yourETV = yourDomain?.paidETV || 0;
  const yourKeywords = yourDomain?.paidKeywordsCount || 0;
  const yourSpend = yourDomain?.estimatedAdSpend || 0;

  return {
    sov: {
      byTraffic: totalETV > 0
        ? Math.round((yourETV / totalETV) * 100 * 10) / 10
        : 0,
      byKeywords: totalKeywords > 0
        ? Math.round((yourKeywords / totalKeywords) * 100 * 10) / 10
        : 0,
      bySpend: totalSpend > 0
        ? Math.round((yourSpend / totalSpend) * 100 * 10) / 10
        : 0,
    },
    totalMarket: {
      totalETV,
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
    const { domain, locationCode = 2840, languageCode = 'en' } = req.body;

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

    console.log(`Fetching paid ads data for ${domain}`);

    // Fetch your domain's metrics and competitors in parallel
    const [yourDomainData, allCompetitors] = await Promise.all([
      fetchDomainMetrics(domain, locationCode, languageCode, auth),
      fetchPaidCompetitors(domain, locationCode, languageCode, auth),
    ]);

    // Filter competitors to exclude your domain
    const competitors = allCompetitors.filter(
      c => !c.domain.toLowerCase().includes(domain.toLowerCase()) &&
           !domain.toLowerCase().includes(c.domain.toLowerCase())
    ).slice(0, 10);

    // Calculate SOV
    const { sov, totalMarket } = calculatePaidSOV(yourDomainData, competitors);

    const response: PaidAdsResponse = {
      yourDomain: yourDomainData,
      competitors,
      sov,
      totalMarket,
      timestamp: new Date().toISOString(),
      debug: {
        apiStatus: 'ok',
        metricsFound: yourDomainData !== null,
        competitorsFound: competitors.length,
      },
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Paid Ads API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
