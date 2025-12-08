import { testDbPool } from '../setup/database';

export interface TenantData {
  name?: string;
  slug?: string;
  default_currency?: string;
  country?: string;
}

/**
 * Create a test tenant
 */
export async function createTestTenant(data: TenantData = {}): Promise<number> {
  const connection = await testDbPool.getConnection();
  const TEST_DB_NAME = process.env.OTG_DB_NAME_TEST || 'otogaleri_test';
  
  try {
    // Ensure we're using the test database
    await (connection as any).query(`USE ${TEST_DB_NAME}`);
    
    const tenantData = {
      name: data.name || `Test Tenant ${Date.now()}`,
      slug: data.slug || `test-tenant-${Date.now()}`,
      default_currency: data.default_currency || 'TRY',
      country: data.country || 'TR',
    };
    
    const [result] = await (connection as any).query(
      `INSERT INTO tenants (name, slug, default_currency, country) 
       VALUES (?, ?, ?, ?)`,
      [tenantData.name, tenantData.slug, tenantData.default_currency, tenantData.country]
    );
    
    return (result as any).insertId;
  } finally {
    connection.release();
  }
}

/**
 * Create multiple test tenants
 */
export async function createTestTenants(count: number): Promise<number[]> {
  const tenantIds: number[] = [];
  
  for (let i = 0; i < count; i++) {
    const id = await createTestTenant({
      name: `Test Tenant ${i + 1}`,
      slug: `test-tenant-${i + 1}-${Date.now()}`,
    });
    tenantIds.push(id);
  }
  
  return tenantIds;
}

/**
 * Get tenant by ID
 */
export async function getTenantById(tenantId: number): Promise<any> {
  const connection = await testDbPool.getConnection();
  const TEST_DB_NAME = process.env.OTG_DB_NAME_TEST || 'otogaleri_test';
  
  try {
    await (connection as any).query(`USE ${TEST_DB_NAME}`);
    const [rows] = await (connection as any).query(
      'SELECT * FROM tenants WHERE id = ?',
      [tenantId]
    );
    
    return (rows as any[])[0];
  } finally {
    connection.release();
  }
}

/**
 * Delete test tenant
 */
export async function deleteTestTenant(tenantId: number): Promise<void> {
  const connection = await testDbPool.getConnection();
  const TEST_DB_NAME = process.env.OTG_DB_NAME_TEST || 'otogaleri_test';
  
  try {
    await (connection as any).query(`USE ${TEST_DB_NAME}`);
    await (connection as any).query('DELETE FROM tenants WHERE id = ?', [tenantId]);
  } finally {
    connection.release();
  }
}

