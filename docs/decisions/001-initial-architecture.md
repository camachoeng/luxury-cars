# 001: Initial Architecture

**Status**: Accepted
**Date**: 2026-03-02
**Deciders**: Randy (owner)

## Context
Building a new luxury car ride-booking frontend from a Google Stitch design (project 13159503389640730313). Need a multi-page website that matches the yoga-v2 frontend's tech stack for consistency across projects.

## Decision
Use Vite + Tailwind CSS 4 + vanilla JS ES Modules with Handlebars partials — identical stack to yoga-v2. Static fleet data for MVP, with an `apiFetch` wrapper ready for backend integration.

## Consequences

### Positive
- Consistent patterns across yoga-v2 and luxury-cars projects
- No framework overhead — fast builds, simple debugging
- Tailwind 4's native CSS layers eliminate need for a separate config file
- Handlebars partials keep header/footer DRY without a full SSR setup

### Negative
- No reactive state management — DOM manipulation done manually
- Scaling beyond ~10 pages will need a component framework
- sessionStorage for booking state means data is lost on tab close (acceptable for MVP)

## Alternatives Considered
1. **React/Next.js**: Overkill for an MPA landing site; adds bundle complexity
2. **Vue SPA**: Simpler than React but still more than needed for 3 pages
3. **localStorage instead of sessionStorage**: Rejected — booking data should not persist across sessions for privacy
