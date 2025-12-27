import type { VercelRequest, VercelResponse } from '@vercel/node';

interface MonthlySearch {
  year: number;
  month: number;
  search_volume: number;
}

interface KeywordVolumeResult {
  keyword: string;
  search_volume: number;
  monthly_searches: MonthlySearch[];
}

interface RankedKeywordItem {
  keyword_data: {
    keyword: string;
    keyword_info: {
      search_volume: number;
      monthly_searches: MonthlySearch[];
    };
  };
  ranked_serp_element: {
    serp_item: {
      rank_group: number;
    };
  };
}

// CTR curve for positions 1-20
const CTR_CURVE: Record<number, number> = {
  1: 28.0, 2: 15.0, 3: 11.0, 4: 8.0, 5: 7.0,
  6: 5.0, 7: 4.0, 8: 3.5, 9: 3.0, 10: 2.5,
  11: 2.0, 12: 1.8, 13: 1.5, 14: 1.3, 15: 1.0,
  16: 0.8, 17: 0.6, 18: 0.5, 19: 0.3, 20: 0.2
};

// Get volume for a specific period (months ago from now)
function getVolumeForPeriod(monthlySearches: MonthlySearch[], monthsAgo: number): number {
  if (!monthlySearches || monthlySearches.length === 0) return 0;

  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth() + 1; // 1-indexed

  // Find the closest month
  const match = monthlySearches.find(m => m.year === targetYear && m.month === targetMonth);
  if (match) return match.search_volume;

  // If exact match not found, return average of nearby months
  const sorted = [...monthlySearches].sort((a, b) => {
    const aDate = new Date(a.year, a.month - 1);
    const bDate = new Date(b.year, b.month - 1);
    return Math.abs(aDate.getTime() - targetDate.getTime()) - Math.abs(bDate.getTime() - targetDate.getTime());
  });

  return sorted[0]?.search_volume || 0;
}

// Common competitor brands by industry (must match brand-keywords.ts)
const INDUSTRY_COMPETITORS: Record<string, string[]> = {
  // Tires / Wheels
  tires: ['continental', 'michelin', 'goodyear', 'bridgestone', 'pirelli', 'dunlop', 'hankook', 'yokohama', 'firestone', 'falken', 'nokian', 'kumho', 'toyo'],

  // Sportswear
  sportswear: ['nike', 'adidas', 'puma', 'reebok', 'under armour', 'new balance', 'asics', 'fila', 'converse', 'vans'],

  // Fashion
  fashion: ['zara', 'h&m', 'uniqlo', 'gap', 'mango', 'asos', 'shein', 'primark'],

  // Cosmetics
  cosmetics: ['weleda', 'dr hauschka', 'alverde', 'lavera', 'sante', 'logona', 'primavera'],
  beauty: ['loreal', 'maybelline', 'mac', 'nyx', 'revlon', 'clinique', 'estee lauder'],

  // Tech
  tech: ['apple', 'samsung', 'google', 'microsoft', 'sony', 'huawei', 'xiaomi'],

  // Automotive
  automotive: ['volkswagen', 'bmw', 'mercedes', 'audi', 'toyota', 'honda', 'ford', 'tesla'],
};

const BRAND_INDUSTRY_MAP: Record<string, string> = {
  // Tires
  'continental': 'tires', 'michelin': 'tires', 'goodyear': 'tires', 'bridgestone': 'tires',
  'pirelli': 'tires', 'dunlop': 'tires', 'hankook': 'tires', 'yokohama': 'tires',
  'firestone': 'tires', 'falken': 'tires', 'nokian': 'tires', 'kumho': 'tires', 'toyo': 'tires',

  // Sportswear
  'nike': 'sportswear', 'adidas': 'sportswear', 'puma': 'sportswear', 'reebok': 'sportswear',
  'under armour': 'sportswear', 'new balance': 'sportswear', 'asics': 'sportswear',

  // Fashion
  'zara': 'fashion', 'h&m': 'fashion', 'uniqlo': 'fashion', 'gap': 'fashion',

  // Cosmetics
  'lavera': 'cosmetics', 'weleda': 'cosmetics', 'alverde': 'cosmetics',
  'loreal': 'beauty', 'maybelline': 'beauty',

  // Tech
  'apple': 'tech', 'samsung': 'tech', 'google': 'tech', 'microsoft': 'tech',

  // Automotive
  'volkswagen': 'automotive', 'bmw': 'automotive', 'mercedes': 'automotive', 'audi': 'automotive',
};

