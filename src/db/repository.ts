import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  alerts,
  auditLogs,
  chatMessages,
  consents,
  doctorAssignments,
  doctorSlots,
  measurements,
  missionChanges,
  missions,
  users,
} from './schema.ts';
import {
  ASSIGNED_PATIENTS,
  INITIAL_ALERTS,
  INITIAL_CONSENTS,
  INITIAL_DOCTOR_SLOTS,
  INITIAL_MEASUREMENTS,
  INITIAL_MISSION,
  INITIAL_PROFILE,
  INITIAL_CHAT_MESSAGES,
} from '../data/mock.ts';
import {
  createMeasurementRecord,
  evaluateIndicatorStatus,
  validateMeasurementInput,
} from '../lib/healthEngine.ts';
import { detectAnomalies } from '../lib/anomaly.ts';
import {
  buildAnonymizedAdminSummary,
  canRoleAccessAdminSummary,
  canRoleAccessDoctorRoster,
  canRoleMutateMeasurements,
  isValidLanguage,
  sortAssignedPatientsBySeverity,
  validateOnboardingPayload,
  type OnboardingPayload,
} from '../lib/rbac.ts';
import type {
  AlertSeverity,
  AssignedPatient,
  AstronautProfile,
  ChatAttachment,
  ConsentRecord,
  IndicatorId,
  Language,
  MeasurementRecord,
  MeasurementSource,
  OperationalMode,
  TextSize,
  ThemeMode,
  UserRole,
} from '../types/health.ts';

function sanitizeDbError(message: string, error: unknown): Error {
  console.error(message, error);
  return new Error('A server data operation failed. Please try again.', { cause: error });
}

async function getUserRoleOrDefault(uid: string): Promise<UserRole> {
  const rows = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);
  const raw = rows[0]?.role;
  if (raw === 'doctor' || raw === 'admin' || raw === 'astronaut') return raw;
  return 'astronaut';
}

export async function getOrCreateUser(uid: string, email: string, displayName?: string | null) {
  try {
    const safeName = displayName?.trim() || INITIAL_PROFILE.fullName;
    const parts = safeName.split(/\s+/);
    const firstName = parts.length > 1 ? parts[parts.length - 2] : parts[0] || INITIAL_PROFILE.firstName;
    const lastName = parts.length > 1 ? parts[parts.length - 1] : INITIAL_PROFILE.lastName;
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        language: 'fr',
        fullName: safeName,
        firstName,
        lastName,
        callSign: INITIAL_PROFILE.callSign,
        age: INITIAL_PROFILE.age,
        sex: INITIAL_PROFILE.sex,
        referenceCondition: INITIAL_PROFILE.referenceCondition,
        baselinesJson: INITIAL_PROFILE.baselines,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();

    return result[0];
  } catch (error) {
    throw sanitizeDbError('getOrCreateUser failed:', error);
  }
}

async function seedWorkspaceForUser(uid: string, userName: string) {
  const insertedMission = await db
    .insert(missions)
    .values({
      ownerUid: uid,
      name: INITIAL_MISSION.name,
      mode: INITIAL_MISSION.mode,
      departureDate: INITIAL_MISSION.departureDate,
      currentDay: INITIAL_MISSION.currentDay,
      plannedDurationDays: INITIAL_MISSION.plannedDurationDays,
      actualDurationDays: INITIAL_MISSION.actualDurationDays,
      status: INITIAL_MISSION.status,
    })
    .returning();

  const missionRow = insertedMission[0];

  if (INITIAL_MISSION.changeHistory.length > 0) {
    await db.insert(missionChanges).values(
      INITIAL_MISSION.changeHistory.map((chg) => ({
        missionId: missionRow.id,
        previousDays: chg.previousDays,
        newDays: chg.newDays,
        reason: chg.reason,
        changedBy: chg.changedBy,
      }))
    );
  }

  await db.insert(measurements).values(
    INITIAL_MEASUREMENTS.map((m) => ({
      ownerUid: uid,
      missionId: missionRow.id,
      indicator: m.indicator,
      value: m.value,
      secondaryValue: m.secondaryValue ?? null,
      unit: m.unit,
      missionDay: m.missionDay,
      confidence: m.confidence,
      source: m.source,
      indicative: Boolean(m.indicative),
      notes: m.notes ?? null,
      recordedAt: new Date(m.timestamp),
    }))
  );

  await db.insert(alerts).values(
    INITIAL_ALERTS.map((a) => ({
      ownerUid: uid,
      missionId: missionRow.id,
      severity: a.severity,
      indicator: a.indicator,
      titleKey: a.titleKey,
      explanationKey: a.explanationKey,
      sourceData: a.sourceData,
      thresholdRule: a.thresholdRule,
      suggestedActionKey: a.suggestedActionKey,
      acknowledged: a.acknowledged,
    }))
  );

  await db.insert(chatMessages).values(
    INITIAL_CHAT_MESSAGES.map((cm) => ({
      ownerUid: uid,
      threadId: cm.threadId,
      senderUid: cm.senderRole === 'astronaut' ? uid : 'assigned-doctor',
      senderRole: cm.senderRole,
      senderName: cm.senderRole === 'astronaut' ? userName : cm.senderName,
      body: cm.body,
      readAt: cm.readAt ? new Date(cm.readAt) : null,
      estimatedResponseMinutes: cm.estimatedResponseMinutes,
      attachmentJson: cm.attachment ?? null,
      sentAt: new Date(cm.sentAt),
    }))
  );

  await db.insert(doctorSlots).values(
    INITIAL_DOCTOR_SLOTS.map((slot) => ({
      ownerUid: uid,
      dateLabel: slot.dateLabel,
      timeUtc: slot.timeUtc,
      doctorName: slot.doctorName,
      available: slot.available,
      requested: Boolean(slot.requested),
    }))
  );

  await db.insert(consents).values(
    INITIAL_CONSENTS.map((c) => ({
      ownerUid: uid,
      consentType: c.type,
      version: c.version,
      agreed: c.agreed,
      updatedAt: new Date(c.updatedAt),
    }))
  );

  return missionRow;
}

