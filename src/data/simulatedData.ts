import type {
  AstronautProfile,
  BodyRegionInfo,
  BoneHealthState,
  ChatMessage,
  ChatThread,
  ConsentRecord,
  DoctorSlot,
  ForecastPoint,
  HealthAlert,
  LearningSite,
  MeasurementRecord,
  MissionState,
  ReportSectionData,
  SubgroupPerformance,
} from '../types/health';

export const INITIAL_MISSION: MissionState = {
  id: 'mission-ares-iv',
  name: 'Ares-IV Orbital Habitat',
  mode: 'space',
  departureDate: '2026-10-16',
  currentDay: 28,
  plannedDurationDays: 60,
  actualDurationDays: null,
  status: 'active',
  changeHistory: [
    {
      id: 'chg-1',
      previousDays: 55,
      newDays: 60,
      reason: 'Extended microgravity bone-loading protocol (+5 days)',
      changedAt: '2026-11-02T14:20:00Z',
      changedBy: 'Flight Operations',
    },
  ],
};

export const INITIAL_PROFILE: AstronautProfile = {
  fullName: 'Cdr. Awa Ndiaye',
  firstName: 'Awa',
  lastName: 'Ndiaye',
  callSign: 'ARES-02',
  age: 36,
  sex: 'Female',
  referenceCondition: 'Healthy adult · Low-Earth orbit endurance cohort',
  baselines: {
    blood_pressure_sys: 118,
    blood_pressure_dia: 76,
    heart_rate: 64,
    blood_glucose: 91,
    body_temperature: 36.6,
    sleep: 7.4,
    mood: 8.2,
  },
};

