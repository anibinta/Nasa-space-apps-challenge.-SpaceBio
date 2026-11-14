import test from 'node:test';
import assert from 'node:assert/strict';
import { detectAnomalies } from './anomaly';
import type { MeasurementRecord } from '../types/health';

function makeDailyRecords(
  indicator: MeasurementRecord['indicator'],
  values: number[],
  unit: string
): MeasurementRecord[] {
  const base = new Date('2026-10-16T08:00:00Z');
  return values.map((val, idx) => ({
    id: `${indicator}-${idx + 1}`,
    indicator,
    value: val,
    unit,
    missionDay: idx + 1,
    timestamp: new Date(base.getTime() + idx * 86400000).toISOString(),
    confidence: 95,
    source: 'manual',
  }));
}

test('detectAnomalies requires at least 7 days of prior baseline before flagging', () => {
  // Only 6 prior days + 1 spike on day 7 => must NOT flag yet
  const records = makeDailyRecords('heart_rate', [64, 65, 63, 64, 65, 64, 92], 'bpm');
  const found = detectAnomalies(records);
  assert.equal(found.length, 0);
});

test('detectAnomalies flags observation > 2 standard deviations from 14-day rolling baseline', () => {
  // 10 steady baseline days around 64 bpm, then sharp spike to 84 bpm on day 11
  const records = makeDailyRecords(
    'heart_rate',
    [64, 65, 63, 64, 66, 63, 64, 65, 64, 64, 84],
    'bpm'
  );
  const found = detectAnomalies(records);
  assert.equal(found.length, 1);
  assert.equal(found[0].indicatorId, 'heart_rate');
  assert.ok(Math.abs(found[0].zScore) > 2);
  assert.ok(found[0].validationNotice.toLowerCase().includes('to be validated by an expert'));
});

test('detectAnomalies detects combined HR + reduced sleep + elevated temperature pattern over >= 2 days', () => {
  const hrVals = [64, 65, 64, 63, 65, 64, 64, 65, 64, 74, 76];
  const sleepVals = [7.4, 7.5, 7.3, 7.4, 7.6, 7.3, 7.4, 7.5, 7.4, 5.4, 5.2];
  const tempVals = [36.6, 36.6, 36.5, 36.6, 36.7, 36.6, 36.6, 36.5, 36.6, 37.3, 37.4];

  const all = [
    ...makeDailyRecords('heart_rate', hrVals, 'bpm'),
    ...makeDailyRecords('sleep', sleepVals, 'h'),
    ...makeDailyRecords('body_temperature', tempVals, '°C'),
  ];
  const found = detectAnomalies(all);
  const combined = found.find((a) => a.kind === 'combined');
  assert.ok(combined, 'Expected combined multi-indicator pattern anomaly');
  assert.equal(combined?.severity, 'high');
  assert.ok(combined?.validationNotice.includes('to be validated by an expert'));
});
