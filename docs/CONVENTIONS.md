# Code Conventions

## Tech Stack
- **Build Tool**: Vite 7
- **CSS**: Tailwind CSS 4 via `@tailwindcss/vite` plugin
- **Templating**: vite-plugin-handlebars (partials only — no full HBS pages)
- **JavaScript**: Vanilla ES Modules (no framework)
- **Icons**: Material Symbols Outlined (variable font)
- **Fonts**: Plus Jakarta Sans (Google Fonts)

## Google Stitch MCP Access

The UI design lives in Google Stitch. Use the MCP server to fetch/update screens.

**Project:** `Booking Summary and Checkout`
**Project ID:** `projects/13159503389640730313`
**Screens:**
| Screen ID | Title |
|-----------|-------|
| `96a869049ef04f4b9d851b2c03a62023` | Luxury Drive Landing Page |
| `2358bc48503d4ef7ad08ac49bc17d1bb` | Elite Fleet Selection Screen |
| `64c94a1b12cb45e6b9eb5547020ac4c0` | Booking Summary and Checkout |

**MCP connection (HTTP transport):**
```
URL:     https://stitch.googleapis.com/mcp
Header:  X-Goog-Api-Key: <your-api-key>   ← store in user settings, never commit
```

**To add to Claude Code (run once in terminal):**
```bash
claude mcp add stitch \
  --transport http \
  --url "https://stitch.googleapis.com/mcp" \
  --header "X-Goog-Api-Key: YOUR_API_KEY"
```

**Available MCP tools:** `create_project`, `get_project`, `list_projects`, `list_screens`, `get_screen`, `generate_screen_from_text`, `edit_screens`, `generate_variants`

---

## Design Tokens (from Stitch project 13159503389640730313)
```
Primary:         #1152d4
Primary dark:    #0d3fa8
Accent gold:     #C5A059
Background dark: #0A0F16
Surface dark:    #161C28
Card dark:       #161e2d
```

## Hard Constraints
**DO NOT:**
- Use Tailwind CDN `<script>` tag in production HTML (dev only during initial build)
- Use `innerHTML` with unsanitized user input — always call `escapeHtml()` first
- Call `apiFetch` without a try/catch at the call site

**ALWAYS:**
- Export an `async initPageName()` function from each page module
- Use `sessionStorage` (not `localStorage`) for booking state (cleared on tab close)
- Use `debounce()` for search/filter inputs
- Add `loading="lazy"` to non-hero images

## Claude Behavior Rules
- **Never start `npm run dev`** unless the user explicitly asks. The user runs their own dev server. Use `npm run build` to verify if needed.
- **Memory**: Save notes for future sessions in `docs/CONVENTIONS.md`, not in external memory files.

## Naming Conventions
| What | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `home.js`, `fleet.js` |
| Functions | camelCase | `initHome()`, `renderGrid()` |
| HTML ids | kebab-case | `fleet-grid`, `confirm-btn` |
| CSS classes | Tailwind utilities | No custom class names unless in `style.css` |
| Data attributes | `data-*` | `data-id`, `data-filter`, `data-tab` |

## Key Patterns

### Page module pattern (ALWAYS follow)
```js
// pages/my-page.js
export async function initMyPage() {
  renderContent()
  initEventListeners()
}
function renderContent() { ... }
function initEventListeners() { ... }
```

### Safe innerHTML insertion
```js
import { escapeHtml } from './utils.js'
container.innerHTML = items.map(item => `
  <div>${escapeHtml(item.name)}</div>
`).join('')
```

### Event delegation (preferred over per-element handlers)
```js
container.addEventListener('click', e => {
  const btn = e.target.closest('[data-id]')
  if (!btn) return
  handleClick(btn.dataset.id)
})
```

### Session state flow
```js
// home.js → save
setSearchParams({ pickup, dropoff, date, time })

// fleet.js → read + save
const s = getSearchParams()
setBookingData({ car, search: s, fare })

// checkout.js → read
const b = getBookingData()
```
