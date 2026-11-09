# SINGULYAR OS - Infrastructure as Code (v2.0)

Этот архив содержит готовый комплект конфигураций для массовой автоматизированной прошивки физических узлов **OMNISPEAKER-1** и микрокомпьютеров (Raspberry Pi / Rockchip SBC).

## Состав комплекта v2.0:
1. `flash_sd_card.sh` — Скрипт автоматизированной записи образа OS на SD-карту с инъекцией `cloud-init`.
2. `cloud-init.yaml` — Конфигурация Zero-Touch установки для массового развёртывания.
3. `install.sh` — Локальный авто-установщик для работающих ОС Debian/Ubuntu.
4. `singulyar-kiosk.sh` — Kiosk-скрипт автозапуска Chromium с флагами доступа к мик/камере и COOP/COEP.
5. `singulyar-kiosk.service` — Systemd служба автозапуска.
6. `nginx.conf` — Конфигурация локального веб-сервера с заголовками COOP/COEP для SharedArrayBuffer и OPFS.
7. `Dockerfile` & `supervisord.conf` — Контейнеризированная сборка узла.

## Массовая прошивка SD-карт (One-Tap Mass Flashing):
```bash
sudo bash flash_sd_card.sh /dev/sdX base_raspi.img
```
Вставьте SD-карту в узел — система автоматически поднимется в режиме суверенного Kiosk без интернета!
