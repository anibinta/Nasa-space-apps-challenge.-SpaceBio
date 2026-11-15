import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  Bone,
  Building2,
  ChevronDown,
  Compass,
  FileText,
  FolderOpen,
  Globe2,
  Info,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageSquare,
  Moon,
  PhoneCall,
  RefreshCw,
  Repeat,
  Rocket,
  Settings,
  Shield,
  ShieldCheck,
  Stethoscope,
  Sun,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSpaceBio } from '../../context/SpaceBioContext';
import { getLanguageOption, SUPPORTED_LANGUAGES } from '../../data/languages';
import { useTranslation } from '../../i18n';
import { formatLocaleNumber } from '../../i18n/format';
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
    badgeClass: 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200',
  },
  doctor: {
    labelKey: 'common.roleDoctor',
    icon: Stethoscope,
    badgeClass: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
  },
  admin: {
    labelKey: 'common.roleAdmin',
    icon: Shield,
    badgeClass: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
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
    profile,
    returnToOnboarding,
    transitionBannerKey,
    dismissTransitionBanner,
    syncError,
    clearSyncError,
  } = useSpaceBio();
  const { t, isTranslationInProgress } = useTranslation();

  const [selectedBg, setSelectedBg] = useState(() => pickRandomBackground(effectiveMode));
  const [bgLoaded, setBgLoaded] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const infoRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBgLoaded(false);
    setSelectedBg(pickRandomBackground(effectiveMode));
  }, [effectiveMode]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setInfoOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInfoOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const navItems = ROLE_NAV_ITEMS[role];
  const activeError = authError || syncError;
  const roleBadge = ROLE_HEADER_BADGE[role];
  const RoleIcon = roleBadge.icon;
  const activeLangOption = getLanguageOption(language);
  const modeLabel = effectiveMode === 'space' ? t('common.spaceMode') : t('common.earthMode');
  const roleHeaderText =
    role === 'astronaut' ? `${t(roleBadge.labelKey)} · ${modeLabel}` : t(roleBadge.labelKey);

  const activeNavAccent =
    role === 'admin'
      ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/25'
      : role === 'doctor' || effectiveMode === 'earth'
        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-400/25'
        : 'bg-cyan-500/15 text-cyan-900 dark:text-cyan-300 border border-cyan-400/25';

  return (
    <div className="relative min-h-screen bg-[#f4f7fb] text-slate-900 dark:bg-[#070d17] dark:text-slate-100">
      {/* Dark mode NASA background + 36 px faint grid + soft center cyan aura */}
      <div
        aria-hidden="true"
        data-testid="space-background-layer"
        data-mode={effectiveMode}
        className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden bg-[#070d17] dark:block"
      >
        <img
          src={selectedBg.src}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setBgLoaded(true)}
          className={cn(
            'space-bg-drift h-full w-full object-cover opacity-35 transition-opacity duration-500',
            bgLoaded ? 'opacity-35' : 'opacity-0'
          )}
        />
        <div
          data-testid="space-background-overlay"
          className="space-grid-bg absolute inset-0 bg-[#070d17]/78"
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 52% 44% at 54% 52%, rgba(56, 189, 248, 0.11), transparent 72%)',
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        {/* Desktop Sidebar */}
        <aside
          aria-label={t('common.primarySidebar')}
          className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-e lg:border-slate-200 dark:lg:border-cyan-400/20 lg:bg-white dark:lg:bg-[#08101e]/95"
        >
          <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 px-5 dark:border-cyan-400/20">
            <Rocket className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden="true" />
            <span className="text-lg font-bold tracking-tight whitespace-nowrap">
              {t('common.brand')}
            </span>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label={t('common.menuNavigation')}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400',
                      isActive
                        ? activeNavAccent
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-cyan-500/10 dark:hover:text-slate-100'
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{t(item.labelKey)}</span>
                </NavLink>
              );
            })}
          </nav>

          <div
            data-testid="sidebar-mode-footer"
            className="border-t border-slate-200 p-4 text-xs text-slate-600 dark:border-cyan-400/20 dark:text-slate-400"
          >
            <div className="font-medium text-slate-900 dark:text-slate-200 truncate">
              {role === 'astronaut' ? mission.name : t(roleBadge.labelKey)}
            </div>
            <div className="mt-1 font-mono-tabular">
              {modeLabel}
              {role === 'astronaut'
                ? ` · ${t('common.day')} ${formatLocaleNumber(mission.currentDay, language)}/${formatLocaleNumber(mission.plannedDurationDays, language)}`
                : ''}
            </div>
          </div>
        </aside>

        {/* Main Column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Decluttered Header: role badge, always-visible Urgence à bord, Données simulées badge, Info button, Profile menu */}
          <header className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-cyan-400/20 dark:bg-[#070d17]/92 dark:text-slate-100 sm:flex-nowrap sm:px-6 sm:py-1.5">
            <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
              <div className="flex items-center gap-1.5 lg:hidden shrink-0">
                <Rocket className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                <span className="font-bold tracking-tight text-slate-900 dark:text-white">
                  {t('common.brand')}
                </span>
              </div>

              <span
                data-testid="header-role-badge"
                title={roleHeaderText}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold shrink-0 sm:px-2.5',
                  roleBadge.badgeClass
                )}
              >
                <RoleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{roleHeaderText}</span>
              </span>

              <span
                data-testid="header-simulated-badge"
                className="hidden md:inline-flex items-center rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-900 dark:text-cyan-200 shrink-0"
              >
                {t('common.simulatedData')}
              </span>
            </div>

            <div className="ms-auto flex max-w-full items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Always-visible On-board Emergency button */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    data-testid="onboard-emergency-btn"
                    className="h-8 min-h-0 px-2 text-[11px] sm:px-2.5 sm:text-xs"
                  >
                    <PhoneCall className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="whitespace-nowrap">{t('header.emergencyBtn')}</span>
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

              {/* Consolidated Info Button (Guest notice, Role status, Non-diagnostic advisory) */}
              <div className="relative" ref={infoRef}>
                <button
                  type="button"
                  data-testid="header-info-btn"
                  aria-expanded={infoOpen}
                  aria-label={t('header.infoPanelTitle')}
                  onClick={() => {
                    setInfoOpen((v) => !v);
                    setProfileOpen(false);
                  }}
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400',
                    infoOpen
                      ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200'
                      : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-cyan-400/30 dark:bg-[#0b1424] dark:text-cyan-200 dark:hover:bg-cyan-500/10'
                  )}
                >
                  <Info className="h-4 w-4" aria-hidden="true" />
                </button>

                {infoOpen && (
                  <div
                    role="dialog"
                    data-testid="header-info-panel"
                    aria-label={t('header.infoPanelTitle')}
                    className="absolute end-0 top-10 z-50 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-cyan-400/30 bg-white p-4 text-xs shadow-xl dark:bg-[#0b1424] dark:text-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 font-semibold text-slate-900 dark:text-white">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                        <span>{t('header.infoPanelTitle')}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setInfoOpen(false)}
                        aria-label={t('common.close')}
                        className="rounded p-1 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <p className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 p-2.5 leading-relaxed text-slate-800 dark:text-cyan-100">
                      {t('common.safetyNotice')}
                    </p>

                    <div className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700/80 space-y-1.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {t('common.roleLabel')}: {t(roleBadge.labelKey)}
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">
                        {isGuest ? t('welcome.guestBanner') : t('common.signedInAccount')}
                      </div>
                      {isGuest && (
                        <button
                          type="button"
                          onClick={exitGuestMode}
                          className="font-semibold text-amber-600 underline underline-offset-2 dark:text-amber-300"
                        >
                          {t('welcome.exitGuest')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Single Profile Menu (Changer de rôle, Language, Light/Dark theme, Quitter le mode invité) */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  data-testid="profile-menu-btn"
                  aria-expanded={profileOpen}
                  aria-label={t('header.profileMenu')}
                  onClick={() => {
                    setProfileOpen((v) => !v);
                    setInfoOpen(false);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-slate-100 px-2.5 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-200 dark:border-cyan-400/30 dark:bg-[#0b1424] dark:text-slate-100 dark:hover:bg-cyan-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <User className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  <span className="hidden sm:inline max-w-[110px] truncate">
                    {role === 'admin' ? t('header.profileMenu') : profile.firstName || t('header.profileMenu')}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                </button>

                {profileOpen && (
                  <div
                    role="menu"
                    data-testid="profile-menu-dropdown"
                    className="absolute end-0 top-10 z-50 w-64 rounded-xl border border-cyan-400/30 bg-white p-3 text-xs shadow-xl dark:bg-[#0b1424] dark:text-slate-200 space-y-2.5"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      data-testid="switch-role-btn"
                      onClick={() => {
                        setProfileOpen(false);
                        returnToOnboarding();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start font-medium hover:bg-slate-100 dark:hover:bg-cyan-500/10"
                    >
                      <Repeat className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                      <span>{t('header.switchRole')}</span>
                    </button>

                    <div className="space-y-1 border-t border-slate-200 pt-2.5 dark:border-slate-800">
                      <label
                        htmlFor="header-lang-select"
                        className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                      >
                        <FlagIcon code={activeLangOption.flagCodes[0]} />
                        <span>{t('settings.languageLabel')}</span>
                      </label>
                      <select
                        id="header-lang-select"
                        aria-label={t('settings.languageLabel')}
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as Language)}
                        className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-900 dark:border-cyan-400/30 dark:bg-[#070d17] dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                      >
                        {SUPPORTED_LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.code.toUpperCase()} — {l.nativeName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      role="menuitem"
                      data-testid="theme-toggle-btn"
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 font-medium hover:bg-slate-100 dark:hover:bg-cyan-500/10"
                    >
                      <span>{t('settings.themeLabel')}</span>
                      <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-cyan-300">
                        {theme === 'dark' ? (
                          <>
                            <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                            <span>{t('settings.themeLight')}</span>
                          </>
                        ) : (
                          <>
                            <Moon className="h-3.5 w-3.5 text-cyan-500" aria-hidden="true" />
                            <span>{t('settings.themeDark')}</span>
                          </>
                        )}
                      </span>
                    </button>

                    <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
                      {user ? (
                        <button
                          type="button"
                          role="menuitem"
                          data-testid="sign-out-btn"
                          disabled={authBusy}
                          onClick={() => {
                            setProfileOpen(false);
                            void signOutUser();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start font-medium text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                        >
                          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t('common.signOut')}</span>
                        </button>
                      ) : isGuest ? (
                        <button
                          type="button"
                          role="menuitem"
                          data-testid="exit-guest-btn"
                          onClick={() => {
                            setProfileOpen(false);
                            exitGuestMode();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start font-medium text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
                        >
                          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t('welcome.exitGuest')}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          role="menuitem"
                          disabled={authBusy}
                          onClick={() => {
                            setProfileOpen(false);
                            void signInWithGoogle();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start font-medium text-cyan-700 hover:bg-cyan-500/10 dark:text-cyan-300"
                        >
                          <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{authBusy ? t('common.signingIn') : t('common.signIn')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Auto-dismissing 3-second role connection confirmation toast */}
          {transitionBannerKey && (
            <div
              role="status"
              data-testid="role-transition-banner"
              className="fixed end-4 top-16 z-40 flex items-center gap-2.5 rounded-lg border border-cyan-400/40 bg-[#0b1424]/95 px-3.5 py-2 text-xs font-medium text-cyan-200 shadow-lg"
            >
              <span>{t(transitionBannerKey)}</span>
              <button
                type="button"
                onClick={dismissTransitionBanner}
                aria-label={t('common.dismiss')}
                className="rounded p-0.5 hover:bg-cyan-500/20"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Page Viewport */}
          <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-5 px-4 py-4 pb-8 sm:px-6 lg:py-5">
            {/* Tablet/Mobile quick route pills */}
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
                  aria-label={t('common.dismiss')}
                  className="rounded p-1 hover:bg-rose-500/10"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            <div className="flex-1 space-y-5">{children}</div>

            {/* Persistent Footer: Disclaimer, Guest-mode line (guest only), and NASA credit */}
            <footer
              data-testid="app-footer"
              className="mt-6 space-y-1.5 border-t border-slate-300/60 pt-4 text-xs text-slate-600 dark:border-cyan-400/20 dark:text-slate-400"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{t('common.safetyNotice')}</span>
                <span className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400">
                  {t('common.brand')} · {user ? t('common.signedInAccount') : t('common.simulatedData')}
                </span>
              </div>
              {isGuest && (
                <p data-testid="footer-guest-notice" className="text-[11px] text-amber-700 dark:text-amber-300/90">
                  {t('welcome.guestBanner')}
                </p>
              )}
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('common.footerImageCaption')} ({t(`common.backgrounds.${selectedBg.id}`)})
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
};
