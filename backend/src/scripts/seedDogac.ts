/**
 * Seed script for dogac@nerdyreptile.com
 * Adds realistic demo data for the last 8-9 weeks (Dec 13, 2025 - Feb 14, 2026)
 * Run: npx ts-node src/scripts/seedDogac.ts
 * Or: npm run seed:dogac
 */

import "dotenv/config";
import * as mysql from "mysql2/promise";
import * as bcrypt from "bcryptjs";
import { dbConfig } from "../config/appConfig";

const TARGET_EMAIL = "dogac@nerdyreptile.com";
const DEFAULT_PASSWORD = "Demo123!";
const FX_USD_TRY = 38.0;
const FX_EUR_TRY = 41.0;

// Date range: Son 9 hafta (Dec 13, 2025 - Feb 14, 2026)
const dates = {
  dec13: "2025-12-13",
  dec20: "2025-12-20",
  dec23: "2025-12-23",
  dec27: "2025-12-27",
  dec30: "2025-12-30",
  jan03: "2026-01-03",
  jan07: "2026-01-07",
  jan10: "2026-01-10",
  jan14: "2026-01-14",
  jan20: "2026-01-20",
  jan25: "2026-01-25",
  jan30: "2026-01-30",
  feb01: "2026-02-01",
  feb05: "2026-02-05",
  feb10: "2026-02-10",
  feb14: "2026-02-14",
};

