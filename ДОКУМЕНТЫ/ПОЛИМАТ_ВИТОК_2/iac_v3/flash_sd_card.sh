#!/usr/bin/env bash
# ==============================================================================
# СИНГУЛЯР · Автоматизированная прошивка SD-карт с генерацией Паспорта
# Использование: sudo bash flash_sd_card.sh /dev/sdX [path_to_os_image.img]
# ==============================================================================
set -e

TARGET_DEV="$1"
IMAGE_PATH="${2:-singulyar_os_base.img}"

if [ -z "$TARGET_DEV" ]; then
  echo "Использование: sudo bash flash_sd_card.sh /dev/sdX [image.img]"
  exit 1
fi

if [ "$EUID" -ne 0 ]; then
  echo "[!] Запустите скрипт с правами root: sudo bash flash_sd_card.sh /dev/sdX"
  exit 1
fi

if [ "$TARGET_DEV" == "/dev/sda" ] || [ "$TARGET_DEV" == "/dev/nvme0n1" ]; then
  echo "[CRITICAL ERROR] Запрещено записывать на основной системный диск $TARGET_DEV!"
  exit 1
fi

echo "[1/5] Отмонтирование разделов $TARGET_DEV..."
umount ${TARGET_DEV}* 2>/dev/null || true

if [ -f "$IMAGE_PATH" ]; then
  echo "[2/5] Запись образа $IMAGE_PATH через dd..."
  dd if="$IMAGE_PATH" of="$TARGET_DEV" bs=4M conv=fsync status=progress
  sync
fi

echo "[3/5] Генерация уникального Паспорта Узла для текущей SD-карты..."
TEMP_PASSPORT_DIR=$(mktemp -d)
python3 generate_node_passport.py --output-dir "$TEMP_PASSPORT_DIR"

echo "[4/5] Инъекция cloud-init и Паспорта в BOOT-раздел..."
MOUNT_DIR=$(mktemp -d)
BOOT_PART="${TARGET_DEV}1"
[[ "$TARGET_DEV" == *"mmcblk"* ]] && BOOT_PART="${TARGET_DEV}p1"

mount "$BOOT_PART" "$MOUNT_DIR" || mount "$TARGET_DEV" "$MOUNT_DIR"

cp cloud-init.yaml "$MOUNT_DIR/user-data"
touch "$MOUNT_DIR/meta-data"
mkdir -p "$MOUNT_DIR/singulyar_passport"
cp "$TEMP_PASSPORT_DIR"/* "$MOUNT_DIR/singulyar_passport/"

sync && umount "$MOUNT_DIR" && rm -rf "$MOUNT_DIR" "$TEMP_PASSPORT_DIR"
echo "[5/5] [SUCCESS] SD-карта с уникальным крипто-паспортом прошита!"
