# SeatReserve – what was wrong, what changed, and every env var

## Root causes found in your logs
1. `ERR_CONNECTION_RESET` – Render free instance was asleep/booting. Your boot log shows **162 s** (Tomcat up only at 07:22:35).
   Every request fired during that window is reset by the proxy. The old frontend retried a GET only 2x over ~4 s.
2. `401 … [token=no]` flood – after the first 401/logout the old interceptor still *sent* queued/retried
   requests **without** a token (`wallet`, `profile`, `notifications`… every ~1 s). Backend was behaving correctly.
3. JVM defaults on a 512 MB / 0.1 CPU instance (≈128 MB heap, parallel GC/JIT) made the boot far slower than needed.
4. `scripts/generate-api-base.mjs` is called by `npm run build` but was missing from the export, so it is included here.
5. Neon closes idle sockets; Hikari had no max-lifetime/keepalive, so the first query after a quiet period could fail.

## Files in this zip (copy over the same paths)
Backend: `Dockerfile`, `render.yaml`, `.env.example`, `src/main/resources/application.properties`,
`…/config/SecurityConfig.java`, `…/config/RedissonConfig.java`
Frontend/Vercel: `vercel.json`, `frontend/package.json`, `frontend/.env.example`, `frontend/scripts/generate-api-base.mjs`,
`frontend/src/app/app.component.ts`, `core/{api.service,auth.service,auth.interceptor,workspace.service}.ts`,
`pages/{shell,auth}.component.{ts,html}`, `core/api.service.spec.ts`, `core/auth.interceptor.spec.ts`

## Render → seatreserve-backend → Environment
| Key | Value |
|---|---|
| SPRING_DATASOURCE_URL | `jdbc:postgresql://ep-billowing-wildflower-b3b09wm3.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` (use the direct, non-`-pooler` host, as in your log) |
| DB_USERNAME | Neon role name (Neon dashboard → Connection details) |
| DB_PASSWORD | Neon role password (secret) |
| REDIS_HOST | `red-dats9v1srm7s739tsgd0` (Render Key Value *internal* hostname, same region as the web service) |
| REDIS_PORT | `6379` |
| REDIS_PASSWORD | empty for Render internal URL (set only if your Redis requires one) |
| REDIS_SSL | `false` (internal URL). If you use an external `rediss://` URL: host=external host, `REDIS_SSL=true` |
| JWT_SECRET | ≥ 32 random chars, set once and **never rotate casually** (rotating logs everyone out) |
| JWT_EXPIRATION | `86400000` |
| CORS_ALLOWED_ORIGINS | `https://seat-reserve-xi.vercel.app,https://seat-reserve-git-main-varunkalambe4294-7255s-projects.vercel.app` (exact origins, no trailing slash, no path) |
| CORS_ALLOW_VERCEL_PREVIEWS | `true` (also allows any `https://*.vercel.app`) |
| WALLET_DEMO_TOP_UP_ENABLED | `true` |
| APP_TIMEZONE | `Asia/Kolkata` |
| RATE_LIMIT_PER_MINUTE | `60` |
| JPA_DDL_AUTO | `update` (set `none` after the schema exists to cut ~20 s from boot) |
| LOG_LEVEL_APP | `INFO` |
| PORT | do **not** set – Render injects `10000` |
| JAVA_TOOL_OPTIONS | optional; default is baked into the Dockerfile |

Render settings: Health Check Path = `/actuator/health/liveness`, Runtime = Docker, Region same as Redis.

## Vercel → Project → Settings → Environment Variables (Production + Preview)
| Key | Value |
|---|---|
| VITE_API_BASE_URL | `https://seatreserve-backend.onrender.com` (https, no trailing slash, no `/api`) |

Nothing else. `VITE_WALLET_TOPUP_ENABLED` is a leftover from the React/Vite app and is unused (the backend sends `topUpEnabled`).
Vercel build settings come from `vercel.json` (Root Directory = repo root, Node 22.x via `engines`). **Redeploy after changing the variable** – it is baked in at build time; the build now fails loudly if it is missing.

## After deploying
1. Push, let Render rebuild; log must show `[BUILD] tag=…` and `Started SrvApplication`.
2. Open `https://seatreserve-backend.onrender.com/actuator/health/liveness` → `{"status":"UP"}`.
3. Open the Vercel site: if the backend is asleep you will now see "Waking up the server…" instead of errors; no more `token=no` 401 spam.
4. Log out/in once (old stored tokens from the previous deployment may be invalid).
5. Free-plan reality: Render still sleeps after ~15 min idle (cold start now shorter, still tens of seconds). To avoid it, ping
   `/actuator/health/liveness` every 5–10 min (UptimeRobot/cron-job.org) or use a paid instance.

## Not verified here
Backend was not compiled/run in this environment (no Maven repo access); the Java changes are small (CORS list handling, an extra
permitAll matcher, Redisson timeouts). Frontend was type-checked, unit-tested (41/41 pass) and production-built.
