import React from 'react';
import { CheckCircle2, MessageSquareWarning, Radio, ShieldAlert, Wifi } from 'lucide-react';
import { useSpaceBio } from '../../context/SpaceBioContext';
import { useTranslation } from '../../i18n';
import { cn } from '../ui/cn';

export const CommunicationProcedureCard: React.FC = () => {
  const { linkStatus } = useSpaceBio();
  const { t } = useTranslation();

  const channels = [
    {
      id: 'ch1',
      title: t('emergencyProcedure.channel1Title'),
      desc: t('emergencyProcedure.channel1Desc'),
      icon: Wifi,
      highlighted: linkStatus === 'active',
      badge: null as string | null,
    },
    {
      id: 'ch2',
      title: t('emergencyProcedure.channel2Title'),
      desc: t('emergencyProcedure.channel2Desc'),
      icon: MessageSquareWarning,
      highlighted: linkStatus === 'degraded',
      badge: null as string | null,
    },
    {
      id: 'ch3',
      title: t('emergencyProcedure.channel3Title'),
      desc: t('emergencyProcedure.channel3Desc'),
      icon: Radio,
      highlighted: false,
      badge: t('emergencyProcedure.voiceNotice'),
    },
    {
      id: 'ch4',
      title: t('emergencyProcedure.channel4Title'),
      desc: t('emergencyProcedure.channel4Desc'),
      icon: ShieldAlert,
      highlighted: linkStatus === 'lost',
      badge: t('emergencyProcedure.noNetworkBadge'),
    },
  ];

  return (
    <section
      data-testid="communication-procedure-card"
      className="mt-4 rounded-xl border border-slate-200 bg-slate-50/90 p-3.5 dark:border-cyan-400/25 dark:bg-[#070d17]/90 space-y-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-cyan-200">
            {t('emergencyProcedure.cardTitle')}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t('emergencyProcedure.cardSubtitle')}
          </p>
        </div>
        <span className="text-[10px] font-mono-tabular text-slate-500 dark:text-slate-400">
          {t('common.simulatedData')}
        </span>
      </div>

      <ol className="space-y-2">
        {channels.map((ch) => {
          const Icon = ch.icon;
          return (
            <li
              key={ch.id}
              data-testid={`comm-channel-${ch.id}`}
              className={cn(
                'rounded-lg border p-2.5 text-xs transition-colors',
                ch.highlighted
                  ? ch.id === 'ch4'
                    ? 'border-rose-500/60 bg-rose-500/10 dark:border-rose-400/60'
                    : 'border-cyan-500/50 bg-cyan-500/10'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0b1424]'
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <Icon
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      ch.id === 'ch4'
                        ? 'text-rose-500 dark:text-rose-400'
                        : 'text-cyan-600 dark:text-cyan-400'
                    )}
                    aria-hidden="true"
                  />
                  <span>{ch.title}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {ch.highlighted && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                  )}
                  {ch.badge && (
                    <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {ch.badge}
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                {ch.desc}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
