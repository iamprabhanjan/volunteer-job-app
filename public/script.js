// Global variables
let currentUser = null;
let socket = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        showDashboard();
        connectSocket();
    } else {
        showAuthSection();
    }

    // Event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Navigation
    document.getElementById('loginBtn').addEventListener('click', () => showLoginForm());
    document.getElementById('registerBtn').addEventListener('click', () => showRegisterForm());
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Auth forms
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm();
    });
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });
    
    // Form submissions
    document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
    document.getElementById('jobFormElement').addEventListener('submit', handleJobSubmission);
    
    // Registration form field toggle
    document.getElementById('registerRole').addEventListener('change', toggleRegistrationFields);
    
    // Dashboard buttons
    document.getElementById('showJobForm').addEventListener('click', () => {
        document.getElementById('jobForm').style.display = 'block';
    });
    document.getElementById('cancelJobForm').addEventListener('click', () => {
        document.getElementById('jobForm').style.display = 'none';
        document.getElementById('jobFormElement').reset();
    });
    document.getElementById('showMyApplications').addEventListener('click', showMyApplications);
    document.getElementById('backToJobs').addEventListener('click', showAvailableJobs);
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const identifier = document.getElementById('loginIdentifier').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ identifier, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            showNotification('Login successful!', 'success');
            showDashboard();
            connectSocket();
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

