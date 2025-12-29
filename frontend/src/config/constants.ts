/**
 * Application Constants
 * Centralized configuration for magic numbers and app-wide settings
 */

// ===========================================
// CTR (Click-Through Rate) Curve
// ===========================================
// Based on industry research for Google organic search results
// Source: Various studies including Backlinko, Sistrix, AWR
export const CTR_CURVE: Record<number, number> = {
  1: 0.28,   // Position 1: 28% CTR
  2: 0.15,   // Position 2: 15% CTR
  3: 0.09,   // Position 3: 9% CTR
  4: 0.06,   // Position 4: 6% CTR
  5: 0.04,   // Position 5: 4% CTR
  6: 0.03,   // Position 6: 3% CTR
  7: 0.025,  // Position 7: 2.5% CTR
  8: 0.02,   // Position 8: 2% CTR
  9: 0.018,  // Position 9: 1.8% CTR
  10: 0.015, // Position 10: 1.5% CTR
  11: 0.012, // Position 11: 1.2% CTR
  12: 0.01,  // Position 12: 1% CTR
  13: 0.009, // Position 13: 0.9% CTR
  14: 0.008, // Position 14: 0.8% CTR
  15: 0.007, // Position 15: 0.7% CTR
  16: 0.006, // Position 16: 0.6% CTR
  17: 0.005, // Position 17: 0.5% CTR
  18: 0.004, // Position 18: 0.4% CTR
  19: 0.003, // Position 19: 0.3% CTR
  20: 0.002, // Position 20: 0.2% CTR
};

// Default CTR for positions beyond 20
export const DEFAULT_CTR = 0.001;

// ===========================================
// Storage Limits
// ===========================================
export const MAX_PROJECTS = 10; // Maximum projects stored in localStorage

// ===========================================
// API Configuration
// ===========================================
export const API_TIMEOUT_MS = 30000; // 30 seconds
export const MAX_KEYWORDS_LIMIT = 1000;
export const DEFAULT_KEYWORDS_LIMIT = 100;

// ===========================================
// Quick Wins Thresholds
// ===========================================
export const QUICK_WIN_MIN_VOLUME = 100;
export const QUICK_WIN_MIN_UPLIFT = 50;
export const QUICK_WIN_POSITION_MIN = 4;
export const QUICK_WIN_POSITION_MAX = 20;

// ===========================================
// Hidden Gems Thresholds
// ===========================================
export const HIDDEN_GEM_MIN_VOLUME = 200;
export const HIDDEN_GEM_MAX_KD = 40; // Maximum keyword difficulty

// ===========================================
// Growth Gap Interpretation
// ===========================================
export const GAP_THRESHOLD_HIGH = 2;  // Gap > 2pp = growth potential
export const GAP_THRESHOLD_LOW = -2;  // Gap < -2pp = missing opportunities

// ===========================================
// Category Analysis
// ===========================================
export const CATEGORY_SOV_LEADING = 25;     // SOV >= 25% = leading
export const CATEGORY_SOV_COMPETITIVE = 15; // SOV >= 15% = competitive
export const CATEGORY_SOV_TRAILING = 8;     // SOV >= 8% = trailing
export const CATEGORY_AVG_POSITION_LEADING = 5;
export const CATEGORY_AVG_POSITION_COMPETITIVE = 8;
export const CATEGORY_AVG_POSITION_TRAILING = 12;

// ===========================================
// Content Gaps
// ===========================================
export const CONTENT_GAP_MIN_KEYWORDS = 3;
export const CONTENT_GAP_HIGH_VOLUME = 500;
export const CONTENT_GAP_OPPORTUNITY_HIGH = 50000;
export const CONTENT_GAP_OPPORTUNITY_MEDIUM = 10000;

// ===========================================
// Supported Locations
// ===========================================
export const LOCATIONS = {
  germany: { code: 2276, name: 'Germany', languageCode: 'de' },
  usa: { code: 2840, name: 'United States', languageCode: 'en' },
  uk: { code: 2826, name: 'United Kingdom', languageCode: 'en' },
  france: { code: 2250, name: 'France', languageCode: 'fr' },
  spain: { code: 2724, name: 'Spain', languageCode: 'es' },
} as const;

export type LocationKey = keyof typeof LOCATIONS;

// ===========================================
// UI Configuration
// ===========================================
export const ITEMS_PER_PAGE = 20;
export const TOP_KEYWORDS_DISPLAY = 5;
export const MAX_COMPETITORS_DISPLAY = 5;
