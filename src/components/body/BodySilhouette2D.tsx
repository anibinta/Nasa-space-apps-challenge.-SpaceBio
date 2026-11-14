import React from 'react';
import { useTranslation } from '../../i18n';
import type { BodyRegionId, BodyRegionInfo, StatusLevel } from '../../types/health';

const STATUS_FILL: Record<StatusLevel, string> = {
  nominal: '#10b981',
  watch: '#f59e0b',
  alert: '#f43f5e',
};

export const BodySilhouette2D: React.FC<{
  regions: BodyRegionInfo[];
  selectedRegion: BodyRegionId;
  showSkeletonOverlay: boolean;
  highlightBoneRegions?: boolean;
  onSelectRegion: (id: BodyRegionId) => void;
}> = ({
  regions,
  selectedRegion,
  showSkeletonOverlay,
  highlightBoneRegions = false,
  onSelectRegion,
}) => {
  const { t } = useTranslation();

  const getRegion = (id: BodyRegionId) => regions.find((r) => r.id === id);

  const styleFor = (id: BodyRegionId) => {
    const info = getRegion(id);
    const fill = info ? STATUS_FILL[info.status] : '#38bdf8';
    const isSelected = selectedRegion === id;
    const isBoneHighlight = highlightBoneRegions && info?.boneRelated;
    return {
      fill,
      fillOpacity: isSelected ? 0.55 : isBoneHighlight ? 0.4 : 0.22,
      stroke: isSelected ? '#22d3ee' : fill,
      strokeWidth: isSelected ? 2.5 : 1.5,
      className: 'cursor-pointer transition-all duration-200 focus:outline-none',
    };
  };

  return (
    <div
      data-testid="body-2d-fallback"
      className="flex h-[440px] sm:h-[520px] w-full items-center justify-center rounded-xl border border-slate-200/80 bg-[#070d1f] p-4 dark:border-slate-800"
    >
      <svg
        viewBox="0 0 260 440"
        className="h-full max-h-[460px] w-auto"
        role="img"
        aria-label={t('bodyMap.title')}
      >
        {/* head */}
        <g
          role="button"
          tabIndex={0}
          aria-label={t('bodyMap.regions.head.name')}
          onClick={() => onSelectRegion('head')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectRegion('head')}
        >
          <ellipse cx="130" cy="44" rx="22" ry="26" {...styleFor('head')} />
        </g>

        {/* neck */}
        <g
          role="button"
          tabIndex={0}
          aria-label={t('bodyMap.regions.neck.name')}
          onClick={() => onSelectRegion('neck')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectRegion('neck')}
        >
          <rect x="119" y="68" width="22" height="18" rx="6" {...styleFor('neck')} />
        </g>

        {/* chest */}
        <g
          role="button"
          tabIndex={0}
          aria-label={t('bodyMap.regions.chest.name')}
          onClick={() => onSelectRegion('chest')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectRegion('chest')}
        >
          <path d="M84 92 C84 82, 176 82, 176 92 L168 158 L92 158 Z" {...styleFor('chest')} />
        </g>

        {/* abdomen */}
        <g
          role="button"
          tabIndex={0}
          aria-label={t('bodyMap.regions.abdomen.name')}
          onClick={() => onSelectRegion('abdomen')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectRegion('abdomen')}
        >
          <path d="M92 160 L168 160 L166 202 L94 202 Z" {...styleFor('abdomen')} />
        </g>

        {/* pelvis */}
        <g
          role="button"
          tabIndex={0}
          aria-label={t('bodyMap.regions.pelvis.name')}
          onClick={() => onSelectRegion('pelvis')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectRegion('pelvis')}
        >
          <path d="M93 204 L167 204 L172 234 C172 242, 88 242, 88 234 Z" {...styleFor('pelvis')} />
        </g>

        {/* rightArm (anatomical right = viewer left) */}
        <g
          role="button"
          tabIndex={0}
          aria-label={t('bodyMap.regions.rightArm.name')}
          onClick={() => onSelectRegion('rightArm')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectRegion('rightArm')}
        >
          <rect x="54" y="92" width="24" height="128" rx="12" {...styleFor('rightArm')} />
        </g>

        {/* leftArm (anatomical left = viewer right) */}
        <g
          role="button"
          tabIndex={0}
          aria-label={t('bodyMap.regions.leftArm.name')}
          onClick={() => onSelectRegion('leftArm')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectRegion('leftArm')}
        >
          <rect x="182" y="92" width="24" height="128" rx="12" {...styleFor('leftArm')} />
        </g>

        {/* rightLeg */}
        <g
          role="button"
          tabIndex={0}
          aria-label={t('bodyMap.regions.rightLeg.name')}
          onClick={() => onSelectRegion('rightLeg')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectRegion('rightLeg')}
        >
          <rect x="92" y="242" width="32" height="170" rx="14" {...styleFor('rightLeg')} />
        </g>

        {/* leftLeg */}
        <g
          role="button"
          tabIndex={0}
          aria-label={t('bodyMap.regions.leftLeg.name')}
          onClick={() => onSelectRegion('leftLeg')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectRegion('leftLeg')}
        >
          <rect x="136" y="242" width="32" height="170" rx="14" {...styleFor('leftLeg')} />
        </g>

        {/* spine */}
        <g
          role="button"
          tabIndex={0}
          aria-label={t('bodyMap.regions.spine.name')}
          onClick={() => onSelectRegion('spine')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectRegion('spine')}
        >
          <rect x="123" y="88" width="14" height="142" rx="7" {...styleFor('spine')} />
        </g>

        {/* skeleton overlay (hidden by default unless toggled / bone markers selected) */}
        {(showSkeletonOverlay || selectedRegion === 'skeleton' || highlightBoneRegions) && (
          <g
            role="button"
            tabIndex={0}
            aria-label={t('bodyMap.regions.skeleton.name')}
            onClick={() => onSelectRegion('skeleton')}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectRegion('skeleton')}
            className="cursor-pointer"
          >
            <line x1="100" y1="104" x2="160" y2="104" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="130" cy="128" rx="30" ry="22" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 3" />
            <ellipse cx="130" cy="220" rx="28" ry="11" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
            <line x1="108" y1="244" x2="108" y2="400" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
            <line x1="152" y1="244" x2="152" y2="400" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  );
};
