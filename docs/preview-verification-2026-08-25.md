# Preview verification — 25 August 2026

The public landing route rendered successfully in the running preview. The page exposed the Smart Warga title, feature copy, navigation links, and structured public content in extracted HTML, confirming crawler-visible public content.

The `/app` route rendered an authentication gate stating that dashboard access requires authentication. No tenant or resident data was exposed to the unauthenticated browser session. Resident, event, announcement, donation-review, and household mutation flows still require an authenticated tenant session and populated database data for browser-level verification.

The `/app/donasi` route was also checked directly. It rendered the login gate and exposed no campaign, contribution, resident, or tenant data before authentication. Campaign donation-review browser verification still requires authenticated tenant credentials; none were entered during this check.

## Continuation verification

- The public home route rendered full server-visible content after switching to the stream-capable React renderer.
- The browser console was empty after reload; the earlier `renderToString` Suspense abort was not reproduced.
- Authenticated workspace routes remain gated by the missing session cookie in the preview.

## Turso and authenticated-route verification

- Turso credentials were validated with a read-only `SELECT 1` health query.
- The independent copy database contains the expected application tables, one user row, and no organizations, memberships, households, events, announcements, campaigns, or forum topics.
- The `/app/warga` preview route remains behind the authentication gate and exposes no tenant data without a session.

## Latest public route verification

The public landing page and slug-based public information routes render successfully in the current preview. The valid announcement pattern is `/pengumuman/:slug` (for example, `/pengumuman/kabar-lingkungan`); `/info/pengumuman` is not a registered route and correctly returns the standard 404 page. The event route `/acara/rembuk-warga-bulanan` also renders successfully. Authenticated tenant-flow verification remains blocked by the independent copy's empty business tables and missing tenant test account.
