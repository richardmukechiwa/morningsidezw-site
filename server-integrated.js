// server-integrated.js - Complete KYC Server with All Features
// Install: npm install express multer googleapis dotenv cors express-rate-limit bcryptjs jsonwebtoken

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Import custom modules
const { 
  logger, 
  metrics, 
  alertSystem, 
  setupMonitoring, 
  monitoringMiddleware, 
  errorTrackingMiddleware 
} = require('./monitoring');
const { BackupManager, setupBackupSchedule } = require('./backup');
const EmailNotificationSystem = require('./notifications');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize systems
const emailSystem = new EmailNotificationSystem();

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://www.morningsidezw.com']
}));
app.use(express.json());
app.use(monitoringMiddleware);

// Rate limiting
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per window
  message: 'Too many uploads, please try again later'
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later'
});

app.use('/api/', apiLimiter);

// Configure multer
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Google Drive setup
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')
  },
  scopes: ['https://www.googleapis.com/auth/drive.file']
});

const drive = google.drive({ version: 'v3', auth });
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// In-memory database (replace with real database in production)
const applications = new Map();
const admins = new Map();

// Initialize demo admin (remove in production)
admins.set('admin@morningsidezw.com', {
  email: 'admin@morningsidezw.com',
  password: bcrypt.hashSync('admin123', 10),
  name: 'Admin User'
});

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

function authenticateAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function uploadToGoogleDrive(filePath, fileName, mimeType) {
  try {
    const fileMetadata = {
      name: fileName,
      parents: [DRIVE_FOLDER_ID]
    };

    const media = {
      mimeType: mimeType,
      body: fs.createReadStream(filePath)
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink'
    });

    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    fs.unlinkSync(filePath);

    return {
      fileId: response.data.id,
      url: response.data.webViewLink
    };
  } catch (error) {
    logger.error('Drive upload error:', error);
    throw new Error('Failed to upload to Google Drive');
  }
}

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    metrics: metrics.getMetricsSummary()
  };
  res.json(health);
});

// File upload endpoint
app.post('/api/upload', uploadLimiter, upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileType = req.body.fileType || 'document';
    const timestamp = Date.now();
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `${fileType}_${timestamp}${fileExtension}`;

    const result = await uploadToGoogleDrive(
      req.file.path,
      fileName,
      req.file.mimetype
    );

    const duration = Date.now() - startTime;
    metrics.trackUpload(true, duration);

    logger.info('File uploaded successfully', {
      fileName,
      fileType,
      duration
    });

    res.json({
      success: true,
      fileId: result.fileId,
      url: result.url,
      fileName: fileName
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    metrics.trackUpload(false, duration);
    
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    logger.error('Upload failed', { error: error.message });
    res.status(500).json({ 
      error: 'Upload failed', 
      message: error.message 
    });
  }
});

// Submit complete KYC application
app.post('/api/kyc/submit', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      full_name,
      email,
      id_number,
      phone,
      address,
      id_front_url,
      id_back_url,
      proof_of_address_url,
      passport_photo_url
    } = req.body;

    // Validate required fields
    if (!full_name || !email || !id_number || !phone || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!id_front_url || !id_back_url || !proof_of_address_url || !passport_photo_url) {
      return res.status(400).json({ error: 'Missing required documents' });
    }

    // Additional validation: Check rate limiting per email
    const recentSubmissions = Array.from(applications.values())
      .filter(app => 
        app.email === email && 
        Date.now() - new Date(app.submission_time).getTime() < 3600000 // 1 hour
      );
    
    if (recentSubmissions.length >= 3) {
      logger.warn('Rate limit exceeded', { email });
      return res.status(429).json({ 
        error: 'Too many submissions. Please try again later.' 
      });
    }

    // Create application record
    const applicationId = `APP-${id_number}-${Date.now()}`;
    const application = {
      id: applicationId,
      full_name,
      email,
      id_number,
      phone,
      address,
      documents: {
        id_front: id_front_url,
        id_back: id_back_url,
        proof_of_address: proof_of_address_url,
        passport_photo: passport_photo_url
      },
      status: 'pending',
      submission_time: new Date().toISOString(),
      source: 'web_form',
      ip_address: req.ip
    };

    // Store application
    applications.set(applicationId, application);

    // Send confirmation email to applicant
    await emailSystem.sendApplicationReceived({
      email,
      full_name,
      id_number
    });

    // Notify admin
    await emailSystem.sendAdminNewApplication(
      { ...application, id: applicationId },
      application.documents
    );

    // Forward to N8N for processing (SECURE: URL is on backend only)
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        const n8nResponse = await fetch(process.env.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            // Add secret token for N8N webhook authentication
            'X-N8N-Secret': process.env.N8N_WEBHOOK_SECRET || ''
          },
          body: JSON.stringify(application)
        });

        if (!n8nResponse.ok) {
          throw new Error(`N8N responded with ${n8nResponse.status}`);
        }

        const n8nResult = await n8nResponse.json();
        logger.info('N8N processing initiated', { applicationId, n8nResult });
        
      } catch (n8nError) {
        logger.error('N8N webhook failed', { 
          error: n8nError.message,
          applicationId 
        });
        // Don't fail the request - application is saved, N8N can retry
      }
    }

    const duration = Date.now() - startTime;
    metrics.trackSubmission('pending', duration);

    logger.info('Application submitted successfully', {
      applicationId,
      applicant: full_name,
      email,
      duration
    });

    res.json({
      success: true,
      status: 'PENDING',
      message: 'Application submitted successfully',
      applicationId
    });

  } catch (error) {
    logger.error('Submission failed', { error: error.message });
    res.status(500).json({ 
      error: 'Submission failed', 
      message: error.message 
    });
  }
});

