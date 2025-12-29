/**
 * API Input Validation Utilities
 * Lightweight validation without external dependencies
 */

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Domain validation regex - allows subdomains and various TLDs
const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

// Valid location codes (DataForSEO)
const VALID_LOCATION_CODES = new Set([
  2276, // Germany
  2840, // United States
  2826, // United Kingdom
  2250, // France
  2724, // Spain
  2380, // Italy
  2528, // Netherlands
  2056, // Belgium
  2040, // Austria
  2756, // Switzerland
  2616, // Poland
  2752, // Sweden
  2578, // Norway
  2208, // Denmark
  2246, // Finland
]);

// Valid language codes
const VALID_LANGUAGE_CODES = new Set([
  'de', 'en', 'fr', 'es', 'it', 'nl', 'pl', 'sv', 'no', 'da', 'fi', 'pt'
]);

/**
 * Validate domain format
 */
export function validateDomain(domain: unknown): ValidationResult<string> {
  if (typeof domain !== 'string') {
    return { success: false, error: 'Domain must be a string' };
  }

  // Clean the domain
  const cleaned = domain
    .toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .replace(/\/.*$/, '')
    .trim();

  if (!cleaned) {
    return { success: false, error: 'Domain is required' };
  }

  if (cleaned.length > 253) {
    return { success: false, error: 'Domain is too long' };
  }

  if (!DOMAIN_REGEX.test(cleaned)) {
    return { success: false, error: 'Invalid domain format' };
  }

  return { success: true, data: cleaned };
}

/**
 * Validate location code
 */
export function validateLocationCode(code: unknown): ValidationResult<number> {
  if (typeof code !== 'number' || !Number.isInteger(code)) {
    return { success: false, error: 'Location code must be an integer' };
  }

  if (!VALID_LOCATION_CODES.has(code)) {
    return { success: false, error: `Invalid location code: ${code}` };
  }

  return { success: true, data: code };
}

/**
 * Validate language code
 */
export function validateLanguageCode(code: unknown): ValidationResult<string> {
  if (typeof code !== 'string') {
    return { success: false, error: 'Language code must be a string' };
  }

  const cleaned = code.toLowerCase().trim();

  if (!VALID_LANGUAGE_CODES.has(cleaned)) {
    return { success: false, error: `Invalid language code: ${code}` };
  }

  return { success: true, data: cleaned };
}

/**
 * Validate limit parameter
 */
export function validateLimit(limit: unknown, max: number = 1000): ValidationResult<number> {
  if (limit === undefined || limit === null) {
    return { success: true, data: 100 }; // Default
  }

  if (typeof limit !== 'number' || !Number.isInteger(limit)) {
    return { success: false, error: 'Limit must be an integer' };
  }

  if (limit < 1) {
    return { success: false, error: 'Limit must be at least 1' };
  }

  if (limit > max) {
    return { success: false, error: `Limit cannot exceed ${max}` };
  }

  return { success: true, data: limit };
}

/**
 * Validate custom competitors array
 */
export function validateCompetitors(competitors: unknown): ValidationResult<string[] | undefined> {
  if (competitors === undefined || competitors === null) {
    return { success: true, data: undefined };
  }

  if (!Array.isArray(competitors)) {
    return { success: false, error: 'Competitors must be an array' };
  }

  if (competitors.length > 20) {
    return { success: false, error: 'Maximum 20 custom competitors allowed' };
  }

  const cleaned: string[] = [];
  for (const comp of competitors) {
    if (typeof comp !== 'string') {
      return { success: false, error: 'Each competitor must be a string' };
    }
    const trimmed = comp.trim().toLowerCase();
    if (trimmed.length > 0 && trimmed.length <= 100) {
      cleaned.push(trimmed);
    }
  }

  return { success: true, data: cleaned.length > 0 ? cleaned : undefined };
}

/**
 * Validate brand keywords array
 */
export function validateBrandKeywords(keywords: unknown): ValidationResult<Array<{
  keyword: string;
  searchVolume: number;
  isOwnBrand: boolean;
}>> {
  if (!Array.isArray(keywords)) {
    return { success: false, error: 'Brand keywords must be an array' };
  }

  if (keywords.length === 0) {
    return { success: false, error: 'At least one brand keyword is required' };
  }

  if (keywords.length > 500) {
    return { success: false, error: 'Maximum 500 brand keywords allowed' };
  }

  const validated: Array<{ keyword: string; searchVolume: number; isOwnBrand: boolean }> = [];

  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i];

    if (typeof kw !== 'object' || kw === null) {
      return { success: false, error: `Invalid keyword at index ${i}` };
    }

    if (typeof kw.keyword !== 'string' || kw.keyword.trim().length === 0) {
      return { success: false, error: `Invalid keyword text at index ${i}` };
    }

    if (typeof kw.searchVolume !== 'number' || kw.searchVolume < 0) {
      return { success: false, error: `Invalid search volume at index ${i}` };
    }

    if (typeof kw.isOwnBrand !== 'boolean') {
      return { success: false, error: `Invalid isOwnBrand at index ${i}` };
    }

    validated.push({
      keyword: kw.keyword.trim(),
      searchVolume: Math.floor(kw.searchVolume),
      isOwnBrand: kw.isOwnBrand
    });
  }

  return { success: true, data: validated };
}

/**
 * Validate ranked keywords array
 */
export function validateRankedKeywords(keywords: unknown): ValidationResult<Array<{
  keyword: string;
  searchVolume: number;
  position: number;
  url?: string;
}>> {
  if (!Array.isArray(keywords)) {
    return { success: false, error: 'Ranked keywords must be an array' };
  }

  if (keywords.length === 0) {
    return { success: false, error: 'At least one ranked keyword is required' };
  }

  if (keywords.length > 1000) {
    return { success: false, error: 'Maximum 1000 ranked keywords allowed' };
  }

  const validated: Array<{ keyword: string; searchVolume: number; position: number; url?: string }> = [];

  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i];

    if (typeof kw !== 'object' || kw === null) {
      return { success: false, error: `Invalid keyword at index ${i}` };
    }

    if (typeof kw.keyword !== 'string' || kw.keyword.trim().length === 0) {
      return { success: false, error: `Invalid keyword text at index ${i}` };
    }

    if (typeof kw.searchVolume !== 'number' || kw.searchVolume < 0) {
      return { success: false, error: `Invalid search volume at index ${i}` };
    }

    if (typeof kw.position !== 'number' || kw.position < 1 || kw.position > 100) {
      return { success: false, error: `Invalid position at index ${i}` };
    }

    validated.push({
      keyword: kw.keyword.trim(),
      searchVolume: Math.floor(kw.searchVolume),
      position: Math.floor(kw.position),
      url: typeof kw.url === 'string' ? kw.url.trim() : undefined
    });
  }

  return { success: true, data: validated };
}

/**
 * Get allowed origins based on environment
 */
export function getAllowedOrigin(requestOrigin: string | undefined): string {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

  // In development, allow all origins
  if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development') {
    return '*';
  }

  // In production, check against allowed list
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Default to the primary production domain
  return process.env.PRODUCTION_URL || 'https://searchshare.pro';
}
