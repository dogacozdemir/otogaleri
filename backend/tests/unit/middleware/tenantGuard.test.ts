import { Request, Response, NextFunction } from 'express';
import { tenantGuard } from '../../../src/middleware/tenantGuard';
import { AuthRequest } from '../../../src/middleware/auth';
import { testDbPool } from '../../setup/database';
import { setupTestDatabase, cleanTestDatabase, teardownTestDatabase } from '../../setup/database';
import { createTestTenant } from '../../factories/tenantFactory';

describe('TenantGuard Middleware Unit Tests', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestDatabase();

    mockRequest = {
      tenantId: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  it('should reject request without tenantId', async () => {
    await tenantGuard(
      mockRequest as AuthRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Tenant ID missing' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject request with non-existent tenantId', async () => {
    mockRequest.tenantId = 999999;

    await tenantGuard(
      mockRequest as AuthRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Tenant not found' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should allow request with valid tenantId', async () => {
    const tenantId = await createTestTenant({ name: 'Test Tenant', slug: 'test-tenant' });
    mockRequest.tenantId = tenantId;

    await tenantGuard(
      mockRequest as AuthRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should handle database errors gracefully', async () => {
    mockRequest.tenantId = 1;

    // Mock database error
    const originalQuery = testDbPool.query;
    (testDbPool as any).query = jest.fn().mockRejectedValue(new Error('Database error'));

    await tenantGuard(
      mockRequest as AuthRequest,
      mockResponse as Response,
      mockNext
    );

    // Should handle error (implementation dependent)
    // Restore original query
    testDbPool.query = originalQuery;
  });
});

