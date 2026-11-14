import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  role: text('role').notNull().default('astronaut'), // 'astronaut' | 'doctor' | 'admin'
  fullName: text('full_name').notNull().default('Astronaut User'),
  firstName: text('first_name').notNull().default('Awa'),
  lastName: text('last_name').notNull().default('Ndiaye'),
  callSign: text('call_sign').notNull().default('ARES-01'),
  age: integer('age').notNull().default(36),
  sex: text('sex').notNull().default('Female'),
  referenceCondition: text('reference_condition')
    .notNull()
    .default('Healthy adult · Low-Earth orbit endurance cohort'),
  baselinesJson: jsonb('baselines_json')
    .$type<Record<string, number>>()
    .notNull()
    .default({
      blood_pressure_sys: 118,
      blood_pressure_dia: 76,
      heart_rate: 64,
      blood_glucose: 91,
      body_temperature: 36.6,
      sleep: 7.4,
      mood: 8.2,
    }),
  language: text('language').notNull().default('en'),
  theme: text('theme').notNull().default('dark'),
  textSize: text('text_size').notNull().default('md'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const doctorAssignments = pgTable('doctor_assignments', {
  id: serial('id').primaryKey(),
  doctorUid: text('doctor_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  astronautUid: text('astronaut_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  station: text('station').notNull().default('Ground Control — Flight Medicine Console'),
  signalDelayLabel: text('signal_delay_label').notNull().default('~18 min est. turnaround'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const missions = pgTable('missions', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  mode: text('mode').notNull().default('space'), // 'space' | 'earth'
  departureDate: text('departure_date').notNull(),
  currentDay: integer('current_day').notNull().default(28),
  plannedDurationDays: integer('planned_duration_days').notNull().default(60),
  actualDurationDays: integer('actual_duration_days'),
  status: text('status').notNull().default('active'), // 'active' | 'completed'
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const missionChanges = pgTable('mission_changes', {
  id: serial('id').primaryKey(),
  missionId: integer('mission_id')
    .notNull()
    .references(() => missions.id, { onDelete: 'cascade' }),
  previousDays: integer('previous_days').notNull(),
  newDays: integer('new_days').notNull(),
  reason: text('reason').notNull(),
  changedBy: text('changed_by').notNull(),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
});

export const measurements = pgTable('measurements', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  missionId: integer('mission_id')
    .notNull()
    .references(() => missions.id, { onDelete: 'cascade' }),
  indicator: text('indicator').notNull(),
  value: doublePrecision('value').notNull(),
  secondaryValue: doublePrecision('secondary_value'),
  unit: text('unit').notNull(),
  missionDay: integer('mission_day').notNull(),
  confidence: integer('confidence').notNull(),
  source: text('source').notNull().default('manual'), // 'manual' | 'contactless'
  indicative: boolean('indicative').notNull().default(false),
  notes: text('notes'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  missionId: integer('mission_id')
    .notNull()
    .references(() => missions.id, { onDelete: 'cascade' }),
  severity: text('severity').notNull(), // 'critical' | 'warning' | 'info'
  indicator: text('indicator').notNull(),
  titleKey: text('title_key').notNull(),
  explanationKey: text('explanation_key').notNull(),
  sourceData: text('source_data').notNull(),
  thresholdRule: text('threshold_rule').notNull(),
  suggestedActionKey: text('suggested_action_key').notNull(),
  acknowledged: boolean('acknowledged').notNull().default(false),
  acknowledgedByUid: text('acknowledged_by_uid'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  threadId: text('thread_id').notNull(),
  senderUid: text('sender_uid').notNull(),
  senderRole: text('sender_role').notNull(), // 'astronaut' | 'doctor'
  senderName: text('sender_name').notNull(),
  body: text('body').notNull(),
  readAt: timestamp('read_at'),
  estimatedResponseMinutes: integer('estimated_response_minutes').notNull().default(18),
  attachmentJson: jsonb('attachment_json').$type<{
    type: 'photo' | 'voice' | 'chart';
    label: string;
    meta: string;
  } | null>(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
});

export const doctorSlots = pgTable('doctor_slots', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  dateLabel: text('date_label').notNull(),
  timeUtc: text('time_utc').notNull(),
  doctorName: text('doctor_name').notNull(),
  available: boolean('available').notNull().default(true),
  requested: boolean('requested').notNull().default(false),
});

export const consents = pgTable('consents', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  consentType: text('consent_type').notNull(), // 'telemetry' | 'contactless_av' | 'learning_network'
  version: text('version').notNull().default('v2.4'),
  agreed: boolean('agreed').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUid: text('actor_uid').notNull(),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  missions: many(missions),
  measurements: many(measurements),
  alerts: many(alerts),
  chatMessages: many(chatMessages),
  doctorSlots: many(doctorSlots),
  consents: many(consents),
}));

export const missionsRelations = relations(missions, ({ one, many }) => ({
  owner: one(users, {
    fields: [missions.ownerUid],
    references: [users.uid],
  }),
  changes: many(missionChanges),
  measurements: many(measurements),
  alerts: many(alerts),
}));

export const missionChangesRelations = relations(missionChanges, ({ one }) => ({
  mission: one(missions, {
    fields: [missionChanges.missionId],
    references: [missions.id],
  }),
}));
