import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Brain,
  Clock,
  PlusCircle,
  Radio,
  Rocket,
  Thermometer,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSpaceBio } from '../context/SpaceBioContext';
import { useTranslation } from '../i18n';
import {
  buildMiniSparklinePath,
  evaluateVitalCardStatus,
  extractSevenDayTrend,
} from '../lib/bodyMonitor';
import { calculateMissionProgress } from '../lib/healthEngine';
import { StatusBadge } from '../components/shared/StatusBadge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  };
}

export const DashboardPage: React.FC = () => {
  const {
    role,
    effectiveMode,
    earthSiteEnvironment,
    mission,
    measurements,
    dailyMetrics,
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

  const vitalsSnapshot = useMemo(() => {
    const hrMetric = dailyMetrics.find((m) => m.id === 'heart_rate');
    const tempMetric = dailyMetrics.find((m) => m.id === 'body_temperature');
    const bpMetric = dailyMetrics.find((m) => m.id === 'blood_pressure_sys');

    const heartRateBpm = hrMetric ? Math.round(hrMetric.value) : 68;
    const spO2Percent = 98;
    const temperatureC = tempMetric ? Number(tempMetric.value.toFixed(1)) : 36.7;
    const systolicBp = bpMetric ? Math.round(bpMetric.value) : 134;
    const diastolicBp = bpMetric?.secondaryValue ? Math.round(bpMetric.secondaryValue) : 84;

    return {
      heartRateBpm,
      spO2Percent,
      temperatureC,
      systolicBp,
      diastolicBp,
      hrTrend: extractSevenDayTrend(measurements, 'heart_rate', [65, 66, 64, 67, 68, 67, heartRateBpm]),
      spO2Trend: [98, 98, 97, 98, 99, 98, spO2Percent],
      tempTrend: extractSevenDayTrend(
        measurements,
        'body_temperature',
        [36.5, 36.6, 36.7, 36.6, 36.7, 36.8, temperatureC]
      ),
      bpTrend: extractSevenDayTrend(
        measurements,
        'blood_pressure_sys',
        [118, 121, 124, 126, 129, 131, systolicBp]
      ),
    };
  }, [dailyMetrics, measurements]);

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
  const utcClock = new Date(nowMs).toISOString().slice(11, 19);

  const vitalCards = [
    {
      id: 'heart_rate',
      label: t('indicators.heart_rate'),
      value: `${vitalsSnapshot.heartRateBpm} bpm`,
      refRange: t('dashboard.vitalCards.hrRef'),
      status: evaluateVitalCardStatus('heart_rate', vitalsSnapshot.heartRateBpm),
      trend: vitalsSnapshot.hrTrend,
      accent: '#34d399',
    },
    {
      id: 'spo2',
      label: t('dashboard.monitor.spO2'),
      value: `${vitalsSnapshot.spO2Percent}%`,
      refRange: t('dashboard.vitalCards.spO2Ref'),
      status: evaluateVitalCardStatus('spo2', vitalsSnapshot.spO2Percent),
      trend: vitalsSnapshot.spO2Trend,
      accent: '#38bdf8',
    },
    {
      id: 'body_temperature',
      label: t('indicators.body_temperature'),
      value: `${vitalsSnapshot.temperatureC} °C`,
      refRange: t('dashboard.vitalCards.tempRef'),
      status: evaluateVitalCardStatus('body_temperature', vitalsSnapshot.temperatureC),
      trend: vitalsSnapshot.tempTrend,
      accent: '#38bdf8',
    },
    {
      id: 'blood_pressure_sys',
      label: t('indicators.blood_pressure_sys'),
      value: `${vitalsSnapshot.systolicBp}/${vitalsSnapshot.diastolicBp} mmHg`,
      refRange: t('dashboard.vitalCards.bpRef'),
      status: evaluateVitalCardStatus('blood_pressure_sys', vitalsSnapshot.systolicBp),
      trend: vitalsSnapshot.bpTrend,
      accent: vitalsSnapshot.systolicBp > 130 ? '#f59e0b' : '#34d399',
    },
  ];

  const vitalsBarData = [
    {
      key: 'FC',
      pct: Math.min(100, Math.round((vitalsSnapshot.heartRateBpm / 130) * 100)),
      raw: `${vitalsSnapshot.heartRateBpm} bpm`,
    },
    {
      key: 'SpO2',
      pct: vitalsSnapshot.spO2Percent,
      raw: `${vitalsSnapshot.spO2Percent}%`,
    },
    {
      key: 'Temp',
      pct: Math.min(100, Math.max(20, Math.round(((vitalsSnapshot.temperatureC - 35) / 4) * 100))),
      raw: `${vitalsSnapshot.temperatureC} °C`,
    },
    {
      key: 'TA',
      pct: Math.min(100, Math.round((vitalsSnapshot.systolicBp / 160) * 100)),
      raw: `${vitalsSnapshot.systolicBp}/${vitalsSnapshot.diastolicBp}`,
    },
  ];

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.2 }}
      className="space-y-6"
    >
      {/* Full-Width Hero Mission Card */}
      <Card data-testid="mission-hero-card">
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/15 text-cyan-400">
                <Rocket className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
                    {mission.name}
                  </h1>
                  <span className="rounded border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 font-mono-tabular text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                    {t('common.day')} {progress.currentDay}/{mission.plannedDurationDays}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    · {profile.fullName} · {t('common.simulatedData')}
                  </span>
                </div>

                {/* UTC Mission Clock & Communication Delay (or Earth Site) */}
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-mono-tabular">
                  {effectiveMode === 'space' ? (
                    <div
                      data-testid="mission-clock-delay"
                      className="flex flex-wrap items-center gap-x-5 gap-y-1 text-cyan-700 dark:text-cyan-300"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {t('header.missionClock')}: <span dir="ltr">{utcClock} UTC</span>
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Radio className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                        <span>{t('header.commDelay')}</span>
                      </span>
                    </div>
                  ) : (
                    <div
                      data-testid="earth-mode-environment"
                      className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300"
                    >
                      <Thermometer className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {earthSiteEnvironment.siteName} ·{' '}
                        <span dir="ltr">
                          {earthSiteEnvironment.temperatureC}°C · {earthSiteEnvironment.humidityPercent}% RH
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Completion % + Single Primary Action: Nouvelle mesure */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-baseline gap-1.5 font-mono-tabular">
                <span className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                  {progress.percentComplete}%
                </span>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('dashboard.missionBanner.complete')}
                </span>
              </div>

              <Button
                type="button"
                size="sm"
                data-testid="hero-new-measurement-btn"
                onClick={() => navigate('/measurements')}
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                <span>{t('dashboard.shortcutNewMeasurement')}</span>
              </Button>
            </div>
          </div>

          {/* Countdown + 5-Stage Progress Bar */}
          <div className="grid gap-4 lg:grid-cols-12 lg:items-center">
            <div
              data-testid="mission-countdown"
              className="lg:col-span-5 rounded-lg border border-cyan-400/20 bg-slate-50 px-3.5 py-2.5 dark:bg-[#070d17]/80"
            >
              {countdown.reachedZero && !mission.actualDurationDays ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-300">
                  <span>{t('countdown.reachedBanner')}</span>
                  <Button type="button" size="sm" variant="amber" onClick={() => navigate('/mission')}>
                    {t('countdown.goToMission')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('countdown.title')}
                  </span>
                  <div className="flex items-center gap-2 font-mono-tabular text-sm font-bold text-slate-900 dark:text-white">
                    <span>
                      {countdown.days}
                      <span className="ml-0.5 text-[10px] font-normal text-slate-400">j</span>
                    </span>
                    <span>
                      {String(countdown.hours).padStart(2, '0')}
                      <span className="ml-0.5 text-[10px] font-normal text-slate-400">h</span>
                    </span>
                    <span>
                      {String(countdown.minutes).padStart(2, '0')}
                      <span className="ml-0.5 text-[10px] font-normal text-slate-400">m</span>
                    </span>
                    <span>
                      {String(countdown.seconds).padStart(2, '0')}
                      <span className="ml-0.5 text-[10px] font-normal text-slate-400">s</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-7 space-y-2">
              <div
                role="progressbar"
                aria-valuenow={progress.percentComplete}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${mission.name} ${progress.percentComplete}% ${t('dashboard.missionBanner.complete')}`}
                className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800/90"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                  style={{
                    width: `${progress.percentComplete}%`,
                    transition: reducedMotion ? 'none' : 'width 300ms ease',
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
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
                        className={`h-1.5 w-1.5 rounded-full ${
                          reached ? 'bg-cyan-400' : 'bg-slate-400/50 dark:bg-slate-700'
                        }`}
                      />
                      <span>{t(`dashboard.missionBanner.milestones.${ms.key}`)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Columns Below Mission Card (No Body Model on Dashboard) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: Constantes vitales (4 cards + Profil instantané live chart) */}
        <Card data-testid="constantes-vitales-section" className="lg:col-span-7">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold">
                {t('dashboard.monitor.leftTitle')}
              </CardTitle>
              <span className="text-[11px] text-slate-400">{t('common.simulatedData')}</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* 4 Vital Cards: Value + Reference Range + Status Badge + 7-Day Mini Trend */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {vitalCards.map((vc) => {
                const sparkPath = buildMiniSparklinePath(vc.trend, 88, 26);
                return (
                  <div
                    key={vc.id}
                    data-testid={`vital-card-${vc.id}`}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-cyan-400/20 bg-slate-50 p-4 dark:bg-[#070d17]/75"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {vc.label}
                      </span>
                      <StatusBadge status={vc.status} />
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <div
                          className="font-mono-tabular text-xl font-bold text-slate-950 dark:text-white whitespace-nowrap"
                          dir="ltr"
                        >
                          {vc.value}
                        </div>
                        <div className="mt-1 text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                          {t('dashboard.referenceRange')}: {vc.refRange}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <svg
                          viewBox="0 0 88 26"
                          className="h-6 w-[88px]"
                          aria-label={`${vc.label} ${t('dashboard.vitalCards.trend7d')}`}
                        >
                          <path
                            d={sparkPath}
                            fill="none"
                            stroke={vc.accent}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="text-[10px] text-slate-400">
                          {t('dashboard.vitalCards.trend7d')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Profil instantané Live Chart */}
            <div
              data-testid="profil-instantane-chart"
              className="rounded-xl border border-cyan-400/20 bg-slate-50 p-4 dark:bg-[#070d17]/75"
            >
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {t('dashboard.monitor.leftChartTitle')}
                </span>
                <span className="font-mono-tabular text-[11px] text-cyan-500">LIVE</span>
              </div>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vitalsBarData} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                    <XAxis
                      dataKey="key"
                      interval={0}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0b1424',
                        border: '1px solid rgba(56,189,248,0.28)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                      formatter={(_val: unknown, _name: unknown, item: { payload?: { raw?: string } }) => [
                        item?.payload?.raw ?? '',
                        '',
                      ]}
                    />
                    <Bar dataKey="pct" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {vitalsBarData.map((entry, idx) => (
                        <Cell
                          key={entry.key}
                          fill={idx === 3 && vitalsSnapshot.systolicBp > 130 ? '#f59e0b' : '#38bdf8'}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: Suivi cérébral card + Voir la carte corporelle link */}
        <Card data-testid="suivi-cerebral-card" className="lg:col-span-5">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/15 text-cyan-400">
                  <Brain className="h-4.5 w-4.5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    {t('dashboard.vitalCards.brainCardTitle')}
                  </CardTitle>
                  <div className="text-[11px] text-slate-400">{t('common.simulatedData')}</div>
                </div>
              </div>
              <StatusBadge status="nominal" />
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="rounded-xl border border-cyan-400/20 bg-slate-50 p-4 dark:bg-[#070d17]/75">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                {t('dashboard.monitor.organPanel.orbitalRiskLabel')}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {t('dashboard.vitalCards.brainOrbitalRiskNominal')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="rounded-xl border border-cyan-400/20 bg-slate-50 p-4 dark:bg-[#070d17]/75">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {t('dashboard.monitor.organPanel.brain.m1')}
                </div>
                <div className="mt-2 font-mono-tabular text-xl font-bold text-slate-950 dark:text-white" dir="ltr">
                  11.4 <span className="text-xs font-normal text-slate-400">mmHg</span>
                </div>
              </div>

              <div className="rounded-xl border border-cyan-400/20 bg-slate-50 p-4 dark:bg-[#070d17]/75">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {t('dashboard.monitor.organPanel.brain.m2')}
                </div>
                <div className="mt-2 font-mono-tabular text-xl font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">
                  96 <span className="text-xs font-normal text-slate-400">%</span>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <Link
                to="/body-map"
                data-testid="view-body-map-link"
                className="inline-flex w-full items-center justify-between rounded-xl border border-cyan-400/35 bg-cyan-500/12 px-4 py-3 text-sm font-semibold text-cyan-900 transition-colors hover:border-cyan-400/60 hover:bg-cyan-500/20 dark:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <span>{t('dashboard.vitalCards.viewBodyMap')}</span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};
