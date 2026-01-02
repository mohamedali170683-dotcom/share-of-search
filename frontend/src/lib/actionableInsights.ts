import type {
  RankedKeyword,
  BrandKeyword,
  BrandContext,
  QuickWinOpportunity,
  CategorySOV,
  CompetitorStrength,
  ActionItem,
  ActionableInsights,
  HiddenGem,
  CannibalizationIssue,
  ContentGap,
  Opportunity
} from '../types';
import { getCTR } from './calculations';
import { detectCategory as detectCategoryFromUtils } from '../utils/categoryDetection';
import {
  generateQuickWinReasoning as generateQuickWinReasoningAdvanced,
  generateHiddenGemReasoning,
  generateCannibalizationReasoning,
  generateCategoryActionReasoning,
  generateCompetitorActionReasoning,
  generateActionTitle,
  generateActionDescription
} from './keywordReasoning';

// ==========================================
// QUICK WINS CALCULATION
// ==========================================

/**
 * Calculate target position based on current position
 * More aggressive targets for keywords close to top positions
 */
function calculateTargetPosition(currentPosition: number): number {
  if (currentPosition <= 3) return 1;
  if (currentPosition <= 5) return 3;
  if (currentPosition <= 10) return 5;
  if (currentPosition <= 15) return 8;
  return 10;
}

/**
 * Determine effort level based on position improvement needed
 */
function calculateEffort(currentPosition: number, targetPosition: number): 'low' | 'medium' | 'high' {
  const gap = currentPosition - targetPosition;
  if (gap <= 3) return 'low';
  if (gap <= 7) return 'medium';
  return 'high';
}

// Use shared category detection utility
const detectCategory = detectCategoryFromUtils;

/**
 * Calculate Quick Win opportunities from ranked keywords
 * Focuses on position 4-20 keywords with high potential
 * @param rankedKeywords - Keywords where the brand ranks
 * @param minVolume - Minimum search volume to consider
 * @param brandContext - Optional brand context for tailored reasoning
 */
export function calculateQuickWins(
  rankedKeywords: RankedKeyword[],
  minVolume: number = 100,
  brandContext?: BrandContext
): QuickWinOpportunity[] {
  const quickWins: QuickWinOpportunity[] = [];

  for (const kw of rankedKeywords) {
    // Only consider position 4-20 (page 1 bottom + page 2 top)
    if (kw.position < 4 || kw.position > 20) continue;
    if (kw.searchVolume < minVolume) continue;

    const targetPosition = calculateTargetPosition(kw.position);
    const currentCTR = getCTR(kw.position);
    const targetCTR = getCTR(targetPosition);

    const currentClicks = Math.round(kw.searchVolume * currentCTR);
    const potentialClicks = Math.round(kw.searchVolume * targetCTR);
    const clickUplift = potentialClicks - currentClicks;
    const upliftPercentage = currentClicks > 0
      ? Math.round((clickUplift / currentClicks) * 100)
      : 0;

    // Only include if there's meaningful uplift
    if (clickUplift < 50) continue;

    // Build the quick win object first (without reasoning)
    const quickWin: QuickWinOpportunity = {
      keyword: kw.keyword,
      currentPosition: kw.position,
      targetPosition,
      searchVolume: kw.searchVolume,
      currentClicks,
      potentialClicks,
      clickUplift,
      upliftPercentage,
      effort: calculateEffort(kw.position, targetPosition),
      url: kw.url || '',
      category: kw.category || detectCategory(kw.keyword),
      reasoning: '' // Placeholder, will be filled with advanced reasoning
    };

    // Generate tailored, keyword-specific reasoning using the advanced function
    quickWin.reasoning = generateQuickWinReasoningAdvanced(quickWin, brandContext);

    quickWins.push(quickWin);
  }

  // Sort by click uplift (highest first)
  return quickWins.sort((a, b) => b.clickUplift - a.clickUplift);
}

// ==========================================
// CATEGORY SOV BREAKDOWN
// ==========================================

/**
 * Determine category status based on SOV and position
 */
function determineCategoryStatus(
  sov: number,
  avgPosition: number
): 'leading' | 'competitive' | 'trailing' | 'weak' {
  if (sov >= 25 && avgPosition <= 5) return 'leading';
  if (sov >= 15 || avgPosition <= 8) return 'competitive';
  if (sov >= 8 || avgPosition <= 12) return 'trailing';
  return 'weak';
}

