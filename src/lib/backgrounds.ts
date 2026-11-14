import type { OperationalMode } from '../types/health';

export interface SpaceBackground {
  id: string;
  src: string;
  label: string;
  mode: OperationalMode;
}

export const SPACE_BACKGROUNDS: readonly SpaceBackground[] = [
  {
    id: 'nebula-01',
    src: '/backgrounds/space/nebula-01.webp',
    label: 'Emission Nebula',
    mode: 'space',
  },
  {
    id: 'galaxy-01',
    src: '/backgrounds/space/galaxy-01.webp',
    label: 'Spiral Galaxy',
    mode: 'space',
  },
  {
    id: 'deep-field-01',
    src: '/backgrounds/space/deep-field-01.webp',
    label: 'Deep Space Field',
    mode: 'space',
  },
] as const;

export const EARTH_BACKGROUNDS: readonly SpaceBackground[] = [
  {
    id: 'earth-limb-01',
    src: '/backgrounds/earth/earth-limb-01.webp',
    label: 'Orbital Earth Limb',
    mode: 'earth',
  },
  {
    id: 'earth-horizon-01',
    src: '/backgrounds/earth/earth-horizon-01.webp',
    label: 'Orbital Cloud Horizon',
    mode: 'earth',
  },
  {
    id: 'earth-coastline-01',
    src: '/backgrounds/earth/earth-coastline-01.webp',
    label: 'Daylight Continents',
    mode: 'earth',
  },
  {
    id: 'earth-aurora-01',
    src: '/backgrounds/earth/earth-aurora-01.webp',
    label: 'Nighttime Earth Aurora',
    mode: 'earth',
  },
] as const;

export function getBackgroundsForMode(mode: OperationalMode): readonly SpaceBackground[] {
  return mode === 'space' ? SPACE_BACKGROUNDS : EARTH_BACKGROUNDS;
}

export function pickRandomBackground(
  mode: OperationalMode = 'space',
  rng: () => number = Math.random
): SpaceBackground {
  const pool = getBackgroundsForMode(mode);
  const raw = rng();
  const clamped = Number.isFinite(raw) ? Math.min(0.999999, Math.max(0, raw)) : 0;
  const index = Math.floor(clamped * pool.length);
  return pool[index] ?? pool[0];
}
