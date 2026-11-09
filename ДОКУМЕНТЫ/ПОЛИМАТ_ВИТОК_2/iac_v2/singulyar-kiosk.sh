#!/usr/bin/env bash
export DISPLAY=${DISPLAY:-:0}
xset s off -dpms 2>/dev/null || true

while true; do
    chromium         --kiosk         --no-first-run         --disable-restore-session-state         --disable-session-crashed-bubble         --disable-infobars         --autoplay-policy=no-user-gesture-required         --use-fake-ui-for-media-stream         --enable-features=SharedArrayBuffer         --ignore-certificate-errors         "http://localhost:80"
    sleep 2
done
