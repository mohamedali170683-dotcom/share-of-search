import type { VercelRequest, VercelResponse } from '@vercel/node';

interface KeywordDifficultyResult {
  keyword: string;
  keyword_difficulty: number;
  search_volume: number;
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
    const { keywords, locationCode, languageCode } = req.body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'Keywords array required' });
    }

    // Limit to 100 keywords per request
    const keywordsToFetch = keywords.slice(0, 100);

    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      return res.status(500).json({ error: 'DataForSEO credentials not configured on server' });
    }

    const auth = Buffer.from(`${login}:${password}`).toString('base64');

    // Use DataForSEO Keywords Data API to get keyword difficulty
    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/bulk_keyword_difficulty/live', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        keywords: keywordsToFetch,
        location_code: locationCode || 2276,
        language_code: languageCode || 'de'
      }])
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.status_message || 'DataForSEO API error');
    }

    const items = data.tasks?.[0]?.result || [];

    // Create a map of keyword -> difficulty
    const difficultyMap: Record<string, number> = {};

    for (const item of items) {
      if (item.keyword && typeof item.keyword_difficulty === 'number') {
        difficultyMap[item.keyword.toLowerCase()] = item.keyword_difficulty;
      }
    }

    return res.status(200).json({ difficultyMap });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
