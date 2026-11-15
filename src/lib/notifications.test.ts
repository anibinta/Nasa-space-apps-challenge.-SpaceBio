import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acknowledgeNotificationAndAlert,
  applyEscalations,
  BACKUP_DOCTOR_NAME,
  buildAlertForExtremeMeasurement,
  buildHealthyBaselineMeasurements,
  buildSleepAnomalyScenario,
  computeOutboxPriority,
  countDoctorUnreadNotifications,
  createNotificationForAlert,
  enqueueOutboxItem,
  flushOutboxQueue,
  ON_DUTY_DOCTOR_NAME,
} from './notifications.ts';
import { detectAnomalies } from './anomaly.ts';
import { evaluateIndicatorStatus } from './healthEngine.ts';
import { evaluateVitalCardStatus } from './bodyMonitor.ts';

test('healthy baseline scenario yields all nominal vitals and zero anomalies > 2 SD', () => {
  const measurements = buildHealthyBaselineMeasurements(28);
  const anomalies = detectAnomalies(measurements);
  assert.equal(anomalies.length, 0);

  for (const m of measurements) {
    assert.equal(evaluateIndicatorStatus(m.indicator, m.value), 'nominal');
  }

  const latestHr = measurements.find((m) => m.indicator === 'heart_rate')!.value;
  const latestTemp = measurements.find((m) => m.indicator === 'body_temperature')!.value;
  const latestBp = measurements.find((m) => m.indicator === 'blood_pressure_sys')!.value;
  assert.equal(evaluateVitalCardStatus('heart_rate', latestHr), 'nominal');
  assert.equal(evaluateVitalCardStatus('body_temperature', latestTemp), 'nominal');
  assert.equal(evaluateVitalCardStatus('blood_pressure_sys', latestBp), 'nominal');
});

test('sleep anomaly scenario creates 3 nights avg 5.9 h and one Critical alert routed to flight doctor + ground center', () => {
  const nowIso = '2026-11-15T10:00:00.000Z';
  const { measurements, alert } = buildSleepAnomalyScenario(nowIso);

  const lastThreeSleeps = measurements
    .filter((m) => m.indicator === 'sleep' && m.missionDay >= 26)
    .map((m) => m.value);
  assert.equal(lastThreeSleeps.length, 3);
  const avg = Number(
    (lastThreeSleeps.reduce((a, b) => a + b, 0) / lastThreeSleeps.length).toFixed(1)
  );
  assert.equal(avg, 5.9);
  assert.equal(alert.severity, 'critical');

  const notif = createNotificationForAlert(alert, {
    patientId: 'pat-01',
    patientName: 'Cdr. Awa Ndiaye',
    callSign: 'ARES-02',
    linkStatus: 'active',
    nowIso,
  });

  assert.equal(notif.recipient, 'on_duty_doctor');
  assert.equal(notif.recipientName, ON_DUTY_DOCTOR_NAME);
  assert.equal(notif.groundCenterLogged, true);
  assert.equal(notif.status, 'delivered');
  assert.equal(notif.value, '5.9 h');
});

test('severity routing separates critical, warning, and info (journal only)', () => {
  const nowIso = '2026-11-15T10:00:00.000Z';
  const warnNotif = createNotificationForAlert(
    {
      id: 'w-1',
      severity: 'warning',
      indicator: 'bone_density',
      titleKey: 'alerts.items.boneTitle',
      explanationKey: 'alerts.items.boneExplanation',
      sourceData: 'ARED (38 min/d)',
      sourceParams: { avg: 38 },
      thresholdRule: '< 42 min/d',
      suggestedActionKey: 'alerts.items.boneAction',
      timestamp: nowIso,
      acknowledged: false,
    },
    {
      patientId: 'pat-01',
      patientName: 'Cdr. Awa Ndiaye',
      callSign: 'ARES-02',
      linkStatus: 'active',
      nowIso,
    }
  );
  assert.equal(warnNotif.recipient, 'on_duty_doctor');
  assert.equal(warnNotif.groundCenterLogged, false);

  const infoNotif = createNotificationForAlert(
    {
      id: 'i-1',
      severity: 'info',
      indicator: 'blood_pressure_sys',
      titleKey: 'alerts.items.bpTitle',
      explanationKey: 'alerts.items.bpExplanation',
      sourceData: 'Optical (134/84)',
      sourceParams: { sys: 134, dia: 84 },
      thresholdRule: '> 130 mmHg',
      suggestedActionKey: 'alerts.items.bpAction',
      timestamp: nowIso,
      acknowledged: false,
    },
    {
      patientId: 'pat-01',
      patientName: 'Cdr. Awa Ndiaye',
      callSign: 'ARES-02',
      linkStatus: 'active',
      nowIso,
    }
  );
  assert.equal(infoNotif.recipient, 'journal_only');
  assert.equal(countDoctorUnreadNotifications([warnNotif, infoNotif]), 1);
});

