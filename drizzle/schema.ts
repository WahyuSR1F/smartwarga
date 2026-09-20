import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = (name: string) => text(name).primaryKey().$defaultFn(() => crypto.randomUUID());
const timestamps = {
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
};

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  passwordHash: text("passwordHash"),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["platform_admin", "organization_admin", "rw_admin", "rt_admin", "treasurer", "resident"] }).notNull().default("resident"),
  status: text("status", { enum: ["active", "pending", "archived"] }).notNull().default("active"),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  ...timestamps,
}, table => ({ roleIdx: index("users_role_idx").on(table.role), phoneIdx: index("users_phone_idx").on(table.phone) }));

export const organizations = sqliteTable("organizations", {
  id: id("id"),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  timezone: text("timezone").notNull().default("Asia/Jakarta"),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  ...timestamps,
}, table => ({ slugIdx: uniqueIndex("organizations_slug_idx").on(table.slug) }));

export const organizationMembers = sqliteTable("organization_members", {
  organizationId: text("organizationId").notNull().references(() => organizations.id),
  userId: integer("userId").notNull().references(() => users.id),
  role: text("role", { enum: ["platform_admin", "organization_admin", "rw_admin", "rt_admin", "treasurer", "resident"] }).notNull().default("resident"),
  scopeType: text("scopeType", { enum: ["organization", "rw", "rt"] }).default("organization"),
  scopeId: text("scopeId"),
  status: text("status", { enum: ["active", "invited", "pending", "removed"] }).notNull().default("active"),
  ...timestamps,
}, table => ({ pk: uniqueIndex("organization_members_pk").on(table.organizationId, table.userId), userIdx: index("organization_members_user_idx").on(table.userId), orgIdx: index("organization_members_org_idx").on(table.organizationId) }));

export const rwUnits = sqliteTable("rw_units", {
  id: id("id"),
  organizationId: text("organizationId").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  ...timestamps,
}, table => ({ orgIdx: index("rw_units_org_idx").on(table.organizationId) }));

