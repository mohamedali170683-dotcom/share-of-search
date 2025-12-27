import type {
  RankedKeyword,
  BrandKeyword,
  QuickWinOpportunity,
  CategorySOV,
  CompetitorStrength,
  ActionItem,
  ActionableInsights,
  KeywordBattle
} from '../types';
import { getCTR } from './calculations';

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

/**
 * Detect category from keyword (fallback when not provided by API)
 */
function detectCategory(keyword: string): string {
  const patterns: { category: string; regex: RegExp }[] = [
    { category: 'Natural Cosmetics', regex: /natural|natur|bio|organic/i },
    { category: 'Skincare', regex: /skin|haut|face|gesicht|cream|creme|serum|moistur/i },
    { category: 'Makeup', regex: /makeup|lipstick|mascara|foundation|lippenstift/i },
    { category: 'Hair Care', regex: /hair|haar|shampoo|conditioner/i },
    { category: 'Body Care', regex: /body|körper|lotion|shower|dusch/i },
    { category: 'Vegan', regex: /vegan|cruelty.?free|tierversuchsfrei/i },
    { category: 'Anti-Aging', regex: /anti.?age|anti.?aging|wrinkle|falten/i },
  ];

  for (const { category, regex } of patterns) {
    if (regex.test(keyword)) return category;
  }
  return 'General';
}

/**
 * Calculate Quick Win opportunities from ranked keywords
 * Focuses on position 4-20 keywords with high potential
 */
