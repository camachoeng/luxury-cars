# Project: LuxuryDrive Frontend

## What This Project Does
A premium ride-booking frontend for luxury intercity chauffeur services. Lets users search routes, browse a fleet of luxury vehicles (Rolls Royce, Mercedes, Bentley), and complete a booking with custom preferences and payment.

## Architecture
@docs/ARCHITECTURE.md

## Conventions
@docs/CONVENTIONS.md

## Current Status
@docs/CURRENT_STATUS.md

## Key Decisions
@docs/decisions/_index.md

## Build & Run
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`

## Critical Rules
- ALWAYS use `escapeHtml()` from `utils.js` when inserting user-controlled strings into `innerHTML`
- NEVER use inline Tailwind CDN in production HTML — import via `style.css`
- Stitch design source: project `13159503389640730313` (API key in user settings)
- Follow yoga-v2 pattern: one JS module per page, exported `initPageName()` function
