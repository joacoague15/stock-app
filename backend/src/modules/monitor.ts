import { sendPush } from '../lib/firebase';
import { stream, Trade } from '../lib/finnhub';
import { prisma } from '../lib/prisma';

/**
 * Listens to live trades and triggers any matching alert.
 * - Loads currently active symbols on startup so the stream subscribes upstream.
 * - On each trade, queries DB for active alerts on that symbol (small table,
 *   indexed by (symbol, active)). For a 3-day take-home this is fine; a
 *   production version would cache them in memory.
 */
export async function startAlertMonitor(): Promise<void> {
  // Subscribe to every symbol that has an active alert.
  const active = await prisma.alert.findMany({
    where: { active: true, triggeredAt: null },
    select: { symbol: true },
    distinct: ['symbol'],
  });
  for (const a of active) stream.subscribe(a.symbol);

  stream.on('trade', async (trade: Trade) => {
    const alerts = await prisma.alert.findMany({
      where: { symbol: trade.s, active: true, triggeredAt: null },
      include: { user: { select: { fcmToken: true } } },
    });

    for (const alert of alerts) {
      const triggered =
        alert.condition === 'ABOVE'
          ? trade.p >= alert.targetPrice
          : trade.p <= alert.targetPrice;
      if (!triggered) continue;

      await prisma.alert.update({
        where: { id: alert.id },
        data: { active: false, triggeredAt: new Date() },
      });

      const direction = alert.condition === 'ABOVE' ? 'above' : 'below';
      console.log(`[monitor] ${alert.symbol} triggered at $${trade.p}`);

      if (alert.user.fcmToken) {
        await sendPush(
          alert.user.fcmToken,
          `${alert.symbol} alert`,
          `Price $${trade.p.toFixed(2)} is ${direction} target $${alert.targetPrice.toFixed(2)}`,
        );
      }
    }
  });
}
