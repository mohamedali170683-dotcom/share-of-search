import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

interface YouTubeVideo {
  title: string;
  channelName: string;
  viewsCount: number;
  rank: number;
  isBrandOwned?: boolean;
}

interface BrandYouTubeData {
  name: string;
  totalVideosInTop20: number;
  totalViews: number;
}

interface ChannelStats {
  name: string;
  videoCount?: number;
  viewCount?: number;
  subscriberCount?: number;
}

interface EarnedMediaSource {
  channelName: string;
  videoCount: number;
  totalViews: number;
}

interface YouTubeData {
  yourBrand: BrandYouTubeData;
  competitors: BrandYouTubeData[];
  allVideos: YouTubeVideo[];
  sov: {
    byCount: number;
    byViews: number;
  };
  ownedVideosCount?: number;
  earnedVideosCount?: number;
  ownedViews?: number;
  earnedViews?: number;
  // New: competitor channel stats from YouTube API
  competitorChannelStats?: Record<string, ChannelStats[]>;
  // New: earned media breakdown
  earnedMediaSources?: EarnedMediaSource[];
}

interface PaidKeyword {
  keyword: string;
  searchVolume: number;
  cpc: number;
  position: number;
}

interface DomainPaidData {
  domain: string;
  paidKeywordsCount: number;
  estimatedTraffic: number;
  estimatedSpend: number;
  avgPosition: number;
  topKeywords: PaidKeyword[];
  positionDistribution: {
    pos1: number;
    pos2_3: number;
    pos4_10: number;
    pos11_plus: number;
  };
}

interface PaidAdsData {
  yourDomain: DomainPaidData | null;
  competitors: DomainPaidData[];
  sov: {
    byTraffic: number;
    byKeywords: number;
    bySpend: number;
  };
  totalMarket: {
    totalTraffic: number;
    totalKeywords: number;
    totalSpend: number;
  };
}

