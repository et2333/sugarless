@echo off
setlocal EnableDelayedExpansion
title Diabetes Platform - Quick Start (Auth Ready)

echo [1/7] Checking prerequisites...
where node >nul 2>nul || (echo Node.js not found. Please install Node.js ^>= 18. & pause & exit /b 1)
where npm >nul 2>nul || (echo npm not found. Please install Node.js/npm. & pause & exit /b 1)

REM Move to repo root (this script lives in scripts/)
pushd "%~dp0.." >nul

echo [2/7] Installing dependencies (root, backend, frontend)...
call npm run install:all || goto :error

echo [3/7] Preparing backend environment file...
if not exist backend\.env (
  if exist backend\.env.example (
    copy /Y backend\.env.example backend\.env >nul
    echo Created backend\.env from example. Update SENDGRID_API_KEY and others if needed.
  ) else (
    echo backend/.env.example not found. Please create backend/.env manually.
  )
) else (
  echo backend\.env already exists.
)

echo [4/7] Generating Prisma client...
pushd backend >nul
call npx prisma generate || goto :error

echo [5/7] Applying database migrations (non-interactive)...
call npx prisma migrate deploy || goto :error

echo [6/7] Seeding test users (demo / merchant)...
call npm run db:seed:test-users || goto :error
popd >nul

echo [7/7] Starting development servers (backend + frontend)...
call npm run dev || goto :error
goto :eof

:error
echo.
echo Setup failed. Please check the messages above.
popd >nul
pause
exit /b 1
