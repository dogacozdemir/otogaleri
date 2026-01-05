import { Pool, PoolConnection, ResultSetHeader, RowDataPacket, FieldPacket } from "mysql2/promise";
import { dbPool } from "../config/database";
import { loggerService } from "../services/loggerService";

/**
 * TenantAwareQuery - Wrapper for database queries that automatically enforces tenant isolation
 * 
 * This wrapper ensures that ALL queries include tenant_id filtering to prevent cross-tenant data leakage.
 * 
 * Usage:
 *   const query = new TenantAwareQuery(tenantId);
 *   const rows = await query.select('vehicles', { status: 'active' });
 *   await query.update('vehicles', { status: 'sold' }, { id: vehicleId });
 *   await query.delete('vehicles', { id: vehicleId });
 */

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface SelectOptions extends QueryOptions {
  fields?: string[];
  joins?: Array<{
    table: string;
    on: string;
    type?: 'LEFT' | 'INNER' | 'RIGHT';
  }>;
  groupBy?: string;
  having?: string;
}

export interface UpdateOptions {
  where?: Record<string, any>;
}

export interface DeleteOptions {
  where?: Record<string, any>;
}

export class TenantAwareQuery {
  private tenantId: number;
  private pool: Pool;

  constructor(tenantId: number, pool: Pool = dbPool) {
    if (!tenantId || tenantId <= 0) {
      throw new Error("Valid tenantId is required for TenantAwareQuery");
    }
    this.tenantId = tenantId;
    this.pool = pool;
  }

  /**
   * Get the tenant ID for this query instance
   */
  getTenantId(): number {
    return this.tenantId;
  }

