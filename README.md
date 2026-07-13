# Strongman Competition Prep

Mobile-first static React tracker for Josh's Great Lakes Strongest Man VIII prep.

## Features

- Bodyweight logging with seven-day rolling average and cut-status metrics
- Nutrition calorie/macro logging with seven-day averages
- Training log with strongman event templates, Epley e1RM, RPE-adjusted e1RM, volume, and PR detection
- Seeded Masters Amateur competition events/rules from Iron Podium
- Recovery logging with 1–10 pain/recovery scales
- IndexedDB persistence using Dexie, with one-time migration from the original localStorage key
- Optional Supabase email magic-link sync across browsers/devices
- JSON backup/restore and CSV export/import
- GitHub Pages deployment

## Commands

```bash
npm install
npm run dev
npm test
npm run build
```

Production builds use the Vite base path `/strongman-comp-prep/` for GitHub Pages.

## Optional multi-device sync

See `docs/SUPABASE_SETUP.md`. Without Supabase environment variables, the app remains local-only with IndexedDB.
