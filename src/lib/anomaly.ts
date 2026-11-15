import type { AnomalyRecord, AnomalySeverity, IndicatorId, MeasurementRecord } from '../types/health.ts';
import { INDICATOR_CONFIGS } from './healthEngine.ts';

const INDICATOR_NAMES: Record<IndicatorId, string> = {
  blood_pressure_sys: 'Blood Pressure (Systolic)',
  blood_pressure_dia: 'Diastolic Pressure',
  heart_rate: 'Heart Rate',
  blood_glucose: 'Blood Glucose',
  body_temperature: 'Body Temperature',
  sleep: 'Sleep Duration',
  mood: 'Mood Score',
};

const SUGGESTED_ACTIONS: Record<IndicatorId, string> = {
  blood_pressure_sys:
    'Repeat a calibrated arm-cuff check after 5 minutes of rest and review hydration/orthostatic logs with the flight surgeon.',
  blood_pressure_dia:
    'Verify with a calibrated arm-cuff measurement and monitor fluid distribution balance.',
  heart_rate:
    'Evaluate resting recovery, sleep debt, and cabin thermal load prior to next high-intensity exercise.',
  blood_glucose:
    'Confirm fasting or post-meal timing, check hydration status, and schedule an additional capillary check.',
  body_temperature:
    'Recheck core temperature in 2 hours, assess hydration, and review environmental cooling airflow.',
  sleep:
    'Protect an uninterrupted 8-hour rest block and review cabin circadian lighting and acoustics.',
  mood:
    'Coordinate behavioral wellness check-in and adjust workload pacing with crew operations.',
};

function severityFromZ(absZ: number): AnomalySeverity {
  if (absZ >= 3.0) return 'high';
  if (absZ >= 2.4) return 'medium';
  return 'low';
}

