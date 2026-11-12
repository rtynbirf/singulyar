#!/bin/sh
# SINGULYAR-LINK 0.5.2: сервер + публичная HTTPS-ссылка за один шаг (cloudflared quick tunnel).
# Локально без cloudflared: npm install && node server/index.mjs → http://localhost:8787
set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "[link] Первый запуск: ставлю зависимости (npm install)..."
  npm install --no-audit --no-fund
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "[link] cloudflared не найден — публичную ссылку дать не могу, обманывать не буду."
  echo "[link] Локальная проверка:  node server/index.mjs  →  http://localhost:8787"
  echo "[link] Для публичной ссылки поставь cloudflared:"
  echo "[link]   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  echo "[link] и запусти ./start-public.sh снова."
  exit 1
fi

echo "[link] Поднимаю сервер..."
node server/index.mjs &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM

echo "[link] Жду сервер на 8787..."
i=0
while [ "$i" -lt 30 ]; do
  if curl -fsS http://localhost:8787/ >/dev/null 2>&1; then break; fi
  i=$((i + 1))
  sleep 1
done

echo ""
echo "=== ПУБЛИЧНАЯ ССЫЛКА (именно её отправляй людям): ==="
cloudflared tunnel --url http://localhost:8787
