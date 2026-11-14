import type {
  AlertSeverity,
  AssignedPatient,
  Language,
  OperationalMode,
  UserRole,
} from '../types/health.ts';

export const ALLOWED_ROLES: readonly UserRole[] = ['astronaut', 'doctor', 'admin'];

export const ALLOWED_LANGUAGES: readonly Language[] = [
  'ar',
  'bn',
  'en',
  'fr',
  'hi',
  'zh',
  'pt',
  'ru',
  'es',
  'ur',
];

export interface OnboardingPayload {
  role: UserRole;
  language: Language;
  firstName: string;
  lastName: string;
  age: number;
  mode: OperationalMode;
  missionName?: string;
  startDate?: string;
  plannedDurationDays?: number;
}

export interface ValidatedOnboarding {
  role: UserRole;
  language: Language;
  firstName: string;
  lastName: string;
  fullName: string;
  age: number;
  effectiveMode: OperationalMode;
  missionName: string;
  startDate: string;
  plannedDurationDays: number;
  currentDay: number;
}

export function isValidRole(role: unknown): role is UserRole {
  return typeof role === 'string' && (ALLOWED_ROLES as readonly string[]).includes(role);
}

export function isValidLanguage(lang: unknown): lang is Language {
  return typeof lang === 'string' && (ALLOWED_LANGUAGES as readonly string[]).includes(lang);
}

export function enforceEffectiveMode(role: UserRole, requestedMode: OperationalMode): OperationalMode {
  return role === 'astronaut' ? (requestedMode === 'earth' ? 'earth' : 'space') : 'earth';
}

export function validateOnboardingPayload(
  raw: Partial<OnboardingPayload>,
  nowMs: number = Date.now()
): { valid: true; data: ValidatedOnboarding } | { valid: false; error: string } {
  if (!isValidRole(raw.role)) {
    return { valid: false, error: 'Invalid role. Allowed: astronaut, doctor, admin.' };
  }

  const language: Language = isValidLanguage(raw.language) ? raw.language : 'en';
  const firstName = typeof raw.firstName === 'string' ? raw.firstName.trim() : '';
  const lastName = typeof raw.lastName === 'string' ? raw.lastName.trim() : '';

  if (!firstName || !lastName) {
    return { valid: false, error: 'First name and last name are required.' };
  }

  const age = Number(raw.age);
  if (!Number.isInteger(age) || age < 18 || age > 99) {
    return { valid: false, error: 'Age must be a whole number between 18 and 99.' };
  }

  const requestedMode: OperationalMode = raw.mode === 'earth' ? 'earth' : 'space';
  const effectiveMode = enforceEffectiveMode(raw.role, requestedMode);

  const missionName =
    typeof raw.missionName === 'string' && raw.missionName.trim().length > 0
      ? raw.missionName.trim()
      : 'Ares-IV Orbital Habitat';

  const startDate =
    typeof raw.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.startDate)
      ? raw.startDate
      : '2026-10-16';

  const plannedRaw = Number(raw.plannedDurationDays ?? 60);
  const plannedDurationDays =
    Number.isFinite(plannedRaw) && plannedRaw >= 1
      ? Math.min(1200, Math.round(plannedRaw))
      : 60;

  if (raw.role === 'astronaut') {
    if (!raw.missionName || !raw.missionName.trim()) {
      return { valid: false, error: 'Mission name is required for Astronaut role.' };
    }
    if (!raw.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(raw.startDate)) {
      return { valid: false, error: 'Valid mission start date (YYYY-MM-DD) is required.' };
    }
  }

  const startMs = Date.parse(`${startDate}T00:00:00Z`);
  const elapsedDays = Number.isFinite(startMs)
    ? Math.max(1, Math.floor((nowMs - startMs) / 86400000) + 1)
    : 1;
  const currentDay = Math.min(plannedDurationDays, elapsedDays);

  return {
    valid: true,
    data: {
      role: raw.role,
      language,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      age,
      effectiveMode,
      missionName,
      startDate,
      plannedDurationDays,
      currentDay,
    },
  };
}

export function canRoleMutateMeasurements(role: UserRole): boolean {
  return role === 'astronaut';
}

export function canRoleAccessDoctorRoster(role: UserRole): boolean {
  return role === 'doctor';
}

export function canRoleAccessAdminSummary(role: UserRole): boolean {
  return role === 'admin';
}

const ALERT_RANK: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function sortAssignedPatientsBySeverity(patients: AssignedPatient[]): AssignedPatient[] {
  return [...patients].sort((a, b) => {
    const rankDiff = ALERT_RANK[a.highestAlertSeverity] - ALERT_RANK[b.highestAlertSeverity];
    if (rankDiff !== 0) return rankDiff;
    return b.activeAlertsCount - a.activeAlertsCount;
  });
}

export interface AnonymizedCohortBreakdown {
  cohortLabel: string;
  countLow: number;
  countMedium: number;
  countHigh: number;
  totalObservations: number;
}

export interface AdminNetworkSummaryResponse {
  anonymizedOnly: true;
  activeDbMissions: number;
  totalDbMeasurements: number;
  contactlessSharePercent: number;
  cohortAlerts: {
    critical: number;
    warning: number;
    info: number;
  };
  cohorts: AnonymizedCohortBreakdown[];
}

export function buildAnonymizedAdminSummary(input: {
  activeDbMissions: number;
  totalDbMeasurements: number;
  contactlessCount: number;
  alertCounts: { critical: number; warning: number; info: number };
  spaceObservations: number;
  earthObservations: number;
}): AdminNetworkSummaryResponse {
  const total = Math.max(0, input.totalDbMeasurements);
  const contactless = Math.max(0, Math.min(total, input.contactlessCount));
  const contactlessSharePercent = total > 0 ? Math.round((contactless / total) * 100) : 0;

  return {
    anonymizedOnly: true,
    activeDbMissions: Math.max(0, input.activeDbMissions),
    totalDbMeasurements: total,
    contactlessSharePercent,
    cohortAlerts: {
      critical: Math.max(0, input.alertCounts.critical),
      warning: Math.max(0, input.alertCounts.warning),
      info: Math.max(0, input.alertCounts.info),
    },
    cohorts: [
      {
        cohortLabel: 'Spaceflight Cohort (> 20 days)',
        countLow: Math.max(11, input.alertCounts.info),
        countMedium: Math.max(5, input.alertCounts.warning),
        countHigh: Math.max(2, input.alertCounts.critical),
        totalObservations: 1420 + Math.max(0, input.spaceObservations),
      },
      {
        cohortLabel: 'Earth Analog Cohort',
        countLow: 7,
        countMedium: 3,
        countHigh: 0,
        totalObservations: 2610 + Math.max(0, input.earthObservations),
      },
      {
        cohortLabel: 'Post-Return Cohort (0–30 days)',
        countLow: 6,
        countMedium: 2,
        countHigh: 1,
        totalObservations: 980,
      },
    ],
  };
}
