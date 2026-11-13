# STORM Mining Frontend

This is a Vite-based, multi-file frontend conversion of the supplied STORM HTML app.
The existing DOM-driven application logic and its UI controller scripts are preserved
in `src/main.js`; the original stylesheet is in `src/styles.css`; page markup is in
`index.html`. This is intentionally a low-risk modular migration rather than a full
React rewrite, because the existing app relies heavily on direct DOM updates and
global handlers.

## Local development
1. Install Node.js (LTS).
2. Run `npm install`.
3. Run `npm run dev`.

## Production build
Run `npm run build`. Vite creates the deployable site in `dist/`.

## Vercel
- Framework Preset: Vite
- Root Directory: `./`
- Build Command: `npm run build`
- Output Directory: `dist`

Keep the existing backend deployment and environment variables unchanged.
The frontend continues to call the backend configured in its existing app code.

## Changes included
- Withdrawal verified-referral requirement: 0.
- Withdrawal minimum remains 5,000 STORM.
- Withdrawal fee remains 300 STORM.
- Referral progress now says no referrals are required (no divide-by-zero).
- Referral invite URL uses `@Mine_STORM_bot`.