function extractBrandFromDomain(domain: string): string {
  return domain
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .replace(/\.(com|de|co\.uk|fr|es|it|net|org|io|eu).*$/, '')
    .toLowerCase()
    .replace(/-/g, ' ')
    .trim();
}

function detectIndustry(brandName: string): string {
  for (const [brand, industry] of Object.entries(BRAND_INDUSTRY_MAP)) {
    if (brandName.includes(brand) || brand.includes(brandName)) {
      return industry;
    }
  }
  return 'default';
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
    const { domain, locationCode, languageCode, customCompetitors } = req.body;

    // Use environment variables for API credentials
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      return res.status(500).json({ error: 'DataForSEO credentials not configured on server' });
    }

    const auth = Buffer.from(`${login}:${password}`).toString('base64');
    const brandName = extractBrandFromDomain(domain);
    const industry = detectIndustry(brandName);

    // Use custom competitors if provided, otherwise use industry defaults
    const competitors = customCompetitors && customCompetitors.length > 0
      ? customCompetitors
      : (INDUSTRY_COMPETITORS[industry] || []);

    // Fetch brand keywords with monthly data
    const brandKeywordsToFetch = [
      brandName,
      ...competitors.filter(c => c !== brandName)
    ];

    const [brandResponse, rankedResponse] = await Promise.all([
      // Fetch brand search volumes with history
      fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          keywords: brandKeywordsToFetch,
          location_code: locationCode,
          language_code: languageCode,
          include_serp_info: false,
          include_adult_keywords: false
        }])
      }),
      // Fetch ranked keywords with history
      fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live', {
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
          limit: 100,
          filters: [
            ['keyword_data.keyword_info.search_volume', '>', 0],
            'and',
            ['ranked_serp_element.serp_item.rank_group', '<=', 20]
          ],
          order_by: ['keyword_data.keyword_info.search_volume,desc']
        }])
      })
    ]);

    const brandData = await brandResponse.json();
    const rankedData = await rankedResponse.json();

    const brandItems: KeywordVolumeResult[] = brandData.tasks?.[0]?.result || [];
    const rankedItems: RankedKeywordItem[] = rankedData.tasks?.[0]?.result?.[0]?.items || [];

    // Calculate SOS for different periods
    const periods = [
      { label: 'Now', monthsAgo: 0 },
      { label: '6 Months Ago', monthsAgo: 6 },
      { label: '12 Months Ago', monthsAgo: 12 }
    ];

    const sosTrends = periods.map(period => {
      let brandVolume = 0;
      let totalVolume = 0;

      for (const item of brandItems) {
        const volume = period.monthsAgo === 0
          ? item.search_volume
          : getVolumeForPeriod(item.monthly_searches, period.monthsAgo);

        if (item.keyword.toLowerCase().includes(brandName)) {
          brandVolume += volume;
        }
        totalVolume += volume;
      }

      const sos = totalVolume > 0 ? Math.round((brandVolume / totalVolume) * 100 * 10) / 10 : 0;

      return {
        period: period.label,
        monthsAgo: period.monthsAgo,
        sos,
        brandVolume,
        totalVolume
      };
    });

    // Calculate SOV for different periods and track keyword impacts
    interface KeywordImpact {
      keyword: string;
      position: number;
      volumeNow: number;
      volume12MonthsAgo: number;
      visibleVolumeNow: number;
      visibleVolume12MonthsAgo: number;
      impactChange: number;
    }

    const keywordImpacts: KeywordImpact[] = [];

    const sovTrends = periods.map(period => {
      let visibleVolume = 0;
      let totalMarketVolume = 0;

      for (const item of rankedItems) {
        const volume = period.monthsAgo === 0
          ? item.keyword_data.keyword_info.search_volume
          : getVolumeForPeriod(item.keyword_data.keyword_info.monthly_searches, period.monthsAgo);

        const position = item.ranked_serp_element.serp_item.rank_group;
        const ctr = CTR_CURVE[position] || 0;
        const visibleVol = volume * (ctr / 100);

        visibleVolume += visibleVol;
        totalMarketVolume += volume;

        // Track keyword impact for comparison (only on first iteration)
        if (period.monthsAgo === 0) {
          const volume12MonthsAgo = getVolumeForPeriod(item.keyword_data.keyword_info.monthly_searches, 12);
          const visibleVol12MonthsAgo = volume12MonthsAgo * (ctr / 100);

          keywordImpacts.push({
            keyword: item.keyword_data.keyword,
            position,
            volumeNow: volume,
            volume12MonthsAgo,
            visibleVolumeNow: visibleVol,
            visibleVolume12MonthsAgo: visibleVol12MonthsAgo,
            impactChange: visibleVol - visibleVol12MonthsAgo
          });
        }
      }

      const sov = totalMarketVolume > 0 ? Math.round((visibleVolume / totalMarketVolume) * 100 * 10) / 10 : 0;

      return {
        period: period.label,
        monthsAgo: period.monthsAgo,
        sov,
        visibleVolume: Math.round(visibleVolume),
        totalMarketVolume
      };
    });

    // Classify keywords as branded or generic
    const isBrandedKeyword = (keyword: string) => {
      const kw = keyword.toLowerCase();
      // Check if keyword contains the brand name or any competitor name
      const allBrands = [brandName, ...competitors];
      return allBrands.some(brand => kw.includes(brand.toLowerCase()));
    };

    // Sort impacts and split by branded/generic
    const brandedImpacts = keywordImpacts.filter(k => isBrandedKeyword(k.keyword));
    const genericImpacts = keywordImpacts.filter(k => !isBrandedKeyword(k.keyword));

    const sortedBrandedImpacts = [...brandedImpacts].sort((a, b) => b.impactChange - a.impactChange);
    const sortedGenericImpacts = [...genericImpacts].sort((a, b) => b.impactChange - a.impactChange);

    const brandedGainers = sortedBrandedImpacts.filter(k => k.impactChange > 0).slice(0, 3);
    const brandedLosers = sortedBrandedImpacts.filter(k => k.impactChange < 0).slice(-3).reverse();
    const genericGainers = sortedGenericImpacts.filter(k => k.impactChange > 0).slice(0, 3);
    const genericLosers = sortedGenericImpacts.filter(k => k.impactChange < 0).slice(-3).reverse();

    // Calculate competitor SOS trends
    const competitorTrends = competitors
      .filter(c => c !== brandName)
      .slice(0, 3)
      .map(competitorName => {
        const trends = periods.map(period => {
          let competitorVolume = 0;
          let totalVolume = 0;

          for (const item of brandItems) {
            const volume = period.monthsAgo === 0
              ? item.search_volume
              : getVolumeForPeriod(item.monthly_searches, period.monthsAgo);

            if (item.keyword.toLowerCase().includes(competitorName.toLowerCase())) {
              competitorVolume += volume;
            }
            totalVolume += volume;
          }

          const sos = totalVolume > 0 ? Math.round((competitorVolume / totalVolume) * 100 * 10) / 10 : 0;
          return { period: period.label, monthsAgo: period.monthsAgo, sos };
        });

        return {
          name: competitorName.charAt(0).toUpperCase() + competitorName.slice(1),
          trends
        };
      });

    // Calculate changes
    const sosChange6m = sosTrends[0].sos - sosTrends[1].sos;
    const sosChange12m = sosTrends[0].sos - sosTrends[2].sos;
    const sovChange6m = sovTrends[0].sov - sovTrends[1].sov;
    const sovChange12m = sovTrends[0].sov - sovTrends[2].sov;

    const mapKeywordImpact = (k: KeywordImpact) => ({
      keyword: k.keyword,
      position: k.position,
      volumeChange: Math.round(k.volumeNow - k.volume12MonthsAgo),
      impactChange: Math.round(k.impactChange)
    });

    return res.status(200).json({
      brandName,
      sosTrends,
      sovTrends,
      competitorTrends,
      changes: {
        sos: {
          vs6MonthsAgo: Math.round(sosChange6m * 10) / 10,
          vs12MonthsAgo: Math.round(sosChange12m * 10) / 10
        },
        sov: {
          vs6MonthsAgo: Math.round(sovChange6m * 10) / 10,
          vs12MonthsAgo: Math.round(sovChange12m * 10) / 10
        }
      },
      keywordImpact: {
        branded: {
          gainers: brandedGainers.map(mapKeywordImpact),
          losers: brandedLosers.map(mapKeywordImpact)
        },
        generic: {
          gainers: genericGainers.map(mapKeywordImpact),
          losers: genericLosers.map(mapKeywordImpact)
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
