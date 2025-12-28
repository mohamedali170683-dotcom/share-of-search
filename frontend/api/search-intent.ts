import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SearchIntentResult {
  keyword: string;
  search_intent_info: {
    main_intent: 'informational' | 'navigational' | 'commercial' | 'transactional';
    probability: number;
    foreign_intent?: Array<{
      intent: string;
      probability: number;
    }>;
  };
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

    // Limit to 1000 keywords per request (DataForSEO limit)
    const keywordsToFetch = keywords.slice(0, 1000);

    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      return res.status(500).json({ error: 'DataForSEO credentials not configured on server' });
    }

    const auth = Buffer.from(`${login}:${password}`).toString('base64');

    // Use DataForSEO Labs API for search intent
    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/search_intent/live', {
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

    // Create a map of keyword -> intent info
    const intentMap: Record<string, {
      mainIntent: 'informational' | 'navigational' | 'commercial' | 'transactional';
      probability: number;
      foreignIntents?: Array<{ intent: string; probability: number }>;
    }> = {};

    for (const item of items) {
      if (item.keyword && item.search_intent_info) {
        intentMap[item.keyword.toLowerCase()] = {
          mainIntent: item.search_intent_info.main_intent,
          probability: item.search_intent_info.probability || 0,
          foreignIntents: item.search_intent_info.foreign_intent
        };
      }
    }

    return res.status(200).json({ intentMap });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
