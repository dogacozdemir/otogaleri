import winston from "winston";
import path from "path";
import fs from "fs";

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Security Audit Log Event Types
 */
export enum SecurityEventType {
  STRICT_MODE_VIOLATION = "STRICT_MODE_VIOLATION",
  FAILED_LOGIN = "FAILED_LOGIN",
  PASSWORD_CHANGE = "PASSWORD_CHANGE",
  TOKEN_INVALIDATED = "TOKEN_INVALIDATED",
  UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
}

/**
 * Security Audit Log Entry Interface
 */
export interface SecurityAuditLog {
  timestamp: string;
  eventType: SecurityEventType;
  tenantId?: number;
  userId?: number;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  message: string;
}

/**
 * LoggerService - Centralized logging with security audit trail
 */
class LoggerService {
  private logger: winston.Logger;
  private securityLogger: winston.Logger;

  constructor() {
    // General application logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || "info",
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: "otogaleri-backend" },
      transports: [
        new winston.transports.File({
          filename: path.join(logsDir, "error.log"),
          level: "error",
        }),
        new winston.transports.File({
          filename: path.join(logsDir, "combined.log"),
        }),
      ],
    });

    // Add console transport in development
    if (process.env.NODE_ENV !== "production") {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        })
      );
    }

    // Security audit logger (separate file)
    this.securityLogger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: path.join(logsDir, "security.log"),
          level: "info",
        }),
      ],
    });

    // Add console transport in development
    if (process.env.NODE_ENV !== "production") {
      this.securityLogger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        })
      );
    }
  }

  /**
   * Log security audit event
   */
  securityAudit(logEntry: SecurityAuditLog): void {
    this.securityLogger.info("SECURITY_AUDIT", logEntry);
    
    // Trigger webhook for critical events (asynchronously, non-blocking)
    // WebhookService is defined below, so we can reference it directly
    if (process.env.SECURITY_WEBHOOK_ENABLED === 'true') {
      // Use setImmediate to avoid blocking the logging operation
      setImmediate(() => {
        webhookService.sendSecurityAlert(logEntry).catch(err => {
          console.error('[LoggerService] Webhook trigger error:', err);
        });
      });
    }
  }

  /**
   * Log TenantAwareQuery strict mode violation
   * This automatically triggers webhook for critical security events
   */
  logStrictModeViolation(
    tenantId: number,
    sql: string,
    ipAddress?: string
  ): void {
    this.securityAudit({
      timestamp: new Date().toISOString(),
      eventType: SecurityEventType.STRICT_MODE_VIOLATION,
      tenantId,
      ipAddress,
      message: "TenantAwareQuery strict mode violation - Missing tenant_id filter",
      details: {
        sql: sql.substring(0, 200), // Truncate long SQL queries
      },
    });
  }

  /**
   * Log failed login attempt
   */
  logFailedLogin(
    email: string,
    ipAddress?: string,
    userAgent?: string,
    reason?: string
  ): void {
    this.securityAudit({
      timestamp: new Date().toISOString(),
      eventType: SecurityEventType.FAILED_LOGIN,
      ipAddress,
      userAgent,
      message: `Failed login attempt for email: ${email}`,
      details: {
        email,
        reason: reason || "Invalid credentials",
      },
    });
  }

  /**
   * Log password change
   */
  logPasswordChange(
    tenantId: number,
    userId: number,
    userRole: string,
    ipAddress?: string,
    userAgent?: string
  ): void {
    this.securityAudit({
      timestamp: new Date().toISOString(),
      eventType: SecurityEventType.PASSWORD_CHANGE,
      tenantId,
      userId,
      userRole,
      ipAddress,
      userAgent,
      message: `Password changed for user ${userId} in tenant ${tenantId}`,
    });
  }

  /**
   * Log token invalidation
   */
  logTokenInvalidation(
    tenantId: number,
    userId: number,
    reason: string,
    ipAddress?: string
  ): void {
    this.securityAudit({
      timestamp: new Date().toISOString(),
      eventType: SecurityEventType.TOKEN_INVALIDATED,
      tenantId,
      userId,
      ipAddress,
      message: `Token invalidated for user ${userId} in tenant ${tenantId}`,
      details: {
        reason,
      },
    });
  }

  /**
   * General logging methods
   */
  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }
}

