# Deployment Guide - Render.com

## Step 1: Prepare Your Application for Deployment

### 1.1 Update package.json for Production
We need to modify the start script and add production dependencies.

### 1.2 Add Environment Variables Support
The app needs to work with environment variables for production.

### 1.3 Update Database to Use MongoDB (Optional)
For better scalability, we can switch from JSON files to MongoDB.

## Step 2: Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it: `volunteer-job-app` 
3. Make it public (required for free Render deployment)

## Step 3: Upload Your Code to GitHub

### Option A: Using Git Commands (if Git is installed)
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### Option B: Using GitHub Desktop
1. Download GitHub Desktop
2. Add your project folder
3. Commit and push to GitHub

### Option C: Manual Upload
1. Create repository on GitHub
2. Upload files through GitHub web interface

## Step 4: Deploy on Render.com

1. Go to [Render.com](https://render.com) and sign up (free)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: volunteer-job-app
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

## Step 5: Add Environment Variables (in Render dashboard)
- `NODE_ENV`: production
- `PORT`: (leave empty - Render sets automatically)

## Step 6: Deploy!
Click "Create Web Service" and wait for deployment to complete.

Your app will be available at: `https://your-app-name.onrender.com`

---

## Alternative: Quick Deploy with JSON Files

If you want to keep using JSON files (simpler but less scalable):

1. The current setup will work as-is
2. JSON files will be stored in the container
3. Data will reset on each deployment
4. Good for testing/demo purposes

## Production Recommendations

For a production app with persistent data:
1. Switch to MongoDB Atlas (free tier)
2. Add proper error handling
3. Add rate limiting
4. Add data validation
5. Add backup functionality