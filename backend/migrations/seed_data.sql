-- Seed Data: Gerçekçi test verileri (2025 Aralık 11 güncel)
-- Bu dosya uygulamanın test edilmesi için gerçekçi veriler içerir
-- Multi-currency desteği ile güncellenmiştir
-- Kullanım: mysql -u root otogaleri < migrations/seed_data.sql

USE otogaleri;

-- Mevcut verileri temizle
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE inventory_movements;
TRUNCATE TABLE vehicle_installment_payments;
TRUNCATE TABLE vehicle_installment_sales;
TRUNCATE TABLE vehicle_sales;
TRUNCATE TABLE vehicle_costs;
TRUNCATE TABLE vehicle_documents;
TRUNCATE TABLE vehicle_quotes;
TRUNCATE TABLE vehicles;
TRUNCATE TABLE customers;
TRUNCATE TABLE staff;
TRUNCATE TABLE branches;
TRUNCATE TABLE inventory_products;
TRUNCATE TABLE income;
TRUNCATE TABLE expenses;
TRUNCATE TABLE post_sale_followups;
SET FOREIGN_KEY_CHECKS = 1;

-- Tenant ID = 1 olduğunu varsayıyoruz
-- Base Currency: TRY (Türk Lirası)
-- FX Rates (yaklaşık): USD/TRY = 35.00, EUR/TRY = 38.00, GBP/TRY = 44.00

-- 1. Branches (Şubeler)
INSERT INTO branches (tenant_id, name, code, city, country, address, phone, tax_office, tax_number) VALUES
(1, 'Merkez Şube', 'MERKEZ', 'İstanbul', 'Türkiye', 'Maslak Mahallesi, Büyükdere Cad. No:123', '0212 123 45 67', 'Maslak Vergi Dairesi', '1234567890'),
(1, 'Ankara Şubesi', 'ANK', 'Ankara', 'Türkiye', 'Çankaya Mahallesi, Atatürk Bulvarı No:456', '0312 987 65 43', 'Çankaya Vergi Dairesi', '0987654321'),
(1, 'İzmir Şubesi', 'IZM', 'İzmir', 'Türkiye', 'Alsancak Mahallesi, Kordon Boyu No:789', '0232 456 78 90', 'Alsancak Vergi Dairesi', '1122334455')
ON DUPLICATE KEY UPDATE name=name;

-- 2. Staff (Personel)
INSERT INTO staff (tenant_id, branch_id, name, email, phone, role, is_active) VALUES
(1, 1, 'Ahmet Yılmaz', 'ahmet.yilmaz@galeri.com', '0532 111 22 33', 'manager', 1),
(1, 1, 'Mehmet Demir', 'mehmet.demir@galeri.com', '0532 222 33 44', 'sales', 1),
(1, 1, 'Ayşe Kaya', 'ayse.kaya@galeri.com', '0532 333 44 55', 'sales', 1),
(1, 1, 'Fatma Şahin', 'fatma.sahin@galeri.com', '0532 444 55 66', 'accounting', 1),
(1, 2, 'Ali Çelik', 'ali.celik@galeri.com', '0532 555 66 77', 'manager', 1),
(1, 2, 'Zeynep Arslan', 'zeynep.arslan@galeri.com', '0532 666 77 88', 'sales', 1),
(1, 2, 'Burak Yıldız', 'burak.yildiz@galeri.com', '0532 777 88 99', 'sales', 1),
(1, 3, 'Selin Aydın', 'selin.aydin@galeri.com', '0532 888 99 00', 'manager', 1),
(1, 3, 'Can Doğan', 'can.dogan@galeri.com', '0532 999 00 11', 'sales', 1)
ON DUPLICATE KEY UPDATE name=name;

-- 3. Customers (Müşteriler) - 25 müşteri
INSERT INTO customers (tenant_id, name, phone, email, address, notes, total_spent_base) VALUES
(1, 'Mustafa Özkan', '0533 111 22 33', 'mustafa.ozkan@email.com', 'Kadıköy, İstanbul', 'Düzenli müşteri, premium araç tercih ediyor', 4500000.00),
(1, 'Zeynep Arslan', '0533 222 33 44', 'zeynep.arslan@email.com', 'Beşiktaş, İstanbul', 'SUV tercih ediyor', 3200000.00),
(1, 'Burak Yıldız', '0533 333 44 55', 'burak.yildiz@email.com', 'Çankaya, Ankara', 'Taksitli satış yaptı, düzenli ödeme yapıyor', 2800000.00),
(1, 'Selin Aydın', '0533 444 55 66', 'selin.aydin@email.com', 'Nilüfer, Bursa', 'Ekonomik araç tercih ediyor', 1950000.00),
(1, 'Can Doğan', '0533 555 66 77', 'can.dogan@email.com', 'Konak, İzmir', 'Spor araç sever', 1500000.00),
(1, 'Elif Kılıç', '0533 666 77 88', 'elif.kilic@email.com', 'Muratpaşa, Antalya', 'Yazlık araç', 1250000.00),
(1, 'Emre Şen', '0533 777 88 99', 'emre.sen@email.com', 'Seyhan, Adana', NULL, 980000.00),
(1, 'Deniz Yücel', '0533 888 99 00', 'deniz.yucel@email.com', 'Şahinbey, Gaziantep', NULL, 850000.00),
(1, 'Gizem Öztürk', '0534 111 22 33', 'gizem.ozturk@email.com', 'İzmit, Kocaeli', NULL, 720000.00),
(1, 'Kerem Avcı', '0534 222 33 44', 'kerem.avci@email.com', 'Ortahisar, Trabzon', NULL, 650000.00),
(1, 'Sude Karaca', '0534 333 44 55', 'sude.karaca@email.com', 'Tepebaşı, Eskişehir', NULL, 550000.00),
(1, 'Berk Yavuz', '0534 444 55 66', 'berk.yavuz@email.com', 'Adapazarı, Sakarya', NULL, 480000.00),
(1, 'Merve Çınar', '0534 555 66 77', 'merve.cinar@email.com', 'Karesi, Balıkesir', NULL, 420000.00),
(1, 'Onur Tekin', '0534 666 77 88', 'onur.tekin@email.com', 'Şehzadeler, Manisa', NULL, 380000.00),
(1, 'Ceren Ateş', '0534 777 88 99', 'ceren.ates@email.com', 'Bodrum, Muğla', NULL, 350000.00),
(1, 'Arda Kaya', '0535 111 22 33', 'arda.kaya@email.com', 'Pendik, İstanbul', NULL, 320000.00),
(1, 'Dilara Yılmaz', '0535 222 33 44', 'dilara.yilmaz@email.com', 'Yenimahalle, Ankara', NULL, 290000.00),
(1, 'Ege Demir', '0535 333 44 55', 'ege.demir@email.com', 'Karşıyaka, İzmir', NULL, 260000.00),
(1, 'İrem Şahin', '0535 444 55 66', 'irem.sahin@email.com', 'Osmangazi, Bursa', NULL, 240000.00),
(1, 'Kaan Özdemir', '0535 555 66 77', 'kaan.ozdemir@email.com', 'Kepez, Antalya', NULL, 220000.00),
(1, 'Lara Çelik', '0535 666 77 88', 'lara.celik@email.com', 'Çukurova, Adana', NULL, 200000.00),
(1, 'Mert Yıldırım', '0535 777 88 99', 'mert.yildirim@email.com', 'Şehitkamil, Gaziantep', NULL, 180000.00),
(1, 'Nazlı Koç', '0535 888 99 00', 'nazli.koc@email.com', 'Gebze, Kocaeli', NULL, 160000.00),
(1, 'Ozan Aydın', '0536 111 22 33', 'ozan.aydin@email.com', 'Akçaabat, Trabzon', NULL, 140000.00),
(1, 'Pınar Erdem', '0536 222 33 44', 'pinar.erdem@email.com', 'Odunpazarı, Eskişehir', NULL, 120000.00)
ON DUPLICATE KEY UPDATE name=name;

