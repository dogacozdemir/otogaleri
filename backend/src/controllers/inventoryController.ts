import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import { getOrFetchRate } from "../services/fxCacheService";
import { SupportedCurrency } from "../services/currencyService";

// Ürün listesi
export async function listProducts(req: AuthRequest, res: Response) {
  try {
    const [rows] = await dbPool.query(
      `SELECT id, sku, name, category, unit, current_stock, min_stock,
              cost_price, cost_currency, sale_price, sale_currency, sales_count, is_for_sale, is_for_service,
              track_stock, created_at, updated_at
       FROM inventory_products
       WHERE tenant_id = ?
       ORDER BY name ASC`,
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    console.error("[inventory] List error", err);
    res.status(500).json({ error: "Failed to list products" });
  }
}

// Ürün oluştur (opsiyonel initial_stock ile giriş hareketi yapar)
export async function createProduct(req: AuthRequest, res: Response) {
  const {
    name,
    sku = null,
    category = null,
    unit = "adet",
    cost_price = null,
    cost_currency = null,
    sale_price = null,
    sale_currency = null,
    min_stock = 0,
    initial_stock = 0,
    is_for_sale = false,
    is_for_service = true,
    track_stock = true,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Product name required" });
  }

  try {
    // Get tenant's base currency
    const [tenantRows] = await dbPool.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";
    // Cost price her zaman base currency'de saklanır
    const finalCostCurrency = baseCurrency; // Her zaman base currency
    const finalSaleCurrency = sale_currency || baseCurrency;

    // Cost price'ı base currency'ye çevir (eğer farklı currency ile girildiyse)
    let costFxRate = 1.0; // Base currency'de olduğu için 1.0
    let finalCostPrice = cost_price;
    if (cost_price && cost_currency && cost_currency !== baseCurrency) {
      // Farklı currency ile girildiyse base currency'ye çevir
      if (!req.tenantQuery) {
        return res.status(500).json({ error: "Tenant query not available" });
      }
      const fxRate = await getOrFetchRate(
        req.tenantQuery,
        cost_currency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        new Date().toISOString().split('T')[0]
      );
      finalCostPrice = Number(cost_price) * fxRate; // Base currency'ye çevir
      costFxRate = 1.0; // Base currency'de olduğu için 1.0
    }

    // Calculate FX rates for sale_price
    let saleFxRate = 1;
    if (sale_price && finalSaleCurrency !== baseCurrency) {
      if (!req.tenantQuery) {
        return res.status(500).json({ error: "Tenant query not available" });
      }
      saleFxRate = await getOrFetchRate(
        req.tenantQuery,
        finalSaleCurrency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        new Date().toISOString().split('T')[0]
      );
    }

    // track_stock false ise min_stock ve initial_stock'u 0 yap
    const finalMinStock = track_stock ? (Number(min_stock) || 0) : 0;
    const finalInitialStock = track_stock ? (Number(initial_stock) || 0) : 0;

    // Ürünü ekle
    // cost_price her zaman base currency'de saklanır
    const [ins] = await dbPool.query(
      `INSERT INTO inventory_products
       (tenant_id, sku, name, category, unit, current_stock, min_stock, cost_price, cost_currency, cost_fx_rate_to_base,
        sale_price, sale_currency, sale_fx_rate_to_base, is_for_sale, is_for_service, track_stock)
       VALUES (?, NULLIF(?,''), ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenantId,
        sku,
        name.trim(),
        category,
        unit,
        finalMinStock,
        finalCostPrice, // Base currency'ye çevrilmiş değer
        baseCurrency, // Her zaman base currency
        costFxRate, // 1.0 (base currency'de)
        sale_price,
        finalSaleCurrency,
        saleFxRate,
        is_for_sale,
        is_for_service,
        track_stock,
      ]
    );

    const productId = (ins as any).insertId;

    // initial_stock > 0 ve track_stock true ise giriş hareketi ve stok artır
    if (track_stock && finalInitialStock > 0 && finalCostPrice) {
      // Movement'te orijinal currency ve fiyat kaydedilir (tarihsel doğruluk için)
      const movementCostCurrency = cost_currency || baseCurrency;
      const movementCostPrice = cost_price || finalCostPrice;
      const movementCostFxRate = cost_currency && cost_currency !== baseCurrency 
        ? await getOrFetchRate(
            req.tenantQuery!,
            cost_currency as SupportedCurrency,
            baseCurrency as SupportedCurrency,
            new Date().toISOString().split('T')[0]
          )
        : 1.0;
      
      await dbPool.query(
        `INSERT INTO inventory_movements
         (tenant_id, product_id, type, quantity, cost_price, cost_currency, cost_fx_rate_to_base, cost_amount_base, note, staff_id)
         VALUES (?, ?, 'in', ?, ?, ?, ?, ?, 'Başlangıç stoğu', ?)`,
        [
          req.tenantId,
          productId,
          finalInitialStock,
          movementCostPrice, // Orijinal fiyat (giriş anındaki)
          movementCostCurrency, // Orijinal currency
          movementCostFxRate,
          finalCostPrice, // Base currency'deki değer
          req.userId || null
        ]
      );

      await dbPool.query(
        `UPDATE inventory_products
         SET current_stock = current_stock + ?
         WHERE id = ? AND tenant_id = ?`,
        [finalInitialStock, productId, req.tenantId]
      );
    }

    const [createdRows] = await dbPool.query(
      `SELECT id, sku, name, category, unit, current_stock, min_stock,
              cost_price, cost_currency, sale_price, sale_currency, sales_count, is_for_sale, is_for_service,
              track_stock, created_at, updated_at
       FROM inventory_products WHERE id = ? AND tenant_id = ?`,
      [productId, req.tenantId]
    );
    const created = (createdRows as any[])[0];

    res.status(201).json(created);
  } catch (err: any) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "SKU already exists" });
    }
    console.error("[inventory] Create error", err);
    res.status(500).json({ error: "Failed to create product" });
  }
}

// Ürün güncelle
export async function updateProduct(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const {
    name,
    sku = null,
    category = null,
    unit = "adet",
    cost_price = null,
    cost_currency = null,
    sale_price = null,
    sale_currency = null,
    min_stock = 0,
    is_for_sale = false,
    is_for_service = true,
    track_stock = true,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Product name required" });
  }

  try {
    // Get tenant's base currency
    const [tenantRows] = await dbPool.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";
    
    // Cost price her zaman base currency'de saklanır
    const finalCostCurrency = baseCurrency; // Her zaman base currency
    const finalSaleCurrency = sale_currency || baseCurrency; // Sale currency kullanıcı tarafından belirlenebilir

    // Calculate FX rates for cost_price (eğer farklı currency ile girildiyse base currency'ye çevir)
    let costFxRate = 1.0; // Base currency'de olduğu için 1.0
    let finalCostPrice = cost_price;
    if (cost_price && cost_currency && cost_currency !== baseCurrency) {
      // Farklı currency ile girildiyse base currency'ye çevir
      if (!req.tenantQuery) {
        return res.status(500).json({ error: "Tenant query not available" });
      }
      const fxRate = await getOrFetchRate(
        req.tenantQuery,
        cost_currency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        new Date().toISOString().split('T')[0]
      );
      finalCostPrice = Number(cost_price) * fxRate; // Base currency'ye çevir
      costFxRate = 1.0; // Base currency'de olduğu için 1.0
    }

    // Calculate FX rates for sale_price
    let saleFxRate = 1;
    if (sale_price && finalSaleCurrency !== baseCurrency) {
      if (!req.tenantQuery) {
        return res.status(500).json({ error: "Tenant query not available" });
      }
      saleFxRate = await getOrFetchRate(
        req.tenantQuery,
        finalSaleCurrency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        new Date().toISOString().split('T')[0]
      );
    }

    // track_stock false ise min_stock'u 0 yap
    const finalMinStock = track_stock ? (Number(min_stock) || 0) : 0;

    const [upd] = await dbPool.query(
      `UPDATE inventory_products
       SET sku = NULLIF(?,''), name = ?, category = ?, unit = ?,
           cost_price = ?, cost_currency = ?, cost_fx_rate_to_base = ?,
           sale_price = ?, sale_currency = ?, sale_fx_rate_to_base = ?,
           min_stock = ?, is_for_sale = ?, is_for_service = ?, track_stock = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        sku,
        name.trim(),
        category,
        unit,
        finalCostPrice, // Base currency'ye çevrilmiş değer
        finalCostCurrency, // Her zaman base currency
        costFxRate, // 1.0 (base currency'de)
        sale_price,
        finalSaleCurrency,
        saleFxRate,
        finalMinStock,
        is_for_sale,
        is_for_service,
        track_stock,
        id,
        req.tenantId,
      ]
    );

    if ((upd as any).affectedRows === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const [rows] = await dbPool.query(
      `SELECT id, sku, name, category, unit, current_stock, min_stock,
              cost_price, cost_currency, sale_price, sale_currency, sales_count, is_for_sale, is_for_service,
              track_stock, created_at, updated_at
       FROM inventory_products WHERE id = ? AND tenant_id = ?`,
      [id, req.tenantId]
    );
    const row = (rows as any[])[0];
    res.json(row);
  } catch (err: any) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "SKU already exists" });
    }
    console.error("[inventory] Update error", err);
    res.status(500).json({ error: "Failed to update product" });
  }
}

