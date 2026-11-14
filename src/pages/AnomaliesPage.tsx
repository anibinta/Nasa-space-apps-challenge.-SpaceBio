import React from 'react';
import { motion } from 'motion/react';
import { Activity, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useSpaceBio } from '../context/SpaceBioContext';
import { useTranslation } from '../i18n';
import type { AnomalySeverity } from '../types/health';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const SEVERITY_BADGE: Record<AnomalySeverity, string> = {
  high: 'border-rose-500/50 bg-rose-500/15 text-rose-800 dark:text-rose-200',
  medium: 'border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-200',
  low: 'border-cyan-500/50 bg-cyan-500/15 text-cyan-800 dark:text-cyan-200',
};

export const AnomaliesPage: React.FC = () => {
  const { role, anomalies, assignedPatients } = useSpaceBio();
  const { t } = useTranslation();

  const patientNameFor = (pid?: string) => {
    if (!pid) return null;
    return assignedPatients.find((p) => p.id === pid)?.fullName ?? null;
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
          {t('anomalies.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t('anomalies.subtitle')} · {t('common.simulatedData')}
        </p>
      </div>

      <div
        role="note"
        className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-950 dark:bg-[#231807] dark:text-amber-200"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <span>{t('anomalies.ruleNote')}</span>
      </div>

      {anomalies.length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-sm text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
            <span>{t('anomalies.noAnomalies')}</span>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {anomalies.map((anom) => {
            const patName = role === 'doctor' ? patientNameFor(anom.patientId) : null;
            return (
              <Card key={`${anom.patientId ?? 'self'}-${anom.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      {patName && (
                        <CardDescription className="font-semibold text-emerald-700 dark:text-emerald-300">
                          {patName}
                        </CardDescription>
                      )}
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Activity className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
                        <span>{anom.indicatorLabel}</span>
                      </CardTitle>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${SEVERITY_BADGE[anom.severity]}`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {anom.severity === 'high'
                          ? t('anomalies.severityHigh')
                          : anom.severity === 'medium'
                            ? t('anomalies.severityMedium')
                            : t('anomalies.severityLow')}
                      </span>
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#0d162d]">
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t('anomalies.deviation')}
                      </div>
                      <div className="mt-1 font-mono-tabular font-semibold">{anom.deviationLabel}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#0d162d]">
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t('anomalies.period')}
                      </div>
                      <div className="mt-1 font-mono-tabular font-medium">{anom.periodLabel}</div>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {t('anomalies.sourceData')}:{' '}
                    </span>
                    <span className="font-mono-tabular text-xs text-slate-700 dark:text-slate-300">
                      {anom.sourceData}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {t('anomalies.suggestedAction')}:{' '}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200">{anom.suggestedAction}</span>
                  </div>

                  <div className="text-xs font-medium italic text-amber-700 dark:text-amber-300">
                    {anom.validationNotice} · {t('common.simulatedData')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
