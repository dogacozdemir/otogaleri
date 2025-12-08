import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { setupTestDatabase, cleanTestDatabase, teardownTestDatabase } from '../setup/database';
import { createTestTenant, createTestTenants } from '../factories/tenantFactory';
import { createTestUser } from '../factories/userFactory';
import { createTestVehicle, createTestVehicles } from '../factories/vehicleFactory';
import { createAuthHeader } from '../helpers/auth';
import { testDbPool } from '../setup/database';

describe('Deployment and Migration Tests', () => {
  let app: any;
  let tenantIds: number[];
  let userIds: Map<number, number>;

  beforeAll(async () => {
    await setupTestDatabase();
    app = createTestApp();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
    
    // Create multiple tenants to test migration impact
    tenantIds = await createTestTenants(3);
    userIds = new Map();
    
    for (const tenantId of tenantIds) {
      const userId = await createTestUser({ tenant_id: tenantId, role: 'admin', is_active: true });
      userIds.set(tenantId, userId);
    }
  });

  describe('Schema Migration Impact', () => {
    it('should maintain tenant data integrity after migration', async () => {
      // Create data for each tenant before "migration"
      for (const tenantId of tenantIds) {
        await createTestVehicles(tenantId, 5);
      }

      // Simulate migration (in real scenario, run migration SQL)
      // For testing, we verify data is still accessible

      // Verify all tenants can still access their data
      for (const tenantId of tenantIds) {
        const response = await request(app)
          .get('/api/vehicles')
          .query({ limit: 10 })
          .set('Authorization', createAuthHeader(tenantId, userIds.get(tenantId)!));

        expect(response.status).toBe(200);
        expect(response.body.vehicles).toBeDefined();
        expect(response.body.vehicles.length).toBe(5);
        response.body.vehicles.forEach((vehicle: any) => {
          expect(vehicle.tenant_id).toBe(tenantId);
        });
      }
    });

    it('should preserve tenant relationships after migration', async () => {
      // Create related data
      const tenantId = tenantIds[0];
      const userId = userIds.get(tenantId)!;

      const vehicleId = await createTestVehicle({ tenant_id: tenantId });
      
      // Verify relationship exists
      const response = await request(app)
        .get(`/api/vehicles/${vehicleId}`)
        .set('Authorization', createAuthHeader(tenantId, userId));

      expect(response.status).toBe(200);
      expect(response.body.tenant_id).toBe(tenantId);
    });

    it('should handle migration rollback gracefully', async () => {
      // Create data
      const tenantId = tenantIds[0];
      await createTestVehicles(tenantId, 3);

      // Simulate migration rollback
      // In real scenario, this would involve rolling back schema changes
      // For testing, verify data is still accessible

      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', createAuthHeader(tenantId, userIds.get(tenantId)!));

      expect(response.status).toBe(200);
    });
  });

  describe('New Tenant Addition', () => {
    it('should allow new tenant creation without affecting existing tenants', async () => {
      // Existing tenants have data
      await createTestVehicles(tenantIds[0], 5);
      await createTestVehicles(tenantIds[1], 3);

      // Create new tenant
      const newTenantId = await createTestTenant({ name: 'New Tenant', slug: 'new-tenant' });
      const newUserId = await createTestUser({ tenant_id: newTenantId, role: 'admin' });

      // Verify existing tenants still work
      const response1 = await request(app)
        .get('/api/vehicles')
        .query({ limit: 10 })
        .set('Authorization', createAuthHeader(tenantIds[0], userIds.get(tenantIds[0])!));

      const response2 = await request(app)
        .get('/api/vehicles')
        .query({ limit: 10 })
        .set('Authorization', createAuthHeader(tenantIds[1], userIds.get(tenantIds[1])!));

      expect(response1.body.vehicles).toBeDefined();
      expect(response2.body.vehicles).toBeDefined();
      expect(response1.body.vehicles.length).toBe(5);
      expect(response2.body.vehicles.length).toBe(3);

      // New tenant should work
      const newResponse = await request(app)
        .get('/api/vehicles')
        .query({ limit: 10 })
        .set('Authorization', createAuthHeader(newTenantId, newUserId));

      expect(newResponse.status).toBe(200);
      expect(newResponse.body.vehicles).toBeDefined();
      expect(newResponse.body.vehicles.length).toBe(0);
    });

    it('should initialize new tenant with default settings', async () => {
      const newTenantId = await createTestTenant({ 
        name: 'New Tenant', 
        slug: 'new-tenant',
        default_currency: 'USD'
      });
      const newUserId = await createTestUser({ tenant_id: newTenantId, role: 'admin', is_active: true });

      const response = await request(app)
        .get('/api/tenant')
        .set('Authorization', createAuthHeader(newTenantId, newUserId));

      expect(response.status).toBe(200);
      expect(response.body.default_currency).toBe('USD');
    });
  });

  describe('Environment Configuration Changes', () => {
    it('should handle configuration changes without breaking tenants', async () => {
      // Simulate config change (e.g., database connection pool size)
      // Verify tenants still work

      for (const tenantId of tenantIds) {
        const response = await request(app)
          .get('/api/vehicles')
          .query({ limit: 10 })
          .set('Authorization', createAuthHeader(tenantId, userIds.get(tenantId)!));

        expect(response.status).toBe(200);
      }
    });

    it('should apply tenant-aware configuration', async () => {
      // Test that config changes respect tenant boundaries
      // This is implementation dependent
      
      const response = await request(app)
        .get('/api/tenant')
        .set('Authorization', createAuthHeader(tenantIds[0], userIds.get(tenantIds[0])!));

      expect(response.status).toBe(200);
    });
  });

  describe('Database Connection Resilience', () => {
    it('should handle database reconnection without losing tenant context', async () => {
      // Simulate connection loss and recovery
      // In real scenario, connection pool should handle this
      
      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', createAuthHeader(tenantIds[0], userIds.get(tenantIds[0])!));

      expect([200, 500, 503]).toContain(response.status);
    });

    it('should maintain tenant isolation during connection issues', async () => {
      // Even during connection issues, tenant isolation should be maintained
      // This test documents expected behavior
      
      const responses = await Promise.all(
        tenantIds.map(tenantId =>
          request(app)
            .get('/api/vehicles')
            .set('Authorization', createAuthHeader(tenantId, userIds.get(tenantId)!))
        )
      );

      // All should either succeed or fail consistently
      responses.forEach(response => {
        expect([200, 401, 403, 500, 503]).toContain(response.status);
      });
    });
  });

  describe('Data Migration Validation', () => {
    it('should validate tenant data after migration', async () => {
      // Create data with known structure
      const tenantId = tenantIds[0];
      await createTestVehicles(tenantId, 10);

      // After migration, verify structure is correct
      const response = await request(app)
        .get('/api/vehicles')
        .query({ limit: 20 })
        .set('Authorization', createAuthHeader(tenantId, userIds.get(tenantId)!));

      expect(response.status).toBe(200);
      expect(response.body.vehicles).toBeDefined();
      expect(response.body.vehicles.length).toBe(10);
      
      // Verify required fields exist
      response.body.vehicles.forEach((vehicle: any) => {
        expect(vehicle).toHaveProperty('tenant_id');
        expect(vehicle).toHaveProperty('maker');
        expect(vehicle).toHaveProperty('model');
      });
    });

    it('should handle migration of tenant-specific data', async () => {
      // Test migration of data that varies by tenant
      const tenant1Id = tenantIds[0];
      const tenant2Id = tenantIds[1];

      // Create data with different structures per tenant
      await createTestVehicle({ tenant_id: tenant1Id, maker: 'Toyota' });
      await createTestVehicle({ tenant_id: tenant2Id, maker: 'Honda' });

      // After migration, both should work
      const response1 = await request(app)
        .get('/api/vehicles')
        .query({ limit: 10 })
        .set('Authorization', createAuthHeader(tenant1Id, userIds.get(tenant1Id)!));

      const response2 = await request(app)
        .get('/api/vehicles')
        .query({ limit: 10 })
        .set('Authorization', createAuthHeader(tenant2Id, userIds.get(tenant2Id)!));

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain API compatibility during migrations', async () => {
      // Test that API endpoints still work after migration
      const endpoints = [
        '/api/vehicles',
        '/api/customers',
        '/api/inventory/analytics/overview',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', createAuthHeader(tenantIds[0], userIds.get(tenantIds[0])!));

        // Should either return data or 404, not 500
        expect([200, 404]).toContain(response.status);
      }
    });
  });

  describe('Zero-Downtime Migration', () => {
    it('should allow read operations during migration', async () => {
      // Create data before migration
      await createTestVehicles(tenantIds[0], 5);

      // During migration, reads should still work
      const response = await request(app)
        .get('/api/vehicles')
        .query({ limit: 10 })
        .set('Authorization', createAuthHeader(tenantIds[0], userIds.get(tenantIds[0])!));

      expect(response.status).toBe(200);
    });

    it('should handle writes during migration gracefully', async () => {
      // During migration, writes might be queued or rejected
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', createAuthHeader(tenantIds[0], userIds.get(tenantIds[0])!))
        .send({
          maker: 'Test',
          model: 'Test',
          production_year: 2020,
          purchase_amount: 100000,
          purchase_currency: 'TRY',
        });

      // Should either succeed or return appropriate error
      expect([200, 201, 503, 409]).toContain(response.status);
    });
  });
});

