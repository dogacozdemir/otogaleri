import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "otogaleri-secret-change-in-production";

export interface AuthRequest extends Request {
  tenantId?: number;
  userId?: number;
  userRole?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
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
    };
    req.tenantId = decoded.tenantId;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function generateToken(tenantId: number, userId: number, role: string): string {
  return jwt.sign({ tenantId, userId, role }, JWT_SECRET, { expiresIn: "7d" });
}