// Ürün sil
export async function deleteProduct(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [del] = await dbPool.query(
      `DELETE FROM inventory_products WHERE id = ? AND tenant_id = ?`,
      [id, req.tenantId]
    );
    if ((del as any).affectedRows === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    // movements CASCADE ile silinir
    res.json({ success: true });
  } catch (err) {
    console.error("[inventory] Delete error", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
}

// Stok Girişi (Alış fiyatı ortalaması ile)
export async function handleEntry(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { quantity, cost_price, cost_currency } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: "Valid quantity required" });
  }

  try {
    // Get tenant's base currency
    const [tenantRows] = await dbPool.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";

    // Mevcut ürün bilgilerini al
    const [productRows] = await dbPool.query(
      `SELECT current_stock, cost_price, cost_currency, cost_fx_rate_to_base, track_stock FROM inventory_products 
       WHERE id = ? AND tenant_id = ?`,
      [id, req.tenantId]
    );
    const productRowsArray = productRows as any[];
    const product = productRowsArray[0];

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const trackStock = product.track_stock === true || product.track_stock === 1; // MySQL boolean 0/1

    const entryCostCurrency = cost_currency || product.cost_currency || baseCurrency;
    const entryCostPrice = cost_price || product.cost_price;

    // Calculate FX rate for entry
    let entryCostFxRate = 1;
    if (entryCostPrice && entryCostCurrency !== baseCurrency) {
      if (!req.tenantQuery) {
        return res.status(500).json({ error: "Tenant query not available" });
      }
      entryCostFxRate = await getOrFetchRate(
        req.tenantQuery,
        entryCostCurrency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        new Date().toISOString().split('T')[0]
      );
    } else if (entryCostPrice && product.cost_currency && product.cost_currency === entryCostCurrency) {
      entryCostFxRate = product.cost_fx_rate_to_base || 1;
    }

    let newCostPrice = product.cost_price;
    let newCostCurrency = baseCurrency; // Her zaman base currency
    let newCostFxRate = 1.0; // Base currency'de olduğu için 1.0

    // Eğer yeni alış fiyatı girilmişse ve track_stock true ise ortalama hesapla
    if (trackStock && entryCostPrice) {
      // Convert both to base currency for averaging
      const currentValueBase = (product.current_stock || 0) * (product.cost_price || 0) * (product.cost_fx_rate_to_base || 1);
      const newValueBase = quantity * entryCostPrice * entryCostFxRate;
      const totalQuantity = (product.current_stock || 0) + quantity;

      if (totalQuantity > 0) {
        const avgCostBase = (currentValueBase + newValueBase) / totalQuantity;
        // Ortalama maliyeti her zaman base currency'de sakla
        newCostPrice = avgCostBase; // Base currency'de sakla
        newCostCurrency = baseCurrency; // Her zaman base currency
        newCostFxRate = 1.0; // Base currency'de olduğu için 1.0
      }
    } else if (entryCostPrice) {
      // track_stock false ise yeni fiyatı base currency'ye çevirerek kaydet
      newCostPrice = entryCostPrice * entryCostFxRate; // Base currency'ye çevir
      newCostCurrency = baseCurrency; // Her zaman base currency
      newCostFxRate = 1.0; // Base currency'de olduğu için 1.0
    }

    // Stok hareketi kaydet (her zaman kaydet, finansal takip için)
    // entryCostPrice kullan (giriş anındaki gerçek fiyat)
    const movementCostPrice = entryCostPrice || newCostPrice;
    const movementCostCurrency = entryCostCurrency;
    const movementCostFxRate = entryCostFxRate;
    const movementCostAmountBase = movementCostPrice * movementCostFxRate;
    
    await dbPool.query(
      `INSERT INTO inventory_movements 
       (tenant_id, product_id, type, quantity, cost_price, cost_currency, cost_fx_rate_to_base, cost_amount_base, staff_id)
       VALUES (?, ?, 'in', ?, ?, ?, ?, ?, ?)`,
      [
        req.tenantId,
        id,
        quantity,
        movementCostPrice,
        movementCostCurrency,
        movementCostFxRate,
        movementCostAmountBase,
        req.userId || null
      ]
    );

    // Ürün stoğunu ve alış fiyatını güncelle (sadece track_stock true ise)
    if (trackStock) {
      // Ortalama maliyet her zaman base currency'de saklanır
      // cost_price ve cost_currency her zaman base currency
      await dbPool.query(
        `UPDATE inventory_products 
         SET current_stock = current_stock + ?, cost_price = ?, cost_currency = ?, cost_fx_rate_to_base = ?
         WHERE id = ? AND tenant_id = ?`,
        [quantity, newCostPrice, newCostCurrency, newCostFxRate, id, req.tenantId]
      );
    } else {
      // track_stock false ise cost_price'ı base currency'ye çevirerek güncelle
      await dbPool.query(
        `UPDATE inventory_products 
         SET cost_price = ?, cost_currency = ?, cost_fx_rate_to_base = ?
         WHERE id = ? AND tenant_id = ?`,
        [newCostPrice, newCostCurrency, newCostFxRate, id, req.tenantId]
      );
    }

    res.json({
      message: "Stock entry recorded successfully",
      new_cost_price: newCostPrice,
    });
  } catch (err) {
    console.error("[inventory] Entry error", err);
    res.status(500).json({ error: "Failed to record stock entry" });
  }
}

