import type { StatusLevel } from '../types/health.ts';

export type BodyScenarioId = 'nominal' | 'eva' | 'bone_alert' | 'solar_storm';
export type BodyOrganFocus = 'heart' | 'lungs' | 'brain' | 'skeleton';
export type BodyLayerId =
  | 'skeleton'
  | 'muscles'
  | 'circulatory'
  | 'respiratory'
  | 'digestive'
  | 'nervous';

export const BODY_LAYER_IDS: readonly BodyLayerId[] = [
  'skeleton',
  'muscles',
  'circulatory',
  'respiratory',
  'digestive',
  'nervous',
];

export const BODY_HOTSPOT_ORGANS: readonly BodyOrganFocus[] = [
  'brain',
  'lungs',
  'heart',
  'skeleton',
];

export interface BodyScenarioState {
  id: BodyScenarioId;
  focusedOrgan: BodyOrganFocus;
  status: StatusLevel;
  heartRateBpm: number;
  spO2Percent: number;
  temperatureC: number;
  systolicBp: number;
  diastolicBp: number;
  respiratoryRate: number;
  breathPeriodSec: number;
  sleepHours: number;
  moodScore: number;
  systolicFlowLpm: number;
  hrvMs: number;
  vitalCapacityL: number;
  etCo2MmHg: number;
  intracranialPressureMmHg: number;
  cognitiveIndexPercent: number;
  radiationDoseMsv: number;
  cerebralO2Percent: number;
  femoralBmd: number;
  lumbarBmd: number;
  serumCalciumMmol: number;
  vitaminDNgMl: number;
}

export const BODY_SCENARIOS: Record<BodyScenarioId, BodyScenarioState> = {
  nominal: {
    id: 'nominal',
    focusedOrgan: 'heart',
    status: 'nominal',
    heartRateBpm: 63,
    spO2Percent: 98,
    temperatureC: 36.7,
    systolicBp: 124,
    diastolicBp: 78,
    respiratoryRate: 14,
    breathPeriodSec: 3.8,
    sleepHours: 7.4,
    moodScore: 8.2,
    systolicFlowLpm: 5.2,
    hrvMs: 64,
    vitalCapacityL: 4.8,
    etCo2MmHg: 38,
    intracranialPressureMmHg: 11.4,
    cognitiveIndexPercent: 96,
    radiationDoseMsv: 14.2,
    cerebralO2Percent: 72,
    femoralBmd: 0.94,
    lumbarBmd: 1.06,
    serumCalciumMmol: 2.34,
    vitaminDNgMl: 34,
  },
  eva: {
    id: 'eva',
    focusedOrgan: 'lungs',
    status: 'watch',
    heartRateBpm: 112,
    spO2Percent: 96,
    temperatureC: 37.1,
    systolicBp: 138,
    diastolicBp: 84,
    respiratoryRate: 22,
    breathPeriodSec: 2.2,
    sleepHours: 6.5,
    moodScore: 7.9,
    systolicFlowLpm: 8.4,
    hrvMs: 39,
    vitalCapacityL: 4.6,
    etCo2MmHg: 41,
    intracranialPressureMmHg: 12.1,
    cognitiveIndexPercent: 93,
    radiationDoseMsv: 14.6,
    cerebralO2Percent: 70,
    femoralBmd: 0.94,
    lumbarBmd: 1.06,
    serumCalciumMmol: 2.36,
    vitaminDNgMl: 34,
  },
  bone_alert: {
    id: 'bone_alert',
    focusedOrgan: 'skeleton',
    status: 'watch',
    heartRateBpm: 74,
    spO2Percent: 98,
    temperatureC: 36.7,
    systolicBp: 128,
    diastolicBp: 80,
    respiratoryRate: 15,
    breathPeriodSec: 3.8,
    sleepHours: 6.8,
    moodScore: 7.6,
    systolicFlowLpm: 5.5,
    hrvMs: 56,
    vitalCapacityL: 4.8,
    etCo2MmHg: 38,
    intracranialPressureMmHg: 11.6,
    cognitiveIndexPercent: 95,
    radiationDoseMsv: 14.2,
    cerebralO2Percent: 72,
    femoralBmd: 0.88,
    lumbarBmd: 0.99,
    serumCalciumMmol: 2.48,
    vitaminDNgMl: 27,
  },
  solar_storm: {
    id: 'solar_storm',
    focusedOrgan: 'brain',
    status: 'alert',
    heartRateBpm: 86,
    spO2Percent: 97,
    temperatureC: 37.0,
    systolicBp: 134,
    diastolicBp: 82,
    respiratoryRate: 18,
    breathPeriodSec: 3.8,
    sleepHours: 5.8,
    moodScore: 7.1,
    systolicFlowLpm: 6.1,
    hrvMs: 46,
    vitalCapacityL: 4.7,
    etCo2MmHg: 39,
    intracranialPressureMmHg: 13.8,
    cognitiveIndexPercent: 89,
    radiationDoseMsv: 21.8,
    cerebralO2Percent: 67,
    femoralBmd: 0.94,
    lumbarBmd: 1.05,
    serumCalciumMmol: 2.35,
    vitaminDNgMl: 33,
  },
};

export function getScenarioState(id: BodyScenarioId): BodyScenarioState {
  return BODY_SCENARIOS[id] ?? BODY_SCENARIOS.nominal;
}

export function calculateHeartbeatPeriodSeconds(bpm: number): number {
  const safeBpm = Number.isFinite(bpm) ? Math.min(220, Math.max(30, bpm)) : 63;
  return Number((60 / safeBpm).toFixed(3));
}

