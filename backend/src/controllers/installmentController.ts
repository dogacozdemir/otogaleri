import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import { getOrFetchRate } from "../services/fxCacheService";
import { SupportedCurrency } from "../services/currencyService";

// Taksitli satış oluştur
export async function createInstallmentSale(req: AuthRequest, res: Response) {
  const {
    vehicle_id,
    sale_id,
    total_amount,
    down_payment,
    installment_count,
    installment_amount,
    currency,
    sale_date,
  } = req.body;

  if (!vehicle_id || !sale_id || !total_amount || !down_payment || !installment_count || !installment_amount || !currency || !sale_date) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const conn = await dbPool.getConnection();
  await conn.beginTransaction();

  try {
    const [tenantRows] = await conn.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";

    let fxRate = 1;
    if (currency !== baseCurrency) {
      fxRate = await getOrFetchRate(
        currency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        sale_date
      );
    }

    const [result] = await conn.query(
      `INSERT INTO vehicle_installment_sales (
        tenant_id, vehicle_id, sale_id,
        total_amount, down_payment, installment_count, installment_amount,
        currency, fx_rate_to_base, sale_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        req.tenantId,
        vehicle_id,
        sale_id,
        total_amount,
        down_payment,
        installment_count,
        installment_amount,
        currency,
        fxRate,
        sale_date,
      ]
    );

    const installmentSaleId = (result as any).insertId;

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
        currency,
        fxRate,
        sale_date,
      ]
    );

    await conn.commit();
    conn.release();

    const [rows] = await dbPool.query(
      "SELECT * FROM vehicle_installment_sales WHERE id = ?",
      [installmentSaleId]
    );
    const rowsArray = rows as any[];
    res.status(201).json(rowsArray[0]);
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error("[installment] Create installment sale error", err);
    res.status(500).json({ error: "Failed to create installment sale" });
  }
}

// Taksit ödemesi kaydet
export async function recordPayment(req: AuthRequest, res: Response) {
  const {
    installment_sale_id,
    payment_type,
    installment_number,
    amount,
    currency,
    payment_date,
    notes,
  } = req.body;

  if (!installment_sale_id || !payment_type || !amount || !currency || !payment_date) {
    return res.status(400).json({ error: "installment_sale_id, payment_type, amount, currency, and payment_date are required" });
  }

  if (payment_type === "installment" && installment_number === undefined) {
    return res.status(400).json({ error: "installment_number is required for installment payments" });
  }

  const conn = await dbPool.getConnection();
  await conn.beginTransaction();

  try {
    // Taksitli satış kaydını kontrol et
    const [installmentRows] = await conn.query(
      "SELECT * FROM vehicle_installment_sales WHERE id = ? AND tenant_id = ?",
      [installment_sale_id, req.tenantId]
    );
    const installmentRowsArray = installmentRows as any[];
    if (installmentRowsArray.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: "Installment sale not found" });
    }

    const installmentSale = installmentRowsArray[0];

    if (installmentSale.status !== "active") {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: "Installment sale is not active" });
    }

    const [tenantRows] = await conn.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";

    let fxRate = 1;
    if (currency !== baseCurrency) {
      fxRate = await getOrFetchRate(
        currency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        payment_date
      );
    }

    // Ödemeyi kaydet
    const [result] = await conn.query(
      `INSERT INTO vehicle_installment_payments (
        tenant_id, installment_sale_id,
        payment_type, installment_number,
        amount, currency, fx_rate_to_base, payment_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenantId,
        installment_sale_id,
        payment_type,
        payment_type === "installment" ? installment_number : null,
        amount,
        currency,
        fxRate,
        payment_date,
        notes || null,
      ]
    );

    // Kalan borcu hesapla
    const [paymentRows] = await conn.query(
      `SELECT COALESCE(SUM(amount * fx_rate_to_base), 0) as total_paid
       FROM vehicle_installment_payments
       WHERE installment_sale_id = ?`,
      [installment_sale_id]
    );
    const paymentRowsArray = paymentRows as any[];
    const totalPaid = Number(paymentRowsArray[0]?.total_paid || 0);
    const totalAmountBase = Number(installmentSale.total_amount) * Number(installmentSale.fx_rate_to_base);
    const remainingBalance = totalAmountBase - totalPaid;

    // Eğer kalan borç 0 veya negatifse, durumu 'completed' yap
    if (remainingBalance <= 0) {
      await conn.query(
        "UPDATE vehicle_installment_sales SET status = 'completed' WHERE id = ?",
        [installment_sale_id]
      );
    }

    await conn.commit();
    conn.release();

    const paymentId = (result as any).insertId;
    const [rows] = await dbPool.query(
      "SELECT * FROM vehicle_installment_payments WHERE id = ?",
      [paymentId]
    );
    const rowsArray = rows as any[];
    res.status(201).json(rowsArray[0]);
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error("[installment] Record payment error", err);
    res.status(500).json({ error: "Failed to record payment" });
  }
}

