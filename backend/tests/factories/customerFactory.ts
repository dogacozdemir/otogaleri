import { testDbPool } from '../setup/database';

export interface CustomerData {
  tenant_id: number;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

/**
 * Create a test customer
 */
export async function createTestCustomer(data: CustomerData): Promise<number> {
  const connection = await testDbPool.getConnection();
  
  try {
    const customerData = {
      tenant_id: data.tenant_id,
      name: data.name || `Test Customer ${Date.now()}`,
      phone: data.phone || `555-${Date.now().toString().slice(-6)}`,
      email: data.email || `customer-${Date.now()}@example.com`,
      address: data.address || null,
      notes: data.notes || null,
      total_spent_base: 0,
    };
    
    const [result] = await connection.query(
      `INSERT INTO customers (tenant_id, name, phone, email, address, notes, total_spent_base) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        customerData.tenant_id,
        customerData.name,
        customerData.phone,
        customerData.email,
        customerData.address,
        customerData.notes,
        customerData.total_spent_base,
      ]
    );
    
    return (result as any).insertId;
  } finally {
    connection.release();
  }
}

/**
 * Create multiple test customers
 */
export async function createTestCustomers(
  tenantId: number,
  count: number
): Promise<number[]> {
  const customerIds: number[] = [];
  
  for (let i = 0; i < count; i++) {
    const id = await createTestCustomer({
      tenant_id: tenantId,
      name: `Customer ${i + 1}`,
      phone: `555-${String(i + 1).padStart(6, '0')}`,
    });
    customerIds.push(id);
  }
  
  return customerIds;
}