/**
 * Calculate SOV breakdown by category
 */
export function calculateCategorySOV(
  rankedKeywords: RankedKeyword[]
): CategorySOV[] {
  const categoryMap = new Map<string, {
    keywords: RankedKeyword[];
    totalVolume: number;
    visibleVolume: number;
    positionSum: number;
  }>();

  // Group keywords by category
  for (const kw of rankedKeywords) {
    const category = kw.category || detectCategory(kw.keyword);
    const existing = categoryMap.get(category) || {
      keywords: [],
      totalVolume: 0,
      visibleVolume: 0,
      positionSum: 0
    };

    const ctr = getCTR(kw.position);
    const visible = kw.searchVolume * ctr;

    existing.keywords.push(kw);
    existing.totalVolume += kw.searchVolume;
    existing.visibleVolume += visible;
    existing.positionSum += kw.position;

    categoryMap.set(category, existing);
  }

  // Convert to CategorySOV array
  const categories: CategorySOV[] = [];

  for (const [category, data] of categoryMap) {
    const avgPosition = data.keywords.length > 0
      ? Math.round(data.positionSum / data.keywords.length * 10) / 10
      : 0;

    const yourSOV = data.totalVolume > 0
      ? Math.round((data.visibleVolume / data.totalVolume) * 100 * 10) / 10
      : 0;

    // Get top keywords by volume
    const topKeywords = data.keywords
      .sort((a, b) => b.searchVolume - a.searchVolume)
      .slice(0, 5)
      .map(k => k.keyword);

    categories.push({
      category,
      yourSOV,
      yourVisibleVolume: Math.round(data.visibleVolume),
      totalCategoryVolume: data.totalVolume,
      keywordCount: data.keywords.length,
      avgPosition,
      topKeywords,
      status: determineCategoryStatus(yourSOV, avgPosition)
    });
  }

  // Sort by total volume (most important categories first)
  return categories.sort((a, b) => b.totalCategoryVolume - a.totalCategoryVolume);
}

// ==========================================
// COMPETITOR STRENGTH ANALYSIS
// ==========================================

/**
 * Analyze competitor strength based on brand keywords and your rankings
 * Shows REAL data about your performance, not fake competitor positions
 */
export function calculateCompetitorStrength(
  brandKeywords: BrandKeyword[],
  rankedKeywords: RankedKeyword[]
): CompetitorStrength[] {
  // Get competitor brands from brand keywords
  const competitors = brandKeywords
    .filter(k => !k.isOwnBrand)
    .reduce((acc, k) => {
      // Extract base brand name (first word)
      const brandName = k.keyword.split(' ')[0].toLowerCase();
      if (!acc.has(brandName)) {
        acc.set(brandName, { volume: 0, keywords: [] });
      }
      const data = acc.get(brandName)!;
      data.volume += k.searchVolume;
      data.keywords.push(k.keyword);
      return acc;
    }, new Map<string, { volume: number; keywords: string[] }>());

  const results: CompetitorStrength[] = [];

  // Calculate total brand volume for SOS estimation
  const totalBrandVolume = brandKeywords.reduce((sum, k) => sum + k.searchVolume, 0);

  // Categorize YOUR keywords by position (real data)
  const strongKeywords = rankedKeywords.filter(k => k.position <= 3);
  const moderateKeywords = rankedKeywords.filter(k => k.position > 3 && k.position <= 10);
  const weakKeywords = rankedKeywords.filter(k => k.position > 10);

  // Get categories where you're weak
  const categories = calculateCategorySOV(rankedKeywords);
  const vulnerableCategories = categories
    .filter(c => c.status === 'weak' || c.status === 'trailing')
    .map(c => c.category);

  // Your top strong keywords (real data with URLs)
  const topStrongKeywords = strongKeywords
    .sort((a, b) => b.searchVolume - a.searchVolume)
    .slice(0, 5)
    .map(k => ({
      keyword: k.keyword,
      searchVolume: k.searchVolume,
      yourPosition: k.position,
      url: k.url,
      category: k.category,
      visibleVolume: Math.round(k.searchVolume * getCTR(k.position)),
      status: 'strong' as const
    }));

  // Keywords needing improvement (real data with URLs)
  const keywordsToImprove = weakKeywords
    .sort((a, b) => b.searchVolume - a.searchVolume)
    .slice(0, 5)
    .map(k => ({
      keyword: k.keyword,
      searchVolume: k.searchVolume,
      yourPosition: k.position,
      url: k.url,
      category: k.category,
      visibleVolume: Math.round(k.searchVolume * getCTR(k.position)),
      status: 'weak' as const
    }));

  for (const [competitor, data] of competitors) {
    // Calculate competitor's Share of Search based on brand keyword volume
    const estimatedSOV = totalBrandVolume > 0
      ? Math.round((data.volume / totalBrandVolume) * 100 * 10) / 10
      : 0;

    results.push({
      competitor: competitor.charAt(0).toUpperCase() + competitor.slice(1),
      brandSearchVolume: data.volume,
      estimatedSOV,
      keywordsAnalyzed: rankedKeywords.length,
      yourMetrics: {
        strongKeywords: strongKeywords.length,
        moderateKeywords: moderateKeywords.length,
        weakKeywords: weakKeywords.length
      },
      vulnerableCategories: vulnerableCategories.slice(0, 3),
      topStrongKeywords,
      keywordsToImprove
    });
  }

  // Sort by brand search volume (strongest competitors first)
  return results.sort((a, b) => b.brandSearchVolume - a.brandSearchVolume);
}

