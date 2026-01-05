import { TenantAwareQuery } from "../repositories/tenantAwareQuery";
import { sendInstallmentReminderEmail, sendSMSReminder } from "./emailService";

interface OverdueInstallment {
  id: number;
  tenant_id: number;
  vehicle_id: number;
  sale_id: number;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  vehicle_info: string;
  overdue_amount: number;
  overdue_days: number;
  currency: string;
  next_due_date: string | null;
  installment_number: number | null;
  last_reminder_sent: string | null;
  reminder_count: number;
}

/**
 * Find all overdue installments that need reminders
 * Note: This function processes all tenants, so it uses a special approach
 * For tenant-specific queries, use TenantAwareQuery
 */
export async function findOverdueInstallments(tenantQuery?: TenantAwareQuery): Promise<OverdueInstallment[]> {
  const query = `
    SELECT 
      vis.id,
      vis.tenant_id,
      vis.vehicle_id,
      vis.sale_id,
      vs.customer_name,
      vs.customer_phone,
      c.email as customer_email,
      CONCAT(v.maker, ' ', v.model, ' ', v.production_year) as vehicle_info,
      vis.installment_amount * vis.fx_rate_to_base as overdue_amount,
      vis.currency,
      vis.last_reminder_sent,
      vis.reminder_count,
      DATEDIFF(CURDATE(), COALESCE(
        (SELECT MAX(payment_date) FROM vehicle_installment_payments WHERE installment_sale_id = vis.id),
        vis.sale_date
      )) as overdue_days,
      DATE_ADD(
        COALESCE(
          (SELECT MAX(payment_date) FROM vehicle_installment_payments WHERE installment_sale_id = vis.id),
          vis.sale_date
        ),
        INTERVAL 30 DAY
      ) as next_due_date,
      (
        SELECT COUNT(*) + 1
        FROM vehicle_installment_payments vip
        WHERE vip.installment_sale_id = vis.id
        AND vip.payment_type = 'installment'
      ) as installment_number
    FROM vehicle_installment_sales vis
    INNER JOIN vehicle_sales vs ON vis.sale_id = vs.id
    INNER JOIN vehicles v ON vis.vehicle_id = v.id
    LEFT JOIN customers c ON vs.customer_name = c.name AND (vs.customer_phone IS NULL OR vs.customer_phone = c.phone)
    WHERE vis.status = 'active'
    AND vis.tenant_id IS NOT NULL
    AND (
      -- Check if there's a missed payment (overdue by 30+ days)
      DATEDIFF(CURDATE(), COALESCE(
        (SELECT MAX(payment_date) FROM vehicle_installment_payments WHERE installment_sale_id = vis.id),
        vis.sale_date
      )) >= 30
      AND (
        vis.total_amount * vis.fx_rate_to_base - COALESCE(
          (SELECT SUM(amount * fx_rate_to_base) FROM vehicle_installment_payments WHERE installment_sale_id = vis.id),
          0
        )
      ) > 0
    )
    ORDER BY vis.tenant_id, overdue_days DESC
  `;

  // This query processes all tenants (cron job), so we use executeRaw to bypass tenant_id check
  // For tenant-specific queries, use TenantAwareQuery.query() with tenant_id filter
  if (tenantQuery) {
    const [rows] = await tenantQuery.executeRaw(query);
    return rows as OverdueInstallment[];
  } else {
    // Fallback for backward compatibility (should not be used in production)
    const { dbPool } = await import("../config/database");
    const [rows] = await dbPool.query(query);
    return rows as OverdueInstallment[];
  }
}

/**
 * Send reminder for a specific overdue installment
 */
