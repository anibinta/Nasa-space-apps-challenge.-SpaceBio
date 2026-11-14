import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bone, Layers } from 'lucide-react';
import { useSpaceBio } from '../context/SpaceBioContext';
import { BODY_REGIONS } from '../data/simulatedData';
import { useTranslation } from '../i18n';
import { BodyScene3D, detectSoftwareWebGL } from '../components/body/BodyScene3D';
import { BodySilhouette2D } from '../components/body/BodySilhouette2D';
import { StatusBadge } from '../components/shared/StatusBadge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/input';

export const BodyMapPage: React.FC = () => {
  const { selectedBodyRegion, setSelectedBodyRegion } = useSpaceBio();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const boneFocusMode = searchParams.get('bone') === '1';

  const [webglProbe] = useState(() => detectSoftwareWebGL());
  const [use2dFallback, setUse2dFallback] = useState<boolean>(() => !webglProbe.supported);
  const [showSkeletonOverlay, setShowSkeletonOverlay] = useState<boolean>(boneFocusMode);

  useEffect(() => {
    if (boneFocusMode) {
      setShowSkeletonOverlay(true);
    }
  }, [boneFocusMode]);

  const activeRegionInfo =
    BODY_REGIONS.find((r) => r.id === selectedBodyRegion) ?? BODY_REGIONS[0];

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
            {t('bodyMap.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t('bodyMap.subtitle')} · {t('common.simulatedData')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="skeleton-overlay-switch"
              checked={showSkeletonOverlay}
              onCheckedChange={setShowSkeletonOverlay}
            />
            <Label htmlFor="skeleton-overlay-switch" className="text-xs cursor-pointer">
              {t('bodyMap.controls.skeletonToggle')}
            </Label>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUse2dFallback((prev) => !prev)}
            disabled={!webglProbe.supported}
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {use2dFallback
                ? t('bodyMap.controls.fallbackToggle3d')
                : t('bodyMap.controls.fallbackToggle2d')}
            </span>
          </Button>
        </div>
      </div>

      {!webglProbe.supported && (
        <div
          role="note"
          className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200"
        >
          {t('bodyMap.controls.webglUnavailableNotice')}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left/Center Viewport */}
        <div className="lg:col-span-7 space-y-4">
          {use2dFallback ? (
            <BodySilhouette2D
              regions={BODY_REGIONS}
              selectedRegion={selectedBodyRegion}
              showSkeletonOverlay={showSkeletonOverlay}
              highlightBoneRegions={boneFocusMode}
              onSelectRegion={setSelectedBodyRegion}
            />
          ) : (
            <BodyScene3D
              regions={BODY_REGIONS}
              selectedRegion={selectedBodyRegion}
              showSkeletonOverlay={showSkeletonOverlay}
              highlightBoneRegions={boneFocusMode}
              onSelectRegion={setSelectedBodyRegion}
              onContextLostFallback={() => setUse2dFallback(true)}
              isSoftwareGl={webglProbe.isSoftwareGl}
            />
          )}

          {/* Keyboard & Screen-Reader Accessible List of All Regions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('bodyMap.regionListTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {BODY_REGIONS.map((region) => {
                const isSelected = region.id === selectedBodyRegion;
                return (
                  <button
                    key={region.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedBodyRegion(region.id)}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-500/15 text-slate-950 dark:text-white'
                        : 'border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="font-medium truncate">
                      {t(`bodyMap.regions.${region.id}.name`)}
                    </span>
                    <StatusBadge status={region.status} />
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Side Panel: Selected Region Details */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardDescription>{t('bodyMap.panelTitle')}</CardDescription>
                <CardTitle className="mt-1 text-xl">
                  {t(`bodyMap.regions.${activeRegionInfo.id}.name`)}
                </CardTitle>
              </div>
              <StatusBadge status={activeRegionInfo.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {activeRegionInfo.boneRelated && (
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                <Bone className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('bodyMap.boneHighlightTag')}</span>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('bodyMap.functionLabel')}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                {t(activeRegionInfo.functionKey)}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('bodyMap.indicatorsLabel')}
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm font-mono-tabular text-slate-800 dark:text-slate-200">
                {activeRegionInfo.relatedIndicators.map((ind) => (
                  <li
                    key={ind}
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-[#0d162d]"
                  >
                    {ind} · {t('common.simulatedData')}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('bodyMap.explanationLabel')}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {t(activeRegionInfo.explanationKey)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};
