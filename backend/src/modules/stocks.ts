import { Router } from 'express';
import { requireAuth } from '../lib/auth';
import { finnhub } from '../lib/finnhub';

// Hand-curated popular list. Finnhub free tier doesn't expose "trending".
const POPULAR = [
  { symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin' },
  { symbol: 'BINANCE:ETHUSDT', name: 'Ethereum' },
  { symbol: 'BINANCE:SOLUSDT', name: 'Solana' },
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'META', name: 'Meta' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'NFLX', name: 'Netflix' },
];

export const stocksRouter: Router = Router();
stocksRouter.use(requireAuth);

stocksRouter.get('/', async (_req, res) => {
  const quotes = await Promise.all(
    POPULAR.map(async (s) => {
      try {
        return { ...s, quote: await finnhub.quote(s.symbol) };
      } catch {
        return { ...s, quote: null };
      }
    }),
  );
  res.json({ stocks: quotes });
});

stocksRouter.get('/:symbol/candles', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();

  // The Finnhub /stock/candle endpoint requires a paid plan and returns 403 on
  // the free tier. We try it first; if it fails we synthesize a 30-day series
  // anchored on the live quote so the chart still renders something meaningful.
  // This keeps the demo working without a premium key. See README "Notes".
  try {
    const candles = await finnhub.candles(symbol);
    if (candles.s === 'ok' && candles.c.length > 0) {
      res.json({ candles, source: 'finnhub' });
      return;
    }
    throw new Error('No candle data');
  } catch {
    const quote = await finnhub.quote(symbol);
    res.json({ candles: synthesizeCandles(quote.c, quote.pc), source: 'synthetic' });
  }
});

/**
 * Builds a plausible 30-point daily series ending at the current price.
 * Uses a random walk with a wider starting spread and per-step volatility so the
 * line has natural ups and downs (instead of a flat line), while still ending on
 * the real latest price. Purely for display when historical data isn't available.
 */
function synthesizeCandles(current: number, previousClose: number) {
  const points = 30;
  const c: number[] = [];
  const t: number[] = [];
  const dayMs = 24 * 60 * 60;
  const now = Math.floor(Date.now() / 1000);

  // Start ~15% away from current so there's a visible trend to render.
  const anchor = previousClose > 0 ? previousClose : current;
  let price = anchor * (0.85 + Math.random() * 0.05);

  for (let i = points - 1; i >= 0; i--) {
    const drift = (current - price) / (i + 1); // gently pull toward current
    const volatility = price * (Math.random() - 0.5) * 0.06; // ±3% daily swing
    price = Math.max(price + drift + volatility, anchor * 0.5);
    c.push(Number(price.toFixed(2)));
    t.push(now - i * dayMs);
  }
  c[c.length - 1] = current; // last point = real current price
  return { c, t, s: 'ok' as const };
}