// ==========================================
// HIDDEN GEMS DETECTION
// ==========================================

/**
 * Determine opportunity type based on keyword characteristics
 */
function determineOpportunityType(
  _kd: number, // Used for future enhancements
  position: number | null,
  trend?: number
): HiddenGem['opportunity'] {
  if (trend && trend > 20) return 'rising-trend';
  if (position === null || position > 50) return 'first-mover';
  return 'easy-win';
}

/**
 * Find Hidden Gems - Low difficulty, high potential keywords
 * These are keywords you can win with less effort
 */
export function calculateHiddenGems(
  rankedKeywords: RankedKeyword[],
  minVolume: number = 200,
  maxKD: number = 40
): HiddenGem[] {
  const hiddenGems: HiddenGem[] = [];

  for (const kw of rankedKeywords) {
    // Only consider keywords with KD data
    const kd = kw.keywordDifficulty;
    if (kd === undefined) continue;

    // Skip if difficulty is too high
    if (kd > maxKD) continue;

    // Skip low volume keywords
    if (kw.searchVolume < minVolume) continue;

    // Skip keywords where you're already ranking well (position 1-3)
    if (kw.position <= 3) continue;

    const opportunityType = determineOpportunityType(kd, kw.position, kw.trend);
    const targetPosition = kd <= 20 ? 1 : kd <= 30 ? 3 : 5;
    const potentialClicks = Math.round(kw.searchVolume * getCTR(targetPosition));

    let reasoning = '';
    if (opportunityType === 'rising-trend') {
      reasoning = `Trending keyword (+${kw.trend}% YoY) with low competition (KD: ${kd})`;
    } else if (opportunityType === 'first-mover') {
      reasoning = `You're not ranking yet, but low competition (KD: ${kd}) makes this achievable`;
    } else {
      reasoning = `Currently #${kw.position}, easy to push to top 3 with KD of ${kd}`;
    }

    hiddenGems.push({
      keyword: kw.keyword,
      searchVolume: kw.searchVolume,
      keywordDifficulty: kd,
      position: kw.position,
      url: kw.url,
      category: kw.category || detectCategory(kw.keyword),
      opportunity: opportunityType,
      potentialClicks,
      reasoning
    });
  }

  // Sort by potential value (volume / difficulty ratio)
  return hiddenGems
    .sort((a, b) => {
      const scoreA = a.searchVolume / (a.keywordDifficulty + 1);
      const scoreB = b.searchVolume / (b.keywordDifficulty + 1);
      return scoreB - scoreA;
    })
    .slice(0, 20); // Top 20 hidden gems
}

// ==========================================
// CANNIBALIZATION DETECTION
// ==========================================

/**
 * Determine recommendation for cannibalization issue
 */