function buildSeedMeasurements(): MeasurementRecord[] {
  const records: MeasurementRecord[] = [];
  const baseDate = new Date('2026-10-16T08:00:00Z');

  for (let d = 1; d <= 28; d++) {
    const dt = new Date(baseDate.getTime() + (d - 1) * 86400000);
    const iso = dt.toISOString();
    const wave = Math.sin(d * 0.45);
    const wave2 = Math.cos(d * 0.35);

    const sys = Math.round(118 + wave * 6 + (d > 24 ? 5 : 0));
    const dia = Math.round(76 + wave2 * 4 + (d > 24 ? 2 : 0));
    const hr = Math.round(64 + wave2 * 4 + (d > 22 ? 3 : 0));
    const glu = Math.round(91 + wave * 7);
    const temp = Number((36.6 + wave * 0.25).toFixed(1));
    const sleep = Number((d >= 26 ? 6.0 + (d % 2) * 0.2 : 7.2 + wave * 0.6).toFixed(1));
    const mood = Math.max(5, Math.min(10, Math.round(8 + wave2 * 1.1)));

    const isContactlessDay = d % 3 === 0;

    records.push(
      {
        id: `m-bp-${d}`,
        indicator: 'blood_pressure_sys',
        value: sys,
        secondaryValue: dia,
        unit: 'mmHg',
        timestamp: iso,
        missionDay: d,
        confidence: isContactlessDay ? 81 : 97,
        source: isContactlessDay ? 'contactless' : 'manual',
        indicative: isContactlessDay,
      },
      {
        id: `m-hr-${d}`,
        indicator: 'heart_rate',
        value: hr,
        unit: 'bpm',
        timestamp: iso,
        missionDay: d,
        confidence: isContactlessDay ? 88 : 98,
        source: isContactlessDay ? 'contactless' : 'manual',
      },
      {
        id: `m-glu-${d}`,
        indicator: 'blood_glucose',
        value: glu,
        unit: 'mg/dL',
        timestamp: iso,
        missionDay: d,
        confidence: 96,
        source: 'manual',
      },
      {
        id: `m-temp-${d}`,
        indicator: 'body_temperature',
        value: temp,
        unit: '°C',
        timestamp: iso,
        missionDay: d,
        confidence: 98,
        source: 'manual',
      },
      {
        id: `m-sleep-${d}`,
        indicator: 'sleep',
        value: sleep,
        unit: 'h',
        timestamp: iso,
        missionDay: d,
        confidence: 91,
        source: 'manual',
      },
      {
        id: `m-mood-${d}`,
        indicator: 'mood',
        value: mood,
        unit: '/10',
        timestamp: iso,
        missionDay: d,
        confidence: 100,
        source: 'manual',
      }
    );
  }

  // Latest Day 28 morning indicative contactless check for immediate realism
  records.push({
    id: 'm-bp-28b',
    indicator: 'blood_pressure_sys',
    value: 134,
    secondaryValue: 84,
    unit: 'mmHg',
    timestamp: '2026-11-13T07:15:00Z',
    missionDay: 28,
    confidence: 79,
    source: 'contactless',
    indicative: true,
    notes: 'Morning cephalad shift optical check',
  });

  return records.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export const INITIAL_MEASUREMENTS: MeasurementRecord[] = buildSeedMeasurements();

export const INITIAL_ALERTS: HealthAlert[] = [
  {
    id: 'al-1',
    severity: 'critical',
    indicator: 'sleep',
    titleKey: 'alerts.items.sleepTitle',
    explanationKey: 'alerts.items.sleepExplanation',
    sourceData: 'Actigraphy & Sleep Log (Days 26–28 · avg 5.9 h)',
    thresholdRule: '3-day avg < 6.2 h (to be validated by an expert)',
    suggestedActionKey: 'alerts.items.sleepAction',
    timestamp: '2026-11-13T06:40:00Z',
    acknowledged: false,
  },
  {
    id: 'al-2',
    severity: 'warning',
    indicator: 'bone_density',
    titleKey: 'alerts.items.boneTitle',
    explanationKey: 'alerts.items.boneExplanation',
    sourceData: 'ARED Load Telemetry (Days 25–28 · 38 min/day)',
    thresholdRule: '4-day resistive load < 42 min/day (to be validated by an expert)',
    suggestedActionKey: 'alerts.items.boneAction',
    timestamp: '2026-11-12T18:15:00Z',
    acknowledged: false,
  },
  {
    id: 'al-3',
    severity: 'info',
    indicator: 'blood_pressure_sys',
    titleKey: 'alerts.items.bpTitle',
    explanationKey: 'alerts.items.bpExplanation',
    sourceData: 'Optical Contactless Check (Day 28 · 134/84 mmHg · Indicative)',
    thresholdRule: 'Systolic > 130 mmHg or +8 mmHg vs baseline (to be validated by an expert)',
    suggestedActionKey: 'alerts.items.bpAction',
    timestamp: '2026-11-13T07:15:00Z',
    acknowledged: false,
  },
];

export const FORECAST_72H: ForecastPoint[] = [
  { hourLabel: 'Now', hoursAhead: 0, predicted: 68.0, lowerBound: 66.8, upperBound: 69.2 },
  { hourLabel: '+12h', hoursAhead: 12, predicted: 68.4, lowerBound: 66.5, upperBound: 70.3 },
  { hourLabel: '+24h', hoursAhead: 24, predicted: 69.1, lowerBound: 66.8, upperBound: 71.4 },
  { hourLabel: '+36h', hoursAhead: 36, predicted: 69.5, lowerBound: 66.9, upperBound: 72.1 },
  { hourLabel: '+48h', hoursAhead: 48, predicted: 69.9, lowerBound: 67.0, upperBound: 72.8 },
  { hourLabel: '+60h', hoursAhead: 60, predicted: 70.2, lowerBound: 67.1, upperBound: 73.3 },
  { hourLabel: '+72h', hoursAhead: 72, predicted: 70.4, lowerBound: 67.3, upperBound: 73.5 },
];

export const INITIAL_BONE_HEALTH: BoneHealthState = {
  resistiveExerciseMinutesToday: 38,
  resistiveExerciseTarget: 45,
  standingTimeMinutesToday: 52,
  standingTimeTarget: 60,
  riskEstimatePercent: 14.2,
  riskIntervalLow: 11.4,
  riskIntervalHigh: 17.8,
  markers: [
    {
      id: 'bm-1',
      marker: 'CTX-I',
      value: 0.68,
      unit: 'ng/mL',
      referenceRange: '0.14–0.58',
      samplingSource: 'Blood (Dry Spot)',
      date: '2026-11-11',
      status: 'watch',
    },
    {
      id: 'bm-2',
      marker: 'P1NP',
      value: 54.2,
      unit: 'µg/L',
      referenceRange: '20.0–76.0',
      samplingSource: 'Blood (Dry Spot)',
      date: '2026-11-11',
      status: 'nominal',
    },
    {
      id: 'bm-3',
      marker: 'Urinary Calcium',
      value: 295,
      unit: 'mg/24h',
      referenceRange: '100–250',
      samplingSource: '24h Urine',
      date: '2026-11-10',
      status: 'watch',
    },
    {
      id: 'bm-4',
      marker: 'Osteocalcin',
      value: 21.4,
      unit: 'ng/mL',
      referenceRange: '11.0–43.0',
      samplingSource: 'Saliva Assay',
      date: '2026-11-09',
      status: 'nominal',
    },
  ],
  exams: [
    {
      id: 'ex-1',
      examType: 'DXA Scan',
      phase: 'Pre-flight',
      scheduledDay: -14,
      scheduledDate: '2026-10-02',
      status: 'completed',
      facility: 'MedLab Flight Baseline Unit',
    },
    {
      id: 'ex-2',
      examType: 'Heel Ultrasound',
      phase: 'In-flight',
      scheduledDay: 32,
      scheduledDate: '2026-11-17',
      status: 'scheduled',
      facility: 'Ares-IV Medical Rack 2',
    },
    {
      id: 'ex-3',
      examType: 'DXA Scan',
      phase: 'Post-flight',
      scheduledDay: 65,
      scheduledDate: '2026-12-20',
      status: 'pending',
      facility: 'Recovery Medical Center',
    },
  ],
};

export const BODY_REGIONS: BodyRegionInfo[] = [
  {
    id: 'head',
    status: 'watch',
    relatedIndicators: ['Sleep Duration (6.0 h)', 'Indicative BP (134/84 mmHg)'],
    boneRelated: false,
    functionKey: 'bodyMap.regions.head.fn',
    explanationKey: 'bodyMap.regions.head.exp',
    metricSummary: 'Sleep 6.0 h · Sys 134 mmHg (Indicative)',
  },
  {
    id: 'neck',
    status: 'nominal',
    relatedIndicators: ['Jugular Venous Flow (Nominal)', 'Carotid Pulse Transit (95% conf)'],
    boneRelated: false,
    functionKey: 'bodyMap.regions.neck.fn',
    explanationKey: 'bodyMap.regions.neck.exp',
    metricSummary: 'Carotid cadence nominal · Cephalad shift watch',
  },
  {
    id: 'chest',
    status: 'nominal',
    relatedIndicators: ['Heart Rate (68 bpm)', 'Resting HRV (54 ms)'],
    boneRelated: false,
    functionKey: 'bodyMap.regions.chest.fn',
    explanationKey: 'bodyMap.regions.chest.exp',
    metricSummary: 'HR 68 bpm · Nominal autonomic tone',
  },
  {
    id: 'abdomen',
    status: 'nominal',
    relatedIndicators: ['Blood Glucose (94 mg/dL)', 'Body Temperature (36.7 °C)'],
    boneRelated: false,
    functionKey: 'bodyMap.regions.abdomen.fn',
    explanationKey: 'bodyMap.regions.abdomen.exp',
    metricSummary: 'Glucose 94 mg/dL · Temp 36.7 °C',
  },
  {
    id: 'pelvis',
    status: 'watch',
    relatedIndicators: ['Pelvic Bone Mineral Model (14.2%)', 'Urinary Calcium (295 mg/24h)'],
    boneRelated: true,
    functionKey: 'bodyMap.regions.pelvis.fn',
    explanationKey: 'bodyMap.regions.pelvis.exp',
    metricSummary: 'Pelvic unloading watch · Calcium 295 mg/24h',
  },
  {
    id: 'leftArm',
    status: 'nominal',
    relatedIndicators: ['Upper-Body Resistive Load (18 min/d)', 'Left Grip Readiness (98%)'],
    boneRelated: true,
    functionKey: 'bodyMap.regions.leftArm.fn',
    explanationKey: 'bodyMap.regions.leftArm.exp',
    metricSummary: 'Upper load 18 min · Nominal',
  },
  {
    id: 'rightArm',
    status: 'nominal',
    relatedIndicators: ['Upper-Body Resistive Load (18 min/d)', 'Right Cuff Verification Ready'],
    boneRelated: true,
    functionKey: 'bodyMap.regions.rightArm.fn',
    explanationKey: 'bodyMap.regions.rightArm.exp',
    metricSummary: 'Cuff baseline arm · Nominal',
  },
  {
    id: 'leftLeg',
    status: 'watch',
    relatedIndicators: ['Lower-Body ARED (38/45 min)', 'Left Calcaneal Ultrasound (Day 32)'],
    boneRelated: true,
    functionKey: 'bodyMap.regions.leftLeg.fn',
    explanationKey: 'bodyMap.regions.leftLeg.exp',
    metricSummary: 'ARED 38/45 min · Unloading watch',
  },
  {
    id: 'rightLeg',
    status: 'watch',
    relatedIndicators: ['Lower-Body ARED (38/45 min)', 'Right Femoral Neck Model'],
    boneRelated: true,
    functionKey: 'bodyMap.regions.rightLeg.fn',
    explanationKey: 'bodyMap.regions.rightLeg.exp',
    metricSummary: 'ARED 38/45 min · Unloading watch',
  },
  {
    id: 'spine',
    status: 'watch',
    relatedIndicators: ['Axial Standing Load (52/60 min)', 'Lumbar Turnover (CTX-I)'],
    boneRelated: true,
    functionKey: 'bodyMap.regions.spine.fn',
    explanationKey: 'bodyMap.regions.spine.exp',
    metricSummary: 'Axial load 52/60 min · CTX-I 0.68 ng/mL',
  },
  {
    id: 'skeleton',
    status: 'watch',
    relatedIndicators: ['Model Risk Estimate (14.2%)', 'Urinary Calcium (295 mg/24h)'],
    boneRelated: true,
    functionKey: 'bodyMap.regions.skeleton.fn',
    explanationKey: 'bodyMap.regions.skeleton.exp',
    metricSummary: 'Risk 14.2% (11.4–17.8%) · Model estimate',
  },
];

export const STATIC_REPORTS: Record<'daily' | 'weekly' | 'monthly', ReportSectionData> = {
  daily: {
    period: 'daily',
    generatedAt: '2026-11-13T08:00:00Z',
    headlineKey: 'reports.daily.headline',
    strengthKeys: ['reports.daily.strength1', 'reports.daily.strength2'],
    watchPointKeys: ['reports.daily.watch1', 'reports.daily.watch2'],
    actionKeys: ['reports.daily.action1', 'reports.daily.action2'],
    metricsSnapshot: [
      { labelKey: 'indicators.heart_rate', value: '68 bpm', baselineDelta: '+4 bpm vs baseline', status: 'nominal' },
      { labelKey: 'indicators.sleep', value: '6.0 h', baselineDelta: '-1.4 h vs baseline', status: 'watch' },
      { labelKey: 'indicators.blood_glucose', value: '94 mg/dL', baselineDelta: '+3 mg/dL vs baseline', status: 'nominal' },
    ],
    chartSeries: [
      { label: '00:00', value: 62, baseline: 64 },
      { label: '04:00', value: 59, baseline: 64 },
      { label: '08:00', value: 68, baseline: 64 },
      { label: '12:00', value: 73, baseline: 64 },
      { label: '16:00', value: 70, baseline: 64 },
    ],
  },
  weekly: {
    period: 'weekly',
    generatedAt: '2026-11-12T18:00:00Z',
    headlineKey: 'reports.weekly.headline',
    strengthKeys: ['reports.weekly.strength1', 'reports.weekly.strength2'],
    watchPointKeys: ['reports.weekly.watch1', 'reports.weekly.watch2'],
    actionKeys: ['reports.weekly.action1', 'reports.weekly.action2'],
    metricsSnapshot: [
      { labelKey: 'indicators.mood', value: '7.8 /10', baselineDelta: '-0.4 vs baseline', status: 'nominal' },
      { labelKey: 'bone.resistiveLabel', value: '38 min/d', baselineDelta: '-7 min vs target', status: 'watch' },
      { labelKey: 'indicators.body_temperature', value: '36.7 °C', baselineDelta: '+0.1 °C vs baseline', status: 'nominal' },
    ],
    chartSeries: [
      { label: 'D22', value: 65, baseline: 64 },
      { label: 'D23', value: 66, baseline: 64 },
      { label: 'D24', value: 67, baseline: 64 },
      { label: 'D25', value: 69, baseline: 64 },
      { label: 'D26', value: 70, baseline: 64 },
      { label: 'D27', value: 69, baseline: 64 },
      { label: 'D28', value: 68, baseline: 64 },
    ],
  },
  monthly: {
    period: 'monthly',
    generatedAt: '2026-11-10T12:00:00Z',
    headlineKey: 'reports.monthly.headline',
    strengthKeys: ['reports.monthly.strength1', 'reports.monthly.strength2'],
    watchPointKeys: ['reports.monthly.watch1', 'reports.monthly.watch2'],
    actionKeys: ['reports.monthly.action1', 'reports.monthly.action2'],
    metricsSnapshot: [
      { labelKey: 'bone.riskModelTitle', value: '14.2 %', baselineDelta: '90% CI: 11.4–17.8%', status: 'watch' },
      { labelKey: 'indicators.heart_rate', value: '67 bpm', baselineDelta: '+3 bpm vs pre-flight', status: 'nominal' },
      { labelKey: 'indicators.sleep', value: '6.8 h', baselineDelta: '-0.6 h vs pre-flight', status: 'nominal' },
    ],
    chartSeries: [
      { label: 'Wk 1', value: 71, baseline: 64 },
      { label: 'Wk 2', value: 69, baseline: 64 },
      { label: 'Wk 3', value: 66, baseline: 64 },
      { label: 'Wk 4', value: 68, baseline: 64 },
    ],
  },
};

export const INITIAL_CHAT_THREADS: ChatThread[] = [
  {
    id: 'th-1',
    doctorName: 'Dr. Moussa Diop',
    doctorSpecialty: 'Lead Flight Surgeon · Cardiovascular & Bone',
    station: 'Houston / Dakar Ground Relay',
    signalDelayLabel: '~18 min async relay',
    unreadCount: 1,
  },
  {
    id: 'th-2',
    doctorName: 'Dr. Claire Moreau',
    doctorSpecialty: 'Behavioral & Circadian Specialist',
    station: 'Toulouse MEDES Console',
    signalDelayLabel: '~25 min async relay',
    unreadCount: 0,
  },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'cm-1',
    threadId: 'th-1',
    senderRole: 'astronaut',
    senderName: 'Cdr. Awa Ndiaye',
    body: 'Completed morning contactless check after shift rotation. Systolic read 134 mmHg (indicative). Will verify with arm cuff after rest.',
    sentAt: '2026-11-13T07:20:00Z',
    readAt: '2026-11-13T07:42:00Z',
    estimatedResponseMinutes: 20,
    attachment: {
      type: 'chart',
      label: '7-day Blood Pressure & HR Trend',
      meta: 'Simulated telemetry · Day 22–28',
    },
  },
  {
    id: 'cm-2',
    threadId: 'th-1',
    senderRole: 'doctor',
    senderName: 'Dr. Moussa Diop',
    body: 'Received your morning log. The +9 mmHg shift matches typical cephalad fluid redistribution after shorter sleep. Please log one calibrated cuff measurement and prioritize the 45-min lower-body ARED session today.',
    sentAt: '2026-11-13T08:04:00Z',
    readAt: '2026-11-13T08:11:00Z',
    estimatedResponseMinutes: 18,
  },
  {
    id: 'cm-3',
    threadId: 'th-2',
    senderRole: 'doctor',
    senderName: 'Dr. Claire Moreau',
    body: 'We noticed three nights near 6.0 hours during docking prep. Let us review lighting schedule options before Mission Day 30.',
    sentAt: '2026-11-12T20:15:00Z',
    readAt: null,
    estimatedResponseMinutes: 25,
    attachment: {
      type: 'voice',
      label: 'Circadian Wind-Down Briefing (0:42)',
      meta: 'Voice note · Simulated audio',
    },
  },
];

