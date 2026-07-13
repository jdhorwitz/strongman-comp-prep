# Repository Instructions

## Product

This is a personal strongman competition-prep tracker for Josh.

## Technical requirements

- Build a static application compatible with GitHub Pages.
- Use React, TypeScript, and Vite.
- Avoid a server-side backend.
- Persist user-entered data in localStorage.
- Support JSON and CSV import/export.
- Design mobile-first because most entries will be made from a phone.
- Include automated tests for calculations.
- Keep components small and strongly typed.
- Do not introduce authentication or cloud storage unless explicitly requested.

## Important calculations

- Seven-day rolling weight average
- Weekly rate of weight loss
- Estimated 1RM from weight, reps, and RPE
- Days remaining until September 26, 2026
- Pounds remaining to the target pre-cut range
- Average calories, protein, carbohydrates, and fat
- Training volume
- Personal-record detection

## Deployment

- Configure GitHub Actions to deploy to GitHub Pages.
- Correctly configure the Vite base path for the repository name.
- The production build must run with `npm run build`.
