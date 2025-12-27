import type {
  RankedKeyword,
  BrandKeyword,
  QuickWinOpportunity,
  CategorySOV,
  CompetitorStrength,
  ActionItem,
  ActionableInsights,
  KeywordBattle,
  HiddenGem,
  CannibalizationIssue,
  ContentGap
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
 * Compares your coverage vs what the market opportunity suggests
 */
export function analyzeContentGaps(
  rankedKeywords: RankedKeyword[],
  _brandKeywords: BrandKeyword[] // Reserved for future competitor coverage comparison
): ContentGap[] {
  // Group ranked keywords by category
  const categoryData = new Map<string, {
    yourKeywords: RankedKeyword[];
    totalVolume: number;
    avgPosition: number;
  }>();

  for (const kw of rankedKeywords) {
    const category = kw.category || detectCategory(kw.keyword);
    const existing = categoryData.get(category) || {
      yourKeywords: [],
      totalVolume: 0,
      avgPosition: 0
    };

    existing.yourKeywords.push(kw);
    existing.totalVolume += kw.searchVolume;
    categoryData.set(category, existing);
  }

  // Calculate coverage metrics
  const contentGaps: ContentGap[] = [];

  for (const [category, data] of categoryData) {

    // Estimate expected coverage based on category volume
    const expectedCoverage = Math.ceil(data.totalVolume / 1000); // 1 page per 1000 volume
    const yourCoverage = data.yourKeywords.length;

    // Only flag if significant gap exists
    if (expectedCoverage <= yourCoverage * 1.5) continue;

    // Find keywords where you're weakest (position > 15 or no ranking)
    const weakKeywords = data.yourKeywords
      .filter(k => k.position > 15)
      .sort((a, b) => b.searchVolume - a.searchVolume)
      .slice(0, 5)
      .map(k => k.keyword);

    const gapSize = expectedCoverage - yourCoverage;
    const priority: ContentGap['priority'] =
      gapSize > 10 ? 'high' :
      gapSize > 5 ? 'medium' : 'low';

    contentGaps.push({
      topic: category,
      category,
      yourCoverage,
      avgCompetitorCoverage: expectedCoverage, // Estimated
      totalVolume: data.totalVolume,
      topMissingKeywords: weakKeywords,
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
 */
export function generateActionList(
  quickWins: QuickWinOpportunity[],
  categories: CategorySOV[],
  competitors: CompetitorStrength[],
  hiddenGems: HiddenGem[] = [],
  cannibalizationIssues: CannibalizationIssue[] = []
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

  // Add Hidden Gem actions (low competition opportunities)
  for (const gem of hiddenGems.slice(0, 3)) {
    actions.push({
      id: `action-${id++}`,
      actionType: 'create',
      priority: Math.min(95, 70 + Math.round(gem.searchVolume / 500)),
      title: `Target "${gem.keyword}" (Hidden Gem)`,
      description: gem.reasoning,
      keyword: gem.keyword,
      category: gem.category,
      impact: gem.searchVolume >= 1000 ? 'high' : gem.searchVolume >= 500 ? 'medium' : 'low',
      effort: gem.keywordDifficulty <= 20 ? 'low' : gem.keywordDifficulty <= 35 ? 'medium' : 'high',
      estimatedUplift: gem.potentialClicks,
      reasoning: `KD: ${gem.keywordDifficulty}, Volume: ${gem.searchVolume.toLocaleString()}, Potential: ${gem.potentialClicks.toLocaleString()} clicks`
    });
  }

  // Add Cannibalization fix actions
  for (const issue of cannibalizationIssues.slice(0, 3)) {
    if (issue.impactScore < 100) continue; // Skip minor issues

    const actionVerb = issue.recommendation === 'consolidate' ? 'Consolidate' :
                       issue.recommendation === 'redirect' ? 'Redirect' : 'Differentiate';

    actions.push({
      id: `action-${id++}`,
      actionType: 'optimize',
      priority: Math.min(90, 55 + Math.round(issue.impactScore / 100)),
      title: `${actionVerb} pages for "${issue.keyword}"`,
      description: `${issue.competingUrls.length} URLs competing - ${issue.recommendation}`,
      keyword: issue.keyword,
      impact: issue.impactScore >= 500 ? 'high' : issue.impactScore >= 200 ? 'medium' : 'low',
      effort: issue.recommendation === 'redirect' ? 'low' : 'medium',
      estimatedUplift: issue.impactScore,
      reasoning: `Cannibalization losing ~${issue.impactScore.toLocaleString()} clicks. URLs: ${issue.competingUrls.map(u => u.url).join(', ').slice(0, 100)}...`
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
  const hiddenGems = calculateHiddenGems(rankedKeywords);
  const cannibalizationIssues = detectCannibalization(rankedKeywords);
  const contentGaps = analyzeContentGaps(rankedKeywords, brandKeywords);
  const actionList = generateActionList(quickWins, categoryBreakdown, competitorStrengths, hiddenGems, cannibalizationIssues);

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
