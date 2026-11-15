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
import { formatLocaleNumber } from '../i18n/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export type AdminSectionView = 'sites' | 'sync' | 'inclusion';

export const LearningNetworkPage: React.FC<{ section?: AdminSectionView }> = ({
  section = 'sites',
}) => {
  const { adminSummary } = useSpaceBio();
  const { t, language } = useTranslation();

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
    section === 'sync'
      ? t('nav.modelSync')
      : section === 'inclusion'
        ? t('nav.inclusion')
        : t('nav.partnerSites');

  const showOverviewCards = section === 'sites';
  const showSitesTable = section === 'sites' || section === 'sync';
  const showInclusionTable = section === 'inclusion';
  const showAnonymizedAnomalies = section === 'sites';

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
              <div className="mt-2 font-mono-tabular text-3xl font-bold" dir="ltr">
                {formatLocaleNumber(totalMissions, language)}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">{t('common.simulatedData')}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t('learning.unassistedShare')}
              </div>
              <div className="mt-2 font-mono-tabular text-3xl font-bold text-amber-600 dark:text-amber-400" dir="ltr">
                {formatLocaleNumber(avgUnassisted, language)}%
              </div>
              <div className="mt-1 text-[11px] text-slate-500">{t('common.simulatedData')}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t('learning.syncHealth')}
              </div>
              <div className="mt-2 font-mono-tabular text-3xl font-bold" dir="ltr">
                {formatLocaleNumber(syncedCount, language)} / {formatLocaleNumber(LEARNING_SITES.length, language)}
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
                <span>{formatLocaleNumber(SUPPORTED_LANGUAGES.length, language)}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 truncate" dir="ltr">
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
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2.5 pe-4 font-medium text-start">{t('anomalies.cohort')}</th>
                    <th className="py-2.5 pe-4 font-medium text-end">{t('anomalies.lowCount')}</th>
                    <th className="py-2.5 pe-4 font-medium text-end">{t('anomalies.mediumCount')}</th>
                    <th className="py-2.5 pe-4 font-medium text-end">{t('anomalies.highCount')}</th>
                    <th className="py-2.5 font-medium text-end">{t('anomalies.observations')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                  {anomalyRows.map((row) => (
                    <tr key={row.cohortLabel}>
                      <td className="py-3 pe-4 font-semibold text-slate-900 dark:text-slate-100">
                        {row.cohortKey ? t(row.cohortKey) : row.cohortLabel}
                      </td>
                      <td className="py-3 pe-4 text-end font-mono-tabular">
                        {formatLocaleNumber(row.countLow, language)}
                      </td>
                      <td className="py-3 pe-4 text-end font-mono-tabular text-amber-600 dark:text-amber-300">
                        {formatLocaleNumber(row.countMedium, language)}
                      </td>
                      <td className="py-3 pe-4 text-end font-mono-tabular text-rose-600 dark:text-rose-300">
                        {formatLocaleNumber(row.countHigh, language)}
                      </td>
                      <td className="py-3 text-end font-mono-tabular">
                        {formatLocaleNumber(row.totalObservations, language)}
                      </td>
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
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2.5 pe-4 font-medium text-start">{t('learning.headers.site')}</th>
                    <th className="py-2.5 pe-4 font-medium text-start">{t('learning.headers.country')}</th>
                    <th className="py-2.5 pe-4 font-medium text-start">{t('learning.headers.sync')}</th>
                    <th className="py-2.5 pe-4 font-medium text-end">{t('learning.headers.missions')}</th>
                    <th className="py-2.5 font-medium text-end">{t('learning.headers.unassisted')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                  {LEARNING_SITES.map((site) => (
                    <tr key={site.id}>
                      <td className="py-3 pe-4 font-semibold text-slate-900 dark:text-slate-100">
                        {site.name}
                      </td>
                      <td className="py-3 pe-4 text-slate-600 dark:text-slate-300">
                        {site.countryKey ? t(site.countryKey) : site.country}
                      </td>
                      <td className="py-3 pe-4">
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
                      <td className="py-3 pe-4 text-end font-mono-tabular">
                        {formatLocaleNumber(site.contributingMissions, language)}
                      </td>
                      <td className="py-3 text-end font-mono-tabular">
                        {formatLocaleNumber(site.unassistedSharePercent, language)}%
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
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2.5 pe-4 font-medium text-start">{t('learning.headers.subgroup')}</th>
                    <th className="py-2.5 pe-4 font-medium text-end">{t('learning.headers.samples')}</th>
                    <th className="py-2.5 pe-4 font-medium text-start">{t('learning.headers.mae')}</th>
                    <th className="py-2.5 font-medium text-end">{t('learning.headers.coverage')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                  {SUBGROUP_PERFORMANCE.map((row) => (
                    <tr key={row.subgroup}>
                      <td className="py-3 pe-4 font-medium text-slate-900 dark:text-slate-100">
                        {row.subgroupKey ? t(row.subgroupKey) : row.subgroup}
                      </td>
                      <td className="py-3 pe-4 text-end font-mono-tabular">
                        {formatLocaleNumber(row.sampleCount, language)}
                      </td>
                      <td className="py-3 pe-4 font-mono-tabular text-xs" dir="ltr">
                        {row.maeLabel}
                      </td>
                      <td className="py-3 text-end font-mono-tabular font-semibold text-amber-700 dark:text-amber-300">
                        {formatLocaleNumber(row.coveragePercent, language)}%
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

