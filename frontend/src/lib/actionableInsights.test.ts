import { describe, it, expect } from 'vitest';
import {
  calculateQuickWins,
  calculateCategorySOV,
  calculateHiddenGems,
  detectCannibalization,
  analyzeContentGaps,
  generateActionList,
  generateActionableInsights,
} from './actionableInsights';
import type { RankedKeyword, BrandKeyword } from '../types';

// Test fixtures
const createRankedKeyword = (overrides: Partial<RankedKeyword> = {}): RankedKeyword => ({
  keyword: 'test keyword',
  searchVolume: 1000,
  position: 5,
  url: '/test',
  ...overrides,
});

const createBrandKeyword = (overrides: Partial<BrandKeyword> = {}): BrandKeyword => ({
  keyword: 'brand',
  searchVolume: 1000,
  isOwnBrand: true,
  ...overrides,
});

describe('calculateQuickWins', () => {
  it('identifies quick win opportunities for positions 4-20', () => {
    const keywords: RankedKeyword[] = [
      createRankedKeyword({ keyword: 'quick win', position: 5, searchVolume: 5000 }),
      createRankedKeyword({ keyword: 'top 3', position: 2, searchVolume: 5000 }), // Should be excluded
      createRankedKeyword({ keyword: 'too low', position: 25, searchVolume: 5000 }), // Should be excluded
    ];

    const result = calculateQuickWins(keywords);

    expect(result).toHaveLength(1);
    expect(result[0].keyword).toBe('quick win');
    expect(result[0].targetPosition).toBe(3);
  });

  it('filters out low volume keywords', () => {
    const keywords: RankedKeyword[] = [
      createRankedKeyword({ keyword: 'low volume', position: 5, searchVolume: 50 }),
    ];

    const result = calculateQuickWins(keywords, 100);
    expect(result).toHaveLength(0);
  });

  it('calculates click uplift correctly', () => {
    const keywords: RankedKeyword[] = [
      createRankedKeyword({ keyword: 'test', position: 4, searchVolume: 10000 }),
    ];

    const result = calculateQuickWins(keywords);

    expect(result).toHaveLength(1);
    expect(result[0].currentClicks).toBeGreaterThan(0);
    expect(result[0].potentialClicks).toBeGreaterThan(result[0].currentClicks);
    expect(result[0].clickUplift).toBe(result[0].potentialClicks - result[0].currentClicks);
  });

  it('assigns correct effort levels', () => {
    const keywords: RankedKeyword[] = [
      createRankedKeyword({ keyword: 'low effort', position: 4, searchVolume: 5000 }), // 4->3 = low
      createRankedKeyword({ keyword: 'medium effort', position: 8, searchVolume: 5000 }), // 8->5 = low
      createRankedKeyword({ keyword: 'high effort', position: 18, searchVolume: 5000 }), // 18->10 = high
    ];

    const result = calculateQuickWins(keywords);

    const lowEffort = result.find(r => r.keyword === 'low effort');
    const highEffort = result.find(r => r.keyword === 'high effort');

    expect(lowEffort?.effort).toBe('low');
    expect(highEffort?.effort).toBe('high');
  });

  it('sorts by click uplift descending', () => {
    const keywords: RankedKeyword[] = [
      createRankedKeyword({ keyword: 'small', position: 5, searchVolume: 1000 }),
      createRankedKeyword({ keyword: 'large', position: 5, searchVolume: 10000 }),
    ];

    const result = calculateQuickWins(keywords);

    expect(result[0].keyword).toBe('large');
    expect(result[0].clickUplift).toBeGreaterThan(result[1].clickUplift);
  });
});

describe('calculateCategorySOV', () => {
  it('groups keywords by category and calculates SOV', () => {
    const keywords: RankedKeyword[] = [
      createRankedKeyword({ keyword: 'face cream', position: 1, searchVolume: 5000, category: 'skincare' }),
      createRankedKeyword({ keyword: 'moisturizer', position: 3, searchVolume: 3000, category: 'skincare' }),
      createRankedKeyword({ keyword: 'shampoo', position: 2, searchVolume: 4000, category: 'haircare' }),
    ];

    const result = calculateCategorySOV(keywords);

    expect(result.length).toBe(2);

    const skincare = result.find(c => c.category === 'skincare');
    expect(skincare).toBeDefined();
    expect(skincare?.keywordCount).toBe(2);
    expect(skincare?.totalCategoryVolume).toBe(8000);
  });

  it('returns empty array for no keywords', () => {
    const result = calculateCategorySOV([]);
    expect(result).toHaveLength(0);
  });

  it('determines category status correctly', () => {
    const leadingKeywords: RankedKeyword[] = [
      createRankedKeyword({ keyword: 'top keyword', position: 1, searchVolume: 10000, category: 'leading' }),
    ];

    const result = calculateCategorySOV(leadingKeywords);

    expect(result[0].status).toBe('leading');
  });

  it('sorts categories by total volume', () => {
    const keywords: RankedKeyword[] = [
      createRankedKeyword({ keyword: 'small', searchVolume: 1000, category: 'small-cat' }),
      createRankedKeyword({ keyword: 'large', searchVolume: 10000, category: 'large-cat' }),
    ];

    const result = calculateCategorySOV(keywords);

    expect(result[0].category).toBe('large-cat');
  });
});

