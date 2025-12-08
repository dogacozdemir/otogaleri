-- Seed Data: Test verileri için örnek data
-- Bu dosya uygulamanın test edilmesi için gerçekçi veriler içerir
-- Kullanım: mysql -u otogaleri_user -p otogaleri < migrations/seed_data.sql

USE otogaleri;

-- Mevcut verileri temizle (opsiyonel - dikkatli kullanın!)
-- TRUNCATE TABLE vehicle_installment_payments;
-- TRUNCATE TABLE vehicle_installment_sales;
-- TRUNCATE TABLE vehicle_sales;
-- TRUNCATE TABLE vehicle_costs;
-- TRUNCATE TABLE vehicles;
-- TRUNCATE TABLE customers;
-- TRUNCATE TABLE staff;
-- TRUNCATE TABLE branches;

-- Tenant ID = 1 olduğunu varsayıyoruz (zaten kayıt olduysanız)

-- 1. Branches (Şubeler)
INSERT INTO branches (tenant_id, name, code, city, country, address, phone, tax_office, tax_number) VALUES
(1, 'Merkez Şube', 'MERKEZ', 'İstanbul', 'Türkiye', 'Maslak Mahallesi, Büyükdere Cad. No:123', '0212 123 45 67', 'Maslak Vergi Dairesi', '1234567890'),
(1, 'Ankara Şubesi', 'ANK', 'Ankara', 'Türkiye', 'Çankaya Mahallesi, Atatürk Bulvarı No:456', '0312 987 65 43', 'Çankaya Vergi Dairesi', '0987654321')
ON DUPLICATE KEY UPDATE name=name;

-- 2. Staff (Personel)
INSERT INTO staff (tenant_id, branch_id, name, email, phone, role, is_active) VALUES
(1, 1, 'Ahmet Yılmaz', 'ahmet.yilmaz@galeri.com', '0532 111 22 33', 'manager', 1),
(1, 1, 'Mehmet Demir', 'mehmet.demir@galeri.com', '0532 222 33 44', 'sales', 1),
(1, 1, 'Ayşe Kaya', 'ayse.kaya@galeri.com', '0532 333 44 55', 'sales', 1),
(1, 2, 'Fatma Şahin', 'fatma.sahin@galeri.com', '0532 444 55 66', 'manager', 1),
(1, 2, 'Ali Çelik', 'ali.celik@galeri.com', '0532 555 66 77', 'sales', 1)
ON DUPLICATE KEY UPDATE name=name;

-- 3. Customers (Müşteriler)
INSERT INTO customers (tenant_id, name, phone, email, address, notes, total_spent_base) VALUES
(1, 'Mustafa Özkan', '0533 111 22 33', 'mustafa.ozkan@email.com', 'Kadıköy, İstanbul', 'Düzenli müşteri', 450000.00),
(1, 'Zeynep Arslan', '0533 222 33 44', 'zeynep.arslan@email.com', 'Beşiktaş, İstanbul', NULL, 320000.00),
(1, 'Burak Yıldız', '0533 333 44 55', NULL, 'Ankara', 'Taksitli satış yaptı', 280000.00),
(1, 'Selin Aydın', '0533 444 55 66', 'selin.aydin@email.com', 'Bursa', NULL, 195000.00),
(1, 'Can Doğan', '0533 555 66 77', 'can.dogan@email.com', 'İzmir', NULL, 150000.00),
(1, 'Elif Kılıç', '0533 666 77 88', NULL, 'Antalya', NULL, 125000.00),
(1, 'Emre Şen', '0533 777 88 99', 'emre.sen@email.com', 'Adana', NULL, 98000.00),
(1, 'Deniz Yücel', '0533 888 99 00', NULL, 'Gaziantep', NULL, 85000.00),
(1, 'Gizem Öztürk', '0534 111 22 33', 'gizem.ozturk@email.com', 'Kocaeli', NULL, 72000.00),
(1, 'Kerem Avcı', '0534 222 33 44', NULL, 'Trabzon', NULL, 65000.00),
(1, 'Sude Karaca', '0534 333 44 55', 'sude.karaca@email.com', 'Eskişehir', NULL, 55000.00),
(1, 'Berk Yavuz', '0534 444 55 66', NULL, 'Sakarya', NULL, 48000.00),
(1, 'Merve Çınar', '0534 555 66 77', 'merve.cinar@email.com', 'Balıkesir', NULL, 42000.00),
(1, 'Onur Tekin', '0534 666 77 88', NULL, 'Manisa', NULL, 38000.00),
(1, 'Ceren Ateş', '0534 777 88 99', 'ceren.ates@email.com', 'Muğla', NULL, 35000.00)
ON DUPLICATE KEY UPDATE name=name;