export function calculateQuickWins(
  rankedKeywords: RankedKeyword[],
  minVolume: number = 100
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

    quickWins.push({
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
      category: kw.category || detectCategory(kw.keyword)
    });
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
 * Note: This is an estimation based on available data
 */
export function calculateCompetitorStrength(
  brandKeywords: BrandKeyword[],
  rankedKeywords: RankedKeyword[]
): CompetitorStrength[] {
  // Get competitor brands
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

  for (const [competitor, data] of competitors) {
    // Estimate competitor SOV based on brand search share
    const estimatedSOV = totalBrandVolume > 0
      ? Math.round((data.volume / totalBrandVolume) * 100 * 10) / 10
      : 0;

    // Simulate head-to-head based on your ranking distribution
    const positionDistribution = {
      top3: rankedKeywords.filter(k => k.position <= 3).length,
      top10: rankedKeywords.filter(k => k.position <= 10).length,
      page2: rankedKeywords.filter(k => k.position > 10 && k.position <= 20).length
    };

    // Estimate wins/losses (simplified - would need actual competitor ranking data)
    const youWin = Math.round(positionDistribution.top3 * 0.7);
    const theyWin = Math.round(positionDistribution.page2 * 0.6);
    const ties = Math.round(positionDistribution.top10 * 0.2);

    // Get categories where you might be losing
    const categories = calculateCategorySOV(rankedKeywords);
    const weakCategories = categories
      .filter(c => c.status === 'weak' || c.status === 'trailing')
      .map(c => c.category);

    // Simulated keyword battles (top losing)
    const topLosingKeywords: KeywordBattle[] = rankedKeywords
      .filter(k => k.position > 10)
      .sort((a, b) => b.searchVolume - a.searchVolume)
      .slice(0, 3)
      .map(k => ({
        keyword: k.keyword,
        searchVolume: k.searchVolume,
        yourPosition: k.position,
        competitorPosition: Math.max(1, k.position - Math.floor(Math.random() * 8)),
        winner: 'competitor' as const,
        visibilityDifference: Math.round(k.searchVolume * (getCTR(k.position - 5) - getCTR(k.position)))
      }));

    // Simulated keyword battles (top winning)
    const topWinningKeywords: KeywordBattle[] = rankedKeywords
      .filter(k => k.position <= 5)
      .sort((a, b) => b.searchVolume - a.searchVolume)
      .slice(0, 3)
      .map(k => ({
        keyword: k.keyword,
        searchVolume: k.searchVolume,
        yourPosition: k.position,
        competitorPosition: k.position + Math.floor(Math.random() * 10) + 3,
        winner: 'you' as const,
        visibilityDifference: Math.round(k.searchVolume * getCTR(k.position))
      }));

    results.push({
      competitor: competitor.charAt(0).toUpperCase() + competitor.slice(1),
      estimatedSOV,
      keywordsAnalyzed: rankedKeywords.length,
      headToHead: { youWin, theyWin, ties },
      dominantCategories: weakCategories.slice(0, 3),
      topWinningKeywords,
      topLosingKeywords
    });
  }

  // Sort by estimated SOV (strongest competitors first)
  return results.sort((a, b) => b.estimatedSOV - a.estimatedSOV);
}

// ==========================================
// PRIORITIZED ACTION LIST
// ==========================================

/**
 * Generate prioritized action list based on all insights
 */
export function generateActionList(
  quickWins: QuickWinOpportunity[],
  categories: CategorySOV[],
  competitors: CompetitorStrength[]
): ActionItem[] {
  const actions: ActionItem[] = [];
  let id = 1;

  // Add Quick Win actions (optimize existing pages)
  for (const qw of quickWins.slice(0, 5)) {
    const impactScore = qw.clickUplift >= 500 ? 'high' : qw.clickUplift >= 200 ? 'medium' : 'low';

    actions.push({
      id: `action-${id++}`,
      actionType: 'optimize',
      priority: Math.min(100, 50 + Math.round(qw.clickUplift / 50)),
      title: `Optimize "${qw.keyword}" page`,
      description: `Move from position #${qw.currentPosition} to #${qw.targetPosition}`,
      keyword: qw.keyword,
      category: qw.category,
      impact: impactScore,
      effort: qw.effort,
      estimatedUplift: qw.clickUplift,
      reasoning: `+${qw.clickUplift.toLocaleString()} clicks potential (${qw.upliftPercentage}% increase)`
    });
  }

  // Add category improvement actions
  const weakCategories = categories.filter(c => c.status === 'weak' || c.status === 'trailing');
  for (const cat of weakCategories.slice(0, 3)) {
    actions.push({
      id: `action-${id++}`,
      actionType: 'create',
      priority: Math.min(95, 40 + Math.round(cat.totalCategoryVolume / 1000)),
      title: `Build content for "${cat.category}"`,
      description: `Create topic cluster to improve ${cat.status} category`,
      category: cat.category,
      impact: cat.totalCategoryVolume > 10000 ? 'high' : 'medium',
      effort: 'high',
      estimatedUplift: Math.round(cat.totalCategoryVolume * 0.1),
      reasoning: `${cat.keywordCount} keywords, ${cat.totalCategoryVolume.toLocaleString()} monthly searches. Current SOV: ${cat.yourSOV}%`
    });
  }

  // Add competitive response actions
  for (const comp of competitors.slice(0, 2)) {
    if (comp.headToHead.theyWin > comp.headToHead.youWin) {
      actions.push({
        id: `action-${id++}`,
        actionType: 'investigate',
        priority: 60,
        title: `Analyze ${comp.competitor}'s content strategy`,
        description: `They're winning ${comp.headToHead.theyWin} keywords vs your ${comp.headToHead.youWin}`,
        impact: 'medium',
        effort: 'low',
        estimatedUplift: 0,
        reasoning: `${comp.competitor} dominates: ${comp.dominantCategories.join(', ') || 'multiple categories'}`
      });
    }
  }

  // Add monitoring actions for leading categories
  const leadingCategories = categories.filter(c => c.status === 'leading');
  for (const cat of leadingCategories.slice(0, 2)) {
    actions.push({
      id: `action-${id++}`,
      actionType: 'monitor',
      priority: 30,
      title: `Protect "${cat.category}" leadership`,
      description: `Monitor competitor moves in this strong category`,
      category: cat.category,
      impact: 'low',
      effort: 'low',
      estimatedUplift: 0,
      reasoning: `You lead with ${cat.yourSOV}% SOV, avg position #${cat.avgPosition}`
    });
  }

  // Sort by priority (highest first)
  return actions.sort((a, b) => b.priority - a.priority);
}

// ==========================================
// MAIN FUNCTION
// ==========================================

/**
 * Generate all actionable insights from keyword data
 */
export function generateActionableInsights(
  rankedKeywords: RankedKeyword[],
  brandKeywords: BrandKeyword[]
): ActionableInsights {
  const quickWins = calculateQuickWins(rankedKeywords);
  const categoryBreakdown = calculateCategorySOV(rankedKeywords);
  const competitorStrengths = calculateCompetitorStrength(brandKeywords, rankedKeywords);
  const actionList = generateActionList(quickWins, categoryBreakdown, competitorStrengths);

  const totalQuickWinPotential = quickWins.reduce((sum, q) => sum + q.clickUplift, 0);
  const strongCategories = categoryBreakdown.filter(c => c.status === 'leading' || c.status === 'competitive').length;
  const weakCategories = categoryBreakdown.filter(c => c.status === 'weak' || c.status === 'trailing').length;

  return {
    quickWins,
    categoryBreakdown,
    competitorStrengths,
    actionList,
    summary: {
      totalQuickWinPotential,
      strongCategories,
      weakCategories,
      topPriorityAction: actionList[0]?.title || 'No actions identified'
    }
  };
}
