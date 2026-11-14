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
import {
  canAccessEndOfMissionReport,
  generateEndOfMissionSynthesis,
} from '../lib/healthEngine';
import type { ReportPeriod, ReportSectionData } from '../types/health';
import { StatusBadge } from '../components/shared/StatusBadge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export const ReportsPage: React.FC = () => {
  const { mission, measurements } = useSpaceBio();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  const unlockedEom = canAccessEndOfMissionReport(mission);
  const eomReport = useMemo(
    () => generateEndOfMissionSynthesis(mission, measurements),
    [mission, measurements]
  );

  const handlePdfExport = () => {
    setPdfNotice(t('reports.pdfSuccess'));
    if (typeof window.print === 'function') {
      window.print();
    }
  };

  const renderReportBody = (data: ReportSectionData, isEom: boolean) => (
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
        {data.metricsSnapshot.map((m) => (
          <Card key={m.labelKey}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t(m.labelKey)}
                </span>
                <StatusBadge status={m.status} />
              </div>
              <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-950 dark:text-white">
                {m.value}
              </div>
              <div className="mt-1 font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                {m.baselineDelta} · {t('common.simulatedData')}
              </div>
            </CardContent>
          </Card>
        ))}
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
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-disc pl-4">
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
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-disc pl-4">
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
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-disc pl-4">
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
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chartSeries} margin={{ top: 10, right: 20, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
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
            {!unlockedEom && <Lock className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
            {t('reports.tabs.end_of_mission')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily">{renderReportBody(STATIC_REPORTS.daily, false)}</TabsContent>
        <TabsContent value="weekly">{renderReportBody(STATIC_REPORTS.weekly, false)}</TabsContent>
        <TabsContent value="monthly">{renderReportBody(STATIC_REPORTS.monthly, false)}</TabsContent>
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
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};
