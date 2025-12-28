export interface BrandKeyword {
  keyword: string;
  searchVolume: number;
  isOwnBrand: boolean;
  isDiscarded?: boolean; // User can discard keywords from calculations
}

// Brand Context - Understanding the brand's industry and vertical
export interface BrandContext {
  brandName: string;
  industry: string;
  vertical: string;
  productCategories: string[];
  targetAudience: string;
  competitorContext: string;
  keyStrengths: string[];
  marketPosition: string;
  seoFocus: string[];
  brandDescription: string;
  insightContext: string;
}

// Search Intent Types
export type SearchIntent = 'informational' | 'navigational' | 'commercial' | 'transactional';

// Marketing Funnel Stage
export type FunnelStage = 'awareness' | 'consideration' | 'decision';

// Search Intent Info
export interface SearchIntentInfo {
  mainIntent: SearchIntent;
  probability: number;
  foreignIntents?: Array<{ intent: string; probability: number }>;
  funnelStage: FunnelStage;
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
  keywordDifficulty?: number; // 0-100 scale (from DataForSEO)
  trend?: number; // YoY volume change percentage
  isDiscarded?: boolean; // User can discard keywords from calculations
  searchIntent?: SearchIntentInfo; // Search intent classification
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
  isDiscarded?: boolean; // User can dismiss irrelevant quick wins
  reasoning?: string; // Detailed explanation of why this is a quick win
  isRecommended?: boolean; // Flagged as recommended based on brand context
  recommendedReason?: string; // Why this is recommended for the brand
  searchIntent?: SearchIntentInfo; // Search intent classification
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
  isDiscarded?: boolean; // User can dismiss actions
  detailedSteps?: string[]; // Step-by-step implementation guide
  isRecommended?: boolean; // Flagged as recommended based on brand context
  recommendedReason?: string; // Why this is recommended for the brand
  searchIntent?: SearchIntentInfo; // Search intent classification
}

// Hidden Gem - Low competition, high potential keyword
export interface HiddenGem {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number;
  position: number | null;
  url?: string;
  category?: string;
  opportunity: 'first-mover' | 'easy-win' | 'rising-trend';
  potentialClicks: number;
  reasoning: string;
  searchIntent?: SearchIntentInfo; // Search intent classification
}

// Cannibalization Issue - Multiple URLs competing for same keyword
export interface CannibalizationIssue {
  keyword: string;
  searchVolume: number;
  competingUrls: {
    url: string;
    position: number;
    visibleVolume: number;
  }[];
  recommendation: 'consolidate' | 'differentiate' | 'redirect';
  impactScore: number; // How much traffic is being lost
}

// Content Gap - Topics where competitors have coverage you don't
export interface ContentGap {
  topic: string;
  category: string;
  yourCoverage: number; // Number of pages
  avgCompetitorCoverage: number;
  totalVolume: number;
  topMissingKeywords: string[];
  priority: 'high' | 'medium' | 'low';
  // Enhanced fields
  existingUrls: string[]; // URLs you already have for this category
  weakKeywords: { keyword: string; position: number; volume: number; url: string }[];
  reasoning: string; // Detailed explanation of why this is a gap
  suggestedContentTypes: string[]; // Types of content to create
  estimatedTrafficGain: number; // Estimated additional traffic if gap is filled
}

// Funnel Stage Analysis - Opportunities grouped by buyer journey stage
export interface FunnelStageAnalysis {
  stage: FunnelStage;
  stageLabel: string;
  description: string;
  keywordCount: number;
  totalVolume: number;
  avgPosition: number;
  visibleVolume: number;
  sov: number;
  topKeywords: Array<{
    keyword: string;
    searchVolume: number;
    position: number;
    intent: SearchIntent;
    url?: string;
  }>;
  opportunities: Array<{
    keyword: string;
    searchVolume: number;
    position: number;
    intent: SearchIntent;
    potentialClicks: number;
    strategicValue: string;
  }>;
  strategicInsights: string[];
}

// Intent-Based Opportunity Analysis
export interface IntentOpportunity {
  keyword: string;
  searchVolume: number;
  position: number;
  intent: SearchIntent;
  intentProbability: number;
  funnelStage: FunnelStage;
  category?: string;
  url?: string;
  strategicValue: 'high' | 'medium' | 'low';
  strategicReasoning: string;
  brandRelevance?: string;
}

// Full Actionable Insights Data
export interface ActionableInsights {
  quickWins: QuickWinOpportunity[];
  categoryBreakdown: CategorySOV[];
  competitorStrengths: CompetitorStrength[];
  actionList: ActionItem[];
  hiddenGems: HiddenGem[];
  cannibalizationIssues: CannibalizationIssue[];
  contentGaps: ContentGap[];
  funnelAnalysis?: FunnelStageAnalysis[];
  intentOpportunities?: IntentOpportunity[];
  summary: {
    totalQuickWinPotential: number;
    strongCategories: number;
    weakCategories: number;
    hiddenGemsCount: number;
    cannibalizationCount: number;
    topPriorityAction: string;
    funnelBreakdown?: {
      awareness: { count: number; volume: number };
      consideration: { count: number; volume: number };
      decision: { count: number; volume: number };
    };
  };
}
