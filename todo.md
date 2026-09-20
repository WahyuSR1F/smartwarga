# Project TODO

- [x] Establish elegant mobile-first visual system for public and authenticated community experiences
- [x] Build public SEO landing pages for Smart Warga and RT/RW information
- [x] Add installable PWA manifest, icons, service worker, offline fallback, and install guidance
- [x] Configure Turso/libSQL database adapter and document the database boundary
- [x] Design multi-tenant organization, RW, RT, household, resident, and membership data model
- [x] Implement authentication and scoped role-based access for RW admins, RT admins, treasurers, moderators, and residents
- [x] Build authenticated dashboard with role-aware navigation and mobile-first layout
- [x] Build searchable resident directory with pagination and household membership management
- [x] Add audit logging for sensitive and administrative mutations
- [x] Implement client-configurable billing categories for water, security, hygiene, and custom categories
- [x] Implement periodic billing periods and invoice issuance
- [x] Implement manual payment-proof upload flow backed by private Supabase Storage objects
- [x] Implement treasurer verification and rejection flow with status history
- [x] Add signed private file access with authorization checks and short-lived URLs
- [x] Build events and announcements with attendance registration
- [x] Add configurable reminder rules and notification delivery-status logs
- [x] Prepare approved WhatsApp template integration boundary and webhook status handling
- [x] Build transparent donation campaigns with goals and verified contributions
- [x] Add fund-use updates and supporting private attachments for campaigns
- [x] Build contextual discussion forums linked to events, announcements, or campaigns
- [x] Add moderation, content reporting, and scoped forum visibility
- [ ] Add efficient paginated data views, validation, loading states, empty states, and error states
- [x] Add SEO metadata, canonical URLs, Open Graph, sitemap, robots policy, and structured data for public pages
- [x] Add performance optimizations for mobile networks and low JavaScript payloads
- [x] Write and update Vitest coverage for key server procedures and security boundaries
- [x] Run type checks, tests, build verification, and responsive visual verification
- [x] Review todo.md and prepare the first stable checkpoint
- [x] Make tenant access tests deterministic by isolating membership lookup from Turso network latency
- [x] Wire invoice issuance into billing UI with selectable real tenant periods, success/error states, and end-to-end verification
- [x] Replace billing raw-ID inputs with selectable tenant data and loading, empty, and error states
- [x] Implement announcements data model, API, and UI
- [x] Replace event placeholder dates and attendee counts with database-driven values and loading, empty, and error states
- [x] Add announcements loading, error, and success feedback for list, draft creation, and publish actions
- [x] Handle announcement API failures and duplicate slug conflicts with clear user feedback
- [ ] Verify announcements end-to-end for management and resident access states
- [x] Add deterministic role-boundary tests for payment review and forum moderation
- [x] Add payment status-history persistence and reviewer/resident timeline UI
- [x] Add explicit loading, empty, and error states to billing selectors and invoice issuance feedback
- [x] Implement idempotent Heartbeat event-reminder handler with cron taskUid lookup and WhatsApp delivery logging
- [x] Add event reminder-rule controls to the agenda UI
- [ ] Verify event reminder-rule creation, Heartbeat callback behavior, and notification delivery logs after deployment

## Independent Copy Session Note

- [x] Treat this project as an independent copy with separate deployment, data, checkpoints, and follow-up decisions
- [x] Add new work items only after the user explicitly requests work on this copy


## TODO Continuation — Independent Copy

- [x] Audit every remaining unchecked item against the copied source code and classify implemented, partially implemented, and missing work
- [x] Verify authentication and scoped role access for RW admins, RT admins, treasurers, moderators, and residents
- [x] Complete resident directory pagination and household membership management where missing
- [x] Complete billing-period/category/invoice flows and verify tenant isolation and private-file authorization
- [x] Complete event and announcement read/publish/attendance flows; authenticated management/resident verification remains tracked separately
- [ ] Verify configurable reminder rules, Heartbeat callback behavior, and notification delivery logs after deployment
- [x] Complete donation/campaign fund-use and forum moderation/reporting implementation; authenticated verification remains tracked separately
- [x] Convert client-only SEO metadata to crawler-visible SSR output with canonical, sitemap, robots, and structured data coverage
- [x] Optimize the main JavaScript bundle and mobile performance without reducing required functionality
- [x] Add and update Vitest coverage for tenant role boundaries, billing, payment history, reminders, private files, campaigns, forums, resident-directory transitions, SSR, and event attendance
- [x] Run type-check, tests, production build, and responsive visual verification; document blockers that require deployment or user credentials