// Taksit detaylarını getir
export async function getInstallmentDetails(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [installmentRows] = await dbPool.query(
      `SELECT vis.*, 
        (SELECT COALESCE(SUM(amount * fx_rate_to_base), 0)
         FROM vehicle_installment_payments
         WHERE installment_sale_id = vis.id) as total_paid,
        (vis.total_amount * vis.fx_rate_to_base) - 
        (SELECT COALESCE(SUM(amount * fx_rate_to_base), 0)
         FROM vehicle_installment_payments
         WHERE installment_sale_id = vis.id) as remaining_balance
       FROM vehicle_installment_sales vis
       WHERE vis.id = ? AND vis.tenant_id = ?`,
      [id, req.tenantId]
    );
    const installmentRowsArray = installmentRows as any[];
    if (installmentRowsArray.length === 0) {
      return res.status(404).json({ error: "Installment sale not found" });
    }

    const installmentSale = installmentRowsArray[0];

    const [paymentRows] = await dbPool.query(
      `SELECT * FROM vehicle_installment_payments
       WHERE installment_sale_id = ?
       ORDER BY payment_date ASC, installment_number ASC`,
      [id]
    );

    res.json({
      ...installmentSale,
      payments: paymentRows,
    });
  } catch (err) {
    console.error("[installment] Get installment details error", err);
    res.status(500).json({ error: "Failed to get installment details" });
  }
}

// Araç ID'ye göre taksit detaylarını getir
export async function getInstallmentByVehicleId(req: AuthRequest, res: Response) {
  const { vehicle_id } = req.params;

  try {
    const [installmentRows] = await dbPool.query(
      `SELECT vis.*, 
        (SELECT COALESCE(SUM(amount * fx_rate_to_base), 0)
         FROM vehicle_installment_payments
         WHERE installment_sale_id = vis.id) as total_paid,
        (vis.total_amount * vis.fx_rate_to_base) - 
        (SELECT COALESCE(SUM(amount * fx_rate_to_base), 0)
         FROM vehicle_installment_payments
         WHERE installment_sale_id = vis.id) as remaining_balance
       FROM vehicle_installment_sales vis
       WHERE vis.vehicle_id = ? AND vis.tenant_id = ?
       ORDER BY vis.created_at DESC
       LIMIT 1`,
      [vehicle_id, req.tenantId]
    );
    const installmentRowsArray = installmentRows as any[];
    if (installmentRowsArray.length === 0) {
      return res.json(null);
    }

    const installmentSale = installmentRowsArray[0];

    const [paymentRows] = await dbPool.query(
      `SELECT * FROM vehicle_installment_payments
       WHERE installment_sale_id = ?
       ORDER BY payment_date ASC, installment_number ASC`,
      [installmentSale.id]
    );

    res.json({
      ...installmentSale,
      payments: paymentRows,
    });
  } catch (err) {
    console.error("[installment] Get installment by vehicle id error", err);
    res.status(500).json({ error: "Failed to get installment details" });
  }
}

