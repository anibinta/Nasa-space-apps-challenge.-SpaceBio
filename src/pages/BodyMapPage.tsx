import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Activity, ShieldCheck } from 'lucide-react';
import { useSpaceBio } from '../context/SpaceBioContext';
import { useTranslation } from '../i18n';
import { formatLocaleNumber } from '../i18n/format';
import {
  buildWaveformPath,
  DEFAULT_BODY_MAP_ORGAN,
  getDefaultScenarioForMode,
  getOrganStatus,
  getOrganWaveformType,
  getScenariosForMode,
  getScenarioState,
  type BodyOrganFocus,
  type BodyScenarioId,
} from '../lib/bodyMonitor';
import { HolographicBodyMonitor } from '../components/body/HolographicBodyMonitor';
import { StatusBadge } from '../components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export const BodyMapPage: React.FC = () => {
  const { effectiveMode } = useSpaceBio();
  const { t, language } = useTranslation();
  const [searchParams] = useSearchParams();
  const [reducedMotion, setReducedMotion] = useState(false);

  const isBoneFocus = searchParams.get('bone') === '1';
  const availableScenarios = getScenariosForMode(effectiveMode);

  const [scenarioId, setScenarioId] = useState<BodyScenarioId>(() =>
    getDefaultScenarioForMode(effectiveMode)
  );
  const [focusedOrgan, setFocusedOrgan] = useState<BodyOrganFocus>(() =>
    isBoneFocus ? 'skeleton' : DEFAULT_BODY_MAP_ORGAN
  );

  useEffect(() => {
    if (isBoneFocus) {
      setFocusedOrgan('skeleton');
    }
  }, [isBoneFocus]);

  useEffect(() => {
    if (!availableScenarios.includes(scenarioId)) {
      const next = getDefaultScenarioForMode(effectiveMode);
      setScenarioId(next);
      if (!isBoneFocus) {
        setFocusedOrgan(getScenarioState(next).focusedOrgan);
      }
    }
  }, [availableScenarios, effectiveMode, isBoneFocus, scenarioId]);

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

  const scenario = getScenarioState(scenarioId);
  const organStatus = getOrganStatus(focusedOrgan, scenario);
  const waveformType = getOrganWaveformType(focusedOrgan);
  const waveformPath = buildWaveformPath(waveformType, scenario.heartRateBpm, 260, 56);

  const statusAccent =
    organStatus === 'alert'
      ? '#fb7185'
      : organStatus === 'watch'
        ? '#f59e0b'
        : '#34d399';

  const handleScenarioChange = (next: BodyScenarioId) => {
    setScenarioId(next);
    setFocusedOrgan(getScenarioState(next).focusedOrgan);
  };

  const organMetrics =
    focusedOrgan === 'heart'
      ? [
          {
            label: t('dashboard.monitor.organPanel.heart.m1'),
            value: formatLocaleNumber(scenario.heartRateBpm, language),
            unit: 'bpm',
          },
          {
            label: t('dashboard.monitor.organPanel.heart.m2'),
            value: formatLocaleNumber(scenario.systolicFlowLpm, language, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }),
            unit: 'L/min',
          },
          {
            label: t('dashboard.monitor.organPanel.heart.m3'),
            value: `${formatLocaleNumber(scenario.systolicBp, language)}/${formatLocaleNumber(scenario.diastolicBp, language)}`,
            unit: 'mmHg',
          },
          {
            label: t('dashboard.monitor.organPanel.heart.m4'),
            value: formatLocaleNumber(scenario.hrvMs, language),
            unit: 'ms',
          },
        ]
      : focusedOrgan === 'lungs'
        ? [
            {
              label: t('dashboard.monitor.organPanel.lungs.m1'),
              value: formatLocaleNumber(scenario.spO2Percent, language),
              unit: '%',
            },
            {
              label: t('dashboard.monitor.organPanel.lungs.m2'),
              value: formatLocaleNumber(scenario.respiratoryRate, language),
              unit: '/min',
            },
            {
              label: t('dashboard.monitor.organPanel.lungs.m3'),
              value: formatLocaleNumber(scenario.vitalCapacityL, language, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }),
              unit: 'L',
            },
            {
              label: t('dashboard.monitor.organPanel.lungs.m4'),
              value: formatLocaleNumber(scenario.etCo2MmHg, language),
              unit: 'mmHg',
            },
          ]
        : focusedOrgan === 'brain'
          ? [
              {
                label: t('dashboard.monitor.organPanel.brain.m1'),
                value: formatLocaleNumber(scenario.intracranialPressureMmHg, language, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }),
                unit: 'mmHg',
              },
              {
                label: t('dashboard.monitor.organPanel.brain.m2'),
                value: formatLocaleNumber(scenario.cognitiveIndexPercent, language),
                unit: '%',
              },
              effectiveMode === 'earth'
                ? {
                    label: t('dashboard.monitor.organPanel.brain.m3Earth'),
                    value: formatLocaleNumber(scenario.recoveryScorePercent, language),
                    unit: '%',
                  }
                : {
                    label: t('dashboard.monitor.organPanel.brain.m3'),
                    value: formatLocaleNumber(scenario.radiationDoseMsv, language, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    }),
                    unit: 'mSv',
                  },
              {
                label: t('dashboard.monitor.organPanel.brain.m4'),
                value: formatLocaleNumber(scenario.cerebralO2Percent, language),
                unit: '%',
              },
            ]
          : [
              {
                label: t('dashboard.monitor.organPanel.skeleton.m1'),
                value: formatLocaleNumber(scenario.femoralBmd, language, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
                unit: 'g/cm²',
              },
              {
                label: t('dashboard.monitor.organPanel.skeleton.m2'),
                value: formatLocaleNumber(scenario.lumbarBmd, language, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
                unit: 'g/cm²',
              },
              {
                label: t('dashboard.monitor.organPanel.skeleton.m3'),
                value: formatLocaleNumber(scenario.serumCalciumMmol, language, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
                unit: 'mmol/L',
              },
              {
                label: t('dashboard.monitor.organPanel.skeleton.m4'),
                value: formatLocaleNumber(scenario.vitaminDNgMl, language),
                unit: 'ng/mL',
              },
            ];

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.2 }}
      className="space-y-5"
    >
      {/* Page Title & Subtitle */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            {t('bodyMap.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t('bodyMap.subtitle')}
          </p>
        </div>
      </div>

      {/* Desktop: Centre Model (~60%) | Right Organ Panel (~40%); Mobile: Stacked, model first */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,60fr)_minmax(310px,40fr)] items-stretch">
        <HolographicBodyMonitor
          scenarioId={scenarioId}
          scenario={scenario}
          availableScenarios={availableScenarios}
          onScenarioChange={handleScenarioChange}
          focusedOrgan={focusedOrgan}
          onSelectOrgan={setFocusedOrgan}
        />

        {/* Right Side Organ Panel (Heart selected by default) */}
        <Card
          data-testid="right-organ-panel"
          data-organ={focusedOrgan}
          className="flex flex-col justify-between border-cyan-400/30 bg-[#0b1424] text-slate-100"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold text-white">
                  {t(`dashboard.monitor.organPanel.${focusedOrgan}.title`)}
                </CardTitle>
                <div className="text-[11px] text-slate-400">{t('common.simulatedData')}</div>
              </div>
              <StatusBadge status={organStatus} />
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col justify-between gap-4">
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-slate-300">
                {t(`dashboard.monitor.organPanel.${focusedOrgan}.summary`)}
              </p>

              <div className="rounded-lg border border-cyan-400/20 bg-[#070d17]/80 p-3 text-xs">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                  {effectiveMode === 'earth'
                    ? t('dashboard.monitor.organPanel.recondRiskLabel')
                    : t('dashboard.monitor.organPanel.orbitalRiskLabel')}
                </div>
                <p className="mt-1 leading-relaxed text-slate-200">
                  {effectiveMode === 'earth'
                    ? t(`dashboard.monitor.organPanel.${focusedOrgan}.recondRisk`)
                    : t(`dashboard.monitor.organPanel.${focusedOrgan}.orbitalRisk`)}
                </p>
              </div>
            </div>

            {/* 4 Dedicated Organ Metrics */}
            <div className="grid grid-cols-2 gap-2.5">
              {organMetrics.map((m) => (
                <div
                  key={m.label}
                  className="flex flex-col justify-between rounded-lg border border-cyan-400/20 bg-[#070d17]/80 px-3 py-2.5"
                >
                  <div className="text-[11px] leading-tight text-slate-400">{m.label}</div>
                  <div
                    className="mt-1.5 whitespace-nowrap font-mono-tabular text-sm font-bold text-white"
                    dir="ltr"
                  >
                    {m.value}{' '}
                    <span className="text-[10px] font-normal text-slate-400">{m.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Organ Waveform */}
            <div className="rounded-lg border border-cyan-400/20 bg-[#070d17] p-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                  <Activity className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  <span>{t(`dashboard.monitor.organPanel.${focusedOrgan}.waveform`)}</span>
                </span>
                <span className="font-mono-tabular text-[10px]" style={{ color: statusAccent }} dir="ltr">
                  {focusedOrgan === 'heart'
                    ? `${formatLocaleNumber(scenario.heartRateBpm, language)} bpm`
                    : focusedOrgan === 'lungs'
                      ? `${formatLocaleNumber(scenario.respiratoryRate, language)} /min`
                      : t('bodyMap.liveBadge')}
                </span>
              </div>

              <div className="h-14 w-full overflow-hidden">
                <svg
                  data-testid="organ-waveform-svg"
                  viewBox="0 0 260 56"
                  className="h-full w-[200%] holo-waveform-scroll"
                  preserveAspectRatio="none"
                  aria-label={t(`dashboard.monitor.organPanel.${focusedOrgan}.waveform`)}
                >
                  <path
                    d={waveformPath}
                    fill="none"
                    stroke={statusAccent}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <g transform="translate(260, 0)">
                    <path
                      d={waveformPath}
                      fill="none"
                      stroke={statusAccent}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                </svg>
              </div>
            </div>

            {/* Single Clinical Recommendation (Zero medication/vitamin doses) */}
            <div
              data-testid="organ-recommendation-box"
              className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 p-3 text-xs"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('dashboard.monitor.organPanel.recommendationLabel')}</span>
              </div>
              <p className="mt-1 leading-relaxed text-slate-100">
                {t(`dashboard.monitor.organPanel.${focusedOrgan}.rec`)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};
