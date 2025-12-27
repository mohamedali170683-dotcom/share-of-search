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

// Project/Analysis type for saved analyses
export interface Project {
  id: string;
  domain: string;
  brandName: string;
  createdAt: string;
  locationCode: number;
  locationName: string;
  languageCode: string;
  competitors: string[];
  sos: SOSResult;
  sov: SOVResult;
  gap: GrowthGapResult;
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

// ==========================================
// ACTIONABLE INSIGHTS TYPES
// ==========================================

// Quick Win Opportunity - Position 4-20 keywords with improvement potential
export interface QuickWinOpportunity {
  keyword: string;
  currentPosition: number;
  targetPosition: number;
  searchVolume: number;
  currentClicks: number;
  potentialClicks: number;
  clickUplift: number;
  upliftPercentage: number;
  effort: 'low' | 'medium' | 'high';
  url: string;
  category?: string;
}

// Category SOV Breakdown
export interface CategorySOV {
  category: string;
  yourSOV: number;
  yourVisibleVolume: number;
  totalCategoryVolume: number;
  keywordCount: number;
  avgPosition: number;
  topKeywords: string[];
  status: 'leading' | 'competitive' | 'trailing' | 'weak';
}

// Competitor Analysis for a category
export interface CompetitorCategoryAnalysis {
  competitor: string;
  category: string;
  estimatedSOV: number;
  keywordsWon: number;
  keywordsLost: number;
}

// Head-to-head keyword battle
export interface KeywordBattle {
  keyword: string;
  searchVolume: number;
  yourPosition: number | null;
  competitorPosition: number;
  winner: 'you' | 'competitor' | 'tie';
  visibilityDifference: number;
}

// Competitor Strength Data
export interface CompetitorStrength {
  competitor: string;
  estimatedSOV: number;
  keywordsAnalyzed: number;
  headToHead: {
    youWin: number;
    theyWin: number;
    ties: number;
  };
  dominantCategories: string[];
  topWinningKeywords: KeywordBattle[];
  topLosingKeywords: KeywordBattle[];
}

// Prioritized Action Item
export interface ActionItem {
  id: string;
  actionType: 'optimize' | 'create' | 'monitor' | 'investigate';
  priority: number; // 1-100
  title: string;
  description: string;
  keyword?: string;
  category?: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  estimatedUplift: number;
  reasoning: string;
}

// Full Actionable Insights Data
export interface ActionableInsights {
  quickWins: QuickWinOpportunity[];
  categoryBreakdown: CategorySOV[];
  competitorStrengths: CompetitorStrength[];
  actionList: ActionItem[];
  summary: {
    totalQuickWinPotential: number;
    strongCategories: number;
    weakCategories: number;
    topPriorityAction: string;
  };
}
