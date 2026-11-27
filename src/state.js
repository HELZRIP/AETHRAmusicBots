import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('data');
const file = path.join(dir, 'guild-state.json');
fs.mkdirSync(dir, { recursive: true });
let state = {};
try { state = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}

export function getState(guildId) {
  return state[guildId] ??= { queue: [], current: null, autoplay: true, stay247: true, textChannelId: null, voiceChannelId: null, volume: 70 };
}
export function allStates() { return state; }
export function saveState() {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, file);
}
