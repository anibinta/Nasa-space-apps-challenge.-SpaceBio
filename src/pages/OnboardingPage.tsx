import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Globe2,
  Orbit,
  Rocket,
  Search,
  Shield,
  Stethoscope,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { useSpaceBio } from '../context/SpaceBioContext';
import { useTranslation } from '../i18n';
import { pickRandomBackground } from '../lib/backgrounds';
import type { Language, OperationalMode, UserRole } from '../types/health';
import { FlagIcon } from '../components/shared/FlagIcon';
import { SafetyNotice } from '../components/shared/SafetyNotice';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input, Label } from '../components/ui/input';
import { cn } from '../components/ui/cn';

const ROLE_CARDS: {
  id: UserRole;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descKey: string;
  accentClasses: string;
  iconBg: string;
}[] = [
  {
    id: 'astronaut',
    icon: Rocket,
    titleKey: 'common.roleAstronaut',
    descKey: 'onboarding.roleAstronautDesc',
    accentClasses: 'border-cyan-500 bg-cyan-500/15 text-cyan-950 dark:text-white',
    iconBg: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
  },
  {
    id: 'doctor',
    icon: Stethoscope,
    titleKey: 'common.roleDoctor',
    descKey: 'onboarding.roleDoctorDesc',
    accentClasses: 'border-emerald-500 bg-emerald-500/15 text-emerald-950 dark:text-white',
    iconBg: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'admin',
    icon: Shield,
    titleKey: 'common.roleAdmin',
    descKey: 'onboarding.roleAdminDesc',
    accentClasses: 'border-amber-500 bg-amber-500/15 text-amber-950 dark:text-white',
    iconBg: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  },
];

