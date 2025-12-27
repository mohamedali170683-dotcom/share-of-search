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
  brandDescription: string;
  insightContext: string;
}

// Known brand database for accurate context
const KNOWN_BRANDS: Record<string, Partial<BrandContext>> = {
  'continental': {
    industry: 'Automotive',
    vertical: 'Tires & Automotive Technology',
    productCategories: ['Premium Tires', 'Winter Tires', 'Summer Tires', 'All-Season Tires', 'SUV Tires', 'Truck Tires', 'Automotive Electronics', 'Brake Systems'],
    targetAudience: 'Car owners, fleet managers, automotive professionals, and OEM manufacturers',
    brandDescription: 'Continental AG is a German multinational automotive parts manufacturing company and one of the world\'s largest tire manufacturers. Founded in 1871, they\'re known for premium quality tires and advanced automotive technology.',
    seoFocus: ['Tire finder/configurator', 'Seasonal tire guides', 'Size & specification content', 'Dealer locator optimization', 'OE replacement content', 'Performance comparisons']
  },
  'michelin': {
    industry: 'Automotive',
    vertical: 'Tires & Mobility Solutions',
    productCategories: ['Premium Tires', 'Sustainable Tires', 'High-Performance Tires', 'Truck Tires', 'Agricultural Tires', 'Restaurant Guides'],
    targetAudience: 'Quality-conscious drivers, fleet operators, professional transporters',
    brandDescription: 'Michelin is a French multinational tire manufacturing company, known for innovation and the Michelin Guide restaurant ratings.',
    seoFocus: ['Sustainability content', 'Innovation stories', 'Tire technology education', 'Fleet solutions', 'Performance benchmarks']
  },
  'nike': {
    industry: 'Fashion & Apparel',
    vertical: 'Athletic Footwear & Sportswear',
    productCategories: ['Running Shoes', 'Basketball Shoes', 'Training Apparel', 'Sports Equipment', 'Athleisure', 'Jordan Brand'],
    targetAudience: 'Athletes, fitness enthusiasts, fashion-conscious consumers, youth market',
    brandDescription: 'Nike is the world\'s largest athletic footwear and apparel company, known for innovation and athlete partnerships.',
    seoFocus: ['Product launches', 'Athlete content', 'Training guides', 'Style inspiration', 'Technology stories']
  },
  'adidas': {
    industry: 'Fashion & Apparel',
    vertical: 'Athletic Footwear & Sportswear',
    productCategories: ['Running', 'Football', 'Training', 'Originals', 'Outdoor', 'Y-3'],
    targetAudience: 'Athletes, sneaker enthusiasts, fashion-forward consumers',
    brandDescription: 'Adidas is a German multinational corporation and one of the world\'s leading sports brands.',
    seoFocus: ['Sustainability (Parley)', 'Collaboration content', 'Sports team partnerships', 'Technology (Boost, 4D)']
  },
  'loreal': {
    industry: 'Beauty & Personal Care',
    vertical: 'Cosmetics & Skincare',
    productCategories: ['Skincare', 'Haircare', 'Makeup', 'Fragrances', 'Professional Products'],
    targetAudience: 'Beauty enthusiasts across all demographics, professionals',
    brandDescription: 'L\'Oreal is the world\'s largest cosmetics company with a diverse portfolio of beauty brands.',
    seoFocus: ['Beauty tutorials', 'Ingredient education', 'Skin diagnostics', 'Shade matching', 'Professional tips']
  },
  'bmw': {
    industry: 'Automotive',
    vertical: 'Luxury Vehicles',
    productCategories: ['Sedans', 'SUVs', 'Electric Vehicles (i Series)', 'M Performance', 'Motorcycles'],
    targetAudience: 'Affluent consumers, driving enthusiasts, status-conscious buyers',
    brandDescription: 'BMW is a German luxury vehicle manufacturer known for performance and engineering excellence.',
    seoFocus: ['Model configurators', 'Technology features', 'Electric mobility', 'Driving experience', 'Dealer locator']
  },
  'samsung': {
    industry: 'Technology & Electronics',
    vertical: 'Consumer Electronics',
    productCategories: ['Smartphones', 'TVs', 'Home Appliances', 'Tablets', 'Wearables', 'Semiconductors'],
    targetAudience: 'Tech enthusiasts, mainstream consumers, enterprise customers',
    brandDescription: 'Samsung is a South Korean conglomerate and one of the world\'s largest technology companies.',
    seoFocus: ['Product launches', 'Comparison content', 'Ecosystem benefits', 'Innovation stories', 'Support content']
  }
};

