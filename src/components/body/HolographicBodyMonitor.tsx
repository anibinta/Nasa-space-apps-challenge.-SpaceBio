import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { formatLocaleNumber } from '../../i18n/format';
import {
  BODY_LAYER_IDS,
  calculateBreathingPeriodSeconds,
  calculateHeartbeatPeriodSeconds,
  getLayerOpacity,
  SPACE_BODY_SCENARIOS,
  type BodyLayerId,
  type BodyOrganFocus,
  type BodyScenarioId,
  type BodyScenarioState,
} from '../../lib/bodyMonitor';
import { cn } from '../ui/cn';

interface HolographicBodyMonitorProps {
  scenarioId: BodyScenarioId;
  scenario: BodyScenarioState;
  availableScenarios?: readonly BodyScenarioId[];
  onScenarioChange: (next: BodyScenarioId) => void;
  focusedOrgan: BodyOrganFocus;
  onSelectOrgan: (organ: BodyOrganFocus) => void;
}

const SILHOUETTE_PATH =
  'M210,24 ' +
  'C229,24 242,39 242,61 ' +
  'C242,80 232,93 224,99 ' +
  'L224,117 ' +
  'C245,123 278,131 293,147 ' +
  'C309,165 322,226 334,296 ' +
  'C340,329 343,352 337,366 ' +
  'C331,378 318,376 314,361 ' +
  'C307,334 297,279 286,232 ' +
  'L278,200 ' +
  'C273,234 271,275 274,316 ' +
  'C276,342 280,368 278,392 ' +
  'C276,445 272,516 266,574 ' +
  'C264,598 267,620 272,630 ' +
  'C274,637 265,642 252,640 ' +
  'C242,638 238,630 237,618 ' +
  'C233,558 228,480 222,404 ' +
  'C219,386 214,380 210,380 ' +
  'C206,380 201,386 198,404 ' +
  'C192,480 187,558 183,618 ' +
  'C182,630 178,638 168,640 ' +
  'C155,642 146,637 148,630 ' +
  'C153,620 156,598 154,574 ' +
  'C148,516 144,445 142,392 ' +
  'C140,368 144,342 146,316 ' +
  'C149,275 147,234 142,200 ' +
  'L134,232 ' +
  'C123,279 113,334 106,361 ' +
  'C102,376 89,378 83,366 ' +
  'C77,352 80,329 86,296 ' +
  'C98,226 111,165 127,147 ' +
  'C142,131 175,123 196,117 ' +
  'L196,99 ' +
  'C188,93 178,80 178,61 ' +
  'C178,39 191,24 210,24 Z';

const HOTSPOT_COORDS: Record<
  BodyOrganFocus,
  { cx: number; cy: number; labelX: number; labelY: number; anchor: 'start' | 'end'; color: string }
> = {
  brain: { cx: 210, cy: 60, labelX: 258, labelY: 48, anchor: 'start', color: '#f472b6' },
  lungs: { cx: 184, cy: 194, labelX: 96, labelY: 168, anchor: 'end', color: '#e879f9' },
  heart: { cx: 224, cy: 197, labelX: 320, labelY: 186, anchor: 'start', color: '#fb7185' },
  skeleton: { cx: 245, cy: 334, labelX: 320, labelY: 334, anchor: 'start', color: '#cbd5e1' },
};