export async function bootstrapWorkspace(
  uid: string,
  email: string,
  displayName?: string | null
) {
  try {
    const userRow = await getOrCreateUser(uid, email, displayName);

    const existingMissions = await db
      .select()
      .from(missions)
      .where(eq(missions.ownerUid, uid))
      .orderBy(desc(missions.id))
      .limit(1);

    let missionRow = existingMissions[0];
    if (!missionRow) {
      missionRow = await seedWorkspaceForUser(uid, userRow.fullName);
    }

    const [
      changeRows,
      measurementRows,
      alertRows,
      messageRows,
      slotRows,
      consentRows,
    ] = await Promise.all([
      db
        .select()
        .from(missionChanges)
        .where(eq(missionChanges.missionId, missionRow.id))
        .orderBy(desc(missionChanges.id)),
      db
        .select()
        .from(measurements)
        .where(eq(measurements.ownerUid, uid))
        .orderBy(desc(measurements.missionDay), desc(measurements.id))
        .limit(250),
      db
        .select()
        .from(alerts)
        .where(eq(alerts.ownerUid, uid))
        .orderBy(desc(alerts.id)),
      db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.ownerUid, uid))
        .orderBy(chatMessages.id),
      db
        .select()
        .from(doctorSlots)
        .where(eq(doctorSlots.ownerUid, uid))
        .orderBy(doctorSlots.id),
      db
        .select()
        .from(consents)
        .where(eq(consents.ownerUid, uid))
        .orderBy(desc(consents.id)),
    ]);

    await db.insert(auditLogs).values({
      actorUid: uid,
      action: 'BOOTSTRAP_WORKSPACE',
      resource: `mission:${missionRow.id}`,
    });

    return {
      user: {
        uid: userRow.uid,
        email: userRow.email,
        role: (userRow.role === 'doctor' || userRow.role === 'admin' ? userRow.role : 'astronaut') as UserRole,
        language: userRow.language as Language,
        theme: userRow.theme as ThemeMode,
        textSize: userRow.textSize as TextSize,
        profile: {
          fullName: userRow.fullName,
          firstName: userRow.firstName,
          lastName: userRow.lastName,
          callSign: userRow.callSign,
          age: userRow.age,
          sex: userRow.sex as AstronautProfile['sex'],
          referenceCondition: userRow.referenceCondition,
          baselines: userRow.baselinesJson as Record<IndicatorId, number>,
        },
      },
      mission: {
        id: String(missionRow.id),
        name: missionRow.name,
        mode: missionRow.mode as OperationalMode,
        departureDate: missionRow.departureDate,
        currentDay: missionRow.currentDay,
        plannedDurationDays: missionRow.plannedDurationDays,
        actualDurationDays: missionRow.actualDurationDays,
        status: missionRow.status as 'active' | 'completed',
        changeHistory: changeRows.map((c) => ({
          id: String(c.id),
          previousDays: c.previousDays,
          newDays: c.newDays,
          reason: c.reason,
          changedAt: c.changedAt.toISOString(),
          changedBy: c.changedBy,
        })),
      },
      measurements: measurementRows.map((m) => ({
        id: String(m.id),
        indicator: m.indicator as IndicatorId,
        value: m.value,
        secondaryValue: m.secondaryValue ?? undefined,
        unit: m.unit,
        timestamp: m.recordedAt.toISOString(),
        missionDay: m.missionDay,
        confidence: m.confidence,
        source: m.source as MeasurementSource,
        indicative: m.indicative,
        notes: m.notes ?? undefined,
      })),
      alerts: alertRows.map((a) => ({
        id: String(a.id),
        severity: a.severity as 'critical' | 'warning' | 'info',
        indicator: a.indicator as IndicatorId | 'bone_density' | 'sleep_debt',
        titleKey: a.titleKey,
        explanationKey: a.explanationKey,
        sourceData: a.sourceData,
        thresholdRule: a.thresholdRule,
        suggestedActionKey: a.suggestedActionKey,
        timestamp: a.createdAt.toISOString(),
        acknowledged: a.acknowledged,
      })),
      chatMessages: messageRows.map((cm) => ({
        id: String(cm.id),
        threadId: cm.threadId,
        senderRole: cm.senderRole as 'astronaut' | 'doctor',
        senderName: cm.senderName,
        body: cm.body,
        sentAt: cm.sentAt.toISOString(),
        readAt: cm.readAt ? cm.readAt.toISOString() : null,
        estimatedResponseMinutes: cm.estimatedResponseMinutes,
        attachment: cm.attachmentJson ?? undefined,
      })),
      doctorSlots: slotRows.map((s) => ({
        id: String(s.id),
        dateLabel: s.dateLabel,
        timeUtc: s.timeUtc,
        doctorName: s.doctorName,
        available: s.available,
        requested: s.requested,
      })),
      consents: consentRows.map((c) => ({
        id: String(c.id),
        type: c.consentType as ConsentRecord['type'],
        version: c.version,
        agreed: c.agreed,
        updatedAt: c.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    throw sanitizeDbError('bootstrapWorkspace failed:', error);
  }
}

export async function completeOnboardingForUser(
  uid: string,
  payload: Partial<OnboardingPayload>
) {
  const check = validateOnboardingPayload(payload);
  if (!check.valid) {
    throw Object.assign(new Error(check.error), { statusCode: 400 });
  }
  const validated = check.data;

  try {
    const updatedUsers = await db
      .update(users)
      .set({
        role: validated.role,
        language: validated.language,
        firstName: validated.firstName,
        lastName: validated.lastName,
        fullName: validated.fullName,
        age: validated.age,
      })
      .where(eq(users.uid, uid))
      .returning();

    if (updatedUsers.length === 0) {
      throw Object.assign(new Error('User record not found'), { statusCode: 404 });
    }

    let missionRow = (
      await db
        .select()
        .from(missions)
        .where(eq(missions.ownerUid, uid))
        .orderBy(desc(missions.id))
        .limit(1)
    )[0];

    if (!missionRow) {
      missionRow = await seedWorkspaceForUser(uid, validated.fullName);
    }

    if (validated.role === 'astronaut') {
      const updatedMission = await db
        .update(missions)
        .set({
          name: validated.missionName,
          mode: validated.effectiveMode,
          departureDate: validated.startDate,
          plannedDurationDays: validated.plannedDurationDays,
          currentDay: validated.currentDay,
          updatedAt: new Date(),
        })
        .where(eq(missions.id, missionRow.id))
        .returning();
      missionRow = updatedMission[0];
    }

    await db.insert(auditLogs).values({
      actorUid: uid,
      action: 'ONBOARDING_COMPLETED',
      resource: `role:${validated.role}:mode:${validated.effectiveMode}`,
    });

    const userRow = updatedUsers[0];
    return {
      role: validated.role,
      effectiveMode: validated.effectiveMode,
      language: validated.language,
      profile: {
        firstName: userRow.firstName,
        lastName: userRow.lastName,
        fullName: userRow.fullName,
        age: userRow.age,
      },
      mission: {
        id: String(missionRow.id),
        name: missionRow.name,
        mode: missionRow.mode as OperationalMode,
        departureDate: missionRow.departureDate,
        currentDay: missionRow.currentDay,
        plannedDurationDays: missionRow.plannedDurationDays,
        actualDurationDays: missionRow.actualDurationDays,
        status: missionRow.status as 'active' | 'completed',
      },
    };
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) throw error;
    throw sanitizeDbError('completeOnboardingForUser failed:', error);
  }
}

export async function createMeasurementForUser(
  uid: string,
  payload: {
    indicator: IndicatorId;
    value: number;
    secondaryValue?: number;
    source: MeasurementSource;
    confidence: number;
    notes?: string;
  }
) {
  const actorRole = await getUserRoleOrDefault(uid);
  if (!canRoleMutateMeasurements(actorRole)) {
    throw Object.assign(
      new Error('Forbidden: only the Astronaut role can record measurements.'),
      { statusCode: 403 }
    );
  }

  const validation = validateMeasurementInput(
    payload.indicator,
    payload.value,
    payload.secondaryValue
  );
  if (!validation.valid) {
    throw Object.assign(new Error(validation.errorKey || 'Invalid measurement input'), {
      statusCode: 400,
    });
  }

  try {
    const missionRows = await db
      .select()
      .from(missions)
      .where(eq(missions.ownerUid, uid))
      .orderBy(desc(missions.id))
      .limit(1);

    const missionRow = missionRows[0];
    if (!missionRow) {
      throw Object.assign(new Error('Active mission not found'), { statusCode: 404 });
    }

    const normalized = createMeasurementRecord({
      id: 'pending',
      indicator: payload.indicator,
      value: payload.value,
      secondaryValue: payload.secondaryValue,
      source: payload.source,
      confidence: payload.confidence,
      missionDay: missionRow.currentDay,
      timestamp: new Date().toISOString(),
      notes: payload.notes,
    });

    const inserted = await db
      .insert(measurements)
      .values({
        ownerUid: uid,
        missionId: missionRow.id,
        indicator: normalized.indicator,
        value: normalized.value,
        secondaryValue: normalized.secondaryValue ?? null,
        unit: normalized.unit,
        missionDay: normalized.missionDay,
        confidence: normalized.confidence,
        source: normalized.source,
        indicative: Boolean(normalized.indicative),
        notes: normalized.notes ?? null,
      })
      .returning();

    const row = inserted[0];
    const status = evaluateIndicatorStatus(normalized.indicator, normalized.value);

    // Automatically log an expert-validated advisory alert if an elevated systolic BP is entered
    if (normalized.indicator === 'blood_pressure_sys' && status !== 'nominal') {
      await db.insert(alerts).values({
        ownerUid: uid,
        missionId: missionRow.id,
        severity: status === 'alert' ? 'warning' : 'info',
        indicator: 'blood_pressure_sys',
        titleKey: 'alerts.items.bpTitle',
        explanationKey: 'alerts.items.bpExplanation',
        sourceData: `${normalized.source === 'contactless' ? 'Optical Contactless Check' : 'Manual Cuff'} (Day ${normalized.missionDay} · ${normalized.value}${normalized.secondaryValue ? '/' + normalized.secondaryValue : ''} ${normalized.unit})`,
        thresholdRule: 'Systolic > 130 mmHg (to be validated by an expert)',
        suggestedActionKey: 'alerts.items.bpAction',
        acknowledged: false,
      });
    }

    await db.insert(auditLogs).values({
      actorUid: uid,
      action: 'CREATE_MEASUREMENT',
      resource: `measurement:${row.id}`,
    });

    return {
      id: String(row.id),
      indicator: row.indicator as IndicatorId,
      value: row.value,
      secondaryValue: row.secondaryValue ?? undefined,
      unit: row.unit,
      timestamp: row.recordedAt.toISOString(),
      missionDay: row.missionDay,
      confidence: row.confidence,
      source: row.source as MeasurementSource,
      indicative: row.indicative,
      notes: row.notes ?? undefined,
    };
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) throw error;
    throw sanitizeDbError('createMeasurementForUser failed:', error);
  }
}