// ============================================================================
// ADMIN ROUTES (Protected)
// ============================================================================

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const admin = admins.get(email);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { email: admin.email, name: admin.name },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      admin: { email: admin.email, name: admin.name }
    });

  } catch (error) {
    logger.error('Login failed', { error: error.message });
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get all applications (admin only)
app.get('/api/admin/applications', authenticateAdmin, (req, res) => {
  const appsArray = Array.from(applications.values());
  res.json(appsArray);
});

// Get single application (admin only)
app.get('/api/admin/applications/:id', authenticateAdmin, (req, res) => {
  const application = applications.get(req.params.id);
  
  if (!application) {
    return res.status(404).json({ error: 'Application not found' });
  }
  
  res.json(application);
});

// Approve application (admin only)
app.post('/api/admin/applications/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const application = applications.get(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    application.status = 'approved';
    application.approved_by = req.admin.email;
    application.approved_at = new Date().toISOString();
    
    const agentId = `AGT-${application.id_number}`;
    application.agent_id = agentId;

    applications.set(req.params.id, application);

    // Send approval email
    await emailSystem.sendApplicationApproved(
      { email: application.email, full_name: application.full_name },
      agentId
    );

    // Send welcome email
    await emailSystem.sendWelcomeEmail(
      { email: application.email, full_name: application.full_name },
      { username: application.email }
    );

    metrics.trackSubmission('approved', 0);

    logger.info('Application approved', {
      applicationId: req.params.id,
      approvedBy: req.admin.email
    });

    res.json({
      success: true,
      message: 'Application approved',
      agentId
    });

  } catch (error) {
    logger.error('Approval failed', { error: error.message });
    res.status(500).json({ error: 'Approval failed' });
  }
});

// Reject application (admin only)
app.post('/api/admin/applications/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const application = applications.get(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const { reason } = req.body;
    
    application.status = 'rejected';
    application.rejected_by = req.admin.email;
    application.rejected_at = new Date().toISOString();
    application.rejection_reason = reason;

    applications.set(req.params.id, application);

    // Send rejection email
    await emailSystem.sendApplicationRejected(
      { email: application.email, full_name: application.full_name },
      reason
    );

    metrics.trackSubmission('rejected', 0);

    logger.info('Application rejected', {
      applicationId: req.params.id,
      rejectedBy: req.admin.email,
      reason
    });

    res.json({
      success: true,
      message: 'Application rejected'
    });

  } catch (error) {
    logger.error('Rejection failed', { error: error.message });
    res.status(500).json({ error: 'Rejection failed' });
  }
});

// Get metrics (admin only)
app.get('/api/admin/metrics', authenticateAdmin, (req, res) => {
  res.json(metrics.getMetricsSummary());
});

// Trigger manual backup (admin only)
app.post('/api/admin/backup', authenticateAdmin, async (req, res) => {
  try {
    const backupManager = new BackupManager(auth);
    const result = await backupManager.performFullBackup();
    
    res.json({
      success: true,
      message: 'Backup completed successfully',
      result
    });
  } catch (error) {
    logger.error('Manual backup failed', { error: error.message });
    res.status(500).json({ error: 'Backup failed' });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use(errorTrackingMiddleware);

app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack
  });
  
  res.status(500).json({ 
    error: 'Internal server error', 
    message: error.message 
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(PORT, () => {
  logger.info(`🚀 KYC API server running on port ${PORT}`);
  logger.info(`📁 Drive folder: ${DRIVE_FOLDER_ID}`);
  logger.info(`📧 Email notifications: ${process.env.SMTP_USER ? 'enabled' : 'disabled'}`);
  
  // Setup monitoring and backups
  setupMonitoring();
  if (auth) {
    setupBackupSchedule(auth);
  }
  
  logger.info('✅ All systems initialized');
});