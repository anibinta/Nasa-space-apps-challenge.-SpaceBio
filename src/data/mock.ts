import type { AssignedPatient, MeasurementRecord, SiteEnvironment } from '../types/health.ts';
import {
  BODY_REGIONS,
  FORECAST_72H,
  INITIAL_ALERTS,
  INITIAL_BONE_HEALTH,
  INITIAL_CHAT_MESSAGES,
  INITIAL_CHAT_THREADS,
  INITIAL_CONSENTS,
  INITIAL_DOCTOR_SLOTS,
  INITIAL_MEASUREMENTS,
  INITIAL_MISSION,
  INITIAL_PROFILE,
  LEARNING_SITES,
  STATIC_REPORTS,
  SUBGROUP_PERFORMANCE,
} from './simulatedData.ts';

export {
  BODY_REGIONS,
  FORECAST_72H,
  INITIAL_ALERTS,
  INITIAL_BONE_HEALTH,
  INITIAL_CHAT_MESSAGES,
  INITIAL_CHAT_THREADS,
  INITIAL_CONSENTS,
  INITIAL_DOCTOR_SLOTS,
  INITIAL_MEASUREMENTS,
  INITIAL_MISSION,
  INITIAL_PROFILE,
  LEARNING_SITES,
  STATIC_REPORTS,
  SUBGROUP_PERFORMANCE,
};

export const EARTH_SITE_ENVIRONMENT: SiteEnvironment = {
  siteName: 'Toulouse MEDES Recovery Center',
  temperatureC: 23.4,
  humidityPercent: 48,
  heatIndexC: 24.1,
  barometricHpa: 1014,
};