export const HolographicBodyMonitor: React.FC<HolographicBodyMonitorProps> = ({
  scenarioId,
  scenario,
  availableScenarios = SPACE_BODY_SCENARIOS,
  onScenarioChange,
  focusedOrgan,
  onSelectOrgan,
}) => {
  const { t, language } = useTranslation();
  const [layersOpen, setLayersOpen] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState<Record<BodyLayerId, boolean>>({
    skeleton: true,
    muscles: true,
    circulatory: true,
    respiratory: true,
    digestive: true,
    nervous: true,
  });

  const layersMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (layersMenuRef.current && !layersMenuRef.current.contains(e.target as Node)) {
        setLayersOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLayersOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const hbPeriodSec = calculateHeartbeatPeriodSeconds(scenario.heartRateBpm);
  const breathPeriodSec = calculateBreathingPeriodSeconds(scenarioId);

  const accentHex =
    scenario.status === 'alert'
      ? '#fb7185'
      : scenario.status === 'watch'
        ? '#f59e0b'
        : '#34d399';

  const toggleLayer = (id: BodyLayerId) => {
    setVisibleLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section
      data-testid="body-monitor-card"
      className="space-grid-bg relative flex flex-col justify-between rounded-xl border border-cyan-400/30 bg-[#070d17] p-4 sm:p-5 shadow-2xl overflow-hidden"
    >
      {/* Top Toolbar: Left Calques | Centre Scenario Dropdown | Right Rose BPM badge + Données simulées */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Cyan Calques button */}
        <div className="relative" ref={layersMenuRef}>
          <button
            type="button"
            data-testid="layers-menu-btn"
            aria-expanded={layersOpen}
            onClick={() => setLayersOpen((o) => !o)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 text-xs font-medium text-cyan-200 transition-colors hover:border-cyan-400/70 hover:bg-cyan-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Layers className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
            <span>{t('dashboard.monitor.layersBtn')}</span>
            <ChevronDown className="h-3 w-3 opacity-75" aria-hidden="true" />
          </button>

          {layersOpen && (
            <div
              role="menu"
              data-testid="layers-menu-popover"
              className="absolute start-0 top-10 z-50 w-48 rounded-xl border border-cyan-400/30 bg-[#0b1424] p-2.5 text-xs text-slate-200 shadow-2xl space-y-1"
            >
              {BODY_LAYER_IDS.map((layerId) => (
                <label
                  key={layerId}
                  className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 hover:bg-cyan-500/10"
                >
                  <span>{t(`dashboard.monitor.layerNames.${layerId}`)}</span>
                  <input
                    type="checkbox"
                    data-testid={`layer-toggle-${layerId}`}
                    checked={visibleLayers[layerId]}
                    onChange={() => toggleLayer(layerId)}
                    className="h-3.5 w-3.5 rounded border-cyan-400/40 bg-[#070d17] text-cyan-400 focus:ring-cyan-400"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Centre: Single Scenario dropdown */}
        <div className="flex items-center justify-center">
          <label htmlFor="body-scenario-select" className="sr-only">
            {t('dashboard.monitor.scenarioLabel')}
          </label>
          <select
            id="body-scenario-select"
            data-testid="scenario-select"
            value={scenarioId}
            onChange={(e) => onScenarioChange(e.target.value as BodyScenarioId)}
            className="h-8 rounded-lg border border-cyan-400/30 bg-[#0b1424] px-3 text-xs font-medium text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            {availableScenarios.map((id) => (
              <option key={id} value={id}>
                {t(`dashboard.monitor.scenarios.${id}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Rose badge (or semantic accent) with live BPM + Données simulées */}
        <div className="flex items-center gap-2">
          <span
            dir="ltr"
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-semibold font-mono-tabular"
            style={{
              borderColor: `${accentHex}66`,
              color: accentHex,
              backgroundColor: `${accentHex}1f`,
            }}
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: accentHex }}
            />
            <span data-testid="body-bpm-readout">
              {formatLocaleNumber(scenario.heartRateBpm, language)} bpm
            </span>
          </span>
          <span className="text-[11px] text-slate-400">{t('common.simulatedData')}</span>
        </div>
      </div>

      {/* Central Holographic Body Canvas with soft cyan radial aura behind the body */}
      <div
        dir="ltr"
        className="relative my-2 flex flex-1 items-center justify-center"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 56% 52% at 50% 48%, rgba(56, 189, 248, 0.16), transparent 72%)',
        }}
      >
        <svg
          id="anatomy-svg"
          data-testid="holographic-body-svg"
          viewBox="0 0 420 672"
          className="h-auto w-full max-h-[590px] max-w-[430px] select-none"
          role="img"
          aria-label={t('bodyMap.title')}
        >
          <defs>
            {/* Body fill gradient: #bae6fd (50%) -> #38bdf8 (32%) -> #7c3aed (42%) */}
            <linearGradient id="holoBodyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.5" />
              <stop offset="52%" stopColor="#38bdf8" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.42" />
            </linearGradient>

            {/* Hologram scanlines every 6 px, #bae6fd at 16% */}
            <pattern id="holoScanlines" width="12" height="6" patternUnits="userSpaceOnUse">
              <line
                x1="0"
                y1="0"
                x2="12"
                y2="0"
                stroke="#bae6fd"
                strokeOpacity="0.16"
                strokeWidth="1"
              />
            </pattern>

            {/* Outer Gaussian blur glow (stdDeviation ~ 7) */}
            <filter id="holoOuterGlow" x="-25%" y="-15%" width="150%" height="130%">
              <feGaussianBlur stdDeviation="7" result="blurred" />
              <feMerge>
                <feMergeNode in="blurred" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Animated dashed rim gradient (#67e8f9, #a78bfa, #22d3ee) */}
            <linearGradient id="holoRimGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>

            {/* Soft cyan glow ellipse under the feet */}
            <radialGradient id="holoFeetGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.46" />
              <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>

            {/* Skeleton bone gradient: #cbd5e1, #f8fafc, #94a3b8 */}
            <linearGradient id="boneGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            {/* Muscle red gradient: #c95b4b, #9e382b, #691f17 */}
            <linearGradient id="muscleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c95b4b" stopOpacity="0.82" />
              <stop offset="55%" stopColor="#9e382b" stopOpacity="0.72" />
              <stop offset="100%" stopColor="#691f17" stopOpacity="0.75" />
            </linearGradient>

            {/* Brain pink-magenta radial gradient */}
            <radialGradient id="brainRadial" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#f9a8d4" />
              <stop offset="55%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#9d174d" />
            </radialGradient>

            {/* Lungs pink-violet radial gradient */}
            <radialGradient id="lungRadial" cx="50%" cy="45%" r="58%">
              <stop offset="0%" stopColor="#f5d0fe" stopOpacity="0.9" />
              <stop offset="52%" stopColor="#e879f9" stopOpacity="0.72" />
              <stop offset="100%" stopColor="#7e22ce" stopOpacity="0.68" />
            </radialGradient>

            {/* Heart red radial gradient */}
            <radialGradient id="heartRadial" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fecaca" />
              <stop offset="55%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </radialGradient>

            <clipPath id="bodyClip">
              <path d={SILHOUETTE_PATH} />
            </clipPath>
          </defs>

          {/* Soft cyan glow ellipse under the feet */}
          <ellipse cx="210" cy="645" rx="115" ry="18" fill="url(#holoFeetGlow)" />

          {/* Base Holographic Silhouette + Outer Glow */}
          <path
            d={SILHOUETTE_PATH}
            fill="url(#holoBodyFill)"
            filter="url(#holoOuterGlow)"
          />

          {/* Hologram horizontal scanlines inside body silhouette */}
          <g clipPath="url(#bodyClip)">
            <rect x="70" y="20" width="280" height="628" fill="url(#holoScanlines)" />
          </g>

          {/* Internal Anatomical Layers clipped inside body */}
          <g clipPath="url(#bodyClip)">
            {/* 1. MUSCLES LAYER (Neck, shoulders, arms, thighs) */}
            <g
              data-testid="layer-muscles"
              style={{
                opacity: getLayerOpacity('muscles', visibleLayers),
                transition: 'opacity 250ms ease',
              }}
            >
              {/* Neck sternocleidomastoids */}
              <path d="M198,98 L205,126 L191,131 Z" fill="url(#muscleGrad)" />
              <path d="M222,98 L215,126 L229,131 Z" fill="url(#muscleGrad)" />
              {/* Shoulders / Deltoids & Pectorals */}
              <path
                d="M148,136 C168,132 190,137 206,149 C190,174 166,178 143,167 C132,160 135,142 148,136 Z"
                fill="url(#muscleGrad)"
              />
              <path
                d="M272,136 C252,132 230,137 214,149 C230,174 254,178 277,167 C288,160 285,142 272,136 Z"
                fill="url(#muscleGrad)"
              />
              {/* Left & Right Arms (Biceps/Forearms) */}
              <path
                d="M134,158 C120,185 110,235 98,308 C103,314 111,310 118,280 C126,245 136,204 143,174 Z"
                fill="url(#muscleGrad)"
              />
              <path
                d="M286,158 C300,185 310,235 322,308 C317,314 309,310 302,280 C294,245 284,204 277,174 Z"
                fill="url(#muscleGrad)"
              />
              {/* Thighs & Calves */}
              <path
                d="M150,362 C145,420 148,472 157,504 C168,504 179,472 186,406 C185,375 166,356 150,362 Z"
                fill="url(#muscleGrad)"
              />
              <path
                d="M270,362 C275,420 272,472 263,504 C252,504 241,472 234,406 C235,375 254,356 270,362 Z"
                fill="url(#muscleGrad)"
              />
              <path
                d="M156,518 C152,554 156,586 164,598 C173,596 179,560 178,518 Z"
                fill="url(#muscleGrad)"
              />
              <path
                d="M264,518 C268,554 264,586 256,598 C247,596 241,560 242,518 Z"
                fill="url(#muscleGrad)"
              />
            </g>

            {/* 2. SKELETON LAYER (Spine, ribs, sternum, pelvis, femurs) */}
            <g
              data-testid="layer-skeleton"
              style={{
                opacity: getLayerOpacity('skeleton', visibleLayers),
                transition: 'opacity 250ms ease',
              }}
            >
              {/* Clavicles */}
              <path
                d="M207,134 Q174,129 144,142"
                fill="none"
                stroke="url(#boneGrad)"
                strokeWidth="4.2"
                strokeLinecap="round"
              />
              <path
                d="M213,134 Q246,129 276,142"
                fill="none"
                stroke="url(#boneGrad)"
                strokeWidth="4.2"
                strokeLinecap="round"
              />
              {/* Spine: pink dashed central line + white vertebrae */}
              <path
                d="M210,104 L210,334"
                fill="none"
                stroke="#f472b6"
                strokeWidth="2.4"
                strokeDasharray="4 4"
                opacity="0.9"
              />
              {Array.from({ length: 16 }).map((_, idx) => (
                <rect
                  key={idx}
                  x="205.5"
                  y={108 + idx * 14}
                  width="9"
                  height="8.5"
                  rx="2.5"
                  fill="url(#boneGrad)"
                  opacity="0.95"
                />
              ))}
              {/* Sternum */}
              <path
                d="M206,144 L214,144 L212.5,214 L207.5,214 Z"
                fill="url(#boneGrad)"
                opacity="0.92"
              />
              {/* Paired Ribs (7 ribs left & right) */}
              {[156, 169, 182, 195, 208, 221, 234].map((y, idx) => {
                const span = 44 + (idx < 4 ? idx * 6 : (6 - idx) * 5);
                return (
                  <g key={y} fill="none" stroke="url(#boneGrad)" strokeWidth="3.2" strokeLinecap="round" opacity="0.86">
                    <path d={`M206,${y} C${200 - span * 0.6},${y - 4} ${204 - span},${y + 10} ${208 - span * 0.72},${y + 18}`} />
                    <path d={`M214,${y} C${220 + span * 0.6},${y - 4} ${216 + span},${y + 10} ${212 + span * 0.72},${y + 18}`} />
                  </g>
                );
              })}
              {/* Pelvis */}
              <path
                d="M158,318 C148,332 152,358 172,366 C188,370 198,358 210,358 C222,358 232,370 248,366 C268,358 272,332 262,318 C248,310 232,324 210,324 C188,324 172,310 158,318 Z"
                fill="none"
                stroke="url(#boneGrad)"
                strokeWidth="5"
                opacity="0.9"
              />
              {/* Femurs & Tibiae */}
              <path d="M170,356 L174,490 M174,500 L170,618" stroke="url(#boneGrad)" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
              <path d="M250,356 L246,490 M246,500 L250,618" stroke="url(#boneGrad)" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
            </g>

            {/* 3. DIGESTIVE LAYER (Liver, stomach, intestines) */}
            <g
              data-testid="layer-digestive"
              style={{
                opacity: getLayerOpacity('digestive', visibleLayers),
                transition: 'opacity 250ms ease',
              }}
            >
              {/* Liver (right abdomen / viewer left) */}
              <path
                d="M166,252 C178,243 206,246 210,259 C212,268 186,282 164,279 C156,274 157,258 166,252 Z"
                fill="#c26d3a"
                fillOpacity="0.72"
                stroke="#f59e0b"
                strokeOpacity="0.45"
                strokeWidth="1.2"
              />
              {/* Stomach (left abdomen / viewer right) */}
              <path
                d="M210,254 C228,249 246,262 243,279 C240,291 220,292 212,282 C205,274 205,260 210,254 Z"
                fill="#fb923c"
                fillOpacity="0.58"
                stroke="#fdba74"
                strokeOpacity="0.55"
                strokeWidth="1.2"
              />
              {/* Intestines */}
              <path
                d="M172,292 C192,286 228,286 244,294 C254,302 248,326 236,334 C220,342 184,342 172,332 C164,322 165,299 172,292 Z"
                fill="#d97706"
                fillOpacity="0.32"
                stroke="#fbbf24"
                strokeOpacity="0.55"
                strokeWidth="2.4"
              />
              <path
                d="M180,305 C195,298 222,306 234,302 M182,317 C198,324 220,313 234,320 M186,328 C202,324 218,332 230,328"
                fill="none"
                stroke="#fcd34d"
                strokeOpacity="0.55"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>

            {/* 4. CIRCULATORY LAYER (Veins + Arteries with 1.4s flowing dashes + BPM-synced Heart) */}
            <g
              data-testid="layer-circulatory"
              style={{
                opacity: getLayerOpacity('circulatory', visibleLayers),
                transition: 'opacity 250ms ease',
              }}
            >
              {/* Blue Veins */}
              <g
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="6 6"
                strokeLinecap="round"
                className="holo-vessel-flow"
                opacity="0.88"
              >
                <path d="M204,76 L204,185 L204,342" />
                <path d="M204,148 Q166,154 138,184 L106,330" />
                <path d="M204,148 Q254,154 282,184 L314,330" />
                <path d="M204,342 L176,408 L168,585" />
                <path d="M204,342 L244,408 L252,585" />
              </g>

              {/* Red Arteries */}
              <g
                fill="none"
                stroke="#f87171"
                strokeWidth="2"
                strokeDasharray="6 6"
                strokeLinecap="round"
                className="holo-vessel-flow"
                opacity="0.9"
              >
                <path d="M216,74 L216,188 L214,346" />
                <path d="M216,154 Q170,158 142,190 L110,334" />
                <path d="M216,154 Q252,158 278,190 L310,334" />
                <path d="M214,346 L182,412 L173,585" />
                <path d="M214,346 L239,412 L247,585" />
              </g>

              {/* Heart with period = 60 / bpm seconds */}
              <g
                className="holo-heart-beat"
                style={{ '--hb-period': `${hbPeriodSec}s` } as React.CSSProperties}
              >
                <path
                  d="M220,183 C214,174 202,178 202,189 C202,202 216,214 224,221 C234,214 242,200 240,187 C238,177 227,175 220,183 Z"
                  fill="url(#heartRadial)"
                  stroke="#fecaca"
                  strokeOpacity="0.7"
                  strokeWidth="1.2"
                />
              </g>
            </g>

            {/* 5. RESPIRATORY LAYER (Two pink-violet lungs with bubbly alveolar texture + 3.8s / 2.2s EVA breathing) */}
            <g
              data-testid="layer-respiratory"
              style={{
                opacity: getLayerOpacity('respiratory', visibleLayers),
                transition: 'opacity 250ms ease',
              }}
            >
              <g
                className="holo-lung-breathe"
                style={{ '--breath-period': `${breathPeriodSec}s` } as React.CSSProperties}
              >
                {/* Trachea */}
                <path
                  d="M210,126 L210,164 M210,164 L192,180 M210,164 L228,180"
                  fill="none"
                  stroke="#f5d0fe"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                />
                {/* Right lung lobe (viewer left) */}
                <path
                  d="M201,164 C180,162 162,182 159,212 C157,232 168,243 185,241 C198,239 203,228 203,210 Z"
                  fill="url(#lungRadial)"
                  stroke="#f5d0fe"
                  strokeOpacity="0.65"
                  strokeWidth="1.2"
                />
                {/* Left lung lobe (viewer right) */}
                <path
                  d="M219,164 C240,162 258,182 261,212 C263,232 252,243 235,241 C222,239 217,228 217,210 Z"
                  fill="url(#lungRadial)"
                  stroke="#f5d0fe"
                  strokeOpacity="0.65"
                  strokeWidth="1.2"
                />
                {/* Bubbly alveolar texture inside both pink-violet lungs */}
                <g fill="#fdf4ff" fillOpacity="0.28" stroke="#f0abfc" strokeOpacity="0.35" strokeWidth="0.7">
                  <circle cx="187" cy="183" r="5" />
                  <circle cx="174" cy="197" r="6" />
                  <circle cx="190" cy="202" r="5.5" />
                  <circle cx="172" cy="218" r="6.5" />
                  <circle cx="189" cy="222" r="5" />
                  <circle cx="178" cy="233" r="4" />
                  <circle cx="233" cy="183" r="5" />
                  <circle cx="246" cy="197" r="6" />
                  <circle cx="230" cy="202" r="5.5" />
                  <circle cx="248" cy="218" r="6.5" />
                  <circle cx="231" cy="222" r="5" />
                  <circle cx="242" cy="233" r="4" />
                </g>
              </g>
            </g>

            {/* 6. NERVOUS LAYER (Rounded magenta-pink brain with concentric folds + 2.6s neural glow + pink spinal line) */}
            <g
              data-testid="layer-nervous"
              style={{
                opacity: getLayerOpacity('nervous', visibleLayers),
                transition: 'opacity 250ms ease',
              }}
            >
              <g className="holo-neural-pulse">
                <path
                  d="M210,32 C190,32 183,48 185,64 C187,77 198,82 207,81 L210,78 L213,81 C222,82 233,77 235,64 C237,48 230,32 210,32 Z"
                  fill="url(#brainRadial)"
                  stroke="#fbcfe8"
                  strokeWidth="1.2"
                />
                {/* Concentric cortical folds */}
                <path
                  d="M210,35 L210,77 M198,40 C190,46 190,66 199,73 M222,40 C230,46 230,66 221,73 M202,46 C196,52 197,62 203,67 M218,46 C224,52 223,62 217,67 M193,56 C199,54 202,58 206,56 M227,56 C221,54 218,58 214,56"
                  fill="none"
                  stroke="#fdf2f8"
                  strokeOpacity="0.72"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
                <path
                  d="M210,81 L210,336"
                  fill="none"
                  stroke="#f472b6"
                  strokeOpacity="0.68"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                />
              </g>
            </g>
          </g>

          {/* Silhouette Contour: 2 px #67e8f9 + Animated Dashed Rim (16/12, 3.2s loop) */}
          <path
            d={SILHOUETTE_PATH}
            fill="none"
            stroke="#67e8f9"
            strokeWidth="2"
            opacity="0.92"
          />
          <path
            d={SILHOUETTE_PATH}
            fill="none"
            stroke="url(#holoRimGrad)"
            strokeWidth="2.4"
            strokeDasharray="16 12"
            strokeLinecap="round"
            className="holo-rim-animate"
          />

          {/* Interactive Hotspots: white ring with dark centre, pulsing, organ-coloured leader lines, uppercase labels */}
          {(['brain', 'lungs', 'heart', 'skeleton'] as const).map((organ) => {
            const coord = HOTSPOT_COORDS[organ];
            const isSelected = focusedOrgan === organ;
            const organColor = coord.color;
            const label = t(`dashboard.monitor.hotspots.${organ}`);
            const textAnchor = coord.anchor;

            return (
              <g
                key={organ}
                role="button"
                tabIndex={0}
                data-testid={`hotspot-${organ}`}
                aria-label={label}
                aria-pressed={isSelected}
                onClick={() => onSelectOrgan(organ)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectOrgan(organ);
                  }
                }}
                className="cursor-pointer focus:outline-none"
              >
                {/* Thin leader line in the organ's colour */}
                <line
                  x1={coord.cx}
                  y1={coord.cy}
                  x2={coord.labelX}
                  y2={coord.labelY}
                  stroke={organColor}
                  strokeOpacity={isSelected ? 1 : 0.72}
                  strokeWidth={isSelected ? '1.5' : '1.15'}
                />
                {/* Outer pulsing ring */}
                <circle
                  cx={coord.cx}
                  cy={coord.cy}
                  r="11"
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.8"
                  strokeWidth="1.4"
                  className="holo-hotspot-pulse"
                />
                {/* White ring with a dark centre */}
                <circle
                  cx={coord.cx}
                  cy={coord.cy}
                  r={isSelected ? 8.5 : 7}
                  fill="#070d17"
                  stroke="#ffffff"
                  strokeWidth={isSelected ? 2.6 : 2}
                />
                <circle
                  cx={coord.cx}
                  cy={coord.cy}
                  r="2.4"
                  fill="#070d17"
                  stroke={organColor}
                  strokeWidth="1.2"
                />

                {/* Clickable uppercase label */}
                <text
                  x={coord.anchor === 'start' ? coord.labelX + 6 : coord.labelX - 6}
                  y={coord.labelY + 4}
                  textAnchor={textAnchor}
                  fill={isSelected ? '#ffffff' : organColor}
                  fontSize="10.5"
                  fontWeight={isSelected ? '700' : '600'}
                  letterSpacing="0.06em"
                  className="font-mono-tabular"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
};
