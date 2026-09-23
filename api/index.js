const __dirname = new URL(".", import.meta.url).pathname;

// api-src/index.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/routers.ts
import { parse as parseCookie } from "cookie";
import { and as and3, asc, count as count2, desc as desc2, eq as eq5, sum } from "drizzle-orm";
import { z as z2 } from "zod";

// drizzle/schema.ts
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
var id = (name) => text(name).primaryKey().$defaultFn(() => crypto.randomUUID());
var timestamps = {
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
};
var users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  passwordHash: text("passwordHash"),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["platform_admin", "organization_admin", "rw_admin", "rt_admin", "treasurer", "resident"] }).notNull().default("resident"),
  status: text("status", { enum: ["active", "pending", "archived"] }).notNull().default("active"),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp_ms" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date()),
  ...timestamps
}, (table) => ({ roleIdx: index("users_role_idx").on(table.role), phoneIdx: index("users_phone_idx").on(table.phone) }));
var organizations = sqliteTable("organizations", {
  id: id("id"),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  timezone: text("timezone").notNull().default("Asia/Jakarta"),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  ...timestamps
}, (table) => ({ slugIdx: uniqueIndex("organizations_slug_idx").on(table.slug) }));
var organizationMembers = sqliteTable("organization_members", {
  organizationId: text("organizationId").notNull().references(() => organizations.id),
  userId: integer("userId").notNull().references(() => users.id),
  role: text("role", { enum: ["platform_admin", "organization_admin", "rw_admin", "rt_admin", "treasurer", "resident"] }).notNull().default("resident"),
  scopeType: text("scopeType", { enum: ["organization", "rw", "rt"] }).default("organization"),
  scopeId: text("scopeId"),
  status: text("status", { enum: ["active", "invited", "pending", "removed"] }).notNull().default("active"),
  ...timestamps
}, (table) => ({ pk: uniqueIndex("organization_members_pk").on(table.organizationId, table.userId), userIdx: index("organization_members_user_idx").on(table.userId), orgIdx: index("organization_members_org_idx").on(table.organizationId) }));
var rwUnits = sqliteTable("rw_units", {
  id: id("id"),
  organizationId: text("organizationId").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  ...timestamps
}, (table) => ({ orgIdx: index("rw_units_org_idx").on(table.organizationId) }));
var rtUnits = sqliteTable("rt_units", {
  id: id("id"),
  rwId: text("rwId").notNull().references(() => rwUnits.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  ...timestamps
}, (table) => ({ rwIdx: index("rt_units_rw_idx").on(table.rwId) }));
var households = sqliteTable("households", {
  id: id("id"),
  rtId: text("rtId").notNull().references(() => rtUnits.id),
  address: text("address").notNull(),
  block: text("block"),
  houseNumber: text("houseNumber"),
  status: text("status", { enum: ["active", "moved", "archived"] }).notNull().default("active"),
  ...timestamps
}, (table) => ({ rtIdx: index("households_rt_idx").on(table.rtId), addressIdx: index("households_address_idx").on(table.address) }));
var householdMembers = sqliteTable("household_members", {
  householdId: text("householdId").notNull().references(() => households.id),
  userId: integer("userId").notNull().references(() => users.id),
  relationship: text("relationship"),
  isHead: integer("isHead", { mode: "boolean" }).notNull().default(false),
  ...timestamps
}, (table) => ({ pk: uniqueIndex("household_members_pk").on(table.householdId, table.userId), userIdx: index("household_members_user_idx").on(table.userId) }));
var billingTypes = sqliteTable("billing_types", {
  id: id("id"),
  organizationId: text("organizationId").notNull().references(() => organizations.id),
  scopeType: text("scopeType", { enum: ["organization", "rw", "rt"] }).default("organization"),
  scopeId: text("scopeId"),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  unit: text("unit").notNull().default("household"),
  defaultAmount: integer("defaultAmount").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps
}, (table) => ({ orgIdx: index("billing_types_org_idx").on(table.organizationId) }));
var billingPeriods = sqliteTable("billing_periods", {
  id: id("id"),
  billingTypeId: text("billingTypeId").notNull().references(() => billingTypes.id),
  periodKey: text("periodKey").notNull(),
  dueAt: integer("dueAt", { mode: "timestamp_ms" }).notNull(),
  status: text("status", { enum: ["draft", "issued", "closed"] }).notNull().default("draft"),
  ...timestamps
}, (table) => ({ periodIdx: uniqueIndex("billing_periods_type_period_idx").on(table.billingTypeId, table.periodKey) }));
var invoices = sqliteTable("invoices", {
  id: id("id"),
  householdId: text("householdId").notNull().references(() => households.id),
  billingPeriodId: text("billingPeriodId").notNull().references(() => billingPeriods.id),
  amount: integer("amount").notNull(),
  status: text("status", { enum: ["unpaid", "submitted", "verified", "rejected", "overdue"] }).notNull().default("unpaid"),
  ...timestamps
}, (table) => ({ householdIdx: index("invoices_household_idx").on(table.householdId), periodIdx: index("invoices_period_idx").on(table.billingPeriodId), householdPeriodUnique: uniqueIndex("invoices_household_period_unique").on(table.householdId, table.billingPeriodId), statusIdx: index("invoices_status_idx").on(table.status) }));
var payments = sqliteTable("payments", {
  id: id("id"),
  invoiceId: text("invoiceId").notNull().references(() => invoices.id),
  submittedBy: integer("submittedBy").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  proofFileId: text("proofFileId"),
  note: text("note"),
  status: text("status", { enum: ["submitted", "verified", "rejected"] }).notNull().default("submitted"),
  verifiedBy: integer("verifiedBy").references(() => users.id),
  verifiedAt: integer("verifiedAt", { mode: "timestamp_ms" }),
  ...timestamps
}, (table) => ({ invoiceIdx: index("payments_invoice_idx").on(table.invoiceId), statusIdx: index("payments_status_idx").on(table.status) }));
var paymentStatusHistory = sqliteTable("payment_status_history", {
  id: id("id"),
  paymentId: text("paymentId").notNull().references(() => payments.id),
  invoiceId: text("invoiceId").notNull().references(() => invoices.id),
  status: text("status", { enum: ["submitted", "verified", "rejected"] }).notNull(),
  actorId: integer("actorId").references(() => users.id),
  note: text("note"),
  ...timestamps
}, (table) => ({ paymentIdx: index("payment_status_history_payment_idx").on(table.paymentId), invoiceIdx: index("payment_status_history_invoice_idx").on(table.invoiceId), createdIdx: index("payment_status_history_created_idx").on(table.createdAt) }));
var events = sqliteTable("events", {
  id: id("id"),
  organizationId: text("organizationId").notNull().references(() => organizations.id),
  rtId: text("rtId").references(() => rtUnits.id),
  scopeType: text("scopeType", { enum: ["organization", "rw", "rt"] }).default("organization"),
  scopeId: text("scopeId"),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  location: text("location"),
  startsAt: integer("startsAt", { mode: "timestamp_ms" }).notNull(),
  endsAt: integer("endsAt", { mode: "timestamp_ms" }),
  capacity: integer("capacity"),
  status: text("status", { enum: ["draft", "published", "cancelled", "completed"] }).notNull().default("draft"),
  ...timestamps
}, (table) => ({ orgIdx: index("events_org_idx").on(table.organizationId), startsIdx: index("events_starts_idx").on(table.startsAt), slugIdx: uniqueIndex("events_slug_idx").on(table.organizationId, table.slug) }));
var announcements = sqliteTable("announcements", {
  id: id("id"),
  organizationId: text("organizationId").notNull().references(() => organizations.id),
  scopeType: text("scopeType", { enum: ["organization", "rw", "rt"] }).default("organization"),
  scopeId: text("scopeId"),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
  publishedAt: integer("publishedAt", { mode: "timestamp_ms" }),
  createdBy: integer("createdBy").notNull().references(() => users.id),
  ...timestamps
}, (table) => ({ orgIdx: index("announcements_org_idx").on(table.organizationId), slugIdx: uniqueIndex("announcements_slug_idx").on(table.organizationId, table.slug), statusIdx: index("announcements_status_idx").on(table.status) }));
var eventReminderRules = sqliteTable("event_reminder_rules", {
  id: id("id"),
  eventId: text("eventId").notNull().references(() => events.id),
  organizationId: text("organizationId").notNull().references(() => organizations.id),
  templateName: text("templateName").notNull(),
  minutesBefore: integer("minutesBefore").notNull().default(1440),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  scheduleCronTaskUid: text("scheduleCronTaskUid"),
  ...timestamps
}, (table) => ({ eventIdx: index("event_reminder_rules_event_idx").on(table.eventId), taskIdx: index("event_reminder_rules_task_idx").on(table.scheduleCronTaskUid) }));
var eventRegistrations = sqliteTable("event_registrations", {
  eventId: text("eventId").notNull().references(() => events.id),
  userId: integer("userId").notNull().references(() => users.id),
  status: text("status", { enum: ["registered", "cancelled", "attended"] }).notNull().default("registered"),
  ...timestamps
}, (table) => ({ pk: uniqueIndex("event_registrations_pk").on(table.eventId, table.userId), userIdx: index("event_registrations_user_idx").on(table.userId) }));
var campaigns = sqliteTable("campaigns", {
  id: id("id"),
  organizationId: text("organizationId").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  targetAmount: integer("targetAmount").notNull().default(0),
  startsAt: integer("startsAt", { mode: "timestamp_ms" }),
  endsAt: integer("endsAt", { mode: "timestamp_ms" }),
  status: text("status", { enum: ["draft", "published", "closed"] }).notNull().default("draft"),
  ...timestamps
}, (table) => ({ orgIdx: index("campaigns_org_idx").on(table.organizationId), slugIdx: uniqueIndex("campaigns_slug_idx").on(table.organizationId, table.slug) }));
var donations = sqliteTable("donations", {
  id: id("id"),
  campaignId: text("campaignId").notNull().references(() => campaigns.id),
  donorId: integer("donorId").references(() => users.id),
  amount: integer("amount").notNull(),
  visibility: text("visibility", { enum: ["named", "anonymous"] }).notNull().default("named"),
  proofFileId: text("proofFileId"),
  status: text("status", { enum: ["submitted", "verified", "rejected"] }).notNull().default("submitted"),
  ...timestamps
}, (table) => ({ campaignIdx: index("donations_campaign_idx").on(table.campaignId), statusIdx: index("donations_status_idx").on(table.status) }));
var forumReports = sqliteTable("forum_reports", {
  id: id("id"),
  postId: text("postId").notNull().references(() => forumPosts.id),
  reporterId: integer("reporterId").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["open", "reviewed", "dismissed", "actioned"] }).notNull().default("open"),
  ...timestamps
}, (table) => ({ postIdx: index("forum_reports_post_idx").on(table.postId), statusIdx: index("forum_reports_status_idx").on(table.status) }));
var fundUsages = sqliteTable("fund_usages", {
  id: id("id"),
  campaignId: text("campaignId").notNull().references(() => campaigns.id),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  evidenceFileId: text("evidenceFileId"),
  ...timestamps
}, (table) => ({ campaignIdx: index("fund_usages_campaign_idx").on(table.campaignId) }));
var forumTopics = sqliteTable("forum_topics", {
  id: id("id"),
  organizationId: text("organizationId").notNull().references(() => organizations.id),
  scopeType: text("scopeType", { enum: ["general", "event", "announcement", "campaign"] }).notNull().default("general"),
  scopeId: text("scopeId"),
  title: text("title").notNull(),
  status: text("status", { enum: ["open", "locked", "archived"] }).notNull().default("open"),
  ...timestamps
}, (table) => ({ orgIdx: index("forum_topics_org_idx").on(table.organizationId), scopeIdx: index("forum_topics_scope_idx").on(table.scopeType, table.scopeId) }));
var forumPosts = sqliteTable("forum_posts", {
  id: id("id"),
  topicId: text("topicId").notNull().references(() => forumTopics.id),
  authorId: integer("authorId").notNull().references(() => users.id),
  body: text("body").notNull(),
  status: text("status", { enum: ["published", "hidden", "reported"] }).notNull().default("published"),
  ...timestamps
}, (table) => ({ topicIdx: index("forum_posts_topic_idx").on(table.topicId), authorIdx: index("forum_posts_author_idx").on(table.authorId) }));
var notifications = sqliteTable("notifications", {
  id: id("id"),
  recipientId: integer("recipientId").notNull().references(() => users.id),
  channel: text("channel", { enum: ["in_app", "web_push", "whatsapp", "email"] }).notNull(),
  template: text("template").notNull(),
  entityType: text("entityType"),
  entityId: text("entityId"),
  scheduledAt: integer("scheduledAt", { mode: "timestamp_ms" }),
  status: text("status", { enum: ["queued", "sent", "failed", "cancelled"] }).notNull().default("queued"),
  ...timestamps
}, (table) => ({ recipientIdx: index("notifications_recipient_idx").on(table.recipientId), scheduleIdx: index("notifications_schedule_idx").on(table.status, table.scheduledAt) }));
var notificationDeliveries = sqliteTable("notification_deliveries", {
  id: id("id"),
  notificationId: text("notificationId").notNull().references(() => notifications.id),
  providerMessageId: text("providerMessageId"),
  status: text("status", { enum: ["accepted", "delivered", "read", "failed"] }).notNull(),
  errorCode: text("errorCode"),
  payload: text("payload"),
  ...timestamps
}, (table) => ({ notificationIdx: index("notification_deliveries_notification_idx").on(table.notificationId), providerIdx: index("notification_deliveries_provider_idx").on(table.providerMessageId) }));
var files = sqliteTable("files", {
  id: id("id"),
  ownerId: integer("ownerId").references(() => users.id),
  storageProvider: text("storageProvider").notNull().default("supabase"),
  bucket: text("bucket").notNull(),
  path: text("path").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mimeType").notNull(),
  size: integer("size").notNull(),
  visibility: text("visibility", { enum: ["private", "public"] }).notNull().default("private"),
  ...timestamps
}, (table) => ({ pathIdx: uniqueIndex("files_path_idx").on(table.bucket, table.path), ownerIdx: index("files_owner_idx").on(table.ownerId) }));
var auditLogs = sqliteTable("audit_logs", {
  id: id("id"),
  actorId: integer("actorId").references(() => users.id),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resourceId"),
  metadata: text("metadata"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
}, (table) => ({ resourceIdx: index("audit_logs_resource_idx").on(table.resource, table.resourceId), actorIdx: index("audit_logs_actor_idx").on(table.actorId) }));

// server/db.ts
import { createClient } from "@libsql/client";
import { and, count, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
var _db = null;
async function getDb() {
  if (!_db && process.env.TURSO_DATABASE_URL) {
    try {
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
      });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect to Turso:", error);
      _db = null;
    }
  }
  return _db;
}
async function logAudit(input) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({
    actorId: input.actorId,
    action: input.action,
    resource: input.resource,
    resourceId: input.resourceId,
    metadata: input.metadata ? JSON.stringify(input.metadata) : void 0
  });
}
async function getUserOrganizations(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ organization: organizations, membership: organizationMembers }).from(organizationMembers).innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId)).where(eq(organizationMembers.userId, userId));
}
async function getOrganizationSummary(organizationId) {
  const db = await getDb();
  if (!db) return null;
  const [householdCount, residentCount, invoiceCount, eventCount, campaignCount, topicCount] = await Promise.all([
    db.select({ count: count() }).from(households).innerJoin(rtUnits, eq(rtUnits.id, households.rtId)).innerJoin(rwUnits, eq(rwUnits.id, rtUnits.rwId)).where(eq(rwUnits.organizationId, organizationId)),
    db.select({ count: count() }).from(organizationMembers).where(eq(organizationMembers.organizationId, organizationId)),
    db.select({ count: count() }).from(invoices).innerJoin(billingPeriods, eq(billingPeriods.id, invoices.billingPeriodId)).innerJoin(billingTypes, eq(billingTypes.id, billingPeriods.billingTypeId)).where(eq(billingTypes.organizationId, organizationId)),
    db.select({ count: count() }).from(events).where(eq(events.organizationId, organizationId)),
    db.select({ count: count() }).from(campaigns).where(eq(campaigns.organizationId, organizationId)),
    db.select({ count: count() }).from(forumTopics).where(eq(forumTopics.organizationId, organizationId))
  ]);
  return {
    households: householdCount[0]?.count ?? 0,
    residents: residentCount[0]?.count ?? 0,
    invoices: invoiceCount[0]?.count ?? 0,
    events: eventCount[0]?.count ?? 0,
    campaigns: campaignCount[0]?.count ?? 0,
    forumTopics: topicCount[0]?.count ?? 0
  };
}
async function searchOrganizationResidents(organizationId, query, limit = 25, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const normalized = `%${query.trim()}%`;
  return db.selectDistinct({ user: users, membership: organizationMembers }).from(organizationMembers).innerJoin(users, eq(users.id, organizationMembers.userId)).leftJoin(householdMembers, eq(householdMembers.userId, users.id)).leftJoin(households, eq(households.id, householdMembers.householdId)).leftJoin(rtUnits, eq(rtUnits.id, households.rtId)).leftJoin(rwUnits, eq(rwUnits.id, rtUnits.rwId)).where(and(
    eq(organizationMembers.organizationId, organizationId),
    or(
      like(users.name, normalized),
      like(users.email, normalized),
      and(eq(rwUnits.organizationId, organizationId), like(households.address, normalized))
    )
  )).orderBy(desc(users.createdAt)).limit(Math.min(limit, 100)).offset(Math.max(offset, 0));
}