export async function acknowledgeAlertForUser(actorUid: string, alertId: number) {
  try {
    const existing = await db
      .select()
      .from(alerts)
      .where(eq(alerts.id, alertId))
      .limit(1);

    const row = existing[0];
    if (!row) {
      throw Object.assign(new Error('Alert not found'), { statusCode: 404 });
    }

    if (row.ownerUid !== actorUid) {
      // Check if actor is an assigned flight surgeon for this astronaut
      const assignment = await db
        .select()
        .from(doctorAssignments)
        .where(
          and(
            eq(doctorAssignments.doctorUid, actorUid),
            eq(doctorAssignments.astronautUid, row.ownerUid)
          )
        )
        .limit(1);

      if (assignment.length === 0) {
        throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
      }
    }

    const updated = await db
      .update(alerts)
      .set({ acknowledged: true, acknowledgedByUid: actorUid })
      .where(eq(alerts.id, alertId))
      .returning();

    await db.insert(auditLogs).values({
      actorUid,
      action: 'ACKNOWLEDGE_ALERT',
      resource: `alert:${alertId}`,
    });

    return updated[0];
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) throw error;
    throw sanitizeDbError('acknowledgeAlertForUser failed:', error);
  }
}

export async function updateMissionDepartureForUser(
  uid: string,
  payload: {
    name: string;
    mode: OperationalMode;
    departureDate: string;
    plannedDurationDays: number;
  }
) {
  const actorRole = await getUserRoleOrDefault(uid);
  if (actorRole !== 'astronaut') {
    throw Object.assign(
      new Error('Forbidden: only the Astronaut role can modify personal mission departure settings.'),
      { statusCode: 403 }
    );
  }

  try {
    const missionRows = await db
      .select()
      .from(missions)
      .where(eq(missions.ownerUid, uid))
      .orderBy(desc(missions.id))
      .limit(1);

    const missionRow = missionRows[0];
    if (!missionRow) {
      throw Object.assign(new Error('Mission not found'), { statusCode: 404 });
    }

    const updated = await db
      .update(missions)
      .set({
        name: payload.name.trim() || missionRow.name,
        mode: payload.mode === 'earth' ? 'earth' : 'space',
        departureDate: payload.departureDate,
        plannedDurationDays: Math.max(1, Math.round(payload.plannedDurationDays)),
        updatedAt: new Date(),
      })
      .where(eq(missions.id, missionRow.id))
      .returning();

    await db.insert(auditLogs).values({
      actorUid: uid,
      action: 'UPDATE_MISSION_DEPARTURE',
      resource: `mission:${missionRow.id}`,
    });

    return updated[0];
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) throw error;
    throw sanitizeDbError('updateMissionDepartureForUser failed:', error);
  }
}

