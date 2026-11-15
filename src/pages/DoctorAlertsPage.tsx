import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useSpaceBio } from '../context/SpaceBioContext';
import { useTranslation } from '../i18n';
import { formatLocaleNumber } from '../i18n/format';
import { AlertCard } from '../components/shared/AlertCard';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export const DoctorAlertsPage: React.FC = () => {
  const { assignedPatients, setSelectedPatientId } = useSpaceBio();
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          {t('nav.alerts')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t('doctor.patientsSubtitle')} · {t('common.simulatedData')}
        </p>
      </div>

      <div className="space-y-4">
        {assignedPatients.map((pat) => (
          <Card key={pat.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>{pat.fullName}</CardTitle>
                <CardDescription>
                  {pat.callSign} ·{' '}
                  {pat.missionNameKey ? t(pat.missionNameKey) : pat.missionName} ·{' '}
                  {t('common.day')} {formatLocaleNumber(pat.missionDay, language)} ·{' '}
                  {pat.mode === 'space' ? t('common.spaceMode') : t('common.earthMode')}
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedPatientId(pat.id);
                  navigate('/patient-file');
                }}
              >
                {t('doctor.viewFile')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {pat.alerts.map((al) => (
                <AlertCard key={al.id} alert={al} onAcknowledge={() => undefined} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
};

