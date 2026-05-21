# Stock Alerts 📈

App for real-time stock price alerts.

**Backend:** https://stock-app-1h93.onrender.com

---

## What it does

- Email/password auth (JWT)
- Live prices for stocks (updates in real time)
- Simple chart display
- Price alerts → Firebase push notification when triggered

## Stack

| Part     | Tech                                                      |
| -------- |-----------------------------------------------------------|
| Backend  | Node + Express + TypeScript, Prisma + PostgreSQL          |
| Mobile   | React Native + TypeScript                                 |
| Realtime | Socket.IO (live prices) + Finnhub WebSocket (market data) |
| Push     | Firebase Cloud Messaging                                  |
| Deploy   | Hosted on Render                                          |

---

## Run the backend locally

```bash
cd backend
cp .env.example .env        # fill JWT_SECRET and FINNHUB_API_KEY
docker compose up -d        # that's it — migrations run automatically
```

Check it's up: `curl http://localhost:3000/health` → `{"ok":true}`

### Environment variables

| Variable                        | Required | Notes                                   |
| ------------------------------- | -------- | --------------------------------------- |
| `JWT_SECRET`                    | yes      | Any long random string                  |
| `FINNHUB_API_KEY`               | yes      | Free key from finnhub.io                |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | no       | Path to service account JSON for push   |
| `DATABASE_URL`                  | yes      | `file:./dev.db`                         |

## Run the mobile app
```bash
npx @react-native-community/cli@15.0.1 init mobile --version 0.76.3
# copy src/, App.tsx, index.js and the config files into it, then:
npm install
npm run android
```

`API_BASE` in `src/api.ts` points at the deployed Render backend, so the app works
out of the box. Point it at `http://10.0.2.2:3000` to use a local backend.

---

## API

All routes under `/api`. Authenticated routes need `Authorization: Bearer <jwt>`.

| Method | Path                      | Body                                   |
| ------ | ------------------------- | -------------------------------------- |
| POST   | `/auth/register`          | `{ email, password }`                  |
| POST   | `/auth/login`             | `{ email, password }`                  |
| POST   | `/auth/fcm-token`         | `{ token }`                            |
| GET    | `/stocks`                 | list with live quotes                  |
| GET    | `/stocks/:symbol/candles` | 30-day chart data                      |
| GET    | `/alerts`                 | your alerts                            |
| POST   | `/alerts`                 | `{ symbol, targetPrice, condition }`   |
| DELETE | `/alerts/:id`             | —                                      |

**Socket.IO** — auth via JWT in `handshake.auth.token`. Client emits
`subscribe(symbols[])`; server emits `trade({ s, p, t, v })`.