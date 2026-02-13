import nodemailer from "nodemailer";

// Tüm mail konfigürasyonu .env'den gelir (SMTP_* veya MAIL_*)
const env = {
  host: process.env.MAIL_HOST || process.env.SMTP_HOST,
  port: process.env.MAIL_PORT || process.env.SMTP_PORT,
  secure: process.env.MAIL_SECURE || process.env.SMTP_SECURE,
  user: process.env.MAIL_USER || process.env.SMTP_USER,
  pass: process.env.MAIL_PASS || process.env.SMTP_PASS,
  from: process.env.MAIL_FROM || process.env.SMTP_FROM,
};

/** Tüm giden maillerde kullanılacak gönderen adresi */
function getDefaultFrom(): string {
  return env.from ?? "";
}

/** AWS SES Sandbox: tüm alıcıları tek adrese yönlendirir (test modu) */
function applySandboxOverride(to: string): string {
  const override = process.env.MAIL_SANDBOX_OVERRIDE_TO?.trim();
  if (override) return override;
  return to;
}

/** Development: mail göndermeden sadece konsola yaz (MAIL_DEV_LOG_ONLY=true) */
function isDevLogOnly(): boolean {
  return process.env.MAIL_DEV_LOG_ONLY === "true" || process.env.MAIL_DEV_LOG_ONLY === "1";
}

/** Geliştirme modunda mail içeriğini konsola yazdırır, gerçek gönderim yapmaz */
function devLogMail(options: { from: string; to: string; subject: string; html?: string; text?: string }): void {
  const sep = "─".repeat(60);
  console.log(`\n[MAIL DEV] ${sep}`);
  console.log(`  From:    ${options.from}`);
  console.log(`  To:      ${options.to}`);
  console.log(`  Subject: ${options.subject}`);
  if (options.html) {
    const preview = options.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
    console.log(`  Preview: ${preview}${preview.length >= 200 ? "…" : ""}`);
  }
  console.log(`[MAIL DEV] ${sep}\n`);
}

interface EmailConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  requireTLS?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

const REQUIRED_MAIL_ENV = [
  "SMTP_HOST veya MAIL_HOST",
  "SMTP_PORT veya MAIL_PORT",
  "SMTP_USER veya MAIL_USER",
  "SMTP_PASS veya MAIL_PASS",
  "SMTP_FROM veya MAIL_FROM",
] as const;

/** Mail konfigürasyonunun eksik olup olmadığını kontrol eder; eksikse hata fırlatır */
function assertMailConfig(): void {
  const missing: string[] = [];
  if (!env.host) missing.push(REQUIRED_MAIL_ENV[0]);
  if (!env.port) missing.push(REQUIRED_MAIL_ENV[1]);
  if (!env.user || !env.pass) missing.push(REQUIRED_MAIL_ENV[2], REQUIRED_MAIL_ENV[3]);
  if (!env.from) missing.push(REQUIRED_MAIL_ENV[4]);
  if (missing.length > 0) {
    throw new Error(
      `Mail konfigürasyonu eksik. .env dosyasında şunları tanımlayın: ${[...new Set(missing)].join(", ")}. ` +
        "Geliştirme için MAIL_DEV_LOG_ONLY=true kullanabilirsiniz."
    );
  }
}

/** Nodemailer transporter: SMTP_* / MAIL_* ile auth ve requireTLS */
const createTransporter = () => {
  assertMailConfig();

  const port = Number(env.port);
  const config: EmailConfig = {
    host: env.host,
    port,
    secure: env.secure === "true",
    requireTLS: true,
    auth: { user: env.user!, pass: env.pass! },
  };

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
    const to = applySandboxOverride(data.customerEmail);
    const from = getDefaultFrom();
    const subject = `Taksit Ödeme Hatırlatması - ${data.vehicleInfo}`;

    if (isDevLogOnly()) {
      devLogMail({
        from,
        to,
        subject,
        html: `Taksit hatırlatması: ${data.customerName}, ${data.vehicleInfo}, ${formatCurrency(data.overdueAmount, data.currency)}`,
      });
      return { success: true };
    }

    const transporter = createTransporter();
    const mailOptions = {
      from,
      to,
      subject,
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    console.error("[email] Send reminder email error:", error);
    return {
      success: false,
      error: message,
    };
  }
}

