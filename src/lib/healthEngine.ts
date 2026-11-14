import type {
  AlertSeverity,
  HealthAlert,
  IndicatorId,
  MeasurementRecord,
  MeasurementSource,
  MissionState,
  ReportSectionData,
  StatusLevel,
} from '../types/health';

export interface IndicatorConfig {
  id: IndicatorId;
  unit: string;
  minValid: number;
  maxValid: number;
  refMin: number;
  refMax: number;
  watchMargin: number;
}

export const INDICATOR_CONFIGS: Record<IndicatorId, IndicatorConfig> = {
  blood_pressure_sys: {
    id: 'blood_pressure_sys',
    unit: 'mmHg',
    minValid: 65,
    maxValid: 220,
    refMin: 95,
    refMax: 130,
    watchMargin: 10,
  },
  blood_pressure_dia: {
    id: 'blood_pressure_dia',
    unit: 'mmHg',
    minValid: 40,
    maxValid: 140,
    refMin: 60,
    refMax: 85,
    watchMargin: 7,
  },
  heart_rate: {
    id: 'heart_rate',
    unit: 'bpm',
    minValid: 32,
    maxValid: 205,
    refMin: 52,
    refMax: 90,
    watchMargin: 12,
  },
  blood_glucose: {
    id: 'blood_glucose',
    unit: 'mg/dL',
    minValid: 45,
    maxValid: 350,
    refMin: 72,
    refMax: 110,
    watchMargin: 16,
  },
  body_temperature: {
    id: 'body_temperature',
    unit: '°C',
    minValid: 34.0,
    maxValid: 41.5,
    refMin: 36.1,
    refMax: 37.4,
    watchMargin: 0.5,
  },
  sleep: {
    id: 'sleep',
    unit: 'h',
    minValid: 0,
    maxValid: 16,
    refMin: 6.5,
    refMax: 9.0,
    watchMargin: 1.0,
  },
  mood: {
    id: 'mood',
    unit: '/10',
    minValid: 1,
    maxValid: 10,
    refMin: 6,
    refMax: 10,
    watchMargin: 2,
  },
};

export function evaluateIndicatorStatus(indicator: IndicatorId, value: number): StatusLevel {
  const cfg = INDICATOR_CONFIGS[indicator];
  if (value >= cfg.refMin && value <= cfg.refMax) {
    return 'nominal';
  }
  if (value >= cfg.refMin - cfg.watchMargin && value <= cfg.refMax + cfg.watchMargin) {
    return 'watch';
  }
  return 'alert';
}

export function validateMeasurementInput(
  indicator: IndicatorId,
  value: number,
  secondaryValue?: number
): { valid: boolean; errorKey?: string } {
  if (!Number.isFinite(value)) {
    return { valid: false, errorKey: 'measurements.errors.invalidNumber' };
  }
  const cfg = INDICATOR_CONFIGS[indicator];
  if (value < cfg.minValid || value > cfg.maxValid) {
    return { valid: false, errorKey: 'measurements.errors.outOfBounds' };
  }
  if (indicator === 'blood_pressure_sys' && secondaryValue !== undefined) {
    const diaCfg = INDICATOR_CONFIGS.blood_pressure_dia;
    if (!Number.isFinite(secondaryValue) || secondaryValue < diaCfg.minValid || secondaryValue > diaCfg.maxValid) {
      return { valid: false, errorKey: 'measurements.errors.invalidDiastolic' };
    }
    if (secondaryValue >= value) {
      return { valid: false, errorKey: 'measurements.errors.diastolicAboveSystolic' };
    }
  }
  return { valid: true };
}

