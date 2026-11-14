import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  Clock,
  FileText,
  MessageSquare,
  PlusCircle,
  Rocket,
  Thermometer,
} from 'lucide-react';
import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useSpaceBio } from '../context/SpaceBioContext';
import { FORECAST_72H } from '../data/mock';
import { useTranslation } from '../i18n';
import { calculateMissionProgress } from '../lib/healthEngine';
import { AlertCard } from '../components/shared/AlertCard';
import { MetricCard } from '../components/shared/MetricCard';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { DoctorPatientsPage } from './DoctorPatientsPage';
import { LearningNetworkPage } from './LearningNetworkPage';

const MILESTONE_POSITIONS = [
  { key: 'launch', pct: 0 },
  { key: 'adaptation', pct: 25 },
  { key: 'midMission', pct: 50 },
  { key: 'returnPrep', pct: 75 },
  { key: 'landing', pct: 100 },
];

function computeCountdownParts(departureDate: string, plannedDurationDays: number, nowMs: number) {
  const startMs = Date.parse(`${departureDate}T00:00:00Z`);
  const safeStart = Number.isFinite(startMs) ? startMs : nowMs;
  const targetMs = safeStart + Math.max(1, plannedDurationDays) * 86400000;
  const remainingMs = Math.max(0, targetMs - nowMs);
  const totalSec = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return {
    days,
    hours,
    minutes,
    seconds,
    reachedZero: remainingMs === 0,
    targetDateIso: new Date(targetMs).toISOString().slice(0, 10),
  };
}

