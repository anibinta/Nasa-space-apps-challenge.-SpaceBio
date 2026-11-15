import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, History, Rocket } from 'lucide-react';
import { useSpaceBio } from '../context/SpaceBioContext';
import { useTranslation } from '../i18n';
import { formatLocaleDate, formatLocaleNumber } from '../i18n/format';
import type { OperationalMode } from '../types/health';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input, Label, Select } from '../components/ui/input';

export const MissionPage: React.FC = () => {
  const {
    isGuest,
    mission,
    updateMissionDeparture,
    revisePlannedDuration,
    recordActualReturnDuration,
  } = useSpaceBio();
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  const [name, setName] = useState(mission.name);
  const [mode, setMode] = useState<OperationalMode>(mission.mode);
  const [departureDate, setDepartureDate] = useState(mission.departureDate);
  const [plannedInput, setPlannedInput] = useState(String(mission.plannedDurationDays));
  const [revisionDays, setRevisionDays] = useState(String(mission.plannedDurationDays));
  const [revisionReason, setRevisionReason] = useState('');
  const [actualInput, setActualInput] = useState(
    mission.actualDurationDays ? String(mission.actualDurationDays) : ''
  );
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  useEffect(() => {
    setName(mission.name);
    setMode(mission.mode);
    setDepartureDate(mission.departureDate);
    setPlannedInput(String(mission.plannedDurationDays));
    setRevisionDays(String(mission.plannedDurationDays));
    setActualInput(mission.actualDurationDays ? String(mission.actualDurationDays) : '');
  }, [mission]);

  const handleSaveDeparture = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) return;
    const days = Number(plannedInput);
    if (!Number.isFinite(days) || days < 1) return;
    updateMissionDeparture(name, mode, departureDate, days);
    setRevisionDays(String(Math.round(days)));
    setStatusFeedback(t('settings.savedBanner'));
  };

  const handleRevisePlanned = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) return;
    const days = Number(revisionDays);
    if (!Number.isFinite(days) || days < 1) return;
    revisePlannedDuration(days, revisionReason);
    setPlannedInput(String(Math.round(days)));
    setRevisionReason('');
    setStatusFeedback(t('settings.savedBanner'));
  };

  const handleRecordReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) return;
    const days = Number(actualInput);
    if (!Number.isFinite(days) || days < 1) return;
    recordActualReturnDuration(days);
    setStatusFeedback(t('mission.returnNotice'));
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
          {t('mission.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t('mission.subtitle')} · {t('common.simulatedData')}
        </p>
      </div>

      {statusFeedback && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-800 dark:text-emerald-300"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{statusFeedback}</span>
          </div>
          {mission.actualDurationDays !== null && (
            <Button type="button" size="sm" variant="outline" onClick={() => navigate('/reports')}>
              {t('reports.tabs.end_of_mission')}
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Departure Parameters */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-cyan-500" aria-hidden="true" />
              <span>{t('mission.departureFormTitle')}</span>
            </CardTitle>
            <CardDescription>{t('common.simulatedData')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveDeparture} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mission-name">{t('mission.missionName')}</Label>
                <Input
                  id="mission-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mission-mode">{t('mission.modeLabel')}</Label>
                  <Select
                    id="mission-mode"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as OperationalMode)}
                  >
                    <option value="space">{t('common.spaceMode')}</option>
                    <option value="earth">{t('common.earthMode')}</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mission-departure">{t('mission.departureDate')}</Label>
                  <Input
                    id="mission-departure"
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mission-planned">{t('mission.plannedDuration')}</Label>
                <Input
                  id="mission-planned"
                  type="number"
                  min={1}
                  max={1000}
                  value={plannedInput}
                  onChange={(e) => setPlannedInput(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={isGuest}>{t('common.save')}</Button>
            </form>
          </CardContent>
        </Card>

        {/* In-Mission Duration Revision & Return Entry */}
        <div className="lg:col-span-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('mission.updatePlannedBtn')}</CardTitle>
              <CardDescription>{t('common.simulatedData')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRevisePlanned} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="revise-days">{t('mission.plannedDuration')}</Label>
                    <Input
                      id="revise-days"
                      type="number"
                      min={1}
                      max={1000}
                      value={revisionDays}
                      onChange={(e) => setRevisionDays(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="revise-reason">{t('mission.changeReason')}</Label>
                    <Input
                      id="revise-reason"
                      value={revisionReason}
                      onChange={(e) => setRevisionReason(e.target.value)}
                      placeholder={t('mission.changeReasonPlaceholder')}
                    />
                  </div>
                </div>
                <Button type="submit" variant="secondary" disabled={isGuest}>
                  {t('mission.updatePlannedBtn')}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('mission.actualDuration')}</CardTitle>
              <CardDescription>{t('mission.returnNotice')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecordReturn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="actual-days">{t('mission.actualDuration')}</Label>
                  <Input
                    id="actual-days"
                    type="number"
                    min={1}
                    max={1000}
                    value={actualInput}
                    onChange={(e) => setActualInput(e.target.value)}
                    placeholder={t('mission.actualPlaceholder')}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" variant="amber" disabled={isGuest}>
                    {t('mission.recordReturnBtn')}
                  </Button>
                  {mission.actualDurationDays !== null && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isGuest}
                      onClick={() => {
                        recordActualReturnDuration(null);
                        setActualInput('');
                        setStatusFeedback(null);
                      }}
                    >
                      {t('mission.reopenMissionBtn')}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Revision History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-cyan-500" aria-hidden="true" />
            <span>{t('mission.historyTitle')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mission.changeHistory.length === 0 ? (
            <p className="text-sm text-slate-500">{t('mission.noChanges')}</p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {mission.changeHistory.map((ch) => (
                <div
                  key={ch.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <div>
                    <span className="font-mono-tabular font-semibold" dir="ltr">
                      {formatLocaleNumber(ch.previousDays, language)} {t('common.days')} →{' '}
                      {formatLocaleNumber(ch.newDays, language)} {t('common.days')}
                    </span>
                    <span className="mx-2 text-slate-400">·</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {ch.reasonKey ? t(ch.reasonKey) : ch.reason}
                    </span>
                  </div>
                  <div className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                    {ch.changedByKey ? t(ch.changedByKey) : ch.changedBy} ·{' '}
                    {formatLocaleDate(ch.changedAt, language)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

