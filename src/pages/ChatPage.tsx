import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertOctagon,
  BarChart2,
  Camera,
  Mic,
  PhoneCall,
  Send,
  Clock,
  CheckCheck,
} from 'lucide-react';
import { useSpaceBio } from '../context/SpaceBioContext';
import { useTranslation } from '../i18n';
import type { ChatAttachment } from '../types/health';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';

export const ChatPage: React.FC = () => {
  const {
    isGuest,
    chatThreads,
    chatMessages,
    sendChatMessage,
    doctorSlots,
    requestDoctorCall,
  } = useSpaceBio();
  const { t, dict } = useTranslation();

  const [activeThreadId, setActiveThreadId] = useState(chatThreads[0].id);
  const [draft, setDraft] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | undefined>(undefined);

  const activeThread = chatThreads.find((th) => th.id === activeThreadId) ?? chatThreads[0];
  const threadMessages = chatMessages.filter((m) => m.threadId === activeThread.id);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) return;
    if (!draft.trim() && !pendingAttachment) return;
    sendChatMessage(activeThread.id, draft, pendingAttachment);
    setDraft('');
    setPendingAttachment(undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      {/* Fixed Emergency Procedure Banner */}
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/45 bg-rose-500/10 px-4 py-3 text-sm text-rose-950 dark:text-rose-200"
      >
        <div className="flex items-center gap-2.5">
          <AlertOctagon className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          <span className="font-medium">{t('chat.emergencyBanner')}</span>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="destructive" size="sm">
              {t('chat.emergencyLink')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('chat.emergencyModalTitle')}</DialogTitle>
              <DialogDescription>{t('common.safetyNotice')}</DialogDescription>
            </DialogHeader>
            <ol className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {dict.chat.emergencySteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          {t('chat.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t('chat.subtitle')} · {t('common.simulatedData')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Threads + Doctor Slots Column */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('chat.threadsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {chatThreads.map((th) => {
                const active = th.id === activeThread.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setActiveThreadId(th.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                      active
                        ? 'border-cyan-500 bg-cyan-500/15'
                        : 'border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-950 dark:text-white">
                        {th.doctorName}
                      </span>
                      <span className="font-mono-tabular text-[11px] text-cyan-700 dark:text-cyan-300">
                        {th.signalDelayLabel}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {th.doctorSpecialty}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Doctor Availability Slots */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('chat.slotsTitle')}</CardTitle>
              <CardDescription>{t('common.simulatedData')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {doctorSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-800"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {slot.dateLabel} · {slot.timeUtc}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">{slot.doctorName}</div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={slot.requested ? 'secondary' : 'outline'}
                    disabled={slot.requested || isGuest}
                    onClick={() => requestDoctorCall(slot.id)}
                  >
                    <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{slot.requested ? t('chat.callRequested') : t('chat.requestCall')}</span>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Message Conversation Pane */}
        <Card className="lg:col-span-8 flex flex-col">
          <CardHeader className="border-b border-slate-200/80 dark:border-slate-800/80">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>{activeThread.doctorName}</CardTitle>
                <CardDescription>
                  {activeThread.station} · {activeThread.signalDelayLabel}
                </CardDescription>
              </div>
              <span className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                {t('common.simulatedData')}
              </span>
            </div>
          </CardHeader>

          <CardContent className="flex-1 space-y-4 p-5 max-h-[460px] overflow-y-auto">
            {threadMessages.map((msg) => {
              const isSelf = msg.senderRole === 'astronaut';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl border p-3.5 text-sm ${
                      isSelf
                        ? 'border-cyan-500/40 bg-cyan-50 text-slate-900 dark:bg-[#092038] dark:text-slate-100'
                        : 'border-slate-200 bg-slate-100 text-slate-900 dark:border-slate-800 dark:bg-[#0f1933] dark:text-slate-100'
                    }`}
                  >
                    <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {msg.senderName}
                    </div>
                    <p className="leading-relaxed">{msg.body}</p>

                    {msg.attachment && (
                      <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-[#081023]">
                        {msg.attachment.type === 'photo' && <Camera className="h-3.5 w-3.5 text-cyan-500" />}
                        {msg.attachment.type === 'voice' && <Mic className="h-3.5 w-3.5 text-amber-500" />}
                        {msg.attachment.type === 'chart' && <BarChart2 className="h-3.5 w-3.5 text-cyan-500" />}
                        <div>
                          <div className="font-medium">{msg.attachment.label}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {msg.attachment.meta}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                    <span>
                      {t('chat.sentLabel')}: {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <CheckCheck className="h-3 w-3" aria-hidden="true" />
                      {msg.readAt
                        ? `${t('chat.readLabel')}: ${new Date(msg.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : t('chat.unreadLabel')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {t('chat.estDelayLabel')}: ~{msg.estimatedResponseMinutes}m
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>

          <form
            onSubmit={handleSend}
            className="border-t border-slate-200/80 p-4 space-y-3 dark:border-slate-800/80"
          >
            {pendingAttachment && (
              <div className="flex items-center justify-between rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 py-1.5 text-xs">
                <span>
                  {pendingAttachment.label} ({pendingAttachment.meta})
                </span>
                <button
                  type="button"
                  onClick={() => setPendingAttachment(undefined)}
                  className="font-medium text-rose-600 dark:text-rose-400"
                >
                  {t('common.cancel')}
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setPendingAttachment({
                    type: 'photo',
                    label: 'Cabin Skin / Eye Check Photo',
                    meta: 'Compressed 180 KB · Simulated',
                  })
                }
              >
                <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('chat.attachPhoto')}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setPendingAttachment({
                    type: 'voice',
                    label: 'Crew Voice Summary (0:24)',
                    meta: 'Opus 24 KB · Simulated',
                  })
                }
              >
                <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('chat.attachVoice')}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setPendingAttachment({
                    type: 'chart',
                    label: '7-day Biometric Trend Export',
                    meta: 'JSON/SVG · Simulated',
                  })
                }
              >
                <BarChart2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('chat.attachChart')}</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={draft}
                disabled={isGuest}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={isGuest ? t('welcome.guestReadOnlyError') : t('chat.messagePlaceholder')}
                aria-label={t('chat.messagePlaceholder')}
              />
              <Button type="submit" disabled={isGuest}>
                <Send className="h-4 w-4" aria-hidden="true" />
                <span>{t('chat.sendBtn')}</span>
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </motion.div>
  );
};
