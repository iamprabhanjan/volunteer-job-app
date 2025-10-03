# Data Management & Job Lifecycle Documentation

## Overview

The volunteer application system now includes comprehensive data management and job lifecycle features designed for production use. This document outlines all the enhancements made to improve data integrity, system maintenance, and operational efficiency.

## New Features

### 1. Job Lifecycle Management

Jobs now progress through a defined lifecycle with automatic status updates:

- **Active**: Newly created jobs accepting applications
- **Completed**: Jobs with applications that have passed their reporting time
- **Expired**: Jobs past their reporting time with no applications
- **Cancelled**: Jobs manually cancelled by departments

#### Automatic Status Updates
- Runs every hour to check and update job statuses
- Based on reporting time and application status
- Real-time notifications to relevant users

### 2. Data Management System

#### Automated Backups
- **Daily Backups**: Created automatically at 1:00 AM
- **Manual Backups**: Available through admin interface
- **Backup Cleanup**: Removes backups older than 30 days
- **Archive Storage**: Dedicated backup directory structure

#### Data Archiving
- **Old Job Archiving**: Jobs completed/expired >90 days ago
- **Archive Format**: JSON files with jobs and related applications
- **Active Data Cleanup**: Maintains performance by reducing active dataset

#### Data Integrity
- **Validation Checks**: Ensures data consistency across files
- **Error Detection**: Identifies invalid records and missing references
- **Health Monitoring**: Real-time system health status

### 3. System Management Dashboard

#### Admin Interface (Department Users Only)
- **System Statistics**: Job counts, application metrics, system health
- **Backup Management**: Create backups, view backup status
- **Job Management**: View, filter, and cancel jobs
- **Real-time Updates**: Live status updates via WebSocket

#### Key Statistics Tracked
- Total jobs by status (active, completed, expired, cancelled)
- Total applications and average applications per job
- Data integrity status with error reporting
- System performance metrics

### 4. Enhanced Job Operations

#### Job Cancellation
- **Manual Cancellation**: Departments can cancel active jobs with reason
- **Automatic Notifications**: Real-time alerts to volunteers
- **Audit Trail**: Cancellation reason and timestamp tracking

#### Job Filtering & Management
- **Status-based Filtering**: View jobs by lifecycle status
- **Bulk Operations**: Efficient management of multiple jobs
- **Contact Information**: Easy access to volunteer contact details

### 5. Real-time Notifications

#### WebSocket Integration
- **Job Status Updates**: Automatic notifications for status changes
- **Job Cancellations**: Immediate alerts for cancelled jobs
- **System Maintenance**: Notifications for automated maintenance tasks

## API Endpoints

### Data Management APIs

#### System Statistics
```
GET /api/admin/stats
Authorization: Bearer <token> (Department only)
```
Returns job statistics and data integrity status.

#### Create Backup
```
POST /api/admin/backup
Authorization: Bearer <token> (Department only)
```
Creates an immediate backup of all system data.

#### Update Job Statuses
```
POST /api/admin/update-job-statuses
Authorization: Bearer <token> (Department only)
```
Manually trigger job status updates.

#### Archive Old Jobs
```
POST /api/admin/archive-jobs
Authorization: Bearer <token> (Department only)
Content-Type: application/json
Body: { "daysOld": 90 }
```
Archive jobs older than specified days.

#### Cancel Job
```
POST /api/jobs/:jobId/cancel
Authorization: Bearer <token> (Department only)
Content-Type: application/json
Body: { "reason": "Cancellation reason" }
```
Cancel an active job with reason.

## File Structure

### Data Organization
```
data/
├── users.json              # User accounts
├── jobs.json               # Job postings
├── applications.json       # Applications
├── backups/                # Automated backups
│   └── backup-YYYY-MM-DD-HH-MM-SS/
│       ├── users.json
│       ├── jobs.json
│       └── applications.json
└── archives/               # Long-term archives
    └── archived-jobs-YYYY-MM-DD-HH-MM-SS.json
```

