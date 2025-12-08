import { testDbPool } from '../setup/database';

export interface VehicleData {
  tenant_id: number;
  branch_id?: number | null;
  vehicle_number?: number | null;
  maker?: string;
  model?: string;
  production_year?: number;
  purchase_amount?: number;
  purchase_currency?: string;
  sale_price?: number;
  sale_currency?: string;
  status?: 'new' | 'used' | 'damaged' | 'repaired';
  stock_status?: 'in_stock' | 'on_sale' | 'reserved' | 'sold';
  is_sold?: boolean;
}

/**
 * Create a test vehicle
 */
export async function createTestVehicle(data: VehicleData): Promise<number> {
  const connection = await testDbPool.getConnection();
  
  try {
    const vehicleData = {
      tenant_id: data.tenant_id,
      branch_id: data.branch_id || null,
      vehicle_number: data.vehicle_number || null,
      maker: data.maker || 'Toyota',
      model: data.model || 'Corolla',
      production_year: data.production_year || 2020,
      purchase_amount: data.purchase_amount || 100000,
      purchase_currency: data.purchase_currency || 'TRY',
      purchase_fx_rate_to_base: 1.0,
      sale_price: data.sale_price || null,
      sale_currency: data.sale_currency || null,
      sale_fx_rate_to_base: null,
      status: data.status || 'used',
      stock_status: data.stock_status || 'in_stock',
      is_sold: data.is_sold !== undefined ? data.is_sold : false,
    };
    
    const [result] = await connection.query(
      `INSERT INTO vehicles (
        tenant_id, branch_id, vehicle_number, maker, model, production_year,
        purchase_amount, purchase_currency, purchase_fx_rate_to_base,
        sale_price, sale_currency, sale_fx_rate_to_base,
        status, stock_status, is_sold
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicleData.tenant_id,
        vehicleData.branch_id,
        vehicleData.vehicle_number,
        vehicleData.maker,
        vehicleData.model,
        vehicleData.production_year,
        vehicleData.purchase_amount,
        vehicleData.purchase_currency,
        vehicleData.purchase_fx_rate_to_base,
        vehicleData.sale_price,
        vehicleData.sale_currency,
        vehicleData.sale_fx_rate_to_base,
        vehicleData.status,
        vehicleData.stock_status,
        vehicleData.is_sold ? 1 : 0,
      ]
    );
    
    return (result as any).insertId;
  } finally {
    connection.release();
  }
}

/**
 * Create multiple test vehicles for a tenant
 */
export async function createTestVehicles(
  tenantId: number,
  count: number,
  overrides: Partial<VehicleData> = {}
): Promise<number[]> {
  const vehicleIds: number[] = [];
  
  for (let i = 0; i < count; i++) {
    const id = await createTestVehicle({
      tenant_id: tenantId,
      maker: `Maker${i + 1}`,
      model: `Model${i + 1}`,
      ...overrides,
    });
    vehicleIds.push(id);
  }
  
  return vehicleIds;
}

