const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

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

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;
    
    if (!email || !password || !firstName || !lastName || !phone || !role) {
      return res.status(400).json({ error: 'All fields including phone number are required' });
    }

    const users = readJsonFile(usersFile);
    
    // Check if user already exists
    if (users.find(user => user.email === email)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role, // 'volunteer' or 'department'
      createdAt: new Date().toISOString()
    };

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
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = readJsonFile(usersFile);
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
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
    
    // Add application count to each job (only count pending and accepted applications)
    const jobsWithCounts = jobs.map(job => {
      const activeApplications = applications.filter(app => 
        app.jobId === job.id && (app.status === 'pending' || app.status === 'accepted')
      );
      const applicationCount = activeApplications.length;
      const acceptedCount = applications.filter(app => 
        app.jobId === job.id && app.status === 'accepted'
      ).length;
      const pendingCount = applications.filter(app => 
        app.jobId === job.id && app.status === 'pending'
      ).length;
      
      return { 
        ...job, 
        applicationCount, 
        acceptedCount,
        pendingCount,
        availableSpots: job.maxVolunteers - applicationCount
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

    // Check if already applied (including rejected applications)
    const existingApplication = applications.find(
      app => app.jobId === jobId && app.volunteerId === req.user.id
    );

    if (existingApplication) {
      if (existingApplication.status === 'rejected') {
        return res.status(400).json({ error: 'Your previous application was rejected. You cannot reapply for this job.' });
      }
      return res.status(400).json({ error: 'Already applied for this job' });
    }

    // Check if job is full (only count pending and accepted applications)
    const activeApplications = applications.filter(app => 
      app.jobId === jobId && (app.status === 'pending' || app.status === 'accepted')
    );
    
    if (activeApplications.length >= job.maxVolunteers) {
      return res.status(400).json({ error: 'This job is full. No more applications accepted.' });
    }

    const newApplication = {
      id: Date.now().toString(),
      jobId,
      volunteerId: req.user.id,
      status: 'pending',
      appliedAt: new Date().toISOString()
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

// Update application status (Department only)
app.put('/api/applications/:applicationId/status', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'department') {
      return res.status(403).json({ error: 'Only departments can update application status' });
    }

    const { applicationId } = req.params;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "accepted" or "rejected"' });
    }

    const applications = readJsonFile(applicationsFile);
    const jobs = readJsonFile(jobsFile);
    
    const applicationIndex = applications.findIndex(app => app.id === applicationId);
    if (applicationIndex === -1) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = applications[applicationIndex];
    
    // Verify the job belongs to this department
    const job = jobs.find(j => j.id === application.jobId && j.departmentId === req.user.id);
    if (!job) {
      return res.status(403).json({ error: 'You can only update applications for your own jobs' });
    }

    // Update application status
    applications[applicationIndex].status = status;
    applications[applicationIndex].updatedAt = new Date().toISOString();

    writeJsonFile(applicationsFile, applications);

    res.json({ message: 'Application status updated successfully' });
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

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Volunteer Job Application is ready!');
});