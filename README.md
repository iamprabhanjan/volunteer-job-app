# Volunteer Job Application System

A comprehensive volunteer management platform that connects volunteers with departments for various community service opportunities.

## 🔒 Security & Privacy

**Important:** This repository is configured to protect user privacy:
- All actual user data files are excluded from Git
- Only safe sample data files are version controlled
- Personal information and sensitive data never appear in commit history
- Automatic data integrity validation and cleanup

## ✨ Features

- **Enhanced Security**: Role-based authentication with HFN ID validation for departments
- **Auto-Acceptance Workflow**: Volunteer applications are automatically accepted
- **Real-time Updates**: WebSocket integration for instant notifications
- **Data Management**: Comprehensive backup, archiving, and cleanup systems
- **Job Lifecycle**: Complete status management (active, completed, expired, cancelled)
- **Dynamic Operations**: Volunteers can withdraw applications, departments can remove jobs
- **Admin Dashboard**: System statistics, data integrity monitoring, and maintenance tools

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/iamprabhanjan/volunteer-job-app.git
   cd volunteer-job-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup data files**
   ```bash
   # On Windows
   setup-data.bat
   
   # On Linux/Mac  
   bash setup-data.sh
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📊 Data Management

The system includes advanced data management features:
- **Automated Backups**: Daily backups with 30-day retention
- **Job Archiving**: Old jobs automatically archived after 90 days
- **Data Validation**: Real-time integrity checking and orphaned record cleanup
- **Maintenance Routines**: Automated job status updates and cleanup

## 🛠️ API Endpoints

### Authentication
- `POST /api/register` - User registration (role-specific)
- `POST /api/login` - User authentication

### Jobs
- `GET /api/jobs` - List available jobs
- `POST /api/jobs` - Create new job (departments)
- `DELETE /api/jobs/:id` - Remove job (departments)
- `POST /api/jobs/:id/apply` - Apply for job (volunteers)

### Applications  
- `GET /api/my-applications` - User's applications
- `DELETE /api/applications/:id` - Withdraw application

### Admin (Departments Only)
- `GET /api/admin/stats` - System statistics
- `POST /api/admin/backup` - Create backup
- `POST /api/admin/cleanup-orphans` - Data cleanup

## 🎯 User Roles

### Volunteers
- Register with email/mobile only (no password required)
- Browse and apply for jobs instantly
- Withdraw applications anytime
- View contact information for accepted applications

### Departments
- Register with email, mobile, and HFN ID (password required)
- Post job requirements with detailed information
- View volunteer applications and contact details
- Remove jobs and manage lifecycle
- Access admin dashboard for system management

## 🔧 Technical Stack

- **Backend**: Node.js, Express.js, Socket.io
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Authentication**: JWT tokens, bcrypt password hashing
- **Data Storage**: JSON files (with database migration guide included)
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
│   ├── *.sample.json      # Safe example data
│   ├── README.md          # Data structure documentation
│   └── *.json            # Runtime data (git-ignored)
└── docs/
    ├── DATABASE_MIGRATION.md
    ├── DATA_MANAGEMENT.md
    └── WITHDRAW_REMOVE_FUNCTIONALITY.md
```

## 🚀 Deployment

Will be deployed at: https://bhandara-volunteer-management.onrender.com/

See `DEPLOYMENT.md` for detailed deployment instructions.

## 📖 Documentation

- [Data Management Guide](DATA_MANAGEMENT.md)
- [Database Migration Guide](DATABASE_MIGRATION.md)  
- [Withdraw/Remove Functionality](WITHDRAW_REMOVE_FUNCTIONALITY.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.
