import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BODY_LAYER_IDS,
  buildMiniSparklinePath,
  buildWaveformPath,
  calculateBreathingPeriodSeconds,
  calculateHeartbeatPeriodSeconds,
  DEFAULT_BODY_MAP_ORGAN,
  DEFAULT_BODY_MAP_SCENARIO,
  evaluateVitalCardStatus,
  extractSevenDayTrend,
  getDefaultScenarioForMode,
  getLayerOpacity,
  getOrganStatus,
  getOrganWaveformType,
  getScenarioState,
  getScenariosForMode,
} from './bodyMonitor.ts';

test('heartbeat and breathing periods obey exact physics formulas', () => {
  assert.equal(calculateHeartbeatPeriodSeconds(60), 1);
  assert.equal(calculateHeartbeatPeriodSeconds(120), 0.5);
  assert.equal(calculateHeartbeatPeriodSeconds(63), 0.952);
  assert.equal(calculateBreathingPeriodSeconds('nominal'), 3.8);
  assert.equal(calculateBreathingPeriodSeconds('eva'), 2.2);
  assert.equal(calculateBreathingPeriodSeconds('solar_storm'), 3.8);
});

test('hidden layers fade strictly to 14% opacity (0.14)', () => {
  const layers = Object.fromEntries(BODY_LAYER_IDS.map((id) => [id, true])) as Record<
    (typeof BODY_LAYER_IDS)[number],
    boolean
  >;
  assert.equal(getLayerOpacity('skeleton', layers), 1);
  layers.skeleton = false;
  assert.equal(getLayerOpacity('skeleton', layers), 0.14);
});

test('scenarios dynamically drive focused organ, BPM, and status color', () => {
  const nom = getScenarioState('nominal');
  assert.equal(nom.focusedOrgan, 'heart');
  assert.equal(nom.status, 'nominal');

  const eva = getScenarioState('eva');
  assert.equal(eva.focusedOrgan, 'lungs');
  assert.equal(eva.heartRateBpm, 112);
  assert.equal(getOrganStatus('lungs', eva), 'watch');

  const bone = getScenarioState('bone_alert');
  assert.equal(bone.focusedOrgan, 'skeleton');
  assert.equal(getOrganStatus('skeleton', bone), 'watch');

  const storm = getScenarioState('solar_storm');
  assert.equal(storm.focusedOrgan, 'brain');
  assert.equal(storm.heartRateBpm, 86);
  assert.equal(getOrganStatus('brain', storm), 'alert');
});

test('mode-specific scenario lists separate Space orbital scenarios from Earth reconditioning scenarios', () => {
  const spaceScenarios = getScenariosForMode('space');
  const earthScenarios = getScenariosForMode('earth');
  assert.ok(spaceScenarios.includes('solar_storm'));
  assert.ok(spaceScenarios.includes('eva'));
  assert.ok(!spaceScenarios.includes('orthostatic_test'));
  assert.ok(earthScenarios.includes('orthostatic_test'));
  assert.ok(!earthScenarios.includes('solar_storm'));
  assert.ok(!earthScenarios.includes('eva'));
  assert.equal(getDefaultScenarioForMode('space'), 'solar_storm');
  assert.equal(getDefaultScenarioForMode('earth'), 'orthostatic_test');
});

test('body map defaults to solar_storm scenario (86 bpm) with heart selected initially', () => {
  assert.equal(DEFAULT_BODY_MAP_SCENARIO, 'solar_storm');
  assert.equal(DEFAULT_BODY_MAP_ORGAN, 'heart');
  assert.equal(getScenarioState(DEFAULT_BODY_MAP_SCENARIO).heartRateBpm, 86);
});

test('vital card status evaluator and 7-day trend helpers return deterministic outputs', () => {
  assert.equal(evaluateVitalCardStatus('heart_rate', 68), 'nominal');
  assert.equal(evaluateVitalCardStatus('heart_rate', 102), 'watch');
  assert.equal(evaluateVitalCardStatus('spo2', 98), 'nominal');
  assert.equal(evaluateVitalCardStatus('spo2', 93), 'watch');
  assert.equal(evaluateVitalCardStatus('blood_pressure_sys', 134), 'watch');
  assert.equal(evaluateVitalCardStatus('blood_pressure_sys', 120), 'nominal');

  const trend = extractSevenDayTrend(
    [
      { indicator: 'heart_rate', value: 65, timestamp: '2026-11-01T00:00:00Z' },
      { indicator: 'heart_rate', value: 67, timestamp: '2026-11-02T00:00:00Z' },
      { indicator: 'heart_rate', value: 66, timestamp: '2026-11-03T00:00:00Z' },
    ],
    'heart_rate',
    [64, 65]
  );
  assert.deepEqual(trend, [65, 67, 66]);
  const spark = buildMiniSparklinePath(trend, 80, 24);
  assert.ok(spark.startsWith('M0,'));
  assert.ok(spark.includes('L80,'));
});

test('each organ maps to its dedicated clinical waveform curve', () => {
  assert.equal(getOrganWaveformType('heart'), 'ecg');
  assert.equal(getOrganWaveformType('lungs'), 'capnography');
  assert.equal(getOrganWaveformType('brain'), 'eeg');
  assert.equal(getOrganWaveformType('skeleton'), 'load');

  for (const wf of ['ecg', 'capnography', 'eeg', 'load'] as const) {
    const path = buildWaveformPath(wf, 68);
    assert.ok(path.startsWith('M0,'));
    assert.ok(path.includes('L260,'));
  }
});