export async function revisePlannedDurationForUser(
  uid: string,
  newDays: number,
  reason: string,
  changedByLabel: string
) {
  try {
    const missionRows = await db
      .select()
      .from(missions)
      .where(eq(missions.ownerUid, uid))
      .orderBy(desc(missions.id))
      .limit(1);

    const missionRow = missionRows[0];
    if (!missionRow) {
      throw Object.assign(new Error('Mission not found'), { statusCode: 404 });
    }

    const sanitizedDays = Math.max(1, Math.round(newDays));
    if (sanitizedDays === missionRow.plannedDurationDays) {
      return null;
    }

    const changeRows = await db
      .insert(missionChanges)
      .values({
        missionId: missionRow.id,
        previousDays: missionRow.plannedDurationDays,
        newDays: sanitizedDays,
        reason: reason.trim() || 'Mission timeline revision',
        changedBy: changedByLabel,
      })
      .returning();

    await db
      .update(missions)
      .set({ plannedDurationDays: sanitizedDays, updatedAt: new Date() })
      .where(eq(missions.id, missionRow.id));

    await db.insert(auditLogs).values({
      actorUid: uid,
      action: 'REVISE_PLANNED_DURATION',
      resource: `mission:${missionRow.id}`,
    });

    const chg = changeRows[0];
    return {
      id: String(chg.id),
      previousDays: chg.previousDays,
      newDays: chg.newDays,
      reason: chg.reason,
      changedAt: chg.changedAt.toISOString(),
      changedBy: chg.changedBy,
    };
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) throw error;
    throw sanitizeDbError('revisePlannedDurationForUser failed:', error);
  }
}