/**
 * Webhook Configuration Interface
 */
interface WebhookConfig {
  slackUrl?: string;
  discordUrl?: string;
  enabled: boolean;
}

/**
 * Webhook Service - Send critical security events to external services
 */
class WebhookService {
  private config: WebhookConfig;

  constructor() {
    this.config = {
      slackUrl: process.env.SECURITY_WEBHOOK_SLACK_URL,
      discordUrl: process.env.SECURITY_WEBHOOK_DISCORD_URL,
      enabled: process.env.SECURITY_WEBHOOK_ENABLED === 'true',
    };
  }

  /**
   * Send webhook notification to Slack
   */
  private async sendToSlack(message: string, logEntry: SecurityAuditLog): Promise<void> {
    if (!this.config.slackUrl || !this.config.enabled) {
      return;
    }

    try {
      const payload = {
        text: `🚨 Security Alert: ${logEntry.eventType}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `🚨 Security Alert: ${logEntry.eventType}`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Event:*\n${logEntry.eventType}`,
              },
              {
                type: 'mrkdwn',
                text: `*Timestamp:*\n${logEntry.timestamp}`,
              },
              ...(logEntry.tenantId ? [{
                type: 'mrkdwn',
                text: `*Tenant ID:*\n${logEntry.tenantId}`,
              }] : []),
              ...(logEntry.userId ? [{
                type: 'mrkdwn',
                text: `*User ID:*\n${logEntry.userId}`,
              }] : []),
              ...(logEntry.ipAddress ? [{
                type: 'mrkdwn',
                text: `*IP Address:*\n${logEntry.ipAddress}`,
              }] : []),
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Message:*\n${logEntry.message}`,
            },
          },
        ],
      };

      const response = await fetch(this.config.slackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`[WebhookService] Slack webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('[WebhookService] Slack webhook error:', error);
    }
  }

  /**
   * Send webhook notification to Discord
   */
  private async sendToDiscord(message: string, logEntry: SecurityAuditLog): Promise<void> {
    if (!this.config.discordUrl || !this.config.enabled) {
      return;
    }

    try {
      const embed = {
        title: `🚨 Security Alert: ${logEntry.eventType}`,
        description: logEntry.message,
        color: 0xff0000, // Red color for security alerts
        fields: [
          {
            name: 'Event Type',
            value: logEntry.eventType,
            inline: true,
          },
          {
            name: 'Timestamp',
            value: logEntry.timestamp,
            inline: true,
          },
          ...(logEntry.tenantId ? [{
            name: 'Tenant ID',
            value: String(logEntry.tenantId),
            inline: true,
          }] : []),
          ...(logEntry.userId ? [{
            name: 'User ID',
            value: String(logEntry.userId),
            inline: true,
          }] : []),
          ...(logEntry.ipAddress ? [{
            name: 'IP Address',
            value: logEntry.ipAddress,
            inline: true,
          }] : []),
        ],
        timestamp: logEntry.timestamp,
      };

      const payload = {
        embeds: [embed],
      };

      const response = await fetch(this.config.discordUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`[WebhookService] Discord webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('[WebhookService] Discord webhook error:', error);
    }
  }

  /**
   * Send webhook notification for critical security events
   */
  async sendSecurityAlert(logEntry: SecurityAuditLog): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Determine if this is a critical event that requires webhook notification
    const criticalEvents = [
      SecurityEventType.STRICT_MODE_VIOLATION,
      SecurityEventType.UNAUTHORIZED_ACCESS,
      SecurityEventType.SUSPICIOUS_ACTIVITY,
    ];

    // Also trigger for multiple failed logins (tracked separately)
    const isCritical = criticalEvents.includes(logEntry.eventType);

    if (isCritical) {
      const message = `Security Alert: ${logEntry.eventType} - ${logEntry.message}`;
      
      // Send to both Slack and Discord if configured
      await Promise.all([
        this.sendToSlack(message, logEntry),
        this.sendToDiscord(message, logEntry),
      ]);
    }
  }
}

// Singleton instance
export const loggerService = new LoggerService();
export const webhookService = new WebhookService();

