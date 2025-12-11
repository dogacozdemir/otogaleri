import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { dbPool } from "../config/database";
import { generateToken } from "../middleware/auth";

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

  // Password strength validation
  if (ownerPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long" });
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
    await conn.query(
      "INSERT INTO users (tenant_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      [tenantId, ownerName?.trim() || tenantName.trim(), ownerEmail.toLowerCase().trim(), passwordHash, "owner"]
    );

    await conn.commit();
    conn.release();

    const token = generateToken(tenantId, (tenantResult as any).insertId, "owner");

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
      "SELECT u.id, u.tenant_id, u.name, u.email, u.password_hash, u.role, u.is_active FROM users u WHERE u.email = ?",
      [email.toLowerCase().trim()]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0] as any;
    if (!user.is_active) {
      return res.status(403).json({ error: "Account disabled" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user.tenant_id, user.id, user.role);

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