- [x] Add explicit role-matrix tests covering RW admin, RT admin, treasurer, moderator, and resident access states
- [x] Implement household membership management UI using the existing list and addMember procedures
- [ ] Add end-to-end validation for resident pagination and household member changes, including empty and error states

- [x] Expand role-matrix tests with positive and negative cases for billing, events, announcements, forum moderation, and resident-management endpoints
- [ ] Add end-to-end verification for successful household member upsert and selector empty/error states

- [x] Add announcement role-matrix tests with allowed and forbidden create/publish cases
- [x] Add event role-matrix tests with allowed and forbidden create/publish cases
- [x] Add resident-management role-matrix tests with allowed and forbidden household/member cases

- [x] Add announcement publish role-matrix tests for allowed management and forbidden resident paths
- [x] Add positive event-create role-matrix coverage for admin, RW admin, and RT admin
- [x] Expand resident-management coverage to household/listMembers reads and forbidden writes

- [x] Add deterministic tests for private payment-proof authorization and signed URL generation/expiry behavior
- [x] Restore server-rendered JSON-LD for public routes and absolute canonical, Open Graph, and sitemap URLs when CANONICAL_ORIGIN is configured
- [x] Add Vitest coverage for billing category/period/invoice flows, payment-status history, reminder-handler logic, and private-file authorization
- [x] Run visual verification at mobile, tablet, and desktop breakpoints
- [x] Record deployment-required blockers, including production callback URL and canonical-origin configuration, in docs/deployment-blockers.md

- [x] Add router-level files.signedUrl tests for owner, same-organization reviewer, and forbidden outsider access
- [x] Add successful billing category/period/invoice procedure coverage with deterministic database mocks
- [x] Add stronger payment-status-history assertions beyond empty-state reads
- [x] Add reminder-handler tests for duplicate-notification skipping and successful delivery logging

- [x] Fix billing period validation regex so valid YYYY-MM values are accepted


## Remaining Product Gaps

- [x] Replace hard-coded public RT/RW information with live public data or clearly scoped production static content
- [ ] Complete and verify resident-directory search/pagination plus household member empty, error, and success flows
- [ ] Add and verify end-to-end event attendance registration UI and management/resident announcement-event flows
- [x] Finish reminder-rule UI controls
- [ ] Verify Heartbeat callback plus delivery logs after publishing
- [ ] Complete and verify campaign goals, contribution, and donation-verification UI flows
- [x] Implement private campaign attachments for fund-use updates
- [ ] Verify contextual forum creation and listing linked to events, announcements, and campaigns
- [ ] Close remaining pagination and state-handling gaps across all relevant views

- [x] Add deterministic event attendance registration tests for an authorized resident and an unauthorized user

- [x] Allow campaign fund-use updates to attach an existing private evidence file with validation

- [x] Add campaign fund-use UI controls to upload or select a private evidence file and submit it with loading/error/success states
- [x] Verify campaign fund-use attachments can be created, stored, and accessed only by authorized users

- [x] Add deterministic forum topic creation/listing tests for event and announcement scopes
- [x] Verify forum loading, empty, error, and scope-label states for linked discussions
- [x] Replace raw context-ID entry with selectable event, announcement, and campaign records in the forum composer

- [x] Reset forum composer scopeId when scopeType changes
- [x] Add loading, empty, and error states for event, announcement, and campaign context selectors
- [x] Add a focused test proving context switching submits only the active scope type record

- [x] Reduce the initial JavaScript chunk below the warning threshold; public and authenticated routes are now split and the entry chunk is 465.64 kB


## Verification Gaps Reopened

- [ ] Add explicit resident-directory loading, empty, and error states; verify search, pagination, and household success flows
- [ ] Add resident/management end-to-end verification for announcements and events, including attendance registration from the UI
- [x] Implement and test donation-verification UI and workflow for campaigns
- [x] Verify campaign attachment access through an authorized campaign-facing flow
- [x] Add a focused forum test ensuring scope switching clears stale IDs and submits only the active context record
- [x] Add loading, empty, and error states for campaign listing views and re-audit paginated screens

- [x] Add deterministic or UI-level tests for resident search filtering and previous/next pagination
- [ ] Add household-member success-refresh coverage and verify browser loading, empty, success, and error states