-- 4. Vehicles (Araçlar) - 25 araç
INSERT INTO vehicles (tenant_id, branch_id, maker, model, year, transmission, chassis_no, plate_number, km, month, fuel, grade, cc, color, other, status, stock_status, location, purchase_amount, purchase_currency, purchase_fx_rate_to_base, purchase_date, sale_price, sale_currency, sale_fx_rate_to_base, is_sold, target_profit) VALUES
-- Stokta olan araçlar
(1, 1, 'BMW', '3.20i', 2022, 'Otomatik', 'WBA12345678901234', NULL, 15000, 6, 'Benzin', 'M Sport', 2000, 'Siyah', 'Full paket, panoramik tavan', 'used', 'in_stock', 'Showroom A', 850000.00, 'TRY', 1.0000, '2024-01-15', 1050000.00, 'TRY', 1.0000, 0, 200000.00),
(1, 1, 'Mercedes-Benz', 'C 200', 2021, 'Otomatik', 'WDD12345678901234', NULL, 25000, 12, 'Benzin', 'AMG Line', 2000, 'Beyaz', NULL, 'used', 'in_stock', 'Showroom B', 720000.00, 'TRY', 1.0000, '2024-02-10', 920000.00, 'TRY', 1.0000, 0, 200000.00),
(1, 1, 'Audi', 'A4', 2023, 'Otomatik', 'WAU12345678901234', NULL, 8000, 3, 'Benzin', 'S Line', 2000, 'Gri', 'Matrix LED, Bang & Olufsen', 'used', 'in_stock', 'Showroom A', 950000.00, 'TRY', 1.0000, '2024-03-05', 1180000.00, 'TRY', 1.0000, 0, 230000.00),
(1, 1, 'Volkswagen', 'Golf', 2022, 'Manuel', 'WVW12345678901234', NULL, 18000, 8, 'Benzin', 'Highline', 1500, 'Kırmızı', NULL, 'used', 'in_stock', 'Depo', 420000.00, 'TRY', 1.0000, '2024-01-20', 520000.00, 'TRY', 1.0000, 0, 100000.00),
(1, 1, 'Ford', 'Focus', 2021, 'Otomatik', 'WF0X12345678901234', NULL, 32000, 18, 'Benzin', 'Titanium', 1500, 'Mavi', NULL, 'used', 'in_stock', 'Depo', 380000.00, 'TRY', 1.0000, '2024-02-15', 470000.00, 'TRY', 1.0000, 0, 90000.00),
(1, 2, 'Toyota', 'Corolla', 2022, 'Otomatik', 'JTDB12345678901234', NULL, 12000, 5, 'Hibrit', 'XLE', 1800, 'Beyaz', 'Hibrit motor', 'used', 'in_stock', 'Showroom', 550000.00, 'TRY', 1.0000, '2024-03-10', 680000.00, 'TRY', 1.0000, 0, 130000.00),
(1, 2, 'Honda', 'Civic', 2021, 'Manuel', '19XFC12345678901234', NULL, 28000, 15, 'Benzin', 'EX', 1600, 'Siyah', NULL, 'used', 'in_stock', 'Depo', 450000.00, 'TRY', 1.0000, '2024-01-25', 560000.00, 'TRY', 1.0000, 0, 110000.00),
(1, 1, 'Hyundai', 'Elantra', 2023, 'Otomatik', 'KMHD12345678901234', NULL, 5000, 2, 'Benzin', 'Premium', 2000, 'Gümüş', NULL, 'used', 'in_stock', 'Showroom A', 480000.00, 'TRY', 1.0000, '2024-04-01', 590000.00, 'TRY', 1.0000, 0, 110000.00),
(1, 1, 'Renault', 'Megane', 2022, 'Otomatik', 'VF1R12345678901234', NULL, 22000, 10, 'Dizel', 'GT Line', 1600, 'Beyaz', NULL, 'used', 'in_stock', 'Depo', 390000.00, 'TRY', 1.0000, '2024-02-20', 480000.00, 'TRY', 1.0000, 0, 90000.00),
(1, 2, 'Peugeot', '308', 2021, 'Manuel', 'VF3A12345678901234', NULL, 35000, 20, 'Dizel', 'Allure', 1600, 'Gri', NULL, 'used', 'in_stock', 'Depo', 360000.00, 'TRY', 1.0000, '2024-01-10', 450000.00, 'TRY', 1.0000, 0, 90000.00),
-- Satılmış araçlar
(1, 1, 'BMW', '5.30d', 2020, 'Otomatik', 'WBA52345678901234', '34ABC123', 45000, 24, 'Dizel', 'M Sport', 3000, 'Siyah', 'Full paket', 'used', 'sold', NULL, 1200000.00, 'TRY', 1.0000, '2023-11-15', 1500000.00, 'TRY', 1.0000, 1, 300000.00),
(1, 1, 'Mercedes-Benz', 'E 200', 2021, 'Otomatik', 'WDD52345678901234', '34DEF456', 38000, 18, 'Benzin', 'AMG Line', 2000, 'Beyaz', NULL, 'used', 'sold', NULL, 1100000.00, 'TRY', 1.0000, '2023-12-01', 1350000.00, 'TRY', 1.0000, 1, 250000.00),
(1, 1, 'Audi', 'A6', 2020, 'Otomatik', 'WAU52345678901234', '34GHI789', 52000, 30, 'Dizel', 'S Line', 3000, 'Gri', NULL, 'used', 'sold', NULL, 1150000.00, 'TRY', 1.0000, '2023-10-20', 1420000.00, 'TRY', 1.0000, 1, 270000.00),
(1, 2, 'Volkswagen', 'Passat', 2021, 'Otomatik', 'WVW52345678901234', '06JKL012', 29000, 15, 'Dizel', 'Highline', 2000, 'Siyah', NULL, 'used', 'sold', NULL, 680000.00, 'TRY', 1.0000, '2023-12-10', 850000.00, 'TRY', 1.0000, 1, 170000.00),
(1, 1, 'Ford', 'Mondeo', 2020, 'Otomatik', 'WF0X52345678901234', '34MNO345', 41000, 24, 'Dizel', 'Titanium', 2000, 'Beyaz', NULL, 'used', 'sold', NULL, 550000.00, 'TRY', 1.0000, '2023-11-25', 690000.00, 'TRY', 1.0000, 1, 140000.00),
(1, 1, 'Toyota', 'Camry', 2021, 'Otomatik', 'JTDB52345678901234', '34PQR678', 33000, 18, 'Hibrit', 'XLE', 2500, 'Gümüş', 'Hibrit', 'used', 'sold', NULL, 720000.00, 'TRY', 1.0000, '2023-12-15', 900000.00, 'TRY', 1.0000, 1, 180000.00),
(1, 2, 'Honda', 'Accord', 2020, 'Otomatik', '19XFC52345678901234', '06STU901', 47000, 28, 'Benzin', 'EX', 2000, 'Siyah', NULL, 'used', 'sold', NULL, 650000.00, 'TRY', 1.0000, '2023-11-05', 810000.00, 'TRY', 1.0000, 1, 160000.00),
(1, 1, 'Hyundai', 'Sonata', 2021, 'Otomatik', 'KMHD52345678901234', '34VWX234', 36000, 20, 'Benzin', 'Premium', 2000, 'Beyaz', NULL, 'used', 'sold', NULL, 580000.00, 'TRY', 1.0000, '2023-12-20', 720000.00, 'TRY', 1.0000, 1, 140000.00),
(1, 1, 'Renault', 'Talisman', 2020, 'Otomatik', 'VF1R52345678901234', '34YZA567', 44000, 26, 'Dizel', 'GT Line', 2000, 'Gri', NULL, 'used', 'sold', NULL, 620000.00, 'TRY', 1.0000, '2023-10-30', 780000.00, 'TRY', 1.0000, 1, 160000.00),
(1, 2, 'Peugeot', '508', 2021, 'Otomatik', 'VF3A52345678901234', '06BCD890', 31000, 16, 'Dizel', 'Allure', 2000, 'Siyah', NULL, 'used', 'sold', NULL, 590000.00, 'TRY', 1.0000, '2023-12-05', 740000.00, 'TRY', 1.0000, 1, 150000.00),
-- Rezerve edilmiş araçlar
(1, 1, 'BMW', 'X3', 2022, 'Otomatik', 'WBA62345678901234', NULL, 18000, 8, 'Benzin', 'xLine', 2000, 'Beyaz', 'SUV', 'used', 'reserved', 'Showroom B', 980000.00, 'TRY', 1.0000, '2024-02-25', 1200000.00, 'TRY', 1.0000, 0, 220000.00),
(1, 1, 'Mercedes-Benz', 'GLC', 2021, 'Otomatik', 'WDD62345678901234', NULL, 28000, 15, 'Dizel', 'AMG Line', 2200, 'Siyah', 'SUV', 'used', 'reserved', 'Showroom A', 1100000.00, 'TRY', 1.0000, '2024-03-15', 1350000.00, 'TRY', 1.0000, 0, 250000.00),
(1, 2, 'Audi', 'Q5', 2022, 'Otomatik', 'WAU62345678901234', NULL, 15000, 7, 'Benzin', 'S Line', 2000, 'Gri', 'SUV', 'used', 'reserved', 'Showroom', 1050000.00, 'TRY', 1.0000, '2024-03-20', 1280000.00, 'TRY', 1.0000, 0, 230000.00),
(1, 1, 'Volkswagen', 'Tiguan', 2021, 'Otomatik', 'WVW62345678901234', NULL, 32000, 18, 'Dizel', 'Highline', 2000, 'Beyaz', 'SUV', 'used', 'reserved', 'Depo', 750000.00, 'TRY', 1.0000, '2024-02-10', 920000.00, 'TRY', 1.0000, 0, 170000.00),
(1, 1, 'Ford', 'Kuga', 2022, 'Otomatik', 'WF0X62345678901234', NULL, 12000, 5, 'Benzin', 'Titanium', 1500, 'Mavi', 'SUV', 'used', 'reserved', 'Showroom B', 680000.00, 'TRY', 1.0000, '2024-03-25', 840000.00, 'TRY', 1.0000, 0, 160000.00)
ON DUPLICATE KEY UPDATE maker=maker;

