import type { BrandKeyword, RankedKeyword, SOSResult, SOVResult, GrowthGapResult } from '../types';

// CTR curve based on SERP position
const CTR_CURVE: Record<number, number> = {
  1: 0.28,
  2: 0.15,
  3: 0.09,
  4: 0.06,
  5: 0.04,
  6: 0.03,
  7: 0.025,
  8: 0.02,
  9: 0.018,
  10: 0.015,
  11: 0.012,
  12: 0.01,
  13: 0.009,
  14: 0.008,
  15: 0.007,
  16: 0.006,
  17: 0.005,
  18: 0.004,
  19: 0.003,
  20: 0.002
};

export function getCTR(position: number): number {
  if (position <= 0) return 0;
  if (position > 20) return 0.001;
  return CTR_CURVE[position] || 0.001;
}

// Calculate Share of Search
export function calculateSOS(brandKeywords: BrandKeyword[]): SOSResult {
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

// Calculate Share of Voice
export function calculateSOV(rankedKeywords: RankedKeyword[]): SOVResult {
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

// Calculate Growth Gap
export function calculateGrowthGap(sos: number, sov: number): GrowthGapResult {
  const gap = sov - sos;
  let interpretation: 'growth_potential' | 'missing_opportunities' | 'balanced';

  if (gap > 2) interpretation = 'growth_potential';
  else if (gap < -2) interpretation = 'missing_opportunities';
  else interpretation = 'balanced';

  return { gap: Math.round(gap * 10) / 10, interpretation };
}

// Sample test data
export const SAMPLE_BRAND_KEYWORDS: BrandKeyword[] = [
  { keyword: 'lavera', searchVolume: 12100, isOwnBrand: true },
  { keyword: 'lavera naturkosmetik', searchVolume: 1300, isOwnBrand: true },
  { keyword: 'lavera lippenstift', searchVolume: 480, isOwnBrand: true },
  { keyword: 'weleda', searchVolume: 18100, isOwnBrand: false },
  { keyword: 'dr hauschka', searchVolume: 14800, isOwnBrand: false },
  { keyword: 'annemarie börlind', searchVolume: 5400, isOwnBrand: false },
  { keyword: 'alverde', searchVolume: 27100, isOwnBrand: false },
];

export const SAMPLE_RANKED_KEYWORDS: RankedKeyword[] = [
  { keyword: 'naturkosmetik', searchVolume: 22200, position: 4, url: '/naturkosmetik' },
  { keyword: 'bio gesichtscreme', searchVolume: 3600, position: 2, url: '/gesichtspflege' },
  { keyword: 'vegane kosmetik', searchVolume: 4400, position: 3, url: '/vegan' },
  { keyword: 'natürliche hautpflege', searchVolume: 2900, position: 1, url: '/hautpflege' },
  { keyword: 'bio lippenstift', searchVolume: 1900, position: 5, url: '/lippen' },
  { keyword: 'naturkosmetik gesicht', searchVolume: 2400, position: 6, url: '/gesicht' },
  { keyword: 'bio shampoo', searchVolume: 5400, position: 8, url: '/haarpflege' },
  { keyword: 'naturkosmetik marken', searchVolume: 1600, position: 2, url: '/marken' },
  { keyword: 'zertifizierte naturkosmetik', searchVolume: 880, position: 1, url: '/zertifiziert' },
  { keyword: 'bio bodylotion', searchVolume: 1300, position: 7, url: '/koerperpflege' },
];
