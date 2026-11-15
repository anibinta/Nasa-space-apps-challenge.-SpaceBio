import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, Download, Repeat, Trash2 } from 'lucide-react';
import { useSpaceBio } from '../context/SpaceBioContext';
import { getLanguageOption, SUPPORTED_LANGUAGES } from '../data/languages';
import { useTranslation } from '../i18n';
import { formatLocaleDateTime } from '../i18n/format';
import type { Language, TextSize, ThemeMode } from '../types/health';
import { FlagIcon } from '../components/shared/FlagIcon';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Input, Label, Select } from '../components/ui/input';

const DEFAULT_REF_COND_EN = 'Healthy adult · Low-Earth orbit endurance cohort';

export const SettingsPage: React.FC = () => {
  const {
    isGuest,
    role,
    returnToOnboarding,
    language,
    setLanguage,
    theme,
    setTheme,
    textSize,
    setTextSize,
    effectiveMode,
    consents,
    toggleConsent,
    profile,
    updateProfile,
    exportAllLocalDataJson,
    resetAllLocalData,
  } = useSpaceBio();
  const { t, isTranslationInProgress } = useTranslation();

  const [fullName, setFullName] = useState(profile.fullName);
  const [age, setAge] = useState(String(profile.age));
  const [sex, setSex] = useState(profile.sex);
  const [refCond, setRefCond] = useState(
    profile.referenceCondition === DEFAULT_REF_COND_EN
      ? t('settings.referenceConditionDefault')
      : profile.referenceCondition
  );
  const [baseHr, setBaseHr] = useState(String(profile.baselines.heart_rate));
  const [baseSys, setBaseSys] = useState(String(profile.baselines.blood_pressure_sys));
  const [baseTemp, setBaseTemp] = useState(String(profile.baselines.body_temperature));
  const [baseSleep, setBaseSleep] = useState(String(profile.baselines.sleep));
  const [savedNotice, setSavedNotice] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setFullName(profile.fullName);
    setAge(String(profile.age));
    setSex(profile.sex);
    setRefCond(
      profile.referenceCondition === DEFAULT_REF_COND_EN
        ? t('settings.referenceConditionDefault')
        : profile.referenceCondition
    );
    setBaseHr(String(profile.baselines.heart_rate));
    setBaseSys(String(profile.baselines.blood_pressure_sys));
    setBaseTemp(String(profile.baselines.body_temperature));
    setBaseSleep(String(profile.baselines.sleep));
  }, [profile, t]);

  const activeLangMeta = getLanguageOption(language);

  const latestConsent = (type: 'telemetry' | 'contactless_av' | 'learning_network') => {
    const found = consents.find((c) => c.type === type);
    return found ? found.agreed : false;
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) return;
    const cleanFull = fullName.trim() || profile.fullName;
    const parts = cleanFull.split(/\s+/);
    const parsedAge = Number(age);
    const safeAge = Number.isInteger(parsedAge) && parsedAge >= 18 && parsedAge <= 99 ? parsedAge : profile.age;

    updateProfile({
      ...profile,
      fullName: cleanFull,
      firstName: parts[0] || profile.firstName,
      lastName: parts.slice(1).join(' ') || profile.lastName,
      age: safeAge,
      sex,
      referenceCondition:
        refCond.trim() === t('settings.referenceConditionDefault')
          ? DEFAULT_REF_COND_EN
          : refCond.trim() || DEFAULT_REF_COND_EN,
      baselines: {
        ...profile.baselines,
        heart_rate: Number(baseHr) || profile.baselines.heart_rate,
        blood_pressure_sys: Number(baseSys) || profile.baselines.blood_pressure_sys,
        body_temperature: Number(baseTemp) || profile.baselines.body_temperature,
        sleep: Number(baseSleep) || profile.baselines.sleep,
      },
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleExportJson = () => {
    const json = exportAllLocalDataJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spacebio-gdpr-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          {t('settings.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t('settings.subtitle')} · {t('common.simulatedData')}
        </p>
      </div>

      {savedNotice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-800 dark:text-emerald-300"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t('settings.savedBanner')}</span>
        </div>
      )}

      {/* Role switcher (returns to onboarding page) */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.demoRoleSwitchLabel')}</CardTitle>
          <CardDescription>{t('settings.demoRoleSwitchHint')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">{t('common.roleLabel')}:</span>
            <strong className="text-slate-950 dark:text-white">
              {role === 'astronaut'
                ? t('common.roleAstronaut')
                : role === 'doctor'
                  ? t('common.roleDoctor')
                  : t('common.roleAdmin')}
            </strong>
          </div>
          <Button type="button" variant="outline" onClick={returnToOnboarding}>
            <Repeat className="h-4 w-4" aria-hidden="true" />
            <span>{t('header.switchRole')}</span>
          </Button>
        </CardContent>
      </Card>

      {/* Interface & Environment */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.appearanceTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="settings-language" className="flex items-center gap-2">
                <span>{t('settings.languageLabel')}</span>
                <FlagIcon code={activeLangMeta.flagCodes[0]} />
              </Label>
              <Select
                id="settings-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code.toUpperCase()} — {l.nativeName}
                  </option>
                ))}
              </Select>
              {isTranslationInProgress && (
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-300">
                  {t('common.translationNotice')}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-theme">{t('settings.themeLabel')}</Label>
              <Select
                id="settings-theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value as ThemeMode)}
              >
                <option value="dark">{t('settings.themeDark')}</option>
                <option value="light">{t('settings.themeLight')}</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-text-size">{t('settings.textSizeLabel')}</Label>
              <Select
                id="settings-text-size"
                value={textSize}
                onChange={(e) => setTextSize(e.target.value as TextSize)}
              >
                <option value="sm">{t('settings.textSizeSm')}</option>
                <option value="md">{t('settings.textSizeMd')}</option>
                <option value="lg">{t('settings.textSizeLg')}</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-op-mode">{t('settings.modeLabel')}</Label>
              <Select
                id="settings-op-mode"
                value={effectiveMode}
                disabled
                aria-readonly="true"
              >
                <option value="space">{t('common.spaceMode')}</option>
                <option value="earth">{t('common.earthMode')}</option>
              </Select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('settings.modeReadOnlyHint')}{' '}
                {role === 'astronaut' && (
                  <Link
                    to="/mission"
                    className="font-semibold text-cyan-600 underline hover:text-cyan-500 dark:text-cyan-400"
                  >
                    {t('settings.goToMission')}
                  </Link>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile & Personal Baselines */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.profileTitle')}</CardTitle>
          <CardDescription>{t('common.simulatedData')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="prof-name">{t('settings.fullName')}</Label>
                <Input
                  id="prof-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prof-age">{t('settings.age')}</Label>
                <Input
                  id="prof-age"
                  type="number"
                  min={18}
                  max={99}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prof-sex">{t('settings.sex')}</Label>
                <Select
                  id="prof-sex"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as typeof sex)}
                >
                  <option value="Female">{t('settings.sexOptions.female')}</option>
                  <option value="Male">{t('settings.sexOptions.male')}</option>
                  <option value="Other / Prefer not to say">{t('settings.sexOptions.other')}</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prof-cond">{t('settings.referenceCondition')}</Label>
                <Input
                  id="prof-cond"
                  value={refCond}
                  onChange={(e) => setRefCond(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="base-hr">{t('settings.baselineHr')}</Label>
                <Input
                  id="base-hr"
                  type="number"
                  value={baseHr}
                  onChange={(e) => setBaseHr(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="base-sys">{t('settings.baselineSys')}</Label>
                <Input
                  id="base-sys"
                  type="number"
                  value={baseSys}
                  onChange={(e) => setBaseSys(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="base-temp">{t('settings.baselineTemp')}</Label>
                <Input
                  id="base-temp"
                  type="number"
                  step="0.1"
                  value={baseTemp}
                  onChange={(e) => setBaseTemp(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="base-sleep">{t('settings.baselineSleep')}</Label>
                <Input
                  id="base-sleep"
                  type="number"
                  step="0.1"
                  value={baseSleep}
                  onChange={(e) => setBaseSleep(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" disabled={isGuest}>{t('settings.saveProfileBtn')}</Button>
          </form>
        </CardContent>
      </Card>

      {/* Consent & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.consentTitle')}</CardTitle>
          <CardDescription>{t('common.simulatedData')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent-telemetry"
                disabled={isGuest}
                checked={latestConsent('telemetry')}
                onCheckedChange={(val) => toggleConsent('telemetry', Boolean(val))}
              />
              <Label htmlFor="consent-telemetry" className="leading-snug cursor-pointer">
                {t('settings.consentTelemetry')}
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="consent-contactless"
                disabled={isGuest}
                checked={latestConsent('contactless_av')}
                onCheckedChange={(val) => toggleConsent('contactless_av', Boolean(val))}
              />
              <Label htmlFor="consent-contactless" className="leading-snug cursor-pointer">
                {t('settings.consentContactless')}
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="consent-learning"
                disabled={isGuest}
                checked={latestConsent('learning_network')}
                onCheckedChange={(val) => toggleConsent('learning_network', Boolean(val))}
              />
              <Label htmlFor="consent-learning" className="leading-snug cursor-pointer">
                {t('settings.consentLearning')}
              </Label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('settings.consentHistoryTitle')}
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs font-mono-tabular text-slate-600 dark:text-slate-300">
              {consents.slice(0, 6).map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {t(`settings.consentTypes.${c.type}`)} (<span dir="ltr">{c.version}</span>) —{' '}
                    {c.agreed ? t('settings.consentStatus.granted') : t('settings.consentStatus.withdrawn')}
                  </span>
                  <span className="text-slate-500">{formatLocaleDateTime(c.updatedAt, language)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={handleExportJson}>
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>{t('settings.exportDataBtn')}</span>
            </Button>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={isGuest}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span>{t('settings.deleteDataBtn')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('settings.deleteConfirmTitle')}</DialogTitle>
                  <DialogDescription>{t('settings.deleteConfirmBody')}</DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      resetAllLocalData();
                      setDeleteDialogOpen(false);
                    }}
                  >
                    {t('common.reset')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

