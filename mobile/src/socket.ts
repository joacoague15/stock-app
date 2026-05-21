import { io, Socket } from 'socket.io-client';
import { API_BASE, getToken } from './api';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) return socket;
  socket = io(API_BASE, {
    auth: { token: getToken() },
    transports: ['websocket'],
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
