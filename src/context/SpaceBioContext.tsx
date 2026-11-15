import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  acknowledgeNotificationAndAlert,
  applyEscalations,
  BACKUP_DOCTOR_NAME,
  buildAlertForExtremeMeasurement,
  buildHealthyBaselineMeasurements,
  buildSleepAnomalyScenario,
  computeOutboxPriority,
  createJournalEntry,
  createNotificationForAlert,
  enqueueOutboxItem,
  flushOutboxQueue,
  markNotificationRead as markNotificationReadPure,
  ON_DUTY_DOCTOR_NAME,
} from '../lib/notifications';
import {
  sortAssignedPatientsBySeverity,
  type AdminNetworkSummaryResponse,
} from '../lib/rbac';
import type {
  AlertNotificationRecord,
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
  JournalEntry,
  Language,
  LinkStatus,
  MeasurementRecord,
  MeasurementSource,
  MissionChangeEntry,
  MissionState,
  OperationalMode,
  OutboxQueueItem,
  SiteEnvironment,
  TextSize,
  ThemeMode,
  UserRole,
} from '../types/health';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'spacebio_state_v2';
const COMMS_STORAGE_KEY = 'spacebio_comms_state_v1';

export type DemoScenarioId = 'default' | 'healthy' | 'sleep_anomaly';

interface PersistedCommsState {
  linkStatus: LinkStatus;
  lastSyncAt: string;
  simulatedOffsetMs: number;
  notifications: AlertNotificationRecord[];
  outboxQueue: OutboxQueueItem[];
  flushedIds: string[];
  journal: JournalEntry[];
  activeDemoScenario: DemoScenarioId;
  measurements?: MeasurementRecord[];
  alerts?: HealthAlert[];
  chatMessages?: ChatMessage[];
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
  transitionBannerKey: string | null;
  dismissTransitionBanner: () => void;
  completeOnboarding: (payload: OnboardingSubmission, bannerKey: string) => void;
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

