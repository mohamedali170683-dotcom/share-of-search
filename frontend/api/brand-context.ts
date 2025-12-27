import type { VercelRequest, VercelResponse } from '@vercel/node';

interface BrandContext {
  brandName: string;
  industry: string;
  vertical: string;
  productCategories: string[];
  targetAudience: string;
  competitorContext: string;
  keyStrengths: string[];
  marketPosition: string;
  seoFocus: string[];
}

// Industry detection patterns
const INDUSTRY_PATTERNS: Record<string, { keywords: string[]; industry: string; vertical: string; categories: string[] }> = {
  tires: {
    keywords: ['tire', 'tyre', 'wheel', 'rim', 'continental', 'michelin', 'goodyear', 'bridgestone', 'pirelli', 'dunlop', 'hankook', 'yokohama'],
    industry: 'Automotive',
    vertical: 'Tires & Wheels',
    categories: ['All-Season Tires', 'Winter Tires', 'Summer Tires', 'Performance Tires', 'SUV/Truck Tires', 'Run-Flat Tires', 'Tire Services']
  },
  sportswear: {
    keywords: ['sport', 'athletic', 'nike', 'adidas', 'puma', 'under armour', 'reebok', 'new balance', 'running', 'fitness', 'gym'],
    industry: 'Fashion & Apparel',
    vertical: 'Sportswear & Athletic',
    categories: ['Running Shoes', 'Training Apparel', 'Sports Equipment', 'Activewear', 'Team Sports', 'Outdoor Gear', 'Athleisure']
  },
  beauty: {
    keywords: ['beauty', 'cosmetic', 'skin', 'makeup', 'loreal', 'maybelline', 'nivea', 'dove', 'serum', 'cream', 'moisturizer'],
    industry: 'Beauty & Personal Care',
    vertical: 'Cosmetics & Skincare',
    categories: ['Skincare', 'Makeup', 'Hair Care', 'Anti-Aging', 'Natural/Organic', 'Fragrances', 'Body Care']
  },
  automotive: {
    keywords: ['car', 'vehicle', 'auto', 'motor', 'toyota', 'ford', 'bmw', 'mercedes', 'volkswagen', 'audi', 'honda'],
    industry: 'Automotive',
    vertical: 'Vehicles & Auto Parts',
    categories: ['Passenger Cars', 'SUVs', 'Electric Vehicles', 'Auto Parts', 'Car Services', 'Car Accessories', 'Financing']
  },
  electronics: {
    keywords: ['tech', 'electronic', 'phone', 'computer', 'laptop', 'samsung', 'apple', 'sony', 'lg', 'dell', 'hp'],
    industry: 'Technology & Electronics',
    vertical: 'Consumer Electronics',
    categories: ['Smartphones', 'Laptops', 'TVs', 'Audio', 'Wearables', 'Gaming', 'Smart Home', 'Accessories']
  },
  fashion: {
    keywords: ['fashion', 'clothing', 'apparel', 'dress', 'shoes', 'zara', 'h&m', 'gucci', 'louis vuitton', 'style'],
    industry: 'Fashion & Apparel',
    vertical: 'Fashion Retail',
    categories: ['Women\'s Fashion', 'Men\'s Fashion', 'Accessories', 'Footwear', 'Luxury', 'Casual Wear', 'Formal Wear']
  },
  food: {
    keywords: ['food', 'grocery', 'restaurant', 'recipe', 'nutrition', 'organic', 'nestle', 'kraft', 'unilever'],
    industry: 'Food & Beverages',
    vertical: 'Consumer Goods',
    categories: ['Packaged Foods', 'Beverages', 'Organic', 'Snacks', 'Health Foods', 'Frozen Foods', 'Dairy']
  },
  finance: {
    keywords: ['bank', 'finance', 'insurance', 'loan', 'credit', 'invest', 'mortgage', 'savings', 'visa', 'mastercard'],
    industry: 'Finance & Banking',
    vertical: 'Financial Services',
    categories: ['Banking', 'Insurance', 'Investments', 'Loans', 'Credit Cards', 'Mortgages', 'Financial Planning']
  },
  travel: {
    keywords: ['travel', 'hotel', 'flight', 'vacation', 'booking', 'airbnb', 'expedia', 'marriott', 'hilton'],
    industry: 'Travel & Hospitality',
    vertical: 'Travel Services',
    categories: ['Hotels', 'Flights', 'Vacation Packages', 'Car Rental', 'Cruises', 'Activities', 'Travel Insurance']
  },
  health: {
    keywords: ['health', 'medical', 'pharmacy', 'drug', 'hospital', 'doctor', 'wellness', 'supplement', 'vitamin'],
    industry: 'Healthcare',
    vertical: 'Health & Wellness',
    categories: ['Pharmaceuticals', 'Supplements', 'Medical Devices', 'Healthcare Services', 'Wellness', 'Fitness', 'Mental Health']
  },
  ecommerce: {
    keywords: ['shop', 'store', 'buy', 'ecommerce', 'amazon', 'ebay', 'walmart', 'target', 'retail'],
    industry: 'Retail & E-commerce',
    vertical: 'Online Retail',
    categories: ['General Merchandise', 'Specialty Retail', 'Marketplace', 'Direct-to-Consumer', 'Subscription']
  }
};

