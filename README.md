# Volunteer Job Application System

A comprehensive volunteer management platform that connects volunteers with departments for various community service opportunities.

## ✨ Features

- **Enhanced Security**: Role-based authentication with HFN ID validation
- **Auto-Acceptance Workflow**: Streamlined volunteer application process  
- **Real-time Updates**: Instant notifications via WebSocket
- **Data Management**: Automated backups and integrity monitoring
- **Dynamic Operations**: Application withdrawal and job removal capabilities
- **Admin Dashboard**: System statistics and maintenance tools

##  User Roles

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

## 🔒 Security & Privacy

- All sensitive user data files are excluded from version control
- Role-based access control with secure authentication
- Automated data integrity validation and cleanup
- Safe sample data provided for development setup

## 🌐 Live Demo

Deployed at: https://bhandara-volunteer-management.onrender.com/
<Was deployed.... Now removed...>

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

##  Environment Variables

Optional environment variables for production:

```bash
PORT=3000                    # Server port (default: 3000)
JWT_SECRET=your_secret_key   # JWT signing secret
NODE_ENV=production         # Environment mode
