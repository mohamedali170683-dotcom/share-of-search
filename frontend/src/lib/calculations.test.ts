import { describe, it, expect } from 'vitest';
import {
  getCTR,
  calculateSOS,
  calculateSOV,
  calculateGrowthGap,
  SAMPLE_BRAND_KEYWORDS,
  SAMPLE_RANKED_KEYWORDS,
} from './calculations';
import type { BrandKeyword, RankedKeyword } from '../types';

describe('getCTR', () => {
  it('returns 0 for position 0 or negative', () => {
    expect(getCTR(0)).toBe(0);
    expect(getCTR(-1)).toBe(0);
    expect(getCTR(-100)).toBe(0);
  });

  it('returns expected CTR for positions 1-10', () => {
    expect(getCTR(1)).toBe(0.28);
    expect(getCTR(2)).toBe(0.15);
    expect(getCTR(3)).toBe(0.09);
    expect(getCTR(4)).toBe(0.06);
    expect(getCTR(5)).toBe(0.04);
    expect(getCTR(10)).toBe(0.015);
  });

  it('returns default CTR for positions > 20', () => {
    expect(getCTR(21)).toBe(0.001);
    expect(getCTR(50)).toBe(0.001);
    expect(getCTR(100)).toBe(0.001);
  });
});

describe('calculateSOS', () => {
  it('calculates share of search correctly with sample data', () => {
    const result = calculateSOS(SAMPLE_BRAND_KEYWORDS);

    // Own brand volume: 12100 + 1300 + 480 = 13880
    // Total volume: 12100 + 1300 + 480 + 18100 + 14800 + 5400 + 27100 = 79280
    // SOS: (13880 / 79280) * 100 = 17.5%
    expect(result.brandVolume).toBe(13880);
    expect(result.totalBrandVolume).toBe(79280);
    expect(result.shareOfSearch).toBe(17.5);
  });

  it('returns 0 when no keywords provided', () => {
    const result = calculateSOS([]);
    expect(result.shareOfSearch).toBe(0);
    expect(result.brandVolume).toBe(0);
    expect(result.totalBrandVolume).toBe(0);
  });

  it('returns 100% when all keywords are own brand', () => {
    const allOwnBrand: BrandKeyword[] = [
      { keyword: 'brand a', searchVolume: 1000, isOwnBrand: true },
      { keyword: 'brand b', searchVolume: 2000, isOwnBrand: true },
    ];
    const result = calculateSOS(allOwnBrand);
    expect(result.shareOfSearch).toBe(100);
  });

  it('returns 0% when no keywords are own brand', () => {
    const noOwnBrand: BrandKeyword[] = [
      { keyword: 'competitor a', searchVolume: 1000, isOwnBrand: false },
      { keyword: 'competitor b', searchVolume: 2000, isOwnBrand: false },
    ];
    const result = calculateSOS(noOwnBrand);
    expect(result.shareOfSearch).toBe(0);
    expect(result.brandVolume).toBe(0);
  });
});

describe('calculateSOV', () => {
  it('calculates share of voice correctly with sample data', () => {
    const result = calculateSOV(SAMPLE_RANKED_KEYWORDS);

    expect(result.totalMarketVolume).toBe(46580);
    expect(result.visibleVolume).toBeGreaterThan(0);
    expect(result.shareOfVoice).toBeGreaterThan(0);
    expect(result.keywordBreakdown).toHaveLength(10);
  });

  it('returns 0 when no keywords provided', () => {
    const result = calculateSOV([]);
    expect(result.shareOfVoice).toBe(0);
    expect(result.visibleVolume).toBe(0);
    expect(result.totalMarketVolume).toBe(0);
    expect(result.keywordBreakdown).toHaveLength(0);
  });

  it('calculates higher visible volume for position 1 vs position 10', () => {
    const pos1Keyword: RankedKeyword[] = [
      { keyword: 'test', searchVolume: 1000, position: 1, url: '/test' },
    ];
    const pos10Keyword: RankedKeyword[] = [
      { keyword: 'test', searchVolume: 1000, position: 10, url: '/test' },
    ];

    const result1 = calculateSOV(pos1Keyword);
    const result10 = calculateSOV(pos10Keyword);

    expect(result1.visibleVolume).toBeGreaterThan(result10.visibleVolume);
  });

  it('includes CTR in keyword breakdown', () => {
    const keywords: RankedKeyword[] = [
      { keyword: 'test', searchVolume: 1000, position: 1, url: '/test' },
    ];
    const result = calculateSOV(keywords);

    expect(result.keywordBreakdown[0].ctr).toBe(28); // 0.28 * 100, rounded
  });
});

describe('calculateGrowthGap', () => {
  it('identifies growth potential when SOV > SOS by more than threshold', () => {
    const result = calculateGrowthGap(20, 30);
    expect(result.interpretation).toBe('growth_potential');
    expect(result.gap).toBe(10);
  });

  it('identifies missing opportunities when SOS > SOV by more than threshold', () => {
    const result = calculateGrowthGap(30, 20);
    expect(result.interpretation).toBe('missing_opportunities');
    expect(result.gap).toBe(-10);
  });

  it('identifies balanced when gap is within threshold', () => {
    const result = calculateGrowthGap(25, 26);
    expect(result.interpretation).toBe('balanced');
    expect(result.gap).toBe(1);
  });

  it('handles edge cases at threshold boundaries', () => {
    // Exactly at threshold should be balanced
    expect(calculateGrowthGap(20, 22).interpretation).toBe('balanced');
    expect(calculateGrowthGap(22, 20).interpretation).toBe('balanced');

    // Just over threshold
    expect(calculateGrowthGap(20, 22.1).interpretation).toBe('growth_potential');
    expect(calculateGrowthGap(22.1, 20).interpretation).toBe('missing_opportunities');
  });

  it('handles zero values', () => {
    const result = calculateGrowthGap(0, 0);
    expect(result.interpretation).toBe('balanced');
    expect(result.gap).toBe(0);
  });

  it('rounds gap to one decimal place', () => {
    const result = calculateGrowthGap(10.333, 15.666);
    expect(result.gap).toBe(5.3);
  });
});