export async function recordReturnDurationForUser(uid: string, actualDays: number | null) {
  try {
    const missionRows = await db
      .select()
      .from(missions)
      .where(eq(missions.ownerUid, uid))
      .orderBy(desc(missions.id))
      .limit(1);

    const missionRow = missionRows[0];
    if (!missionRow) {
      throw Object.assign(new Error('Mission not found'), { statusCode: 404 });
    }

    const validActual = actualDays && actualDays > 0 ? Math.round(actualDays) : null;
    const updated = await db
      .update(missions)
      .set({
        actualDurationDays: validActual,
        status: validActual ? 'completed' : 'active',
        updatedAt: new Date(),
      })
      .where(eq(missions.id, missionRow.id))
      .returning();

    await db.insert(auditLogs).values({
      actorUid: uid,
      action: validActual ? 'COMPLETE_MISSION' : 'REOPEN_MISSION',
      resource: `mission:${missionRow.id}`,
    });

    return updated[0];
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) throw error;
    throw sanitizeDbError('recordReturnDurationForUser failed:', error);
  }
}

export async function sendChatMessageForUser(
  uid: string,
  payload: {
    threadId: string;
    senderRole: 'astronaut' | 'doctor';
    senderName: string;
    body: string;
    estimatedResponseMinutes: number;
    attachment?: ChatAttachment;
  }
) {
  try {
    const inserted = await db
      .insert(chatMessages)
      .values({
        ownerUid: uid,
        threadId: payload.threadId,
        senderUid: uid,
        senderRole: payload.senderRole,
        senderName: payload.senderName,
        body: payload.body.trim(),
        estimatedResponseMinutes: payload.estimatedResponseMinutes,
        attachmentJson: payload.attachment ?? null,
      })
      .returning();

    const cm = inserted[0];
    return {
      id: String(cm.id),
      threadId: cm.threadId,
      senderRole: cm.senderRole as 'astronaut' | 'doctor',
      senderName: cm.senderName,
      body: cm.body,
      sentAt: cm.sentAt.toISOString(),
      readAt: cm.readAt ? cm.readAt.toISOString() : null,
      estimatedResponseMinutes: cm.estimatedResponseMinutes,
      attachment: cm.attachmentJson ?? undefined,
    };
  } catch (error) {
    throw sanitizeDbError('sendChatMessageForUser failed:', error);
  }
}