// server/_core/cookies.ts
var LOCAL_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "::1"]);
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  const isLocalhost = LOCAL_HOSTS.has(req.hostname);
  return {
    httpOnly: true,
    path: "/",
    sameSite: isLocalhost ? "lax" : "none",
    secure
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var errorHandler = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (err) {
    if (err instanceof TRPCError2) throw err;
    console.error("[tRPC] Unhandled error:", err);
    throw new TRPCError2({
      code: "INTERNAL_SERVER_ERROR",
      message: "Terjadi kesalahan. Silakan coba lagi."
    });
  }
});
var protectedProcedure = t.procedure.use(requireUser).use(errorHandler);
var publicProcedure = t.procedure.use(errorHandler);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "platform_admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
).use(errorHandler);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/supabaseStorage.ts
var storageBase = () => `${(process.env.SUPABASE_URL ?? "").replace(/\/$/, "")}/storage/v1`;
function storageHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.SUPABASE_URL || !key) throw new Error("Supabase Storage is not configured");
  return { apikey: key, Authorization: `Bearer ${key}` };
}
async function uploadPrivateObject(input) {
  const response = await fetch(`${storageBase()}/object/${encodeURIComponent(input.bucket)}/${input.path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { ...storageHeaders(), "Content-Type": input.contentType, "x-upsert": "false" },
    body: input.body
  });
  if (!response.ok) throw new Error(`Supabase upload failed with status ${response.status}`);
  return { bucket: input.bucket, path: input.path };
}
async function createPrivateSignedUrl(input) {
  const response = await fetch(`${storageBase()}/object/sign/${encodeURIComponent(input.bucket)}/${input.path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { ...storageHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: input.expiresInSeconds ?? 300 })
  });
  if (!response.ok) throw new Error(`Supabase signed URL failed with status ${response.status}`);
  const payload = await response.json();
  if (!payload.signedURL) throw new Error("Supabase did not return a signed URL");
  const signed = payload.signedURL.startsWith("http") ? payload.signedURL : `${(process.env.SUPABASE_URL ?? "").replace(/\/$/, "")}/storage/v1${payload.signedURL}`;
  return signed;
}

