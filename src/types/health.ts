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
  | 'ur';

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
  thresholdRule: string; // Always marked "to be validated by an expert"
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
  changedAt: string;
  changedBy: string;
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
  value: number;
  unit: string;
  referenceRange: string;
  samplingSource: 'Blood (Dry Spot)' | '24h Urine' | 'Saliva Assay';
  date: string;
  status: StatusLevel;
}

export interface BoneExamSchedule {
  id: string;
  examType: 'DXA Scan' | 'Heel Ultrasound';
  phase: 'Pre-flight' | 'In-flight' | 'Post-flight';
  scheduledDay: number;
  scheduledDate: string;
  status: 'completed' | 'scheduled' | 'pending';
  facility: string;
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
    baselineDelta: string;
    status: StatusLevel;
  }[];
  chartSeries: { label: string; value: number; baseline: number }[];
}

export type AttachmentType = 'photo' | 'voice' | 'chart';

export interface ChatAttachment {
  type: AttachmentType;
  label: string;
  meta: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderRole: 'astronaut' | 'doctor';
  senderName: string;
  body: string;
  sentAt: string;
  readAt: string | null;
  estimatedResponseMinutes: number;
  attachment?: ChatAttachment;
}

export interface ChatThread {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  station: string;
  signalDelayLabel: string;
  unreadCount: number;
}

export interface DoctorSlot {
  id: string;
  dateLabel: string;
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
  syncStatus: 'synchronized' | 'syncing' | 'deferred';
  lastSyncAt: string;
  contributingMissions: number;
  unassistedSharePercent: number;
}

export interface SubgroupPerformance {
  subgroup: string;
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
  zScore: number;
  periodLabel: string;
  severity: AnomalySeverity;
  sourceData: string;
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