export const rtUnits = sqliteTable("rt_units", {
  id: id("id"),
  rwId: text("rwId").notNull().references(() => rwUnits.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  ...timestamps,
}, table => ({ rwIdx: index("rt_units_rw_idx").on(table.rwId) }));

export const households = sqliteTable("households", {
  id: id("id"),
  rtId: text("rtId").notNull().references(() => rtUnits.id),
  address: text("address").notNull(),
  block: text("block"),
  houseNumber: text("houseNumber"),
  status: text("status", { enum: ["active", "moved", "archived"] }).notNull().default("active"),
  ...timestamps,
}, table => ({ rtIdx: index("households_rt_idx").on(table.rtId), addressIdx: index("households_address_idx").on(table.address) }));

export const householdMembers = sqliteTable("household_members", {
  householdId: text("householdId").notNull().references(() => households.id),
  userId: integer("userId").notNull().references(() => users.id),
  relationship: text("relationship"),
  isHead: integer("isHead", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
}, table => ({ pk: uniqueIndex("household_members_pk").on(table.householdId, table.userId), userIdx: index("household_members_user_idx").on(table.userId) }));

export const billingTypes = sqliteTable("billing_types", {
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
  ...timestamps,
}, table => ({ orgIdx: index("billing_types_org_idx").on(table.organizationId) }));

export const billingPeriods = sqliteTable("billing_periods", {
  id: id("id"),
  billingTypeId: text("billingTypeId").notNull().references(() => billingTypes.id),
  periodKey: text("periodKey").notNull(),
  dueAt: integer("dueAt", { mode: "timestamp_ms" }).notNull(),
  status: text("status", { enum: ["draft", "issued", "closed"] }).notNull().default("draft"),
  ...timestamps,
}, table => ({ periodIdx: uniqueIndex("billing_periods_type_period_idx").on(table.billingTypeId, table.periodKey) }));

export const invoices = sqliteTable("invoices", {
  id: id("id"),
  householdId: text("householdId").notNull().references(() => households.id),
  billingPeriodId: text("billingPeriodId").notNull().references(() => billingPeriods.id),
  amount: integer("amount").notNull(),
  status: text("status", { enum: ["unpaid", "submitted", "verified", "rejected", "overdue"] }).notNull().default("unpaid"),
  ...timestamps,
}, table => ({ householdIdx: index("invoices_household_idx").on(table.householdId), periodIdx: index("invoices_period_idx").on(table.billingPeriodId), householdPeriodUnique: uniqueIndex("invoices_household_period_unique").on(table.householdId, table.billingPeriodId), statusIdx: index("invoices_status_idx").on(table.status) }));

export const payments = sqliteTable("payments", {
  id: id("id"),
  invoiceId: text("invoiceId").notNull().references(() => invoices.id),
  submittedBy: integer("submittedBy").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  proofFileId: text("proofFileId"),
  note: text("note"),
  status: text("status", { enum: ["submitted", "verified", "rejected"] }).notNull().default("submitted"),
  verifiedBy: integer("verifiedBy").references(() => users.id),
  verifiedAt: integer("verifiedAt", { mode: "timestamp_ms" }),
  ...timestamps,
}, table => ({ invoiceIdx: index("payments_invoice_idx").on(table.invoiceId), statusIdx: index("payments_status_idx").on(table.status) }));

export const paymentStatusHistory = sqliteTable("payment_status_history", {
  id: id("id"),
  paymentId: text("paymentId").notNull().references(() => payments.id),
  invoiceId: text("invoiceId").notNull().references(() => invoices.id),
  status: text("status", { enum: ["submitted", "verified", "rejected"] }).notNull(),
  actorId: integer("actorId").references(() => users.id),
  note: text("note"),
  ...timestamps,
}, table => ({ paymentIdx: index("payment_status_history_payment_idx").on(table.paymentId), invoiceIdx: index("payment_status_history_invoice_idx").on(table.invoiceId), createdIdx: index("payment_status_history_created_idx").on(table.createdAt) }));

export const events = sqliteTable("events", {
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
  ...timestamps,
}, table => ({ orgIdx: index("events_org_idx").on(table.organizationId), startsIdx: index("events_starts_idx").on(table.startsAt), slugIdx: uniqueIndex("events_slug_idx").on(table.organizationId, table.slug) }));

export const announcements = sqliteTable("announcements", {
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
  ...timestamps,
}, table => ({ orgIdx: index("announcements_org_idx").on(table.organizationId), slugIdx: uniqueIndex("announcements_slug_idx").on(table.organizationId, table.slug), statusIdx: index("announcements_status_idx").on(table.status) }));

export const eventReminderRules = sqliteTable("event_reminder_rules", {
  id: id("id"),
  eventId: text("eventId").notNull().references(() => events.id),
  organizationId: text("organizationId").notNull().references(() => organizations.id),
  templateName: text("templateName").notNull(),
  minutesBefore: integer("minutesBefore").notNull().default(1440),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  scheduleCronTaskUid: text("scheduleCronTaskUid"),
  ...timestamps,
}, table => ({ eventIdx: index("event_reminder_rules_event_idx").on(table.eventId), taskIdx: index("event_reminder_rules_task_idx").on(table.scheduleCronTaskUid) }));

export const eventRegistrations = sqliteTable("event_registrations", {
  eventId: text("eventId").notNull().references(() => events.id),
  userId: integer("userId").notNull().references(() => users.id),
  status: text("status", { enum: ["registered", "cancelled", "attended"] }).notNull().default("registered"),
  ...timestamps,
}, table => ({ pk: uniqueIndex("event_registrations_pk").on(table.eventId, table.userId), userIdx: index("event_registrations_user_idx").on(table.userId) }));

export const campaigns = sqliteTable("campaigns", {
  id: id("id"),
  organizationId: text("organizationId").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  targetAmount: integer("targetAmount").notNull().default(0),
  startsAt: integer("startsAt", { mode: "timestamp_ms" }),
  endsAt: integer("endsAt", { mode: "timestamp_ms" }),
  status: text("status", { enum: ["draft", "published", "closed"] }).notNull().default("draft"),
  ...timestamps,
}, table => ({ orgIdx: index("campaigns_org_idx").on(table.organizationId), slugIdx: uniqueIndex("campaigns_slug_idx").on(table.organizationId, table.slug) }));

export const donations = sqliteTable("donations", {
  id: id("id"),
  campaignId: text("campaignId").notNull().references(() => campaigns.id),
  donorId: integer("donorId").references(() => users.id),
  amount: integer("amount").notNull(),
  visibility: text("visibility", { enum: ["named", "anonymous"] }).notNull().default("named"),
  proofFileId: text("proofFileId"),
  status: text("status", { enum: ["submitted", "verified", "rejected"] }).notNull().default("submitted"),
  ...timestamps,
}, table => ({ campaignIdx: index("donations_campaign_idx").on(table.campaignId), statusIdx: index("donations_status_idx").on(table.status) }));

export const forumReports = sqliteTable("forum_reports", {
  id: id("id"),
  postId: text("postId").notNull().references(() => forumPosts.id),
  reporterId: integer("reporterId").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["open", "reviewed", "dismissed", "actioned"] }).notNull().default("open"),
  ...timestamps,
}, table => ({ postIdx: index("forum_reports_post_idx").on(table.postId), statusIdx: index("forum_reports_status_idx").on(table.status) }));