// Industry detection patterns (enhanced)
const INDUSTRY_PATTERNS: Record<string, { keywords: string[]; industry: string; vertical: string; categories: string[]; audience: string; seoFocus: string[] }> = {
  tires: {
    keywords: ['tire', 'tyre', 'wheel', 'rim', 'reifen', 'continental', 'michelin', 'goodyear', 'bridgestone', 'pirelli', 'dunlop', 'hankook', 'yokohama', 'nokian', 'falken', 'kumho'],
    industry: 'Automotive',
    vertical: 'Tires & Wheels',
    categories: ['All-Season Tires', 'Winter Tires', 'Summer Tires', 'Performance Tires', 'SUV/Truck Tires', 'Run-Flat Tires', 'Tire Services'],
    audience: 'Car owners, fleet managers, and automotive service centers looking for quality tires',
    seoFocus: ['Tire finder/selector tools', 'Size guides', 'Seasonal content (winter prep)', 'Installation guides', 'Performance comparisons', 'Dealer/retailer locator']
  },
  sportswear: {
    keywords: ['sport', 'athletic', 'nike', 'adidas', 'puma', 'under armour', 'reebok', 'new balance', 'running', 'fitness', 'gym', 'training'],
    industry: 'Fashion & Apparel',
    vertical: 'Sportswear & Athletic',
    categories: ['Running Shoes', 'Training Apparel', 'Sports Equipment', 'Activewear', 'Team Sports', 'Outdoor Gear', 'Athleisure'],
    audience: 'Athletes, fitness enthusiasts, and active lifestyle consumers across all age groups',
    seoFocus: ['Training guides', 'Product launches', 'Athlete partnerships', 'Style guides', 'Performance technology']
  },
  beauty: {
    keywords: ['beauty', 'cosmetic', 'skin', 'makeup', 'loreal', 'maybelline', 'nivea', 'dove', 'serum', 'cream', 'moisturizer', 'skincare', 'kosmetik'],
    industry: 'Beauty & Personal Care',
    vertical: 'Cosmetics & Skincare',
    categories: ['Skincare', 'Makeup', 'Hair Care', 'Anti-Aging', 'Natural/Organic', 'Fragrances', 'Body Care'],
    audience: 'Beauty enthusiasts, skincare seekers, and consumers looking for personal care solutions',
    seoFocus: ['How-to tutorials', 'Ingredient education', 'Routine guides', 'Product comparisons', 'Expert/dermatologist content']
  },
  automotive: {
    keywords: ['car', 'vehicle', 'auto', 'motor', 'toyota', 'ford', 'bmw', 'mercedes', 'volkswagen', 'audi', 'honda', 'fahrzeug'],
    industry: 'Automotive',
    vertical: 'Vehicles & Auto Parts',
    categories: ['Passenger Cars', 'SUVs', 'Electric Vehicles', 'Auto Parts', 'Car Services', 'Car Accessories', 'Financing'],
    audience: 'Car buyers, vehicle owners, and automotive enthusiasts',
    seoFocus: ['Vehicle configurators', 'Comparison content', 'Dealer locators', 'Financing calculators', 'Service information']
  },
  electronics: {
    keywords: ['tech', 'electronic', 'phone', 'computer', 'laptop', 'samsung', 'apple', 'sony', 'lg', 'dell', 'hp', 'smartphone', 'tablet'],
    industry: 'Technology & Electronics',
    vertical: 'Consumer Electronics',
    categories: ['Smartphones', 'Laptops', 'TVs', 'Audio', 'Wearables', 'Gaming', 'Smart Home', 'Accessories'],
    audience: 'Tech enthusiasts, mainstream consumers, and early adopters',
    seoFocus: ['Product launches', 'Comparison guides', 'How-to content', 'Spec comparisons', 'Troubleshooting', 'Ecosystem content']
  },
  fashion: {
    keywords: ['fashion', 'clothing', 'apparel', 'dress', 'shoes', 'zara', 'h&m', 'gucci', 'louis vuitton', 'style', 'mode', 'kleidung'],
    industry: 'Fashion & Apparel',
    vertical: 'Fashion Retail',
    categories: ['Women\'s Fashion', 'Men\'s Fashion', 'Accessories', 'Footwear', 'Luxury', 'Casual Wear', 'Formal Wear'],
    audience: 'Fashion-conscious consumers across all demographics',
    seoFocus: ['Trend content', 'Style guides', 'Size guides', 'Seasonal collections', 'Outfit inspiration']
  },
  finance: {
    keywords: ['bank', 'finance', 'insurance', 'loan', 'credit', 'invest', 'mortgage', 'savings', 'visa', 'mastercard', 'kredit', 'versicherung'],
    industry: 'Finance & Banking',
    vertical: 'Financial Services',
    categories: ['Banking', 'Insurance', 'Investments', 'Loans', 'Credit Cards', 'Mortgages', 'Financial Planning'],
    audience: 'Consumers and businesses seeking financial products, loans, and insurance',
    seoFocus: ['Calculators & tools', 'Rate comparisons', 'Educational guides', 'Trust signals', 'Local branch content']
  },
  travel: {
    keywords: ['travel', 'hotel', 'flight', 'vacation', 'booking', 'airbnb', 'expedia', 'marriott', 'hilton', 'reise', 'urlaub'],
    industry: 'Travel & Hospitality',
    vertical: 'Travel Services',
    categories: ['Hotels', 'Flights', 'Vacation Packages', 'Car Rental', 'Cruises', 'Activities', 'Travel Insurance'],
    audience: 'Leisure travelers, business travelers, and vacation planners',
    seoFocus: ['Destination guides', 'Booking optimization', 'Travel tips', 'Reviews & ratings', 'Deals & offers']
  },
  health: {
    keywords: ['health', 'medical', 'pharmacy', 'drug', 'hospital', 'doctor', 'wellness', 'supplement', 'vitamin', 'apotheke', 'gesundheit'],
    industry: 'Healthcare',
    vertical: 'Health & Wellness',
    categories: ['Pharmaceuticals', 'Supplements', 'Medical Devices', 'Healthcare Services', 'Wellness', 'Fitness', 'Mental Health'],
    audience: 'Patients, caregivers, and health-conscious individuals seeking medical information',
    seoFocus: ['Symptom information', 'Treatment guides', 'Expert content', 'Research & studies', 'Patient resources']
  },
  food: {
    keywords: ['food', 'grocery', 'restaurant', 'recipe', 'nutrition', 'organic', 'nestle', 'kraft', 'unilever', 'lebensmittel'],
    industry: 'Food & Beverages',
    vertical: 'Consumer Goods',
    categories: ['Packaged Foods', 'Beverages', 'Organic', 'Snacks', 'Health Foods', 'Frozen Foods', 'Dairy'],
    audience: 'Food enthusiasts, health-conscious consumers, and families',
    seoFocus: ['Recipes', 'Nutritional info', 'Product stories', 'Lifestyle content', 'Sustainability']
  }
};

