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

// Google Ads category ID to name mapping (comprehensive list)
// Reference: Google Product Taxonomy / Google Ads Categories
const CATEGORY_MAP: Record<number, string> = {
  // Automotive (47 and children)
  47: 'Automotive',
  179: 'Motor Vehicles',
  170: 'Tires & Wheels',
  171: 'Vehicle Parts & Accessories',
  168: 'Car Electronics',
  169: 'Car Care',
  916: 'Automotive Exterior',
  917: 'Automotive Interior',
  2768: 'Vehicle Maintenance',
  2522: 'Motor Vehicle Parts',
  913: 'Motorcycles',
  914: 'Motorcycle Parts',

  // Tires specific (sub-categories)
  2984: 'Tires',
  2985: 'Wheels & Rims',
  2986: 'Tire Accessories',

  // Fashion & Apparel (141 and children)
  141: 'Apparel',
  166: 'Clothing',
  167: 'Shoes',
  178: 'Accessories',
  1604: 'Women\'s Clothing',
  1594: 'Men\'s Clothing',
  1581: 'Athletic Apparel',
  5322: 'Sportswear',
  1831: 'Outerwear',
  2271: 'Activewear',

  // Beauty & Personal Care (44 and children)
  44: 'Beauty & Personal Care',
  234: 'Skin Care',
  235: 'Hair Care',
  236: 'Makeup & Cosmetics',
  239: 'Personal Care',
  2619: 'Face Care',
  2620: 'Body Care',
  2975: 'Anti-Aging',
  474: 'Fragrances',
  2441: 'Natural Cosmetics',
  2442: 'Organic Beauty',

  // Sports & Fitness (43 and children)
  43: 'Sports & Fitness',
  263: 'Athletic Apparel',
  264: 'Sports Equipment',
  115: 'Outdoor Recreation',
  499: 'Fitness Equipment',
  1011: 'Running',
  1013: 'Swimming',
  1074: 'Football/Soccer',
  1075: 'Basketball',
  1012: 'Training & Gym',
  982: 'Cycling',
  983: 'Cycling Accessories',

  // Technology & Electronics (31 and children)
  31: 'Computers & Electronics',
  78: 'Consumer Electronics',
  79: 'Software',
  222: 'Computers',
  223: 'Computer Accessories',
  267: 'Mobile Phones',
  270: 'Audio Equipment',
  271: 'Video Equipment',
  386: 'Cameras',
  295: 'Gaming',
  1279: 'Smart Home',
  5032: 'Wearable Technology',

  // Home & Garden (11 and children)
  11: 'Home & Garden',
  271: 'Home Improvement',
  121: 'Furniture',
  122: 'Home Decor',
  123: 'Kitchen & Dining',
  124: 'Bedding & Bath',
  696: 'Garden & Outdoor',
  2862: 'Home Appliances',
  2187: 'Lighting',

  // Food & Groceries (71 and children)
  71: 'Food & Groceries',
  72: 'Beverages',
  2660: 'Organic Food',
  5793: 'Health Foods',
  414: 'Snacks',
  422: 'Coffee & Tea',
  5794: 'Alcohol',

  // Finance & Banking (7 and children)
  7: 'Finance',
  37: 'Banking',
  814: 'Insurance',
  903: 'Investing',
  278: 'Credit Cards',
  1340: 'Loans',
  1358: 'Mortgages',
  2789: 'Cryptocurrency',

  // Travel & Transportation (67 and children)
  67: 'Travel & Transportation',
  203: 'Hotels & Accommodations',
  205: 'Air Travel',
  206: 'Car Rental',
  1042: 'Vacation Packages',
  1098: 'Cruises',
  2006: 'Travel Guides',

  // Shopping & Retail (18 and children)
  18: 'Shopping',
  104: 'Gifts',
  101: 'Jewelry',
  102: 'Watches',
  969: 'Online Shopping',
  532: 'Luxury Goods',

  // Health & Medical (45 and children)
  45: 'Health',
  254: 'Health Conditions',
  256: 'Pharmacy',
  2621: 'Supplements',
  2622: 'Vitamins',
  697: 'Medical Devices',
  2496: 'Mental Health',
  698: 'Vision Care',
  2401: 'Dental Care',

  // Business & Industrial (12 and children)
  12: 'Business & Industrial',
  111: 'Office Supplies',
  135: 'Industrial Equipment',
  1800: 'Agriculture',
  636: 'Construction',
  710: 'Manufacturing',

  // Entertainment & Media (3 and children)
  3: 'Arts & Entertainment',
  34: 'Books & Literature',
  39: 'Music',
  184: 'Movies & TV',
  41: 'Games',
  569: 'Streaming Services',

  // Education (74 and children)
  74: 'Education',
  372: 'Online Courses',
  373: 'Language Learning',
  958: 'Test Preparation',
  1361: 'Tutoring',

  // Real Estate (29 and children)
  29: 'Real Estate',
  1097: 'Property Listings',
  1100: 'Commercial Real Estate',
  467: 'Property Management',

  // Pets (66 and children)
  66: 'Pets & Animals',
  775: 'Pet Supplies',
  776: 'Pet Food',
  779: 'Pet Services',

  // Baby & Kids (536 and children)
  536: 'Baby & Kids',
  537: 'Baby Products',
  548: 'Toys',
  549: 'Children\'s Clothing',
};

