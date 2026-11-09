@echo off
setlocal
chcp 65001 >nul
title RUVSON DIAGNOSTIKA
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ruvson-setup.ps1" -Mode doctor
echo.
pause
