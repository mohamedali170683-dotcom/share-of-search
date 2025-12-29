import type { BrandContext, QuickWinOpportunity, HiddenGem, CannibalizationIssue, CategorySOV, CompetitorStrength } from '../types';

/**
 * Keyword Intent Classification
 * Determines the user's search intent based on keyword patterns
 */
export type KeywordIntent =
  | 'navigational'      // Looking for specific brand/site
  | 'informational'     // Seeking information/answers
  | 'commercial'        // Researching before purchase
  | 'transactional';    // Ready to buy/convert

/**
 * Keyword modifiers that indicate intent
 */
const INTENT_PATTERNS = {
  transactional: [
    /\b(buy|purchase|order|shop|deal|discount|coupon|price|cheap|affordable|sale|offer)\b/i,
    /\b(near me|delivery|shipping|store|outlet)\b/i,
    /\b(online|subscribe|download|get|hire)\b/i,
  ],
  commercial: [
    /\b(best|top|review|compare|comparison|vs|versus|alternative)\b/i,
    /\b(recommended|rating|rated|guide|tips)\b/i,
    /\b(pros|cons|features|benefits|worth)\b/i,
  ],
  informational: [
    /\b(how|what|why|when|where|who|which|can|does|is|are)\b/i,
    /\b(tutorial|guide|learn|example|definition|meaning)\b/i,
    /\b(tips|ideas|ways|steps|process)\b/i,
  ],
  navigational: [
    /\b(login|signin|sign in|account|portal|dashboard)\b/i,
    /\b(contact|support|help|customer service)\b/i,
    /\b(official|website|site|app)\b/i,
  ],
};

/**
 * Funnel stage based on intent
 */
export type FunnelStage = 'awareness' | 'consideration' | 'decision' | 'retention';

const INTENT_TO_FUNNEL: Record<KeywordIntent, FunnelStage> = {
  informational: 'awareness',
  commercial: 'consideration',
  transactional: 'decision',
  navigational: 'retention',
};

/**
 * Classify keyword intent
 */
export function classifyKeywordIntent(keyword: string): KeywordIntent {
  const kw = keyword.toLowerCase();

  // Check patterns in order of specificity
  for (const pattern of INTENT_PATTERNS.transactional) {
    if (pattern.test(kw)) return 'transactional';
  }
  for (const pattern of INTENT_PATTERNS.commercial) {
    if (pattern.test(kw)) return 'commercial';
  }
  for (const pattern of INTENT_PATTERNS.navigational) {
    if (pattern.test(kw)) return 'navigational';
  }
  for (const pattern of INTENT_PATTERNS.informational) {
    if (pattern.test(kw)) return 'informational';
  }

  // Default: informational for generic keywords, commercial for product-like keywords
  if (/\b(product|service|solution|software|tool|system|platform)\b/i.test(kw)) {
    return 'commercial';
  }

  return 'informational';
}

/**
 * Get funnel stage from keyword
 */
export function getFunnelStage(keyword: string): FunnelStage {
  return INTENT_TO_FUNNEL[classifyKeywordIntent(keyword)];
}

/**
 * Extract key characteristics from a keyword
 */
interface KeywordCharacteristics {
  intent: KeywordIntent;
  funnelStage: FunnelStage;
  isLongTail: boolean;
  hasLocationModifier: boolean;
  hasTemporalModifier: boolean;
  hasPriceModifier: boolean;
  hasQualityModifier: boolean;
  wordCount: number;
  estimatedCompetition: 'low' | 'medium' | 'high';
}

export function analyzeKeyword(keyword: string, position?: number, volume?: number): KeywordCharacteristics {
  const kw = keyword.toLowerCase();
  const words = kw.split(/\s+/).filter(Boolean);

  return {
    intent: classifyKeywordIntent(kw),
    funnelStage: getFunnelStage(kw),
    isLongTail: words.length >= 4,
    hasLocationModifier: /\b(near me|in \w+|local|\w+ city|\w+ state)\b/i.test(kw),
    hasTemporalModifier: /\b(2024|2025|new|latest|current|today|now)\b/i.test(kw),
    hasPriceModifier: /\b(cheap|affordable|budget|premium|luxury|expensive|free)\b/i.test(kw),
    hasQualityModifier: /\b(best|top|professional|quality|reliable|trusted)\b/i.test(kw),
    wordCount: words.length,
    estimatedCompetition: estimateCompetition(position, volume),
  };
}