// server/_core/heartbeat.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
var SERVICE = "webdevtoken.v1.WebDevService";
var buildEndpoint = (rpc) => {
  if (!ENV.forgeApiUrl) {
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: "Heartbeat service URL is not configured (BUILT_IN_FORGE_API_URL)."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: "Heartbeat service API key is not configured (BUILT_IN_FORGE_API_KEY)."
    });
  }
  const baseUrl = ENV.forgeApiUrl;
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(`${SERVICE}/${rpc}`, normalizedBase).toString();
};
var callForge = async (rpc, body, userSession) => {
  const endpoint = buildEndpoint(rpc);
  const headers = {
    accept: "application/json",
    authorization: `Bearer ${ENV.forgeApiKey}`,
    "content-type": "application/json",
    "connect-protocol-version": "1"
  };
  if (userSession) {
    headers["x-manus-user-session"] = userSession;
  }
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: `Heartbeat ${rpc} network error: ${String(error)}`
    });
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw mapForgeError(response, detail, rpc);
  }
  return await response.json();
};
var mapForgeError = (response, detail, rpc) => {
  const status = response.status;
  let code = "INTERNAL_SERVER_ERROR";
  if (status === 401) code = "UNAUTHORIZED";
  else if (status === 403) code = "FORBIDDEN";
  else if (status === 404) code = "NOT_FOUND";
  else if (status === 400 || status === 422) code = "BAD_REQUEST";
  else if (status === 409) code = "CONFLICT";
  else if (status === 429) code = "TOO_MANY_REQUESTS";
  return new TRPCError3({
    code,
    message: `Heartbeat ${rpc} failed (${status})${detail ? `: ${detail}` : ""}`
  });
};
var stringifyPayload = (payload) => {
  if (payload === void 0 || payload === null) return "{}";
  if (typeof payload === "string") return payload;
  return JSON.stringify(payload);
};
var validateCallbackPath = (path) => {
  if (!path || !path.startsWith("/api/scheduled/")) {
    throw new TRPCError3({
      code: "BAD_REQUEST",
      message: "callback path must start with /api/scheduled/"
    });
  }
};
async function createHeartbeatJob(job, userSession) {
  validateCallbackPath(job.path);
  return callForge(
    "CreateHeartbeatJob",
    {
      name: job.name,
      cronExpression: job.cron,
      callbackPath: job.path,
      callbackMethod: job.method ?? "POST",
      callbackPayload: stringifyPayload(job.payload),
      description: job.description ?? ""
    },
    userSession
  );
}

// server/routers.ts
import { TRPCError as TRPCError5 } from "@trpc/server";

// server/auth.ts
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { eq as eq2 } from "drizzle-orm";
var SESSION_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret-change-me"
);
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const testBuf = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuf, testBuf);
}
async function createSessionToken(payload) {
  return new SignJWT({
    userId: payload.userId,
    openId: payload.openId,
    name: payload.name
  }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt().setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1e3)).sign(SESSION_SECRET);
}
async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET, {
      algorithms: ["HS256"]
    });
    const userId = payload.userId;
    const openId = payload.openId;
    const name = payload.name;
    if (!openId) return null;
    return { userId, openId, name };
  } catch {
    return null;
  }
}
async function registerUser(input) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");
  let existing;
  try {
    existing = await db.select().from(users).where(eq2(users.email, input.email)).limit(1);
  } catch (error) {
    console.error("[Auth] Database query failed during registration:", error);
    throw new Error("Gagal mendaftar. Silakan coba lagi.");
  }
  if (existing[0]) {
    throw new Error("Email sudah terdaftar");
  }
  const openId = `local_${crypto.randomUUID()}`;
  const passwordHash = hashPassword(input.password);
  let user;
  try {
    [user] = await db.insert(users).values({
      openId,
      passwordHash,
      name: input.name,
      email: input.email,
      loginMethod: "email",
      role: input.role || "resident",
      status: "active"
    }).returning();
  } catch (error) {
    console.error("[Auth] Database insert failed during registration:", error);
    throw new Error("Gagal membuat akun. Silakan coba lagi.");
  }
  if (!user) throw new Error("Gagal membuat akun");
  const token = await createSessionToken({
    userId: user.id,
    openId: user.openId,
    name: user.name || ""
  });
  return { user, token };
}
async function loginUser(input) {
  const db = await getDb();
  if (!db) throw new Error("Email atau password salah");
  let result;
  try {
    result = await db.select().from(users).where(eq2(users.email, input.email)).limit(1);
  } catch (error) {
    console.error("[Auth] Database query failed during login:", error);
    throw new Error("Email atau password salah");
  }
  const user = result[0];
  if (!user) {
    throw new Error("Email atau password salah");
  }
  if (!user.passwordHash) {
    throw new Error("Akun ini tidak memiliki password. Silakan login dengan metode lain.");
  }
  const isValid = verifyPassword(input.password, user.passwordHash);
  if (!isValid) {
    throw new Error("Email atau password salah");
  }
  try {
    await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq2(users.id, user.id));
  } catch (error) {
    console.error("[Auth] Failed to update lastSignedIn:", error);
  }
  const token = await createSessionToken({
    userId: user.id,
    openId: user.openId,
    name: user.name || ""
  });
  return { user, token };
}
async function authenticateFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    })
  );
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(users).where(eq2(users.id, session.userId)).limit(1);
    return result[0] ?? null;
  } catch (error) {
    console.error("[Auth] Database query failed during cookie auth:", error);
    return null;
  }
}

// server/_core/authorize.ts
import { TRPCError as TRPCError4 } from "@trpc/server";
import { eq as eq3, and as and2, or as or2 } from "drizzle-orm";

// server/_core/permissions.ts
var P = {
  // Resident permissions
  RESIDENT_VIEW_OWN: "resident.view_own",
  BILLING_VIEW_OWN: "billing.view_own",
  PAYMENT_SUBMIT: "payment.submit",
  EVENT_REGISTER: "event.register",
  FORUM_CREATE: "forum.create",
  FORUM_VIEW: "forum.view",
  FORUM_MODERATE: "forum.moderate",
  CAMPAIGN_CONTRIBUTE: "campaign.contribute",
  // RT Admin permissions (inherits resident +)
  RESIDENT_VIEW: "resident.view",
  RESIDENT_MANAGE: "resident.manage",
  HOUSEHOLD_VIEW: "household.view",
  HOUSEHOLD_MANAGE: "household.manage",
  EVENT_CREATE: "event.create",
  EVENT_MANAGE: "event.manage",
  ANNOUNCEMENT_CREATE: "announcement.create",
  ANNOUNCEMENT_MANAGE: "announcement.manage",
  BILLING_MANAGE: "billing.manage",
  CAMPAIGN_CREATE: "campaign.create",
  CAMPAIGN_MANAGE: "campaign.manage",
  JOIN_REQUEST_VIEW: "join_request.view",
  JOIN_REQUEST_APPROVE: "join_request.approve",
  // RW Admin permissions (inherits RT +)
  RW_MANAGE: "rw.manage",
  RT_MANAGE: "rt.manage",
  RW_REPORT: "rw.report",
  // Organization Admin permissions (inherits RW +)
  ORGANIZATION_MANAGE: "organization.manage",
  RW_CREATE: "rw.create",
  RT_CREATE: "rt.create",
  ORGANIZATION_REPORT: "organization.report",
  // Platform Admin
  PLATFORM_MANAGE: "platform.manage"
};
var RESIDENT_PERMISSIONS = [
  P.RESIDENT_VIEW_OWN,
  P.BILLING_VIEW_OWN,
  P.PAYMENT_SUBMIT,
  P.EVENT_REGISTER,
  P.FORUM_CREATE,
  P.FORUM_VIEW,
  P.CAMPAIGN_CONTRIBUTE
];
var RT_ADMIN_PERMISSIONS = [
  ...RESIDENT_PERMISSIONS,
  P.RESIDENT_VIEW,
  P.RESIDENT_MANAGE,
  P.HOUSEHOLD_VIEW,
  P.HOUSEHOLD_MANAGE,
  P.EVENT_CREATE,
  P.EVENT_MANAGE,
  P.ANNOUNCEMENT_CREATE,
  P.ANNOUNCEMENT_MANAGE,
  P.BILLING_MANAGE,
  P.CAMPAIGN_CREATE,
  P.CAMPAIGN_MANAGE,
  P.JOIN_REQUEST_VIEW,
  P.JOIN_REQUEST_APPROVE
];
var RW_ADMIN_PERMISSIONS = [
  ...RT_ADMIN_PERMISSIONS,
  P.RW_MANAGE,
  P.RT_MANAGE,
  P.RW_REPORT
];
var ORG_ADMIN_PERMISSIONS = [
  ...RW_ADMIN_PERMISSIONS,
  P.ORGANIZATION_MANAGE,
  P.RW_CREATE,
  P.RT_CREATE,
  P.ORGANIZATION_REPORT,
  P.FORUM_MODERATE
];
var PLATFORM_ADMIN_PERMISSIONS = Object.values(P);
var ROLE_PERMISSIONS = {
  platform_admin: PLATFORM_ADMIN_PERMISSIONS,
  organization_admin: ORG_ADMIN_PERMISSIONS,
  rw_admin: RW_ADMIN_PERMISSIONS,
  rt_admin: RT_ADMIN_PERMISSIONS,
  treasurer: [
    P.RESIDENT_VIEW_OWN,
    P.BILLING_VIEW_OWN,
    P.BILLING_MANAGE,
    P.PAYMENT_SUBMIT,
    P.EVENT_REGISTER,
    P.FORUM_CREATE,
    P.FORUM_VIEW,
    P.CAMPAIGN_CONTRIBUTE,
    P.CAMPAIGN_MANAGE
  ],
  resident: RESIDENT_PERMISSIONS
};
function roleHasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(permission);
}

// server/_core/authorize.ts
async function getMembership(userId, organizationId) {
  const memberships = await getUserOrganizations(userId);
  const found = memberships.find((item) => item.organization.id === organizationId);
  if (!found || found.membership.status !== "active") return null;
  return {
    organizationId,
    role: found.membership.role,
    scopeType: found.membership.scopeType ?? "organization",
    scopeId: found.membership.scopeId,
    status: found.membership.status
  };
}
async function requireMembership(userId, organizationId) {
  const membership = await getMembership(userId, organizationId);
  if (!membership) {
    throw new TRPCError4({
      code: "FORBIDDEN",
      message: "Anda tidak memiliki akses ke wilayah ini"
    });
  }
  return membership;
}
async function requirePermission(userId, organizationId, permission) {
  const membership = await requireMembership(userId, organizationId);
  if (!roleHasPermission(membership.role, permission)) {
    throw new TRPCError4({
      code: "FORBIDDEN",
      message: "Peran Anda tidak dapat melakukan tindakan ini"
    });
  }
  return membership;
}
async function getRtRwId(rtId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ rwId: rtUnits.rwId }).from(rtUnits).where(eq3(rtUnits.id, rtId)).limit(1);
  return result[0]?.rwId ?? null;
}
async function isHouseholdInScope(membership, householdRtId) {
  if (!membership.scopeType || membership.scopeType === "organization") {
    return true;
  }
  if (membership.scopeType === "rt") {
    return householdRtId === membership.scopeId;
  }
  if (membership.scopeType === "rw") {
    const rtRwId = await getRtRwId(householdRtId);
    return rtRwId === membership.scopeId;
  }
  return false;
}

