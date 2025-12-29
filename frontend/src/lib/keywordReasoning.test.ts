import { describe, it, expect } from 'vitest';
import {
  classifyKeywordIntent,
  getFunnelStage,
  analyzeKeyword,
  generateQuickWinReasoning,
  generateHiddenGemReasoning,
  generateCannibalizationReasoning,
  generateCategoryActionReasoning,
  generateCompetitorActionReasoning,
  generateActionTitle,
  generateActionDescription,
} from './keywordReasoning';
import type { QuickWinOpportunity, HiddenGem, CannibalizationIssue, CategorySOV, CompetitorStrength, BrandContext } from '../types';

describe('classifyKeywordIntent', () => {
  it('identifies transactional intent', () => {
    expect(classifyKeywordIntent('buy winter tires')).toBe('transactional');
    expect(classifyKeywordIntent('tires near me')).toBe('transactional');
    expect(classifyKeywordIntent('cheap premium tires')).toBe('transactional');
    expect(classifyKeywordIntent('order tires online')).toBe('transactional');
  });

  it('identifies commercial intent', () => {
    expect(classifyKeywordIntent('best winter tires 2025')).toBe('commercial');
    expect(classifyKeywordIntent('continental vs michelin')).toBe('commercial');
    expect(classifyKeywordIntent('tire review comparison')).toBe('commercial');
    expect(classifyKeywordIntent('top rated all season tires')).toBe('commercial');
  });

  it('identifies informational intent', () => {
    expect(classifyKeywordIntent('how to change tire')).toBe('informational');
    expect(classifyKeywordIntent('what is tire pressure')).toBe('informational');
    expect(classifyKeywordIntent('tire rotation tutorial')).toBe('informational');
  });

  it('identifies navigational intent', () => {
    expect(classifyKeywordIntent('continental login')).toBe('navigational');
    expect(classifyKeywordIntent('contact continental support')).toBe('navigational');
    expect(classifyKeywordIntent('continental official website')).toBe('navigational');
  });

  it('defaults appropriately for ambiguous keywords', () => {
    expect(classifyKeywordIntent('winter tires')).toBe('informational');
    expect(classifyKeywordIntent('tire software')).toBe('commercial');
  });
});

describe('getFunnelStage', () => {
  it('maps intent to correct funnel stage', () => {
    expect(getFunnelStage('how to choose tires')).toBe('awareness');
    expect(getFunnelStage('best winter tires review')).toBe('consideration');
    expect(getFunnelStage('buy continental tires')).toBe('decision');
    expect(getFunnelStage('continental account login')).toBe('retention');
  });
});

describe('analyzeKeyword', () => {
  it('detects long-tail keywords', () => {
    const short = analyzeKeyword('winter tires');
    const long = analyzeKeyword('best winter tires for snow in germany');

    expect(short.isLongTail).toBe(false);
    expect(long.isLongTail).toBe(true);
  });

  it('detects location modifiers', () => {
    expect(analyzeKeyword('tires near me').hasLocationModifier).toBe(true);
    expect(analyzeKeyword('tires in berlin').hasLocationModifier).toBe(true);
    expect(analyzeKeyword('winter tires').hasLocationModifier).toBe(false);
  });

  it('detects temporal modifiers', () => {
    expect(analyzeKeyword('best tires 2025').hasTemporalModifier).toBe(true);
    expect(analyzeKeyword('latest tire technology').hasTemporalModifier).toBe(true);
    expect(analyzeKeyword('winter tires').hasTemporalModifier).toBe(false);
  });

  it('detects price modifiers', () => {
    expect(analyzeKeyword('cheap winter tires').hasPriceModifier).toBe(true);
    expect(analyzeKeyword('premium tires').hasPriceModifier).toBe(true);
    expect(analyzeKeyword('free tire check').hasPriceModifier).toBe(true);
    expect(analyzeKeyword('winter tires').hasPriceModifier).toBe(false);
  });

  it('detects quality modifiers', () => {
    expect(analyzeKeyword('best winter tires').hasQualityModifier).toBe(true);
    expect(analyzeKeyword('top rated tires').hasQualityModifier).toBe(true);
    expect(analyzeKeyword('professional tire service').hasQualityModifier).toBe(true);
  });

  it('estimates competition correctly', () => {
    // High volume, poor position = high competition
    expect(analyzeKeyword('test', 15, 15000).estimatedCompetition).toBe('high');

    // Very good position with low volume = low competition
    expect(analyzeKeyword('test', 2, 400).estimatedCompetition).toBe('low');

    // Moderate = medium
    expect(analyzeKeyword('test', 7, 3000).estimatedCompetition).toBe('medium');
  });
});

