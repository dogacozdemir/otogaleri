import mysql from "mysql2/promise";

const {
  OTG_DB_HOST,
  OTG_DB_PORT,
  OTG_DB_USER,
  OTG_DB_PASSWORD,
  OTG_DB_NAME,
} = process.env;

if (!OTG_DB_HOST || !OTG_DB_USER || !OTG_DB_NAME) {
  console.warn("[otogaleri] Database env variables are not fully set yet.");
}

export const dbPool = mysql.createPool({
  host: OTG_DB_HOST || "localhost",
  port: OTG_DB_PORT ? Number(OTG_DB_PORT) : 3306,
  user: OTG_DB_USER || "root",
  password: OTG_DB_PASSWORD || "",
  database: OTG_DB_NAME || "otogaleri",
  connectionLimit: 20,
  queueLimit: 0, // Unlimited queue
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export async function testConnection() {
  const conn = await dbPool.getConnection();
  await conn.ping();
  conn.release();
}