// Stok Çıkışı (Satış veya Servis)
export async function handleExit(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { type, quantity, customer_id, sale_price, sale_currency, staff_id } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: "Valid quantity required" });
  }

  if (!["sale", "service"].includes(type)) {
    return res.status(400).json({ error: "Invalid exit type" });
  }

  try {
    // Get tenant's base currency
    const [tenantRows] = await dbPool.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";

    // Get product info
    const [productRows] = await dbPool.query(
      `SELECT current_stock, sale_price, sale_currency, sale_fx_rate_to_base, track_stock FROM inventory_products 
       WHERE id = ? AND tenant_id = ?`,
      [id, req.tenantId]
    );
    const productRowsArray = productRows as any[];
    const product = productRowsArray[0];

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const trackStock = product.track_stock === true || product.track_stock === 1;
    if (trackStock && (product.current_stock || 0) < quantity) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    const exitSaleCurrency = sale_currency || product.sale_currency || baseCurrency;
    const exitSalePrice = sale_price || product.sale_price;

    // Calculate FX rate for exit
    let exitSaleFxRate = 1;
    if (exitSalePrice && exitSaleCurrency !== baseCurrency) {
      if (!req.tenantQuery) {
        return res.status(500).json({ error: "Tenant query not available" });
      }
      exitSaleFxRate = await getOrFetchRate(
        req.tenantQuery,
        exitSaleCurrency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        new Date().toISOString().split('T')[0]
      );
    } else if (exitSalePrice && product.sale_currency && product.sale_currency === exitSaleCurrency) {
      exitSaleFxRate = product.sale_fx_rate_to_base || 1;
    }

    // Stok hareketi kaydet (her zaman kaydet, finansal takip için)
    const movementType = type === "sale" ? "sale" : "service_usage";
    const selectedStaffId = staff_id || req.userId || null;
    await dbPool.query(
      `INSERT INTO inventory_movements 
       (tenant_id, product_id, type, quantity, sale_price, sale_currency, sale_fx_rate_to_base, sale_amount_base, customer_id, staff_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenantId,
        id,
        movementType,
        quantity,
        exitSalePrice || null,
        exitSaleCurrency,
        exitSaleFxRate,
        exitSalePrice ? exitSalePrice * exitSaleFxRate : null,
        customer_id || null,
        selectedStaffId,
      ]
    );

    // Ürün stoğunu güncelle (sadece track_stock true ise)
    if (trackStock) {
      await dbPool.query(
        `UPDATE inventory_products 
         SET current_stock = current_stock - ?, 
             sales_count = sales_count + ?
         WHERE id = ? AND tenant_id = ?`,
        [quantity, type === "sale" ? quantity : 0, id, req.tenantId]
      );
    } else {
      // track_stock false ise sadece sales_count'u güncelle
      await dbPool.query(
        `UPDATE inventory_products 
         SET sales_count = sales_count + ?
         WHERE id = ? AND tenant_id = ?`,
        [type === "sale" ? quantity : 0, id, req.tenantId]
      );
    }

    // Get product name for response
    const [productNameRows] = await dbPool.query(
      `SELECT name FROM inventory_products WHERE id = ? AND tenant_id = ?`,
      [id, req.tenantId]
    );
    const productName = (productNameRows as any[])[0]?.name || "";

    // Güncellenmiş stok seviyesini al
    const [updatedRows] = await dbPool.query(
      `SELECT current_stock, min_stock, name, track_stock FROM inventory_products 
       WHERE id = ? AND tenant_id = ?`,
      [id, req.tenantId]
    );
    const updatedProduct = (updatedRows as any[])[0];

    // Eğer satışsa, gelir kaydı oluştur
    if (type === "sale" && exitSalePrice && customer_id) {
      const totalAmount = exitSalePrice * quantity;

      // Müşteri bilgilerini al
      const [customerRows] = await dbPool.query(
        `SELECT name FROM customers WHERE id = ? AND tenant_id = ?`,
        [customer_id, req.tenantId]
      );
      const customerRowsArray = customerRows as any[];
      const customer = customerRowsArray[0];

      // Gelir kaydı oluştur
      await dbPool.query(
        `INSERT INTO inventory_sales 
         (tenant_id, product_id, customer_id, quantity, unit_price, total_amount, staff_id, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.tenantId,
          id,
          customer_id,
          quantity,
          exitSalePrice,
          totalAmount,
          selectedStaffId,
          `${productName} - ${customer?.name || "Customer"} sale`,
        ]
      );
    }

    const remainingStock = trackStock ? (product.current_stock - quantity) : null;

    res.json({
      message: type === "sale" ? "Sale recorded successfully" : "Service usage recorded",
      remaining_stock: remainingStock,
    });
  } catch (err) {
    console.error("[inventory] Exit error", err);
    res.status(500).json({ error: "Failed to record stock exit" });
  }
}

