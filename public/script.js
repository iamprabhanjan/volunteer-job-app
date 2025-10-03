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
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
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

async function handleRegister(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('registerFirstName').value;
    const lastName = document.getElementById('registerLastName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ firstName, lastName, email, phone, password, role })
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
        const status = job.userApplication.status;
        switch (status) {
            case 'pending':
                return `<button class="btn btn-warning" disabled>Application Pending</button>`;
            case 'accepted':
                return `<button class="btn btn-success" disabled>✓ Accepted</button>`;
            case 'rejected':
                return `<button class="btn btn-danger" disabled>Application Rejected</button>`;
        }
    }
    
    // If no application exists, show apply button or full message
    if (isFull) {
        return `<button class="btn btn-secondary" disabled>Job Full</button>`;
    } else {
        return `<button class="btn btn-success" onclick="applyForJob('${job.id}')">Apply Now</button>`;
    }
}

function getApplicationActionButtons(application) {
    const status = application.status;
    
    switch (status) {
        case 'pending':
            return `
                <button class="btn btn-success btn-sm" onclick="updateApplicationStatus('${application.id}', 'accepted')">Accept</button>
                <button class="btn btn-danger btn-sm" onclick="updateApplicationStatus('${application.id}', 'rejected')">Reject</button>
            `;
        case 'accepted':
            return `
                <div class="status-indicator accepted">✓ Accepted</div>
                <button class="btn btn-danger btn-sm" onclick="updateApplicationStatus('${application.id}', 'rejected')" title="Change to rejected">Reject</button>
            `;
        case 'rejected':
            return `
                <div class="status-indicator rejected">✗ Rejected</div>
                <button class="btn btn-success btn-sm" onclick="updateApplicationStatus('${application.id}', 'accepted')" title="Change to accepted">Accept</button>
            `;
        default:
            return `
                <button class="btn btn-success btn-sm" onclick="updateApplicationStatus('${application.id}', 'accepted')">Accept</button>
                <button class="btn btn-danger btn-sm" onclick="updateApplicationStatus('${application.id}', 'rejected')">Reject</button>
            `;
    }
}

function createJobCard(job) {
    const reportingDate = new Date(job.reportingTime).toLocaleString();
    const applicationCount = job.applicationCount || 0;
    const acceptedCount = job.acceptedCount || 0;
    const pendingCount = job.pendingCount || 0;
    const availableSpots = job.availableSpots || (job.maxVolunteers - applicationCount);
    const isFull = availableSpots <= 0;
    
    // Add user application status indicator
    let userStatusIndicator = '';
    if (job.userApplication) {
        const status = job.userApplication.status;
        const statusText = status.charAt(0).toUpperCase() + status.slice(1);
        userStatusIndicator = `<div class="user-status-indicator status-${status}">Your Status: ${statusText}</div>`;
    }
    
    return `
        <div class="job-card ${job.userApplication ? 'has-application' : ''}">
            ${userStatusIndicator}
            <div class="job-title">
                ${job.title}
                <div class="application-stats">
                    <span class="applications-count">${acceptedCount} accepted, ${pendingCount} pending</span>
                    ${availableSpots > 0 ? `<span class="spots-left">${availableSpots} spots available</span>` : '<span class="job-full">Job Full</span>'}
                </div>
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
                    <strong>Max Volunteers:</strong> ${job.maxVolunteers}
                </div>
            </div>
            <div class="job-description">
                <strong>Description:</strong><br>
                ${job.description}
            </div>
            <div class="job-actions">
                ${getJobActionButton(job, isFull, availableSpots)}
            </div>
        </div>
    `;
}

function createDepartmentJobCard(job) {
    const reportingDate = new Date(job.reportingTime).toLocaleString();
    const applications = job.applications || [];
    const applicationsCount = applications.length;
    const acceptedCount = applications.filter(app => app.status === 'accepted').length;
    const pendingCount = applications.filter(app => app.status === 'pending').length;
    const rejectedCount = applications.filter(app => app.status === 'rejected').length;
    const availableSpots = job.maxVolunteers - acceptedCount - pendingCount;
    
    let applicationsSection = '';
    if (job.applications && job.applications.length > 0) {
        applicationsSection = `
            <div class="job-applications">
                <h4>Applications (${applicationsCount})</h4>
                ${job.applications.map(app => `
                    <div class="application-item-detailed application-${app.status}">
                        <div class="volunteer-info">
                            <div class="volunteer-name">
                                <strong>${app.volunteer.firstName} ${app.volunteer.lastName}</strong>
                                <span class="status-badge status-${app.status}">${app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span>
                            </div>
                            <div class="volunteer-contact">
                                <div class="contact-item">
                                    <span>📧 <a href="mailto:${app.volunteer.email}">${app.volunteer.email}</a></span>
                                </div>
                                <div class="contact-item">
                                    <span>📱 <a href="tel:${app.volunteer.phone || 'N/A'}">${app.volunteer.phone || 'Phone not provided'}</a></span>
                                </div>
                            </div>
                            <div class="application-date">
                                <small>Applied: ${new Date(app.appliedAt).toLocaleDateString()}</small>
                            </div>
                        </div>
                        <div class="application-actions">
                            ${getApplicationActionButtons(app)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    return `
        <div class="job-card">
            <div class="job-title">
                ${job.title}
                <span class="status-badge status-${job.status}">${job.status}</span>
                <div class="department-job-stats">
                    <span class="stat-item accepted">${acceptedCount} Accepted</span>
                    <span class="stat-item pending">${pendingCount} Pending</span>
                    <span class="stat-item rejected">${rejectedCount} Rejected</span>
                    <span class="stat-item available">${availableSpots} Spots Left</span>
                </div>
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
                    <strong>Max Volunteers:</strong> ${job.maxVolunteers}
                </div>
            </div>
            <div class="job-description">
                <strong>Description:</strong><br>
                ${job.description}
            </div>
            <div class="contact-section">
                <h4>📞 Your Contact Information</h4>
                <div class="contact-item">
                    <strong>👤 Name:</strong> ${job.contactName || 'Not provided'}
                </div>
                <div class="contact-item">
                    <strong>📱 Phone:</strong> ${job.contactPhone || 'Not provided'}
                </div>
                <div class="contact-item">
                    <strong>📧 Email:</strong> ${job.contactEmail || 'Not provided'}
                </div>
            </div>
            ${applicationsSection}
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

async function updateApplicationStatus(applicationId, status) {
    try {
        // Disable the buttons immediately to prevent double-clicking
        const buttons = document.querySelectorAll(`button[onclick*="${applicationId}"]`);
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.textContent = status === 'accepted' ? 'Accepting...' : 'Rejecting...';
        });

        const response = await fetch(`/api/applications/${applicationId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(`Application ${status} successfully!`, 'success');
            // Reload department jobs to show updated status
            await loadDepartmentJobs();
        } else {
            showNotification(data.error || `Failed to ${status} application`, 'error');
            // Re-enable buttons if there was an error
            buttons.forEach(btn => {
                btn.disabled = false;
                btn.textContent = status === 'accepted' ? 'Accept' : 'Reject';
            });
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
        // Re-enable buttons if there was an error
        const buttons = document.querySelectorAll(`button[onclick*="${applicationId}"]`);
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.textContent = status === 'accepted' ? 'Accept' : 'Reject';
        });
    }
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