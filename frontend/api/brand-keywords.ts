import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================
// INLINE VALIDATION (Vercel doesn't support lib imports well)
// ============================================

interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

const VALID_LOCATION_CODES = new Set([
  2276, 2840, 2826, 2250, 2724, 2380, 2528, 2056, 2040, 2756, 2616, 2752, 2578, 2208, 2246
]);

const VALID_LANGUAGE_CODES = new Set([
  'de', 'en', 'fr', 'es', 'it', 'nl', 'pl', 'sv', 'no', 'da', 'fi', 'pt'
]);

function validateDomain(domain: unknown): ValidationResult<string> {
  if (typeof domain !== 'string') return { success: false, error: 'Domain must be a string' };
  const cleaned = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '').trim();
  if (!cleaned) return { success: false, error: 'Domain is required' };
  if (cleaned.length > 253) return { success: false, error: 'Domain is too long' };
  if (!DOMAIN_REGEX.test(cleaned)) return { success: false, error: 'Invalid domain format' };
  return { success: true, data: cleaned };
}

function validateLocationCode(code: unknown): ValidationResult<number> {
  if (typeof code !== 'number' || !Number.isInteger(code)) return { success: false, error: 'Location code must be an integer' };
  if (!VALID_LOCATION_CODES.has(code)) return { success: false, error: `Invalid location code: ${code}` };
  return { success: true, data: code };
}

function validateLanguageCode(code: unknown): ValidationResult<string> {
  if (typeof code !== 'string') return { success: false, error: 'Language code must be a string' };
  const cleaned = code.toLowerCase().trim();
  if (!VALID_LANGUAGE_CODES.has(cleaned)) return { success: false, error: `Invalid language code: ${code}` };
  return { success: true, data: cleaned };
}

function validateCompetitors(competitors: unknown): ValidationResult<string[] | undefined> {
  if (competitors === undefined || competitors === null) return { success: true, data: undefined };
  if (!Array.isArray(competitors)) return { success: false, error: 'Competitors must be an array' };
  if (competitors.length > 20) return { success: false, error: 'Maximum 20 custom competitors allowed' };
  const cleaned: string[] = [];
  for (const comp of competitors) {
    if (typeof comp !== 'string') return { success: false, error: 'Each competitor must be a string' };
    const trimmed = comp.trim().toLowerCase();
    if (trimmed.length > 0 && trimmed.length <= 100) cleaned.push(trimmed);
  }
  return { success: true, data: cleaned.length > 0 ? cleaned : undefined };
}

function getAllowedOrigin(requestOrigin: string | undefined): string {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development') return '*';
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) return requestOrigin;
  return process.env.PRODUCTION_URL || '*';
}

// ============================================

interface KeywordVolumeResult {
  keyword: string;
  search_volume: number;
}

// Common competitor brands by industry
const INDUSTRY_COMPETITORS: Record<string, string[]> = {
  // Tires / Wheels
  tires: ['continental', 'michelin', 'goodyear', 'bridgestone', 'pirelli', 'dunlop', 'hankook', 'yokohama', 'firestone', 'falken', 'nokian', 'kumho', 'toyo', 'bf goodrich', 'cooper tires'],

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

  // Automotive (car manufacturers)
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
  // Tires / Wheels
  'continental': 'tires', 'michelin': 'tires', 'goodyear': 'tires', 'bridgestone': 'tires',
  'pirelli': 'tires', 'dunlop': 'tires', 'hankook': 'tires', 'yokohama': 'tires',
  'firestone': 'tires', 'falken': 'tires', 'nokian': 'tires', 'kumho': 'tires',
  'toyo': 'tires', 'bf goodrich': 'tires', 'cooper': 'tires', 'vredestein': 'tires',
  'semperit': 'tires', 'uniroyal': 'tires', 'barum': 'tires', 'nexen': 'tires',

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
  // Set CORS headers - restrict in production
  const origin = getAllowedOrigin(req.headers.origin);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate input parameters
    const domainResult = validateDomain(req.body?.domain);
    if (!domainResult.success) {
      return res.status(400).json({ error: domainResult.error });
    }

    const locationResult = validateLocationCode(req.body?.locationCode);
    if (!locationResult.success) {
      return res.status(400).json({ error: locationResult.error });
    }

    const languageResult = validateLanguageCode(req.body?.languageCode);
    if (!languageResult.success) {
      return res.status(400).json({ error: languageResult.error });
    }

    const competitorsResult = validateCompetitors(req.body?.customCompetitors);
    if (!competitorsResult.success) {
      return res.status(400).json({ error: competitorsResult.error });
    }

    const domain = domainResult.data!;
    const locationCode = locationResult.data!;
    const languageCode = languageResult.data!;
    const customCompetitors = competitorsResult.data;

    // Use environment variables for API credentials
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      return res.status(500).json({ error: 'DataForSEO credentials not configured on server' });
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
