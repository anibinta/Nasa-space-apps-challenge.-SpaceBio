import type {
  AlertNotificationRecord,
  AlertSeverity,
  HealthAlert,
  IndicatorId,
  JournalEntry,
  LinkStatus,
  MeasurementRecord,
  OutboxItemKind,
  OutboxQueueItem,
} from '../types/health.ts';
import { evaluateIndicatorStatus, INDICATOR_CONFIGS } from './healthEngine.ts';

export const ON_DUTY_DOCTOR_NAME = 'Dr. Moussa Diop';
export const BACKUP_DOCTOR_NAME = 'Dr. Claire Moreau';
export const ESCALATION_WINDOW_MS = 30 * 60 * 1000;

export function extractAlertDisplayValue(alert: HealthAlert): string {
  const params = alert.sourceParams ?? {};
  if (typeof params.avg === 'number') {
    return alert.indicator === 'bone_density' ? `${params.avg} min/d` : `${params.avg} h`;
  }
  if (typeof params.sys === 'number' && typeof params.dia === 'number') {
    return `${params.sys}/${params.dia} mmHg`;
  }
  if (typeof params.hr === 'number') {
    return `${params.hr} bpm`;
  }
  if (typeof params.value === 'number') {
    const cfg = INDICATOR_CONFIGS[alert.indicator as IndicatorId];
    return cfg ? `${params.value} ${cfg.unit}` : String(params.value);
  }
  return alert.sourceData;
}

export function createNotificationForAlert(
  alert: HealthAlert,
  options: {
    patientId: string;
    patientName: string;
    callSign: string;
    linkStatus: LinkStatus;
    nowIso: string;
  }
): AlertNotificationRecord {
  const isCritical = alert.severity === 'critical';
  const isInfo = alert.severity === 'info';

  const recipient = isInfo ? 'journal_only' : 'on_duty_doctor';
  const recipientName = isInfo ? 'Journal' : ON_DUTY_DOCTOR_NAME;
  const groundCenterLogged = isCritical;
  const sentTimestamp = alert.timestamp || options.nowIso;

  let status: AlertNotificationRecord['status'];
  let queuedAt: string | undefined;
  let sentAt: string | undefined;
  let deliveredAt: string | undefined;
  let readAt: string | undefined;
  let acknowledgedAt: string | undefined;

  if (alert.acknowledged) {
    status = 'acknowledged';
    sentAt = sentTimestamp;
    deliveredAt = sentTimestamp;
    readAt = sentTimestamp;
    acknowledgedAt = options.nowIso;
  } else if (options.linkStatus === 'lost') {
    status = 'queued';
    queuedAt = options.nowIso;
  } else {
    status = 'delivered';
    sentAt = sentTimestamp;
    deliveredAt = options.nowIso;
  }

  return {
    id: `notif-${options.patientId}-${alert.id}`,
    alertId: alert.id,
    patientId: options.patientId,
    patientName: options.patientName,
    callSign: options.callSign,
    severity: alert.severity,
    metric: alert.indicator,
    value: extractAlertDisplayValue(alert),
    threshold: alert.thresholdRule,
    thresholdKey: alert.thresholdKey,
    thresholdParams: alert.thresholdParams,
    timestamp: sentTimestamp,
    suggestedAction: alert.suggestedActionKey,
    suggestedActionKey: alert.suggestedActionKey,
    recipient,
    recipientName,
    backupDoctorName: isCritical ? BACKUP_DOCTOR_NAME : undefined,
    groundCenterLogged,
    status,
    queuedAt,
    sentAt,
    deliveredAt,
    readAt,
    acknowledgedAt,
    recordLink: `/patient-file?patientId=${encodeURIComponent(options.patientId)}`,
    simulated: true,
  };
}

export function computeOutboxPriority(kind: OutboxItemKind, severity?: AlertSeverity): number {
  if (kind === 'notification') {
    if (severity === 'critical') return 0;
    if (severity === 'warning') return 1;
    return 2;
  }
  if (kind === 'message') return 3;
  return 4;
}

