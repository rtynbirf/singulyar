@echo off
setlocal
chcp 65001 >nul
title RUVSON USTANOVSHCHIK - SLUGA sluzhit CHELOVEKU
echo.
echo   RUVSON USTANOVSHCHIK: podtyagivayu Python i instrumenty s GitHub na etot komp...
echo   (esli Windows sprosit razreshenie UAC - smelo zhmi DA)
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ruvson-setup.ps1"
echo.
pause