/** Şifre sıfırlama linki: FRONTEND_URL veya APP_URL .env'den gelir */
function getResetPasswordBaseUrl(): string {
  const base = (process.env.FRONTEND_URL || process.env.APP_URL || "").replace(/\/$/, "");
  if (!base) {
    if (isDevLogOnly()) {
      return "[FRONTEND_URL veya APP_URL .env'de tanımlayın]/reset-password";
    }
    throw new Error(
      "Şifre sıfırlama linki için FRONTEND_URL veya APP_URL .env dosyasında tanımlanmalıdır."
    );
  }
  return `${base}/reset-password`;
}

/**
 * Şifre sıfırlama maili gönderir.
 * @param to Alıcı e-posta
 * @param token Sıfırlama token'ı (linke eklenecek; hash'i DB'de saklanmalı)
 */
export async function sendPasswordResetEmail(
  to: string,
  token: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const recipient = applySandboxOverride(to);
    const resetLink = `${getResetPasswordBaseUrl()}?token=${encodeURIComponent(token)}`;
    const from = getDefaultFrom();
    const subject = "Şifrenizi Sıfırlayın - Oto Galeri Yönetim Sistemi";

    if (isDevLogOnly()) {
      devLogMail({
        from,
        to: recipient,
        subject,
        html: `Şifre sıfırlama linki: ${resetLink}`,
      });
      return { success: true };
    }

    const transporter = createTransporter();
    const mailOptions = {
      from,
      to: recipient,
      subject,
      html: `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7f9; }
            .wrapper { max-width: 600px; margin: 20px auto; padding: 0 15px; }
            .card { background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e1e8ed; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { background: #003d82; padding: 40px 20px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
            .content { padding: 40px 30px; }
            .content h2 { font-size: 20px; color: #1a1a1a; margin-top: 0; }
            .content p { color: #555; font-size: 16px; margin-bottom: 24px; }
            .btn-container { text-align: center; margin: 30px 0; }
            .btn { background-color: #003d82; color: #ffffff !important; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block; transition: background 0.3s ease; }
            .expiry { background: #fffcf0; border: 1px solid #ffeeba; color: #856404; padding: 15px; border-radius: 8px; font-size: 14px; text-align: center; margin-bottom: 20px; }
            .divider { height: 1px; background: #eee; margin: 30px 0; }
            .muted { font-size: 12px; color: #888; text-align: center; line-height: 1.4; }
            .footer { padding: 25px; background: #fdfdfd; text-align: center; border-top: 1px solid #eee; }
            .footer p { font-size: 12px; color: #999; margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="card">
              <div class="header">
                <h1>Akıllı Galeri</h1>
              </div>
              <div class="content">
                <h2>Şifre Sıfırlama Talebi</h2>
                <p>Merhaba,</p>
                <p>Hesabınız için bir şifre sıfırlama talebinde bulundunuz. Yeni şifrenizi belirlemek için aşağıdaki güvenli butona tıklayabilirsiniz:</p>

                <div class="btn-container">
                  <a href="${resetLink}" class="btn">Yeni Şifre Belirle</a>
                </div>

                <div class="expiry">
                  ⚠️ <strong>Güvenlik Notu:</strong> Bu bağlantı <strong>1 saat</strong> boyunca geçerlidir. Süre dolduğunda güvenlik gereği yeni bir talep oluşturmanız gerekecektir.
                </div>

                <div class="divider"></div>

                <p class="muted">
                  Eğer buton çalışmıyorsa, bu bağlantıyı tarayıcınıza yapıştırın:<br>
                  <a href="${resetLink}" style="color: #003d82; word-break: break-all;">${resetLink}</a>
                </p>
              </div>
              <div class="footer">
                <p><strong>Akıllı Galeri Dijital Çözümler</strong></p>
                <p>Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.</p>
                <p>Eğer bu talebi siz yapmadıysanız, hesabınızın güvende kalması için bu e-postayı silebilirsiniz.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Şifre Sıfırlama Talebi - Akıllı Galeri

Merhaba,

Hesabınız için bir şifre sıfırlama talebinde bulundunuz. Yeni şifrenizi belirlemek için aşağıdaki bağlantıya tıklayın:

${resetLink}

Güvenlik Notu: Bu bağlantı 1 saat boyunca geçerlidir. Süre dolduğunda yeni bir talep oluşturmanız gerekecektir.

Bu talebi siz yapmadıysanız, hesabınızın güvende kalması için bu e-postayı silebilirsiniz.

Akıllı Galeri Dijital Çözümler`,
    };

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send password reset email";
    console.error("[email] Send password reset email error:", error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Kayıt sonrası karşılama maili.
 * @param to Alıcı e-posta
 * @param name Kullanıcı adı (görüntülenen)
 */
export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const recipient = applySandboxOverride(to);
    const displayName = name?.trim() || "Kullanıcı";
    const from = getDefaultFrom();
    const subject = "Hoş Geldiniz - Oto Galeri Yönetim Sistemi";

    if (isDevLogOnly()) {
      devLogMail({
        from,
        to: recipient,
        subject,
        html: `Hoş geldiniz ${displayName}. Oto Galeri Yönetim Sistemi'ne kaydınız tamamlandı.`,
      });
      return { success: true };
    }

    const transporter = createTransporter();
    const mailOptions = {
      from,
      to: recipient,
      subject,
      html: `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f5f5f5; }
            .wrapper { max-width: 600px; margin: 0 auto; padding: 24px; }
            .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
            .header { background: linear-gradient(135deg, #003d82 0%, #0054a6 100%); color: #fff; padding: 28px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
            .content { padding: 32px 24px; }
            .content p { margin: 0 0 16px; }
            .highlight { background: #f0f7ff; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #003d82; }
            ul { margin: 12px 0; padding-left: 24px; }
            .footer { padding: 20px 24px; background: #f8f9fa; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="card">
              <div class="header">
                <h1>Hoş Geldiniz</h1>
              </div>
              <div class="content">
                <p>Sayın ${escapeHtml(displayName)},</p>
                <p>Oto Galeri Yönetim Sistemi'ne kaydınız başarıyla tamamlandı. Hesabınızla araç envanteri, satışlar, taksit takibi ve raporlama işlemlerinizi yönetebilirsiniz.</p>
                <div class="highlight">
                  <strong>Hızlı başlangıç</strong>
                  <ul>
                    <li>Araç ekleyin ve stok durumunu güncelleyin</li>
                    <li>Müşteri ve satış kayıtlarını oluşturun</li>
                    <li>Taksitli satışlar için hatırlatmaları kullanın</li>
                    <li>Raporlar ve analizlerle performansı takip edin</li>
                  </ul>
                </div>
                <p>Giriş yapmak için kayıt sırasında kullandığınız e-posta ve şifrenizi kullanabilirsiniz.</p>
                <p>Herhangi bir sorunuz olursa destek ekibimizle iletişime geçebilirsiniz.</p>
                <p>İyi çalışmalar,<br><strong>Oto Galeri Yönetim Sistemi</strong></p>
              </div>
              <div class="footer">
                Bu e-posta kayıt işleminiz nedeniyle gönderilmiştir. Oto Galeri Yönetim Sistemi.
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hoş Geldiniz

Sayın ${displayName},

Oto Galeri Yönetim Sistemi'ne kaydınız başarıyla tamamlandı. Hesabınızla araç envanteri, satışlar, taksit takibi ve raporlama işlemlerinizi yönetebilirsiniz.

Giriş yapmak için kayıt sırasında kullandığınız e-posta ve şifrenizi kullanabilirsiniz.

İyi çalışmalar,
Oto Galeri Yönetim Sistemi`,
    };

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send welcome email";
    console.error("[email] Send welcome email error:", error);
    return {
      success: false,
      error: message,
    };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendSMSReminder(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[SMS] Would send to ${phoneNumber}: ${message}`);
    return { success: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "SMS send failed";
    console.error("[SMS] Send error:", error);
    return { success: false, error: errMsg };
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