async function main() {
  const config = dbConfig.required;
  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    multipleStatements: true,
  });

  try {
    console.log("[seed] Starting seed for", TARGET_EMAIL);

    // 1. Find or create tenant and user
    let tenantId: number;
    let userId: number;

    const [existingUsers] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT id, tenant_id FROM users WHERE email = ?",
      [TARGET_EMAIL]
    );

    if (existingUsers && existingUsers.length > 0) {
      tenantId = existingUsers[0].tenant_id;
      userId = existingUsers[0].id;
      console.log("[seed] Found existing user, tenant_id:", tenantId);
    } else {
      // Create tenant
      const [tenantResult] = await conn.query(
        "INSERT INTO tenants (name, slug, default_currency, country) VALUES (?, ?, ?, ?)",
        ["Otogaleri Demo", "otogaleri-demo-dogac", "TRY", "Türkiye"]
      );
      tenantId = (tenantResult as mysql.ResultSetHeader).insertId;
      console.log("[seed] Created tenant, id:", tenantId);

      // Create user
      const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      const [userResult] = await conn.query(
        "INSERT INTO users (tenant_id, name, email, password_hash, role, token_version) VALUES (?, ?, ?, ?, ?, ?)",
        [tenantId, "Doğaç", TARGET_EMAIL, passwordHash, "owner", 0]
      );
      userId = (userResult as mysql.ResultSetHeader).insertId;
      console.log("[seed] Created user. Login with password:", DEFAULT_PASSWORD);
    }

    // Clean existing seed data for this tenant (idempotent - re-run replaces data)
    console.log("[seed] Cleaning existing data for tenant...");
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    await conn.query("DELETE FROM inventory_movements WHERE tenant_id = ?", [tenantId]);
    await conn.query("DELETE FROM vehicle_installment_payments WHERE tenant_id = ?", [tenantId]);
    await conn.query("DELETE FROM vehicle_installment_sales WHERE tenant_id = ?", [tenantId]);
    await conn.query("DELETE FROM vehicle_sales WHERE tenant_id = ?", [tenantId]);
    await conn.query("DELETE FROM vehicle_costs WHERE tenant_id = ?", [tenantId]);
    await conn.query("DELETE FROM vehicle_quotes WHERE tenant_id = ?", [tenantId]);
    await conn.query("DELETE FROM post_sale_followups WHERE tenant_id = ?", [tenantId]);
    await conn.query("DELETE FROM vehicles WHERE tenant_id = ?", [tenantId]);
    await conn.query("DELETE FROM income WHERE tenant_id = ?", [tenantId]);
    await conn.query("DELETE FROM expenses WHERE tenant_id = ?", [tenantId]);
    await conn.query("DELETE FROM customers WHERE tenant_id = ?", [tenantId]);
    await conn.query("DELETE FROM staff WHERE tenant_id = ?", [tenantId]);
    await conn.query("DELETE FROM branches WHERE tenant_id = ?", [tenantId]);
    await conn.query("DELETE FROM inventory_products WHERE tenant_id = ?", [tenantId]);
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");

    // 2. Branches
    await conn.query(
      `INSERT INTO branches (tenant_id, name, code, city, country, address, phone, tax_office, tax_number) VALUES
       (?, 'Merkez Şube', 'MERKEZ', 'İstanbul', 'Türkiye', 'Maslak Mahallesi, Büyükdere Cad. No:123', '0212 123 45 67', 'Maslak VD', '1234567890'),
       (?, 'Ankara Şubesi', 'ANK', 'Ankara', 'Türkiye', 'Çankaya Mahallesi, Atatürk Bulvarı No:456', '0312 987 65 43', 'Çankaya VD', '0987654321'),
       (?, 'İzmir Şubesi', 'IZM', 'İzmir', 'Türkiye', 'Alsancak Mahallesi, Kordon Boyu No:789', '0232 456 78 90', 'Alsancak VD', '1122334455')`,
      [tenantId, tenantId, tenantId]
    );
    const [branchRows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT id FROM branches WHERE tenant_id = ? ORDER BY id",
      [tenantId]
    );
    const branchIds = branchRows.map((r) => r.id);
    console.log("[seed] Branches created:", branchIds);

    // 3. Staff
    await conn.query(
      `INSERT INTO staff (tenant_id, branch_id, name, email, phone, role, is_active) VALUES
       (?, ?, 'Ahmet Yılmaz', 'ahmet@galeri.com', '0532 111 22 33', 'manager', 1),
       (?, ?, 'Mehmet Demir', 'mehmet@galeri.com', '0532 222 33 44', 'sales', 1),
       (?, ?, 'Ayşe Kaya', 'ayse@galeri.com', '0532 333 44 55', 'sales', 1),
       (?, ?, 'Fatma Şahin', 'fatma@galeri.com', '0532 444 55 66', 'accounting', 1),
       (?, ?, 'Ali Çelik', 'ali@galeri.com', '0532 555 66 77', 'manager', 1),
       (?, ?, 'Zeynep Arslan', 'zeynep@galeri.com', '0532 666 77 88', 'sales', 1)`,
      [
        tenantId, branchIds[0],
        tenantId, branchIds[0],
        tenantId, branchIds[0],
        tenantId, branchIds[0],
        tenantId, branchIds[1],
        tenantId, branchIds[1],
      ]
    );
    const [staffRows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT id FROM staff WHERE tenant_id = ? ORDER BY id",
      [tenantId]
    );
    const staffIds = staffRows.map((r) => r.id);

    // 4. Customers
    await conn.query(
      `INSERT INTO customers (tenant_id, name, phone, email, address, notes, total_spent_base) VALUES
       (?, 'Mustafa Özkan', '0533 111 22 33', 'mustafa@email.com', 'Kadıköy, İstanbul', 'Premium araç tercih', 0),
       (?, 'Zeynep Arslan', '0533 222 33 44', 'zeynep.m@email.com', 'Beşiktaş, İstanbul', 'SUV tercih', 0),
       (?, 'Burak Yıldız', '0533 333 44 55', 'burak@email.com', 'Çankaya, Ankara', NULL, 0),
       (?, 'Selin Aydın', '0533 444 55 66', 'selin@email.com', 'Nilüfer, Bursa', NULL, 0),
       (?, 'Can Doğan', '0533 555 66 77', 'can@email.com', 'Konak, İzmir', NULL, 0),
       (?, 'Elif Kılıç', '0533 666 77 88', 'elif@email.com', 'Muratpaşa, Antalya', NULL, 0),
       (?, 'Emre Şen', '0533 777 88 99', 'emre@email.com', 'Seyhan, Adana', NULL, 0),
       (?, 'Deniz Yücel', '0533 888 99 00', 'deniz@email.com', 'Gaziantep', NULL, 0),
       (?, 'Gizem Öztürk', '0534 111 22 33', 'gizem@email.com', 'İzmit, Kocaeli', NULL, 0),
       (?, 'Kerem Avcı', '0534 222 33 44', 'kerem@email.com', 'Trabzon', NULL, 0),
       (?, 'Sude Karaca', '0534 333 44 55', 'sude@email.com', 'Eskişehir', NULL, 0),
       (?, 'Berk Yavuz', '0534 444 55 66', 'berk@email.com', 'Sakarya', NULL, 0),
       (?, 'Merve Çınar', '0534 555 66 77', 'merve@email.com', 'Balıkesir', NULL, 0),
       (?, 'Onur Tekin', '0534 666 77 88', 'onur@email.com', 'Manisa', NULL, 0),
       (?, 'Ceren Ateş', '0534 777 88 99', 'ceren@email.com', 'Bodrum, Muğla', NULL, 0)`,
      Array(15).fill(tenantId)
    );
    const [customerRows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT id FROM customers WHERE tenant_id = ? ORDER BY id",
      [tenantId]
    );
    const customerIds = customerRows.map((r) => r.id);

    // 5. Vehicles - 12 stokta, 10 satılmış, 3 rezerve
    await conn.query(
      `INSERT INTO vehicles (tenant_id, vehicle_number, branch_id, maker, model, production_year, arrival_date, transmission, chassis_no, plate_number, km, fuel, grade, color, status, stock_status, location, purchase_amount, purchase_currency, purchase_fx_rate_to_base, purchase_date, sale_price, sale_currency, sale_fx_rate_to_base, is_sold, target_profit) VALUES
       (?, 1, ?, 'BMW', '3.20i', 2022, ?, 'Otomatik', 'WBA12345678901234', NULL, 15000, 'Benzin', 'M Sport', 'Siyah', 'used', 'in_stock', 'Showroom A', 850000, 'TRY', 1, ?, 1050000, 'TRY', 1, 0, 200000),
       (?, 2, ?, 'Mercedes-Benz', 'C 200', 2021, ?, 'Otomatik', 'WDD12345678901235', NULL, 25000, 'Benzin', 'AMG Line', 'Beyaz', 'used', 'in_stock', 'Showroom B', 25000, 'USD', ?, ?, 920000, 'TRY', 1, 0, 200000),
       (?, 3, ?, 'Audi', 'A4', 2023, ?, 'Otomatik', 'WAU12345678901236', NULL, 8000, 'Benzin', 'S Line', 'Gri', 'used', 'in_stock', 'Showroom A', 25000, 'EUR', ?, ?, 1180000, 'TRY', 1, 0, 230000),
       (?, 4, ?, 'Volkswagen', 'Golf', 2022, ?, 'Manuel', 'WVW12345678901237', NULL, 18000, 'Benzin', 'Highline', 'Kırmızı', 'used', 'in_stock', 'Depo', 420000, 'TRY', 1, ?, 520000, 'TRY', 1, 0, 100000),
       (?, 5, ?, 'Toyota', 'Corolla', 2022, ?, 'Otomatik', 'JTDB12345678901239', NULL, 12000, 'Hibrit', 'XLE', 'Beyaz', 'used', 'in_stock', 'Showroom', 550000, 'TRY', 1, ?, 680000, 'TRY', 1, 0, 130000),
       (?, 6, ?, 'Honda', 'Civic', 2021, ?, 'Manuel', '19XFC12345678901240', NULL, 28000, 'Benzin', 'EX', 'Siyah', 'used', 'in_stock', 'Depo', 450000, 'TRY', 1, ?, 560000, 'TRY', 1, 0, 110000),
       (?, 7, ?, 'Hyundai', 'Elantra', 2023, ?, 'Otomatik', 'KMHD12345678901241', NULL, 5000, 'Benzin', 'Premium', 'Gümüş', 'used', 'in_stock', 'Showroom A', 480000, 'TRY', 1, ?, 590000, 'TRY', 1, 0, 110000),
       (?, 8, ?, 'BMW', '5.20d', 2021, ?, 'Otomatik', 'WBA22345678901244', NULL, 30000, 'Dizel', 'M Sport', 'Siyah', 'used', 'in_stock', 'Showroom B', 1100000, 'TRY', 1, ?, 1350000, 'TRY', 1, 0, 250000),
       (?, 9, ?, 'Mercedes-Benz', 'E 220d', 2020, ?, 'Otomatik', 'WDD22345678901245', NULL, 45000, 'Dizel', 'AMG Line', 'Beyaz', 'used', 'in_stock', 'Showroom A', 28000, 'USD', ?, ?, 1200000, 'TRY', 1, 0, 220000),
       (?, 10, ?, 'Volkswagen', 'Passat', 2021, ?, 'Otomatik', 'WVW22345678901247', NULL, 28000, 'Dizel', 'Highline', 'Siyah', 'used', 'in_stock', 'Depo', 680000, 'TRY', 1, ?, 850000, 'TRY', 1, 0, 170000),
       (?, 11, ?, 'Ford', 'Mondeo', 2020, ?, 'Otomatik', 'WF0X22345678901248', NULL, 40000, 'Dizel', 'Titanium', 'Beyaz', 'used', 'in_stock', 'Depo', 550000, 'TRY', 1, ?, 690000, 'TRY', 1, 0, 140000),
       (?, 12, ?, 'Toyota', 'Camry', 2021, ?, 'Otomatik', 'JTDB22345678901249', NULL, 32000, 'Hibrit', 'XLE', 'Gümüş', 'used', 'in_stock', 'Showroom', 720000, 'TRY', 1, ?, 900000, 'TRY', 1, 0, 180000),
       (?, 13, ?, 'BMW', '5.30d', 2020, ?, 'Otomatik', 'WBA52345678901234', '34ABC123', 45000, 'Dizel', 'M Sport', 'Siyah', 'used', 'sold', NULL, 1200000, 'TRY', 1, ?, 50000, 'USD', ?, 1, 300000),
       (?, 14, ?, 'Mercedes-Benz', 'E 200', 2021, ?, 'Otomatik', 'WDD52345678901235', '34DEF456', 38000, 'Benzin', 'AMG Line', 'Beyaz', 'used', 'sold', NULL, 1100000, 'TRY', 1, ?, 1350000, 'TRY', 1, 1, 250000),
       (?, 15, ?, 'Audi', 'A6', 2020, ?, 'Otomatik', 'WAU52345678901236', '34GHI789', 52000, 'Dizel', 'S Line', 'Gri', 'used', 'sold', NULL, 38000, 'EUR', ?, ?, 1420000, 'TRY', 1, 1, 270000),
       (?, 16, ?, 'Volkswagen', 'Passat', 2021, ?, 'Otomatik', 'WVW52345678901237', '06JKL012', 29000, 'Dizel', 'Highline', 'Siyah', 'used', 'sold', NULL, 680000, 'TRY', 1, ?, 850000, 'TRY', 1, 1, 170000),
       (?, 17, ?, 'Ford', 'Mondeo', 2020, ?, 'Otomatik', 'WF0X52345678901238', '34MNO345', 41000, 'Dizel', 'Titanium', 'Beyaz', 'used', 'sold', NULL, 550000, 'TRY', 1, ?, 690000, 'TRY', 1, 1, 140000),
       (?, 18, ?, 'Toyota', 'Camry', 2021, ?, 'Otomatik', 'JTDB52345678901239', '34PQR678', 33000, 'Hibrit', 'XLE', 'Gümüş', 'used', 'sold', NULL, 720000, 'TRY', 1, ?, 900000, 'TRY', 1, 1, 180000),
       (?, 19, ?, 'Honda', 'Accord', 2020, ?, 'Otomatik', '19XFC52345678901240', '06STU901', 47000, 'Benzin', 'EX', 'Siyah', 'used', 'sold', NULL, 650000, 'TRY', 1, ?, 810000, 'TRY', 1, 1, 160000),
       (?, 20, ?, 'Hyundai', 'Sonata', 2021, ?, 'Otomatik', 'KMHD52345678901241', '34VWX234', 36000, 'Benzin', 'Premium', 'Beyaz', 'used', 'sold', NULL, 580000, 'TRY', 1, ?, 720000, 'TRY', 1, 1, 140000),
       (?, 21, ?, 'BMW', 'X3', 2021, ?, 'Otomatik', 'WBA62345678901244', '34EFG123', 38000, 'Benzin', 'xLine', 'Beyaz', 'used', 'sold', NULL, 980000, 'TRY', 1, ?, 1200000, 'TRY', 1, 1, 220000),
       (?, 22, ?, 'Mercedes-Benz', 'GLC', 2020, ?, 'Otomatik', 'WDD62345678901245', '34HIJ456', 45000, 'Dizel', 'AMG Line', 'Siyah', 'used', 'sold', NULL, 1100000, 'TRY', 1, ?, 1350000, 'TRY', 1, 1, 250000),
       (?, 23, ?, 'BMW', 'X3', 2022, ?, 'Otomatik', 'WBA72345678901234', NULL, 18000, 'Benzin', 'xLine', 'Beyaz', 'used', 'reserved', 'Showroom B', 980000, 'TRY', 1, ?, 1200000, 'TRY', 1, 0, 220000),
       (?, 24, ?, 'Mercedes-Benz', 'GLC', 2021, ?, 'Otomatik', 'WDD72345678901235', NULL, 28000, 'Dizel', 'AMG Line', 'Siyah', 'used', 'reserved', 'Showroom A', 1100000, 'TRY', 1, ?, 1350000, 'TRY', 1, 0, 250000),
       (?, 25, ?, 'Audi', 'Q5', 2022, ?, 'Otomatik', 'WAU72345678901236', NULL, 15000, 'Benzin', 'S Line', 'Gri', 'used', 'reserved', 'Showroom', 1050000, 'TRY', 1, ?, 1280000, 'TRY', 1, 0, 230000)`,
      [
        tenantId, branchIds[0], dates.dec20, dates.dec20,  // 1: BMW 3.20i - hafta 1
        tenantId, branchIds[0], dates.dec23, FX_USD_TRY, dates.dec23,  // 2: Mercedes C 200
        tenantId, branchIds[0], dates.dec27, FX_EUR_TRY, dates.dec27,  // 3: Audi A4
        tenantId, branchIds[0], dates.dec30, dates.dec30,  // 4: VW Golf
        tenantId, branchIds[1], dates.jan03, dates.jan03,  // 5: Toyota Corolla - hafta 3
        tenantId, branchIds[0], dates.jan07, dates.jan07,  // 6: Honda Civic
        tenantId, branchIds[0], dates.jan10, dates.jan10,  // 7: Hyundai Elantra
        tenantId, branchIds[0], dates.jan14, dates.jan14,  // 8: BMW 5.20d - hafta 4
        tenantId, branchIds[0], dates.jan20, FX_USD_TRY, dates.jan20,  // 9: Mercedes E 220d USD
        tenantId, branchIds[0], dates.jan25, dates.jan25,  // 10: VW Passat - hafta 5
        tenantId, branchIds[0], dates.jan30, dates.jan30,  // 11: Ford Mondeo
        tenantId, branchIds[0], dates.feb01, dates.feb01,  // 12: Toyota Camry - hafta 6
        tenantId, branchIds[0], dates.dec27, dates.dec27, FX_USD_TRY,  // 13: BMW 5.30d sold
        tenantId, branchIds[0], dates.jan03, dates.jan03,  // 14: Mercedes E 200 sold
        tenantId, branchIds[0], dates.jan07, FX_EUR_TRY, dates.jan07,  // 15: Audi A6 EUR sold
        tenantId, branchIds[0], dates.jan10, dates.jan10,  // 16: VW Passat sold
        tenantId, branchIds[0], dates.jan14, dates.jan14,  // 17: Ford Mondeo sold
        tenantId, branchIds[1], dates.jan20, dates.jan20,  // 18: Toyota Camry sold
        tenantId, branchIds[0], dates.jan25, dates.jan25,  // 19: Honda Accord sold
        tenantId, branchIds[0], dates.jan30, dates.jan30,  // 20: Hyundai Sonata sold
        tenantId, branchIds[1], dates.feb01, dates.feb01,  // 21: BMW X3 sold
        tenantId, branchIds[0], dates.feb05, dates.feb05,  // 22: Mercedes GLC sold
        tenantId, branchIds[0], dates.feb10, dates.feb10,  // 23: BMW X3 reserved
        tenantId, branchIds[0], dates.feb10, dates.feb10,  // 24: Mercedes GLC reserved
        tenantId, branchIds[1], dates.feb14, dates.feb14,  // 25: Audi Q5 reserved
      ]
    );
    const [vehicleRows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT id FROM vehicles WHERE tenant_id = ? ORDER BY vehicle_number",
      [tenantId]
    );
    const vehicleIds = vehicleRows.map((r) => r.id);
    // vehicleIds[0-11] stokta, [12-21] satılmış, [22-24] rezerve

    // 6. Vehicle costs (sample for first few vehicles)
    const costInserts = [
      [tenantId, vehicleIds[0], "Alım Fiyatı", 850000, "TRY", 1, dates.dec20, "purchase"],
      [tenantId, vehicleIds[0], "Nakliye", 15000, "TRY", 1, dates.dec20, "shipping"],
      [tenantId, vehicleIds[1], "Alım Fiyatı", 25000, "USD", FX_USD_TRY, dates.dec23, "purchase"],
      [tenantId, vehicleIds[1], "Nakliye", 12000, "TRY", 1, dates.dec23, "shipping"],
      [tenantId, vehicleIds[12], "Alım Fiyatı", 1200000, "TRY", 1, dates.dec27, "purchase"],
      [tenantId, vehicleIds[12], "Nakliye", 20000, "TRY", 1, dates.dec27, "shipping"],
    ];
    for (const c of costInserts) {
      await conn.query(
        "INSERT INTO vehicle_costs (tenant_id, vehicle_id, cost_name, amount, currency, fx_rate_to_base, cost_date, category) VALUES (?,?,?,?,?,?,?,?)",
        c
      );
    }

    // 7. Vehicle sales (for sold vehicles 13-22)
    const saleData = [
      [tenantId, vehicleIds[12], branchIds[0], staffIds[1], "Mustafa Özkan", "0533 111 22 33", "Kadıköy, İstanbul", "34ABC123", 2, 50000, "USD", FX_USD_TRY, dates.dec30],
      [tenantId, vehicleIds[13], branchIds[0], staffIds[2], "Zeynep Arslan", "0533 222 33 44", "Beşiktaş, İstanbul", "34DEF456", 2, 1350000, "TRY", 1, dates.jan07],
      [tenantId, vehicleIds[14], branchIds[0], staffIds[1], "Burak Yıldız", "0533 333 44 55", "Çankaya, Ankara", "34GHI789", 2, 1420000, "TRY", 1, dates.jan10],
      [tenantId, vehicleIds[15], branchIds[1], staffIds[5], "Selin Aydın", "0533 444 55 66", "Nilüfer, Bursa", "06JKL012", 2, 850000, "TRY", 1, dates.jan14],
      [tenantId, vehicleIds[16], branchIds[0], staffIds[1], "Can Doğan", "0533 555 66 77", "Konak, İzmir", "34MNO345", 2, 690000, "TRY", 1, dates.jan20],
      [tenantId, vehicleIds[17], branchIds[0], staffIds[2], "Elif Kılıç", "0533 666 77 88", "Antalya", "34PQR678", 2, 900000, "TRY", 1, dates.jan25],
      [tenantId, vehicleIds[18], branchIds[1], staffIds[5], "Emre Şen", "0533 777 88 99", "Adana", "06STU901", 2, 810000, "TRY", 1, dates.jan30],
      [tenantId, vehicleIds[19], branchIds[0], staffIds[1], "Deniz Yücel", "0533 888 99 00", "Gaziantep", "34VWX234", 2, 720000, "TRY", 1, dates.feb01],
      [tenantId, vehicleIds[20], branchIds[0], staffIds[2], "Gizem Öztürk", "0534 111 22 33", "Kocaeli", "34YZA567", 2, 780000, "TRY", 1, dates.feb05],
      [tenantId, vehicleIds[21], branchIds[0], staffIds[1], "Berk Yavuz", "0534 444 55 66", "Sakarya", "34HIJ456", 2, 1350000, "TRY", 1, dates.feb10],
    ];
    for (const s of saleData) {
      await conn.query(
        `INSERT INTO vehicle_sales (tenant_id, vehicle_id, branch_id, staff_id, customer_name, customer_phone, customer_address, plate_number, key_count, sale_amount, sale_currency, sale_fx_rate_to_base, sale_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        s
      );
    }
    const [saleRows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT id FROM vehicle_sales WHERE tenant_id = ? ORDER BY sale_date",
      [tenantId]
    );
    const saleIds = saleRows.map((r) => r.id);

    // 8. Installment sales (some of the above are installment)
    const instData = [
      [tenantId, vehicleIds[12], saleIds[0], 1750000, 500000, 10, 125000, "TRY", 1, dates.dec30, "active"],
      [tenantId, vehicleIds[14], saleIds[2], 1420000, 420000, 12, 83333.33, "TRY", 1, dates.jan10, "active"],
      [tenantId, vehicleIds[17], saleIds[5], 900000, 300000, 8, 75000, "TRY", 1, dates.jan25, "active"],
      [tenantId, vehicleIds[19], saleIds[7], 720000, 220000, 10, 50000, "TRY", 1, dates.feb01, "active"],
      [tenantId, vehicleIds[21], saleIds[9], 1350000, 450000, 12, 75000, "TRY", 1, dates.feb10, "active"],
    ];
    for (const i of instData) {
      await conn.query(
        `INSERT INTO vehicle_installment_sales (tenant_id, vehicle_id, sale_id, total_amount, down_payment, installment_count, installment_amount, currency, fx_rate_to_base, sale_date, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        i
      );
    }
    const [instRows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT id FROM vehicle_installment_sales WHERE tenant_id = ? ORDER BY id",
      [tenantId]
    );
    const instIds = instRows.map((r) => r.id);

    // 9. Installment payments
    const payData = [
      [tenantId, instIds[0], "down_payment", null, 500000, "TRY", 1, dates.dec30, "Peşin ödeme"],
      [tenantId, instIds[0], "installment", 1, 125000, "TRY", 1, dates.feb01, "1. Taksit"],
      [tenantId, instIds[1], "down_payment", null, 420000, "TRY", 1, dates.jan10, "Peşin ödeme"],
      [tenantId, instIds[1], "installment", 1, 83333.33, "TRY", 1, dates.feb05, "1. Taksit"],
      [tenantId, instIds[2], "down_payment", null, 300000, "TRY", 1, dates.jan25, "Peşin ödeme"],
      [tenantId, instIds[3], "down_payment", null, 220000, "TRY", 1, dates.feb01, "Peşin ödeme"],
      [tenantId, instIds[4], "down_payment", null, 450000, "TRY", 1, dates.feb10, "Peşin ödeme"],
    ];
    for (const p of payData) {
      await conn.query(
        `INSERT INTO vehicle_installment_payments (tenant_id, installment_sale_id, payment_type, installment_number, amount, currency, fx_rate_to_base, payment_date, notes) VALUES (?,?,?,?,?,?,?,?,?)`,
        p
      );
    }

    // 10. Vehicle quotes (teklifler)
    const quoteData = [
      [tenantId, vehicleIds[0], customerIds[0], "TKL-2026-001", dates.feb01, dates.feb14, 1050000, "TRY", 1, 300000, 8, 93750, "sent", userId],
      [tenantId, vehicleIds[1], customerIds[1], "TKL-2026-002", dates.feb05, dates.feb14, 920000, "TRY", 1, 250000, 10, 67000, "approved", userId],
      [tenantId, vehicleIds[3], customerIds[3], "TKL-2026-003", dates.feb10, dates.feb14, 520000, "TRY", 1, 150000, 6, 61667, "draft", userId],
      [tenantId, vehicleIds[4], customerIds[4], "TKL-2026-004", dates.jan07, dates.jan20, 680000, "TRY", 1, null, null, null, "expired", userId],
      [tenantId, vehicleIds[7], customerIds[7], "TKL-2026-005", dates.feb01, dates.feb14, 1350000, "TRY", 1, 400000, 12, 79167, "sent", userId],
    ];
    for (const q of quoteData) {
      await conn.query(
        `INSERT INTO vehicle_quotes (tenant_id, vehicle_id, customer_id, quote_number, quote_date, valid_until, sale_price, currency, fx_rate_to_base, down_payment, installment_count, installment_amount, status, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        q
      );
    }

    // 11. Inventory products
    await conn.query(
      `INSERT INTO inventory_products (tenant_id, sku, name, category, unit, current_stock, min_stock, cost_price, cost_currency, cost_fx_rate_to_base, sale_price, sale_currency, sale_fx_rate_to_base, sales_count, is_for_sale, is_for_service, track_stock) VALUES
       (?, 'OIL-5W30-1L', 'Motor Yağı 5W30 1L', 'Yedek Parça', 'adet', 45, 10, 250, 'TRY', 1, 350, 'TRY', 1, 12, 1, 1, 1),
       (?, 'FILTER-OIL', 'Yağ Filtresi', 'Yedek Parça', 'adet', 28, 5, 180, 'TRY', 1, 280, 'TRY', 1, 8, 1, 1, 1),
       (?, 'FILTER-AIR', 'Hava Filtresi', 'Yedek Parça', 'adet', 35, 8, 120, 'TRY', 1, 200, 'TRY', 1, 15, 1, 1, 1),
       (?, 'BRAKE-PAD-FRONT', 'Ön Fren Balata', 'Yedek Parça', 'adet', 22, 5, 450, 'TRY', 1, 650, 'TRY', 1, 6, 1, 1, 1),
       (?, 'BATTERY-12V', 'Akü 12V', 'Yedek Parça', 'adet', 12, 3, 1200, 'TRY', 1, 1800, 'TRY', 1, 3, 1, 1, 1),
       (?, 'TIRE-205-55-R16', 'Lastik 205/55 R16', 'Yedek Parça', 'adet', 32, 8, 800, 'TRY', 1, 1200, 'TRY', 1, 10, 1, 1, 1),
       (?, 'SHAMPOO-CAR', 'Araba Şampuanı', 'Temizlik', 'adet', 25, 5, 45, 'TRY', 1, 75, 'TRY', 1, 30, 1, 1, 1),
       (?, 'FLOOR-MAT-FRONT', 'Ön Paspas', 'Aksesuar', 'takım', 20, 5, 200, 'TRY', 1, 350, 'TRY', 1, 8, 1, 0, 1)`,
      Array(8).fill(tenantId)
    );
    const [prodRows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT id FROM inventory_products WHERE tenant_id = ? ORDER BY id",
      [tenantId]
    );
    const productIds = prodRows.map((r) => r.id);

    // 12. Inventory movements (stok girişleri, satışlar, servis kullanımı - son 9 hafta)
    const movData = [
      // Stok girişleri
      [tenantId, productIds[0], "in", 20, 250, "TRY", 1, 250, null, null, null, null, null, staffIds[0], "İlk stok girişi", dates.dec13 + " 10:00:00"],
      [tenantId, productIds[0], "in", 15, 250, "TRY", 1, 250, null, null, null, null, null, staffIds[0], "İkinci parti", dates.jan10 + " 14:00:00"],
      [tenantId, productIds[5], "in", 16, 800, "TRY", 1, 800, null, null, null, null, null, staffIds[0], "Lastik stok girişi", dates.dec20 + " 09:00:00"],
      // Ürün satışları (9 hafta boyunca)
      [tenantId, productIds[0], "sale", 5, 250, "TRY", 1, 250, 350, "TRY", 1, 350, customerIds[0], staffIds[1], "Motor yağı satışı", dates.dec23 + " 11:00:00"],
      [tenantId, productIds[0], "sale", 8, 250, "TRY", 1, 250, 350, "TRY", 1, 350, customerIds[1], staffIds[2], "Motor yağı satışı", dates.jan07 + " 10:30:00"],
      [tenantId, productIds[0], "sale", 6, 250, "TRY", 1, 250, 350, "TRY", 1, 350, customerIds[2], staffIds[1], "Motor yağı satışı", dates.jan25 + " 15:00:00"],
      [tenantId, productIds[1], "sale", 3, 180, "TRY", 1, 180, 280, "TRY", 1, 280, customerIds[0], staffIds[1], "Yağ filtresi satışı", dates.dec27 + " 11:00:00"],
      [tenantId, productIds[1], "sale", 2, 180, "TRY", 1, 180, 280, "TRY", 1, 280, customerIds[3], staffIds[2], "Yağ filtresi satışı", dates.jan14 + " 14:00:00"],
      [tenantId, productIds[1], "sale", 2, 180, "TRY", 1, 180, 280, "TRY", 1, 280, customerIds[4], staffIds[1], "Yağ filtresi satışı", dates.feb05 + " 10:00:00"],
      [tenantId, productIds[2], "sale", 5, 120, "TRY", 1, 120, 200, "TRY", 1, 200, customerIds[1], staffIds[2], "Hava filtresi satışı", dates.dec30 + " 13:00:00"],
      [tenantId, productIds[2], "sale", 4, 120, "TRY", 1, 120, 200, "TRY", 1, 200, customerIds[5], staffIds[1], "Hava filtresi satışı", dates.jan20 + " 11:00:00"],
      [tenantId, productIds[2], "sale", 3, 120, "TRY", 1, 120, 200, "TRY", 1, 200, customerIds[6], staffIds[2], "Hava filtresi satışı", dates.feb01 + " 09:30:00"],
      [tenantId, productIds[3], "sale", 2, 450, "TRY", 1, 450, 650, "TRY", 1, 650, customerIds[2], staffIds[1], "Fren balata satışı", dates.jan03 + " 14:00:00"],
      [tenantId, productIds[3], "sale", 1, 450, "TRY", 1, 450, 650, "TRY", 1, 650, customerIds[7], staffIds[2], "Fren balata satışı", dates.jan25 + " 16:00:00"],
      [tenantId, productIds[3], "sale", 2, 450, "TRY", 1, 450, 650, "TRY", 1, 650, customerIds[8], staffIds[1], "Fren balata satışı", dates.feb10 + " 11:00:00"],
      [tenantId, productIds[5], "sale", 4, 800, "TRY", 1, 800, 1200, "TRY", 1, 1200, customerIds[3], staffIds[1], "Lastik satışı", dates.jan07 + " 10:00:00"],
      [tenantId, productIds[5], "sale", 4, 800, "TRY", 1, 800, 1200, "TRY", 1, 1200, customerIds[4], staffIds[2], "Lastik satışı", dates.jan30 + " 14:00:00"],
      [tenantId, productIds[6], "sale", 8, 45, "TRY", 1, 45, 75, "TRY", 1, 75, customerIds[5], staffIds[1], "Şampuan satışı", dates.dec20 + " 10:00:00"],
      [tenantId, productIds[6], "sale", 6, 45, "TRY", 1, 45, 75, "TRY", 1, 75, customerIds[6], staffIds[2], "Şampuan satışı", dates.jan14 + " 11:00:00"],
      [tenantId, productIds[7], "sale", 3, 200, "TRY", 1, 200, 350, "TRY", 1, 350, customerIds[7], staffIds[1], "Paspas satışı", dates.jan10 + " 15:00:00"],
      [tenantId, productIds[7], "sale", 2, 200, "TRY", 1, 200, 350, "TRY", 1, 350, customerIds[8], staffIds[2], "Paspas satışı", dates.feb05 + " 12:00:00"],
      // Servis kullanımları (9 hafta boyunca)
      [tenantId, productIds[0], "service_usage", 4, 250, "TRY", 1, 250, 350, "TRY", 1, 350, null, staffIds[1], "Servis yağ değişimi", dates.dec23 + " 09:00:00"],
      [tenantId, productIds[0], "service_usage", 5, 250, "TRY", 1, 250, 350, "TRY", 1, 350, null, staffIds[2], "Servis yağ değişimi", dates.jan20 + " 10:00:00"],
      [tenantId, productIds[1], "service_usage", 3, 180, "TRY", 1, 180, 280, "TRY", 1, 280, null, staffIds[1], "Servis filtre değişimi", dates.jan14 + " 09:30:00"],
      [tenantId, productIds[2], "service_usage", 6, 120, "TRY", 1, 120, 200, "TRY", 1, 200, null, staffIds[2], "Servis filtre değişimi", dates.jan07 + " 11:00:00"],
      [tenantId, productIds[4], "service_usage", 1, 1200, "TRY", 1, 1200, 1800, "TRY", 1, 1800, null, staffIds[1], "Akü değişimi", dates.dec30 + " 09:00:00"],
      [tenantId, productIds[4], "service_usage", 1, 1200, "TRY", 1, 1200, 1800, "TRY", 1, 1800, null, staffIds[2], "Akü değişimi", dates.jan25 + " 10:00:00"],
      [tenantId, productIds[4], "service_usage", 1, 1200, "TRY", 1, 1200, 1800, "TRY", 1, 1800, null, staffIds[1], "Akü değişimi", dates.feb05 + " 09:00:00"],
      [tenantId, productIds[3], "service_usage", 2, 450, "TRY", 1, 450, 650, "TRY", 1, 650, null, staffIds[2], "Fren balata değişimi", dates.jan30 + " 14:00:00"],
    ];
    for (const m of movData) {
      await conn.query(
        `INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, cost_price, cost_currency, cost_fx_rate_to_base, cost_amount_base, sale_price, sale_currency, sale_fx_rate_to_base, sale_amount_base, customer_id, staff_id, note, movement_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        m
      );
    }
    // Update current_stock: in (+) vs sale/service_usage (-)
    // Product 0: +20+15 -5-8-6 -4-5 = +7
    await conn.query("UPDATE inventory_products SET current_stock = current_stock + 35 - 28 WHERE id = ? AND tenant_id = ?", [productIds[0], tenantId]);
    // Product 1: -3-2-2 -3 = -10
    await conn.query("UPDATE inventory_products SET current_stock = current_stock - 10 WHERE id = ? AND tenant_id = ?", [productIds[1], tenantId]);
    // Product 2: -5-4-3 -6 = -18
    await conn.query("UPDATE inventory_products SET current_stock = current_stock - 18 WHERE id = ? AND tenant_id = ?", [productIds[2], tenantId]);
    // Product 3: -2-1-2 -2 = -7
    await conn.query("UPDATE inventory_products SET current_stock = current_stock - 7 WHERE id = ? AND tenant_id = ?", [productIds[3], tenantId]);
    // Product 4: -1-1-1 = -3
    await conn.query("UPDATE inventory_products SET current_stock = current_stock - 3 WHERE id = ? AND tenant_id = ?", [productIds[4], tenantId]);
    // Product 5: +16 -4-4 = +8
    await conn.query("UPDATE inventory_products SET current_stock = current_stock + 16 - 8 WHERE id = ? AND tenant_id = ?", [productIds[5], tenantId]);
    // Product 6: -8-6 = -14
    await conn.query("UPDATE inventory_products SET current_stock = current_stock - 14 WHERE id = ? AND tenant_id = ?", [productIds[6], tenantId]);
    // Product 7: -3-2 = -5
    await conn.query("UPDATE inventory_products SET current_stock = current_stock - 5 WHERE id = ? AND tenant_id = ?", [productIds[7], tenantId]);

    // 13. Income (8 hafta boyunca dağıtılmış)
    await conn.query(
      `INSERT INTO income (tenant_id, branch_id, description, category, amount, currency, fx_rate_to_base, amount_base, income_date) VALUES
       (?, ?, 'Yedek Parça Satışı', 'parts_sale', 15000, 'TRY', 1, 15000, ?),
       (?, ?, 'Servis Geliri', 'service', 8500, 'TRY', 1, 8500, ?),
       (?, ?, 'Aksesuar Satışı', 'accessories', 3200, 'TRY', 1, 3200, ?),
       (?, ?, 'Yedek Parça Satışı (USD)', 'parts_sale', 500, 'USD', ?, 19000, ?)`,
      [tenantId, branchIds[0], dates.jan07, tenantId, branchIds[0], dates.jan25, tenantId, branchIds[1], dates.feb05, tenantId, branchIds[0], FX_USD_TRY, dates.feb10]
    );

    // 14. Expenses (8 hafta boyunca dağıtılmış)
    await conn.query(
      `INSERT INTO expenses (tenant_id, branch_id, description, category, amount, currency, fx_rate_to_base, amount_base, expense_date) VALUES
       (?, ?, 'Kira Ödemesi', 'rent', 50000, 'TRY', 1, 50000, ?),
       (?, ?, 'Elektrik Faturası', 'utilities', 8500, 'TRY', 1, 8500, ?),
       (?, ?, 'Personel Maaşları', 'salary', 120000, 'TRY', 1, 120000, ?),
       (?, ?, 'Pazarlama Giderleri', 'marketing', 15000, 'TRY', 1, 15000, ?)`,
      [tenantId, branchIds[0], dates.dec27, tenantId, branchIds[0], dates.jan14, tenantId, branchIds[0], dates.jan03, tenantId, branchIds[0], dates.jan20]
    );

    // 15. Post-sale followups (8 hafta boyunca)
    const followData = [
      [tenantId, saleIds[0], customerIds[0], vehicleIds[12], "call", dates.jan07, "14:00:00", "completed", "Müşteri memnun", 5, staffIds[1]],
      [tenantId, saleIds[1], customerIds[1], vehicleIds[13], "call", dates.jan14, "10:00:00", "completed", "İlk takip", 4, staffIds[2]],
      [tenantId, saleIds[2], customerIds[2], vehicleIds[14], "sms", dates.jan14, null, "completed", "SMS gönderildi", null, staffIds[1]],
      [tenantId, saleIds[3], customerIds[3], vehicleIds[15], "call", dates.feb05, "11:00:00", "pending", "Takip yapılacak", null, staffIds[5]],
      [tenantId, saleIds[4], customerIds[4], vehicleIds[16], "email", dates.jan25, null, "completed", "E-posta gönderildi", null, staffIds[1]],
    ];
    for (const f of followData) {
      await conn.query(
        `INSERT INTO post_sale_followups (tenant_id, sale_id, customer_id, vehicle_id, followup_type, followup_date, followup_time, status, notes, satisfaction_score, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        f
      );
    }

    // Update vehicles sale_date for sold ones (from vehicle_sales)
    await conn.query(
      `UPDATE vehicles v
       JOIN vehicle_sales vs ON v.id = vs.vehicle_id AND v.tenant_id = vs.tenant_id
       SET v.sale_date = vs.sale_date, v.sale_fx_rate_to_base = vs.sale_fx_rate_to_base
       WHERE v.tenant_id = ? AND v.is_sold = 1`,
      [tenantId]
    );

    // Update customer total_spent_base (approximate from sales)
    const spentUpdates = [
      [4500000, customerIds[0]], [3200000, customerIds[1]], [2800000, customerIds[2]],
      [850000, customerIds[3]], [690000, customerIds[4]], [900000, customerIds[5]],
      [810000, customerIds[6]], [720000, customerIds[7]], [780000, customerIds[8]],
      [1350000, customerIds[9]],
    ];
    for (const [amt, cid] of spentUpdates) {
      await conn.query("UPDATE customers SET total_spent_base = ? WHERE id = ?", [amt, cid]);
    }

    console.log("[seed] ✅ Seed completed successfully!");
    console.log("[seed] Summary: 25 vehicles, 15 customers, 10 sales, 5 installment sales, 5 quotes, 8 inventory products");
    console.log("[seed] Login:", TARGET_EMAIL, existingUsers?.length ? "(existing)" : "| Password:", DEFAULT_PASSWORD);
  } catch (err) {
    console.error("[seed] Error:", err);
    throw err;
  } finally {
    await conn.end();
  }
}

main().catch(() => process.exit(1));
