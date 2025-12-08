import { testDbPool } from '../setup/database';

export interface BranchData {
  tenant_id: number;
  name?: string;
  code?: string;
  city?: string;
  country?: string;
}

/**
 * Create a test branch
 */
export async function createTestBranch(data: BranchData): Promise<number> {
  const connection = await testDbPool.getConnection();
  
  try {
    const branchData = {
      tenant_id: data.tenant_id,
      name: data.name || `Test Branch ${Date.now()}`,
      code: data.code || `BR${Date.now()}`,
      city: data.city || 'Istanbul',
      country: data.country || 'TR',
    };
    
    const [result] = await (connection as any).query(
      `INSERT INTO branches (tenant_id, name, code, city, country) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        branchData.tenant_id,
        branchData.name,
        branchData.code,
        branchData.city,
        branchData.country,
      ]
    );
    
    return (result as any).insertId;
  } finally {
    connection.release();
  }
}

