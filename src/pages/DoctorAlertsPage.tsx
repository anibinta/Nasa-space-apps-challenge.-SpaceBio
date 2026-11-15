import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AlertOctagon,
  BellRing,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Lock,
  PhoneCall,
  ShieldCheck,
} from 'lucide-react';
import { useSpaceBio } from '../context/SpaceBioContext';
import { useTranslation } from '../i18n';
import { formatLocaleDateTime, formatLocaleNumber, interpolateTemplate } from '../i18n/format';
import { AlertCard } from '../components/shared/AlertCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { cn } from '../components/ui/cn';
import type { AlertSeverity, NotificationStatus } from '../types/health';

function severityToBadgeStatus(sev: AlertSeverity): 'alert' | 'watch' | 'nominal' {
  if (sev === 'critical') return 'alert';
  if (sev === 'warning') return 'watch';
  return 'nominal';
}

function notifStatusClass(status: NotificationStatus): string {
  switch (status) {
    case 'queued':
      return 'border-amber-500/45 bg-amber-500/15 text-amber-800 dark:text-amber-200';
    case 'escalated':
      return 'border-rose-500/50 bg-rose-500/15 text-rose-800 dark:text-rose-200';
    case 'acknowledged':
      return 'border-emerald-500/45 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200';
    case 'read':
      return 'border-cyan-500/45 bg-cyan-500/15 text-cyan-800 dark:text-cyan-200';
    default:
      return 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200';
  }
}

