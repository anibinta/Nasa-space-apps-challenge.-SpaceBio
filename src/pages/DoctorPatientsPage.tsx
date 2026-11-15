import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, FileText, Stethoscope } from 'lucide-react';
import { useSpaceBio } from '../context/SpaceBioContext';
import { useTranslation } from '../i18n';
import { formatLocaleNumber } from '../i18n/format';
import type { AlertSeverity } from '../types/health';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const SEV_BADGE: Record<AlertSeverity, string> = {
  critical: 'border-rose-500/50 bg-rose-500/15 text-rose-800 dark:text-rose-200',
  warning: 'border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-200',
  info: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
};

export const DoctorPatientsPage: React.FC = () => {
  const { assignedPatients, setSelectedPatientId } = useSpaceBio();
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            {t('doctor.patientsTitle')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t('doctor.patientsSubtitle')} · {t('common.simulatedData')}
          </p>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={() => navigate('/reports')}>
          <FileText className="h-4 w-4" aria-hidden="true" />
          <span>{t('nav.reports')}</span>
        </Button>
      </div>

      <div
        role="note"
        className="flex items-center gap-2.5 rounded-xl border border-emerald-500/35 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-950 dark:bg-[#071f1b] dark:text-emerald-200"
      >
        <Stethoscope className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <span>{t('doctor.returningFocus')}</span>
      </div>

      <div className="grid gap-4">
        {assignedPatients.map((pat) => {
          const SevIcon =
            pat.highestAlertSeverity === 'critical'
              ? AlertCircle
              : pat.highestAlertSeverity === 'warning'
                ? AlertTriangle
                : CheckCircle2;

          return (
            <Card key={pat.id} data-testid={`patient-card-${pat.id}`}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">
                      {pat.fullName}{' '}
                      <span className="font-mono-tabular text-xs font-normal text-slate-500 dark:text-slate-400">
                        ({pat.callSign} · {formatLocaleNumber(pat.age, language)} {t('common.yearsShort')})
                      </span>
                    </CardTitle>
                    <CardDescription>
                      {pat.missionNameKey ? t(pat.missionNameKey) : pat.missionName} ·{' '}
                      {t('common.day')} {formatLocaleNumber(pat.missionDay, language)}/
                      {formatLocaleNumber(pat.plannedDurationDays, language)} ·{' '}
                      <span
                        className={`font-semibold ${
                          pat.mode === 'space'
                            ? 'text-cyan-700 dark:text-cyan-300'
                            : 'text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {pat.mode === 'space' ? t('common.spaceMode') : t('common.earthMode')}
                      </span>
                    </CardDescription>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${SEV_BADGE[pat.highestAlertSeverity]}`}
                  >
                    <SevIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t(`common.${pat.highestAlertSeverity}`)}</span>
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-6 text-xs font-mono-tabular text-slate-600 dark:text-slate-300">
                  <span>
                    {t('doctor.activeAlerts')}:{' '}
                    <strong>{formatLocaleNumber(pat.activeAlertsCount, language)}</strong>
                  </span>
                  <span>
                    {t('doctor.boneRisk')}:{' '}
                    <strong dir="ltr">{formatLocaleNumber(pat.boneRiskEstimatePercent, language)}%</strong>
                  </span>
                  <span>{t('common.simulatedData')}</span>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setSelectedPatientId(pat.id);
                    navigate('/patient-file');
                  }}
                >
                  <span>{t('doctor.viewFile')}</span>
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
};