### Server Components
```
server/
├── server.js              # Main server with enhanced APIs
└── dataManager.js         # Data management utilities
```

## Data Models

### Enhanced Job Model
```javascript
{
  "id": "string",
  "title": "string",
  "description": "string",
  "ageGroup": "string",
  "location": "string",
  "reportingTime": "ISO date string",
  "maxVolunteers": number,
  "contactName": "string",
  "contactPhone": "string",
  "contactEmail": "string",
  "departmentId": "string",
  "status": "active|completed|expired|cancelled",
  "createdAt": "ISO date string",
  "completedAt": "ISO date string", // when status changed to completed
  "expiredAt": "ISO date string",   // when status changed to expired
  "cancelledAt": "ISO date string", // when manually cancelled
  "cancellationReason": "string"   // reason for cancellation
}
```

## Maintenance Operations

### Automated Routines

1. **Hourly Job Status Updates**
   - Checks all active jobs against current time
   - Updates to completed/expired based on applications
   - Triggers real-time notifications

2. **Daily Backup Creation**
   - Runs at 1:00 AM daily
   - Creates timestamped backup directory
   - Copies all data files safely

3. **Daily Backup Cleanup**
   - Runs at 2:00 AM daily  
   - Removes backups older than 30 days
   - Maintains manageable backup storage

### Manual Operations

1. **System Statistics Review**
   - Access via admin dashboard
   - Monitor data integrity
   - Track system performance

2. **Manual Backup Creation**
   - Available anytime for departments
   - Useful before major operations
   - Provides immediate data protection

3. **Job Lifecycle Management**
   - Cancel jobs as needed
   - Archive old jobs manually
   - Filter and manage job status

## Security & Access Control

### Role-based Access
- **Data Management APIs**: Department users only
- **System Statistics**: Department users only
- **Job Cancellation**: Job owner (department) only
- **Backup Operations**: Department users only

### Data Protection
- **Backup Encryption**: Files stored securely
- **Access Logging**: Admin operations logged
- **Integrity Validation**: Regular data consistency checks

## Performance Optimizations

### Data Efficiency
- **Automatic Archiving**: Reduces active dataset size
- **Backup Cleanup**: Prevents storage bloat
- **Status Caching**: Efficient job status queries

### Real-time Updates
- **WebSocket Optimization**: Targeted notifications
- **Batch Operations**: Efficient bulk updates
- **Background Processing**: Non-blocking maintenance

## Monitoring & Alerts

### Health Checks
- **Data Integrity**: Validates JSON structure and references
- **File System**: Monitors backup and archive directories
- **System Performance**: Tracks response times and operations

### Notification System
- **Real-time WebSocket**: Immediate user notifications
- **Console Logging**: Server-side operation tracking
- **Error Reporting**: Comprehensive error handling

## Future Enhancements

### Database Migration
- **SQLite Integration**: For better performance and ACID compliance
- **PostgreSQL Support**: For enterprise-scale deployments
- **Migration Scripts**: Seamless transition from JSON storage

### Advanced Features
- **Audit Trails**: Complete operation history
- **Advanced Analytics**: Usage patterns and trends
- **Automated Reporting**: Regular system health reports

## Troubleshooting

### Common Issues

1. **Backup Failures**
   - Check file permissions in data directory
   - Ensure sufficient disk space
   - Verify backup directory exists

2. **Job Status Update Issues**
   - Check system time synchronization
   - Verify job reporting time format
   - Review application status consistency

3. **Archive Operations**
   - Confirm date calculations
   - Check archive directory permissions
   - Verify JSON file integrity

### Logs & Debugging
- Server console shows maintenance operations
- WebSocket events logged for real-time features
- Error messages include context for troubleshooting

This comprehensive data management system transforms the volunteer application from a simple prototype to a production-ready system with proper lifecycle management, data integrity, and operational efficiency.