import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { stream } from '../lib/finnhub';
import { prisma } from '../lib/prisma';

const createSchema = z.object({
  symbol: z.string().min(1).max(25).transform((s) => s.toUpperCase()),
  targetPrice: z.number().positive(),
  condition: z.enum(['ABOVE', 'BELOW']).default('ABOVE'),
});

export const alertsRouter: Router = Router();
alertsRouter.use(requireAuth);

alertsRouter.get('/', async (req, res) => {
  const alerts = await prisma.alert.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ alerts });
});

alertsRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const alert = await prisma.alert.create({
    data: { ...parsed.data, userId: req.user!.userId },
  });
  // Make sure the upstream stream is watching this symbol.
  stream.subscribe(alert.symbol);
  res.status(201).json({ alert });
});

alertsRouter.delete('/:id', async (req, res) => {
  const alert = await prisma.alert.findUnique({ where: { id: req.params.id } });
  if (!alert || alert.userId !== req.user!.userId) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  await prisma.alert.delete({ where: { id: alert.id } });
  res.status(204).send();
});
