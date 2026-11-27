#!/bin/sh
set -u

if [ -z "${LAVALINK_PASSWORD:-}" ]; then
  echo "ERROR: LAVALINK_PASSWORD belum diatur."
  exit 1
fi

# Render Free only gives 512 MB RAM; use conservative JVM limits for a small test bot.
java -Xms48m -Xmx160m -XX:MaxMetaspaceSize=80m -XX:MaxDirectMemorySize=48m -XX:+UseSerialGC \
  -jar /opt/Lavalink/Lavalink.jar --spring.config.location=file:/opt/Lavalink/application.yml &
LAVA_PID=$!
BOT_PID=""
cleanup() {
  [ -n "$BOT_PID" ] && kill -TERM "$BOT_PID" 2>/dev/null || true
  kill -TERM "$LAVA_PID" 2>/dev/null || true
}
trap cleanup INT TERM

echo "Menunggu Lavalink siap..."
ready=0
i=0
while [ "$i" -lt 90 ]; do
  if ! kill -0 "$LAVA_PID" 2>/dev/null; then
    echo "ERROR: proses Lavalink berhenti."
    wait "$LAVA_PID" || true
    exit 1
  fi
  if curl -fsS -H "Authorization: ${LAVALINK_PASSWORD}" http://127.0.0.1:2333/v4/info >/dev/null 2>&1; then
    ready=1
    break
  fi
  i=$((i + 1))
  sleep 2
done
if [ "$ready" -ne 1 ]; then
  echo "ERROR: Lavalink tidak siap dalam 180 detik."
  exit 1
fi

echo "Lavalink siap. Mendaftarkan slash commands..."
node src/deploy-commands.js || echo "Peringatan: pendaftaran slash commands gagal; cek DISCORD_TOKEN dan CLIENT_ID."
echo "Menjalankan bot AETHRA MUSIC..."
node src/index.js &
BOT_PID=$!
wait "$BOT_PID"
status=$?
cleanup
wait "$LAVA_PID" 2>/dev/null || true
exit "$status"