function estimateCompetition(position?: number, volume?: number): 'low' | 'medium' | 'high' {
  if (!position || !volume) return 'medium';

  // High volume + poor position = high competition
  if (volume > 10000 && position > 10) return 'high';
  if (volume > 5000 && position > 15) return 'high';

  // Good position with decent volume = managed competition
  if (position <= 5 && volume > 1000) return 'medium';

  // Low volume or excellent position = low competition
  if (volume < 500 || position <= 3) return 'low';

  return 'medium';
}

/**
 * Generate unique, keyword-specific reasoning for quick wins
 */
export function generateQuickWinReasoning(
  qw: QuickWinOpportunity,
  brandContext?: BrandContext
): string {
  const chars = analyzeKeyword(qw.keyword, qw.currentPosition, qw.searchVolume);
  const parts: string[] = [];

  // Opening: Position-specific opportunity
  if (qw.currentPosition >= 4 && qw.currentPosition <= 6) {
    parts.push(`"${qw.keyword}" is already visible on page 1 at position #${qw.currentPosition}, putting you within striking distance of the high-traffic top 3 spots.`);
  } else if (qw.currentPosition >= 7 && qw.currentPosition <= 10) {
    parts.push(`At position #${qw.currentPosition}, "${qw.keyword}" sits at the bottom of page 1 where click-through rates drop significantly—moving up would capture users who rarely scroll.`);
  } else if (qw.currentPosition >= 11 && qw.currentPosition <= 15) {
    parts.push(`"${qw.keyword}" ranks on page 2 at #${qw.currentPosition}. Since 75% of users never visit page 2, breaking onto page 1 is essential for visibility.`);
  } else {
    parts.push(`"${qw.keyword}" at position #${qw.currentPosition} has significant room for improvement with focused optimization.`);
  }

  // Intent-based strategic value
  const intentExplanations: Record<KeywordIntent, string> = {
    transactional: `This is a high-intent transactional keyword—users searching "${qw.keyword}" are ready to take action. Winning this term directly impacts conversions and revenue.`,
    commercial: `Users searching "${qw.keyword}" are in research mode, comparing options before deciding. Visibility here positions ${brandContext?.brandName || 'your brand'} as a top contender during their evaluation.`,
    informational: `"${qw.keyword}" attracts users early in their journey seeking answers. Ranking well builds brand awareness and establishes ${brandContext?.brandName || 'you'} as a trusted authority.`,
    navigational: `This navigational search indicates brand awareness. Ensuring strong visibility protects your brand presence and captures users actively seeking ${brandContext?.brandName || 'your brand'}.`,
  };
  parts.push(intentExplanations[chars.intent]);

  // Volume-specific impact
  if (qw.searchVolume >= 10000) {
    parts.push(`With ${qw.searchVolume.toLocaleString()} monthly searches, this is a high-volume opportunity—moving from #${qw.currentPosition} to #${qw.targetPosition} would capture an estimated +${qw.clickUplift.toLocaleString()} additional clicks monthly.`);
  } else if (qw.searchVolume >= 3000) {
    parts.push(`The ${qw.searchVolume.toLocaleString()} monthly searches represent solid demand. The position improvement would deliver approximately +${qw.clickUplift.toLocaleString()} more clicks.`);
  } else {
    parts.push(`While the search volume of ${qw.searchVolume.toLocaleString()} is moderate, the ${qw.upliftPercentage}% traffic increase (+${qw.clickUplift.toLocaleString()} clicks) makes this worthwhile, especially given the ${qw.effort} effort required.`);
  }

  // Effort-specific tactical advice
  if (qw.effort === 'low') {
    parts.push(`This is a low-effort win: minor on-page optimizations like improving title tags, meta descriptions, or internal linking to "${qw.url || 'the ranking page'}" should be enough to gain positions.`);
  } else if (qw.effort === 'medium') {
    parts.push(`Achieving this requires moderate effort: consider content enhancements, adding relevant sections, improving page speed, or earning a few quality backlinks.`);
  } else {
    parts.push(`This will require significant effort: substantial content improvements, comprehensive link building, and possibly creating supporting content to build topical authority.`);
  }

  // Category/industry context
  if (qw.category && brandContext?.industry) {
    parts.push(`In the ${brandContext.industry} space, the "${qw.category}" category is ${chars.estimatedCompetition === 'high' ? 'highly competitive' : chars.estimatedCompetition === 'medium' ? 'moderately competitive' : 'relatively accessible'}, making this ${qw.effort === 'low' ? 'an efficient win' : 'a strategic priority'}.`);
  }

  return parts.join(' ');
}