-- 4. Vehicles (Araçlar) - 40 araç (20 stokta, 15 satılmış, 5 rezerve)
-- Tarihler: Eylül-Aralık 2025 arası
-- Multi-currency: Bazı araçlar USD/EUR ile alınmış/satılmış
INSERT INTO vehicles (tenant_id, vehicle_number, branch_id, maker, model, production_year, arrival_date, transmission, chassis_no, plate_number, km, fuel, grade, cc, color, other, status, stock_status, location, purchase_amount, purchase_currency, purchase_fx_rate_to_base, purchase_date, sale_price, sale_currency, sale_fx_rate_to_base, is_sold, target_profit) VALUES
-- Stokta olan araçlar (1-20) - Eylül-Ekim 2025
(1, 1, 1, 'BMW', '3.20i', 2022, '2025-09-15', 'Otomatik', 'WBA12345678901234', NULL, 15000, 'Benzin', 'M Sport', 2000, 'Siyah', 'Full paket, panoramik tavan, deri döşeme', 'used', 'in_stock', 'Showroom A', 850000.00, 'TRY', 1.0000, '2025-09-10', 1050000.00, 'TRY', 1.0000, 0, 200000.00),
(1, 2, 1, 'Mercedes-Benz', 'C 200', 2021, '2025-10-10', 'Otomatik', 'WDD12345678901235', NULL, 25000, 'Benzin', 'AMG Line', 2000, 'Beyaz', 'AMG paketi, 360 kamera', 'used', 'in_stock', 'Showroom B', 25000.00, 'USD', 35.0000, '2025-10-05', 920000.00, 'TRY', 1.0000, 0, 200000.00),
(1, 3, 1, 'Audi', 'A4', 2023, '2025-11-05', 'Otomatik', 'WAU12345678901236', NULL, 8000, 'Benzin', 'S Line', 2000, 'Gri', 'Matrix LED, Bang & Olufsen ses sistemi', 'used', 'in_stock', 'Showroom A', 25000.00, 'EUR', 38.0000, '2025-11-01', 1180000.00, 'TRY', 1.0000, 0, 230000.00),
(1, 4, 1, 'Volkswagen', 'Golf', 2022, '2025-09-20', 'Manuel', 'WVW12345678901237', NULL, 18000, 'Benzin', 'Highline', 1500, 'Kırmızı', 'R-Line paketi', 'used', 'in_stock', 'Depo', 420000.00, 'TRY', 1.0000, '2025-09-15', 520000.00, 'TRY', 1.0000, 0, 100000.00),
(1, 5, 1, 'Ford', 'Focus', 2021, '2025-10-15', 'Otomatik', 'WF0X12345678901238', NULL, 32000, 'Benzin', 'Titanium', 1500, 'Mavi', NULL, 'used', 'in_stock', 'Depo', 380000.00, 'TRY', 1.0000, '2025-10-10', 470000.00, 'TRY', 1.0000, 0, 90000.00),
(1, 6, 2, 'Toyota', 'Corolla', 2022, '2025-11-10', 'Otomatik', 'JTDB12345678901239', NULL, 12000, 'Hibrit', 'XLE', 1800, 'Beyaz', 'Hibrit motor, güneş paneli', 'used', 'in_stock', 'Showroom', 550000.00, 'TRY', 1.0000, '2025-11-05', 680000.00, 'TRY', 1.0000, 0, 130000.00),
(1, 7, 2, 'Honda', 'Civic', 2021, '2025-09-25', 'Manuel', '19XFC12345678901240', NULL, 28000, 'Benzin', 'EX', 1600, 'Siyah', 'Spor paketi', 'used', 'in_stock', 'Depo', 450000.00, 'TRY', 1.0000, '2025-09-20', 560000.00, 'TRY', 1.0000, 0, 110000.00),
(1, 8, 1, 'Hyundai', 'Elantra', 2023, '2025-12-01', 'Otomatik', 'KMHD12345678901241', NULL, 5000, 'Benzin', 'Premium', 2000, 'Gümüş', 'Premium paket, güvenlik sistemleri', 'used', 'in_stock', 'Showroom A', 480000.00, 'TRY', 1.0000, '2025-11-28', 590000.00, 'TRY', 1.0000, 0, 110000.00),
(1, 9, 1, 'Renault', 'Megane', 2022, '2025-10-20', 'Otomatik', 'VF1R12345678901242', NULL, 22000, 'Dizel', 'GT Line', 1600, 'Beyaz', NULL, 'used', 'in_stock', 'Depo', 390000.00, 'TRY', 1.0000, '2025-10-15', 480000.00, 'TRY', 1.0000, 0, 90000.00),
(1, 10, 2, 'Peugeot', '308', 2021, '2025-09-10', 'Manuel', 'VF3A12345678901243', NULL, 35000, 'Dizel', 'Allure', 1600, 'Gri', NULL, 'used', 'in_stock', 'Depo', 360000.00, 'TRY', 1.0000, '2025-09-05', 450000.00, 'TRY', 1.0000, 0, 90000.00),
(1, 11, 1, 'BMW', '5.20d', 2021, '2025-11-20', 'Otomatik', 'WBA22345678901244', NULL, 30000, 'Dizel', 'M Sport', 2000, 'Siyah', 'Full paket, adaptive suspension', 'used', 'in_stock', 'Showroom B', 1100000.00, 'TRY', 1.0000, '2025-11-15', 1350000.00, 'TRY', 1.0000, 0, 250000.00),
(1, 12, 1, 'Mercedes-Benz', 'E 220d', 2020, '2025-10-25', 'Otomatik', 'WDD22345678901245', NULL, 45000, 'Dizel', 'AMG Line', 2200, 'Beyaz', 'AMG Line paketi', 'used', 'in_stock', 'Showroom A', 28000.00, 'USD', 35.0000, '2025-10-20', 1200000.00, 'TRY', 1.0000, 0, 220000.00),
(1, 13, 2, 'Audi', 'A6', 2022, '2025-12-05', 'Otomatik', 'WAU22345678901246', NULL, 18000, 'Dizel', 'S Line', 3000, 'Gri', 'S Line paketi, quattro', 'used', 'in_stock', 'Showroom', 1250000.00, 'TRY', 1.0000, '2025-12-01', 1500000.00, 'TRY', 1.0000, 0, 250000.00),
(1, 14, 1, 'Volkswagen', 'Passat', 2021, '2025-09-30', 'Otomatik', 'WVW22345678901247', NULL, 28000, 'Dizel', 'Highline', 2000, 'Siyah', NULL, 'used', 'in_stock', 'Depo', 680000.00, 'TRY', 1.0000, '2025-09-25', 850000.00, 'TRY', 1.0000, 0, 170000.00),
(1, 15, 1, 'Ford', 'Mondeo', 2020, '2025-10-28', 'Otomatik', 'WF0X22345678901248', NULL, 40000, 'Dizel', 'Titanium', 2000, 'Beyaz', NULL, 'used', 'in_stock', 'Depo', 550000.00, 'TRY', 1.0000, '2025-10-23', 690000.00, 'TRY', 1.0000, 0, 140000.00),
(1, 16, 3, 'Toyota', 'Camry', 2021, '2025-11-15', 'Otomatik', 'JTDB22345678901249', NULL, 32000, 'Hibrit', 'XLE', 2500, 'Gümüş', 'Hibrit motor', 'used', 'in_stock', 'Showroom', 720000.00, 'TRY', 1.0000, '2025-11-10', 900000.00, 'TRY', 1.0000, 0, 180000.00),
(1, 17, 1, 'Honda', 'Accord', 2022, '2025-12-10', 'Otomatik', '19XFC22345678901250', NULL, 15000, 'Benzin', 'EX', 2000, 'Siyah', 'Spor paketi', 'used', 'in_stock', 'Showroom A', 650000.00, 'TRY', 1.0000, '2025-12-05', 810000.00, 'TRY', 1.0000, 0, 160000.00),
(1, 18, 2, 'Hyundai', 'Sonata', 2021, '2025-10-12', 'Otomatik', 'KMHD22345678901251', NULL, 35000, 'Benzin', 'Premium', 2000, 'Beyaz', NULL, 'used', 'in_stock', 'Depo', 580000.00, 'TRY', 1.0000, '2025-10-07', 720000.00, 'TRY', 1.0000, 0, 140000.00),
(1, 19, 1, 'Renault', 'Talisman', 2020, '2025-09-18', 'Otomatik', 'VF1R22345678901252', NULL, 42000, 'Dizel', 'GT Line', 2000, 'Gri', NULL, 'used', 'in_stock', 'Depo', 620000.00, 'TRY', 1.0000, '2025-09-13', 780000.00, 'TRY', 1.0000, 0, 160000.00),
(1, 20, 3, 'Peugeot', '508', 2021, '2025-11-25', 'Otomatik', 'VF3A22345678901253', NULL, 30000, 'Dizel', 'Allure', 2000, 'Siyah', NULL, 'used', 'in_stock', 'Showroom', 590000.00, 'TRY', 1.0000, '2025-11-20', 740000.00, 'TRY', 1.0000, 0, 150000.00),

