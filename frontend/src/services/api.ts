import type {
  BrandKeyword,
  RankedKeyword,
  CalculateResponse,
  SampleDataResponse,
  Project
} from '../types';

// Use relative paths for Vercel deployment, absolute for local development
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 30000;

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Re-export Project type for convenience
export type { Project };

export async function getSampleData(): Promise<SampleDataResponse> {
  const response = await fetchWithTimeout(`${API_BASE}/sample-data`);
  if (!response.ok) throw new Error('Failed to fetch sample data');
  return response.json();
}

export async function calculateMetrics(
  brandKeywords: BrandKeyword[],
  rankedKeywords: RankedKeyword[]
): Promise<CalculateResponse> {
  const response = await fetchWithTimeout(`${API_BASE}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brandKeywords, rankedKeywords })
  });
  if (!response.ok) throw new Error('Failed to calculate metrics');
  return response.json();
}

export async function getRankedKeywords(
  domain: string,
  locationCode: number,
  languageCode: string,
  limit: number
): Promise<{ results: RankedKeyword[] }> {
  const response = await fetchWithTimeout(`${API_BASE}/ranked-keywords`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, locationCode, languageCode, limit })
  });
  if (!response.ok) {
    let errorMessage = 'Failed to fetch ranked keywords';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      // Response was not JSON (e.g., HTML error page)
      const text = await response.text().catch(() => '');
      if (text.includes('credentials') || text.includes('API')) {
        errorMessage = 'API credentials not configured. Please check server environment variables.';
      } else if (response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function getBrandKeywords(
  domain: string,
  locationCode: number,
  languageCode: string,
  customCompetitors?: string[]
): Promise<{
  brandName: string;
  industry: string;
  brandKeywords: BrandKeyword[];
  competitors: string[];
}> {
  const response = await fetchWithTimeout(`${API_BASE}/brand-keywords`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, locationCode, languageCode, customCompetitors })
  });
  if (!response.ok) {
    let errorMessage = 'Failed to fetch brand keywords';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      // Response was not JSON (e.g., HTML error page)
      const text = await response.text().catch(() => '');
      if (text.includes('credentials') || text.includes('API')) {
        errorMessage = 'API credentials not configured. Please check server environment variables.';
      } else if (response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

// Trends data types
export interface TrendPoint {
  period: string;
  monthsAgo: number;
  sos?: number;
  sov?: number;
  brandVolume?: number;
  totalVolume?: number;
  visibleVolume?: number;
  totalMarketVolume?: number;
}

export interface KeywordImpactItem {
  keyword: string;
  position: number;
  volumeChange: number;
  impactChange: number;
}

export interface CompetitorTrend {
  name: string;
  trends: Array<{ period: string; monthsAgo: number; sos: number }>;
}

export interface TrendsData {
  brandName: string;
  sosTrends: TrendPoint[];
  sovTrends: TrendPoint[];
  competitorTrends?: CompetitorTrend[];
  changes: {
    sos: {
      vs6MonthsAgo: number;
      vs12MonthsAgo: number;
    };
    sov: {
      vs6MonthsAgo: number;
      vs12MonthsAgo: number;
    };
  };
  keywordImpact?: {
    branded: {
      gainers: KeywordImpactItem[];
      losers: KeywordImpactItem[];
    };
    generic: {
      gainers: KeywordImpactItem[];
      losers: KeywordImpactItem[];
    };
  };
}

export async function getTrends(
  domain: string,
  locationCode: number,
  languageCode: string,
  customCompetitors?: string[]
): Promise<TrendsData> {
  const response = await fetchWithTimeout(`${API_BASE}/trends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, locationCode, languageCode, customCompetitors })
  });
  if (!response.ok) {
    let errorMessage = 'Failed to fetch trends data';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      // Response was not JSON (e.g., HTML error page)
      const text = await response.text().catch(() => '');
      if (text.includes('credentials') || text.includes('API')) {
        errorMessage = 'API credentials not configured. Please check server environment variables.';
      } else if (response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

// Project management functions (for database-backed API)
export async function getProjectsFromAPI(): Promise<Project[]> {
  const response = await fetchWithTimeout(`${API_BASE}/projects`);
  if (!response.ok) throw new Error('Failed to fetch projects');
  return response.json();
}

export async function getProjectFromAPI(id: string): Promise<Project> {
  const response = await fetchWithTimeout(`${API_BASE}/projects/${id}`);
  if (!response.ok) throw new Error('Failed to fetch project');
  return response.json();
}

export async function createProjectInAPI(data: {
  name: string;
  domain?: string;
  locationCode?: number;
  languageCode?: string;
}): Promise<Project> {
  const response = await fetchWithTimeout(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create project');
  return response.json();
}

export async function updateProjectInAPI(
  id: string,
  data: {
    name?: string;
    domain?: string;
    locationCode?: number;
    languageCode?: string;
    brandKeywords?: BrandKeyword[];
    rankedKeywords?: RankedKeyword[];
  }
): Promise<Project> {
  const response = await fetchWithTimeout(`${API_BASE}/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to update project');
  return response.json();
}

export async function deleteProjectFromAPI(id: string): Promise<void> {
  const response = await fetchWithTimeout(`${API_BASE}/projects/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete project');
}

export async function calculateProjectMetrics(projectId: string): Promise<CalculateResponse> {
  const response = await fetchWithTimeout(`${API_BASE}/projects/${projectId}/calculate`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to calculate project metrics');
  return response.json();
}

// Competitor Analysis types and API
export interface CompetitorThreat {
  keyword: string;
  searchVolume: number;
  yourPosition: number | null;
  competitorPosition: number;
  positionDiff: number;
  yourUrl?: string;
  competitorUrl: string;
  opportunityScore: number;
}

export interface CompetitorGap {
  keyword: string;
  searchVolume: number;
  yourPosition: number | null; // null = not ranking in top 100, number = ranking but below competitor
  competitorPosition: number;
  competitorUrl: string;
  opportunityScore: number;
}

export interface CompetitorWin {
  keyword: string;
  searchVolume: number;
  yourPosition: number;
  competitorPosition: number;
  positionDiff: number;
}

export interface CompetitorKeywordAnalysis {
  competitor: string;
  competitorDomain: string;
  threats: CompetitorThreat[];
  gaps: CompetitorGap[];
  yourWins: CompetitorWin[];
  summary: {
    totalOverlap: number;
    threatsCount: number;
    gapsCount: number;
    winsCount: number;
    threatVolume: number;
    gapVolume: number;
  };
}

export interface CompetitorAnalysisResponse {
  yourDomain: string;
  yourKeywordsCount: number;
  competitors: CompetitorKeywordAnalysis[];
}

export async function getCompetitorAnalysis(
  domain: string,
  locationCode: number,
  languageCode: string,
  competitors: string[]
): Promise<CompetitorAnalysisResponse> {
  const response = await fetchWithTimeout(`${API_BASE}/competitor-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, locationCode, languageCode, competitors })
  }, 120000); // 2 minute timeout for this heavy operation

  if (!response.ok) {
    let errorMessage = 'Failed to analyze competitors';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      // Ignore parse errors
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export function exportToCSV(
  brandKeywords: BrandKeyword[],
  rankedKeywords: RankedKeyword[],
  sos: number,
  sov: number,
  gap: number
): void {
  const lines: string[] = [];

  // Summary section
  lines.push('SearchShare Pro Export');
  lines.push(`Generated,${new Date().toISOString()}`);
  lines.push('');
  lines.push('METRICS SUMMARY');
  lines.push(`Share of Search,${sos}%`);
  lines.push(`Share of Voice,${sov}%`);
  lines.push(`Growth Gap,${gap}pp`);
  lines.push('');

  // Brand Keywords section
  lines.push('BRAND KEYWORDS (Share of Search)');
  lines.push('Keyword,Search Volume,Type');
  brandKeywords.forEach(kw => {
    lines.push(`"${kw.keyword}",${kw.searchVolume},${kw.isOwnBrand ? 'Own Brand' : 'Competitor'}`);
  });
  lines.push('');

  // Ranked Keywords section
  lines.push('RANKED KEYWORDS (Share of Voice)');
  lines.push('Keyword,Search Volume,Position,CTR %,Visible Volume,URL');
  rankedKeywords.forEach(kw => {
    lines.push(`"${kw.keyword}",${kw.searchVolume},${kw.position},${kw.ctr || 0},${kw.visibleVolume || 0},"${kw.url || ''}"`);
  });

  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `searchshare-pro-export-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

// Social Media SOV types and API
export interface SocialMention {
  platform: 'instagram' | 'tiktok' | 'youtube' | 'reddit';
  text: string;
  url?: string;
  engagement: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
  author?: string;
  timestamp?: string;
}

export interface BrandMentions {
  brand: string;
  mentions: SocialMention[];
  totalMentions: number;
  totalEngagement: number;
  byPlatform: Record<string, { count: number; engagement: number }>;
}

export interface SocialSOVResponse {
  yourBrand: BrandMentions;
  competitors: BrandMentions[];
  sov: {
    byMentions: number;
    byEngagement: number;
  };
  timestamp: string;
}

export async function getSocialMentions(
  brandName: string,
  competitors: string[] = []
): Promise<SocialSOVResponse> {
  const response = await fetchWithTimeout(`${API_BASE}/social-mentions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brandName, competitors })
  }, 180000); // 3 minute timeout for social scraping

  if (!response.ok) {
    let errorMessage = 'Failed to fetch social mentions';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      if (response.status === 500) {
        errorMessage = 'Apify API error. Please check your API token.';
      }
    }
    throw new Error(errorMessage);
  }
  return response.json();
}