describe('calculateHiddenGems', () => {
  it('identifies low difficulty, high volume keywords', () => {
    const keywords: RankedKeyword[] = [
      createRankedKeyword({
        keyword: 'hidden gem',
        position: 8,
        searchVolume: 5000,
        keywordDifficulty: 20,
      }),
    ];

    const result = calculateHiddenGems(keywords);

    expect(result).toHaveLength(1);
    expect(result[0].keyword).toBe('hidden gem');
    expect(result[0].keywordDifficulty).toBe(20);
  });

  it('excludes keywords already in top 3', () => {
    const keywords: RankedKeyword[] = [
      createRankedKeyword({
        keyword: 'already winning',
        position: 2,
        searchVolume: 5000,
        keywordDifficulty: 10,
      }),
    ];

    const result = calculateHiddenGems(keywords);
    expect(result).toHaveLength(0);
  });

  it('excludes keywords with high difficulty', () => {
    const keywords: RankedKeyword[] = [
      createRankedKeyword({
        keyword: 'too hard',
        position: 10,
        searchVolume: 5000,
        keywordDifficulty: 80,
      }),
    ];

    const result = calculateHiddenGems(keywords, 200, 40);
    expect(result).toHaveLength(0);
  });

  it('excludes keywords without KD data', () => {
    const keywords: RankedKeyword[] = [
      createRankedKeyword({
        keyword: 'no kd',
        position: 10,
        searchVolume: 5000,
      }),
    ];

    const result = calculateHiddenGems(keywords);
    expect(result).toHaveLength(0);
  });
});

describe('detectCannibalization', () => {
  it('detects when multiple URLs rank for same keyword', () => {
    const keywords: RankedKeyword[] = [
      createRankedKeyword({ keyword: 'shared keyword', position: 5, url: '/page-a' }),
      createRankedKeyword({ keyword: 'shared keyword', position: 12, url: '/page-b' }),
    ];

    const result = detectCannibalization(keywords);

    expect(result).toHaveLength(1);
    expect(result[0].keyword).toBe('shared keyword');
    expect(result[0].competingUrls).toHaveLength(2);
  });

  it('ignores keywords with single URL', () => {
    const keywords: RankedKeyword[] = [
      createRankedKeyword({ keyword: 'single url', position: 5, url: '/page-a' }),
    ];

    const result = detectCannibalization(keywords);
    expect(result).toHaveLength(0);
  });

  it('ignores keywords without URLs', () => {
    const keywords: RankedKeyword[] = [
      createRankedKeyword({ keyword: 'no url', position: 5, url: undefined }),
      createRankedKeyword({ keyword: 'no url', position: 8, url: undefined }),
    ];

    const result = detectCannibalization(keywords);
    expect(result).toHaveLength(0);
  });

  it('provides recommendation based on URL count and position gap', () => {
    const manyUrls: RankedKeyword[] = [
      createRankedKeyword({ keyword: 'many urls', position: 5, url: '/page-a' }),
      createRankedKeyword({ keyword: 'many urls', position: 8, url: '/page-b' }),
      createRankedKeyword({ keyword: 'many urls', position: 12, url: '/page-c' }),
      createRankedKeyword({ keyword: 'many urls', position: 15, url: '/page-d' }),
    ];

    const result = detectCannibalization(manyUrls);

    expect(result[0].recommendation).toBe('consolidate');
  });
});

