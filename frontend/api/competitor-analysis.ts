import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Competitor Analysis API
 * Fetches top competitor rankings and compares them with your domain
 * to find threats (where they rank better) and opportunities (gaps)
 */

interface RankedKeywordItem {
  keyword_data: {
    keyword: string;
    keyword_info: {
      search_volume: number;
      categories?: number[];
    };
  };
  ranked_serp_element: {
    serp_item: {
      rank_group: number;
      relative_url: string;
    };
  };
}

interface KeywordRanking {
  keyword: string;
  searchVolume: number;
  position: number;
  url: string;
}

interface CompetitorKeywordAnalysis {
  competitor: string;
  competitorDomain: string;
  threats: Array<{
    keyword: string;
    searchVolume: number;
    yourPosition: number | null;
    competitorPosition: number;
    positionDiff: number;
    yourUrl?: string;
    competitorUrl: string;
    opportunityScore: number;
  }>;
  gaps: Array<{
    keyword: string;
    searchVolume: number;
    competitorPosition: number;
    competitorUrl: string;
    opportunityScore: number;
  }>;
  yourWins: Array<{
    keyword: string;
    searchVolume: number;
    yourPosition: number;
    competitorPosition: number;
    positionDiff: number;
  }>;
  summary: {
    totalOverlap: number;
    threatsCount: number;
    gapsCount: number;
    winsCount: number;
    threatVolume: number;
    gapVolume: number;
  };
}

// Map competitor brand names to their domains
const COMPETITOR_DOMAINS: Record<string, string> = {
  // Tires
  'michelin': 'michelin.de',
  'goodyear': 'goodyear.eu',
  'bridgestone': 'bridgestone.de',
  'pirelli': 'pirelli.com',
  'dunlop': 'dunlop.eu',
  'hankook': 'hankook.com',
  'yokohama': 'yokohama.de',
  'firestone': 'firestone.eu',
  'falken': 'falken.eu',
  'nokian': 'nokiantyres.com',
  'kumho': 'kumhotyre.com',
  'toyo': 'toyo.de',
  'continental': 'continental-reifen.de',

  // Sportswear
  'nike': 'nike.com',
  'adidas': 'adidas.de',
  'puma': 'puma.com',
  'reebok': 'reebok.de',
  'under armour': 'underarmour.de',
  'new balance': 'newbalance.de',
  'asics': 'asics.com',

  // Cosmetics
  'weleda': 'weleda.de',
  'dr hauschka': 'dr.hauschka.com',
  'alverde': 'alverde.de',
  'lavera': 'lavera.de',

  // Tech
  'apple': 'apple.com',
  'samsung': 'samsung.com',
  'google': 'google.com',
  'microsoft': 'microsoft.com',
};

async function fetchDomainKeywords(
  domain: string,
  locationCode: number,
  languageCode: string,
  auth: string,
  limit: number = 100
): Promise<KeywordRanking[]> {
  const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{
      target: domain,
      location_code: locationCode,
      language_code: languageCode,
      item_types: ['organic'],
      limit,
      filters: [
        ['keyword_data.keyword_info.search_volume', '>=', 100],
        'and',
        ['ranked_serp_element.serp_item.rank_group', '<=', 50]
      ],
      order_by: ['keyword_data.keyword_info.search_volume,desc']
    }])
  });

  const data = await response.json();

  if (!response.ok || data.tasks?.[0]?.status_code !== 20000) {
    console.error(`Failed to fetch keywords for ${domain}:`, data);
    return [];
  }

  const items: RankedKeywordItem[] = data.tasks?.[0]?.result?.[0]?.items || [];

  return items.map(item => ({
    keyword: item.keyword_data.keyword.toLowerCase(),
    searchVolume: item.keyword_data.keyword_info.search_volume || 0,
    position: item.ranked_serp_element.serp_item.rank_group,
    url: item.ranked_serp_element.serp_item.relative_url
  }));
}

