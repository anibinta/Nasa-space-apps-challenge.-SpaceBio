import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAnonymizedAdminSummary,
  canRoleAccessAdminSummary,
  canRoleAccessDoctorRoster,
  canRoleMutateMeasurements,
  enforceEffectiveMode,
  sortAssignedPatientsBySeverity,
  validateOnboardingPayload,
} from './rbac.ts';
import { ASSIGNED_PATIENTS } from '../data/mock.ts';

test('validateOnboardingPayload enforces age 18-99 and non-empty names', () => {
  const underage = validateOnboardingPayload({
    role: 'astronaut',
    language: 'en',
    firstName: 'Awa',
    lastName: 'Ndiaye',
    age: 17,
    mode: 'space',
    missionName: 'Ares-IV',
    startDate: '2026-10-16',
    plannedDurationDays: 60,
  });
  assert.equal(underage.valid, false);

  const emptyName = validateOnboardingPayload({
    role: 'doctor',
    language: 'fr',
    firstName: '   ',
    lastName: 'Diop',
    age: 42,
    mode: 'space',
  });
  assert.equal(emptyName.valid, false);
});

test('doctors and admins are always forced into earth mode regardless of input', () => {
  assert.equal(enforceEffectiveMode('doctor', 'space'), 'earth');
  assert.equal(enforceEffectiveMode('admin', 'space'), 'earth');
  assert.equal(enforceEffectiveMode('astronaut', 'space'), 'space');
  assert.equal(enforceEffectiveMode('astronaut', 'earth'), 'earth');

  const doc = validateOnboardingPayload({
    role: 'doctor',
    language: 'fr',
    firstName: 'Moussa',
    lastName: 'Diop',
    age: 45,
    mode: 'space',
  });
  assert.equal(doc.valid, true);
  if (doc.valid) {
    assert.equal(doc.data.effectiveMode, 'earth');
    assert.equal(doc.data.language, 'fr');
  }
});

test('RBAC role permissions match strict clinical and privacy boundaries', () => {
  assert.equal(canRoleMutateMeasurements('astronaut'), true);
  assert.equal(canRoleMutateMeasurements('doctor'), false);
  assert.equal(canRoleMutateMeasurements('admin'), false);

  assert.equal(canRoleAccessDoctorRoster('doctor'), true);
  assert.equal(canRoleAccessDoctorRoster('astronaut'), false);
  assert.equal(canRoleAccessDoctorRoster('admin'), false);

  assert.equal(canRoleAccessAdminSummary('admin'), true);
  assert.equal(canRoleAccessAdminSummary('astronaut'), false);
  assert.equal(canRoleAccessAdminSummary('doctor'), false);
});

test('sortAssignedPatientsBySeverity ranks critical before warning before info', () => {
  const reversed = [...ASSIGNED_PATIENTS].reverse();
  const sorted = sortAssignedPatientsBySeverity(reversed);
  assert.equal(sorted[0].highestAlertSeverity, 'critical');
  assert.equal(sorted[1].highestAlertSeverity, 'warning');
  assert.equal(sorted[2].highestAlertSeverity, 'info');
});

test('buildAnonymizedAdminSummary never exposes personal identifiers', () => {
  const summary = buildAnonymizedAdminSummary({
    activeDbMissions: 4,
    totalDbMeasurements: 100,
    contactlessCount: 35,
    alertCounts: { critical: 1, warning: 3, info: 5 },
    spaceObservations: 70,
    earthObservations: 30,
  });

  const serialized = JSON.stringify(summary);
  assert.equal(summary.anonymizedOnly, true);
  assert.equal(summary.contactlessSharePercent, 35);
  assert.equal(serialized.includes('fullName'), false);
  assert.equal(serialized.includes('email'), false);
  assert.equal(serialized.includes('uid'), false);
  assert.equal(serialized.includes('Ndiaye'), false);
});
