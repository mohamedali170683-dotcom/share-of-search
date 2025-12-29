import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================
// INLINE VALIDATION (Vercel doesn't support lib imports well)
// ============================================

interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function validateBrandKeywords(keywords: unknown): ValidationResult<Array<{
  keyword: string;
  searchVolume: number;
  isOwnBrand: boolean;
}>> {
  if (!Array.isArray(keywords)) return { success: false, error: 'Brand keywords must be an array' };
  if (keywords.length === 0) return { success: false, error: 'At least one brand keyword is required' };
  if (keywords.length > 500) return { success: false, error: 'Maximum 500 brand keywords allowed' };
  const validated: Array<{ keyword: string; searchVolume: number; isOwnBrand: boolean }> = [];
  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i];
    if (typeof kw !== 'object' || kw === null) return { success: false, error: `Invalid keyword at index ${i}` };
    if (typeof kw.keyword !== 'string' || kw.keyword.trim().length === 0) return { success: false, error: `Invalid keyword text at index ${i}` };
    if (typeof kw.searchVolume !== 'number' || kw.searchVolume < 0) return { success: false, error: `Invalid search volume at index ${i}` };
    if (typeof kw.isOwnBrand !== 'boolean') return { success: false, error: `Invalid isOwnBrand at index ${i}` };
    validated.push({ keyword: kw.keyword.trim(), searchVolume: Math.floor(kw.searchVolume), isOwnBrand: kw.isOwnBrand });
  }
  return { success: true, data: validated };
}

function validateRankedKeywords(keywords: unknown): ValidationResult<Array<{
  keyword: string;
  searchVolume: number;
  position: number;
  url?: string;
}>> {
  if (!Array.isArray(keywords)) return { success: false, error: 'Ranked keywords must be an array' };
  if (keywords.length === 0) return { success: false, error: 'At least one ranked keyword is required' };
  if (keywords.length > 1000) return { success: false, error: 'Maximum 1000 ranked keywords allowed' };
  const validated: Array<{ keyword: string; searchVolume: number; position: number; url?: string }> = [];
  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i];
    if (typeof kw !== 'object' || kw === null) return { success: false, error: `Invalid keyword at index ${i}` };
    if (typeof kw.keyword !== 'string' || kw.keyword.trim().length === 0) return { success: false, error: `Invalid keyword text at index ${i}` };
    if (typeof kw.searchVolume !== 'number' || kw.searchVolume < 0) return { success: false, error: `Invalid search volume at index ${i}` };
    if (typeof kw.position !== 'number' || kw.position < 1 || kw.position > 100) return { success: false, error: `Invalid position at index ${i}` };
    validated.push({ keyword: kw.keyword.trim(), searchVolume: Math.floor(kw.searchVolume), position: Math.floor(kw.position), url: typeof kw.url === 'string' ? kw.url.trim() : undefined });
  }
  return { success: true, data: validated };
}

function getAllowedOrigin(requestOrigin: string | undefined): string {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development') return '*';
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) return requestOrigin;
  return process.env.PRODUCTION_URL || '*';
}

// ============================================

interface BrandKeyword {
  keyword: string;
  searchVolume: number;
  isOwnBrand: boolean;
}

interface RankedKeyword {
  keyword: string;
  searchVolume: number;
  position: number;
  url?: string;
}

const CTR_CURVE: Record<number, number> = {
  1: 0.28, 2: 0.15, 3: 0.09, 4: 0.06, 5: 0.04,
  6: 0.03, 7: 0.025, 8: 0.02, 9: 0.018, 10: 0.015,
  11: 0.012, 12: 0.01, 13: 0.009, 14: 0.008, 15: 0.007,
  16: 0.006, 17: 0.005, 18: 0.004, 19: 0.003, 20: 0.002
};

function getCTR(position: number): number {
  if (position <= 0) return 0;
  if (position > 20) return 0.001;
  return CTR_CURVE[position] || 0.001;
}

function calculateSOS(brandKeywords: BrandKeyword[]) {
  const brandVolume = brandKeywords
    .filter(k => k.isOwnBrand)
    .reduce((sum, k) => sum + k.searchVolume, 0);

  const totalBrandVolume = brandKeywords
    .reduce((sum, k) => sum + k.searchVolume, 0);

  const shareOfSearch = totalBrandVolume > 0
    ? (brandVolume / totalBrandVolume) * 100
    : 0;

  return {
    shareOfSearch: Math.round(shareOfSearch * 10) / 10,
    brandVolume,
    totalBrandVolume
  };
}

function calculateSOV(rankedKeywords: RankedKeyword[]) {
  const keywordBreakdown = rankedKeywords.map(kw => {
    const ctr = getCTR(kw.position);
    const visibleVolume = kw.searchVolume * ctr;
    return {
      ...kw,
      ctr: Math.round(ctr * 1000) / 10,
      visibleVolume: Math.round(visibleVolume)
    };
  });

  const visibleVolume = keywordBreakdown.reduce((sum, k) => sum + (k.visibleVolume || 0), 0);
  const totalMarketVolume = rankedKeywords.reduce((sum, k) => sum + k.searchVolume, 0);

  const shareOfVoice = totalMarketVolume > 0
    ? (visibleVolume / totalMarketVolume) * 100
    : 0;

  return {
    shareOfVoice: Math.round(shareOfVoice * 10) / 10,
    visibleVolume: Math.round(visibleVolume),
    totalMarketVolume,
    keywordBreakdown
  };
}

function calculateGrowthGap(sos: number, sov: number) {
  const gap = sov - sos;
  let interpretation: string;

  if (gap > 2) interpretation = 'growth_potential';
  else if (gap < -2) interpretation = 'missing_opportunities';
  else interpretation = 'balanced';

  return { gap: Math.round(gap * 10) / 10, interpretation };
}

export default function handler(req: VercelRequest, res: VercelResponse) {
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
    const brandResult = validateBrandKeywords(req.body?.brandKeywords);
    if (!brandResult.success) {
      return res.status(400).json({ error: brandResult.error });
    }

    const rankedResult = validateRankedKeywords(req.body?.rankedKeywords);
    if (!rankedResult.success) {
      return res.status(400).json({ error: rankedResult.error });
    }

    const brandKeywords = brandResult.data!;
    const rankedKeywords = rankedResult.data!;

    const sosResult = calculateSOS(brandKeywords);
    const sovResult = calculateSOV(rankedKeywords);
    const gapResult = calculateGrowthGap(sosResult.shareOfSearch, sovResult.shareOfVoice);

    return res.status(200).json({
      sos: sosResult,
      sov: sovResult,
      gap: gapResult
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
