# Volunteer Job Application System

A comprehensive volunteer management platform that connects volunteers with departments for various community service opportunities.

## � Production Deployment

This repository is configured for direct deployment to production platforms.

### Quick Deploy

1. **Clone and Install**
   ```bash
   git clone https://github.com/iamprabhanjan/volunteer-job-app.git
   cd volunteer-job-app
   npm install
   ```

2. **Start the Application**
   ```bash
   npm start
   ```

3. **Access the Application**
   ```
   http://localhost:3000
   ```

## ✨ Features

- **Enhanced Security**: Role-based authentication with HFN ID validation
- **Auto-Acceptance Workflow**: Streamlined volunteer application process  
- **Real-time Updates**: Instant notifications via WebSocket
- **Data Management**: Automated backups and integrity monitoring
- **Dynamic Operations**: Application withdrawal and job removal capabilities
- **Admin Dashboard**: System statistics and maintenance tools

## 🎯 User Roles

### Volunteers
- Register with email/mobile (no password required)
- Browse and apply for opportunities instantly
- Withdraw applications anytime
- Access contact information for accepted applications

### Departments  
- Register with email, mobile, and HFN ID (password required)
- Post job requirements with detailed contact information
- View volunteer applications and contact details
- Manage job lifecycle and remove jobs as needed
- Access admin dashboard for system management

## 🔧 Technical Stack

- **Backend**: Node.js, Express.js, Socket.io
- **Frontend**: Vanilla JavaScript, HTML5, CSS3  
- **Authentication**: JWT tokens, bcrypt password hashing
- **Data Storage**: JSON files with automated management
- **Real-time**: WebSocket for instant updates

## 📁 Project Structure

```
volunteer_app/
├── server/
│   ├── server.js           # Main server application
│   └── dataManager.js      # Data management utilities
├── public/
│   ├── index.html          # Single page application
│   ├── script.js          # Frontend logic
│   └── styles.css         # Responsive styling
├── data/
│   ├── *.sample.json      # Safe example data structures
│   └── README.md          # Data documentation
└── package.json           # Dependencies and scripts
```

## 🔒 Security & Privacy

- All sensitive user data files are excluded from version control
- Role-based access control with secure authentication
- Automated data integrity validation and cleanup
- Safe sample data provided for development setup

## 🌐 Live Demo

Deployed at: https://bhandara-volunteer-management.onrender.com/

## 📊 API Endpoints

### Core Features
- `POST /api/register` - User registration
- `POST /api/login` - Authentication
- `GET /api/jobs` - Available opportunities
- `POST /api/jobs/:id/apply` - Apply for jobs
- `DELETE /api/applications/:id` - Withdraw applications

### Management (Departments)
- `POST /api/jobs` - Create opportunities
- `DELETE /api/jobs/:id` - Remove jobs
- `GET /api/admin/stats` - System statistics

## 💡 Environment Variables

Optional environment variables for production:

```bash
PORT=3000                    # Server port (default: 3000)
JWT_SECRET=your_secret_key   # JWT signing secret
NODE_ENV=production         # Environment mode
```

## 🚀 Deployment Platforms

### Render.com
1. Connect your GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Deploy automatically

### Heroku
```bash
git push heroku main
```

### Railway
```bash
railway login
railway link
railway up
```

## 🤝 Contributing

This is a production-ready application. For development setup or detailed documentation, please contact the maintainer.

## 📄 License

MIT License - Open source and free to use.
