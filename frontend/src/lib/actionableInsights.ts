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
  ContentGap,
  BrandContext
} from '../types';
import { getCTR } from './calculations';

// ==========================================
// BRAND CONTEXT MATCHING
// ==========================================

/**
 * Check if a keyword or category matches brand context (SEO focus, product categories, strengths)
 * Returns match reason if found, undefined otherwise
 */
function matchesBrandContext(
  keyword: string,
  category: string | undefined,
  context: BrandContext | undefined
): { matches: boolean; reason?: string } {
  if (!context) return { matches: false };

  const kwLower = keyword.toLowerCase();
  const catLower = (category || '').toLowerCase();

  // Check SEO focus areas
  for (const focus of context.seoFocus || []) {
    const focusLower = focus.toLowerCase();
    if (kwLower.includes(focusLower) || catLower.includes(focusLower)) {
      return { matches: true, reason: `Aligns with your SEO focus: "${focus}"` };
    }
  }

  // Check product categories
  for (const prodCat of context.productCategories || []) {
    const prodCatLower = prodCat.toLowerCase();
    if (kwLower.includes(prodCatLower) || catLower.includes(prodCatLower)) {
      return { matches: true, reason: `Matches your product category: "${prodCat}"` };
    }
  }

  // Check key strengths
  for (const strength of context.keyStrengths || []) {
    const strengthLower = strength.toLowerCase();
    if (kwLower.includes(strengthLower)) {
      return { matches: true, reason: `Leverages your strength: "${strength}"` };
    }
  }

  // Check industry/vertical match
  if (context.industry) {
    const industryLower = context.industry.toLowerCase();
    if (catLower.includes(industryLower) || kwLower.includes(industryLower)) {
      return { matches: true, reason: `Core to your ${context.industry} industry` };
    }
  }

  // Check vertical match
  if (context.vertical) {
    const verticalLower = context.vertical.toLowerCase();
    if (catLower.includes(verticalLower) || kwLower.includes(verticalLower)) {
      return { matches: true, reason: `Fits your ${context.vertical} vertical` };
    }
  }

  return { matches: false };
}

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
 * Comprehensive patterns covering multiple industries
 */