describe('generateQuickWinReasoning', () => {
  const baseQuickWin: QuickWinOpportunity = {
    keyword: 'winter tires continental',
    currentPosition: 5,
    targetPosition: 3,
    searchVolume: 5000,
    currentClicks: 200,
    potentialClicks: 450,
    clickUplift: 250,
    upliftPercentage: 125,
    effort: 'low',
    url: '/winter-tires',
    category: 'Automotive',
  };

  it('generates unique reasoning for each keyword', () => {
    const qw1 = { ...baseQuickWin, keyword: 'buy winter tires' };
    const qw2 = { ...baseQuickWin, keyword: 'best winter tires review' };

    const reasoning1 = generateQuickWinReasoning(qw1);
    const reasoning2 = generateQuickWinReasoning(qw2);

    expect(reasoning1).not.toBe(reasoning2);
    expect(reasoning1).toContain('transactional');
    expect(reasoning2).toContain('research mode');
  });

  it('includes position-specific context', () => {
    const topPage1 = { ...baseQuickWin, currentPosition: 5 };
    const bottomPage1 = { ...baseQuickWin, currentPosition: 9 };
    const page2 = { ...baseQuickWin, currentPosition: 12 };

    expect(generateQuickWinReasoning(topPage1)).toContain('page 1');
    expect(generateQuickWinReasoning(bottomPage1)).toContain('bottom of page 1');
    expect(generateQuickWinReasoning(page2)).toContain('page 2');
  });

  it('includes volume-specific context', () => {
    const highVolume = { ...baseQuickWin, searchVolume: 15000 };
    const lowVolume = { ...baseQuickWin, searchVolume: 500 };

    expect(generateQuickWinReasoning(highVolume)).toContain('high-volume');
    expect(generateQuickWinReasoning(lowVolume)).toContain('moderate');
  });

  it('includes effort-specific advice', () => {
    const lowEffort = { ...baseQuickWin, effort: 'low' as const };
    const highEffort = { ...baseQuickWin, effort: 'high' as const };

    expect(generateQuickWinReasoning(lowEffort)).toContain('low-effort');
    expect(generateQuickWinReasoning(highEffort)).toContain('significant effort');
  });

  it('incorporates brand context when provided', () => {
    const brandContext: BrandContext = {
      brandName: 'Continental',
      industry: 'Automotive',
      vertical: 'Tires',
      productCategories: ['Winter Tires', 'Summer Tires'],
      targetAudience: 'Car owners',
      competitorContext: 'Competing with Michelin',
      keyStrengths: ['German engineering'],
      marketPosition: 'Premium',
      seoFocus: ['winter tires', 'premium tires'],
    };

    const reasoning = generateQuickWinReasoning(baseQuickWin, brandContext);
    expect(reasoning).toContain('Continental');
  });
});

describe('generateHiddenGemReasoning', () => {
  const baseGem: HiddenGem = {
    keyword: 'eco friendly tires',
    searchVolume: 2000,
    keywordDifficulty: 25,
    position: 12,
    url: '/eco-tires',
    category: 'Automotive',
    opportunity: 'easy-win',
    potentialClicks: 560,
    reasoning: '',
  };

  it('generates unique reasoning based on opportunity type', () => {
    const easyWin = { ...baseGem, opportunity: 'easy-win' as const };
    const risingTrend = { ...baseGem, opportunity: 'rising-trend' as const };
    const firstMover = { ...baseGem, opportunity: 'first-mover' as const };

    expect(generateHiddenGemReasoning(easyWin)).toContain('low-hanging fruit');
    expect(generateHiddenGemReasoning(risingTrend)).toContain('trending');
    expect(generateHiddenGemReasoning(firstMover)).toContain('not currently ranking');
  });

  it('includes keyword difficulty context', () => {
    const easyKD = { ...baseGem, keywordDifficulty: 15 };
    const moderateKD = { ...baseGem, keywordDifficulty: 30 };

    expect(generateHiddenGemReasoning(easyKD)).toContain('exceptionally achievable');
    expect(generateHiddenGemReasoning(moderateKD)).toContain('accessible');
  });

  it('identifies long-tail keywords', () => {
    const longTail = { ...baseGem, keyword: 'best eco friendly winter tires for electric cars' };
    const reasoning = generateHiddenGemReasoning(longTail);

    expect(reasoning).toContain('long-tail');
  });
});

describe('generateCannibalizationReasoning', () => {
  const baseIssue: CannibalizationIssue = {
    keyword: 'winter tires',
    searchVolume: 10000,
    competingUrls: [
      { url: '/winter-tires', position: 5, visibleVolume: 400 },
      { url: '/seasonal-tires', position: 8, visibleVolume: 250 },
    ],
    recommendation: 'consolidate',
    impactScore: 650,
  };

  it('describes the cannibalization problem', () => {
    const reasoning = generateCannibalizationReasoning(baseIssue);

    expect(reasoning).toContain('2 of your pages');
    expect(reasoning).toContain('competing');
  });

  it('provides recommendation-specific guidance', () => {
    const consolidate = { ...baseIssue, recommendation: 'consolidate' as const };
    const redirect = { ...baseIssue, recommendation: 'redirect' as const };
    const differentiate = { ...baseIssue, recommendation: 'differentiate' as const };

    expect(generateCannibalizationReasoning(consolidate)).toContain('Merge');
    expect(generateCannibalizationReasoning(redirect)).toContain('301 redirects');
    expect(generateCannibalizationReasoning(differentiate)).toContain('Differentiate');
  });

  it('quantifies the impact', () => {
    const highImpact = { ...baseIssue, impactScore: 800 };
    const reasoning = generateCannibalizationReasoning(highImpact);

    expect(reasoning).toContain('800');
    expect(reasoning).toContain('clicks');
  });
});

