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

export interface SearchVolumeRequest {
  keywords: string[];
  locationCode: number;
  languageCode: string;
  login: string;
  password: string;
}

export interface RankedKeywordsRequest {
  domain: string;
  locationCode: number;
  languageCode: string;
  limit?: number;
  login: string;
  password: string;
}

export interface CalculateRequest {
  brandKeywords: BrandKeyword[];
  rankedKeywords: RankedKeyword[];
}
