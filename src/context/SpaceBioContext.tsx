import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ASSIGNED_PATIENTS,
  EARTH_SITE_ENVIRONMENT,
  INITIAL_ALERTS,
  INITIAL_BONE_HEALTH,
  INITIAL_CHAT_MESSAGES,
  INITIAL_CHAT_THREADS,
  INITIAL_CONSENTS,
  INITIAL_DOCTOR_SLOTS,
  INITIAL_MEASUREMENTS,
  INITIAL_MISSION,
  INITIAL_PROFILE,
} from '../data/mock';
import { normalizeLanguage } from '../data/languages';
import { apiRequest } from '../lib/apiClient';
import { detectAnomalies } from '../lib/anomaly';
import {
  createMeasurementRecord,
  evaluateIndicatorStatus,
  INDICATOR_CONFIGS,
  sortAlertsBySeverity,
} from '../lib/healthEngine';
import {
  sortAssignedPatientsBySeverity,
  type AdminNetworkSummaryResponse,
} from '../lib/rbac';
import type {
  AlertSeverity,
  AnomalyRecord,
  AssignedPatient,
  AstronautProfile,
  BodyRegionId,
  BoneHealthState,
  ChatAttachment,
  ChatMessage,
  ChatThread,
  ConsentRecord,
  DailyMetricSummary,
  DoctorSlot,
  HealthAlert,
  IndicatorId,
  Language,
  MeasurementRecord,
  MeasurementSource,
  MissionChangeEntry,
  MissionState,
  OperationalMode,
  SiteEnvironment,
  TextSize,
  ThemeMode,
  UserRole,
} from '../types/health';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'spacebio_state_v2';

interface PersistedSlice {
  language: Language;
  theme: ThemeMode;
  textSize: TextSize;
  role: UserRole;
  mission: MissionState;
  measurements: MeasurementRecord[];
  alerts: HealthAlert[];
  chatMessages: ChatMessage[];
  doctorSlots: DoctorSlot[];
  consents: ConsentRecord[];
  profile: AstronautProfile;
}

interface BootstrapResponse {
  user: {
    uid: string;
    email: string;
    role: UserRole;
    language: string;
    theme: ThemeMode;
    textSize: TextSize;
    profile: AstronautProfile;
  };
  mission: MissionState;
  measurements: MeasurementRecord[];
  alerts: HealthAlert[];
  chatMessages: ChatMessage[];
  doctorSlots: DoctorSlot[];
  consents: ConsentRecord[];
}

export interface OnboardingSubmission {
  role: UserRole;
  language: Language;
  firstName: string;
  lastName: string;
  age: number;
  mode: OperationalMode;
  missionName: string;
  startDate: string;
  plannedDurationDays: number;
}

interface SpaceBioContextValue {
  isGuest: boolean;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  onboardingCompleted: boolean;
  workspaceRevision: number;
  transitionBanner: string | null;
  dismissTransitionBanner: () => void;
  completeOnboarding: (payload: OnboardingSubmission, bannerText: string) => void;
  returnToOnboarding: () => void;

  language: Language;
  setLanguage: (lang: Language) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  effectiveMode: OperationalMode;

  syncError: string | null;
  clearSyncError: () => void;

  mission: MissionState;
  updateMissionDeparture: (name: string, mode: OperationalMode, departureDate: string, plannedDays: number) => void;
  revisePlannedDuration: (newDays: number, reason: string) => void;
  recordActualReturnDuration: (actualDays: number | null) => void;

  measurements: MeasurementRecord[];
  addMeasurement: (params: {
    indicator: IndicatorId;
    value: number;
    secondaryValue?: number;
    source: MeasurementSource;
    confidence: number;
    notes?: string;
  }) => MeasurementRecord;

  dailyMetrics: DailyMetricSummary[];
  anomalies: AnomalyRecord[];

  alerts: HealthAlert[];
  acknowledgeAlert: (id: string) => void;

  boneHealth: BoneHealthState;
  selectedBodyRegion: BodyRegionId;
  setSelectedBodyRegion: (region: BodyRegionId) => void;

  assignedPatients: AssignedPatient[];
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  earthSiteEnvironment: SiteEnvironment;
  adminSummary: AdminNetworkSummaryResponse | null;

  chatThreads: ChatThread[];
  chatMessages: ChatMessage[];
  sendChatMessage: (threadId: string, body: string, attachment?: ChatAttachment) => void;
  doctorSlots: DoctorSlot[];
  requestDoctorCall: (slotId: string) => void;