describe('generateCategoryActionReasoning', () => {
  const baseCategory: CategorySOV = {
    category: 'Winter Tires',
    yourSOV: 15,
    yourVisibleVolume: 1500,
    totalCategoryVolume: 10000,
    keywordCount: 25,
    avgPosition: 7,
    topKeywords: ['winter tires', 'snow tires', 'all-season tires'],
    status: 'competitive',
  };

  it('generates status-specific reasoning', () => {
    const weak = { ...baseCategory, status: 'weak' as const, yourSOV: 3 };
    const leading = { ...baseCategory, status: 'leading' as const, yourSOV: 35 };

    expect(generateCategoryActionReasoning(weak)).toContain('significant room for growth');
    expect(generateCategoryActionReasoning(leading)).toContain('Strong performance');
  });

  it('mentions top keywords', () => {
    const reasoning = generateCategoryActionReasoning(baseCategory);
    expect(reasoning).toContain('winter tires');
  });

  it('includes volume context', () => {
    const highVolume = { ...baseCategory, totalCategoryVolume: 100000 };
    const reasoning = generateCategoryActionReasoning(highVolume);

    expect(reasoning).toContain('strategic priority');
  });
});

describe('generateCompetitorActionReasoning', () => {
  const baseCompetitor: CompetitorStrength = {
    competitor: 'Michelin',
    estimatedSOV: 25,
    keywordsAnalyzed: 50,
    headToHead: { youWin: 15, theyWin: 25, ties: 10 },
    dominantCategories: ['Premium Tires', 'Performance Tires'],
    topWinningKeywords: [
      { keyword: 'eco tires', searchVolume: 3000, yourPosition: 2, competitorPosition: 8, winner: 'you', visibilityDifference: 400 },
    ],
    topLosingKeywords: [
      { keyword: 'performance tires', searchVolume: 8000, yourPosition: 12, competitorPosition: 3, winner: 'competitor', visibilityDifference: -600 },
    ],
  };

  it('summarizes competitive position', () => {
    const reasoning = generateCompetitorActionReasoning(baseCompetitor);

    expect(reasoning).toContain('Michelin');
    expect(reasoning).toContain('15');
    expect(reasoning).toContain('25');
  });

  it('mentions dominant categories', () => {
    const reasoning = generateCompetitorActionReasoning(baseCompetitor);
    expect(reasoning).toContain('Premium Tires');
  });

  it('highlights specific keyword battles', () => {
    const reasoning = generateCompetitorActionReasoning(baseCompetitor);

    expect(reasoning).toContain('performance tires');
    expect(reasoning).toContain('eco tires');
  });
});

describe('generateActionTitle', () => {
  it('creates position-aware titles for optimization', () => {
    expect(generateActionTitle('optimize', 'winter tires', 'Automotive', { position: 4, targetPosition: 3 }))
      .toContain('top 3');

    expect(generateActionTitle('optimize', 'snow tires', 'Automotive', { position: 12, targetPosition: 5 }))
      .toContain('page 1');
  });

  it('creates intent-aware titles for creation', () => {
    expect(generateActionTitle('create', 'buy winter tires', 'Automotive'))
      .toContain('conversion page');

    expect(generateActionTitle('create', 'best winter tires review', 'Automotive'))
      .toContain('comparison');
  });

  it('creates category-aware titles when no keyword', () => {
    expect(generateActionTitle('create', undefined, 'Winter Tires'))
      .toContain('content cluster');

    expect(generateActionTitle('monitor', undefined, 'Premium Tires'))
      .toContain('leadership');
  });
});

describe('generateActionDescription', () => {
  it('creates metric-rich descriptions for optimization', () => {
    const desc = generateActionDescription('optimize', 'winter tires', 'Automotive', {
      currentPosition: 8,
      targetPosition: 3,
      clickUplift: 500,
    });

    expect(desc).toContain('#8');
    expect(desc).toContain('#3');
    expect(desc).toContain('500');
  });

  it('creates volume-aware descriptions for creation', () => {
    const desc = generateActionDescription('create', undefined, 'Winter Tires', {
      volume: 25000,
    });

    expect(desc).toContain('25,000');
  });

  it('creates SOV-aware descriptions for monitoring', () => {
    const desc = generateActionDescription('monitor', undefined, 'Premium Tires', {
      sov: 35,
    });

    expect(desc).toContain('35%');
  });
});