export const DashboardPage: React.FC = () => {
  const {
    isGuest,
    role,
    effectiveMode,
    earthSiteEnvironment,
    mission,
    dailyMetrics,
    alerts,
    acknowledgeAlert,
    profile,
  } = useSpaceBio();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (mq) {
      setReducedMotion(mq.matches);
      const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    return undefined;
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (role === 'doctor') {
    return <DoctorPatientsPage />;
  }
  if (role === 'admin') {
    return <LearningNetworkPage section="overview" />;
  }

  const progress = calculateMissionProgress(mission);
  const countdown = computeCountdownParts(
    mission.departureDate,
    mission.plannedDurationDays,
    nowMs
  );

  const forecastData = FORECAST_72H.map((pt) => ({
    ...pt,
    bandBase: pt.lowerBound,
    bandSpan: Number((pt.upperBound - pt.lowerBound).toFixed(2)),
  }));

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.2 }}
      className="space-y-6"
    >
      {/* Page Title & Shortcuts Row */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white text-balance">
            {t('dashboard.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t('dashboard.subtitle')} · {profile.fullName} ({profile.age}y)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button type="button" size="sm" onClick={() => navigate('/measurements')}>
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            <span>{t('dashboard.shortcutNewMeasurement')}</span>
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => navigate('/chat')}>
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span>{t('dashboard.shortcutOpenChat')}</span>
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => navigate('/reports')}>
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>{t('dashboard.shortcutViewReport')}</span>
          </Button>
        </div>
      </div>

      {/* Earth mode returning-astronaut environmental summary */}
      {effectiveMode === 'earth' && (
        <Card className="border-emerald-500/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                <Thermometer className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  {earthSiteEnvironment.siteName} · {t('common.earthMode')}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {t('doctor.returningFocus')}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono-tabular">
              <span>{t('header.tempLabel')}: {earthSiteEnvironment.temperatureC} °C</span>
              <span>{t('header.humidityLabel')}: {earthSiteEnvironment.humidityPercent}%</span>
              <span>{t('header.heatIndexLabel')}: {earthSiteEnvironment.heatIndexC} °C</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mission Banner + Live Countdown */}
      <Card>
        <CardContent className="p-5 space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  effectiveMode === 'space'
                    ? 'bg-cyan-500/15 text-cyan-500'
                    : 'bg-emerald-500/15 text-emerald-500'
                }`}
              >
                <Rocket className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                    {mission.name}
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    · {effectiveMode === 'space' ? t('common.spaceMode') : t('common.earthMode')} ·{' '}
                    {t('common.simulatedData')}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300 font-mono-tabular">
                  <span>
                    {t('common.day')} {mission.currentDay}
                  </span>
                  <span>
                    {t('dashboard.missionBanner.planned')}: {mission.plannedDurationDays}{' '}
                    {t('common.days')}
                  </span>
                  <span>
                    {t('dashboard.missionBanner.actual')}:{' '}
                    {mission.actualDurationDays
                      ? `${mission.actualDurationDays} ${t('common.days')}`
                      : t('dashboard.missionBanner.pendingReturn')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-baseline gap-2 font-mono-tabular">
              <span
                className={`text-3xl font-bold ${
                  effectiveMode === 'space'
                    ? 'text-cyan-700 dark:text-cyan-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {progress.percentComplete}%
              </span>
              <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('dashboard.missionBanner.complete')}
              </span>
            </div>
          </div>

          {/* Live Countdown Block */}
          <div
            data-testid="mission-countdown"
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#0d162d]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <Clock className="h-4 w-4 text-cyan-500" aria-hidden="true" />
                <span>{t('countdown.title')}</span>
              </div>
              <span className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                {t('countdown.targetReturn')}: {countdown.targetDateIso}
              </span>
            </div>

            {countdown.reachedZero && !mission.actualDurationDays ? (
              <div
                role="status"
                className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm font-medium text-amber-950 dark:text-amber-200"
              >
                <span>{t('countdown.reachedBanner')}</span>
                <Button type="button" size="sm" variant="amber" onClick={() => navigate('/mission')}>
                  {t('countdown.goToMission')}
                </Button>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-4">
                {[
                  { val: countdown.days, label: t('countdown.days') },
                  { val: String(countdown.hours).padStart(2, '0'), label: t('countdown.hours') },
                  { val: String(countdown.minutes).padStart(2, '0'), label: t('countdown.minutes') },
                  { val: String(countdown.seconds).padStart(2, '0'), label: t('countdown.seconds') },
                ].map((cell) => (
                  <div
                    key={cell.label}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center dark:border-slate-800 dark:bg-[#0a1226]"
                  >
                    <div className="font-mono-tabular text-xl sm:text-2xl font-bold text-slate-950 dark:text-white">
                      {cell.val}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {cell.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Progress Bar with Milestones (25%, 50%, 75%) */}
          <div>
            <div
              role="progressbar"
              aria-valuenow={progress.percentComplete}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${mission.name} ${progress.percentComplete}% ${t('dashboard.missionBanner.complete')}`}
              className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
            >
              <div
                className={`h-full rounded-full ${
                  effectiveMode === 'space'
                    ? 'bg-gradient-to-r from-cyan-500 to-violet-500'
                    : 'bg-gradient-to-r from-emerald-500 to-sky-500'
                }`}
                style={{
                  width: `${progress.percentComplete}%`,
                  transition: reducedMotion ? 'none' : 'width 300ms ease',
                }}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-5">
              {MILESTONE_POSITIONS.map((ms) => {
                const reached = progress.completedMilestones.includes(ms.key);
                return (
                  <div
                    key={ms.key}
                    className={`flex items-center gap-1.5 ${
                      reached
                        ? 'font-medium text-cyan-800 dark:text-cyan-300'
                        : 'text-slate-500 dark:text-slate-500'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        reached ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    />
                    <span className="truncate">
                      {t(`dashboard.missionBanner.milestones.${ms.key}`)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6 Daily Metric Cards */}
      <section aria-label="Daily biometric indicators">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dailyMetrics.map((metric) => (
            <MetricCard
              key={metric.id}
              metric={metric}
              onSelect={() => navigate(`/trends?indicator=${metric.id}`)}
            />
          ))}
        </div>
      </section>

      {/* Bottom Split: Alerts Panel + 72-Hour Forecast */}
      <div className="grid gap-6 lg:grid-cols-12 items-stretch">
        <Card className="lg:col-span-6 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>{t('dashboard.alertsTitle')}</CardTitle>
              <CardDescription>{t('common.simulatedData')}</CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/anomalies')}
            >
              <span>{t('nav.anomalies')}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            {alerts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {t('dashboard.alertsEmpty')}
              </div>
            ) : (
              alerts.map((al) => (
                <AlertCard
                  key={al.id}
                  alert={al}
                  onAcknowledge={isGuest ? undefined : acknowledgeAlert}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-6 flex flex-col">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>{t('dashboard.forecastTitle')}</CardTitle>
                <CardDescription>
                  {t('dashboard.forecastSubtitle')} · {t('common.simulatedData')}
                </CardDescription>
              </div>
              <Activity className="h-5 w-5 text-cyan-500 shrink-0" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-start gap-4">
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-950 dark:text-amber-200">
              {t('dashboard.forecastSummary')}
            </p>

            <div className="h-64 w-full" aria-label={t('dashboard.forecastTitle')}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecastData} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                  <XAxis
                    dataKey="hourLabel"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(148,163,184,0.25)' }}
                  />
                  <YAxis
                    domain={[64, 76]}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(148,163,184,0.25)' }}
                    unit=" bpm"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.94)',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                    formatter={(val: unknown, name?: string | number) => {
                      if (name === 'bandBase') return ['', ''];
                      if (name === t('dashboard.forecastBand')) {
                        return [`±${(Number(val) / 2).toFixed(1)} bpm`, t('dashboard.forecastBand')];
                      }
                      return [`${val} bpm`, t('dashboard.forecastPredicted')];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="bandBase"
                    stackId="band"
                    stroke="none"
                    fill="transparent"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="bandSpan"
                    stackId="band"
                    stroke="none"
                    fill="#06b6d4"
                    fillOpacity={0.22}
                    name={t('dashboard.forecastBand')}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#22d3ee"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#22d3ee' }}
                    name={t('dashboard.forecastPredicted')}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-5 bg-cyan-400" aria-hidden="true" />
                <span>{t('dashboard.forecastPredicted')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-5 rounded-sm bg-cyan-500/25 border border-cyan-500/40" aria-hidden="true" />
                <span>{t('dashboard.forecastBand')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};