// Detect industry from domain and keywords
function detectIndustryContext(domain: string, topKeywords: string[]): {
  industry: string;
  vertical: string;
  categories: string[];
  audience: string;
  seoFocus: string[];
} {
  const domainLower = domain.toLowerCase();
  const keywordsText = topKeywords.join(' ').toLowerCase();
  const combinedText = `${domainLower} ${keywordsText}`;

  // Check known brands first
  for (const [brand, context] of Object.entries(KNOWN_BRANDS)) {
    if (domainLower.includes(brand)) {
      return {
        industry: context.industry || 'General',
        vertical: context.vertical || 'Multi-category',
        categories: context.productCategories || [],
        audience: context.targetAudience || '',
        seoFocus: context.seoFocus || []
      };
    }
  }

  // Pattern-based detection
  for (const [, pattern] of Object.entries(INDUSTRY_PATTERNS)) {
    const matches = pattern.keywords.filter(kw => combinedText.includes(kw));
    if (matches.length >= 2 || pattern.keywords.some(kw => domainLower.includes(kw))) {
      return {
        industry: pattern.industry,
        vertical: pattern.vertical,
        categories: pattern.categories,
        audience: pattern.audience,
        seoFocus: pattern.seoFocus
      };
    }
  }

  return {
    industry: 'General',
    vertical: 'Multi-category',
    categories: ['Products', 'Services', 'Information', 'Resources'],
    audience: 'General consumer audience',
    seoFocus: ['Content quality', 'User experience', 'Technical SEO', 'Link building']
  };
}

// Analyze market position based on rankings
function analyzeMarketPosition(avgPosition: number, keywordCount: number, sosValue: number, sovValue: number): string {
  if (sosValue >= 30 && avgPosition <= 5) {
    return 'Market Leader - Dominant brand with strong organic presence';
  } else if (sosValue >= 20 && avgPosition <= 8) {
    return 'Strong Challenger - Well-established brand with competitive rankings';
  } else if (sosValue >= 10 && sovValue >= 15) {
    return 'Growing Contender - Building brand awareness through strong SEO';
  } else if (sovValue > sosValue + 5) {
    return 'SEO Leader - Organic visibility outpacing brand awareness';
  } else if (sosValue > sovValue + 5) {
    return 'Brand-Driven - Strong brand awareness, SEO opportunity exists';
  } else if (keywordCount >= 50) {
    return 'Content-Rich - Good content base, optimization opportunity';
  } else {
    return 'Growth Stage - Significant potential to improve visibility';
  }
}