-- Satılmış araçlar (21-35) - Eylül-Aralık 2025
(1, 21, 1, 'BMW', '5.30d', 2020, '2025-09-15', 'Otomatik', 'WBA52345678901234', '34ABC123', 45000, 'Dizel', 'M Sport', 3000, 'Siyah', 'Full paket, adaptive cruise', 'used', 'sold', NULL, 1200000.00, 'TRY', 1.0000, '2025-09-10', 50000.00, 'USD', 35.0000, 1, 300000.00),
(1, 22, 1, 'Mercedes-Benz', 'E 200', 2021, '2025-10-01', 'Otomatik', 'WDD52345678901235', '34DEF456', 38000, 'Benzin', 'AMG Line', 2000, 'Beyaz', 'AMG Line paketi', 'used', 'sold', NULL, 1100000.00, 'TRY', 1.0000, '2025-09-26', 1350000.00, 'TRY', 1.0000, 1, 250000.00),
(1, 23, 1, 'Audi', 'A6', 2020, '2025-09-20', 'Otomatik', 'WAU52345678901236', '34GHI789', 52000, 'Dizel', 'S Line', 3000, 'Gri', 'quattro, matrix LED', 'used', 'sold', NULL, 38000.00, 'EUR', 38.0000, '2025-09-15', 1420000.00, 'TRY', 1.0000, 1, 270000.00),
(1, 24, 2, 'Volkswagen', 'Passat', 2021, '2025-10-10', 'Otomatik', 'WVW52345678901237', '06JKL012', 29000, 'Dizel', 'Highline', 2000, 'Siyah', NULL, 'used', 'sold', NULL, 680000.00, 'TRY', 1.0000, '2025-10-05', 850000.00, 'TRY', 1.0000, 1, 170000.00),
(1, 25, 1, 'Ford', 'Mondeo', 2020, '2025-09-25', 'Otomatik', 'WF0X52345678901238', '34MNO345', 41000, 'Dizel', 'Titanium', 2000, 'Beyaz', NULL, 'used', 'sold', NULL, 550000.00, 'TRY', 1.0000, '2025-09-20', 690000.00, 'TRY', 1.0000, 1, 140000.00),
(1, 26, 1, 'Toyota', 'Camry', 2021, '2025-10-15', 'Otomatik', 'JTDB52345678901239', '34PQR678', 33000, 'Hibrit', 'XLE', 2500, 'Gümüş', 'Hibrit motor', 'used', 'sold', NULL, 720000.00, 'TRY', 1.0000, '2025-10-10', 900000.00, 'TRY', 1.0000, 1, 180000.00),
(1, 27, 2, 'Honda', 'Accord', 2020, '2025-09-05', 'Otomatik', '19XFC52345678901240', '06STU901', 47000, 'Benzin', 'EX', 2000, 'Siyah', NULL, 'used', 'sold', NULL, 650000.00, 'TRY', 1.0000, '2025-09-01', 810000.00, 'TRY', 1.0000, 1, 160000.00),
(1, 28, 1, 'Hyundai', 'Sonata', 2021, '2025-10-20', 'Otomatik', 'KMHD52345678901241', '34VWX234', 36000, 'Benzin', 'Premium', 2000, 'Beyaz', NULL, 'used', 'sold', NULL, 580000.00, 'TRY', 1.0000, '2025-10-15', 720000.00, 'TRY', 1.0000, 1, 140000.00),
(1, 29, 1, 'Renault', 'Talisman', 2020, '2025-09-30', 'Otomatik', 'VF1R52345678901242', '34YZA567', 44000, 'Dizel', 'GT Line', 2000, 'Gri', NULL, 'used', 'sold', NULL, 620000.00, 'TRY', 1.0000, '2025-09-25', 780000.00, 'TRY', 1.0000, 1, 160000.00),
(1, 30, 2, 'Peugeot', '508', 2021, '2025-10-05', 'Otomatik', 'VF3A52345678901243', '06BCD890', 31000, 'Dizel', 'Allure', 2000, 'Siyah', NULL, 'used', 'sold', NULL, 590000.00, 'TRY', 1.0000, '2025-10-01', 740000.00, 'TRY', 1.0000, 1, 150000.00),
(1, 31, 1, 'BMW', 'X3', 2021, '2025-09-20', 'Otomatik', 'WBA62345678901244', '34EFG123', 38000, 'Benzin', 'xLine', 2000, 'Beyaz', 'SUV, xDrive', 'used', 'sold', NULL, 980000.00, 'TRY', 1.0000, '2025-09-15', 1200000.00, 'TRY', 1.0000, 1, 220000.00),
(1, 32, 1, 'Mercedes-Benz', 'GLC', 2020, '2025-10-28', 'Otomatik', 'WDD62345678901245', '34HIJ456', 45000, 'Dizel', 'AMG Line', 2200, 'Siyah', 'SUV, 4MATIC', 'used', 'sold', NULL, 1100000.00, 'TRY', 1.0000, '2025-10-23', 1350000.00, 'TRY', 1.0000, 1, 250000.00),
(1, 33, 2, 'Audi', 'Q5', 2021, '2025-11-05', 'Otomatik', 'WAU62345678901246', '06KLM789', 35000, 'Benzin', 'S Line', 2000, 'Gri', 'SUV, quattro', 'used', 'sold', NULL, 1050000.00, 'TRY', 1.0000, '2025-11-01', 1280000.00, 'TRY', 1.0000, 1, 230000.00),
(1, 34, 1, 'Volkswagen', 'Tiguan', 2020, '2025-09-30', 'Otomatik', 'WVW62345678901247', '34NOP012', 42000, 'Dizel', 'Highline', 2000, 'Beyaz', 'SUV, 4Motion', 'used', 'sold', NULL, 750000.00, 'TRY', 1.0000, '2025-09-25', 920000.00, 'TRY', 1.0000, 1, 170000.00),
(1, 35, 1, 'Ford', 'Kuga', 2021, '2025-11-12', 'Otomatik', 'WF0X62345678901248', '34QRS345', 33000, 'Benzin', 'Titanium', 1500, 'Mavi', 'SUV', 'used', 'sold', NULL, 680000.00, 'TRY', 1.0000, '2025-11-07', 840000.00, 'TRY', 1.0000, 1, 160000.00),