function buildPatientMeasurements(
  prefix: string,
  hrBase: number,
  sleepBase: number,
  tempBase: number,
  sysBase: number,
  spikeLastTwoDays: boolean
): MeasurementRecord[] {
  const out: MeasurementRecord[] = [];
  const start = new Date('2026-10-16T08:00:00Z');
  for (let d = 1; d <= 16; d++) {
    const iso = new Date(start.getTime() + (d - 1) * 86400000).toISOString();
    const wave = Math.sin(d * 0.5);
    const isTail = spikeLastTwoDays && d >= 15;
    out.push(
      {
        id: `${prefix}-hr-${d}`,
        indicator: 'heart_rate',
        value: Math.round(hrBase + wave * 2 + (isTail ? 14 : 0)),
        unit: 'bpm',
        missionDay: d,
        timestamp: iso,
        confidence: 96,
        source: 'manual',
      },
      {
        id: `${prefix}-sleep-${d}`,
        indicator: 'sleep',
        value: Number((isTail ? 5.1 : sleepBase + wave * 0.3).toFixed(1)),
        unit: 'h',
        missionDay: d,
        timestamp: iso,
        confidence: 92,
        source: 'manual',
      },
      {
        id: `${prefix}-temp-${d}`,
        indicator: 'body_temperature',
        value: Number((tempBase + wave * 0.1 + (isTail ? 0.7 : 0)).toFixed(1)),
        unit: '°C',
        missionDay: d,
        timestamp: iso,
        confidence: 98,
        source: 'manual',
      },
      {
        id: `${prefix}-bp-${d}`,
        indicator: 'blood_pressure_sys',
        value: Math.round(sysBase + wave * 3 + (isTail ? 12 : 0)),
        secondaryValue: 78,
        unit: 'mmHg',
        missionDay: d,
        timestamp: iso,
        confidence: d % 2 === 0 ? 80 : 97,
        source: d % 2 === 0 ? 'contactless' : 'manual',
        indicative: d % 2 === 0,
      },
      {
        id: `${prefix}-glu-${d}`,
        indicator: 'blood_glucose',
        value: Math.round(92 + wave * 4),
        unit: 'mg/dL',
        missionDay: d,
        timestamp: iso,
        confidence: 95,
        source: 'manual',
      },
      {
        id: `${prefix}-mood-${d}`,
        indicator: 'mood',
        value: isTail ? 6 : 8,
        unit: '/10',
        missionDay: d,
        timestamp: iso,
        confidence: 100,
        source: 'manual',
      }
    );
  }
  return out.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export const ASSIGNED_PATIENTS: AssignedPatient[] = [
  {
    id: 'pat-01',
    fullName: 'Cdr. Awa Ndiaye',
    callSign: 'ARES-02',
    age: 36,
    missionName: 'Ares-IV Orbital Habitat',
    mode: 'space',
    missionDay: 28,
    plannedDurationDays: 60,
    highestAlertSeverity: 'critical',
    activeAlertsCount: 3,
    alerts: INITIAL_ALERTS,
    measurements: INITIAL_MEASUREMENTS,
    baselines: INITIAL_PROFILE.baselines,
    boneRiskEstimatePercent: 14.2,
  },
  {
    id: 'pat-02',
    fullName: 'Dr. Kenji Takahashi',
    callSign: 'ARES-04',
    age: 41,
    missionName: 'Ares-IV Orbital Habitat',
    mode: 'space',
    missionDay: 28,
    plannedDurationDays: 60,
    highestAlertSeverity: 'warning',
    activeAlertsCount: 1,
    alerts: [
      {
        id: 'pat2-al-1',
        severity: 'warning',
        indicator: 'heart_rate',
        titleKey: 'alerts.items.boneTitle',
        explanationKey: 'alerts.items.boneExplanation',
        sourceData: 'Optical & Cuff Telemetry (Days 15–16 · HR 78 bpm)',
        thresholdRule: '2-day autonomic load drift (to be validated by an expert)',
        suggestedActionKey: 'alerts.items.boneAction',
        timestamp: '2026-11-13T07:00:00Z',
        acknowledged: false,
      },
    ],
    measurements: buildPatientMeasurements('p2', 64, 7.3, 36.6, 118, true),
    baselines: {
      blood_pressure_sys: 118,
      blood_pressure_dia: 76,
      heart_rate: 64,
      blood_glucose: 92,
      body_temperature: 36.6,
      sleep: 7.3,
      mood: 8.0,
    },
    boneRiskEstimatePercent: 11.8,
  },
  {
    id: 'pat-03',
    fullName: 'Maj. Elena Vance',
    callSign: 'TER-07',
    age: 34,
    missionName: 'Post-Flight Reconditioning Alpha',
    mode: 'earth',
    missionDay: 9,
    plannedDurationDays: 30,
    highestAlertSeverity: 'info',
    activeAlertsCount: 1,
    alerts: [
      {
        id: 'pat3-al-1',
        severity: 'info',
        indicator: 'blood_pressure_sys',
        titleKey: 'alerts.items.bpTitle',
        explanationKey: 'alerts.items.bpExplanation',
        sourceData: 'Earth Stand Test (Day 9 · 121/77 mmHg)',
        thresholdRule: 'Orthostatic check post-return (to be validated by an expert)',
        suggestedActionKey: 'alerts.items.bpAction',
        timestamp: '2026-11-13T06:00:00Z',
        acknowledged: true,
      },
    ],
    measurements: buildPatientMeasurements('p3', 62, 7.6, 36.5, 114, false),
    baselines: {
      blood_pressure_sys: 114,
      blood_pressure_dia: 74,
      heart_rate: 62,
      blood_glucose: 90,
      body_temperature: 36.5,
      sleep: 7.6,
      mood: 8.4,
    },
    boneRiskEstimatePercent: 8.9,
  },
];

export interface AnonymizedAnomalySummary {
  cohortLabel: string;
  countLow: number;
  countMedium: number;
  countHigh: number;
  totalObservations: number;
}

export const ADMIN_ANONYMIZED_ANOMALY_SUMMARY: AnonymizedAnomalySummary[] = [
  { cohortLabel: 'Spaceflight Cohort (> 20 days)', countLow: 11, countMedium: 5, countHigh: 2, totalObservations: 1420 },
  { cohortLabel: 'Earth Analog Cohort', countLow: 7, countMedium: 3, countHigh: 0, totalObservations: 2610 },
  { cohortLabel: 'Post-Return Cohort (0–30 days)', countLow: 6, countMedium: 2, countHigh: 1, totalObservations: 980 },
];
