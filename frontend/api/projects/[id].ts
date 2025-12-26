import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  try {
    if (req.method === 'GET') {
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          brandKeywords: true,
          rankedKeywords: true,
          calculations: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      return res.status(200).json(project);
    }

    if (req.method === 'PUT') {
      const { name, domain, locationCode, languageCode, brandKeywords, rankedKeywords } = req.body;

      // Update project with new data
      const project = await prisma.project.update({
        where: { id },
        data: {
          name,
          domain,
          locationCode,
          languageCode,
          // Delete existing keywords and add new ones
          brandKeywords: brandKeywords ? {
            deleteMany: {},
            create: brandKeywords.map((kw: { keyword: string; searchVolume: number; isOwnBrand: boolean }) => ({
              keyword: kw.keyword,
              searchVolume: kw.searchVolume,
              isOwnBrand: kw.isOwnBrand
            }))
          } : undefined,
          rankedKeywords: rankedKeywords ? {
            deleteMany: {},
            create: rankedKeywords.map((kw: { keyword: string; searchVolume: number; position: number; url?: string; ctr?: number; visibleVolume?: number }) => ({
              keyword: kw.keyword,
              searchVolume: kw.searchVolume,
              position: kw.position,
              url: kw.url,
              ctr: kw.ctr,
              visibleVolume: kw.visibleVolume
            }))
          } : undefined
        },
        include: {
          brandKeywords: true,
          rankedKeywords: true
        }
      });

      return res.status(200).json(project);
    }

    if (req.method === 'DELETE') {
      await prisma.project.delete({
        where: { id }
      });

      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  } finally {
    await prisma.$disconnect();
  }
}
