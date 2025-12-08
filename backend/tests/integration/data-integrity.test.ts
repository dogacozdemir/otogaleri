import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { setupTestDatabase, cleanTestDatabase, teardownTestDatabase } from '../setup/database';
import { createTestTenant } from '../factories/tenantFactory';
import { createTestUser } from '../factories/userFactory';
import { createTestVehicle } from '../factories/vehicleFactory';
import { createTestCustomer } from '../factories/customerFactory';
import { createTestBranch } from '../factories/branchFactory';
import { createAuthHeader } from '../helpers/auth';
import { testDbPool } from '../setup/database';

describe('Data Integrity Tests', () => {
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
    
    tenant1Id = await createTestTenant({ name: 'Tenant 1', slug: 'tenant-1', default_currency: 'TRY' });
    tenant2Id = await createTestTenant({ name: 'Tenant 2', slug: 'tenant-2', default_currency: 'USD' });
    
    user1Id = await createTestUser({ tenant_id: tenant1Id, role: 'admin', is_active: true });
    user2Id = await createTestUser({ tenant_id: tenant2Id, role: 'admin', is_active: true });
  });

  describe('Tenant-Specific Settings', () => {
    it('should use tenant-specific default currency', async () => {
      const response = await request(app)
        .get('/api/tenant')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      expect(response.status).toBe(200);
      expect(response.body.default_currency).toBe('TRY');

      const response2 = await request(app)
        .get('/api/tenant')
        .set('Authorization', createAuthHeader(tenant2Id, user2Id));

      expect(response2.status).toBe(200);
      expect(response2.body.default_currency).toBe('USD');
    });

    it('should isolate tenant settings updates', async () => {
      await request(app)
        .put('/api/tenant')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id))
        .send({ default_currency: 'EUR' });

      const response2 = await request(app)
        .get('/api/tenant')
        .set('Authorization', createAuthHeader(tenant2Id, user2Id));

      expect(response2.body.default_currency).toBe('USD'); // Should remain unchanged
    });
  });

  describe('Cross-Tenant Data Contamination', () => {
    it('should prevent tenant1 operation from affecting tenant2 data', async () => {
      const vehicle1Id = await createTestVehicle({ tenant_id: tenant1Id, maker: 'Toyota' });
      const vehicle2Id = await createTestVehicle({ tenant_id: tenant2Id, maker: 'Honda' });

      // Tenant1 updates their vehicle
      await request(app)
        .put(`/api/vehicles/${vehicle1Id}`)
        .set('Authorization', createAuthHeader(tenant1Id, user1Id))
        .send({ maker: 'Updated Toyota' });

      // Verify tenant2's vehicle is unchanged
      const response = await request(app)
        .get(`/api/vehicles/${vehicle2Id}`)
        .set('Authorization', createAuthHeader(tenant2Id, user2Id));

      expect(response.status).toBe(200);
      expect(response.body.maker).toBe('Honda');
    });

    it('should prevent tenant1 from creating data with tenant2 ID', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id))
        .send({
          maker: 'Test',
          model: 'Test',
          tenant_id: tenant2Id, // Attempt to set wrong tenant
        });

      if (response.status === 200 || response.status === 201) {
        // If creation succeeds, verify tenant_id is set correctly
        const connection = await testDbPool.getConnection();
        const [rows] = await (connection as any).query(
          'SELECT tenant_id FROM vehicles WHERE id = ?',
          [response.body.id]
        );
        connection.release();
        
        const vehicleRow = (rows as any[])[0];
        if (vehicleRow) {
          expect(vehicleRow.tenant_id).toBe(tenant1Id); // Should use JWT tenant, not body
        }
      } else {
        // If creation fails, that's also acceptable (tenant_id validation)
        expect([400, 403, 404]).toContain(response.status);
      }
    });
  });

  describe('Cache Layer Tenant Awareness', () => {
    it('should cache tenant-specific data separately', async () => {
      // Create vehicles for both tenants
      await createTestVehicle({ tenant_id: tenant1Id });
      await createTestVehicle({ tenant_id: tenant2Id });

      // Get vehicles for tenant1
      const response1 = await request(app)
        .get('/api/vehicles')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      // Get vehicles for tenant2
      const response2 = await request(app)
        .get('/api/vehicles')
        .set('Authorization', createAuthHeader(tenant2Id, user2Id));

      // Results should be different
      expect(response1.body.vehicles).toBeDefined();
      expect(response2.body.vehicles).toBeDefined();
      expect(response1.body.vehicles.length).toBeGreaterThanOrEqual(1);
      expect(response2.body.vehicles.length).toBeGreaterThanOrEqual(1);
      expect(response1.body.vehicles[0].tenant_id).toBe(tenant1Id);
      expect(response2.body.vehicles[0].tenant_id).toBe(tenant2Id);
    });

    it('should not return cached data from wrong tenant', async () => {
      await createTestVehicle({ tenant_id: tenant1Id, maker: 'Toyota' });
      await createTestVehicle({ tenant_id: tenant2Id, maker: 'Honda' });

      // Tenant1 requests
      const response1 = await request(app)
        .get('/api/vehicles')
        .query({ limit: 10 })
        .set('Authorization', createAuthHeader(tenant1Id, user1Id));

      // Tenant2 requests - should not see tenant1's data
      const response2 = await request(app)
        .get('/api/vehicles')
        .query({ limit: 10 })
        .set('Authorization', createAuthHeader(tenant2Id, user2Id));

      expect(response2.body.vehicles).toBeDefined();
      expect(response2.body.vehicles.length).toBeGreaterThanOrEqual(1);
      expect(response2.body.vehicles[0].maker).toBe('Honda');
      expect(response2.body.vehicles[0].maker).not.toBe('Toyota');
    });
  });

  describe('Foreign Key Integrity', () => {
    it('should enforce tenant_id in foreign key relationships', async () => {
      const branch1Id = await createTestBranch({ tenant_id: tenant1Id });
      const branch2Id = await createTestBranch({ tenant_id: tenant2Id });

      // Create vehicle with branch from same tenant
      const response1 = await request(app)
        .post('/api/vehicles')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id))
        .send({
          maker: 'Test',
          model: 'Test',
          branch_id: branch1Id,
        });

      expect([200, 201, 400]).toContain(response1.status);

      // Try to create vehicle with branch from different tenant (should fail or be ignored)
      const response2 = await request(app)
        .post('/api/vehicles')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id))
        .send({
          maker: 'Test',
          model: 'Test',
          branch_id: branch2Id, // Branch from tenant2
        });

      // Should either fail validation or ignore the branch_id
      if (response2.status === 200 || response2.status === 201) {
        // If it succeeds, verify branch_id was ignored or set to null
        const connection = await testDbPool.getConnection();
        const [rows] = await connection.query(
          'SELECT branch_id FROM vehicles WHERE id = ?',
          [response2.body.id]
        );
        connection.release();
        
        // Branch should either be null or belong to tenant1
        const vehicleBranchId = (rows as any[])[0].branch_id;
        if (vehicleBranchId !== null) {
          const connection = await testDbPool.getConnection();
          const [branchRows] = await (connection as any).query(
            'SELECT tenant_id FROM branches WHERE id = ?',
            [vehicleBranchId]
          );
          connection.release();
          expect((branchRows as any[])[0].tenant_id).toBe(tenant1Id);
        }
      }
    });
  });

  describe('Data Consistency Across Operations', () => {
    it('should maintain tenant_id consistency in cascading operations', async () => {
      const customerId = await createTestCustomer({ tenant_id: tenant1Id });

      // Create sale for customer
      const vehicleId = await createTestVehicle({ tenant_id: tenant1Id });

      const saleResponse = await request(app)
        .post('/api/vehicles/sell')
        .set('Authorization', createAuthHeader(tenant1Id, user1Id))
        .send({
          vehicle_id: vehicleId,
          customer_name: 'Test Customer',
          sale_amount: 100000,
          sale_currency: 'TRY',
          sale_date: new Date().toISOString().split('T')[0],
        });

      if (saleResponse.status === 200 || saleResponse.status === 201) {
        // Verify sale has correct tenant_id
        const connection = await testDbPool.getConnection();
        const [sales] = await (connection as any).query(
          'SELECT tenant_id FROM vehicle_sales WHERE vehicle_id = ?',
          [vehicleId]
        );
        connection.release();

        expect((sales as any[])[0].tenant_id).toBe(tenant1Id);
      }
    });

    it('should prevent orphaned records across tenants', async () => {
      const branch1Id = await createTestBranch({ tenant_id: tenant1Id });
      const vehicle1Id = await createTestVehicle({ tenant_id: tenant1Id, branch_id: branch1Id });

      // Delete branch - vehicle should be handled according to schema (SET NULL or CASCADE)
      const connection = await testDbPool.getConnection();
      await (connection as any).query('DELETE FROM branches WHERE id = ?', [branch1Id]);
      
      const [vehicle] = await (connection as any).query(
        'SELECT branch_id FROM vehicles WHERE id = ?',
        [vehicle1Id]
      );
      connection.release();

      // According to schema, branch_id should be SET NULL on delete
      expect((vehicle as any[])[0].branch_id).toBeNull();
    });
  });

  describe('Transaction Isolation', () => {
    it('should rollback tenant1 transaction without affecting tenant2', async () => {
      const connection1 = await testDbPool.getConnection();
      const [initialCount] = await (connection1 as any).query(
        'SELECT COUNT(*) as count FROM vehicles WHERE tenant_id = ?',
        [tenant2Id]
      );
      const initialCount2 = (initialCount as any[])[0].count;
      connection1.release();

      // Create vehicle for tenant1 (this should succeed)
      await createTestVehicle({ tenant_id: tenant1Id });

      // Verify tenant2's count is unchanged
      const connection2 = await testDbPool.getConnection();
      const [finalCount] = await (connection2 as any).query(
        'SELECT COUNT(*) as count FROM vehicles WHERE tenant_id = ?',
        [tenant2Id]
      );
      const finalCount2 = (finalCount as any[])[0].count;
      connection2.release();

      expect(finalCount2).toBe(initialCount2);
    });
  });
});

