import React from 'react';
import { motion } from 'motion/react';
import { Database, Lock, Server, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export const BackendPlanPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          {t('backendPlan.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t('backendPlan.subtitle')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-cyan-500" aria-hidden="true" />
              <span>Authentication & Three-Role RBAC</span>
            </CardTitle>
            <CardDescription>Email + password via Supabase Auth with JWT role claims</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <p>
              <strong>1. Astronaut (astronaut)</strong>: Signs in with email/password. Reads and writes only their own missions, measurements, bone markers, alerts, consents, and assigned doctor conversations.
            </p>
            <p>
              <strong>2. Flight / Ground Doctor (doctor)</strong>: Linked via an explicit <code className="font-mono-tabular text-xs">doctor_assignments</code> join table. Can view telemetry, acknowledge/validate alert thresholds, and message only assigned astronauts.
            </p>
            <p>
              <strong>3. Network Administrator (admin)</strong>: Restricted by RLS from raw individual PII/measurements; queries only anonymized, k-aggregated materialized views for the Learning Network.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <span>Row-Level Security (RLS) & Audit Isolation</span>
            </CardTitle>
            <CardDescription>Zero cross-crew leakage enforced at Postgres level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs font-mono-tabular text-slate-700 dark:text-slate-300">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#081023]">
              CREATE POLICY astronaut_own_data ON measurements<br />
              FOR ALL USING (auth.uid() = astronaut_id);
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#081023]">
              CREATE POLICY doctor_assigned_patients ON measurements<br />
              FOR SELECT USING (EXISTS (SELECT 1 FROM doctor_assignments da WHERE da.doctor_id = auth.uid() AND da.astronaut_id = measurements.astronaut_id));
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-cyan-500" aria-hidden="true" />
              <span>Core Postgres Schema</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-xs font-mono-tabular text-slate-700 dark:text-slate-300 sm:grid-cols-2">
              <li className="rounded border border-slate-200 p-2 dark:border-slate-800">profiles (id, role, language, mode, consent)</li>
              <li className="rounded border border-slate-200 p-2 dark:border-slate-800">missions (name, mode, departure_date, planned_days, actual_days, status)</li>
              <li className="rounded border border-slate-200 p-2 dark:border-slate-800">measurements (type, value, unit, timestamp, confidence, source, indicative)</li>
              <li className="rounded border border-slate-200 p-2 dark:border-slate-800">bone_markers &amp; bone_risk_estimates (interval, method)</li>
              <li className="rounded border border-slate-200 p-2 dark:border-slate-800">alerts (severity, indicator, threshold_rule, source, action, status)</li>
              <li className="rounded border border-slate-200 p-2 dark:border-slate-800">conversations, messages &amp; message_queue</li>
              <li className="rounded border border-slate-200 p-2 dark:border-slate-800">reports (period, content_json, generated_at)</li>
              <li className="rounded border border-slate-200 p-2 dark:border-slate-800">consents &amp; access_audit_log (encrypted at rest)</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="h-4 w-4 text-cyan-500" aria-hidden="true" />
              <span>Server-Side Edge Functions &amp; Queues</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p>• Scheduled cron/trigger generating Daily, Weekly, and Monthly reports from validated telemetry.</p>
            <p>• Configurable alert evaluator attaching source telemetry and threshold rules marked &ldquo;to be validated by an expert&rdquo;.</p>
            <p>• Trigger on <code className="font-mono-tabular text-xs">missions.actual_duration_days</code> update to compute End-of-Mission synthesis.</p>
            <p>• Asynchronous message queue modeling orbital signal latency + GDPR JSON export endpoint + immutable access log.</p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};