// Toggle registration fields based on role selection
function toggleRegistrationFields() {
    const role = document.getElementById('registerRole').value;
    const volunteerFields = document.getElementById('volunteerFields');
    const departmentFields = document.getElementById('departmentFields');
    
    if (role === 'volunteer') {
        volunteerFields.style.display = 'block';
        departmentFields.style.display = 'none';
        
        // Clear department fields
        document.getElementById('registerDepartmentEmail').value = '';
        document.getElementById('registerDepartmentPhone').value = '';
        document.getElementById('registerHfnId').value = '';
        document.getElementById('registerDepartmentPassword').value = '';
        
        // Remove required from department fields
        document.getElementById('registerDepartmentEmail').removeAttribute('required');
        document.getElementById('registerDepartmentPhone').removeAttribute('required');
        document.getElementById('registerHfnId').removeAttribute('required');
        document.getElementById('registerDepartmentPassword').removeAttribute('required');
        
    } else if (role === 'department') {
        volunteerFields.style.display = 'none';
        departmentFields.style.display = 'block';
        
        // Clear volunteer fields
        document.getElementById('registerVolunteerEmail').value = '';
        document.getElementById('registerVolunteerPhone').value = '';
        
        // Add required to department fields
        document.getElementById('registerDepartmentEmail').setAttribute('required', 'required');
        document.getElementById('registerDepartmentPhone').setAttribute('required', 'required');
        document.getElementById('registerHfnId').setAttribute('required', 'required');
        document.getElementById('registerDepartmentPassword').setAttribute('required', 'required');
        
    } else {
        volunteerFields.style.display = 'none';
        departmentFields.style.display = 'none';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('registerFirstName').value;
    const lastName = document.getElementById('registerLastName').value;
    const role = document.getElementById('registerRole').value;
    
    let registrationData = { firstName, lastName, role };
    
    // Validate based on role
    if (role === 'volunteer') {
        const email = document.getElementById('registerVolunteerEmail').value;
        const phone = document.getElementById('registerVolunteerPhone').value;
        
        // Volunteer must provide at least email OR phone
        if (!email && !phone) {
            showNotification('Please provide either email or mobile number', 'error');
            return;
        }
        
        if (email) registrationData.email = email;
        if (phone) registrationData.phone = phone;
        // No password required for volunteers
        
    } else if (role === 'department') {
        const email = document.getElementById('registerDepartmentEmail').value;
        const phone = document.getElementById('registerDepartmentPhone').value;
        const hfnId = document.getElementById('registerHfnId').value;
        const password = document.getElementById('registerDepartmentPassword').value;
        
        // Validate HFN ID format
        const hfnPattern = /^[A-Za-z]{6}[0-9]{3}$/;
        if (!hfnPattern.test(hfnId)) {
            showNotification('HFN ID must be 6 letters followed by 3 numbers (e.g., HJABCD123)', 'error');
            return;
        }
        
        if (!password) {
            showNotification('Password is required for departments', 'error');
            return;
        }
        
        registrationData.email = email;
        registrationData.phone = phone;
        registrationData.hfnId = hfnId.toUpperCase();
        registrationData.password = password;
    } else {
        showNotification('Please select a role', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registrationData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Registration successful! Please login.', 'success');
            showLoginForm();
            document.getElementById('registerFormElement').reset();
        } else {
            showNotification(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    if (socket) {
        socket.disconnect();
    }
    showAuthSection();
    showNotification('Logged out successfully', 'info');
}

// Socket connection
function connectSocket() {
    socket = io();
    
    socket.on('newJob', (job) => {
        if (currentUser.role === 'volunteer') {
            showNotification('New volunteer opportunity available!', 'info');
            loadAvailableJobs();
        }
    });
    
    socket.on('jobStatusesUpdated', (data) => {
        if (currentUser.role === 'department') {
            showSocketNotification(`🔄 ${data.count} job statuses updated automatically`);
            // Refresh dashboard if viewing job management
            if (document.querySelector('.job-management-container')) {
                showJobManagement();
            }
        }
    });
    
    socket.on('jobCancelled', (data) => {
        if (currentUser.role === 'volunteer') {
            showNotification(`Job cancelled: ${data.reason}`, 'warning');
            loadAvailableJobs();
        } else if (currentUser.role === 'department') {
            // Refresh department jobs
            loadDepartmentJobs();
        }
    });
    
    socket.on('applicationWithdrawn', (data) => {
        if (currentUser.role === 'department') {
            showSocketNotification(`${data.volunteerName} withdrew application from "${data.jobTitle}"`);
            // Refresh department jobs to update application counts
            loadDepartmentJobs();
        } else if (currentUser.role === 'volunteer') {
            // Refresh available jobs in case spots opened up
            loadAvailableJobs();
        }
    });
    
    socket.on('jobRemoved', (data) => {
        if (currentUser.role === 'volunteer') {
            showNotification(`Job "${data.jobTitle}" has been removed by the department`, 'warning');
            // Refresh available jobs and applications
            loadAvailableJobs();
            if (document.getElementById('applicationsList')) {
                loadMyApplications();
            }
        } else if (currentUser.role === 'department') {
            showSocketNotification(`Job "${data.jobTitle}" removed by ${data.removedBy}. ${data.affectedVolunteers} volunteers affected.`);
        }
    });
}

// UI Navigation
function showAuthSection() {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('nav-buttons').style.display = 'flex';
    document.getElementById('user-info').style.display = 'none';
    showLoginForm();
}

function showDashboard() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.getElementById('nav-buttons').style.display = 'none';
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('userName').textContent = `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})`;
    
    if (currentUser.role === 'department') {
        document.getElementById('departmentDashboard').style.display = 'block';
        document.getElementById('volunteerDashboard').style.display = 'none';
        loadDepartmentJobs();
    } else {
        document.getElementById('departmentDashboard').style.display = 'none';
        document.getElementById('volunteerDashboard').style.display = 'block';
        loadAvailableJobs();
    }
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showMyApplications() {
    document.getElementById('availableJobs').style.display = 'none';
    document.getElementById('myApplications').style.display = 'block';
    loadMyApplications();
}

function showAvailableJobs() {
    document.getElementById('availableJobs').style.display = 'block';
    document.getElementById('myApplications').style.display = 'none';
}

// Job management
async function handleJobSubmission(e) {
    e.preventDefault();
    
    const jobData = {
        title: document.getElementById('jobTitle').value,
        description: document.getElementById('jobDescription').value,
        ageGroup: document.getElementById('jobAgeGroup').value,
        location: document.getElementById('jobLocation').value,
        reportingTime: document.getElementById('jobReportingTime').value,
        maxVolunteers: document.getElementById('jobMaxVolunteers').value,
        contactName: document.getElementById('jobContactName').value,
        contactPhone: document.getElementById('jobContactPhone').value,
        contactEmail: document.getElementById('jobContactEmail').value
    };
    
    try {
        const response = await fetch('/api/jobs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(jobData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Job posted successfully!', 'success');
            document.getElementById('jobForm').style.display = 'none';
            document.getElementById('jobFormElement').reset();
            loadDepartmentJobs();
        } else {
            showNotification(data.error || 'Failed to post job', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

async function loadAvailableJobs() {
    try {
        const [jobsResponse, applicationsResponse] = await Promise.all([
            fetch('/api/jobs'),
            fetch('/api/my-applications', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
        ]);
        
        const jobs = await jobsResponse.json();
        const myApplications = applicationsResponse.ok ? await applicationsResponse.json() : [];
        
        const jobsList = document.getElementById('jobsList');
        
        if (jobs.length === 0) {
            jobsList.innerHTML = '<div class="empty-state"><h3>No jobs available</h3><p>Check back later for new opportunities!</p></div>';
            return;
        }
        
        // Add application status to each job for the current user
        const jobsWithUserStatus = jobs.map(job => {
            const userApplication = myApplications.find(app => app.jobId === job.id);
            return { ...job, userApplication };
        });
        
        jobsList.innerHTML = jobsWithUserStatus.map(job => createJobCard(job)).join('');
    } catch (error) {
        showNotification('Failed to load jobs', 'error');
    }
}

async function loadDepartmentJobs() {
    try {
        const response = await fetch('/api/my-jobs', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const jobs = await response.json();
        
        const jobsList = document.getElementById('departmentJobsList');
        
        if (jobs.length === 0) {
            jobsList.innerHTML = '<div class="empty-state"><h3>No jobs posted</h3><p>Post your first volunteer opportunity!</p></div>';
            return;
        }
        
        jobsList.innerHTML = jobs.map(job => createDepartmentJobCard(job)).join('');
        
        // Return success
        return Promise.resolve();
    } catch (error) {
        showNotification('Failed to load your jobs', 'error');
        return Promise.reject(error);
    }
}

async function loadMyApplications() {
    try {
        const response = await fetch('/api/my-applications', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const applications = await response.json();
        
        const applicationsList = document.getElementById('applicationsList');
        
        if (applications.length === 0) {
            applicationsList.innerHTML = '<div class="empty-state"><h3>No applications yet</h3><p>Apply for some volunteer opportunities!</p></div>';
            return;
        }
        
        applicationsList.innerHTML = applications.map(app => createApplicationCard(app)).join('');
    } catch (error) {
        showNotification('Failed to load applications', 'error');
    }
}

async function applyForJob(jobId) {
    try {
        const response = await fetch(`/api/jobs/${jobId}/apply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Application submitted successfully!', 'success');
            loadAvailableJobs(); // Refresh jobs list
        } else {
            showNotification(data.error || 'Failed to apply', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

// UI Helper functions
function getJobActionButton(job, isFull, availableSpots) {
    // Check if user has applied for this job
    if (job.userApplication) {
        // All applications are automatically accepted
        return `<button class="btn btn-success" disabled>✓ Applied & Accepted</button>`;
    }
    
    // If no application exists, show apply button or full message
    if (isFull) {
        return `<button class="btn btn-secondary" disabled>Job Full</button>`;
    } else {
        return `<button class="btn btn-success" onclick="applyForJob('${job.id}')">Apply Now</button>`;
    }
}

function getApplicationActionButtons(application) {
    // Applications are automatically accepted - no action buttons needed
    return `<div class="status-indicator accepted">✓ Accepted</div>`;
}

function createJobCard(job) {
    const reportingDate = new Date(job.reportingTime).toLocaleString();
    const applicationCount = job.applicationCount || 0;
    const acceptedCount = job.acceptedCount || 0;
    const pendingCount = job.pendingCount || 0;
    const availableSpots = job.availableSpots || (job.maxVolunteers - applicationCount);
    const isFull = availableSpots <= 0;
    
    // Enhanced status indicators
    let userStatusIndicator = '';
    let cardClass = 'job-card';
    
    if (job.userApplication) {
        userStatusIndicator = `<div class="user-status-indicator status-accepted">✓ Applied & Accepted</div>`;
        cardClass += ` has-application status-accepted`;
    }
    
    // Urgency indicator based on available spots
    let urgencyBadge = '';
    if (!isFull && availableSpots <= 2) {
        urgencyBadge = '<span class="urgency-badge urgent">⚡ Urgent - Few spots left!</span>';
    } else if (!isFull && availableSpots <= 5) {
        urgencyBadge = '<span class="urgency-badge moderate">⏰ Filling fast</span>';
    }
    
    return `
        <div class="${cardClass}">
            ${userStatusIndicator}
            <div class="job-header">
                <div class="job-title">
                    ${job.title}
                    ${urgencyBadge}
                </div>
                <div class="job-stats">
                    <div class="stat-box accepted">
                        <span class="stat-number">${acceptedCount}</span>
                        <span class="stat-label">Volunteers</span>
                    </div>
                    <div class="stat-box available ${isFull ? 'full' : ''}">
                        <span class="stat-number">${isFull ? '0' : availableSpots}</span>
                        <span class="stat-label">${isFull ? 'Full' : 'Available'}</span>
                    </div>
                </div>
            </div>
            
            <div class="job-details-grid">
                <div class="detail-item">
                    <div class="detail-icon">👥</div>
                    <div class="detail-content">
                        <strong>Age Group</strong>
                        <span>${job.ageGroup}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-icon">📍</div>
                    <div class="detail-content">
                        <strong>Location</strong>
                        <span>${job.location}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-icon">⏰</div>
                    <div class="detail-content">
                        <strong>Reporting Time</strong>
                        <span>${reportingDate}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-icon">👥</div>
                    <div class="detail-content">
                        <strong>Total Positions</strong>
                        <span>${job.maxVolunteers}</span>
                    </div>
                </div>
            </div>
            
            <div class="job-description-enhanced">
                <h4>📋 Description</h4>
                <p>${job.description}</p>
            </div>
            
            <div class="job-actions-enhanced">
                ${getJobActionButton(job, isFull, availableSpots)}
            </div>
        </div>
    `;
}

function createDepartmentJobCard(job) {
    const reportingDate = new Date(job.reportingTime).toLocaleString();
    const applications = job.applications || [];
    const acceptedCount = applications.length; // All applications are accepted
    const availableSpots = job.maxVolunteers - acceptedCount;
    
    let applicationsSection = '';
    if (job.applications && job.applications.length > 0) {
        applicationsSection = `
            <div class="dept-applications-detailed">
                <h4>👥 Accepted Volunteers (${acceptedCount})</h4>
                ${job.applications.map(app => `
                    <div class="dept-application-card application-accepted">
                        <div class="applicant-header">
                            <div class="applicant-info">
                                <div class="applicant-name">
                                    <strong>${app.volunteer.firstName} ${app.volunteer.lastName}</strong>
                                    <span class="status-badge status-accepted">✓ Accepted</span>
                                </div>
                                <div class="application-meta">
                                    <small>Applied & Accepted: ${new Date(app.appliedAt).toLocaleDateString()} at ${new Date(app.appliedAt).toLocaleTimeString()}</small>
                                </div>
                            </div>
                        </div>
                        <div class="applicant-contact">
                            <div class="contact-row">
                                <div class="contact-item">
                                    <span class="contact-icon">📧</span>
                                    <a href="mailto:${app.volunteer.email || 'N/A'}" class="contact-link">
                                        ${app.volunteer.email || 'Email not provided'}
                                    </a>
                                </div>
                                <div class="contact-item">
                                    <span class="contact-icon">📱</span>
                                    <a href="tel:${app.volunteer.phone || 'N/A'}" class="contact-link">
                                        ${app.volunteer.phone || 'Phone not provided'}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        applicationsSection = `
            <div class="no-applications">
                <div class="empty-state-icon">�</div>
                <h4>No Volunteers Yet</h4>
                <p>When volunteers apply for this position, they will be automatically accepted and their details will appear here.</p>
            </div>
        `;
    }
    
    return `
        <div class="dept-job-card">
            <div class="dept-job-header">
                <div class="job-title-section">
                    <h3 class="job-title">${job.title}</h3>
                    <span class="job-status-badge status-${job.status}">${job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>
                </div>
                <div class="job-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(acceptedCount / job.maxVolunteers) * 100}%"></div>
                    </div>
                    <span class="progress-text">${acceptedCount}/${job.maxVolunteers} positions filled</span>
                </div>
            </div>
            
            <div class="dept-job-details">
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-icon">👥</span>
                        <div class="detail-content">
                            <strong>Age Group</strong>
                            <span>${job.ageGroup}</span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">📍</span>
                        <div class="detail-content">
                            <strong>Location</strong>
                            <span>${job.location}</span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">⏰</span>
                        <div class="detail-content">
                            <strong>Reporting Time</strong>
                            <span>${reportingDate}</span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">🎯</span>
                        <div class="detail-content">
                            <strong>Available Spots</strong>
                            <span>${availableSpots} remaining</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="job-description-section">
                <h4>📋 Job Description</h4>
                <p>${job.description}</p>
            </div>
            
            <div class="contact-info-section">
                <h4>📞 Your Contact Information</h4>
                <div class="contact-grid">
                    <div class="contact-item">
                        <span class="contact-icon">👤</span>
                        <span><strong>Name:</strong> ${job.contactName || 'Not provided'}</span>
                    </div>
                    <div class="contact-item">
                        <span class="contact-icon">📱</span>
                        <span><strong>Phone:</strong> ${job.contactPhone || 'Not provided'}</span>
                    </div>
                    <div class="contact-item">
                        <span class="contact-icon">📧</span>
                        <span><strong>Email:</strong> ${job.contactEmail || 'Not provided'}</span>
                    </div>
                </div>
            </div>
            
            ${applicationsSection}
            
            <div class="dept-job-actions">
                <button class="btn btn-danger" onclick="removeJob('${job.id}', '${job.title}')">
                    🗑️ Remove Job
                </button>
                <small class="action-warning">⚠️ This will permanently delete the job and all applications</small>
            </div>
        </div>
    `;
}

function createApplicationCard(application) {
    const appliedDate = new Date(application.appliedAt).toLocaleString();
    const job = application.job;
    
    if (!job) {
        return `
            <div class="application-card">
                <div class="job-title">Job not found</div>
                <span class="status-badge status-${application.status}">${application.status}</span>
            </div>
        `;
    }
    
    const reportingDate = new Date(job.reportingTime).toLocaleString();
    
    return `
        <div class="application-card" id="application-${application.id}">
            <div class="job-title">
                ${job.title}
                <span class="status-badge status-${application.status}">${application.status}</span>
            </div>
            <div class="job-info">
                <div class="job-detail">
                    <strong>Age Group:</strong> ${job.ageGroup}
                </div>
                <div class="job-detail">
                    <strong>Location:</strong> ${job.location}
                </div>
                <div class="job-detail">
                    <strong>Reporting Time:</strong> ${reportingDate}
                </div>
                <div class="job-detail">
                    <strong>Applied On:</strong> ${appliedDate}
                </div>
            </div>
            <div class="job-description">
                <strong>Description:</strong><br>
                ${job.description}
            </div>
            <div class="contact-info" id="contact-${job.id}" style="display: none;">
                <h4>📞 Contact Information</h4>
                <div class="contact-details"></div>
            </div>
            <div class="job-actions">
                <button class="btn btn-info" onclick="showContactInfo('${job.id}')">Show Contact Info</button>
                <button class="btn btn-danger" onclick="withdrawApplication('${application.id}', '${job.title}')">
                    🚫 Withdraw Application
                </button>
            </div>
        </div>
    `;
}

async function showContactInfo(jobId) {
    try {
        const response = await fetch(`/api/jobs/${jobId}/contact`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const contactDiv = document.getElementById(`contact-${jobId}`);
            const detailsDiv = contactDiv.querySelector('.contact-details');
            
            detailsDiv.innerHTML = `
                <div class="contact-item">
                    <strong>👤 Name:</strong> ${data.contactName}
                </div>
                <div class="contact-item">
                    <strong>📱 Phone:</strong> <a href="tel:${data.contactPhone}">${data.contactPhone}</a>
                </div>
                <div class="contact-item">
                    <strong>📧 Email:</strong> <a href="mailto:${data.contactEmail}">${data.contactEmail}</a>
                </div>
            `;
            
            contactDiv.style.display = 'block';
            
            // Change button text
            event.target.textContent = 'Hide Contact Info';
            event.target.onclick = () => hideContactInfo(jobId);
        } else {
            showNotification(data.error || 'Could not load contact information', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

function hideContactInfo(jobId) {
    const contactDiv = document.getElementById(`contact-${jobId}`);
    contactDiv.style.display = 'none';
    
    // Find the button and change it back
    const button = contactDiv.parentElement.querySelector('.btn-info');
    button.textContent = 'Show Contact Info';
    button.onclick = () => showContactInfo(jobId);
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.getElementById('notifications').appendChild(notification);
    
    // Remove notification after 4 seconds
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

function showSocketNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'socket-notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Data Management Functions

function showDataManagement() {
    if (currentUser.role !== 'department') {
        showNotification('Access denied', 'error');
        return;
    }
    
    const dataManagementHtml = `
        <div class="data-management-section">
            <h3>📊 System Management</h3>
            
            <div class="management-tabs">
                <button onclick="showSystemStats()" class="tab-btn active">System Stats</button>
                <button onclick="showDataBackup()" class="tab-btn">Data Backup</button>
                <button onclick="showJobManagement()" class="tab-btn">Job Management</button>
            </div>
            
            <div id="management-content">
                <!-- Content will be loaded here -->
            </div>
            
            <button onclick="hideDatatManagement()" class="btn btn-secondary">Back to Dashboard</button>
        </div>
    `;
    
    const dashboardContent = document.querySelector('#departmentDashboard .dashboard-content') || 
                            document.getElementById('departmentDashboard');
    dashboardContent.innerHTML = dataManagementHtml;
    
    // Load initial stats
    showSystemStats();
}

function hideDatatManagement() {
    loadDepartmentJobs(); // Return to normal dashboard
}

async function showSystemStats() {
    try {
        setActiveTab(0);
        const response = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch stats');
        
        const stats = await response.json();
        
        const contentHtml = `
            <div class="stats-container">
                <h4>📈 Job Statistics</h4>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h5>Total Jobs</h5>
                        <span class="stat-number">${stats.jobStats.total}</span>
                    </div>
                    <div class="stat-card">
                        <h5>Active Jobs</h5>
                        <span class="stat-number">${stats.jobStats.active}</span>
                    </div>
                    <div class="stat-card">
                        <h5>Completed Jobs</h5>
                        <span class="stat-number">${stats.jobStats.completed}</span>
                    </div>
                    <div class="stat-card">
                        <h5>Expired Jobs</h5>
                        <span class="stat-number">${stats.jobStats.expired}</span>
                    </div>
                    <div class="stat-card">
                        <h5>Total Applications</h5>
                        <span class="stat-number">${stats.jobStats.totalApplications}</span>
                    </div>
                    <div class="stat-card">
                        <h5>Avg Applications/Job</h5>
                        <span class="stat-number">${stats.jobStats.averageApplicationsPerJob}</span>
                    </div>
                </div>
                
                <h4>🔍 Data Integrity</h4>
                <div class="integrity-status ${stats.dataIntegrity.isHealthy ? 'healthy' : 'unhealthy'}">
                    <strong>Status: ${stats.dataIntegrity.isHealthy ? '✅ Healthy' : '❌ Issues Found'}</strong>
                    ${!stats.dataIntegrity.isHealthy ? 
                        `<ul>${stats.dataIntegrity.errors.map(error => `<li>${error}</li>`).join('')}</ul>` 
                        : ''}
                </div>
                
                <div class="admin-actions">
                    <button onclick="updateJobStatuses()" class="btn btn-primary">🔄 Update Job Statuses</button>
                    <button onclick="cleanupOrphanedRecords()" class="btn btn-secondary">🧹 Cleanup Orphaned Records</button>
                </div>
                <small>Last updated: ${new Date(stats.timestamp).toLocaleString()}</small>
            </div>
        `;
        
        document.getElementById('management-content').innerHTML = contentHtml;
    } catch (error) {
        showNotification('Failed to load system stats', 'error');
    }
}

async function showDataBackup() {
    try {
        setActiveTab(1);
        const contentHtml = `
            <div class="backup-container">
                <h4>💾 Data Backup & Archive</h4>
                
                <div class="backup-actions">
                    <button onclick="createBackup()" class="btn btn-primary">Create Backup Now</button>
                    <button onclick="archiveOldJobs()" class="btn btn-secondary">Archive Old Jobs</button>
                </div>
                
                <div class="backup-info">
                    <h5>Backup Information</h5>
                    <p>• Backups are created automatically daily at 1:00 AM</p>
                    <p>• Old backups (>30 days) are cleaned automatically</p>
                    <p>• Manual backups can be created anytime</p>
                    <p>• Archives contain jobs completed/expired >90 days ago</p>
                </div>
                
                <div id="backup-results"></div>
            </div>
        `;
        
        document.getElementById('management-content').innerHTML = contentHtml;
    } catch (error) {
        showNotification('Failed to load backup section', 'error');
    }
}

async function showJobManagement() {
    try {
        setActiveTab(2);
        
        // Get all jobs for management
        const response = await fetch('/api/my-jobs', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch jobs');
        
        const jobs = await response.json();
        
        const contentHtml = `
            <div class="job-management-container">
                <h4>🎯 Job Lifecycle Management</h4>
                
                <div class="job-filters">
                    <select onchange="filterJobsByStatus(this.value)" class="form-control">
                        <option value="">All Jobs</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="expired">Expired</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                
                <div id="job-management-list">
                    ${renderJobManagementList(jobs)}
                </div>
            </div>
        `;
        
        document.getElementById('management-content').innerHTML = contentHtml;
    } catch (error) {
        showNotification('Failed to load job management', 'error');
    }
}

function renderJobManagementList(jobs) {
    if (!jobs || jobs.length === 0) {
        return '<p>No jobs found.</p>';
    }
    
    return jobs.map(job => `
        <div class="job-management-item" data-status="${job.status}">
            <div class="job-header">
                <h5>${job.title}</h5>
                <span class="job-status status-${job.status}">${job.status.toUpperCase()}</span>
            </div>
            <div class="job-details">
                <p><strong>Location:</strong> ${job.location}</p>
                <p><strong>Reporting Time:</strong> ${new Date(job.reportingTime).toLocaleString()}</p>
                <p><strong>Applications:</strong> ${job.applications ? job.applications.length : 0}</p>
                <p><strong>Created:</strong> ${new Date(job.createdAt).toLocaleDateString()}</p>
            </div>
            <div class="job-actions">
                ${job.status === 'active' ? 
                    `<button onclick="cancelJob('${job.id}')" class="btn btn-danger btn-sm">Cancel Job</button>` 
                    : ''}
                <button onclick="viewJobDetails('${job.id}')" class="btn btn-info btn-sm">View Details</button>
            </div>
        </div>
    `).join('');
}

function filterJobsByStatus(status) {
    const items = document.querySelectorAll('.job-management-item');
    items.forEach(item => {
        if (!status || item.dataset.status === status) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function setActiveTab(index) {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
}

async function createBackup() {
    try {
        const response = await fetch('/api/admin/backup', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!response.ok) throw new Error('Backup failed');
        
        const result = await response.json();
        
        document.getElementById('backup-results').innerHTML = `
            <div class="success-message">
                ✅ Backup created successfully!<br>
                <small>File: ${result.backupPath} at ${new Date(result.timestamp).toLocaleString()}</small>
            </div>
        `;
        
        showNotification('Backup created successfully', 'success');
    } catch (error) {
        showNotification('Backup failed', 'error');
    }
}

async function updateJobStatuses() {
    try {
        const response = await fetch('/api/admin/update-job-statuses', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!response.ok) throw new Error('Update failed');
        
        const result = await response.json();
        showNotification(`Updated ${result.updatedCount} job statuses`, 'success');
        
        // Refresh stats
        showSystemStats();
    } catch (error) {
        showNotification('Failed to update job statuses', 'error');
    }
}

async function archiveOldJobs() {
    if (!confirm('Archive jobs completed/expired more than 90 days ago?')) return;
    
    try {
        const response = await fetch('/api/admin/archive-jobs', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ daysOld: 90 })
        });
        
        if (!response.ok) throw new Error('Archive failed');
        
        const result = await response.json();
        
        document.getElementById('backup-results').innerHTML = `
            <div class="success-message">
                📦 Archived ${result.archivedCount} old jobs successfully!<br>
                <small>Jobs older than ${result.daysOld} days at ${new Date(result.timestamp).toLocaleString()}</small>
            </div>
        `;
        
        showNotification(`Archived ${result.archivedCount} old jobs`, 'success');
    } catch (error) {
        showNotification('Archive failed', 'error');
    }
}

async function cancelJob(jobId) {
    const reason = prompt('Please provide a reason for cancellation:');
    if (!reason) return;
    
    try {
        const response = await fetch(`/api/jobs/${jobId}/cancel`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });
        
        if (!response.ok) throw new Error('Cancellation failed');
        
        showNotification('Job cancelled successfully', 'success');
        showJobManagement(); // Refresh the job list
    } catch (error) {
        showNotification('Failed to cancel job', 'error');
    }
}

// Withdraw application function
async function withdrawApplication(applicationId, jobTitle) {
    if (!confirm(`Are you sure you want to withdraw your application for "${jobTitle}"?\n\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/applications/${applicationId}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to withdraw application');
        }
        
        const result = await response.json();
        showNotification(`Application for "${jobTitle}" withdrawn successfully`, 'success');
        
        // Remove the application card from the UI immediately
        const applicationCard = document.getElementById(`application-${applicationId}`);
        if (applicationCard) {
            applicationCard.style.opacity = '0.5';
            applicationCard.style.transform = 'scale(0.95)';
            setTimeout(() => {
                applicationCard.remove();
                // Check if there are any applications left
                const applicationsList = document.getElementById('applicationsList');
                if (applicationsList.children.length === 0) {
                    applicationsList.innerHTML = '<div class="empty-state"><h3>No applications yet</h3><p>Apply for some volunteer opportunities!</p></div>';
                }
            }, 300);
        }
        
        // Refresh the available jobs list in case this job now has spots
        if (currentUser.role === 'volunteer') {
            loadAvailableJobs();
        }
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Remove job function
async function removeJob(jobId, jobTitle) {
    if (!confirm(`Are you sure you want to remove the job "${jobTitle}"?\n\nThis will:\n• Delete the job permanently\n• Remove all volunteer applications\n• Notify all applicants\n\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/jobs/${jobId}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to remove job');
        }
        
        const result = await response.json();
        showNotification(`Job "${jobTitle}" and ${result.affectedApplications} applications removed successfully`, 'success');
        
        // Refresh the department jobs list
        loadDepartmentJobs();
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Cleanup orphaned records function
async function cleanupOrphanedRecords() {
    if (!confirm('Clean up orphaned records?\n\nThis will remove:\n• Applications for deleted jobs\n• Applications from deleted users\n• Jobs from deleted departments\n\nThis action is safe and recommended for data integrity.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/cleanup-orphans', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to cleanup orphaned records');
        }
        
        const result = await response.json();
        showNotification(`Cleaned up ${result.cleanupCount} orphaned records`, 'success');
        
        // Refresh stats to show updated integrity status
        showSystemStats();
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}