-- Rezerve edilmiş araçlar (36-40) - Kasım-Aralık 2025
(1, 36, 1, 'BMW', 'X3', 2022, '2025-10-25', 'Otomatik', 'WBA72345678901234', NULL, 18000, 'Benzin', 'xLine', 2000, 'Beyaz', 'SUV, xDrive', 'used', 'reserved', 'Showroom B', 980000.00, 'TRY', 1.0000, '2025-10-20', 1200000.00, 'TRY', 1.0000, 0, 220000.00),
(1, 37, 1, 'Mercedes-Benz', 'GLC', 2021, '2025-11-15', 'Otomatik', 'WDD72345678901235', NULL, 28000, 'Dizel', 'AMG Line', 2200, 'Siyah', 'SUV, 4MATIC', 'used', 'reserved', 'Showroom A', 1100000.00, 'TRY', 1.0000, '2025-11-10', 1350000.00, 'TRY', 1.0000, 0, 250000.00),
(1, 38, 2, 'Audi', 'Q5', 2022, '2025-11-20', 'Otomatik', 'WAU72345678901236', NULL, 15000, 'Benzin', 'S Line', 2000, 'Gri', 'SUV, quattro', 'used', 'reserved', 'Showroom', 1050000.00, 'TRY', 1.0000, '2025-11-15', 1280000.00, 'TRY', 1.0000, 0, 230000.00),
(1, 39, 1, 'Volkswagen', 'Tiguan', 2021, '2025-10-10', 'Otomatik', 'WVW72345678901237', NULL, 32000, 'Dizel', 'Highline', 2000, 'Beyaz', 'SUV, 4Motion', 'used', 'reserved', 'Depo', 750000.00, 'TRY', 1.0000, '2025-10-05', 920000.00, 'TRY', 1.0000, 0, 170000.00),
(1, 40, 1, 'Ford', 'Kuga', 2022, '2025-11-25', 'Otomatik', 'WF0X72345678901238', NULL, 12000, 'Benzin', 'Titanium', 1500, 'Mavi', 'SUV', 'used', 'reserved', 'Showroom B', 680000.00, 'TRY', 1.0000, '2025-11-20', 840000.00, 'TRY', 1.0000, 0, 160000.00)
ON DUPLICATE KEY UPDATE maker=maker;

