// notifications.js - Email Notification System
// Install: npm install nodemailer handlebars

const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const { logger } = require('./monitoring');

class EmailNotificationSystem {
  constructor() {
    // Configure email transporter (using Gmail, SendGrid, etc.)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    this.fromEmail = process.env.FROM_EMAIL || 'noreply@morningsidezw.com';
    this.fromName = process.env.FROM_NAME || 'Morningside KYC Team';
    this.adminEmail = process.env.ADMIN_EMAIL;

    // Load email templates
    this.templates = this.loadTemplates();
  }

  loadTemplates() {
    const templatesDir = path.join(__dirname, 'email-templates');
    
    // Ensure templates directory exists
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    return {
      applicationReceived: this.compileTemplate('application-received.html'),
      applicationApproved: this.compileTemplate('application-approved.html'),
      applicationRejected: this.compileTemplate('application-rejected.html'),
      manualReview: this.compileTemplate('manual-review.html'),
      adminNotification: this.compileTemplate('admin-notification.html'),
      documentRequest: this.compileTemplate('document-request.html'),
      welcomeEmail: this.compileTemplate('welcome-email.html')
    };
  }

  compileTemplate(fileName) {
    try {
      const templatePath = path.join(__dirname, 'email-templates', fileName);
      if (fs.existsSync(templatePath)) {
        const source = fs.readFileSync(templatePath, 'utf-8');
        return handlebars.compile(source);
      }
      return null;
    } catch (error) {
      logger.error(`Failed to load template ${fileName}`, { error });
      return null;
    }
  }

  async sendEmail(to, subject, html, attachments = []) {
    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { 
        to, 
        subject, 
        messageId: info.messageId 
      });
      
