import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Download } from 'lucide-react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSpaceBio } from '../context/SpaceBioContext';
import { useTranslation } from '../i18n';
import { formatLocaleNumber } from '../i18n/format';
import { formatTrendsCsv, INDICATOR_CONFIGS } from '../lib/healthEngine';
import type { IndicatorId } from '../types/health';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label, Select } from '../components/ui/input';
import { Switch } from '../components/ui/switch';

const TREND_INDICATORS: IndicatorId[] = [
  'blood_pressure_sys',
  'heart_rate',
  'blood_glucose',
  'body_temperature',
  'sleep',
  'mood',
];

export const TrendsPage: React.FC = () => {
  const { measurements, profile, mission } = useSpaceBio();
  const { t, language } = useTranslation();
  const [searchParams] = useSearchParams();

  const initialInd = (searchParams.get('indicator') as IndicatorId) || 'heart_rate';
  const [indicator, setIndicator] = useState<IndicatorId>(
    TREND_INDICATORS.includes(initialInd) ? initialInd : 'heart_rate'
  );
  const [chartMode, setChartMode] = useState<'line' | 'area' | 'bar'>('area');
  const [period, setPeriod] = useState<'7d' | '30d' | 'mission'>('30d');
  const [showBaseline, setShowBaseline] = useState<boolean>(true);

  const cfg = INDICATOR_CONFIGS[indicator];
  const baseline = profile.baselines[indicator];

  const series = useMemo(() => {
    const matching = measurements.filter((m) => m.indicator === indicator);
    const byDay = new Map<number, number[]>();
    matching.forEach((m) => {
      const arr = byDay.get(m.missionDay) || [];
      arr.push(m.value);
      byDay.set(m.missionDay, arr);
    });

    const days = Array.from(byDay.keys()).sort((a, b) => a - b);
    const cutoff =
      period === '7d' ? mission.currentDay - 6 : period === '30d' ? mission.currentDay - 29 : 1;

    return days
      .filter((d) => d >= cutoff)
      .map((d) => {
        const vals = byDay.get(d)!;
        const avg = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
        const margin = indicator === 'body_temperature' ? 0.3 : indicator === 'sleep' ? 0.6 : 4;
        const lower = Number((avg - margin).toFixed(1));
        const upper = Number((avg + margin).toFixed(1));
        return {
          dayLabel: `${t('common.dayShort')}${formatLocaleNumber(d, language)}`,
          date: `2026-10-${String(Math.min(30, 15 + d)).padStart(2, '0')}`,
          value: avg,
          baseline,
          lower,
          upper,
          bandSpan: Number((upper - lower).toFixed(1)),
        };
      });
  }, [measurements, indicator, period, mission.currentDay, baseline, t, language]);

  const handleExportCsv = () => {
    const csv = formatTrendsCsv(indicator, series);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spacebio-${indicator}-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            {t('trends.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t('trends.subtitle')} · {t('common.simulatedData')}
          </p>
        </div>

        <Button type="button" variant="outline" onClick={handleExportCsv}>
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>{t('common.exportCsv')}</span>
        </Button>
      </div>

      {/* Controls Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <Label htmlFor="trend-indicator" className="text-xs">
                {t('measurements.indicatorLabel')}
              </Label>
              <Select
                id="trend-indicator"
                value={indicator}
                onChange={(e) => setIndicator(e.target.value as IndicatorId)}
                className="h-9 w-48 text-xs"
              >
                {TREND_INDICATORS.map((id) => (
                  <option key={id} value={id}>
                    {t(`indicators.${id}`)} ({INDICATOR_CONFIGS[id].unit})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('measurements.filterPeriod')}
              </span>
              <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-900">
                {(['7d', '30d', 'mission'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      period === p
                        ? 'bg-white text-slate-950 shadow-sm dark:bg-cyan-500/20 dark:text-cyan-200'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {p === '7d'
                      ? t('trends.period7d')
                      : p === '30d'
                      ? t('trends.period30d')
                      : t('trends.periodMission')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('trends.chartMode')}
              </span>
              <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-900">
                {(['line', 'area', 'bar'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setChartMode(m)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      chartMode === m
                        ? 'bg-white text-slate-950 shadow-sm dark:bg-cyan-500/20 dark:text-cyan-200'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {m === 'line'
                      ? t('trends.modeLine')
                      : m === 'area'
                      ? t('trends.modeArea')
                      : t('trends.modeBar')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Switch
              id="baseline-toggle"
              checked={showBaseline}
              onCheckedChange={setShowBaseline}
            />
            <Label htmlFor="baseline-toggle" className="text-xs cursor-pointer">
              {t('trends.showBaseline')} (
              <span dir="ltr">
                {formatLocaleNumber(baseline, language)} {cfg.unit}
              </span>
              )
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Main Chart Card */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t(`indicators.${indicator}`)} ({cfg.unit})
          </CardTitle>
          <CardDescription>
            {t('common.simulatedData')} · {t('dashboard.referenceRange')}:{' '}
            <span dir="ltr">
              {formatLocaleNumber(cfg.refMin, language)}–{formatLocaleNumber(cfg.refMax, language)} {cfg.unit}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {series.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">{t('trends.noTrendData')}</div>
          ) : (
            <div className="h-80 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'line' ? (
                  <LineChart data={series} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="dayLabel" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.94)',
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    {showBaseline && (
                      <ReferenceLine
                        y={baseline}
                        stroke="#f59e0b"
                        strokeDasharray="5 5"
                        label={{
                          value: `${t('dashboard.baseline')}: ${formatLocaleNumber(baseline, language)}`,
                          fill: '#f59e0b',
                          fontSize: 11,
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#22d3ee"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#22d3ee' }}
                      name={t('trends.valueLegend')}
                      isAnimationActive={false}
                    />
                  </LineChart>
                ) : chartMode === 'area' ? (
                  <ComposedChart data={series} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="dayLabel" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.94)',
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="lower"
                      stackId="env"
                      stroke="none"
                      fill="transparent"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="bandSpan"
                      stackId="env"
                      stroke="none"
                      fill="#06b6d4"
                      fillOpacity={0.22}
                      name={t('trends.bandLegend')}
                      isAnimationActive={false}
                    />
                    {showBaseline && (
                      <ReferenceLine
                        y={baseline}
                        stroke="#f59e0b"
                        strokeDasharray="5 5"
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#22d3ee"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#22d3ee' }}
                      name={t('trends.valueLegend')}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                ) : (
                  <BarChart data={series} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="dayLabel" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.94)',
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    {showBaseline && (
                      <ReferenceLine y={baseline} stroke="#f59e0b" strokeDasharray="5 5" />
                    )}
                    <Bar
                      dataKey="value"
                      fill="#06b6d4"
                      radius={[4, 4, 0, 0]}
                      name={t('trends.valueLegend')}
                      isAnimationActive={false}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