-- 5. Vehicle Costs (Araç Maliyetleri) - Multi-currency desteği ile
INSERT INTO vehicle_costs (tenant_id, vehicle_id, cost_name, amount, currency, fx_rate_to_base, cost_date, category) VALUES
-- İlk araç için maliyetler (TRY)
(1, 1, 'Alım Fiyatı', 850000.00, 'TRY', 1.0000, '2025-09-10', 'purchase'),
(1, 1, 'Nakliye', 15000.00, 'TRY', 1.0000, '2025-09-11', 'shipping'),
(1, 1, 'Temizlik ve Hazırlık', 5000.00, 'TRY', 1.0000, '2025-09-12', 'other'),
(1, 1, 'Sigorta', 12000.00, 'TRY', 1.0000, '2025-09-13', 'insurance'),
(1, 1, 'Muayene', 800.00, 'TRY', 1.0000, '2025-09-14', 'other'),
-- İkinci araç için maliyetler (USD bazlı alım, TRY maliyetler)
(1, 2, 'Alım Fiyatı', 25000.00, 'USD', 35.0000, '2025-10-05', 'purchase'),
(1, 2, 'Nakliye', 12000.00, 'TRY', 1.0000, '2025-10-06', 'shipping'),
(1, 2, 'Onarım', 25000.00, 'TRY', 1.0000, '2025-10-07', 'repair'),
(1, 2, 'Temizlik', 4000.00, 'TRY', 1.0000, '2025-10-08', 'other'),
(1, 2, 'Sigorta', 10000.00, 'TRY', 1.0000, '2025-10-09', 'insurance'),
-- Üçüncü araç için maliyetler (EUR bazlı alım)
(1, 3, 'Alım Fiyatı', 25000.00, 'EUR', 38.0000, '2025-11-01', 'purchase'),
(1, 3, 'Nakliye', 18000.00, 'TRY', 1.0000, '2025-11-02', 'shipping'),
(1, 3, 'Sigorta', 15000.00, 'TRY', 1.0000, '2025-11-03', 'insurance'),
(1, 3, 'Temizlik ve Detay', 6000.00, 'TRY', 1.0000, '2025-11-04', 'other'),
-- Dördüncü araç için maliyetler
(1, 4, 'Alım Fiyatı', 420000.00, 'TRY', 1.0000, '2025-09-15', 'purchase'),
(1, 4, 'Nakliye', 8000.00, 'TRY', 1.0000, '2025-09-16', 'shipping'),
(1, 4, 'Temizlik', 3000.00, 'TRY', 1.0000, '2025-09-17', 'other'),
-- Beşinci araç için maliyetler
(1, 5, 'Alım Fiyatı', 380000.00, 'TRY', 1.0000, '2025-10-10', 'purchase'),
(1, 5, 'Nakliye', 7000.00, 'TRY', 1.0000, '2025-10-11', 'shipping'),
(1, 5, 'Onarım', 12000.00, 'TRY', 1.0000, '2025-10-12', 'repair'),
-- Satılmış araçlar için maliyetler (21-35)
(1, 21, 'Alım Fiyatı', 1200000.00, 'TRY', 1.0000, '2025-09-10', 'purchase'),
(1, 21, 'Nakliye', 20000.00, 'TRY', 1.0000, '2025-09-11', 'shipping'),
(1, 21, 'Onarım', 35000.00, 'TRY', 1.0000, '2025-09-12', 'repair'),
(1, 21, 'Sigorta', 18000.00, 'TRY', 1.0000, '2025-09-13', 'insurance'),
(1, 21, 'Temizlik ve Detay', 8000.00, 'TRY', 1.0000, '2025-09-14', 'other'),
(1, 22, 'Alım Fiyatı', 1100000.00, 'TRY', 1.0000, '2025-09-26', 'purchase'),
(1, 22, 'Nakliye', 15000.00, 'TRY', 1.0000, '2025-09-27', 'shipping'),
(1, 22, 'Temizlik', 6000.00, 'TRY', 1.0000, '2025-09-28', 'other'),
(1, 22, 'Sigorta', 16000.00, 'TRY', 1.0000, '2025-09-29', 'insurance'),
(1, 23, 'Alım Fiyatı', 38000.00, 'EUR', 38.0000, '2025-09-15', 'purchase'),
(1, 23, 'Nakliye', 18000.00, 'TRY', 1.0000, '2025-09-16', 'shipping'),
(1, 23, 'Onarım', 28000.00, 'TRY', 1.0000, '2025-09-17', 'repair'),
(1, 23, 'Sigorta', 16000.00, 'TRY', 1.0000, '2025-09-18', 'insurance'),
(1, 24, 'Alım Fiyatı', 680000.00, 'TRY', 1.0000, '2025-10-05', 'purchase'),
(1, 24, 'Nakliye', 10000.00, 'TRY', 1.0000, '2025-10-06', 'shipping'),
(1, 24, 'Temizlik', 5000.00, 'TRY', 1.0000, '2025-10-07', 'other'),
(1, 25, 'Alım Fiyatı', 550000.00, 'TRY', 1.0000, '2025-09-20', 'purchase'),
(1, 25, 'Nakliye', 8000.00, 'TRY', 1.0000, '2025-09-21', 'shipping'),
(1, 25, 'Onarım', 15000.00, 'TRY', 1.0000, '2025-09-22', 'repair'),
(1, 26, 'Alım Fiyatı', 720000.00, 'TRY', 1.0000, '2025-10-10', 'purchase'),
(1, 26, 'Nakliye', 12000.00, 'TRY', 1.0000, '2025-10-11', 'shipping'),
(1, 26, 'Temizlik', 5000.00, 'TRY', 1.0000, '2025-10-12', 'other'),
(1, 27, 'Alım Fiyatı', 650000.00, 'TRY', 1.0000, '2025-09-01', 'purchase'),
(1, 27, 'Nakliye', 11000.00, 'TRY', 1.0000, '2025-09-02', 'shipping'),
(1, 28, 'Alım Fiyatı', 580000.00, 'TRY', 1.0000, '2025-10-15', 'purchase'),
(1, 28, 'Nakliye', 10000.00, 'TRY', 1.0000, '2025-10-16', 'shipping'),
(1, 29, 'Alım Fiyatı', 620000.00, 'TRY', 1.0000, '2025-09-25', 'purchase'),
(1, 29, 'Nakliye', 12000.00, 'TRY', 1.0000, '2025-09-26', 'shipping'),
(1, 30, 'Alım Fiyatı', 590000.00, 'TRY', 1.0000, '2025-10-01', 'purchase'),
(1, 30, 'Nakliye', 10000.00, 'TRY', 1.0000, '2025-10-02', 'shipping'),
(1, 31, 'Alım Fiyatı', 980000.00, 'TRY', 1.0000, '2025-09-15', 'purchase'),
(1, 31, 'Nakliye', 18000.00, 'TRY', 1.0000, '2025-09-16', 'shipping'),
(1, 31, 'Onarım', 22000.00, 'TRY', 1.0000, '2025-09-17', 'repair'),
(1, 32, 'Alım Fiyatı', 1100000.00, 'TRY', 1.0000, '2025-10-23', 'purchase'),
(1, 32, 'Nakliye', 20000.00, 'TRY', 1.0000, '2025-10-24', 'shipping'),
(1, 33, 'Alım Fiyatı', 1050000.00, 'TRY', 1.0000, '2025-11-01', 'purchase'),
(1, 33, 'Nakliye', 19000.00, 'TRY', 1.0000, '2025-11-02', 'shipping'),
(1, 34, 'Alım Fiyatı', 750000.00, 'TRY', 1.0000, '2025-09-25', 'purchase'),
(1, 34, 'Nakliye', 14000.00, 'TRY', 1.0000, '2025-09-26', 'shipping'),
(1, 35, 'Alım Fiyatı', 680000.00, 'TRY', 1.0000, '2025-11-07', 'purchase'),
(1, 35, 'Nakliye', 13000.00, 'TRY', 1.0000, '2025-11-08', 'shipping'),
-- Rezerve araçlar için maliyetler
(1, 36, 'Alım Fiyatı', 980000.00, 'TRY', 1.0000, '2025-10-20', 'purchase'),
(1, 36, 'Nakliye', 18000.00, 'TRY', 1.0000, '2025-10-21', 'shipping'),
(1, 36, 'Temizlik', 6000.00, 'TRY', 1.0000, '2025-10-22', 'other'),
(1, 37, 'Alım Fiyatı', 1100000.00, 'TRY', 1.0000, '2025-11-10', 'purchase'),
(1, 37, 'Nakliye', 20000.00, 'TRY', 1.0000, '2025-11-11', 'shipping'),
(1, 38, 'Alım Fiyatı', 1050000.00, 'TRY', 1.0000, '2025-11-15', 'purchase'),
(1, 38, 'Nakliye', 19000.00, 'TRY', 1.0000, '2025-11-16', 'shipping'),
(1, 39, 'Alım Fiyatı', 750000.00, 'TRY', 1.0000, '2025-10-05', 'purchase'),
(1, 39, 'Nakliye', 14000.00, 'TRY', 1.0000, '2025-10-06', 'shipping'),
(1, 40, 'Alım Fiyatı', 680000.00, 'TRY', 1.0000, '2025-11-20', 'purchase'),
(1, 40, 'Nakliye', 13000.00, 'TRY', 1.0000, '2025-11-21', 'shipping')
ON DUPLICATE KEY UPDATE cost_name=cost_name;