function getCannibalizationRecommendation(
  positionGap: number,
  urlCount: number
): CannibalizationIssue['recommendation'] {
  if (urlCount > 3) return 'consolidate';
  if (positionGap < 5) return 'differentiate';
  return 'redirect';
}

/**
 * Detect keyword cannibalization - Multiple URLs competing for same keyword
 * This helps identify when your own pages are competing against each other
 */
export function detectCannibalization(
  rankedKeywords: RankedKeyword[]
): CannibalizationIssue[] {
  // Group keywords by keyword text
  const keywordMap = new Map<string, RankedKeyword[]>();

  for (const kw of rankedKeywords) {
    if (!kw.url) continue;

    const key = kw.keyword.toLowerCase().trim();
    const existing = keywordMap.get(key) || [];
    existing.push(kw);
    keywordMap.set(key, existing);
  }

  const issues: CannibalizationIssue[] = [];

  for (const [keyword, rankings] of keywordMap) {
    // Only flag if multiple URLs rank for same keyword
    if (rankings.length < 2) continue;

    // Get unique URLs
    const uniqueUrls = [...new Set(rankings.map(r => r.url))];
    if (uniqueUrls.length < 2) continue;

    // Sort by position
    const sorted = rankings.sort((a, b) => a.position - b.position);
    const bestRanking = sorted[0];
    const worstRanking = sorted[sorted.length - 1];
    const positionGap = worstRanking.position - bestRanking.position;

    // Calculate competing URLs data
    const competingUrls = sorted.map(r => ({
      url: r.url || '',
      position: r.position,
      visibleVolume: Math.round(r.searchVolume * getCTR(r.position))
    }));

    // Calculate impact score - how much visibility is being diluted
    const totalPotential = bestRanking.searchVolume * getCTR(1);
    const actualVisibility = competingUrls.reduce((sum, u) => sum + u.visibleVolume, 0);
    const impactScore = Math.round(totalPotential - actualVisibility);

    issues.push({
      keyword,
      searchVolume: bestRanking.searchVolume,
      competingUrls,
      recommendation: getCannibalizationRecommendation(positionGap, uniqueUrls.length),
      impactScore: Math.max(0, impactScore)
    });
  }

  // Sort by impact score (highest loss first)
  return issues.sort((a, b) => b.impactScore - a.impactScore);
}

// ==========================================
// CONTENT GAP ANALYSIS
// ==========================================

/**
 * Analyze content gaps by category
 * Identifies categories where you're underperforming and need more/better content
 */
export function analyzeContentGaps(
  rankedKeywords: RankedKeyword[],
  _brandKeywords: BrandKeyword[] // Reserved for future competitor coverage comparison
): ContentGap[] {
  // Group ranked keywords by category
  const categoryData = new Map<string, {
    yourKeywords: RankedKeyword[];
    uniqueUrls: Set<string>;
    totalVolume: number;
    positionSum: number;
    weakKeywords: RankedKeyword[]; // Position > 10
    page2Keywords: RankedKeyword[]; // Position 11-20
  }>();

  for (const kw of rankedKeywords) {
    const category = kw.category || detectCategory(kw.keyword);

    // Skip the "Other" category as it's not actionable
    if (category === 'Other') continue;

    const existing = categoryData.get(category) || {
      yourKeywords: [],
      uniqueUrls: new Set<string>(),
      totalVolume: 0,
      positionSum: 0,
      weakKeywords: [],
      page2Keywords: []
    };

    existing.yourKeywords.push(kw);
    if (kw.url) existing.uniqueUrls.add(kw.url);
    existing.totalVolume += kw.searchVolume;
    existing.positionSum += kw.position;

    if (kw.position > 10) {
      existing.weakKeywords.push(kw);
    }
    if (kw.position >= 11 && kw.position <= 20) {
      existing.page2Keywords.push(kw);
    }

    categoryData.set(category, existing);
  }

  // Calculate coverage metrics
  const contentGaps: ContentGap[] = [];

  for (const [category, data] of categoryData) {
    // Skip categories with very few keywords (not enough data)
    if (data.yourKeywords.length < 3) continue;

    const avgPosition = data.positionSum / data.yourKeywords.length;
    const yourPageCount = data.uniqueUrls.size; // Actual pages you have
    const weakKeywordCount = data.weakKeywords.length;
    const page2Count = data.page2Keywords.length;

    // Calculate a "content opportunity score"
    // Based on: high volume keywords where you rank poorly
    const highVolumeWeakKeywords = data.weakKeywords
      .filter(k => k.searchVolume >= 500)
      .sort((a, b) => b.searchVolume - a.searchVolume);

    // Realistic suggestion: 1 new page per 3-5 weak high-volume keywords
    // Max suggestion: 10 new pages per category
    const suggestedNewContent = Math.min(
      10,
      Math.ceil(highVolumeWeakKeywords.length / 3)
    );

    // Only flag if there's a meaningful gap
    const hasGap = (
      avgPosition > 8 || // Average position is page 2
      weakKeywordCount > data.yourKeywords.length * 0.4 || // More than 40% weak
      page2Count >= 5 // At least 5 keywords on page 2
    );

    if (!hasGap || suggestedNewContent === 0) continue;

    // Get top missing keywords (highest volume, worst position)
    const topMissingKeywords = highVolumeWeakKeywords
      .slice(0, 5)
      .map(k => k.keyword);

    // Determine priority based on opportunity size
    const opportunityVolume = highVolumeWeakKeywords.reduce((sum, k) => sum + k.searchVolume, 0);
    const priority: ContentGap['priority'] =
      opportunityVolume > 50000 ? 'high' :
      opportunityVolume > 10000 ? 'medium' : 'low';

    contentGaps.push({
      topic: category,
      category,
      yourCoverage: yourPageCount,
      avgCompetitorCoverage: yourPageCount + suggestedNewContent, // Suggested total
      totalVolume: data.totalVolume,
      topMissingKeywords,
      priority
    });
  }

  // Sort by priority and volume
  return contentGaps.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.totalVolume - a.totalVolume;
  });
}

