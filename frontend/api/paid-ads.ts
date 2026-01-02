import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Paid Ads SOV API
 * Fetches paid search competitor data using DataForSEO Labs API
 * Calculates Share of Voice based on estimated traffic and ad spend
 */

interface PaidCompetitor {
  domain: string;
  paidETV: number;
  paidKeywordsCount: number;
  estimatedAdSpend: number;
  avgPosition: number;
  intersections: number;
  positionDistribution: {
    pos1: number;
    pos2_3: number;
    pos4_10: number;
  };
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
}

/**
 * Fetch paid search competitors from DataForSEO Labs
 */
async function fetchPaidCompetitors(
  domain: string,
  locationCode: number,
  languageCode: string,
  auth: string
): Promise<PaidCompetitor[]> {
  const competitors: PaidCompetitor[] = [];

  try {
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
          item_types: ['paid'],
          limit: 20,
          order_by: ['metrics.paid.etv,desc'],
        }]),
      }
    );

    if (!response.ok) {
      console.error(`Competitors Domain API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const items = data?.tasks?.[0]?.result?.[0]?.items || [];

    for (const item of items) {
      const paidMetrics = item.metrics?.paid || {};

      competitors.push({
        domain: item.domain || '',
        paidETV: paidMetrics.etv || 0,
        paidKeywordsCount: paidMetrics.count || 0,
        estimatedAdSpend: paidMetrics.estimated_paid_traffic_cost || 0,
        avgPosition: paidMetrics.avg_position || 0,
        intersections: item.intersections || 0,
        positionDistribution: {
          pos1: paidMetrics.pos_1 || 0,
          pos2_3: (paidMetrics.pos_2_3 || 0),
          pos4_10: (paidMetrics.pos_4_10 || 0),
        },
      });
    }

    console.log(`Found ${competitors.length} paid search competitors for ${domain}`);
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

    // Fetch paid search competitors
    const allCompetitors = await fetchPaidCompetitors(
      domain,
      locationCode,
      languageCode,
      auth
    );

    // Find your domain in the results (it should be included)
    const yourDomainData = allCompetitors.find(
      c => c.domain.toLowerCase().includes(domain.toLowerCase()) ||
           domain.toLowerCase().includes(c.domain.toLowerCase())
    ) || null;

    // Filter out your domain from competitors list
    const competitors = allCompetitors.filter(
      c => c.domain !== yourDomainData?.domain
    ).slice(0, 10); // Top 10 competitors

    // Calculate SOV
    const { sov, totalMarket } = calculatePaidSOV(yourDomainData, competitors);

    const response: PaidAdsResponse = {
      yourDomain: yourDomainData,
      competitors,
      sov,
      totalMarket,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Paid Ads API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
