export interface BrandKeyword {
  keyword: string;
  searchVolume: number;
  isOwnBrand: boolean;
}

export interface RankedKeyword {
  keyword: string;
  searchVolume: number;
  position: number;
  url?: string;
  ctr?: number;
  visibleVolume?: number;
  category?: string; // Category from DataForSEO API
  categoryIds?: number[]; // Raw category IDs from DataForSEO
}

export interface SOSResult {
  shareOfSearch: number;
  brandVolume: number;
  totalBrandVolume: number;
}

export interface SOVResult {
  shareOfVoice: number;
  visibleVolume: number;
  totalMarketVolume: number;
  keywordBreakdown: RankedKeyword[];
}

export interface GrowthGapResult {
  gap: number;
  interpretation: 'growth_potential' | 'missing_opportunities' | 'balanced';
}

export interface CalculateResponse {
  sos: SOSResult;
  sov: SOVResult;
  gap: GrowthGapResult;
}

export interface SampleDataResponse {
  brandKeywords: BrandKeyword[];
  rankedKeywords: RankedKeyword[];
}

export const LOCATIONS: Record<string, { code: number; name: string }> = {
  germany: { code: 2276, name: 'Germany' },
  usa: { code: 2840, name: 'United States' },
  uk: { code: 2826, name: 'United Kingdom' },
  france: { code: 2250, name: 'France' },
  spain: { code: 2724, name: 'Spain' }
};
