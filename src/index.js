import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { Shoukaku, Connectors } from 'shoukaku';
import { commands } from './commands.js';
import { getState, saveState } from './state.js';
import { setupMusic } from './music.js';
import { startDashboard } from './dashboard.js';

for (const key of ['DISCORD_TOKEN','CLIENT_ID','LAVALINK_PASSWORD']) {
  if (!process.env[key]) throw new Error(`Environment variable ${key} belum diisi.`);
}
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
client.shoukaku = new Shoukaku(new Connectors.DiscordJS(client), [{
  name: 'AETHRA-NODE',
  url: `${process.env.LAVALINK_HOST || '127.0.0.1'}:${process.env.LAVALINK_PORT || '2333'}`,
  auth: process.env.LAVALINK_PASSWORD,
  secure: process.env.LAVALINK_SECURE === 'true'
}], { resume: true, resumeTimeout: 60, reconnectTries: 10, reconnectInterval: 5 });

client.shoukaku.on('error', (name, error) => console.error(`[Lavalink:${name}]`, error));
client.shoukaku.on('ready', (name) => console.log(`Lavalink node ${name} ready`));
const music = setupMusic(client);

// Start HTTP health check/dashboard before connecting to Discord.
startDashboard(music, client);

client.once('ready', async () => {
  console.log(`AETHRA MUSIC online as ${client.user.tag}`);
  await music.restore247();
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const guild = interaction.guild;
  if (!guild) return interaction.reply({ content: 'Gunakan perintah ini di server.', ephemeral: true });
  const state = getState(guild.id);
  const voice = interaction.member.voice?.channel;
  const reply = async (content, ephemeral = true) => interaction.reply({ content, ephemeral });
  try {
    switch (interaction.commandName) {
      case 'play': {
        if (!voice) return reply('Masuk ke voice channel terlebih dahulu.');
        await interaction.deferReply();
        const result = await music.add(guild, voice, interaction.channelId, interaction.options.getString('lagu', true));
        return interaction.editReply(`🎶 Ditambahkan: **${result.first?.info?.title || 'Lagu'}** · antrean ${result.queued}`);
      }
      case 'skip':
        if (!voice) return reply('Masuk ke voice channel terlebih dahulu.');
        await interaction.deferReply(); await music.skip(guild.id); return interaction.editReply('⏭️ Lagu dilewati.');
      case 'stop':
        await interaction.deferReply(); await music.stop(guild.id); return interaction.editReply('⏹️ Musik dihentikan dan antrean dikosongkan.');
      case 'pause':
        await interaction.deferReply(); await music.pause(guild.id, true); return interaction.editReply('⏸️ Musik dijeda.');
      case 'resume':
        await interaction.deferReply(); await music.pause(guild.id, false); return interaction.editReply('▶️ Musik dilanjutkan.');
      case 'queue': {
        const snap = music.snapshot(guild.id);
        const lines = snap.queue.slice(0, 10).map((t, i) => `${i+1}. [${t.title}](${t.uri || ''})`).join('\n');
        return reply(`**Antrean (${snap.queueLength})**\n${lines || 'Belum ada lagu dalam antrean.'}`, false);
      }
      case 'nowplaying': {
        const snap = music.snapshot(guild.id);
        return reply(snap.current ? `🎵 **${snap.current.title}** — ${snap.current.author}` : 'Tidak ada lagu yang sedang diputar.', false);
      }
      case 'autoplay':
        state.autoplay = interaction.options.getBoolean('aktif', true); saveState();
        return reply(`Autoplay **${state.autoplay ? 'aktif' : 'nonaktif'}**.`, false);
      case '247':
        state.stay247 = interaction.options.getBoolean('aktif', true); saveState();
        return reply(`Mode 24/7 **${state.stay247 ? 'aktif' : 'nonaktif'}**.`, false);
      case 'volume': {
        const v = await music.setVolume(guild.id, interaction.options.getInteger('angka', true));
        return reply(`🔊 Volume diatur ke ${v}%.`, false);
      }
    }
  } catch (error) {
    console.error(error);
    const msg = `❌ ${error.message || 'Terjadi kesalahan.'}`;
    if (interaction.deferred || interaction.replied) await interaction.editReply(msg).catch(() => {});
    else await reply(msg);
  }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  if (newState.id !== client.user?.id || !oldState.channelId || newState.channelId) return;
  const s = getState(newState.guild.id);
  if (s.stay247 && s.voiceChannelId) {
    setTimeout(async () => {
      const guild = client.guilds.cache.get(newState.guild.id);
      const channel = guild?.channels.cache.get(s.voiceChannelId);
      if (channel?.isVoiceBased()) {
        try { await client.shoukaku.joinVoiceChannel({ guildId: guild.id, channelId: channel.id, shardId: guild.shardId, deaf: true }); }
        catch (e) { console.warn('24/7 reconnect:', e.message); }
      }
    }, 5000).unref();
  }
});

process.on('unhandledRejection', e => console.error('Unhandled rejection:', e));
process.on('uncaughtException', e => { console.error('Uncaught exception:', e); });
await client.login(process.env.DISCORD_TOKEN);
