#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# СИНГУЛЯР · Инструмент Н4 «ВЕС» (I-01) — перекодирование max.webm
# 510k → 128k (opus) с верификацией длительности и голоса.
#
# ЗАКОН: инструмент НЕ исполняется агентом. Исполнение — только по явному
# слову владельца (I-01): минус-мастера суть голоса 62 песен, данные
# священны. Скрипт делает безопасное: перекодирует в отдельный каталог
# (исходники не трогаются), сверяет длительность (ffprobe ±0.5 с) и
# наличие голосовой полосы (200–3500 Гц RMS), пишет отчёт.
#
# Использование: bash ИНСТРУМЕНТЫ/reweight_minus.sh [--dry]
# Зависимости: ffmpeg + ffprobe.
# ═══════════════════════════════════════════════════════════════════════
set -uo pipefail
cd "$(dirname "$0")/.."

SRC=minus
DST=minus_128k
DRY=0
[[ "${1:-}" == "--dry" ]] && DRY=1

command -v ffmpeg >/dev/null 2>&1 || { echo "СТОП: ffmpeg не найден"; exit 1; }
command -v ffprobe >/dev/null 2>&1 || { echo "СТОП: ffprobe не найден"; exit 1; }

mkdir -p "$DST"
OTCHET=ВЕС_ОТЧЁТ.md
{
  echo "# ОТЧЁТ перекодирования minus (I-01) — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "| Файл | Был, Б | Стал, Б | Экономия | Длит. исх, с | Длит. новый, с | Δ, с | Голос 200–3500 Гц |"
  echo "|---|---|---|---|---|---|---|---|"
} > "$OTCHET"

dur() { ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$1" 2>/dev/null; }
voice() {
  ffmpeg -v error -i "$1" -af "highpass=f=200,lowpass=f=3500,astats=metadata=1:reset=1" -f null - 2>&1 | grep -o "RMS level dB: -[0-9.]*" | head -1
}

TOTAL_BEFORE=0
TOTAL_AFTER=0
for f in "$SRC"/*.max.webm; do
  name=$(basename "$f")
  before=$(stat -c%s "$f")
  d1=$(dur "$f")
  if [[ $DRY == 1 ]]; then
    echo "[dry] $name ${before} Б, ${d1}с — перекодирование не исполнено (закон Н4)"
    continue
  fi
  ffmpeg -v error -y -i "$f" -c:a libopus -b:a 128k -vn "$DST/$name"
  after=$(stat -c%s "$DST/$name")
  d2=$(dur "$DST/$name")
  delta=$(python3 -c "print(f'{abs(float(${d1:-0})-float(${d2:-0})):.2f}')")
  v=$(voice "$DST/$name")
  save=$(python3 -c "print(f'{100*(1-${after}/${before}):.1f}%')")
  echo "| $name | $before | $after | $save | ${d1} | ${d2} | $delta | ${v:-—} |" >> "$OTCHET"
  TOTAL_BEFORE=$((TOTAL_BEFORE+before)); TOTAL_AFTER=$((TOTAL_AFTER+after))
  if [[ $(python3 -c "print(1 if ${delta:-99} > 0.5 else 0)") == "1" ]]; then
    echo "СТОП-ГОРН: длительность уехала у $name (Δ=${delta}с)"; exit 1
  fi
done

if [[ $DRY == 0 ]]; then
  echo >> "$OTCHET"
  echo "**Итого:** было ${TOTAL_BEFORE} Б → стало ${TOTAL_AFTER} Б (экономия $(python3 -c "print(f'{100*(1-${TOTAL_AFTER}/${TOTAL_BEFORE}):.1f}%')"))." >> "$OTCHET"
  echo "Отчёт: $OTCHET. Исходники в $SRC не тронуты; новые файлы в $DST."
fi
