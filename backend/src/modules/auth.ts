import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, signToken } from '../lib/auth';
import { prisma } from '../lib/prisma';

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authRouter: Router = Router();

authRouter.post('/register', async (req, res) => {
  const parsed = credsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const { email, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const user = await prisma.user.create({
    data: { email, password: await bcrypt.hash(password, 10) },
  });
  res.status(201).json({
    token: signToken({ userId: user.id, email: user.email }),
    user: { id: user.id, email: user.email },
  });
});

authRouter.post('/login', async (req, res) => {
  const parsed = credsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  res.json({
    token: signToken({ userId: user.id, email: user.email }),
    user: { id: user.id, email: user.email },
  });
});

authRouter.post('/fcm-token', requireAuth, async (req, res) => {
  const { token } = req.body;
  if (typeof token !== 'string') {
    res.status(400).json({ error: 'token required' });
    return;
  }
  await prisma.user.update({ where: { id: req.user!.userId }, data: { fcmToken: token } });
  res.status(204).send();
});
