import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Globe2, RefreshCw, Shield } from 'lucide-react';
import {
  ADMIN_ANONYMIZED_ANOMALY_SUMMARY,
  LEARNING_SITES,
  SUBGROUP_PERFORMANCE,
} from '../data/mock';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { useSpaceBio } from '../context/SpaceBioContext';
import { useTranslation } from '../i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export type AdminSectionView = 'overview' | 'sites' | 'sync' | 'inclusion';

export const LearningNetworkPage: React.FC<{ section?: AdminSectionView }> = ({
  section = 'overview',
}) => {
  const { adminSummary } = useSpaceBio();
  const { t } = useTranslation();

  const totalMissions =
    LEARNING_SITES.reduce((acc, s) => acc + s.contributingMissions, 0) +
    (adminSummary?.activeDbMissions ?? 0);
  const avgUnassisted = adminSummary
    ? Math.round(
        (LEARNING_SITES.reduce((acc, s) => acc + s.unassistedSharePercent, 0) /
          LEARNING_SITES.length +
          adminSummary.contactlessSharePercent) /
          2
      )
    : Math.round(
        LEARNING_SITES.reduce((acc, s) => acc + s.unassistedSharePercent, 0) / LEARNING_SITES.length
      );
  const syncedCount = LEARNING_SITES.filter((s) => s.syncStatus === 'synchronized').length;
  const anomalyRows = adminSummary?.cohorts ?? ADMIN_ANONYMIZED_ANOMALY_SUMMARY;

  const headingTitle =
    section === 'sites'
      ? t('nav.partnerSites')
      : section === 'sync'
        ? t('nav.modelSync')
        : section === 'inclusion'
          ? t('nav.inclusion')
          : t('learning.title');

  const showOverviewCards = section === 'overview' || section === 'sync';
  const showSitesTable = section === 'overview' || section === 'sites' || section === 'sync';
  const showInclusionTable = section === 'overview' || section === 'inclusion';
  const showAnonymizedAnomalies = section === 'overview';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          {headingTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t('learning.subtitle')} · {t('common.simulatedData')}
        </p>
      </div>

      <div
        role="note"
        data-testid="admin-anonymized-notice"
        className="flex items-center gap-2.5 rounded-xl border border-amber-500/35 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-950 dark:bg-[#231807] dark:text-amber-200"
      >
        <Shield className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
        <span>{t('learning.adminNotice')}</span>
      </div>

      {showOverviewCards && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t('learning.totalMissions')}
              </div>
              <div className="mt-2 font-mono-tabular text-3xl font-bold">{totalMissions}</div>
              <div className="mt-1 text-[11px] text-slate-500">{t('common.simulatedData')}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t('learning.unassistedShare')}
              </div>
              <div className="mt-2 font-mono-tabular text-3xl font-bold text-amber-600 dark:text-amber-400">
                {avgUnassisted}%
              </div>
              <div className="mt-1 text-[11px] text-slate-500">{t('common.simulatedData')}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t('learning.syncHealth')}
              </div>
              <div className="mt-2 font-mono-tabular text-3xl font-bold">
                {syncedCount} / {LEARNING_SITES.length}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">{t('common.simulatedData')}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t('learning.languagesSupported')}
              </div>
              <div className="mt-2 flex items-center gap-2 font-mono-tabular text-2xl font-bold">
                <Globe2 className="h-5 w-5 text-amber-500" aria-hidden="true" />
                <span>{SUPPORTED_LANGUAGES.length}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 truncate">
                {SUPPORTED_LANGUAGES.map((l) => l.code.toUpperCase()).join(' · ')}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showAnonymizedAnomalies && (
        <Card>
          <CardHeader>
            <CardTitle>{t('anomalies.adminTitle')}</CardTitle>
            <CardDescription>
              {t('anomalies.adminSubtitle')} · {t('common.simulatedData')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2.5 pr-4 font-medium">{t('anomalies.cohort')}</th>
                    <th className="py-2.5 pr-4 font-medium text-right">{t('anomalies.lowCount')}</th>
                    <th className="py-2.5 pr-4 font-medium text-right">{t('anomalies.mediumCount')}</th>
                    <th className="py-2.5 pr-4 font-medium text-right">{t('anomalies.highCount')}</th>
                    <th className="py-2.5 font-medium text-right">{t('anomalies.observations')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                  {anomalyRows.map((row) => (
                    <tr key={row.cohortLabel}>
                      <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-slate-100">
                        {row.cohortLabel}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono-tabular">{row.countLow}</td>
                      <td className="py-3 pr-4 text-right font-mono-tabular text-amber-600 dark:text-amber-300">
                        {row.countMedium}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono-tabular text-rose-600 dark:text-rose-300">
                        {row.countHigh}
                      </td>
                      <td className="py-3 text-right font-mono-tabular">{row.totalObservations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {showSitesTable && (
        <Card>
          <CardHeader>
            <CardTitle>{t('learning.sitesTitle')}</CardTitle>
            <CardDescription>{t('common.simulatedData')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2.5 pr-4 font-medium">{t('learning.headers.site')}</th>
                    <th className="py-2.5 pr-4 font-medium">{t('learning.headers.country')}</th>
                    <th className="py-2.5 pr-4 font-medium">{t('learning.headers.sync')}</th>
                    <th className="py-2.5 pr-4 font-medium text-right">{t('learning.headers.missions')}</th>
                    <th className="py-2.5 font-medium text-right">{t('learning.headers.unassisted')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                  {LEARNING_SITES.map((site) => (
                    <tr key={site.id}>
                      <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-slate-100">
                        {site.name}
                      </td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{site.country}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            site.syncStatus === 'synchronized'
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {site.syncStatus === 'synchronized' ? (
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          <span>{t(`learning.syncStates.${site.syncStatus}`)}</span>
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono-tabular">
                        {site.contributingMissions}
                      </td>
                      <td className="py-3 text-right font-mono-tabular">
                        {site.unassistedSharePercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {showInclusionTable && (
        <Card>
          <CardHeader>
            <CardTitle>{t('learning.subgroupTitle')}</CardTitle>
            <CardDescription>{t('common.simulatedData')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2.5 pr-4 font-medium">{t('learning.headers.subgroup')}</th>
                    <th className="py-2.5 pr-4 font-medium text-right">{t('learning.headers.samples')}</th>
                    <th className="py-2.5 pr-4 font-medium">{t('learning.headers.mae')}</th>
                    <th className="py-2.5 font-medium text-right">{t('learning.headers.coverage')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                  {SUBGROUP_PERFORMANCE.map((row) => (
                    <tr key={row.subgroup}>
                      <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                        {row.subgroup}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono-tabular">{row.sampleCount}</td>
                      <td className="py-3 pr-4 font-mono-tabular text-xs">{row.maeLabel}</td>
                      <td className="py-3 text-right font-mono-tabular font-semibold text-amber-700 dark:text-amber-300">
                        {row.coveragePercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};
