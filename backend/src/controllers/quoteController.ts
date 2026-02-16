import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import { getOrFetchRate } from "../services/fxCacheService";
import { SupportedCurrency } from "../services/currencyService";
import { StorageService } from "../services/storage/storageService";

/**
 * Generate unique quote number (format: Q-YYYYMMDD-XXX)
 */
async function generateQuoteNumber(tenantId: number): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  const prefix = `Q-${dateStr}-`;

  // Find the highest number for today
  const [rows] = await dbPool.query(
    "SELECT quote_number FROM vehicle_quotes WHERE tenant_id = ? AND quote_number LIKE ? ORDER BY quote_number DESC LIMIT 1",
    [tenantId, `${prefix}%`]
  );
  const rowsArray = rows as any[];

  let sequence = 1;
  if (rowsArray.length > 0) {
    const lastNumber = rowsArray[0].quote_number;
    const lastSequence = parseInt(lastNumber.split('-')[2] || '0');
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(3, '0')}`;
}

/**
 * List all quotes with filters
 */
export async function listQuotes(req: AuthRequest, res: Response) {
  const { status, vehicle_id, customer_id, page = 1, limit = 50 } = req.query;

  try {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT 
        vq.*,
        v.maker, v.model, v.production_year, v.chassis_no, v.vehicle_number,
        v.transmission, v.km, v.fuel, v.cc, v.color, v.sale_price as vehicle_sale_price,
        (SELECT image_path FROM vehicle_images 
         WHERE vehicle_id = vq.vehicle_id AND tenant_id = vq.tenant_id 
         ORDER BY is_primary DESC, display_order ASC, created_at ASC LIMIT 1) as primary_image_path,
        c.name as customer_name_full, c.phone as customer_phone_full,
        u.name as created_by_name
      FROM vehicle_quotes vq
      LEFT JOIN vehicles v ON vq.vehicle_id = v.id AND v.tenant_id = vq.tenant_id
      LEFT JOIN customers c ON vq.customer_id = c.id
      LEFT JOIN users u ON vq.created_by = u.id
      WHERE vq.tenant_id = ?
    `;
    const params: any[] = [req.tenantId];

    if (status) {
      query += " AND vq.status = ?";
      params.push(status);
    }
    if (vehicle_id) {
      query += " AND vq.vehicle_id = ?";
      params.push(vehicle_id);
    }
    if (customer_id) {
      query += " AND vq.customer_id = ?";
      params.push(customer_id);
    }

    query += " ORDER BY vq.created_at DESC LIMIT ? OFFSET ?";
    params.push(limitNum, offset);

    const [rows] = await dbPool.query(query, params);

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM vehicle_quotes WHERE tenant_id = ?";
    const countParams: any[] = [req.tenantId];
    if (status) {
      countQuery += " AND status = ?";
      countParams.push(status);
    }
    if (vehicle_id) {
      countQuery += " AND vehicle_id = ?";
      countParams.push(vehicle_id);
    }
    if (customer_id) {
      countQuery += " AND customer_id = ?";
      countParams.push(customer_id);
    }

    const [countRows] = await dbPool.query(countQuery, countParams);
    const total = (countRows as any[])[0]?.total || 0;

    res.json({
      quotes: rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("[quote] List error", err);
    res.status(500).json({ error: "Failed to list quotes" });
  }
}

/**
 * Get quote by ID
 */
export async function getQuoteById(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [rows] = await dbPool.query(
      `SELECT 
        vq.*,
        v.maker, v.model, v.production_year, v.chassis_no, v.vehicle_number, v.sale_price as vehicle_sale_price,
        v.transmission, v.km, v.fuel, v.cc, v.color,
        (SELECT image_path FROM vehicle_images 
         WHERE vehicle_id = vq.vehicle_id AND tenant_id = vq.tenant_id 
         ORDER BY is_primary DESC, display_order ASC, created_at ASC LIMIT 1) as primary_image_path,
        c.name as customer_name_full, c.phone as customer_phone_full, c.address as customer_address_full,
        u.name as created_by_name
      FROM vehicle_quotes vq
      LEFT JOIN vehicles v ON vq.vehicle_id = v.id AND v.tenant_id = vq.tenant_id
      LEFT JOIN customers c ON vq.customer_id = c.id
      LEFT JOIN users u ON vq.created_by = u.id
      WHERE vq.id = ? AND vq.tenant_id = ?`,
      [id, req.tenantId]
    );

    const rowsArray = rows as any[];
    if (rowsArray.length === 0) {
      return res.status(404).json({ error: "Quote not found" });
    }

    const quote = rowsArray[0] as any;
    if (quote.primary_image_path) {
      try {
        const key = quote.primary_image_path.replace(/^\/uploads\//, "");
        quote.primary_image_url = await StorageService.getUrl(key, true);
      } catch {
        quote.primary_image_url = null;
      }
    } else {
      quote.primary_image_url = null;
    }
    delete quote.primary_image_path;

    res.json(quote);
  } catch (err) {
    console.error("[quote] Get by ID error", err);
    res.status(500).json({ error: "Failed to get quote" });
  }
}