      return info;
    } catch (error) {
      logger.error('Failed to send email', { 
        to, 
        subject, 
        error: error.message 
      });
      throw error;
    }
  }

  // Applicant Notifications

  async sendApplicationReceived(applicantData) {
    const { email, full_name, id_number } = applicantData;
    
    const html = this.templates.applicationReceived ? 
      this.templates.applicationReceived({
        name: full_name,
        applicationId: `KYC-${id_number}-${Date.now()}`,
        submitDate: new Date().toLocaleDateString()
      }) :
      this.getDefaultReceivedTemplate(full_name);

    await this.sendEmail(
      email,
      'KYC Application Received - Confirmation',
      html
    );
  }

  async sendApplicationApproved(applicantData, agentId = null) {
    const { email, full_name } = applicantData;
    
    const html = this.templates.applicationApproved ?
      this.templates.applicationApproved({
        name: full_name,
        agentId,
        loginUrl: process.env.AGENT_PORTAL_URL,
        nextSteps: [
          'Log in to your agent portal',
          'Complete the onboarding training',
          'Review commission structure',
          'Start accepting assignments'
        ]
      }) :
      this.getDefaultApprovedTemplate(full_name, agentId);

    await this.sendEmail(
      email,
      '🎉 Congratulations! Your Agent Application is Approved',
      html
    );
  }

  async sendApplicationRejected(applicantData, reason) {
    const { email, full_name } = applicantData;
    
    const html = this.templates.applicationRejected ?
      this.templates.applicationRejected({
        name: full_name,
        reason,
        supportEmail: this.adminEmail,
        reapplyUrl: process.env.APPLICATION_URL
      }) :
      this.getDefaultRejectedTemplate(full_name, reason);

    await this.sendEmail(
      email,
      'Agent Application Status Update',
      html
    );
  }

  async sendManualReviewNotification(applicantData, estimatedTime = '24-48 hours') {
    const { email, full_name } = applicantData;
    
    const html = this.templates.manualReview ?
      this.templates.manualReview({
        name: full_name,
        estimatedTime,
        supportEmail: this.adminEmail
      }) :
      this.getDefaultReviewTemplate(full_name, estimatedTime);

    await this.sendEmail(
      email,
      'Your Application is Under Review',
      html
    );
  }

  async sendDocumentRequest(applicantData, missingDocuments) {
    const { email, full_name } = applicantData;
    
    const html = this.templates.documentRequest ?
      this.templates.documentRequest({
        name: full_name,
        documents: missingDocuments,
        uploadUrl: process.env.APPLICATION_URL,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
      }) :
      this.getDefaultDocumentRequestTemplate(full_name, missingDocuments);

    await this.sendEmail(
      email,
      'Additional Documents Required - KYC Application',
      html
    );
  }

  async sendWelcomeEmail(applicantData, credentials) {
    const { email, full_name } = applicantData;
    
    const html = this.templates.welcomeEmail ?
      this.templates.welcomeEmail({
        name: full_name,
        username: credentials.username,
        portalUrl: process.env.AGENT_PORTAL_URL,
        supportEmail: this.adminEmail,
        trainingUrl: process.env.TRAINING_URL
      }) :
      this.getDefaultWelcomeTemplate(full_name, credentials);

    await this.sendEmail(
      email,
      'Welcome to Morningside - Get Started',
      html
    );
  }

  // Admin Notifications

  async sendAdminNewApplication(applicantData, documentLinks) {
    if (!this.adminEmail) return;

    const html = this.templates.adminNotification ?
      this.templates.adminNotification({
        applicant: applicantData,
        documents: documentLinks,
        reviewUrl: `${process.env.ADMIN_DASHBOARD_URL}/applications/${applicantData.id_number}`,
        submissionTime: new Date().toLocaleString()
      }) :
      this.getDefaultAdminTemplate(applicantData, documentLinks);

    await this.sendEmail(
      this.adminEmail,
      `New KYC Application: ${applicantData.full_name}`,
      html
    );
  }

  async sendAdminAlert(alertType, message, details) {
    if (!this.adminEmail) return;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff0000;">⚠️ System Alert: ${alertType}</h2>
        <p><strong>Message:</strong> ${message}</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
          <pre>${JSON.stringify(details, null, 2)}</pre>
        </div>
        <p style="margin-top: 20px; color: #666;">
          Time: ${new Date().toLocaleString()}
        </p>
      </div>
    `;

    await this.sendEmail(
      this.adminEmail,
      `[ALERT] ${alertType}`,
      html
    );
  }

  // Default Templates (fallback if template files don't exist)

  getDefaultReceivedTemplate(name) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; margin-top: 30px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Received! ✓</h1>
          </div>
          <div class="content">
            <p>Dear ${name},</p>
            <p>Thank you for submitting your agent application. We have successfully received your KYC documents.</p>
            <p><strong>What happens next?</strong></p>
            <ul>
              <li>Our team will review your application within 24-48 hours</li>
              <li>We'll verify your documents and credentials</li>
              <li>You'll receive an email with the decision</li>
            </ul>
            <p>If we need any additional information, we'll reach out to you directly.</p>
            <p>Best regards,<br><strong>The Morningside Team</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Morningside. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultApprovedTemplate(name, agentId) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #48bb78; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .agent-id { background: white; padding: 15px; border-left: 4px solid #48bb78; margin: 20px 0; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Congratulations!</h1>
            <p style="font-size: 18px; margin: 10px 0 0 0;">Your Application is Approved!</p>
          </div>
          <div class="content">
            <p>Dear ${name},</p>
            <p>We're excited to inform you that your agent application has been <strong>approved</strong>!</p>
            ${agentId ? `<div class="agent-id"><strong>Your Agent ID:</strong> ${agentId}</div>` : ''}
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Access your agent portal using the link below</li>
              <li>Complete the onboarding training (30 minutes)</li>
              <li>Review commission structure and policies</li>
              <li>Start accepting assignments</li>
            </ol>
            <center>
              <a href="${process.env.AGENT_PORTAL_URL || '#'}" class="button">Access Agent Portal →</a>
            </center>
            <p>Welcome to the team! We look forward to working with you.</p>
            <p>Best regards,<br><strong>The Morningside Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultRejectedTemplate(name, reason) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f56565 0%, #c53030 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Status Update</h1>
          </div>
          <div class="content">
            <p>Dear ${name},</p>
            <p>Thank you for your interest in becoming an agent with Morningside.</p>
            <p>After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>You may reapply after 6 months. If you have questions, please contact our support team.</p>
            <p>Best regards,<br><strong>The Morningside Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultReviewTemplate(name, estimatedTime) {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #667eea;">Application Under Review</h2>
          <p>Dear ${name},</p>
          <p>Your application requires manual review by our team. This is a standard procedure for ensuring quality and compliance.</p>
          <p><strong>Estimated Review Time:</strong> ${estimatedTime}</p>
          <p>We'll notify you as soon as the review is complete.</p>
          <p>Best regards,<br><strong>The Morningside Team</strong></p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultDocumentRequestTemplate(name, documents) {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ff9800;">Additional Documents Required</h2>
          <p>Dear ${name},</p>
          <p>To process your application, we need the following documents:</p>
          <ul>
            ${documents.map(doc => `<li>${doc}</li>`).join('')}
          </ul>
          <p>Please upload these documents within 7 days to avoid application cancellation.</p>
          <p>Best regards,<br><strong>The Morningside Team</strong></p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultWelcomeTemplate(name, credentials) {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #48bb78;">Welcome to Morningside! 🎉</h1>
          <p>Dear ${name},</p>
          <p>Your account has been created successfully!</p>
          <p><strong>Username:</strong> ${credentials.username}</p>
          <p>Please log in and complete your profile to get started.</p>
          <p>Best regards,<br><strong>The Morningside Team</strong></p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultAdminTemplate(applicant, documents) {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>New KYC Application</h2>
          <p><strong>Applicant:</strong> ${applicant.full_name}</p>
          <p><strong>ID Number:</strong> ${applicant.id_number}</p>
          <p><strong>Email:</strong> ${applicant.email}</p>
          <p><strong>Phone:</strong> ${applicant.phone}</p>
          <h3>Documents:</h3>
          <ul>
            ${Object.entries(documents).map(([key, url]) => 
              `<li><a href="${url}">${key}</a></li>`
            ).join('')}
          </ul>
          <p><a href="${process.env.ADMIN_DASHBOARD_URL}" style="display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">Review Application</a></p>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = EmailNotificationSystem;