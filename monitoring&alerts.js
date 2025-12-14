// monitoring.js - Monitoring and Alert System
// Install: npm install winston axios node-cron

const winston = require('winston');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

// Configure Winston Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 10
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Metrics tracking
class MetricsCollector {
  constructor() {
    this.metrics = {
      uploads: { total: 0, success: 0, failed: 0 },
      submissions: { total: 0, approved: 0, rejected: 0, pending: 0 },
      errors: {},
      performance: { uploadTimes: [], processingTimes: [] }
    };
    this.startTime = Date.now();
  }

  trackUpload(success, duration) {
    this.metrics.uploads.total++;
    if (success) {
      this.metrics.uploads.success++;
      this.metrics.performance.uploadTimes.push(duration);
    } else {
      this.metrics.uploads.failed++;
    }
  }

  trackSubmission(status, duration) {
    this.metrics.submissions.total++;
    this.metrics.submissions[status.toLowerCase()]++;
    this.metrics.performance.processingTimes.push(duration);
  }

  trackError(errorType) {
    if (!this.metrics.errors[errorType]) {
      this.metrics.errors[errorType] = 0;
    }
    this.metrics.errors[errorType]++;
  }

  getAverageUploadTime() {
    const times = this.metrics.performance.uploadTimes;
    return times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  getSuccessRate() {
    const total = this.metrics.uploads.total;
    return total ? (this.metrics.uploads.success / total * 100).toFixed(2) : 0;
  }

  getMetricsSummary() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      successRate: this.getSuccessRate(),
      avgUploadTime: this.getAverageUploadTime()
    };
  }

  reset() {
    this.metrics = {
      uploads: { total: 0, success: 0, failed: 0 },
      submissions: { total: 0, approved: 0, rejected: 0, pending: 0 },
      errors: {},
      performance: { uploadTimes: [], processingTimes: [] }
    };
  }
}

const metrics = new MetricsCollector();

// Alert System
class AlertSystem {
  constructor() {
    this.thresholds = {
      errorRate: 10, // Alert if >10% error rate
      uploadFailRate: 20, // Alert if >20% uploads fail
      responseTime: 5000, // Alert if avg response time >5s
      diskSpace: 90 // Alert if disk usage >90%
    };
    
    this.alertChannels = {
      email: process.env.ALERT_EMAIL,
      slack: process.env.SLACK_WEBHOOK_URL,
      telegram: process.env.TELEGRAM_BOT_TOKEN
    };
  }

  async sendAlert(level, title, message, details = {}) {
    const alert = {
      level, // 'info', 'warning', 'critical'
      title,
      message,
      timestamp: new Date().toISOString(),
      details
    };

    logger.warn('ALERT', alert);

    // Send to all configured channels
    await Promise.allSettled([
      this.sendEmailAlert(alert),
      this.sendSlackAlert(alert),
      this.sendTelegramAlert(alert)
    ]);
  }

  async sendEmailAlert(alert) {
    if (!this.alertChannels.email) return;

    try {
      // Using a webhook service like SendGrid, Mailgun, etc.
      await axios.post(process.env.EMAIL_WEBHOOK_URL, {
        to: this.alertChannels.email,
        subject: `[${alert.level.toUpperCase()}] ${alert.title}`,
        html: `
          <h2>${alert.title}</h2>
          <p><strong>Level:</strong> ${alert.level}</p>
          <p><strong>Time:</strong> ${alert.timestamp}</p>
          <p><strong>Message:</strong> ${alert.message}</p>
          <pre>${JSON.stringify(alert.details, null, 2)}</pre>
        `
      });
    } catch (error) {
      logger.error('Failed to send email alert:', error);
    }
  }

  async sendSlackAlert(alert) {
    if (!this.alertChannels.slack) return;

    try {
      const color = {
        info: '#36a64f',
        warning: '#ff9800',
        critical: '#ff0000'
      }[alert.level];

      await axios.post(this.alertChannels.slack, {
        attachments: [{
          color,
          title: alert.title,
          text: alert.message,
          fields: [
            { title: 'Level', value: alert.level, short: true },
            { title: 'Time', value: alert.timestamp, short: true }
          ],
          footer: 'KYC Monitoring System'
        }]
      });
    } catch (error) {
      logger.error('Failed to send Slack alert:', error);
    }
  }

