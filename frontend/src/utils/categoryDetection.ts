/**
 * Shared category detection utility
 * Consolidates category detection logic used across the application
 */

// Category patterns for keyword classification
export const CATEGORY_PATTERNS: { category: string; regex: RegExp }[] = [
  // Automotive / Tires (check specific first)
  { category: 'Winter Tires', regex: /winter.?reifen|winter.?tire|winter.?tyre|schnee.?reifen|snow.?tire/i },
  { category: 'Summer Tires', regex: /sommer.?reifen|summer.?tire|summer.?tyre/i },
  { category: 'All-Season Tires', regex: /allwetter|ganzjahres|all.?season|4.?season/i },
  { category: 'SUV/Truck Tires', regex: /suv.?reifen|suv.?tire|truck.?tire|geländewagen|offroad/i },
  { category: 'Performance Tires', regex: /sport.?reifen|performance|uhp|ultra.?high|racing/i },
  { category: 'Tires', regex: /\breifen\b|\btire[s]?\b|\btyre[s]?\b|pneu|pneumatic/i },
  { category: 'Wheels & Rims', regex: /felge|rim\b|wheel\b|alufelge|alloy/i },
  { category: 'Tire Services', regex: /reifenwechsel|tire.?change|mounting|balancing|rotation/i },
  { category: 'Automotive', regex: /\bauto\b|\bcar\b|fahrzeug|vehicle|kfz|pkw/i },

  // Beauty & Personal Care
  { category: 'Anti-Aging', regex: /anti.?age|anti.?aging|anti.?falten|wrinkle|retinol|collagen/i },
  { category: 'Skincare', regex: /skincare|skin.?care|hautpflege|face.?cream|gesichtscreme|serum|moistur|cleanser/i },
  { category: 'Makeup', regex: /makeup|make-up|lipstick|mascara|foundation|eyeshadow|lippenstift|rouge|blush|concealer/i },
  { category: 'Hair Care', regex: /hair.?care|haarpflege|shampoo|conditioner|spülung|haarkur/i },
  { category: 'Body Care', regex: /body.?care|körperpflege|body.?lotion|duschgel|shower|bodywash/i },
  { category: 'Natural Cosmetics', regex: /natural.?cosmetic|natur.?kosmetik|bio.?cosmetic|organic.?beauty/i },
  { category: 'Fragrances', regex: /perfume|parfum|fragrance|duft|eau.?de|cologne/i },
  { category: 'Sun Care', regex: /sun.?care|sonnenschutz|sunscreen|spf|uv.?schutz|sonnencreme/i },

  // Sports & Athletic
  { category: 'Running', regex: /running|laufschuh|jogging|marathon|trail.?run/i },
  { category: 'Football/Soccer', regex: /football|fußball|soccer|fussball/i },
  { category: 'Training', regex: /training|workout|fitness|gym\b|exercise/i },
  { category: 'Sneakers', regex: /sneaker|sportschuh|trainer\b|athletic.?shoe/i },
  { category: 'Outdoor', regex: /outdoor|hiking|wandern|camping|trekking/i },
  { category: 'Cycling', regex: /cycling|fahrrad|bike|bicycle|radfahren/i },

  // Fashion
  { category: 'Apparel', regex: /\bshirt\b|hoodie|jacket|jacke|pants|hose|shorts|dress|kleid/i },
  { category: 'Footwear', regex: /\bshoe[s]?\b|schuh|boots|stiefel|sandal/i },
  { category: 'Accessories', regex: /accessory|accessories|bag|tasche|wallet|belt|gürtel|hat|mütze/i },

  // Technology
  { category: 'Smartphones', regex: /smartphone|iphone|samsung.?galaxy|mobile.?phone|handy/i },
  { category: 'Laptops', regex: /laptop|notebook|macbook|computer/i },
  { category: 'Audio', regex: /headphone|kopfhörer|speaker|lautsprecher|earbuds|audio/i },
  { category: 'Smart Home', regex: /smart.?home|alexa|google.?home|iot|connected/i },

  // Sustainability
  { category: 'Eco-Friendly', regex: /eco.?friendly|öko|nachhaltig|sustainab|umweltfreundlich|green/i },
  { category: 'Vegan', regex: /\bvegan\b|tierversuchsfrei|cruelty.?free|plant.?based/i },

  // Services
  { category: 'Dealer Locator', regex: /händler|dealer|store.?locator|find.?a.?store|standort/i },
  { category: 'Contact', regex: /kontakt|contact|customer.?service|kundenservice|support/i },
  { category: 'Warranty', regex: /garantie|warranty|gewährleistung/i },
];

/**
 * Detect category from keyword using regex patterns
 * @param keyword - The keyword to categorize
 * @param defaultCategory - Category to return if no match (default: 'Other')
 * @returns The detected category name
 */
export function detectCategory(keyword: string, defaultCategory: string = 'Other'): string {
  const kw = keyword.toLowerCase();

  for (const { category, regex } of CATEGORY_PATTERNS) {
    if (regex.test(kw)) {
      return category;
    }
  }

  return defaultCategory;
}

/**
 * Get category for a keyword, preferring API-provided category
 * @param keyword - The keyword text
 * @param apiCategory - Category from API (if available)
 * @param defaultCategory - Fallback category
 * @returns The category to use
 */
export function getCategory(
  keyword: string,
  apiCategory?: string | null,
  defaultCategory: string = 'Uncategorized'
): string {
  // Prefer API-provided category
  if (apiCategory) {
    return apiCategory;
  }

  // Fall back to regex-based detection
  const detected = detectCategory(keyword, defaultCategory);
  return detected;
}