// server/realtime.ts
import { Server } from "socket.io";
import { eq as eq4 } from "drizzle-orm";
var io = null;
var forumRoom = (organizationId) => `forum:${organizationId}`;
function emitForumEvent(organizationId, event, payload) {
  if (!io) return;
  io.to(forumRoom(organizationId)).emit(event, payload);
}

// server/routers.ts
var organizationIdInput = z2.object({ organizationId: z2.string().min(1).max(80) });
var scopeInput = z2.object({
  scopeType: z2.enum(["organization", "rw", "rt"]).default("organization"),
  scopeId: z2.string().nullable().default(null)
});
async function requireOrganizationAccess(userId, organizationId) {
  return requireMembership(userId, organizationId);
}
async function requireOrganizationRole(userId, organizationId, allowedRoles) {
  const membership = await requireMembership(userId, organizationId);
  if (!allowedRoles.includes(membership.role)) {
    throw new TRPCError5({ code: "FORBIDDEN", message: "Peran Anda tidak dapat melakukan tindakan ini" });
  }
  return membership;
}
var appRouter = router({
  system: systemRouter,
  publicContent: router({
    organizationBySlug: publicProcedure.input(z2.object({ slug: z2.string().trim().min(1).max(120) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select({ organization: organizations }).from(organizations).where(and3(eq5(organizations.slug, input.slug), eq5(organizations.status, "active"))).limit(1);
      return result[0]?.organization ?? null;
    }),
    eventBySlug: publicProcedure.input(z2.object({ organizationSlug: z2.string().trim().min(1).max(120), slug: z2.string().trim().min(1).max(140) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select({ event: events, organization: organizations }).from(events).innerJoin(organizations, eq5(organizations.id, events.organizationId)).where(and3(eq5(organizations.slug, input.organizationSlug), eq5(events.slug, input.slug), eq5(events.status, "published"), eq5(organizations.status, "active"))).limit(1);
      return result[0] ?? null;
    }),
    campaignBySlug: publicProcedure.input(z2.object({ organizationSlug: z2.string().trim().min(1).max(120), slug: z2.string().trim().min(1).max(140) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select({ campaign: campaigns, organization: organizations }).from(campaigns).innerJoin(organizations, eq5(organizations.id, campaigns.organizationId)).where(and3(eq5(organizations.slug, input.organizationSlug), eq5(campaigns.slug, input.slug), eq5(campaigns.status, "published"), eq5(organizations.status, "active"))).limit(1);
      return result[0] ?? null;
    }),
    listOrganizations: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(organizations).where(eq5(organizations.status, "active")).orderBy(asc(organizations.name));
    }),
    listRwUnits: publicProcedure.input(z2.object({ organizationId: z2.string().min(1).max(80) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rwRows = await db.select().from(rwUnits).where(eq5(rwUnits.organizationId, input.organizationId)).orderBy(asc(rwUnits.code));
      const result = await Promise.all(rwRows.map(async (rw) => {
        const rts = await db.select().from(rtUnits).where(eq5(rtUnits.rwId, rw.id)).orderBy(asc(rtUnits.code));
        return { ...rw, rts };
      }));
      return result;
    })
  }),
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    register: publicProcedure.input(z2.object({
      name: z2.string().trim().min(2).max(100),
      email: z2.string().email().max(200),
      password: z2.string().min(6).max(100),
      role: z2.enum(["organization_admin", "rw_admin", "rt_admin", "treasurer", "resident"]).default("resident"),
      organizationIds: z2.array(z2.string().min(1).max(80)).default([]),
      createOrganization: z2.object({ name: z2.string().min(1).max(120), slug: z2.string().min(1).max(120) }).optional(),
      createRw: z2.object({ name: z2.string().min(1), code: z2.string().min(1).max(10), organizationId: z2.string().min(1) }).optional(),
      createRt: z2.object({ name: z2.string().min(1), code: z2.string().min(1).max(10), rwId: z2.string().min(1) }).optional(),
      // For resident joining a specific RT
      joinRtId: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const { user, token } = await registerUser({ name: input.name, email: input.email, password: input.password, role: input.role });
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      let finalOrgIds = [...input.organizationIds];
      const membershipScopes = {};
      if (input.createOrganization) {
        const existingOrg = await db.select().from(organizations).where(eq5(organizations.slug, input.createOrganization.slug)).limit(1);
        if (existingOrg[0]) throw new TRPCError5({ code: "CONFLICT", message: "Slug desa/kelurahan sudah digunakan" });
        const [newOrg] = await db.insert(organizations).values({
          name: input.createOrganization.name,
          slug: input.createOrganization.slug
        }).returning();
        if (newOrg) {
          finalOrgIds.push(newOrg.id);
          membershipScopes[newOrg.id] = { scopeType: "organization", scopeId: null };
          await logAudit({ actorId: user.id, action: "create", resource: "organization", resourceId: newOrg.id });
        }
      }
      if (input.createRw) {
        const org = await db.select().from(organizations).where(eq5(organizations.id, input.createRw.organizationId)).limit(1);
        if (!org[0]) throw new TRPCError5({ code: "NOT_FOUND", message: "Desa/kelurahan tidak ditemukan" });
        const [newRw] = await db.insert(rwUnits).values({
          organizationId: input.createRw.organizationId,
          name: input.createRw.name,
          code: input.createRw.code
        }).returning();
        if (!finalOrgIds.includes(input.createRw.organizationId)) {
          finalOrgIds.push(input.createRw.organizationId);
        }
        membershipScopes[input.createRw.organizationId] = { scopeType: "rw", scopeId: newRw?.id || null };
        await logAudit({ actorId: user.id, action: "create", resource: "rw_unit", resourceId: newRw?.id, metadata: { organizationId: input.createRw.organizationId } });
      }
      if (input.createRt) {
        const rw = await db.select().from(rwUnits).where(eq5(rwUnits.id, input.createRt.rwId)).limit(1);
        if (!rw[0]) throw new TRPCError5({ code: "NOT_FOUND", message: "RW tidak ditemukan" });
        const [newRt] = await db.insert(rtUnits).values({
          rwId: input.createRt.rwId,
          name: input.createRt.name,
          code: input.createRt.code
        }).returning();
        if (!finalOrgIds.includes(rw[0].organizationId)) {
          finalOrgIds.push(rw[0].organizationId);
        }
        membershipScopes[rw[0].organizationId] = { scopeType: "rt", scopeId: newRt?.id || null };
        await logAudit({ actorId: user.id, action: "create", resource: "rt_unit", resourceId: newRt?.id, metadata: { rwId: input.createRt.rwId } });
      }
      if (finalOrgIds.length > 0) {
        await db.insert(organizationMembers).values(
          finalOrgIds.map((orgId) => {
            const scope = membershipScopes[orgId];
            const isResidentJoin = input.role === "resident" && input.joinRtId && !scope;
            return {
              organizationId: orgId,
              userId: user.id,
              role: input.role === "resident" ? "resident" : input.role,
              scopeType: scope?.scopeType || (isResidentJoin ? "rt" : "organization"),
              scopeId: scope?.scopeId || (isResidentJoin ? input.joinRtId : null),
              status: "active"
            };
          })
        ).onConflictDoNothing();
      }
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { id: user.id, name: user.name, email: user.email, role: input.role };
    }),
    login: publicProcedure.input(z2.object({ email: z2.string().email().max(200), password: z2.string().min(1).max(100) })).mutation(async ({ ctx, input }) => {
      const { user, token } = await loginUser(input);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  community: router({
    organizations: protectedProcedure.query(({ ctx }) => getUserOrganizations(ctx.user.id)),
    summary: protectedProcedure.input(organizationIdInput).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      return getOrganizationSummary(input.organizationId);
    }),
    residents: protectedProcedure.input(organizationIdInput.extend({ query: z2.string().trim().max(100).default(""), limit: z2.number().int().min(1).max(100).default(25), offset: z2.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      return searchOrganizationResidents(input.organizationId, input.query, input.limit, input.offset);
    }),
    // --- Join Request: warga mengajukan join ke RT/RW baru ---
    joinRequest: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1).max(80) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const existing = await db.select().from(organizationMembers).where(
        and3(eq5(organizationMembers.organizationId, input.organizationId), eq5(organizationMembers.userId, ctx.user.id))
      ).limit(1);
      if (existing[0]) {
        if (existing[0].status === "active") throw new TRPCError5({ code: "CONFLICT", message: "Anda sudah menjadi anggota wilayah ini" });
        if (existing[0].status === "pending") throw new TRPCError5({ code: "CONFLICT", message: "Pengajuan join sedang diproses" });
      }
      const org = await db.select().from(organizations).where(eq5(organizations.id, input.organizationId)).limit(1);
      if (!org[0]) throw new TRPCError5({ code: "NOT_FOUND", message: "Wilayah tidak ditemukan" });
      await db.insert(organizationMembers).values({
        organizationId: input.organizationId,
        userId: ctx.user.id,
        role: "resident",
        scopeType: "organization",
        scopeId: null,
        status: "pending"
      }).onConflictDoUpdate({
        target: [organizationMembers.organizationId, organizationMembers.userId],
        set: { status: "pending", updatedAt: /* @__PURE__ */ new Date() }
      });
      return { success: true };
    }),
    // --- List pending join requests (admin only, scoped) ---
    pendingJoinRequests: protectedProcedure.input(organizationIdInput).query(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.JOIN_REQUEST_VIEW);
      const db = await getDb();
      if (!db) return [];
      return db.select({
        membership: organizationMembers,
        user: users
      }).from(organizationMembers).innerJoin(users, eq5(users.id, organizationMembers.userId)).where(and3(
        eq5(organizationMembers.organizationId, input.organizationId),
        eq5(organizationMembers.status, "pending")
      )).orderBy(desc2(organizationMembers.createdAt));
    }),
    // --- Approve / Reject join request ---
    reviewJoinRequest: protectedProcedure.input(z2.object({
      organizationId: z2.string().min(1).max(80),
      userId: z2.number().int().positive(),
      action: z2.enum(["approve", "reject"])
    })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.JOIN_REQUEST_APPROVE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const target = await db.select().from(organizationMembers).where(
        and3(
          eq5(organizationMembers.organizationId, input.organizationId),
          eq5(organizationMembers.userId, input.userId),
          eq5(organizationMembers.status, "pending")
        )
      ).limit(1);
      if (!target[0]) throw new TRPCError5({ code: "NOT_FOUND", message: "Pengajuan join tidak ditemukan" });
      if (input.action === "approve") {
        await db.update(organizationMembers).set({ status: "active", updatedAt: /* @__PURE__ */ new Date() }).where(
          and3(eq5(organizationMembers.organizationId, input.organizationId), eq5(organizationMembers.userId, input.userId))
        );
      } else {
        await db.delete(organizationMembers).where(
          and3(eq5(organizationMembers.organizationId, input.organizationId), eq5(organizationMembers.userId, input.userId))
        );
      }
      await logAudit({ actorId: ctx.user.id, action: `join_request_${input.action}`, resource: "organization_member", metadata: { organizationId: input.organizationId, targetUserId: input.userId } });
      return { success: true };
    })
  }),
  households: router({
    list: protectedProcedure.input(organizationIdInput.extend({ limit: z2.number().int().min(1).max(100).default(25), offset: z2.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      return db.select({ household: households, rt: rtUnits, rw: rwUnits }).from(households).innerJoin(rtUnits, eq5(rtUnits.id, households.rtId)).innerJoin(rwUnits, eq5(rwUnits.id, rtUnits.rwId)).where(eq5(rwUnits.organizationId, input.organizationId)).orderBy(asc(households.createdAt)).limit(input.limit).offset(input.offset);
    }),
    listMembers: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1), householdId: z2.string().min(1) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      return db.select({ member: householdMembers, user: users }).from(householdMembers).innerJoin(users, eq5(users.id, householdMembers.userId)).innerJoin(households, eq5(households.id, householdMembers.householdId)).innerJoin(rtUnits, eq5(rtUnits.id, households.rtId)).innerJoin(rwUnits, eq5(rwUnits.id, rtUnits.rwId)).where(and3(eq5(householdMembers.householdId, input.householdId), eq5(rwUnits.organizationId, input.organizationId))).orderBy(desc2(householdMembers.isHead), asc(users.name));
    }),
    addMember: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1), householdId: z2.string().min(1), userId: z2.number().int().positive(), relationship: z2.string().trim().min(2).max(60), isHead: z2.boolean().default(false) })).mutation(async ({ ctx, input }) => {
      const membership = await requirePermission(ctx.user.id, input.organizationId, P.HOUSEHOLD_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const household = await db.select({ household: households }).from(households).innerJoin(rtUnits, eq5(rtUnits.id, households.rtId)).innerJoin(rwUnits, eq5(rwUnits.id, rtUnits.rwId)).where(and3(eq5(households.id, input.householdId), eq5(rwUnits.organizationId, input.organizationId))).limit(1);
      if (!household[0]) throw new TRPCError5({ code: "NOT_FOUND", message: "Rumah tangga tidak ditemukan" });
      const householdRtId = household[0].household.rtId;
      if (!await isHouseholdInScope(membership, householdRtId)) {
        throw new TRPCError5({ code: "FORBIDDEN", message: "Rumah tangga berada di luar wilayah Anda" });
      }
      const [member] = await db.insert(householdMembers).values({ householdId: input.householdId, userId: input.userId, relationship: input.relationship, isHead: input.isHead }).onConflictDoUpdate({ target: [householdMembers.householdId, householdMembers.userId], set: { relationship: input.relationship, isHead: input.isHead, updatedAt: /* @__PURE__ */ new Date() } }).returning();
      if (member) await logAudit({ actorId: ctx.user.id, action: "household_member_upsert", resource: "household", resourceId: input.householdId, metadata: { organizationId: input.organizationId, userId: input.userId } });
      return member;
    })
  }),
  billing: router({
    listTypes: protectedProcedure.input(organizationIdInput).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      return db.select().from(billingTypes).where(eq5(billingTypes.organizationId, input.organizationId)).orderBy(asc(billingTypes.name));
    }),
    listPeriods: protectedProcedure.input(organizationIdInput).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      return db.select({ period: billingPeriods, type: billingTypes }).from(billingPeriods).innerJoin(billingTypes, eq5(billingTypes.id, billingPeriods.billingTypeId)).where(eq5(billingTypes.organizationId, input.organizationId)).orderBy(desc2(billingPeriods.periodKey)).limit(30);
    }),
    createType: protectedProcedure.input(organizationIdInput.extend({ name: z2.string().trim().min(2).max(80), code: z2.string().trim().min(2).max(30).regex(/^[a-z0-9-]+$/), description: z2.string().trim().max(240).optional(), unit: z2.string().trim().min(2).max(40).default("household"), defaultAmount: z2.number().int().min(0).max(1e8), scopeType: z2.enum(["organization", "rw", "rt"]).default("organization"), scopeId: z2.string().nullable().default(null) })).mutation(async ({ ctx, input }) => {
      const membership = await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [created] = await db.insert(billingTypes).values({ organizationId: input.organizationId, name: input.name, code: input.code, description: input.description, unit: input.unit, defaultAmount: input.defaultAmount, scopeType: input.scopeType, scopeId: input.scopeId }).returning();
      if (created) await logAudit({ actorId: ctx.user.id, action: "create", resource: "billing_type", resourceId: created.id, metadata: { organizationId: input.organizationId } });
      return created;
    }),
    createPeriod: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1), billingTypeId: z2.string().min(1), periodKey: z2.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), dueAt: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const typeResult = await db.select().from(billingTypes).where(and3(eq5(billingTypes.id, input.billingTypeId), eq5(billingTypes.organizationId, input.organizationId), eq5(billingTypes.active, true))).limit(1);
      if (!typeResult[0]) throw new TRPCError5({ code: "NOT_FOUND", message: "Kategori aktif tidak ditemukan" });
      const [period] = await db.insert(billingPeriods).values({ billingTypeId: input.billingTypeId, periodKey: input.periodKey, dueAt: new Date(input.dueAt), status: "draft" }).onConflictDoUpdate({ target: [billingPeriods.billingTypeId, billingPeriods.periodKey], set: { dueAt: new Date(input.dueAt), updatedAt: /* @__PURE__ */ new Date() } }).returning();
      return period;
    }),
    issueInvoices: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1), billingPeriodId: z2.string().min(1) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const periodResult = await db.select({ period: billingPeriods, type: billingTypes }).from(billingPeriods).innerJoin(billingTypes, eq5(billingTypes.id, billingPeriods.billingTypeId)).where(and3(eq5(billingPeriods.id, input.billingPeriodId), eq5(billingTypes.organizationId, input.organizationId))).limit(1);
      const period = periodResult[0];
      if (!period) throw new TRPCError5({ code: "NOT_FOUND", message: "Periode tagihan tidak ditemukan" });
      const homes = await db.select({ id: households.id }).from(households).innerJoin(rtUnits, eq5(rtUnits.id, households.rtId)).innerJoin(rwUnits, eq5(rwUnits.id, rtUnits.rwId)).where(and3(eq5(rwUnits.organizationId, input.organizationId), eq5(households.status, "active")));
      if (homes.length) await db.insert(invoices).values(homes.map((home) => ({ householdId: home.id, billingPeriodId: input.billingPeriodId, amount: period.type.defaultAmount, status: "unpaid" }))).onConflictDoNothing({ target: [invoices.householdId, invoices.billingPeriodId] });
      await db.update(billingPeriods).set({ status: "issued", updatedAt: /* @__PURE__ */ new Date() }).where(eq5(billingPeriods.id, input.billingPeriodId));
      await logAudit({ actorId: ctx.user.id, action: "issue_invoices", resource: "billing_period", resourceId: input.billingPeriodId, metadata: { organizationId: input.organizationId, count: homes.length } });
      return { success: true, count: homes.length };
    }),
    updateType: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1), typeId: z2.string().min(1), name: z2.string().trim().min(2).max(80), description: z2.string().trim().max(240).optional(), defaultAmount: z2.number().int().min(0).max(1e8), active: z2.boolean() })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.update(billingTypes).set({ name: input.name, description: input.description, defaultAmount: input.defaultAmount, active: input.active, updatedAt: /* @__PURE__ */ new Date() }).where(and3(eq5(billingTypes.id, input.typeId), eq5(billingTypes.organizationId, input.organizationId))).returning();
      if (!result[0]) throw new TRPCError5({ code: "NOT_FOUND", message: "Kategori tagihan tidak ditemukan" });
      await logAudit({ actorId: ctx.user.id, action: "update", resource: "billing_type", resourceId: input.typeId, metadata: { organizationId: input.organizationId } });
      return result[0];
    }),
    deleteType: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1), typeId: z2.string().min(1) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.update(billingTypes).set({ active: false, updatedAt: /* @__PURE__ */ new Date() }).where(and3(eq5(billingTypes.id, input.typeId), eq5(billingTypes.organizationId, input.organizationId))).returning({ id: billingTypes.id });
      if (!result[0]) throw new TRPCError5({ code: "NOT_FOUND", message: "Kategori tagihan tidak ditemukan" });
      await logAudit({ actorId: ctx.user.id, action: "archive", resource: "billing_type", resourceId: input.typeId, metadata: { organizationId: input.organizationId } });
      return { success: true };
    }),
    myInvoices: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ id: invoices.id, amount: invoices.amount, status: invoices.status, periodKey: billingPeriods.periodKey, typeName: billingTypes.name }).from(invoices).innerJoin(billingPeriods, eq5(billingPeriods.id, invoices.billingPeriodId)).innerJoin(billingTypes, eq5(billingTypes.id, billingPeriods.billingTypeId)).innerJoin(households, eq5(households.id, invoices.householdId)).innerJoin(householdMembers, eq5(householdMembers.householdId, households.id)).where(and3(eq5(householdMembers.userId, ctx.user.id), eq5(invoices.status, "unpaid"))).orderBy(desc2(invoices.createdAt));
    }),
    myPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ history: paymentStatusHistory, invoice: invoices, payment: payments, typeName: billingTypes.name, periodKey: billingPeriods.periodKey }).from(paymentStatusHistory).innerJoin(payments, eq5(payments.id, paymentStatusHistory.paymentId)).innerJoin(invoices, eq5(invoices.id, paymentStatusHistory.invoiceId)).innerJoin(billingPeriods, eq5(billingPeriods.id, invoices.billingPeriodId)).innerJoin(billingTypes, eq5(billingTypes.id, billingPeriods.billingTypeId)).innerJoin(householdMembers, eq5(householdMembers.householdId, invoices.householdId)).where(eq5(householdMembers.userId, ctx.user.id)).orderBy(desc2(paymentStatusHistory.createdAt)).limit(20);
    }),
    submitPayment: protectedProcedure.input(z2.object({ invoiceId: z2.string().min(1), amount: z2.number().int().positive(), filename: z2.string().trim().min(1).max(180), mimeType: z2.enum(["image/jpeg", "image/png", "application/pdf"]), contentBase64: z2.string().min(10).max(7e6), note: z2.string().trim().max(240).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const ownership = await db.select({ invoice: invoices, household: households, rt: rtUnits, rw: rwUnits, membership: householdMembers }).from(invoices).innerJoin(households, eq5(households.id, invoices.householdId)).innerJoin(rtUnits, eq5(rtUnits.id, households.rtId)).innerJoin(rwUnits, eq5(rwUnits.id, rtUnits.rwId)).innerJoin(householdMembers, eq5(householdMembers.householdId, households.id)).where(and3(eq5(invoices.id, input.invoiceId), eq5(householdMembers.userId, ctx.user.id))).limit(1);
      const target = ownership[0];
      if (!target) throw new TRPCError5({ code: "FORBIDDEN", message: "Tagihan tidak tersedia untuk akun ini" });
      if (input.amount !== target.invoice.amount) throw new TRPCError5({ code: "BAD_REQUEST", message: "Nominal pembayaran tidak sesuai tagihan" });
      const buffer = Buffer.from(input.contentBase64, "base64");
      if (buffer.byteLength > 5 * 1024 * 1024) throw new TRPCError5({ code: "BAD_REQUEST", message: "Ukuran bukti pembayaran maksimal 5 MB" });
      const path = `payments/${target.rw.organizationId}/${ctx.user.id}/${target.invoice.id}-${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      await uploadPrivateObject({ bucket: "smart-warga-private", path, body: buffer, contentType: input.mimeType });
      const [file] = await db.insert(files).values({ ownerId: ctx.user.id, bucket: "smart-warga-private", path, filename: input.filename, mimeType: input.mimeType, size: buffer.byteLength, visibility: "private" }).returning();
      const [payment] = await db.insert(payments).values({ invoiceId: target.invoice.id, submittedBy: ctx.user.id, amount: input.amount, proofFileId: file?.id, note: input.note, status: "submitted" }).returning();
      await db.update(invoices).set({ status: "submitted", updatedAt: /* @__PURE__ */ new Date() }).where(eq5(invoices.id, target.invoice.id));
      if (payment) {
        await db.insert(paymentStatusHistory).values({ paymentId: payment.id, invoiceId: target.invoice.id, status: "submitted", actorId: ctx.user.id, note: input.note });
        await logAudit({ actorId: ctx.user.id, action: "submit", resource: "payment", resourceId: payment.id, metadata: { invoiceId: target.invoice.id } });
      }
      return payment;
    }),
    listPending: protectedProcedure.input(organizationIdInput).query(async ({ ctx, input }) => {
      const membership = await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) return [];
      let pending = await db.select({ payment: payments, invoice: invoices, household: households, rt: rtUnits, rw: rwUnits }).from(payments).innerJoin(invoices, eq5(invoices.id, payments.invoiceId)).innerJoin(households, eq5(households.id, invoices.householdId)).innerJoin(rtUnits, eq5(rtUnits.id, households.rtId)).innerJoin(rwUnits, eq5(rwUnits.id, rtUnits.rwId)).where(and3(eq5(payments.status, "submitted"), eq5(rwUnits.organizationId, input.organizationId))).orderBy(desc2(payments.createdAt));
      if (membership.scopeType === "rw" && membership.scopeId) {
        pending = pending.filter((item) => item.rw.id === membership.scopeId);
      } else if (membership.scopeType === "rt" && membership.scopeId) {
        pending = pending.filter((item) => item.rt.id === membership.scopeId);
      }
      return Promise.all(pending.map(async (item) => ({ ...item, history: await db.select().from(paymentStatusHistory).where(eq5(paymentStatusHistory.paymentId, item.payment.id)).orderBy(desc2(paymentStatusHistory.createdAt)) })));
    }),
    verifyPayment: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1), paymentId: z2.string().min(1), status: z2.enum(["verified", "rejected"]), note: z2.string().trim().max(240).optional() })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const paymentResult = await db.select({ payment: payments, invoice: invoices, household: households, rt: rtUnits, rw: rwUnits }).from(payments).innerJoin(invoices, eq5(invoices.id, payments.invoiceId)).innerJoin(households, eq5(households.id, invoices.householdId)).innerJoin(rtUnits, eq5(rtUnits.id, households.rtId)).innerJoin(rwUnits, eq5(rwUnits.id, rtUnits.rwId)).where(and3(eq5(payments.id, input.paymentId), eq5(rwUnits.organizationId, input.organizationId))).limit(1);
      const target = paymentResult[0];
      if (!target) throw new TRPCError5({ code: "NOT_FOUND", message: "Pembayaran tidak ditemukan" });
      await db.update(payments).set({ status: input.status, verifiedBy: ctx.user.id, verifiedAt: /* @__PURE__ */ new Date(), note: input.note, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(payments.id, input.paymentId));
      await db.update(invoices).set({ status: input.status === "verified" ? "verified" : "rejected", updatedAt: /* @__PURE__ */ new Date() }).where(eq5(invoices.id, target.invoice.id));
      await db.insert(paymentStatusHistory).values({ paymentId: input.paymentId, invoiceId: target.invoice.id, status: input.status, actorId: ctx.user.id, note: input.note });
      await logAudit({ actorId: ctx.user.id, action: input.status, resource: "payment", resourceId: input.paymentId, metadata: { organizationId: input.organizationId, invoiceId: target.invoice.id, note: input.note } });
      return { success: true, status: input.status };
    })
  }),
  events: router({
    list: protectedProcedure.input(organizationIdInput.extend({ limit: z2.number().int().min(1).max(100).default(20), offset: z2.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      const access = await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      const canManage = ["platform_admin", "organization_admin", "rw_admin", "rt_admin"].includes(access.role);
      const scope = canManage ? eq5(events.organizationId, input.organizationId) : and3(eq5(events.organizationId, input.organizationId), eq5(events.status, "published"));
      return db.select({ event: events, attendeeCount: count2(eventRegistrations.userId) }).from(events).leftJoin(eventRegistrations, and3(eq5(eventRegistrations.eventId, events.id), eq5(eventRegistrations.status, "registered"))).where(scope).groupBy(events.id).orderBy(asc(events.startsAt)).limit(input.limit).offset(input.offset);
    }),
    create: protectedProcedure.input(organizationIdInput.extend({ title: z2.string().trim().min(3).max(120), slug: z2.string().trim().min(3).max(140).regex(/^[a-z0-9-]+$/), description: z2.string().trim().max(1e3).optional(), location: z2.string().trim().max(180).optional(), startsAt: z2.number().int().positive(), endsAt: z2.number().int().positive().optional(), capacity: z2.number().int().positive().max(1e4).optional(), scopeType: z2.enum(["organization", "rw", "rt"]).default("organization"), scopeId: z2.string().nullable().default(null) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.EVENT_CREATE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [created] = await db.insert(events).values({ organizationId: input.organizationId, title: input.title, slug: input.slug, description: input.description, location: input.location, startsAt: new Date(input.startsAt), endsAt: input.endsAt ? new Date(input.endsAt) : void 0, capacity: input.capacity, status: "draft", scopeType: input.scopeType, scopeId: input.scopeId }).returning();
      if (created) await logAudit({ actorId: ctx.user.id, action: "create", resource: "event", resourceId: created.id, metadata: { organizationId: input.organizationId } });
      return created;
    }),
    listReminderRules: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1), eventId: z2.string().min(1) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      return db.select().from(eventReminderRules).where(and3(eq5(eventReminderRules.organizationId, input.organizationId), eq5(eventReminderRules.eventId, input.eventId))).orderBy(asc(eventReminderRules.minutesBefore));
    }),
    addReminderRule: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1), eventId: z2.string().min(1), templateName: z2.string().trim().min(3).max(80).regex(/^[a-z0-9_]+$/i), minutesBefore: z2.number().int().min(60).max(43200) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.EVENT_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const eventResult = await db.select().from(events).where(and3(eq5(events.id, input.eventId), eq5(events.organizationId, input.organizationId))).limit(1);
      if (!eventResult[0]) throw new TRPCError5({ code: "NOT_FOUND", message: "Acara tidak ditemukan" });
      const [rule] = await db.insert(eventReminderRules).values({ organizationId: input.organizationId, eventId: input.eventId, templateName: input.templateName, minutesBefore: input.minutesBefore, enabled: true }).returning();
      if (rule) {
        const reminderAt = new Date(eventResult[0].startsAt.getTime() - input.minutesBefore * 6e4);
        const cron = `0 ${reminderAt.getUTCMinutes()} ${reminderAt.getUTCHours()} ${reminderAt.getUTCDate()} ${reminderAt.getUTCMonth() + 1} *`;
        const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
        try {
          const job = await createHeartbeatJob({ name: `event-reminder-${rule.id}`, cron, path: "/api/scheduled/event-reminder", description: `Reminder acara ${eventResult[0].title}` }, sessionToken);
          await db.update(eventReminderRules).set({ scheduleCronTaskUid: job.taskUid, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(eventReminderRules.id, rule.id));
        } catch (error) {
          await db.update(eventReminderRules).set({ enabled: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(eventReminderRules.id, rule.id));
          throw error;
        }
        await logAudit({ actorId: ctx.user.id, action: "create", resource: "event_reminder_rule", resourceId: rule.id, metadata: { organizationId: input.organizationId, eventId: input.eventId } });
      }
      return rule;
    }),
    publish: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1), eventId: z2.string().min(1) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.EVENT_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [published] = await db.update(events).set({ status: "published", updatedAt: /* @__PURE__ */ new Date() }).where(and3(eq5(events.id, input.eventId), eq5(events.organizationId, input.organizationId))).returning();
      if (!published) throw new TRPCError5({ code: "NOT_FOUND", message: "Acara tidak ditemukan" });
      await logAudit({ actorId: ctx.user.id, action: "publish", resource: "event", resourceId: published.id, metadata: { organizationId: input.organizationId } });
      return published;
    }),
    register: protectedProcedure.input(z2.object({ eventId: z2.string().min(1) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const eventResult = await db.select().from(events).where(eq5(events.id, input.eventId)).limit(1);
      const event = eventResult[0];
      if (!event || event.status !== "published") throw new TRPCError5({ code: "NOT_FOUND", message: "Acara tidak ditemukan" });
      await requireOrganizationAccess(ctx.user.id, event.organizationId);
      if (event.capacity !== null && event.capacity !== void 0) {
        const [registered] = await db.select({ value: count2(eventRegistrations.userId) }).from(eventRegistrations).where(and3(eq5(eventRegistrations.eventId, event.id), eq5(eventRegistrations.status, "registered")));
        if (Number(registered?.value ?? 0) >= event.capacity) {
          const [existing] = await db.select({ status: eventRegistrations.status }).from(eventRegistrations).where(and3(eq5(eventRegistrations.eventId, event.id), eq5(eventRegistrations.userId, ctx.user.id))).limit(1);
          if (existing?.status !== "registered") throw new TRPCError5({ code: "CONFLICT", message: "Kapasitas acara sudah penuh" });
        }
      }
      const [registration] = await db.insert(eventRegistrations).values({ eventId: event.id, userId: ctx.user.id, status: "registered" }).onConflictDoUpdate({ target: [eventRegistrations.eventId, eventRegistrations.userId], set: { status: "registered", updatedAt: /* @__PURE__ */ new Date() } }).returning();
      return registration;
    })
  }),
  announcements: router({
    list: protectedProcedure.input(organizationIdInput.extend({ limit: z2.number().int().min(1).max(100).default(20), offset: z2.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      const access = await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      const canManage = ["platform_admin", "organization_admin", "rw_admin", "rt_admin"].includes(access.role);
      return db.select().from(announcements).where(canManage ? eq5(announcements.organizationId, input.organizationId) : and3(eq5(announcements.organizationId, input.organizationId), eq5(announcements.status, "published"))).orderBy(desc2(announcements.publishedAt)).limit(input.limit).offset(input.offset);
    }),
    create: protectedProcedure.input(organizationIdInput.extend({ title: z2.string().trim().min(3).max(160), slug: z2.string().trim().min(3).max(180).regex(/^[a-z0-9-]+$/), body: z2.string().trim().min(3).max(5e3), scopeType: z2.enum(["organization", "rw", "rt"]).default("organization"), scopeId: z2.string().nullable().default(null) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.ANNOUNCEMENT_CREATE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const existing = await db.select({ id: announcements.id }).from(announcements).where(and3(eq5(announcements.organizationId, input.organizationId), eq5(announcements.slug, input.slug))).limit(1);
      if (existing[0]) throw new TRPCError5({ code: "CONFLICT", message: "Slug pengumuman sudah digunakan. Ubah judul agar lebih spesifik." });
      const [created] = await db.insert(announcements).values({ organizationId: input.organizationId, title: input.title, slug: input.slug, body: input.body, createdBy: ctx.user.id, status: "draft", scopeType: input.scopeType, scopeId: input.scopeId }).returning();
      if (created) await logAudit({ actorId: ctx.user.id, action: "create", resource: "announcement", resourceId: created.id, metadata: { organizationId: input.organizationId } });
      return created;
    }),
    publish: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1), announcementId: z2.string().min(1) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.ANNOUNCEMENT_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [published] = await db.update(announcements).set({ status: "published", publishedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(and3(eq5(announcements.id, input.announcementId), eq5(announcements.organizationId, input.organizationId))).returning();
      if (!published) throw new TRPCError5({ code: "NOT_FOUND", message: "Pengumuman tidak ditemukan" });
      await logAudit({ actorId: ctx.user.id, action: "publish", resource: "announcement", resourceId: published.id, metadata: { organizationId: input.organizationId } });
      return published;
    })
  }),
  campaigns: router({
    create: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1), title: z2.string().trim().min(3).max(160), slug: z2.string().trim().min(3).max(180).regex(/^[a-z0-9-]+$/), description: z2.string().trim().max(5e3).optional(), targetAmount: z2.number().int().min(0).max(1e11), startsAt: z2.number().int().positive().optional(), endsAt: z2.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_CREATE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const existing = await db.select({ id: campaigns.id }).from(campaigns).where(and3(eq5(campaigns.organizationId, input.organizationId), eq5(campaigns.slug, input.slug))).limit(1);
      if (existing[0]) throw new TRPCError5({ code: "CONFLICT", message: "Slug kampanye sudah digunakan. Ubah judul agar lebih spesifik." });
      const [created] = await db.insert(campaigns).values({ organizationId: input.organizationId, title: input.title, slug: input.slug, description: input.description, targetAmount: input.targetAmount, startsAt: input.startsAt ? new Date(input.startsAt) : void 0, endsAt: input.endsAt ? new Date(input.endsAt) : void 0, status: "draft" }).returning();
      if (created) await logAudit({ actorId: ctx.user.id, action: "create", resource: "campaign", resourceId: created.id, metadata: { organizationId: input.organizationId } });
      return created;
    }),
    publish: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1), campaignId: z2.string().min(1) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [published] = await db.update(campaigns).set({ status: "published", updatedAt: /* @__PURE__ */ new Date() }).where(and3(eq5(campaigns.id, input.campaignId), eq5(campaigns.organizationId, input.organizationId))).returning();
      if (!published) throw new TRPCError5({ code: "NOT_FOUND", message: "Kampanye tidak ditemukan" });
      await logAudit({ actorId: ctx.user.id, action: "publish", resource: "campaign", resourceId: published.id, metadata: { organizationId: input.organizationId } });
      return published;
    }),
    list: protectedProcedure.input(organizationIdInput.extend({ limit: z2.number().int().min(1).max(100).default(20), offset: z2.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(campaigns).where(and3(eq5(campaigns.organizationId, input.organizationId), eq5(campaigns.status, "published"))).orderBy(asc(campaigns.startsAt));
      return Promise.all(rows.map(async (campaign) => {
        const [donationTotals, usageTotals] = await Promise.all([
          db.select({ raisedAmount: sum(donations.amount), verifiedDonors: count2(donations.id) }).from(donations).where(and3(eq5(donations.campaignId, campaign.id), eq5(donations.status, "verified"))),
          db.select({ usedAmount: sum(fundUsages.amount) }).from(fundUsages).where(eq5(fundUsages.campaignId, campaign.id))
        ]);
        return { ...campaign, raisedAmount: Number(donationTotals[0]?.raisedAmount ?? 0), verifiedDonors: Number(donationTotals[0]?.verifiedDonors ?? 0), usedAmount: Number(usageTotals[0]?.usedAmount ?? 0) };
      }));
    }),
    drafts: protectedProcedure.input(organizationIdInput).query(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_MANAGE);
      const db = await getDb();
      if (!db) return [];
      return db.select().from(campaigns).where(and3(eq5(campaigns.organizationId, input.organizationId), eq5(campaigns.status, "draft"))).orderBy(asc(campaigns.createdAt));
    }),
    pending: protectedProcedure.input(organizationIdInput.extend({ campaignId: z2.string().min(1).max(80).optional() })).query(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_MANAGE);
      const db = await getDb();
      if (!db) return [];
      const conditions = [eq5(campaigns.organizationId, input.organizationId), eq5(donations.status, "submitted")];
      if (input.campaignId) conditions.push(eq5(campaigns.id, input.campaignId));
      return db.select({ donation: donations, campaign: campaigns, donor: users }).from(donations).innerJoin(campaigns, eq5(campaigns.id, donations.campaignId)).innerJoin(users, eq5(users.id, donations.donorId)).where(and3(...conditions)).orderBy(asc(donations.createdAt));
    }),
    contribute: protectedProcedure.input(z2.object({ campaignId: z2.string().min(1), amount: z2.number().int().positive().max(1e9), visibility: z2.enum(["named", "anonymous"]).default("named") })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.select().from(campaigns).where(eq5(campaigns.id, input.campaignId)).limit(1);
      const campaign = result[0];
      if (!campaign) throw new TRPCError5({ code: "NOT_FOUND", message: "Kampanye tidak ditemukan" });
      await requireOrganizationAccess(ctx.user.id, campaign.organizationId);
      const [donation] = await db.insert(donations).values({ campaignId: campaign.id, donorId: ctx.user.id, amount: input.amount, visibility: input.visibility, status: "submitted" }).returning();
      if (donation) await logAudit({ actorId: ctx.user.id, action: "contribute", resource: "donation", resourceId: donation.id, metadata: { campaignId: campaign.id } });
      return donation;
    }),
    verifyDonation: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1), donationId: z2.string().min(1), status: z2.enum(["verified", "rejected"]) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.select({ donation: donations, campaign: campaigns }).from(donations).innerJoin(campaigns, eq5(campaigns.id, donations.campaignId)).where(and3(eq5(donations.id, input.donationId), eq5(campaigns.organizationId, input.organizationId))).limit(1);
      if (!result[0]) throw new TRPCError5({ code: "NOT_FOUND", message: "Kontribusi tidak ditemukan" });
      await db.update(donations).set({ status: input.status, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(donations.id, input.donationId));
      await logAudit({ actorId: ctx.user.id, action: input.status, resource: "donation", resourceId: input.donationId, metadata: { organizationId: input.organizationId } });
      return { success: true, status: input.status };
    }),
    addFundUsage: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1), campaignId: z2.string().min(1), amount: z2.number().int().positive().max(1e9), description: z2.string().trim().min(3).max(500), evidenceFileId: z2.string().min(1).optional() })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_MANAGE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const campaignResult = await db.select().from(campaigns).where(and3(eq5(campaigns.id, input.campaignId), eq5(campaigns.organizationId, input.organizationId))).limit(1);
      if (!campaignResult[0]) throw new TRPCError5({ code: "NOT_FOUND", message: "Kampanye tidak ditemukan" });
      if (input.evidenceFileId) {
        const evidence = await db.select().from(files).where(and3(eq5(files.id, input.evidenceFileId), eq5(files.visibility, "private"))).limit(1);
        if (!evidence[0]) throw new TRPCError5({ code: "NOT_FOUND", message: "Bukti penggunaan dana tidak ditemukan" });
      }
      const [usage] = await db.insert(fundUsages).values({ campaignId: input.campaignId, amount: input.amount, description: input.description, evidenceFileId: input.evidenceFileId }).returning();
      if (usage) await logAudit({ actorId: ctx.user.id, action: "fund_usage", resource: "campaign", resourceId: input.campaignId, metadata: { amount: input.amount } });
      return usage;
    })
  }),
  forum: router({
    listTopics: protectedProcedure.input(organizationIdInput.extend({ limit: z2.number().int().min(1).max(50).default(20), offset: z2.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      return db.select().from(forumTopics).where(and3(eq5(forumTopics.organizationId, input.organizationId), eq5(forumTopics.status, "open"))).orderBy(asc(forumTopics.createdAt)).limit(input.limit).offset(input.offset);
    }),
    createTopic: protectedProcedure.input(organizationIdInput.extend({ title: z2.string().trim().min(3).max(160), scopeType: z2.enum(["general", "event", "announcement", "campaign"]).default("general"), scopeId: z2.string().max(80).optional() })).mutation(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [topic] = await db.insert(forumTopics).values({ organizationId: input.organizationId, title: input.title, scopeType: input.scopeType, scopeId: input.scopeId, status: "open" }).returning();
      if (topic) {
        await logAudit({ actorId: ctx.user.id, action: "create", resource: "forum_topic", resourceId: topic.id, metadata: { organizationId: input.organizationId, scopeType: input.scopeType } });
        emitForumEvent(input.organizationId, "forum:new-topic", { topicId: topic.id, title: topic.title });
      }
      return topic;
    }),
    reportPost: protectedProcedure.input(z2.object({ postId: z2.string().min(1), reason: z2.string().trim().min(3).max(300) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.select({ post: forumPosts, topic: forumTopics }).from(forumPosts).innerJoin(forumTopics, eq5(forumTopics.id, forumPosts.topicId)).where(eq5(forumPosts.id, input.postId)).limit(1);
      if (!result[0]) throw new TRPCError5({ code: "NOT_FOUND", message: "Posting tidak ditemukan" });
      await requireOrganizationAccess(ctx.user.id, result[0].topic.organizationId);
      const [report] = await db.insert(forumReports).values({ postId: input.postId, reporterId: ctx.user.id, reason: input.reason, status: "open" }).returning();
      return report;
    }),
    reviewReport: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1), reportId: z2.string().min(1), status: z2.enum(["reviewed", "dismissed", "actioned"]) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.FORUM_MODERATE);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.select({ report: forumReports, topic: forumTopics }).from(forumReports).innerJoin(forumPosts, eq5(forumPosts.id, forumReports.postId)).innerJoin(forumTopics, eq5(forumTopics.id, forumPosts.topicId)).where(and3(eq5(forumReports.id, input.reportId), eq5(forumTopics.organizationId, input.organizationId))).limit(1);
      if (!result[0]) throw new TRPCError5({ code: "NOT_FOUND", message: "Laporan tidak ditemukan" });
      await db.update(forumReports).set({ status: input.status, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(forumReports.id, input.reportId));
      if (input.status === "actioned") await db.update(forumPosts).set({ status: "hidden", updatedAt: /* @__PURE__ */ new Date() }).where(eq5(forumPosts.id, result[0].report.postId));
      await logAudit({ actorId: ctx.user.id, action: `forum_report_${input.status}`, resource: "forum_report", resourceId: input.reportId, metadata: { organizationId: input.organizationId } });
      return { success: true, status: input.status };
    }),
    listPosts: protectedProcedure.input(z2.object({ topicId: z2.string().min(1) })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const topicResult = await db.select().from(forumTopics).where(eq5(forumTopics.id, input.topicId)).limit(1);
      const topic = topicResult[0];
      if (!topic) return [];
      await requireOrganizationAccess(ctx.user.id, topic.organizationId);
      return db.select({ post: forumPosts, author: users }).from(forumPosts).innerJoin(users, eq5(users.id, forumPosts.authorId)).where(and3(eq5(forumPosts.topicId, input.topicId), eq5(forumPosts.status, "published"))).orderBy(asc(forumPosts.createdAt));
    }),
    findOrCreateTopic: protectedProcedure.input(organizationIdInput.extend({ scopeType: z2.enum(["general", "event", "announcement", "campaign"]), scopeId: z2.string().min(1) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const existing = await db.select().from(forumTopics).where(and3(eq5(forumTopics.organizationId, input.organizationId), eq5(forumTopics.scopeType, input.scopeType), eq5(forumTopics.scopeId, input.scopeId), eq5(forumTopics.status, "open"))).limit(1);
      if (existing[0]) return existing[0];
      const [topic] = await db.insert(forumTopics).values({ organizationId: input.organizationId, title: `Diskusi ${input.scopeType}`, scopeType: input.scopeType, scopeId: input.scopeId, status: "open" }).returning();
      return topic;
    }),
    createPost: protectedProcedure.input(z2.object({ topicId: z2.string().min(1), body: z2.string().trim().min(1).max(3e3) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const topicResult = await db.select().from(forumTopics).where(and3(eq5(forumTopics.id, input.topicId), eq5(forumTopics.status, "open"))).limit(1);
      const topic = topicResult[0];
      if (!topic) throw new TRPCError5({ code: "NOT_FOUND", message: "Topik forum tidak ditemukan" });
      await requireOrganizationAccess(ctx.user.id, topic.organizationId);
      const [post] = await db.insert(forumPosts).values({ topicId: topic.id, authorId: ctx.user.id, body: input.body, status: "published" }).returning();
      if (post) emitForumEvent(topic.organizationId, "forum:new-post", { topicId: topic.id, postId: post.id, authorId: ctx.user.id, body: post.body });
      return post;
    })
  }),
  files: router({
    uploadCampaignEvidence: protectedProcedure.input(z2.object({ organizationId: z2.string().min(1), filename: z2.string().trim().min(1).max(180), mimeType: z2.enum(["image/jpeg", "image/png", "application/pdf"]), contentBase64: z2.string().min(10).max(7e6) })).mutation(async ({ ctx, input }) => {
      await requireOrganizationRole(ctx.user.id, input.organizationId, ["admin", "treasurer"]);
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const buffer = Buffer.from(input.contentBase64, "base64");
      if (buffer.byteLength > 5 * 1024 * 1024) throw new TRPCError5({ code: "BAD_REQUEST", message: "Ukuran bukti maksimal 5 MB" });
      const path = `campaign-evidence/${input.organizationId}/${ctx.user.id}/${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      await uploadPrivateObject({ bucket: "smart-warga-private", path, body: buffer, contentType: input.mimeType });
      const [file] = await db.insert(files).values({ ownerId: ctx.user.id, bucket: "smart-warga-private", path, filename: input.filename, mimeType: input.mimeType, size: buffer.byteLength, visibility: "private" }).returning();
      return file;
    }),
    listOwned: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ id: files.id, filename: files.filename, mimeType: files.mimeType, size: files.size, createdAt: files.createdAt }).from(files).where(and3(eq5(files.ownerId, ctx.user.id), eq5(files.visibility, "private"))).orderBy(desc2(files.createdAt)).limit(50);
    }),
    signedUrl: protectedProcedure.input(z2.object({ fileId: z2.string().min(1) })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.select({ file: files, organizationId: rwUnits.organizationId }).from(files).leftJoin(payments, eq5(payments.proofFileId, files.id)).leftJoin(invoices, eq5(invoices.id, payments.invoiceId)).leftJoin(households, eq5(households.id, invoices.householdId)).leftJoin(rtUnits, eq5(rtUnits.id, households.rtId)).leftJoin(rwUnits, eq5(rwUnits.id, rtUnits.rwId)).where(eq5(files.id, input.fileId)).limit(1);
      const target = result[0];
      const file = target?.file;
      if (!file || file.visibility !== "private") throw new TRPCError5({ code: "FORBIDDEN", message: "File tidak dapat diakses" });
      let organizationId = target.organizationId;
      if (!organizationId) {
        const campaignEvidence = await db.select({ organizationId: campaigns.organizationId }).from(fundUsages).innerJoin(campaigns, eq5(campaigns.id, fundUsages.campaignId)).where(eq5(fundUsages.evidenceFileId, input.fileId)).limit(1);
        organizationId = campaignEvidence[0]?.organizationId ?? null;
      }
      if (file.ownerId !== ctx.user.id) {
        if (!organizationId) throw new TRPCError5({ code: "FORBIDDEN", message: "File tidak terkait wilayah yang dapat diverifikasi" });
        await requirePermission(ctx.user.id, organizationId, P.BILLING_VIEW_OWN);
      }
      return { url: await createPrivateSignedUrl({ bucket: file.bucket, path: file.path, expiresInSeconds: 300 }), expiresInSeconds: 300 };
    })
  })
});

