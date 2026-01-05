import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { dbPool } from "../config/database";

// Validate JWT_SECRET in production
const JWT_SECRET = process.env.JWT_SECRET || "otogaleri-secret-change-in-production";

if (process.env.NODE_ENV === "production") {
  // Check if JWT_SECRET is weak or default
  const weakSecrets = [
    "otogaleri-secret-change-in-production",
    "secret",
    "change-me",
    "default-secret",
    "jwt-secret",
    "your-secret-key",
  ];
  
  if (!process.env.JWT_SECRET || weakSecrets.includes(JWT_SECRET)) {
    console.error("❌ CRITICAL SECURITY ERROR: JWT_SECRET is weak or default in production!");
    console.error("Please set a strong JWT_SECRET environment variable.");
    console.error("Example: JWT_SECRET=$(openssl rand -base64 32)");
    process.exit(1);
  }
  
  // Check minimum length (at least 32 characters)
  if (JWT_SECRET.length < 32) {
    console.error("❌ CRITICAL SECURITY ERROR: JWT_SECRET is too short (minimum 32 characters)!");
    console.error(`Current length: ${JWT_SECRET.length}`);
    process.exit(1);
  }
  
  console.log("✅ JWT_SECRET validation passed");
}

// Simple in-memory cache for user active status
// Key: `${userId}:${tenantId}`, Value: { isActive: boolean, expiresAt: number }
const userCache = new Map<string, { isActive: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedUserStatus(userId: number, tenantId: number): boolean | null {
  const key = `${userId}:${tenantId}`;
  const cached = userCache.get(key);
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.isActive;
  }
  
  // Remove expired entry
  if (cached) {
    userCache.delete(key);
  }
  
  return null;
}

function setCachedUserStatus(userId: number, tenantId: number, isActive: boolean): void {
  const key = `${userId}:${tenantId}`;
  userCache.set(key, {
    isActive,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  
  // Clean up old entries periodically (keep cache size reasonable)
  if (userCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of userCache.entries()) {
      if (v.expiresAt <= now) {
        userCache.delete(k);
      }
    }
  }
}

export interface AuthRequest extends Request {
  tenantId?: number;
  userId?: number;
  userRole?: string;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      tenantId: number;
      userId: number;
      role: string;
      tokenVersion?: number; // Token versioning support
    };
    
    // Check token version if present
    if (decoded.tokenVersion !== undefined) {
      const [userRows] = await dbPool.query(
        "SELECT is_active, token_version FROM users WHERE id = ? AND tenant_id = ?",
        [decoded.userId, decoded.tenantId]
      );
      const user = (userRows as any[])[0];
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      // Verify token version matches user's current token_version
      if (user.token_version !== null && decoded.tokenVersion !== user.token_version) {
        return res.status(401).json({ error: "Token has been invalidated. Please login again." });
      }
      
      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({ error: "User account is inactive" });
      }
      
      req.tenantId = decoded.tenantId;
      req.userId = decoded.userId;
      req.userRole = decoded.role;
      next();
      return;
    }
    
    // Legacy token handling (without token versioning)
    // Check cache first
    const cachedStatus = getCachedUserStatus(decoded.userId, decoded.tenantId);
    
    if (cachedStatus !== null) {
      // Use cached value
      if (!cachedStatus) {
        return res.status(401).json({ error: "User account is inactive" });
      }
    } else {
      // Check database and cache the result
      const [userRows] = await dbPool.query(
        "SELECT is_active FROM users WHERE id = ? AND tenant_id = ?",
        [decoded.userId, decoded.tenantId]
      );
      const user = (userRows as any[])[0];
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      // Cache the result
      setCachedUserStatus(decoded.userId, decoded.tenantId, user.is_active);
      
      if (!user.is_active) {
        return res.status(401).json({ error: "User account is inactive" });
      }
    }
    
    req.tenantId = decoded.tenantId;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function generateToken(tenantId: number, userId: number, role: string, tokenVersion?: number): string {
  const payload: any = { tenantId, userId, role };
  if (tokenVersion !== undefined) {
    payload.tokenVersion = tokenVersion;
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
