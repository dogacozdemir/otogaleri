import rateLimit from "express-rate-limit";

/**
 * Rate Limiting Configuration
 * 
 * Different rate limits for different endpoints based on sensitivity and usage patterns.
 */

/**
 * General API rate limiter
 * - 500 state-changing requests per 10 minutes per IP
 * - GET requests are NOT counted (allows rapid page navigation)
 * - Only POST, PUT, DELETE, PATCH requests are rate limited
 * - Suitable for normal usage including rapid page navigation
 */
export const generalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes (shorter window for better UX)
  max: 500, // Limit each IP to 500 state-changing requests per windowMs
  message: "Çok fazla istek gönderdiniz. Lütfen birkaç dakika sonra tekrar deneyin.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for:
    // - Health checks
    // - Static files
    // - GET requests (allows rapid page navigation)
    // - OPTIONS requests (CORS preflight)
    return (
      req.path === "/health" ||
      req.path.startsWith("/uploads/") ||
      req.method === "GET" ||
      req.method === "OPTIONS"
    );
  },
  // Custom handler to provide better error messages
  handler: (req, res) => {
    res.status(429).json({
      error: "Çok fazla istek gönderdiniz",
      message: "Lütfen birkaç dakika sonra tekrar deneyin. Sayfa gezintisi (GET istekleri) limitlenmez.",
      retryAfter: Math.ceil(10 * 60 / 1000), // seconds
    });
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
 * Forgot password rate limiter
 * - 5 requests per 15 minutes per IP (abuse önleme)
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Çok fazla şifre sıfırlama talebi. Lütfen 15 dakika sonra tekrar deneyin.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Reset password rate limiter
 * - 10 requests per 15 minutes per IP
 */
export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Çok fazla deneme. Lütfen 15 dakika sonra tekrar deneyin.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * File upload rate limiter
 * - 200 uploads per hour per IP (kurulum: 10 araç × 15 fotoğraf = 150+; ücretli uygulama)
 * - RATE_LIMIT_UPLOAD_MAX ile .env'den override edilebilir
 */
const UPLOAD_LIMIT_MAX = process.env.RATE_LIMIT_UPLOAD_MAX
  ? Math.max(10, Math.min(500, Number(process.env.RATE_LIMIT_UPLOAD_MAX)))
  : 200;

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: UPLOAD_LIMIT_MAX,
  message: "Çok fazla dosya yüklemesi. Lütfen bir saat sonra tekrar deneyin.",
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