// server/_core/context.ts
import { eq as eq6 } from "drizzle-orm";
async function createContext(opts) {
  let user = null;
  try {
    const authHeader = opts.req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const session = await verifySessionToken(token);
      if (session) {
        const db = await getDb();
        if (db) {
          const result = await db.select().from(users).where(eq6(users.id, session.userId)).limit(1);
          user = result[0] ?? null;
        }
      }
    }
    if (!user) {
      user = await authenticateFromCookie(opts.req.headers.cookie);
    }
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// api-src/index.ts
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
app.get("/robots.txt", (_req, res) => {
  const origin = process.env.CANONICAL_ORIGIN ?? "";
  res.type("text/plain").send(`User-agent: *
Allow: /
Disallow: /app
Disallow: /api
Sitemap: ${origin}/sitemap.xml
`);
});
app.get("/sitemap.xml", (_req, res) => {
  const origin = process.env.CANONICAL_ORIGIN ?? "";
  const urls = ["/", "/wilayah/kampung-melati"].map((path) => `${origin}${path}`);
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${url}</loc></url>`).join("")}</urlset>`);
});
app.get("/api/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && typeof challenge === "string") {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});
app.get("/debug/env", (req, res) => {
  res.json({
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL ? "\u2713 (set)" : "\u2717 (NOT SET)",
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN ? "\u2713 (set)" : "\u2717 (NOT SET)",
    hasDatabaseUrl: !!process.env.TURSO_DATABASE_URL,
    hasAuthToken: !!process.env.TURSO_AUTH_TOKEN
  });
});
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
var index_default = app;
export {
  index_default as default
};
