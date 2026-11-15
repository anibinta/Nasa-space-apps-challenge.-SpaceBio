import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { FileDown, Lock, ArrowRight } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSpaceBio } from '../context/SpaceBioContext';
import { STATIC_REPORTS } from '../data/simulatedData';
import { useTranslation } from '../i18n';
import { formatLocaleNumber, interpolateTemplate } from '../i18n/format';
import {
  canAccessEndOfMissionReport,
  generateEndOfMissionSynthesis,
} from '../lib/healthEngine';
import type { OperationalMode, ReportPeriod, ReportSectionData } from '../types/health';
import { StatusBadge } from '../components/shared/StatusBadge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

function adaptStaticReportKey(key: string, mode: OperationalMode): string {
  if (mode !== 'earth') return key;
  return key
    .replace(/^reports\.daily\./, 'reports.dailyEarth.')
    .replace(/^reports\.weekly\./, 'reports.weeklyEarth.')
    .replace(/^reports\.monthly\./, 'reports.monthlyEarth.');
}

function adaptStaticReportForMode(
  report: ReportSectionData,
  mode: OperationalMode
): ReportSectionData {
  if (mode !== 'earth') return report;
  return {
    ...report,
    headlineKey: adaptStaticReportKey(report.headlineKey, mode),
    strengthKeys: report.strengthKeys.map((k) => adaptStaticReportKey(k, mode)),
    watchPointKeys: report.watchPointKeys.map((k) => adaptStaticReportKey(k, mode)),
    actionKeys: report.actionKeys.map((k) => adaptStaticReportKey(k, mode)),
    metricsSnapshot: report.metricsSnapshot.map((m) => ({
      ...m,
      labelKey: m.labelKey === 'bone.resistiveLabel' ? 'bone.resistiveLabelEarth' : m.labelKey,
    })),
  };
}

export const ReportsPage: React.FC = () => {
  const { mission, effectiveMode, measurements } = useSpaceBio();
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  const unlockedEom = canAccessEndOfMissionReport(mission);
  const eomReport = useMemo(
    () => generateEndOfMissionSynthesis({ ...mission, mode: effectiveMode }, measurements),
    [mission, effectiveMode, measurements]
  );

  const dailyReport = useMemo(
    () => adaptStaticReportForMode(STATIC_REPORTS.daily, effectiveMode),
    [effectiveMode]
  );
  const weeklyReport = useMemo(
    () => adaptStaticReportForMode(STATIC_REPORTS.weekly, effectiveMode),
    [effectiveMode]
  );
  const monthlyReport = useMemo(
    () => adaptStaticReportForMode(STATIC_REPORTS.monthly, effectiveMode),
    [effectiveMode]
  );

  const handlePdfExport = () => {
    setPdfNotice(t('reports.pdfSuccess'));
    if (typeof window.print === 'function') {
      window.print();
    }
  };

  const renderReportBody = (data: ReportSectionData, isEom: boolean) => {
    const localizedSeries = data.chartSeries.map((pt) => ({
      ...pt,
      displayLabel: pt.labelKey
        ? t(pt.labelKey)
        : pt.dayNum !== undefined
          ? `${t('common.dayShort')}${formatLocaleNumber(pt.dayNum, language)}`
          : pt.weekNum !== undefined
            ? `${t('reports.chartLabels.weekShort')} ${formatLocaleNumber(pt.weekNum, language)}`
            : pt.label,
    }));

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardDescription>{t('common.simulatedData')}</CardDescription>
              <CardTitle className="text-lg leading-snug text-balance">
                {t(data.headlineKey)}
              </CardTitle>
            </div>
            {isEom && (
              <Button type="button" onClick={handlePdfExport}>
                <FileDown className="h-4 w-4" aria-hidden="true" />
                <span>{t('common.exportPdf')}</span>
              </Button>
            )}
          </CardHeader>
          {pdfNotice && isEom && (
            <CardContent className="pt-0">
              <div className="rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-800 dark:text-cyan-200">
                {pdfNotice}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Key Metrics */}
        <div className="grid gap-4 sm:grid-cols-3">
          {data.metricsSnapshot.map((m) => {
            const unitLabel = m.unit
              ? m.unit === 'days'
                ? t('common.days')
                : m.unit.startsWith('reports.')
                  ? t(m.unit)
                  : m.unit
              : '';
            const formattedValue =
              m.rawValue !== undefined
                ? `${formatLocaleNumber(m.rawValue, language)}${unitLabel ? ` ${unitLabel}` : ''}`
                : m.value;
            const formattedDelta = m.baselineDeltaKey
              ? interpolateTemplate(t(m.baselineDeltaKey), m.baselineDeltaParams ?? {})
              : m.baselineDelta;

            return (
              <Card key={m.labelKey}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {t(m.labelKey)}
                    </span>
                    <StatusBadge status={m.status} />
                  </div>
                  <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-950 dark:text-white" dir="ltr">
                    {formattedValue}
                  </div>
                  <div className="mt-1 font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                    {formattedDelta} · {t('common.simulatedData')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Strengths / Watch Points / Suggested Actions */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-emerald-700 dark:text-emerald-300">
                {t('reports.strengths')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-disc ps-4">
                {data.strengthKeys.map((k) => (
                  <li key={k}>{t(k)}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-amber-700 dark:text-amber-300">
                {t('reports.watchPoints')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-disc ps-4">
                {data.watchPointKeys.map((k) => (
                  <li key={k}>{t(k)}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-cyan-700 dark:text-cyan-300">
                {t('reports.suggestedActions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-disc ps-4">
                {data.actionKeys.map((k) => (
                  <li key={k}>{t(k)}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Trajectory Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('reports.trajectoryChart')}</CardTitle>
            <CardDescription>
              {t('indicators.heart_rate')} (bpm) · {t('common.simulatedData')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={localizedSeries} margin={{ top: 10, right: 20, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                  <XAxis dataKey="displayLabel" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis domain={[54, 78]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.94)',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  <ReferenceLine y={64} stroke="#f59e0b" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={t('indicators.heart_rate')}
                    stroke="#22d3ee"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#22d3ee' }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          {t('reports.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t('reports.subtitle')} · {t('common.simulatedData')}
        </p>
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="daily">{t('reports.tabs.daily')}</TabsTrigger>
          <TabsTrigger value="weekly">{t('reports.tabs.weekly')}</TabsTrigger>
          <TabsTrigger value="monthly">{t('reports.tabs.monthly')}</TabsTrigger>
          <TabsTrigger value="end_of_mission">
            {!unlockedEom && <Lock className="me-1.5 h-3.5 w-3.5" aria-hidden="true" />}
            {t('reports.tabs.end_of_mission')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily">{renderReportBody(dailyReport, false)}</TabsContent>
        <TabsContent value="weekly">{renderReportBody(weeklyReport, false)}</TabsContent>
        <TabsContent value="monthly">{renderReportBody(monthlyReport, false)}</TabsContent>
        <TabsContent value="end_of_mission">
          {unlockedEom && eomReport ? (
            renderReportBody(eomReport, true)
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
                  <Lock className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="max-w-md space-y-1.5">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {t('reports.lockedTitle')}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t('reports.lockedDesc')}
                  </p>
                </div>
                <Button type="button" onClick={() => navigate('/mission')}>
                  <span>{t('reports.goToMission')}</span>
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