// Parent category ID ranges for fallback classification
const PARENT_CATEGORIES: { range: [number, number]; name: string }[] = [
  { range: [47, 199], name: 'Automotive' },
  { range: [900, 999], name: 'Automotive' },
  { range: [2500, 2599], name: 'Automotive' },
  { range: [2760, 2799], name: 'Automotive' },
  { range: [2980, 2999], name: 'Tires & Wheels' },
  { range: [141, 199], name: 'Fashion & Apparel' },
  { range: [1580, 1650], name: 'Apparel' },
  { range: [1820, 1850], name: 'Apparel' },
  { range: [2270, 2280], name: 'Activewear' },
  { range: [5320, 5330], name: 'Sportswear' },
  { range: [44, 46], name: 'Beauty & Personal Care' },
  { range: [230, 250], name: 'Beauty & Personal Care' },
  { range: [470, 480], name: 'Fragrances' },
  { range: [2440, 2450], name: 'Natural Cosmetics' },
  { range: [2610, 2630], name: 'Skin Care' },
  { range: [2970, 2980], name: 'Anti-Aging' },
  { range: [43, 43], name: 'Sports & Fitness' },
  { range: [260, 270], name: 'Sports & Fitness' },
  { range: [495, 510], name: 'Fitness' },
  { range: [980, 990], name: 'Cycling' },
  { range: [1010, 1020], name: 'Running' },
  { range: [1070, 1080], name: 'Team Sports' },
  { range: [31, 42], name: 'Electronics' },
  { range: [78, 80], name: 'Electronics' },
  { range: [220, 230], name: 'Computers' },
  { range: [265, 275], name: 'Mobile & Audio' },
  { range: [385, 390], name: 'Cameras' },
  { range: [290, 300], name: 'Gaming' },
  { range: [11, 30], name: 'Home & Garden' },
  { range: [120, 130], name: 'Home & Garden' },
  { range: [690, 700], name: 'Garden' },
  { range: [71, 77], name: 'Food & Beverages' },
  { range: [410, 430], name: 'Food & Beverages' },
  { range: [7, 10], name: 'Finance' },
  { range: [35, 40], name: 'Finance' },
  { range: [275, 285], name: 'Finance' },
  { range: [810, 820], name: 'Insurance' },
  { range: [1335, 1365], name: 'Finance' },
  { range: [67, 70], name: 'Travel' },
  { range: [200, 210], name: 'Travel' },
  { range: [1040, 1050], name: 'Travel' },
  { range: [1095, 1105], name: 'Travel' },
  { range: [45, 46], name: 'Health' },
  { range: [250, 260], name: 'Health' },
  { range: [695, 705], name: 'Health' },
  { range: [2400, 2410], name: 'Health' },
  { range: [2490, 2500], name: 'Health' },
  { range: [2620, 2625], name: 'Health' },
  { range: [66, 67], name: 'Pets & Animals' },
  { range: [770, 785], name: 'Pets & Animals' },
  { range: [535, 555], name: 'Baby & Kids' },
  { range: [3, 6], name: 'Entertainment' },
  { range: [33, 35], name: 'Books & Media' },
  { range: [39, 42], name: 'Entertainment' },
  { range: [180, 190], name: 'Entertainment' },
  { range: [565, 575], name: 'Entertainment' },
  { range: [74, 78], name: 'Education' },
  { range: [370, 380], name: 'Education' },
  { range: [955, 965], name: 'Education' },
  { range: [12, 18], name: 'Business & Industrial' },
  { range: [110, 115], name: 'Office' },
  { range: [130, 140], name: 'Industrial' },
  { range: [630, 640], name: 'Construction' },
  { range: [705, 715], name: 'Manufacturing' },
];

// Get category name from ID, with fallback
function getCategoryName(categoryIds?: number[]): string | null {
  if (!categoryIds || categoryIds.length === 0) return null;

  // First, try to find an exact match in CATEGORY_MAP
  for (const id of categoryIds) {
    if (CATEGORY_MAP[id]) {
      return CATEGORY_MAP[id];
    }
  }

  // Second, try to find a parent category based on ID ranges
  for (const id of categoryIds) {
    for (const parent of PARENT_CATEGORIES) {
      if (id >= parent.range[0] && id <= parent.range[1]) {
        return parent.name;
      }
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
    const { domain, locationCode, languageCode, limit = 1000 } = req.body;

    // Use environment variables for API credentials
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      return res.status(500).json({ error: 'DataForSEO credentials not configured on server' });
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
