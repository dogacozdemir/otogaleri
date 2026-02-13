import { dbPool } from "../config/database";

/**
 * Tenant için ilk staff id'sini döner; yoksa null.
 * Staff tablosu şimdilik az kullanılıyor, her tenant'ta tek kullanıcı varsayımıyla.
 * uploaded_by gibi alanlarda users.id yerine staff.id gerektiğinde kullanılır.
 */
export async function resolveStaffIdForTenant(tenantId: number): Promise<number | null> {
  const [rows] = await dbPool.query(
    "SELECT id FROM staff WHERE tenant_id = ? AND is_active = 1 LIMIT 1",
    [tenantId]
  );
  const arr = rows as { id: number }[];
  return arr.length > 0 ? arr[0].id : null;
}
