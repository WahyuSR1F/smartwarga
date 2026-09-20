# Smart Warga Architecture Notes

## Data boundary

Turso/libSQL is the source of truth for structured application data: organizations, RT/RW units, households, resident memberships, billing records, payments, events, campaigns, forum content, notification logs, and audit records. The application connects through `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in server-only code.

Supabase Storage is reserved for binary objects such as payment proofs, campaign evidence, event attachments, and future notification audio. Only object metadata is stored in Turso through the `files` table. Private objects must be accessed through a server-authorized short-lived signed URL; a browser must never receive the Supabase service-role key.

## Access boundary

Every authenticated operation must resolve an active `organization_members` row before returning tenant data. Future mutation procedures must additionally enforce the required organization role: `rw_admin` and `admin` for RW-level configuration, `rt_admin` for RT operations, `treasurer` for payment and fund verification, and `moderator` for forum moderation. Residents may read only their own household-sensitive information and public or community-scoped content.

## Notification boundary

WhatsApp integration will use the official Cloud API with approved templates and webhook delivery updates. Notification jobs are persisted in Turso so retries are idempotent and traceable. Scheduled work must be implemented with the platform's HTTP heartbeat handler under `/api/scheduled/`; in-process timers are not permitted. No WhatsApp automation should depend on an unofficial WhatsApp Web session.

## Privacy boundary

Public pages may expose only approved information such as wilayah descriptions, public events, and published donation summaries. Resident directory data, payment proofs, donor identity preferences, financial evidence, internal forums, and audit metadata remain authenticated and tenant-scoped.