export const DoctorAlertsPage: React.FC = () => {
  const {
    role,
    linkStatus,
    alerts,
    assignedPatients,
    setSelectedPatientId,
    notifications,
    journal,
    markNotificationRead,
    acknowledgeNotification,
    acknowledgeAlert,
    setEmergencyDialogOpen,
  } = useSpaceBio();
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  const isDoctor = role === 'doctor';

  // Automatically record read receipt when the flight doctor views delivered notifications
  useEffect(() => {
    if (!isDoctor) return;
    for (const n of notifications) {
      if (n.recipient !== 'journal_only' && n.status === 'delivered') {
        markNotificationRead(n.id);
      }
    }
  }, [isDoctor, notifications, markNotificationRead]);

  const totalRosterAlerts = isDoctor
    ? assignedPatients.reduce((sum, p) => sum + p.alerts.length, 0)
    : alerts.length;

  const visibleNotifications = isDoctor
    ? notifications.filter((n) => n.recipient !== 'journal_only')
    : notifications.filter((n) => n.patientId === 'pat-01');

  const formatOptTime = (iso?: string) =>
    iso ? formatLocaleDateTime(iso, language) : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            {t('nav.alerts')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {isDoctor ? t('notifications.readOnlyNote') : t('notifications.astronautStatusTitle')} ·{' '}
            {t('common.simulatedData')}
          </p>
        </div>

        {isDoctor && (
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('doctor.readOnlyBadge')}</span>
          </div>
        )}
      </div>

      {/* Astronaut onboard red critical alert highlight + emergency procedure button */}
      {!isDoctor && (
        <section aria-labelledby="astronaut-onboard-alerts" className="space-y-3">
          <h2 id="astronaut-onboard-alerts" className="text-base font-semibold text-slate-950 dark:text-white">
            {t('doctor.activeAlerts')}
          </h2>

          {alerts.length === 0 ? (
            <Card data-testid="alerts-nominal-empty">
              <CardContent className="flex items-center gap-3 p-5 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{t('notifications.astronautNoAlerts')}</span>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((al) => {
                const isRedOnboard = al.severity === 'critical' && !al.acknowledged;
                return (
                  <div
                    key={al.id}
                    data-testid={`onboard-alert-${al.id}`}
                    className={cn(
                      'rounded-xl border p-4 space-y-3 transition-colors',
                      isRedOnboard
                        ? 'border-rose-500 bg-rose-500/15 text-rose-950 dark:border-rose-500/80 dark:bg-rose-950/40 dark:text-rose-100'
                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0b1424]'
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <AlertOctagon
                            className={cn(
                              'h-4 w-4 shrink-0',
                              isRedOnboard ? 'text-rose-600 dark:text-rose-400' : 'text-amber-500'
                            )}
                            aria-hidden="true"
                          />
                          <span className="font-semibold text-sm">{t(al.titleKey)}</span>
                          <StatusBadge status={severityToBadgeStatus(al.severity)} />
                        </div>
                        <p className="text-xs leading-relaxed opacity-90">{t(al.explanationKey)}</p>
                        <div className="text-[11px] font-mono-tabular opacity-80">
                          {al.thresholdKey
                            ? interpolateTemplate(t(al.thresholdKey), al.thresholdParams ?? {})
                            : al.thresholdRule}
                        </div>
                      </div>

                      {al.severity === 'critical' && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          data-testid="onboard-alert-emergency-btn"
                          onClick={() => setEmergencyDialogOpen(true)}
                        >
                          <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t('header.emergencyBtn')}</span>
                        </Button>
                      )}
                    </div>

                    {linkStatus === 'lost' && al.severity === 'critical' && (
                      <div className="text-xs font-medium text-rose-800 dark:text-rose-300">
                        {t('linkStatus.lostBanner')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Notifications Panel (Doctor routing & Astronaut delivery status) */}
      <Card data-testid="notifications-panel">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="h-4.5 w-4.5 text-cyan-400" aria-hidden="true" />
                <span>{t('notifications.panelTitle')}</span>
              </CardTitle>
              <CardDescription>
                {t('notifications.panelSubtitle')} · {t('common.simulatedData')}
              </CardDescription>
            </div>
            <span className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
              {formatLocaleNumber(visibleNotifications.length, language)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleNotifications.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/35 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t('notifications.astronautNoAlerts')}</span>
            </div>
          ) : (
            visibleNotifications.map((notif) => (
              <div
                key={notif.id}
                data-testid={`notification-card-${notif.id}`}
                className={cn(
                  'rounded-xl border p-4 space-y-3',
                  notif.severity === 'critical' && notif.status !== 'acknowledged'
                    ? 'border-rose-500/60 bg-rose-500/10 dark:bg-rose-950/25'
                    : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-[#070d17]/75'
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-800 dark:text-cyan-200">
                      {t('notifications.simulatedLabel')}
                    </span>
                    <StatusBadge status={severityToBadgeStatus(notif.severity)} />
                    <span
                      data-testid={`notification-status-${notif.id}`}
                      className={cn(
                        'rounded border px-2 py-0.5 text-[11px] font-semibold',
                        notifStatusClass(notif.status)
                      )}
                    >
                      {t(`notifications.statuses.${notif.status}`)}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{formatLocaleDateTime(notif.timestamp, language)}</span>
                  </span>
                </div>

                <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">
                      {t('notifications.patientLabel')}:{' '}
                    </span>
                    <strong className="text-slate-900 dark:text-white">
                      {notif.patientName} ({notif.callSign} · {notif.patientId})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">
                      {t('notifications.metricLabel')}:{' '}
                    </span>
                    <strong className="text-slate-900 dark:text-white">
                      {t(`indicators.${notif.metric}`)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">
                      {t('notifications.valueLabel')}:{' '}
                    </span>
                    <strong className="font-mono-tabular text-slate-900 dark:text-white" dir="ltr">
                      {notif.value}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">
                      {t('notifications.recipientLabel')}:{' '}
                    </span>
                    <strong className="text-slate-900 dark:text-white">
                      {t(`notifications.recipients.${notif.recipient}`)} ({notif.recipientName})
                    </strong>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div>
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      {t('notifications.thresholdLabel')}:{' '}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {notif.thresholdKey
                        ? interpolateTemplate(t(notif.thresholdKey), notif.thresholdParams ?? {})
                        : notif.threshold}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      {t('notifications.suggestedActionLabel')}:{' '}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {t(notif.suggestedActionKey)}
                    </span>
                  </div>
                  {notif.escalatedTo && (
                    <div
                      data-testid={`notification-escalated-${notif.id}`}
                      className="font-semibold text-rose-700 dark:text-rose-300"
                    >
                      {interpolateTemplate(t('notifications.backupNotifiedNote'), {
                        doctor: notif.escalatedTo,
                      })}
                    </div>
                  )}
                  {notif.groundCenterLogged && (
                    <div className="text-cyan-700 dark:text-cyan-300">
                      {t('notifications.groundCenterNote')}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-2.5 dark:border-slate-800/80">
                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    {t('notifications.disclaimerLine')}
                  </p>

                  {isDoctor && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        data-testid={`open-record-${notif.id}`}
                        onClick={() => {
                          setSelectedPatientId(notif.patientId);
                          navigate('/patient-file');
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t('notifications.openRecordLink')}</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant={notif.status === 'acknowledged' ? 'secondary' : 'default'}
                        disabled={notif.status === 'acknowledged'}
                        data-testid={`ack-notif-${notif.id}`}
                        onClick={() => acknowledgeNotification(notif.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {notif.status === 'acknowledged'
                            ? t('notifications.acknowledgedDone')
                            : t('notifications.acknowledgeBtn')}
                        </span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Doctor Assigned Patients Alerts */}
      {isDoctor && (
        <div className="space-y-4">
          {totalRosterAlerts === 0 ? (
            <Card data-testid="doctor-alerts-nominal-empty">
              <CardContent className="flex items-center gap-3 p-5 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{t('notifications.astronautNoAlerts')}</span>
              </CardContent>
            </Card>
          ) : (
            assignedPatients
              .filter((pat) => pat.alerts.length > 0)
              .map((pat) => (
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
                      <AlertCard key={al.id} alert={al} onAcknowledge={acknowledgeAlert} />
                    ))}
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      )}

      {/* Notification & Sync Journal Table */}
      <Card data-testid="notification-journal-card">
        <CardHeader>
          <CardTitle>{t('notifications.journalTitle')}</CardTitle>
          <CardDescription>
            {t('notifications.journalSubtitle')} · {t('common.simulatedData')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {journal.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('notifications.journalEmpty')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2 pe-3 font-medium text-start">
                      {t('notifications.journalHeaders.event')}
                    </th>
                    <th className="py-2 pe-3 font-medium text-start">
                      {t('notifications.journalHeaders.patient')}
                    </th>
                    <th className="py-2 pe-3 font-medium text-start">
                      {t('notifications.journalHeaders.recipient')}
                    </th>
                    <th className="py-2 pe-3 font-medium text-start">
                      {t('notifications.journalHeaders.status')}
                    </th>
                    <th className="py-2 pe-3 font-medium text-start">
                      {t('notifications.journalHeaders.sent')}
                    </th>
                    <th className="py-2 pe-3 font-medium text-start">
                      {t('notifications.journalHeaders.delivered')}
                    </th>
                    <th className="py-2 pe-3 font-medium text-start">
                      {t('notifications.journalHeaders.read')}
                    </th>
                    <th className="py-2 pe-3 font-medium text-start">
                      {t('notifications.journalHeaders.acknowledged')}
                    </th>
                    <th className="py-2 font-medium text-start">
                      {t('notifications.journalHeaders.escalated')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                  {journal.slice(0, 30).map((entry) => {
                    const resolvedParams = entry.eventParams?.indicator
                      ? {
                          ...entry.eventParams,
                          indicator: t(`indicators.${entry.eventParams.indicator}`),
                        }
                      : entry.eventParams;
                    return (
                      <tr key={entry.id}>
                        <td className="py-2.5 pe-3 font-medium text-slate-900 dark:text-slate-100">
                          {interpolateTemplate(t(entry.eventKey), resolvedParams ?? {})}
                        </td>
                        <td className="py-2.5 pe-3 text-slate-600 dark:text-slate-300">
                          {entry.patientName ?? '—'}
                        </td>
                        <td className="py-2.5 pe-3 text-slate-600 dark:text-slate-300">
                          {entry.recipient ?? '—'}
                          {entry.groundCenterLogged ? ` · ${t('notifications.recipients.ground_center')}` : ''}
                        </td>
                        <td className="py-2.5 pe-3">
                          <span
                            className={cn(
                              'inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold',
                              notifStatusClass(entry.status)
                            )}
                          >
                            {t(`notifications.statuses.${entry.status}`)}
                          </span>
                        </td>
                        <td className="py-2.5 pe-3 font-mono-tabular whitespace-nowrap">
                          {formatOptTime(entry.sentAt)}
                        </td>
                        <td className="py-2.5 pe-3 font-mono-tabular whitespace-nowrap">
                          {formatOptTime(entry.deliveredAt)}
                        </td>
                        <td className="py-2.5 pe-3 font-mono-tabular whitespace-nowrap">
                          {formatOptTime(entry.readAt)}
                        </td>
                        <td className="py-2.5 pe-3 font-mono-tabular whitespace-nowrap">
                          {formatOptTime(entry.acknowledgedAt)}
                        </td>
                        <td className="py-2.5 font-mono-tabular whitespace-nowrap text-rose-600 dark:text-rose-300">
                          {formatOptTime(entry.escalatedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
