import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { env } from './env';

const REST = 'https://finnhub.io/api/v1';
const WS = 'wss://ws.finnhub.io';

export interface Quote {
  c: number; d: number | null; dp: number | null;
  h: number; l: number; o: number; pc: number; t: number;
}

export interface Candle {
  c: number[]; h: number[]; l: number[]; o: number[];
  t: number[]; v: number[]; s: 'ok' | 'no_data';
}

export interface Trade {
  s: string; p: number; t: number; v: number;
}

// REST helpers
async function get<T>(path: string): Promise<T> {
  const url = `${REST}${path}${path.includes('?') ? '&' : '?'}token=${env.FINNHUB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub ${res.status}`);
  return res.json() as Promise<T>;
}

export const finnhub = {
  quote: (symbol: string) => get<Quote>(`/quote?symbol=${symbol}`),
  candles: (symbol: string, resolution = 'D') => {
    const to = Math.floor(Date.now() / 1000);
    const from = to - 60 * 60 * 24 * 30;
    return get<Candle>(`/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}`);
  },
};

// WebSocket stream — emits 'trade' events. Auto-reconnects.
class FinnhubStream extends EventEmitter {
  private ws?: WebSocket;
  private symbols = new Set<string>();
  private reconnectDelay = 1000;

  start(): void {
    this.ws = new WebSocket(`${WS}?token=${env.FINNHUB_API_KEY}`);

    this.ws.on('open', () => {
      console.log('[finnhub] connected');
      this.reconnectDelay = 1000;
      for (const s of this.symbols) this.send({ type: 'subscribe', symbol: s });
    });

    this.ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'trade' && Array.isArray(msg.data)) {
          for (const t of msg.data) this.emit('trade', t as Trade);
        }
      } catch {
        // ignore malformed
      }
    });

    this.ws.on('close', () => {
      console.warn('[finnhub] disconnected, reconnecting...');
      setTimeout(() => this.start(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    });

    this.ws.on('error', (err) => console.error('[finnhub] error', err.message));
  }

  subscribe(symbol: string): void {
    if (this.symbols.has(symbol)) return;
    this.symbols.add(symbol);
    this.send({ type: 'subscribe', symbol });
  }

  unsubscribe(symbol: string): void {
    if (!this.symbols.delete(symbol)) return;
    this.send({ type: 'unsubscribe', symbol });
  }

  private send(payload: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }
}

export const stream = new FinnhubStream();