-- 5. Vehicle Costs (Araç Maliyetleri)
INSERT INTO vehicle_costs (tenant_id, vehicle_id, cost_name, amount, currency, fx_rate_to_base, cost_date, category) VALUES
-- İlk araç için maliyetler
(1, 1, 'Alım Fiyatı', 850000.00, 'TRY', 1.0000, '2024-01-15', 'purchase'),
(1, 1, 'Nakliye', 15000.00, 'TRY', 1.0000, '2024-01-16', 'shipping'),
(1, 1, 'Temizlik ve Hazırlık', 5000.00, 'TRY', 1.0000, '2024-01-17', 'other'),
(1, 1, 'Sigorta', 12000.00, 'TRY', 1.0000, '2024-01-18', 'insurance'),
-- İkinci araç için maliyetler
(1, 2, 'Alım Fiyatı', 720000.00, 'TRY', 1.0000, '2024-02-10', 'purchase'),
(1, 2, 'Nakliye', 12000.00, 'TRY', 1.0000, '2024-02-11', 'shipping'),
(1, 2, 'Onarım', 25000.00, 'TRY', 1.0000, '2024-02-12', 'repair'),
(1, 2, 'Temizlik', 4000.00, 'TRY', 1.0000, '2024-02-13', 'other'),
-- Üçüncü araç için maliyetler
(1, 3, 'Alım Fiyatı', 950000.00, 'TRY', 1.0000, '2024-03-05', 'purchase'),
(1, 3, 'Nakliye', 18000.00, 'TRY', 1.0000, '2024-03-06', 'shipping'),
(1, 3, 'Sigorta', 15000.00, 'TRY', 1.0000, '2024-03-07', 'insurance'),
-- Satılmış araçlar için maliyetler
(1, 11, 'Alım Fiyatı', 1200000.00, 'TRY', 1.0000, '2023-11-15', 'purchase'),
(1, 11, 'Nakliye', 20000.00, 'TRY', 1.0000, '2023-11-16', 'shipping'),
(1, 11, 'Onarım', 35000.00, 'TRY', 1.0000, '2023-11-17', 'repair'),
(1, 11, 'Sigorta', 18000.00, 'TRY', 1.0000, '2023-11-18', 'insurance'),
(1, 12, 'Alım Fiyatı', 1100000.00, 'TRY', 1.0000, '2023-12-01', 'purchase'),
(1, 12, 'Nakliye', 15000.00, 'TRY', 1.0000, '2023-12-02', 'shipping'),
(1, 12, 'Temizlik', 6000.00, 'TRY', 1.0000, '2023-12-03', 'other'),
(1, 13, 'Alım Fiyatı', 1150000.00, 'TRY', 1.0000, '2023-10-20', 'purchase'),
(1, 13, 'Nakliye', 18000.00, 'TRY', 1.0000, '2023-10-21', 'shipping'),
(1, 13, 'Onarım', 28000.00, 'TRY', 1.0000, '2023-10-22', 'repair'),
(1, 13, 'Sigorta', 16000.00, 'TRY', 1.0000, '2023-10-23', 'insurance'),
(1, 14, 'Alım Fiyatı', 680000.00, 'TRY', 1.0000, '2023-12-10', 'purchase'),
(1, 14, 'Nakliye', 10000.00, 'TRY', 1.0000, '2023-12-11', 'shipping'),
(1, 14, 'Temizlik', 5000.00, 'TRY', 1.0000, '2023-12-12', 'other'),
(1, 15, 'Alım Fiyatı', 550000.00, 'TRY', 1.0000, '2023-11-25', 'purchase'),
(1, 15, 'Nakliye', 8000.00, 'TRY', 1.0000, '2023-11-26', 'shipping'),
(1, 15, 'Onarım', 15000.00, 'TRY', 1.0000, '2023-11-27', 'repair')
ON DUPLICATE KEY UPDATE cost_name=cost_name;

