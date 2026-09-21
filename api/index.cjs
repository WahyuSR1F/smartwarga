"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc3) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc3 = __getOwnPropDesc(from, key)) || desc3.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api-src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_express = __toESM(require("express"), 1);
var import_express2 = require("@trpc/server/adapters/express");

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
var import_cookie = require("cookie");
var import_drizzle_orm5 = require("drizzle-orm");
var import_zod2 = require("zod");

// drizzle/schema.ts
var import_sqlite_core = require("drizzle-orm/sqlite-core");
var id = (name) => (0, import_sqlite_core.text)(name).primaryKey().$defaultFn(() => crypto.randomUUID());
var timestamps = {
  createdAt: (0, import_sqlite_core.integer)("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: (0, import_sqlite_core.integer)("updatedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
};
var users = (0, import_sqlite_core.sqliteTable)("users", {
  id: (0, import_sqlite_core.integer)("id").primaryKey({ autoIncrement: true }),
  openId: (0, import_sqlite_core.text)("openId").notNull().unique(),
  passwordHash: (0, import_sqlite_core.text)("passwordHash"),
  name: (0, import_sqlite_core.text)("name"),
  email: (0, import_sqlite_core.text)("email"),
  phone: (0, import_sqlite_core.text)("phone"),
  loginMethod: (0, import_sqlite_core.text)("loginMethod"),
  role: (0, import_sqlite_core.text)("role", { enum: ["platform_admin", "organization_admin", "rw_admin", "rt_admin", "treasurer", "resident"] }).notNull().default("resident"),
  status: (0, import_sqlite_core.text)("status", { enum: ["active", "pending", "archived"] }).notNull().default("active"),
  lastSignedIn: (0, import_sqlite_core.integer)("lastSignedIn", { mode: "timestamp_ms" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date()),
  ...timestamps
}, (table) => ({ roleIdx: (0, import_sqlite_core.index)("users_role_idx").on(table.role), phoneIdx: (0, import_sqlite_core.index)("users_phone_idx").on(table.phone) }));
var organizations = (0, import_sqlite_core.sqliteTable)("organizations", {
  id: id("id"),
  name: (0, import_sqlite_core.text)("name").notNull(),
  slug: (0, import_sqlite_core.text)("slug").notNull(),
  description: (0, import_sqlite_core.text)("description"),
  timezone: (0, import_sqlite_core.text)("timezone").notNull().default("Asia/Jakarta"),
  status: (0, import_sqlite_core.text)("status", { enum: ["active", "archived"] }).notNull().default("active"),
  ...timestamps
}, (table) => ({ slugIdx: (0, import_sqlite_core.uniqueIndex)("organizations_slug_idx").on(table.slug) }));
var organizationMembers = (0, import_sqlite_core.sqliteTable)("organization_members", {
  organizationId: (0, import_sqlite_core.text)("organizationId").notNull().references(() => organizations.id),
  userId: (0, import_sqlite_core.integer)("userId").notNull().references(() => users.id),
  role: (0, import_sqlite_core.text)("role", { enum: ["platform_admin", "organization_admin", "rw_admin", "rt_admin", "treasurer", "resident"] }).notNull().default("resident"),
  scopeType: (0, import_sqlite_core.text)("scopeType", { enum: ["organization", "rw", "rt"] }).default("organization"),
  scopeId: (0, import_sqlite_core.text)("scopeId"),
  status: (0, import_sqlite_core.text)("status", { enum: ["active", "invited", "pending", "removed"] }).notNull().default("active"),
  ...timestamps
}, (table) => ({ pk: (0, import_sqlite_core.uniqueIndex)("organization_members_pk").on(table.organizationId, table.userId), userIdx: (0, import_sqlite_core.index)("organization_members_user_idx").on(table.userId), orgIdx: (0, import_sqlite_core.index)("organization_members_org_idx").on(table.organizationId) }));
var rwUnits = (0, import_sqlite_core.sqliteTable)("rw_units", {
  id: id("id"),
  organizationId: (0, import_sqlite_core.text)("organizationId").notNull().references(() => organizations.id),
  name: (0, import_sqlite_core.text)("name").notNull(),
  code: (0, import_sqlite_core.text)("code").notNull(),
  ...timestamps
}, (table) => ({ orgIdx: (0, import_sqlite_core.index)("rw_units_org_idx").on(table.organizationId) }));
var rtUnits = (0, import_sqlite_core.sqliteTable)("rt_units", {
  id: id("id"),
  rwId: (0, import_sqlite_core.text)("rwId").notNull().references(() => rwUnits.id),
  name: (0, import_sqlite_core.text)("name").notNull(),
  code: (0, import_sqlite_core.text)("code").notNull(),
  ...timestamps
}, (table) => ({ rwIdx: (0, import_sqlite_core.index)("rt_units_rw_idx").on(table.rwId) }));
var households = (0, import_sqlite_core.sqliteTable)("households", {
  id: id("id"),
  rtId: (0, import_sqlite_core.text)("rtId").notNull().references(() => rtUnits.id),
  address: (0, import_sqlite_core.text)("address").notNull(),
  block: (0, import_sqlite_core.text)("block"),
  houseNumber: (0, import_sqlite_core.text)("houseNumber"),
  status: (0, import_sqlite_core.text)("status", { enum: ["active", "moved", "archived"] }).notNull().default("active"),
  ...timestamps
}, (table) => ({ rtIdx: (0, import_sqlite_core.index)("households_rt_idx").on(table.rtId), addressIdx: (0, import_sqlite_core.index)("households_address_idx").on(table.address) }));
var householdMembers = (0, import_sqlite_core.sqliteTable)("household_members", {
  householdId: (0, import_sqlite_core.text)("householdId").notNull().references(() => households.id),
  userId: (0, import_sqlite_core.integer)("userId").notNull().references(() => users.id),
  relationship: (0, import_sqlite_core.text)("relationship"),
  isHead: (0, import_sqlite_core.integer)("isHead", { mode: "boolean" }).notNull().default(false),
  ...timestamps
}, (table) => ({ pk: (0, import_sqlite_core.uniqueIndex)("household_members_pk").on(table.householdId, table.userId), userIdx: (0, import_sqlite_core.index)("household_members_user_idx").on(table.userId) }));
var billingTypes = (0, import_sqlite_core.sqliteTable)("billing_types", {
  id: id("id"),
  organizationId: (0, import_sqlite_core.text)("organizationId").notNull().references(() => organizations.id),
  scopeType: (0, import_sqlite_core.text)("scopeType", { enum: ["organization", "rw", "rt"] }).default("organization"),
  scopeId: (0, import_sqlite_core.text)("scopeId"),
  name: (0, import_sqlite_core.text)("name").notNull(),
  code: (0, import_sqlite_core.text)("code").notNull(),
  description: (0, import_sqlite_core.text)("description"),
  unit: (0, import_sqlite_core.text)("unit").notNull().default("household"),
  defaultAmount: (0, import_sqlite_core.integer)("defaultAmount").notNull().default(0),
  active: (0, import_sqlite_core.integer)("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps
}, (table) => ({ orgIdx: (0, import_sqlite_core.index)("billing_types_org_idx").on(table.organizationId) }));
var billingPeriods = (0, import_sqlite_core.sqliteTable)("billing_periods", {
  id: id("id"),
  billingTypeId: (0, import_sqlite_core.text)("billingTypeId").notNull().references(() => billingTypes.id),
  periodKey: (0, import_sqlite_core.text)("periodKey").notNull(),
  dueAt: (0, import_sqlite_core.integer)("dueAt", { mode: "timestamp_ms" }).notNull(),
  status: (0, import_sqlite_core.text)("status", { enum: ["draft", "issued", "closed"] }).notNull().default("draft"),
  ...timestamps
}, (table) => ({ periodIdx: (0, import_sqlite_core.uniqueIndex)("billing_periods_type_period_idx").on(table.billingTypeId, table.periodKey) }));
var invoices = (0, import_sqlite_core.sqliteTable)("invoices", {
  id: id("id"),
  householdId: (0, import_sqlite_core.text)("householdId").notNull().references(() => households.id),
  billingPeriodId: (0, import_sqlite_core.text)("billingPeriodId").notNull().references(() => billingPeriods.id),
  amount: (0, import_sqlite_core.integer)("amount").notNull(),
  status: (0, import_sqlite_core.text)("status", { enum: ["unpaid", "submitted", "verified", "rejected", "overdue"] }).notNull().default("unpaid"),
  ...timestamps
}, (table) => ({ householdIdx: (0, import_sqlite_core.index)("invoices_household_idx").on(table.householdId), periodIdx: (0, import_sqlite_core.index)("invoices_period_idx").on(table.billingPeriodId), householdPeriodUnique: (0, import_sqlite_core.uniqueIndex)("invoices_household_period_unique").on(table.householdId, table.billingPeriodId), statusIdx: (0, import_sqlite_core.index)("invoices_status_idx").on(table.status) }));
var payments = (0, import_sqlite_core.sqliteTable)("payments", {
  id: id("id"),
  invoiceId: (0, import_sqlite_core.text)("invoiceId").notNull().references(() => invoices.id),
  submittedBy: (0, import_sqlite_core.integer)("submittedBy").notNull().references(() => users.id),
  amount: (0, import_sqlite_core.integer)("amount").notNull(),
  proofFileId: (0, import_sqlite_core.text)("proofFileId"),
  note: (0, import_sqlite_core.text)("note"),
  status: (0, import_sqlite_core.text)("status", { enum: ["submitted", "verified", "rejected"] }).notNull().default("submitted"),
  verifiedBy: (0, import_sqlite_core.integer)("verifiedBy").references(() => users.id),
  verifiedAt: (0, import_sqlite_core.integer)("verifiedAt", { mode: "timestamp_ms" }),
  ...timestamps
}, (table) => ({ invoiceIdx: (0, import_sqlite_core.index)("payments_invoice_idx").on(table.invoiceId), statusIdx: (0, import_sqlite_core.index)("payments_status_idx").on(table.status) }));
var paymentStatusHistory = (0, import_sqlite_core.sqliteTable)("payment_status_history", {
  id: id("id"),
  paymentId: (0, import_sqlite_core.text)("paymentId").notNull().references(() => payments.id),
  invoiceId: (0, import_sqlite_core.text)("invoiceId").notNull().references(() => invoices.id),
  status: (0, import_sqlite_core.text)("status", { enum: ["submitted", "verified", "rejected"] }).notNull(),
  actorId: (0, import_sqlite_core.integer)("actorId").references(() => users.id),
  note: (0, import_sqlite_core.text)("note"),
  ...timestamps
}, (table) => ({ paymentIdx: (0, import_sqlite_core.index)("payment_status_history_payment_idx").on(table.paymentId), invoiceIdx: (0, import_sqlite_core.index)("payment_status_history_invoice_idx").on(table.invoiceId), createdIdx: (0, import_sqlite_core.index)("payment_status_history_created_idx").on(table.createdAt) }));
var events = (0, import_sqlite_core.sqliteTable)("events", {
  id: id("id"),
  organizationId: (0, import_sqlite_core.text)("organizationId").notNull().references(() => organizations.id),
  rtId: (0, import_sqlite_core.text)("rtId").references(() => rtUnits.id),
  scopeType: (0, import_sqlite_core.text)("scopeType", { enum: ["organization", "rw", "rt"] }).default("organization"),
  scopeId: (0, import_sqlite_core.text)("scopeId"),
  title: (0, import_sqlite_core.text)("title").notNull(),
  slug: (0, import_sqlite_core.text)("slug").notNull(),
  description: (0, import_sqlite_core.text)("description"),
  location: (0, import_sqlite_core.text)("location"),
  startsAt: (0, import_sqlite_core.integer)("startsAt", { mode: "timestamp_ms" }).notNull(),
  endsAt: (0, import_sqlite_core.integer)("endsAt", { mode: "timestamp_ms" }),
  capacity: (0, import_sqlite_core.integer)("capacity"),
  status: (0, import_sqlite_core.text)("status", { enum: ["draft", "published", "cancelled", "completed"] }).notNull().default("draft"),
  ...timestamps
}, (table) => ({ orgIdx: (0, import_sqlite_core.index)("events_org_idx").on(table.organizationId), startsIdx: (0, import_sqlite_core.index)("events_starts_idx").on(table.startsAt), slugIdx: (0, import_sqlite_core.uniqueIndex)("events_slug_idx").on(table.organizationId, table.slug) }));
var announcements = (0, import_sqlite_core.sqliteTable)("announcements", {
  id: id("id"),
  organizationId: (0, import_sqlite_core.text)("organizationId").notNull().references(() => organizations.id),
  scopeType: (0, import_sqlite_core.text)("scopeType", { enum: ["organization", "rw", "rt"] }).default("organization"),
  scopeId: (0, import_sqlite_core.text)("scopeId"),
  title: (0, import_sqlite_core.text)("title").notNull(),
  slug: (0, import_sqlite_core.text)("slug").notNull(),
  body: (0, import_sqlite_core.text)("body").notNull(),
  status: (0, import_sqlite_core.text)("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
  publishedAt: (0, import_sqlite_core.integer)("publishedAt", { mode: "timestamp_ms" }),
  createdBy: (0, import_sqlite_core.integer)("createdBy").notNull().references(() => users.id),
  ...timestamps
}, (table) => ({ orgIdx: (0, import_sqlite_core.index)("announcements_org_idx").on(table.organizationId), slugIdx: (0, import_sqlite_core.uniqueIndex)("announcements_slug_idx").on(table.organizationId, table.slug), statusIdx: (0, import_sqlite_core.index)("announcements_status_idx").on(table.status) }));
var eventReminderRules = (0, import_sqlite_core.sqliteTable)("event_reminder_rules", {
  id: id("id"),
  eventId: (0, import_sqlite_core.text)("eventId").notNull().references(() => events.id),
  organizationId: (0, import_sqlite_core.text)("organizationId").notNull().references(() => organizations.id),
  templateName: (0, import_sqlite_core.text)("templateName").notNull(),
  minutesBefore: (0, import_sqlite_core.integer)("minutesBefore").notNull().default(1440),
  enabled: (0, import_sqlite_core.integer)("enabled", { mode: "boolean" }).notNull().default(true),
  scheduleCronTaskUid: (0, import_sqlite_core.text)("scheduleCronTaskUid"),
  ...timestamps
}, (table) => ({ eventIdx: (0, import_sqlite_core.index)("event_reminder_rules_event_idx").on(table.eventId), taskIdx: (0, import_sqlite_core.index)("event_reminder_rules_task_idx").on(table.scheduleCronTaskUid) }));
var eventRegistrations = (0, import_sqlite_core.sqliteTable)("event_registrations", {
  eventId: (0, import_sqlite_core.text)("eventId").notNull().references(() => events.id),
  userId: (0, import_sqlite_core.integer)("userId").notNull().references(() => users.id),
  status: (0, import_sqlite_core.text)("status", { enum: ["registered", "cancelled", "attended"] }).notNull().default("registered"),
  ...timestamps
}, (table) => ({ pk: (0, import_sqlite_core.uniqueIndex)("event_registrations_pk").on(table.eventId, table.userId), userIdx: (0, import_sqlite_core.index)("event_registrations_user_idx").on(table.userId) }));
var campaigns = (0, import_sqlite_core.sqliteTable)("campaigns", {
  id: id("id"),
  organizationId: (0, import_sqlite_core.text)("organizationId").notNull().references(() => organizations.id),
  title: (0, import_sqlite_core.text)("title").notNull(),
  slug: (0, import_sqlite_core.text)("slug").notNull(),
  description: (0, import_sqlite_core.text)("description"),
  targetAmount: (0, import_sqlite_core.integer)("targetAmount").notNull().default(0),
  startsAt: (0, import_sqlite_core.integer)("startsAt", { mode: "timestamp_ms" }),
  endsAt: (0, import_sqlite_core.integer)("endsAt", { mode: "timestamp_ms" }),
  status: (0, import_sqlite_core.text)("status", { enum: ["draft", "published", "closed"] }).notNull().default("draft"),
  ...timestamps
}, (table) => ({ orgIdx: (0, import_sqlite_core.index)("campaigns_org_idx").on(table.organizationId), slugIdx: (0, import_sqlite_core.uniqueIndex)("campaigns_slug_idx").on(table.organizationId, table.slug) }));
var donations = (0, import_sqlite_core.sqliteTable)("donations", {
  id: id("id"),
  campaignId: (0, import_sqlite_core.text)("campaignId").notNull().references(() => campaigns.id),
  donorId: (0, import_sqlite_core.integer)("donorId").references(() => users.id),
  amount: (0, import_sqlite_core.integer)("amount").notNull(),
  visibility: (0, import_sqlite_core.text)("visibility", { enum: ["named", "anonymous"] }).notNull().default("named"),
  proofFileId: (0, import_sqlite_core.text)("proofFileId"),
  status: (0, import_sqlite_core.text)("status", { enum: ["submitted", "verified", "rejected"] }).notNull().default("submitted"),
  ...timestamps
}, (table) => ({ campaignIdx: (0, import_sqlite_core.index)("donations_campaign_idx").on(table.campaignId), statusIdx: (0, import_sqlite_core.index)("donations_status_idx").on(table.status) }));
var forumReports = (0, import_sqlite_core.sqliteTable)("forum_reports", {
  id: id("id"),
  postId: (0, import_sqlite_core.text)("postId").notNull().references(() => forumPosts.id),
  reporterId: (0, import_sqlite_core.integer)("reporterId").notNull().references(() => users.id),
  reason: (0, import_sqlite_core.text)("reason").notNull(),
  status: (0, import_sqlite_core.text)("status", { enum: ["open", "reviewed", "dismissed", "actioned"] }).notNull().default("open"),
  ...timestamps
}, (table) => ({ postIdx: (0, import_sqlite_core.index)("forum_reports_post_idx").on(table.postId), statusIdx: (0, import_sqlite_core.index)("forum_reports_status_idx").on(table.status) }));
var fundUsages = (0, import_sqlite_core.sqliteTable)("fund_usages", {
  id: id("id"),
  campaignId: (0, import_sqlite_core.text)("campaignId").notNull().references(() => campaigns.id),
  amount: (0, import_sqlite_core.integer)("amount").notNull(),
  description: (0, import_sqlite_core.text)("description").notNull(),
  evidenceFileId: (0, import_sqlite_core.text)("evidenceFileId"),
  ...timestamps
}, (table) => ({ campaignIdx: (0, import_sqlite_core.index)("fund_usages_campaign_idx").on(table.campaignId) }));
var forumTopics = (0, import_sqlite_core.sqliteTable)("forum_topics", {
  id: id("id"),
  organizationId: (0, import_sqlite_core.text)("organizationId").notNull().references(() => organizations.id),
  scopeType: (0, import_sqlite_core.text)("scopeType", { enum: ["general", "event", "announcement", "campaign"] }).notNull().default("general"),
  scopeId: (0, import_sqlite_core.text)("scopeId"),
  title: (0, import_sqlite_core.text)("title").notNull(),
  status: (0, import_sqlite_core.text)("status", { enum: ["open", "locked", "archived"] }).notNull().default("open"),
  ...timestamps
}, (table) => ({ orgIdx: (0, import_sqlite_core.index)("forum_topics_org_idx").on(table.organizationId), scopeIdx: (0, import_sqlite_core.index)("forum_topics_scope_idx").on(table.scopeType, table.scopeId) }));
var forumPosts = (0, import_sqlite_core.sqliteTable)("forum_posts", {
  id: id("id"),
  topicId: (0, import_sqlite_core.text)("topicId").notNull().references(() => forumTopics.id),
  authorId: (0, import_sqlite_core.integer)("authorId").notNull().references(() => users.id),
  body: (0, import_sqlite_core.text)("body").notNull(),
  status: (0, import_sqlite_core.text)("status", { enum: ["published", "hidden", "reported"] }).notNull().default("published"),
  ...timestamps
}, (table) => ({ topicIdx: (0, import_sqlite_core.index)("forum_posts_topic_idx").on(table.topicId), authorIdx: (0, import_sqlite_core.index)("forum_posts_author_idx").on(table.authorId) }));
var notifications = (0, import_sqlite_core.sqliteTable)("notifications", {
  id: id("id"),
  recipientId: (0, import_sqlite_core.integer)("recipientId").notNull().references(() => users.id),
  channel: (0, import_sqlite_core.text)("channel", { enum: ["in_app", "web_push", "whatsapp", "email"] }).notNull(),
  template: (0, import_sqlite_core.text)("template").notNull(),
  entityType: (0, import_sqlite_core.text)("entityType"),
  entityId: (0, import_sqlite_core.text)("entityId"),
  scheduledAt: (0, import_sqlite_core.integer)("scheduledAt", { mode: "timestamp_ms" }),
  status: (0, import_sqlite_core.text)("status", { enum: ["queued", "sent", "failed", "cancelled"] }).notNull().default("queued"),
  ...timestamps
}, (table) => ({ recipientIdx: (0, import_sqlite_core.index)("notifications_recipient_idx").on(table.recipientId), scheduleIdx: (0, import_sqlite_core.index)("notifications_schedule_idx").on(table.status, table.scheduledAt) }));
var notificationDeliveries = (0, import_sqlite_core.sqliteTable)("notification_deliveries", {
  id: id("id"),
  notificationId: (0, import_sqlite_core.text)("notificationId").notNull().references(() => notifications.id),
  providerMessageId: (0, import_sqlite_core.text)("providerMessageId"),
  status: (0, import_sqlite_core.text)("status", { enum: ["accepted", "delivered", "read", "failed"] }).notNull(),
  errorCode: (0, import_sqlite_core.text)("errorCode"),
  payload: (0, import_sqlite_core.text)("payload"),
  ...timestamps
}, (table) => ({ notificationIdx: (0, import_sqlite_core.index)("notification_deliveries_notification_idx").on(table.notificationId), providerIdx: (0, import_sqlite_core.index)("notification_deliveries_provider_idx").on(table.providerMessageId) }));
var files = (0, import_sqlite_core.sqliteTable)("files", {
  id: id("id"),
  ownerId: (0, import_sqlite_core.integer)("ownerId").references(() => users.id),
  storageProvider: (0, import_sqlite_core.text)("storageProvider").notNull().default("supabase"),
  bucket: (0, import_sqlite_core.text)("bucket").notNull(),
  path: (0, import_sqlite_core.text)("path").notNull(),
  filename: (0, import_sqlite_core.text)("filename").notNull(),
  mimeType: (0, import_sqlite_core.text)("mimeType").notNull(),
  size: (0, import_sqlite_core.integer)("size").notNull(),
  visibility: (0, import_sqlite_core.text)("visibility", { enum: ["private", "public"] }).notNull().default("private"),
  ...timestamps
}, (table) => ({ pathIdx: (0, import_sqlite_core.uniqueIndex)("files_path_idx").on(table.bucket, table.path), ownerIdx: (0, import_sqlite_core.index)("files_owner_idx").on(table.ownerId) }));
var auditLogs = (0, import_sqlite_core.sqliteTable)("audit_logs", {
  id: id("id"),
  actorId: (0, import_sqlite_core.integer)("actorId").references(() => users.id),
  action: (0, import_sqlite_core.text)("action").notNull(),
  resource: (0, import_sqlite_core.text)("resource").notNull(),
  resourceId: (0, import_sqlite_core.text)("resourceId"),
  metadata: (0, import_sqlite_core.text)("metadata"),
  createdAt: (0, import_sqlite_core.integer)("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
}, (table) => ({ resourceIdx: (0, import_sqlite_core.index)("audit_logs_resource_idx").on(table.resource, table.resourceId), actorIdx: (0, import_sqlite_core.index)("audit_logs_actor_idx").on(table.actorId) }));

// server/db.ts
var import_client = require("@libsql/client");
var import_drizzle_orm = require("drizzle-orm");
var import_libsql = require("drizzle-orm/libsql");
var _db = null;
async function getDb() {
  if (!_db && process.env.TURSO_DATABASE_URL) {
    try {
      const client = (0, import_client.createClient)({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
      });
      _db = (0, import_libsql.drizzle)(client);
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
  return db.select({ organization: organizations, membership: organizationMembers }).from(organizationMembers).innerJoin(organizations, (0, import_drizzle_orm.eq)(organizations.id, organizationMembers.organizationId)).where((0, import_drizzle_orm.eq)(organizationMembers.userId, userId));
}
async function getOrganizationSummary(organizationId) {
  const db = await getDb();
  if (!db) return null;
  const [householdCount, residentCount, invoiceCount, eventCount, campaignCount, topicCount] = await Promise.all([
    db.select({ count: (0, import_drizzle_orm.count)() }).from(households).innerJoin(rtUnits, (0, import_drizzle_orm.eq)(rtUnits.id, households.rtId)).innerJoin(rwUnits, (0, import_drizzle_orm.eq)(rwUnits.id, rtUnits.rwId)).where((0, import_drizzle_orm.eq)(rwUnits.organizationId, organizationId)),
    db.select({ count: (0, import_drizzle_orm.count)() }).from(organizationMembers).where((0, import_drizzle_orm.eq)(organizationMembers.organizationId, organizationId)),
    db.select({ count: (0, import_drizzle_orm.count)() }).from(invoices).innerJoin(billingPeriods, (0, import_drizzle_orm.eq)(billingPeriods.id, invoices.billingPeriodId)).innerJoin(billingTypes, (0, import_drizzle_orm.eq)(billingTypes.id, billingPeriods.billingTypeId)).where((0, import_drizzle_orm.eq)(billingTypes.organizationId, organizationId)),
    db.select({ count: (0, import_drizzle_orm.count)() }).from(events).where((0, import_drizzle_orm.eq)(events.organizationId, organizationId)),
    db.select({ count: (0, import_drizzle_orm.count)() }).from(campaigns).where((0, import_drizzle_orm.eq)(campaigns.organizationId, organizationId)),
    db.select({ count: (0, import_drizzle_orm.count)() }).from(forumTopics).where((0, import_drizzle_orm.eq)(forumTopics.organizationId, organizationId))
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
  return db.selectDistinct({ user: users, membership: organizationMembers }).from(organizationMembers).innerJoin(users, (0, import_drizzle_orm.eq)(users.id, organizationMembers.userId)).leftJoin(householdMembers, (0, import_drizzle_orm.eq)(householdMembers.userId, users.id)).leftJoin(households, (0, import_drizzle_orm.eq)(households.id, householdMembers.householdId)).leftJoin(rtUnits, (0, import_drizzle_orm.eq)(rtUnits.id, households.rtId)).leftJoin(rwUnits, (0, import_drizzle_orm.eq)(rwUnits.id, rtUnits.rwId)).where((0, import_drizzle_orm.and)(
    (0, import_drizzle_orm.eq)(organizationMembers.organizationId, organizationId),
    (0, import_drizzle_orm.or)(
      (0, import_drizzle_orm.like)(users.name, normalized),
      (0, import_drizzle_orm.like)(users.email, normalized),
      (0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(rwUnits.organizationId, organizationId), (0, import_drizzle_orm.like)(households.address, normalized))
    )
  )).orderBy((0, import_drizzle_orm.desc)(users.createdAt)).limit(Math.min(limit, 100)).offset(Math.max(offset, 0));
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
var import_zod = require("zod");

// server/_core/notification.ts
var import_server = require("@trpc/server");
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
    throw new import_server.TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new import_server.TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new import_server.TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new import_server.TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new import_server.TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new import_server.TRPCError({
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
var import_server2 = require("@trpc/server");
var import_superjson = __toESM(require("superjson"), 1);
var t = import_server2.initTRPC.context().create({
  transformer: import_superjson.default
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new import_server2.TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "platform_admin") {
      throw new import_server2.TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    import_zod.z.object({
      timestamp: import_zod.z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    import_zod.z.object({
      title: import_zod.z.string().min(1, "title is required"),
      content: import_zod.z.string().min(1, "content is required")
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
var import_server3 = require("@trpc/server");
var SERVICE = "webdevtoken.v1.WebDevService";
var buildEndpoint = (rpc) => {
  if (!ENV.forgeApiUrl) {
    throw new import_server3.TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Heartbeat service URL is not configured (BUILT_IN_FORGE_API_URL)."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new import_server3.TRPCError({
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
    throw new import_server3.TRPCError({
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
  return new import_server3.TRPCError({
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
    throw new import_server3.TRPCError({
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
var import_server5 = require("@trpc/server");

// server/auth.ts
var import_crypto = require("crypto");
var import_jose = require("jose");
var import_drizzle_orm2 = require("drizzle-orm");
var SESSION_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret-change-me"
);
function hashPassword(password) {
  const salt = (0, import_crypto.randomBytes)(16).toString("hex");
  const hash = (0, import_crypto.scryptSync)(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const testBuf = (0, import_crypto.scryptSync)(password, salt, 64);
  return (0, import_crypto.timingSafeEqual)(hashBuf, testBuf);
}
async function createSessionToken(payload) {
  return new import_jose.SignJWT({
    userId: payload.userId,
    openId: payload.openId,
    name: payload.name
  }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt().setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1e3)).sign(SESSION_SECRET);
}
async function verifySessionToken(token) {
  try {
    const { payload } = await (0, import_jose.jwtVerify)(token, SESSION_SECRET, {
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
  const existing = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.email, input.email)).limit(1);
  if (existing[0]) {
    throw new Error("Email sudah terdaftar");
  }
  const openId = `local_${crypto.randomUUID()}`;
  const passwordHash = hashPassword(input.password);
  const [user] = await db.insert(users).values({
    openId,
    passwordHash,
    name: input.name,
    email: input.email,
    loginMethod: "email",
    role: input.role || "resident",
    status: "active"
  }).returning();
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
  if (!db) throw new Error("Database tidak tersedia");
  const result = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.email, input.email)).limit(1);
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
  await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.eq)(users.id, user.id));
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
  const result = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.id, session.userId)).limit(1);
  return result[0] ?? null;
}

// server/_core/authorize.ts
var import_server4 = require("@trpc/server");
var import_drizzle_orm3 = require("drizzle-orm");

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
    throw new import_server4.TRPCError({
      code: "FORBIDDEN",
      message: "Anda tidak memiliki akses ke wilayah ini"
    });
  }
  return membership;
}
async function requirePermission(userId, organizationId, permission) {
  const membership = await requireMembership(userId, organizationId);
  if (!roleHasPermission(membership.role, permission)) {
    throw new import_server4.TRPCError({
      code: "FORBIDDEN",
      message: "Peran Anda tidak dapat melakukan tindakan ini"
    });
  }
  return membership;
}
async function getRtRwId(rtId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ rwId: rtUnits.rwId }).from(rtUnits).where((0, import_drizzle_orm3.eq)(rtUnits.id, rtId)).limit(1);
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
var import_socket = require("socket.io");
var import_drizzle_orm4 = require("drizzle-orm");
var io = null;
var forumRoom = (organizationId) => `forum:${organizationId}`;
function emitForumEvent(organizationId, event, payload) {
  if (!io) return;
  io.to(forumRoom(organizationId)).emit(event, payload);
}

// server/routers.ts
var organizationIdInput = import_zod2.z.object({ organizationId: import_zod2.z.string().min(1).max(80) });
var scopeInput = import_zod2.z.object({
  scopeType: import_zod2.z.enum(["organization", "rw", "rt"]).default("organization"),
  scopeId: import_zod2.z.string().nullable().default(null)
});
async function requireOrganizationAccess(userId, organizationId) {
  return requireMembership(userId, organizationId);
}
async function requireOrganizationRole(userId, organizationId, allowedRoles) {
  const membership = await requireMembership(userId, organizationId);
  if (!allowedRoles.includes(membership.role)) {
    throw new import_server5.TRPCError({ code: "FORBIDDEN", message: "Peran Anda tidak dapat melakukan tindakan ini" });
  }
  return membership;
}
var appRouter = router({
  system: systemRouter,
  publicContent: router({
    organizationBySlug: publicProcedure.input(import_zod2.z.object({ slug: import_zod2.z.string().trim().min(1).max(120) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select({ organization: organizations }).from(organizations).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(organizations.slug, input.slug), (0, import_drizzle_orm5.eq)(organizations.status, "active"))).limit(1);
      return result[0]?.organization ?? null;
    }),
    eventBySlug: publicProcedure.input(import_zod2.z.object({ organizationSlug: import_zod2.z.string().trim().min(1).max(120), slug: import_zod2.z.string().trim().min(1).max(140) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select({ event: events, organization: organizations }).from(events).innerJoin(organizations, (0, import_drizzle_orm5.eq)(organizations.id, events.organizationId)).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(organizations.slug, input.organizationSlug), (0, import_drizzle_orm5.eq)(events.slug, input.slug), (0, import_drizzle_orm5.eq)(events.status, "published"), (0, import_drizzle_orm5.eq)(organizations.status, "active"))).limit(1);
      return result[0] ?? null;
    }),
    campaignBySlug: publicProcedure.input(import_zod2.z.object({ organizationSlug: import_zod2.z.string().trim().min(1).max(120), slug: import_zod2.z.string().trim().min(1).max(140) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select({ campaign: campaigns, organization: organizations }).from(campaigns).innerJoin(organizations, (0, import_drizzle_orm5.eq)(organizations.id, campaigns.organizationId)).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(organizations.slug, input.organizationSlug), (0, import_drizzle_orm5.eq)(campaigns.slug, input.slug), (0, import_drizzle_orm5.eq)(campaigns.status, "published"), (0, import_drizzle_orm5.eq)(organizations.status, "active"))).limit(1);
      return result[0] ?? null;
    }),
    listOrganizations: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(organizations).where((0, import_drizzle_orm5.eq)(organizations.status, "active")).orderBy((0, import_drizzle_orm5.asc)(organizations.name));
    }),
    listRwUnits: publicProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1).max(80) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rwRows = await db.select().from(rwUnits).where((0, import_drizzle_orm5.eq)(rwUnits.organizationId, input.organizationId)).orderBy((0, import_drizzle_orm5.asc)(rwUnits.code));
      const result = await Promise.all(rwRows.map(async (rw) => {
        const rts = await db.select().from(rtUnits).where((0, import_drizzle_orm5.eq)(rtUnits.rwId, rw.id)).orderBy((0, import_drizzle_orm5.asc)(rtUnits.code));
        return { ...rw, rts };
      }));
      return result;
    })
  }),
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    register: publicProcedure.input(import_zod2.z.object({
      name: import_zod2.z.string().trim().min(2).max(100),
      email: import_zod2.z.string().email().max(200),
      password: import_zod2.z.string().min(6).max(100),
      role: import_zod2.z.enum(["organization_admin", "rw_admin", "rt_admin", "treasurer", "resident"]).default("resident"),
      organizationIds: import_zod2.z.array(import_zod2.z.string().min(1).max(80)).default([]),
      createOrganization: import_zod2.z.object({ name: import_zod2.z.string().min(1).max(120), slug: import_zod2.z.string().min(1).max(120) }).optional(),
      createRw: import_zod2.z.object({ name: import_zod2.z.string().min(1), code: import_zod2.z.string().min(1).max(10), organizationId: import_zod2.z.string().min(1) }).optional(),
      createRt: import_zod2.z.object({ name: import_zod2.z.string().min(1), code: import_zod2.z.string().min(1).max(10), rwId: import_zod2.z.string().min(1) }).optional(),
      // For resident joining a specific RT
      joinRtId: import_zod2.z.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const { user, token } = await registerUser({ name: input.name, email: input.email, password: input.password, role: input.role });
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      let finalOrgIds = [...input.organizationIds];
      const membershipScopes = {};
      if (input.createOrganization) {
        const existingOrg = await db.select().from(organizations).where((0, import_drizzle_orm5.eq)(organizations.slug, input.createOrganization.slug)).limit(1);
        if (existingOrg[0]) throw new import_server5.TRPCError({ code: "CONFLICT", message: "Slug desa/kelurahan sudah digunakan" });
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
        const org = await db.select().from(organizations).where((0, import_drizzle_orm5.eq)(organizations.id, input.createRw.organizationId)).limit(1);
        if (!org[0]) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Desa/kelurahan tidak ditemukan" });
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
        const rw = await db.select().from(rwUnits).where((0, import_drizzle_orm5.eq)(rwUnits.id, input.createRt.rwId)).limit(1);
        if (!rw[0]) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "RW tidak ditemukan" });
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
    login: publicProcedure.input(import_zod2.z.object({ email: import_zod2.z.string().email().max(200), password: import_zod2.z.string().min(1).max(100) })).mutation(async ({ ctx, input }) => {
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
    residents: protectedProcedure.input(organizationIdInput.extend({ query: import_zod2.z.string().trim().max(100).default(""), limit: import_zod2.z.number().int().min(1).max(100).default(25), offset: import_zod2.z.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      return searchOrganizationResidents(input.organizationId, input.query, input.limit, input.offset);
    }),
    // --- Join Request: warga mengajukan join ke RT/RW baru ---
    joinRequest: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1).max(80) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const existing = await db.select().from(organizationMembers).where(
        (0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(organizationMembers.organizationId, input.organizationId), (0, import_drizzle_orm5.eq)(organizationMembers.userId, ctx.user.id))
      ).limit(1);
      if (existing[0]) {
        if (existing[0].status === "active") throw new import_server5.TRPCError({ code: "CONFLICT", message: "Anda sudah menjadi anggota wilayah ini" });
        if (existing[0].status === "pending") throw new import_server5.TRPCError({ code: "CONFLICT", message: "Pengajuan join sedang diproses" });
      }
      const org = await db.select().from(organizations).where((0, import_drizzle_orm5.eq)(organizations.id, input.organizationId)).limit(1);
      if (!org[0]) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Wilayah tidak ditemukan" });
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
      }).from(organizationMembers).innerJoin(users, (0, import_drizzle_orm5.eq)(users.id, organizationMembers.userId)).where((0, import_drizzle_orm5.and)(
        (0, import_drizzle_orm5.eq)(organizationMembers.organizationId, input.organizationId),
        (0, import_drizzle_orm5.eq)(organizationMembers.status, "pending")
      )).orderBy((0, import_drizzle_orm5.desc)(organizationMembers.createdAt));
    }),
    // --- Approve / Reject join request ---
    reviewJoinRequest: protectedProcedure.input(import_zod2.z.object({
      organizationId: import_zod2.z.string().min(1).max(80),
      userId: import_zod2.z.number().int().positive(),
      action: import_zod2.z.enum(["approve", "reject"])
    })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.JOIN_REQUEST_APPROVE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const target = await db.select().from(organizationMembers).where(
        (0, import_drizzle_orm5.and)(
          (0, import_drizzle_orm5.eq)(organizationMembers.organizationId, input.organizationId),
          (0, import_drizzle_orm5.eq)(organizationMembers.userId, input.userId),
          (0, import_drizzle_orm5.eq)(organizationMembers.status, "pending")
        )
      ).limit(1);
      if (!target[0]) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Pengajuan join tidak ditemukan" });
      if (input.action === "approve") {
        await db.update(organizationMembers).set({ status: "active", updatedAt: /* @__PURE__ */ new Date() }).where(
          (0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(organizationMembers.organizationId, input.organizationId), (0, import_drizzle_orm5.eq)(organizationMembers.userId, input.userId))
        );
      } else {
        await db.delete(organizationMembers).where(
          (0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(organizationMembers.organizationId, input.organizationId), (0, import_drizzle_orm5.eq)(organizationMembers.userId, input.userId))
        );
      }
      await logAudit({ actorId: ctx.user.id, action: `join_request_${input.action}`, resource: "organization_member", metadata: { organizationId: input.organizationId, targetUserId: input.userId } });
      return { success: true };
    })
  }),
  households: router({
    list: protectedProcedure.input(organizationIdInput.extend({ limit: import_zod2.z.number().int().min(1).max(100).default(25), offset: import_zod2.z.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      return db.select({ household: households, rt: rtUnits, rw: rwUnits }).from(households).innerJoin(rtUnits, (0, import_drizzle_orm5.eq)(rtUnits.id, households.rtId)).innerJoin(rwUnits, (0, import_drizzle_orm5.eq)(rwUnits.id, rtUnits.rwId)).where((0, import_drizzle_orm5.eq)(rwUnits.organizationId, input.organizationId)).orderBy((0, import_drizzle_orm5.asc)(households.createdAt)).limit(input.limit).offset(input.offset);
    }),
    listMembers: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1), householdId: import_zod2.z.string().min(1) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      return db.select({ member: householdMembers, user: users }).from(householdMembers).innerJoin(users, (0, import_drizzle_orm5.eq)(users.id, householdMembers.userId)).innerJoin(households, (0, import_drizzle_orm5.eq)(households.id, householdMembers.householdId)).innerJoin(rtUnits, (0, import_drizzle_orm5.eq)(rtUnits.id, households.rtId)).innerJoin(rwUnits, (0, import_drizzle_orm5.eq)(rwUnits.id, rtUnits.rwId)).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(householdMembers.householdId, input.householdId), (0, import_drizzle_orm5.eq)(rwUnits.organizationId, input.organizationId))).orderBy((0, import_drizzle_orm5.desc)(householdMembers.isHead), (0, import_drizzle_orm5.asc)(users.name));
    }),
    addMember: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1), householdId: import_zod2.z.string().min(1), userId: import_zod2.z.number().int().positive(), relationship: import_zod2.z.string().trim().min(2).max(60), isHead: import_zod2.z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
      const membership = await requirePermission(ctx.user.id, input.organizationId, P.HOUSEHOLD_MANAGE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const household = await db.select({ household: households }).from(households).innerJoin(rtUnits, (0, import_drizzle_orm5.eq)(rtUnits.id, households.rtId)).innerJoin(rwUnits, (0, import_drizzle_orm5.eq)(rwUnits.id, rtUnits.rwId)).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(households.id, input.householdId), (0, import_drizzle_orm5.eq)(rwUnits.organizationId, input.organizationId))).limit(1);
      if (!household[0]) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Rumah tangga tidak ditemukan" });
      const householdRtId = household[0].household.rtId;
      if (!await isHouseholdInScope(membership, householdRtId)) {
        throw new import_server5.TRPCError({ code: "FORBIDDEN", message: "Rumah tangga berada di luar wilayah Anda" });
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
      return db.select().from(billingTypes).where((0, import_drizzle_orm5.eq)(billingTypes.organizationId, input.organizationId)).orderBy((0, import_drizzle_orm5.asc)(billingTypes.name));
    }),
    listPeriods: protectedProcedure.input(organizationIdInput).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      return db.select({ period: billingPeriods, type: billingTypes }).from(billingPeriods).innerJoin(billingTypes, (0, import_drizzle_orm5.eq)(billingTypes.id, billingPeriods.billingTypeId)).where((0, import_drizzle_orm5.eq)(billingTypes.organizationId, input.organizationId)).orderBy((0, import_drizzle_orm5.desc)(billingPeriods.periodKey)).limit(30);
    }),
    createType: protectedProcedure.input(organizationIdInput.extend({ name: import_zod2.z.string().trim().min(2).max(80), code: import_zod2.z.string().trim().min(2).max(30).regex(/^[a-z0-9-]+$/), description: import_zod2.z.string().trim().max(240).optional(), unit: import_zod2.z.string().trim().min(2).max(40).default("household"), defaultAmount: import_zod2.z.number().int().min(0).max(1e8), scopeType: import_zod2.z.enum(["organization", "rw", "rt"]).default("organization"), scopeId: import_zod2.z.string().nullable().default(null) })).mutation(async ({ ctx, input }) => {
      const membership = await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [created] = await db.insert(billingTypes).values({ organizationId: input.organizationId, name: input.name, code: input.code, description: input.description, unit: input.unit, defaultAmount: input.defaultAmount, scopeType: input.scopeType, scopeId: input.scopeId }).returning();
      if (created) await logAudit({ actorId: ctx.user.id, action: "create", resource: "billing_type", resourceId: created.id, metadata: { organizationId: input.organizationId } });
      return created;
    }),
    createPeriod: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1), billingTypeId: import_zod2.z.string().min(1), periodKey: import_zod2.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), dueAt: import_zod2.z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const typeResult = await db.select().from(billingTypes).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(billingTypes.id, input.billingTypeId), (0, import_drizzle_orm5.eq)(billingTypes.organizationId, input.organizationId), (0, import_drizzle_orm5.eq)(billingTypes.active, true))).limit(1);
      if (!typeResult[0]) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Kategori aktif tidak ditemukan" });
      const [period] = await db.insert(billingPeriods).values({ billingTypeId: input.billingTypeId, periodKey: input.periodKey, dueAt: new Date(input.dueAt), status: "draft" }).onConflictDoUpdate({ target: [billingPeriods.billingTypeId, billingPeriods.periodKey], set: { dueAt: new Date(input.dueAt), updatedAt: /* @__PURE__ */ new Date() } }).returning();
      return period;
    }),
    issueInvoices: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1), billingPeriodId: import_zod2.z.string().min(1) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const periodResult = await db.select({ period: billingPeriods, type: billingTypes }).from(billingPeriods).innerJoin(billingTypes, (0, import_drizzle_orm5.eq)(billingTypes.id, billingPeriods.billingTypeId)).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(billingPeriods.id, input.billingPeriodId), (0, import_drizzle_orm5.eq)(billingTypes.organizationId, input.organizationId))).limit(1);
      const period = periodResult[0];
      if (!period) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Periode tagihan tidak ditemukan" });
      const homes = await db.select({ id: households.id }).from(households).innerJoin(rtUnits, (0, import_drizzle_orm5.eq)(rtUnits.id, households.rtId)).innerJoin(rwUnits, (0, import_drizzle_orm5.eq)(rwUnits.id, rtUnits.rwId)).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(rwUnits.organizationId, input.organizationId), (0, import_drizzle_orm5.eq)(households.status, "active")));
      if (homes.length) await db.insert(invoices).values(homes.map((home) => ({ householdId: home.id, billingPeriodId: input.billingPeriodId, amount: period.type.defaultAmount, status: "unpaid" }))).onConflictDoNothing({ target: [invoices.householdId, invoices.billingPeriodId] });
      await db.update(billingPeriods).set({ status: "issued", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.eq)(billingPeriods.id, input.billingPeriodId));
      await logAudit({ actorId: ctx.user.id, action: "issue_invoices", resource: "billing_period", resourceId: input.billingPeriodId, metadata: { organizationId: input.organizationId, count: homes.length } });
      return { success: true, count: homes.length };
    }),
    updateType: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1), typeId: import_zod2.z.string().min(1), name: import_zod2.z.string().trim().min(2).max(80), description: import_zod2.z.string().trim().max(240).optional(), defaultAmount: import_zod2.z.number().int().min(0).max(1e8), active: import_zod2.z.boolean() })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.update(billingTypes).set({ name: input.name, description: input.description, defaultAmount: input.defaultAmount, active: input.active, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(billingTypes.id, input.typeId), (0, import_drizzle_orm5.eq)(billingTypes.organizationId, input.organizationId))).returning();
      if (!result[0]) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Kategori tagihan tidak ditemukan" });
      await logAudit({ actorId: ctx.user.id, action: "update", resource: "billing_type", resourceId: input.typeId, metadata: { organizationId: input.organizationId } });
      return result[0];
    }),
    deleteType: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1), typeId: import_zod2.z.string().min(1) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.update(billingTypes).set({ active: false, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(billingTypes.id, input.typeId), (0, import_drizzle_orm5.eq)(billingTypes.organizationId, input.organizationId))).returning({ id: billingTypes.id });
      if (!result[0]) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Kategori tagihan tidak ditemukan" });
      await logAudit({ actorId: ctx.user.id, action: "archive", resource: "billing_type", resourceId: input.typeId, metadata: { organizationId: input.organizationId } });
      return { success: true };
    }),
    myInvoices: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ id: invoices.id, amount: invoices.amount, status: invoices.status, periodKey: billingPeriods.periodKey, typeName: billingTypes.name }).from(invoices).innerJoin(billingPeriods, (0, import_drizzle_orm5.eq)(billingPeriods.id, invoices.billingPeriodId)).innerJoin(billingTypes, (0, import_drizzle_orm5.eq)(billingTypes.id, billingPeriods.billingTypeId)).innerJoin(households, (0, import_drizzle_orm5.eq)(households.id, invoices.householdId)).innerJoin(householdMembers, (0, import_drizzle_orm5.eq)(householdMembers.householdId, households.id)).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(householdMembers.userId, ctx.user.id), (0, import_drizzle_orm5.eq)(invoices.status, "unpaid"))).orderBy((0, import_drizzle_orm5.desc)(invoices.createdAt));
    }),
    myPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ history: paymentStatusHistory, invoice: invoices, payment: payments, typeName: billingTypes.name, periodKey: billingPeriods.periodKey }).from(paymentStatusHistory).innerJoin(payments, (0, import_drizzle_orm5.eq)(payments.id, paymentStatusHistory.paymentId)).innerJoin(invoices, (0, import_drizzle_orm5.eq)(invoices.id, paymentStatusHistory.invoiceId)).innerJoin(billingPeriods, (0, import_drizzle_orm5.eq)(billingPeriods.id, invoices.billingPeriodId)).innerJoin(billingTypes, (0, import_drizzle_orm5.eq)(billingTypes.id, billingPeriods.billingTypeId)).innerJoin(householdMembers, (0, import_drizzle_orm5.eq)(householdMembers.householdId, invoices.householdId)).where((0, import_drizzle_orm5.eq)(householdMembers.userId, ctx.user.id)).orderBy((0, import_drizzle_orm5.desc)(paymentStatusHistory.createdAt)).limit(20);
    }),
    submitPayment: protectedProcedure.input(import_zod2.z.object({ invoiceId: import_zod2.z.string().min(1), amount: import_zod2.z.number().int().positive(), filename: import_zod2.z.string().trim().min(1).max(180), mimeType: import_zod2.z.enum(["image/jpeg", "image/png", "application/pdf"]), contentBase64: import_zod2.z.string().min(10).max(7e6), note: import_zod2.z.string().trim().max(240).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const ownership = await db.select({ invoice: invoices, household: households, rt: rtUnits, rw: rwUnits, membership: householdMembers }).from(invoices).innerJoin(households, (0, import_drizzle_orm5.eq)(households.id, invoices.householdId)).innerJoin(rtUnits, (0, import_drizzle_orm5.eq)(rtUnits.id, households.rtId)).innerJoin(rwUnits, (0, import_drizzle_orm5.eq)(rwUnits.id, rtUnits.rwId)).innerJoin(householdMembers, (0, import_drizzle_orm5.eq)(householdMembers.householdId, households.id)).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(invoices.id, input.invoiceId), (0, import_drizzle_orm5.eq)(householdMembers.userId, ctx.user.id))).limit(1);
      const target = ownership[0];
      if (!target) throw new import_server5.TRPCError({ code: "FORBIDDEN", message: "Tagihan tidak tersedia untuk akun ini" });
      if (input.amount !== target.invoice.amount) throw new import_server5.TRPCError({ code: "BAD_REQUEST", message: "Nominal pembayaran tidak sesuai tagihan" });
      const buffer = Buffer.from(input.contentBase64, "base64");
      if (buffer.byteLength > 5 * 1024 * 1024) throw new import_server5.TRPCError({ code: "BAD_REQUEST", message: "Ukuran bukti pembayaran maksimal 5 MB" });
      const path = `payments/${target.rw.organizationId}/${ctx.user.id}/${target.invoice.id}-${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      await uploadPrivateObject({ bucket: "smart-warga-private", path, body: buffer, contentType: input.mimeType });
      const [file] = await db.insert(files).values({ ownerId: ctx.user.id, bucket: "smart-warga-private", path, filename: input.filename, mimeType: input.mimeType, size: buffer.byteLength, visibility: "private" }).returning();
      const [payment] = await db.insert(payments).values({ invoiceId: target.invoice.id, submittedBy: ctx.user.id, amount: input.amount, proofFileId: file?.id, note: input.note, status: "submitted" }).returning();
      await db.update(invoices).set({ status: "submitted", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.eq)(invoices.id, target.invoice.id));
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
      let pending = await db.select({ payment: payments, invoice: invoices, household: households, rt: rtUnits, rw: rwUnits }).from(payments).innerJoin(invoices, (0, import_drizzle_orm5.eq)(invoices.id, payments.invoiceId)).innerJoin(households, (0, import_drizzle_orm5.eq)(households.id, invoices.householdId)).innerJoin(rtUnits, (0, import_drizzle_orm5.eq)(rtUnits.id, households.rtId)).innerJoin(rwUnits, (0, import_drizzle_orm5.eq)(rwUnits.id, rtUnits.rwId)).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(payments.status, "submitted"), (0, import_drizzle_orm5.eq)(rwUnits.organizationId, input.organizationId))).orderBy((0, import_drizzle_orm5.desc)(payments.createdAt));
      if (membership.scopeType === "rw" && membership.scopeId) {
        pending = pending.filter((item) => item.rw.id === membership.scopeId);
      } else if (membership.scopeType === "rt" && membership.scopeId) {
        pending = pending.filter((item) => item.rt.id === membership.scopeId);
      }
      return Promise.all(pending.map(async (item) => ({ ...item, history: await db.select().from(paymentStatusHistory).where((0, import_drizzle_orm5.eq)(paymentStatusHistory.paymentId, item.payment.id)).orderBy((0, import_drizzle_orm5.desc)(paymentStatusHistory.createdAt)) })));
    }),
    verifyPayment: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1), paymentId: import_zod2.z.string().min(1), status: import_zod2.z.enum(["verified", "rejected"]), note: import_zod2.z.string().trim().max(240).optional() })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.BILLING_MANAGE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const paymentResult = await db.select({ payment: payments, invoice: invoices, household: households, rt: rtUnits, rw: rwUnits }).from(payments).innerJoin(invoices, (0, import_drizzle_orm5.eq)(invoices.id, payments.invoiceId)).innerJoin(households, (0, import_drizzle_orm5.eq)(households.id, invoices.householdId)).innerJoin(rtUnits, (0, import_drizzle_orm5.eq)(rtUnits.id, households.rtId)).innerJoin(rwUnits, (0, import_drizzle_orm5.eq)(rwUnits.id, rtUnits.rwId)).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(payments.id, input.paymentId), (0, import_drizzle_orm5.eq)(rwUnits.organizationId, input.organizationId))).limit(1);
      const target = paymentResult[0];
      if (!target) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Pembayaran tidak ditemukan" });
      await db.update(payments).set({ status: input.status, verifiedBy: ctx.user.id, verifiedAt: /* @__PURE__ */ new Date(), note: input.note, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.eq)(payments.id, input.paymentId));
      await db.update(invoices).set({ status: input.status === "verified" ? "verified" : "rejected", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.eq)(invoices.id, target.invoice.id));
      await db.insert(paymentStatusHistory).values({ paymentId: input.paymentId, invoiceId: target.invoice.id, status: input.status, actorId: ctx.user.id, note: input.note });
      await logAudit({ actorId: ctx.user.id, action: input.status, resource: "payment", resourceId: input.paymentId, metadata: { organizationId: input.organizationId, invoiceId: target.invoice.id, note: input.note } });
      return { success: true, status: input.status };
    })
  }),
  events: router({
    list: protectedProcedure.input(organizationIdInput.extend({ limit: import_zod2.z.number().int().min(1).max(100).default(20), offset: import_zod2.z.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      const access = await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      const canManage = ["platform_admin", "organization_admin", "rw_admin", "rt_admin"].includes(access.role);
      const scope = canManage ? (0, import_drizzle_orm5.eq)(events.organizationId, input.organizationId) : (0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(events.organizationId, input.organizationId), (0, import_drizzle_orm5.eq)(events.status, "published"));
      return db.select({ event: events, attendeeCount: (0, import_drizzle_orm5.count)(eventRegistrations.userId) }).from(events).leftJoin(eventRegistrations, (0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(eventRegistrations.eventId, events.id), (0, import_drizzle_orm5.eq)(eventRegistrations.status, "registered"))).where(scope).groupBy(events.id).orderBy((0, import_drizzle_orm5.asc)(events.startsAt)).limit(input.limit).offset(input.offset);
    }),
    create: protectedProcedure.input(organizationIdInput.extend({ title: import_zod2.z.string().trim().min(3).max(120), slug: import_zod2.z.string().trim().min(3).max(140).regex(/^[a-z0-9-]+$/), description: import_zod2.z.string().trim().max(1e3).optional(), location: import_zod2.z.string().trim().max(180).optional(), startsAt: import_zod2.z.number().int().positive(), endsAt: import_zod2.z.number().int().positive().optional(), capacity: import_zod2.z.number().int().positive().max(1e4).optional(), scopeType: import_zod2.z.enum(["organization", "rw", "rt"]).default("organization"), scopeId: import_zod2.z.string().nullable().default(null) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.EVENT_CREATE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [created] = await db.insert(events).values({ organizationId: input.organizationId, title: input.title, slug: input.slug, description: input.description, location: input.location, startsAt: new Date(input.startsAt), endsAt: input.endsAt ? new Date(input.endsAt) : void 0, capacity: input.capacity, status: "draft", scopeType: input.scopeType, scopeId: input.scopeId }).returning();
      if (created) await logAudit({ actorId: ctx.user.id, action: "create", resource: "event", resourceId: created.id, metadata: { organizationId: input.organizationId } });
      return created;
    }),
    listReminderRules: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1), eventId: import_zod2.z.string().min(1) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      return db.select().from(eventReminderRules).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(eventReminderRules.organizationId, input.organizationId), (0, import_drizzle_orm5.eq)(eventReminderRules.eventId, input.eventId))).orderBy((0, import_drizzle_orm5.asc)(eventReminderRules.minutesBefore));
    }),
    addReminderRule: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1), eventId: import_zod2.z.string().min(1), templateName: import_zod2.z.string().trim().min(3).max(80).regex(/^[a-z0-9_]+$/i), minutesBefore: import_zod2.z.number().int().min(60).max(43200) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.EVENT_MANAGE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const eventResult = await db.select().from(events).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(events.id, input.eventId), (0, import_drizzle_orm5.eq)(events.organizationId, input.organizationId))).limit(1);
      if (!eventResult[0]) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Acara tidak ditemukan" });
      const [rule] = await db.insert(eventReminderRules).values({ organizationId: input.organizationId, eventId: input.eventId, templateName: input.templateName, minutesBefore: input.minutesBefore, enabled: true }).returning();
      if (rule) {
        const reminderAt = new Date(eventResult[0].startsAt.getTime() - input.minutesBefore * 6e4);
        const cron = `0 ${reminderAt.getUTCMinutes()} ${reminderAt.getUTCHours()} ${reminderAt.getUTCDate()} ${reminderAt.getUTCMonth() + 1} *`;
        const sessionToken = (0, import_cookie.parse)(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
        try {
          const job = await createHeartbeatJob({ name: `event-reminder-${rule.id}`, cron, path: "/api/scheduled/event-reminder", description: `Reminder acara ${eventResult[0].title}` }, sessionToken);
          await db.update(eventReminderRules).set({ scheduleCronTaskUid: job.taskUid, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.eq)(eventReminderRules.id, rule.id));
        } catch (error) {
          await db.update(eventReminderRules).set({ enabled: false, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.eq)(eventReminderRules.id, rule.id));
          throw error;
        }
        await logAudit({ actorId: ctx.user.id, action: "create", resource: "event_reminder_rule", resourceId: rule.id, metadata: { organizationId: input.organizationId, eventId: input.eventId } });
      }
      return rule;
    }),
    publish: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1), eventId: import_zod2.z.string().min(1) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.EVENT_MANAGE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [published] = await db.update(events).set({ status: "published", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(events.id, input.eventId), (0, import_drizzle_orm5.eq)(events.organizationId, input.organizationId))).returning();
      if (!published) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Acara tidak ditemukan" });
      await logAudit({ actorId: ctx.user.id, action: "publish", resource: "event", resourceId: published.id, metadata: { organizationId: input.organizationId } });
      return published;
    }),
    register: protectedProcedure.input(import_zod2.z.object({ eventId: import_zod2.z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const eventResult = await db.select().from(events).where((0, import_drizzle_orm5.eq)(events.id, input.eventId)).limit(1);
      const event = eventResult[0];
      if (!event || event.status !== "published") throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Acara tidak ditemukan" });
      await requireOrganizationAccess(ctx.user.id, event.organizationId);
      if (event.capacity !== null && event.capacity !== void 0) {
        const [registered] = await db.select({ value: (0, import_drizzle_orm5.count)(eventRegistrations.userId) }).from(eventRegistrations).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(eventRegistrations.eventId, event.id), (0, import_drizzle_orm5.eq)(eventRegistrations.status, "registered")));
        if (Number(registered?.value ?? 0) >= event.capacity) {
          const [existing] = await db.select({ status: eventRegistrations.status }).from(eventRegistrations).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(eventRegistrations.eventId, event.id), (0, import_drizzle_orm5.eq)(eventRegistrations.userId, ctx.user.id))).limit(1);
          if (existing?.status !== "registered") throw new import_server5.TRPCError({ code: "CONFLICT", message: "Kapasitas acara sudah penuh" });
        }
      }
      const [registration] = await db.insert(eventRegistrations).values({ eventId: event.id, userId: ctx.user.id, status: "registered" }).onConflictDoUpdate({ target: [eventRegistrations.eventId, eventRegistrations.userId], set: { status: "registered", updatedAt: /* @__PURE__ */ new Date() } }).returning();
      return registration;
    })
  }),
  announcements: router({
    list: protectedProcedure.input(organizationIdInput.extend({ limit: import_zod2.z.number().int().min(1).max(100).default(20), offset: import_zod2.z.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      const access = await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      const canManage = ["platform_admin", "organization_admin", "rw_admin", "rt_admin"].includes(access.role);
      return db.select().from(announcements).where(canManage ? (0, import_drizzle_orm5.eq)(announcements.organizationId, input.organizationId) : (0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(announcements.organizationId, input.organizationId), (0, import_drizzle_orm5.eq)(announcements.status, "published"))).orderBy((0, import_drizzle_orm5.desc)(announcements.publishedAt)).limit(input.limit).offset(input.offset);
    }),
    create: protectedProcedure.input(organizationIdInput.extend({ title: import_zod2.z.string().trim().min(3).max(160), slug: import_zod2.z.string().trim().min(3).max(180).regex(/^[a-z0-9-]+$/), body: import_zod2.z.string().trim().min(3).max(5e3), scopeType: import_zod2.z.enum(["organization", "rw", "rt"]).default("organization"), scopeId: import_zod2.z.string().nullable().default(null) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.ANNOUNCEMENT_CREATE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const existing = await db.select({ id: announcements.id }).from(announcements).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(announcements.organizationId, input.organizationId), (0, import_drizzle_orm5.eq)(announcements.slug, input.slug))).limit(1);
      if (existing[0]) throw new import_server5.TRPCError({ code: "CONFLICT", message: "Slug pengumuman sudah digunakan. Ubah judul agar lebih spesifik." });
      const [created] = await db.insert(announcements).values({ organizationId: input.organizationId, title: input.title, slug: input.slug, body: input.body, createdBy: ctx.user.id, status: "draft", scopeType: input.scopeType, scopeId: input.scopeId }).returning();
      if (created) await logAudit({ actorId: ctx.user.id, action: "create", resource: "announcement", resourceId: created.id, metadata: { organizationId: input.organizationId } });
      return created;
    }),
    publish: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1), announcementId: import_zod2.z.string().min(1) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.ANNOUNCEMENT_MANAGE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [published] = await db.update(announcements).set({ status: "published", publishedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(announcements.id, input.announcementId), (0, import_drizzle_orm5.eq)(announcements.organizationId, input.organizationId))).returning();
      if (!published) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Pengumuman tidak ditemukan" });
      await logAudit({ actorId: ctx.user.id, action: "publish", resource: "announcement", resourceId: published.id, metadata: { organizationId: input.organizationId } });
      return published;
    })
  }),
  campaigns: router({
    create: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1), title: import_zod2.z.string().trim().min(3).max(160), slug: import_zod2.z.string().trim().min(3).max(180).regex(/^[a-z0-9-]+$/), description: import_zod2.z.string().trim().max(5e3).optional(), targetAmount: import_zod2.z.number().int().min(0).max(1e11), startsAt: import_zod2.z.number().int().positive().optional(), endsAt: import_zod2.z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_CREATE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const existing = await db.select({ id: campaigns.id }).from(campaigns).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(campaigns.organizationId, input.organizationId), (0, import_drizzle_orm5.eq)(campaigns.slug, input.slug))).limit(1);
      if (existing[0]) throw new import_server5.TRPCError({ code: "CONFLICT", message: "Slug kampanye sudah digunakan. Ubah judul agar lebih spesifik." });
      const [created] = await db.insert(campaigns).values({ organizationId: input.organizationId, title: input.title, slug: input.slug, description: input.description, targetAmount: input.targetAmount, startsAt: input.startsAt ? new Date(input.startsAt) : void 0, endsAt: input.endsAt ? new Date(input.endsAt) : void 0, status: "draft" }).returning();
      if (created) await logAudit({ actorId: ctx.user.id, action: "create", resource: "campaign", resourceId: created.id, metadata: { organizationId: input.organizationId } });
      return created;
    }),
    publish: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1), campaignId: import_zod2.z.string().min(1) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_MANAGE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [published] = await db.update(campaigns).set({ status: "published", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(campaigns.id, input.campaignId), (0, import_drizzle_orm5.eq)(campaigns.organizationId, input.organizationId))).returning();
      if (!published) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Kampanye tidak ditemukan" });
      await logAudit({ actorId: ctx.user.id, action: "publish", resource: "campaign", resourceId: published.id, metadata: { organizationId: input.organizationId } });
      return published;
    }),
    list: protectedProcedure.input(organizationIdInput.extend({ limit: import_zod2.z.number().int().min(1).max(100).default(20), offset: import_zod2.z.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(campaigns).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(campaigns.organizationId, input.organizationId), (0, import_drizzle_orm5.eq)(campaigns.status, "published"))).orderBy((0, import_drizzle_orm5.asc)(campaigns.startsAt));
      return Promise.all(rows.map(async (campaign) => {
        const [donationTotals, usageTotals] = await Promise.all([
          db.select({ raisedAmount: (0, import_drizzle_orm5.sum)(donations.amount), verifiedDonors: (0, import_drizzle_orm5.count)(donations.id) }).from(donations).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(donations.campaignId, campaign.id), (0, import_drizzle_orm5.eq)(donations.status, "verified"))),
          db.select({ usedAmount: (0, import_drizzle_orm5.sum)(fundUsages.amount) }).from(fundUsages).where((0, import_drizzle_orm5.eq)(fundUsages.campaignId, campaign.id))
        ]);
        return { ...campaign, raisedAmount: Number(donationTotals[0]?.raisedAmount ?? 0), verifiedDonors: Number(donationTotals[0]?.verifiedDonors ?? 0), usedAmount: Number(usageTotals[0]?.usedAmount ?? 0) };
      }));
    }),
    drafts: protectedProcedure.input(organizationIdInput).query(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_MANAGE);
      const db = await getDb();
      if (!db) return [];
      return db.select().from(campaigns).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(campaigns.organizationId, input.organizationId), (0, import_drizzle_orm5.eq)(campaigns.status, "draft"))).orderBy((0, import_drizzle_orm5.asc)(campaigns.createdAt));
    }),
    pending: protectedProcedure.input(organizationIdInput.extend({ campaignId: import_zod2.z.string().min(1).max(80).optional() })).query(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_MANAGE);
      const db = await getDb();
      if (!db) return [];
      const conditions = [(0, import_drizzle_orm5.eq)(campaigns.organizationId, input.organizationId), (0, import_drizzle_orm5.eq)(donations.status, "submitted")];
      if (input.campaignId) conditions.push((0, import_drizzle_orm5.eq)(campaigns.id, input.campaignId));
      return db.select({ donation: donations, campaign: campaigns, donor: users }).from(donations).innerJoin(campaigns, (0, import_drizzle_orm5.eq)(campaigns.id, donations.campaignId)).innerJoin(users, (0, import_drizzle_orm5.eq)(users.id, donations.donorId)).where((0, import_drizzle_orm5.and)(...conditions)).orderBy((0, import_drizzle_orm5.asc)(donations.createdAt));
    }),
    contribute: protectedProcedure.input(import_zod2.z.object({ campaignId: import_zod2.z.string().min(1), amount: import_zod2.z.number().int().positive().max(1e9), visibility: import_zod2.z.enum(["named", "anonymous"]).default("named") })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.select().from(campaigns).where((0, import_drizzle_orm5.eq)(campaigns.id, input.campaignId)).limit(1);
      const campaign = result[0];
      if (!campaign) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Kampanye tidak ditemukan" });
      await requireOrganizationAccess(ctx.user.id, campaign.organizationId);
      const [donation] = await db.insert(donations).values({ campaignId: campaign.id, donorId: ctx.user.id, amount: input.amount, visibility: input.visibility, status: "submitted" }).returning();
      if (donation) await logAudit({ actorId: ctx.user.id, action: "contribute", resource: "donation", resourceId: donation.id, metadata: { campaignId: campaign.id } });
      return donation;
    }),
    verifyDonation: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1), donationId: import_zod2.z.string().min(1), status: import_zod2.z.enum(["verified", "rejected"]) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_MANAGE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.select({ donation: donations, campaign: campaigns }).from(donations).innerJoin(campaigns, (0, import_drizzle_orm5.eq)(campaigns.id, donations.campaignId)).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(donations.id, input.donationId), (0, import_drizzle_orm5.eq)(campaigns.organizationId, input.organizationId))).limit(1);
      if (!result[0]) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Kontribusi tidak ditemukan" });
      await db.update(donations).set({ status: input.status, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.eq)(donations.id, input.donationId));
      await logAudit({ actorId: ctx.user.id, action: input.status, resource: "donation", resourceId: input.donationId, metadata: { organizationId: input.organizationId } });
      return { success: true, status: input.status };
    }),
    addFundUsage: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1), campaignId: import_zod2.z.string().min(1), amount: import_zod2.z.number().int().positive().max(1e9), description: import_zod2.z.string().trim().min(3).max(500), evidenceFileId: import_zod2.z.string().min(1).optional() })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.CAMPAIGN_MANAGE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const campaignResult = await db.select().from(campaigns).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(campaigns.id, input.campaignId), (0, import_drizzle_orm5.eq)(campaigns.organizationId, input.organizationId))).limit(1);
      if (!campaignResult[0]) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Kampanye tidak ditemukan" });
      if (input.evidenceFileId) {
        const evidence = await db.select().from(files).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(files.id, input.evidenceFileId), (0, import_drizzle_orm5.eq)(files.visibility, "private"))).limit(1);
        if (!evidence[0]) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Bukti penggunaan dana tidak ditemukan" });
      }
      const [usage] = await db.insert(fundUsages).values({ campaignId: input.campaignId, amount: input.amount, description: input.description, evidenceFileId: input.evidenceFileId }).returning();
      if (usage) await logAudit({ actorId: ctx.user.id, action: "fund_usage", resource: "campaign", resourceId: input.campaignId, metadata: { amount: input.amount } });
      return usage;
    })
  }),
  forum: router({
    listTopics: protectedProcedure.input(organizationIdInput.extend({ limit: import_zod2.z.number().int().min(1).max(50).default(20), offset: import_zod2.z.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) return [];
      return db.select().from(forumTopics).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(forumTopics.organizationId, input.organizationId), (0, import_drizzle_orm5.eq)(forumTopics.status, "open"))).orderBy((0, import_drizzle_orm5.asc)(forumTopics.createdAt)).limit(input.limit).offset(input.offset);
    }),
    createTopic: protectedProcedure.input(organizationIdInput.extend({ title: import_zod2.z.string().trim().min(3).max(160), scopeType: import_zod2.z.enum(["general", "event", "announcement", "campaign"]).default("general"), scopeId: import_zod2.z.string().max(80).optional() })).mutation(async ({ ctx, input }) => {
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const [topic] = await db.insert(forumTopics).values({ organizationId: input.organizationId, title: input.title, scopeType: input.scopeType, scopeId: input.scopeId, status: "open" }).returning();
      if (topic) {
        await logAudit({ actorId: ctx.user.id, action: "create", resource: "forum_topic", resourceId: topic.id, metadata: { organizationId: input.organizationId, scopeType: input.scopeType } });
        emitForumEvent(input.organizationId, "forum:new-topic", { topicId: topic.id, title: topic.title });
      }
      return topic;
    }),
    reportPost: protectedProcedure.input(import_zod2.z.object({ postId: import_zod2.z.string().min(1), reason: import_zod2.z.string().trim().min(3).max(300) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.select({ post: forumPosts, topic: forumTopics }).from(forumPosts).innerJoin(forumTopics, (0, import_drizzle_orm5.eq)(forumTopics.id, forumPosts.topicId)).where((0, import_drizzle_orm5.eq)(forumPosts.id, input.postId)).limit(1);
      if (!result[0]) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Posting tidak ditemukan" });
      await requireOrganizationAccess(ctx.user.id, result[0].topic.organizationId);
      const [report] = await db.insert(forumReports).values({ postId: input.postId, reporterId: ctx.user.id, reason: input.reason, status: "open" }).returning();
      return report;
    }),
    reviewReport: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1), reportId: import_zod2.z.string().min(1), status: import_zod2.z.enum(["reviewed", "dismissed", "actioned"]) })).mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.organizationId, P.FORUM_MODERATE);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.select({ report: forumReports, topic: forumTopics }).from(forumReports).innerJoin(forumPosts, (0, import_drizzle_orm5.eq)(forumPosts.id, forumReports.postId)).innerJoin(forumTopics, (0, import_drizzle_orm5.eq)(forumTopics.id, forumPosts.topicId)).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(forumReports.id, input.reportId), (0, import_drizzle_orm5.eq)(forumTopics.organizationId, input.organizationId))).limit(1);
      if (!result[0]) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Laporan tidak ditemukan" });
      await db.update(forumReports).set({ status: input.status, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.eq)(forumReports.id, input.reportId));
      if (input.status === "actioned") await db.update(forumPosts).set({ status: "hidden", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.eq)(forumPosts.id, result[0].report.postId));
      await logAudit({ actorId: ctx.user.id, action: `forum_report_${input.status}`, resource: "forum_report", resourceId: input.reportId, metadata: { organizationId: input.organizationId } });
      return { success: true, status: input.status };
    }),
    listPosts: protectedProcedure.input(import_zod2.z.object({ topicId: import_zod2.z.string().min(1) })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const topicResult = await db.select().from(forumTopics).where((0, import_drizzle_orm5.eq)(forumTopics.id, input.topicId)).limit(1);
      const topic = topicResult[0];
      if (!topic) return [];
      await requireOrganizationAccess(ctx.user.id, topic.organizationId);
      return db.select({ post: forumPosts, author: users }).from(forumPosts).innerJoin(users, (0, import_drizzle_orm5.eq)(users.id, forumPosts.authorId)).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(forumPosts.topicId, input.topicId), (0, import_drizzle_orm5.eq)(forumPosts.status, "published"))).orderBy((0, import_drizzle_orm5.asc)(forumPosts.createdAt));
    }),
    findOrCreateTopic: protectedProcedure.input(organizationIdInput.extend({ scopeType: import_zod2.z.enum(["general", "event", "announcement", "campaign"]), scopeId: import_zod2.z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      await requireOrganizationAccess(ctx.user.id, input.organizationId);
      const existing = await db.select().from(forumTopics).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(forumTopics.organizationId, input.organizationId), (0, import_drizzle_orm5.eq)(forumTopics.scopeType, input.scopeType), (0, import_drizzle_orm5.eq)(forumTopics.scopeId, input.scopeId), (0, import_drizzle_orm5.eq)(forumTopics.status, "open"))).limit(1);
      if (existing[0]) return existing[0];
      const [topic] = await db.insert(forumTopics).values({ organizationId: input.organizationId, title: `Diskusi ${input.scopeType}`, scopeType: input.scopeType, scopeId: input.scopeId, status: "open" }).returning();
      return topic;
    }),
    createPost: protectedProcedure.input(import_zod2.z.object({ topicId: import_zod2.z.string().min(1), body: import_zod2.z.string().trim().min(1).max(3e3) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const topicResult = await db.select().from(forumTopics).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(forumTopics.id, input.topicId), (0, import_drizzle_orm5.eq)(forumTopics.status, "open"))).limit(1);
      const topic = topicResult[0];
      if (!topic) throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Topik forum tidak ditemukan" });
      await requireOrganizationAccess(ctx.user.id, topic.organizationId);
      const [post] = await db.insert(forumPosts).values({ topicId: topic.id, authorId: ctx.user.id, body: input.body, status: "published" }).returning();
      if (post) emitForumEvent(topic.organizationId, "forum:new-post", { topicId: topic.id, postId: post.id, authorId: ctx.user.id, body: post.body });
      return post;
    })
  }),
  files: router({
    uploadCampaignEvidence: protectedProcedure.input(import_zod2.z.object({ organizationId: import_zod2.z.string().min(1), filename: import_zod2.z.string().trim().min(1).max(180), mimeType: import_zod2.z.enum(["image/jpeg", "image/png", "application/pdf"]), contentBase64: import_zod2.z.string().min(10).max(7e6) })).mutation(async ({ ctx, input }) => {
      await requireOrganizationRole(ctx.user.id, input.organizationId, ["admin", "treasurer"]);
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const buffer = Buffer.from(input.contentBase64, "base64");
      if (buffer.byteLength > 5 * 1024 * 1024) throw new import_server5.TRPCError({ code: "BAD_REQUEST", message: "Ukuran bukti maksimal 5 MB" });
      const path = `campaign-evidence/${input.organizationId}/${ctx.user.id}/${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      await uploadPrivateObject({ bucket: "smart-warga-private", path, body: buffer, contentType: input.mimeType });
      const [file] = await db.insert(files).values({ ownerId: ctx.user.id, bucket: "smart-warga-private", path, filename: input.filename, mimeType: input.mimeType, size: buffer.byteLength, visibility: "private" }).returning();
      return file;
    }),
    listOwned: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ id: files.id, filename: files.filename, mimeType: files.mimeType, size: files.size, createdAt: files.createdAt }).from(files).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(files.ownerId, ctx.user.id), (0, import_drizzle_orm5.eq)(files.visibility, "private"))).orderBy((0, import_drizzle_orm5.desc)(files.createdAt)).limit(50);
    }),
    signedUrl: protectedProcedure.input(import_zod2.z.object({ fileId: import_zod2.z.string().min(1) })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new import_server5.TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database belum tersedia" });
      const result = await db.select({ file: files, organizationId: rwUnits.organizationId }).from(files).leftJoin(payments, (0, import_drizzle_orm5.eq)(payments.proofFileId, files.id)).leftJoin(invoices, (0, import_drizzle_orm5.eq)(invoices.id, payments.invoiceId)).leftJoin(households, (0, import_drizzle_orm5.eq)(households.id, invoices.householdId)).leftJoin(rtUnits, (0, import_drizzle_orm5.eq)(rtUnits.id, households.rtId)).leftJoin(rwUnits, (0, import_drizzle_orm5.eq)(rwUnits.id, rtUnits.rwId)).where((0, import_drizzle_orm5.eq)(files.id, input.fileId)).limit(1);
      const target = result[0];
      const file = target?.file;
      if (!file || file.visibility !== "private") throw new import_server5.TRPCError({ code: "FORBIDDEN", message: "File tidak dapat diakses" });
      let organizationId = target.organizationId;
      if (!organizationId) {
        const campaignEvidence = await db.select({ organizationId: campaigns.organizationId }).from(fundUsages).innerJoin(campaigns, (0, import_drizzle_orm5.eq)(campaigns.id, fundUsages.campaignId)).where((0, import_drizzle_orm5.eq)(fundUsages.evidenceFileId, input.fileId)).limit(1);
        organizationId = campaignEvidence[0]?.organizationId ?? null;
      }
      if (file.ownerId !== ctx.user.id) {
        if (!organizationId) throw new import_server5.TRPCError({ code: "FORBIDDEN", message: "File tidak terkait wilayah yang dapat diverifikasi" });
        await requirePermission(ctx.user.id, organizationId, P.BILLING_VIEW_OWN);
      }
      return { url: await createPrivateSignedUrl({ bucket: file.bucket, path: file.path, expiresInSeconds: 300 }), expiresInSeconds: 300 };
    })
  })
});

// server/_core/context.ts
var import_drizzle_orm6 = require("drizzle-orm");
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
          const result = await db.select().from(users).where((0, import_drizzle_orm6.eq)(users.id, session.userId)).limit(1);
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
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
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
app.use("/api/trpc", (0, import_express2.createExpressMiddleware)({ router: appRouter, createContext }));
var index_default = app;