export function createMeasurementRecord(params: {
  id: string;
  indicator: IndicatorId;
  value: number;
  secondaryValue?: number;
  source: MeasurementSource;
  confidence: number;
  missionDay: number;
  timestamp: string;
  notes?: string;
}): MeasurementRecord {
  const cfg = INDICATOR_CONFIGS[params.indicator];
  // Rule: Camera-estimated (contactless) blood pressure is ALWAYS marked indicative.
  const isIndicativeBp =
    params.source === 'contactless' &&
    (params.indicator === 'blood_pressure_sys' || params.indicator === 'blood_pressure_dia');

  return {
    id: params.id,
    indicator: params.indicator,
    value: Number(params.value.toFixed(params.indicator === 'body_temperature' || params.indicator === 'sleep' ? 1 : 0)),
    secondaryValue: params.secondaryValue !== undefined ? Math.round(params.secondaryValue) : undefined,
    unit: cfg.unit,
    timestamp: params.timestamp,
    missionDay: params.missionDay,
    confidence: Math.max(40, Math.min(100, Math.round(params.confidence))),
    source: params.source,
    indicative: isIndicativeBp,
    notes: params.notes?.trim() || undefined,
  };
}

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function sortAlertsBySeverity(alerts: HealthAlert[]): HealthAlert[] {
  return [...alerts].sort((a, b) => {
    const rankDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

export function calculateMissionProgress(mission: MissionState): {
  effectiveDurationDays: number;
  percentComplete: number;
  completedMilestones: string[];
} {
  const effectiveDuration =
    mission.actualDurationDays && mission.actualDurationDays > 0
      ? mission.actualDurationDays
      : Math.max(1, mission.plannedDurationDays);

  const activeDay =
    mission.actualDurationDays && mission.actualDurationDays > 0
      ? mission.actualDurationDays
      : mission.currentDay;

  const rawPercent = (activeDay / effectiveDuration) * 100;
  const percentComplete = Math.max(0, Math.min(100, Math.round(rawPercent)));

  const completedMilestones: string[] = ['launch'];
  if (percentComplete >= 25) completedMilestones.push('adaptation');
  if (percentComplete >= 50) completedMilestones.push('midMission');
  if (percentComplete >= 75) completedMilestones.push('returnPrep');
  if (mission.actualDurationDays !== null) completedMilestones.push('landing');

  return {
    effectiveDurationDays: effectiveDuration,
    percentComplete,
    completedMilestones,
  };
}

export function canAccessEndOfMissionReport(mission: MissionState): boolean {
  return mission.actualDurationDays !== null && mission.actualDurationDays > 0;
}

export function generateEndOfMissionSynthesis(
  mission: MissionState,
  measurements: MeasurementRecord[]
): ReportSectionData | null {
  if (!canAccessEndOfMissionReport(mission)) {
    return null;
  }

  const hrValues = measurements.filter((m) => m.indicator === 'heart_rate').map((m) => m.value);
  const avgHr = hrValues.length ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : 68;
  const sleepValues = measurements.filter((m) => m.indicator === 'sleep').map((m) => m.value);
  const avgSleep = sleepValues.length
    ? Number((sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length).toFixed(1))
    : 6.7;

  return {
    period: 'end_of_mission',
    generatedAt: new Date().toISOString(),
    headlineKey: 'reports.endOfMission.headline',
    strengthKeys: [
      'reports.endOfMission.strength1',
      'reports.endOfMission.strength2',
    ],
    watchPointKeys: [
      'reports.endOfMission.watch1',
      'reports.endOfMission.watch2',
    ],
    actionKeys: [
      'reports.endOfMission.action1',
      'reports.endOfMission.action2',
    ],
    metricsSnapshot: [
      {
        labelKey: 'mission.actualDuration',
        value: `${mission.actualDurationDays} d`,
        baselineDelta: `${mission.actualDurationDays! - mission.plannedDurationDays >= 0 ? '+' : ''}${mission.actualDurationDays! - mission.plannedDurationDays} d vs planned`,
        status: 'nominal',
      },
      {
        labelKey: 'indicators.heart_rate',
        value: `${avgHr} bpm`,
        baselineDelta: '+3 bpm vs pre-flight',
        status: evaluateIndicatorStatus('heart_rate', avgHr),
      },
      {
        labelKey: 'indicators.sleep',
        value: `${avgSleep} h`,
        baselineDelta: '-0.6 h vs pre-flight',
        status: evaluateIndicatorStatus('sleep', avgSleep),
      },
    ],
    chartSeries: [
      { label: 'Launch', value: 64, baseline: 64 },
      { label: 'Quarter', value: 69, baseline: 64 },
      { label: 'Mid', value: 71, baseline: 64 },
      { label: 'Late', value: 68, baseline: 64 },
      { label: 'Return', value: avgHr, baseline: 64 },
    ],
  };
}

export function formatTrendsCsv(
  indicator: IndicatorId,
  rows: { date: string; value: number; baseline: number; lower: number; upper: number }[]
): string {
  const cfg = INDICATOR_CONFIGS[indicator];
  const header = `date,indicator,unit,value,personal_baseline,uncertainty_low,uncertainty_high,simulated_data`;
  const lines = rows.map(
    (r) => `${r.date},${indicator},${cfg.unit},${r.value},${r.baseline},${r.lower},${r.upper},true`
  );
  return [header, ...lines].join('\n');
}