/**
 * Generate unique reasoning for hidden gems
 */
export function generateHiddenGemReasoning(
  gem: HiddenGem,
  brandContext?: BrandContext
): string {
  const chars = analyzeKeyword(gem.keyword, gem.position || undefined, gem.searchVolume);
  const parts: string[] = [];

  // Opening based on opportunity type
  if (gem.opportunity === 'rising-trend') {
    parts.push(`"${gem.keyword}" is trending upward, indicating growing market interest. Early positioning on emerging terms often yields long-term traffic gains before competition intensifies.`);
  } else if (gem.opportunity === 'first-mover') {
    parts.push(`You're not currently ranking for "${gem.keyword}", but the low keyword difficulty (${gem.keywordDifficulty}/100) makes this achievable. First-mover advantage in underserved niches compounds over time.`);
  } else {
    parts.push(`"${gem.keyword}" at position #${gem.position} with a keyword difficulty of only ${gem.keywordDifficulty}/100 represents a classic low-hanging fruit opportunity.`);
  }

  // Intent-specific value proposition
  if (chars.intent === 'transactional') {
    parts.push(`As a transactional keyword, ranking for "${gem.keyword}" directly captures users ready to convert, making the potential ${gem.potentialClicks.toLocaleString()} clicks particularly valuable.`);
  } else if (chars.intent === 'commercial') {
    parts.push(`This commercial-intent keyword reaches users actively evaluating options—the ${gem.searchVolume.toLocaleString()} monthly searches represent qualified prospects comparing solutions.`);
  } else if (chars.intent === 'informational') {
    parts.push(`Informational keywords like this build your content foundation. The ${gem.searchVolume.toLocaleString()} searchers seeking answers can become loyal followers when you provide value.`);
  }

  // Long-tail specific insight
  if (chars.isLongTail) {
    parts.push(`As a long-tail keyword (${chars.wordCount} words), "${gem.keyword}" signals specific user intent. Long-tail terms typically convert better than broad head terms despite lower volume.`);
  }

  // Difficulty context
  if (gem.keywordDifficulty <= 20) {
    parts.push(`With a keyword difficulty of ${gem.keywordDifficulty}, this is exceptionally achievable—well-optimized content can rank within weeks rather than months.`);
  } else if (gem.keywordDifficulty <= 35) {
    parts.push(`The keyword difficulty of ${gem.keywordDifficulty} is accessible. Quality content with modest link building should achieve strong rankings.`);
  }

  // Brand fit
  if (brandContext?.productCategories && gem.category) {
    const categoryMatch = brandContext.productCategories.some(
      cat => cat.toLowerCase().includes(gem.category?.toLowerCase() || '') ||
             gem.category?.toLowerCase().includes(cat.toLowerCase())
    );
    if (categoryMatch) {
      parts.push(`This keyword aligns directly with ${brandContext.brandName}'s ${gem.category} offerings, ensuring content naturally showcases your expertise.`);
    }
  }

  return parts.join(' ');
}

/**
 * Generate unique reasoning for cannibalization issues
 */
export function generateCannibalizationReasoning(
  issue: CannibalizationIssue,
  _brandContext?: BrandContext
): string {
  const urlCount = issue.competingUrls.length;
  const positions = issue.competingUrls.map(u => u.position).sort((a, b) => a - b);
  const parts: string[] = [];

  // Problem statement
  parts.push(`${urlCount} of your pages are competing for "${issue.keyword}", diluting your ranking potential. Google may struggle to determine which page to rank, weakening all of them.`);

  // Position spread analysis
  const positionSpread = positions[positions.length - 1] - positions[0];
  if (positionSpread <= 5) {
    parts.push(`Your competing pages are clustered at positions ${positions.join(', ')}—they're essentially fighting each other instead of outranking competitors.`);
  } else {
    parts.push(`The position spread from #${positions[0]} to #${positions[positions.length - 1]} shows inconsistent signals to search engines about which page deserves to rank.`);
  }

  // Impact quantification
  if (issue.impactScore > 500) {
    parts.push(`This cannibalization costs you an estimated ${issue.impactScore.toLocaleString()} clicks monthly. Consolidating authority into a single page could recover most of this traffic.`);
  } else if (issue.impactScore > 100) {
    parts.push(`The estimated ${issue.impactScore.toLocaleString()} lost clicks justify addressing this issue, especially if the fix is straightforward.`);
  }

  // Recommendation-specific guidance
  if (issue.recommendation === 'consolidate') {
    parts.push(`Recommendation: Merge these ${urlCount} pages into a comprehensive resource. Consolidating content signals clear topical authority and concentrates backlink equity.`);
    parts.push(`Choose the strongest-performing URL as the canonical version and redirect the others.`);
  } else if (issue.recommendation === 'redirect') {
    parts.push(`Recommendation: Implement 301 redirects from weaker pages to your strongest-ranking URL for "${issue.keyword}". This transfers link equity and eliminates competition.`);
  } else {
    parts.push(`Recommendation: Differentiate each page's target intent. Ensure each URL targets a distinct variation or sub-topic of "${issue.keyword}" to avoid overlap.`);
    parts.push(`Update titles, H1s, and content focus so Google understands each page's unique purpose.`);
  }

  return parts.join(' ');
}