export const fundUsages = sqliteTable("fund_usages", {
  id: id("id"),
  campaignId: text("campaignId").notNull().references(() => campaigns.id),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  evidenceFileId: text("evidenceFileId"),
  ...timestamps,
}, table => ({ campaignIdx: index("fund_usages_campaign_idx").on(table.campaignId) }));

export const forumTopics = sqliteTable("forum_topics", {
  id: id("id"),
  organizationId: text("organizationId").notNull().references(() => organizations.id),
  scopeType: text("scopeType", { enum: ["general", "event", "announcement", "campaign"] }).notNull().default("general"),
  scopeId: text("scopeId"),
  title: text("title").notNull(),
  status: text("status", { enum: ["open", "locked", "archived"] }).notNull().default("open"),
  ...timestamps,
}, table => ({ orgIdx: index("forum_topics_org_idx").on(table.organizationId), scopeIdx: index("forum_topics_scope_idx").on(table.scopeType, table.scopeId) }));

export const forumPosts = sqliteTable("forum_posts", {
  id: id("id"),
  topicId: text("topicId").notNull().references(() => forumTopics.id),
  authorId: integer("authorId").notNull().references(() => users.id),
  body: text("body").notNull(),
  status: text("status", { enum: ["published", "hidden", "reported"] }).notNull().default("published"),
  ...timestamps,
}, table => ({ topicIdx: index("forum_posts_topic_idx").on(table.topicId), authorIdx: index("forum_posts_author_idx").on(table.authorId) }));

export const notifications = sqliteTable("notifications", {
  id: id("id"),
  recipientId: integer("recipientId").notNull().references(() => users.id),
  channel: text("channel", { enum: ["in_app", "web_push", "whatsapp", "email"] }).notNull(),
  template: text("template").notNull(),
  entityType: text("entityType"),
  entityId: text("entityId"),
  scheduledAt: integer("scheduledAt", { mode: "timestamp_ms" }),
  status: text("status", { enum: ["queued", "sent", "failed", "cancelled"] }).notNull().default("queued"),
  ...timestamps,
}, table => ({ recipientIdx: index("notifications_recipient_idx").on(table.recipientId), scheduleIdx: index("notifications_schedule_idx").on(table.status, table.scheduledAt) }));

export const notificationDeliveries = sqliteTable("notification_deliveries", {
  id: id("id"),
  notificationId: text("notificationId").notNull().references(() => notifications.id),
  providerMessageId: text("providerMessageId"),
  status: text("status", { enum: ["accepted", "delivered", "read", "failed"] }).notNull(),
  errorCode: text("errorCode"),
  payload: text("payload"),
  ...timestamps,
}, table => ({ notificationIdx: index("notification_deliveries_notification_idx").on(table.notificationId), providerIdx: index("notification_deliveries_provider_idx").on(table.providerMessageId) }));

export const files = sqliteTable("files", {
  id: id("id"),
  ownerId: integer("ownerId").references(() => users.id),
  storageProvider: text("storageProvider").notNull().default("supabase"),
  bucket: text("bucket").notNull(),
  path: text("path").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mimeType").notNull(),
  size: integer("size").notNull(),
  visibility: text("visibility", { enum: ["private", "public"] }).notNull().default("private"),
  ...timestamps,
}, table => ({ pathIdx: uniqueIndex("files_path_idx").on(table.bucket, table.path), ownerIdx: index("files_owner_idx").on(table.ownerId) }));

export const auditLogs = sqliteTable("audit_logs", {
  id: id("id"),
  actorId: integer("actorId").references(() => users.id),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resourceId"),
  metadata: text("metadata"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, table => ({ resourceIdx: index("audit_logs_resource_idx").on(table.resource, table.resourceId), actorIdx: index("audit_logs_actor_idx").on(table.actorId) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type Household = typeof households.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type PaymentStatusHistory = typeof paymentStatusHistory.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
