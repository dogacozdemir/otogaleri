import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { dbPool } from "../config/database";
import { generateToken } from "../middleware/auth";

export async function signup(req: Request, res: Response) {
  const { tenantName, tenantSlug, defaultCurrency, ownerName, ownerEmail, ownerPassword } = req.body;

  if (!tenantName || !tenantSlug || !ownerEmail || !ownerPassword) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const conn = await dbPool.getConnection();
  await conn.beginTransaction();

  try {
    const [tenantResult] = await conn.query(
      "INSERT INTO tenants (name, slug, default_currency) VALUES (?, ?, ?)",
      [tenantName, tenantSlug, defaultCurrency || "TRY"]
    );
    const tenantId = (tenantResult as any).insertId;

    const passwordHash = await bcrypt.hash(ownerPassword, 10);
    await conn.query(
      "INSERT INTO users (tenant_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      [tenantId, ownerName || "Owner", ownerEmail, passwordHash, "owner"]
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

  try {
    const [rows] = await dbPool.query(
      "SELECT u.id, u.tenant_id, u.name, u.email, u.password_hash, u.role, u.is_active FROM users u WHERE u.email = ?",
      [email]
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