-- 6. Vehicle Sales (Satış Kayıtları)
INSERT INTO vehicle_sales (tenant_id, vehicle_id, branch_id, staff_id, customer_name, customer_phone, customer_address, plate_number, key_count, sale_amount, sale_currency, sale_fx_rate_to_base, sale_date) VALUES
(1, 11, 1, 2, 'Mustafa Özkan', '0533 111 22 33', 'Kadıköy, İstanbul', '34ABC123', 2, 1500000.00, 'TRY', 1.0000, '2024-01-10'),
(1, 12, 1, 3, 'Zeynep Arslan', '0533 222 33 44', 'Beşiktaş, İstanbul', '34DEF456', 2, 1350000.00, 'TRY', 1.0000, '2024-01-25'),
(1, 13, 1, 2, 'Burak Yıldız', '0533 333 44 55', 'Ankara', '34GHI789', 2, 1420000.00, 'TRY', 1.0000, '2024-02-05'),
(1, 14, 2, 5, 'Selin Aydın', '0533 444 55 66', 'Bursa', '06JKL012', 2, 850000.00, 'TRY', 1.0000, '2024-02-15'),
(1, 15, 1, 2, 'Can Doğan', '0533 555 66 77', 'İzmir', '34MNO345', 2, 690000.00, 'TRY', 1.0000, '2024-02-20'),
(1, 16, 1, 3, 'Elif Kılıç', '0533 666 77 88', 'Antalya', '34PQR678', 2, 900000.00, 'TRY', 1.0000, '2024-03-01'),
(1, 17, 2, 4, 'Emre Şen', '0533 777 88 99', 'Adana', '06STU901', 2, 810000.00, 'TRY', 1.0000, '2024-03-10'),
(1, 18, 1, 2, 'Deniz Yücel', '0533 888 99 00', 'Gaziantep', '34VWX234', 2, 720000.00, 'TRY', 1.0000, '2024-03-15'),
(1, 19, 1, 3, 'Gizem Öztürk', '0534 111 22 33', 'Kocaeli', '34YZA567', 2, 780000.00, 'TRY', 1.0000, '2024-03-20'),
(1, 20, 2, 5, 'Kerem Avcı', '0534 222 33 44', 'Trabzon', '06BCD890', 2, 740000.00, 'TRY', 1.0000, '2024-03-25')
ON DUPLICATE KEY UPDATE sale_amount=sale_amount;