// ==========================================
// PRIORITIZED ACTION LIST
// ==========================================

/**
 * Generate prioritized action list based on all insights
 * Now with unique, keyword-specific reasoning for each action
 */
export function generateActionList(
  quickWins: QuickWinOpportunity[],
  categories: CategorySOV[],
  competitors: CompetitorStrength[],
  hiddenGems: HiddenGem[] = [],
  cannibalizationIssues: CannibalizationIssue[] = [],
  brandContext?: BrandContext
): ActionItem[] {
  const actions: ActionItem[] = [];
  let id = 1;

  // Add Quick Win actions (optimize existing pages) with unique reasoning
  for (const qw of quickWins.slice(0, 5)) {
    const impactScore = qw.clickUplift >= 500 ? 'high' : qw.clickUplift >= 200 ? 'medium' : 'low';

    actions.push({
      id: `action-${id++}`,
      actionType: 'optimize',
      priority: Math.min(100, 50 + Math.round(qw.clickUplift / 50)),
      title: generateActionTitle('optimize', qw.keyword, qw.category, {
        position: qw.currentPosition,
        targetPosition: qw.targetPosition
      }),
      description: generateActionDescription('optimize', qw.keyword, qw.category, {
        currentPosition: qw.currentPosition,
        targetPosition: qw.targetPosition,
        clickUplift: qw.clickUplift
      }),
      keyword: qw.keyword,
      category: qw.category,
      impact: impactScore,
      effort: qw.effort,
      estimatedUplift: qw.clickUplift,
      reasoning: generateQuickWinReasoningAdvanced(qw, brandContext)
    });
  }

  // Add Hidden Gem actions with unique reasoning
  for (const gem of hiddenGems.slice(0, 3)) {
    actions.push({
      id: `action-${id++}`,
      actionType: 'create',
      priority: Math.min(95, 70 + Math.round(gem.searchVolume / 500)),
      title: generateActionTitle('create', gem.keyword, gem.category),
      description: generateActionDescription('create', gem.keyword, gem.category, {
        volume: gem.searchVolume
      }),
      keyword: gem.keyword,
      category: gem.category,
      impact: gem.searchVolume >= 1000 ? 'high' : gem.searchVolume >= 500 ? 'medium' : 'low',
      effort: gem.keywordDifficulty <= 20 ? 'low' : gem.keywordDifficulty <= 35 ? 'medium' : 'high',
      estimatedUplift: gem.potentialClicks,
      reasoning: generateHiddenGemReasoning(gem, brandContext)
    });
  }

  // Add Cannibalization fix actions with unique reasoning
  for (const issue of cannibalizationIssues.slice(0, 3)) {
    if (issue.impactScore < 100) continue; // Skip minor issues

    const actionVerb = issue.recommendation === 'consolidate' ? 'Consolidate' :
                       issue.recommendation === 'redirect' ? 'Redirect' : 'Differentiate';

    actions.push({
      id: `action-${id++}`,
      actionType: 'optimize',
      priority: Math.min(90, 55 + Math.round(issue.impactScore / 100)),
      title: `${actionVerb} pages for "${issue.keyword}"`,
      description: `${issue.competingUrls.length} URLs competing for the same keyword`,
      keyword: issue.keyword,
      impact: issue.impactScore >= 500 ? 'high' : issue.impactScore >= 200 ? 'medium' : 'low',
      effort: issue.recommendation === 'redirect' ? 'low' : 'medium',
      estimatedUplift: issue.impactScore,
      reasoning: generateCannibalizationReasoning(issue, brandContext)
    });
  }

  // Add category improvement actions with unique reasoning
  const weakCategories = categories.filter(c => c.status === 'weak' || c.status === 'trailing');
  for (const cat of weakCategories.slice(0, 3)) {
    actions.push({
      id: `action-${id++}`,
      actionType: 'create',
      priority: Math.min(95, 40 + Math.round(cat.totalCategoryVolume / 1000)),
      title: generateActionTitle('create', undefined, cat.category),
      description: generateActionDescription('create', undefined, cat.category, {
        volume: cat.totalCategoryVolume,
        sov: cat.yourSOV
      }),
      category: cat.category,
      impact: cat.totalCategoryVolume > 10000 ? 'high' : 'medium',
      effort: 'high',
      estimatedUplift: Math.round(cat.totalCategoryVolume * 0.1),
      reasoning: generateCategoryActionReasoning(cat, brandContext)
    });
  }

  // Add competitive response actions with unique reasoning
  // Focus on competitors with high brand search volume
  for (const comp of competitors.slice(0, 2)) {
    // Only suggest investigation for significant competitors
    if (comp.estimatedSOV >= 10 && comp.yourMetrics.weakKeywords > comp.yourMetrics.strongKeywords) {
      actions.push({
        id: `action-${id++}`,
        actionType: 'investigate',
        priority: 60,
        title: `Analyze ${comp.competitor}'s content strategy`,
        description: `${comp.competitor} has ${comp.estimatedSOV}% SOS. You have ${comp.yourMetrics.weakKeywords} weak keywords vs ${comp.yourMetrics.strongKeywords} strong.`,
        impact: 'medium',
        effort: 'low',
        estimatedUplift: 0,
        reasoning: generateCompetitorActionReasoning(comp, brandContext)
      });
    }
  }

  // Add monitoring actions for leading categories with unique reasoning
  const leadingCategories = categories.filter(c => c.status === 'leading');
  for (const cat of leadingCategories.slice(0, 2)) {
    actions.push({
      id: `action-${id++}`,
      actionType: 'monitor',
      priority: 30,
      title: generateActionTitle('monitor', undefined, cat.category),
      description: generateActionDescription('monitor', undefined, cat.category, {
        sov: cat.yourSOV
      }),
      category: cat.category,
      impact: 'low',
      effort: 'low',
      estimatedUplift: 0,
      reasoning: generateCategoryActionReasoning(cat, brandContext)
    });
  }

  // Sort by priority (highest first)
  return actions.sort((a, b) => b.priority - a.priority);
}

