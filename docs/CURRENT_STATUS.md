# Current Project Status

Last updated: 2026-03-08

## In Progress
_No active work at this time._

## Recently Completed
- [x] Project scaffolded with Vite 7 + Tailwind CSS 4 + Handlebars
- [x] Design system extracted from Stitch project "Booking Summary and Checkout" (ID: 13159503389640730313)
- [x] 3 pages built: Landing (index.html), Fleet (fleet.html), Checkout (checkout.html)
- [x] Partials: sticky header (with mobile nav toggle) + footer (4-column)
- [x] JS modules: main.js (router), home.js, fleet.js, checkout.js, api.js, utils.js
- [x] Static fleet dataset in data/fleet.js (6 vehicles: 4 sedans, 2 SUVs)
- [x] Booking flow via sessionStorage (search → fleet → checkout → confirmation modal)
- [x] Fleet page: grid/list toggle (filters and search removed — showcase-only)
- [x] Checkout form validation (name, email, phone) + booking ref generation
- [x] Design tokens applied: primary blue, accent gold, dark background palette
- [x] Skeleton loaders, card glow effects, scrollbar styling in style.css
- [x] `escapeHtml()` used throughout all dynamic innerHTML insertions (XSS safe)
- [x] `debounce()` applied to price slider (200 ms) and fleet search (300 ms)
- [x] `npm install` completed — all devDependencies installed in node_modules/
- [x] `npm run build` verified — dist/ produced with 3 HTML pages + 7 bundled assets
- [x] CFD documentation initialized
- [x] `.claude/` folder configured (settings, commands: `/decision:new`, `/session:start`, `/project:status`)
- [x] Git repo initialized, connected to `https://github.com/camachoeng/luxury-cars` (branches: `main`, `development`)
- [x] `.gitignore` and `README.md` created and committed
- [x] **Supabase backend integration** — full implementation:
  - `@supabase/supabase-js` installed; `src/js/supabase.js` singleton client
  - `src/js/auth.js` — `signUp`, `signIn`, `signOut`, `getUser`, `onAuthChange`
  - `src/js/bookings.js` — `assignVehicle()`, `calculateFare()`, `saveBooking()`, `getUserBookings()`
  - `src/js/header.js` — auth-aware nav (gold icon when logged in, sign out on click)
  - `src/js/login.js` + `pages/login.html` — login form with `ld_return_to` redirect
  - `src/js/register.js` + `pages/register.html` — register form with success state
  - `src/js/my-bookings.js` + `pages/my-bookings.html` — auth-guarded booking history
  - `vite.config.js` updated — 6-page multi-entry build
  - `src/js/main.js` updated — new routes + `initHeader()` on every page
  - `src/js/home.js` updated — fleet preview from Supabase, redirect to checkout
  - `src/js/fleet.js` updated — loads from Supabase, showcase-only (no car selection)
  - `src/js/checkout.js` rewritten — auth guard → `assignVehicle()` → `saveBooking()`
  - `src/js/utils.js` updated — added `clearBookingSession()`
  - `pages/checkout.html` updated — preference checkbox IDs added
  - DB schema: `vehicles`, `bookings`, `vehicle_availability` tables with RLS policies
  - `.env.example` created with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [x] Register page: confirm password field + show/hide eye toggles on both password inputs
- [x] Register page: real-time password strength bar (4 segments, red→green) + rule checklist (length, uppercase, number, special char) matching Supabase-configured password policy
- [x] **GitHub Pages deployment** via GitHub Actions:
  - `.github/workflows/deploy.yml` — build + deploy on push to `main`
  - `vite.config.js` updated with `base: '/luxury-cars/'` for correct asset paths
  - Supabase env vars injected as GitHub Secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
  - Live at `https://camachoeng.github.io/luxury-cars/`
- [x] **Stitch API key security incident resolved**:
  - Old key (`AQ.Ab8RN...`) was committed in `docs/CONVENTIONS.md` — removed and replaced with `<your-api-key>` placeholder
  - New key stored in `.mcp.json` (project-level MCP config, gitignored)
  - `.gitignore` updated to exclude `.mcp.json`
