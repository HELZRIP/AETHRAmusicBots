import { getState, saveState } from './state.js';

export function setupMusic(client) {
  const players = new Map();
  const queues = new Map();

  function node() {
    const n = client.shoukaku.options.nodeResolver(client.shoukaku.nodes);
    if (!n) throw new Error('Lavalink node belum tersambung.');
    return n;
  }

  async function resolve(query) {
    const input = /^https?:\/\//i.test(query) ? query :
      (/soundcloud/i.test(query) ? `scsearch:${query.replace(/soundcloud/i, '').trim()}` : `ytsearch:${query}`);
    const result = await node().rest.resolve(input);
    if (!result || !result.data) return [];
    if (result.loadType === 'track' || result.loadType === 'search') {
      const tracks = Array.isArray(result.data) ? result.data : [result.data];
      return tracks.map(t => t.track ? t : { encoded: t.encoded, info: t.info }).filter(t => t.encoded);
    }
    if (result.loadType === 'playlist') return (result.data.tracks || []).filter(t => t.encoded);
    return [];
  }

  async function startNext(guildId) {
    const state = getState(guildId);
    const player = players.get(guildId);
    if (!player) return;
    let next = state.queue.shift();

    if (!next && state.autoplay && state.current) {
      try {
        const q = `ytsearch:${state.current.info.author} ${state.current.info.title} similar songs`;
        const res = await node().rest.resolve(q);
        const candidates = (res?.data || []).filter(t => t.encoded && t.info.identifier !== state.current.info.identifier);
        if (candidates.length) next = candidates[Math.floor(Math.random() * candidates.length)];
      } catch (e) { console.warn('Autoplay:', e.message); }
    }

    if (!next) {
      state.current = null;
      saveState();
      if (!state.stay247) {
        setTimeout(() => {
          const s = getState(guildId);
          if (!s.queue.length && !s.current && !s.stay247) {
            client.shoukaku.leaveVoiceChannel(guildId).catch(() => {});
            players.delete(guildId);
          }
        }, 30000).unref();
      }
      return;
    }
    state.current = next;
    saveState();
    await player.playTrack({ track: { encoded: next.encoded } });
  }

  async function ensurePlayer(guild, voiceChannel, textChannelId) {
    let player = players.get(guild.id);
    if (!player) {
      player = await client.shoukaku.joinVoiceChannel({
        guildId: guild.id, channelId: voiceChannel.id, shardId: guild.shardId,
        deaf: true, mute: false
      });
      players.set(guild.id, player);
      player.on('end', async (event) => {
        if (event.reason === 'REPLACED' || event.reason === 'CLEANUP') return;
        try { await startNext(guild.id); } catch (e) { console.error('Next track:', e); }
      });
      player.on('exception', async (event) => {
        console.error('Track exception:', event);
        try { await startNext(guild.id); } catch {}
      });
      player.on('stuck', async () => {
        try { await player.stopTrack(); } catch {}
      });
      player.on('closed', (event) => console.warn('Voice websocket closed:', event));
    }
    const s = getState(guild.id);
    s.voiceChannelId = voiceChannel.id;
    s.textChannelId = textChannelId;
    saveState();
    return player;
  }

  async function add(guild, voiceChannel, textChannelId, query) {
    const s = getState(guild.id);
    const tracks = await resolve(query);
    if (!tracks.length) throw new Error('Lagu tidak ditemukan atau sumber sedang tidak tersedia.');
    const max = Number(process.env.QUEUE_MAX || 0);
    if (max > 0 && s.queue.length + tracks.length > max) throw new Error(`Batas antrean saat ini ${max} lagu.`);
    const player = await ensurePlayer(guild, voiceChannel, textChannelId);
    const wasIdle = !s.current;
    if (wasIdle) {
      s.current = tracks.shift();
      await player.playTrack({ track: { encoded: s.current.encoded } });
    }
    s.queue.push(...tracks);
    saveState();
    return { first: s.current, added: tracks.length + (wasIdle ? 1 : 0), queued: s.queue.length };
  }

  async function skip(guildId) {
    const player = players.get(guildId);
    if (!player) throw new Error('Tidak ada pemutar aktif.');
    await player.stopTrack();
  }
  async function stop(guildId) {
    const p = players.get(guildId);
    const s = getState(guildId);
    s.queue = []; s.current = null; saveState();
    if (p) await p.stopTrack();
  }
  async function pause(guildId, paused) {
    const p = players.get(guildId);
    if (!p) throw new Error('Tidak ada pemutar aktif.');
    await p.setPaused(paused);
  }
  async function setVolume(guildId, volume) {
    const p = players.get(guildId);
    if (!p) throw new Error('Tidak ada pemutar aktif.');
    const v = Math.max(0, Math.min(100, Number(volume)));
    await p.setGlobalVolume(v);
    getState(guildId).volume = v; saveState();
    return v;
  }
  function snapshot(guildId) {
    const s = getState(guildId);
    return { current: s.current?.info ?? null, queue: s.queue.slice(0, 100).map(t => t.info), queueLength: s.queue.length,
      autoplay: s.autoplay, stay247: s.stay247, volume: s.volume, voiceChannelId: s.voiceChannelId };
  }

  // Keep persistent 24/7 players alive and attempt a reconnect after a bot restart.
  async function restore247() {
    // Persisted voice channel IDs are rejoined once Discord guild cache is ready.
    const { allStates } = await import('./state.js');
    for (const [guildId, s] of Object.entries(allStates())) {
      if (!s.stay247 || !s.voiceChannelId) continue;
      const guild = client.guilds.cache.get(guildId);
      const vc = guild?.channels.cache.get(s.voiceChannelId);
      if (guild && vc?.isVoiceBased()) {
        try {
          const p = await ensurePlayer(guild, vc, s.textChannelId);
          if (s.current?.encoded) await p.playTrack({ track: { encoded: s.current.encoded } });
          await p.setGlobalVolume(s.volume || 70);
        } catch (e) { console.warn(`24/7 restore ${guildId}:`, e.message); }
      }
    }
  }

  return { add, skip, stop, pause, setVolume, snapshot, getPlayer: id => players.get(id), getNode: node, restore247 };
}
