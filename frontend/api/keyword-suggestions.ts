import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Keyword Suggestions API
 * Uses DataForSEO Labs API to suggest relevant local search terms
 * based on a seed keyword (industry/category)
 */

interface KeywordSuggestion {
  keyword: string;
  searchVolume: number;
  competition: number;
  cpc: number;
}

interface KeywordSuggestionsResponse {
  suggestions: KeywordSuggestion[];
  seedKeyword: string;
  location: string;
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
      seedKeyword,
      locationCode = 2840, // US by default
      languageCode = 'en',
      includeLocalModifiers = true, // Add "near me", city names, etc.
    } = req.body;

    if (!seedKeyword || typeof seedKeyword !== 'string') {
      return res.status(400).json({ error: 'seedKeyword is required' });
    }

    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      return res.status(500).json({
        error: 'DataForSEO credentials not configured'
      });
    }

    const auth = Buffer.from(`${login}:${password}`).toString('base64');

    // Use DataForSEO Labs Keyword Suggestions API
    const response = await fetch(
      'https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          keyword: seedKeyword,
          location_code: locationCode,
          language_code: languageCode,
          include_serp_info: false,
          include_seed_keyword: true,
          limit: 50,
          filters: [
            // Filter for keywords with decent search volume
            ['keyword_info.search_volume', '>', 100]
          ],
          order_by: ['keyword_info.search_volume,desc'],
        }]),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`DataForSEO Keyword Suggestions API error: ${response.status} - ${errorText}`);
      return res.status(500).json({ error: 'Failed to fetch keyword suggestions' });
    }

    const data = await response.json();
    const items = data?.tasks?.[0]?.result?.[0]?.items || [];

    // Extract and format suggestions
    let suggestions: KeywordSuggestion[] = items.map((item: {
      keyword: string;
      keyword_info?: {
        search_volume?: number;
        competition?: number;
        cpc?: number;
      };
    }) => ({
      keyword: item.keyword,
      searchVolume: item.keyword_info?.search_volume || 0,
      competition: item.keyword_info?.competition || 0,
      cpc: item.keyword_info?.cpc || 0,
    }));

    // Filter for local-intent keywords (contain location modifiers or are service-based)
    const localModifiers = ['near me', 'near', 'local', 'nearby', 'best', 'top', 'shop', 'store', 'service', 'repair', 'dealer'];

    if (includeLocalModifiers) {
      // Prioritize keywords with local intent
      suggestions = suggestions.sort((a, b) => {
        const aHasLocal = localModifiers.some(mod => a.keyword.toLowerCase().includes(mod));
        const bHasLocal = localModifiers.some(mod => b.keyword.toLowerCase().includes(mod));

        if (aHasLocal && !bHasLocal) return -1;
        if (!aHasLocal && bHasLocal) return 1;
        return b.searchVolume - a.searchVolume;
      });
    }

    // Take top 10 suggestions
    suggestions = suggestions.slice(0, 10);

    // If we don't have enough local suggestions, add common local modifiers
    if (includeLocalModifiers && suggestions.length < 5) {
      const commonLocalTerms = [
        `${seedKeyword} near me`,
        `best ${seedKeyword}`,
        `${seedKeyword} shop`,
        `local ${seedKeyword}`,
      ];

      for (const term of commonLocalTerms) {
        if (!suggestions.find(s => s.keyword.toLowerCase() === term.toLowerCase())) {
          suggestions.push({
            keyword: term,
            searchVolume: 0, // Unknown, but likely searched
            competition: 0,
            cpc: 0,
          });
        }
      }
    }

    const result: KeywordSuggestionsResponse = {
      suggestions: suggestions.slice(0, 10),
      seedKeyword,
      location: `Location code: ${locationCode}`,
    };

    return res.status(200).json(result);

  } catch (error) {
    console.error('Keyword Suggestions API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
