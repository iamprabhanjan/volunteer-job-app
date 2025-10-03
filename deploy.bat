@echo off
echo.
echo 🚀 Quick Deploy Setup for Volunteer Job App
echo ===========================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git is not installed. Please install Git first:
    echo    Download from: https://git-scm.com/
    echo    After installation, run this script again.
    pause
    exit /b 1
)

echo ✅ Git found!
echo.

REM Initialize git repository
if not exist ".git" (
    echo 📁 Initializing Git repository...
    git init
    echo ✅ Git repository initialized
) else (
    echo ✅ Git repository already exists
)

REM Check if remote origin exists
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo 🔗 Setting up GitHub repository...
    echo Please follow these steps:
    echo.
    echo 1. Go to https://github.com/new
    echo 2. Create a repository named 'volunteer-job-app'
    echo 3. Make it PUBLIC ^(required for free hosting^)
    echo 4. Don't initialize with README ^(we have our own files^)
    echo.
    set /p repo_url="Enter your GitHub repository URL (e.g., https://github.com/username/volunteer-job-app.git): "
    
    if not "!repo_url!"=="" (
        git remote add origin "!repo_url!"
        echo ✅ Remote repository added
    ) else (
        echo ❌ No repository URL provided. You'll need to add it manually later.
    )
) else (
    echo ✅ Remote repository already configured
)

REM Add and commit files
echo.
echo 📦 Preparing files for deployment...
git add .
git commit -m "Initial commit - Volunteer Job Application ready for deployment"

REM Push to GitHub
git remote get-url origin >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo ⬆️ Pushing to GitHub...
    git push -u origin main
    echo ✅ Code pushed to GitHub!
    
    echo.
    echo 🎉 Your code is now on GitHub!
    echo.
    echo 📋 Next steps for deployment:
    echo 1. Go to https://render.com and sign up ^(free^)
    echo 2. Click 'New' → 'Web Service'
    echo 3. Connect your GitHub repository
    echo 4. Use these settings:
    echo    - Environment: Node
    echo    - Build Command: npm install
    echo    - Start Command: npm start
    echo    - Plan: Free
    echo 5. Click 'Create Web Service'
    echo.
    echo 🌐 Your app will be live at: https://your-app-name.onrender.com
    echo.
) else (
    echo.
    echo ⚠️ GitHub repository not configured.
    echo Please add your repository manually and push the code.
)

echo 📖 For detailed instructions, see DEPLOYMENT.md
pause