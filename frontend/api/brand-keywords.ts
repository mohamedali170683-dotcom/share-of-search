import type { VercelRequest, VercelResponse } from '@vercel/node';

interface KeywordVolumeResult {
  keyword: string;
  search_volume: number;
}

// Common competitor brands by industry (can be expanded)
const INDUSTRY_COMPETITORS: Record<string, string[]> = {
  // Natural cosmetics brands
  cosmetics: ['weleda', 'dr hauschka', 'annemarie börlind', 'alverde', 'lavera', 'sante', 'logona', 'primavera'],
  // Add more industries as needed
};

// Detect industry based on domain or brand
function detectIndustry(domain: string): string {
  const cosmeticsBrands = ['lavera', 'weleda', 'hauschka', 'alverde', 'sante', 'logona', 'primavera', 'börlind'];
  const domainLower = domain.toLowerCase();

  for (const brand of cosmeticsBrands) {
    if (domainLower.includes(brand)) {
      return 'cosmetics';
    }
  }

  return 'default';
}

// Extract brand name from domain
function extractBrandFromDomain(domain: string): string {
  // Remove common TLDs and www
  let brand = domain
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .replace(/\.(com|de|co\.uk|fr|es|it|net|org|io).*$/, '')
    .toLowerCase();

  // Handle hyphenated domains
  brand = brand.replace(/-/g, ' ');

  return brand;
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
    const { domain, locationCode, languageCode, login, password, customCompetitors } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'DataForSEO credentials required' });
    }

    const auth = Buffer.from(`${login}:${password}`).toString('base64');
    const brandName = extractBrandFromDomain(domain);
    const industry = detectIndustry(domain);

    // Get competitors - use custom if provided, otherwise use industry defaults
    let competitors: string[] = customCompetitors || INDUSTRY_COMPETITORS[industry] || [];

    // Make sure the brand itself is included
    if (!competitors.includes(brandName)) {
      competitors = [brandName, ...competitors];
    }

    // Filter out the brand from competitors list for separation
    const competitorBrands = competitors.filter(c => c !== brandName);

    // Build keywords list: brand + brand variations + competitors
    const keywordsToFetch = [
      brandName,
      `${brandName} naturkosmetik`,
      `${brandName} kosmetik`,
      `${brandName} produkte`,
      ...competitorBrands
    ];

    // Fetch search volumes from DataForSEO
    const response = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        keywords: keywordsToFetch,
        location_code: locationCode,
        language_code: languageCode
      }])
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.status_message || 'DataForSEO API error');
    }

    const items: KeywordVolumeResult[] = data.tasks?.[0]?.result || [];

    // Build brand keywords list
    const brandKeywords = items.map((item: KeywordVolumeResult) => {
      const keyword = item.keyword.toLowerCase();
      const isOwnBrand = keyword.includes(brandName);

      return {
        keyword: item.keyword,
        searchVolume: item.search_volume || 0,
        isOwnBrand
      };
    }).filter((kw: { searchVolume: number }) => kw.searchVolume > 0);

    // Sort by search volume
    brandKeywords.sort((a: { searchVolume: number }, b: { searchVolume: number }) => b.searchVolume - a.searchVolume);

    return res.status(200).json({
      brandName,
      industry,
      brandKeywords,
      competitors: competitorBrands
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
