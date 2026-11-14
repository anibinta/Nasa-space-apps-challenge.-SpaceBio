import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, Bone, Compass, CalendarCheck } from 'lucide-react';
import { useSpaceBio } from '../context/SpaceBioContext';
import { useTranslation } from '../i18n';
import { StatusBadge } from '../components/shared/StatusBadge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export const BoneHealthPage: React.FC = () => {
  const { boneHealth, setSelectedBodyRegion } = useSpaceBio();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const resPct = Math.min(
    100,
    Math.round((boneHealth.resistiveExerciseMinutesToday / boneHealth.resistiveExerciseTarget) * 100)
  );
  const standPct = Math.min(
    100,
    Math.round((boneHealth.standingTimeMinutesToday / boneHealth.standingTimeTarget) * 100)
  );

  // SVG gauge arc math
  const gaugeAngle = Math.min(180, (boneHealth.riskEstimatePercent / 35) * 180);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            {t('bone.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t('bone.subtitle')} · {t('common.simulatedData')}
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            setSelectedBodyRegion('spine');
            navigate('/body-map?bone=1');
          }}
        >
          <Compass className="h-4 w-4" aria-hidden="true" />
          <span>{t('bone.inspect3dCta')}</span>
        </Button>
      </div>

      {/* Mandatory DXA notice */}
      <div
        role="note"
        className="flex items-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-950 dark:text-amber-200"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <span>{t('bone.modelNotice')}</span>
      </div>

      {/* Top Row: Risk Gauge + Daily Mechanical Load */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>{t('bone.riskModelTitle')}</CardTitle>
            <CardDescription>{t('common.simulatedData')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-4">
            <svg viewBox="0 0 220 130" className="w-60 h-36" aria-label={t('bone.riskModelTitle')}>
              {/* Background arc */}
              <path
                d="M 20 110 A 90 90 0 0 1 200 110"
                fill="none"
                stroke="rgba(148,163,184,0.22)"
                strokeWidth="16"
                strokeLinecap="round"
              />
              {/* Risk arc */}
              <path
                d="M 20 110 A 90 90 0 0 1 200 110"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={`${(gaugeAngle / 180) * 282.7} 282.7`}
              />
              <text
                x="110"
                y="95"
                textAnchor="middle"
                className="fill-slate-900 dark:fill-white font-mono-tabular text-2xl font-bold"
              >
                {boneHealth.riskEstimatePercent}%
              </text>
              <text
                x="110"
                y="116"
                textAnchor="middle"
                className="fill-slate-500 dark:fill-slate-400 font-mono-tabular text-[11px]"
              >
                {t('bone.riskIntervalLabel')}: {boneHealth.riskIntervalLow}%–{boneHealth.riskIntervalHigh}%
              </text>
            </svg>
            <p className="mt-2 text-center text-xs text-slate-600 dark:text-slate-400">
              {t('bone.modelNotice')}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>{t('bone.loadTitle')}</CardTitle>
            <CardDescription>{t('common.simulatedData')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {t('bone.resistiveLabel')}
                </span>
                <span className="font-mono-tabular font-semibold">
                  {boneHealth.resistiveExerciseMinutesToday} / {boneHealth.resistiveExerciseTarget} min ({resPct}%)
                </span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${resPct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {t('bone.standingLabel')}
                </span>
                <span className="font-mono-tabular font-semibold">
                  {boneHealth.standingTimeMinutesToday} / {boneHealth.standingTimeTarget} min ({standPct}%)
                </span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-cyan-500"
                  style={{ width: `${standPct}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              {(['spine', 'pelvis', 'leftLeg', 'rightLeg', 'skeleton'] as const).map((regionId) => (
                <Button
                  key={regionId}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedBodyRegion(regionId);
                    navigate('/body-map?bone=1');
                  }}
                >
                  <Bone className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                  <span>{t(`bodyMap.regions.${regionId}.name`)}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bone Turnover Markers Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('bone.markersTitle')}</CardTitle>
          <CardDescription>{t('common.simulatedData')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">{t('bone.tableHeaders.marker')}</th>
                  <th className="py-2.5 pr-4 font-medium text-right">{t('bone.tableHeaders.value')}</th>
                  <th className="py-2.5 pr-4 font-medium">{t('bone.tableHeaders.reference')}</th>
                  <th className="py-2.5 pr-4 font-medium">{t('bone.tableHeaders.source')}</th>
                  <th className="py-2.5 pr-4 font-medium">{t('bone.tableHeaders.date')}</th>
                  <th className="py-2.5 font-medium">{t('bone.tableHeaders.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                {boneHealth.markers.map((m) => (
                  <tr key={m.id}>
                    <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-slate-100">
                      {m.marker}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono-tabular font-semibold">
                      {m.value}{' '}
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                        {m.unit}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono-tabular text-xs text-slate-600 dark:text-slate-300">
                      {m.referenceRange}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-600 dark:text-slate-300">
                      {m.samplingSource}
                    </td>
                    <td className="py-3 pr-4 font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                      {m.date}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Schedule of Direct Exams */}
      <Card>
        <CardHeader>
          <CardTitle>{t('bone.examsTitle')}</CardTitle>
          <CardDescription>{t('common.simulatedData')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {boneHealth.exams.map((ex) => (
              <div
                key={ex.id}
                className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {ex.examType}
                  </span>
                  <CalendarCheck className="h-4 w-4 text-cyan-500 shrink-0" aria-hidden="true" />
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {ex.phase} · {ex.facility}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-mono-tabular">
                  <span>
                    {t('common.day')} {ex.scheduledDay} ({ex.scheduledDate})
                  </span>
                  <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                    {t(`bone.examStatus.${ex.status}`)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
