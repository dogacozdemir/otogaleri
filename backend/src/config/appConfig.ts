/**
 * Application Configuration
 * Centralized configuration management - NO hard-coded values
 * All values must come from environment variables
 */

/**
 * Database Configuration
 */
export const dbConfig = {
  host: process.env.OTG_DB_HOST,
  port: process.env.OTG_DB_PORT ? Number(process.env.OTG_DB_PORT) : undefined,
  user: process.env.OTG_DB_USER,
  password: process.env.OTG_DB_PASSWORD,
  database: process.env.OTG_DB_NAME,
  
  // Production validation
  get required() {
    if (process.env.NODE_ENV === 'production') {
      if (!this.host || !this.user || !this.database) {
        throw new Error(
          'CRITICAL: Database configuration incomplete in production. ' +
          'Required: OTG_DB_HOST, OTG_DB_USER, OTG_DB_NAME'
        );
      }
    }
    return {
      host: this.host || 'localhost',
      port: this.port || 3306,
      user: this.user || 'root',
      password: this.password || '',
      database: this.database || 'otogaleri',
    };
  },
};

/**
 * Server Configuration
 */
export const serverConfig = {
  port: process.env.PORT ? Number(process.env.PORT) : undefined,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  get required() {
    if (process.env.NODE_ENV === 'production' && !this.port) {
      throw new Error('CRITICAL: PORT environment variable is required in production');
    }
    return {
      port: this.port || 5005,
      nodeEnv: this.nodeEnv,
    };
  },
};

/**
 * External API Configuration
 */
export const apiConfig = {
  freecurrencyApiBase: process.env.FREECURRENCY_API_BASE || 'https://api.freecurrencyapi.com/v1',
  freecurrencyApiKey: process.env.FREECURRENCY_API_KEY || '',
  
  get required() {
    return {
      freecurrencyApiBase: this.freecurrencyApiBase,
      freecurrencyApiKey: this.freecurrencyApiKey,
    };
  },
};

/**
 * Subdomain Configuration
 */
export const subdomainConfig = {
  allowedSubdomains: process.env.ALLOWED_SUBDOMAINS 
    ? process.env.ALLOWED_SUBDOMAINS.split(',').map(s => s.trim())
    : ['localhost', '127.0.0.1'],
  
  get allowed() {
    return this.allowedSubdomains;
  },
};

/**
 * Database SSL Configuration
 */
export const dbSslConfig = {
  enabled: process.env.DB_SSL_ENABLED === 'true',
  caPath: process.env.DB_SSL_CA,
  rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  
  get config() {
    if (process.env.NODE_ENV === 'production') {
      // Production: SSL is mandatory
      if (!this.enabled && !this.caPath) {
        console.warn('[config] WARNING: SSL not configured for production database connection');
      }
      
      return {
        rejectUnauthorized: this.rejectUnauthorized,
        ca: this.caPath ? require('fs').readFileSync(this.caPath) : undefined,
      };
    }
    
    // Development: Optional SSL
    return this.enabled ? {
      rejectUnauthorized: this.rejectUnauthorized,
      ca: this.caPath ? require('fs').readFileSync(this.caPath) : undefined,
    } : false;
  },
};

/**
 * Database Connection Pool Configuration
 */
export const dbPoolConfig = {
  connectionLimit: process.env.DB_POOL_LIMIT 
    ? Number(process.env.DB_POOL_LIMIT) 
    : process.env.NODE_ENV === 'production' ? 50 : 20,
  queueLimit: process.env.DB_QUEUE_LIMIT 
    ? Number(process.env.DB_QUEUE_LIMIT) 
    : 0, // Unlimited queue
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  
  get config() {
    return {
      connectionLimit: this.connectionLimit,
      queueLimit: this.queueLimit,
      waitForConnections: this.waitForConnections,
      enableKeepAlive: this.enableKeepAlive,
      keepAliveInitialDelay: this.keepAliveInitialDelay,
    };
  },
};

