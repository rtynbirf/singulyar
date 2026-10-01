@echo off
setlocal
chcp 65001 >nul
title RUVSON OBNOVIT VSYO
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ruvson-setup.ps1" -Mode update
echo.
pause
