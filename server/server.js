const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { DataManager, JobLifecycleManager } = require('./dataManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'volunteer_app_secret_key_change_in_production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Data file paths
const dataDir = path.join(__dirname, '../data');
const usersFile = path.join(dataDir, 'users.json');
const jobsFile = path.join(dataDir, 'jobs.json');
const applicationsFile = path.join(dataDir, 'applications.json');

// Initialize data managers
const dataManager = new DataManager(dataDir);
const jobLifecycleManager = new JobLifecycleManager(dataManager);

// Initialize data files if they don't exist
const initializeDataFiles = () => {
  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(jobsFile)) {
    fs.writeFileSync(jobsFile, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(applicationsFile)) {
    fs.writeFileSync(applicationsFile, JSON.stringify([], null, 2));
  }
};

// Helper functions to read/write JSON files
const readJsonFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeJsonFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Data Management Endpoints

// Get system statistics and health
app.get('/api/admin/stats', authenticateToken, (req, res) => {
  try {
    // Only departments can access admin stats
    if (req.user.role !== 'department') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stats = jobLifecycleManager.getJobStatistics();
    const dataErrors = dataManager.validateData();
    
    res.json({
      jobStats: stats,
      dataIntegrity: {
        errors: dataErrors,
        isHealthy: dataErrors.length === 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get system stats' });
  }
});

// Create data backup
app.post('/api/admin/backup', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'department') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const backupPath = await dataManager.createBackup();
    res.json({ 
      message: 'Backup created successfully',
      backupPath: path.basename(backupPath),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Backup failed' });
  }
});

// Update job statuses (lifecycle management)
app.post('/api/admin/update-job-statuses', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'department') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedCount = jobLifecycleManager.updateJobStatuses();
    res.json({ 
      message: `Updated ${updatedCount} job statuses`,
      updatedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job statuses' });
  }
});

// Cancel a job
app.post('/api/jobs/:jobId/cancel', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'department') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { jobId } = req.params;
    const { reason } = req.body;
    
    const cancelledJob = jobLifecycleManager.cancelJob(jobId, reason);
    
    // Notify via socket
    io.emit('jobCancelled', { jobId, reason });
    
    res.json({ 
      message: 'Job cancelled successfully',
      job: cancelledJob
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Archive old jobs
app.post('/api/admin/archive-jobs', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'department') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { daysOld = 90 } = req.body;
    const archivedCount = jobLifecycleManager.archiveOldJobs(daysOld);
    
    res.json({ 
      message: `Archived ${archivedCount} old jobs`,
      archivedCount,
      daysOld,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to archive jobs' });
  }
});

// Cleanup orphaned records
app.post('/api/admin/cleanup-orphans', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'department') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const cleanupCount = dataManager.cleanupOrphanedRecords();
    
    res.json({ 
      message: `Cleaned up ${cleanupCount} orphaned records`,
      cleanupCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cleanup orphaned records' });
  }
});

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role, hfnId } = req.body;
    
    // Basic validation
    if (!firstName || !lastName || !role) {
      return res.status(400).json({ error: 'First name, last name, and role are required' });
    }

    // Role-specific validation
    if (role === 'volunteer') {
      // Volunteers must provide at least email OR phone (no password required)
      if (!email && !phone) {
        return res.status(400).json({ error: 'Volunteers must provide either email or phone number' });
      }
    } else if (role === 'department') {
      // Departments must provide all fields including HFN ID and password
      if (!email || !phone || !hfnId || !password) {
        return res.status(400).json({ error: 'Departments must provide email, phone, HFN ID, and password' });
      }
      
      // Validate HFN ID format (6 letters + 3 numbers)
      const hfnPattern = /^[A-Za-z]{6}[0-9]{3}$/;
      if (!hfnPattern.test(hfnId)) {
        return res.status(400).json({ error: 'Invalid HFN ID format. Must be 6 letters followed by 3 numbers (e.g., HJABCD123)' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid role. Must be volunteer or department' });
    }

    const users = readJsonFile(usersFile);
    
    // Check for existing users based on provided identifiers
    const existingUser = users.find(user => {
      if (email && user.email === email) return true;
      if (phone && user.phone === phone) return true;
      if (hfnId && user.hfnId === hfnId.toUpperCase()) return true;
      return false;
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email, phone, or HFN ID already exists' });
    }

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      firstName,
      lastName,
      role,
      createdAt: new Date().toISOString()
    };
    
    // Add optional fields if provided
    if (email) newUser.email = email;
    if (phone) newUser.phone = phone;
    if (hfnId) newUser.hfnId = hfnId.toUpperCase();
    
    // Hash password only for departments (volunteers don't have passwords)
    if (role === 'department' && password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      newUser.password = hashedPassword;
    }

    users.push(newUser);
    writeJsonFile(usersFile, users);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    if (!identifier) {
      return res.status(400).json({ error: 'Login identifier is required' });
    }

    const users = readJsonFile(usersFile);
    
    // Find user by email, phone, or HFN ID
    const user = users.find(u => 
      u.email === identifier || 
      u.phone === identifier || 
      u.hfnId === identifier.toUpperCase()
    );

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Check password requirements based on role
    if (user.role === 'department') {
      // Departments must provide password
      if (!password) {
        return res.status(400).json({ error: 'Password is required for department login' });
      }
      
      // Verify password for departments
      if (!user.password) {
        return res.status(400).json({ error: 'Department account missing password. Please contact administrator.' });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Invalid password' });
      }
    } else if (user.role === 'volunteer') {
      // Volunteers don't need password - just identifier verification
      // If password is provided by volunteer (shouldn't happen), ignore it
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all jobs
app.get('/api/jobs', (req, res) => {
  try {
    const jobs = readJsonFile(jobsFile);
    const applications = readJsonFile(applicationsFile);
    
    // Add application count to each job (only count accepted applications)
    const jobsWithCounts = jobs.map(job => {
      const acceptedApplications = applications.filter(app => 
        app.jobId === job.id && app.status === 'accepted'
      );
      const acceptedCount = acceptedApplications.length;
      
      return { 
        ...job, 
        applicationCount: acceptedCount,
        acceptedCount,
        pendingCount: 0, // No pending applications anymore
        availableSpots: job.maxVolunteers - acceptedCount
      };
    });
    
    res.json(jobsWithCounts);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new job (Department only)
app.post('/api/jobs', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'department') {
      return res.status(403).json({ error: 'Only departments can post jobs' });
    }

    const { title, description, ageGroup, location, reportingTime, maxVolunteers, contactName, contactPhone, contactEmail } = req.body;
    
    if (!title || !description || !ageGroup || !location || !reportingTime || !contactName || !contactPhone || !contactEmail) {
      return res.status(400).json({ error: 'All job fields including contact information are required' });
    }

    const jobs = readJsonFile(jobsFile);
    
    const newJob = {
      id: Date.now().toString(),
      title,
      description,
      ageGroup,
      location,
      reportingTime,
      maxVolunteers: maxVolunteers || 1,
      contactName,
      contactPhone,
      contactEmail,
      departmentId: req.user.id,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    jobs.push(newJob);
    writeJsonFile(jobsFile, jobs);

    // Emit new job to all connected clients
    io.emit('newJob', newJob);

    res.status(201).json(newJob);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Apply for a job (Volunteer only)
app.post('/api/jobs/:jobId/apply', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'volunteer') {
      return res.status(403).json({ error: 'Only volunteers can apply for jobs' });
    }

    const { jobId } = req.params;
    const applications = readJsonFile(applicationsFile);
    const jobs = readJsonFile(jobsFile);
    
    // Check if job exists
    const job = jobs.find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if already applied
    const existingApplication = applications.find(
      app => app.jobId === jobId && app.volunteerId === req.user.id
    );

    if (existingApplication) {
      return res.status(400).json({ error: 'Already applied for this job' });
    }

    // Check if job is full (only count accepted applications)
    const acceptedApplications = applications.filter(app => 
      app.jobId === jobId && app.status === 'accepted'
    );
    
    if (acceptedApplications.length >= job.maxVolunteers) {
      return res.status(400).json({ error: 'This job is full. No more applications accepted.' });
    }

    // Automatically accept the application
    const newApplication = {
      id: Date.now().toString(),
      jobId,
      volunteerId: req.user.id,
      status: 'accepted', // Automatically accepted
      appliedAt: new Date().toISOString(),
      acceptedAt: new Date().toISOString()
    };

    applications.push(newApplication);
    writeJsonFile(applicationsFile, applications);

    res.status(201).json(newApplication);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's applications
app.get('/api/my-applications', authenticateToken, (req, res) => {
  try {
    const applications = readJsonFile(applicationsFile);
    const jobs = readJsonFile(jobsFile);
    
    const userApplications = applications
      .filter(app => app.volunteerId === req.user.id)
      .map(app => {
        const job = jobs.find(j => j.id === app.jobId);
        // Include contact info since user has applied
        return { ...app, job };
      });

    res.json(userApplications);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Withdraw application
app.delete('/api/applications/:applicationId', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'volunteer') {
      return res.status(403).json({ error: 'Only volunteers can withdraw applications' });
    }

    const { applicationId } = req.params;
    const applications = readJsonFile(applicationsFile);
    const jobs = readJsonFile(jobsFile);
    
    // Find the application
    const applicationIndex = applications.findIndex(app => 
      app.id === applicationId && app.volunteerId === req.user.id
    );
    
    if (applicationIndex === -1) {
      return res.status(404).json({ error: 'Application not found or you are not authorized to withdraw it' });
    }
    
    const application = applications[applicationIndex];
    const job = jobs.find(j => j.id === application.jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Associated job not found' });
    }
    
    // Remove the application
    applications.splice(applicationIndex, 1);
    writeJsonFile(applicationsFile, applications);
    
    // Notify via socket
    io.emit('applicationWithdrawn', {
      applicationId,
      jobId: application.jobId,
      jobTitle: job.title,
      volunteerName: `${req.user.firstName} ${req.user.lastName}`
    });
    
    res.json({ 
      message: 'Application withdrawn successfully',
      withdrawnApplication: application,
      job: { id: job.id, title: job.title }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove job (Department only)
app.delete('/api/jobs/:jobId', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'department') {
      return res.status(403).json({ error: 'Only departments can remove jobs' });
    }

    const { jobId } = req.params;
    const jobs = readJsonFile(jobsFile);
    const applications = readJsonFile(applicationsFile);
    
    // Find the job
    const jobIndex = jobs.findIndex(job => 
      job.id === jobId && job.departmentId === req.user.id
    );
    
    if (jobIndex === -1) {
      return res.status(404).json({ error: 'Job not found or you are not authorized to remove it' });
    }
    
    const job = jobs[jobIndex];
    
    // Find applications for this job
    const jobApplications = applications.filter(app => app.jobId === jobId);
    
    // Remove the job
    jobs.splice(jobIndex, 1);
    writeJsonFile(jobsFile, jobs);
    
    // Remove all applications for this job
    const remainingApplications = applications.filter(app => app.jobId !== jobId);
    writeJsonFile(applicationsFile, remainingApplications);
    
    // Notify via socket
    io.emit('jobRemoved', {
      jobId,
      jobTitle: job.title,
      affectedVolunteers: jobApplications.length,
      removedBy: `${req.user.firstName} ${req.user.lastName}`
    });
    
    res.json({ 
      message: 'Job and all associated applications removed successfully',
      removedJob: job,
      affectedApplications: jobApplications.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get job details with contact info (for users who applied)
app.get('/api/jobs/:jobId/contact', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'volunteer') {
      return res.status(403).json({ error: 'Only volunteers can access contact information' });
    }

    const { jobId } = req.params;
    const applications = readJsonFile(applicationsFile);
    const jobs = readJsonFile(jobsFile);
    
    // Check if user has applied for this job
    const userApplication = applications.find(
      app => app.jobId === jobId && app.volunteerId === req.user.id
    );

    if (!userApplication) {
      return res.status(403).json({ error: 'You must apply for this job to see contact information' });
    }

    const job = jobs.find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Return contact information
    res.json({
      contactName: job.contactName,
      contactPhone: job.contactPhone,
      contactEmail: job.contactEmail
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get jobs posted by department
app.get('/api/my-jobs', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'department') {
      return res.status(403).json({ error: 'Only departments can view their jobs' });
    }

    const jobs = readJsonFile(jobsFile);
    const applications = readJsonFile(applicationsFile);
    const users = readJsonFile(usersFile);
    
    const departmentJobs = jobs
      .filter(job => job.departmentId === req.user.id)
      .map(job => {
        const jobApplications = applications
          .filter(app => app.jobId === job.id)
          .map(app => {
            const volunteer = users.find(u => u.id === app.volunteerId);
            // Remove password from volunteer info for security
            if (volunteer) {
              const { password, ...volunteerWithoutPassword } = volunteer;
              return { ...app, volunteer: volunteerWithoutPassword };
            }
            return app;
          });
        return { ...job, applications: jobApplications };
      });

    res.json(departmentJobs);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Initialize data files and start server
initializeDataFiles();

// Automatic maintenance routines
const startMaintenanceRoutines = () => {
  // Update job statuses every hour
  setInterval(() => {
    try {
      const updatedCount = jobLifecycleManager.updateJobStatuses();
      if (updatedCount > 0) {
        console.log(`🔄 Auto-updated ${updatedCount} job statuses`);
        io.emit('jobStatusesUpdated', { count: updatedCount });
      }
    } catch (error) {
      console.error('❌ Auto job status update failed:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Clean old backups every day at 2 AM
  const cleanupBackups = () => {
    const now = new Date();
    if (now.getHours() === 2 && now.getMinutes() === 0) {
      try {
        dataManager.cleanOldBackups();
      } catch (error) {
        console.error('❌ Backup cleanup failed:', error);
      }
    }
  };
  
  setInterval(cleanupBackups, 60 * 1000); // Check every minute

  // Create daily backup at 1 AM
  const createDailyBackup = () => {
    const now = new Date();
    if (now.getHours() === 1 && now.getMinutes() === 0) {
      dataManager.createBackup()
        .then(() => console.log('✅ Daily backup completed'))
        .catch(error => console.error('❌ Daily backup failed:', error));
    }
  };

  setInterval(createDailyBackup, 60 * 1000); // Check every minute

  // Cleanup orphaned records at 3 AM daily
  const cleanupOrphans = () => {
    const now = new Date();
    if (now.getHours() === 3 && now.getMinutes() === 0) {
      try {
        const cleanupCount = dataManager.cleanupOrphanedRecords();
        if (cleanupCount > 0) {
          console.log(`🧹 Daily cleanup: removed ${cleanupCount} orphaned records`);
        }
      } catch (error) {
        console.error('❌ Orphaned record cleanup failed:', error);
      }
    }
  };

  setInterval(cleanupOrphans, 60 * 1000); // Check every minute

  console.log('🤖 Maintenance routines started');
};

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Volunteer Job Application is ready!');
  
  // Start maintenance routines after server is running
  startMaintenanceRoutines();
});