export function enqueueOutboxItem(
  queue: OutboxQueueItem[],
  item: Omit<OutboxQueueItem, 'seq'>
): OutboxQueueItem[] {
  const duplicate = queue.some(
    (q) => q.id === item.id || (q.kind === item.kind && q.payloadId === item.payloadId)
  );
  if (duplicate) return queue;
  const maxSeq = queue.reduce((max, q) => Math.max(max, q.seq), 0);
  return [...queue, { ...item, seq: maxSeq + 1 }];
}

export function orderOutboxItems(
  queue: OutboxQueueItem[],
  linkStatus: LinkStatus
): OutboxQueueItem[] {
  if (linkStatus === 'lost') return [];
  if (linkStatus === 'degraded') {
    return [...queue].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.seq - b.seq;
    });
  }
  return [...queue].sort((a, b) => a.seq - b.seq);
}

export function flushOutboxQueue(
  queue: OutboxQueueItem[],
  flushedIds: string[],
  linkStatus: LinkStatus
): {
  sentItems: OutboxQueueItem[];
  remainingQueue: OutboxQueueItem[];
  nextFlushedIds: string[];
} {
  if (linkStatus === 'lost') {
    return {
      sentItems: [],
      remainingQueue: queue,
      nextFlushedIds: flushedIds,
    };
  }

  const seen = new Set(flushedIds);
  const ordered = orderOutboxItems(queue, linkStatus);
  const sentItems: OutboxQueueItem[] = [];

  for (const item of ordered) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    sentItems.push(item);
  }

  return {
    sentItems,
    remainingQueue: [],
    nextFlushedIds: Array.from(seen),
  };
}

export function markNotificationRead(
  notifications: AlertNotificationRecord[],
  notificationId: string,
  nowIso: string
): AlertNotificationRecord[] {
  return notifications.map((n) => {
    if (n.id !== notificationId) return n;
    if (n.status === 'acknowledged' || n.status === 'escalated' || n.status === 'queued') {
      return n.readAt ? n : { ...n, readAt: nowIso };
    }
    return {
      ...n,
      status: 'read',
      readAt: n.readAt ?? nowIso,
    };
  });
}

export function acknowledgeNotificationAndAlert(
  notifications: AlertNotificationRecord[],
  alerts: HealthAlert[],
  targetId: string,
  nowIso: string
): {
  notifications: AlertNotificationRecord[];
  alerts: HealthAlert[];
  acknowledgedNotification: AlertNotificationRecord | null;
} {
  let matchedAlertId = targetId;
  let acknowledgedNotification: AlertNotificationRecord | null = null;

  const matchedNotif = notifications.find((n) => n.id === targetId || n.alertId === targetId);
  if (matchedNotif) {
    matchedAlertId = matchedNotif.alertId;
  }

  const nextAlerts = alerts.map((a) =>
    a.id === matchedAlertId ? { ...a, acknowledged: true } : a
  );

  const nextNotifications = notifications.map((n) => {
    if (n.id !== targetId && n.alertId !== matchedAlertId) return n;
    const updated: AlertNotificationRecord = {
      ...n,
      status: 'acknowledged',
      readAt: n.readAt ?? nowIso,
      acknowledgedAt: n.acknowledgedAt ?? nowIso,
    };
    acknowledgedNotification = updated;
    return updated;
  });

  return {
    notifications: nextNotifications,
    alerts: nextAlerts,
    acknowledgedNotification,
  };
}

export function applyEscalations(
  notifications: AlertNotificationRecord[],
  simNowMs: number
): {
  notifications: AlertNotificationRecord[];
  newlyEscalated: AlertNotificationRecord[];
} {
  const newlyEscalated: AlertNotificationRecord[] = [];
  const nowIso = new Date(simNowMs).toISOString();

  const nextNotifications = notifications.map((n) => {
    if (n.severity !== 'critical') return n;
    if (n.status === 'acknowledged' || n.status === 'escalated' || n.status === 'queued') {
      return n;
    }
    const baseIso = n.sentAt ?? n.timestamp;
    const baseMs = Date.parse(baseIso);
    if (!Number.isFinite(baseMs)) return n;

    if (simNowMs - baseMs >= ESCALATION_WINDOW_MS) {
      const updated: AlertNotificationRecord = {
        ...n,
        status: 'escalated',
        escalatedAt: nowIso,
        escalatedTo: n.backupDoctorName ?? BACKUP_DOCTOR_NAME,
      };
      newlyEscalated.push(updated);
      return updated;
    }
    return n;
  });

  return {
    notifications: nextNotifications,
    newlyEscalated,
  };
}

