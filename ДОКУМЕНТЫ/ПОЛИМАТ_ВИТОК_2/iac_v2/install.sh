#!/usr/bin/env bash
set -e

if [ "$EUID" -ne 0 ]; then
  echo "[!] Запустите скрипт с правами root: sudo bash install.sh"
  exit 1
fi

if ! id "singulyar" &>/dev/null; then
    useradd -m -s /bin/bash -G audio,video singulyar
fi

apt-get update && apt-get install -y --no-install-recommends     nginx chromium-browser xorg lightdm alsa-utils unclutter curl

cp singulyar-kiosk.sh /usr/local/bin/singulyar-kiosk.sh
chmod +x /usr/local/bin/singulyar-kiosk.sh

cp nginx.conf /etc/nginx/sites-available/singulyar.conf
ln -sf /etc/nginx/sites-available/singulyar.conf /etc/nginx/sites-enabled/default

cp singulyar-kiosk.service /etc/systemd/system/singulyar-kiosk.service
systemctl daemon-reload && systemctl enable singulyar-kiosk.service nginx
echo "[SUCCESS] Установка SINGULYAR_OS завершена успешно."
