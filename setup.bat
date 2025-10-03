@echo off
echo Setting up Volunteer Job Application...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed or not in PATH.
    echo Please download and install Node.js from: https://nodejs.org/
    echo After installation, run this script again.
    pause
    exit /b 1
)

echo Node.js found! Installing dependencies...
echo.

REM Install dependencies
npm install

if %errorlevel% neq 0 (
    echo Failed to install dependencies.
    echo Make sure you have a stable internet connection and try again.
    pause
    exit /b 1
)

echo.
echo Setup complete!
echo.
echo To start the application:
echo   npm start
echo.
echo Then open your browser and go to: http://localhost:3000
echo.
pause