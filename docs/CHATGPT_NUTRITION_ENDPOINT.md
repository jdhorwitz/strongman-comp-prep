# ChatGPT Nutrition Import Endpoint

This project includes a Supabase Edge Function that lets a ChatGPT meal-log workflow add/update one day's nutrition totals in the tracker.

Endpoint after deployment:

```txt
POST https://vizjwyxwsheqxncyjxxv.supabase.co/functions/v1/log-nutrition-day
```

## Deploy the function

Install/login to the Supabase CLI, then run:

```bash
supabase functions deploy log-nutrition-day --project-ref vizjwyxwsheqxncyjxxv
```

Set secrets. Use a long random token for `CHATGPT_IMPORT_TOKEN`.

```bash
supabase secrets set \
  CHATGPT_IMPORT_TOKEN='replace-with-a-long-random-secret' \
  JOSH_USER_ID='a5e6aefa-f430-42da-8977-d0fbd47cece04' \
  --project-ref vizjwyxwsheqxncyjxxv
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available to Supabase Edge Functions automatically in hosted Supabase.

Before first endpoint use, sign in to the website and sync once so `app_data_public.id = 'josh'` exists.

## Request format

Headers:

```http
Authorization: Bearer replace-with-a-long-random-secret
Content-Type: application/json
```

Body:

```json
{
  "date": "2026-07-13",
  "calories": 2840,
  "proteinG": 221,
  "carbsG": 276,
  "fatG": 86,
  "notes": "Imported from ChatGPT meal log"
}
```

The endpoint upserts the nutrition entry for that date. If the date already exists, it replaces that day's nutrition totals.

## Test with curl

```bash
curl -X POST 'https://vizjwyxwsheqxncyjxxv.supabase.co/functions/v1/log-nutrition-day' \
  -H 'Authorization: Bearer replace-with-a-long-random-secret' \
  -H 'Content-Type: application/json' \
  -d '{
    "date": "2026-07-13",
    "calories": 2840,
    "proteinG": 221,
    "carbsG": 276,
    "fatG": 86,
    "notes": "Imported from ChatGPT meal log"
  }'
```

## Custom GPT Action OpenAPI schema

Use this as the Action schema. Replace the bearer token in the Custom GPT authentication settings, not inside the schema.

```yaml
openapi: 3.1.0
info:
  title: Strongman Nutrition Import
  version: 1.0.0
servers:
  - url: https://vizjwyxwsheqxncyjxxv.supabase.co/functions/v1
paths:
  /log-nutrition-day:
    post:
      operationId: logNutritionDay
      summary: Add or update Josh's daily nutrition totals
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              additionalProperties: false
              required:
                - date
                - calories
                - proteinG
                - carbsG
                - fatG
              properties:
                date:
                  type: string
                  description: Date in YYYY-MM-DD format.
                  pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                calories:
                  type: number
                  minimum: 0
                proteinG:
                  type: number
                  minimum: 0
                carbsG:
                  type: number
                  minimum: 0
                fatG:
                  type: number
                  minimum: 0
                notes:
                  type: string
      responses:
        '200':
          description: Nutrition day saved
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok:
                    type: boolean
                  date:
                    type: string
                  updatedAt:
                    type: string
        '400':
          description: Invalid payload
        '401':
          description: Unauthorized
```

Action authentication:

- Type: API Key / Bearer
- Header: `Authorization`
- Value: `Bearer replace-with-a-long-random-secret`

Suggested Custom GPT instruction:

> When the user says "end day", calculate the day's calories, protein, carbs, and fat. Then call `logNutritionDay` with today's date and the calculated totals. Include a short meal-summary note.
