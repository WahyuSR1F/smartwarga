# Independent Copy TODO Audit

## Implemented in the copied code

The copied code already includes multi-tenant organization membership checks, role-aware backend guards, resident search with pagination inputs, household member upsert, billing categories and periods, invoice issuance, payment proof upload, payment verification, persistent payment history, event listing/creation/registration, reminder-rule creation, announcement draft/publish flows, campaigns and contributions, fund-use recording, forum topic/post/report flows, signed private-file URLs, audit logging, and the Heartbeat event-reminder handler.

## Partially implemented or requiring verification

The authenticated workspace still contains presentation fallbacks and placeholder metrics. Resident, billing, event, donation, and forum panels use hard-coded fallback arrays or numbers when queries are empty, which can make an empty database appear populated. The dashboard summary and some management controls are not fully tenant-backed. The role matrix is enforced in the backend but the dashboard navigation primarily reflects the global auth role rather than organization membership roles. Public announcement/event/donation pages are static content rather than live read-only records.

The reminder backend is wired, but production callback verification cannot be completed until the copy is deployed. The current reminder cron expression is a one-time date expression and needs careful validation for past events, duplicate rules, and platform lifecycle behavior.

## Clearly missing or high-priority work

Crawler-visible SSR is not present: the current Head component updates document metadata only after hydration, and public pages do not fetch live records. Full SSR will require the template conversion workflow and SSR-safe fixes for the authenticated shell. Public sitemap/robots and structured-data coverage also need verification.

Performance work should target the large client bundle and remove unnecessary static fallback payloads or split route code where safe. Vitest coverage should be expanded around role boundaries, public visibility, private-file authorization, idempotency, and announcement/reminder flows. Any final Heartbeat run verification remains a deployment-dependent action.

## Safety notes

No customer reviews, ratings, or testimonials may be fabricated. Database changes must remain schema-first and be applied through the managed SQL workflow. Scheduled handlers must remain under `/api/scheduled/`, authenticate cron callers, look up records by task UID, be idempotent, and avoid in-process timers.

## Current implementation pass findings

The authenticated layout now resolves its navigation role from the first active organization membership and loads persisted sidebar width after the initial render, which avoids server-side browser-global access. The dashboard and workspace no longer need to show fabricated sample counts for core tenant collections; the workspace still has some static explanatory activity text and needs a broader UX pass.

The public routes currently render hard-coded marketing records from `PublicInfoPage.tsx`, while `App.tsx` lazy-loads the public and authenticated pages. This lazy boundary must be handled deliberately during SSR so public routes do not silently render only the Suspense fallback. The router has no public read procedures yet, and event creation has no publish mutation even though announcement publishing exists.

## SSR audit findings

The current server serves the SPA shell from `setupVite` and `serveStatic`, while `main.tsx` mounts with `createRoot`. The app also uses lazy route imports, and the authenticated shell calls `useAuth` plus tRPC queries. SSR conversion therefore needs matching client/server providers, a safe hydration strategy, and either eager public-route imports or route-specific server rendering that cannot bake only the Suspense fallback.

The current Vite build already defines manual chunks for React, tRPC, Radix, and charts, which is a useful base for the bundle-size TODO. Production still needs a separate SSR bundle and request-scoped HTML metadata; deployment configuration for `CANONICAL_ORIGIN` and `SITE_NAME` will be required before canonical tags can be validated in production.