export const INITIAL_DOCTOR_SLOTS: DoctorSlot[] = [
  {
    id: 'sl-1',
    dateLabel: 'Nov 14',
    timeUtc: '14:00–14:30 UTC',
    doctorName: 'Dr. Moussa Diop',
    available: true,
    requested: false,
  },
  {
    id: 'sl-2',
    dateLabel: 'Nov 14',
    timeUtc: '18:30–19:00 UTC',
    doctorName: 'Dr. Claire Moreau',
    available: true,
    requested: false,
  },
  {
    id: 'sl-3',
    dateLabel: 'Nov 15',
    timeUtc: '09:00–09:30 UTC',
    doctorName: 'Dr. Moussa Diop',
    available: true,
    requested: false,
  },
];

export const INITIAL_CONSENTS: ConsentRecord[] = [
  {
    id: 'c-1',
    type: 'telemetry',
    version: 'v2.4',
    agreed: true,
    updatedAt: '2026-10-10T09:00:00Z',
  },
  {
    id: 'c-2',
    type: 'contactless_av',
    version: 'v1.8',
    agreed: true,
    updatedAt: '2026-10-10T09:02:00Z',
  },
  {
    id: 'c-3',
    type: 'learning_network',
    version: 'v2.0',
    agreed: false,
    updatedAt: '2026-10-10T09:05:00Z',
  },
];