- [x] Add resident-directory tests for page-zero, next-page, and previous-page offset transitions
- [ ] Verify resident search and pagination controls in the browser
- [ ] Verify household-member success refresh and resident-directory state transitions in the browser

- [x] Add tenant-scoped pending campaign contributions query and reviewer verification controls

- [x] Add deterministic campaigns.verifyDonation tests for authorized verify/reject success, outsider denial, and wrong-tenant rejection
- [x] Verify donation-review UI pending rendering, verify/reject mutation triggers, and refresh behavior
- [x] Re-run campaign review tests with the wider regression suite after verification coverage is complete

- [x] Add a deterministic campaigns.verifyDonation test for a user with no active organization membership

- [x] Reset resident search pagination to page one and remove the inactive Filter control

- [x] Cover campaign evidence signed-URL owner/reviewer/outsider authorization against the real fund-usage organization lookup

- [x] Add deterministic coverage for clearing the selected resident after household-member success

- [x] Add tenant-scoped campaign creation and publication controls for authorized administrators

- [x] Add deterministic campaign create, duplicate-slug, publish, and resident-denial procedure coverage

- [x] Implement and validate tenant-scoped campaign draft creation and publication procedures with duplicate-slug and role-boundary coverage

- [x] Add a tenant-scoped campaign draft listing query for authorized reviewers
- [x] Add persisted draft publication controls with refresh/loading/error feedback

- [x] Render persisted campaign drafts for every authorized campaign manager, including RT admins
- [x] Refetch published campaign aggregates after donation verification or rejection
- [x] Refetch published campaign list after draft publication
- [x] Add deterministic coverage for campaign manager role gating and post-mutation refresh behavior

- [x] Add deterministic coverage for campaign donation-review pending rendering, verify/reject triggers, and aggregate refresh, including truthful labels and exact mutation payloads
- [ ] Perform authenticated browser verification of campaign donation review when tenant credentials are available

- [x] Verify public SSR and unauthenticated `/app/donasi` isolation in the running preview


## Continuation Work — Explicitly Requested

- [x] Audit all remaining unchecked items against the copied implementation and prioritize safe preview work
- [ ] Complete resident-directory browser verification for search, pagination, loading, empty, and error states
- [ ] Verify household-member add/update success flow and refresh behavior in the browser
- [ ] Verify event and announcement management/resident flows, including attendance registration UI
- [ ] Verify campaign donation-review UI with authenticated tenant access when credentials are available
- [ ] Verify contextual forum creation and listing flows for linked records
- [x] Verify Heartbeat callback and notification delivery logs after deployment or document the deployment blocker
- [x] Run the relevant Vitest suite, type checks, build, and responsive preview checks
- [ ] Report completed work and remaining blockers for this independent copy
- [x] Remove fabricated dashboard health, attention, and recent-activity entries; show truthful data-availability states instead
- [x] Run baseline Vitest suite and TypeScript checks; optional Supabase connectivity test is skipped when credentials are absent
- [x] Expand resident-directory search to tenant-scoped name, email, and household-address matches; align the search label and stable row keys
- [x] Make resident address matching tenant-scoped and de-duplicate resident results
- [x] Replace raw campaign ID entry in fund-use recording with a tenant-scoped campaign selector and loading/error/empty states
- [x] Replace renderToString with a stream-capable SSR renderer and verify public hydration in the browser
- [x] Configure and validate the independent copy’s Turso connection with a read-only health query
- [x] Keep role-matrix tests deterministic when live database credentials are configured
- [x] Keep billing empty-state tests deterministic when live Turso credentials are configured
- [x] Restrict resident and moderator event listings to published records while retaining draft visibility for event managers
- [x] Add deterministic event-list visibility regression coverage
- [x] Remove unused hard-coded workspace collections for residents, invoices, events, campaigns, and forum topics
- [x] Re-run resident, event, attendance, campaign-review, and contextual-forum regression coverage after the cleanup
- [x] Prevent attendance registration for unpublished events and cover the rule with regression tests

## Additional Hardening — Explicitly Requested Continuation

