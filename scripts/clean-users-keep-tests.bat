@echo off
setlocal EnableDelayedExpansion
title Diabetes Platform - Clean Users (Keep Test Accounts)

echo This will reset the local database and keep ONLY the two test accounts.
echo - demo@example.com / Demo123456!
echo - merchant@example.com / Merchant123456!
echo All other local data will be removed (fresh schema).
echo.
set /p CONFIRM=Proceed? (Y/N): 
if /I not "%CONFIRM%"=="Y" (
  echo Aborted.
  exit /b 0
)

where node >nul 2>nul || (echo Node.js not found. Please install Node.js ^>= 18. & pause & exit /b 1)
where npm >nul 2>nul || (echo npm not found. Please install Node.js/npm. & pause & exit /b 1)

REM Move to repo root
pushd "%~dp0.." >nul

echo [1/5] Preparing backend environment file...
if not exist backend\.env (
  if exist backend\.env.example (
    copy /Y backend\.env.example backend\.env >nul
    echo Created backend\.env from example.
  ) else (
    echo backend/.env.example not found. Please create backend/.env manually.
  )
) else (
  echo backend\.env already exists.
)

echo [2/5] Removing local SQLite database (backend/prisma/dev.db)...
if exist backend\prisma\dev.db (
  del /Q backend\prisma\dev.db || (echo Failed to delete dev.db & goto :error)
) else (
  echo No existing dev.db found. Skipping.
)

echo [3/5] Rebuilding schema with Prisma (generate + migrate deploy)...
pushd backend >nul
call npx prisma generate || goto :error
call npx prisma migrate deploy || goto :error

echo [4/5] Seeding test users (demo / merchant)...
call npm run db:seed:test-users || goto :error
popd >nul

echo [5/5] Done. Test accounts are ready. You can now run:
echo   npm run dev
echo or
echo   cd backend ^&^& npm run dev   and   cd frontend ^&^& npm run dev

popd >nul
exit /b 0

:error
echo.
echo Clean-up failed. Please check the messages above.
popd >nul
pause
exit /b 1