  async sendTelegramAlert(alert) {
    if (!this.alertChannels.telegram) return;

    try {
      const message = `
🚨 *${alert.title}*
Level: ${alert.level}
${alert.message}
Time: ${alert.timestamp}
      `;

      await axios.post(
        `https://api.telegram.org/bot${this.alertChannels.telegram}/sendMessage`,
        {
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown'
        }
      );
    } catch (error) {
      logger.error('Failed to send Telegram alert:', error);
    }
  }

  async checkThresholds() {
    const metricsSummary = metrics.getMetricsSummary();
    
    // Check error rate
    const errorRate = 100 - metricsSummary.successRate;
    if (errorRate > this.thresholds.errorRate) {
      await this.sendAlert(
        'warning',
        'High Error Rate Detected',
        `Error rate is ${errorRate.toFixed(2)}%, exceeding threshold of ${this.thresholds.errorRate}%`,
        { metrics: metricsSummary }
      );
    }

    // Check upload fail rate
    const uploadFailRate = metricsSummary.uploads.total > 0
      ? (metricsSummary.uploads.failed / metricsSummary.uploads.total * 100)
      : 0;
    
    if (uploadFailRate > this.thresholds.uploadFailRate) {
      await this.sendAlert(
        'critical',
        'High Upload Failure Rate',
        `Upload failure rate is ${uploadFailRate.toFixed(2)}%`,
        { uploads: metricsSummary.uploads }
      );
    }

    // Check average response time
    if (metricsSummary.avgUploadTime > this.thresholds.responseTime) {
      await this.sendAlert(
        'warning',
        'Slow Response Times',
        `Average upload time is ${(metricsSummary.avgUploadTime / 1000).toFixed(2)}s`,
        { performance: metricsSummary.performance }
      );
    }

    // Check disk space
    const diskUsage = await this.checkDiskSpace();
    if (diskUsage > this.thresholds.diskSpace) {
      await this.sendAlert(
        'critical',
        'Low Disk Space',
        `Disk usage is at ${diskUsage.toFixed(2)}%`,
        { diskUsage }
      );
    }
  }

  async checkDiskSpace() {
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec("df -h / | tail -1 | awk '{print $5}' | sed 's/%//'", 
          (error, stdout) => {
            resolve(error ? 0 : parseFloat(stdout));
          }
        );
      });
    } catch {
      return 0;
    }
  }
}

const alertSystem = new AlertSystem();

// Scheduled monitoring tasks
function setupMonitoring() {
  // Check thresholds every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Running scheduled health check');
    await alertSystem.checkThresholds();
  });

  // Daily metrics report at 9 AM
  cron.schedule('0 9 * * *', async () => {
    const summary = metrics.getMetricsSummary();
    await alertSystem.sendAlert(
      'info',
      'Daily Metrics Report',
      'Here is your daily KYC system report',
      summary
    );
    
    // Reset daily metrics
    metrics.reset();
  });

  // Health check every minute
  cron.schedule('* * * * *', () => {
    const summary = metrics.getMetricsSummary();
    logger.info('Health check', {
      uptime: Math.floor(summary.uptime / 1000 / 60),
      successRate: summary.successRate,
      totalUploads: summary.uploads.total
    });
  });

  logger.info('Monitoring system initialized');
}

// Middleware for Express
function monitoringMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  // Track response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration
    });

    // Track metrics
    if (req.path.includes('/upload')) {
      metrics.trackUpload(res.statusCode === 200, duration);
    }
  });

  next();
}

// Error tracking middleware
function errorTrackingMiddleware(error, req, res, next) {
  logger.error('Application error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  metrics.trackError(error.name || 'UnknownError');

  // Send critical alert for severe errors
  if (error.statusCode >= 500) {
    alertSystem.sendAlert(
      'critical',
      'Application Error',
      error.message,
      { stack: error.stack, path: req.path }
    );
  }

  next(error);
}

module.exports = {
  logger,
  metrics,
  alertSystem,
  setupMonitoring,
  monitoringMiddleware,
  errorTrackingMiddleware
};