-- 7. Installment Sales (Taksitli Satışlar) - 5 taksitli satış
INSERT INTO vehicle_installment_sales (tenant_id, vehicle_id, sale_id, total_amount, down_payment, installment_count, installment_amount, currency, fx_rate_to_base, sale_date, status) VALUES
(1, 11, 1, 1500000.00, 500000.00, 10, 100000.00, 'TRY', 1.0000, '2024-01-10', 'active'),
(1, 13, 3, 1420000.00, 420000.00, 12, 83333.33, 'TRY', 1.0000, '2024-02-05', 'active'),
(1, 16, 6, 900000.00, 300000.00, 8, 75000.00, 'TRY', 1.0000, '2024-03-01', 'active'),
(1, 18, 8, 720000.00, 220000.00, 10, 50000.00, 'TRY', 1.0000, '2024-03-15', 'active'),
(1, 19, 9, 780000.00, 280000.00, 10, 50000.00, 'TRY', 1.0000, '2024-03-20', 'active')
ON DUPLICATE KEY UPDATE total_amount=total_amount;

-- 8. Installment Payments (Taksit Ödemeleri)
INSERT INTO vehicle_installment_payments (tenant_id, installment_sale_id, payment_type, installment_number, amount, currency, fx_rate_to_base, payment_date, notes) VALUES
-- İlk taksitli satış için ödemeler
(1, 1, 'down_payment', NULL, 500000.00, 'TRY', 1.0000, '2024-01-10', 'Peşin ödeme'),
(1, 1, 'installment', 1, 100000.00, 'TRY', 1.0000, '2024-02-10', '1. Taksit'),
(1, 1, 'installment', 2, 100000.00, 'TRY', 1.0000, '2024-03-10', '2. Taksit'),
(1, 1, 'installment', 3, 100000.00, 'TRY', 1.0000, '2024-04-10', '3. Taksit'),
-- İkinci taksitli satış için ödemeler
(1, 2, 'down_payment', NULL, 420000.00, 'TRY', 1.0000, '2024-02-05', 'Peşin ödeme'),
(1, 2, 'installment', 1, 83333.33, 'TRY', 1.0000, '2024-03-05', '1. Taksit'),
(1, 2, 'installment', 2, 83333.33, 'TRY', 1.0000, '2024-04-05', '2. Taksit'),
-- Üçüncü taksitli satış için ödemeler
(1, 3, 'down_payment', NULL, 300000.00, 'TRY', 1.0000, '2024-03-01', 'Peşin ödeme'),
(1, 3, 'installment', 1, 75000.00, 'TRY', 1.0000, '2024-04-01', '1. Taksit'),
-- Dördüncü taksitli satış için ödemeler
(1, 4, 'down_payment', NULL, 220000.00, 'TRY', 1.0000, '2024-03-15', 'Peşin ödeme'),
(1, 4, 'installment', 1, 50000.00, 'TRY', 1.0000, '2024-04-15', '1. Taksit'),
-- Beşinci taksitli satış için ödemeler
(1, 5, 'down_payment', NULL, 280000.00, 'TRY', 1.0000, '2024-03-20', 'Peşin ödeme')
ON DUPLICATE KEY UPDATE amount=amount;