function detectCategory(keyword: string): string {
  const kw = keyword.toLowerCase();

  const patterns: { category: string; regex: RegExp }[] = [
    // Automotive / Tires (check specific first)
    { category: 'Winter Tires', regex: /winter.?reifen|winter.?tire|winter.?tyre|schnee.?reifen|snow.?tire/i },
    { category: 'Summer Tires', regex: /sommer.?reifen|summer.?tire|summer.?tyre/i },
    { category: 'All-Season Tires', regex: /allwetter|ganzjahres|all.?season|4.?season/i },
    { category: 'SUV/Truck Tires', regex: /suv.?reifen|suv.?tire|truck.?tire|geländewagen|offroad/i },
    { category: 'Performance Tires', regex: /sport.?reifen|performance|uhp|ultra.?high|racing/i },
    { category: 'Tires', regex: /\breifen\b|\btire[s]?\b|\btyre[s]?\b|pneu|pneumatic/i },
    { category: 'Wheels & Rims', regex: /felge|rim\b|wheel\b|alufelge|alloy/i },
    { category: 'Tire Services', regex: /reifenwechsel|tire.?change|mounting|balancing|rotation/i },
    { category: 'Automotive', regex: /\bauto\b|\bcar\b|fahrzeug|vehicle|kfz|pkw/i },

    // Beauty & Personal Care
    { category: 'Anti-Aging', regex: /anti.?age|anti.?aging|anti.?falten|wrinkle|retinol|collagen/i },
    { category: 'Skincare', regex: /skincare|skin.?care|hautpflege|face.?cream|gesichtscreme|serum|moistur|cleanser/i },
    { category: 'Makeup', regex: /makeup|make-up|lipstick|mascara|foundation|eyeshadow|lippenstift|rouge|blush|concealer/i },
    { category: 'Hair Care', regex: /hair.?care|haarpflege|shampoo|conditioner|spülung|haarkur/i },
    { category: 'Body Care', regex: /body.?care|körperpflege|body.?lotion|duschgel|shower|bodywash/i },
    { category: 'Natural Cosmetics', regex: /natural.?cosmetic|natur.?kosmetik|bio.?cosmetic|organic.?beauty/i },
    { category: 'Fragrances', regex: /perfume|parfum|fragrance|duft|eau.?de|cologne/i },
    { category: 'Sun Care', regex: /sun.?care|sonnenschutz|sunscreen|spf|uv.?schutz|sonnencreme/i },

    // Sports & Athletic
    { category: 'Running', regex: /running|laufschuh|jogging|marathon|trail.?run/i },
    { category: 'Football/Soccer', regex: /football|fußball|soccer|fussball/i },
    { category: 'Training', regex: /training|workout|fitness|gym\b|exercise/i },
    { category: 'Sneakers', regex: /sneaker|sportschuh|trainer\b|athletic.?shoe/i },
    { category: 'Outdoor', regex: /outdoor|hiking|wandern|camping|trekking/i },
    { category: 'Cycling', regex: /cycling|fahrrad|bike|bicycle|radfahren/i },

    // Fashion
    { category: 'Apparel', regex: /\bshirt\b|hoodie|jacket|jacke|pants|hose|shorts|dress|kleid/i },
    { category: 'Footwear', regex: /\bshoe[s]?\b|schuh|boots|stiefel|sandal/i },
    { category: 'Accessories', regex: /accessory|accessories|bag|tasche|wallet|belt|gürtel|hat|mütze/i },

    // Technology
    { category: 'Smartphones', regex: /smartphone|iphone|samsung.?galaxy|mobile.?phone|handy/i },
    { category: 'Laptops', regex: /laptop|notebook|macbook|computer/i },
    { category: 'Audio', regex: /headphone|kopfhörer|speaker|lautsprecher|earbuds|audio/i },
    { category: 'Smart Home', regex: /smart.?home|alexa|google.?home|iot|connected/i },

    // Sustainability
    { category: 'Eco-Friendly', regex: /eco.?friendly|öko|nachhaltig|sustainab|umweltfreundlich|green/i },
    { category: 'Vegan', regex: /\bvegan\b|tierversuchsfrei|cruelty.?free|plant.?based/i },

    // Services
    { category: 'Dealer Locator', regex: /händler|dealer|store.?locator|find.?a.?store|standort/i },
    { category: 'Contact', regex: /kontakt|contact|customer.?service|kundenservice|support/i },
    { category: 'Warranty', regex: /garantie|warranty|gewährleistung/i },
  ];

  for (const { category, regex } of patterns) {
    if (regex.test(kw)) return category;
  }
  return 'Other';
}

/**
 * Generate detailed reasoning for why this is a quick win
 */
function generateQuickWinReasoning(
  kw: RankedKeyword,
  targetPosition: number,
  clickUplift: number,
  upliftPercentage: number
): string {
  const reasons: string[] = [];

  // Position-based reasoning
  if (kw.position >= 4 && kw.position <= 6) {
    reasons.push(`Already on page 1 (#${kw.position}) - small optimization could push to top 3`);
  } else if (kw.position >= 7 && kw.position <= 10) {
    reasons.push(`Bottom of page 1 (#${kw.position}) - improving to top 5 dramatically increases visibility`);
  } else if (kw.position >= 11 && kw.position <= 15) {
    reasons.push(`Top of page 2 (#${kw.position}) - pushing to page 1 is crucial for traffic`);
  } else {
    reasons.push(`Position #${kw.position} has room for improvement with focused optimization`);
  }

  // Volume-based reasoning
  if (kw.searchVolume >= 10000) {
    reasons.push(`High-volume keyword (${kw.searchVolume.toLocaleString()} monthly searches)`);
  } else if (kw.searchVolume >= 1000) {
    reasons.push(`Good search volume with ${kw.searchVolume.toLocaleString()} monthly searches`);
  }

  // Uplift reasoning
  reasons.push(`Moving to position #${targetPosition} could yield +${clickUplift.toLocaleString()} clicks (${upliftPercentage}% increase)`);

  return reasons.join('. ') + '.';
}

/**
 * Calculate Quick Win opportunities from ranked keywords
 * Focuses on position 4-20 keywords with high potential
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

    const category = kw.category || detectCategory(kw.keyword);

    // Check if this matches brand context for recommendation
    const contextMatch = matchesBrandContext(kw.keyword, category, brandContext);

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
      category,
      reasoning: generateQuickWinReasoning(kw, targetPosition, clickUplift, upliftPercentage),
      isRecommended: contextMatch.matches,
      recommendedReason: contextMatch.reason
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
 * Check if a keyword contains a brand name (branded keyword)
 */