export async function requestDoctorSlotForUser(uid: string, slotId: number) {
  try {
    const updated = await db
      .update(doctorSlots)
      .set({ requested: true })
      .where(and(eq(doctorSlots.id, slotId), eq(doctorSlots.ownerUid, uid)))
      .returning();

    if (updated.length === 0) {
      throw Object.assign(new Error('Doctor availability slot not found'), { statusCode: 404 });
    }
    return updated[0];
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) throw error;
    throw sanitizeDbError('requestDoctorSlotForUser failed:', error);
  }
}

export async function recordConsentForUser(
  uid: string,
  consentType: ConsentRecord['type'],
  agreed: boolean
) {
  try {
    const inserted = await db
      .insert(consents)
      .values({
        ownerUid: uid,
        consentType,
        version: 'v2.4',
        agreed,
      })
      .returning();

    await db.insert(auditLogs).values({
      actorUid: uid,
      action: agreed ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN',
      resource: consentType,
    });

    const c = inserted[0];
    return {
      id: String(c.id),
      type: c.consentType as ConsentRecord['type'],
      version: c.version,
      agreed: c.agreed,
      updatedAt: c.updatedAt.toISOString(),
    };
  } catch (error) {
    throw sanitizeDbError('recordConsentForUser failed:', error);
  }
}

export async function updateProfileForUser(uid: string, profile: AstronautProfile) {
  try {
    const firstName = profile.firstName?.trim() || INITIAL_PROFILE.firstName;
    const lastName = profile.lastName?.trim() || INITIAL_PROFILE.lastName;
    const fullName = profile.fullName?.trim() || `${firstName} ${lastName}`.trim() || INITIAL_PROFILE.fullName;
    const updated = await db
      .update(users)
      .set({
        fullName,
        firstName,
        lastName,
        callSign: profile.callSign,
        age: Math.max(18, Math.min(99, Math.round(profile.age))),
        sex: profile.sex,
        referenceCondition: profile.referenceCondition,
        baselinesJson: profile.baselines,
      })
      .where(eq(users.uid, uid))
      .returning();

    await db.insert(auditLogs).values({
      actorUid: uid,
      action: 'UPDATE_PROFILE',
      resource: `user:${uid}`,
    });

    return updated[0];
  } catch (error) {
    throw sanitizeDbError('updateProfileForUser failed:', error);
  }
}

export async function updatePreferencesForUser(
  uid: string,
  prefs: { language?: Language; theme?: ThemeMode; textSize?: TextSize }
) {
  try {
    const patch: Partial<{ language: string; theme: string; textSize: string }> = {};
    if (prefs.language && isValidLanguage(prefs.language)) patch.language = prefs.language;
    if (prefs.theme === 'dark' || prefs.theme === 'light') patch.theme = prefs.theme;
    if (prefs.textSize === 'sm' || prefs.textSize === 'md' || prefs.textSize === 'lg') {
      patch.textSize = prefs.textSize;
    }

    if (Object.keys(patch).length === 0) return null;

    const updated = await db
      .update(users)
      .set(patch)
      .where(eq(users.uid, uid))
      .returning();

    return updated[0];
  } catch (error) {
    throw sanitizeDbError('updatePreferencesForUser failed:', error);
  }
}