-- 9. Inventory Products (Envanter Ürünleri)
INSERT INTO inventory_products (tenant_id, sku, name, category, unit, current_stock, min_stock, cost_price, sale_price, sales_count, is_for_sale, is_for_service) VALUES
(1, 'OIL-5W30-1L', 'Motor Yağı 5W30 1L', 'Yedek Parça', 'adet', 45, 10, 250.00, 350.00, 12, 1, 1),
(1, 'FILTER-OIL', 'Yağ Filtresi', 'Yedek Parça', 'adet', 28, 5, 180.00, 280.00, 8, 1, 1),
(1, 'FILTER-AIR', 'Hava Filtresi', 'Yedek Parça', 'adet', 35, 8, 120.00, 200.00, 15, 1, 1),
(1, 'BRAKE-PAD-FRONT', 'Ön Fren Balata', 'Yedek Parça', 'adet', 22, 5, 450.00, 650.00, 6, 1, 1),
(1, 'BRAKE-PAD-REAR', 'Arka Fren Balata', 'Yedek Parça', 'adet', 18, 5, 380.00, 550.00, 4, 1, 1),
(1, 'BATTERY-12V', 'Akü 12V', 'Yedek Parça', 'adet', 12, 3, 1200.00, 1800.00, 3, 1, 1),
(1, 'TIRE-205-55-R16', 'Lastik 205/55 R16', 'Yedek Parça', 'adet', 32, 8, 800.00, 1200.00, 10, 1, 1),
(1, 'WIPER-FRONT', 'Ön Silecek', 'Yedek Parça', 'adet', 48, 10, 150.00, 250.00, 20, 1, 1),
(1, 'WIPER-REAR', 'Arka Silecek', 'Yedek Parça', 'adet', 42, 10, 100.00, 180.00, 18, 1, 1),
(1, 'SHAMPOO-CAR', 'Araba Şampuanı', 'Temizlik', 'adet', 25, 5, 45.00, 75.00, 30, 1, 1),
(1, 'WAX-POLISH', 'Cila', 'Temizlik', 'adet', 15, 3, 120.00, 200.00, 12, 1, 1),
(1, 'MICROFIBER-TOWEL', 'Mikrofiber Havlu', 'Temizlik', 'adet', 60, 15, 25.00, 45.00, 40, 1, 1),
(1, 'FLOOR-MAT-FRONT', 'Ön Paspas', 'Aksesuar', 'takım', 20, 5, 200.00, 350.00, 8, 1, 0),
(1, 'FLOOR-MAT-REAR', 'Arka Paspas', 'Aksesuar', 'takım', 18, 5, 150.00, 280.00, 6, 1, 0),
(1, 'SUNSHADE', 'Güneşlik', 'Aksesuar', 'adet', 30, 8, 80.00, 150.00, 15, 1, 0)
ON DUPLICATE KEY UPDATE name=name;

