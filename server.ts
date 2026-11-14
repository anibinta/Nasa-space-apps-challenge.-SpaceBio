import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  acknowledgeAlertForUser,
  bootstrapWorkspace,
  completeOnboardingForUser,
  createMeasurementForUser,
  deleteUserDataForUser,
  exportUserDataForUser,
  getAggregatedNetworkSummary,
  getDoctorAssignedPatients,
  recordConsentForUser,
  recordReturnDurationForUser,
  requestDoctorSlotForUser,
  revisePlannedDurationForUser,
  sendChatMessageForUser,
  updateMissionDepartureForUser,
  updatePreferencesForUser,
  updateProfileForUser,
} from './src/db/repository.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '1mb' }));

// Lightweight health check (no eager DB startup probes)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/workspace/bootstrap', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const email = req.user!.email || 'crew@spacebio.local';
    const displayName = req.user!.name as string | undefined;
    const data = await bootstrapWorkspace(uid, email, displayName);
    res.json(data);
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    res.status(err.statusCode || 500).json({ error: err.message || 'Bootstrap failed' });
  }
});

app.post('/api/onboarding', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await completeOnboardingForUser(req.user!.uid, req.body);
    res.json(result);
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    res.status(err.statusCode || 500).json({ error: err.message || 'Onboarding update failed' });
  }
});

app.post('/api/measurements', requireAuth, async (req: AuthRequest, res) => {
  try {
    const record = await createMeasurementForUser(req.user!.uid, req.body);
    res.status(201).json(record);
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to save measurement' });
  }
});

app.patch('/api/alerts/:id/acknowledge', requireAuth, async (req: AuthRequest, res) => {
  try {
    const alertId = Number(req.params.id);
    if (!Number.isInteger(alertId)) {
      return res.status(400).json({ error: 'Invalid alert identifier' });
    }
    const updated = await acknowledgeAlertForUser(req.user!.uid, alertId);
    res.json(updated);
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to acknowledge alert' });
  }
});

app.put('/api/mission/departure', requireAuth, async (req: AuthRequest, res) => {
  try {
    const updated = await updateMissionDepartureForUser(req.user!.uid, req.body);
    res.json(updated);
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to update mission' });
  }
});

app.post('/api/mission/revise-duration', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { newDays, reason, changedBy } = req.body as {
      newDays: number;
      reason: string;
      changedBy?: string;
    };
    const change = await revisePlannedDurationForUser(
      req.user!.uid,
      newDays,
      reason || '',
      changedBy || 'Crew / Operations'
    );
    res.json({ change });
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to revise duration' });
  }
});

app.put('/api/mission/return-duration', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { actualDays } = req.body as { actualDays: number | null };
    const updated = await recordReturnDurationForUser(req.user!.uid, actualDays);
    res.json(updated);
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to record return duration' });
  }
});

app.post('/api/chat/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const msg = await sendChatMessageForUser(req.user!.uid, req.body);
    res.status(201).json(msg);
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to send message' });
  }
});

app.post('/api/doctor-slots/:id/request', requireAuth, async (req: AuthRequest, res) => {
  try {
    const slotId = Number(req.params.id);
    if (!Number.isInteger(slotId)) {
      return res.status(400).json({ error: 'Invalid slot identifier' });
    }
    const updated = await requestDoctorSlotForUser(req.user!.uid, slotId);
    res.json(updated);
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to request slot' });
  }
});

app.post('/api/consents', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { type, agreed } = req.body as {
      type: 'telemetry' | 'contactless_av' | 'learning_network';
      agreed: boolean;
    };
    const record = await recordConsentForUser(req.user!.uid, type, Boolean(agreed));
    res.status(201).json(record);
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to record consent' });
  }
});

app.put('/api/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const updated = await updateProfileForUser(req.user!.uid, req.body);
    res.json(updated);
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to update profile' });
  }
});

app.put('/api/preferences', requireAuth, async (req: AuthRequest, res) => {
  try {
    const updated = await updatePreferencesForUser(req.user!.uid, req.body);
    res.json(updated);
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to save preferences' });
  }
});

app.get('/api/export', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = await exportUserDataForUser(req.user!.uid);
    res.json(data);
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to export data' });
  }
});

app.delete('/api/me/data', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await deleteUserDataForUser(req.user!.uid);
    res.json(result);
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to reset user data' });
  }
});

app.get('/api/doctor/patients', requireAuth, async (req: AuthRequest, res) => {
  try {
    const roster = await getDoctorAssignedPatients(req.user!.uid);
    res.json(roster);
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to load assigned patients' });
  }
});

app.get('/api/learning-network/summary', requireAuth, async (req: AuthRequest, res) => {
  try {
    const summary = await getAggregatedNetworkSummary(req.user!.uid);
    res.json(summary);
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to load network metrics' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SpaceBio server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
