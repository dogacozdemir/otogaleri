import bcrypt from 'bcryptjs';
import { testDbPool } from '../setup/database';

export interface UserData {
  tenant_id: number;
  name?: string;
  email?: string;
  password?: string;
  role?: 'owner' | 'admin' | 'manager' | 'sales' | 'accounting';
  is_active?: boolean;
}

/**
 * Create a test user
 */
export async function createTestUser(data: UserData): Promise<number> {
  const connection = await testDbPool.getConnection();
  
  try {
    const password = data.password || 'test123';
    const passwordHash = await bcrypt.hash(password, 10);
    
    const userData = {
      tenant_id: data.tenant_id,
      name: data.name || `Test User ${Date.now()}`,
      email: data.email || `test-${Date.now()}@example.com`,
      password_hash: passwordHash,
      role: data.role || 'admin',
      is_active: data.is_active !== undefined ? data.is_active : true,
    };
    
    const [result] = await connection.query(
      `INSERT INTO users (tenant_id, name, email, password_hash, role, is_active) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userData.tenant_id,
        userData.name,
        userData.email,
        userData.password_hash,
        userData.role,
        userData.is_active ? 1 : 0,
      ]
    );
    
    return (result as any).insertId;
  } finally {
    connection.release();
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number): Promise<any> {
  const connection = await testDbPool.getConnection();
  
  try {
    const [rows] = await connection.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    return (rows as any[])[0];
  } finally {
    connection.release();
  }
}

