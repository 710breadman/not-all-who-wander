@echo off
setlocal
title Path A Logical - PC Site
cd /d "C:\Users\Admin\Documents\Codex\Camp"

if /i "%~1"=="--check" (
  echo PAL PC launcher is ready.
  exit /b 0
)

if not exist "node_modules\" (
  echo Setting up Path A Logical for the first time...
  call npm.cmd install
  if errorlevel 1 goto :failed
)

echo.
echo Opening Path A Logical in your browser...
echo Keep this window open while using the site.
echo Close this window or press Ctrl+C when you are finished.
echo.
rem Firebase authorizes hostnames, and this project authorizes localhost for Google sign-in.
rem Do not replace localhost with 127.0.0.1 unless that IP is also added in Firebase Auth.
call npm.cmd run dev -- --host localhost --open
if errorlevel 1 goto :failed
exit /b 0

:failed
echo.
echo Path A Logical could not start. Review the message above.
pause
exit /b 1
