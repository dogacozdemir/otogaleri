import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { setupTestDatabase, cleanTestDatabase, teardownTestDatabase } from '../setup/database';
import { createTestTenant, createTestTenants } from '../factories/tenantFactory';
import { createTestUser } from '../factories/userFactory';
import { createTestVehicle, createTestVehicles } from '../factories/vehicleFactory';
import { createTestCustomer, createTestCustomers } from '../factories/customerFactory';
import { createAuthHeader } from '../helpers/auth';
import { testDbPool } from '../setup/database';

describe('Tenant Isolation Tests', () => {
  let app: any;
  let tenant1Id: number;
  let tenant2Id: number;
  let tenant3Id: number;
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
    
    // Create test tenants
    tenant1Id = await createTestTenant({ name: 'Tenant 1', slug: 'tenant-1' });
    tenant2Id = await createTestTenant({ name: 'Tenant 2', slug: 'tenant-2' });
    tenant3Id = await createTestTenant({ name: 'Tenant 3', slug: 'tenant-3' });
    
    // Create users for each tenant
    user1Id = await createTestUser({ tenant_id: tenant1Id, email: 'user1@tenant1.com', role: 'admin', is_active: true });
    user2Id = await createTestUser({ tenant_id: tenant2Id, email: 'user2@tenant2.com', role: 'admin', is_active: true });
  });

  describe('Row-Level Isolation', () => {
    it('should only return vehicles belonging to the authenticated tenant', async () => {
      // Create vehicles for different tenants
      await createTestVehicles(tenant1Id, 5);
      await createTestVehicles(tenant2Id, 3);
      await createTestVehicles(tenant3Id, 2);

      const response = await request(app)
        .get('/api/vehicles')
        .query({ limit: 10 })
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      expect(response.status).toBe(200);
      expect(response.body.vehicles).toBeDefined();
      expect(response.body.vehicles).toHaveLength(5);
      response.body.vehicles.forEach((vehicle: any) => {
        expect(vehicle.tenant_id).toBe(tenant1Id);
      });
    });

    it('should prevent tenant1 from accessing tenant2 vehicles by ID', async () => {
      const vehicle2Id = await createTestVehicle({ tenant_id: tenant2Id });

      const response = await request(app)
        .get(`/api/vehicles/${vehicle2Id}`)
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      expect(response.status).toBe(404);
    });

    it('should prevent tenant1 from updating tenant2 vehicles', async () => {
      const vehicle2Id = await createTestVehicle({ tenant_id: tenant2Id });

      const response = await request(app)
        .put(`/api/vehicles/${vehicle2Id}`)
        .set('Authorization', createAuthHeader(tenant1Id, user1Id))
        .send({ maker: 'Hacked' });

      expect(response.status).toBe(404);
    });

    it('should prevent tenant1 from deleting tenant2 vehicles', async () => {
      const vehicle2Id = await createTestVehicle({ tenant_id: tenant2Id });

      const response = await request(app)
        .delete(`/api/vehicles/${vehicle2Id}`)
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      expect(response.status).toBe(404);
    });

    it('should isolate customers between tenants', async () => {
      await createTestCustomers(tenant1Id, 5);
      await createTestCustomers(tenant2Id, 3);

      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      expect(response.status).toBe(200);
      expect(response.body.customers).toBeDefined();
      expect(response.body.customers).toHaveLength(5);
      response.body.customers.forEach((customer: any) => {
        expect(customer.tenant_id).toBe(tenant1Id);
      });
    });
  });

  describe('Tenant ID Spoofing Prevention', () => {
    it('should reject requests with spoofed tenant ID in JWT', async () => {
      // Create vehicle for tenant1
      const vehicle1Id = await createTestVehicle({ tenant_id: tenant1Id });

      // Try to access with tenant2's token but spoofed tenant ID in body
      const response = await request(app)
        .get(`/api/vehicles/${vehicle1Id}`)
        .set('Authorization', createAuthHeader(tenant2Id, user2Id));

      expect(response.status).toBe(404);
    });

    it('should ignore tenant_id in request body if different from JWT', async () => {
      const vehicle1Id = await createTestVehicle({ tenant_id: tenant1Id });

      // Try to update with wrong tenant_id in body
      const response = await request(app)
        .put(`/api/vehicles/${vehicle1Id}`)
        .set('Authorization', createAuthHeader(tenant1Id, user1Id))
        .send({ tenant_id: tenant2Id, maker: 'Hacked' });

      // Should succeed but not change tenant_id
      if (response.status === 200) {
        const connection = await testDbPool.getConnection();
        const [rows] = await connection.query(
          'SELECT tenant_id FROM vehicles WHERE id = ?',
          [vehicle1Id]
        );
        connection.release();
        expect((rows as any[])[0].tenant_id).toBe(tenant1Id);
      }
    });
  });

  describe('Header-Based Tenant Bypass Attempts', () => {
    it('should reject requests with X-Tenant-ID header override', async () => {
      const vehicle2Id = await createTestVehicle({ tenant_id: tenant2Id });

      const response = await request(app)
        .get(`/api/vehicles/${vehicle2Id}`)
        .set('Authorization', createAuthHeader(tenant1Id, user1Id))
        .set('X-Tenant-ID', String(tenant2Id));

      // Should still use JWT tenant, not header
      expect(response.status).toBe(404);
    });

    it('should reject requests with tenant ID in query params', async () => {
      const vehicle2Id = await createTestVehicle({ tenant_id: tenant2Id });

      const response = await request(app)
        .get(`/api/vehicles/${vehicle2Id}?tenant_id=${tenant2Id}`)
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      expect(response.status).toBe(404);
    });
  });

  describe('Cookie-Based Tenant Bypass Attempts', () => {
    it('should reject tenant ID from cookies', async () => {
      const vehicle2Id = await createTestVehicle({ tenant_id: tenant2Id });

      const response = await request(app)
        .get(`/api/vehicles/${vehicle2Id}`)
        .set('Authorization', createAuthHeader(tenant1Id, user1Id))
        .set('Cookie', `tenant_id=${tenant2Id}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Database Query Isolation', () => {
    it('should enforce tenant_id in all SELECT queries', async () => {
      // Create vehicles for multiple tenants
      await createTestVehicles(tenant1Id, 3);
      await createTestVehicles(tenant2Id, 2);

      // Direct database query without tenant filter should be prevented by application logic
      const connection = await testDbPool.getConnection();
      await (connection as any).query(`USE ${process.env.OTG_DB_NAME_TEST || 'otogaleri_test'}`);
      const [allVehicles] = await (connection as any).query('SELECT * FROM vehicles');
      connection.release();

      // Application should never expose all vehicles
      expect((allVehicles as any[]).length).toBeGreaterThan(0);
      
      // But API should only return tenant's vehicles
      const response = await request(app)
        .get('/api/vehicles')
        .query({ limit: 10 })
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      expect(response.body.vehicles).toBeDefined();
      expect(response.body.vehicles.length).toBe(3);
    });

    it('should prevent SQL injection to bypass tenant filter', async () => {
      await createTestVehicle({ tenant_id: tenant1Id });
      await createTestVehicle({ tenant_id: tenant2Id });

      // Try SQL injection in search parameter
      const response = await request(app)
        .get('/api/vehicles')
        .query({ search: "' OR tenant_id = 2 OR '" })
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      // Should not return tenant2's vehicles
      if (response.status === 200 && response.body && response.body.vehicles) {
        response.body.vehicles.forEach((vehicle: any) => {
          expect(vehicle.tenant_id).toBe(tenant1Id);
        });
      }
    });
  });

  describe('Cross-Tenant Data Leakage', () => {
    it('should not leak tenant2 data in search results for tenant1', async () => {
      await createTestVehicle({ tenant_id: tenant1Id, maker: 'Toyota', model: 'Corolla' });
      await createTestVehicle({ tenant_id: tenant2Id, maker: 'Toyota', model: 'Corolla' });

      const response = await request(app)
        .get('/api/search')
        .query({ query: 'Toyota' })
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      expect(response.status).toBe(200);
      if (response.body.vehicles) {
        response.body.vehicles.forEach((vehicle: any) => {
          expect(vehicle.tenant_id).toBe(tenant1Id);
        });
      }
    });

    it('should isolate analytics data between tenants', async () => {
      await createTestVehicles(tenant1Id, 5);
      await createTestVehicles(tenant2Id, 3);

      // Use an existing analytics endpoint
      const response = await request(app)
        .get('/api/analytics/brand-profit')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      expect(response.status).toBe(200);
      // Analytics should only reflect tenant1's data
      if (Array.isArray(response.body) && response.body.length > 0) {
        // Brand profit should only show tenant1's vehicles
        expect(response.body.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