test('outbox queue preserves sequence order on restore, skips duplicate IDs, and prioritizes critical when degraded', () => {
  let queue = enqueueOutboxItem([], {
    id: 'q-meas-1',
    kind: 'measurement',
    priority: computeOutboxPriority('measurement'),
    timestamp: '2026-11-15T10:01:00.000Z',
    payloadId: 'm-101',
    summaryKey: 'notifications.events.measurementQueued',
  });
  queue = enqueueOutboxItem(queue, {
    id: 'q-msg-1',
    kind: 'message',
    priority: computeOutboxPriority('message'),
    timestamp: '2026-11-15T10:02:00.000Z',
    payloadId: 'cm-101',
    summaryKey: 'notifications.events.messageQueued',
  });
  queue = enqueueOutboxItem(queue, {
    id: 'q-crit-1',
    kind: 'notification',
    priority: computeOutboxPriority('notification', 'critical'),
    timestamp: '2026-11-15T10:03:00.000Z',
    payloadId: 'notif-crit-1',
    summaryKey: 'notifications.events.alertCreated',
  });
  // Duplicate ID must be skipped
  queue = enqueueOutboxItem(queue, {
    id: 'q-crit-1',
    kind: 'notification',
    priority: 0,
    timestamp: '2026-11-15T10:03:00.000Z',
    payloadId: 'notif-crit-1',
    summaryKey: 'notifications.events.alertCreated',
  });

  assert.equal(queue.length, 3);
  assert.deepEqual(
    queue.map((i) => i.seq),
    [1, 2, 3]
  );

  // Degraded: critical notification first
  const degradedFlush = flushOutboxQueue(queue, [], 'degraded');
  assert.equal(degradedFlush.sentItems[0].id, 'q-crit-1');

  // Active restore: sequence order (1, 2, 3), skipping already flushed IDs
  const activeFlush = flushOutboxQueue(queue, ['q-meas-1'], 'active');
  assert.deepEqual(
    activeFlush.sentItems.map((i) => i.id),
    ['q-msg-1', 'q-crit-1']
  );
  assert.equal(activeFlush.remainingQueue.length, 0);
});

test('unacknowledged critical notification escalates after 30 simulated min; acknowledging stops escalation', () => {
  const startIso = '2026-11-15T10:00:00.000Z';
  const startMs = Date.parse(startIso);
  const { alert } = buildSleepAnomalyScenario(startIso);
  const notif = createNotificationForAlert(alert, {
    patientId: 'pat-01',
    patientName: 'Cdr. Awa Ndiaye',
    callSign: 'ARES-02',
    linkStatus: 'active',
    nowIso: startIso,
  });

  // At +29 min: not yet escalated
  const before30 = applyEscalations([notif], startMs + 29 * 60_000);
  assert.equal(before30.newlyEscalated.length, 0);
  assert.equal(before30.notifications[0].status, 'delivered');

  // At +30 min without ack: escalated to backup doctor
  const at30 = applyEscalations([notif], startMs + 30 * 60_000);
  assert.equal(at30.newlyEscalated.length, 1);
  assert.equal(at30.notifications[0].status, 'escalated');
  assert.equal(at30.notifications[0].escalatedTo, BACKUP_DOCTOR_NAME);

  // If acknowledged before 30 min, escalation is stopped
  const acked = acknowledgeNotificationAndAlert([notif], [alert], notif.id, '2026-11-15T10:10:00.000Z');
  assert.equal(acked.alerts[0].acknowledged, true);
  assert.equal(acked.notifications[0].status, 'acknowledged');

  const afterAckAt30 = applyEscalations(acked.notifications, startMs + 60 * 60_000);
  assert.equal(afterAckAt30.newlyEscalated.length, 0);
  assert.equal(afterAckAt30.notifications[0].status, 'acknowledged');
});

test('extreme measurement offline generates a critical alert record', () => {
  const alert = buildAlertForExtremeMeasurement(
    {
      id: 'm-hr-off',
      indicator: 'heart_rate',
      value: 132,
      unit: 'bpm',
      timestamp: '2026-11-15T11:00:00.000Z',
      missionDay: 29,
      confidence: 95,
      source: 'manual',
    },
    '2026-11-15T11:00:00.000Z'
  );
  assert.ok(alert);
  assert.equal(alert!.severity, 'critical');
});