// ==========================================
// MAIN FUNCTION
// ==========================================

// ==========================================
// UNIFIED OPPORTUNITIES
// ==========================================

/**
 * Generate unified opportunities list from all insight types
 * Combines quick wins, hidden gems, and cannibalization issues into a single prioritized list
 */
export function generateUnifiedOpportunities(
  quickWins: QuickWinOpportunity[],
  hiddenGems: HiddenGem[],
  cannibalizationIssues: CannibalizationIssue[]
): Opportunity[] {
  const opportunities: Opportunity[] = [];
  let idCounter = 1;

  // Convert Quick Wins to Opportunities
  for (const qw of quickWins) {
    // Priority based on click uplift potential (higher = better)
    const priority = Math.min(100, 50 + Math.round(qw.clickUplift / 100));

    opportunities.push({
      id: `opp-qw-${idCounter++}`,
      keyword: qw.keyword,
      type: 'quick-win',
      priority,
      searchVolume: qw.searchVolume,
      clickPotential: qw.clickUplift,
      effort: qw.effort,
      reasoning: '', // Will be filled by AI
      currentPosition: qw.currentPosition,
      targetPosition: qw.targetPosition,
      category: qw.category,
      url: qw.url
    });
  }

  // Convert Hidden Gems to Opportunities
  for (const gem of hiddenGems) {
    // Priority based on volume/difficulty ratio
    const priority = Math.min(95, 40 + Math.round((gem.searchVolume / (gem.keywordDifficulty + 1)) / 50));

    opportunities.push({
      id: `opp-gem-${idCounter++}`,
      keyword: gem.keyword,
      type: 'hidden-gem',
      priority,
      searchVolume: gem.searchVolume,
      clickPotential: gem.potentialClicks,
      effort: gem.keywordDifficulty <= 20 ? 'low' : gem.keywordDifficulty <= 35 ? 'medium' : 'high',
      reasoning: '', // Will be filled by AI
      currentPosition: gem.position || undefined,
      keywordDifficulty: gem.keywordDifficulty,
      category: gem.category,
      url: gem.url
    });
  }

  // Convert Cannibalization Issues to Opportunities
  for (const issue of cannibalizationIssues) {
    if (issue.impactScore < 50) continue; // Skip minor issues

    const priority = Math.min(90, 45 + Math.round(issue.impactScore / 50));

    opportunities.push({
      id: `opp-cann-${idCounter++}`,
      keyword: issue.keyword,
      type: 'cannibalization',
      priority,
      searchVolume: issue.searchVolume,
      clickPotential: issue.impactScore,
      effort: issue.recommendation === 'redirect' ? 'low' : 'medium',
      reasoning: '', // Will be filled by AI
      competingUrls: issue.competingUrls.map(u => ({ url: u.url, position: u.position })),
      recommendation: issue.recommendation
    });
  }

  // Sort by priority (highest first)
  return opportunities.sort((a, b) => b.priority - a.priority);
}