export async function exportUserDataForUser(uid: string) {
  try {
    const [userRows, missionRows, measurementRows, alertRows, consentRows] = await Promise.all([
      db.select().from(users).where(eq(users.uid, uid)).limit(1),
      db.select().from(missions).where(eq(missions.ownerUid, uid)),
      db.select().from(measurements).where(eq(measurements.ownerUid, uid)),
      db.select().from(alerts).where(eq(alerts.ownerUid, uid)),
      db.select().from(consents).where(eq(consents.ownerUid, uid)),
    ]);

    await db.insert(auditLogs).values({
      actorUid: uid,
      action: 'EXPORT_GDPR_DATA',
      resource: `user:${uid}`,
    });

    return {
      exportedAt: new Date().toISOString(),
      user: userRows[0] ?? null,
      missions: missionRows,
      measurements: measurementRows,
      alerts: alertRows,
      consents: consentRows,
    };
  } catch (error) {
    throw sanitizeDbError('exportUserDataForUser failed:', error);
  }
}

export async function deleteUserDataForUser(uid: string) {
  try {
    await db.delete(missions).where(eq(missions.ownerUid, uid));
    await db.delete(chatMessages).where(eq(chatMessages.ownerUid, uid));
    await db.delete(doctorSlots).where(eq(doctorSlots.ownerUid, uid));
    await db.delete(consents).where(eq(consents.ownerUid, uid));

    await db.insert(auditLogs).values({
      actorUid: uid,
      action: 'DELETE_USER_DATA',
      resource: `user:${uid}`,
    });

    const userRows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    const fullName = userRows[0]?.fullName ?? INITIAL_PROFILE.fullName;
    await seedWorkspaceForUser(uid, fullName);
    return { reset: true };
  } catch (error) {
    throw sanitizeDbError('deleteUserDataForUser failed:', error);
  }
}

export async function getDoctorAssignedPatients(doctorUid: string) {
  const actorRole = await getUserRoleOrDefault(doctorUid);
  if (!canRoleAccessDoctorRoster(actorRole)) {
    throw Object.assign(
      new Error('Forbidden: Flight doctor role is required to view crew files.'),
      { statusCode: 403 }
    );
  }

  try {
    const assignments = await db
      .select()
      .from(doctorAssignments)
      .where(eq(doctorAssignments.doctorUid, doctorUid));

    const dbPatients: AssignedPatient[] = [];
    if (assignments.length > 0) {
      const crewUids = assignments.map((a) => a.astronautUid);
      const [crewUsers, crewMissions, crewAlerts, crewMeasurements] = await Promise.all([
        db.select().from(users).where(inArray(users.uid, crewUids)),
        db.select().from(missions).where(inArray(missions.ownerUid, crewUids)).orderBy(desc(missions.id)),
        db.select().from(alerts).where(inArray(alerts.ownerUid, crewUids)).orderBy(desc(alerts.id)),
        db
          .select()
          .from(measurements)
          .where(inArray(measurements.ownerUid, crewUids))
          .orderBy(desc(measurements.missionDay), desc(measurements.id)),
      ]);

      for (const u of crewUsers) {
        const m = crewMissions.find((row) => row.ownerUid === u.uid);
        const uAlerts = crewAlerts
          .filter((a) => a.ownerUid === u.uid)
          .map((a) => ({
            id: String(a.id),
            severity: a.severity as AlertSeverity,
            indicator: a.indicator as IndicatorId | 'bone_density' | 'sleep_debt',
            titleKey: a.titleKey,
            explanationKey: a.explanationKey,
            sourceData: a.sourceData,
            thresholdRule: a.thresholdRule,
            suggestedActionKey: a.suggestedActionKey,
            timestamp: a.createdAt.toISOString(),
            acknowledged: a.acknowledged,
          }));
        const uMeasurements: MeasurementRecord[] = crewMeasurements
          .filter((rec) => rec.ownerUid === u.uid)
          .slice(0, 120)
          .map((rec) => ({
            id: String(rec.id),
            indicator: rec.indicator as IndicatorId,
            value: rec.value,
            secondaryValue: rec.secondaryValue ?? undefined,
            unit: rec.unit,
            timestamp: rec.recordedAt.toISOString(),
            missionDay: rec.missionDay,
            confidence: rec.confidence,
            source: rec.source as MeasurementSource,
            indicative: rec.indicative,
            notes: rec.notes ?? undefined,
          }));

        const unacked = uAlerts.filter((a) => !a.acknowledged);
        const highest: AlertSeverity = unacked.some((a) => a.severity === 'critical')
          ? 'critical'
          : unacked.some((a) => a.severity === 'warning')
            ? 'warning'
            : 'info';

        dbPatients.push({
          id: `db-${u.uid.slice(0, 8)}`,
          fullName: u.fullName,
          callSign: u.callSign,
          age: u.age,
          missionName: m?.name ?? INITIAL_MISSION.name,
          mode: (m?.mode === 'earth' ? 'earth' : 'space') as OperationalMode,
          missionDay: m?.currentDay ?? INITIAL_MISSION.currentDay,
          plannedDurationDays: m?.plannedDurationDays ?? INITIAL_MISSION.plannedDurationDays,
          highestAlertSeverity: highest,
          activeAlertsCount: unacked.length,
          alerts: uAlerts,
          measurements: uMeasurements,
          baselines: u.baselinesJson as Record<IndicatorId, number>,
          boneRiskEstimatePercent: m?.mode === 'earth' ? 8.9 : 13.6,
        });
      }
    }

    const merged = dbPatients.length > 0 ? [...dbPatients, ...ASSIGNED_PATIENTS] : [...ASSIGNED_PATIENTS];
    const sorted = sortAssignedPatientsBySeverity(merged);
    const anomalies = sorted.flatMap((pat) => detectAnomalies(pat.measurements, { patientId: pat.id }));

    await db.insert(auditLogs).values({
      actorUid: doctorUid,
      action: 'VIEW_DOCTOR_PATIENTS',
      resource: `roster:${sorted.length}`,
    });

    return {
      readOnly: true as const,
      patients: sorted,
      anomalies,
    };
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) throw error;
    throw sanitizeDbError('getDoctorAssignedPatients failed:', error);
  }
}

