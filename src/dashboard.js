import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export function startDashboard(music, client) {
  const app = express();
  app.use(express.json({ limit: '32kb' }));
  app.get('/health', (_req, res) => res.json({ ok: true, name: 'AETHRA MUSIC' }));
  // Serve the dashboard login page and assets publicly; the API itself remains password-protected.
  app.use(express.static(path.join(__dirname, '../dashboard')));
  app.use('/api', (req, res, next) => {
    const token = process.env.DASHBOARD_PASSWORD;
    if (!token || req.get('authorization') !== `Bearer ${token}`) return res.status(401).json({ error: 'Unauthorized' });
    next();
  });
  const allowed = (guildId) => {
    const list = (process.env.DASHBOARD_GUILDS || '').split(',').map(x => x.trim()).filter(Boolean);
    return !list.length || list.includes(guildId);
  };
  app.get('/api/guilds', (_req, res) => res.json(client.guilds.cache.filter(g => allowed(g.id)).map(g => ({ id: g.id, name: g.name, icon: g.iconURL() }))));
  app.get('/api/:guildId/state', (req, res) => {
    if (!allowed(req.params.guildId)) return res.sendStatus(403);
    res.json(music.snapshot(req.params.guildId));
  });
  app.post('/api/:guildId/:action', async (req, res) => {
    const id = req.params.guildId;
    if (!allowed(id)) return res.sendStatus(403);
    try {
      if (req.params.action === 'pause') await music.pause(id, true);
      else if (req.params.action === 'resume') await music.pause(id, false);
      else if (req.params.action === 'skip') await music.skip(id);
      else if (req.params.action === 'stop') await music.stop(id);
      else if (req.params.action === 'play') {
        const guild = client.guilds.cache.get(id);
        const s = music.snapshot(id);
        const vc = guild?.channels.cache.get(s.voiceChannelId);
        if (!guild || !vc?.isVoiceBased()) return res.status(400).json({ error: 'Bot belum berada di voice channel. Jalankan /play dahulu.' });
        await music.add(guild, vc, null, String(req.body.query || ''));
      } else if (req.params.action === 'autoplay') {
        const { getState, saveState } = await import('./state.js');
        getState(id).autoplay = Boolean(req.body.enabled); saveState();
      } else if (req.params.action === '247') {
        const { getState, saveState } = await import('./state.js');
        getState(id).stay247 = Boolean(req.body.enabled); saveState();
      } else return res.sendStatus(404);
      res.json({ ok: true, state: music.snapshot(id) });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });
  const port = Number(process.env.DASHBOARD_PORT || process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => console.log(`Dashboard listening on ${port}`));
}