// ==========================================
// MAIN FUNCTION
// ==========================================

/**
 * Generate all actionable insights from keyword data
 * @param rankedKeywords - Keywords where the brand ranks
 * @param brandKeywords - Brand and competitor brand keywords
 * @param brandContext - Optional context about the brand for tailored explanations
 */
export function generateActionableInsights(
  rankedKeywords: RankedKeyword[],
  brandKeywords: BrandKeyword[],
  brandContext?: BrandContext
): ActionableInsights {
  const quickWins = calculateQuickWins(rankedKeywords, 100, brandContext);
  const categoryBreakdown = calculateCategorySOV(rankedKeywords);
  const competitorStrengths = calculateCompetitorStrength(brandKeywords, rankedKeywords);
  const hiddenGems = calculateHiddenGems(rankedKeywords);
  const cannibalizationIssues = detectCannibalization(rankedKeywords);
  const contentGaps = analyzeContentGaps(rankedKeywords, brandKeywords);
  const actionList = generateActionList(quickWins, categoryBreakdown, competitorStrengths, hiddenGems, cannibalizationIssues, brandContext);

  // Generate unified opportunities list
  const opportunities = generateUnifiedOpportunities(quickWins, hiddenGems, cannibalizationIssues);

  const totalQuickWinPotential = quickWins.reduce((sum, q) => sum + q.clickUplift, 0);
  const strongCategories = categoryBreakdown.filter(c => c.status === 'leading' || c.status === 'competitive').length;
  const weakCategories = categoryBreakdown.filter(c => c.status === 'weak' || c.status === 'trailing').length;

  return {
    quickWins,
    categoryBreakdown,
    competitorStrengths,
    actionList,
    hiddenGems,
    cannibalizationIssues,
    contentGaps,
    opportunities,
    summary: {
      totalQuickWinPotential,
      strongCategories,
      weakCategories,
      hiddenGemsCount: hiddenGems.length,
      cannibalizationCount: cannibalizationIssues.length,
      topPriorityAction: actionList[0]?.title || 'No actions identified'
    }
  };
}
