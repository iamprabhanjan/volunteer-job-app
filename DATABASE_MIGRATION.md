# Database Migration Guide

## Current State: JSON File Storage

The application currently uses JSON files for data storage:
- `data/users.json` - User accounts and profiles
- `data/jobs.json` - Job postings and lifecycle data  
- `data/applications.json` - Volunteer applications
- `data/backups/` - Automated backup storage
- `data/archives/` - Long-term job archives

## Migration Options

### Option 1: SQLite (Recommended for Small-Medium Scale)

**Pros:**
- File-based, no server setup required
- ACID transactions
- Better performance than JSON
- SQL query capabilities
- Easy backup and migration

**Implementation:**
```bash
npm install sqlite3 sequelize
```

**Schema Example:**
```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL,
    hfn_id VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table  
CREATE TABLE jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    age_group VARCHAR(50),
    location VARCHAR(255),
    reporting_time DATETIME,
    max_volunteers INTEGER DEFAULT 1,
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    department_id INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    expired_at DATETIME,
    cancelled_at DATETIME,
    cancellation_reason TEXT,
    FOREIGN KEY (department_id) REFERENCES users(id)
);

-- Applications table
CREATE TABLE applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    volunteer_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'accepted',
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id),
    FOREIGN KEY (volunteer_id) REFERENCES users(id)
);
```

### Option 2: PostgreSQL (Recommended for Large Scale)

**Pros:**
- Enterprise-grade database
- Advanced features (JSON columns, full-text search)
- Excellent performance and scalability
- Strong consistency

**Implementation:**
```bash
npm install pg sequelize
```

### Option 3: MongoDB (Document-based)

**Pros:**
- Natural fit for current JSON structure
- Flexible schema
- Good for rapid development

**Implementation:**
```bash
npm install mongoose
```

## Migration Strategy

### Phase 1: Dual-Write Setup
1. Install database dependencies
2. Create database models
3. Implement dual-write (JSON + Database)
4. Migrate existing JSON data
5. Verify data consistency

### Phase 2: Database-First
1. Switch reads to database
2. Keep JSON as backup
3. Test thoroughly
4. Remove JSON dependencies

### Phase 3: Cleanup
1. Remove JSON file operations
2. Implement database-native features
3. Optimize queries and indexes

## Data Migration Script Template

```javascript
const fs = require('fs');
const path = require('path');

async function migrateJsonToDatabase() {
    try {
        // Read existing JSON data
        const users = JSON.parse(fs.readFileSync('./data/users.json', 'utf8'));
        const jobs = JSON.parse(fs.readFileSync('./data/jobs.json', 'utf8'));
        const applications = JSON.parse(fs.readFileSync('./data/applications.json', 'utf8'));
        
        // Migrate users
        for (const user of users) {
            await User.create({
                id: user.id,
                email: user.email,
                password_hash: user.password,
                first_name: user.firstName,
                last_name: user.lastName,
                phone: user.phone,
                role: user.role,
                hfn_id: user.hfnId,
                created_at: user.createdAt || new Date()
            });
        }
        
        // Migrate jobs
        for (const job of jobs) {
            await Job.create({
                id: job.id,
                title: job.title,
                description: job.description,
                age_group: job.ageGroup,
                location: job.location,
                reporting_time: new Date(job.reportingTime),
                max_volunteers: job.maxVolunteers,
                contact_name: job.contactName,
                contact_phone: job.contactPhone,
                contact_email: job.contactEmail,
                department_id: job.departmentId,
                status: job.status,
                created_at: new Date(job.createdAt),
                completed_at: job.completedAt ? new Date(job.completedAt) : null,
                expired_at: job.expiredAt ? new Date(job.expiredAt) : null,
                cancelled_at: job.cancelledAt ? new Date(job.cancelledAt) : null,
                cancellation_reason: job.cancellationReason
            });
        }
        
        // Migrate applications
        for (const app of applications) {
            await Application.create({
                id: app.id,
                job_id: app.jobId,
                volunteer_id: app.volunteerId,
                status: app.status,
                applied_at: new Date(app.appliedAt)
            });
        }
        
        console.log('✅ Migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}
```

## Performance Optimizations

### Indexes
```sql
-- Performance indexes
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_reporting_time ON jobs(reporting_time);
CREATE INDEX idx_jobs_department_id ON jobs(department_id);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_volunteer_id ON applications(volunteer_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### Connection Pooling
```javascript
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite', // or 'postgres'
    storage: './data/volunteer_app.db', // for SQLite
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    logging: false // Set to console.log for debugging
});
```

## Backup Strategy for Database

### SQLite Backup
```javascript
const fs = require('fs');
const path = require('path');

function backupSQLite() {
    const sourceDb = './data/volunteer_app.db';
    const backupPath = `./data/backups/backup-${Date.now()}.db`;
    
    fs.copyFileSync(sourceDb, backupPath);
    console.log(`✅ Database backup created: ${backupPath}`);
}
```

### PostgreSQL Backup
```bash
# Automated backup script
pg_dump -h localhost -U username -d volunteer_app > ./data/backups/backup-$(date +%Y%m%d_%H%M%S).sql
```

## Monitoring and Maintenance

### Database Health Checks
```javascript
async function checkDatabaseHealth() {
    try {
        await sequelize.authenticate();
        
        const stats = {
            userCount: await User.count(),
            activeJobs: await Job.count({ where: { status: 'active' } }),
            totalApplications: await Application.count(),
            dbSize: await getDatabaseSize()
        };
        
        return { healthy: true, stats };
    } catch (error) {
        return { healthy: false, error: error.message };
    }
}
```

## Rollback Plan

1. **Immediate Rollback**: Switch back to JSON files
2. **Data Export**: Export database data back to JSON format
3. **Verification**: Ensure data integrity
4. **Service Restoration**: Resume normal operations

This migration guide provides a comprehensive path to move from JSON file storage to a proper database while maintaining data integrity and system functionality.