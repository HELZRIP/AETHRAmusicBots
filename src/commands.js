import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export const commands = [
  new SlashCommandBuilder().setName('play').setDescription('Putar lagu atau playlist')
    .addStringOption(o => o.setName('lagu').setDescription('Judul atau URL YouTube/SoundCloud').setRequired(true)),
  new SlashCommandBuilder().setName('skip').setDescription('Lewati lagu saat ini'),
  new SlashCommandBuilder().setName('stop').setDescription('Hentikan musik dan kosongkan antrean'),
  new SlashCommandBuilder().setName('pause').setDescription('Jeda lagu'),
  new SlashCommandBuilder().setName('resume').setDescription('Lanjutkan lagu'),
  new SlashCommandBuilder().setName('queue').setDescription('Lihat antrean lagu'),
  new SlashCommandBuilder().setName('autoplay').setDescription('Aktif/nonaktifkan autoplay')
    .addBooleanOption(o => o.setName('aktif').setDescription('Aktifkan autoplay').setRequired(true)),
  new SlashCommandBuilder().setName('247').setDescription('Aktif/nonaktifkan mode 24/7')
    .addBooleanOption(o => o.setName('aktif').setDescription('Tetap di voice channel').setRequired(true)),
  new SlashCommandBuilder().setName('volume').setDescription('Atur volume 0-100')
    .addIntegerOption(o => o.setName('angka').setDescription('Volume').setMinValue(0).setMaxValue(100).setRequired(true)),
  new SlashCommandBuilder().setName('nowplaying').setDescription('Lihat lagu yang sedang diputar')
].map(c => c.toJSON());
