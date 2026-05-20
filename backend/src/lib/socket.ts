import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server as IOServer } from 'socket.io';
import { env } from './env';
import { stream, Trade } from './finnhub';

export function attachSocketServer(httpServer: HttpServer): void {
  const io = new IOServer(httpServer, { cors: { origin: '*' } });

  // Auth via JWT in handshake.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Missing token'));
    try {
      jwt.verify(token, env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('subscribe', (symbols: string[]) => {
      for (const s of symbols ?? []) {
        socket.join(`sym:${s}`);
        stream.subscribe(s);
      }
    });
    socket.on('unsubscribe', (symbols: string[]) => {
      for (const s of symbols ?? []) socket.leave(`sym:${s}`);
    });
  });

  // Fan out trades to every socket subscribed to that symbol.
  stream.on('trade', (t: Trade) => io.to(`sym:${t.s}`).emit('trade', t));
}
