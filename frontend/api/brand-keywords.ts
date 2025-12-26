import type { VercelRequest, VercelResponse } from '@vercel/node';

interface KeywordVolumeResult {
  keyword: string;
  search_volume: number;
}

// Common competitor brands by industry
const INDUSTRY_COMPETITORS: Record<string, string[]> = {
  // Sportswear & Athletic brands
  sportswear: ['nike', 'adidas', 'puma', 'reebok', 'under armour', 'new balance', 'asics', 'fila', 'converse', 'vans', 'jordan', 'skechers'],

  // Fashion & Luxury
  fashion: ['zara', 'h&m', 'uniqlo', 'gap', 'primark', 'mango', 'asos', 'shein', 'forever 21', 'pull&bear'],
  luxury: ['gucci', 'louis vuitton', 'chanel', 'prada', 'hermes', 'dior', 'burberry', 'versace', 'armani', 'balenciaga'],

  // Natural cosmetics brands
  cosmetics: ['weleda', 'dr hauschka', 'annemarie börlind', 'alverde', 'lavera', 'sante', 'logona', 'primavera', 'korres', 'origins'],
  beauty: ['loreal', 'maybelline', 'mac', 'nyx', 'revlon', 'clinique', 'estee lauder', 'lancome', 'bobbi brown', 'urban decay'],

  // Technology
  tech: ['apple', 'samsung', 'google', 'microsoft', 'sony', 'lg', 'huawei', 'xiaomi', 'oneplus', 'lenovo'],

  // Automotive
  automotive: ['volkswagen', 'bmw', 'mercedes', 'audi', 'toyota', 'honda', 'ford', 'tesla', 'porsche', 'hyundai'],

  // Food & Beverage
  food: ['nestle', 'kraft', 'unilever', 'danone', 'kelloggs', 'pepsico', 'coca cola', 'mondelez', 'mars', 'ferrero'],

  // Retail
  retail: ['amazon', 'walmart', 'target', 'costco', 'ikea', 'home depot', 'best buy', 'ebay', 'aliexpress', 'otto'],

  // Airlines
  airlines: ['lufthansa', 'ryanair', 'easyjet', 'british airways', 'air france', 'emirates', 'qatar airways', 'turkish airlines', 'klm', 'swiss'],

  // Hotels
  hotels: ['marriott', 'hilton', 'ihg', 'accor', 'hyatt', 'wyndham', 'radisson', 'best western', 'four seasons', 'ritz carlton'],

  // Streaming
  streaming: ['netflix', 'disney plus', 'amazon prime', 'hbo max', 'hulu', 'apple tv', 'paramount plus', 'peacock', 'youtube', 'spotify'],

  // Banking
  banking: ['deutsche bank', 'commerzbank', 'sparkasse', 'ing', 'n26', 'revolut', 'hsbc', 'barclays', 'santander', 'bnp paribas'],
};

