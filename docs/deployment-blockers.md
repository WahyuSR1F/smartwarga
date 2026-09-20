# Deployment Blockers and Required Production Configuration

## Current verification status

The independent copy passes TypeScript checking, the Vitest suite, the client build, and the production SSR bundle build. Public HTML was verified in both development and an isolated production process, including route-specific metadata, rendered body markup, hydration state, robots.txt, and sitemap.xml. Responsive screenshots were checked at mobile (375px), tablet (768px), and desktop (1280px) widths.

## Actions required after publishing

| Item | Why it is required | Current state |
|---|---|---|
| Publish the application | Heartbeat reminder callbacks cannot be verified against a stable public callback URL from the local preview alone. | Pending user action in the Management UI |
| Configure the Heartbeat callback URL | The event-reminder endpoint must be registered with the production URL and its task UID must reach the handler. | Implemented in code; production callback verification pending |
| Set `CANONICAL_ORIGIN` | Produces absolute canonical, Open Graph, sitemap, and structured-data URLs. | Supported in code; must be set in the deployment environment |
| Set `SITE_NAME` | Controls the production site name in server-rendered metadata and JSON-LD. | Supported in code; recommended value is `Smart Warga` |
| Verify Supabase Storage | Private payment-proof signed URLs require valid production storage credentials and bucket policy. | Credentials are configured in this copy; live upload/signing verification remains deployment-dependent |
| Populate production data | The copied database schema is present, but source-project records were not copied. | Expected empty state until users, organizations, and records are created |

## Remaining product verification

The following work remains intentionally open in `todo.md`: end-to-end resident and household mutation checks against a populated database, management/resident announcement and event verification, Heartbeat and WhatsApp delivery verification after publishing, donation/forum completion, and main-bundle performance optimization. No customer reviews, ratings, or testimonials were fabricated or added.


## Continuation update — 26 August 2026

The independent copy’s Turso URL and auth token are now configured and pass a read-only health query. The expected application tables are present, but the database contains only one user row and no organization memberships or community records. Authenticated browser verification therefore remains blocked until a tenant test account is connected to an organization with safe, copy-only data.

The preview route continues to protect `/app/*` behind authentication. Public HTML and the public home hydration path remain available, and no tenant data is exposed to unauthenticated visitors.


## Post-hardening validation

The attendance flow now rejects unpublished events and rejects new registrations when an event's registered count reaches its configured capacity, while allowing an already registered attendee to submit the idempotent registration action again. The complete Vitest suite, TypeScript check, and production build passed after this change.

Authenticated end-to-end verification is still pending because the independent copy has no organization membership or tenant records. The remaining required step is to connect a tenant test account or explicitly authorize creation of copy-only test fixtures; production data is not used.


## Capacity-aware UI validation

The authenticated event view now exposes the configured capacity state and changes the attendance action to `Penuh` when the registered count reaches that capacity. The full test suite, TypeScript check, and production build pass after this UI change. Browser verification of the authenticated state remains pending because the copy still has no tenant membership or community records.


## Forum data-state validation

Forum cards no longer display an invented zero reply count. Until reply aggregation is loaded by a dedicated query, the UI states that replies are not loaded. Contextual forum creation and scope switching remain covered by deterministic tests; authenticated end-to-end verification still requires tenant data.


## Retry and browser verification update — 26 August 2026

Event, announcement, billing, campaign, and forum list failure states now provide in-place `Coba lagi` actions that refetch the relevant tenant-scoped query. Deterministic UI-contract tests cover these recovery controls, and the complete Vitest suite, TypeScript check, and production build pass.

A persistent-browser check of `/app/donasi` confirms the remaining authentication boundary: without a valid browser session the route renders the protected sign-in screen. The independent database still lacks organization memberships and tenant records, so authenticated resident, management, donation-review, and household mutation flows cannot be truthfully exercised until safe copy-only tenant fixtures or test credentials are supplied. No production or fabricated data was used.