// Kalan borcu hesapla
export async function getRemainingBalance(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [rows] = await dbPool.query(
      `SELECT 
        vis.total_amount * vis.fx_rate_to_base as total_amount_base,
        COALESCE(SUM(vip.amount * vip.fx_rate_to_base), 0) as total_paid,
        (vis.total_amount * vis.fx_rate_to_base) - 
        COALESCE(SUM(vip.amount * vip.fx_rate_to_base), 0) as remaining_balance
       FROM vehicle_installment_sales vis
       LEFT JOIN vehicle_installment_payments vip ON vis.id = vip.installment_sale_id
       WHERE vis.id = ? AND vis.tenant_id = ?
       GROUP BY vis.id`,
      [id, req.tenantId]
    );
    const rowsArray = rows as any[];
    if (rowsArray.length === 0) {
      return res.status(404).json({ error: "Installment sale not found" });
    }

    res.json(rowsArray[0]);
  } catch (err) {
    console.error("[installment] Get remaining balance error", err);
    res.status(500).json({ error: "Failed to get remaining balance" });
  }
}

// Gecikmiş taksitleri getir (son ödeme 30+ gün geçmiş)
export async function getOverdueInstallments(req: AuthRequest, res: Response) {
  try {
    const [rows] = await dbPool.query(
      `SELECT 
        vis.id as installment_sale_id,
        vis.vehicle_id,
        vis.total_amount,
        vis.down_payment,
        vis.installment_count,
        vis.installment_amount,
        vis.currency,
        vis.status,
        v.maker,
        v.model,
        v.production_year as year,
        v.chassis_no,
        vs.customer_name,
        vs.customer_phone,
        c.id as customer_id,
        c.name as customer_name_full,
        (SELECT COALESCE(SUM(amount * fx_rate_to_base), 0)
         FROM vehicle_installment_payments
         WHERE installment_sale_id = vis.id) as total_paid,
        (vis.total_amount * vis.fx_rate_to_base) - 
        (SELECT COALESCE(SUM(amount * fx_rate_to_base), 0)
         FROM vehicle_installment_payments
         WHERE installment_sale_id = vis.id) as remaining_balance,
        (SELECT MAX(payment_date) 
         FROM vehicle_installment_payments 
         WHERE installment_sale_id = vis.id) as last_payment_date,
        DATEDIFF(CURDATE(), 
          (SELECT MAX(payment_date) 
           FROM vehicle_installment_payments 
           WHERE installment_sale_id = vis.id)
        ) as days_overdue
      FROM vehicle_installment_sales vis
      LEFT JOIN vehicles v ON vis.vehicle_id = v.id
      LEFT JOIN vehicle_sales vs ON v.id = vs.vehicle_id AND vs.tenant_id = vis.tenant_id
      LEFT JOIN customers c ON (vs.customer_name = c.name OR (vs.customer_phone IS NOT NULL AND vs.customer_phone = c.phone))
      WHERE vis.tenant_id = ?
        AND vis.status = 'active'
        AND (
          (vis.total_amount * vis.fx_rate_to_base) - 
          (SELECT COALESCE(SUM(amount * fx_rate_to_base), 0)
           FROM vehicle_installment_payments
           WHERE installment_sale_id = vis.id)
        ) > 0
        AND DATEDIFF(CURDATE(), 
          (SELECT MAX(payment_date) 
           FROM vehicle_installment_payments 
           WHERE installment_sale_id = vis.id)
        ) >= 30
      ORDER BY days_overdue DESC`,
      [req.tenantId]
    );

    res.json(rows);
  } catch (err) {
    console.error("[installment] Get overdue installments error", err);
    res.status(500).json({ error: "Failed to get overdue installments" });
  }
}

