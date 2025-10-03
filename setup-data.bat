@echo off
REM Setup script for volunteer application system (Windows)
REM This script initializes the data files for development

echo 🚀 Setting up Volunteer Application System...

REM Create data directory structure if it doesn't exist
if not exist "data\backups" mkdir "data\backups"
if not exist "data\archives" mkdir "data\archives"

REM Copy sample files to create runtime data files if they don't exist
if not exist "data\users.json" (
    copy "data\users.sample.json" "data\users.json" >nul
    echo ✅ Created data\users.json from sample
) else (
    echo ℹ️  data\users.json already exists
)

if not exist "data\jobs.json" (
    copy "data\jobs.sample.json" "data\jobs.json" >nul
    echo ✅ Created data\jobs.json from sample
) else (
    echo ℹ️  data\jobs.json already exists  
)

if not exist "data\applications.json" (
    copy "data\applications.sample.json" "data\applications.json" >nul
    echo ✅ Created data\applications.json from sample
) else (
    echo ℹ️  data\applications.json already exists
)

echo.
echo 🎉 Setup complete!
echo.
echo 📋 Next steps:
echo 1. Install dependencies: npm install
echo 2. Start the server: npm start
echo 3. Open http://localhost:3000 in your browser
echo.
echo 🔒 Security Note:
echo The data\ directory is excluded from Git to protect user privacy.
echo Only sample files with safe example data are version controlled.

pause