- [x] **Bilingual EN/ES support** — full vanilla JS i18n system:
  - `src/js/i18n.js` created — ~150 translation keys across 9 namespaces (`nav`, `home`, `fleet`, `checkout`, `login`, `register`, `bookings`, `footer`, `common`)
  - `data-i18n` + `data-i18n-placeholder` attributes added to all 6 HTML pages + 2 partials
  - Language toggle button in header (`#lang-toggle`) cycles EN ↔ ES; preference persisted in `localStorage`
  - `applyTranslations()` called after each page module init
  - `src/js/header.js` wired to toggle + update button label
- [x] **YMV Limo rebranding** — replaced all "LuxuryDrive" references:
  - SVG logo added at `public/images/logo/ymv-limo.svg`
  - Header: logo image (`h-20`) + "YMV Limo" text span with gold accent
  - Footer: logo image (`h-16`) replacing icon+text
  - All HTML pages, JS modules, and i18n strings updated
- [x] **Logo path fixes** (Handlebars partial + Vite base URL):
  - `%BASE_URL%` does not work inside Handlebars partials (Vite replaces it after HBS injection) → switched to `{{baseUrl}}` Handlebars context variable
  - `vite.config.js` uses `command === 'serve' ? '/' : '/luxury-cars/'` so logo path is correct in both dev and prod
  - Favicon injected dynamically in `main.js` using `import.meta.env.BASE_URL` (static `<link>` tags removed)
- [x] **Houston/Texas content personalization**:
  - Hero eyebrow, subtitle, booking placeholders, step descriptions, CTA text, and footer tagline updated for Texas intercity limo service
  - EN + ES translations updated in `src/js/i18n.js`; fallback text in `index.html` updated to match
  - "Book Now" CTA on landing page links to `/#booking` (booking form) instead of fleet
- [x] **Vehicle selection removed from checkout flow**:
  - Checkout vehicle card replaced with "Vehicle to be Confirmed" banner (gold accent styling)
  - Fare breakdown replaced with "Pricing will be confirmed after vehicle assignment" notice
  - `assignVehicle()`, `populateCarInfo()`, `populateFareBreakdown()` removed from `src/js/checkout.js`
  - `saveBooking()` now passes `vehicle_id: null`; passenger info form + preferences + confirmation modal retained
  - New i18n keys added: `checkout.vehicle_tbd_title`, `checkout.vehicle_tbd_sub`, `checkout.pricing_tbd`
- [x] **Logo & favicon overhaul**:
  - Replaced 303KB raster-in-SVG AI logo with wordmark-only (`YMV Limo`) in header and footer
  - New favicon (`public/images/logo/ymv-favicon.svg`) — geometric Y·M·V monogram on dark background, 60×32 viewBox
  - Favicon injected dynamically in `main.js`; `public/images/logo/ymv-limo.svg` no longer used in partials
- [x] **Header nav cleanup**: removed "Services" and "About Us" links (broken/redundant); nav now has Fleet + Experience only
- [x] **Hero overlap fix**: added `pb-44` to hero content div so "View Our Fleet" / "How It Works" buttons aren't covered by the booking form on laptop viewports or when switching to Spanish
- [x] **Vite dev server base URL fix**: `base` was hardcoded to `/luxury-cars/` — corrected to `command === 'serve' ? '/' : '/luxury-cars/'` so fleet links work in dev
- [x] **Fleet page converted to showcase-only**:
  - Removed sidebar (category filters, brand filters, price range slider)
  - Removed per-card "Book a Journey" button and price display
  - Removed search bar and empty state
  - Added single page-level CTA banner linking to `/#booking`
  - Layout changed to full-width; breadcrumb moved inline
  - `src/js/fleet.js` stripped of all filter/search logic; `initFleet()` now only loads and renders
- [x] **4 vehicles added to Supabase** (`vehicles` table):
  - Cadillac Escalade, Lincoln Navigator, Infiniti QX80, Chevrolet Suburban
  - Uniform pricing: `$4.00/mi`, `$95.00/hr`; standard seats/bags; Unsplash placeholder images