// Taksit ödemesini güncelle
export async function updatePayment(req: AuthRequest, res: Response) {
  const { payment_id } = req.params;
  const {
    payment_type,
    installment_number,
    amount,
    currency,
    payment_date,
    notes,
  } = req.body;

  if (!amount || !currency || !payment_date) {
    return res.status(400).json({ error: "amount, currency, and payment_date are required" });
  }

  if (payment_type === "installment" && installment_number === undefined) {
    return res.status(400).json({ error: "installment_number is required for installment payments" });
  }

  const conn = await dbPool.getConnection();
  await conn.beginTransaction();

  try {
    // Ödemeyi kontrol et
    const [paymentRows] = await conn.query(
      `SELECT vip.*, vis.status as installment_status
       FROM vehicle_installment_payments vip
       JOIN vehicle_installment_sales vis ON vip.installment_sale_id = vis.id
       WHERE vip.id = ? AND vip.tenant_id = ?`,
      [payment_id, req.tenantId]
    );
    const paymentRowsArray = paymentRows as any[];
    if (paymentRowsArray.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: "Payment not found" });
    }

    const payment = paymentRowsArray[0];
    const installmentSaleId = payment.installment_sale_id;

    if (payment.installment_status !== "active") {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: "Installment sale is not active" });
    }

    const [tenantRows] = await conn.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";

    let fxRate = 1;
    if (currency !== baseCurrency) {
      fxRate = await getOrFetchRate(
        currency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        payment_date
      );
    }

    // Ödemeyi güncelle
    await conn.query(
      `UPDATE vehicle_installment_payments 
       SET payment_type = ?, installment_number = ?, amount = ?, currency = ?, fx_rate_to_base = ?, payment_date = ?, notes = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        payment_type || payment.payment_type,
        payment_type === "installment" ? installment_number : null,
        amount,
        currency,
        fxRate,
        payment_date,
        notes || null,
        payment_id,
        req.tenantId,
      ]
    );

    // Kalan borcu hesapla
    const [totalPaidRows] = await conn.query(
      `SELECT COALESCE(SUM(amount * fx_rate_to_base), 0) as total_paid
       FROM vehicle_installment_payments
       WHERE installment_sale_id = ?`,
      [installmentSaleId]
    );
    const totalPaidRowsArray = totalPaidRows as any[];
    const totalPaid = Number(totalPaidRowsArray[0]?.total_paid || 0);
    
    const [installmentRows] = await conn.query(
      "SELECT total_amount, fx_rate_to_base FROM vehicle_installment_sales WHERE id = ?",
      [installmentSaleId]
    );
    const installmentRowsArray = installmentRows as any[];
    const installmentSale = installmentRowsArray[0];
    const totalAmountBase = Number(installmentSale.total_amount) * Number(installmentSale.fx_rate_to_base);
    const remainingBalance = totalAmountBase - totalPaid;

    // Eğer kalan borç 0 veya negatifse, durumu 'completed' yap
    if (remainingBalance <= 0) {
      await conn.query(
        "UPDATE vehicle_installment_sales SET status = 'completed' WHERE id = ?",
        [installmentSaleId]
      );
    } else {
      // Eğer daha önce completed ise ve şimdi borç varsa, active yap
      await conn.query(
        "UPDATE vehicle_installment_sales SET status = 'active' WHERE id = ? AND status = 'completed'",
        [installmentSaleId]
      );
    }

    // Güncellenmiş ödemeyi al
    const [updatedRows] = await conn.query(
      "SELECT * FROM vehicle_installment_payments WHERE id = ?",
      [payment_id]
    );
    const updatedRowsArray = updatedRows as any[];

    await conn.commit();
    conn.release();

    res.json(updatedRowsArray[0]);
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error("[installment] Update payment error", err);
    res.status(500).json({ error: "Failed to update payment" });
  }
}

// Taksit ödemesini sil
export async function deletePayment(req: AuthRequest, res: Response) {
  const { payment_id } = req.params;

  const conn = await dbPool.getConnection();
  await conn.beginTransaction();

  try {
    // Ödemeyi kontrol et
    const [paymentRows] = await conn.query(
      `SELECT vip.*, vis.status as installment_status
       FROM vehicle_installment_payments vip
       JOIN vehicle_installment_sales vis ON vip.installment_sale_id = vis.id
       WHERE vip.id = ? AND vip.tenant_id = ?`,
      [payment_id, req.tenantId]
    );
    const paymentRowsArray = paymentRows as any[];
    if (paymentRowsArray.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: "Payment not found" });
    }

    const payment = paymentRowsArray[0];
    const installmentSaleId = payment.installment_sale_id;

    if (payment.installment_status !== "active") {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: "Can only delete payments from active installment sales" });
    }

    // Ödemeyi sil
    await conn.query(
      "DELETE FROM vehicle_installment_payments WHERE id = ? AND tenant_id = ?",
      [payment_id, req.tenantId]
    );

    // Kalan borcu hesapla
    const [totalPaidRows] = await conn.query(
      `SELECT COALESCE(SUM(amount * fx_rate_to_base), 0) as total_paid
       FROM vehicle_installment_payments
       WHERE installment_sale_id = ?`,
      [installmentSaleId]
    );
    const totalPaidRowsArray = totalPaidRows as any[];
    const totalPaid = Number(totalPaidRowsArray[0]?.total_paid || 0);
    
    const [installmentRows] = await conn.query(
      "SELECT total_amount, fx_rate_to_base FROM vehicle_installment_sales WHERE id = ?",
      [installmentSaleId]
    );
    const installmentRowsArray = installmentRows as any[];
    const installmentSale = installmentRowsArray[0];
    const totalAmountBase = Number(installmentSale.total_amount) * Number(installmentSale.fx_rate_to_base);
    const remainingBalance = totalAmountBase - totalPaid;

    // Eğer kalan borç 0 veya negatifse, durumu 'completed' yap
    if (remainingBalance <= 0) {
      await conn.query(
        "UPDATE vehicle_installment_sales SET status = 'completed' WHERE id = ?",
        [installmentSaleId]
      );
    } else {
      // Eğer daha önce completed ise ve şimdi borç varsa, active yap
      await conn.query(
        "UPDATE vehicle_installment_sales SET status = 'active' WHERE id = ? AND status = 'completed'",
        [installmentSaleId]
      );
    }

    await conn.commit();
    conn.release();

    res.json({ message: "Payment deleted successfully" });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error("[installment] Delete payment error", err);
    res.status(500).json({ error: "Failed to delete payment" });
  }
}

// Aktif taksitleri getir (son ödeme tarihine göre sıralı - en uzun süre geçen en üstte)
export async function getActiveInstallments(req: AuthRequest, res: Response) {
  try {
    const [rows] = await dbPool.query(
      `SELECT 
        vis.id as installment_sale_id,
        vis.vehicle_id,
        vis.total_amount,
        vis.down_payment,
        vis.installment_count,
        vis.installment_amount,
        vis.currency,
        vis.status,
        vis.sale_date,
        v.maker,
        v.model,
        v.production_year as year,
        v.chassis_no,
        vs.customer_name,
        vs.customer_phone,
        c.id as customer_id,
        c.name as customer_name_full,
        (SELECT COALESCE(SUM(amount * fx_rate_to_base), 0)
         FROM vehicle_installment_payments
         WHERE installment_sale_id = vis.id) as total_paid,
        (vis.total_amount * vis.fx_rate_to_base) - 
        (SELECT COALESCE(SUM(amount * fx_rate_to_base), 0)
         FROM vehicle_installment_payments
         WHERE installment_sale_id = vis.id) as remaining_balance,
        (SELECT MAX(payment_date) 
         FROM vehicle_installment_payments 
         WHERE installment_sale_id = vis.id) as last_payment_date,
        CASE 
          WHEN (SELECT MAX(payment_date) FROM vehicle_installment_payments WHERE installment_sale_id = vis.id) IS NOT NULL 
          THEN DATEDIFF(CURDATE(), (SELECT MAX(payment_date) FROM vehicle_installment_payments WHERE installment_sale_id = vis.id))
          ELSE DATEDIFF(CURDATE(), vis.sale_date)
        END as days_since_last_payment
      FROM vehicle_installment_sales vis
      LEFT JOIN vehicles v ON vis.vehicle_id = v.id
      LEFT JOIN vehicle_sales vs ON v.id = vs.vehicle_id AND vs.tenant_id = vis.tenant_id
      LEFT JOIN customers c ON (vs.customer_name = c.name OR (vs.customer_phone IS NOT NULL AND vs.customer_phone = c.phone))
      WHERE vis.tenant_id = ?
        AND vis.status = 'active'
        AND (
          (vis.total_amount * vis.fx_rate_to_base) - 
          (SELECT COALESCE(SUM(amount * fx_rate_to_base), 0)
           FROM vehicle_installment_payments
           WHERE installment_sale_id = vis.id)
        ) > 0
      ORDER BY days_since_last_payment DESC, vis.sale_date ASC
      LIMIT 50`,
      [req.tenantId]
    );

    res.json(rows);
  } catch (err) {
    console.error("[installment] Get active installments error", err);
    res.status(500).json({ error: "Failed to get active installments" });
  }
}
