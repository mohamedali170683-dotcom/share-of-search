import type { VercelRequest, VercelResponse } from '@vercel/node';

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

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (_req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    brandKeywords: SAMPLE_BRAND_KEYWORDS,
    rankedKeywords: SAMPLE_RANKED_KEYWORDS
  });
}
