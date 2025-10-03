// Data Management and Job Lifecycle Utilities
// This file contains utilities for managing data persistence and job lifecycles

const fs = require('fs');
const path = require('path');

class DataManager {
    constructor(dataDir = './data') {
        this.dataDir = dataDir;
        this.backupDir = path.join(dataDir, 'backups');
        this.initializeDirectories();
    }

    initializeDirectories() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    // Backup data with timestamp
    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFolder = path.join(this.backupDir, `backup-${timestamp}`);
        
        try {
            fs.mkdirSync(backupFolder, { recursive: true });
            
            const files = ['users.json', 'jobs.json', 'applications.json'];
            for (const file of files) {
                const sourcePath = path.join(this.dataDir, file);
                const backupPath = path.join(backupFolder, file);
                
                if (fs.existsSync(sourcePath)) {
                    fs.copyFileSync(sourcePath, backupPath);
                }
            }
            
            console.log(`✅ Backup created: ${backupFolder}`);
            return backupFolder;
        } catch (error) {
            console.error('❌ Backup failed:', error);
            throw error;
        }
    }

    // Clean old backups (keep last 30 days)
    cleanOldBackups(daysToKeep = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            const backups = fs.readdirSync(this.backupDir);
            let deletedCount = 0;
            
            for (const backup of backups) {
                const backupPath = path.join(this.backupDir, backup);
                const stats = fs.statSync(backupPath);
                
                if (stats.isDirectory() && stats.mtime < cutoffDate) {
                    fs.rmSync(backupPath, { recursive: true });
                    deletedCount++;
                }
            }
            
            console.log(`🧹 Cleaned ${deletedCount} old backups`);
        } catch (error) {
            console.error('❌ Backup cleanup failed:', error);
        }
    }

    // Validate data integrity
    validateData() {
        const errors = [];
        
        try {
            // Read all data
            const users = this.readJsonFile('users.json');
            const jobs = this.readJsonFile('jobs.json');
            const applications = this.readJsonFile('applications.json');
            
            // Create lookup maps
            const userIds = new Set(users.map(u => u.id));
            const jobIds = new Set(jobs.map(j => j.id));
            
            // Check users data
            for (const user of users) {
                if (!user.id || !user.firstName || !user.lastName || !user.role) {
                    errors.push(`Invalid user record: ${JSON.stringify(user)}`);
                }
            }
            
            // Check jobs data
            for (const job of jobs) {
                if (!job.id || !job.title || !job.departmentId || !job.reportingTime) {
                    errors.push(`Invalid job record: ${JSON.stringify(job)}`);
                }
                
                // Check if department exists
                if (!userIds.has(job.departmentId)) {
                    errors.push(`Job ${job.id} references non-existent department: ${job.departmentId}`);
                }
                
                // Check if reporting time is in the past for active jobs
                if (job.status === 'active' && new Date(job.reportingTime) < new Date()) {
                    errors.push(`Active job ${job.id} has past reporting time: ${job.reportingTime}`);
                }
            }
            
            // Check applications data
            for (const app of applications) {
                if (!app.id || !app.jobId || !app.volunteerId) {
                    errors.push(`Invalid application record: ${JSON.stringify(app)}`);
                }
                
                // Check for orphaned applications (job or volunteer doesn't exist)
                if (!jobIds.has(app.jobId)) {
                    errors.push(`Application ${app.id} references non-existent job: ${app.jobId}`);
                }
                
                if (!userIds.has(app.volunteerId)) {
                    errors.push(`Application ${app.id} references non-existent volunteer: ${app.volunteerId}`);
                }
            }
            
            return errors;
        } catch (error) {
            errors.push(`Data validation error: ${error.message}`);
            return errors;
        }
    }

    // Clean up orphaned records
    cleanupOrphanedRecords() {
        try {
            const users = this.readJsonFile('users.json');
            const jobs = this.readJsonFile('jobs.json');
            const applications = this.readJsonFile('applications.json');
            
            const userIds = new Set(users.map(u => u.id));
            const jobIds = new Set(jobs.map(j => j.id));
            
            let cleanupCount = 0;
            
            // Remove applications for non-existent jobs or volunteers
            const validApplications = applications.filter(app => {
                const isValid = jobIds.has(app.jobId) && userIds.has(app.volunteerId);
                if (!isValid) cleanupCount++;
                return isValid;
            });
            
            // Remove jobs from non-existent departments
            const validJobs = jobs.filter(job => {
                const isValid = userIds.has(job.departmentId);
                if (!isValid) cleanupCount++;
                return isValid;
            });
            
            // Write cleaned data back
            if (cleanupCount > 0) {
                this.writeJsonFile('applications.json', validApplications);
                this.writeJsonFile('jobs.json', validJobs);
                console.log(`🧹 Cleaned up ${cleanupCount} orphaned records`);
            }
            
            return cleanupCount;
        } catch (error) {
            console.error('❌ Orphaned record cleanup failed:', error);
            return 0;
        }
    }

    readJsonFile(filename) {
        try {
            const filePath = path.join(this.dataDir, filename);
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    writeJsonFile(filename, data) {
        const filePath = path.join(this.dataDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
}

class JobLifecycleManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }

    // Update job statuses based on time and conditions
    updateJobStatuses() {
        const jobs = this.dataManager.readJsonFile('jobs.json');
        const applications = this.dataManager.readJsonFile('applications.json');
        let updatedJobs = [];
        let changesCount = 0;

        for (const job of jobs) {
            const originalStatus = job.status;
            const reportingTime = new Date(job.reportingTime);
            const now = new Date();
            
            // Check if job should be marked as completed or expired
            if (job.status === 'active') {
                if (reportingTime < now) {
                    // Job reporting time has passed
                    const jobApplications = applications.filter(app => 
                        app.jobId === job.id && app.status === 'accepted'
                    );
                    
                    if (jobApplications.length > 0) {
                        job.status = 'completed';
                        job.completedAt = now.toISOString();
                    } else {
                        job.status = 'expired';
                        job.expiredAt = now.toISOString();
                    }
                    changesCount++;
                }
            }
            
            updatedJobs.push(job);
        }

        if (changesCount > 0) {
            this.dataManager.writeJsonFile('jobs.json', updatedJobs);
            console.log(`📅 Updated ${changesCount} job statuses`);
        }

        return changesCount;
    }

    // Get job statistics
    getJobStatistics() {
        const jobs = this.dataManager.readJsonFile('jobs.json');
        const applications = this.dataManager.readJsonFile('applications.json');
        
        const stats = {
            total: jobs.length,
            active: 0,
            completed: 0,
            expired: 0,
            cancelled: 0,
            totalApplications: applications.length,
            averageApplicationsPerJob: 0
        };

        for (const job of jobs) {
            stats[job.status] = (stats[job.status] || 0) + 1;
        }

        if (jobs.length > 0) {
            stats.averageApplicationsPerJob = Math.round(applications.length / jobs.length * 100) / 100;
        }

        return stats;
    }

    // Archive old completed/expired jobs
    archiveOldJobs(daysOld = 90) {
        const jobs = this.dataManager.readJsonFile('jobs.json');
        const applications = this.dataManager.readJsonFile('applications.json');
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        const jobsToArchive = jobs.filter(job => {
            const jobDate = new Date(job.completedAt || job.expiredAt || job.createdAt);
            return (job.status === 'completed' || job.status === 'expired') && jobDate < cutoffDate;
        });

        if (jobsToArchive.length === 0) {
            console.log('📦 No jobs to archive');
            return 0;
        }

        // Create archive
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveDir = path.join(this.dataManager.dataDir, 'archives');
        
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }

        const archiveFile = path.join(archiveDir, `archived-jobs-${timestamp}.json`);
        
        // Get applications for archived jobs
        const archivedJobIds = jobsToArchive.map(job => job.id);
        const archivedApplications = applications.filter(app => 
            archivedJobIds.includes(app.jobId)
        );

        const archiveData = {
            archivedAt: new Date().toISOString(),
            jobs: jobsToArchive,
            applications: archivedApplications
        };

        fs.writeFileSync(archiveFile, JSON.stringify(archiveData, null, 2));

        // Remove archived jobs and applications from active data
        const remainingJobs = jobs.filter(job => !archivedJobIds.includes(job.id));
        const remainingApplications = applications.filter(app => 
            !archivedJobIds.includes(app.jobId)
        );

        this.dataManager.writeJsonFile('jobs.json', remainingJobs);
        this.dataManager.writeJsonFile('applications.json', remainingApplications);

        console.log(`📦 Archived ${jobsToArchive.length} old jobs to ${archiveFile}`);
        return jobsToArchive.length;
    }

    // Cancel a job
    cancelJob(jobId, reason = 'Cancelled by department') {
        const jobs = this.dataManager.readJsonFile('jobs.json');
        const jobIndex = jobs.findIndex(job => job.id === jobId);
        
        if (jobIndex === -1) {
            throw new Error('Job not found');
        }

        if (jobs[jobIndex].status !== 'active') {
            throw new Error('Only active jobs can be cancelled');
        }

        jobs[jobIndex].status = 'cancelled';
        jobs[jobIndex].cancelledAt = new Date().toISOString();
        jobs[jobIndex].cancellationReason = reason;

        this.dataManager.writeJsonFile('jobs.json', jobs);
        
        console.log(`❌ Job ${jobId} cancelled: ${reason}`);
        return jobs[jobIndex];
    }
}

module.exports = {
    DataManager,
    JobLifecycleManager
};