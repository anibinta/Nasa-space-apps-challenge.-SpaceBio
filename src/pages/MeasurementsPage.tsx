import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, CheckCircle2, Mic, ScanLine, AlertCircle } from 'lucide-react';
import { useSpaceBio } from '../context/SpaceBioContext';
import { useTranslation } from '../i18n';
import { formatLocaleNumber } from '../i18n/format';
import {
  evaluateIndicatorStatus,
  INDICATOR_CONFIGS,
  validateMeasurementInput,
} from '../lib/healthEngine';
import type { IndicatorId } from '../types/health';
import { StatusBadge } from '../components/shared/StatusBadge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input, Label, Select } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const ENTRY_INDICATORS: IndicatorId[] = [
  'blood_pressure_sys',
  'heart_rate',
  'blood_glucose',
  'body_temperature',
  'sleep',
  'mood',
];

export const MeasurementsPage: React.FC = () => {
  const { isGuest, measurements, addMeasurement, mission } = useSpaceBio();
  const { t, language } = useTranslation();

  // Manual entry state
  const [indicator, setIndicator] = useState<IndicatorId>('heart_rate');
  const [valueInput, setValueInput] = useState<string>('70');
  const [diastolicInput, setDiastolicInput] = useState<string>('78');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Contactless state
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(false);
  const [micEnabled, setMicEnabled] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  const [contactlessError, setContactlessError] = useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = useState<{
    sys: number;
    dia: number;
    hr: number;
    confidence: number;
  } | null>(null);

  // History filters
  const [filterIndicator, setFilterIndicator] = useState<'all' | IndicatorId>('all');
  const [filterPeriod, setFilterPeriod] = useState<'7d' | '30d' | 'all'>('30d');

  const cfg = INDICATOR_CONFIGS[indicator];

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (isGuest) {
      setFormError(t('welcome.guestReadOnlyError'));
      return;
    }

    const parsed = Number(valueInput);
    const parsedDia = indicator === 'blood_pressure_sys' ? Number(diastolicInput) : undefined;
    const validation = validateMeasurementInput(indicator, parsed, parsedDia);

    if (!validation.valid) {
      setFormError(t(validation.errorKey || 'measurements.errors.invalidNumber'));
      return;
    }

    addMeasurement({
      indicator,
      value: parsed,
      secondaryValue: parsedDia,
      source: 'manual',
      confidence: 97,
      notes,
    });
    setNotes('');
    setFormSuccess(t('measurements.savedSuccess'));
  };

  const handleRunContactless = () => {
    setContactlessError(null);
    if (isGuest) {
      setContactlessError(t('welcome.guestReadOnlyError'));
      return;
    }
    if (!cameraEnabled || !micEnabled) {
      setContactlessError(t('measurements.errors.sensorRequired'));
      return;
    }
    setScanning(true);
    window.setTimeout(() => {
      const hr = 66 + Math.round(Math.random() * 8);
      const sys = 122 + Math.round(Math.random() * 11);
      const dia = 76 + Math.round(Math.random() * 7);
      const confidence = 78 + Math.round(Math.random() * 8);

      addMeasurement({
        indicator: 'heart_rate',
        value: hr,
        source: 'contactless',
        confidence: confidence + 6,
        notes: t('measurements.scanNoteHr'),
      });
      addMeasurement({
        indicator: 'blood_pressure_sys',
        value: sys,
        secondaryValue: dia,
        source: 'contactless',
        confidence,
        notes: t('measurements.scanNoteBp'),
      });

      setLastScanResult({ sys, dia, hr, confidence });
      setScanning(false);
    }, 650);
  };

  const filteredHistory = useMemo(() => {
    return measurements.filter((rec) => {
      if (filterIndicator !== 'all' && rec.indicator !== filterIndicator) {
        return false;
      }
      if (filterPeriod === '7d' && rec.missionDay < mission.currentDay - 6) {
        return false;
      }
      if (filterPeriod === '30d' && rec.missionDay < mission.currentDay - 29) {
        return false;
      }
      return true;
    });
  }, [measurements, filterIndicator, filterPeriod, mission.currentDay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          {t('measurements.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t('measurements.subtitle')} · {t('common.simulatedData')}
        </p>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList>
          <TabsTrigger value="manual">{t('measurements.manualTab')}</TabsTrigger>
          <TabsTrigger value="contactless">{t('measurements.contactlessTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>{t('measurements.manualTab')}</CardTitle>
              <CardDescription>
                {t('common.simulatedData')} · {t('common.day')}{' '}
                {formatLocaleNumber(mission.currentDay, language)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-4 max-w-2xl" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="manual-indicator">{t('measurements.indicatorLabel')}</Label>
                    <Select
                      id="manual-indicator"
                      value={indicator}
                      onChange={(e) => {
                        const next = e.target.value as IndicatorId;
                        setIndicator(next);
                        setFormError(null);
                        setFormSuccess(null);
                        if (next === 'blood_pressure_sys') setValueInput('120');
                        else if (next === 'heart_rate') setValueInput('68');
                        else if (next === 'blood_glucose') setValueInput('94');
                        else if (next === 'body_temperature') setValueInput('36.7');
                        else if (next === 'sleep') setValueInput('7.2');
                        else if (next === 'mood') setValueInput('8');
                      }}
                    >
                      {ENTRY_INDICATORS.map((id) => (
                        <option key={id} value={id}>
                          {t(`indicators.${id}`)} ({INDICATOR_CONFIGS[id].unit})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="manual-value">
                      {t('measurements.valueLabel')} ({cfg.unit})
                    </Label>
                    <Input
                      id="manual-value"
                      type="number"
                      step={indicator === 'body_temperature' || indicator === 'sleep' ? '0.1' : '1'}
                      value={valueInput}
                      onChange={(e) => setValueInput(e.target.value)}
                      required
                    />
                    <p className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                      {t('dashboard.referenceRange')}:{' '}
                      <span dir="ltr">
                        {formatLocaleNumber(cfg.refMin, language)}–{formatLocaleNumber(cfg.refMax, language)} {cfg.unit} ({formatLocaleNumber(cfg.minValid, language)}–{formatLocaleNumber(cfg.maxValid, language)})
                      </span>
                    </p>
                  </div>
                </div>

                {indicator === 'blood_pressure_sys' && (
                  <div className="space-y-1.5 max-w-xs">
                    <Label htmlFor="manual-diastolic">{t('measurements.diastolicLabel')}</Label>
                    <Input
                      id="manual-diastolic"
                      type="number"
                      value={diastolicInput}
                      onChange={(e) => setDiastolicInput(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="manual-notes">{t('measurements.sourceNotes')}</Label>
                  <Input
                    id="manual-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('measurements.notesPlaceholder')}
                  />
                </div>

                {formError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div
                    role="status"
                    className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <Button type="submit" disabled={isGuest}>
                  {t('measurements.submitButton')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contactless">
          <Card>
            <CardHeader>
              <CardTitle>{t('measurements.contactlessTab')}</CardTitle>
              <CardDescription>{t('common.simulatedData')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                {t('measurements.indicativeWarning')}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Illustrated guide */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#0d162d]">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t('measurements.contactlessGuideTitle')}
                  </h3>
                  <div className="mt-3 flex flex-col sm:flex-row items-center gap-4">
                    <svg
                      viewBox="0 0 140 120"
                      className="h-28 w-36 shrink-0 rounded-lg border border-slate-300/60 bg-slate-900 p-2 dark:border-slate-700"
                      aria-hidden="true"
                    >
                      <rect x="8" y="8" width="124" height="104" rx="8" fill="none" stroke="#334155" strokeDasharray="4 3" />
                      <circle cx="70" cy="46" r="18" fill="none" stroke="#22d3ee" strokeWidth="2" />
                      <path d="M44 96 C44 74, 96 74, 96 96" fill="none" stroke="#22d3ee" strokeWidth="2" />
                      <line x1="20" y1="22" x2="36" y2="22" stroke="#f59e0b" strokeWidth="2" />
                      <line x1="104" y1="22" x2="120" y2="22" stroke="#f59e0b" strokeWidth="2" />
                    </svg>
                    <ol className="space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                      <li>{formatLocaleNumber(1, language)}. {t('measurements.contactlessGuideSteps.step1')}</li>
                      <li>{formatLocaleNumber(2, language)}. {t('measurements.contactlessGuideSteps.step2')}</li>
                      <li>{formatLocaleNumber(3, language)}. {t('measurements.contactlessGuideSteps.step3')}</li>
                    </ol>
                  </div>
                </div>

                {/* Sensor Toggles & Trigger */}
                <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Camera className="h-4 w-4 text-cyan-500" aria-hidden="true" />
                        <Label htmlFor="sim-cam-switch">{t('measurements.enableCamera')}</Label>
                      </div>
                      <Switch
                        id="sim-cam-switch"
                        checked={cameraEnabled}
                        onCheckedChange={(v) => {
                          setCameraEnabled(v);
                          setContactlessError(null);
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Mic className="h-4 w-4 text-cyan-500" aria-hidden="true" />
                        <Label htmlFor="sim-mic-switch">{t('measurements.enableMic')}</Label>
                      </div>
                      <Switch
                        id="sim-mic-switch"
                        checked={micEnabled}
                        onCheckedChange={(v) => {
                          setMicEnabled(v);
                          setContactlessError(null);
                        }}
                      />
                    </div>
                  </div>

                  {contactlessError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
                    >
                      {contactlessError}
                    </div>
                  )}

                  {lastScanResult && (
                    <div
                      role="status"
                      className="rounded-lg border border-cyan-500/35 bg-cyan-500/10 p-3 text-xs space-y-1"
                    >
                      <div className="font-semibold text-cyan-900 dark:text-cyan-200">
                        {t('common.simulatedData')} · {t('common.confidence')}:{' '}
                        {formatLocaleNumber(lastScanResult.confidence, language)}%
                      </div>
                      <div className="font-mono-tabular text-slate-800 dark:text-slate-200">
                        {t('indicators.blood_pressure_sys')}:{' '}
                        <span dir="ltr">
                          {formatLocaleNumber(lastScanResult.sys, language)}/
                          {formatLocaleNumber(lastScanResult.dia, language)} mmHg
                        </span>{' '}
                        (
                        <span className="font-semibold text-amber-700 dark:text-amber-300">
                          {t('common.indicative')}
                        </span>
                        ) · {t('indicators.heart_rate')}:{' '}
                        <span dir="ltr">{formatLocaleNumber(lastScanResult.hr, language)} bpm</span>
                      </div>
                    </div>
                  )}

                  <Button type="button" onClick={handleRunContactless} disabled={scanning || isGuest}>
                    <ScanLine className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {scanning ? t('measurements.scanning') : t('measurements.runScan')}
                    </span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Filterable History */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t('measurements.historyTitle')}</CardTitle>
            <CardDescription>{t('common.simulatedData')}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="history-indicator-filter" className="text-xs whitespace-nowrap">
                {t('measurements.filterIndicator')}
              </Label>
              <Select
                id="history-indicator-filter"
                value={filterIndicator}
                onChange={(e) => setFilterIndicator(e.target.value as 'all' | IndicatorId)}
                className="h-9 w-44 text-xs"
              >
                <option value="all">{t('measurements.allIndicators')}</option>
                {ENTRY_INDICATORS.map((id) => (
                  <option key={id} value={id}>
                    {t(`indicators.${id}`)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="history-period-filter" className="text-xs whitespace-nowrap">
                {t('measurements.filterPeriod')}
              </Label>
              <Select
                id="history-period-filter"
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value as '7d' | '30d' | 'all')}
                className="h-9 w-36 text-xs"
              >
                <option value="7d">{t('measurements.period7d')}</option>
                <option value="30d">{t('measurements.period30d')}</option>
                <option value="all">{t('measurements.periodAll')}</option>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 py-10 text-center dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('measurements.emptyHistory')}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterIndicator('all');
                  setFilterPeriod('all');
                }}
              >
                {t('common.clearFilters')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2.5 pe-4 font-medium text-start">{t('common.day')}</th>
                    <th className="py-2.5 pe-4 font-medium text-start">{t('measurements.indicatorLabel')}</th>
                    <th className="py-2.5 pe-4 font-medium text-end">{t('measurements.valueLabel')}</th>
                    <th className="py-2.5 pe-4 font-medium text-start">{t('common.source')}</th>
                    <th className="py-2.5 pe-4 font-medium text-end">{t('common.confidence')}</th>
                    <th className="py-2.5 font-medium text-start">{t('bone.tableHeaders.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                  {filteredHistory.slice(0, 30).map((rec) => {
                    const status = evaluateIndicatorStatus(rec.indicator, rec.value);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 pe-4 font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                          {t('common.dayShort')}
                          {formatLocaleNumber(rec.missionDay, language)}
                        </td>
                        <td className="py-2.5 pe-4 font-medium text-slate-900 dark:text-slate-100">
                          {t(`indicators.${rec.indicator}`)}
                        </td>
                        <td className="py-2.5 pe-4 text-end font-mono-tabular font-semibold" dir="ltr">
                          {rec.secondaryValue !== undefined
                            ? `${formatLocaleNumber(rec.value, language)}/${formatLocaleNumber(rec.secondaryValue, language)}`
                            : formatLocaleNumber(rec.value, language)}{' '}
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                            {rec.unit}
                          </span>
                        </td>
                        <td className="py-2.5 pe-4 text-xs text-slate-600 dark:text-slate-300">
                          {rec.source === 'contactless'
                            ? t('common.contactless')
                            : t('common.manual')}
                          {rec.indicative && (
                            <span className="ms-1.5 font-semibold text-amber-700 dark:text-amber-300">
                              · {t('common.indicative')}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pe-4 text-end font-mono-tabular text-xs">
                          {formatLocaleNumber(rec.confidence, language)}%
                        </td>
                        <td className="py-2.5">
                          <StatusBadge status={status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

