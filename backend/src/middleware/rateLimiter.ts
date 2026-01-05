import rateLimit from "express-rate-limit";

/**
 * Rate Limiting Configuration
 * 
 * Different rate limits for different endpoints based on sensitivity and usage patterns.
 */

/**
 * General API rate limiter
 * - 100 requests per 15 minutes per IP
 * - Suitable for most API endpoints
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/health";
  },
});

/**
 * Strict rate limiter for login endpoint
 * - 5 requests per 15 minutes per IP
 * - Prevents brute force attacks
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: "Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * More lenient rate limiter for signup endpoint
 * - 10 requests per 15 minutes per IP
 * - Allows legitimate users to retry registration
 */
export const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 signup attempts per windowMs
  message: "Çok fazla kayıt denemesi. Lütfen 15 dakika sonra tekrar deneyin.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * File upload rate limiter
 * - 10 uploads per hour per IP
 * - Prevents abuse of file storage
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: "Too many file uploads, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Search rate limiter
 * - 30 searches per minute per IP
 * - Prevents expensive search queries from overwhelming the system
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 searches per minute
  message: "Too many search requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Report generation rate limiter
 * - 5 reports per hour per IP
 * - Prevents expensive report generation from overwhelming the system
 */
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 reports per hour
  message: "Too many report requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});


