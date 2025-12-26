import { Router, Request, Response } from 'express';
import { DataForSEOClient } from '../services/dataforseo.js';
import { calculateSOS, calculateSOV, calculateGrowthGap } from '../services/calculations.js';
import {
  SearchVolumeRequest,
  RankedKeywordsRequest,
  CalculateRequest,
  CalculateResponse,
  BrandKeyword,
  RankedKeyword
} from '../types/index.js';

const router = Router();

// Sample test data
const SAMPLE_BRAND_KEYWORDS: BrandKeyword[] = [
  { keyword: 'lavera', searchVolume: 12100, isOwnBrand: true },
  { keyword: 'lavera naturkosmetik', searchVolume: 1300, isOwnBrand: true },
  { keyword: 'lavera lippenstift', searchVolume: 480, isOwnBrand: true },
  { keyword: 'weleda', searchVolume: 18100, isOwnBrand: false },
  { keyword: 'dr hauschka', searchVolume: 14800, isOwnBrand: false },
  { keyword: 'annemarie börlind', searchVolume: 5400, isOwnBrand: false },
  { keyword: 'alverde', searchVolume: 27100, isOwnBrand: false },
];

const SAMPLE_RANKED_KEYWORDS: RankedKeyword[] = [
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
router.get('/sample-data', (_req: Request, res: Response) => {
  res.json({
    brandKeywords: SAMPLE_BRAND_KEYWORDS,
    rankedKeywords: SAMPLE_RANKED_KEYWORDS
  });
});

// Get search volume for brand keywords
router.post('/search-volume', async (req: Request<object, object, SearchVolumeRequest>, res: Response) => {
  try {
    const { keywords, locationCode, languageCode, login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'DataForSEO credentials required' });
    }

    const client = new DataForSEOClient(login, password);
    const results = await client.getSearchVolume(keywords, locationCode, languageCode);

    res.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Get ranked keywords for a domain
router.post('/ranked-keywords', async (req: Request<object, object, RankedKeywordsRequest>, res: Response) => {
  try {
    const { domain, locationCode, languageCode, limit = 1000, login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'DataForSEO credentials required' });
    }

    const client = new DataForSEOClient(login, password);
    const results = await client.getRankedKeywords(domain, locationCode, languageCode, limit);

    res.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Calculate SOS, SOV, and Growth Gap
router.post('/calculate', (req: Request<object, object, CalculateRequest>, res: Response<CalculateResponse>) => {
  const { brandKeywords, rankedKeywords } = req.body;

  const sosResult = calculateSOS(brandKeywords);
  const sovResult = calculateSOV(rankedKeywords);
  const gapResult = calculateGrowthGap(sosResult.shareOfSearch, sovResult.shareOfVoice);

  res.json({
    sos: sosResult,
    sov: sovResult,
    gap: gapResult
  });
});

// Calculate with sample data (for testing)
router.get('/calculate-sample', (_req: Request, res: Response<CalculateResponse>) => {
  const sosResult = calculateSOS(SAMPLE_BRAND_KEYWORDS);
  const sovResult = calculateSOV(SAMPLE_RANKED_KEYWORDS);
  const gapResult = calculateGrowthGap(sosResult.shareOfSearch, sovResult.shareOfVoice);

  res.json({
    sos: sosResult,
    sov: sovResult,
    gap: gapResult
  });
});

export default router;