-- 10. Income (Gelirler)
INSERT INTO income (tenant_id, branch_id, vehicle_id, customer_id, description, category, amount, currency, fx_rate_to_base, amount_base, income_date) VALUES
(1, 1, 11, 1, 'Araç Satışı - BMW 5.30d', 'vehicle_sale', 1500000.00, 'TRY', 1.0000, 1500000.00, '2024-01-10'),
(1, 1, 12, 2, 'Araç Satışı - Mercedes E 200', 'vehicle_sale', 1350000.00, 'TRY', 1.0000, 1350000.00, '2024-01-25'),
(1, 1, 13, 3, 'Araç Satışı - Audi A6', 'vehicle_sale', 1420000.00, 'TRY', 1.0000, 1420000.00, '2024-02-05'),
(1, 2, 14, 4, 'Araç Satışı - VW Passat', 'vehicle_sale', 850000.00, 'TRY', 1.0000, 850000.00, '2024-02-15'),
(1, 1, 15, 5, 'Araç Satışı - Ford Mondeo', 'vehicle_sale', 690000.00, 'TRY', 1.0000, 690000.00, '2024-02-20'),
(1, 1, NULL, NULL, 'Yedek Parça Satışı', 'parts_sale', 15000.00, 'TRY', 1.0000, 15000.00, '2024-03-01'),
(1, 1, NULL, NULL, 'Servis Geliri', 'service', 8500.00, 'TRY', 1.0000, 8500.00, '2024-03-05'),
(1, 2, NULL, NULL, 'Aksesuar Satışı', 'accessories', 3200.00, 'TRY', 1.0000, 3200.00, '2024-03-10')
ON DUPLICATE KEY UPDATE description=description;