export const OnboardingPage: React.FC<{ onEntered?: (role: UserRole) => void }> = ({ onEntered }) => {
  const {
    role: savedRole,
    language,
    setLanguage,
    profile,
    mission,
    workspaceRevision,
    completeOnboarding,
  } = useSpaceBio();
  const { t, isTranslationInProgress } = useTranslation();

  const [hasEdited, setHasEdited] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(savedRole);
  const [selectedLang, setSelectedLang] = useState<Language>(language);
  const [langQuery, setLangQuery] = useState('');
  const [firstName, setFirstName] = useState(profile.firstName || 'Awa');
  const [lastName, setLastName] = useState(profile.lastName || 'Ndiaye');
  const [ageInput, setAgeInput] = useState(String(profile.age || 36));
  const [selectedMode, setSelectedMode] = useState<OperationalMode>(mission.mode);
  const [missionName, setMissionName] = useState(mission.name);
  const [startDate, setStartDate] = useState(mission.departureDate);
  const [plannedDaysInput, setPlannedDaysInput] = useState(String(mission.plannedDurationDays));

  useEffect(() => {
    if (hasEdited || workspaceRevision === 0) return;
    setSelectedRole(savedRole);
    setSelectedLang(language);
    setFirstName(profile.firstName || 'Awa');
    setLastName(profile.lastName || 'Ndiaye');
    setAgeInput(String(profile.age || 36));
    setSelectedMode(mission.mode);
    setMissionName(mission.name);
    setStartDate(mission.departureDate);
    setPlannedDaysInput(String(mission.plannedDurationDays));
  }, [
    hasEdited,
    workspaceRevision,
    savedRole,
    language,
    profile.firstName,
    profile.lastName,
    profile.age,
    mission.mode,
    mission.name,
    mission.departureDate,
    mission.plannedDurationDays,
  ]);

  const [selectedBg] = useState(() =>
    pickRandomBackground(selectedRole === 'astronaut' ? selectedMode : 'earth')
  );
  const [bgLoaded, setBgLoaded] = useState(false);

  const filteredLanguages = useMemo(() => {
    const q = langQuery.trim().toLowerCase();
    if (!q) return SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [langQuery]);

  const parsedAge = Number(ageInput);
  const ageValid = Number.isInteger(parsedAge) && parsedAge >= 18 && parsedAge <= 99;
  const parsedPlannedDays = Number(plannedDaysInput);
  const missionValid =
    selectedRole !== 'astronaut' ||
    (missionName.trim().length > 0 &&
      Boolean(startDate) &&
      Number.isFinite(parsedPlannedDays) &&
      parsedPlannedDays >= 1);

  const isFormValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    ageValid &&
    missionValid;

  const handleLanguagePick = (code: Language) => {
    setHasEdited(true);
    setSelectedLang(code);
    setLanguage(code);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const effectiveMode: OperationalMode = selectedRole === 'astronaut' ? selectedMode : 'earth';
    let banner = t('onboarding.bannerAdmin');
    if (selectedRole === 'astronaut') {
      banner =
        effectiveMode === 'space'
          ? t('onboarding.bannerAstronautSpace')
          : t('onboarding.bannerAstronautEarth');
    } else if (selectedRole === 'doctor') {
      banner = t('onboarding.bannerDoctor');
    }

    completeOnboarding(
      {
        role: selectedRole,
        language: selectedLang,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age: parsedAge,
        mode: effectiveMode,
        missionName: missionName.trim(),
        startDate,
        plannedDurationDays: Math.max(1, Math.round(parsedPlannedDays || 60)),
      },
      banner
    );
    onEntered?.(selectedRole);
  };

  return (
    <div className="relative min-h-screen bg-[#f4f7fb] text-slate-900 dark:bg-[#050a18] dark:text-slate-100">
      {/* Fixed dark-scrimmed NASA-inspired background in empty canvas space */}
      <div
        aria-hidden="true"
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
        <div className="absolute inset-0 bg-[#050a18]/75" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10 space-y-6">
        {/* Hero Header */}
        <div className="rounded-2xl border border-slate-800 bg-[#070d20] p-6 text-white shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
                <Rocket className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{t('onboarding.title')}</h1>
                <p className="mt-1 text-sm text-slate-300">{t('onboarding.subtitle')}</p>
              </div>
            </div>
            <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-200">
              {t('common.simulatedData')}
            </span>
          </div>
        </div>

        <SafetyNotice />

        {isTranslationInProgress && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-950 dark:bg-[#231807] dark:text-amber-200"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
            <span>{t('common.translationNotice')}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Role Selection (3 Large Cards) */}
          <Card>
            <CardHeader>
              <CardTitle>{t('onboarding.roleSection')}</CardTitle>
              <CardDescription>{t('common.simulatedData')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {ROLE_CARDS.map((card) => {
                const Icon = card.icon;
                const active = selectedRole === card.id;
                return (
                  <motion.button
                    key={card.id}
                    type="button"
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.15 }}
                    aria-pressed={active}
                    data-testid={`role-card-${card.id}`}
                    onClick={() => {
                      setHasEdited(true);
                      setSelectedRole(card.id);
                    }}
                    className={cn(
                      'flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400',
                      active
                        ? card.accentClasses
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-[#0d162d] dark:hover:border-slate-700'
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', card.iconBg)}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      {active && <CheckCircle2 className="h-5 w-5 text-current" aria-hidden="true" />}
                    </div>
                    <div>
                      <div className="text-base font-bold">{t(card.titleKey)}</div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {t(card.descKey)}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </CardContent>
          </Card>

          {/* 2. Searchable Language List with SVG Flags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-cyan-500" aria-hidden="true" />
                <span>{t('onboarding.languageSection')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
                <Input
                  type="search"
                  aria-label={t('onboarding.languageSection')}
                  placeholder={t('onboarding.languageSearchPlaceholder')}
                  value={langQuery}
                  onChange={(e) => setLangQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                {filteredLanguages.map((langOpt) => {
                  const active = selectedLang === langOpt.code;
                  return (
                    <button
                      key={langOpt.code}
                      type="button"
                      aria-pressed={active}
                      data-testid={`lang-option-${langOpt.code}`}
                      onClick={() => handleLanguagePick(langOpt.code)}
                      className={cn(
                        'flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400',
                        active
                          ? 'border-cyan-500 bg-cyan-500/15 text-slate-950 dark:text-white'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60'
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-1">
                        {langOpt.flagCodes.map((fc) => (
                          <FlagIcon key={fc} code={fc} />
                        ))}
                      </div>
                      <div>
                        <div className="font-semibold">{langOpt.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {langOpt.nativeName}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 3. Profile Identity */}
          <Card>
            <CardHeader>
              <CardTitle>{t('onboarding.identitySection')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="onb-first-name">{t('onboarding.firstName')}</Label>
                <Input
                  id="onb-first-name"
                  value={firstName}
                  onChange={(e) => {
                    setHasEdited(true);
                    setFirstName(e.target.value);
                  }}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="onb-last-name">{t('onboarding.lastName')}</Label>
                <Input
                  id="onb-last-name"
                  value={lastName}
                  onChange={(e) => {
                    setHasEdited(true);
                    setLastName(e.target.value);
                  }}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="onb-age">{t('onboarding.age')}</Label>
                <Input
                  id="onb-age"
                  type="number"
                  min={18}
                  max={99}
                  value={ageInput}
                  onChange={(e) => {
                    setHasEdited(true);
                    setAgeInput(e.target.value);
                  }}
                  required
                />
                {!ageValid && (
                  <p role="alert" className="text-xs font-medium text-rose-500">
                    {t('onboarding.ageError')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 4 & 5. Astronaut-only Mode & Mission Countdown Setup */}
          {selectedRole === 'astronaut' ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{t('onboarding.modeSection')}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={selectedMode === 'space'}
                    data-testid="mode-card-space"
                    onClick={() => {
                      setHasEdited(true);
                      setSelectedMode('space');
                    }}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400',
                      selectedMode === 'space'
                        ? 'border-cyan-500 bg-cyan-500/15'
                        : 'border-slate-200 dark:border-slate-800'
                    )}
                  >
                    <Orbit className="mt-0.5 h-6 w-6 shrink-0 text-cyan-400" aria-hidden="true" />
                    <div>
                      <div className="font-bold">{t('onboarding.modeSpaceTitle')}</div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {t('onboarding.modeSpaceDesc')}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    aria-pressed={selectedMode === 'earth'}
                    data-testid="mode-card-earth"
                    onClick={() => {
                      setHasEdited(true);
                      setSelectedMode('earth');
                    }}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                      selectedMode === 'earth'
                        ? 'border-emerald-500 bg-emerald-500/15'
                        : 'border-slate-200 dark:border-slate-800'
                    )}
                  >
                    <Activity className="mt-0.5 h-6 w-6 shrink-0 text-emerald-400" aria-hidden="true" />
                    <div>
                      <div className="font-bold">{t('onboarding.modeEarthTitle')}</div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {t('onboarding.modeEarthDesc')}
                      </p>
                    </div>
                  </button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('onboarding.missionSection')}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="onb-mission-name">{t('onboarding.missionName')}</Label>
                    <Input
                      id="onb-mission-name"
                      value={missionName}
                      onChange={(e) => {
                        setHasEdited(true);
                        setMissionName(e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="onb-start-date">{t('onboarding.startDate')}</Label>
                    <Input
                      id="onb-start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setHasEdited(true);
                        setStartDate(e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="onb-planned-days">{t('onboarding.plannedDuration')}</Label>
                    <Input
                      id="onb-planned-days"
                      type="number"
                      min={1}
                      max={1200}
                      value={plannedDaysInput}
                      onChange={(e) => {
                        setHasEdited(true);
                        setPlannedDaysInput(e.target.value);
                      }}
                      required
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div
              role="note"
              className="rounded-xl border border-emerald-500/35 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-950 dark:bg-[#071f1b] dark:text-emerald-200"
            >
              {t('onboarding.fixedEarthNotice')}
            </div>
          )}

          {/* Submit */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {!isFormValid ? t('onboarding.validationHint') : t('common.simulatedData')}
            </span>
            <Button
              type="submit"
              size="lg"
              disabled={!isFormValid}
              data-testid="onboarding-continue-btn"
            >
              {t('onboarding.continueBtn')}
            </Button>
          </div>
        </form>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-300/60 pt-4 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
          <span>
            {t('common.footerImageCaption')} ({selectedBg.label})
          </span>
          <span>{t('common.brand')} · {t('common.simulatedData')}</span>
        </footer>
      </div>
    </div>
  );
};
