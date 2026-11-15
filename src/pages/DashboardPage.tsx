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
  getScenarioState,
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

  const nominalBaseline = useMemo(() => getScenarioState('nominal'), []);

  const latestVitals = useMemo(() => {
    const hrMetric = dailyMetrics.find((m) => m.id === 'heart_rate');
    const tempMetric = dailyMetrics.find((m) => m.id === 'body_temperature');
    const bpMetric = dailyMetrics.find((m) => m.id === 'blood_pressure_sys');

    const heartRateBpm = hrMetric ? Math.round(hrMetric.value) : nominalBaseline.heartRateBpm;
    const spO2Percent = nominalBaseline.spO2Percent;
    const temperatureC = tempMetric
      ? Number(tempMetric.value.toFixed(1))
      : nominalBaseline.temperatureC;
    const systolicBp = bpMetric ? Math.round(bpMetric.value) : nominalBaseline.systolicBp;
    const diastolicBp = bpMetric?.secondaryValue
      ? Math.round(bpMetric.secondaryValue)
      : nominalBaseline.diastolicBp;

    return {
      heartRateBpm,
      spO2Percent,
      temperatureC,
      systolicBp,
      diastolicBp,
    };
  }, [dailyMetrics, nominalBaseline]);

  const sevenDayTrends = useMemo(
    () => ({
      heart_rate: extractSevenDayTrend(measurements, 'heart_rate', [64, 65, 63, 66, 65, 64, 63]),
      spo2: [98, 98, 97, 98, 98, 99, latestVitals.spO2Percent],
      body_temperature: extractSevenDayTrend(
        measurements,
        'body_temperature',
        [36.6, 36.5, 36.7, 36.6, 36.7, 36.6, 36.7]
      ),
      blood_pressure_sys: extractSevenDayTrend(
        measurements,
        'blood_pressure_sys',
        [118, 120, 122, 121, 124, 126, latestVitals.systolicBp]
      ),
    }),
    [measurements, latestVitals.spO2Percent, latestVitals.systolicBp]
  );

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
      id: 'heart_rate' as const,
      label: t('indicators.heart_rate'),
      value: `${latestVitals.heartRateBpm}`,
      unit: 'bpm',
      refRange: t('dashboard.vitalCards.hrRef'),
      status: evaluateVitalCardStatus('heart_rate', latestVitals.heartRateBpm),
      trend: sevenDayTrends.heart_rate,
    },
    {
      id: 'spo2' as const,
      label: t('dashboard.monitor.spO2'),
      value: `${latestVitals.spO2Percent}`,
      unit: '%',
      refRange: t('dashboard.vitalCards.spO2Ref'),
      status: evaluateVitalCardStatus('spo2', latestVitals.spO2Percent),
      trend: sevenDayTrends.spo2,
    },
    {
      id: 'body_temperature' as const,
      label: t('indicators.body_temperature'),
      value: `${latestVitals.temperatureC}`,
      unit: '°C',
      refRange: t('dashboard.vitalCards.tempRef'),
      status: evaluateVitalCardStatus('body_temperature', latestVitals.temperatureC),
      trend: sevenDayTrends.body_temperature,
    },
    {
      id: 'blood_pressure_sys' as const,
      label: t('indicators.blood_pressure_sys'),
      value: `${latestVitals.systolicBp}/${latestVitals.diastolicBp}`,
      unit: 'mmHg',
      refRange: t('dashboard.vitalCards.bpRef'),
      status: evaluateVitalCardStatus('blood_pressure_sys', latestVitals.systolicBp),
      trend: sevenDayTrends.blood_pressure_sys,
    },
  ];

  const vitalsBarData = [
    {
      key: 'FC',
      pct: Math.min(100, Math.round((latestVitals.heartRateBpm / 130) * 100)),
      raw: `${latestVitals.heartRateBpm} bpm`,
      status: vitalCards[0].status,
    },
    {
      key: 'SpO2',
      pct: latestVitals.spO2Percent,
      raw: `${latestVitals.spO2Percent}%`,
      status: vitalCards[1].status,
    },
    {
      key: 'Temp',
      pct: Math.min(100, Math.max(20, Math.round(((latestVitals.temperatureC - 35) / 4) * 100))),
      raw: `${latestVitals.temperatureC} °C`,
      status: vitalCards[2].status,
    },
    {
      key: 'TA',
      pct: Math.min(100, Math.round((latestVitals.systolicBp / 160) * 100)),
      raw: `${latestVitals.systolicBp}/${latestVitals.diastolicBp} mmHg`,
      status: vitalCards[3].status,
    },
  ];

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.2 }}
      className="space-y-6"
    >
      {/* Full-width Hero Mission Card */}
      <Card data-testid="mission-hero-card">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/15 text-cyan-400">
                <Rocket className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                    {mission.name}
                  </h1>
                  <span className="rounded border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 font-mono-tabular text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                    {t('common.day')} {mission.currentDay}/{mission.plannedDurationDays}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    · {profile.fullName}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono-tabular">
                  {effectiveMode === 'space' ? (
                    <div
                      data-testid="mission-clock-delay"
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-cyan-700 dark:text-cyan-300"
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

          <div className="grid gap-4 lg:grid-cols-12 lg:items-center">
            <div
              data-testid="mission-countdown"
              className="lg:col-span-5 rounded-lg border border-cyan-400/20 bg-slate-50 px-3.5 py-2.5 dark:bg-[#070d17]/75"
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

      {/* Two uncluttered columns below Mission card (NO body model on Dashboard) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: Constantes vitales (4 cards + Profil instantané live chart) */}
        <section
          aria-labelledby="vitals-section-heading"
          data-testid="vitals-column"
          className="lg:col-span-7 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2
              id="vitals-section-heading"
              className="text-base font-semibold tracking-tight text-slate-950 dark:text-white"
            >
              {t('dashboard.monitor.leftTitle')}
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t('common.simulatedData')}
            </span>
          </div>

          {/* 4 Vital Cards */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {vitalCards.map((card) => {
              const sparkPath = buildMiniSparklinePath(card.trend, 88, 26);
              const strokeColor = card.status === 'watch' ? '#f59e0b' : '#34d399';
              return (
                <Card
                  key={card.id}
                  data-testid={`vital-card-${card.id}`}
                  className="transition-colors hover:border-cyan-400/50"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {card.label}
                      </span>
                      <StatusBadge status={card.status} />
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <div
                          className="font-mono-tabular text-2xl font-bold text-slate-950 dark:text-white whitespace-nowrap"
                          dir="ltr"
                        >
                          {card.value}{' '}
                          <span className="text-xs font-normal text-slate-400">{card.unit}</span>
                        </div>
                        <div className="mt-1 text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                          {t('dashboard.referenceRange')} : {card.refRange}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <svg
                          viewBox="0 0 88 26"
                          className="h-7 w-22 overflow-visible"
                          aria-label={`${card.label} ${t('dashboard.vitalCards.trend7d')}`}
                        >
                          <path
                            d={sparkPath}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {t('dashboard.vitalCards.trend7d')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Profil instantané live chart */}
          <Card data-testid="instant-profile-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold">
                  {t('dashboard.monitor.leftChartTitle')}
                </CardTitle>
                <span className="text-[11px] text-slate-400">{t('common.simulatedData')}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vitalsBarData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="key"
                      interval={0}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
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
                      {vitalsBarData.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={entry.status === 'watch' ? '#f59e0b' : '#38bdf8'}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* RIGHT COLUMN: Suivi cérébral card */}
        <section
          aria-labelledby="brain-card-heading"
          data-testid="cerebral-monitor-column"
          className="lg:col-span-5"
        >
          <Card data-testid="cerebral-monitor-card">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-cyan-400">
                    <Brain className="h-4.5 w-4.5" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle id="brain-card-heading" className="text-base font-semibold">
                      {t('dashboard.vitalCards.brainCardTitle')}
                    </CardTitle>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {t('common.simulatedData')}
                    </div>
                  </div>
                </div>
                <StatusBadge status="nominal" />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-lg border border-cyan-400/20 bg-slate-50 p-3.5 text-xs dark:bg-[#070d17]/75">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                  {t('dashboard.monitor.organPanel.orbitalRiskLabel')}
                </div>
                <p className="mt-1.5 leading-relaxed text-slate-700 dark:text-slate-300">
                  {t('dashboard.vitalCards.brainOrbitalRiskNominal')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-cyan-400/20 bg-slate-50 p-3.5 dark:bg-[#070d17]/75">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('dashboard.monitor.organPanel.brain.m1')}
                  </div>
                  <div
                    className="mt-1.5 font-mono-tabular text-xl font-bold text-slate-950 dark:text-white"
                    dir="ltr"
                  >
                    {nominalBaseline.intracranialPressureMmHg}{' '}
                    <span className="text-xs font-normal text-slate-400">mmHg</span>
                  </div>
                </div>

                <div className="rounded-lg border border-cyan-400/20 bg-slate-50 p-3.5 dark:bg-[#070d17]/75">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('dashboard.monitor.organPanel.brain.m2')}
                  </div>
                  <div
                    className="mt-1.5 font-mono-tabular text-xl font-bold text-emerald-600 dark:text-emerald-400"
                    dir="ltr"
                  >
                    {nominalBaseline.cognitiveIndexPercent}{' '}
                    <span className="text-xs font-normal text-slate-400">%</span>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <Link
                  to="/body-map"
                  data-testid="view-body-map-link"
                  className="inline-flex w-full items-center justify-between rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-4 py-2.5 text-xs font-semibold text-cyan-900 transition-colors hover:bg-cyan-500/20 dark:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <span>{t('dashboard.vitalCards.viewBodyMap')}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </motion.div>
  );
};