function analyzeCompetitorKeywords(
  yourKeywords: KeywordRanking[],
  competitorKeywords: KeywordRanking[],
  competitorName: string,
  competitorDomain: string
): CompetitorKeywordAnalysis {
  // Create lookup map for your keywords
  const yourKeywordMap = new Map<string, KeywordRanking>();
  yourKeywords.forEach(k => yourKeywordMap.set(k.keyword, k));

  const threats: CompetitorKeywordAnalysis['threats'] = [];
  const gaps: CompetitorKeywordAnalysis['gaps'] = [];
  const yourWins: CompetitorKeywordAnalysis['yourWins'] = [];

  // Analyze each competitor keyword
  for (const compKw of competitorKeywords) {
    const yourKw = yourKeywordMap.get(compKw.keyword);

    // Skip brand keywords (yours or competitor's)
    if (compKw.keyword.includes(competitorName.toLowerCase())) continue;

    if (yourKw) {
      // Overlap - compare positions
      const positionDiff = yourKw.position - compKw.position;

      if (positionDiff > 0) {
        // Threat: competitor ranks better
        // Score based on search volume and position difference
        const opportunityScore = Math.round(
          (compKw.searchVolume * (positionDiff / 10)) *
          (compKw.position <= 10 ? 1.5 : 1)
        );

        threats.push({
          keyword: compKw.keyword,
          searchVolume: compKw.searchVolume,
          yourPosition: yourKw.position,
          competitorPosition: compKw.position,
          positionDiff,
          yourUrl: yourKw.url,
          competitorUrl: compKw.url,
          opportunityScore
        });
      } else if (positionDiff < 0) {
        // You rank better
        yourWins.push({
          keyword: compKw.keyword,
          searchVolume: compKw.searchVolume,
          yourPosition: yourKw.position,
          competitorPosition: compKw.position,
          positionDiff: Math.abs(positionDiff)
        });
      }
    } else {
      // Gap: competitor ranks but you don't
      // Only include if competitor has a good position
      if (compKw.position <= 20) {
        const opportunityScore = Math.round(
          compKw.searchVolume * (1 + (20 - compKw.position) / 20)
        );

        gaps.push({
          keyword: compKw.keyword,
          searchVolume: compKw.searchVolume,
          competitorPosition: compKw.position,
          competitorUrl: compKw.url,
          opportunityScore
        });
      }
    }
  }

  // Sort by opportunity score
  threats.sort((a, b) => b.opportunityScore - a.opportunityScore);
  gaps.sort((a, b) => b.opportunityScore - a.opportunityScore);
  yourWins.sort((a, b) => b.searchVolume - a.searchVolume);

  return {
    competitor: competitorName,
    competitorDomain,
    threats: threats.slice(0, 10),
    gaps: gaps.slice(0, 10),
    yourWins: yourWins.slice(0, 5),
    summary: {
      totalOverlap: threats.length + yourWins.length,
      threatsCount: threats.length,
      gapsCount: gaps.length,
      winsCount: yourWins.length,
      threatVolume: threats.reduce((sum, t) => sum + t.searchVolume, 0),
      gapVolume: gaps.reduce((sum, g) => sum + g.searchVolume, 0)
    }
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
    const { domain, locationCode, languageCode, competitors } = req.body;

    if (!domain || !locationCode || !languageCode) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      return res.status(500).json({ error: 'DataForSEO credentials not configured' });
    }

    const auth = Buffer.from(`${login}:${password}`).toString('base64');

    // Fetch your domain's keywords first
    console.log(`Fetching keywords for ${domain}...`);
    const yourKeywords = await fetchDomainKeywords(domain, locationCode, languageCode, auth, 200);

    if (yourKeywords.length === 0) {
      return res.status(400).json({ error: 'No keywords found for your domain' });
    }

    // Get top 3 competitors to analyze
    const competitorsToAnalyze = (competitors || []).slice(0, 3);
    const results: CompetitorKeywordAnalysis[] = [];

    for (const competitorName of competitorsToAnalyze) {
      const normalizedName = competitorName.toLowerCase().trim();
      const competitorDomain = COMPETITOR_DOMAINS[normalizedName];

      if (!competitorDomain) {
        console.log(`No domain mapping for competitor: ${competitorName}`);
        continue;
      }

      console.log(`Fetching keywords for competitor: ${competitorName} (${competitorDomain})...`);
      const competitorKeywords = await fetchDomainKeywords(
        competitorDomain,
        locationCode,
        languageCode,
        auth,
        200
      );

      if (competitorKeywords.length > 0) {
        const analysis = analyzeCompetitorKeywords(
          yourKeywords,
          competitorKeywords,
          competitorName,
          competitorDomain
        );
        results.push(analysis);
      }
    }

    return res.status(200).json({
      yourDomain: domain,
      yourKeywordsCount: yourKeywords.length,
      competitors: results
    });

  } catch (error) {
    console.error('Competitor analysis error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