export async function getAggregatedNetworkSummary(uid: string) {
  const actorRole = await getUserRoleOrDefault(uid);
  if (!canRoleAccessAdminSummary(actorRole)) {
    throw Object.assign(
      new Error('Forbidden: Network administrator role is required for anonymized network aggregates.'),
      { statusCode: 403 }
    );
  }

  try {
    const [missionAgg, measurementAgg, alertAgg, modeAgg] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(missions),
      db
        .select({
          total: sql<number>`count(*)::int`,
          contactless: sql<number>`coalesce(sum(case when ${measurements.source} = 'contactless' then 1 else 0 end), 0)::int`,
        })
        .from(measurements),
      db
        .select({
          critical: sql<number>`coalesce(sum(case when ${alerts.severity} = 'critical' then 1 else 0 end), 0)::int`,
          warning: sql<number>`coalesce(sum(case when ${alerts.severity} = 'warning' then 1 else 0 end), 0)::int`,
          info: sql<number>`coalesce(sum(case when ${alerts.severity} = 'info' then 1 else 0 end), 0)::int`,
        })
        .from(alerts),
      db
        .select({
          spaceObs: sql<number>`coalesce(sum(case when ${missions.mode} = 'space' then 1 else 0 end), 0)::int`,
          earthObs: sql<number>`coalesce(sum(case when ${missions.mode} = 'earth' then 1 else 0 end), 0)::int`,
        })
        .from(measurements)
        .innerJoin(missions, eq(measurements.missionId, missions.id)),
    ]);

    await db.insert(auditLogs).values({
      actorUid: uid,
      action: 'VIEW_AGGREGATED_NETWORK',
      resource: 'learning_network',
    });

    return buildAnonymizedAdminSummary({
      activeDbMissions: missionAgg[0]?.count ?? 0,
      totalDbMeasurements: measurementAgg[0]?.total ?? 0,
      contactlessCount: measurementAgg[0]?.contactless ?? 0,
      alertCounts: {
        critical: alertAgg[0]?.critical ?? 0,
        warning: alertAgg[0]?.warning ?? 0,
        info: alertAgg[0]?.info ?? 0,
      },
      spaceObservations: modeAgg[0]?.spaceObs ?? 0,
      earthObservations: modeAgg[0]?.earthObs ?? 0,
    });
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) throw error;
    throw sanitizeDbError('getAggregatedNetworkSummary failed:', error);
  }
}
