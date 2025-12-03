import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";

export async function globalSearch(req: AuthRequest, res: Response) {
  const { query, type = 'all', limit = 20 } = req.query;
  
  if (!query || (query as string).trim().length < 2) {
    return res.json({
      vehicles: [],
      customers: [],
      staff: [],
      branches: [],
      total: 0
    });
  }
  
  const searchTerm = `%${(query as string).trim()}%`;
  const limitNum = parseInt(String(limit), 10) || 20;
  
  // Debug: Log parameters
  console.log('[search] tenantId:', req.tenantId, 'type:', typeof req.tenantId);
  console.log('[search] searchTerm:', searchTerm);
  console.log('[search] limitNum:', limitNum);
  
  // Ensure tenantId is a number
  const tenantId = Number(req.tenantId);
  if (isNaN(tenantId)) {
    return res.status(401).json({ error: "Invalid tenant ID" });
  }
  const results: {
    vehicles: any[];
    customers: any[];
    staff: any[];
    branches: any[];
    total: number;
  } = {
    vehicles: [],
    customers: [],
    staff: [],
    branches: [],
    total: 0
  };
  
  try {
    // Araç arama (features JSON içinde de ara)
    if (type === 'all' || type === 'vehicles') {
      const vehicleQuery = `
        SELECT DISTINCT
          v.id,
          CONCAT(COALESCE(v.maker, ''), ' ', COALESCE(v.model, ''), ' ', COALESCE(v.year, '')) as name,
          v.chassis_no,
          v.maker,
          v.model,
          v.year,
          v.color,
          v.fuel,
          v.transmission,
          v.features,
          v.km,
          v.grade,
          v.plate_number,
          v.chassis_no,
          v.created_at,
          'vehicle' as type,
          CONCAT('/vehicles/', v.id) as url
        FROM vehicles v
        LEFT JOIN vehicle_sales vs ON v.id = vs.vehicle_id AND vs.tenant_id = ?
        WHERE v.tenant_id = ? 
        AND (
          v.maker LIKE ? OR 
          v.model LIKE ? OR 
          v.chassis_no LIKE ? OR
          v.color LIKE ? OR
          v.fuel LIKE ? OR
          v.transmission LIKE ? OR
          v.other LIKE ? OR
          v.grade LIKE ? OR
          v.plate_number LIKE ? OR
          CAST(v.km AS CHAR) LIKE ? OR
          CAST(v.year AS CHAR) LIKE ? OR
          CAST(v.cc AS CHAR) LIKE ? OR
          CONCAT(COALESCE(v.maker, ''), ' ', COALESCE(v.model, '')) LIKE ? OR
          (v.features IS NOT NULL AND v.features LIKE ?) OR
          vs.plate_number LIKE ?
        )
        ORDER BY v.created_at DESC
        LIMIT ?
      `;
      const vehicleParams = [
        tenantId, // JOIN için
        tenantId, // WHERE için
        searchTerm, // v.maker
        searchTerm, // v.model
        searchTerm, // v.chassis_no
        searchTerm, // v.color
        searchTerm, // v.fuel
        searchTerm, // v.transmission
        searchTerm, // v.other
        searchTerm, // v.grade
        searchTerm, // v.plate_number
        searchTerm, // CAST(v.km AS CHAR)
        searchTerm, // CAST(v.year AS CHAR)
        searchTerm, // CAST(v.cc AS CHAR)
        searchTerm, // CONCAT(...)
        searchTerm, // v.features
        searchTerm, // vs.plate_number
        limitNum // LIMIT
      ];
      
      const [vehicles] = await dbPool.query(vehicleQuery, vehicleParams);
      
      results.vehicles = vehicles as any[];
    }
    
    // Müşteri arama (notes içinde de ara)
    if (type === 'all' || type === 'customers') {
      const [customers] = await dbPool.query(`
        SELECT 
          c.id,
          c.name,
          c.email,
          c.phone,
          c.notes,
          'customer' as type,
          CONCAT('/customers/', c.id) as url
        FROM customers c
        WHERE c.tenant_id = ? 
        AND (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.notes LIKE ?)
        ORDER BY c.name ASC
        LIMIT ?
      `, [tenantId, searchTerm, searchTerm, searchTerm, searchTerm, limitNum]);
      
      results.customers = customers as any[];
    }
    
    // Personel arama
    if (type === 'all' || type === 'staff') {
      const [staff] = await dbPool.query(`
        SELECT 
          s.id,
          s.name,
          s.email,
          s.role,
          s.phone,
          'staff' as type,
          CONCAT('/staff/', s.id) as url
        FROM staff s
        WHERE s.tenant_id = ? 
        AND (s.name LIKE ? OR s.email LIKE ? OR s.role LIKE ? OR s.phone LIKE ?)
        ORDER BY s.name ASC
        LIMIT ?
      `, [tenantId, searchTerm, searchTerm, searchTerm, searchTerm, limitNum]);
      
      results.staff = staff as any[];
    }
    
    // Şube arama
    if (type === 'all' || type === 'branches') {
      const [branches] = await dbPool.query(`
        SELECT 
          b.id,
          b.name,
          b.address,
          b.phone,
          'branch' as type,
          CONCAT('/branches/', b.id) as url
        FROM branches b
        WHERE b.tenant_id = ? 
        AND (b.name LIKE ? OR b.address LIKE ? OR b.phone LIKE ?)
        ORDER BY b.name ASC
        LIMIT ?
      `, [Number(req.tenantId), searchTerm, searchTerm, searchTerm, limitNum]);
      
      results.branches = branches as any[];
    }
    
    // Toplam sonuç sayısı
    results.total = results.vehicles.length + 
                   results.customers.length + 
                   results.staff.length + 
                   results.branches.length;
    
    res.json(results);
  } catch (error) {
    console.error('[search] Global search error:', error);
    res.status(500).json({ error: 'Arama işlemi başarısız oldu' });
  }
}