-- 6. Vehicle Sales (Satış Kayıtları) - 15 satış, multi-currency
INSERT INTO vehicle_sales (tenant_id, vehicle_id, branch_id, staff_id, customer_name, customer_phone, customer_address, plate_number, key_count, sale_amount, sale_currency, sale_fx_rate_to_base, sale_date) VALUES
(1, 21, 1, 2, 'Mustafa Özkan', '0533 111 22 33', 'Kadıköy, İstanbul', '34ABC123', 2, 50000.00, 'USD', 35.0000, '2025-09-20'),
(1, 22, 1, 3, 'Zeynep Arslan', '0533 222 33 44', 'Beşiktaş, İstanbul', '34DEF456', 2, 1350000.00, 'TRY', 1.0000, '2025-10-05'),
(1, 23, 1, 2, 'Burak Yıldız', '0533 333 44 55', 'Çankaya, Ankara', '34GHI789', 2, 1420000.00, 'TRY', 1.0000, '2025-09-25'),
(1, 24, 2, 6, 'Selin Aydın', '0533 444 55 66', 'Nilüfer, Bursa', '06JKL012', 2, 850000.00, 'TRY', 1.0000, '2025-10-15'),
(1, 25, 1, 2, 'Can Doğan', '0533 555 66 77', 'Konak, İzmir', '34MNO345', 2, 690000.00, 'TRY', 1.0000, '2025-09-30'),
(1, 26, 1, 3, 'Elif Kılıç', '0533 666 77 88', 'Muratpaşa, Antalya', '34PQR678', 2, 900000.00, 'TRY', 1.0000, '2025-10-20'),
(1, 27, 2, 7, 'Emre Şen', '0533 777 88 99', 'Seyhan, Adana', '06STU901', 2, 810000.00, 'TRY', 1.0000, '2025-09-10'),
(1, 28, 1, 2, 'Deniz Yücel', '0533 888 99 00', 'Şahinbey, Gaziantep', '34VWX234', 2, 720000.00, 'TRY', 1.0000, '2025-10-25'),
(1, 29, 1, 3, 'Gizem Öztürk', '0534 111 22 33', 'İzmit, Kocaeli', '34YZA567', 2, 780000.00, 'TRY', 1.0000, '2025-10-05'),
(1, 30, 2, 6, 'Kerem Avcı', '0534 222 33 44', 'Ortahisar, Trabzon', '06BCD890', 2, 740000.00, 'TRY', 1.0000, '2025-10-10'),
(1, 31, 1, 2, 'Sude Karaca', '0534 333 44 55', 'Tepebaşı, Eskişehir', '34EFG123', 2, 1200000.00, 'TRY', 1.0000, '2025-09-25'),
(1, 32, 1, 3, 'Berk Yavuz', '0534 444 55 66', 'Adapazarı, Sakarya', '34HIJ456', 2, 1350000.00, 'TRY', 1.0000, '2025-11-05'),
(1, 33, 2, 7, 'Merve Çınar', '0534 555 66 77', 'Karesi, Balıkesir', '06KLM789', 2, 1280000.00, 'TRY', 1.0000, '2025-11-10'),
(1, 34, 1, 2, 'Onur Tekin', '0534 666 77 88', 'Şehzadeler, Manisa', '34NOP012', 2, 920000.00, 'TRY', 1.0000, '2025-10-05'),
(1, 35, 1, 3, 'Ceren Ateş', '0534 777 88 99', 'Bodrum, Muğla', '34QRS345', 2, 840000.00, 'TRY', 1.0000, '2025-11-15')
ON DUPLICATE KEY UPDATE sale_amount=sale_amount;

-- 7. Installment Sales (Taksitli Satışlar) - 8 taksitli satış
INSERT INTO vehicle_installment_sales (tenant_id, vehicle_id, sale_id, total_amount, down_payment, installment_count, installment_amount, currency, fx_rate_to_base, sale_date, status) VALUES
(1, 21, 1, 1750000.00, 500000.00, 10, 125000.00, 'TRY', 1.0000, '2025-09-20', 'active'),
(1, 23, 3, 1420000.00, 420000.00, 12, 83333.33, 'TRY', 1.0000, '2025-09-25', 'active'),
(1, 26, 6, 900000.00, 300000.00, 8, 75000.00, 'TRY', 1.0000, '2025-10-20', 'active'),
(1, 28, 8, 720000.00, 220000.00, 10, 50000.00, 'TRY', 1.0000, '2025-10-25', 'active'),
(1, 29, 9, 780000.00, 280000.00, 10, 50000.00, 'TRY', 1.0000, '2025-10-05', 'active'),
(1, 31, 11, 1200000.00, 400000.00, 10, 80000.00, 'TRY', 1.0000, '2025-09-25', 'active'),
(1, 32, 12, 1350000.00, 450000.00, 12, 75000.00, 'TRY', 1.0000, '2025-11-05', 'active'),
(1, 33, 13, 1280000.00, 380000.00, 12, 75000.00, 'TRY', 1.0000, '2025-11-10', 'active')
ON DUPLICATE KEY UPDATE total_amount=total_amount;

-- 8. Installment Payments (Taksit Ödemeleri) - Gerçekçi ödeme geçmişi
INSERT INTO vehicle_installment_payments (tenant_id, installment_sale_id, payment_type, installment_number, amount, currency, fx_rate_to_base, payment_date, notes) VALUES
-- İlk taksitli satış için ödemeler (BMW 5.30d - 10 taksit, 3 ödeme yapılmış)
(1, 1, 'down_payment', NULL, 500000.00, 'TRY', 1.0000, '2025-09-20', 'Peşin ödeme'),
(1, 1, 'installment', 1, 125000.00, 'TRY', 1.0000, '2025-10-20', '1. Taksit'),
(1, 1, 'installment', 2, 125000.00, 'TRY', 1.0000, '2025-11-20', '2. Taksit'),
(1, 1, 'installment', 3, 125000.00, 'TRY', 1.0000, '2025-12-20', '3. Taksit'),
-- İkinci taksitli satış için ödemeler (Audi A6 - 12 taksit, 2 ödeme yapılmış)
(1, 2, 'down_payment', NULL, 420000.00, 'TRY', 1.0000, '2025-09-25', 'Peşin ödeme'),
(1, 2, 'installment', 1, 83333.33, 'TRY', 1.0000, '2025-10-25', '1. Taksit'),
(1, 2, 'installment', 2, 83333.33, 'TRY', 1.0000, '2025-11-25', '2. Taksit'),
-- Üçüncü taksitli satış için ödemeler (Toyota Camry - 8 taksit, 1 ödeme yapılmış)
(1, 3, 'down_payment', NULL, 300000.00, 'TRY', 1.0000, '2025-10-20', 'Peşin ödeme'),
(1, 3, 'installment', 1, 75000.00, 'TRY', 1.0000, '2025-11-20', '1. Taksit'),
-- Dördüncü taksitli satış için ödemeler (Hyundai Sonata - 10 taksit, 1 ödeme yapılmış)
(1, 4, 'down_payment', NULL, 220000.00, 'TRY', 1.0000, '2025-10-25', 'Peşin ödeme'),
(1, 4, 'installment', 1, 50000.00, 'TRY', 1.0000, '2025-11-25', '1. Taksit'),
-- Beşinci taksitli satış için ödemeler (Renault Talisman - 10 taksit, sadece peşinat)
(1, 5, 'down_payment', NULL, 280000.00, 'TRY', 1.0000, '2025-10-05', 'Peşin ödeme'),
-- Altıncı taksitli satış için ödemeler (BMW X3 - 10 taksit, 2 ödeme yapılmış)
(1, 6, 'down_payment', NULL, 400000.00, 'TRY', 1.0000, '2025-09-25', 'Peşin ödeme'),
(1, 6, 'installment', 1, 80000.00, 'TRY', 1.0000, '2025-10-25', '1. Taksit'),
(1, 6, 'installment', 2, 80000.00, 'TRY', 1.0000, '2025-11-25', '2. Taksit'),
-- Yedinci taksitli satış için ödemeler (Mercedes GLC - 12 taksit, 1 ödeme yapılmış)
(1, 7, 'down_payment', NULL, 450000.00, 'TRY', 1.0000, '2025-11-05', 'Peşin ödeme'),
(1, 7, 'installment', 1, 75000.00, 'TRY', 1.0000, '2025-12-05', '1. Taksit'),
-- Sekizinci taksitli satış için ödemeler (Audi Q5 - 12 taksit, sadece peşinat)
(1, 8, 'down_payment', NULL, 380000.00, 'TRY', 1.0000, '2025-11-10', 'Peşin ödeme')
ON DUPLICATE KEY UPDATE amount=amount;

