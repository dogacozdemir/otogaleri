import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import zxcvbn from "zxcvbn";
import { dbPool } from "../config/database";
import { generateToken, AuthRequest } from "../middleware/auth";
import { loggerService } from "../services/loggerService";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../services/emailService";

/**
 * Enhanced password validation
 * Requirements:
 * - Minimum 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 * - zxcvbn score >= 3 (strong password)
 */
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character" };
  }
  
  // Check password strength using zxcvbn
  const strength = zxcvbn(password);
  if (strength.score < 3) {
    const feedback = strength.feedback.suggestions.length > 0 
      ? strength.feedback.suggestions[0]
      : "Please choose a stronger password";
    return { valid: false, error: `Password is too weak. ${feedback}` };
  }
  
  return { valid: true };
}

export async function signup(req: Request, res: Response) {
  const { tenantName, tenantSlug, defaultCurrency, ownerName, ownerEmail, ownerPassword } = req.body;

  // Validation
  if (!tenantName || !tenantSlug || !ownerEmail || !ownerPassword) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(ownerEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Enhanced password strength validation
  const passwordValidation = validatePassword(ownerPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  // Tenant name validation
  if (tenantName.trim().length < 2) {
    return res.status(400).json({ error: "Company name must be at least 2 characters long" });
  }

  const conn = await dbPool.getConnection();
  await conn.beginTransaction();

  try {
    // Check if email already exists
    const [existingUsers] = await conn.query(
      "SELECT id FROM users WHERE email = ?",
      [ownerEmail]
    );
    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      await conn.rollback();
      conn.release();
      return res.status(409).json({ error: "Email already exists" });
    }

    // Check if tenant slug already exists
    const [existingTenants] = await conn.query(
      "SELECT id FROM tenants WHERE slug = ?",
      [tenantSlug]
    );
    if (Array.isArray(existingTenants) && existingTenants.length > 0) {
      await conn.rollback();
      conn.release();
      return res.status(409).json({ error: "Company name already exists" });
    }

    const [tenantResult] = await conn.query(
      "INSERT INTO tenants (name, slug, default_currency) VALUES (?, ?, ?)",
      [tenantName.trim(), tenantSlug, defaultCurrency || "TRY"]
    );
    const tenantId = (tenantResult as any).insertId;

    const passwordHash = await bcrypt.hash(ownerPassword, 10);
    const [userResult] = await conn.query(
      "INSERT INTO users (tenant_id, name, email, password_hash, role, token_version) VALUES (?, ?, ?, ?, ?, ?)",
      [tenantId, ownerName?.trim() || tenantName.trim(), ownerEmail.toLowerCase().trim(), passwordHash, "owner", 0]
    );
    const userId = (userResult as any).insertId;

    await conn.commit();
    conn.release();

    // Karşılama maili (hata olsa bile kayıt başarılı sayılır)
    try {
      const welcomeResult = await sendWelcomeEmail(
        ownerEmail.toLowerCase().trim(),
        ownerName?.trim() || tenantName.trim()
      );
      if (!welcomeResult.success) {
        console.error("[auth] Welcome email failed:", welcomeResult.error);
      }
    } catch (mailErr) {
      console.error("[auth] Welcome email error (signup succeeded):", mailErr);
    }

    // Include token_version (0 for new users) in token
    const token = generateToken(tenantId, userId, "owner", 0);

    res.status(201).json({
      message: "Tenant created",
      token,
      tenant: { id: tenantId, name: tenantName, slug: tenantSlug },
    });
  } catch (err: any) {
    await conn.rollback();
    conn.release();
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Tenant slug or email already exists" });
    }
    console.error("[auth] Signup error", err);
    res.status(500).json({ error: "Signup failed" });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const [rows] = await dbPool.query(
      "SELECT u.id, u.tenant_id, u.name, u.email, u.password_hash, u.role, u.is_active, COALESCE(u.token_version, 0) as token_version FROM users u WHERE u.email = ?",
      [email.toLowerCase().trim()]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      // Log failed login attempt (user not found)
      const ipAddress = req.ip || req.socket.remoteAddress || undefined;
      const userAgent = req.get("user-agent");
      loggerService.logFailedLogin(email, ipAddress, userAgent, "User not found");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0] as any;
    if (!user.is_active) {
      // Log failed login attempt (account disabled)
      const ipAddress = req.ip || req.socket.remoteAddress || undefined;
      const userAgent = req.get("user-agent");
      loggerService.logFailedLogin(email, ipAddress, userAgent, "Account disabled");
      return res.status(403).json({ error: "Account disabled" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      // Log failed login attempt (invalid password)
      const ipAddress = req.ip || req.socket.remoteAddress || undefined;
      const userAgent = req.get("user-agent");
      loggerService.logFailedLogin(email, ipAddress, userAgent, "Invalid password");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Include token_version in token for versioning support
    const tokenVersion = user.token_version || 0;
    const token = generateToken(user.tenant_id, user.id, user.role, tokenVersion);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
      },
    });
  } catch (err) {
    console.error("[auth] Login error", err);
    res.status(500).json({ error: "Login failed" });
  }
}