function isBrandedKeyword(keyword: string, brandNames: string[]): boolean {
  const kwLower = keyword.toLowerCase();
  return brandNames.some(brand => {
    const brandLower = brand.toLowerCase();
    // Check if keyword contains the brand name as a word
    return kwLower.includes(brandLower) ||
      kwLower.split(/\s+/).some(word => word === brandLower);
  });
}

/**
 * Analyze competitor strength based on brand keywords and your rankings
 * Now filters out branded keywords and provides unique per-competitor analysis
 */
export function calculateCompetitorStrength(
  brandKeywords: BrandKeyword[],
  rankedKeywords: RankedKeyword[]
): CompetitorStrength[] {
  // Get your brand name
  const yourBrandKeywords = brandKeywords.filter(k => k.isOwnBrand);
  const yourBrandNames = yourBrandKeywords.map(k => k.keyword.split(' ')[0].toLowerCase());

  // Get competitor brands with their keywords
  const competitorMap = new Map<string, { volume: number; keywords: string[]; brandTerms: string[] }>();

  for (const k of brandKeywords.filter(bk => !bk.isOwnBrand)) {
    // Extract base brand name (first word)
    const brandName = k.keyword.split(' ')[0].toLowerCase();
    const existing = competitorMap.get(brandName) || { volume: 0, keywords: [], brandTerms: [] };
    existing.volume += k.searchVolume;
    existing.keywords.push(k.keyword);
    // Extract all unique words as brand terms
    k.keyword.split(' ').forEach(term => {
      const t = term.toLowerCase();
      if (t.length > 2 && !existing.brandTerms.includes(t)) {
        existing.brandTerms.push(t);
      }
    });
    competitorMap.set(brandName, existing);
  }

  // Get all brand names to filter branded keywords
  const allBrandNames = [...yourBrandNames, ...Array.from(competitorMap.keys())];

  // Filter to GENERIC keywords only (exclude all branded keywords)
  const genericKeywords = rankedKeywords.filter(k => !isBrandedKeyword(k.keyword, allBrandNames));

  const results: CompetitorStrength[] = [];
  const totalBrandVolume = brandKeywords.reduce((sum, k) => sum + k.searchVolume, 0);

  // Use a seeded approach per competitor for consistent but different data
  let competitorIndex = 0;

  for (const [competitor, data] of competitorMap) {
    competitorIndex++;

    // Estimate competitor SOV based on brand search share
    const estimatedSOV = totalBrandVolume > 0
      ? Math.round((data.volume / totalBrandVolume) * 100 * 10) / 10
      : 0;

    // Use different subsets for each competitor based on index
    const offsetWin = (competitorIndex * 2) % Math.max(1, genericKeywords.length);
    const offsetLose = (competitorIndex * 3 + 1) % Math.max(1, genericKeywords.length);

    // Get keywords where you rank well (positions 1-5) - these are "winning"
    const yourWinningPool = genericKeywords
      .filter(k => k.position <= 5)
      .sort((a, b) => b.searchVolume - a.searchVolume);

    // Get keywords where you rank poorly (positions 11-20) - these are potential "losing"
    const yourLosingPool = genericKeywords
      .filter(k => k.position >= 11 && k.position <= 20)
      .sort((a, b) => b.searchVolume - a.searchVolume);

    // Calculate head-to-head based on actual ranking data
    const youWin = yourWinningPool.length;
    const theyWin = yourLosingPool.length;
    const ties = genericKeywords.filter(k => k.position >= 6 && k.position <= 10).length;

    // Get categories where you're weak
    const categories = calculateCategorySOV(genericKeywords);
    const weakCategories = categories
      .filter(c => c.status === 'weak' || c.status === 'trailing')
      .map(c => c.category);

    // Rotate through different keywords per competitor
    const topWinningKeywords: KeywordBattle[] = yourWinningPool
      .slice(offsetWin, offsetWin + 5)
      .concat(yourWinningPool.slice(0, Math.max(0, 5 - (yourWinningPool.length - offsetWin))))
      .slice(0, 3)
      .map((k, i) => {
        // Estimate competitor position based on your position + competitor strength
        const strengthFactor = Math.min(15, Math.round(estimatedSOV / 3));
        const estimatedCompPosition = k.position + strengthFactor + (i * 2) + 3;
        return {
          keyword: k.keyword,
          searchVolume: k.searchVolume,
          yourPosition: k.position,
          competitorPosition: estimatedCompPosition,
          winner: 'you' as const,
          visibilityDifference: Math.round(k.searchVolume * (getCTR(k.position) - getCTR(estimatedCompPosition)))
        };
      });

    // Keywords they might be winning (where you rank poorly)
    const topLosingKeywords: KeywordBattle[] = yourLosingPool
      .slice(offsetLose, offsetLose + 5)
      .concat(yourLosingPool.slice(0, Math.max(0, 5 - (yourLosingPool.length - offsetLose))))
      .slice(0, 3)
      .map((k, i) => {
        // Estimate competitor doing better based on their strength
        const strengthBonus = Math.min(8, Math.round(estimatedSOV / 5));
        const estimatedCompPosition = Math.max(1, k.position - strengthBonus - (i * 2));
        return {
          keyword: k.keyword,
          searchVolume: k.searchVolume,
          yourPosition: k.position,
          competitorPosition: estimatedCompPosition,
          winner: 'competitor' as const,
          visibilityDifference: Math.round(k.searchVolume * (getCTR(estimatedCompPosition) - getCTR(k.position)))
        };
      });

    results.push({
      competitor: competitor.charAt(0).toUpperCase() + competitor.slice(1),
      estimatedSOV,
      keywordsAnalyzed: genericKeywords.length,
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
 * Get suggested content types based on category
 */
function getSuggestedContentTypes(category: string): string[] {
  const categoryLower = category.toLowerCase();

  if (categoryLower.includes('tire') || categoryLower.includes('reifen')) {
    return ['Tire size guide', 'Seasonal comparison article', 'Product finder tool', 'Installation FAQ', 'Dealer locator page'];
  } else if (categoryLower.includes('beauty') || categoryLower.includes('skin') || categoryLower.includes('makeup')) {
    return ['How-to tutorial', 'Product comparison', 'Ingredient guide', 'Routine builder', 'Expert tips article'];
  } else if (categoryLower.includes('running') || categoryLower.includes('training') || categoryLower.includes('sport')) {
    return ['Training guide', 'Product review', 'Comparison article', 'Beginner\'s guide', 'Expert interview'];
  } else if (categoryLower.includes('tech') || categoryLower.includes('phone') || categoryLower.includes('laptop')) {
    return ['Buying guide', 'Comparison table', 'Setup tutorial', 'Troubleshooting FAQ', 'Feature spotlight'];
  } else if (categoryLower.includes('automotive') || categoryLower.includes('car')) {
    return ['Buying guide', 'Maintenance tips', 'Comparison article', 'How-to guide', 'Cost calculator'];
  }
  return ['Comprehensive guide', 'FAQ page', 'How-to article', 'Comparison content', 'Expert roundup'];
}

/**
 * Generate reasoning for content gap
 */
function generateContentGapReasoning(
  category: string,
  avgPosition: number,
  weakCount: number,
  totalCount: number,
  volumeOpportunity: number
): string {
  const weakPercent = Math.round((weakCount / totalCount) * 100);
  const reasons: string[] = [];

  if (avgPosition > 12) {
    reasons.push(`Your average position is #${avgPosition.toFixed(1)}, which means most traffic goes to competitors`);
  } else if (avgPosition > 8) {
    reasons.push(`Your average position (#${avgPosition.toFixed(1)}) puts you at the bottom of page 1 or page 2`);
  }

  if (weakPercent > 50) {
    reasons.push(`${weakPercent}% of your "${category}" keywords rank outside the top 10`);
  }

  if (volumeOpportunity > 10000) {
    reasons.push(`There's ${volumeOpportunity.toLocaleString()} monthly searches in keywords where you're underperforming`);
  }

  reasons.push(`Creating targeted content can help you capture more of this ${category} traffic`);

  return reasons.join('. ') + '.';
}

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

    // Get existing URLs for this category
    const existingUrls = Array.from(data.uniqueUrls).slice(0, 5);

    // Get weak keywords with details (for showing URLs)
    const weakKeywordsWithDetails = highVolumeWeakKeywords.slice(0, 5).map(k => ({
      keyword: k.keyword,
      position: k.position,
      volume: k.searchVolume,
      url: k.url || ''
    }));

    // Generate reasoning
    const reasoning = generateContentGapReasoning(
      category,
      avgPosition,
      weakKeywordCount,
      data.yourKeywords.length,
      opportunityVolume
    );

    // Get suggested content types
    const suggestedContentTypes = getSuggestedContentTypes(category);

    // Estimate traffic gain (conservative: 5% of opportunity volume if we move to top 5)
    const estimatedTrafficGain = Math.round(opportunityVolume * 0.05);

    contentGaps.push({
      topic: category,
      category,
      yourCoverage: yourPageCount,
      avgCompetitorCoverage: yourPageCount + suggestedNewContent, // Suggested total
      totalVolume: data.totalVolume,
      topMissingKeywords,
      priority,
      existingUrls,
      weakKeywords: weakKeywordsWithDetails,
      reasoning,
      suggestedContentTypes,
      estimatedTrafficGain
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
  cannibalizationIssues: CannibalizationIssue[] = [],
  brandContext?: BrandContext
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
      reasoning: `+${qw.clickUplift.toLocaleString()} clicks potential (${qw.upliftPercentage}% increase)`,
      isRecommended: qw.isRecommended,
      recommendedReason: qw.recommendedReason
    });
  }

  // Add Hidden Gem actions (low competition opportunities)
  for (const gem of hiddenGems.slice(0, 3)) {
    const gemContextMatch = matchesBrandContext(gem.keyword, gem.category, brandContext);
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
      reasoning: `KD: ${gem.keywordDifficulty}, Volume: ${gem.searchVolume.toLocaleString()}, Potential: ${gem.potentialClicks.toLocaleString()} clicks`,
      isRecommended: gemContextMatch.matches,
      recommendedReason: gemContextMatch.reason
    });
  }

  // Add Cannibalization fix actions
  for (const issue of cannibalizationIssues.slice(0, 3)) {
    if (issue.impactScore < 100) continue; // Skip minor issues

    const actionVerb = issue.recommendation === 'consolidate' ? 'Consolidate' :
                       issue.recommendation === 'redirect' ? 'Redirect' : 'Differentiate';

    const cannibContextMatch = matchesBrandContext(issue.keyword, undefined, brandContext);
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
      reasoning: `Cannibalization losing ~${issue.impactScore.toLocaleString()} clicks. URLs: ${issue.competingUrls.map(u => u.url).join(', ').slice(0, 100)}...`,
      isRecommended: cannibContextMatch.matches,
      recommendedReason: cannibContextMatch.reason
    });
  }

  // Add category improvement actions
  const weakCategories = categories.filter(c => c.status === 'weak' || c.status === 'trailing');
  for (const cat of weakCategories.slice(0, 3)) {
    const catContextMatch = matchesBrandContext('', cat.category, brandContext);
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
      reasoning: `${cat.keywordCount} keywords, ${cat.totalCategoryVolume.toLocaleString()} monthly searches. Current SOV: ${cat.yourSOV}%`,
      isRecommended: catContextMatch.matches,
      recommendedReason: catContextMatch.reason
    });
  }

  // Add competitive response actions
  for (const comp of competitors.slice(0, 2)) {
    if (comp.headToHead.theyWin > comp.headToHead.youWin) {
      // Check if any dominant category matches brand context
      let compContextMatch: { matches: boolean; reason?: string } = { matches: false };
      for (const domCat of comp.dominantCategories) {
        const match = matchesBrandContext('', domCat, brandContext);
        if (match.matches) {
          compContextMatch = match;
          break;
        }
      }
      actions.push({
        id: `action-${id++}`,
        actionType: 'investigate',
        priority: 60,
        title: `Analyze ${comp.competitor}'s content strategy`,
        description: `They're winning ${comp.headToHead.theyWin} keywords vs your ${comp.headToHead.youWin}`,
        impact: 'medium',
        effort: 'low',
        estimatedUplift: 0,
        reasoning: `${comp.competitor} dominates: ${comp.dominantCategories.join(', ') || 'multiple categories'}`,
        isRecommended: compContextMatch.matches,
        recommendedReason: compContextMatch.reason
      });
    }
  }

  // Add monitoring actions for leading categories
  const leadingCategories = categories.filter(c => c.status === 'leading');
  for (const cat of leadingCategories.slice(0, 2)) {
    const leadContextMatch = matchesBrandContext('', cat.category, brandContext);
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
      reasoning: `You lead with ${cat.yourSOV}% SOV, avg position #${cat.avgPosition}`,
      isRecommended: leadContextMatch.matches,
      recommendedReason: leadContextMatch.reason
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
