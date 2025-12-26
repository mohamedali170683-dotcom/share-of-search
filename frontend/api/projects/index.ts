import type { VercelRequest, VercelResponse } from '@vercel/node';

// Dynamic import to handle missing Prisma client
async function getPrismaClient() {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  try {
    const { PrismaClient } = await import('@prisma/client');
    return new PrismaClient();
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const prisma = await getPrismaClient();

  if (!prisma) {
    return res.status(503).json({
      error: 'Database not configured',
      message: 'Projects feature requires DATABASE_URL environment variable. The app works without it using sample data.'
    });
  }

  try {
    if (req.method === 'GET') {
      const projects = await prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              brandKeywords: true,
              rankedKeywords: true,
              calculations: true
            }
          }
        }
      });
      return res.status(200).json(projects);
    }

    if (req.method === 'POST') {
      const { name, domain, locationCode, languageCode } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Project name is required' });
      }

      const project = await prisma.project.create({
        data: {
          name,
          domain,
          locationCode: locationCode || 2840,
          languageCode: languageCode || 'en'
        }
      });

      return res.status(201).json(project);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  } finally {
    await prisma.$disconnect();
  }
}
