"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api-src/cron/event-reminder.ts
var event_reminder_exports = {};
__export(event_reminder_exports, {
  default: () => handler
});
module.exports = __toCommonJS(event_reminder_exports);

// server/db.ts
var import_client = require("@libsql/client");
var import_drizzle_orm = require("drizzle-orm");
var import_libsql = require("drizzle-orm/libsql");

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

// server/db.ts
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

// server/eventReminders.ts
var import_drizzle_orm2 = require("drizzle-orm");

// server/whatsapp.ts
async function sendWhatsAppTemplate(input) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) throw new Error("WhatsApp Cloud API is not configured");
  if (!/^\d{8,15}$/.test(input.to)) throw new Error("Recipient phone number must use international digits without +");
  if (!/^[a-z0-9_]+$/i.test(input.templateName)) throw new Error("Invalid WhatsApp template name");
  const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to,
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.languageCode ?? "id" },
        ...input.parameters?.length ? { components: [{ type: "body", parameters: input.parameters }] } : {}
      }
    })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? `WhatsApp API failed with status ${response.status}`);
  return { providerMessageId: payload.messages?.[0]?.id ?? null };
}

// server/eventReminders.ts
var LOOKAHEAD_MS = 24 * 60 * 6e4;
var GRACE_MS = 12 * 60 * 6e4;
async function runReminderForRule(rule, event, taskUid, respectWindow) {
  if (!rule.enabled) return { ok: true, skipped: "disabled" };
  if (respectWindow) {
    const startsAtMs = new Date(event.startsAt).getTime();
    const scheduledAt = startsAtMs - (rule.minutesBefore ?? 0) * 6e4;
    const now = Date.now();
    if (now < scheduledAt - LOOKAHEAD_MS || now > scheduledAt + GRACE_MS) {
      return { ok: true, skipped: "not-due" };
    }
  }
  const db = await getDb();
  if (!db) return { ok: true, skipped: "database-unavailable" };
  const registrations = await db.select({ user: users }).from(eventRegistrations).innerJoin(users, (0, import_drizzle_orm2.eq)(users.id, eventRegistrations.userId)).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(eventRegistrations.eventId, event.id), (0, import_drizzle_orm2.eq)(eventRegistrations.status, "registered")));
  let sent = 0;
  for (const { user: recipient } of registrations) {
    const entityId = `${event.id}:${rule.id}:${recipient.id}`;
    const existing = await db.select({ id: notifications.id }).from(notifications).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(notifications.entityType, "event_reminder"), (0, import_drizzle_orm2.eq)(notifications.entityId, entityId))).limit(1);
    if (existing[0]) continue;
    const notification = (await db.insert(notifications).values({ recipientId: recipient.id, channel: "whatsapp", template: rule.templateName, entityType: "event_reminder", entityId, status: "queued" }).returning())[0];
    try {
      if (!recipient.phone) throw new Error("Recipient phone is missing");
      const to = recipient.phone.replace(/\D/g, "");
      const result = await sendWhatsAppTemplate({ to, templateName: rule.templateName, parameters: [{ type: "text", text: event.title }, { type: "text", text: new Date(event.startsAt).toLocaleString("id-ID") }] });
      if (notification) {
        await db.update(notifications).set({ status: "sent", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.eq)(notifications.id, notification.id));
        await db.insert(notificationDeliveries).values({ notificationId: notification.id, providerMessageId: result.providerMessageId, status: "accepted", payload: JSON.stringify({ taskUid }) });
      }
      sent += 1;
    } catch (error) {
      if (notification) await db.update(notifications).set({ status: "failed", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.eq)(notifications.id, notification.id));
      console.warn("[Reminder] Event reminder failed", { recipientId: recipient.id, error: String(error) });
    }
  }
  return { ok: true, eventId: event.id, sent };
}
async function runDueEventReminders() {
  const db = await getDb();
  if (!db) return { processed: 0, sent: 0, skipped: 0 };
  const rows = await db.select({ rule: eventReminderRules, event: events }).from(eventReminderRules).innerJoin(events, (0, import_drizzle_orm2.eq)(events.id, eventReminderRules.eventId)).where((0, import_drizzle_orm2.eq)(eventReminderRules.enabled, true));
  let processed = 0;
  let sent = 0;
  let skipped = 0;
  for (const row of rows) {
    const outcome = await runReminderForRule(row.rule, row.event, null, true);
    if (outcome.ok && "eventId" in outcome) {
      processed += 1;
      sent += outcome.sent;
    } else {
      skipped += 1;
    }
  }
  return { processed, sent, skipped };
}

// api-src/cron/event-reminder.ts
async function handler(req, res) {
  const authHeader = req.headers.authorization ?? "";
  const urlToken = typeof req.query.token === "string" ? req.query.token : void 0;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}` && urlToken !== process.env.CRON_SECRET) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const db = await getDb();
  if (!db) {
    res.status(503).json({ error: "database-unavailable" });
    return;
  }
  const result = await runDueEventReminders();
  res.json({ ok: true, ...result });
}
