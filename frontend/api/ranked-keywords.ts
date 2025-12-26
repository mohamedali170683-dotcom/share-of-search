import type { VercelRequest, VercelResponse } from '@vercel/node';

interface RankedKeywordItem {
  keyword_data: {
    keyword: string;
    keyword_info: {
      search_volume: number;
      categories?: number[]; // Google Ads category IDs
    };
  };
  ranked_serp_element: {
    serp_item: {
      rank_group: number;
      relative_url: string;
    };
  };
}

// Google Ads category ID to name mapping (common categories)
const CATEGORY_MAP: Record<number, string> = {
  // Automotive
  47: 'Automotive',
  179: 'Motor Vehicles',
  170: 'Tires & Wheels',
  171: 'Vehicle Parts',
  168: 'Car Accessories',

  // Fashion & Beauty
  44: 'Beauty & Personal Care',
  234: 'Skin Care',
  235: 'Hair Care',
  236: 'Makeup & Cosmetics',
  239: 'Personal Care',

  // Sports & Fitness
  43: 'Sports & Fitness',
  263: 'Athletic Apparel',
  264: 'Sports Equipment',
  115: 'Outdoor Recreation',

  // Technology
  31: 'Computers & Electronics',
  78: 'Consumer Electronics',
  79: 'Software',

  // Home & Garden
  11: 'Home & Garden',
  271: 'Home Improvement',

  // Food & Drink
  71: 'Food & Groceries',
  72: 'Beverages',

  // Finance
  7: 'Finance',
  37: 'Banking',

  // Travel
  67: 'Travel & Transportation',
  203: 'Hotels & Accommodations',
  205: 'Air Travel',

  // Retail & Shopping
  18: 'Shopping',
  141: 'Apparel',

  // Health
  45: 'Health',
  254: 'Health Conditions',
};

// Get category name from ID, with fallback
function getCategoryName(categoryIds?: number[]): string | null {
  if (!categoryIds || categoryIds.length === 0) return null;

  // Try to find a matching category
  for (const id of categoryIds) {
    if (CATEGORY_MAP[id]) {
      return CATEGORY_MAP[id];
    }
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { domain, locationCode, languageCode, limit = 1000, login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'DataForSEO credentials required' });
    }

    const auth = Buffer.from(`${login}:${password}`).toString('base64');

    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        target: domain,
        location_code: locationCode,
        language_code: languageCode,
        item_types: ['organic'],
        limit,
        filters: [
          ['keyword_data.keyword_info.search_volume', '>', 0],
          'and',
          ['ranked_serp_element.serp_item.rank_group', '<=', 20]
        ],
        order_by: ['keyword_data.keyword_info.search_volume,desc']
      }])
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.status_message || 'DataForSEO API error');
    }

    const items = data.tasks?.[0]?.result?.[0]?.items || [];
    const results = items.map((item: RankedKeywordItem) => ({
      keyword: item.keyword_data.keyword,
      searchVolume: item.keyword_data.keyword_info.search_volume || 0,
      position: item.ranked_serp_element.serp_item.rank_group,
      url: item.ranked_serp_element.serp_item.relative_url,
      // Include category from DataForSEO if available
      category: getCategoryName(item.keyword_data.keyword_info.categories),
      categoryIds: item.keyword_data.keyword_info.categories || []
    }));

    return res.status(200).json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