// Quick search suggestions (autocomplete)
export async function getSearchSuggestions(req: AuthRequest, res: Response) {
  const { query } = req.query;
  
  if (!query || (query as string).trim().length < 2) {
    return res.json([]);
  }
  
  const searchTerm = `%${(query as string).trim()}%`;
  
  try {
    // En yaygın arama sonuçlarını al
    const [suggestions] = await dbPool.query(`
      (SELECT name as suggestion, 'customer' as type FROM customers WHERE tenant_id = ? AND name LIKE ? LIMIT 3)
      UNION ALL
      (SELECT name as suggestion, 'staff' as type FROM staff WHERE tenant_id = ? AND name LIKE ? LIMIT 2)
      UNION ALL
      (SELECT CONCAT(COALESCE(maker, ''), ' ', COALESCE(model, '')) as suggestion, 'vehicle' as type 
       FROM vehicles WHERE tenant_id = ? AND (maker LIKE ? OR model LIKE ?) LIMIT 2)
      UNION ALL
      (SELECT name as suggestion, 'branch' as type FROM branches WHERE tenant_id = ? AND name LIKE ? LIMIT 2)
      LIMIT 10
    `, [
      req.tenantId, searchTerm,
      req.tenantId, searchTerm,
      req.tenantId, searchTerm, searchTerm,
      req.tenantId, searchTerm
    ]);
    
    res.json(suggestions);
  } catch (error) {
    console.error('[search] Search suggestions error:', error);
    res.status(500).json({ error: 'Öneriler alınamadı' });
  }
}

// Recent searches
export async function getRecentSearches(req: AuthRequest, res: Response) {
  try {
    // Gerçek arama geçmişi için veritabanında bir tablo oluşturulabilir
    // Şimdilik boş döndürelim - kullanıcı arama yaptıkça frontend'de saklanabilir
    const suggestions: string[] = [];
    
    res.json(suggestions);
  } catch (error) {
    console.error('[search] Recent searches error:', error);
    res.status(500).json({ error: 'Son aramalar alınamadı' });
  }
}

