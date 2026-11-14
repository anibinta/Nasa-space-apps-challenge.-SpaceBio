import React from 'react';
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from 'lucide-react';
import { useTranslation } from '../../i18n';
import type { AlertSeverity, StatusLevel } from '../../types/health';
import { cn } from '../ui/cn';

export const StatusBadge: React.FC<{
  status: StatusLevel;
  className?: string;
}> = ({ status, className }) => {
  const { t } = useTranslation();

  if (status === 'nominal') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300',
          className
        )}
      >
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t('common.nominal')}</span>
      </span>
    );
  }

  if (status === 'watch') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300',
          className
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t('common.watch')}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-rose-500/35 bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300',
        className
      )}
    >
      <OctagonAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{t('common.alert')}</span>
    </span>
  );
};

export const SeverityBadge: React.FC<{
  severity: AlertSeverity;
  className?: string;
}> = ({ severity, className }) => {
  const { t } = useTranslation();

  if (severity === 'critical') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300',
          className
        )}
      >
        <OctagonAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t('common.critical')}</span>
      </span>
    );
  }

  if (severity === 'warning') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300',
          className
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t('common.warning')}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 text-xs font-semibold text-cyan-800 dark:text-cyan-300',
        className
      )}
    >
      <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{t('common.info')}</span>
    </span>
  );
};
