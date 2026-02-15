# Seed Data Analizi - Otogaleri Webapp

**Tarih:** 14 Şubat 2026  
**Hedef hesap:** dogac@nerdyreptile.com  
**Tarih aralığı:** Son 8 hafta (20 Aralık 2025 - 14 Şubat 2026)

## Eklenebilecek Veri Türleri

Veritabanı şeması ve mevcut seed_data.sql analiz edilerek aşağıdaki veri türleri belirlenmiştir:

### 1. **Tenant & Kullanıcı**
- `tenants` - Galeri bilgisi (eğer hesap yoksa oluşturulacak)
- `users` - dogac@nerdyreptile.com kullanıcısı (eğer yoksa)

### 2. **Şubeler (branches)**
- Merkez şube, Ankara şubesi, İzmir şubesi gibi gerçekçi şube kayıtları

### 3. **Personel (staff)**
- Yönetici, satış, muhasebe personeli - şubelere atanmış

### 4. **Müşteriler (customers)**
- 20-25 gerçekçi müşteri (isim, telefon, email, adres, total_spent_base)

### 5. **Araç Girişleri (vehicles)**
- **Stokta:** 15-20 araç (in_stock) - farklı marka/model, arrival_date son 1 ay
- **Satılmış:** 10-12 araç (is_sold=1, stock_status='sold')
- **Rezerve:** 3-5 araç (reserved)
- Her araç: maker, model, production_year, arrival_date, purchase_amount, sale_price, chassis_no, km, renk vb.

### 6. **Araç Maliyetleri (vehicle_costs)**
- Her araç için: alım, nakliye, sigorta, onarım, temizlik vb. maliyetler

### 7. **Araç Satışları (vehicle_sales)**
- Peşin satışlar - satılmış araçlara bağlı
- customer_name, sale_amount, sale_currency, sale_date

### 8. **Taksitli Satışlar (vehicle_installment_sales)**
- Peşin + senetle satışlar - bazı satışlar taksitli
- total_amount, down_payment, installment_count, installment_amount

### 9. **Taksit Ödemeleri (vehicle_installment_payments)**
- down_payment ve installment ödemeleri - gerçekçi ödeme geçmişi

### 10. **Teklif Girişleri (vehicle_quotes)**
- Müşterilere gönderilmiş teklifler
- draft, sent, approved, rejected, expired, converted durumları
- quote_number, quote_date, valid_until, sale_price

### 11. **Stok Ürünleri (inventory_products)**
- Yedek parça, temizlik malzemesi, aksesuar
- Motor yağı, filtre, fren balata, akü, lastik, silecek vb.
- current_stock, min_stock, cost_price, sale_price

### 12. **Stok Hareketleri (inventory_movements)**
- Stok girişleri (type='in')
- Stok satışları (type='sale') - müşterilere
- Servis kullanımı (type='service_usage')

### 13. **Gelirler (income)**
- Yedek parça satışı, servis geliri, aksesuar satışı
- Multi-currency (TRY, USD, EUR)

### 14. **Giderler (expenses)**
- Kira, elektrik, maaş, pazarlama, benzin
- Araç nakliye ve onarım giderleri

### 15. **Satış Sonrası Takip (post_sale_followups)**
- call, sms, email tipinde takipler
- completed ve pending durumları
- satisfaction_score

### 16. **Opsiyonel - Ek Tablolar**
- `vehicle_documents` - Araç belgeleri (dosya yolu gerekir)
- `customer_documents` - Müşteri belgeleri
- `inventory_sales` - Detaylı stok satış kayıtları (inventory_movements ile kullanılıyor)

## Canlı Görünüm İçin Önemli Noktalar

1. **Tarih dağılımı:** Veriler 14 Ocak - 14 Şubat 2026 arasına yayılmalı
2. **Tutarlılık:** Satılmış araçlar → vehicle_sales → vehicle_installment_sales ilişkileri doğru
3. **Müşteri eşleşmesi:** Satışlardaki müşteriler customers tablosunda olmalı
4. **Stok tutarlılığı:** inventory_movements + current_stock uyumlu
5. **Multi-currency:** TRY, USD, EUR karışımlı (2026 kurları: USD~38, EUR~41)
6. **Gerçekçi sayılar:** Araç fiyatları 400k-1.5M TRY aralığı
