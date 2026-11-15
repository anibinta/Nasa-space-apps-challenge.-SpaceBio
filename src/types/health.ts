export type Language =
  | 'ar'
  | 'bn'
  | 'en'
  | 'fr'
  | 'hi'
  | 'zh'
  | 'pt'
  | 'ru'
  | 'es'
  | 'ur'
  | 'wo';

export type ThemeMode = 'dark' | 'light';
export type TextSize = 'sm' | 'md' | 'lg';
export type OperationalMode = 'space' | 'earth';
export type UserRole = 'astronaut' | 'doctor' | 'admin';

export type StatusLevel = 'nominal' | 'watch' | 'alert';

export type IndicatorId =
  | 'blood_pressure_sys'
  | 'blood_pressure_dia'
  | 'heart_rate'
  | 'blood_glucose'
  | 'body_temperature'
  | 'sleep'
  | 'mood';

export type MeasurementSource = 'manual' | 'contactless';

export interface MeasurementRecord {
  id: string;
  indicator: IndicatorId;
  value: number;
  secondaryValue?: number;
  unit: string;
  timestamp: string;
  missionDay: number;
  confidence: number;
  source: MeasurementSource;
  indicative?: boolean;
  notes?: string;
}

export interface DailyMetricSummary {
  id: IndicatorId;
  value: number;
  secondaryValue?: number;
  unit: string;
  referenceMin: number;
  referenceMax: number;
  baseline: number;
  status: StatusLevel;
  trend7d: { day: string; value: number; baseline: number }[];
  source: MeasurementSource;
  confidence: number;
  indicative?: boolean;
  updatedAt: string;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface HealthAlert {
  id: string;
  severity: AlertSeverity;
  indicator: IndicatorId | 'bone_density' | 'sleep_debt';
  titleKey: string;
  explanationKey: string;
  sourceData: string;
  sourceKey?: string;
  sourceParams?: Record<string, string | number>;
  thresholdRule: string; // Always marked "to be validated by an expert"
  thresholdKey?: string;
  thresholdParams?: Record<string, string | number>;
  suggestedActionKey: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface ForecastPoint {
  hourLabel: string;
  hoursAhead: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

export interface MissionChangeEntry {
  id: string;
  previousDays: number;
  newDays: number;
  reason: string;
  reasonKey?: string;
  changedAt: string;
  changedBy: string;
  changedByKey?: string;
}

export interface MissionState {
  id: string;
  name: string;
  mode: OperationalMode;
  departureDate: string;
  currentDay: number;
  plannedDurationDays: number;
  actualDurationDays: number | null;
  status: 'active' | 'completed';
  changeHistory: MissionChangeEntry[];
}

export interface BoneTurnoverMarker {
  id: string;
  marker: 'CTX-I' | 'P1NP' | 'Urinary Calcium' | 'Osteocalcin';
  markerKey?: string;
  value: number;
  unit: string;
  referenceRange: string;
  samplingSource: 'Blood (Dry Spot)' | '24h Urine' | 'Saliva Assay';
  samplingSourceKey?: string;
  date: string;
  status: StatusLevel;
}

export interface BoneExamSchedule {
  id: string;
  examType: 'DXA Scan' | 'Heel Ultrasound';
  examTypeKey?: string;
  phase: 'Pre-flight' | 'In-flight' | 'Post-flight';
  phaseKey?: string;
  scheduledDay: number;
  scheduledDate: string;
  status: 'completed' | 'scheduled' | 'pending';
  facility: string;
  facilityKey?: string;
}

export interface BoneHealthState {
  resistiveExerciseMinutesToday: number;
  resistiveExerciseTarget: number;
  standingTimeMinutesToday: number;
  standingTimeTarget: number;
  riskEstimatePercent: number;
  riskIntervalLow: number;
  riskIntervalHigh: number;
  markers: BoneTurnoverMarker[];
  exams: BoneExamSchedule[];
}

export type BodyRegionId =
  | 'head'
  | 'neck'
  | 'chest'
  | 'abdomen'
  | 'pelvis'
  | 'leftArm'
  | 'rightArm'
  | 'leftLeg'
  | 'rightLeg'
  | 'spine'
  | 'skeleton';

export interface BodyRegionInfo {
  id: BodyRegionId;
  status: StatusLevel;
  relatedIndicators: string[];
  boneRelated: boolean;
  functionKey: string;
  explanationKey: string;
  metricSummary: string;
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'end_of_mission';

export interface ReportSectionData {
  period: ReportPeriod;
  generatedAt: string;
  headlineKey: string;
  strengthKeys: string[];
  watchPointKeys: string[];
  actionKeys: string[];
  metricsSnapshot: {
    labelKey: string;
    value: string;
    rawValue?: number;
    unit?: string;
    baselineDelta: string;
    baselineDeltaKey?: string;
    baselineDeltaParams?: Record<string, string | number>;
    status: StatusLevel;
  }[];
  chartSeries: { label: string; labelKey?: string; dayNum?: number; weekNum?: number; value: number; baseline: number }[];
}

export type AttachmentType = 'photo' | 'voice' | 'chart';

export interface ChatAttachment {
  type: AttachmentType;
  label: string;
  labelKey?: string;
  meta: string;
  metaKey?: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderRole: 'astronaut' | 'doctor';
  senderName: string;
  body: string;
  bodyKey?: string;
  sentAt: string;
  readAt: string | null;
  estimatedResponseMinutes: number;
  attachment?: ChatAttachment;
}

export interface ChatThread {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  specialtyKey?: string;
  station: string;
  stationKey?: string;
  signalDelayLabel: string;
  signalDelayKey?: string;
  unreadCount: number;
}

export interface DoctorSlot {
  id: string;
  dateLabel: string;
  dateIso?: string;
  timeUtc: string;
  doctorName: string;
  available: boolean;
  requested?: boolean;
}

export interface ConsentRecord {
  id: string;
  type: 'telemetry' | 'contactless_av' | 'learning_network';
  version: string;
  agreed: boolean;
  updatedAt: string;
}

export interface AstronautProfile {
  fullName: string;
  firstName: string;
  lastName: string;
  callSign: string;
  age: number;
  sex: 'Female' | 'Male' | 'Other / Prefer not to say';
  referenceCondition: string;
  baselines: Record<IndicatorId, number>;
}

export interface LearningSite {
  id: string;
  name: string;
  country: string;
  countryKey?: string;
  syncStatus: 'synchronized' | 'syncing' | 'deferred';
  lastSyncAt: string;
  contributingMissions: number;
  unassistedSharePercent: number;
}

export interface SubgroupPerformance {
  subgroup: string;
  subgroupKey?: string;
  sampleCount: number;
  maeLabel: string;
  coveragePercent: number;
}

export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface AnomalyRecord {
  id: string;
  kind: 'single' | 'combined';
  indicatorLabel: string;
  indicatorId?: IndicatorId;
  deviationLabel: string;
  deltaFormatted?: string;
  zScore: number;
  periodLabel: string;
  startDay?: number;
  endDay?: number;
  severity: AnomalySeverity;
  sourceData: string;
  latestValueFormatted?: string;
  meanFormatted?: string;
  sdFormatted?: string;
  unit?: string;
  latestSource?: MeasurementSource;
  recentHr?: number[];
  recentSleep?: number[];
  recentTemp?: number[];
  suggestedAction: string;
  validationNotice: string; // Always contains "to be validated by an expert"
  patientId?: string;
}

export interface AssignedPatient {
  id: string;
  fullName: string;
  callSign: string;
  age: number;
  missionName: string;
  missionNameKey?: string;
  mode: OperationalMode;
  missionDay: number;
  plannedDurationDays: number;
  highestAlertSeverity: AlertSeverity;
  activeAlertsCount: number;
  alerts: HealthAlert[];
  measurements: MeasurementRecord[];
  baselines: Record<IndicatorId, number>;
  boneRiskEstimatePercent: number;
}

export interface SiteEnvironment {
  siteName: string;
  temperatureC: number;
  humidityPercent: number;
  heatIndexC: number;
  barometricHpa: number;
}

export type LinkStatus = 'active' | 'degraded' | 'lost';

export type NotificationStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'acknowledged'
  | 'escalated';

export type NotificationRecipient =
  | 'on_duty_doctor'
  | 'backup_doctor'
  | 'ground_center'
  | 'journal_only';

export interface AlertNotificationRecord {
  id: string;
  alertId: string;
  patientId: string;
  patientName: string;
  callSign: string;
  severity: AlertSeverity;
  metric: IndicatorId | 'bone_density' | 'sleep_debt';
  value: string;
  threshold: string;
  thresholdKey?: string;
  thresholdParams?: Record<string, string | number>;
  timestamp: string;
  suggestedAction: string;
  suggestedActionKey: string;
  recipient: NotificationRecipient;
  recipientName: string;
  backupDoctorName?: string;
  groundCenterLogged: boolean;
  status: NotificationStatus;
  queuedAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  acknowledgedAt?: string;
  escalatedAt?: string;
  escalatedTo?: string;
  recordLink: string;
  simulated: true;
}

export type OutboxItemKind = 'measurement' | 'notification' | 'message';

export interface OutboxQueueItem {
  id: string;
  seq: number;
  kind: OutboxItemKind;
  priority: number;
  severity?: AlertSeverity;
  timestamp: string;
  payloadId: string;
  summaryKey: string;
  summaryParams?: Record<string, string | number>;
}

export interface JournalEntry {
  id: string;
  timestamp: string;
  eventKey: string;
  eventParams?: Record<string, string | number>;
  notificationId?: string;
  patientId?: string;
  patientName?: string;
  recipient?: string;
  status: NotificationStatus;
  groundCenterLogged?: boolean;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  acknowledgedAt?: string;
  escalatedAt?: string;
}

