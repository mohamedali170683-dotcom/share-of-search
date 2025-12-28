import type { VercelRequest, VercelResponse } from '@vercel/node';

// DataForSEO Labs Search Intent API uses these field names
interface SearchIntentResult {
  keyword: string;
  keyword_intent: {
    label: 'informational' | 'navigational' | 'commercial' | 'transactional';
    probability: number;
  };
  secondary_keyword_intents?: Array<{
    label: string;
    probability: number;
  }> | null;
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

    // Log full response for debugging
    console.log('[search-intent] DataForSEO response status:', data.status_code, data.status_message);
    console.log('[search-intent] Tasks count:', data.tasks?.length);

    // Capture debug info to return to frontend
    const debugInfo: Record<string, unknown> = {
      responseStatus: data.status_code,
      responseMessage: data.status_message,
      tasksCount: data.tasks?.length || 0
    };

    if (data.tasks?.[0]) {
      const task = data.tasks[0];
      console.log('[search-intent] Task 0 status:', task.status_code, task.status_message);
      console.log('[search-intent] Task 0 result length:', task.result?.length);
      console.log('[search-intent] Task 0 result[0] keys:', task.result?.[0] ? Object.keys(task.result[0]) : 'no result');
      console.log('[search-intent] Task 0 result[0].items length:', task.result?.[0]?.items?.length);
      console.log('[search-intent] Task 0 full result:', JSON.stringify(task.result)?.substring(0, 2000));

      debugInfo.taskStatus = task.status_code;
      debugInfo.taskMessage = task.status_message;
      debugInfo.resultLength = task.result?.length || 0;
      debugInfo.resultKeys = task.result?.[0] ? Object.keys(task.result[0]) : [];
      debugInfo.itemsLength = task.result?.[0]?.items?.length || 0;
      debugInfo.resultSample = task.result?.[0] ? JSON.stringify(task.result[0]).substring(0, 500) : 'empty';
    }

    if (!response.ok) {
      throw new Error(data.status_message || 'DataForSEO API error');
    }

    // Check for task-level errors
    if (data.tasks?.[0]?.status_code !== 20000) {
      console.error('[search-intent] Task error:', data.tasks?.[0]?.status_message);
      return res.status(200).json({
        intentMap: {},
        error: data.tasks?.[0]?.status_message || 'DataForSEO task failed',
        debug: debugInfo
      });
    }

    // DataForSEO Labs Search Intent API returns items directly in result array
    // Items have: keyword, keyword_intent { label, probability }, secondary_keyword_intents
    const taskResult = data.tasks?.[0]?.result || [];
    console.log('[search-intent] Result array length:', taskResult.length);

    // Create a map of keyword -> intent info
    const intentMap: Record<string, {
      mainIntent: 'informational' | 'navigational' | 'commercial' | 'transactional';
      probability: number;
      foreignIntents?: Array<{ intent: string; probability: number }>;
    }> = {};

    for (const item of taskResult) {
      // DataForSEO uses keyword_intent.label (not search_intent_info.main_intent)
      if (item.keyword && item.keyword_intent) {
        intentMap[item.keyword.toLowerCase()] = {
          mainIntent: item.keyword_intent.label as 'informational' | 'navigational' | 'commercial' | 'transactional',
          probability: item.keyword_intent.probability || 0,
          foreignIntents: item.secondary_keyword_intents?.map((s: { label: string; probability: number }) => ({
            intent: s.label,
            probability: s.probability
          }))
        };
      }
    }

    console.log('[search-intent] Parsed', Object.keys(intentMap).length, 'keywords with intent');

    // Always return debug info so we can diagnose issues
    debugInfo.parsedItemsCount = taskResult.length;
    debugInfo.intentMapCount = Object.keys(intentMap).length;
    return res.status(200).json({ intentMap, debug: debugInfo });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