/**
 * Change password endpoint
 * Invalidates all existing tokens by incrementing token_version
 */
export async function changePassword(req: AuthRequest, res: Response) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password required" });
  }

  // Enhanced password strength validation
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  if (!req.userId || !req.tenantId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Get current user and verify current password
    const [rows] = await dbPool.query(
      "SELECT id, password_hash, token_version FROM users WHERE id = ? AND tenant_id = ?",
      [req.userId, req.tenantId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0] as any;
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!match) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Increment token_version to invalidate all existing tokens
    const newTokenVersion = (user.token_version || 0) + 1;

    // Update password and token_version
    await dbPool.query(
      "UPDATE users SET password_hash = ?, token_version = ? WHERE id = ? AND tenant_id = ?",
      [newPasswordHash, newTokenVersion, req.userId, req.tenantId]
    );

    // Log password change security event
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    const userAgent = req.get("user-agent");
    loggerService.logPasswordChange(
      req.tenantId!,
      req.userId!,
      req.userRole || "user",
      ipAddress,
      userAgent
    );

    // Log token invalidation (old tokens are now invalid)
    loggerService.logTokenInvalidation(
      req.tenantId!,
      req.userId!,
      "Password changed - token_version incremented",
      ipAddress
    );

    // Generate new token with updated token_version
    const token = generateToken(req.tenantId, req.userId, req.userRole || "user", newTokenVersion);

    res.json({
      message: "Password changed successfully",
      token, // Return new token so user doesn't need to login again
    });
  } catch (err) {
    console.error("[auth] Change password error", err);
    res.status(500).json({ error: "Failed to change password" });
  }
}

/**
 * Şifremi unuttum: e-posta ile token oluşturup mail gönderir.
 * Kullanıcı bulunamazsa bile aynı yanıt dönülür (bilgi sızıntısı önlenir).
 */
export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "E-posta adresi gerekli" });
  }

  const emailTrimmed = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailTrimmed)) {
    return res.status(400).json({ error: "Geçersiz e-posta formatı" });
  }

  try {
    const [rows] = await dbPool.query(
      "SELECT id, tenant_id, email FROM users WHERE email = ? AND is_active = 1 LIMIT 1",
      [emailTrimmed]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      // Bilgi sızıntısı önleme: aynı mesaj dön
      res.status(200).json({
        message: "Bu e-posta adresi sistemde kayıtlıysa, şifre sıfırlama linki gönderildi.",
      });
      return;
    }

    const user = rows[0] as { id: number; tenant_id: number; email: string };
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 saat

    await dbPool.query(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
      [user.id, tokenHash, expiresAt]
    );

    const mailResult = await sendPasswordResetEmail(user.email, rawToken);
    if (!mailResult.success) {
      console.error("[auth] Forgot password email failed:", mailResult.error);
      // Token oluşturuldu ama mail gitmedi; token'ı sil ki tekrar denesin
      await dbPool.query("DELETE FROM password_reset_tokens WHERE user_id = ? AND token_hash = ?", [
        user.id,
        tokenHash,
      ]);
      res.status(500).json({
        error: "E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.",
      });
      return;
    }

    res.status(200).json({
      message: "Bu e-posta adresi sistemde kayıtlıysa, şifre sıfırlama linki gönderildi.",
    });
  } catch (err) {
    console.error("[auth] Forgot password error:", err);
    res.status(500).json({ error: "İşlem sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin." });
  }
}

/**
 * Token ile şifre sıfırlama. Token geçerli ve süresi dolmamış olmalı.
 */
export async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = req.body;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Token gerekli" });
  }
  if (!newPassword || typeof newPassword !== "string") {
    return res.status(400).json({ error: "Yeni şifre gerekli" });
  }

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

  try {
    const [rows] = await dbPool.query(
      "SELECT prt.id, prt.user_id FROM password_reset_tokens prt WHERE prt.token_hash = ? AND prt.expires_at > NOW() LIMIT 1",
      [tokenHash]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        error: "Geçersiz veya süresi dolmuş link. Lütfen şifre sıfırlama talebini tekrarlayın.",
      });
    }

    const row = rows[0] as { id: number; user_id: number };
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const conn = await dbPool.getConnection();
    try {
      await conn.beginTransaction();

      const [userRows] = await conn.query(
        "SELECT tenant_id, token_version FROM users WHERE id = ?",
        [row.user_id]
      );
      const userRow = Array.isArray(userRows) && userRows.length > 0 ? (userRows[0] as { tenant_id: number; token_version: number }) : null;
      const newTokenVersion = (userRow?.token_version ?? 0) + 1;

      await conn.query(
        "UPDATE users SET password_hash = ?, token_version = ? WHERE id = ?",
        [newPasswordHash, newTokenVersion, row.user_id]
      );
      await conn.query("DELETE FROM password_reset_tokens WHERE id = ?", [row.id]);

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    res.status(200).json({
      message: "Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz.",
    });
  } catch (err) {
    console.error("[auth] Reset password error:", err);
    res.status(500).json({ error: "Şifre güncellenirken bir hata oluştu. Lütfen tekrar deneyin." });
  }
}
