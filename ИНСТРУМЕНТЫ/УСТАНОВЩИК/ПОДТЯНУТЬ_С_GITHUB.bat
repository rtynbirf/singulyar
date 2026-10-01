@echo off
setlocal
chcp 65001 >nul
title RUVSON PODTYANUT S GITHUB
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ruvson-setup.ps1" -Mode gitpull
echo.
pause