-- 9. Inventory Products (Envanter Ürünleri) - Multi-currency desteği ile
-- cost_price ve cost_currency her zaman Base Currency (TRY) olmalı (ortalama hesaplama sonucu)
INSERT INTO inventory_products (tenant_id, sku, name, category, unit, current_stock, min_stock, cost_price, cost_currency, cost_fx_rate_to_base, sale_price, sale_currency, sale_fx_rate_to_base, sales_count, is_for_sale, is_for_service, track_stock) VALUES
(1, 'OIL-5W30-1L', 'Motor Yağı 5W30 1L', 'Yedek Parça', 'adet', 45, 10, 250.00, 'TRY', 1.0000, 350.00, 'TRY', 1.0000, 12, 1, 1, 1),
(1, 'FILTER-OIL', 'Yağ Filtresi', 'Yedek Parça', 'adet', 28, 5, 180.00, 'TRY', 1.0000, 280.00, 'TRY', 1.0000, 8, 1, 1, 1),
(1, 'FILTER-AIR', 'Hava Filtresi', 'Yedek Parça', 'adet', 35, 8, 120.00, 'TRY', 1.0000, 200.00, 'TRY', 1.0000, 15, 1, 1, 1),
(1, 'BRAKE-PAD-FRONT', 'Ön Fren Balata', 'Yedek Parça', 'adet', 22, 5, 450.00, 'TRY', 1.0000, 650.00, 'TRY', 1.0000, 6, 1, 1, 1),
(1, 'BRAKE-PAD-REAR', 'Arka Fren Balata', 'Yedek Parça', 'adet', 18, 5, 380.00, 'TRY', 1.0000, 550.00, 'TRY', 1.0000, 4, 1, 1, 1),
(1, 'BATTERY-12V', 'Akü 12V', 'Yedek Parça', 'adet', 12, 3, 1200.00, 'TRY', 1.0000, 1800.00, 'TRY', 1.0000, 3, 1, 1, 1),
(1, 'TIRE-205-55-R16', 'Lastik 205/55 R16', 'Yedek Parça', 'adet', 32, 8, 800.00, 'TRY', 1.0000, 1200.00, 'TRY', 1.0000, 10, 1, 1, 1),
(1, 'WIPER-FRONT', 'Ön Silecek', 'Yedek Parça', 'adet', 48, 10, 150.00, 'TRY', 1.0000, 250.00, 'TRY', 1.0000, 20, 1, 1, 1),
(1, 'WIPER-REAR', 'Arka Silecek', 'Yedek Parça', 'adet', 42, 10, 100.00, 'TRY', 1.0000, 180.00, 'TRY', 1.0000, 18, 1, 1, 1),
(1, 'SHAMPOO-CAR', 'Araba Şampuanı', 'Temizlik', 'adet', 25, 5, 45.00, 'TRY', 1.0000, 75.00, 'TRY', 1.0000, 30, 1, 1, 1),
(1, 'WAX-POLISH', 'Cila', 'Temizlik', 'adet', 15, 3, 120.00, 'TRY', 1.0000, 200.00, 'TRY', 1.0000, 12, 1, 1, 1),
(1, 'MICROFIBER-TOWEL', 'Mikrofiber Havlu', 'Temizlik', 'adet', 60, 15, 25.00, 'TRY', 1.0000, 45.00, 'TRY', 1.0000, 40, 1, 1, 1),
(1, 'FLOOR-MAT-FRONT', 'Ön Paspas', 'Aksesuar', 'takım', 20, 5, 200.00, 'TRY', 1.0000, 350.00, 'TRY', 1.0000, 8, 1, 0, 1),
(1, 'FLOOR-MAT-REAR', 'Arka Paspas', 'Aksesuar', 'takım', 18, 5, 150.00, 'TRY', 1.0000, 280.00, 'TRY', 1.0000, 6, 1, 0, 1),
(1, 'SUNSHADE', 'Güneşlik', 'Aksesuar', 'adet', 30, 8, 80.00, 'TRY', 1.0000, 150.00, 'TRY', 1.0000, 15, 1, 0, 1)
ON DUPLICATE KEY UPDATE name=name;

-- 10. Inventory Movements (Stok Hareketleri) - Multi-currency desteği ile
-- Bazı girişler farklı para birimleriyle yapılmış, ortalama hesaplama sonucu Base Currency'de
INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, cost_price, cost_currency, cost_amount_base, sale_price, sale_currency, sale_fx_rate_to_base, sale_amount_base, customer_id, staff_id, note, movement_date) VALUES
-- Motor Yağı girişleri (farklı para birimleriyle)
(1, 1, 'in', 20, 250.00, 'TRY', 250.00, NULL, NULL, NULL, NULL, NULL, NULL, 'İlk stok girişi', '2025-09-15 10:00:00'),
(1, 1, 'in', 15, 7.14, 'USD', 250.00, NULL, NULL, NULL, NULL, NULL, NULL, 'USD ile alım', '2025-10-10 14:30:00'),
(1, 1, 'in', 10, 6.58, 'EUR', 250.00, NULL, NULL, NULL, NULL, NULL, NULL, 'EUR ile alım', '2025-11-05 09:15:00'),
-- Yağ Filtresi satışları
(1, 2, 'sale', 3, 180.00, 'TRY', 180.00, 280.00, 'TRY', 1.0000, 280.00, 1, 2, 'Müşteri satışı', '2025-10-20 11:00:00'),
(1, 2, 'sale', 2, 180.00, 'TRY', 180.00, 280.00, 'TRY', 1.0000, 280.00, 2, 3, 'Müşteri satışı', '2025-11-15 15:30:00'),
(1, 2, 'service_usage', 3, 180.00, 'TRY', 180.00, 280.00, 'TRY', 1.0000, 280.00, NULL, 2, 'Servis kullanımı', '2025-11-20 10:00:00'),
-- Hava Filtresi satışları
(1, 3, 'sale', 5, 120.00, 'TRY', 120.00, 200.00, 'TRY', 1.0000, 200.00, 3, 2, 'Müşteri satışı', '2025-09-25 13:00:00'),
(1, 3, 'sale', 4, 120.00, 'TRY', 120.00, 200.00, 'TRY', 1.0000, 200.00, 4, 3, 'Müşteri satışı', '2025-10-15 16:00:00'),
(1, 3, 'service_usage', 6, 120.00, 'TRY', 120.00, 200.00, 'TRY', 1.0000, 200.00, NULL, 2, 'Servis kullanımı', '2025-11-10 09:30:00'),
-- Fren Balata satışları (EUR ile satış)
(1, 4, 'sale', 2, 450.00, 'TRY', 450.00, 17.11, 'EUR', 38.0000, 650.00, 5, 2, 'EUR ile satış', '2025-10-05 14:00:00'),
(1, 4, 'sale', 1, 450.00, 'TRY', 450.00, 650.00, 'TRY', 1.0000, 650.00, 6, 3, 'TRY ile satış', '2025-11-18 11:30:00'),
(1, 4, 'service_usage', 3, 450.00, 'TRY', 450.00, 650.00, 'TRY', 1.0000, 650.00, NULL, 2, 'Servis kullanımı', '2025-12-01 10:00:00'),
-- Akü satışları (USD ile satış)
(1, 6, 'sale', 1, 1200.00, 'TRY', 1200.00, 51.43, 'USD', 35.0000, 1800.00, 7, 2, 'USD ile satış', '2025-09-30 15:00:00'),
(1, 6, 'sale', 1, 1200.00, 'TRY', 1200.00, 1800.00, 'TRY', 1.0000, 1800.00, 8, 3, 'TRY ile satış', '2025-11-12 13:00:00'),
(1, 6, 'service_usage', 1, 1200.00, 'TRY', 1200.00, 1800.00, 'TRY', 1.0000, 1800.00, NULL, 2, 'Servis kullanımı', '2025-12-05 09:00:00')
ON DUPLICATE KEY UPDATE note=note;

