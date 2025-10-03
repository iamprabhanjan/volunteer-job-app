#!/bin/bash

# Setup script for volunteer application system
# This script initializes the data files for development

echo "🚀 Setting up Volunteer Application System..."

# Create data directory if it doesn't exist
mkdir -p data/backups
mkdir -p data/archives

# Copy sample files to create runtime data files if they don't exist
if [ ! -f "data/users.json" ]; then
    cp data/users.sample.json data/users.json
    echo "✅ Created data/users.json from sample"
else
    echo "ℹ️  data/users.json already exists"
fi

if [ ! -f "data/jobs.json" ]; then
    cp data/jobs.sample.json data/jobs.json
    echo "✅ Created data/jobs.json from sample" 
else
    echo "ℹ️  data/jobs.json already exists"
fi

if [ ! -f "data/applications.json" ]; then
    cp data/applications.sample.json data/applications.json
    echo "✅ Created data/applications.json from sample"
else
    echo "ℹ️  data/applications.json already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Install dependencies: npm install"
echo "2. Start the server: npm start"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "🔒 Security Note:"
echo "The data/ directory is excluded from Git to protect user privacy."
echo "Only sample files with safe example data are version controlled."