export async function sendReminderForInstallment(
  tenantQuery: TenantAwareQuery,
  installmentId: number,
  sendEmail: boolean = true,
  sendSMS: boolean = false
): Promise<{ success: boolean; error?: string }> {
  return await tenantQuery.transaction(async (conn) => {
    try {
      // Get installment details
      const [rows] = await tenantQuery.query(
      `
      SELECT 
        vis.*,
        vs.customer_name,
        vs.customer_phone,
        c.email as customer_email,
        CONCAT(v.maker, ' ', v.model, ' ', v.production_year) as vehicle_info,
        (
          SELECT COUNT(*)
          FROM vehicle_installment_payments vip
          WHERE vip.installment_sale_id = vis.id
          AND vip.payment_type = 'installment'
        ) as paid_installments,
        (
          SELECT MAX(payment_date)
          FROM vehicle_installment_payments vip
          WHERE vip.installment_sale_id = vis.id
        ) as last_payment_date
      FROM vehicle_installment_sales vis
      INNER JOIN vehicle_sales vs ON vis.sale_id = vs.id
      INNER JOIN vehicles v ON vis.vehicle_id = v.id
      LEFT JOIN customers c ON vs.customer_name = c.name AND (vs.customer_phone IS NULL OR vs.customer_phone = c.phone)
      WHERE vis.id = ? AND vis.tenant_id = ?
    `,
      [installmentId, tenantQuery.getTenantId()]
    );

    const installments = rows as any[];
    if (installments.length === 0) {
      throw new Error("Installment not found");
    }

    const installment = installments[0];
    const paidInstallments = Number(installment.paid_installments || 0);
    const overdueDays = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(installment.last_payment_date || installment.sale_date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    // Calculate overdue amount (next unpaid installment)
    const overdueAmount = Number(installment.installment_amount) * Number(installment.fx_rate_to_base);

    // Send email if requested and email available
    if (sendEmail && installment.customer_email) {
      const emailResult = await sendInstallmentReminderEmail({
        customerName: installment.customer_name,
        customerEmail: installment.customer_email,
        vehicleInfo: installment.vehicle_info,
        overdueAmount,
        overdueDays,
        currency: installment.currency,
        nextDueDate: installment.last_payment_date
          ? new Date(
              new Date(installment.last_payment_date).getTime() + 30 * 24 * 60 * 60 * 1000
            ).toISOString()
          : undefined,
        installmentNumber: paidInstallments + 1,
      });

      if (!emailResult.success) {
        console.error(`[installment-alert] Failed to send email: ${emailResult.error}`);
      }
    }

    // Send SMS if requested and phone available
    if (sendSMS && installment.customer_phone) {
      const smsMessage = `Sayın ${installment.customer_name}, ${installment.vehicle_info} aracı için ${overdueDays} gün gecikmiş ${formatCurrency(overdueAmount, installment.currency)} tutarında taksit ödemeniz bulunmaktadır. Lütfen ödemenizi tamamlayınız.`;
      
      const smsResult = await sendSMSReminder(installment.customer_phone, smsMessage);
      if (!smsResult.success) {
        console.error(`[installment-alert] Failed to send SMS: ${smsResult.error}`);
      }
    }

    // Update last_reminder_sent and increment reminder_count
    await tenantQuery.query(
      `UPDATE vehicle_installment_sales 
       SET last_reminder_sent = CURDATE(), reminder_count = reminder_count + 1 
       WHERE id = ? AND tenant_id = ?`,
      [installmentId, tenantQuery.getTenantId()]
    );

    return { success: true };
    } catch (error: any) {
      console.error("[installment-alert] Send reminder error:", error);
      throw error; // Transaction will be rolled back automatically
    }
  });
}

/**
 * Process all overdue installments and send reminders
 * This is called by the cron job
 */
export async function processOverdueInstallments(): Promise<void> {
  try {
    const overdueInstallments = await findOverdueInstallments();
    console.log(`[installment-alert] Found ${overdueInstallments.length} overdue installments`);

    for (const installment of overdueInstallments) {
      // Only send reminder if not sent today
      const lastReminderDate = installment.last_reminder_sent
        ? new Date(installment.last_reminder_sent)
        : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (lastReminderDate && lastReminderDate >= today) {
        continue; // Already sent today
      }

      // Create TenantAwareQuery for this tenant
      const { TenantAwareQuery } = await import("../repositories/tenantAwareQuery");
      const tenantQuery = new TenantAwareQuery(installment.tenant_id);
      
      await sendReminderForInstallment(tenantQuery, installment.id, true, false);
    }
  } catch (error) {
    console.error("[installment-alert] Process overdue installments error:", error);
  }
}

function formatCurrency(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  const currencySymbols: Record<string, string> = {
    TRY: "₺",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  return `${formatted} ${currencySymbols[currency] || currency}`;
}

