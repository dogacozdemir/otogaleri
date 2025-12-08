import { Request, Response, NextFunction } from 'express';
import { authMiddleware, generateToken } from '../../../src/middleware/auth';
import { AuthRequest } from '../../../src/middleware/auth';
import jwt from 'jsonwebtoken';
import { dbPool } from '../../../src/config/database';

jest.mock('../../../src/config/database', () => ({
  dbPool: {
    query: jest.fn(),
  },
}));

const JWT_SECRET = process.env.JWT_SECRET || 'otogaleri-secret-change-in-production';

describe('Auth Middleware Unit Tests', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
    
    // Reset mocks
    jest.clearAllMocks();
    (dbPool.query as jest.Mock).mockResolvedValue([[{ is_active: 1 }]]);
  });

  it('should reject request without authorization header', async () => {
    await authMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject request with invalid token format', async () => {
    mockRequest.headers = {
      authorization: 'InvalidFormat token',
    };

    await authMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject request with invalid token', async () => {
    mockRequest.headers = {
      authorization: 'Bearer invalid-token',
    };

    await authMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should accept request with valid token', async () => {
    const token = generateToken(1, 1, 'admin');
    mockRequest.headers = {
      authorization: `Bearer ${token}`,
    };

    // Mock user as active
    (dbPool.query as jest.Mock).mockResolvedValue([[{ is_active: 1 }]]);

    await authMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockRequest.tenantId).toBe(1);
    expect(mockRequest.userId).toBe(1);
    expect(mockRequest.userRole).toBe('admin');
  });

  it('should extract token from Bearer format', async () => {
    const token = generateToken(2, 2, 'manager');
    mockRequest.headers = {
      authorization: `Bearer ${token}`,
    };

    // Mock user as active
    (dbPool.query as jest.Mock).mockResolvedValue([[{ is_active: 1 }]]);

    await authMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockRequest.tenantId).toBe(2);
    expect(mockRequest.userId).toBe(2);
    expect(mockRequest.userRole).toBe('manager');
  });

  it('should reject token with wrong secret', async () => {
    const wrongToken = jwt.sign(
      { tenantId: 1, userId: 1, role: 'admin' },
      'wrong-secret'
    );
    mockRequest.headers = {
      authorization: `Bearer ${wrongToken}`,
    };

    await authMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  it('should handle expired token', async () => {
    const expiredToken = jwt.sign(
      { tenantId: 1, userId: 1, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '-1h' } // Expired
    );
    mockRequest.headers = {
      authorization: `Bearer ${expiredToken}`,
    };

    await authMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });
});

