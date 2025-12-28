import type {
  BrandKeyword,
  RankedKeyword,
  CalculateResponse,
  SampleDataResponse,
  BrandContext,
  SearchIntent,
  FunnelStage
} from '../types';

// Use relative paths for Vercel deployment, absolute for local development
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

// Project types
export interface Project {
  id: string;
  name: string;
  domain: string | null;
  locationCode: number;
  languageCode: string;
  createdAt: string;
  updatedAt: string;
  brandKeywords?: BrandKeyword[];
  rankedKeywords?: RankedKeyword[];
  _count?: {
    brandKeywords: number;
    rankedKeywords: number;
    calculations: number;
  };
}

export async function getSampleData(): Promise<SampleDataResponse> {
  const response = await fetch(`${API_BASE}/sample-data`);
  if (!response.ok) throw new Error('Failed to fetch sample data');
  return response.json();
}

export async function calculateMetrics(
  brandKeywords: BrandKeyword[],
  rankedKeywords: RankedKeyword[]
): Promise<CalculateResponse> {
  const response = await fetch(`${API_BASE}/calculate`, {
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
  const response = await fetch(`${API_BASE}/ranked-keywords`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, locationCode, languageCode, limit })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch ranked keywords');
  }
  return response.json();
}

// Fetch keyword difficulty scores for a list of keywords
export async function getKeywordDifficulty(
  keywords: string[],
  locationCode: number,
  languageCode: string
): Promise<Record<string, number>> {
  const response = await fetch(`${API_BASE}/keyword-difficulty`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords, locationCode, languageCode })
  });
  if (!response.ok) {
    // Silently return empty if KD fetch fails (graceful degradation)
    console.warn('Failed to fetch keyword difficulty data');
    return {};
  }
  const data = await response.json();
  return data.difficultyMap || {};
}

// Search intent info from DataForSEO
export interface SearchIntentData {
  mainIntent: SearchIntent;
  probability: number;
  foreignIntents?: Array<{ intent: string; probability: number }>;
  funnelStage: FunnelStage;
}

// Map intent to funnel stage
function intentToFunnelStage(intent: SearchIntent): FunnelStage {
  switch (intent) {
    case 'informational':
      return 'awareness';
    case 'navigational':
      return 'awareness'; // Brand awareness
    case 'commercial':
      return 'consideration';
    case 'transactional':
      return 'decision';
    default:
      return 'awareness';
  }
}

// Fetch search intent for a list of keywords
export async function getSearchIntent(
  keywords: string[],
  locationCode: number,
  languageCode: string
): Promise<Record<string, SearchIntentData>> {
  console.log('[API] Calling search-intent with', keywords.length, 'keywords');

  const response = await fetch(`${API_BASE}/search-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords, locationCode, languageCode })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[API] search-intent failed:', response.status, errorText);
    return {};
  }

  const data = await response.json();
  console.log('[API] search-intent raw response:', data);

  // Log debug info from backend - this shows what DataForSEO returned
  if (data.debug) {
    console.log('[API] DataForSEO debug:', data.debug);
    console.log('[API] resultLength:', data.debug.resultLength);
    console.log('[API] resultKeys:', data.debug.resultKeys);
    console.log('[API] itemsLength:', data.debug.itemsLength);
    console.log('[API] parsedItemsCount:', data.debug.parsedItemsCount);
    console.log('[API] resultSample:', data.debug.resultSample);
  }

  // Check for API-level errors (task failures from DataForSEO)
  if (data.error) {
    console.error('[API] search-intent API error:', data.error);
  }

  // Convert API response to our format with funnel stage
  const intentMap: Record<string, SearchIntentData> = {};
  const rawMap = data.intentMap || {};
  console.log('[API] intentMap has', Object.keys(rawMap).length, 'entries');

  for (const [keyword, info] of Object.entries(rawMap)) {
    const intentInfo = info as {
      mainIntent: SearchIntent;
      probability: number;
      foreignIntents?: Array<{ intent: string; probability: number }>;
    };
    intentMap[keyword] = {
      ...intentInfo,
      funnelStage: intentToFunnelStage(intentInfo.mainIntent)
    };
  }

  return intentMap;
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
  const response = await fetch(`${API_BASE}/brand-keywords`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, locationCode, languageCode, customCompetitors })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch brand keywords');
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
  const response = await fetch(`${API_BASE}/trends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, locationCode, languageCode, customCompetitors })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch trends data');
  }
  return response.json();
}

// Brand Context - AI-powered analysis of brand industry and vertical
export async function getBrandContext(params: {
  domain: string;
  brandName: string;
  topKeywords: string[];
  competitors: string[];
  avgPosition: number;
  keywordCount: number;
  sosValue: number;
  sovValue: number;
}): Promise<BrandContext> {
  const response = await fetch(`${API_BASE}/brand-context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze brand context');
  }
  return response.json();
}

// Project management functions
export async function getProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE}/projects`);
  if (!response.ok) throw new Error('Failed to fetch projects');
  return response.json();
}

export async function getProject(id: string): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects/${id}`);
  if (!response.ok) throw new Error('Failed to fetch project');
  return response.json();
}

export async function createProject(data: {
  name: string;
  domain?: string;
  locationCode?: number;
  languageCode?: string;
}): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create project');
  return response.json();
}

export async function updateProject(
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
  const response = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to update project');
  return response.json();
}

export async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete project');
}

export async function calculateProjectMetrics(projectId: string): Promise<CalculateResponse> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/calculate`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to calculate project metrics');
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
