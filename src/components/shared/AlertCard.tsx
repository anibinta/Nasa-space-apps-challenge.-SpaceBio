import React from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { interpolateTemplate } from '../../i18n/format';
import type { HealthAlert } from '../../types/health';
import { Button } from '../ui/button';
import { SeverityBadge } from './StatusBadge';

export const AlertCard: React.FC<{
  alert: HealthAlert;
  onAcknowledge?: (id: string) => void;
}> = ({ alert, onAcknowledge }) => {
  const { t } = useTranslation();

  const sourceText = alert.sourceKey
    ? interpolateTemplate(t(alert.sourceKey), alert.sourceParams ?? {})
    : alert.sourceData;

  const thresholdText = alert.thresholdKey
    ? interpolateTemplate(t(alert.thresholdKey), alert.thresholdParams ?? {})
    : alert.thresholdRule;

  return (
    <div
      className={`rounded-xl border p-4 transition-colors duration-200 ${
        alert.acknowledged
          ? 'border-slate-200 bg-slate-100 opacity-85 dark:border-slate-800 dark:bg-[#0d162d]'
          : 'border-slate-200 bg-white dark:border-slate-700/80 dark:bg-[#0e1833]'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={alert.severity} />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t(alert.titleKey)}
          </h4>
        </div>
        <span className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
          {t('common.simulatedData')}
        </span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {t(alert.explanationKey)}
      </p>

      <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-[#081023] sm:grid-cols-2">
        <div>
          <span className="font-medium text-slate-500 dark:text-slate-400">
            {t('common.source')}:{' '}
          </span>
          <span className="text-slate-800 dark:text-slate-200">{sourceText}</span>
        </div>
        <div>
          <span className="font-medium text-slate-500 dark:text-slate-400">
            {t('common.threshold')}:{' '}
          </span>
          <span className="font-mono-tabular text-slate-800 dark:text-slate-200">
            {thresholdText}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-cyan-800 dark:text-cyan-300">
          {t(alert.suggestedActionKey)}
        </p>
        {onAcknowledge && (
          <Button
            type="button"
            variant={alert.acknowledged ? 'ghost' : 'outline'}
            size="sm"
            disabled={alert.acknowledged}
            onClick={() => onAcknowledge(alert.id)}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{alert.acknowledged ? t('common.acknowledged') : t('common.acknowledge')}</span>
          </Button>
        )}
      </div>
    </div>
  );
};
