# Apple Health / RENPHO Bodyweight Import Endpoint

This project includes a Supabase Edge Function for importing bodyweight data from Apple Health automation tools such as Health Auto Export.

Endpoint after deployment:

```txt
POST https://vizjwyxwsheqxncyjxxv.supabase.co/functions/v1/log-bodyweight
```

## Deploy the function

```bash
supabase functions deploy log-bodyweight \
  --no-verify-jwt \
  --project-ref vizjwyxwsheqxncyjxxv
```

It uses the same bearer token as the nutrition endpoint by default, via `CHATGPT_IMPORT_TOKEN`. You can optionally set a separate token:

```bash
supabase secrets set \
  BODYWEIGHT_IMPORT_TOKEN='replace-with-a-long-random-secret' \
  --project-ref vizjwyxwsheqxncyjxxv
```

If `BODYWEIGHT_IMPORT_TOKEN` is not set, the function falls back to `CHATGPT_IMPORT_TOKEN`.

Before first endpoint use, sign in to the website and sync once so `app_data_public.id = 'josh'` exists.

## Request format

Headers:

```http
Authorization: Bearer your-import-token
Content-Type: application/json
```

Body:

```json
{
  "date": "2026-07-13",
  "weightLb": 240.2,
  "bodyFatPercent": 24.1,
  "source": "RENPHO via Apple Health",
  "notes": "Auto-imported from Apple Health"
}
```

Required fields:

- `date`
- `weightLb`

Optional fields:

- `bodyFatPercent`
- `source`
- `notes`

The endpoint upserts the weigh-in for that date. If the date already exists, it replaces that day's bodyweight entry.

## Test with curl

```bash
curl -X POST 'https://vizjwyxwsheqxncyjxxv.supabase.co/functions/v1/log-bodyweight' \
  -H 'Authorization: Bearer 06289456b77bfaa7ac25538ae99355d5bd56bf231c2fac0be546cbc22efad4b4' \
  -H 'Content-Type: application/json' \
  -d '{
    "date": "2026-07-13",
    "weightLb": 240.2,
    "bodyFatPercent": 24.1,
    "source": "RENPHO via Apple Health",
    "notes": "Test import from Apple Health"
  }'
```

## Health Auto Export setup sketch

In Health Auto Export, configure a REST API / webhook export:

- Method: `POST`
- URL: `https://vizjwyxwsheqxncyjxxv.supabase.co/functions/v1/log-bodyweight`
- Header: `Authorization: Bearer 06289456b77bfaa7ac25538ae99355d5bd56bf231c2fac0be546cbc22efad4b4`
- Header: `Content-Type: application/json`

Map Apple Health weight to `weightLb`. If Health Auto Export exports kilograms, convert to pounds before posting, or configure the export unit as pounds if the app supports it.
