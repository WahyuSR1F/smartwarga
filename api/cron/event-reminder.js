const __dirname = new URL(".", import.meta.url).pathname;

// server/db.ts
import { createClient } from "@libsql/client";
import { and, count, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

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

// server/eventReminders.ts
import { and as and2, eq as eq2 } from "drizzle-orm";

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
  const registrations = await db.select({ user: users }).from(eventRegistrations).innerJoin(users, eq2(users.id, eventRegistrations.userId)).where(and2(eq2(eventRegistrations.eventId, event.id), eq2(eventRegistrations.status, "registered")));
  let sent = 0;
  for (const { user: recipient } of registrations) {
    const entityId = `${event.id}:${rule.id}:${recipient.id}`;
    const existing = await db.select({ id: notifications.id }).from(notifications).where(and2(eq2(notifications.entityType, "event_reminder"), eq2(notifications.entityId, entityId))).limit(1);
    if (existing[0]) continue;
    const notification = (await db.insert(notifications).values({ recipientId: recipient.id, channel: "whatsapp", template: rule.templateName, entityType: "event_reminder", entityId, status: "queued" }).returning())[0];
    try {
      if (!recipient.phone) throw new Error("Recipient phone is missing");
      const to = recipient.phone.replace(/\D/g, "");
      const result = await sendWhatsAppTemplate({ to, templateName: rule.templateName, parameters: [{ type: "text", text: event.title }, { type: "text", text: new Date(event.startsAt).toLocaleString("id-ID") }] });
      if (notification) {
        await db.update(notifications).set({ status: "sent", updatedAt: /* @__PURE__ */ new Date() }).where(eq2(notifications.id, notification.id));
        await db.insert(notificationDeliveries).values({ notificationId: notification.id, providerMessageId: result.providerMessageId, status: "accepted", payload: JSON.stringify({ taskUid }) });
      }
      sent += 1;
    } catch (error) {
      if (notification) await db.update(notifications).set({ status: "failed", updatedAt: /* @__PURE__ */ new Date() }).where(eq2(notifications.id, notification.id));
      console.warn("[Reminder] Event reminder failed", { recipientId: recipient.id, error: String(error) });
    }
  }
  return { ok: true, eventId: event.id, sent };
}
async function runDueEventReminders() {
  const db = await getDb();
  if (!db) return { processed: 0, sent: 0, skipped: 0 };
  const rows = await db.select({ rule: eventReminderRules, event: events }).from(eventReminderRules).innerJoin(events, eq2(events.id, eventReminderRules.eventId)).where(eq2(eventReminderRules.enabled, true));
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
export {
  handler as default
};
