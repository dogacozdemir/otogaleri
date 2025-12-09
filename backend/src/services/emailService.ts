import nodemailer from "nodemailer";

interface EmailConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

// Create a reusable transporter (can be configured via environment variables)
const createTransporter = () => {
  // For development, use a test account or configure via env vars
  // In production, configure with real SMTP settings
  const config: EmailConfig = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  };

  // If no auth configured, use ethereal email for testing
  if (!config.auth) {
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: "ethereal.user@ethereal.email",
        pass: "ethereal.pass",
      },
    });
  }

  return nodemailer.createTransport(config);
};

export interface ReminderEmailData {
  customerName: string;
  customerEmail: string;
  vehicleInfo: string;
  overdueAmount: number;
  overdueDays: number;
  currency: string;
  nextDueDate?: string;
  installmentNumber?: number;
}

export async function sendInstallmentReminderEmail(
  data: ReminderEmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || "noreply@otogaleri.com",
      to: data.customerEmail,
      subject: `Taksit Ödeme Hatırlatması - ${data.vehicleInfo}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #003d82; color: white; padding: 20px; text-align: center; border-radius: 12px 12px 0 0; }
            .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; }
            .amount { font-size: 24px; font-weight: bold; color: #F0A500; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #003d82; color: white; text-decoration: none; border-radius: 12px; margin-top: 20px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Taksit Ödeme Hatırlatması</h1>
            </div>
            <div class="content">
              <p>Sayın ${data.customerName},</p>
              
              <p>${data.vehicleInfo} aracı için taksit ödemenizin geciktiğini bildirmek istiyoruz.</p>
              
              <div class="amount">
                Geciken Tutar: ${formatCurrency(data.overdueAmount, data.currency)}
              </div>
              
              <p><strong>Gecikme Süresi:</strong> ${data.overdueDays} gün</p>
              
              ${data.nextDueDate ? `<p><strong>Sonraki Ödeme Tarihi:</strong> ${formatDate(data.nextDueDate)}</p>` : ""}
              
              ${data.installmentNumber ? `<p><strong>Taksit No:</strong> ${data.installmentNumber}</p>` : ""}
              
              <p>Lütfen ödemenizi en kısa sürede tamamlayınız. Sorularınız için bizimle iletişime geçebilirsiniz.</p>
              
              <p>Teşekkürler,<br>Oto Galeri Yönetim Sistemi</p>
            </div>
            <div class="footer">
              <p>Bu bir otomatik hatırlatma mesajıdır. Lütfen yanıtlamayınız.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Taksit Ödeme Hatırlatması

Sayın ${data.customerName},

${data.vehicleInfo} aracı için taksit ödemenizin geciktiğini bildirmek istiyoruz.

Geciken Tutar: ${formatCurrency(data.overdueAmount, data.currency)}
Gecikme Süresi: ${data.overdueDays} gün
${data.nextDueDate ? `Sonraki Ödeme Tarihi: ${formatDate(data.nextDueDate)}\n` : ""}
${data.installmentNumber ? `Taksit No: ${data.installmentNumber}\n` : ""}

Lütfen ödemenizi en kısa sürede tamamlayınız.

Teşekkürler,
Oto Galeri Yönetim Sistemi
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error("[email] Send reminder email error:", error);
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
  }
}

export async function sendSMSReminder(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  // Placeholder for SMS integration
  // In production, integrate with SMS provider (Twilio, etc.)
  console.log(`[SMS] Would send to ${phoneNumber}: ${message}`);
  
  // For now, just log it
  return {
    success: true,
  };
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

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