- [x] **Header nav link fixes** — all hardcoded `/pages/...` and `/` paths replaced with `{{baseUrl}}` Handlebars variable so links work on both dev and GitHub Pages
- [x] **Fleet card cleanup**: removed wishlist/heart badge; removed `line-clamp-2` so full description shows
- [x] **Fleet page CTA wired**: "Book a Ride" button links to `../#booking`; `id="booking"` added to booking section in `index.html`
- [x] **Fleet footer CTAs wired**: "Chat with Concierge" → WhatsApp (`wa.me/18587335033`); "Schedule Call" → Calendly (`calendly.com/camachoengrandy/30min`)
- [x] **About page** (`pages/about.html`) — new full page:
  - Story section with 4 stat cards (2022, 10+, 3 routes, 24/7)
  - 3 service cards: Hourly Charter (~$100–120/hr), Intercity Transfer, Drop-off & Return
  - Service area grid: Houston (home base) + Dallas / Austin / Louisiana (from Houston only)
  - CTA section linking to booking form and WhatsApp
  - `src/js/about.js` module; route added to `main.js`; entry added to `vite.config.js`
  - Full EN + ES i18n keys in `about` namespace
- [x] **Header nav restructured**: removed "Why Us" (redundant with About); nav is now Fleet · About · Contact · [Book Now]
- [x] **Contact page** (`pages/contact.html`) — new page:
  - Two contact cards: WhatsApp (primary) + Schedule a Call via Calendly
  - Info row: Houston location + phone number as plain text + 24/7 availability
  - `src/js/contact.js` module; route added to `main.js`; entry added to `vite.config.js`
  - Full EN + ES i18n keys in `contact` namespace
- [x] **My Bookings access fixed** (`src/js/header.js`): person icon when logged in now navigates to My Bookings page instead of signing out
- [x] **Service area copy corrected**: all i18n strings and about page updated to reflect Houston-only pickup — rides go from Houston to Houston, Dallas, Austin, or Louisiana; no bidirectional language
- [x] **404 page** (`pages/404.html`) — styled error page with "Go Home" + "Book a Ride" CTAs; `src/js/not-found.js` module; unknown routes redirect here via fallback in `main.js`
- [x] **Admin dashboard** (`pages/admin.html` + `src/js/admin.js`) — staff-only page:
  - Auth guard: redirects to login if not authenticated; shows Access Denied if not admin
  - Stats strip: Total / Pending / Confirmed / No-Shows
  - Bookings tab: Pending section with vehicle assign form (dropdown + Assign button); All Bookings compact list
  - "Mark No-Show" button on confirmed bookings whose trip date is today or past
  - Settings tab: editable Cancellation Rules + Pricing Rates stored in `admin_settings` Supabase table
  - Reviews tab: Approve / Reject pending reviews; Revoke approved reviews (lazy-loads on first click)
- [x] **Admin badge in header**: gold "Admin" link in nav dropdown; shown only when `user.user_metadata.is_admin === true`
- [x] **Header sign-out dropdown**: person icon opens dropdown with My Bookings + Sign Out; closes on outside click
- [x] **Liability disclaimer**: amber warning card added to checkout right column, confirmation modal, and My Bookings page header
- [x] **`admin_settings` table**: key-value config for cancellation rules and pricing rates; editable from admin UI; RLS restricts access to admins only
- [x] **No-show status**: `no_show` booking status added; `status_no_show` i18n key added; My Bookings displays it in red
- [x] **Reviews page** (`pages/reviews.html` + `src/js/reviews.js`):
  - Public grid of approved reviews (rating stars + date)
  - Submission form for logged-in users (star selector, comment, optional booking ref)
  - Login prompt for guests; success state after submission
  - Reviews stored with `status: 'pending'`; admin approves before public display
  - `reviews` namespace added to i18n (EN + ES, ~15 keys)
- [x] **Footer "Company" column**: About / Contact / Client Reviews links added; 5-column layout

## Known Issues
1. **No payment processing**: checkout completes booking without Stripe or payment gateway
2. **Vehicle assignment not atomic**: two-step insert (bookings → vehicle_availability) has a theoretical race window; UNIQUE constraint catches it but a Postgres RPC would be safer
3. **No distance/duration data**: checkout confirms booking with no route info shown (fare is TBD by company anyway)
4. **No-show not financially enforced**: status is tracked but no charge is triggered without Stripe

## Next Priorities
1. Integrate Stripe Elements for real payment processing (+ enforce no-show/cancellation fees)
2. Replace Stitch AI-generated images with production CDN images
3. Wrap `saveBooking()` inserts in a Postgres RPC function for true atomicity