/**
 * Generate reasoning for category/content gap actions
 */
export function generateCategoryActionReasoning(
  category: CategorySOV,
  brandContext?: BrandContext
): string {
  const parts: string[] = [];

  // Status-specific opening
  if (category.status === 'weak') {
    parts.push(`Your ${category.yourSOV}% share of voice in "${category.category}" indicates significant room for growth. With ${category.totalCategoryVolume.toLocaleString()} monthly searches in this category, improving visibility could drive substantial traffic.`);
  } else if (category.status === 'trailing') {
    parts.push(`"${category.category}" shows moderate presence at ${category.yourSOV}% SOV, but the average position of #${category.avgPosition} suggests you're not capturing optimal traffic from the ${category.totalCategoryVolume.toLocaleString()} monthly searches.`);
  } else if (category.status === 'competitive') {
    parts.push(`You're competitive in "${category.category}" with ${category.yourSOV}% SOV across ${category.keywordCount} keywords. Strategic optimization could establish clear category leadership.`);
  } else {
    parts.push(`Strong performance in "${category.category}" with ${category.yourSOV}% SOV and #${category.avgPosition} average position. Focus on defending this position while expanding into related subtopics.`);
  }

  // Keyword concentration insight
  if (category.topKeywords.length > 0) {
    const topKeywordsStr = category.topKeywords.slice(0, 3).join('", "');
    parts.push(`Key opportunities include "${topKeywordsStr}"—${category.status === 'weak' || category.status === 'trailing' ? 'targeting these would accelerate category growth' : 'maintaining strong positions on these protects your category lead'}.`);
  }

  // Volume-based priority
  if (category.totalCategoryVolume > 50000) {
    parts.push(`The high volume in this category (${category.totalCategoryVolume.toLocaleString()} searches/month) makes it a strategic priority for content investment.`);
  } else if (category.totalCategoryVolume > 10000) {
    parts.push(`With ${category.totalCategoryVolume.toLocaleString()} monthly searches, this category offers meaningful traffic potential worth the optimization effort.`);
  }

  // Brand alignment
  if (brandContext?.productCategories) {
    const isCoreCat = brandContext.productCategories.some(
      cat => cat.toLowerCase().includes(category.category.toLowerCase()) ||
             category.category.toLowerCase().includes(cat.toLowerCase())
    );
    if (isCoreCat) {
      parts.push(`This aligns with ${brandContext.brandName}'s core offerings, making strong visibility essential for brand credibility.`);
    }
  }

  return parts.join(' ');
}

/**
 * Generate reasoning for competitor-related actions
 */
