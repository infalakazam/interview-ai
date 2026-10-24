@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title PrepAI API

if not exist ".venv\Scripts\python.exe" (
    echo Setting up PrepAI's Python environment for the first time...
    py -m venv .venv
    if errorlevel 1 goto setup_error
)

".venv\Scripts\python.exe" -c "import fastapi, sklearn, joblib, google.auth, dotenv" >nul 2>&1
if errorlevel 1 (
    echo Installing the packages PrepAI needs. This may take a few minutes...
    ".venv\Scripts\python.exe" -m pip install -r requirements-ml.txt
    if errorlevel 1 goto setup_error
)

if not exist ".env" (
    echo.
    echo Google sign-in needs the Web Client ID you created in Google Cloud.
    echo Paste only the ID value below. It usually ends with apps.googleusercontent.com
    echo Do not paste a client secret or add quotation marks.
    set /p GOOGLE_CLIENT_ID=Web Client ID: 
    if not defined GOOGLE_CLIENT_ID goto missing_client_id
    > ".env" echo GOOGLE_CLIENT_ID=!GOOGLE_CLIENT_ID!
    set "GOOGLE_CLIENT_ID="
    echo Saved the public Client ID in this project's local .env file.
    echo.
)

echo Starting PrepAI's API. Keep this window open while using PrepAI.
echo The login page expects this service at http://127.0.0.1:8000
echo.
".venv\Scripts\python.exe" -m uvicorn backend.app:app --reload --port 8000
echo.
echo PrepAI's API has stopped. Press any key to close this window.
pause >nul
exit /b 0

:setup_error
echo.
echo PrepAI setup could not finish. Check that Python is installed and internet is available.
echo See README.md for help.
pause
exit /b 1

:missing_client_id
echo.
echo No Client ID was entered. Create one in Google Cloud first, then double-click this file again.
pause
exit /b 1