export function buildHealthyBaselineMeasurements(days = 28): MeasurementRecord[] {
  const records: MeasurementRecord[] = [];
  const baseDate = new Date('2026-10-16T08:00:00Z');

  for (let d = 1; d <= days; d++) {
    const iso = new Date(baseDate.getTime() + (d - 1) * 86400000).toISOString();
    const wave = Math.sin(d * 0.45);
    const wave2 = Math.cos(d * 0.35);

    const sys = Math.round(118 + wave * 3);
    const dia = Math.round(76 + wave2 * 2);
    const hr = Math.round(64 + wave2 * 2);
    const glu = Math.round(91 + wave * 3);
    const temp = Number((36.6 + wave * 0.1).toFixed(1));
    const sleep = Number((7.4 + wave * 0.2).toFixed(1));
    const mood = 8;
    const isContactless = d % 3 === 0;

    records.push(
      {
        id: `hb-bp-${d}`,
        indicator: 'blood_pressure_sys',
        value: sys,
        secondaryValue: dia,
        unit: 'mmHg',
        timestamp: iso,
        missionDay: d,
        confidence: isContactless ? 85 : 98,
        source: isContactless ? 'contactless' : 'manual',
        indicative: isContactless,
      },
      {
        id: `hb-hr-${d}`,
        indicator: 'heart_rate',
        value: hr,
        unit: 'bpm',
        timestamp: iso,
        missionDay: d,
        confidence: 98,
        source: 'manual',
      },
      {
        id: `hb-glu-${d}`,
        indicator: 'blood_glucose',
        value: glu,
        unit: 'mg/dL',
        timestamp: iso,
        missionDay: d,
        confidence: 96,
        source: 'manual',
      },
      {
        id: `hb-temp-${d}`,
        indicator: 'body_temperature',
        value: temp,
        unit: '°C',
        timestamp: iso,
        missionDay: d,
        confidence: 98,
        source: 'manual',
      },
      {
        id: `hb-sleep-${d}`,
        indicator: 'sleep',
        value: sleep,
        unit: 'h',
        timestamp: iso,
        missionDay: d,
        confidence: 94,
        source: 'manual',
      },
      {
        id: `hb-mood-${d}`,
        indicator: 'mood',
        value: mood,
        unit: '/10',
        timestamp: iso,
        missionDay: d,
        confidence: 100,
        source: 'manual',
      }
    );
  }

  return records.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function buildSleepAnomalyScenario(nowIso: string): {
  measurements: MeasurementRecord[];
  alert: HealthAlert;
} {
  const base = buildHealthyBaselineMeasurements(28);
  const sleepNights: Record<number, number> = {
    26: 5.8,
    27: 6.0,
    28: 5.9,
  };

  const measurements = base.map((rec) => {
    if (rec.indicator === 'sleep' && rec.missionDay in sleepNights) {
      return {
        ...rec,
        id: `sa-sleep-${rec.missionDay}`,
        value: sleepNights[rec.missionDay],
        timestamp: rec.missionDay === 28 ? nowIso : rec.timestamp,
      };
    }
    return rec;
  });

  const avgSleep = Number(((5.8 + 6.0 + 5.9) / 3).toFixed(1));
  const alert: HealthAlert = {
    id: 'al-sleep-crit',
    severity: 'critical',
    indicator: 'sleep',
    titleKey: 'alerts.items.sleepTitle',
    explanationKey: 'alerts.items.sleepExplanation',
    sourceData: `Actigraphy & Sleep Log (Days 26–28 · avg ${avgSleep} h)`,
    sourceKey: 'alerts.sources.sleepLog',
    sourceParams: { start: 26, end: 28, avg: avgSleep },
    thresholdRule: '3-day avg < 6.2 h (to be validated by an expert)',
    thresholdKey: 'alerts.thresholds.sleep3d',
    suggestedActionKey: 'alerts.items.sleepAction',
    timestamp: nowIso,
    acknowledged: false,
  };

  return { measurements, alert };
}

export function buildAlertForExtremeMeasurement(
  rec: MeasurementRecord,
  nowIso: string
): HealthAlert | null {
  const status = evaluateIndicatorStatus(rec.indicator, rec.value);
  if (status !== 'alert') return null;

  const titleByInd: Partial<Record<IndicatorId, string>> = {
    sleep: 'alerts.items.sleepTitle',
    blood_pressure_sys: 'alerts.items.bpTitle',
    heart_rate: 'alerts.items.hrTitle',
    body_temperature: 'alerts.items.tempTitle',
    blood_glucose: 'alerts.items.glucoseTitle',
    mood: 'alerts.items.moodTitle',
  };
  const actionByInd: Partial<Record<IndicatorId, string>> = {
    sleep: 'anomalies.actions.sleep',
    blood_pressure_sys: 'anomalies.actions.blood_pressure_sys',
    heart_rate: 'anomalies.actions.heart_rate',
    body_temperature: 'anomalies.actions.body_temperature',
    blood_glucose: 'anomalies.actions.blood_glucose',
    mood: 'anomalies.actions.mood',
  };

  const cfg = INDICATOR_CONFIGS[rec.indicator];
  const displayVal = rec.secondaryValue ? `${rec.value}/${rec.secondaryValue}` : String(rec.value);

  return {
    id: `al-meas-${rec.id}`,
    severity: 'critical',
    indicator: rec.indicator,
    titleKey: titleByInd[rec.indicator] ?? 'alerts.items.bpTitle',
    explanationKey: 'alerts.items.measurementOutOfRangeExplanation',
    sourceData: `${rec.source === 'contactless' ? 'Contactless' : 'Manual'} · Day ${rec.missionDay} (${displayVal} ${rec.unit})`,
    sourceKey: 'alerts.sources.measurementOut',
    sourceParams: {
      day: rec.missionDay,
      value: displayVal,
      unit: rec.unit,
    },
    thresholdRule: `${cfg.refMin}–${cfg.refMax} ${cfg.unit} (to be validated by an expert)`,
    thresholdKey: 'alerts.thresholds.indicatorRange',
    thresholdParams: {
      min: cfg.refMin,
      max: cfg.refMax,
      unit: cfg.unit,
    },
    suggestedActionKey: actionByInd[rec.indicator] ?? 'alerts.items.bpAction',
    timestamp: nowIso,
    acknowledged: false,
  };
}

export function formatRelativeSyncParts(
  lastSyncIso: string,
  simNowMs: number
): { unit: 'justNow' | 'seconds' | 'minutes' | 'hours'; value: number } {
  const lastMs = Date.parse(lastSyncIso);
  if (!Number.isFinite(lastMs)) return { unit: 'justNow', value: 0 };
  const diffSec = Math.max(0, Math.floor((simNowMs - lastMs) / 1000));
  if (diffSec < 10) return { unit: 'justNow', value: 0 };
  if (diffSec < 60) return { unit: 'seconds', value: diffSec };
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return { unit: 'minutes', value: diffMin };
  return { unit: 'hours', value: Math.floor(diffMin / 60) };
}

export function countDoctorUnreadNotifications(
  notifications: AlertNotificationRecord[]
): number {
  return notifications.filter(
    (n) =>
      n.recipient !== 'journal_only' &&
      n.status !== 'acknowledged' &&
      n.status !== 'queued'
  ).length;
}

export function createJournalEntry(
  entry: Omit<JournalEntry, 'id'>
): JournalEntry {
  return {
    id: `jr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...entry,
  };
}
