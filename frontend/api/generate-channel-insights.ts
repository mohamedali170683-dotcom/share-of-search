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

interface BrandLocalData {
  name: string;
  totalListings: number;
  avgRating: number;
  totalReviews: number;
  topRank: number | null;
  categories: string[];
}

interface GoogleMapsData {
  yourBrand: BrandLocalData;
  competitors: BrandLocalData[];
  sov: {
    byListings: number;
    byReviews: number;
  };
}

interface RequestBody {
  type: 'youtube' | 'paid-ads' | 'google-maps';
  brandName: string;
  industry?: string;
  youtubeData?: YouTubeData;
  paidAdsData?: PaidAdsData;
  mapsData?: GoogleMapsData;
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
    const { type, brandName, industry, youtubeData, paidAdsData, mapsData, competitors } = req.body as RequestBody;

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

CRITICAL DEFINITIONS (understand these before analyzing):
- OWNED MEDIA = Videos published on ${brandName}'s official YouTube channel(s). This is content THEY create and upload.
- EARNED MEDIA = Videos by THIRD-PARTY channels/creators that mention ${brandName} (reviews, comparisons, influencers). ${brandName} does NOT control this content.
- These are SEPARATE sources: A brand's official channel will NEVER have "earned media" - that's a contradiction.
- Competitor OWNED = Videos on competitor's official channels

${brandName.toUpperCase()}'s YOUTUBE DATA:
${ownedEarnedContext || `- Total videos mentioning ${brandName}: ${youtubeData.yourBrand.totalVideosInTop20}`}

COMPETITOR OFFICIAL CHANNELS (Their Owned Media):
${competitorChannelList || 'No competitor channel data available - using search mentions only'}

SEARCH MENTIONS (from YouTube search results):
${youtubeData.competitors.map(c => `- ${c.name}: ${c.totalVideosInTop20} videos mentioning them`).join('\n')}

ANALYSIS RULES:
1. OWNED vs OWNED comparison: Compare ${brandName}'s channel video count vs competitor channels
2. EARNED media analysis: Evaluate third-party creator coverage (reviews, mentions)
3. NEVER confuse owned and earned - they are completely different sources
4. Use EXACT numbers from the data
5. If ${brandName} has no official channel configured, focus on earned media analysis

Return ONLY valid JSON:
{
  "summary": "[1 sentence: ${brandName}'s YouTube presence overview - owned channel strength AND/OR earned media coverage]",
  "keyGap": "[1 sentence: the main gap - either in owned channel content volume vs competitors, OR in earned media coverage. Be specific about WHICH type.]",
  "topAction": "[1 sentence: specific action - either grow their channel (owned) OR generate more creator reviews (earned)]",
  "competitorThreat": "[1 sentence: which competitor has strongest presence (specify if owned channel or earned coverage)]",
  "earnedMediaInsight": "[1 sentence: what third-party creators are saying about ${brandName} - review sentiment, coverage volume, notable channels]"
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

    } else if (type === 'google-maps' && mapsData) {
      const yourData = mapsData.yourBrand;
      const hasData = yourData && yourData.totalListings > 0;

      // Calculate totals
      const totalMarketListings = (yourData?.totalListings || 0) + mapsData.competitors.reduce((sum, c) => sum + c.totalListings, 0);
      const totalMarketReviews = (yourData?.totalReviews || 0) + mapsData.competitors.reduce((sum, c) => sum + c.totalReviews, 0);

      // Sort competitors by reviews to find leader
      const competitorsSorted = [...mapsData.competitors].sort((a, b) => b.totalReviews - a.totalReviews);
      const reviewLeader = competitorsSorted[0];

      // Determine brand's position
      const yourReviews = yourData?.totalReviews || 0;
      const yourRating = yourData?.avgRating || 0;
      const yourListings = yourData?.totalListings || 0;

      // Clear comparisons
      const hasMoreReviewsThanLeader = reviewLeader ? yourReviews > reviewLeader.totalReviews : true;
      const reviewDifference = reviewLeader ? Math.abs(yourReviews - reviewLeader.totalReviews) : 0;

      // Build clear competitor comparison
      const competitorComparison = mapsData.competitors.map(c => {
        const reviewCompare = yourReviews > c.totalReviews ? 'YOU HAVE MORE' : yourReviews < c.totalReviews ? 'THEY HAVE MORE' : 'EQUAL';
        const ratingCompare = yourRating > c.avgRating ? 'YOU RATE HIGHER' : yourRating < c.avgRating ? 'THEY RATE HIGHER' : 'EQUAL';
        return `- ${c.name}: ${c.totalReviews.toLocaleString()} reviews (${reviewCompare} by ${Math.abs(yourReviews - c.totalReviews).toLocaleString()}), ${c.avgRating.toFixed(1)}★ (${ratingCompare}), ${c.totalListings} locations`;
      }).join('\n');

      prompt = `You are a Local SEO analyst. Analyze this data CAREFULLY and provide accurate insights.

BRAND BEING ANALYZED: ${brandName}

${brandName.toUpperCase()}'S METRICS:
- Locations: ${yourListings}
- Total Reviews: ${yourReviews.toLocaleString()}
- Average Rating: ${yourRating.toFixed(1)}★
- Best Rank: ${yourData?.topRank ? `#${yourData.topRank}` : 'N/A'}

MARKET SHARE:
- Local Presence: ${mapsData.sov.byListings}% (${yourListings} of ${totalMarketListings} total locations)
- Review Share: ${mapsData.sov.byReviews}% (${yourReviews.toLocaleString()} of ${totalMarketReviews.toLocaleString()} total reviews)

COMPETITOR COMPARISON (with clear indicators):
${competitorComparison || 'No competitors analyzed'}

IMPORTANT FACTS (use these for accurate comparisons):
- ${brandName} has ${yourReviews.toLocaleString()} reviews
- ${reviewLeader ? `${reviewLeader.name} (top competitor by reviews) has ${reviewLeader.totalReviews.toLocaleString()} reviews` : 'No competitor data'}
- ${hasMoreReviewsThanLeader ? `${brandName} LEADS in reviews by ${reviewDifference.toLocaleString()}` : `${brandName} TRAILS the leader by ${reviewDifference.toLocaleString()} reviews`}

${!hasData ? 'WARNING: No listings found for this brand - they may need to claim their Google Business Profile.' : ''}

Based on this data, provide insights. BE ACCURATE with comparisons - check the numbers above before stating who has more/less.

Return ONLY valid JSON:
{
  "summary": "2-sentence factual summary of ${brandName}'s local position vs competitors (cite specific numbers)",
  "keyConclusion": "Single most important finding with exact numbers (e.g., '${brandName} leads/trails in reviews with X vs competitor's Y')",
  "priorityAction": "One specific action for this week",
  "reviewStrategy": "Specific advice based on their current review count and rating",
  "competitorThreat": "Which competitor is the biggest threat and why (with numbers)",
  "quickWins": ["3 actionable items"]
}`;

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