// Generate insight context for shaping recommendations
function generateInsightContext(industry: string, vertical: string, sosValue: number, sovValue: number, marketPosition: string): string {
  const gap = sovValue - sosValue;

  let context = `As a ${vertical} brand in the ${industry} industry, `;

  if (gap > 5) {
    context += `your SEO performance is outpacing brand awareness. Focus recommendations on: `;
    context += `(1) Brand-building content to convert organic traffic into brand loyalty, `;
    context += `(2) Leveraging high-ranking content to increase brand mentions, `;
    context += `(3) Creating more branded content experiences. `;
  } else if (gap < -5) {
    context += `your brand awareness exceeds organic visibility. Focus recommendations on: `;
    context += `(1) Improving rankings for non-branded terms, `;
    context += `(2) Creating content for branded + product queries, `;
    context += `(3) Technical SEO improvements to capture more search traffic. `;
  } else {
    context += `you have balanced brand and organic presence. Focus on: `;
    context += `(1) Expanding into new keyword territories, `;
    context += `(2) Defending current ranking positions, `;
    context += `(3) Improving CTR through better SERP presence. `;
  }

  // Industry-specific context
  if (industry === 'Automotive' && vertical.includes('Tire')) {
    context += `For tire brands, prioritize seasonal content (winter/summer tire guides), tire finder tools, `;
    context += `and technical content about tire specifications and performance.`;
  } else if (industry === 'Fashion & Apparel') {
    context += `For fashion brands, focus on trend content, style guides, and new collection launches.`;
  } else if (industry === 'Beauty & Personal Care') {
    context += `For beauty brands, prioritize tutorial content, ingredient education, and routine guides.`;
  } else if (industry === 'Technology & Electronics') {
    context += `For tech brands, emphasize product comparisons, launch content, and ecosystem stories.`;
  }

  return context;
}

// Get known brand description
function getBrandDescription(domain: string): string | null {
  const domainLower = domain.toLowerCase();
  for (const [brand, context] of Object.entries(KNOWN_BRANDS)) {
    if (domainLower.includes(brand)) {
      return context.brandDescription || null;
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

    // Detect industry context
    const industryContext = detectIndustryContext(domain, topKeywords);

    // Analyze market position
    const marketPosition = analyzeMarketPosition(avgPosition, keywordCount, sosValue, sovValue);

    // Generate key strengths based on metrics
    const keyStrengths: string[] = [];
    if (sosValue >= 25) keyStrengths.push('Strong brand recognition in search');
    if (sovValue >= 20) keyStrengths.push('Good organic search visibility');
    if (avgPosition <= 6) keyStrengths.push('High-ranking keyword portfolio');
    if (keywordCount >= 100) keyStrengths.push('Broad keyword coverage');
    if (sovValue > sosValue + 3) keyStrengths.push('SEO-driven growth trajectory');
    if (sosValue > sovValue + 3) keyStrengths.push('Strong brand equity');
    if (keyStrengths.length === 0) keyStrengths.push('Growth potential in all areas');

    // Generate competitor context
    const competitorContext = competitors.length > 0
      ? `Competing against ${competitors.slice(0, 5).join(', ')}${competitors.length > 5 ? ` and ${competitors.length - 5} others` : ''} in the ${industryContext.vertical} space`
      : `Operating in the ${industryContext.vertical} market`;

    // Get brand description (for known brands)
    const brandDescription = getBrandDescription(domain) ||
      `${brandName || domain.replace(/\.(com|de|fr|uk|org|net)$/i, '')} is a ${industryContext.industry.toLowerCase()} brand operating in the ${industryContext.vertical.toLowerCase()} vertical.`;

    // Generate insight context for shaping recommendations
    const insightContext = generateInsightContext(
      industryContext.industry,
      industryContext.vertical,
      sosValue,
      sovValue,
      marketPosition
    );

    const brandContext: BrandContext = {
      brandName: brandName || domain.replace(/\.(com|de|fr|uk|org|net)$/i, ''),
      industry: industryContext.industry,
      vertical: industryContext.vertical,
      productCategories: industryContext.categories,
      targetAudience: industryContext.audience,
      competitorContext,
      keyStrengths,
      marketPosition,
      seoFocus: industryContext.seoFocus,
      brandDescription,
      insightContext
    };

    return res.status(200).json(brandContext);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
