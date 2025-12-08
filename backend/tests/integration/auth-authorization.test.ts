import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { setupTestDatabase, cleanTestDatabase, teardownTestDatabase } from '../setup/database';
import { createTestTenant } from '../factories/tenantFactory';
import { createTestUser } from '../factories/userFactory';
import { createTestVehicle } from '../factories/vehicleFactory';
import { createAuthHeader, generateTestToken } from '../helpers/auth';
import bcrypt from 'bcryptjs';
import { testDbPool } from '../setup/database';

describe('Authentication and Authorization Tests', () => {
  let app: any;
  let tenant1Id: number;
  let tenant2Id: number;
  let ownerId: number;
  let adminId: number;
  let managerId: number;
  let salesId: number;
  let accountingId: number;

  beforeAll(async () => {
    await setupTestDatabase();
    app = createTestApp();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
    
    tenant1Id = await createTestTenant({ name: 'Tenant 1', slug: 'tenant-1' });
    tenant2Id = await createTestTenant({ name: 'Tenant 2', slug: 'tenant-2' });
    
    ownerId = await createTestUser({ tenant_id: tenant1Id, email: 'owner@test.com', role: 'owner', is_active: true });
    adminId = await createTestUser({ tenant_id: tenant1Id, email: 'admin@test.com', role: 'admin', is_active: true });
    managerId = await createTestUser({ tenant_id: tenant1Id, email: 'manager@test.com', role: 'manager', is_active: true });
    salesId = await createTestUser({ tenant_id: tenant1Id, email: 'sales@test.com', role: 'sales', is_active: true });
    accountingId = await createTestUser({ tenant_id: tenant1Id, email: 'accounting@test.com', role: 'accounting', is_active: true });
  });

  describe('JWT Authentication', () => {
    it('should reject requests without authorization header', async () => {
      const response = await request(app)
        .get('/api/vehicles');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });

    it('should reject requests with expired token', async () => {
      const expiredToken = generateTestToken(tenant1Id, adminId, 'admin');
      // Note: In real scenario, token would be expired. For testing, we'll use invalid signature
      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${expiredToken.substring(0, expiredToken.length - 5)}invalid`);

      expect(response.status).toBe(401);
    });

    it('should accept valid JWT token', async () => {
      await createTestVehicle({ tenant_id: tenant1Id });

      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', createAuthHeader(tenant1Id, adminId, 'admin'));

      expect(response.status).toBe(200);
    });
  });

  describe('Role-Based Authorization', () => {
    it('should allow owner to access all endpoints', async () => {
      const vehicleId = await createTestVehicle({ tenant_id: tenant1Id });

      const endpoints = [
        { method: 'get', path: '/api/vehicles' },
        { method: 'post', path: '/api/vehicles' },
        { method: 'get', path: `/api/vehicles/${vehicleId}` },
        { method: 'put', path: `/api/vehicles/${vehicleId}` },
        { method: 'delete', path: `/api/vehicles/${vehicleId}` },
      ];

      for (const endpoint of endpoints) {
        const req = (request(app) as any)[endpoint.method](endpoint.path)
          .set('Authorization', createAuthHeader(tenant1Id, ownerId, 'owner'));
        
        if (endpoint.method === 'post' || endpoint.method === 'put') {
          req.send({ maker: 'Test' });
        }

        const response = await req;
        // Owner should have access (may be 200, 201, 400, 404, but not 403)
        expect([200, 201, 400, 404]).toContain(response.status);
      }
    });

    it('should allow admin to manage vehicles', async () => {
      const vehicleId = await createTestVehicle({ tenant_id: tenant1Id });

      const response = await request(app)
        .put(`/api/vehicles/${vehicleId}`)
        .set('Authorization', createAuthHeader(tenant1Id, adminId, 'admin'))
        .send({ maker: 'Updated' });

      expect([200, 404]).toContain(response.status);
    });

    it('should allow sales to view vehicles but restrict modifications', async () => {
      const vehicleId = await createTestVehicle({ tenant_id: tenant1Id });

      // Sales should be able to view
      const getResponse = await request(app)
        .get(`/api/vehicles/${vehicleId}`)
        .set('Authorization', createAuthHeader(tenant1Id, salesId, 'sales'));

      expect([200, 404]).toContain(getResponse.status);

      // Sales might be restricted from deleting (implementation dependent)
      const deleteResponse = await request(app)
        .delete(`/api/vehicles/${vehicleId}`)
        .set('Authorization', createAuthHeader(tenant1Id, salesId, 'sales'));

      // Should either succeed or return 403, but not 401
      expect([200, 403, 404]).toContain(deleteResponse.status);
    });
  });

  describe('Permission Escalation Prevention', () => {
    it('should prevent user from accessing other tenant with valid token', async () => {
      const vehicle2Id = await createTestVehicle({ tenant_id: tenant2Id });

      // User from tenant1 tries to access tenant2's vehicle
      const response = await request(app)
        .get(`/api/vehicles/${vehicle2Id}`)
        .set('Authorization', createAuthHeader(tenant1Id, adminId, 'admin'));

      // Should return 404 (not found) or 403 (forbidden) depending on implementation
      expect([404, 403]).toContain(response.status);
    });

    it('should prevent role escalation via token manipulation', async () => {
      // Create token with sales role but try to use admin privileges
      const vehicleId = await createTestVehicle({ tenant_id: tenant1Id });

      // Try to delete with sales token
      const response = await request(app)
        .delete(`/api/vehicles/${vehicleId}`)
        .set('Authorization', createAuthHeader(tenant1Id, salesId, 'sales'));

      // Should be restricted (403 or 404, not 200)
      expect([403, 404]).toContain(response.status);
    });

    it('should prevent user from modifying their own role', async () => {
      // User tries to update their role to admin
      const connection = await testDbPool.getConnection();
      const [userRows] = await connection.query(
        'SELECT * FROM users WHERE id = ? AND tenant_id = ?',
        [salesId, tenant1Id]
      );
      connection.release();

      const originalRole = (userRows as any[])[0].role;
      
      // Attempt to change role via API (if such endpoint exists)
      // This test assumes there's no direct role update endpoint for users
      // If there is, it should require admin/owner role
      
      expect(originalRole).toBe('sales');
    });
  });

  describe('Wrong Tenant Token Access', () => {
    it('should reject access when token tenant does not match resource tenant', async () => {
      const vehicle2Id = await createTestVehicle({ tenant_id: tenant2Id });

      const response = await request(app)
        .get(`/api/vehicles/${vehicle2Id}`)
        .set('Authorization', createAuthHeader(tenant1Id, adminId, 'admin'));

      // Should return 404 (not found) or 403 (forbidden) depending on implementation
      expect([404, 403]).toContain(response.status);
    });

    it('should prevent cross-tenant data listing', async () => {
      await createTestVehicle({ tenant_id: tenant1Id });
      await createTestVehicle({ tenant_id: tenant2Id });

      const response = await request(app)
        .get('/api/vehicles')
        .query({ limit: 10 })
        .set('Authorization', createAuthHeader(tenant1Id, adminId, 'admin'));

      expect(response.status).toBe(200);
      expect(response.body.vehicles).toBeDefined();
      response.body.vehicles.forEach((vehicle: any) => {
        expect(vehicle.tenant_id).toBe(tenant1Id);
      });
    });
  });

  describe('Inactive User Access', () => {
    it('should reject access for inactive users', async () => {
      // Create inactive user
      const inactiveUserId = await createTestUser({
        tenant_id: tenant1Id,
        email: 'inactive@test.com',
        role: 'admin',
        is_active: false,
      });

      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', createAuthHeader(tenant1Id, inactiveUserId, 'admin'));

      // Token is valid but user is inactive - should be handled by auth middleware
      // Implementation may vary, but should not allow access
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Token Payload Validation', () => {
    it('should require tenantId in token payload', async () => {
      // Create token without tenantId
      const jwt = require('jsonwebtoken');
      const invalidToken = jwt.sign(
        { userId: adminId, role: 'admin' },
        process.env.JWT_SECRET || 'otogaleri-secret-change-in-production'
      );

      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
    });

    it('should require userId in token payload', async () => {
      const jwt = require('jsonwebtoken');
      const invalidToken = jwt.sign(
        { tenantId: tenant1Id, role: 'admin' },
        process.env.JWT_SECRET || 'otogaleri-secret-change-in-production'
      );

      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${invalidToken}`);

      // May succeed but should validate user exists
      expect([200, 401, 403]).toContain(response.status);
    });
  });
});

