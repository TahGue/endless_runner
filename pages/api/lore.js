import prisma from '../../lib/prisma';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const lore = await prisma.lore.findMany({
        orderBy: {
          discoveredAt: 'asc',
        },
      });
      res.status(200).json(lore);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch lore' });
    }
  } else if (req.method === 'POST') {
    try {
      const { title, content, biome } = req.body;
      const newLore = await prisma.lore.create({
        data: {
          title,
          content,
          biome,
        },
      });
      res.status(201).json(newLore);
    } catch (error) {
      // Handle unique constraint violation
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'Lore fragment already discovered.' });
      }
      res.status(500).json({ error: 'Failed to save lore' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