- [x] Enforce event capacity during attendance registration without allowing overbooking
- [x] Add deterministic coverage for event-capacity enforcement and re-registration behavior
- [x] Re-run full validation and update the independent-copy blocker documentation
- [x] Show capacity-aware attendance state in the event UI and disable the action when an event is full
- [x] Re-run TypeScript and focused event registration/visibility tests after the UI hardening
- [x] Add a public announcement information route with privacy-safe content and SSR metadata
- [x] Hide household-member mutation controls from resident and non-manager roles while preserving read-only states
- [x] Add a read-only household selector/list for residents and non-manager roles while keeping mutation controls hidden
- [x] Add regression or UI coverage proving non-managers can view household members but cannot add or update them
- [x] Add a component-contract regression test proving the non-manager household selector remains visible while mutation controls stay gated
- [x] Replace campaign placeholder aggregate metrics with totals derived from loaded tenant-scoped campaign data
- [x] Use stable campaign IDs for campaign-card rendering keys
- [x] Replace fabricated forum reply counts with a truthful unavailable-state label
- [x] Gate event and announcement create/publish controls by manager role while preserving resident read-only views
- [x] Add UI-contract coverage proving residents cannot see event or announcement mutation controls
- [x] Gate billing category, period, and invoice-issuance controls by administrator/treasurer role while preserving resident payment-proof access
- [x] Add UI-contract coverage proving residents cannot see billing administration controls
- [x] Add bounded pagination controls to authenticated event and announcement lists
- [x] Add deterministic tests for event and announcement page-offset transitions
- [x] Make the workspace global add action role-aware and hide it when the active section has no permitted creation flow
- [x] Add a UI-contract regression for the role-aware global add action

## Remaining State Coverage — Narrow Scope

- [x] Add explicit resident-directory loading, empty, and error states with deterministic transition coverage
- [x] Add household-member success-refresh handling and selector empty/error/success coverage
- [x] Audit each authenticated list/view and mark only narrowly scoped pagination/state improvements complete once covered
- [x] Count only active registered attendees in event list aggregates and capacity-aware UI
- [x] Add regression coverage proving cancelled registrations do not consume event capacity
- [x] Bind reminder template and lead-time selections to the reminder-rule mutation payload instead of hard-coded values
- [x] Add deterministic coverage for reminder-form payload binding and validation
- [x] Add explicit active-organization selection for users with multiple tenant memberships instead of silently using the first membership
- [x] Add deterministic coverage for active-organization selection and fallback behavior
- [x] Show an explicit organization-loading error state in the authenticated dashboard shell without exposing tenant data
- [x] Add UI-contract coverage for the organization-loading error state
- [x] Add in-place retry actions to resident-directory and household-member error states
- [x] Add deterministic UI-contract coverage for resident and household retry actions
- [x] Add in-place retry actions to event and announcement list error states
- [x] Add deterministic UI-contract coverage for event and announcement retry actions
- [x] Add in-place retry actions to billing payment-history and payment-review error states
- [x] Add deterministic UI-contract coverage for billing retry actions
- [x] Add in-place retry actions to billing category, period, and resident-invoice selector failures
- [x] Add deterministic UI-contract coverage for billing selector retry actions
- [x] Audit campaign and forum list failures for truthful in-place recovery actions

## Fresh Independent Copy Session

- [x] Confirm the copied project is initialized and the development server is running.
- [x] Prepare a concise summary of the existing features and technology stack.
- [x] Await the user's next requested task for this independent copy.

## Fresh Copy — Execution Planning Requested

- [x] Create an ordered execution plan for the remaining TODO items, consolidate duplicate verification entries, and identify tenant-access and deployment prerequisites.

## Fresh Copy — Authorized TODO Execution Pass

- [x] Execute remaining actionable TODO items sequentially, validate each change, and mark only verified items complete.
- [x] Preserve tenant isolation and production-data safety throughout implementation and verification.
- [x] Document tenant-credential and deployment blockers instead of falsely marking blocked verification items complete.

- [x] Make the Turso integration health test skip cleanly when copy-only credentials are unavailable, while retaining the live read-only check when credentials exist.
- [x] Add deterministic success coverage for tenant-scoped household-member upsert and its audit-log path.

## Fresh Copy — Continued Safe Execution Pass

- [x] Reconcile remaining historical TODO entries against the latest validated checkpoint.
- [x] Complete any remaining safe implementation or automated coverage that does not require tenant credentials or deployment access.
- [x] Re-run public, responsive, TypeScript, build, and regression verification after the continued pass.
- [x] Keep authenticated browser and post-deployment Heartbeat checks explicitly blocked until their prerequisites are available.
- [x] Add an explicit empty state to the billing category list so an empty tenant does not render a blank panel.
