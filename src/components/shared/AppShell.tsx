import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  Bone,
  Building2,
  Clock,
  Compass,
  FileText,
  FolderOpen,
  Globe2,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageSquare,
  Moon,
  Network,
  PhoneCall,
  Radio,
  RefreshCw,
  Repeat,
  Rocket,
  Settings,
  Shield,
  Stethoscope,
  Sun,
  Thermometer,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSpaceBio } from '../../context/SpaceBioContext';
import { getLanguageOption, SUPPORTED_LANGUAGES } from '../../data/languages';
import { useTranslation } from '../../i18n';
import { pickRandomBackground } from '../../lib/backgrounds';
import type { Language, UserRole } from '../../types/health';
import { cn } from '../ui/cn';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { FlagIcon } from './FlagIcon';
import { SafetyNotice } from './SafetyNotice';

interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  mobilePrimary?: boolean;
}

const ROLE_NAV_ITEMS: Record<UserRole, NavItem[]> = {
  astronaut: [
    { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, mobilePrimary: true },
    { to: '/measurements', labelKey: 'nav.measurements', icon: Activity, mobilePrimary: true },
    { to: '/trends', labelKey: 'nav.trends', icon: TrendingUp },
    { to: '/bone-health', labelKey: 'nav.boneHealth', icon: Bone },
    { to: '/body-map', labelKey: 'nav.bodyMap', icon: Compass, mobilePrimary: true },
    { to: '/anomalies', labelKey: 'nav.anomalies', icon: AlertTriangle },
    { to: '/reports', labelKey: 'nav.reports', icon: FileText },
    { to: '/mission', labelKey: 'nav.mission', icon: Rocket },
    { to: '/chat', labelKey: 'nav.chat', icon: MessageSquare, mobilePrimary: true },
    { to: '/settings', labelKey: 'nav.settings', icon: Settings, mobilePrimary: true },
  ],
  doctor: [
    { to: '/patients', labelKey: 'nav.patients', icon: Users, mobilePrimary: true },
    { to: '/patient-file', labelKey: 'nav.patientFile', icon: FolderOpen, mobilePrimary: true },
    { to: '/alerts', labelKey: 'nav.alerts', icon: Bell, mobilePrimary: true },
    { to: '/anomalies', labelKey: 'nav.anomalies', icon: AlertTriangle },
    { to: '/chat', labelKey: 'nav.chat', icon: MessageSquare, mobilePrimary: true },
    { to: '/reports', labelKey: 'nav.reports', icon: FileText },
    { to: '/settings', labelKey: 'nav.settings', icon: Settings, mobilePrimary: true },
  ],
  admin: [
    { to: '/network-overview', labelKey: 'nav.networkOverview', icon: Network, mobilePrimary: true },
    { to: '/partner-sites', labelKey: 'nav.partnerSites', icon: Building2, mobilePrimary: true },
    { to: '/model-sync', labelKey: 'nav.modelSync', icon: RefreshCw, mobilePrimary: true },
    { to: '/inclusion', labelKey: 'nav.inclusion', icon: Globe2, mobilePrimary: true },
    { to: '/settings', labelKey: 'nav.settings', icon: Settings, mobilePrimary: true },
  ],
};

const ROLE_HEADER_BADGE: Record<
  UserRole,
  {
    labelKey: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeClass: string;
  }