describe('analyzeContentGaps', () => {
  it('identifies categories with weak performance', () => {
    const keywords: RankedKeyword[] = [
      createRankedKeyword({ keyword: 'weak 1', position: 15, searchVolume: 1000, category: 'weak-category' }),
      createRankedKeyword({ keyword: 'weak 2', position: 18, searchVolume: 1000, category: 'weak-category' }),
      createRankedKeyword({ keyword: 'weak 3', position: 20, searchVolume: 1000, category: 'weak-category' }),
      createRankedKeyword({ keyword: 'weak 4', position: 12, searchVolume: 800, category: 'weak-category' }),
      createRankedKeyword({ keyword: 'weak 5', position: 14, searchVolume: 700, category: 'weak-category' }),
    ];
    const brandKeywords: BrandKeyword[] = [];

    const result = analyzeContentGaps(keywords, brandKeywords);

    expect(result.length).toBeGreaterThan(0);
    const weakCat = result.find(g => g.category === 'weak-category');
    expect(weakCat).toBeDefined();
  });

  it('skips "Other" category', () => {
    const keywords: RankedKeyword[] = [
      createRankedKeyword({ keyword: 'other 1', position: 15, category: 'Other' }),
      createRankedKeyword({ keyword: 'other 2', position: 18, category: 'Other' }),
      createRankedKeyword({ keyword: 'other 3', position: 20, category: 'Other' }),
    ];

    const result = analyzeContentGaps(keywords, []);
    expect(result).toHaveLength(0);
  });
});

describe('generateActionList', () => {
  it('generates actions from quick wins', () => {
    const quickWins = [
      {
        keyword: 'quick win',
        currentPosition: 5,
        targetPosition: 3,
        searchVolume: 5000,
        currentClicks: 200,
        potentialClicks: 450,
        clickUplift: 250,
        upliftPercentage: 125,
        effort: 'low' as const,
        url: '/test',
        category: 'test',
        reasoning: 'Test reasoning',
      },
    ];

    const result = generateActionList(quickWins, [], []);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].actionType).toBe('optimize');
    expect(result[0].keyword).toBe('quick win');
  });

  it('sorts actions by priority', () => {
    const quickWins = [
      {
        keyword: 'low priority',
        currentPosition: 5,
        targetPosition: 3,
        searchVolume: 1000,
        currentClicks: 40,
        potentialClicks: 90,
        clickUplift: 50,
        upliftPercentage: 125,
        effort: 'low' as const,
        url: '/test',
        category: 'test',
        reasoning: 'Test reasoning',
      },
      {
        keyword: 'high priority',
        currentPosition: 5,
        targetPosition: 3,
        searchVolume: 50000,
        currentClicks: 2000,
        potentialClicks: 4500,
        clickUplift: 2500,
        upliftPercentage: 125,
        effort: 'low' as const,
        url: '/test',
        category: 'test',
        reasoning: 'Test reasoning',
      },
    ];

    const result = generateActionList(quickWins, [], []);

    expect(result[0].keyword).toBe('high priority');
  });
});

describe('generateActionableInsights', () => {
  it('generates complete insights from keyword data', () => {
    const rankedKeywords: RankedKeyword[] = [
      createRankedKeyword({ keyword: 'test 1', position: 5, searchVolume: 5000 }),
      createRankedKeyword({ keyword: 'test 2', position: 8, searchVolume: 3000 }),
      createRankedKeyword({ keyword: 'test 3', position: 15, searchVolume: 2000 }),
    ];

    const brandKeywords: BrandKeyword[] = [
      createBrandKeyword({ keyword: 'our brand', searchVolume: 10000, isOwnBrand: true }),
      createBrandKeyword({ keyword: 'competitor', searchVolume: 15000, isOwnBrand: false }),
    ];

    const result = generateActionableInsights(rankedKeywords, brandKeywords);

    expect(result).toHaveProperty('quickWins');
    expect(result).toHaveProperty('categoryBreakdown');
    expect(result).toHaveProperty('competitorStrengths');
    expect(result).toHaveProperty('actionList');
    expect(result).toHaveProperty('hiddenGems');
    expect(result).toHaveProperty('cannibalizationIssues');
    expect(result).toHaveProperty('contentGaps');
    expect(result).toHaveProperty('summary');
  });

  it('handles empty inputs gracefully', () => {
    const result = generateActionableInsights([], []);

    expect(result.quickWins).toHaveLength(0);
    expect(result.categoryBreakdown).toHaveLength(0);
    expect(result.competitorStrengths).toHaveLength(0);
    expect(result.summary.totalQuickWinPotential).toBe(0);
  });

  it('calculates summary correctly', () => {
    const rankedKeywords: RankedKeyword[] = [
      createRankedKeyword({ keyword: 'test', position: 5, searchVolume: 10000 }),
    ];

    const brandKeywords: BrandKeyword[] = [
      createBrandKeyword({ keyword: 'brand', searchVolume: 5000, isOwnBrand: true }),
    ];

    const result = generateActionableInsights(rankedKeywords, brandKeywords);

    expect(typeof result.summary.totalQuickWinPotential).toBe('number');
    expect(typeof result.summary.strongCategories).toBe('number');
    expect(typeof result.summary.weakCategories).toBe('number');
  });
});