// Hareket listesi
export async function listMovements(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [rows] = await dbPool.query(
      `SELECT 
        im.id, 
        im.type, 
        im.quantity, 
        im.note, 
        im.staff_id, 
        im.movement_date,
        im.cost_price,
        im.sale_price,
        im.customer_id,
        s.name as staff_name, 
        ip.name as product_name,
        c.name as customer_name,
        c.phone as customer_phone
       FROM inventory_movements im
       LEFT JOIN staff s ON im.staff_id = s.id AND im.tenant_id = s.tenant_id
       LEFT JOIN inventory_products ip ON im.product_id = ip.id AND im.tenant_id = ip.tenant_id
       LEFT JOIN customers c ON im.customer_id = c.id AND im.tenant_id = c.tenant_id
       WHERE im.tenant_id = ? AND im.product_id = ?
       ORDER BY im.movement_date DESC
       LIMIT 200`,
      [req.tenantId, id]
    );
    res.json(rows);
  } catch (err) {
    console.error("[inventory] Movements error", err);
    res.status(500).json({ error: "Failed to get movements" });
  }
}

// Analytics verileri
export async function getAnalytics(req: AuthRequest, res: Response) {
  try {
    // Toplam ürün sayısı
    const [totalRows] = await dbPool.query(
      `SELECT COUNT(*) as total FROM inventory_products WHERE tenant_id = ?`,
      [req.tenantId]
    );
    const totalProducts = (totalRows as any[])[0]?.total || 0;

    // Düşük stok ürünleri
    const [lowStockRows] = await dbPool.query(
      `SELECT COUNT(*) as count FROM inventory_products 
       WHERE tenant_id = ? AND current_stock <= min_stock`,
      [req.tenantId]
    );
    const lowStockCount = (lowStockRows as any[])[0]?.count || 0;

    // Toplam stok değeri
    const [totalValueRows] = await dbPool.query(
      `SELECT COALESCE(SUM(current_stock * COALESCE(cost_price, 0)), 0) as total_value 
       FROM inventory_products WHERE tenant_id = ?`,
      [req.tenantId]
    );
    const totalValue = (totalValueRows as any[])[0]?.total_value || 0;

    // Kategori bazlı ürün sayısı
    const [categoryRows] = await dbPool.query(
      `SELECT category, COUNT(*) as count 
       FROM inventory_products 
       WHERE tenant_id = ? AND category IS NOT NULL
       GROUP BY category
       ORDER BY count DESC
       LIMIT 5`,
      [req.tenantId]
    );

    // Son 30 gün stok hareketleri
    const [movementRows] = await dbPool.query(
      `SELECT im.type, COUNT(*) as count, SUM(im.quantity) as total_quantity
       FROM inventory_movements im
       JOIN inventory_products ip ON im.product_id = ip.id AND im.tenant_id = ip.tenant_id
       WHERE im.tenant_id = ? AND im.movement_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY im.type`,
      [req.tenantId]
    );

    // Satış ve servis kullanım ayrımı
    const [usageRows] = await dbPool.query(
      `SELECT 
         SUM(CASE WHEN is_for_sale = 1 THEN 1 ELSE 0 END) as for_sale_count,
         SUM(CASE WHEN is_for_service = 1 THEN 1 ELSE 0 END) as for_service_count,
         SUM(CASE WHEN is_for_sale = 1 AND is_for_service = 1 THEN 1 ELSE 0 END) as both_count
       FROM inventory_products 
       WHERE tenant_id = ?`,
      [req.tenantId]
    );
    const usageStats = (usageRows as any[])[0] || {
      for_sale_count: 0,
      for_service_count: 0,
      both_count: 0,
    };

    res.json({
      totalProducts,
      lowStockCount,
      totalValue,
      categoryStats: categoryRows,
      recentMovements: movementRows,
      usageStats,
    });
  } catch (err) {
    console.error("[inventory] Analytics error", err);
    res.status(500).json({ error: "Failed to get analytics" });
  }
}

