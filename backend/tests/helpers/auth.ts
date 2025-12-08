import jwt from 'jsonwebtoken';
import { AuthRequest } from '../../src/middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'otogaleri-secret-change-in-production';

/**
 * Generate a test JWT token
 */
export function generateTestToken(
  tenantId: number,
  userId: number = 1,
  role: string = 'admin'
): string {
  return jwt.sign({ tenantId, userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Create authorization header with token
 */
export function createAuthHeader(tenantId: number, userId?: number, role?: string): string {
  const token = generateTestToken(tenantId, userId, role);
  return `Bearer ${token}`;
}

/**
 * Mock AuthRequest for testing
 */
export function createMockAuthRequest(
  tenantId: number,
  userId: number = 1,
  userRole: string = 'admin',
  overrides: Partial<AuthRequest> = {}
): Partial<AuthRequest> {
  return {
    tenantId,
    userId,
    userRole,
    ...overrides,
  };
}

/**
 * Create request with tenant spoofing attempt
 */
export function createSpoofedToken(
  originalTenantId: number,
  spoofedTenantId: number,
  userId: number = 1,
  role: string = 'admin'
): string {
  // Try to create token with different tenant ID
  return jwt.sign({ tenantId: spoofedTenantId, userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

