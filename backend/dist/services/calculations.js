"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCTR = getCTR;
exports.calculateSOS = calculateSOS;
exports.calculateSOV = calculateSOV;
exports.calculateGrowthGap = calculateGrowthGap;
// CTR curve based on SERP position
const CTR_CURVE = {
    1: 0.28,
    2: 0.15,
    3: 0.09,
    4: 0.06,
    5: 0.04,
    6: 0.03,
    7: 0.025,
    8: 0.02,
    9: 0.018,
    10: 0.015,
    11: 0.012,
    12: 0.01,
    13: 0.009,
    14: 0.008,
    15: 0.007,
    16: 0.006,
    17: 0.005,
    18: 0.004,
    19: 0.003,
    20: 0.002
};
function getCTR(position) {
    if (position <= 0)
        return 0;
    if (position > 20)
        return 0.001;
    return CTR_CURVE[position] || 0.001;
}
// Calculate Share of Search
function calculateSOS(brandKeywords) {
    const brandVolume = brandKeywords
        .filter(k => k.isOwnBrand)
        .reduce((sum, k) => sum + k.searchVolume, 0);
    const totalBrandVolume = brandKeywords
        .reduce((sum, k) => sum + k.searchVolume, 0);
    const shareOfSearch = totalBrandVolume > 0
        ? (brandVolume / totalBrandVolume) * 100
        : 0;
    return {
        shareOfSearch: Math.round(shareOfSearch * 10) / 10,
        brandVolume,
        totalBrandVolume
    };
}
// Calculate Share of Voice
function calculateSOV(rankedKeywords) {
    const keywordBreakdown = rankedKeywords.map(kw => {
        const ctr = getCTR(kw.position);
        const visibleVolume = kw.searchVolume * ctr;
        return {
            ...kw,
            ctr: Math.round(ctr * 1000) / 10, // Convert to percentage with 1 decimal
            visibleVolume: Math.round(visibleVolume)
        };
    });
    const visibleVolume = keywordBreakdown.reduce((sum, k) => sum + (k.visibleVolume || 0), 0);
    const totalMarketVolume = rankedKeywords.reduce((sum, k) => sum + k.searchVolume, 0);
    const shareOfVoice = totalMarketVolume > 0
        ? (visibleVolume / totalMarketVolume) * 100
        : 0;
    return {
        shareOfVoice: Math.round(shareOfVoice * 10) / 10,
        visibleVolume: Math.round(visibleVolume),
        totalMarketVolume,
        keywordBreakdown
    };
}
// Calculate Growth Gap
function calculateGrowthGap(sos, sov) {
    const gap = sov - sos;
    let interpretation;
    if (gap > 2)
        interpretation = 'growth_potential';
    else if (gap < -2)
        interpretation = 'missing_opportunities';
    else
        interpretation = 'balanced';
    return { gap: Math.round(gap * 10) / 10, interpretation };
}
//# sourceMappingURL=calculations.js.map