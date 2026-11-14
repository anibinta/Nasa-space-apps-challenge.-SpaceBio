/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SpaceBioProvider, useSpaceBio } from './context/SpaceBioContext';
import { I18nProvider } from './i18n';
import type { UserRole } from './types/health';
import { AccessDeniedScreen } from './components/shared/AccessDeniedScreen';
import { AppShell } from './components/shared/AppShell';
import { OnboardingPage } from './pages/OnboardingPage';
import { WelcomePage } from './pages/WelcomePage';
import { DashboardPage } from './pages/DashboardPage';
import { MeasurementsPage } from './pages/MeasurementsPage';
import { TrendsPage } from './pages/TrendsPage';
import { BoneHealthPage } from './pages/BoneHealthPage';
import { BodyMapPage } from './pages/BodyMapPage';
import { AnomaliesPage } from './pages/AnomaliesPage';
import { ReportsPage } from './pages/ReportsPage';
import { MissionPage } from './pages/MissionPage';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { DoctorPatientsPage } from './pages/DoctorPatientsPage';
import { PatientFilePage } from './pages/PatientFilePage';
import { DoctorAlertsPage } from './pages/DoctorAlertsPage';
import { LearningNetworkPage } from './pages/LearningNetworkPage';

const RequireRole: React.FC<{
  allowed: UserRole[];
  children: React.ReactNode;
}> = ({ allowed, children }) => {
  const { role } = useSpaceBio();
  if (!allowed.includes(role)) {
    return <AccessDeniedScreen />;
  }
  return <>{children}</>;
};

const OnboardingGate: React.FC = () => {
  const navigate = useNavigate();
  return (
    <OnboardingPage
      onEntered={(chosenRole) => {
        if (chosenRole === 'doctor') navigate('/patients', { replace: true });
        else if (chosenRole === 'admin') navigate('/network-overview', { replace: true });
        else navigate('/', { replace: true });
      }}
    />
  );
};

const AppRoutes: React.FC = () => {
  const { user, authReady } = useAuth();
  const { isGuest, enterGuestMode, onboardingCompleted, language, setLanguage, role } = useSpaceBio();

  const defaultRoute =
    role === 'doctor' ? '/patients' : role === 'admin' ? '/network-overview' : '/';

  return (
    <I18nProvider language={language} setLanguage={setLanguage}>
      <BrowserRouter>
        {!authReady ? (
          <main className="flex min-h-screen w-full items-center justify-center bg-[#050a18] text-sm text-slate-400">
            SpaceBio
          </main>
        ) : !user && !isGuest ? (
          <WelcomePage onContinueAsGuest={enterGuestMode} />
        ) : !onboardingCompleted ? (
          <OnboardingGate />
        ) : (
          <AppShell>
            <Routes>
              {/* Role root */}
              <Route
                path="/"
                element={
                  role === 'astronaut' ? (
                    <DashboardPage />
                  ) : (
                    <Navigate to={defaultRoute} replace />
                  )
                }
              />

              {/* Astronaut routes */}
              <Route
                path="/measurements"
                element={
                  <RequireRole allowed={['astronaut']}>
                    <MeasurementsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/trends"
                element={
                  <RequireRole allowed={['astronaut']}>
                    <TrendsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/bone-health"
                element={
                  <RequireRole allowed={['astronaut']}>
                    <BoneHealthPage />
                  </RequireRole>
                }
              />
              <Route
                path="/body-map"
                element={
                  <RequireRole allowed={['astronaut']}>
                    <BodyMapPage />
                  </RequireRole>
                }
              />
              <Route
                path="/mission"
                element={
                  <RequireRole allowed={['astronaut']}>
                    <MissionPage />
                  </RequireRole>
                }
              />

              {/* Shared Astronaut + Doctor routes */}
              <Route
                path="/anomalies"
                element={
                  <RequireRole allowed={['astronaut', 'doctor']}>
                    <AnomaliesPage />
                  </RequireRole>
                }
              />
              <Route
                path="/reports"
                element={
                  <RequireRole allowed={['astronaut', 'doctor']}>
                    <ReportsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/chat"
                element={
                  <RequireRole allowed={['astronaut', 'doctor']}>
                    <ChatPage />
                  </RequireRole>
                }
              />

              {/* Doctor routes */}
              <Route
                path="/patients"
                element={
                  <RequireRole allowed={['doctor']}>
                    <DoctorPatientsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/patient-file"
                element={
                  <RequireRole allowed={['doctor']}>
                    <PatientFilePage />
                  </RequireRole>
                }
              />
              <Route
                path="/alerts"
                element={
                  <RequireRole allowed={['doctor']}>
                    <DoctorAlertsPage />
                  </RequireRole>
                }
              />

              {/* Network Administrator routes */}
              <Route
                path="/network-overview"
                element={
                  <RequireRole allowed={['admin']}>
                    <LearningNetworkPage section="overview" />
                  </RequireRole>
                }
              />
              <Route
                path="/partner-sites"
                element={
                  <RequireRole allowed={['admin']}>
                    <LearningNetworkPage section="sites" />
                  </RequireRole>
                }
              />
              <Route
                path="/model-sync"
                element={
                  <RequireRole allowed={['admin']}>
                    <LearningNetworkPage section="sync" />
                  </RequireRole>
                }
              />
              <Route
                path="/inclusion"
                element={
                  <RequireRole allowed={['admin']}>
                    <LearningNetworkPage section="inclusion" />
                  </RequireRole>
                }
              />
              <Route
                path="/learning-network"
                element={
                  <RequireRole allowed={['admin']}>
                    <LearningNetworkPage section="overview" />
                  </RequireRole>
                }
              />

              {/* All roles Settings */}
              <Route path="/settings" element={<SettingsPage />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to={defaultRoute} replace />} />
            </Routes>
          </AppShell>
        )}
      </BrowserRouter>
    </I18nProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SpaceBioProvider>
        <AppRoutes />
      </SpaceBioProvider>
    </AuthProvider>
  );
}