> = {
  astronaut: {
    labelKey: 'common.roleAstronaut',
    icon: Rocket,
    badgeClass: 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200',
  },
  doctor: {
    labelKey: 'common.roleDoctor',
    icon: Stethoscope,
    badgeClass: 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200',
  },
  admin: {
    labelKey: 'common.roleAdmin',
    icon: Shield,
    badgeClass: 'border-amber-400/50 bg-amber-500/20 text-amber-200',
  },
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authBusy, authError, signInWithGoogle, signOutUser, clearAuthError } = useAuth();
  const {
    isGuest,
    exitGuestMode,
    language,
    setLanguage,
    theme,
    setTheme,
    mission,
    role,
    effectiveMode,
    earthSiteEnvironment,
    returnToOnboarding,
    transitionBanner,
    dismissTransitionBanner,
    syncError,
    clearSyncError,
  } = useSpaceBio();
  const { t, isTranslationInProgress } = useTranslation();

  // Select random mode-matched NASA-inspired WebP background when operational mode changes
  const [selectedBg, setSelectedBg] = useState(() => pickRandomBackground(effectiveMode));
  const [bgLoaded, setBgLoaded] = useState(false);
  const [headerBgLoaded, setHeaderBgLoaded] = useState(false);
  const [utcNow, setUtcNow] = useState(() => new Date().toISOString().slice(11, 19));

  useEffect(() => {
    setBgLoaded(false);
    setHeaderBgLoaded(false);
    setSelectedBg(pickRandomBackground(effectiveMode));
  }, [effectiveMode]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setUtcNow(new Date().toISOString().slice(11, 19));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const navItems = ROLE_NAV_ITEMS[role];
  const mobileNavItems = navItems.filter((i) => i.mobilePrimary).slice(0, 5);
  const activeError = authError || syncError;
  const roleBadge = ROLE_HEADER_BADGE[role];
  const RoleIcon = roleBadge.icon;
  const activeLangOption = getLanguageOption(language);

  const activeNavAccent =
    role === 'admin'
      ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
      : role === 'doctor' || effectiveMode === 'earth'
        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
        : 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300';

  return (
    <div className="relative min-h-screen bg-[#f4f7fb] text-slate-900 dark:bg-[#050a18] dark:text-slate-100">
      {/* Fixed mode-matched NASA-inspired background layer (never placed behind cards/tables/charts) */}
      <div
        aria-hidden="true"
        data-testid="space-background-layer"
        data-mode={effectiveMode}
        className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden bg-[#050a18] dark:block"
      >
        <img
          src={selectedBg.src}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setBgLoaded(true)}
          className={cn(
            'space-bg-drift h-full w-full object-cover transition-opacity duration-500',
            bgLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
        <div
          data-testid="space-background-overlay"
          className="absolute inset-0 bg-[#050a18]/72"
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        {/* Desktop Sidebar */}
        <aside
          aria-label="Primary sidebar"
          className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-e lg:border-slate-200 dark:lg:border-slate-800 lg:bg-white dark:lg:bg-[#070d20]"
        >
          <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 px-5 dark:border-slate-800">
            <Rocket
              className={cn(
                'h-5 w-5 shrink-0',
                effectiveMode === 'space' ? 'text-violet-400' : 'text-emerald-500'
              )}
              aria-hidden="true"
            />
            <span className="text-lg font-bold tracking-tight whitespace-nowrap">
              {t('common.brand')}
            </span>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400',
                      isActive
                        ? activeNavAccent
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{t(item.labelKey)}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <div className="font-medium text-slate-900 dark:text-slate-200 truncate">
              {role === 'astronaut' ? mission.name : t(roleBadge.labelKey)}
            </div>
            <div className="mt-1 font-mono-tabular">
              {effectiveMode === 'space' ? t('common.spaceMode') : t('common.earthMode')}
              {role === 'astronaut' ? ` · ${t('common.day')} ${mission.currentDay}/${mission.plannedDurationDays}` : ''}
            </div>
          </div>
        </aside>

        {/* Main Column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Context Header featuring Space vs Earth mode telemetry & role badge */}
          <header className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center justify-between gap-2 overflow-hidden border-b border-slate-800 bg-[#050a18] px-4 py-1.5 text-slate-100 sm:px-6">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#050a18]">
              <img
                src={selectedBg.src}
                alt=""
                loading="lazy"
                decoding="async"
                onLoad={() => setHeaderBgLoaded(true)}
                className={cn(
                  'space-bg-drift h-full w-full object-cover transition-opacity duration-500',
                  headerBgLoaded ? 'opacity-100' : 'opacity-0'
                )}
              />
              <div className="absolute inset-0 bg-[#050a18]/72" />
            </div>

            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <div className="flex items-center gap-2 lg:hidden shrink-0">
                <Rocket className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                <span className="font-bold tracking-tight text-white">{t('common.brand')}</span>
              </div>

              {/* Active role color & icon badge */}
              <span
                data-testid="header-role-badge"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold shrink-0',
                  roleBadge.badgeClass
                )}
              >
                <RoleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t(roleBadge.labelKey)}</span>
              </span>

              {/* Mode-specific operational indicators */}
              {effectiveMode === 'space' ? (
                <div
                  data-testid="space-mode-telemetry"
                  className="hidden md:flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-200"
                >
                  <span className="inline-flex items-center gap-1 font-mono-tabular text-cyan-300 whitespace-nowrap">
                    <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{t('header.missionClock')}:</span>
                    <span dir="ltr">{utcNow} UTC</span>
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono-tabular text-violet-300 whitespace-nowrap">
                    <Radio className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{t('header.commDelay')}</span>
                  </span>
                </div>
              ) : (
                <div
                  data-testid="earth-mode-environment"
                  className="hidden md:flex items-center gap-2 text-xs text-emerald-200 font-mono-tabular"
                >
                  <Thermometer className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>
                    {t('header.siteEnv')}: <span dir="ltr">{earthSiteEnvironment.temperatureC}°C · {earthSiteEnvironment.humidityPercent}% RH</span> · {t('header.heatIndexLabel')}{' '}
                    <span dir="ltr">{earthSiteEnvironment.heatIndexC}°C</span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Space mode: On-board emergency procedure button */}
              {effectiveMode === 'space' && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      data-testid="onboard-emergency-btn"
                      className="h-8 min-h-0 px-2.5 text-xs"
                    >
                      <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">{t('header.emergencyBtn')}</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('header.emergencyTitle')}</DialogTitle>
                      <DialogDescription>{t('chat.emergencyBanner')}</DialogDescription>
                    </DialogHeader>
                    <div className="mt-3 space-y-2.5 text-sm text-slate-700 dark:text-slate-200">
                      <p>{t('chat.emergencySteps.0')}</p>
                      <p>{t('chat.emergencySteps.1')}</p>
                      <p>{t('chat.emergencySteps.2')}</p>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Switch role (returns to onboarding page) */}
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="switch-role-btn"
                onClick={returnToOnboarding}
                className="h-8 min-h-0 border-slate-700 bg-[#0a1226] px-2.5 text-xs text-slate-100 hover:bg-slate-800"
              >
                <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t('header.switchRole')}</span>
              </Button>

              {/* Language selector with SVG flag */}
              <label htmlFor="header-lang-select" className="sr-only">
                {t('settings.languageLabel')}
              </label>
              <div className="flex items-center gap-1.5">
                <FlagIcon code={activeLangOption.flagCodes[0]} />
                <select
                  id="header-lang-select"
                  aria-label={t('settings.languageLabel')}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="h-8 rounded-md border border-slate-700 bg-[#0a1226] px-2 text-xs font-medium text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.code.toUpperCase()} — {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Theme switcher */}
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={theme === 'dark' ? t('settings.themeLight') : t('settings.themeDark')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-[#0a1226] text-slate-100 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                )}
              </button>

              {/* Auth Sign-Out or Exit Guest Mode */}
              {user ? (
                <button
                  type="button"
                  data-testid="sign-out-btn"
                  disabled={authBusy}
                  onClick={() => void signOutUser()}
                  aria-label={t('common.signOut')}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-[#0a1226] px-2.5 text-xs font-medium text-slate-100 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  <LogOut className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
                  <span className="hidden sm:inline">{t('common.signOut')}</span>
                </button>
              ) : isGuest ? (
                <button
                  type="button"
                  data-testid="exit-guest-btn"
                  onClick={exitGuestMode}
                  aria-label={t('welcome.exitGuest')}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-[#0a1226] px-2.5 text-xs font-medium text-slate-100 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors whitespace-nowrap"
                >
                  <LogOut className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
                  <span className="hidden sm:inline">{t('welcome.exitGuest')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={() => void signInWithGoogle()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-cyan-500/50 bg-cyan-500/20 px-2.5 text-xs font-medium text-cyan-100 hover:bg-cyan-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  <LogIn className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
                  <span className="hidden sm:inline">{authBusy ? t('common.signingIn') : t('common.signIn')}</span>
                </button>
              )}
            </div>
          </header>

          {/* Page Viewport */}
          <main className="mx-auto flex w-full max-w-[1380px] flex-1 flex-col gap-5 px-4 py-4 pb-20 sm:px-6 lg:py-5 lg:pb-8">
            {/* Tablet/Mobile scrollable route links */}
            <div className="flex lg:hidden items-center gap-1 overflow-x-auto pb-1 text-xs">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'whitespace-nowrap rounded-md px-2.5 py-1 font-medium transition-colors shrink-0',
                      isActive ? activeNavAccent : 'text-slate-600 dark:text-slate-300'
                    )
                  }
                >
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </div>

            {isGuest && (
              <div
                role="status"
                data-testid="guest-mode-banner"
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-950 dark:bg-[#231807] dark:text-amber-200"
              >
                <span>{t('welcome.guestBanner')}</span>
                <button
                  type="button"
                  onClick={exitGuestMode}
                  className="font-semibold underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-100"
                >
                  {t('welcome.exitGuest')}
                </button>
              </div>
            )}

            {transitionBanner && (
              <div
                role="status"
                data-testid="role-transition-banner"
                className="flex items-center justify-between gap-3 rounded-lg border border-cyan-500/40 bg-cyan-50 px-4 py-2.5 text-xs font-semibold text-cyan-950 dark:bg-[#081a30] dark:text-cyan-200"
              >
                <span>{transitionBanner}</span>
                <button
                  type="button"
                  onClick={dismissTransitionBanner}
                  aria-label="Dismiss banner"
                  className="rounded p-1 hover:bg-cyan-500/15"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            {isTranslationInProgress && (
              <div
                role="note"
                data-testid="translation-in-progress-notice"
                className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-950 dark:bg-[#231807] dark:text-amber-200"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
                <span>{t('common.translationNotice')}</span>
              </div>
            )}

            {activeError && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 rounded-lg border border-rose-500/40 bg-rose-50 px-4 py-2.5 text-xs text-rose-900 dark:bg-[#2a0e18] dark:text-rose-200"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" aria-hidden="true" />
                  <span>{activeError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearAuthError();
                    clearSyncError();
                  }}
                  aria-label="Dismiss message"
                  className="rounded p-1 hover:bg-rose-500/10"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            <SafetyNotice />
            <div className="flex-1 space-y-5">{children}</div>

            {/* Persistent footer with "Image: NASA" and "NASA-inspired" (no NASA logo/insignia) */}
            <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-300/60 pt-4 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
              <span>
                {t('common.footerImageCaption')} ({selectedBg.label})
              </span>
              <span className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400">
                {t('common.brand')} · {user ? t('common.signedInAccount') : t('common.simulatedData')}
              </span>
            </footer>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex h-[52px] items-center justify-around border-t border-slate-200 bg-white px-1 dark:border-slate-800 dark:bg-[#070d20] lg:hidden"
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-cyan-700 dark:text-cyan-300'
                    : 'text-slate-500 dark:text-slate-400'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="max-w-[68px] truncate">{t(item.labelKey)}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