// Brand to industry mapping for detection
const BRAND_INDUSTRY_MAP: Record<string, string> = {
  // Sportswear
  'nike': 'sportswear', 'adidas': 'sportswear', 'puma': 'sportswear', 'reebok': 'sportswear',
  'under armour': 'sportswear', 'new balance': 'sportswear', 'asics': 'sportswear', 'fila': 'sportswear',
  'converse': 'sportswear', 'vans': 'sportswear', 'jordan': 'sportswear', 'skechers': 'sportswear',

  // Fashion
  'zara': 'fashion', 'h&m': 'fashion', 'uniqlo': 'fashion', 'gap': 'fashion', 'mango': 'fashion',
  'asos': 'fashion', 'shein': 'fashion', 'primark': 'fashion',

  // Luxury
  'gucci': 'luxury', 'louis vuitton': 'luxury', 'chanel': 'luxury', 'prada': 'luxury', 'hermes': 'luxury',
  'dior': 'luxury', 'burberry': 'luxury', 'versace': 'luxury', 'armani': 'luxury', 'balenciaga': 'luxury',

  // Cosmetics
  'lavera': 'cosmetics', 'weleda': 'cosmetics', 'hauschka': 'cosmetics', 'alverde': 'cosmetics',
  'sante': 'cosmetics', 'logona': 'cosmetics', 'primavera': 'cosmetics', 'börlind': 'cosmetics',

  // Beauty
  'loreal': 'beauty', 'maybelline': 'beauty', 'mac': 'beauty', 'nyx': 'beauty', 'revlon': 'beauty',

  // Tech
  'apple': 'tech', 'samsung': 'tech', 'google': 'tech', 'microsoft': 'tech', 'sony': 'tech',
  'huawei': 'tech', 'xiaomi': 'tech', 'oneplus': 'tech', 'lenovo': 'tech',

  // Automotive
  'volkswagen': 'automotive', 'vw': 'automotive', 'bmw': 'automotive', 'mercedes': 'automotive',
  'audi': 'automotive', 'toyota': 'automotive', 'honda': 'automotive', 'ford': 'automotive',
  'tesla': 'automotive', 'porsche': 'automotive', 'hyundai': 'automotive',

  // Retail
  'amazon': 'retail', 'walmart': 'retail', 'target': 'retail', 'ikea': 'retail', 'otto': 'retail',

  // Streaming
  'netflix': 'streaming', 'disney': 'streaming', 'hulu': 'streaming', 'spotify': 'streaming',

  // Airlines
  'lufthansa': 'airlines', 'ryanair': 'airlines', 'easyjet': 'airlines', 'emirates': 'airlines',

  // Hotels
  'marriott': 'hotels', 'hilton': 'hotels', 'hyatt': 'hotels', 'accor': 'hotels',

  // Banking
  'deutsche bank': 'banking', 'commerzbank': 'banking', 'n26': 'banking', 'revolut': 'banking',
};

// Detect industry based on domain or brand
function detectIndustry(brandName: string): string {
  const brandLower = brandName.toLowerCase();

  // Check direct mapping
  for (const [brand, industry] of Object.entries(BRAND_INDUSTRY_MAP)) {
    if (brandLower.includes(brand) || brand.includes(brandLower)) {
      return industry;
    }
  }

  return 'default';
}

// Extract brand name from domain
function extractBrandFromDomain(domain: string): string {
  // Remove common TLDs and www
  let brand = domain
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .replace(/\.(com|de|co\.uk|fr|es|it|net|org|io|eu|at|ch|nl|be|pl).*$/, '')
    .toLowerCase();

  // Handle hyphenated domains
  brand = brand.replace(/-/g, ' ').trim();

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
    const industry = detectIndustry(brandName);

    // Get competitors - use custom if provided, otherwise use industry defaults
    let competitors: string[] = customCompetitors || INDUSTRY_COMPETITORS[industry] || [];

    // Make sure the brand itself is included
    if (!competitors.some(c => c.toLowerCase() === brandName.toLowerCase())) {
      competitors = [brandName, ...competitors];
    }

    // Filter out the brand from competitors list for separation
    const competitorBrands = competitors.filter(c => c.toLowerCase() !== brandName.toLowerCase());

    // Build keywords list: brand + brand variations + competitors + their variations
    const keywordsToFetch = [
      brandName,
      `${brandName} online`,
      `${brandName} shop`,
      `${brandName} store`,
      ...competitorBrands,
      ...competitorBrands.slice(0, 5).map(c => `${c} shop`) // Add shop variations for top competitors
    ];

    // Remove duplicates
    const uniqueKeywords = [...new Set(keywordsToFetch.map(k => k.toLowerCase()))];

    // Fetch search volumes from DataForSEO
    const response = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        keywords: uniqueKeywords,
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
      const isOwnBrand = keyword.includes(brandName.toLowerCase());

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
