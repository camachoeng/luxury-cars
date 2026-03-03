# LuxuryDrive

A premium ride-booking frontend for luxury intercity chauffeur services.

## Overview

LuxuryDrive lets users search routes, browse a curated fleet of luxury vehicles (Rolls Royce, Mercedes, Bentley), and complete a booking with custom preferences. Built as a clean, fast frontend ready to connect to a real backend.

## Tech Stack

- **Build Tool**: Vite 7
- **CSS**: Tailwind CSS 4 via `@tailwindcss/vite`
- **Templating**: vite-plugin-handlebars (partials)
- **JavaScript**: Vanilla ES Modules (no framework)
- **Icons**: Material Symbols Outlined
- **Fonts**: Plus Jakarta Sans (Google Fonts)

## Pages

| Page | Path | Description |
|------|------|-------------|
| Landing | `/` | Route search form + hero |
| Fleet | `/pages/fleet.html` | Browse & filter vehicles |
| Checkout | `/pages/checkout.html` | Booking summary & payment |

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build to `dist/` |
| `npm run preview` | Preview production build |

## Booking Flow

```
Landing → search form → sessionStorage
Fleet   → select vehicle → sessionStorage
Checkout → confirm booking → modal
```

## Project Structure

```
luxury-cars/
├── index.html              # Landing page
├── pages/
│   ├── fleet.html          # Fleet selection
│   └── checkout.html       # Checkout
├── src/
│   ├── style.css           # Tailwind + design tokens
│   ├── js/
│   │   ├── main.js         # Router
│   │   ├── home.js         # Landing module
│   │   ├── fleet.js        # Fleet module
│   │   ├── checkout.js     # Checkout module
│   │   ├── api.js          # Fetch wrapper
│   │   ├── utils.js        # Helpers (escapeHtml, debounce)
│   │   └── data/
│   │       └── fleet.js    # Static fleet data
│   └── partials/
│       ├── header.html
│       └── footer.html
├── docs/                   # Architecture, conventions, ADRs
└── .claude/                # Claude Code project config & commands
```

## Known Limitations

- Fare calculation uses a hardcoded distance (routing API not yet integrated)
- No real payment processing (mock UI only)
- No authentication
- No backend — booking confirmation is client-side only

## Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production / deploy |
| `development` | Active development |

## Design

UI sourced from Google Stitch project `13159503389640730313`.
Design tokens: Primary `#1152d4` · Gold `#C5A059` · Background `#0A0F16`
