# Health Auto Export Bodyweight + Steps Setup

Use this to send RENPHO / Apple Health bodyweight and step-count data to the tracker automatically.

## Endpoint

```txt
POST https://vizjwyxwsheqxncyjxxv.supabase.co/functions/v1/log-bodyweight
```

## Headers

Add these headers in Health Auto Export:

| Header | Value |
| --- | --- |
| `Authorization` | `Bearer 06289456b77bfaa7ac25538ae99355d5bd56bf231c2fac0be546cbc22efad4b4` |
| `Content-Type` | `application/json` |

## Body format

The endpoint accepts the Health Auto Export JSON shape you shared:

```json
{
  "data": {
    "metrics": [
      {
        "name": "weight_body_mass",
        "units": "lb",
        "data": [
          {
            "source": "RENPHO Health",
            "qty": 239.86,
            "date": "2026-07-12 10:07:04 -0400",
            "start": "2026-07-12 10:07:04 -0400",
            "end": "2026-07-12 10:07:09 -0400"
          }
        ]
      }
    ]
  }
}
```

The endpoint will:

- read the `weight_body_mass` metric
- use `qty` as the weight
- convert kg to lb if `units` is `kg`
- group entries by date
- prefer RENPHO over lower-priority sources when multiple entries exist for one date
- upsert the public tracker bodyweight entry for each date
- read any step-count metric whose name contains `step`
- upsert steps into the recovery entry for each date

## iPhone setup sketch

In Health Auto Export:

1. Allow Health permissions for **Weight / Body Mass** and **Steps**.
2. Optionally allow **Body Fat Percentage** too, though the current endpoint only parses body mass and steps from the export shape.
3. Create an automation / REST API / webhook export.
4. Set method to `POST`.
5. Set URL to the endpoint above.
6. Add the two headers above.
7. Select/export the **Weight / Body Mass** and **Steps** metrics.
8. Configure weight units as pounds if available.
9. Send a test export.
10. Refresh the website and check the Weight and Recovery pages.

If Health Auto Export sends a different JSON shape for scheduled automations than it did for the manual export, save the sample and update the endpoint parser to match it.