-- 11. Income (Gelirler) - Multi-currency desteği ile
-- vehicle_sales'den gelen gelirler vehicle_sales tablosunda, burada manuel gelirler
INSERT INTO income (tenant_id, branch_id, vehicle_id, customer_id, description, category, amount, currency, fx_rate_to_base, amount_base, income_date) VALUES
(1, 1, NULL, NULL, 'Yedek Parça Satışı', 'parts_sale', 15000.00, 'TRY', 1.0000, 15000.00, '2025-10-01'),
(1, 1, NULL, NULL, 'Servis Geliri', 'service', 8500.00, 'TRY', 1.0000, 8500.00, '2025-10-05'),
(1, 2, NULL, NULL, 'Aksesuar Satışı', 'accessories', 3200.00, 'TRY', 1.0000, 3200.00, '2025-10-10'),
(1, 1, NULL, NULL, 'Yedek Parça Satışı (USD)', 'parts_sale', 500.00, 'USD', 35.0000, 17500.00, '2025-11-01'),
(1, 1, NULL, NULL, 'Servis Geliri (EUR)', 'service', 200.00, 'EUR', 38.0000, 7600.00, '2025-11-15')
ON DUPLICATE KEY UPDATE description=description;

-- 12. Expenses (Giderler) - Multi-currency desteği ile
INSERT INTO expenses (tenant_id, branch_id, vehicle_id, description, category, amount, currency, fx_rate_to_base, amount_base, expense_date) VALUES
(1, 1, NULL, 'Kira Ödemesi', 'rent', 50000.00, 'TRY', 1.0000, 50000.00, '2025-12-01'),
(1, 2, NULL, 'Kira Ödemesi', 'rent', 35000.00, 'TRY', 1.0000, 35000.00, '2025-12-01'),
(1, 3, NULL, 'Kira Ödemesi', 'rent', 30000.00, 'TRY', 1.0000, 30000.00, '2025-12-01'),
(1, 1, NULL, 'Elektrik Faturası', 'utilities', 8500.00, 'TRY', 1.0000, 8500.00, '2025-12-05'),
(1, 1, NULL, 'Su Faturası', 'utilities', 1200.00, 'TRY', 1.0000, 1200.00, '2025-12-05'),
(1, 1, NULL, 'Personel Maaşları', 'salary', 120000.00, 'TRY', 1.0000, 120000.00, '2025-12-01'),
(1, 2, NULL, 'Personel Maaşları', 'salary', 80000.00, 'TRY', 1.0000, 80000.00, '2025-12-01'),
(1, 3, NULL, 'Personel Maaşları', 'salary', 60000.00, 'TRY', 1.0000, 60000.00, '2025-12-01'),
(1, 1, NULL, 'Pazarlama Giderleri', 'marketing', 15000.00, 'TRY', 1.0000, 15000.00, '2025-11-10'),
(1, 1, NULL, 'Benzin Gideri', 'fuel', 8500.00, 'TRY', 1.0000, 8500.00, '2025-11-15'),
(1, 1, NULL, 'Yurtdışı Alım (USD)', 'purchase', 2000.00, 'USD', 35.0000, 70000.00, '2025-10-20'),
(1, 1, 1, 'Araç Nakliye', 'shipping', 15000.00, 'TRY', 1.0000, 15000.00, '2025-09-11'),
(1, 1, 2, 'Araç Onarım', 'repair', 25000.00, 'TRY', 1.0000, 25000.00, '2025-10-07')
ON DUPLICATE KEY UPDATE description=description;

-- 13. Post Sale Followups (Satış Sonrası Takip)
INSERT INTO post_sale_followups (tenant_id, sale_id, customer_id, vehicle_id, followup_type, followup_date, followup_time, status, notes, satisfaction_score, created_by) VALUES
(1, 1, 1, 21, 'call', '2025-09-25', '14:00:00', 'completed', 'Müşteri memnun, herhangi bir sorun yok', 5, 2),
(1, 1, 1, 21, 'call', '2025-10-25', '15:30:00', 'completed', 'Rutin kontrol, memnuniyet yüksek', 5, 2),
(1, 2, 2, 22, 'call', '2025-10-10', '10:00:00', 'completed', 'İlk takip, müşteri memnun', 4, 3),
(1, 3, 3, 23, 'sms', '2025-09-30', NULL, 'completed', 'SMS gönderildi, teşekkür mesajı alındı', NULL, 2),
(1, 3, 3, 23, 'call', '2025-10-30', '16:00:00', 'pending', 'Taksit ödemesi hatırlatması', NULL, 2),
(1, 4, 4, 24, 'call', '2025-10-20', '11:00:00', 'completed', 'Müşteri memnun', 4, 6),
(1, 5, 5, 25, 'email', '2025-10-05', NULL, 'completed', 'E-posta gönderildi', NULL, 2),
(1, 6, 6, 26, 'call', '2025-10-25', '14:00:00', 'completed', 'İlk takip yapıldı', 5, 3),
(1, 7, 7, 27, 'call', '2025-09-15', '10:30:00', 'pending', 'Takip yapılacak', NULL, 7),
(1, 8, 8, 28, 'sms', '2025-10-30', NULL, 'completed', 'SMS gönderildi', NULL, 2),
(1, 11, 11, 31, 'call', '2025-09-30', '13:00:00', 'completed', 'Müşteri çok memnun', 5, 2),
(1, 12, 12, 32, 'call', '2025-11-10', '15:00:00', 'completed', 'Rutin takip', 4, 3),
(1, 13, 13, 33, 'call', '2025-11-15', '11:30:00', 'completed', 'Müşteri memnun', 5, 7)
ON DUPLICATE KEY UPDATE notes=notes;

-- Seed data tamamlandı!
SELECT 'Seed data başarıyla yüklendi! 40 araç, 25 müşteri, 15 satış, multi-currency desteği ile kaydedildi. (2025 Aralık 11 güncel)' as message;
