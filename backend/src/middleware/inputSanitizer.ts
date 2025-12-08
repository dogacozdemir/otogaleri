import { Request, Response, NextFunction } from "express";

/**
 * Sanitize string inputs to prevent XSS and NoSQL injection
 */
function sanitizeString(input: any): any {
  if (typeof input === "string") {
    // Remove script tags and event handlers
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=\s*[^\s>]*/gi, "");
    
    // Remove NoSQL injection operators
    sanitized = sanitized.replace(/\$[a-zA-Z]+/g, "");
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Return null if empty after sanitization (to prevent SQL errors)
    // But preserve empty strings for optional fields
    if (sanitized === "" && input.trim() !== "") {
      // If original was not empty but sanitized is empty, it was malicious
      return null;
    }
    
    // Return null if result is empty string (to prevent SQL syntax errors)
    return sanitized === "" ? null : sanitized;
  }
  return input;
}

/**
 * Recursively sanitize object/array inputs
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === "object") {
    const sanitized: any = {};
    for (const key in obj) {
      // Remove NoSQL injection operators from keys
      if (key.startsWith("$")) {
        continue; // Skip keys starting with $
      }
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Middleware to sanitize request body, query, and params
 */
export function inputSanitizer(req: Request, res: Response, next: NextFunction) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query) as any;
  }
  if (req.params) {
    req.params = sanitizeObject(req.params) as any;
  }
  next();
}

