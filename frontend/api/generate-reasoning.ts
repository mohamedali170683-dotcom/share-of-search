import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

interface Opportunity {
  id: string;
  keyword: string;
  type: 'quick-win' | 'hidden-gem' | 'content-gap' | 'cannibalization';
  priority: number;
  searchVolume: number;
  clickPotential: number;
  effort: 'low' | 'medium' | 'high';
  currentPosition?: number;
  targetPosition?: number;
  keywordDifficulty?: number;
  category?: string;
}

interface BrandContext {
  brandName: string;
  industry: string;
  vertical: string;
  productCategories: string[];
  targetAudience: string;
  competitorContext: string;
  keyStrengths: string[];
  marketPosition: string;
  seoFocus: string[];
}

interface RequestBody {
  opportunities: Opportunity[];
  brandContext: BrandContext;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY not configured',
      reasonings: {}
    });
  }

  try {
    const { opportunities, brandContext } = req.body as RequestBody;

    if (!opportunities || !Array.isArray(opportunities) || opportunities.length === 0) {
      return res.status(400).json({ error: 'No opportunities provided' });
    }

    if (!brandContext) {
      return res.status(400).json({ error: 'No brand context provided' });
    }

    // Limit to 20 keywords per request for cost control
    const limitedOpportunities = opportunities.slice(0, 20);

    // Build the prompt
    const keywordsList = limitedOpportunities.map((opp, i) => {
      const parts = [
        `${i + 1}. "${opp.keyword}"`,
        `Type: ${opp.type}`,
        `Volume: ${opp.searchVolume.toLocaleString()}`
      ];

      if (opp.currentPosition) parts.push(`Position: #${opp.currentPosition}`);
      if (opp.targetPosition) parts.push(`Target: #${opp.targetPosition}`);
      if (opp.keywordDifficulty !== undefined) parts.push(`KD: ${opp.keywordDifficulty}`);
      if (opp.category) parts.push(`Category: ${opp.category}`);
      parts.push(`Effort: ${opp.effort}`);
      parts.push(`Click Potential: +${opp.clickPotential.toLocaleString()}`);

      return parts.join(' | ');
    }).join('\n');

    const prompt = `You are an SEO strategist analyzing keyword opportunities for ${brandContext.brandName}, a ${brandContext.marketPosition} in the ${brandContext.industry} industry.

Brand Context:
- Target Audience: ${brandContext.targetAudience}
- Competitors: ${brandContext.competitorContext}
- Key Strengths: ${brandContext.keyStrengths.length > 0 ? brandContext.keyStrengths.join(', ') : 'Not specified'}
- SEO Focus Areas: ${brandContext.seoFocus.join(', ')}

For each keyword below, write 2-3 sentences that:
1. Explain why THIS specific keyword matters for ${brandContext.brandName}'s business (not generic SEO advice)
2. Describe the strategic opportunity based on their market position
3. Give one concrete, actionable recommendation

Be specific and avoid generic phrases like "high-volume keyword" or "improving position will increase traffic". Instead, connect each keyword to the business context.

Keywords to analyze:
${keywordsList}

IMPORTANT: Return ONLY a valid JSON object with this exact format (no markdown, no explanation):
{"reasonings": {"keyword1": "reasoning text...", "keyword2": "reasoning text..."}}

Use the exact keyword text as keys.`;

    // Call Claude API
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract the text content
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse the JSON response
    let reasonings: Record<string, string> = {};
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        reasonings = parsed.reasonings || parsed;
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      // Return empty reasonings if parsing fails
    }

    return res.status(200).json({ reasonings });

  } catch (error) {
    console.error('Error generating reasoning:', error);

    // Check for specific error types
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return res.status(500).json({
          error: 'Invalid API key',
          reasonings: {}
        });
      }
      if (error.status === 429) {
        return res.status(429).json({
          error: 'Rate limited. Please try again in a moment.',
          reasonings: {}
        });
      }
    }

    return res.status(500).json({
      error: 'Failed to generate reasoning',
      reasonings: {}
    });
  }
}