export function calculateBreathingPeriodSeconds(scenario: BodyScenarioId): number {
  return scenario === 'eva' ? 2.2 : 3.8;
}

export function getLayerOpacity(
  layer: BodyLayerId,
  visibleLayers: Record<BodyLayerId, boolean>
): number {
  return visibleLayers[layer] ? 1 : 0.14;
}

export function getOrganStatus(
  organ: BodyOrganFocus,
  scenario: BodyScenarioState
): StatusLevel {
  if (scenario.id === 'nominal') return 'nominal';
  if (organ === scenario.focusedOrgan) return scenario.status;
  if (scenario.id === 'solar_storm' && organ === 'heart') return 'watch';
  return 'nominal';
}

export type OrganWaveformType = 'ecg' | 'capnography' | 'eeg' | 'load';

export function getOrganWaveformType(organ: BodyOrganFocus): OrganWaveformType {
  switch (organ) {
    case 'heart':
      return 'ecg';
    case 'lungs':
      return 'capnography';
    case 'brain':
      return 'eeg';
    case 'skeleton':
      return 'load';
  }
}

export function buildWaveformPath(
  type: OrganWaveformType,
  bpm: number,
  width = 260,
  height = 56
): string {
  const midY = height * 0.56;
  const pts: string[] = [];
  const steps = 130;
  const cycles = type === 'ecg' ? (bpm > 95 ? 3.5 : 2.5) : type === 'capnography' ? (bpm > 95 ? 3 : 2) : 4;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Number((t * width).toFixed(1));
    const phase = (t * cycles) % 1;
    let yOffset = 0;

    if (type === 'ecg') {
      if (phase >= 0.12 && phase < 0.2) {
        yOffset = -5 * Math.sin(((phase - 0.12) / 0.08) * Math.PI);
      } else if (phase >= 0.26 && phase < 0.3) {
        yOffset = 5 * Math.sin(((phase - 0.26) / 0.04) * Math.PI);
      } else if (phase >= 0.3 && phase < 0.36) {
        yOffset = -23 * Math.sin(((phase - 0.3) / 0.06) * Math.PI);
      } else if (phase >= 0.36 && phase < 0.41) {
        yOffset = 9 * Math.sin(((phase - 0.36) / 0.05) * Math.PI);
      } else if (phase >= 0.52 && phase < 0.68) {
        yOffset = -7 * Math.sin(((phase - 0.52) / 0.16) * Math.PI);
      }
    } else if (type === 'capnography') {
      if (phase < 0.35) {
        yOffset = 14;
      } else if (phase < 0.43) {
        const up = (phase - 0.35) / 0.08;
        yOffset = 14 - 30 * up;
      } else if (phase < 0.8) {
        const slope = (phase - 0.43) / 0.37;
        yOffset = -16 - 4 * slope;
      } else if (phase < 0.88) {
        const down = (phase - 0.8) / 0.08;
        yOffset = -20 + 34 * down;
      } else {
        yOffset = 14;
      }
    } else if (type === 'eeg') {
      const a = Math.sin(t * Math.PI * 18) * 8;
      const b = Math.sin(t * Math.PI * 33 + 0.7) * 5;
      const c = Math.cos(t * Math.PI * 7) * 4;
      yOffset = a + b + c;
    } else {
      // Skeleton ARED axial load curve
      const pulse = Math.pow(Math.max(0, Math.sin(phase * Math.PI)), 1.6);
      yOffset = 12 - pulse * 28;
    }

    const y = Number(Math.min(height - 4, Math.max(4, midY + yOffset)).toFixed(1));
    pts.push(`${i === 0 ? 'M' : 'L'}${x},${y}`);
  }

  return pts.join(' ');
}

export const DEFAULT_BODY_MAP_SCENARIO: BodyScenarioId = 'solar_storm';
export const DEFAULT_BODY_MAP_ORGAN: BodyOrganFocus = 'heart';

export type DashboardVitalKey = 'heart_rate' | 'spo2' | 'body_temperature' | 'blood_pressure_sys';

export function evaluateVitalCardStatus(key: DashboardVitalKey, value: number): 'nominal' | 'watch' {
  switch (key) {
    case 'heart_rate':
      return value >= 50 && value <= 90 ? 'nominal' : 'watch';
    case 'spo2':
      return value >= 95 ? 'nominal' : 'watch';
    case 'body_temperature':
      return value >= 36.1 && value <= 37.5 ? 'nominal' : 'watch';
    case 'blood_pressure_sys':
      return value >= 90 && value <= 130 ? 'nominal' : 'watch';
  }
}

export function extractSevenDayTrend(
  measurements: ReadonlyArray<{ indicator: string; value: number; timestamp: string }>,
  indicator: string,
  fallback: readonly number[]
): number[] {
  const matched = measurements
    .filter((m) => m.indicator === indicator && Number.isFinite(m.value))
    .slice()
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .slice(-7)
    .map((m) => m.value);

  if (matched.length >= 2) {
    return matched;
  }
  return [...fallback];
}

export function buildMiniSparklinePath(
  values: readonly number[],
  width = 88,
  height = 24
): string {
  if (values.length === 0) return '';
  if (values.length === 1) {
    const y = (height / 2).toFixed(1);
    return `M0,${y} L${width},${y}`;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const padY = 3;
  const usableH = height - padY * 2;

  return values
    .map((val, idx) => {
      const x = Number(((idx / (values.length - 1)) * width).toFixed(1));
      const norm = (val - min) / span;
      const y = Number((height - padY - norm * usableH).toFixed(1));
      return `${idx === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
}

