import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Eye, Lock } from 'lucide-react';
import { useSpaceBio } from '../context/SpaceBioContext';
import { useTranslation } from '../i18n';
import { formatLocaleNumber } from '../i18n/format';
import { evaluateIndicatorStatus } from '../lib/healthEngine';
import { AlertCard } from '../components/shared/AlertCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export const PatientFilePage: React.FC = () => {
  const { assignedPatients, selectedPatientId, setSelectedPatientId } = useSpaceBio();
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  const patient =
    assignedPatients.find((p) => p.id === selectedPatientId) ?? assignedPatients[0];

  if (!patient) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/patients')}
            className="mb-2 -ms-2"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
            <span>{t('doctor.backToRoster')}</span>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            {t('doctor.fileTitle')}: {patient.fullName}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {patient.callSign} ·{' '}
            {patient.missionNameKey ? t(patient.missionNameKey) : patient.missionName} ·{' '}
            {t('common.day')} {formatLocaleNumber(patient.missionDay, language)}/
            {formatLocaleNumber(patient.plannedDurationDays, language)} ·{' '}
            <span
              className={`font-semibold ${
                patient.mode === 'space'
                  ? 'text-cyan-700 dark:text-cyan-300'
                  : 'text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {patient.mode === 'space' ? t('common.spaceMode') : t('common.earthMode')}
            </span>{' '}
            · {t('common.simulatedData')}
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('doctor.readOnlyBadge')}</span>
        </div>
      </div>

      {/* Patient switcher */}
      <div className="flex flex-wrap gap-2">
        {assignedPatients.map((p) => (
          <Button
            key={p.id}
            type="button"
            size="sm"
            variant={p.id === patient.id ? 'default' : 'outline'}
            onClick={() => setSelectedPatientId(p.id)}
          >
            {p.fullName} ({p.callSign})
          </Button>
        ))}
      </div>

      {/* Patient Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>{t('doctor.activeAlerts')}</CardTitle>
          <CardDescription>{t('common.simulatedData')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {patient.alerts.map((al) => (
            <AlertCard key={al.id} alert={al} onAcknowledge={() => undefined} />
          ))}
        </CardContent>
      </Card>

      {/* Read-Only Measurements Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('measurements.historyTitle')}</CardTitle>
          <CardDescription>
            {t('doctor.readOnlyBadge')} · {t('common.simulatedData')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 pe-4 font-medium text-start">{t('common.day')}</th>
                  <th className="py-2 pe-4 font-medium text-start">{t('measurements.indicatorLabel')}</th>
                  <th className="py-2 pe-4 font-medium text-end">{t('measurements.valueLabel')}</th>
                  <th className="py-2 pe-4 font-medium text-start">{t('common.source')}</th>
                  <th className="py-2 pe-4 font-medium text-end">{t('common.confidence')}</th>
                  <th className="py-2 font-medium text-start">{t('bone.tableHeaders.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                {patient.measurements.slice(0, 18).map((rec) => {
                  const status = evaluateIndicatorStatus(rec.indicator, rec.value);
                  return (
                    <tr key={rec.id}>
                      <td className="py-2.5 pe-4 font-mono-tabular">
                        {t('common.dayShort')}
                        {formatLocaleNumber(rec.missionDay, language)}
                      </td>
                      <td className="py-2.5 pe-4 font-medium">{t(`indicators.${rec.indicator}`)}</td>
                      <td className="py-2.5 pe-4 text-end font-mono-tabular font-semibold" dir="ltr">
                        {rec.secondaryValue
                          ? `${formatLocaleNumber(rec.value, language)}/${formatLocaleNumber(rec.secondaryValue, language)}`
                          : formatLocaleNumber(rec.value, language)}{' '}
                        {rec.unit}
                      </td>
                      <td className="py-2.5 pe-4 text-xs">
                        {rec.source === 'contactless' ? t('common.contactless') : t('common.manual')}
                        {rec.indicative ? ` (${t('common.indicative')})` : ''}
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
        </CardContent>
      </Card>
    </motion.div>
  );
};

