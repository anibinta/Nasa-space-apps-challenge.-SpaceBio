import React from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { useTranslation } from '../../i18n';
import { formatLocaleNumber } from '../../i18n/format';
import type { DailyMetricSummary } from '../../types/health';
import { Card, CardContent } from '../ui/card';
import { StatusBadge } from './StatusBadge';

export const MetricCard: React.FC<{
  metric: DailyMetricSummary;
  onSelect?: () => void;
}> = ({ metric, onSelect }) => {
  const { t, language } = useTranslation();

  const displayValue =
    metric.secondaryValue !== undefined
      ? `${formatLocaleNumber(metric.value, language)}/${formatLocaleNumber(metric.secondaryValue, language)}`
      : formatLocaleNumber(metric.value, language);

  const strokeColor =
    metric.status === 'alert'
      ? '#f43f5e'
      : metric.status === 'watch'
      ? '#f59e0b'
      : '#06b6d4';

  return (
    <Card className="flex flex-col justify-between hover:border-cyan-500/40 dark:hover:border-cyan-400/40">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-slate-600 dark:text-slate-300">
              {t(`indicators.${metric.id}`)}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span>{t('common.simulatedData')}</span>
              <span aria-hidden="true">·</span>
              <span>
                {metric.source === 'contactless'
                  ? t('common.contactless')
                  : t('common.manual')}
              </span>
              {metric.indicative && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                    {t('common.indicative')}
                  </span>
                </>
              )}
            </div>
          </div>
          <StatusBadge status={metric.status} />
        </div>

        <div className="mt-4 flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-1.5">
            <span dir="ltr" className="font-mono-tabular text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              {displayValue}
            </span>
            <span dir="ltr" className="font-mono-tabular text-xs font-medium text-slate-500 dark:text-slate-400">
              {metric.unit}
            </span>
          </div>
          <div className="text-end text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
            <div>
              {t('dashboard.referenceRange')}: <span dir="ltr">{formatLocaleNumber(metric.referenceMin, language)}–{formatLocaleNumber(metric.referenceMax, language)}</span>
            </div>
            <div>
              {t('dashboard.baseline')}: <span dir="ltr">{formatLocaleNumber(metric.baseline, language)}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 h-14 w-full" aria-label={`${t(`indicators.${metric.id}`)} ${t('dashboard.vitalCards.trend7d')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metric.trend7d} margin={{ top: 4, right: 4, bottom: 2, left: 4 }}>
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.92)',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#f8fafc',
                }}
                formatter={(v: unknown) => [`${typeof v === 'number' ? formatLocaleNumber(v, language) : v} ${metric.unit}`, t(`indicators.${metric.id}`)]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={2}
                dot={{ r: 2, fill: strokeColor }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {onSelect && (
          <div className="mt-2 flex items-center justify-between border-t border-slate-200/70 pt-2.5 text-xs dark:border-slate-800">
            <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
              {t('common.confidence')}: {formatLocaleNumber(metric.confidence, language)}%
            </span>
            <button
              type="button"
              onClick={onSelect}
              className="font-medium text-cyan-700 hover:underline dark:text-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded"
            >
              {t('common.viewAll')}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
