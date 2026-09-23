# 🏘️ Smart Warga RT/RW

Platform manajemen komunitas RT/RW untuk lingkungan perumahan di Indonesia. Mengelola data warga, tagihan, acara, pengumuman, donasi, dan forum diskusi dalam satu dashboard terpadu.

---

## 📋 Table of Contents

- [Fitur Utama](#fitur-utama)
- [Arsitektur Tech Stack](#arsitektur-tech-stack)
- [Struktur Project](#struktur-project)
- [Role & Akses](#role--akses)
- [Database Schema](#database-schema)
- [Setup & Instalasi](#setup--instalasi)
- [Perintah Umum](#perintah-umum)
- [Environment Variables](#environment-variables)
- [API Routes (tRPC)](#api-routes-trpc)

---

## ✅ Fitur Utama

| Modul | Deskripsi |
|-------|-----------|
| **Data Warga** | Direktori warga, manajemen rumah tangga, keanggotaan |
| **Tagihan (Billing)** | Kategori iuran, periode tagihan, invoice, verifikasi pembayaran |
| **Acara** | Agenda kegiatan, pendaftaran hadir, pengingat WhatsApp |
| **Pengumuman** | Siaran informasi untuk warga berbasis wilayah |
| **Donasi** | Kampanye donasi, kontribusi warga, verifikasi dana |
| **Forum** | Diskusi warga per topik, laporan konten |
| **Join Wilayah** | Permintaan join ke RT/RW, approval oleh admin |
| **Integrasi WhatsApp** | Pengingat otomatis via WhatsApp Business API |
| **PWA** | Progressive Web App untuk akses mobile |

---

## 🏗️ Arsitektur Tech Stack

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  React 19 · Vite 7 · Tailwind CSS 4 · wouter   │
│  Radix UI (shadcn/ui) · tRPC Client · Sonner    │
├─────────────────────────────────────────────────┤
│                    Backend                       │
│  Express.js · tRPC Server · Drizzle ORM         │
│  JWT Auth (jose) · Supabase Storage             │
├─────────────────────────────────────────────────┤
│                   Database                       │
│  Turso (LibSQL) · Drizzle Kit Migrations        │
├─────────────────────────────────────────────────┤
│                Integrasi                         │
│  WhatsApp Business API · Umami Analytics         │
│  Forge API (AI) · Supabase (file storage)       │
└─────────────────────────────────────────────────┘
```

**Key Libraries:**

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite 7 (SSR capable) |
| Styling | Tailwind CSS 4 + Radix UI primitives |
| Routing | wouter (lightweight router) |
| API | tRPC v11 (type-safe API) |
| State | @tanstack/react-query (via tRPC) |
| ORM | Drizzle ORM + Drizzle Kit |
| Database | Turso (SQLite-compatible, edge-hosted) |
| Auth | JWT session (jose) + scrypt password hashing |
| Storage | Supabase (S3-compatible) |
| Forms | react-hook-form + zod validation |
| Charts | Recharts |
| Build | Vite + esbuild (SSR) |

---

## 📁 Struktur Project

```
smart-warga-rt-rw/
├── client/                          # Frontend (React)
│   ├── public/                      # Static assets
│   └── src/
│       ├── components/
│       │   ├── DashboardLayout.tsx  # Layout utama dengan sidebar
│       │   ├── AIChatBox.tsx        # Chat AI assistant
│       │   ├── Map.tsx              # Peta interaktif
│       │   ├── PwaInstallPrompt.tsx # PWA install prompt
│       │   └── ui/                  # shadcn/ui components
│       ├── pages/
│       │   ├── Home.tsx             # Landing page
│       │   ├── Login.tsx            # Login & Registrasi
│       │   ├── WorkspacePage.tsx    # Dashboard utama per modul
│       │   ├── CommunityDashboard.tsx # Dashboard komunitas
│       │   ├── JoinWilayah.tsx      # Form join wilayah
│       │   ├── JoinRequests.tsx     # Approval join requests
│       │   └── PublicInfoPage.tsx   # Halaman publik
│       ├── lib/
│       │   ├── trpc.ts              # tRPC client setup
│       │   ├── active-membership.ts # Membership management
│       │   ├── campaign-workflow.ts # Campaign role helpers
│       │   ├── household-access.ts  # Household access control
│       │   └── forum-context.ts     # Forum topic context
│       ├── hooks/                   # Custom React hooks
│       ├── contexts/                # React contexts
│       ├── _core/                   # Core client utilities
│       ├── App.tsx                  # Root component + routes
│       ├── main.tsx                 # Client entry point
│       ├── entry-server.tsx         # SSR entry
│       └── entry-client.tsx         # Client hydration
│
├── server/                          # Backend (Express + tRPC)
│   ├── _core/                       # Server core utilities
│   │   ├── index.ts                 # Express server entry
│   │   ├── context.ts               # tRPC context builder
│   │   ├── trpc.ts                  # tRPC init + middleware
│   │   ├── env.ts                   # Environment config
│   │   ├── cookies.ts               # Cookie helpers
│   │   ├── notification.ts          # Push notification
│   │   ├── systemRouter.ts          # System-level routes
│   │   ├── heartbeat.ts             # Heartbeat/scheduler
│   │   ├── oauth.ts                 # OAuth integration
│   │   ├── seo.ts                   # SEO metadata
│   │   ├── llm.ts                   # AI/LLM integration
│   │   ├── sdk.ts                   # SDK utilities
│   │   ├── vite.ts                  # Vite dev middleware
│   │   ├── voiceTranscription.ts    # Voice-to-text
│   │   └── imageGeneration.ts       # Image gen helpers
│   ├── routers.ts                   # Main tRPC router (all API routes)
│   ├── auth.ts                      # Auth logic (register, login, JWT)
│   ├── db.ts                        # Database connection + queries
│   ├── scheduled.ts                 # Cron/scheduled tasks
│   ├── whatsapp.ts                  # WhatsApp API integration
│   ├── supabaseStorage.ts           # Supabase file storage
│   ├── storage.ts                   # File storage abstraction
│   └── *.test.ts                    # Test files (vitest)
│
├── drizzle/                         # Database schema & migrations
│   ├── schema.ts                    # Drizzle schema definitions
│   ├── relations.ts                 # Table relations
│   ├── 0000_*.sql - 0008_*.sql      # Migration files
│   └── meta/                        # Migration metadata
│
├── shared/                          # Shared between client & server
│   ├── const.ts                     # Constants (cookie, errors, OAuth)
│   ├── types.ts                     # Shared TypeScript types
│   └── _core/errors.ts              # Error definitions
│
├── docs/                            # Documentation
├── scripts/                         # Build/utility scripts
├── patches/                         # pnpm patches
├── vite.config.ts                   # Vite configuration
├── drizzle.config.ts                # Drizzle Kit configuration
├── tsconfig.json                    # TypeScript config
├── vitest.config.ts                 # Test configuration
├── package.json                     # Dependencies & scripts
└── .env.example                     # Environment template
```

---

## 🔐 Role & Akses (Multi-Tenant Scoped RBAC)

Sistem menggunakan **6 role** dengan **scope-based authorization**:

| Role | Scope | Deskripsi |
|------|-------|-----------|
| **`platform_admin`** | PLATFORM | Akses seluruh organization — super admin global |
| **`organization_admin`** | ORGANIZATION | Kelola seluruh desa/kelurahan, RW, dan RT |
| **`rw_admin`** | RW | Kelola RW tertentu + semua RT di bawahnya |
| **`rt_admin`** | RT | Kelola RT tertentu |
| **`treasurer`** | Organization/RW/RT | Kelola keuangan sesuai scope |
| **`resident`** | Organization | Read-only + submit pembayaran & pendaftaran |

### Permission Matrix

| Permission | `platform_admin` | `organization_admin` | `rw_admin` | `rt_admin` | `treasurer` | `resident` |
|------------|:---:|:---:|:---:|:---:|:---:|:---:|
| `resident.view` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `resident.manage` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `household.view` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `household.manage` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `billing.manage` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `billing.view_own` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `payment.submit` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `event.create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `event.register` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `announcement.create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `campaign.create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `campaign.manage` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `forum.create` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `forum.moderate` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `join_request.view` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `join_request.approve` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `rw.create` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `rt.create` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `organization.manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `platform.manage` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Hierarchical Scope

```
PLATFORM (platform_admin)
    ↓
ORGANIZATION / Desa (organization_admin)
    ↓
RW (rw_admin)
    ↓
RT (rt_admin)
```

**Contoh:**
- `rw_admin` scope=RW_05 bisa akses RT_01 s/d RT_04 di bawah RW_05
- `rt_admin` scope=RT_02 hanya bisa akses data RT_02
- `organization_admin` bisa akses seluruh RW/RT di desanya

### Struktur Hierarki Wilayah

```
Desa/Kelurahan (Organization)
├── RW 01
│   ├── RT 01
│   │   └── Rumah Tangga → Warga
│   ├── RT 02
│   └── RT 03
├── RW 02
└── RW 03
```

### Authorization Flow

```
USER → MEMBERSHIP → ORGANIZATION → ROLE → SCOPE → PERMISSION → RESOURCE
```

Server-side authorization (bukan hanya hide menu di React):

```typescript
// 1. Authenticate user
// 2. Resolve active membership for organization
// 3. Check role has required permission
// 4. Verify scope can access resource scope
// 5. Filter query results by scope
// 6. Return scoped data
```

---

## 🗄️ Database Schema

Database menggunakan **Turso** (SQLite-compatible) dengan **Drizzle ORM**.

### Core Tables

| Table | Deskripsi |
|-------|-----------|
| `users` | Akun pengguna dengan role dan status |
| `organizations` | Desa/kelurahan (unit teratas) |
| `organization_members` | Membership user per wilayah |
| `rw_units` | Unit RW dalam organizaton |
| `rt_units` | Unit RT dalam RW |
| `households` | Rumah tangga dalam RT |
| `household_members` | Anggota rumah tangga |

### Business Tables

| Table | Deskripsi |
|-------|-----------|
| `billing_types` | Kategori tagihan (iuran sampah, keamanan, dll) |
| `billing_periods` | Periode tagihan per kategori |
| `invoices` | Tagihan per rumah tangga per periode |
| `payments` | Pembayaran yang diajukan warga |
| `payment_status_history` | Riwayat status pembayaran |
| `events` | Acara/kegiatan lingkungan |
| `event_registrations` | Pendaftaran hadir ke acara |
| `event_reminder_rules` | Aturan pengingat WhatsApp |
| `announcements` | Pengumuman untuk warga |
| `campaigns` | Kampanye donasi |
| `donations` | Kontribusi donasi warga |
| `fund_usages` | Penggunaan dana donasi |
| `forum_topics` | Topik diskusi forum |
| `forum_posts` | Postingan dalam topik |
| `forum_reports` | Laporan konten forum |

### System Tables

| Table | Deskripsi |
|-------|-----------|
| `notifications` | Notifikasi in-app/push/WhatsApp |
| `notification_deliveries` | Status pengiriman notifikasi |
| `files` | Metadata file yang diunggah |
| `audit_logs` | Log aktivitas penting |

---

## 🚀 Setup & Instalasi

### Prerequisites

- Node.js 18+
- pnpm 10+ (package manager)
- Turso account (database)
- Supabase account (storage, optional)

### Instalasi

```bash
# Clone repository
git clone <repo-url>
cd smart-warga-rt-rw

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Edit .env dan isi credentials
nano .env

# Push database schema
pnpm db:push

# Jalankan development server
pnpm dev
```

### Build & Deploy

```bash
# Build untuk production
pnpm build

# Jalankan production server
pnpm start
```

---

## 📦 Perintah Umum

| Command | Deskripsi |
|---------|-----------|
| `pnpm dev` | Jalankan development server (hot reload) |
| `pnpm build` | Build untuk production (client + server) |
| `pnpm start` | Jalankan production server |
| `pnpm check` | Typecheck TypeScript tanpa emit |
| `pnpm test` | Jalankan semua test (vitest) |
| `pnpm format` | Format kode dengan Prettier |
| `pnpm db:push` | Generate & jalankan migration database |

---

## 🔧 Environment Variables

### Wajib

| Variable | Deskripsi |
|----------|-----------|
| `TURSO_DATABASE_URL` | URL database Turso (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Auth token Turso |
| `JWT_SECRET` | Secret key untuk JWT session |

### Opsional

| Variable | Deskripsi |
|----------|-----------|
| `PORT` | Port server (default: 3000) |
| `CANONICAL_ORIGIN` | URL production untuk SEO |
| `SITE_NAME` | Nama site untuk SEO |
| `SUPABASE_URL` | URL Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Business API token |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp webhook verify token |
| `VITE_ANALYTICS_ENDPOINT` | Umami analytics endpoint |
| `VITE_ANALYTICS_WEBSITE_ID` | Umami website ID |

---

## 🔌 API Routes (tRPC)

Semua API menggunakan **tRPC** dengan type-safe procedures.

### Structure

```
appRouter
├── system           # System-level (health, notifyOwner)
├── auth             # Authentication (me, register, login, logout)
├── publicContent    # Public data (organizations, events by slug)
├── community        # Community operations
│   ├── organizations  # List user's memberships
│   ├── summary        # Organization summary
│   ├── residents      # Search residents
│   ├── joinRequest    # Submit join request
│   ├── pendingJoinRequests  # List pending requests (admin)
│   └── reviewJoinRequest    # Approve/reject (admin)
├── households       # Household management
│   ├── list           # List households
│   ├── listMembers    # List household members
│   └── addMember      # Add member to household
├── billing          # Billing & payments
│   ├── listTypes      # List billing categories
│   ├── createType     # Create billing category
│   ├── listPeriods    # List billing periods
│   ├── createPeriod   # Create billing period
│   ├── issueInvoices  # Issue invoices for period
│   ├── myInvoices     # Current user's invoices
│   ├── submitPayment  # Submit payment proof
│   ├── listPending    # List pending payments (treasurer)
│   └── verifyPayment  # Verify/reject payment
├── events           # Event management
│   ├── list           # List events
│   ├── create         # Create event (admin)
│   ├── publish        # Publish event (admin)
│   ├── register       # Register for event
│   ├── addReminderRule # Add WhatsApp reminder
│   └── listReminderRules # List reminder rules
├── announcements    # Announcement management
│   ├── list           # List announcements
│   ├── create         # Create announcement (admin)
│   └── publish        # Publish announcement (admin)
├── campaigns        # Donation campaigns
│   ├── list           # List published campaigns
│   ├── drafts         # List draft campaigns
│   ├── create         # Create campaign (admin)
│   ├── publish        # Publish campaign (admin)
│   ├── contribute     # Contribute to campaign
│   ├── pending        # List pending donations (treasurer)
│   └── verifyDonation # Verify/reject donation
└── forum            # Forum discussions
    ├── topics        # List forum topics
    ├── createTopic   # Create topic
    ├── posts         # List posts in topic
    ├── createPost    # Create post
    ├── reports       # List reports (admin)
    └── reviewReport  # Review report (admin)
```

---

## 🧪 Testing

Menggunakan **Vitest** dengan test files berada di `server/*.test.ts`.

```bash
# Jalankan semua test
pnpm test

# Jalankan test tertentu
pnpm vitest run server/role-matrix.test.ts
```

---

## 📄 License

MIT License
# Force build
