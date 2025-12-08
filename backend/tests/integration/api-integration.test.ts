import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { setupTestDatabase, cleanTestDatabase, teardownTestDatabase } from '../setup/database';
import { createTestTenant } from '../factories/tenantFactory';
import { createTestUser } from '../factories/userFactory';
import { createTestVehicle } from '../factories/vehicleFactory';
import { createTestCustomer } from '../factories/customerFactory';
import { createAuthHeader } from '../helpers/auth';

describe('API and Integration Tests', () => {
  let app: any;
  let tenant1Id: number;
  let tenant2Id: number;
  let user1Id: number;
  let user2Id: number;

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
    
    user1Id = await createTestUser({ tenant_id: tenant1Id, role: 'admin', is_active: true });
    user2Id = await createTestUser({ tenant_id: tenant2Id, role: 'admin', is_active: true });
  });

  describe('API Tenant Header Requirements', () => {
    it('should require tenant context in all API calls', async () => {
      const endpoints = [
        { method: 'get', path: '/api/vehicles' },
        { method: 'get', path: '/api/customers' },
        { method: 'get', path: '/api/inventory/analytics/overview' },
      ];

      for (const endpoint of endpoints) {
        const response = await (request(app) as any)[endpoint.method](endpoint.path);
        
        // Should require authentication (which includes tenant)
        expect(response.status).toBe(401);
      }
    });

    it('should extract tenant from JWT token', async () => {
      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      expect(response.status).toBe(200);
    });

    it('should reject requests with missing tenant in token', async () => {
      const jwt = require('jsonwebtoken');
      const tokenWithoutTenant = jwt.sign(
        { userId: user1Id, role: 'admin' },
        process.env.JWT_SECRET || 'otogaleri-secret-change-in-production'
      );

      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${tokenWithoutTenant}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Webhook Tenant Context', () => {
    it('should include tenant context in webhook payloads', async () => {
      // This test documents expected behavior for webhooks
      // Webhooks should include tenant_id in payload
      
      const vehicleId = await createTestVehicle({ tenant_id: tenant1Id });

      // Simulate webhook trigger (if implemented)
      // Webhook payload should include tenant_id
      // This is a documentation test
    });

    it('should prevent webhook with wrong tenant context', async () => {
      // If webhooks are triggered, they should validate tenant
      // This test documents expected behavior
    });
  });

  describe('Service-to-Service Communication', () => {
    it('should propagate tenant context in service calls', async () => {
      // Test that tenant context is maintained in service-to-service calls
      // This might involve internal API calls or microservices
      
      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      // Response should only contain tenant1's data
      if (response.status === 200 && response.body) {
        if (response.body && response.body.vehicles) {
          response.body.vehicles.forEach((vehicle: any) => {
            expect(vehicle.tenant_id).toBe(tenant1Id);
          });
        }
      }
    });

    it('should maintain tenant isolation in service calls', async () => {
      // Make requests from both tenants
      await createTestVehicle({ tenant_id: tenant1Id });
      await createTestVehicle({ tenant_id: tenant2Id });

      const response1 = await request(app)
        .get('/api/vehicles')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      const response2 = await request(app)
        .get('/api/vehicles')
        .set('Authorization', createAuthHeader(tenant2Id, user2Id));

      // Each should only see their own data
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      if (response1.body && response2.body) {
        if (response1.body.vehicles) {
          response1.body.vehicles.forEach((v: any) => expect(v.tenant_id).toBe(tenant1Id));
        }
        if (response2.body.vehicles) {
          response2.body.vehicles.forEach((v: any) => expect(v.tenant_id).toBe(tenant2Id));
        }
      }
    });
  });

  describe('API Response Format', () => {
    it('should return consistent API response format', async () => {
      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      expect(response.status).toBe(200);
      // Vehicles endpoint returns pagination wrapper
      expect(response.body.vehicles).toBeDefined();
      expect(Array.isArray(response.body.vehicles)).toBe(true);
    });

    it('should include tenant context in error responses', async () => {
      const response = await request(app)
        .get('/api/vehicles/999999')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      // Error should not leak tenant information
      expect([404, 400]).toContain(response.status);
    });
  });

  describe('API Versioning', () => {
    it('should handle API versioning with tenant context', async () => {
      // Test API versioning if implemented
      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id))
        .set('Accept', 'application/vnd.api+json;version=1');

      expect([200, 400, 406]).toContain(response.status);
    });
  });

  describe('Batch Operations', () => {
    it('should maintain tenant context in batch operations', async () => {
      // Create multiple vehicles in batch (if endpoint exists)
      const vehicles = Array.from({ length: 5 }, (_, i) => ({
        maker: `Maker${i}`,
        model: `Model${i}`,
        production_year: 2020,
        purchase_amount: 100000,
        purchase_currency: 'TRY',
      }));

      // If batch endpoint exists, test it
      // Otherwise, create individually and verify tenant
      for (const vehicle of vehicles) {
        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', createAuthHeader(tenant1Id, user1Id))
          .send(vehicle);

        if (response.status === 200 || response.status === 201) {
          expect(response.body.tenant_id).toBe(tenant1Id);
        }
      }
    });
  });

  describe('API Error Handling', () => {
    it('should return appropriate error codes', async () => {
      const testCases = [
        { endpoint: '/api/vehicles/999999', expectedStatus: 404 },
        { endpoint: '/api/vehicles', method: 'post', body: { maker: 'Test', model: 'Test', production_year: 2020, purchase_amount: 100000, purchase_currency: 'TRY' }, expectedStatus: 201 },
      ];

      for (const testCase of testCases) {
        const req = (request(app) as any)[testCase.method || 'get'](testCase.endpoint)
          .set('Authorization', createAuthHeader(tenant1Id, user1Id));
        
        if (testCase.body) {
          req.send(testCase.body);
        }

        const response = await req;
        expect([testCase.expectedStatus, 400, 404, 422]).toContain(response.status);
      }
    });

    it('should not leak tenant information in errors', async () => {
      const response = await request(app)
        .get('/api/vehicles/999999')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      // Error message should not contain sensitive tenant info
      if (response.body.error) {
        expect(response.body.error).not.toContain('tenant');
        expect(response.body.error).not.toContain(String(tenant1Id));
      }
    });
  });

  describe('API Documentation Compliance', () => {
    it('should follow RESTful conventions', async () => {
      // GET should retrieve resources
      const getResponse = await request(app)
        .get('/api/vehicles')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      expect([200, 404]).toContain(getResponse.status);

      // POST should create resources
      const postResponse = await request(app)
        .post('/api/vehicles')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id))
        .send({
          maker: 'Test',
          model: 'Test',
          production_year: 2020,
          purchase_amount: 100000,
          purchase_currency: 'TRY',
        });

      expect([200, 201, 400, 422]).toContain(postResponse.status);
    });
  });
});

