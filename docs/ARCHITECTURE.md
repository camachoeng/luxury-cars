# Architecture Overview

## System Diagram

```
Browser
  └── Vite dev server
        ├── index.html          → Landing page
        ├── pages/fleet.html    → Fleet selection
        └── pages/checkout.html → Booking checkout

        src/
        ├── style.css           ← Tailwind 4 + custom tokens
        ├── partials/           ← Handlebars includes
        │   ├── header.html
        │   └── footer.html
        └── js/
            ├── main.js         ← Entry point + router
            ├── api.js          ← Fetch wrapper
            ├── utils.js        ← escapeHtml, debounce, storage helpers
            ├── home.js         ← Landing page module
            ├── fleet.js        ← Fleet selection module
            ├── checkout.js     ← Checkout module
            └── data/
                └── fleet.js    ← Static fleet data (replace with API)
```

## Layer Structure
- **Presentation**: Handlebars HTML templates + Tailwind CSS
- **Page Logic**: Per-page ES modules (`home.js`, `fleet.js`, `checkout.js`)
- **Data**: Static `data/fleet.js` → replace with `apiFetch('/api/fleet')` when backend ready
- **Routing**: `main.js` inspects `window.location.pathname` and dynamically imports page modules

## Data Flow

```
User fills booking form (home.js)
  → setSearchParams() → sessionStorage
  → navigate to /fleet

Fleet page (fleet.js)
  → reads sessionStorage for context
  → renders fleet cards from data/fleet.js
  → user clicks "Select & Continue"
  → setBookingData() → sessionStorage
  → navigate to /checkout

Checkout page (checkout.js)
  → reads getBookingData() from sessionStorage
  → populates car info, route, fare breakdown
  → user confirms → shows modal + clears session data
```

## External Dependencies
| Service | Purpose | Docs |
|---------|---------|------|
| Google Fonts | Plus Jakarta Sans | fonts.google.com |
| Material Symbols | Icon font | fonts.google.com/icons |
| Google Stitch | Design source | stitch.withgoogle.com |
| Future: Backend API | Booking CRUD | TBD |