export function generateCompetitorActionReasoning(
  competitor: CompetitorStrength,
  _brandContext?: BrandContext
): string {
  const parts: string[] = [];
  const netResult = competitor.headToHead.youWin - competitor.headToHead.theyWin;

  // Competitive position summary
  if (netResult > 5) {
    parts.push(`You're outperforming ${competitor.competitor} overall, winning ${competitor.headToHead.youWin} keyword battles versus their ${competitor.headToHead.theyWin}. However, analyzing their wins reveals defensive opportunities.`);
  } else if (netResult < -5) {
    parts.push(`${competitor.competitor} currently dominates your shared keyword space, winning ${competitor.headToHead.theyWin} terms to your ${competitor.headToHead.youWin}. Understanding their strategy is critical for closing this gap.`);
  } else {
    parts.push(`You and ${competitor.competitor} are closely matched with ${competitor.headToHead.youWin} vs ${competitor.headToHead.theyWin} keyword wins. Small improvements could tip the competitive balance in your favor.`);
  }

  // Their estimated strength
  parts.push(`With an estimated ${competitor.estimatedSOV}% share of voice based on brand search volume, ${competitor.competitor} represents ${competitor.estimatedSOV > 20 ? 'a major' : competitor.estimatedSOV > 10 ? 'a significant' : 'a notable'} competitive presence.`);

  // Category dominance insight
  if (competitor.dominantCategories.length > 0) {
    const cats = competitor.dominantCategories.slice(0, 3).join('", "');
    parts.push(`They particularly dominate in "${cats}"—consider whether to compete directly or differentiate by focusing on adjacent categories where you can establish leadership.`);
  }

  // Specific keyword insights
  if (competitor.topLosingKeywords.length > 0) {
    const topLoss = competitor.topLosingKeywords[0];
    parts.push(`Your biggest competitive loss is "${topLoss.keyword}" (${topLoss.searchVolume.toLocaleString()} volume) where you rank #${topLoss.yourPosition} versus their #${topLoss.competitorPosition}.`);
  }

  if (competitor.topWinningKeywords.length > 0) {
    const topWin = competitor.topWinningKeywords[0];
    parts.push(`Protect your advantage on "${topWin.keyword}" where your #${topWin.yourPosition} position outranks their #${topWin.competitorPosition}.`);
  }

  return parts.join(' ');
}

/**
 * Generate a unique action title that includes keyword-specific context
 */
export function generateActionTitle(
  actionType: 'optimize' | 'create' | 'monitor' | 'investigate',
  keyword?: string,
  category?: string,
  context?: { position?: number; targetPosition?: number }
): string {
  if (!keyword && !category) {
    return actionType === 'optimize' ? 'Optimize existing content' :
           actionType === 'create' ? 'Create new content' :
           actionType === 'monitor' ? 'Monitor performance' :
           'Investigate opportunity';
  }

  if (keyword) {
    const chars = analyzeKeyword(keyword);

    if (actionType === 'optimize' && context?.position && context?.targetPosition) {
      const positionGap = context.position - context.targetPosition;
      if (positionGap <= 3) {
        return `Push "${keyword}" into top ${context.targetPosition}`;
      } else if (context.position > 10) {
        return `Move "${keyword}" to page 1`;
      } else {
        return `Boost "${keyword}" from #${context.position} to #${context.targetPosition}`;
      }
    }

    if (actionType === 'create') {
      if (chars.intent === 'transactional') {
        return `Create conversion page for "${keyword}"`;
      } else if (chars.intent === 'commercial') {
        return `Build comparison/guide for "${keyword}"`;
      } else {
        return `Develop content targeting "${keyword}"`;
      }
    }

    return `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} "${keyword}"`;
  }

  if (category) {
    if (actionType === 'create') {
      return `Build content cluster for ${category}`;
    } else if (actionType === 'monitor') {
      return `Protect ${category} leadership`;
    } else if (actionType === 'optimize') {
      return `Strengthen ${category} presence`;
    }
  }

  return `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} ${category || keyword}`;
}

/**
 * Generate action description based on specific context
 */
export function generateActionDescription(
  actionType: 'optimize' | 'create' | 'monitor' | 'investigate',
  keyword?: string,
  category?: string,
  metrics?: {
    currentPosition?: number;
    targetPosition?: number;
    clickUplift?: number;
    volume?: number;
    sov?: number;
  }
): string {
  if (actionType === 'optimize' && keyword && metrics?.currentPosition && metrics?.targetPosition) {
    return `Improve from #${metrics.currentPosition} to #${metrics.targetPosition} (+${metrics.clickUplift?.toLocaleString() || '?'} clicks potential)`;
  }

  if (actionType === 'create' && category) {
    return `Expand ${category} coverage to capture ${metrics?.volume?.toLocaleString() || 'additional'} monthly searches`;
  }

  if (actionType === 'monitor' && category && metrics?.sov) {
    return `Maintain ${metrics.sov}% SOV leadership and track competitor movements`;
  }

  if (actionType === 'investigate') {
    return `Analyze competitive landscape and identify strategic opportunities`;
  }

  return `Take action on ${keyword || category || 'opportunity'}`;
}
