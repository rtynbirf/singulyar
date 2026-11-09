#!/usr/bin/env bash
# ==============================================================================
# СИНГУЛЯР · Резервный Bash/OpenSSL генератор паспорта узла
# ==============================================================================
set -e

OUT_DIR="${1:-/etc/singulyar/passport}"
mkdir -p "$OUT_DIR"

HW_HASH=$(cat /etc/machine-id /proc/sys/kernel/random/boot_id 2>/dev/null | sha256sum | head -c 16)
NODE_ID="node-omni-${HW_HASH:0:8}"

echo "[+] Генерация OpenSSL ключей для узла: $NODE_ID"

# 1. ECDSA P-256 Key
openssl ecparam -name prime256v1 -genkey -noout -out "$OUT_DIR/node_ecdsa_private.pem"
openssl ec -in "$OUT_DIR/node_ecdsa_private.pem" -pubout -out "$OUT_DIR/node_ecdsa_public.pem" 2>/dev/null

# 2. RSA 4096-bit Key & Self-Signed Cert
openssl req -x509 -nodes -days 3650 -newkey rsa:4096   -keyout "$OUT_DIR/node_rsa_private.pem"   -out "$OUT_DIR/node_cert.pem"   -subj "/CN=singulyar-$NODE_ID/O=SINGULYAR SUVEREIGN NETWORK/OU=OMNISPEAKER-1" 2>/dev/null

chmod 600 "$OUT_DIR"/*_private.pem
echo "[SUCCESS] Ключи и сертификат OpenSSL сохранены в $OUT_DIR"
