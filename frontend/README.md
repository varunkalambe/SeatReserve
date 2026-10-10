# SeatReserve frontend

Angular 21, standalone components.

```
npm install
npm run dev      # http://localhost:5174, /api proxied to http://localhost:8081
npm test
npm run build    # needs VITE_API_BASE_URL on Vercel
```

`scripts/generate-api-base.mjs` writes `src/app/core/api-base.generated.ts` from `VITE_API_BASE_URL` before every build.
