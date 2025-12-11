import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import { generateSalesContract, generateInvoice } from "../services/pdfService";

export async function generateSalesContractPDF(req: AuthRequest, res: Response) {
  const { sale_id } = req.params;

  if (!sale_id) {
    return res.status(400).json({ error: "Sale ID is required" });
  }

  try {
    // Fetch sale data with related information
    const [sales] = await dbPool.query(
      `SELECT 
        vs.*,
        v.maker,
        v.model,
        v.production_year,
        v.chassis_no,
        v.km,
        v.color,
        v.fuel,
        v.transmission,
        b.name as branch_name,
        s.name as staff_name,
        t.name as tenant_name
      FROM vehicle_sales vs
      LEFT JOIN vehicles v ON vs.vehicle_id = v.id
      LEFT JOIN branches b ON vs.branch_id = b.id
      LEFT JOIN staff s ON vs.staff_id = s.id
      LEFT JOIN tenants t ON vs.tenant_id = t.id
      WHERE vs.id = ? AND vs.tenant_id = ?`,
      [sale_id, req.tenantId]
    );

    const salesArray = sales as any[];
    if (salesArray.length === 0) {
      return res.status(404).json({ error: "Sale not found" });
    }

    const sale = salesArray[0];

    // Check for installment sale
    let installment = null;
    const [installments] = await dbPool.query(
      `SELECT 
        down_payment,
        installment_count,
        installment_amount,
        total_amount
      FROM vehicle_installment_sales
      WHERE sale_id = ? AND tenant_id = ?`,
      [sale_id, req.tenantId]
    );

    const installmentsArray = installments as any[];
    if (installmentsArray.length > 0) {
      installment = installmentsArray[0];
    }

    const saleData = {
      sale_id: sale.id,
      sale_date: sale.sale_date,
      sale_amount: Number(sale.sale_amount),
      sale_currency: sale.sale_currency,
      customer_name: sale.customer_name,
      customer_phone: sale.customer_phone,
      customer_address: sale.customer_address,
      plate_number: sale.plate_number,
      vehicle: {
        maker: sale.maker,
        model: sale.model,
        production_year: sale.production_year,
        chassis_no: sale.chassis_no,
        km: sale.km,
        color: sale.color,
        fuel: sale.fuel,
        transmission: sale.transmission,
      },
      branch_name: sale.branch_name,
      staff_name: sale.staff_name,
      tenant_name: sale.tenant_name,
      installment: installment,
    };

    generateSalesContract(saleData, res);
  } catch (error) {
    console.error("[document] Generate sales contract error:", error);
    res.status(500).json({ error: "Failed to generate sales contract" });
  }
}

export async function generateInvoicePDF(req: AuthRequest, res: Response) {
  const { sale_id } = req.params;

  if (!sale_id) {
    return res.status(400).json({ error: "Sale ID is required" });
  }

  try {
    // Fetch sale data with related information
    const [sales] = await dbPool.query(
      `SELECT 
        vs.*,
        v.maker,
        v.model,
        v.production_year,
        v.chassis_no,
        v.km,
        v.color,
        v.fuel,
        v.transmission,
        b.name as branch_name,
        s.name as staff_name,
        t.name as tenant_name
      FROM vehicle_sales vs
      LEFT JOIN vehicles v ON vs.vehicle_id = v.id
      LEFT JOIN branches b ON vs.branch_id = b.id
      LEFT JOIN staff s ON vs.staff_id = s.id
      LEFT JOIN tenants t ON vs.tenant_id = t.id
      WHERE vs.id = ? AND vs.tenant_id = ?`,
      [sale_id, req.tenantId]
    );

    const salesArray = sales as any[];
    if (salesArray.length === 0) {
      return res.status(404).json({ error: "Sale not found" });
    }

    const sale = salesArray[0];

    // Check for installment sale
    let installment = null;
    const [installments] = await dbPool.query(
      `SELECT 
        down_payment,
        installment_count,
        installment_amount,
        total_amount
      FROM vehicle_installment_sales
      WHERE sale_id = ? AND tenant_id = ?`,
      [sale_id, req.tenantId]
    );

    const installmentsArray = installments as any[];
    if (installmentsArray.length > 0) {
      installment = installmentsArray[0];
    }

    const saleData = {
      sale_id: sale.id,
      sale_date: sale.sale_date,
      sale_amount: Number(sale.sale_amount),
      sale_currency: sale.sale_currency,
      customer_name: sale.customer_name,
      customer_phone: sale.customer_phone,
      customer_address: sale.customer_address,
      plate_number: sale.plate_number,
      vehicle: {
        maker: sale.maker,
        model: sale.model,
        production_year: sale.production_year,
        chassis_no: sale.chassis_no,
        km: sale.km,
        color: sale.color,
        fuel: sale.fuel,
        transmission: sale.transmission,
      },
      branch_name: sale.branch_name,
      staff_name: sale.staff_name,
      tenant_name: sale.tenant_name,
      installment: installment,
    };

    generateInvoice(saleData, res);
  } catch (error) {
    console.error("[document] Generate invoice error:", error);
    res.status(500).json({ error: "Failed to generate invoice" });
  }
}

export async function getExpiringVehicleDocuments(req: AuthRequest, res: Response) {
  const { days = 30 } = req.query;
  const daysNum = Math.max(1, Math.min(365, Number(days) || 30));

  try {
    const today = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(today.getDate() + daysNum);

    const [documents] = await dbPool.query(
      `SELECT 
        vd.*,
        v.maker,
        v.model,
        v.production_year,
        v.vehicle_number,
        v.chassis_no,
        DATEDIFF(vd.expiry_date, CURDATE()) as days_until_expiry
      FROM vehicle_documents vd
      INNER JOIN vehicles v ON vd.vehicle_id = v.id
      WHERE vd.tenant_id = ?
        AND vd.expiry_date IS NOT NULL
        AND vd.expiry_date >= CURDATE()
        AND vd.expiry_date <= ?
      ORDER BY vd.expiry_date ASC`,
      [req.tenantId, expiryDate.toISOString().split('T')[0]]
    );

    res.json(documents);
  } catch (error) {
    console.error("[document] Get expiring documents error:", error);
    res.status(500).json({ error: "Failed to fetch expiring documents" });
  }
}

export async function getVehicleDocuments(req: AuthRequest, res: Response) {
  const { vehicle_id } = req.params;

  if (!vehicle_id) {
    return res.status(400).json({ error: "Vehicle ID is required" });
  }

  try {
    const [documents] = await dbPool.query(
      `SELECT * FROM vehicle_documents 
       WHERE vehicle_id = ? AND tenant_id = ? 
       ORDER BY id DESC`,
      [vehicle_id, req.tenantId]
    );

    res.json(documents);
  } catch (error) {
    console.error("[document] Get vehicle documents error:", error);
    res.status(500).json({ error: "Failed to fetch vehicle documents" });
  }
}