function meanAndStdDev(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

export function detectAnomalies(
  measurements: MeasurementRecord[],
  options?: { patientId?: string }
): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];
  const indicators: IndicatorId[] = [
    'blood_pressure_sys',
    'heart_rate',
    'blood_glucose',
    'body_temperature',
    'sleep',
    'mood',
  ];

  const dailySeriesByIndicator = new Map<
    IndicatorId,
    { day: number; value: number; record: MeasurementRecord }[]
  >();

  for (const ind of indicators) {
    const byDay = new Map<number, MeasurementRecord[]>();
    for (const rec of measurements) {
      if (rec.indicator !== ind) continue;
      const arr = byDay.get(rec.missionDay) ?? [];
      arr.push(rec);
      byDay.set(rec.missionDay, arr);
    }

    const sortedDays = Array.from(byDay.keys()).sort((a, b) => a - b);
    const series = sortedDays.map((day) => {
      const list = byDay.get(day)!;
      const avg = list.reduce((s, r) => s + r.value, 0) / list.length;
      return { day, value: Number(avg.toFixed(2)), record: list[0] };
    });
    dailySeriesByIndicator.set(ind, series);

    if (series.length < 8) {
      continue;
    }

    const latest = series[series.length - 1];
    const baselineWindow = series
      .slice(Math.max(0, series.length - 15), series.length - 1)
      .filter((pt) => latest.day - pt.day <= 14);

    if (baselineWindow.length < 7) {
      continue;
    }

    const { mean, stdDev } = meanAndStdDev(baselineWindow.map((pt) => pt.value));
    const effectiveStd = Math.max(stdDev, ind === 'body_temperature' ? 0.15 : 0.01);
    const delta = latest.value - mean;
    const zScore = delta / effectiveStd;
    const absZ = Math.abs(zScore);

    if (absZ > 2.0) {
      const cfg = INDICATOR_CONFIGS[ind];
      const sign = delta >= 0 ? '+' : '';
      const precision = ind === 'body_temperature' || ind === 'sleep' ? 1 : 0;
      const deltaFormatted = `${sign}${delta.toFixed(precision)} ${cfg.unit}`;

      anomalies.push({
        id: `anom-${ind}-d${latest.day}`,
        kind: 'single',
        indicatorLabel: INDICATOR_NAMES[ind],
        indicatorId: ind,
        deviationLabel: `${deltaFormatted} (${zScore >= 0 ? '+' : ''}${zScore.toFixed(1)} SD vs 14d baseline)`,
        deltaFormatted,
        zScore: Number(zScore.toFixed(2)),
        periodLabel: `Day ${baselineWindow[0].day}–${latest.day} (14d rolling baseline)`,
        startDay: baselineWindow[0].day,
        endDay: latest.day,
        severity: severityFromZ(absZ),
        sourceData: `${latest.record.source === 'contactless' ? 'Contactless' : 'Manual'} · Day ${latest.day}: ${latest.value} ${cfg.unit} (baseline ${mean.toFixed(precision)} ${cfg.unit}, SD ${effectiveStd.toFixed(2)})`,
        latestValueFormatted: String(latest.value),
        meanFormatted: mean.toFixed(precision),
        sdFormatted: effectiveStd.toFixed(2),
        unit: cfg.unit,
        latestSource: latest.record.source,
        suggestedAction: SUGGESTED_ACTIONS[ind],
        validationNotice: 'Threshold > 2 SD over >= 7 days — to be validated by an expert',
        patientId: options?.patientId,
      });
    }
  }

  const hrSeries = dailySeriesByIndicator.get('heart_rate') ?? [];
  const sleepSeries = dailySeriesByIndicator.get('sleep') ?? [];
  const tempSeries = dailySeriesByIndicator.get('body_temperature') ?? [];

  if (hrSeries.length >= 9 && sleepSeries.length >= 9 && tempSeries.length >= 9) {
    const hrBase = meanAndStdDev(hrSeries.slice(-16, -2).map((d) => d.value));
    const sleepBase = meanAndStdDev(sleepSeries.slice(-16, -2).map((d) => d.value));
    const tempBase = meanAndStdDev(tempSeries.slice(-16, -2).map((d) => d.value));

    const recentHr = hrSeries.slice(-2);
    const recentSleep = sleepSeries.slice(-2);
    const recentTemp = tempSeries.slice(-2);

    const hrElevated = recentHr.every((d) => d.value > hrBase.mean + Math.max(2, hrBase.stdDev));
    const sleepReduced = recentSleep.every(
      (d) => d.value < sleepBase.mean - Math.max(0.5, sleepBase.stdDev)
    );
    const tempElevated = recentTemp.every(
      (d) => d.value > tempBase.mean + Math.max(0.15, tempBase.stdDev)
    );

    if (hrElevated && sleepReduced && tempElevated) {
      const startDay = Math.min(recentHr[0].day, recentSleep[0].day, recentTemp[0].day);
      const endDay = Math.max(recentHr[1].day, recentSleep[1].day, recentTemp[1].day);
      anomalies.push({
        id: `anom-combined-d${endDay}`,
        kind: 'combined',
        indicatorLabel: 'Combined Pattern: Elevated Heart Rate + Reduced Sleep + Elevated Temperature',
        deviationLabel: 'Multi-indicator autonomic & recovery drift (>= 2 consecutive days)',
        zScore: 2.6,
        periodLabel: `Days ${startDay}–${endDay}`,
        startDay,
        endDay,
        severity: 'high',
        sourceData: `HR ${recentHr.map((d) => d.value).join('/')} bpm · Sleep ${recentSleep.map((d) => d.value).join('/')} h · Temp ${recentTemp.map((d) => d.value).join('/')} °C`,
        recentHr: recentHr.map((d) => d.value),
        recentSleep: recentSleep.map((d) => d.value),
        recentTemp: recentTemp.map((d) => d.value),
        suggestedAction:
          'Coordinate prompt flight surgeon review, confirm temperature with calibrated probe, and protect an 8-hour sleep recovery block.',
        validationNotice: 'Multi-indicator drift pattern — to be validated by an expert',
        patientId: options?.patientId,
      });
    }
  }

  const rank: Record<AnomalySeverity, number> = { high: 0, medium: 1, low: 2 };
  return anomalies.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
