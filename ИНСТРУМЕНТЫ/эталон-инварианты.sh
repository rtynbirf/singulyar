#!/usr/bin/env bash
# ЭТАЛОН-ИНВАРИАНТЫ ДОМА — структурные проверки прод-файла КВАРТИРНИКА.
# Запуск: bash "ИНСТРУМЕНТЫ/эталон-инварианты.sh"  (из корня репы)
# Используется: локально и в CI (.github/workflows/ci.yml).
set -e

F="СИНГУЛЯР_31_КВАРТИРНИК.html"
fail() { echo "::error::$1" >&2; echo "ПАДЕНИЕ: $1" >&2; exit 1; }
ok()   { echo "  ✓ $1"; }

echo "=== ЭТАЛОН-ИНВАРИАНТЫ ДОМА ==="

[ -f "$F" ] || fail "Нет прод-файла $F"
ok "прод-файл на месте: $F"

SIZE=$(wc -c < "$F")
echo "  вес: $SIZE Б (лимит 5 000 000)"
[ "$SIZE" -lt 5000000 ] || fail "Прод-файл растолстел: $SIZE Б > 5 МБ"
ok "вес в норме"

SPN=$(grep -c 'ScriptProcessorNode' "$F" || true)
echo "  ScriptProcessorNode: $SPN (норма 0 — только AudioWorklet)"
[ "$SPN" -eq 0 ] || fail "ScriptProcessorNode вернулся в код ($SPN) — архитектурный регресс"
ok "архитектура звука чиста"

AW=$(grep -c 'AudioWorklet' "$F" || true)
echo "  AudioWorklet: $AW"
[ "$AW" -ge 1 ] || fail "AudioWorklet пропал"
ok "AudioWorklet жив"

WH=$(grep -ci 'whisper' "$F" || true)
echo "  whisper: $WH"
[ "$WH" -ge 1 ] || fail "whisper-тракт пропал"
ok "whisper-тракт жив"

ZAL=$(grep -c 'ЗАЛ' "$F" || true)
echo "  ЗАЛ (С20): $ZAL"
[ "$ZAL" -ge 1 ] || fail "ЗАЛ (С20) пропал"
ok "ЗАЛ (С20) жив"

CSP=$(grep -c 'http-equiv="Content-Security-Policy"' "$F" || true)
echo "  CSP meta: $CSP"
[ "$CSP" -ge 1 ] || fail "CSP-щит снят"
ok "CSP-щит стоит"

HTTP=$(grep -cE '(src|href)="http://' "$F" || true)
echo "  небезопасный http:// в src/href: $HTTP"
[ "$HTTP" -eq 0 ] || fail "Появились небезопасные http://-ссылки ($HTTP)"
ok "внешних http:// нет"

for P in index.html manifest.webmanifest sw15.js favicon.ico; do
  [ -f "$P" ] || fail "PWA-деталь потеряна: $P"
done
ok "PWA-трио на месте"

echo "=== ИНВАРИАНТЫ ЦЕЛЫ. ДОМ СТОИТ. ==="