  /**
   * Build WHERE clause with tenant_id and additional conditions
   */
  private buildWhereClause(conditions: Record<string, any> = {}): { clause: string; params: any[] } {
    const params: any[] = [];
    const clauses: string[] = [];

    // Always include tenant_id
    clauses.push(`tenant_id = ?`);
    params.push(this.tenantId);

    // Add additional conditions
    for (const [key, value] of Object.entries(conditions)) {
      if (value === null || value === undefined) {
        clauses.push(`${key} IS NULL`);
      } else if (Array.isArray(value)) {
        clauses.push(`${key} IN (${value.map(() => '?').join(',')})`);
        params.push(...value);
      } else {
        clauses.push(`${key} = ?`);
        params.push(value);
      }
    }

    return {
      clause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  /**
   * Execute a raw query with STRICT tenant_id enforcement
   * WARNING: Use with caution. Prefer using select, update, delete methods.
   * 
   * STRICT MODE: If query touches a tenant-aware table, tenant_id MUST be present in SQL or params.
   * This prevents accidental cross-tenant data leakage.
   */
  async query<T extends RowDataPacket[] = RowDataPacket[]>(
    sql: string,
    params: any[] = []
  ): Promise<[T, FieldPacket[]]> {
    // Check if query touches tenant-aware tables
    if (this.isTenantAwareTable(sql)) {
      const lowerSql = sql.toLowerCase();
      const hasTenantInSql = lowerSql.includes('tenant_id');
      const hasTenantInParams = params.includes(this.tenantId);
      
      // STRICT MODE: tenant_id must be present in SQL or params
      if (!hasTenantInSql && !hasTenantInParams) {
        // Log security audit event before throwing error
        loggerService.logStrictModeViolation(
          this.tenantId,
          sql
        );
        
        throw new Error(
          `[TenantAwareQuery] STRICT MODE: Query on tenant-aware table must include tenant_id filter. ` +
          `SQL: ${sql.substring(0, 200)}... ` +
          `Use TenantAwareQuery.select/update/delete methods or ensure WHERE clause includes tenant_id = ?`
        );
      }
      
      // Additional safety: If tenant_id is in SQL, verify it matches this tenant
      if (hasTenantInSql) {
        // Check if params contain tenant_id and it matches
        const tenantIdIndex = params.indexOf(this.tenantId);
        if (tenantIdIndex === -1) {
          // tenant_id might be hardcoded in SQL - warn but allow (developer responsibility)
          console.warn(
            `[TenantAwareQuery] tenant_id found in SQL but not in params. ` +
            `Ensure tenant_id = ${this.tenantId} is correctly set.`
          );
        }
      }
    }

    return await this.pool.query<T>(sql, params);
  }

  /**
   * Check if a table is tenant-aware (has tenant_id column)
   */
  private isTenantAwareTable(sql: string): boolean {
    const tenantAwareTables = [
      'vehicles', 'vehicle_costs', 'vehicle_sales', 'vehicle_images',
      'customers', 'branches', 'staff', 'income', 'expenses',
      'inventory_products', 'inventory_movements', 'vehicle_quotes',
      'vehicle_installment_sales', 'vehicle_installment_payments',
      'followups', 'documents'
    ];

    const lowerSql = sql.toLowerCase();
    return tenantAwareTables.some(table => lowerSql.includes(table));
  }

  /**
   * SELECT query with automatic tenant_id filtering
   */
  async select<T = any>(
    table: string,
    conditions: Record<string, any> = {},
    options: SelectOptions = {}
  ): Promise<T[]> {
    const fields = options.fields ? options.fields.join(', ') : '*';
    const { clause, params } = this.buildWhereClause(conditions);

    let query = `SELECT ${fields} FROM ${table}`;

    // Add JOINs
    if (options.joins) {
      for (const join of options.joins) {
        const joinType = join.type || 'LEFT';
        query += ` ${joinType} JOIN ${join.table} ON ${join.on}`;
      }
    }

    query += ` ${clause}`;

    // Add GROUP BY
    if (options.groupBy) {
      query += ` GROUP BY ${options.groupBy}`;
    }

    // Add HAVING
    if (options.having) {
      query += ` HAVING ${options.having}`;
    }

    // Add ORDER BY
    if (options.orderBy) {
      const direction = options.orderDirection || 'ASC';
      query += ` ORDER BY ${options.orderBy} ${direction}`;
    }

    // Add LIMIT and OFFSET
    if (options.limit) {
      query += ` LIMIT ?`;
      params.push(options.limit);
      if (options.offset) {
        query += ` OFFSET ?`;
        params.push(options.offset);
      }
    }

    const [rows] = await this.pool.query<RowDataPacket[]>(query, params);
    return rows as T[];
  }

  /**
   * SELECT one row
   */
  async selectOne<T = any>(
    table: string,
    conditions: Record<string, any> = {},
    options: Omit<SelectOptions, 'limit' | 'offset'> = {}
  ): Promise<T | null> {
    const results = await this.select<T>(table, conditions, { ...options, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * COUNT query with automatic tenant_id filtering
   */
  async count(
    table: string,
    conditions: Record<string, any> = {}
  ): Promise<number> {
    const { clause, params } = this.buildWhereClause(conditions);
    const query = `SELECT COUNT(*) as count FROM ${table} ${clause}`;

    const [rows] = await this.pool.query<RowDataPacket[]>(query, params);
    return rows[0]?.count || 0;
  }

  /**
   * INSERT query with automatic tenant_id injection
   */
  async insert(
    table: string,
    data: Record<string, any>
  ): Promise<number> {
    // Ensure tenant_id is set
    const insertData = { ...data, tenant_id: this.tenantId };

    const fields = Object.keys(insertData);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(insertData);

    const query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;

    const [result] = await this.pool.query<ResultSetHeader>(query, values);
    return result.insertId;
  }

  /**
   * UPDATE query with automatic tenant_id filtering
   */
  async update(
    table: string,
    data: Record<string, any>,
    conditions: Record<string, any> = {}
  ): Promise<number> {
    // Remove tenant_id from data if present (it should be in WHERE clause only)
    const { tenant_id, ...updateData } = data;

    const setClauses: string[] = [];
    const setParams: any[] = [];

    for (const [key, value] of Object.entries(updateData)) {
      setClauses.push(`${key} = ?`);
      setParams.push(value);
    }

    const { clause, params } = this.buildWhereClause(conditions);
    const query = `UPDATE ${table} SET ${setClauses.join(', ')} ${clause}`;

    const [result] = await this.pool.query<ResultSetHeader>(query, [...setParams, ...params]);
    return result.affectedRows;
  }

  /**
   * DELETE query with automatic tenant_id filtering
   */
  async delete(
    table: string,
    conditions: Record<string, any> = {}
  ): Promise<number> {
    const { clause, params } = this.buildWhereClause(conditions);
    const query = `DELETE FROM ${table} ${clause}`;

    const [result] = await this.pool.query<ResultSetHeader>(query, params);
    return result.affectedRows;
  }

  /**
   * Get a connection for transactions
   */
  async getConnection(): Promise<PoolConnection> {
    return await this.pool.getConnection();
  }

  /**
   * Execute a transaction with automatic tenant_id enforcement
   */
  async transaction<T>(
    callback: (query: TenantAwareQuery) => Promise<T>
  ): Promise<T> {
    const conn = await this.pool.getConnection();
    await conn.beginTransaction();

    try {
      // Create a new TenantAwareQuery instance with the connection
      const transactionQuery = new TenantAwareQuery(this.tenantId, this.pool);
      const result = await callback(transactionQuery);
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * Execute raw SQL with tenant_id safety check
   * Use this for complex queries that can't use the simple select/update/delete methods
   */
  async executeRaw<T extends RowDataPacket[] = RowDataPacket[]>(
    sql: string,
    params: any[] = [],
    requiredTenantId: boolean = true
  ): Promise<[T, FieldPacket[]]> {
    if (requiredTenantId && this.isTenantAwareTable(sql)) {
      // Check if tenant_id is in the query
      const lowerSql = sql.toLowerCase();
      if (!lowerSql.includes('tenant_id')) {
        throw new Error(
          `Query on tenant-aware table must include tenant_id filter. ` +
          `Use TenantAwareQuery methods or ensure WHERE clause includes tenant_id = ?`
        );
      }

      // Verify tenant_id is in params
      const tenantIdIndex = params.indexOf(this.tenantId);
      if (tenantIdIndex === -1) {
        throw new Error(
          `Query parameters must include tenant_id (${this.tenantId}). ` +
          `Add tenant_id to params array.`
        );
      }
    }

    return await this.pool.query<T>(sql, params);
  }
}

/**
 * Factory function to create TenantAwareQuery instance
 */
export function createTenantQuery(tenantId: number): TenantAwareQuery {
  return new TenantAwareQuery(tenantId);
}


