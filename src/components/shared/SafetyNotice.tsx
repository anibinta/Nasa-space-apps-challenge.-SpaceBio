import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';

export const SafetyNotice: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div
      role="note"
      aria-label={t('common.safetyNotice')}
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cyan-500/30 bg-cyan-50 px-4 py-2.5 text-xs text-slate-800 dark:border-cyan-500/30 dark:bg-[#091a31] dark:text-slate-200"
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
        <span className="font-medium">{t('common.safetyNotice')}</span>
      </div>
      <span className="font-mono-tabular text-[11px] font-medium text-amber-700 dark:text-amber-300">
        {user ? t('common.signedInAccount') : t('common.simulatedData')}
      </span>
    </div>
  );
};