/**
 * Create new quote
 */
export async function createQuote(req: AuthRequest, res: Response) {
  const {
    vehicle_id,
    customer_id,
    quote_date,
    valid_until,
    sale_price,
    currency,
    discount_amount,
    down_payment,
    installment_count,
    installment_amount,
    notes,
  } = req.body;

  if (!vehicle_id || !sale_price || !quote_date || !valid_until) {
    return res.status(400).json({ error: "Vehicle ID, sale price, quote date, and valid until date are required" });
  }

  if (!req.tenantId) {
    return res.status(401).json({ error: "Tenant ID missing" });
  }

  const conn = await dbPool.getConnection();
  await conn.beginTransaction();

  try {
    // Verify vehicle exists and belongs to tenant
    const [vehicleRows] = await conn.query(
      "SELECT id FROM vehicles WHERE id = ? AND tenant_id = ?",
      [vehicle_id, req.tenantId]
    );
    const vehicleRowsArray = vehicleRows as any[];
    if (vehicleRowsArray.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: "Vehicle not found" });
    }

    // Verify customer exists if provided
    if (customer_id) {
      const [customerRows] = await conn.query(
        "SELECT id FROM customers WHERE id = ? AND tenant_id = ?",
        [customer_id, req.tenantId]
      );
      const customerRowsArray = customerRows as any[];
      if (customerRowsArray.length === 0) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({ error: "Customer not found" });
      }
    }

    // Get tenant base currency
    const [tenantRows] = await conn.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";
    const quoteCurrency = currency || baseCurrency;

    // Calculate FX rate
    let fxRate = 1;
    if (quoteCurrency !== baseCurrency) {
      if (!req.tenantQuery) {
        return res.status(500).json({ error: "Tenant query not available" });
      }
      fxRate = await getOrFetchRate(
        req.tenantQuery,
        quoteCurrency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        quote_date
      );
    }

    // Generate quote number
    const quoteNumber = await generateQuoteNumber(req.tenantId);

    const discountVal = discount_amount != null ? Number(discount_amount) : null;

    // Insert quote
    const [result] = await conn.query(
      `INSERT INTO vehicle_quotes (
        tenant_id, vehicle_id, customer_id, quote_number,
        quote_date, valid_until, sale_price, discount_amount, currency, fx_rate_to_base,
        down_payment, installment_count, installment_amount,
        status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      [
        req.tenantId,
        vehicle_id,
        customer_id || null,
        quoteNumber,
        quote_date,
        valid_until,
        sale_price,
        discountVal,
        quoteCurrency,
        fxRate,
        down_payment || null,
        installment_count || null,
        installment_amount || null,
        notes || null,
        req.userId || null,
      ]
    );

    await conn.commit();
    conn.release();

    const quoteId = (result as any).insertId;
    const [rows] = await dbPool.query(
      "SELECT * FROM vehicle_quotes WHERE id = ?",
      [quoteId]
    );
    const quote = (rows as any[])[0];
    res.status(201).json(quote);
  } catch (err: any) {
    await conn.rollback();
    conn.release();
    console.error("[quote] Create error", err);

    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return res.status(409).json({ error: "Quote number already exists" });
    }

    res.status(500).json({ error: "Failed to create quote" });
  }
}

/**
 * Update quote
 */
export async function updateQuote(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const {
    vehicle_id,
    customer_id,
    quote_date,
    valid_until,
    sale_price,
    currency,
    discount_amount,
    down_payment,
    installment_count,
    installment_amount,
    status,
    notes,
  } = req.body;

  try {
    // Verify quote exists and belongs to tenant
    const [existingRows] = await dbPool.query(
      "SELECT * FROM vehicle_quotes WHERE id = ? AND tenant_id = ?",
      [id, req.tenantId]
    );
    const existingRowsArray = existingRows as any[];
    if (existingRowsArray.length === 0) {
      return res.status(404).json({ error: "Quote not found" });
    }

    const existingQuote = existingRowsArray[0];

    // If status is being changed to 'converted', prevent update
    if (existingQuote.status === 'converted') {
      return res.status(400).json({ error: "Cannot update a converted quote" });
    }

    // Get tenant base currency
    const [tenantRows] = await dbPool.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";
    const quoteCurrency = currency || existingQuote.currency || baseCurrency;

    // Calculate FX rate if currency or date changed
    let fxRate = existingQuote.fx_rate_to_base;
    const finalQuoteDate = quote_date || existingQuote.quote_date;
    if (quoteCurrency !== baseCurrency && finalQuoteDate) {
      if (!req.tenantQuery) {
        return res.status(500).json({ error: "Tenant query not available" });
      }
      fxRate = await getOrFetchRate(
        req.tenantQuery,
        quoteCurrency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        finalQuoteDate
      );
    }

    const discountVal = discount_amount !== undefined ? (discount_amount != null ? Number(discount_amount) : null) : existingQuote.discount_amount;

    // Update quote
    await dbPool.query(
      `UPDATE vehicle_quotes SET
        vehicle_id = COALESCE(?, vehicle_id),
        customer_id = ?,
        quote_date = COALESCE(?, quote_date),
        valid_until = COALESCE(?, valid_until),
        sale_price = COALESCE(?, sale_price),
        discount_amount = ?,
        currency = COALESCE(?, currency),
        fx_rate_to_base = ?,
        down_payment = ?,
        installment_count = ?,
        installment_amount = ?,
        status = COALESCE(?, status),
        notes = ?
      WHERE id = ? AND tenant_id = ?`,
      [
        vehicle_id || null,
        customer_id !== undefined ? customer_id : null,
        quote_date || null,
        valid_until || null,
        sale_price || null,
        discountVal,
        quoteCurrency,
        fxRate,
        down_payment !== undefined ? down_payment : null,
        installment_count !== undefined ? installment_count : null,
        installment_amount !== undefined ? installment_amount : null,
        status || null,
        notes !== undefined ? notes : null,
        id,
        req.tenantId,
      ]
    );

    const [rows] = await dbPool.query(
      "SELECT * FROM vehicle_quotes WHERE id = ?",
      [id]
    );
    const quote = (rows as any[])[0];
    res.json(quote);
  } catch (err) {
    console.error("[quote] Update error", err);
    res.status(500).json({ error: "Failed to update quote" });
  }
}

/**
 * Delete quote
 */
export async function deleteQuote(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [rows] = await dbPool.query(
      "SELECT status FROM vehicle_quotes WHERE id = ? AND tenant_id = ?",
      [id, req.tenantId]
    );
    const rowsArray = rows as any[];
    if (rowsArray.length === 0) {
      return res.status(404).json({ error: "Quote not found" });
    }

    // Prevent deletion of converted quotes
    if (rowsArray[0].status === 'converted') {
      return res.status(400).json({ error: "Cannot delete a converted quote" });
    }

    await dbPool.query(
      "DELETE FROM vehicle_quotes WHERE id = ? AND tenant_id = ?",
      [id, req.tenantId]
    );

    res.json({ message: "Quote deleted successfully" });
  } catch (err) {
    console.error("[quote] Delete error", err);
    res.status(500).json({ error: "Failed to delete quote" });
  }
}

/**
 * Convert approved quote to sale
 */
export async function convertQuoteToSale(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const {
    branch_id,
    staff_id,
    customer_name,
    customer_phone,
    customer_address,
    plate_number,
    key_count,
    sale_date,
  } = req.body;

  const conn = await dbPool.getConnection();
  await conn.beginTransaction();

  try {
    // Get quote with vehicle and customer info
    const [quoteRows] = await conn.query(
      `SELECT 
        vq.*,
        v.id as vehicle_id,
        v.is_sold as vehicle_is_sold,
        c.name as customer_name_from_db,
        c.phone as customer_phone_from_db,
        c.address as customer_address_from_db
      FROM vehicle_quotes vq
      LEFT JOIN vehicles v ON vq.vehicle_id = v.id
      LEFT JOIN customers c ON vq.customer_id = c.id
      WHERE vq.id = ? AND vq.tenant_id = ?`,
      [id, req.tenantId]
    );

    const quoteRowsArray = quoteRows as any[];
    if (quoteRowsArray.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: "Quote not found" });
    }

    const quote = quoteRowsArray[0];

    // Verify quote is approved
    if (quote.status !== 'approved') {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: "Only approved quotes can be converted to sales" });
    }

    // Verify vehicle is not already sold
    if (quote.vehicle_is_sold) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: "Vehicle is already sold" });
    }

    // Use provided customer info or fallback to quote customer info
    const finalCustomerName = customer_name || quote.customer_name_from_db || 'Müşteri';
    const finalCustomerPhone = customer_phone || quote.customer_phone_from_db || null;
    const finalCustomerAddress = customer_address || quote.customer_address_from_db || null;
    const finalSaleDate = sale_date || new Date().toISOString().split('T')[0];

    // Get tenant base currency
    const [tenantRows] = await conn.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";

    // Create or update customer
    let customerId = quote.customer_id;
    if (!customerId && finalCustomerName) {
      // Try to find existing customer
      if (finalCustomerPhone) {
        const [existingCustomer] = await conn.query(
          "SELECT id, total_spent_base FROM customers WHERE tenant_id = ? AND phone = ?",
          [req.tenantId, finalCustomerPhone]
        );
        const existingCustomerArray = existingCustomer as any[];
        if (existingCustomerArray.length > 0) {
          customerId = existingCustomerArray[0].id;
        } else {
          const [customerResult] = await conn.query(
            "INSERT INTO customers (tenant_id, name, phone, address, total_spent_base) VALUES (?, ?, ?, ?, ?)",
            [req.tenantId, finalCustomerName, finalCustomerPhone, finalCustomerAddress, 0]
          );
          customerId = (customerResult as any).insertId;
        }
      } else {
        const [customerResult] = await conn.query(
          "INSERT INTO customers (tenant_id, name, address, total_spent_base) VALUES (?, ?, ?, ?)",
          [req.tenantId, finalCustomerName, finalCustomerAddress, 0]
        );
        customerId = (customerResult as any).insertId;
      }
    }

    // Final sale amount = list price - discount (in quote currency)
    const discountVal = Number(quote.discount_amount || 0);
    const finalSalePrice = Math.max(0, Number(quote.sale_price) - discountVal);

    // Create sale record - freeze FX rate and base currency at sale time
    const saleAmountBase = finalSalePrice * Number(quote.fx_rate_to_base);
    if (Number(quote.fx_rate_to_base) <= 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: "Kur değeri 0'dan büyük olmalıdır." });
    }
    const [saleResult] = await conn.query(
      `INSERT INTO vehicle_sales (
        tenant_id, vehicle_id, branch_id, staff_id,
        customer_name, customer_phone, customer_address,
        plate_number, key_count,
        sale_amount, sale_currency, sale_fx_rate_to_base, sale_date, base_currency_at_sale
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenantId,
        quote.vehicle_id,
        branch_id || null,
        staff_id || null,
        finalCustomerName,
        finalCustomerPhone,
        finalCustomerAddress,
        plate_number || null,
        key_count || null,
        finalSalePrice,
        quote.currency,
        quote.fx_rate_to_base,
        finalSaleDate,
        baseCurrency,
      ]
    );

    const saleId = (saleResult as any).insertId;

    // Update vehicle as sold
    await conn.query(
      "UPDATE vehicles SET is_sold = TRUE, stock_status = 'sold', sale_price = ?, sale_currency = ?, sale_fx_rate_to_base = ?, sale_date = ? WHERE id = ?",
      [finalSalePrice, quote.currency, quote.fx_rate_to_base, finalSaleDate, quote.vehicle_id]
    );

    // Update customer total spent
    if (customerId) {
      await conn.query(
        "UPDATE customers SET total_spent_base = total_spent_base + ? WHERE id = ?",
        [saleAmountBase, customerId]
      );
    }

    // Create installment sale if applicable
    if (quote.installment_count && quote.installment_count > 0 && quote.down_payment && quote.installment_amount) {
      await conn.query(
        `INSERT INTO vehicle_installment_sales (
          tenant_id, vehicle_id, sale_id,
          total_amount, down_payment, installment_count, installment_amount,
          currency, fx_rate_to_base, sale_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          req.tenantId,
          quote.vehicle_id,
          saleId,
          finalSalePrice,
          quote.down_payment,
          quote.installment_count,
          quote.installment_amount,
          quote.currency,
          quote.fx_rate_to_base,
          finalSaleDate,
        ]
      );
    }

    // Update quote status to 'converted'
    await conn.query(
      "UPDATE vehicle_quotes SET status = 'converted' WHERE id = ?",
      [id]
    );

    await conn.commit();
    conn.release();

    res.json({
      message: "Quote converted to sale successfully",
      sale_id: saleId,
      vehicle_id: quote.vehicle_id,
    });
  } catch (err: any) {
    await conn.rollback();
    conn.release();
    console.error("[quote] Convert to sale error", err);
    res.status(500).json({ error: "Failed to convert quote to sale", details: err.message });
  }
}