  consents: ConsentRecord[];
  toggleConsent: (type: ConsentRecord['type'], agreed: boolean) => void;
  profile: AstronautProfile;
  updateProfile: (next: AstronautProfile) => void;

  exportAllLocalDataJson: () => string;
  resetAllLocalData: () => void;
}

const SpaceBioContext = createContext<SpaceBioContextValue | null>(null);

const DAILY_INDICATOR_ORDER: IndicatorId[] = [
  'blood_pressure_sys',
  'heart_rate',
  'blood_glucose',
  'body_temperature',
  'sleep',
  'mood',
];

function hydrateProfile(p?: Partial<AstronautProfile>): AstronautProfile {
  const base = INITIAL_PROFILE;
  const fullName = p?.fullName?.trim() || base.fullName;
  const parts = fullName.split(/\s+/);
  return {
    ...base,
    ...p,
    fullName,
    firstName: p?.firstName?.trim() || parts[parts.length > 1 ? 1 : 0] || base.firstName,
    lastName: p?.lastName?.trim() || (parts.length > 1 ? parts[parts.length - 1] : base.lastName),
    baselines: {
      ...base.baselines,
      ...(p?.baselines ?? {}),
    },
  };
}

export const SpaceBioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authReady, getIdToken } = useAuth();
  const prevUserRef = useRef<typeof user>(null);

  const [isGuest, setIsGuest] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [workspaceRevision, setWorkspaceRevision] = useState(0);
  const [transitionBanner, setTransitionBanner] = useState<string | null>(null);

  const [language, setLanguageState] = useState<Language>('fr');
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [textSize, setTextSizeState] = useState<TextSize>('md');
  const [role, setRoleState] = useState<UserRole>('astronaut');
  const [syncError, setSyncError] = useState<string | null>(null);

  const [mission, setMission] = useState<MissionState>(INITIAL_MISSION);
  const [measurements, setMeasurements] = useState<MeasurementRecord[]>(INITIAL_MEASUREMENTS);
  const [alerts, setAlerts] = useState<HealthAlert[]>(INITIAL_ALERTS);
  const [boneHealth] = useState<BoneHealthState>(INITIAL_BONE_HEALTH);
  const [selectedBodyRegion, setSelectedBodyRegion] = useState<BodyRegionId>('spine');

  const [selectedPatientId, setSelectedPatientId] = useState<string>(ASSIGNED_PATIENTS[0].id);
  const [dbDoctorPatients, setDbDoctorPatients] = useState<AssignedPatient[] | null>(null);
  const [dbDoctorAnomalies, setDbDoctorAnomalies] = useState<AnomalyRecord[] | null>(null);
  const [adminSummary, setAdminSummary] = useState<AdminNetworkSummaryResponse | null>(null);

  const [chatThreads] = useState<ChatThread[]>(INITIAL_CHAT_THREADS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [doctorSlots, setDoctorSlots] = useState<DoctorSlot[]>(INITIAL_DOCTOR_SLOTS);
  const [consents, setConsents] = useState<ConsentRecord[]>(INITIAL_CONSENTS);
  const [profile, setProfile] = useState<AstronautProfile>(() => hydrateProfile(INITIAL_PROFILE));

  // Doctors and network administrators are always in Earth mode
  const effectiveMode: OperationalMode = role === 'astronaut' ? mission.mode : 'earth';

  // Ensure authenticated users exit guest mode cleanly and reset onboarding on sign-out
  useEffect(() => {
    if (user && isGuest) {
      setIsGuest(false);
    }
    if (prevUserRef.current && !user) {
      setOnboardingCompleted(false);
      setLanguageState('fr');
      setTransitionBanner(null);
      setSyncError(null);
    }
    prevUserRef.current = user;
  }, [user, isGuest]);

  // Sync theme & text size to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const scale = textSize === 'sm' ? '0.92' : textSize === 'lg' ? '1.1' : '1';
    root.style.setProperty('--text-size-scale', scale);
  }, [theme, textSize]);

  // Hydrate authenticated workspace from Cloud SQL
  useEffect(() => {
    if (!authReady || !user) return;
    let cancelled = false;

    const loadAuthenticatedWorkspace = async () => {
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const data = await apiRequest<BootstrapResponse>('/api/workspace/bootstrap', token, {
          method: 'POST',
        });
        if (cancelled) return;
        setSyncError(null);
        setRoleState(data.user.role);
        setLanguageState(normalizeLanguage(data.user.language));
        setThemeState(data.user.theme);
        setTextSizeState(data.user.textSize);
        setProfile(hydrateProfile(data.user.profile));
        setMission(data.mission);
        setMeasurements(data.measurements);
        setAlerts(data.alerts);
        setChatMessages(data.chatMessages);
        setDoctorSlots(data.doctorSlots);
        setConsents(data.consents);
        setWorkspaceRevision((n) => n + 1);

        if (data.user.role === 'doctor') {
          const roster = await apiRequest<{
            readOnly: true;
            patients: AssignedPatient[];
            anomalies: AnomalyRecord[];
          }>('/api/doctor/patients', token);
          if (!cancelled) {
            setDbDoctorPatients(roster.patients);
            setDbDoctorAnomalies(roster.anomalies);
          }
        } else if (data.user.role === 'admin') {
          const summary = await apiRequest<AdminNetworkSummaryResponse>(
            '/api/learning-network/summary',
            token
          );
          if (!cancelled) {
            setAdminSummary(summary);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setSyncError(err instanceof Error ? err.message : 'Unable to sync account workspace');
        }
      }
    };

    void loadAuthenticatedWorkspace();
    return () => {
      cancelled = true;
    };
  }, [authReady, user, getIdToken]);

  const runServerSync = async (task: (token: string) => Promise<void>) => {
    if (!user) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      await task(token);
      setSyncError(null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Unable to save changes');
    }
  };

  const setLanguage = (lang: Language) => {
    const clean = normalizeLanguage(lang);
    setLanguageState(clean);
    void runServerSync((token) =>
      apiRequest('/api/preferences', token, { method: 'PUT', body: { language: clean } }).then(() => undefined)
    );
  };

  const setTheme = (nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    void runServerSync((token) =>
      apiRequest('/api/preferences', token, { method: 'PUT', body: { theme: nextTheme } }).then(() => undefined)
    );
  };

  const setTextSize = (size: TextSize) => {
    setTextSizeState(size);
    void runServerSync((token) =>
      apiRequest('/api/preferences', token, { method: 'PUT', body: { textSize: size } }).then(() => undefined)
    );
  };

  const setRole = (nextRole: UserRole) => {
    setRoleState(nextRole);
  };

  const completeOnboarding = (payload: OnboardingSubmission, bannerText: string) => {
    const cleanRole = payload.role;
    const cleanLang = normalizeLanguage(payload.language);
    const cleanFirst = payload.firstName.trim();
    const cleanLast = payload.lastName.trim();
    const fullName = `${cleanFirst} ${cleanLast}`.trim();
    const forcedMode: OperationalMode = cleanRole === 'astronaut' ? payload.mode : 'earth';

    setRoleState(cleanRole);
    setLanguageState(cleanLang);
    setProfile((prev) => ({
      ...prev,
      firstName: cleanFirst,
      lastName: cleanLast,
      fullName: fullName || prev.fullName,
      age: payload.age,
    }));

    if (cleanRole === 'astronaut') {
      const cleanDays = Math.max(1, Math.round(payload.plannedDurationDays));
      const cleanName = payload.missionName.trim() || mission.name;
      // Derive current day cleanly from departure date vs today (minimum Day 1, default realistic mission progress)
      const startMs = Date.parse(`${payload.startDate}T00:00:00Z`);
      const elapsedDays = Number.isFinite(startMs)
        ? Math.max(1, Math.floor((Date.now() - startMs) / 86400000) + 1)
        : mission.currentDay;

      setMission((prev) => ({
        ...prev,
        name: cleanName,
        mode: forcedMode,
        departureDate: payload.startDate,
        plannedDurationDays: cleanDays,
        currentDay: Math.min(cleanDays, elapsedDays),
      }));
    }

    setTransitionBanner(bannerText);
    setOnboardingCompleted(true);

    void runServerSync(async (token) => {
      const cleanName = payload.missionName.trim() || mission.name;
      const cleanDays = Math.max(1, Math.round(payload.plannedDurationDays || 60));
      await apiRequest('/api/onboarding', token, {
        method: 'POST',
        body: {
          role: cleanRole,
          language: cleanLang,
          firstName: cleanFirst,
          lastName: cleanLast,
          age: payload.age,
          mode: forcedMode,
          missionName: cleanName,
          startDate: payload.startDate,
          plannedDurationDays: cleanDays,
        },
      });

      if (cleanRole === 'doctor') {
        const roster = await apiRequest<{
          readOnly: true;
          patients: AssignedPatient[];
          anomalies: AnomalyRecord[];
        }>('/api/doctor/patients', token);
        setDbDoctorPatients(roster.patients);
        setDbDoctorAnomalies(roster.anomalies);
        setAdminSummary(null);
      } else if (cleanRole === 'admin') {
        const summary = await apiRequest<AdminNetworkSummaryResponse>(
          '/api/learning-network/summary',
          token
        );
        setAdminSummary(summary);
        setDbDoctorPatients(null);
        setDbDoctorAnomalies(null);
      } else {
        setDbDoctorPatients(null);
        setDbDoctorAnomalies(null);
        setAdminSummary(null);
      }
    });
  };

  const enterGuestMode = () => {
    setLanguageState('fr');
    setThemeState('dark');
    setTextSizeState('md');
    setRoleState('astronaut');
    setMission(INITIAL_MISSION);
    setMeasurements(INITIAL_MEASUREMENTS);
    setAlerts(INITIAL_ALERTS);
    setChatMessages(INITIAL_CHAT_MESSAGES);
    setDoctorSlots(INITIAL_DOCTOR_SLOTS);
    setConsents(INITIAL_CONSENTS);
    setProfile(hydrateProfile(INITIAL_PROFILE));
    setDbDoctorPatients(null);
    setDbDoctorAnomalies(null);
    setAdminSummary(null);
    setSyncError(null);
    setTransitionBanner(null);
    setOnboardingCompleted(false);
    setWorkspaceRevision((n) => n + 1);
    setIsGuest(true);
  };

  const exitGuestMode = () => {
    setIsGuest(false);
    setOnboardingCompleted(false);
    setLanguageState('fr');
    setSyncError(null);
    setTransitionBanner(null);
  };

  const returnToOnboarding = () => {
    setOnboardingCompleted(false);
  };

  const dailyMetrics = useMemo<DailyMetricSummary[]>(() => {
    return DAILY_INDICATOR_ORDER.map((id) => {
      const cfg = INDICATOR_CONFIGS[id];
      const matching = measurements.filter((m) => m.indicator === id);
      const latest = matching[0];
      const baseline = profile.baselines[id];

      const byDay = new Map<number, MeasurementRecord>();
      for (const rec of matching) {
        if (!byDay.has(rec.missionDay)) {
          byDay.set(rec.missionDay, rec);
        }
      }
      const recentDays = Array.from(byDay.keys())
        .sort((a, b) => a - b)
        .slice(-7);

      const trend7d = recentDays.map((d) => ({
        day: `D${d}`,
        value: byDay.get(d)!.value,
        baseline,
      }));

      const val = latest ? latest.value : baseline;
      return {
        id,
        value: val,
        secondaryValue: latest?.secondaryValue,
        unit: cfg.unit,
        referenceMin: cfg.refMin,
        referenceMax: cfg.refMax,
        baseline,
        status: evaluateIndicatorStatus(id, val),
        trend7d,
        source: latest?.source ?? 'manual',
        confidence: latest?.confidence ?? 95,
        indicative: latest?.indicative,
        updatedAt: latest?.timestamp ?? new Date().toISOString(),
      };
    });
  }, [measurements, profile.baselines]);

  const anomalies = useMemo<AnomalyRecord[]>(() => {
    if (role === 'admin') return [];
    if (role === 'doctor') {
      if (user && dbDoctorAnomalies) return dbDoctorAnomalies;
      return ASSIGNED_PATIENTS.flatMap((pat) =>
        detectAnomalies(pat.measurements, { patientId: pat.id })
      );
    }
    return detectAnomalies(measurements);
  }, [role, measurements, user, dbDoctorAnomalies]);

  const sortedAlerts = useMemo(() => sortAlertsBySeverity(alerts), [alerts]);

  const assignedPatients = useMemo<AssignedPatient[]>(() => {
    if (role !== 'doctor') return [];
    const source = user && dbDoctorPatients ? dbDoctorPatients : ASSIGNED_PATIENTS;
    return sortAssignedPatientsBySeverity(source);
  }, [role, user, dbDoctorPatients]);

  const addMeasurement: SpaceBioContextValue['addMeasurement'] = (params) => {
    const tempId = `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const rec = createMeasurementRecord({
      id: tempId,
      indicator: params.indicator,
      value: params.value,
      secondaryValue: params.secondaryValue,
      source: params.source,
      confidence: params.confidence,
      missionDay: mission.currentDay,
      timestamp: new Date().toISOString(),
      notes: params.notes,
    });
    if (isGuest) {
      return rec;
    }
    setMeasurements((prev) => [rec, ...prev]);

    void runServerSync(async (token) => {
      const saved = await apiRequest<MeasurementRecord>('/api/measurements', token, {
        method: 'POST',
        body: params,
      });
      setMeasurements((prev) => prev.map((item) => (item.id === tempId ? saved : item)));
    });

    return rec;
  };

  const acknowledgeAlert = (id: string) => {
    if (isGuest) return;
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    void runServerSync((token) =>
      apiRequest(`/api/alerts/${encodeURIComponent(id)}/acknowledge`, token, {
        method: 'PATCH',
      }).then(() => undefined)
    );
  };

  const updateMissionDeparture = (
    name: string,
    mode: OperationalMode,
    departureDate: string,
    plannedDays: number
  ) => {
    if (isGuest) return;
    const cleanName = name.trim() || mission.name;
    const cleanDays = Math.max(1, Math.round(plannedDays));
    const safeMode: OperationalMode = role === 'astronaut' ? mode : 'earth';
    setMission((prev) => ({
      ...prev,
      name: cleanName,
      mode: safeMode,
      departureDate,
      plannedDurationDays: cleanDays,
    }));

    void runServerSync((token) =>
      apiRequest('/api/mission/departure', token, {
        method: 'PUT',
        body: {
          name: cleanName,
          mode: safeMode,
          departureDate,
          plannedDurationDays: cleanDays,
        },
      }).then(() => undefined)
    );
  };

  const revisePlannedDuration = (newDays: number, reason: string) => {
    if (isGuest) return;
    const sanitized = Math.max(1, Math.round(newDays));
    const changedBy = role === 'doctor' ? 'Flight doctor' : 'Crew / Operations';
    setMission((prev) => {
      if (sanitized === prev.plannedDurationDays) return prev;
      return {
        ...prev,
        plannedDurationDays: sanitized,
        changeHistory: [
          {
            id: `chg-${Date.now()}`,
            previousDays: prev.plannedDurationDays,
            newDays: sanitized,
            reason: reason.trim() || 'Mission timeline revision',
            changedAt: new Date().toISOString(),
            changedBy,
          },
          ...prev.changeHistory,
        ],
      };
    });

    void runServerSync(async (token) => {
      const res = await apiRequest<{ change: MissionChangeEntry | null }>(
        '/api/mission/revise-duration',
        token,
        {
          method: 'POST',
          body: { newDays: sanitized, reason, changedBy },
        }
      );
      if (res.change) {
        setMission((prev) => ({
          ...prev,
          changeHistory: [res.change!, ...prev.changeHistory.slice(1)],
        }));
      }
    });
  };

  const recordActualReturnDuration = (actualDays: number | null) => {
    if (isGuest) return;
    const valid = actualDays && actualDays > 0 ? Math.round(actualDays) : null;
    setMission((prev) => ({
      ...prev,
      actualDurationDays: valid,
      status: valid ? 'completed' : 'active',
    }));

    void runServerSync((token) =>
      apiRequest('/api/mission/return-duration', token, {
        method: 'PUT',
        body: { actualDays: valid },
      }).then(() => undefined)
    );
  };

  const sendChatMessage = (threadId: string, body: string, attachment?: ChatAttachment) => {
    if (isGuest) return;
    if (!body.trim() && !attachment) return;
    const tempId = `cm-${Date.now()}`;
    const msg: ChatMessage = {
      id: tempId,
      threadId,
      senderRole: role === 'doctor' ? 'doctor' : 'astronaut',
      senderName: role === 'doctor' ? 'Dr. Moussa Diop' : profile.fullName,
      body: body.trim(),
      sentAt: new Date().toISOString(),
      readAt: null,
      estimatedResponseMinutes: effectiveMode === 'space' ? 18 : 5,
      attachment,
    };
    setChatMessages((prev) => [...prev, msg]);

    void runServerSync(async (token) => {
      const saved = await apiRequest<ChatMessage>('/api/chat/messages', token, {
        method: 'POST',
        body: {
          threadId,
          senderRole: msg.senderRole,
          senderName: msg.senderName,
          body: msg.body,
          estimatedResponseMinutes: msg.estimatedResponseMinutes,
          attachment,
        },
      });
      setChatMessages((prev) => prev.map((item) => (item.id === tempId ? saved : item)));
    });
  };

  const requestDoctorCall = (slotId: string) => {
    if (isGuest) return;
    setDoctorSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, requested: true } : s))
    );
    void runServerSync((token) =>
      apiRequest(`/api/doctor-slots/${encodeURIComponent(slotId)}/request`, token, {
        method: 'POST',
      }).then(() => undefined)
    );
  };

  const toggleConsent = (type: ConsentRecord['type'], agreed: boolean) => {
    if (isGuest) return;
    const tempId = `c-${Date.now()}`;
    setConsents((prev) => [
      {
        id: tempId,
        type,
        version: 'v2.4',
        agreed,
        updatedAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    void runServerSync(async (token) => {
      const saved = await apiRequest<ConsentRecord>('/api/consents', token, {
        method: 'POST',
        body: { type, agreed },
      });
      setConsents((prev) => prev.map((item) => (item.id === tempId ? saved : item)));
    });
  };

  const updateProfile = (next: AstronautProfile) => {
    if (isGuest) return;
    setProfile(hydrateProfile(next));
    void runServerSync((token) =>
      apiRequest('/api/profile', token, { method: 'PUT', body: next }).then(() => undefined)
    );
  };

  const exportAllLocalDataJson = () => {
    if (user) {
      void runServerSync((token) =>
        apiRequest('/api/export', token, { method: 'GET' }).then(() => undefined)
      );
    }
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        simulatedData: !user,
        profile,
        mission,
        measurements,
        alerts,
        consents,
      },
      null,
      2
    );
  };

  const resetAllLocalData = () => {
    if (isGuest) return;
    if (user) {
      void runServerSync(async (token) => {
        await apiRequest('/api/me/data', token, { method: 'DELETE' });
        const fresh = await apiRequest<BootstrapResponse>('/api/workspace/bootstrap', token, {
          method: 'POST',
        });
        setProfile(hydrateProfile(fresh.user.profile));
        setMission(fresh.mission);
        setMeasurements(fresh.measurements);
        setAlerts(fresh.alerts);
        setChatMessages(fresh.chatMessages);
        setDoctorSlots(fresh.doctorSlots);
        setConsents(fresh.consents);
      });
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('spacebio_state_v1');
    setLanguageState('fr');
    setThemeState('dark');
    setTextSizeState('md');
    setRoleState('astronaut');
    setMission(INITIAL_MISSION);
    setMeasurements(INITIAL_MEASUREMENTS);
    setAlerts(INITIAL_ALERTS);
    setChatMessages(INITIAL_CHAT_MESSAGES);
    setDoctorSlots(INITIAL_DOCTOR_SLOTS);
    setConsents(INITIAL_CONSENTS);
    setProfile(INITIAL_PROFILE);
  };

  return (
    <SpaceBioContext.Provider
      value={{
        isGuest,
        enterGuestMode,
        exitGuestMode,
        onboardingCompleted,
        workspaceRevision,
        transitionBanner,
        dismissTransitionBanner: () => setTransitionBanner(null),
        completeOnboarding,
        returnToOnboarding,
        language,
        setLanguage,
        theme,
        setTheme,
        textSize,
        setTextSize,
        role,
        setRole,
        effectiveMode,
        syncError,
        clearSyncError: () => setSyncError(null),
        mission,
        updateMissionDeparture,
        revisePlannedDuration,
        recordActualReturnDuration,
        measurements,
        addMeasurement,
        dailyMetrics,
        anomalies,
        alerts: sortedAlerts,
        acknowledgeAlert,
        boneHealth,
        selectedBodyRegion,
        setSelectedBodyRegion,
        assignedPatients,
        selectedPatientId,
        setSelectedPatientId,
        earthSiteEnvironment: EARTH_SITE_ENVIRONMENT,
        adminSummary,
        chatThreads,
        chatMessages,
        sendChatMessage,
        doctorSlots,
        requestDoctorCall,
        consents,
        toggleConsent,
        profile,
        updateProfile,
        exportAllLocalDataJson,
        resetAllLocalData,
      }}
    >
      {children}
    </SpaceBioContext.Provider>
  );
};

export function useSpaceBio() {
  const ctx = useContext(SpaceBioContext);
  if (!ctx) {
    throw new Error('useSpaceBio must be used within SpaceBioProvider');
  }
  return ctx;
}
