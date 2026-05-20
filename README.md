# Stock Alerts

Full-stack app that lets users log in, see live stock prices, view per-stock charts, and create price alerts that fire **Firebase Cloud Messaging** push notifications when a target is crossed.

Stack: **Node.js + Express + TypeScript** (backend), **React Native CLI + TypeScript** (mobile), **SQLite + Prisma** (data), **Finnhub** (market data REST + WebSocket), **Socket.IO** (live prices to clients), **Docker** (deploy).

## Architecture

```
React Native app  ──REST──>  Node backend  ──REST──>  Finnhub REST
                  <─Socket.IO──>            <─WS──>   Finnhub WebSocket
                  <───FCM─────  Firebase Admin
```

The backend opens one WebSocket to Finnhub, re-broadcasts the trades over Socket.IO to subscribed clients, and in parallel evaluates them against the active alerts. When an alert's target is crossed, the alert is marked triggered and an FCM push goes out to the owner.

## Project layout

```
backend/
├── prisma/schema.prisma
├── src/
│   ├── lib/           env, prisma, auth (JWT), finnhub (REST+WS), firebase, socket
│   ├── modules/       auth, stocks, alerts, monitor (one file per feature)
│   └── server.ts
├── Dockerfile
└── docker-compose.yml

mobile/
├── src/
│   ├── api.ts         all HTTP calls
│   ├── auth.tsx       Auth context (with AsyncStorage persistence)
│   ├── socket.ts      Socket.IO client
│   ├── fcm.ts         Firebase Messaging setup
│   └── screens/       Login, Stocks, Chart, Alerts
├── App.tsx
└── android/
```

## Backend setup

Two ways to run it — they're alternatives, not steps to combine.

### Option A: Docker (one command, no Node needed)

```bash
cd backend
cp .env.example .env
# Edit .env and fill JWT_SECRET and FINNHUB_API_KEY
docker compose up -d
docker compose logs -f
```

The Dockerfile is multi-stage: builder installs deps + compiles TS, runtime image runs only the compiled `dist/`. Migrations are applied automatically on container start. The SQLite DB is persisted in a named volume.

### Option B: Local Node

```bash
cd backend
npm install
cp .env.example .env  # fill secrets
npx prisma migrate dev --name init
npm run dev
```

Server at `http://localhost:3000`. Try `GET /health`.

### Environment variables

| Variable                          | Required | Notes                                                     |
| --------------------------------- | -------- | --------------------------------------------------------- |
| `DATABASE_URL`                    | yes      | `file:./dev.db` for SQLite                                |
| `JWT_SECRET`                      | yes      | Long random string (`openssl rand -hex 32`)               |
| `FINNHUB_API_KEY`                 | yes      | Free key from <https://finnhub.io>                        |
| `FIREBASE_SERVICE_ACCOUNT_PATH`   | no       | Path to service account JSON. If unset, FCM is disabled.  |
| `PORT`                            | no       | Defaults to 3000                                          |

## Mobile setup

The repo holds the source tree only. To run the app, generate a fresh React Native project and overlay these files on top:

```bash
npx @react-native-community/cli@latest init StockAlerts --skip-install
cp -r stock-alerts/mobile/{src,App.tsx,index.js,package.json,tsconfig.json,babel.config.js,metro.config.js,app.json} StockAlerts/
cd StockAlerts
npm install
npm run android
```

The Android emulator reaches your host via `10.0.2.2:3000` — already wired in `src/api.ts`. For a physical device use your LAN IP instead.

## API

All endpoints under `/api`. Authenticated routes need `Authorization: Bearer <jwt>`.

| Method | Path                          | Auth | Body / Notes                                   |
| ------ | ----------------------------- | ---- | ---------------------------------------------- |
| POST   | `/auth/register`              | no   | `{ email, password }`                          |
| POST   | `/auth/login`                 | no   | `{ email, password }`                          |
| POST   | `/auth/fcm-token`             | yes  | `{ token }`                                    |
| GET    | `/stocks`                     | yes  | Curated list with current quotes               |
| GET    | `/stocks/:symbol/candles`     | yes  | Last 30 days, daily resolution                 |
| GET    | `/alerts`                     | yes  | Current user's alerts                          |
| POST   | `/alerts`                     | yes  | `{ symbol, targetPrice, condition }`           |
| DELETE | `/alerts/:id`                 | yes  |                                                |

### Socket.IO

URL: same host as REST. Auth: JWT in `handshake.auth.token`.

- Client → server: `subscribe(['AAPL', 'MSFT'])`, `unsubscribe([...])`
- Server → client: `trade({ s, p, t, v })`

## Firebase Cloud Messaging

FCM is optional — the backend boots and runs without it (logs "FCM disabled").

**Backend:** Firebase Console → Project settings → Service accounts → Generate new private key. Save as `backend/firebase-service-account.json`. Uncomment the FCM lines in `docker-compose.yml` if running with Docker.

**Mobile:** Firebase Console → Add Android app (package `com.stockalerts`). Download `google-services.json` to `mobile/android/app/`. In `android/build.gradle` add `classpath 'com.google.gms:google-services:4.4.2'`. At the bottom of `android/app/build.gradle` add `apply plugin: 'com.google.gms.google-services'`.

## Generate signed Android APK

```bash
cd mobile/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore \
  -alias stock-alerts -keyalg RSA -keysize 2048 -validity 10000
```

Add the signing config to `android/app/build.gradle` (use `STOCK_ALERTS_*` properties in `gradle.properties` — do not commit them), then:

```bash
cd mobile
npm run build:android:release
# APK: mobile/android/app/build/outputs/apk/release/app-release.apk
```

Upload that APK to <https://wetransfer.com>, copy the share link, and email it with the repo URL.

## Notes

- The Finnhub free tier streams US stocks during US market hours. Outside those hours the WebSocket stays connected but emits no trades. The REST endpoints still return the last close.
- Database is SQLite for simplicity. To swap to Postgres: change `provider` and `DATABASE_URL` in `prisma/schema.prisma` + `.env`.
