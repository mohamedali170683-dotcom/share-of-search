"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dataforseo_js_1 = require("../services/dataforseo.js");
const calculations_js_1 = require("../services/calculations.js");
const router = (0, express_1.Router)();
// Sample test data
const SAMPLE_BRAND_KEYWORDS = [
    { keyword: 'lavera', searchVolume: 12100, isOwnBrand: true },
    { keyword: 'lavera naturkosmetik', searchVolume: 1300, isOwnBrand: true },
    { keyword: 'lavera lippenstift', searchVolume: 480, isOwnBrand: true },
    { keyword: 'weleda', searchVolume: 18100, isOwnBrand: false },
    { keyword: 'dr hauschka', searchVolume: 14800, isOwnBrand: false },
    { keyword: 'annemarie börlind', searchVolume: 5400, isOwnBrand: false },
    { keyword: 'alverde', searchVolume: 27100, isOwnBrand: false },
];
const SAMPLE_RANKED_KEYWORDS = [
    { keyword: 'naturkosmetik', searchVolume: 22200, position: 4, url: '/naturkosmetik' },
    { keyword: 'bio gesichtscreme', searchVolume: 3600, position: 2, url: '/gesichtspflege' },
    { keyword: 'vegane kosmetik', searchVolume: 4400, position: 3, url: '/vegan' },
    { keyword: 'natürliche hautpflege', searchVolume: 2900, position: 1, url: '/hautpflege' },
    { keyword: 'bio lippenstift', searchVolume: 1900, position: 5, url: '/lippen' },
    { keyword: 'naturkosmetik gesicht', searchVolume: 2400, position: 6, url: '/gesicht' },
    { keyword: 'bio shampoo', searchVolume: 5400, position: 8, url: '/haarpflege' },
    { keyword: 'naturkosmetik marken', searchVolume: 1600, position: 2, url: '/marken' },
    { keyword: 'zertifizierte naturkosmetik', searchVolume: 880, position: 1, url: '/zertifiziert' },
    { keyword: 'bio bodylotion', searchVolume: 1300, position: 7, url: '/koerperpflege' },
];
// Get sample data
router.get('/sample-data', (_req, res) => {
    res.json({
        brandKeywords: SAMPLE_BRAND_KEYWORDS,
        rankedKeywords: SAMPLE_RANKED_KEYWORDS
    });
});
// Get search volume for brand keywords
router.post('/search-volume', async (req, res) => {
    try {
        const { keywords, locationCode, languageCode, login, password } = req.body;
        if (!login || !password) {
            return res.status(400).json({ error: 'DataForSEO credentials required' });
        }
        const client = new dataforseo_js_1.DataForSEOClient(login, password);
        const results = await client.getSearchVolume(keywords, locationCode, languageCode);
        res.json({ results });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});
// Get ranked keywords for a domain
router.post('/ranked-keywords', async (req, res) => {
    try {
        const { domain, locationCode, languageCode, limit = 1000, login, password } = req.body;
        if (!login || !password) {
            return res.status(400).json({ error: 'DataForSEO credentials required' });
        }
        const client = new dataforseo_js_1.DataForSEOClient(login, password);
        const results = await client.getRankedKeywords(domain, locationCode, languageCode, limit);
        res.json({ results });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});
// Calculate SOS, SOV, and Growth Gap
router.post('/calculate', (req, res) => {
    const { brandKeywords, rankedKeywords } = req.body;
    const sosResult = (0, calculations_js_1.calculateSOS)(brandKeywords);
    const sovResult = (0, calculations_js_1.calculateSOV)(rankedKeywords);
    const gapResult = (0, calculations_js_1.calculateGrowthGap)(sosResult.shareOfSearch, sovResult.shareOfVoice);
    res.json({
        sos: sosResult,
        sov: sovResult,
        gap: gapResult
    });
});
// Calculate with sample data (for testing)
router.get('/calculate-sample', (_req, res) => {
    const sosResult = (0, calculations_js_1.calculateSOS)(SAMPLE_BRAND_KEYWORDS);
    const sovResult = (0, calculations_js_1.calculateSOV)(SAMPLE_RANKED_KEYWORDS);
    const gapResult = (0, calculations_js_1.calculateGrowthGap)(sosResult.shareOfSearch, sovResult.shareOfVoice);
    res.json({
        sos: sosResult,
        sov: sovResult,
        gap: gapResult
    });
});
exports.default = router;
//# sourceMappingURL=api.js.map