  // Alert notifications, link status, outbox queue, journal & demo test scenarios
  linkStatus: LinkStatus;
  setLinkStatus: (status: LinkStatus) => void;
  lastSyncAt: string;
  simulatedNowMs: number;
  notifications: AlertNotificationRecord[];
  outboxQueue: OutboxQueueItem[];
  journal: JournalEntry[];
  activeDemoScenario: DemoScenarioId;
  markNotificationRead: (notificationId: string) => void;
  acknowledgeNotification: (notificationId: string) => void;
  loadHealthyBaselineScenario: () => void;
  loadSleepAnomalyScenario: () => void;
  simulateLinkLoss: () => void;
  restoreLink: () => void;
  advanceSimulatedMinutes: (minutes: number) => void;
  emergencyDialogOpen: boolean;
  setEmergencyDialogOpen: (open: boolean) => void;

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

function buildSeededNotificationsAndJournal(nowIso: string): {
  notifications: AlertNotificationRecord[];
  journal: JournalEntry[];
} {
  const notifications: AlertNotificationRecord[] = [];
  const journal: JournalEntry[] = [];

  for (const al of INITIAL_ALERTS) {
    const n = createNotificationForAlert(al, {
      patientId: 'pat-01',
      patientName: INITIAL_PROFILE.fullName,
      callSign: 'ARES-02',
      linkStatus: 'active',
      nowIso: al.timestamp || nowIso,
    });
    notifications.push(n);
    journal.push(
      createJournalEntry({
        timestamp: n.timestamp,
        eventKey: `indicators.${n.metric}`,
        patientId: n.patientId,
        patientName: n.patientName,
        recipient: n.recipientName,
        status: n.status,
        sentAt: n.sentAt,
        deliveredAt: n.deliveredAt,
        readAt: n.readAt,
        acknowledgedAt: n.acknowledgedAt,
        escalatedAt: n.escalatedAt,
        notificationId: n.id,
        groundCenterLogged: n.groundCenterLogged,
      })
    );
  }

  for (const pat of ASSIGNED_PATIENTS.slice(1)) {
    for (const al of pat.alerts) {
      const n = createNotificationForAlert(al, {
        patientId: pat.id,
        patientName: pat.fullName,
        callSign: pat.callSign,
        linkStatus: 'active',
        nowIso: al.timestamp || nowIso,
      });
      notifications.push(n);
      journal.push(
        createJournalEntry({
          timestamp: n.timestamp,
          eventKey: `indicators.${n.metric}`,
          patientId: n.patientId,
          patientName: n.patientName,
          recipient: n.recipientName,
          status: n.status,
          sentAt: n.sentAt,
          deliveredAt: n.deliveredAt,
          readAt: n.readAt,
          acknowledgedAt: n.acknowledgedAt,
          escalatedAt: n.escalatedAt,
          notificationId: n.id,
          groundCenterLogged: n.groundCenterLogged,
        })
      );
    }
  }

  return { notifications, journal };
}

function loadCommsFromStorage(): Partial<PersistedCommsState> | null {
  try {
    const raw = localStorage.getItem(COMMS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedCommsState>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export const SpaceBioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authReady, getIdToken } = useAuth();
  const prevUserRef = useRef<typeof user>(null);
  const storedComms = useMemo(() => loadCommsFromStorage(), []);

  const [isGuest, setIsGuest] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [workspaceRevision, setWorkspaceRevision] = useState(0);
  const [transitionBannerKey, setTransitionBannerKey] = useState<string | null>(null);

  const [language, setLanguageState] = useState<Language>('fr');
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [textSize, setTextSizeState] = useState<TextSize>('md');
  const [role, setRoleState] = useState<UserRole>('astronaut');
  const [syncError, setSyncError] = useState<string | null>(null);

  const [mission, setMission] = useState<MissionState>(INITIAL_MISSION);
  const [measurements, setMeasurements] = useState<MeasurementRecord[]>(
    storedComms?.measurements ?? INITIAL_MEASUREMENTS
  );
  const [alerts, setAlerts] = useState<HealthAlert[]>(storedComms?.alerts ?? INITIAL_ALERTS);
  const [extraDoctorAlerts, setExtraDoctorAlerts] = useState<Record<string, HealthAlert[]>>(() => {
    const map: Record<string, HealthAlert[]> = {};
    const clearOtherPatients =
      storedComms?.activeDemoScenario === 'healthy' ||
      storedComms?.activeDemoScenario === 'sleep_anomaly';
    for (const pat of ASSIGNED_PATIENTS.slice(1)) {
      map[pat.id] = clearOtherPatients ? [] : pat.alerts;
    }
    return map;
  });
  const [boneHealth] = useState<BoneHealthState>(INITIAL_BONE_HEALTH);
  const [selectedBodyRegion, setSelectedBodyRegion] = useState<BodyRegionId>('spine');

  const [selectedPatientId, setSelectedPatientId] = useState<string>(ASSIGNED_PATIENTS[0].id);
  const [dbDoctorPatients, setDbDoctorPatients] = useState<AssignedPatient[] | null>(null);
  const [dbDoctorAnomalies, setDbDoctorAnomalies] = useState<AnomalyRecord[] | null>(null);
  const [adminSummary, setAdminSummary] = useState<AdminNetworkSummaryResponse | null>(null);

  const [chatThreads] = useState<ChatThread[]>(INITIAL_CHAT_THREADS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    storedComms?.chatMessages ?? INITIAL_CHAT_MESSAGES
  );
  const [doctorSlots, setDoctorSlots] = useState<DoctorSlot[]>(INITIAL_DOCTOR_SLOTS);
  const [consents, setConsents] = useState<ConsentRecord[]>(INITIAL_CONSENTS);
  const [profile, setProfile] = useState<AstronautProfile>(() => hydrateProfile(INITIAL_PROFILE));

  // Simulated telemetry link, outbox queue, notifications, and journal
  const initialSeed = useMemo(() => buildSeededNotificationsAndJournal(new Date().toISOString()), []);
  const [linkStatus, setLinkStatusState] = useState<LinkStatus>(storedComms?.linkStatus ?? 'active');
  const [lastSyncAt, setLastSyncAt] = useState<string>(
    storedComms?.lastSyncAt ?? new Date().toISOString()
  );
  const [simulatedOffsetMs, setSimulatedOffsetMs] = useState<number>(
    storedComms?.simulatedOffsetMs ?? 0
  );
  const [clockTick, setClockTick] = useState<number>(() => Date.now());
  const [notifications, setNotifications] = useState<AlertNotificationRecord[]>(
    storedComms?.notifications ?? initialSeed.notifications
  );
  const [outboxQueue, setOutboxQueue] = useState<OutboxQueueItem[]>(
    storedComms?.outboxQueue ?? []
  );
  const [flushedIds, setFlushedIds] = useState<string[]>(storedComms?.flushedIds ?? []);
  const [journal, setJournal] = useState<JournalEntry[]>(
    storedComms?.journal ?? initialSeed.journal
  );
  const [activeDemoScenario, setActiveDemoScenario] = useState<DemoScenarioId>(
    storedComms?.activeDemoScenario ?? 'default'
  );
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);

  const simulatedNowMs = clockTick + simulatedOffsetMs;
  const getSimNowIso = useCallback(
    (offsetExtraMs = 0) => new Date(Date.now() + simulatedOffsetMs + offsetExtraMs).toISOString(),
    [simulatedOffsetMs]
  );

  // Tick live clock once per second so "last sync" relative label stays fresh
  useEffect(() => {
    const id = window.setInterval(() => setClockTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Persist onboard/offline comms state and local demo data in localStorage
  useEffect(() => {
    try {
      const payload: PersistedCommsState = {
        linkStatus,
        lastSyncAt,
        simulatedOffsetMs,
        notifications,
        outboxQueue,
        flushedIds,
        journal,
        activeDemoScenario,
        ...(isGuest || !user ? { measurements, alerts, chatMessages } : {}),
      };
      localStorage.setItem(COMMS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors in restricted preview browsers
    }
  }, [
    linkStatus,
    lastSyncAt,
    simulatedOffsetMs,
    notifications,
    outboxQueue,
    flushedIds,
    journal,
    activeDemoScenario,
    isGuest,
    user,
    measurements,
    alerts,
    chatMessages,
  ]);

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
      setTransitionBannerKey(null);
      setSyncError(null);
    }
    prevUserRef.current = user;
  }, [user, isGuest]);

  // Auto-dismiss transition confirmation after 3 seconds
  useEffect(() => {
    if (!transitionBannerKey) return;
    const timer = window.setTimeout(() => {
      setTransitionBannerKey(null);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [transitionBannerKey]);

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

        // Sync notifications for authenticated alerts if none loaded yet for those IDs
        const nowIso = new Date().toISOString();
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.alertId));
          const additions = data.alerts
            .filter((al) => !existingIds.has(al.id))
            .map((al) =>
              createNotificationForAlert(al, {
                patientId: 'pat-01',
                patientName: data.user.profile.fullName || INITIAL_PROFILE.fullName,
                callSign: 'ARES-02',
                linkStatus: 'active',
                nowIso: al.timestamp || nowIso,
              })
            );
          return additions.length > 0 ? [...additions, ...prev] : prev;
        });

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

  const completeOnboarding = (payload: OnboardingSubmission, bannerKey: string) => {
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

    setTransitionBannerKey(bannerKey);
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
    const nowIso = new Date().toISOString();
    const freshSeed = buildSeededNotificationsAndJournal(nowIso);
    localStorage.removeItem(COMMS_STORAGE_KEY);
    setLanguageState('fr');
    setThemeState('dark');
    setTextSizeState('md');
    setRoleState('astronaut');
    setMission(INITIAL_MISSION);
    setMeasurements(INITIAL_MEASUREMENTS);
    setAlerts(INITIAL_ALERTS);
    setExtraDoctorAlerts({
      'pat-02': ASSIGNED_PATIENTS[1].alerts,
      'pat-03': ASSIGNED_PATIENTS[2].alerts,
    });
    setChatMessages(INITIAL_CHAT_MESSAGES);
    setDoctorSlots(INITIAL_DOCTOR_SLOTS);
    setConsents(INITIAL_CONSENTS);
    setProfile(hydrateProfile(INITIAL_PROFILE));
    setLinkStatusState('active');
    setLastSyncAt(nowIso);
    setSimulatedOffsetMs(0);
    setNotifications(freshSeed.notifications);
    setOutboxQueue([]);
    setFlushedIds([]);
    setJournal(freshSeed.journal);
    setActiveDemoScenario('default');
    setDbDoctorPatients(null);
    setDbDoctorAnomalies(null);
    setAdminSummary(null);
    setSyncError(null);
    setTransitionBannerKey(null);
    setOnboardingCompleted(false);
    setWorkspaceRevision((n) => n + 1);
    setIsGuest(true);
  };

  const exitGuestMode = () => {
    localStorage.removeItem(COMMS_STORAGE_KEY);
    setIsGuest(false);
    setOnboardingCompleted(false);
    setLanguageState('fr');
    setSyncError(null);
    setTransitionBannerKey(null);
  };

  const returnToOnboarding = () => {
    setOnboardingCompleted(false);
  };

  // Link state & outbox flush
  const setLinkStatus = useCallback(
    (nextStatus: LinkStatus) => {
      const nowIso = getSimNowIso();
      if (nextStatus === 'lost') {
        setLinkStatusState('lost');
        setJournal((prev) => [
          createJournalEntry({
            timestamp: nowIso,
            eventKey: 'notifications.events.linkLost',
            status: 'queued',
          }),
          ...prev,
        ]);
        return;
      }

      if (nextStatus === 'degraded') {
        setLinkStatusState('degraded');
        // In degraded mode, send Critical notifications first if any are queued
        const { sentItems, nextFlushedIds } = flushOutboxQueue(outboxQueue, flushedIds, 'degraded');
        const criticalIds = new Set(
          sentItems.filter((i) => i.kind === 'notification' && i.severity === 'critical').map((i) => i.payloadId)
        );
        if (criticalIds.size > 0) {
          const criticalQueueIds = new Set(
            sentItems.filter((i) => i.kind === 'notification' && i.severity === 'critical').map((i) => i.id)
          );
          setNotifications((prev) =>
            prev.map((n) =>
              criticalIds.has(n.id) && n.status === 'queued'
                ? { ...n, status: 'delivered', sentAt: n.sentAt ?? nowIso, deliveredAt: nowIso }
                : n
            )
          );
          setOutboxQueue((prev) => prev.filter((q) => !criticalQueueIds.has(q.id)));
          setFlushedIds((prev) => Array.from(new Set([...prev, ...Array.from(criticalQueueIds)])));
          setLastSyncAt(nowIso);
        } else {
          void nextFlushedIds;
        }
        setJournal((prev) => [
          createJournalEntry({
            timestamp: nowIso,
            eventKey: 'notifications.events.linkDegraded',
            status: 'sent',
            sentAt: nowIso,
          }),
          ...prev,
        ]);
        return;
      }

      // Restoring to 'active' -> flush entire outbox queue in seq order, skipping duplicates
      setLinkStatusState('active');
      const { sentItems, nextFlushedIds } = flushOutboxQueue(outboxQueue, flushedIds, 'active');
      const sentNotifPayloadIds = new Set(
        sentItems.filter((i) => i.kind === 'notification').map((i) => i.payloadId)
      );

      if (sentItems.length > 0) {
        setNotifications((prev) =>
          prev.map((n) =>
            sentNotifPayloadIds.has(n.id) && n.status === 'queued'
              ? { ...n, status: 'delivered', sentAt: n.sentAt ?? nowIso, deliveredAt: nowIso }
              : n
          )
        );
        setOutboxQueue([]);
        setFlushedIds(nextFlushedIds);
      }

      setLastSyncAt(nowIso);
      const flushEntries: JournalEntry[] = [
        createJournalEntry({
          timestamp: nowIso,
          eventKey: 'notifications.events.linkRestored',
          eventParams: { count: sentItems.length },
          status: 'delivered',
          sentAt: nowIso,
          deliveredAt: nowIso,
        }),
      ];

      // Also update journal entries for flushed notifications
      for (const item of sentItems) {
        flushEntries.push(
          createJournalEntry({
            timestamp: nowIso,
            eventKey: item.summaryKey,
            eventParams: item.summaryParams,
            patientId: 'pat-01',
            patientName: profile.fullName,
            recipient:
              item.kind === 'notification'
                ? item.severity === 'info'
                  ? 'Journal'
                  : ON_DUTY_DOCTOR_NAME
                : ON_DUTY_DOCTOR_NAME,
            status: 'delivered',
            sentAt: nowIso,
            deliveredAt: nowIso,
            notificationId: item.kind === 'notification' ? item.payloadId : undefined,
            groundCenterLogged: item.kind === 'notification' && item.severity === 'critical',
          })
        );
      }

      setJournal((prev) => [...flushEntries, ...prev]);
    },
    [getSimNowIso, outboxQueue, flushedIds, profile.fullName]
  );

  const simulateLinkLoss = useCallback(() => {
    setLinkStatus('lost');
  }, [setLinkStatus]);

  const restoreLink = useCallback(() => {
    setLinkStatus('active');
  }, [setLinkStatus]);

  const advanceSimulatedMinutes = useCallback(
    (minutes: number) => {
      const deltaMs = minutes * 60 * 1000;
      const nextOffset = simulatedOffsetMs + deltaMs;
      const nextSimNowMs = Date.now() + nextOffset;
      const nextSimIso = new Date(nextSimNowMs).toISOString();

      setSimulatedOffsetMs(nextOffset);

      const { notifications: nextNotifications, newlyEscalated } = applyEscalations(
        notifications,
        nextSimNowMs
      );
      setNotifications(nextNotifications);

      const newJournalEntries: JournalEntry[] = [
        createJournalEntry({
          timestamp: nextSimIso,
          eventKey: 'notifications.events.timeAdvanced',
          eventParams: { time: nextSimIso.slice(11, 16) + ' UTC' },
          status: 'delivered',
          deliveredAt: nextSimIso,
        }),
      ];

      for (const esc of newlyEscalated) {
        newJournalEntries.unshift(
          createJournalEntry({
            timestamp: nextSimIso,
            eventKey: 'notifications.events.escalatedCritical',
            eventParams: { doctor: esc.escalatedTo ?? BACKUP_DOCTOR_NAME },
            patientId: esc.patientId,
            patientName: esc.patientName,
            recipient: `${esc.escalatedTo ?? BACKUP_DOCTOR_NAME}`,
            status: 'escalated',
            sentAt: esc.sentAt,
            deliveredAt: esc.deliveredAt,
            readAt: esc.readAt,
            escalatedAt: esc.escalatedAt,
            notificationId: esc.id,
            groundCenterLogged: esc.groundCenterLogged,
          })
        );
      }

      setJournal((prev) => [...newJournalEntries, ...prev]);
    },
    [simulatedOffsetMs, notifications]
  );

  const loadHealthyBaselineScenario = useCallback(() => {
    const nowIso = getSimNowIso();
    const healthyMeasurements = buildHealthyBaselineMeasurements(28);
    setActiveDemoScenario('healthy');
    setMeasurements(healthyMeasurements);
    setAlerts([]);
    setExtraDoctorAlerts({ 'pat-02': [], 'pat-03': [] });
    setNotifications([]);
    setOutboxQueue([]);
    setFlushedIds([]);
    setLastSyncAt(nowIso);
    setJournal((prev) => [
      createJournalEntry({
        timestamp: nowIso,
        eventKey: 'notifications.events.scenarioHealthy',
        status: 'delivered',
        sentAt: nowIso,
        deliveredAt: nowIso,
      }),
      ...prev,
    ]);
  }, [getSimNowIso]);

  const loadSleepAnomalyScenario = useCallback(() => {
    const nowIso = getSimNowIso();
    const { measurements: sleepMeasurements, alert: sleepAlert } = buildSleepAnomalyScenario(nowIso);
    const notif = createNotificationForAlert(sleepAlert, {
      patientId: 'pat-01',
      patientName: profile.fullName,
      callSign: 'ARES-02',
      linkStatus,
      nowIso,
    });

    setActiveDemoScenario('sleep_anomaly');
    setMeasurements(sleepMeasurements);
    setAlerts([sleepAlert]);
    setExtraDoctorAlerts({ 'pat-02': [], 'pat-03': [] });
    setNotifications([notif]);

    if (linkStatus === 'lost') {
      setOutboxQueue((prev) =>
        enqueueOutboxItem(prev, {
          id: `outbox-${notif.id}`,
          kind: 'notification',
          payloadId: notif.id,
          severity: notif.severity,
          priority: computeOutboxPriority('notification', notif.severity),
          timestamp: nowIso,
          summaryKey: sleepAlert.titleKey,
        })
      );
    } else {
      setOutboxQueue([]);
      setLastSyncAt(nowIso);
    }

    const entries: JournalEntry[] = [
      createJournalEntry({
        timestamp: nowIso,
        eventKey: 'notifications.events.scenarioSleep',
        patientId: 'pat-01',
        patientName: profile.fullName,
        recipient: ON_DUTY_DOCTOR_NAME,
        status: notif.status,
        sentAt: notif.sentAt,
        deliveredAt: notif.deliveredAt,
        notificationId: notif.id,
        groundCenterLogged: true,
      }),
      createJournalEntry({
        timestamp: nowIso,
        eventKey: 'notifications.events.groundCenterRecorded',
        patientId: 'pat-01',
        patientName: profile.fullName,
        recipient: 'Ground medical centre',
        status: notif.status,
        sentAt: notif.sentAt,
        deliveredAt: notif.deliveredAt,
        notificationId: notif.id,
        groundCenterLogged: true,
      }),
    ];

    setJournal((prev) => [...entries, ...prev]);
  }, [getSimNowIso, profile.fullName, linkStatus]);

  const markNotificationRead = useCallback(
    (notificationId: string) => {
      const nowIso = getSimNowIso();
      setNotifications((prev) => markNotificationReadPure(prev, notificationId, nowIso));
      setJournal((prev) =>
        prev.map((j) =>
          j.notificationId === notificationId && !j.readAt
            ? { ...j, status: j.status === 'delivered' ? 'read' : j.status, readAt: nowIso }
            : j
        )
      );
    },
    [getSimNowIso]
  );

  const acknowledgeNotification = useCallback(
    (targetId: string) => {
      const nowIso = getSimNowIso();
      const result = acknowledgeNotificationAndAlert(notifications, alerts, targetId, nowIso);
      setNotifications(result.notifications);
      setAlerts(result.alerts);

      const acked = result.acknowledgedNotification;
      const matchedAlertId = acked?.alertId ?? targetId;

      setExtraDoctorAlerts((prev) => {
        const next: Record<string, HealthAlert[]> = {};
        for (const [pid, list] of Object.entries(prev)) {
          next[pid] = list.map((a) => (a.id === matchedAlertId ? { ...a, acknowledged: true } : a));
        }
        return next;
      });

      setJournal((prev) => {
        const updated = prev.map((j) =>
          j.notificationId === acked?.id || j.notificationId === targetId
            ? {
                ...j,
                status: 'acknowledged' as const,
                readAt: j.readAt ?? nowIso,
                acknowledgedAt: j.acknowledgedAt ?? nowIso,
              }
            : j
        );
        return [
          createJournalEntry({
            timestamp: nowIso,
            eventKey: 'notifications.events.acknowledgedAlert',
            patientId: acked?.patientId,
            patientName: acked?.patientName,
            recipient: acked?.recipientName ?? ON_DUTY_DOCTOR_NAME,
            status: 'acknowledged',
            sentAt: acked?.sentAt,
            deliveredAt: acked?.deliveredAt,
            readAt: acked?.readAt ?? nowIso,
            acknowledgedAt: nowIso,
            notificationId: acked?.id,
            groundCenterLogged: acked?.groundCenterLogged,
          }),
          ...updated,
        ];
      });

      if (user) {
        void runServerSync((token) =>
          apiRequest(`/api/alerts/${encodeURIComponent(matchedAlertId)}/acknowledge`, token, {
            method: 'PATCH',
          }).then(() => undefined)
        );
      }
    },
    [getSimNowIso, notifications, alerts, user]
  );

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

  const sortedAlerts = useMemo(() => sortAlertsBySeverity(alerts), [alerts]);

  const assignedPatients = useMemo<AssignedPatient[]>(() => {
    if (role !== 'doctor') return [];
    const baseSource = user && dbDoctorPatients ? dbDoctorPatients : ASSIGNED_PATIENTS;
    const synced = baseSource.map((pat) => {
      if (pat.id === 'pat-01') {
        const activeCount = sortedAlerts.filter((a) => !a.acknowledged).length;
        const highest: AlertSeverity =
          sortedAlerts[0]?.severity ?? 'info';
        return {
          ...pat,
          alerts: sortedAlerts,
          measurements,
          activeAlertsCount: activeCount,
          highestAlertSeverity: highest,
        };
      }
      const patAlerts = extraDoctorAlerts[pat.id] ?? pat.alerts;
      const sortedPatAlerts = sortAlertsBySeverity(patAlerts);
      return {
        ...pat,
        alerts: sortedPatAlerts,
        activeAlertsCount: sortedPatAlerts.filter((a) => !a.acknowledged).length,
        highestAlertSeverity: sortedPatAlerts[0]?.severity ?? 'info',
      };
    });
    return sortAssignedPatientsBySeverity(synced);
  }, [role, user, dbDoctorPatients, sortedAlerts, measurements, extraDoctorAlerts]);

  const anomalies = useMemo<AnomalyRecord[]>(() => {
    if (role === 'admin') return [];
    if (role === 'doctor') {
      if (user && dbDoctorAnomalies) return dbDoctorAnomalies;
      return assignedPatients.flatMap((pat) =>
        detectAnomalies(pat.measurements, { patientId: pat.id })
      );
    }
    return detectAnomalies(measurements);
  }, [role, measurements, user, dbDoctorAnomalies, assignedPatients]);

  const addMeasurement: SpaceBioContextValue['addMeasurement'] = (params) => {
    const nowIso = getSimNowIso();
    const tempId = `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const rec = createMeasurementRecord({
      id: tempId,
      indicator: params.indicator,
      value: params.value,
      secondaryValue: params.secondaryValue,
      source: params.source,
      confidence: params.confidence,
      missionDay: mission.currentDay,
      timestamp: nowIso,
      notes: params.notes,
    });

    setMeasurements((prev) => [rec, ...prev]);

    const extremeAlert = buildAlertForExtremeMeasurement(rec, nowIso);
    const newEntries: JournalEntry[] = [];

    if (linkStatus === 'lost') {
      setOutboxQueue((prev) =>
        enqueueOutboxItem(prev, {
          id: `outbox-meas-${rec.id}`,
          kind: 'measurement',
          payloadId: rec.id,
          priority: computeOutboxPriority('measurement'),
          timestamp: nowIso,
          summaryKey: `indicators.${rec.indicator}`,
        })
      );
      newEntries.push(
        createJournalEntry({
          timestamp: nowIso,
          eventKey: 'notifications.events.measurementQueued',
          eventParams: { indicator: rec.indicator },
          patientId: 'pat-01',
          patientName: profile.fullName,
          status: 'queued',
        })
      );
    } else {
      setLastSyncAt(nowIso);
    }

    if (extremeAlert) {
      setAlerts((prev) => [extremeAlert, ...prev]);
      const notif = createNotificationForAlert(extremeAlert, {
        patientId: 'pat-01',
        patientName: profile.fullName,
        callSign: 'ARES-02',
        linkStatus,
        nowIso,
      });
      setNotifications((prev) => [notif, ...prev]);
      if (linkStatus === 'lost') {
        setOutboxQueue((prev) =>
          enqueueOutboxItem(prev, {
            id: `outbox-${notif.id}`,
            kind: 'notification',
            payloadId: notif.id,
            severity: notif.severity,
            priority: computeOutboxPriority('notification', notif.severity),
            timestamp: nowIso,
            summaryKey: extremeAlert.titleKey,
          })
        );
      }
      newEntries.unshift(
        createJournalEntry({
          timestamp: nowIso,
          eventKey: `indicators.${notif.metric}`,
          patientId: notif.patientId,
          patientName: notif.patientName,
          recipient: notif.recipientName,
          status: notif.status,
          sentAt: notif.sentAt,
          deliveredAt: notif.deliveredAt,
          notificationId: notif.id,
          groundCenterLogged: notif.groundCenterLogged,
        })
      );
    }

    if (newEntries.length > 0) {
      setJournal((prev) => [...newEntries, ...prev]);
    }

    if (user && linkStatus !== 'lost') {
      void runServerSync(async (token) => {
        const saved = await apiRequest<MeasurementRecord>('/api/measurements', token, {
          method: 'POST',
          body: params,
        });
        setMeasurements((prev) => prev.map((item) => (item.id === tempId ? saved : item)));
      });
    }

    return rec;
  };

  const acknowledgeAlert = (id: string) => {
    acknowledgeNotification(id);
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
    const changedBy = role === 'doctor' ? 'Flight doctor' : 'Astronaut';
    const changedByKey = role === 'doctor' ? 'common.roleDoctor' : 'mission.defaults.changedByRole';
    const trimmedReason = reason.trim();
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
            reason: trimmedReason || 'Planned duration updated in Mission configuration',
            reasonKey: trimmedReason ? undefined : 'mission.defaults.manualUpdateReason',
            changedAt: new Date().toISOString(),
            changedBy,
            changedByKey,
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
    if (!body.trim() && !attachment) return;
    const nowIso = getSimNowIso();
    const tempId = `cm-${Date.now()}`;
    const msg: ChatMessage = {
      id: tempId,
      threadId,
      senderRole: role === 'doctor' ? 'doctor' : 'astronaut',
      senderName: role === 'doctor' ? ON_DUTY_DOCTOR_NAME : profile.fullName,
      body: body.trim(),
      sentAt: nowIso,
      readAt: null,
      estimatedResponseMinutes: effectiveMode === 'space' ? 18 : 5,
      attachment,
    };
    setChatMessages((prev) => [...prev, msg]);

    if (linkStatus === 'lost') {
      setOutboxQueue((prev) =>
        enqueueOutboxItem(prev, {
          id: `outbox-msg-${tempId}`,
          kind: 'message',
          payloadId: tempId,
          priority: computeOutboxPriority('message'),
          timestamp: nowIso,
          summaryKey: 'nav.chat',
        })
      );
      setJournal((prev) => [
        createJournalEntry({
          timestamp: nowIso,
          eventKey: 'notifications.events.messageQueued',
          patientId: 'pat-01',
          patientName: profile.fullName,
          status: 'queued',
        }),
        ...prev,
      ]);
      return;
    }

    setLastSyncAt(nowIso);

    if (user) {
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
    }
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
        notifications,
        journal,
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
    localStorage.removeItem(COMMS_STORAGE_KEY);
    const nowIso = new Date().toISOString();
    const freshSeed = buildSeededNotificationsAndJournal(nowIso);
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
    setLinkStatusState('active');
    setLastSyncAt(nowIso);
    setSimulatedOffsetMs(0);
    setNotifications(freshSeed.notifications);
    setOutboxQueue([]);
    setFlushedIds([]);
    setJournal(freshSeed.journal);
    setActiveDemoScenario('default');
  };

  return (
    <SpaceBioContext.Provider
      value={{
        isGuest,
        enterGuestMode,
        exitGuestMode,
        onboardingCompleted,
        workspaceRevision,
        transitionBannerKey,
        dismissTransitionBanner: () => setTransitionBannerKey(null),
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
        linkStatus,
        setLinkStatus,
        lastSyncAt,
        simulatedNowMs,
        notifications,
        outboxQueue,
        journal,
        activeDemoScenario,
        markNotificationRead,
        acknowledgeNotification,
        loadHealthyBaselineScenario,
        loadSleepAnomalyScenario,
        simulateLinkLoss,
        restoreLink,
        advanceSimulatedMinutes,
        emergencyDialogOpen,
        setEmergencyDialogOpen,
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
