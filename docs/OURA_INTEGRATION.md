# Oura Recovery Integration

This project includes a Supabase Edge Function that imports Oura recovery data into the tracker recovery log.

Endpoint after deployment:

```txt
POST https://vizjwyxwsheqxncyjxxv.supabase.co/functions/v1/sync-oura
```

## What it imports

The function pulls from Oura API v2:

- `daily_readiness`
- `daily_sleep`
- `daily_activity`

It saves available fields into `recoveryEntries`:

- readiness score
- sleep score
- activity score
- sleep hours, when provided by Oura
- resting heart rate, when provided by Oura
- HRV, when provided by Oura
- respiratory rate, when provided by Oura
- body temperature deviation, when provided by Oura

Oura endpoint shapes can vary by scope/data availability, so unavailable fields are left blank.

## 1. Get an Oura personal access token

In Oura Cloud:

1. Go to Oura developer / personal access tokens.
2. Create a token with scopes for daily readiness, sleep, and activity.
3. Copy the token.

## 2. Set Supabase secrets

Use the same import token as the other endpoints unless you want a separate one.

```bash
supabase secrets set \
  OURA_ACCESS_TOKEN='paste-your-oura-token-here' \
  OURA_SYNC_TOKEN='06289456b77bfaa7ac25538ae99355d5bd56bf231c2fac0be546cbc22efad4b4' \
  --project-ref vizjwyxwsheqxncyjxxv
```

If `OURA_SYNC_TOKEN` is not set, the function falls back to `CHATGPT_IMPORT_TOKEN`.

## 3. Deploy the function

```bash
supabase functions deploy sync-oura \
  --no-verify-jwt \
  --project-ref vizjwyxwsheqxncyjxxv
```

## 4. Test one day

```bash
curl -X POST 'https://vizjwyxwsheqxncyjxxv.supabase.co/functions/v1/sync-oura' \
  -H 'Authorization: Bearer 06289456b77bfaa7ac25538ae99355d5bd56bf231c2fac0be546cbc22efad4b4' \
  -H 'Content-Type: application/json' \
  -d '{
    "date": "2026-07-13"
  }'
```

## 5. Test a range

```bash
curl -X POST 'https://vizjwyxwsheqxncyjxxv.supabase.co/functions/v1/sync-oura' \
  -H 'Authorization: Bearer 06289456b77bfaa7ac25538ae99355d5bd56bf231c2fac0be546cbc22efad4b4' \
  -H 'Content-Type: application/json' \
  -d '{
    "startDate": "2026-07-01",
    "endDate": "2026-07-13"
  }'
```

If no body is provided, the function imports the last 7 days through today.

## Scheduling later

Once tested, this can be scheduled to run daily using Supabase scheduled functions / cron. Keep it as a manual endpoint first until the imported fields look right.