// Dashboard için stok istatistikleri - Toplam ürün, aylık değişim, en çok satan
export async function getInventoryStats(req: AuthRequest, res: Response) {
  try {
    // Toplam ürün sayısı
    const [totalRows] = await dbPool.query(
      `SELECT COUNT(*) as total FROM inventory_products WHERE tenant_id = ?`,
      [req.tenantId]
    );
    const totalProducts = Number((totalRows as any[])[0]?.total || 0);

    // Bu ay ve önceki ay ürün sayıları (created_at'e göre)
    const [monthlyRows] = await dbPool.query(
      `SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as product_count
      FROM inventory_products
      WHERE tenant_id = ? 
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
      LIMIT 2`,
      [req.tenantId]
    );

    const monthlyArray = monthlyRows as any[];
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

    const currentMonthData = monthlyArray.find((r: any) => r.month === currentMonth);
    const lastMonthData = monthlyArray.find((r: any) => r.month === lastMonth);

    const currentCount = Number(currentMonthData?.product_count || 0);
    const lastCount = Number(lastMonthData?.product_count || 0);
    const changePercent = lastCount > 0 
      ? ((currentCount - lastCount) / lastCount * 100).toFixed(1)
      : currentCount > 0 ? "100" : "0";

    // En çok satılan ürün (sales_count'a göre)
    // Eğer hiç satış yoksa, en azından bir ürün göster (sales_count = 0 olsa bile)
    const [topSellingRows] = await dbPool.query(
      `SELECT 
        name,
        sales_count
      FROM inventory_products
      WHERE tenant_id = ?
      ORDER BY sales_count DESC, name ASC
      LIMIT 1`,
      [req.tenantId]
    );

    const topSellingRowsArray = topSellingRows as any[];
    const topSellingRow = topSellingRowsArray.length > 0 ? topSellingRowsArray[0] : null;

    // Eğer ürün varsa ama topSelling null ise, ilk ürünü al
    let finalTopSelling = null;
    if (topSellingRow) {
      finalTopSelling = {
        name: topSellingRow.name || "Bilinmeyen Ürün",
        salesCount: Number(topSellingRow.sales_count || 0)
      };
    } else if (totalProducts > 0) {
      // Eğer hiç ürün bulunamadıysa ama toplam ürün varsa, ilk ürünü al
      const [firstProductRows] = await dbPool.query(
        `SELECT name, sales_count FROM inventory_products WHERE tenant_id = ? ORDER BY name ASC LIMIT 1`,
        [req.tenantId]
      );
      const firstProduct = (firstProductRows as any[])[0];
      if (firstProduct) {
        finalTopSelling = {
          name: firstProduct.name || "Bilinmeyen Ürün",
          salesCount: Number(firstProduct.sales_count || 0)
        };
      }
    }

    res.json({
      totalProducts,
      currentMonth: currentCount,
      lastMonth: lastCount,
      changePercent: parseFloat(changePercent),
      trend: currentCount > lastCount ? "up" : currentCount < lastCount ? "down" : "neutral",
      topSelling: finalTopSelling
    });
  } catch (err) {
    console.error("[inventory] Stats error", err);
    res.status(500).json({ error: "Failed to get inventory stats" });
  }
}