-- 11. Expenses (Giderler)
INSERT INTO expenses (tenant_id, branch_id, vehicle_id, description, category, amount, currency, fx_rate_to_base, amount_base, expense_date) VALUES
(1, 1, NULL, 'Kira Ödemesi', 'rent', 50000.00, 'TRY', 1.0000, 50000.00, '2024-03-01'),
(1, 2, NULL, 'Kira Ödemesi', 'rent', 35000.00, 'TRY', 1.0000, 35000.00, '2024-03-01'),
(1, 1, NULL, 'Elektrik Faturası', 'utilities', 8500.00, 'TRY', 1.0000, 8500.00, '2024-03-05'),
(1, 1, NULL, 'Su Faturası', 'utilities', 1200.00, 'TRY', 1.0000, 1200.00, '2024-03-05'),
(1, 1, NULL, 'Personel Maaşları', 'salary', 120000.00, 'TRY', 1.0000, 120000.00, '2024-03-01'),
(1, 2, NULL, 'Personel Maaşları', 'salary', 80000.00, 'TRY', 1.0000, 80000.00, '2024-03-01'),
(1, 1, NULL, 'Pazarlama Giderleri', 'marketing', 15000.00, 'TRY', 1.0000, 15000.00, '2024-03-10'),
(1, 1, NULL, 'Benzin Gideri', 'fuel', 8500.00, 'TRY', 1.0000, 8500.00, '2024-03-15'),
(1, 1, 1, 'Araç Nakliye', 'shipping', 15000.00, 'TRY', 1.0000, 15000.00, '2024-01-16'),
(1, 1, 2, 'Araç Onarım', 'repair', 25000.00, 'TRY', 1.0000, 25000.00, '2024-02-12')
ON DUPLICATE KEY UPDATE description=description;

-- 12. Post Sale Followups (Satış Sonrası Takip)
INSERT INTO post_sale_followups (tenant_id, sale_id, customer_id, vehicle_id, followup_type, followup_date, followup_time, status, notes, satisfaction_score, created_by) VALUES
(1, 1, 1, 11, 'call', '2024-01-15', '14:00:00', 'completed', 'Müşteri memnun, herhangi bir sorun yok', 5, 2),
(1, 1, 1, 11, 'call', '2024-02-15', '15:30:00', 'completed', 'Rutin kontrol, memnuniyet yüksek', 5, 2),
(1, 2, 2, 12, 'call', '2024-01-30', '10:00:00', 'completed', 'İlk takip, müşteri memnun', 4, 3),
(1, 3, 3, 13, 'sms', '2024-02-10', NULL, 'completed', 'SMS gönderildi, teşekkür mesajı alındı', NULL, 2),
(1, 3, 3, 13, 'call', '2024-03-10', '16:00:00', 'pending', 'Taksit ödemesi hatırlatması', NULL, 2),
(1, 4, 4, 14, 'call', '2024-02-20', '11:00:00', 'completed', 'Müşteri memnun', 4, 5),
(1, 5, 5, 15, 'email', '2024-02-25', NULL, 'completed', 'E-posta gönderildi', NULL, 2),
(1, 6, 6, 16, 'call', '2024-03-05', '14:00:00', 'completed', 'İlk takip yapıldı', 5, 3),
(1, 7, 7, 17, 'call', '2024-03-15', '10:30:00', 'pending', 'Takip yapılacak', NULL, 4),
(1, 8, 8, 18, 'sms', '2024-03-20', NULL, 'completed', 'SMS gönderildi', NULL, 2)
ON DUPLICATE KEY UPDATE notes=notes;

-- Seed data tamamlandı!
SELECT 'Seed data başarıyla yüklendi!' as message;
