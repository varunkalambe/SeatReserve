# SeatReserve – environment checklist

## Render → Web Service `seatreserve-backend` → Environment
| Key | Value | Required |
|---|---|---|
| SPRING_DATASOURCE_URL | `jdbc:postgresql://ep-billowing-wildflower-b3b09wm3.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` (direct host, not `-pooler`) | yes |
| DB_USERNAME | Neon role name (Neon → Connection details, usually `neondb_owner`) | yes |
| DB_PASSWORD | Neon role password | yes (secret) |
| REDIS_HOST | `red-dats9v1srm7s739tsgd0` (Render Key Value internal hostname, same region) | yes |
| REDIS_PORT | `6379` | yes |
| REDIS_PASSWORD | empty for the internal URL | no |
| REDIS_SSL | `false` (internal) / `true` only with an external `rediss://` host | yes |
| JWT_SECRET | 32+ random chars, e.g. `openssl rand -base64 48`. Set once, never rotate casually | yes (secret) |
| JWT_EXPIRATION | `86400000` | yes |
| CORS_ALLOWED_ORIGINS | `https://seat-reserve-xi.vercel.app,https://seat-reserve-git-main-varunkalambe4294-7255s-projects.vercel.app` (no trailing slash/path) | yes |
| CORS_ALLOW_VERCEL_PREVIEWS | `true` (adds `https://*.vercel.app`) | yes |
| WALLET_DEMO_TOP_UP_ENABLED | `true` | yes |
| WALLET_TOPUP_DAILY_LIMIT | `50000` | no |
| WALLET_MAX_BALANCE | `100000` | no |
| APP_TIMEZONE | `Asia/Kolkata` | yes |
| RATE_LIMIT_PER_MINUTE | `60` | no |
| JPA_DDL_AUTO | `update` (switch to `none` once the schema exists) | no |
| DB_POOL_SIZE / DB_MIN_IDLE | `5` / `1` | no |
| LOG_LEVEL_APP | `INFO` | no |
| PORT | do NOT set (Render injects `10000`) | – |

Render settings: Runtime = Docker, Health Check Path = `/actuator/health/liveness`, same region as Redis.

## Vercel → Project → Settings → Environment Variables (Production + Preview)
| Key | Value |
|---|---|
| VITE_API_BASE_URL | `https://seatreserve-backend.onrender.com` (https, no trailing slash, no `/api`) |

Nothing else. Build settings come from `vercel.json`. The value is baked in at build time: redeploy after changing it. The build fails on Vercel when it is missing.

## Local docker compose (`.env`)
`POSTGRES_USER`, `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION`, `CORS_ALLOWED_ORIGINS`, `WALLET_DEMO_TOP_UP_ENABLED` (see `.env.example`).

## After deploy
1. Render log shows `[BUILD] tag=…` then `Started SrvApplication`.
2. `https://seatreserve-backend.onrender.com/actuator/health/liveness` → `{"status":"UP"}`.
3. Open the Vercel site, log out and in once, check icons and the From/To dropdown.
4. Free Render sleeps after ~15 min idle: ping `/actuator/health/liveness` every 5–10 min (UptimeRobot) to avoid cold starts.
