#!/usr/bin/env bash
# ==============================================================================
# СИНГУЛЯР · Скрипт автоматизированной прошивки SD-карт для массового развёртывания
# Использование: sudo bash flash_sd_card.sh /dev/sdX [path_to_os_image.img]
# ==============================================================================
set -e

TARGET_DEV="$1"
IMAGE_PATH="${2:-singulyar_os_base.img}"

if [ "$EUID" -ne 0 ]; then
  echo "[!] Запустите скрипт с правами root: sudo bash flash_sd_card.sh /dev/sdX"
  exit 1
fi

if [ -z "$TARGET_DEV" ]; then
  echo "Использование: sudo bash flash_sd_card.sh <устройство_sd> [образ.img]"
  echo "Пример:       sudo bash flash_sd_card.sh /dev/sdb debian_raspi.img"
  exit 1
fi

# Защита от случайного разрушения системного диска
if [ "$TARGET_DEV" == "/dev/sda" ] || [ "$TARGET_DEV" == "/dev/nvme0n1" ]; then
  echo "[CRITICAL ERROR] Запрещено записывать на основной системный накопитель $TARGET_DEV!"
  exit 1
fi

echo "================================================================="
echo "СИНГУЛЯР · Прошивка целевого накопителя: $TARGET_DEV"
echo "Используемый образ: $IMAGE_PATH"
echo "================================================================="

# Отмонтирование всех существующих разделов накопителя
echo "[1/4] Отмонтирование существующих разделов..."
umount ${TARGET_DEV}* 2>/dev/null || true

# Запись базового образа через dd
if [ -f "$IMAGE_PATH" ]; then
  echo "[2/4] Запись образа OS на $TARGET_DEV (dd bs=4M conv=fsync)..."
  dd if="$IMAGE_PATH" of="$TARGET_DEV" bs=4M conv=fsync status=progress
  sync
else
  echo "[!] Образ $IMAGE_PATH не найден. Выполняется только запись cloud-init конфигуратора на существующий FAT-раздел..."
fi

# Монтирование BOOT раздела
echo "[3/4] Инъекция cloud-init конфигурации в BOOT раздел..."
MOUNT_DIR=$(mktemp -d)
BOOT_PART="${TARGET_DEV}1"
if [[ "$TARGET_DEV" == *"mmcblk"* ]]; then
  BOOT_PART="${TARGET_DEV}p1"
fi

mount "$BOOT_PART" "$MOUNT_DIR" || mount "$TARGET_DEV" "$MOUNT_DIR"

# Инъекция cloud-init user-data & meta-data
cp cloud-init.yaml "$MOUNT_DIR/user-data"
touch "$MOUNT_DIR/meta-data"

# Активация SSH и Kiosk параметров в cmdline.txt / config.txt (для Raspberry Pi / Allwinner)
touch "$MOUNT_DIR/ssh"
if [ -f "$MOUNT_DIR/config.txt" ]; then
  echo "hdmi_force_hotplug=1" >> "$MOUNT_DIR/config.txt"
  echo "disable_overscan=1" >> "$MOUNT_DIR/config.txt"
fi

echo "[4/4] Завершение записи и безопасное извлечение накопителя..."
sync
umount "$MOUNT_DIR"
rm -rf "$MOUNT_DIR"

echo "================================================================="
echo "[SUCCESS] SD-карта готова! Вставьте накопитель в OMNISPEAKER-1 / Raspberry Pi."
echo "Узел автоматически сконфигурируется при первом включении."
echo "================================================================="
