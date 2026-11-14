import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useSpaceBio } from '../../context/SpaceBioContext';
import { useTranslation } from '../../i18n';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

export const AccessDeniedScreen: React.FC = () => {
  const { role } = useSpaceBio();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const homePath =
    role === 'doctor' ? '/patients' : role === 'admin' ? '/network-overview' : '/';

  return (
    <Card data-testid="access-denied-screen" className="border-rose-500/40">
      <CardContent className="flex flex-col items-start gap-4 p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-950 dark:text-white">
            {t('accessDenied.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t('accessDenied.body')}
          </p>
        </div>
        <Button type="button" onClick={() => navigate(homePath)}>
          {t('accessDenied.returnBtn')}
        </Button>
      </CardContent>
    </Card>
  );
};
