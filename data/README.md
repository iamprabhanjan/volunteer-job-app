# Data Directory

This directory contains the JSON data files for the volunteer application system.

## Files

### Runtime Data Files (Excluded from Git)
- `users.json` - User accounts and profiles (ignored by git)
- `jobs.json` - Job postings and lifecycle data (ignored by git)
- `applications.json` - Volunteer applications (ignored by git)

### Sample/Template Files (Safe to Commit)
- `users.sample.json` - Example user data structure
- `jobs.sample.json` - Example job data structure  
- `applications.sample.json` - Example application data structure

### Backup and Archive Directories
- `backups/` - Automated backup storage (ignored by git)
- `archives/` - Long-term job archives (ignored by git)

## Setup for Development

1. Copy the sample files to create your runtime data files:
   ```bash
   cp data/users.sample.json data/users.json
   cp data/jobs.sample.json data/jobs.json
   cp data/applications.sample.json data/applications.json
   ```

2. The application will automatically create the files if they don't exist when the server starts.

## Data Privacy

**IMPORTANT:** The actual data files (users.json, jobs.json, applications.json) are excluded from Git to protect user privacy and sensitive information. Only the sample files with safe example data are version controlled.

## Data Structure

### Users
```json
{
  "id": "unique_id",
  "firstName": "First Name",
  "lastName": "Last Name", 
  "role": "volunteer|department",
  "email": "email@example.com",
  "phone": "phone_number",
  "hfnId": "HFN_ID", // Only for departments
  "password": "hashed_password", // Only for departments
  "createdAt": "ISO_timestamp"
}
```

### Jobs
```json
{
  "id": "unique_id",
  "title": "Job Title",
  "description": "Job Description",
  "ageGroup": "Age requirement",
  "location": "Job Location",
  "reportingTime": "ISO_timestamp",
  "maxVolunteers": "number",
  "contactName": "Contact Person",
  "contactPhone": "Contact Phone",
  "contactEmail": "Contact Email", 
  "departmentId": "department_user_id",
  "status": "active|completed|expired|cancelled",
  "createdAt": "ISO_timestamp",
  "completedAt": "ISO_timestamp", // Optional
  "expiredAt": "ISO_timestamp", // Optional
  "cancelledAt": "ISO_timestamp", // Optional
  "cancellationReason": "reason" // Optional
}
```

### Applications  
```json
{
  "id": "unique_id",
  "jobId": "job_id",
  "volunteerId": "volunteer_user_id", 
  "status": "accepted", // All applications auto-accepted
  "appliedAt": "ISO_timestamp"
}
```

## Security Notes

- Passwords are hashed using bcrypt
- Personal information is never logged or exposed in client code
- Data files are backed up automatically but excluded from version control
- The system includes data integrity validation and cleanup routines