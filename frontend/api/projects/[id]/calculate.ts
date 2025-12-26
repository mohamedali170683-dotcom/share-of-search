import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CTR_CURVE: Record<number, number> = {
  1: 0.28, 2: 0.15, 3: 0.09, 4: 0.06, 5: 0.04,
  6: 0.03, 7: 0.025, 8: 0.02, 9: 0.018, 10: 0.015,
  11: 0.012, 12: 0.01, 13: 0.009, 14: 0.008, 15: 0.007,
  16: 0.006, 17: 0.005, 18: 0.004, 19: 0.003, 20: 0.002
};

function getCTR(position: number): number {
  if (position <= 0) return 0;
  if (position > 20) return 0.001;
  return CTR_CURVE[position] || 0.001;
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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  try {
    // Get project with keywords
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        brandKeywords: true,
        rankedKeywords: true
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Calculate SOS
    const brandVolume = project.brandKeywords
      .filter(k => k.isOwnBrand)
      .reduce((sum, k) => sum + k.searchVolume, 0);

    const totalBrandVolume = project.brandKeywords
      .reduce((sum, k) => sum + k.searchVolume, 0);

    const shareOfSearch = totalBrandVolume > 0
      ? (brandVolume / totalBrandVolume) * 100
      : 0;

    // Calculate SOV
    const keywordBreakdown = project.rankedKeywords.map(kw => {
      const ctr = getCTR(kw.position);
      const visibleVolume = kw.searchVolume * ctr;
      return {
        ...kw,
        ctr: Math.round(ctr * 1000) / 10,
        visibleVolume: Math.round(visibleVolume)
      };
    });

    const visibleVolume = keywordBreakdown.reduce((sum, k) => sum + (k.visibleVolume || 0), 0);
    const totalMarketVolume = project.rankedKeywords.reduce((sum, k) => sum + k.searchVolume, 0);

    const shareOfVoice = totalMarketVolume > 0
      ? (visibleVolume / totalMarketVolume) * 100
      : 0;

    // Calculate Gap
    const gap = shareOfVoice - shareOfSearch;
    let interpretation: string;
    if (gap > 2) interpretation = 'growth_potential';
    else if (gap < -2) interpretation = 'missing_opportunities';
    else interpretation = 'balanced';

    // Save calculation to database
    const calculation = await prisma.calculation.create({
      data: {
        projectId: id,
        shareOfSearch: Math.round(shareOfSearch * 10) / 10,
        brandVolume,
        totalBrandVolume,
        shareOfVoice: Math.round(shareOfVoice * 10) / 10,
        visibleVolume: Math.round(visibleVolume),
        totalMarketVolume,
        gap: Math.round(gap * 10) / 10,
        interpretation
      }
    });

    return res.status(200).json({
      sos: {
        shareOfSearch: calculation.shareOfSearch,
        brandVolume: calculation.brandVolume,
        totalBrandVolume: calculation.totalBrandVolume
      },
      sov: {
        shareOfVoice: calculation.shareOfVoice,
        visibleVolume: calculation.visibleVolume,
        totalMarketVolume: calculation.totalMarketVolume,
        keywordBreakdown
      },
      gap: {
        gap: calculation.gap,
        interpretation: calculation.interpretation
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  } finally {
    await prisma.$disconnect();
  }
}
