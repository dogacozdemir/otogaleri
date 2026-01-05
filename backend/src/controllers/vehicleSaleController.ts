import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import { getOrFetchRate } from "../services/fxCacheService";
import { SupportedCurrency } from "../services/currencyService";

export async function markVehicleAsSold(req: AuthRequest, res: Response) {
  const vehicle_id = req.params.vehicle_id || req.params.id;
  const {
    branch_id,
    staff_id,
    customer_name,
    customer_phone,
    customer_address,
    plate_number,
    key_count,
    sale_amount,
    sale_currency,
    sale_date,
    payment_type,
    down_payment,
    installment_count,
    installment_amount,
    custom_rate,
  } = req.body;

  if (!customer_name || !sale_amount || !sale_date) {
    return res.status(400).json({ error: "Customer name, sale amount, and sale date required" });
  }

  const conn = await dbPool.getConnection();
  await conn.beginTransaction();

  try {
    const [vehicleRows] = await conn.query("SELECT * FROM vehicles WHERE id = ? AND tenant_id = ?", [
      vehicle_id,
      req.tenantId,
    ]);
    if (Array.isArray(vehicleRows) && vehicleRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const vehicleRowsArray = vehicleRows as any[];
    if (vehicleRowsArray.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const vehicle = vehicleRowsArray[0] as any;

    if (vehicle.is_sold) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: "Vehicle already sold" });
    }

    const [tenantRows] = await conn.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";
    const finalSaleCurrency = sale_currency || baseCurrency;

    let saleFxRate = 1;
    if (finalSaleCurrency !== baseCurrency) {
      // If custom_rate is provided, use it; otherwise fetch from API
      if (custom_rate !== undefined && custom_rate !== null) {
        saleFxRate = Number(custom_rate);
      } else {
        if (!req.tenantQuery) {
          return res.status(500).json({ error: "Tenant query not available" });
        }
        saleFxRate = await getOrFetchRate(
          req.tenantQuery,
          finalSaleCurrency as SupportedCurrency,
          baseCurrency as SupportedCurrency,
          sale_date
        );
      }
    }

    const saleAmountBase = Number(sale_amount) * saleFxRate;

    // Müşteriyi customers tablosuna ekle veya güncelle (telefon ile eşleştirme)
    let customerId = null;
    if (customer_phone) {
      const [existingCustomer] = await conn.query(
        "SELECT id, total_spent_base FROM customers WHERE tenant_id = ? AND phone = ?",
        [req.tenantId, customer_phone]
      );
      const existingCustomerArray = existingCustomer as any[];
      if (existingCustomerArray.length > 0) {
        customerId = existingCustomerArray[0].id;
        const currentTotal = Number(existingCustomerArray[0].total_spent_base) || 0;
        // Müşteri bilgilerini güncelle
        await conn.query(
          "UPDATE customers SET name = ?, address = ?, total_spent_base = ? WHERE id = ?",
          [customer_name, customer_address || null, currentTotal + saleAmountBase, customerId]
        );
      } else {
        // Yeni müşteri ekle
        const [customerResult] = await conn.query(
          "INSERT INTO customers (tenant_id, name, phone, address, total_spent_base) VALUES (?, ?, ?, ?, ?)",
          [req.tenantId, customer_name, customer_phone, customer_address || null, saleAmountBase]
        );
        customerId = (customerResult as any).insertId;
      }
    } else {
      // Telefon yoksa sadece isimle kontrol et
      const [existingCustomer] = await conn.query(
        "SELECT id, total_spent_base FROM customers WHERE tenant_id = ? AND name = ? AND phone IS NULL",
        [req.tenantId, customer_name]
      );
      const existingCustomerArray = existingCustomer as any[];
      if (existingCustomerArray.length > 0) {
        customerId = existingCustomerArray[0].id;
        const currentTotal = Number(existingCustomerArray[0].total_spent_base) || 0;
        await conn.query(
          "UPDATE customers SET address = ?, total_spent_base = ? WHERE id = ?",
          [customer_address || null, currentTotal + saleAmountBase, customerId]
        );
      } else {
        const [customerResult] = await conn.query(
          "INSERT INTO customers (tenant_id, name, address, total_spent_base) VALUES (?, ?, ?, ?)",
          [req.tenantId, customer_name, customer_address || null, saleAmountBase]
        );
        customerId = (customerResult as any).insertId;
      }
    }

    const [saleResult] = await conn.query(
      `INSERT INTO vehicle_sales (
        tenant_id, vehicle_id, branch_id, staff_id,
        customer_name, customer_phone, customer_address,
        plate_number, key_count,
        sale_amount, sale_currency, sale_fx_rate_to_base, sale_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenantId,
        vehicle_id,
        branch_id || null,
        staff_id || null,
        customer_name,
        customer_phone || null,
        customer_address || null,
        plate_number || null,
        key_count || null,
        sale_amount,
        finalSaleCurrency,
        saleFxRate,
        sale_date,
      ]
    );

    await conn.query(
      "UPDATE vehicles SET is_sold = TRUE, stock_status = 'sold', sale_price = ?, sale_currency = ?, sale_fx_rate_to_base = ?, sale_date = ? WHERE id = ?",
      [sale_amount, finalSaleCurrency, saleFxRate, sale_date, vehicle_id]
    );

    // Not: Araç satışları vehicle_sales tablosunda tutulduğu için
    // income tablosuna ayrıca ekleme yapmıyoruz (çift sayılmaması için)

    const saleId = (saleResult as any)?.insertId;
    if (!saleId) {
      await conn.rollback();
      conn.release();
      return res.status(500).json({ error: "Failed to save vehicle sale" });
    }

    // Eğer taksitli satış ise, taksitli satış kaydı oluştur
    if (payment_type === "installment") {
      if (!down_payment || !installment_count || !installment_amount) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: "down_payment, installment_count, and installment_amount are required for installment sales" });
      }

      await conn.query(
        `INSERT INTO vehicle_installment_sales (
          tenant_id, vehicle_id, sale_id,
          total_amount, down_payment, installment_count, installment_amount,
          currency, fx_rate_to_base, sale_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          req.tenantId,
          vehicle_id,
          saleId,
          sale_amount,
          down_payment,
          installment_count,
          installment_amount,
          finalSaleCurrency,
          saleFxRate,
          sale_date,
        ]
      );

      const [installmentRows] = await conn.query(
        "SELECT id FROM vehicle_installment_sales WHERE sale_id = ? AND tenant_id = ?",
        [saleId, req.tenantId]
      );
      const installmentRowsArray = installmentRows as any[];
      const installmentSaleId = installmentRowsArray[0]?.id;

      if (installmentSaleId) {
        // Peşinat ödemesini kaydet
        await conn.query(
          `INSERT INTO vehicle_installment_payments (
            tenant_id, installment_sale_id,
            payment_type, installment_number,
            amount, currency, fx_rate_to_base, payment_date
          ) VALUES (?, ?, 'down_payment', 0, ?, ?, ?, ?)`,
          [
            req.tenantId,
            installmentSaleId,
            down_payment,
            finalSaleCurrency,
            saleFxRate,
            sale_date,
          ]
        );
      }
    }

    await conn.commit();
    conn.release();

    const [rows] = await dbPool.query("SELECT * FROM vehicle_sales WHERE id = ?", [saleId]);
    const rowsArray = rows as any[];
    if (rowsArray.length === 0) {
      return res.status(500).json({ error: "Failed to retrieve vehicle sale after insert" });
    }

    res.status(201).json(rowsArray[0]);
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      console.error("[vehicleSale] Rollback error in catch", rollbackErr);
    }
    conn.release();
    console.error("[vehicleSale] Mark as sold error", err);
    res.status(500).json({ error: "Failed to mark vehicle as sold" });
  }
}