interface RequestBody {
  type: 'youtube' | 'paid-ads';
  brandName: string;
  industry?: string;
  youtubeData?: YouTubeData;
  paidAdsData?: PaidAdsData;
  competitors?: string[];
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured', insights: null });
  }

  try {
    const { type, brandName, industry, youtubeData, paidAdsData, competitors } = req.body as RequestBody;

    if (!brandName) {
      return res.status(400).json({ error: 'Brand name is required' });
    }

    let prompt: string;

    if (type === 'youtube' && youtubeData) {
      // Build competitor owned channel stats (from YouTube API)
      const competitorChannelList = youtubeData.competitorChannelStats
        ? Object.entries(youtubeData.competitorChannelStats)
            .filter(([_, channels]) => channels.length > 0 && channels.some(c => c.videoCount))
            .map(([name, channels]) => {
              const totalVideos = channels.reduce((sum, c) => sum + (c.videoCount || 0), 0);
              const totalViews = channels.reduce((sum, c) => sum + (c.viewCount || 0), 0);
              return `- ${name} (Official Channel): ${totalVideos.toLocaleString()} videos, ${totalViews.toLocaleString()} total views`;
            })
            .join('\n')
        : '';

      // Build earned media sources list
      const earnedSourcesList = youtubeData.earnedMediaSources
        ? youtubeData.earnedMediaSources
            .slice(0, 5)
            .map(s => `  - ${s.channelName}: ${s.videoCount} videos (${s.totalViews.toLocaleString()} views)`)
            .join('\n')
        : '';

      // Owned vs Earned context
      const hasOwnedEarned = youtubeData.ownedVideosCount !== undefined;
      const ownedEarnedContext = hasOwnedEarned
        ? `
YOUR OWNED MEDIA (from your official YouTube channel):
- Videos: ${youtubeData.ownedVideosCount?.toLocaleString() || 0}
- Total Views: ${youtubeData.ownedViews?.toLocaleString() || 0}

YOUR EARNED MEDIA (videos by OTHER channels that mention ${brandName}):
- Videos: ${youtubeData.earnedVideosCount || 0}
- Total Views: ${youtubeData.earnedViews?.toLocaleString() || 0}
${earnedSourcesList ? `\nTop Earned Media Sources:\n${earnedSourcesList}` : ''}`
        : '';

      prompt = `You are a YouTube marketing analyst. Analyze ${brandName}'s YouTube presence with ACCURACY.

IMPORTANT DEFINITIONS:
- OWNED MEDIA = Videos from ${brandName}'s official YouTube channel (they control this)
- EARNED MEDIA = Videos by OTHER channels/creators mentioning ${brandName} (reviews, comparisons, influencers)
- Competitor's OWNED = Videos from competitor's official channels

${brandName.toUpperCase()}'s YOUTUBE DATA:
${ownedEarnedContext || `- Total videos mentioning ${brandName}: ${youtubeData.yourBrand.totalVideosInTop20}`}

COMPETITOR OFFICIAL CHANNELS (Owned Media):
${competitorChannelList || 'No competitor channel data available - using search mentions only'}

SEARCH MENTIONS (from YouTube search results):
${youtubeData.competitors.map(c => `- ${c.name}: ${c.totalVideosInTop20} videos mentioning them`).join('\n')}

ANALYSIS RULES:
1. Compare OWNED vs OWNED (${brandName}'s channel vs competitor channels)
2. Earned media shows brand awareness from third parties
3. Use EXACT numbers from the data
4. Be specific about what type of media you're comparing

Return ONLY valid JSON:
{
  "summary": "[1 sentence: ${brandName}'s owned channel position vs competitors with specific numbers]",
  "keyGap": "[1 sentence: the gap in OWNED channel content vs top competitor's channel]",
  "topAction": "[1 sentence: specific action to improve owned or earned media]",
  "competitorThreat": "[1 sentence: which competitor has strongest owned channel and why]",
  "earnedMediaInsight": "[1 sentence: what the earned media reveals about brand perception - who's talking about ${brandName}]"
}`;

    } else if (type === 'paid-ads' && paidAdsData) {
      const yourData = paidAdsData.yourDomain;
      const competitorList = paidAdsData.competitors
        .map(c => `- ${c.domain}: ${c.paidKeywordsCount} keywords, $${c.estimatedSpend.toLocaleString()}/mo spend, avg pos ${c.avgPosition.toFixed(1)}`)
        .join('\n');

      const topKeywords = yourData?.topKeywords
        .slice(0, 8)
        .map((k, i) => `${i + 1}. "${k.keyword}" - Vol: ${k.searchVolume.toLocaleString()}, CPC: $${k.cpc.toFixed(2)}, Pos: #${k.position}`)
        .join('\n') || 'No keywords found';

      const positionDist = yourData?.positionDistribution
        ? `Position Distribution: #1: ${yourData.positionDistribution.pos1}, #2-3: ${yourData.positionDistribution.pos2_3}, #4-10: ${yourData.positionDistribution.pos4_10}, #11+: ${yourData.positionDistribution.pos11_plus}`
        : '';

      const hasData = yourData && yourData.paidKeywordsCount > 0;

      prompt = `You are a paid search strategist analyzing Google Ads Share of Voice data for ${brandName}${industry ? ` in the ${industry} industry` : ''}.

PAID SEARCH PERFORMANCE DATA:
- Brand: ${brandName}
- Paid Keywords: ${yourData?.paidKeywordsCount || 0}
- Estimated Monthly Traffic: ${yourData?.estimatedTraffic?.toLocaleString() || 0}
- Estimated Monthly Spend: $${yourData?.estimatedSpend?.toLocaleString() || 0}
- Average Ad Position: ${yourData?.avgPosition?.toFixed(1) || 'N/A'}
${positionDist}

SHARE OF VOICE:
- By Traffic: ${paidAdsData.sov.byTraffic}%
- By Keywords: ${paidAdsData.sov.byKeywords}%
- By Spend: ${paidAdsData.sov.bySpend}%

MARKET TOTALS:
- Total Market Traffic: ${paidAdsData.totalMarket.totalTraffic.toLocaleString()}
- Total Market Keywords: ${paidAdsData.totalMarket.totalKeywords.toLocaleString()}
- Total Market Spend: $${paidAdsData.totalMarket.totalSpend.toLocaleString()}

COMPETITOR ANALYSIS:
${competitorList || 'No competitor data available'}

TOP BIDDING KEYWORDS:
${topKeywords}

${!hasData ? 'NOTE: No paid keywords were found for this brand. They may not be running Google Ads or have minimal paid presence.' : ''}

Based on this data, provide strategic insights in JSON format with these EXACT keys:

1. "summary": A 2-sentence executive summary of the brand's paid search position and strategy assessment
2. "strengths": Array of 2-3 specific strengths in their paid search approach (or what they could leverage)
3. "opportunities": Array of 2-3 actionable opportunities to improve paid search ROI
4. "competitorInsight": One key insight about competitor paid strategy that ${brandName} should consider
5. "budgetRecommendation": Specific advice on budget allocation or bid strategy based on the data
6. "priorityAction": The single most important paid search action to take in the next 30 days

${!hasData ? 'Since no paid data exists, focus recommendations on whether/how they should start paid advertising based on competitor activity.' : 'Be specific and data-driven. Reference actual numbers from the data.'}

Return ONLY valid JSON:
{"summary": "...", "strengths": ["...", "..."], "opportunities": ["...", "..."], "competitorInsight": "...", "budgetRecommendation": "...", "priorityAction": "..."}`;

    } else {
      return res.status(400).json({ error: 'Invalid request type or missing data' });
    }

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    let insights = null;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
    }

    return res.status(200).json({ insights });

  } catch (error) {
    console.error('Error generating insights:', error);

    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return res.status(429).json({ error: 'Rate limited. Please try again.', insights: null });
      }
    }

    return res.status(500).json({ error: 'Failed to generate insights', insights: null });
  }
}