export const LEARNING_SITES: LearningSite[] = [
  {
    id: 'site-1',
    name: 'Dakar Orbital Bio-Relay',
    country: 'Senegal',
    syncStatus: 'synchronized',
    lastSyncAt: '2026-11-13 11:20 UTC',
    contributingMissions: 14,
    unassistedSharePercent: 78,
  },
  {
    id: 'site-2',
    name: 'MEDES Space Clinic',
    country: 'France',
    syncStatus: 'synchronized',
    lastSyncAt: '2026-11-13 11:18 UTC',
    contributingMissions: 29,
    unassistedSharePercent: 74,
  },
  {
    id: 'site-3',
    name: 'Johnson Analog Physiology Lab',
    country: 'United States',
    syncStatus: 'synchronized',
    lastSyncAt: '2026-11-13 11:22 UTC',
    contributingMissions: 41,
    unassistedSharePercent: 71,
  },
  {
    id: 'site-4',
    name: 'Tsukuba Microgravity Unit',
    country: 'Japan',
    syncStatus: 'syncing',
    lastSyncAt: '2026-11-13 10:55 UTC',
    contributingMissions: 19,
    unassistedSharePercent: 82,
  },
];

export const SUBGROUP_PERFORMANCE: SubgroupPerformance[] = [
  { subgroup: 'Female crew (ages 28–45)', sampleCount: 1840, maeLabel: '±2.1 bpm / ±4.8 mmHg', coveragePercent: 91 },
  { subgroup: 'Male crew (ages 28–45)', sampleCount: 2190, maeLabel: '±2.0 bpm / ±4.6 mmHg', coveragePercent: 92 },
  { subgroup: 'Spaceflight (> 30 days)', sampleCount: 1420, maeLabel: '±2.4 bpm / ±5.3 mmHg', coveragePercent: 89 },
  { subgroup: 'Earth analog isolation', sampleCount: 2610, maeLabel: '±1.8 bpm / ±4.1 mmHg', coveragePercent: 93 },
];
