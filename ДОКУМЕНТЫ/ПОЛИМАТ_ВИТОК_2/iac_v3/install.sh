#!/usr/bin/env bash
# ==============================================================================
# СИНГУЛЯР · Скрипт быстрой прошивки автономного узла (OMNISPEAKER-1 / Raspberry Pi)
# ==============================================================================
set -e

if [ "$EUID" -ne 0 ]; then
  echo "[!] Запустите скрипт с правами root: sudo bash install.sh"
  exit 1
fi

echo "[1/5] Создание системного пользователя singulyar..."
if ! id "singulyar" &>/dev/null; then
    useradd -m -s /bin/bash -G audio,video singulyar
fi

echo "[2/5] Установка системных зависимостей (Python3, OpenSSL, Nginx, Chromium)..."
apt-get update && apt-get install -y --no-install-recommends \
    nginx chromium-browser xorg lightdm alsa-utils unclutter python3 python3-pip python3-cryptography openssl

echo "[3/5] Генерация уникального Криптографического Паспорта узла (ECDSA + RSA)..."
mkdir -p /etc/singulyar/passport
python3 /usr/local/bin/generate_node_passport.py --output-dir /etc/singulyar/passport

# Экспорт публичного паспорта в веб-директорию для Web Crypto API
mkdir -p /var/www/singulyar/assets
cp /etc/singulyar/passport/node_passport.json /var/www/singulyar/assets/node_passport.json
chmod 644 /var/www/singulyar/assets/node_passport.json

echo "[4/5] Размещение скриптов и конфигурации Nginx..."
cp singulyar-kiosk.sh /usr/local/bin/singulyar-kiosk.sh
chmod +x /usr/local/bin/singulyar-kiosk.sh
cp generate_node_passport.py /usr/local/bin/generate_node_passport.py
chmod +x /usr/local/bin/generate_node_passport.py

cp nginx.conf /etc/nginx/sites-available/singulyar.conf
ln -sf /etc/nginx/sites-available/singulyar.conf /etc/nginx/sites-enabled/default

echo "[5/5] Активация автозапуска Systemd..."
cp singulyar-kiosk.service /etc/systemd/system/singulyar-kiosk.service
systemctl daemon-reload && systemctl enable singulyar-kiosk.service nginx

echo "[SUCCESS] Узел SINGULYAR успешно прошит и готов к автономной работе!"
