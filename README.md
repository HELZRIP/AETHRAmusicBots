# AETHRA MUSIC

Self-hosted Discord music bot: Discord.js + Shoukaku + Lavalink v4 + Express dashboard.

## Included
- Slash commands: `/play`, `/skip`, `/stop`, `/pause`, `/resume`, `/queue`, `/nowplaying`, `/autoplay`, `/247`, `/volume`
- YouTube via the Lavalink YouTube source plugin; SoundCloud via Lavalink's built-in source
- Per-guild queue, autoplay, persistent 24/7 preference and best-effort reconnect
- Password-protected web dashboard
- Docker Compose deployment and restart policy

## Requirements
- Linux VPS (Ubuntu 22.04/24.04 recommended), 2 vCPU and 2 GB RAM minimum for a small bot; more for multiple concurrent servers
- Docker Engine + Docker Compose plugin
- Discord application/bot with `bot` and `applications.commands` scopes; permissions: View Channels, Send Messages, Embed Links, Connect, Speak
- Node.js 24.17.0+ (required by the current discord.js v14 documentation).
- YouTube/SoundCloud availability is not guaranteed. Sources can change, rate-limit, or block requests. Use content you have rights to play and follow each platform's terms.

## 1. Create Discord bot
1. Open https://discord.com/developers/applications and create an application.
2. Open **Bot**, add a bot, reset/copy its token. Keep the token private.
3. Enable no privileged intents; this project only needs Guilds and GuildVoiceStates.
4. In **OAuth2 > URL Generator**, select `bot` and `applications.commands`.
5. Grant View Channels, Send Messages, Embed Links, Connect, Speak. Open generated URL and invite bot.
6. Copy Application ID from **General Information**. For quick testing, copy your server ID with Developer Mode enabled.

## 2. Configure secrets
```bash
cp .env.example .env
nano .env
```
Set `DISCORD_TOKEN`, `CLIENT_ID`, `LAVALINK_PASSWORD`, and `DASHBOARD_PASSWORD`.
For Docker Compose, set `LAVALINK_HOST=lavalink` (not localhost), `LAVALINK_PORT=2333`.
Set the SAME Lavalink password in `.env` and `lavalink/application.yml`.
Use a long random password. Do not publish `.env`.

## 3. Start
```bash
docker compose up -d --build
docker compose logs -f
```
Wait for Lavalink node ready, then register commands:
```bash
docker compose exec bot npm run deploy
```
For immediate testing set `GUILD_ID` in `.env` to your Discord server ID and restart/redeploy. Remove `GUILD_ID` later to register globally (global command propagation can take time).

## 4. Dashboard
Dashboard listens on port 3000 and Docker binds it to `127.0.0.1` only. Recommended: put it behind HTTPS reverse proxy (Nginx/Caddy) with TLS and keep port 3000 private. Access via your domain after reverse proxy setup. Enter `DASHBOARD_PASSWORD`.

For quick private testing only, SSH tunnel from your PC:
```bash
ssh -L 3000:127.0.0.1:3000 USER@YOUR_VPS_IP
```
Then open http://127.0.0.1:3000. Do not expose dashboard publicly without HTTPS and a strong password.

## 5. Use
Join a voice channel then:
- `/play lagu: Numb Linkin Park`
- `/play lagu: https://soundcloud.com/...`
- `/queue`, `/skip`, `/pause`, `/resume`
- `/autoplay aktif:true`
- `/247 aktif:true`
- `/volume angka:70`

Dashboard can show guilds, current track, queue, add a track, pause/resume/skip/stop and toggle autoplay/24/7.

## Operations
```bash
docker compose ps
docker compose logs -f bot
docker compose logs -f lavalink
docker compose restart bot
docker compose down
docker compose up -d
```

## Important limits / honest behavior
- "Unlimited queue" means no configured application cap (`QUEUE_MAX=0`), not infinite capacity. RAM, disk, Lavalink and provider limits still apply. The bot's queue is saved to `data/guild-state.json`; very large queues need a database/Redis instead.
- 24/7 is best-effort. The bot must remain online, the VPS must stay on, and Discord/Lavalink connections can drop. Saved queue/current metadata and voice channel IDs allow a reconnect attempt; a track already in progress may restart after a process restart.
- Autoplay uses a YouTube search for similar music. Recommendations may repeat or fail if YouTube source is unavailable.
- YouTube is supplied by `youtube-source` plugin; Lavalink v4 disables its old built-in YouTube source. SoundCloud is enabled as a built-in Lavalink source.
- The pinned YouTube plugin version can become stale. Check the upstream repository's compatibility/release notes before upgrading: https://github.com/lavalink-devs/youtube-source
- Never stream copyrighted content unless you have permission or a valid basis under the relevant service terms and local law.

## Troubleshooting
**Node not ready / connection refused:** check `LAVALINK_HOST=lavalink` in Docker, matching port and password, and `docker compose logs lavalink`.
**401 Unauthorized:** Lavalink password mismatch.
**No YouTube results:** check YouTube plugin download/config/logs; source availability can change.
**No SoundCloud results:** confirm `soundcloud: true`, use `scsearch:keyword` or a SoundCloud URL.
**Commands missing:** run `npm run deploy` inside bot container; use `GUILD_ID` while testing.
**Bot joins but no audio:** verify Speak/Connect permissions and voice state; inspect Lavalink and bot logs.

## Render Free (experimental)
A separate `Dockerfile.render`, `render.yaml`, `lavalink/application-render.yml`, and `start-render.sh` are included for a one-service Render Free test deployment. This runs Lavalink and the bot in one container to avoid consuming free instance-hours on two separate services. Render Free has only 512 MB RAM, may spin down after 15 minutes without inbound traffic, can restart at any time, and has an ephemeral filesystem. This is not a reliable 24/7 production host. See `RENDER-DEPLOY-ID.md`.
