import type {
  BrandKeyword,
  RankedKeyword,
  CalculateResponse,
  SampleDataResponse
} from '../types';

const API_BASE = 'http://localhost:3001/api';

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

export async function calculateSampleMetrics(): Promise<CalculateResponse> {
  const response = await fetch(`${API_BASE}/calculate-sample`);
  if (!response.ok) throw new Error('Failed to calculate sample metrics');
  return response.json();
}

export async function getSearchVolume(
  keywords: string[],
  locationCode: number,
  languageCode: string,
  login: string,
  password: string
): Promise<{ results: Array<{ keyword: string; search_volume: number }> }> {
  const response = await fetch(`${API_BASE}/search-volume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords, locationCode, languageCode, login, password })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch search volume');
  }
  return response.json();
}

export async function getRankedKeywords(
  domain: string,
  locationCode: number,
  languageCode: string,
  limit: number,
  login: string,
  password: string
): Promise<{ results: RankedKeyword[] }> {
  const response = await fetch(`${API_BASE}/ranked-keywords`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, locationCode, languageCode, limit, login, password })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch ranked keywords');
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