// Detect industry from domain and keywords
function detectIndustryFromDomain(domain: string, topKeywords: string[]): { industry: string; vertical: string; categories: string[] } {
  const domainLower = domain.toLowerCase();
  const keywordsText = topKeywords.join(' ').toLowerCase();
  const combinedText = `${domainLower} ${keywordsText}`;

  for (const [, pattern] of Object.entries(INDUSTRY_PATTERNS)) {
    const matches = pattern.keywords.filter(kw => combinedText.includes(kw));
    if (matches.length >= 2 || pattern.keywords.some(kw => domainLower.includes(kw))) {
      return {
        industry: pattern.industry,
        vertical: pattern.vertical,
        categories: pattern.categories
      };
    }
  }

  return {
    industry: 'General',
    vertical: 'Multi-category',
    categories: ['Products', 'Services', 'Information', 'Resources']
  };
}

// Generate SEO focus areas based on industry
function generateSEOFocus(industry: string, vertical: string): string[] {
  const focusMap: Record<string, string[]> = {
    'Automotive': ['Product specifications', 'Dealer locator', 'Comparison content', 'Safety features', 'Reviews'],
    'Tires & Wheels': ['Tire finder tools', 'Size guides', 'Seasonal content', 'Installation guides', 'Performance comparisons'],
    'Fashion & Apparel': ['Trend content', 'Style guides', 'Size guides', 'Seasonal collections', 'Outfit inspiration'],
    'Beauty & Personal Care': ['How-to tutorials', 'Ingredient education', 'Routine guides', 'Product comparisons', 'Expert advice'],
    'Technology & Electronics': ['Product reviews', 'Comparison guides', 'How-to content', 'Spec comparisons', 'Troubleshooting'],
    'Finance & Banking': ['Educational content', 'Calculators & tools', 'Rate comparisons', 'Guides & how-tos', 'Trust signals'],
    'Healthcare': ['Symptom information', 'Treatment guides', 'Expert content', 'Research & studies', 'Patient resources'],
    'Travel & Hospitality': ['Destination guides', 'Booking content', 'Travel tips', 'Reviews', 'Deals & offers'],
    'Food & Beverages': ['Recipes', 'Nutritional info', 'Product content', 'Lifestyle content', 'Brand storytelling']
  };

  return focusMap[vertical] || focusMap[industry] || ['Content quality', 'User experience', 'Technical SEO', 'Link building', 'Local SEO'];
}

// Analyze market position based on rankings
function analyzeMarketPosition(avgPosition: number, keywordCount: number, sosValue: number): string {
  if (sosValue >= 30 && avgPosition <= 5) {
    return 'Market Leader - Strong brand presence with dominant organic visibility';
  } else if (sosValue >= 20 && avgPosition <= 8) {
    return 'Strong Challenger - Well-established brand with competitive rankings';
  } else if (sosValue >= 10 && avgPosition <= 12) {
    return 'Emerging Player - Growing brand awareness with room for SEO improvement';
  } else if (keywordCount >= 50) {
    return 'Content-Rich Underperformer - Good content base but needs ranking optimization';
  } else {
    return 'Growth Opportunity - Significant potential to improve both brand and organic visibility';
  }
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
    const {
      domain,
      brandName,
      topKeywords = [],
      competitors = [],
      avgPosition = 10,
      keywordCount = 0,
      sosValue = 0,
      sovValue = 0
    } = req.body;

    // Detect industry from domain and keywords
    const { industry, vertical, categories } = detectIndustryFromDomain(domain, topKeywords);

    // Generate SEO focus areas
    const seoFocus = generateSEOFocus(industry, vertical);

    // Analyze market position
    const marketPosition = analyzeMarketPosition(avgPosition, keywordCount, sosValue);

    // Generate key strengths based on metrics
    const keyStrengths: string[] = [];
    if (sosValue >= 20) keyStrengths.push('Strong brand recognition');
    if (sovValue >= 15) keyStrengths.push('Good organic visibility');
    if (avgPosition <= 8) keyStrengths.push('Competitive rankings');
    if (keywordCount >= 100) keyStrengths.push('Broad keyword coverage');
    if (sovValue > sosValue) keyStrengths.push('SEO outperforming brand awareness');
    if (keyStrengths.length === 0) keyStrengths.push('Growth potential in all areas');

    // Generate target audience description
    const audienceMap: Record<string, string> = {
      'Automotive': 'Vehicle owners, car enthusiasts, and automotive professionals',
      'Tires & Wheels': 'Car owners, fleet managers, and automotive service centers',
      'Fashion & Apparel': 'Fashion-conscious consumers across demographics',
      'Beauty & Personal Care': 'Beauty enthusiasts, skincare seekers, and wellness-focused consumers',
      'Technology & Electronics': 'Tech enthusiasts, early adopters, and everyday consumers',
      'Finance & Banking': 'Consumers and businesses seeking financial products and services',
      'Healthcare': 'Patients, caregivers, and health-conscious individuals',
      'Travel & Hospitality': 'Travelers, vacationers, and business travelers',
      'Food & Beverages': 'Food enthusiasts, health-conscious consumers, and families'
    };
    const targetAudience = audienceMap[industry] || 'General consumer audience seeking products and information';

    // Generate competitor context
    const competitorContext = competitors.length > 0
      ? `Competing with ${competitors.slice(0, 3).join(', ')}${competitors.length > 3 ? ` and ${competitors.length - 3} others` : ''} in the ${vertical} space`
      : `Operating in the ${vertical} market with various industry competitors`;

    const brandContext: BrandContext = {
      brandName: brandName || domain.replace(/\.(com|de|fr|uk|org|net)$/i, ''),
      industry,
      vertical,
      productCategories: categories,
      targetAudience,
      competitorContext,
      keyStrengths,
      marketPosition,
      seoFocus
    };

    return res.status(200).json(brandContext);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
