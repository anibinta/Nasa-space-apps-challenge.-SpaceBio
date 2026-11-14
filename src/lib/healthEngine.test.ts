import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMissionProgress,
  canAccessEndOfMissionReport,
  createMeasurementRecord,
  evaluateIndicatorStatus,
  formatTrendsCsv,
  generateEndOfMissionSynthesis,
  sortAlertsBySeverity,
  validateMeasurementInput,
} from './healthEngine';
import { EARTH_BACKGROUNDS, pickRandomBackground, SPACE_BACKGROUNDS } from './backgrounds';
import type { HealthAlert, MissionState } from '../types/health';

test('evaluateIndicatorStatus assigns nominal, watch, and alert levels', () => {
  assert.equal(evaluateIndicatorStatus('heart_rate', 68), 'nominal');
  assert.equal(evaluateIndicatorStatus('heart_rate', 96), 'watch');
  assert.equal(evaluateIndicatorStatus('heart_rate', 118), 'alert');
  assert.equal(evaluateIndicatorStatus('body_temperature', 36.7), 'nominal');
  assert.equal(evaluateIndicatorStatus('body_temperature', 37.8), 'watch');
});

test('validateMeasurementInput rejects out-of-bounds and invalid paired BP', () => {
  assert.equal(validateMeasurementInput('heart_rate', 72).valid, true);
  assert.equal(validateMeasurementInput('heart_rate', 260).valid, false);
  assert.equal(validateMeasurementInput('blood_pressure_sys', 118, 125).valid, false);
  assert.equal(validateMeasurementInput('blood_pressure_sys', 122, 78).valid, true);
});

test('createMeasurementRecord always marks contactless blood pressure as indicative', () => {
  const contactlessBp = createMeasurementRecord({
    id: 'm1',
    indicator: 'blood_pressure_sys',
    value: 121,
    secondaryValue: 79,
    source: 'contactless',
    confidence: 81,
    missionDay: 28,
    timestamp: '2026-11-13T12:00:00Z',
  });
  assert.equal(contactlessBp.indicative, true);

  const manualBp = createMeasurementRecord({
    id: 'm2',
    indicator: 'blood_pressure_sys',
    value: 120,
    secondaryValue: 78,
    source: 'manual',
    confidence: 98,
    missionDay: 28,
    timestamp: '2026-11-13T12:00:00Z',
  });
  assert.equal(manualBp.indicative, false);
});

test('sortAlertsBySeverity orders critical before warning before info', () => {
  const sample: HealthAlert[] = [
    {
      id: 'a1',
      severity: 'info',
      indicator: 'mood',
      titleKey: 't1',
      explanationKey: 'e1',
      sourceData: 'log',
      thresholdRule: 'rule',
      suggestedActionKey: 'act1',
      timestamp: '2026-11-13T10:00:00Z',
      acknowledged: false,
    },
    {
      id: 'a2',
      severity: 'critical',
      indicator: 'blood_pressure_sys',
      titleKey: 't2',
      explanationKey: 'e2',
      sourceData: 'cuff',
      thresholdRule: 'rule',
      suggestedActionKey: 'act2',
      timestamp: '2026-11-13T08:00:00Z',
      acknowledged: false,
    },
    {
      id: 'a3',
      severity: 'warning',
      indicator: 'sleep',
      titleKey: 't3',
      explanationKey: 'e3',
      sourceData: 'actigraphy',
      thresholdRule: 'rule',
      suggestedActionKey: 'act3',
      timestamp: '2026-11-13T09:00:00Z',
      acknowledged: false,
    },
  ];
  const sorted = sortAlertsBySeverity(sample);
  assert.deepEqual(
    sorted.map((a) => a.severity),
    ['critical', 'warning', 'info']
  );
});

test('mission progress and end-of-mission report gating obey actualDurationDays', () => {
  const activeMission: MissionState = {
    id: 'mis-1',
    name: 'Ares-IV',
    mode: 'space',
    departureDate: '2026-10-16',
    currentDay: 30,
    plannedDurationDays: 60,
    actualDurationDays: null,
    status: 'active',
    changeHistory: [],
  };

  assert.equal(calculateMissionProgress(activeMission).percentComplete, 50);
  assert.equal(canAccessEndOfMissionReport(activeMission), false);
  assert.equal(generateEndOfMissionSynthesis(activeMission, []), null);

  const completedMission: MissionState = {
    ...activeMission,
    actualDurationDays: 62,
    status: 'completed',
  };
  assert.equal(canAccessEndOfMissionReport(completedMission), true);
  assert.equal(calculateMissionProgress(completedMission).percentComplete, 100);
  assert.ok(generateEndOfMissionSynthesis(completedMission, []) !== null);
});

test('formatTrendsCsv outputs standard CSV header and simulated_data flag', () => {
  const csv = formatTrendsCsv('heart_rate', [
    { date: '2026-11-10', value: 68, baseline: 64, lower: 65, upper: 71 },
  ]);
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[0].includes('personal_baseline'));
  assert.ok(lines[1].endsWith(',true'));
});

test('SPACE_BACKGROUNDS and EARTH_BACKGROUNDS define valid webp images and pickRandomBackground selects safely', () => {
  assert.ok(SPACE_BACKGROUNDS.length >= 3 && EARTH_BACKGROUNDS.length >= 3);
  for (const bg of [...SPACE_BACKGROUNDS, ...EARTH_BACKGROUNDS]) {
    assert.ok(bg.src.startsWith('/backgrounds/'));
    assert.ok(bg.src.endsWith('.webp'));
  }
  assert.equal(pickRandomBackground('space', () => 0).id, SPACE_BACKGROUNDS[0].id);
  assert.equal(
    pickRandomBackground('space', () => 0.999).id,
    SPACE_BACKGROUNDS[SPACE_BACKGROUNDS.length - 1].id
  );
  assert.equal(pickRandomBackground('earth', () => 0).id, EARTH_BACKGROUNDS[0].id);
});
