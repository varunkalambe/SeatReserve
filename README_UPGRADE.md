# SeatReserve

Angular 21 frontend (`frontend/`, hosted on Vercel) + Spring Boot 4 backend (repo root, hosted on Render in Docker) with PostgreSQL (Neon) and Redis.

## Run locally
```
docker compose up -d --build
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:5174 (proxies `/api` to http://localhost:8081). Backend health: http://localhost:8081/actuator/health

## Rules implemented
Seat holds last 5 minutes, up to 6 seats per booking, wallet pay/refund, cancellation before departure, JWT auth, Redis seat locks + rate limiting.

## Deploy
See `DEPLOY_CHECKLIST.md`.
