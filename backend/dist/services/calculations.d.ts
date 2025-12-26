import { BrandKeyword, RankedKeyword, SOSResult, SOVResult, GrowthGapResult } from '../types/index.js';
export declare function getCTR(position: number): number;
export declare function calculateSOS(brandKeywords: BrandKeyword[]): SOSResult;
export declare function calculateSOV(rankedKeywords: RankedKeyword[]): SOVResult;
export declare function calculateGrowthGap(sos: number, sov: number): GrowthGapResult;
//# sourceMappingURL=calculations.d.ts.map