# Otogaleri Yönetim Sistemi - Development Roadmap

## 📋 Genel Bakış

Bu dokümantasyon, OGYS sistemine entegre edilecek kritik özelliklerin önceliklendirilmiş geliştirme planını içermektedir. Tüm özellikler mevcut mimariyi koruyarak (React/TypeScript Frontend, Node.js/Express/MySQL Backend, Multi-tenant yapı) geliştirilecektir.

---

## 🎯 Öncelik Matrisi

### **P0 - Kritik (Hemen Başlanmalı)**
Operasyonel verimliliği doğrudan artıran, günlük iş akışını hızlandıran özellikler.

### **P1 - Yüksek Öncelik**
Satış süreçlerini iyileştiren ve müşteri deneyimini artıran özellikler.

### **P2 - Orta Öncelik**
CRM ve finansal takip için önemli ancak acil olmayan özellikler.

### **P3 - Düşük Öncelik**
Güvenlik ve yönetim iyileştirmeleri.

---

## 📊 Detaylı Geliştirme Planı

### **P0-1: Bulk Vehicle & Expense Entry (Excel/CSV Import)** ⭐ EN YÜKSEK ÖNCELİK

**Hedef:** Operasyonel verimliliği maksimize etmek için toplu araç ve masraf girişi.

**Gerekçe:**
- KOBİ'ler genellikle çok sayıda araç ve masrafı tek tek girmek zorunda kalıyor
- Excel/CSV ile toplu veri girişi zaman tasarrufu sağlar
- Hata riskini azaltır (validasyon ile)

**Geliştirme Adımları:**

#### **Backend (Node.js/Express)**
1. ✅ Excel/CSV parsing servisi oluştur (`xlsx` veya `csv-parser` kütüphanesi)
2. ✅ Bulk import endpoint: `POST /api/vehicles/bulk-import`
3. ✅ Veri validasyonu (zod schema ile)
4. ✅ Transaction-based batch insert (hata durumunda rollback)
5. ✅ Hata raporlama (hangi satırlarda hata var)
6. ✅ Masraf import endpoint: `POST /api/vehicles/bulk-costs`

#### **Frontend (React/TypeScript)**
1. ✅ VehiclesPage'e "Toplu İçe Aktar" butonu ekle
2. ✅ File upload dialog (Excel/CSV seçimi)
3. ✅ Import preview (yüklenen verilerin önizlemesi)
4. ✅ Validation feedback (hangi satırlarda hata var)
5. ✅ Progress indicator (toplu işlem sırasında)
6. ✅ Success/Error reporting

#### **Excel/CSV Format Şablonu:**
```csv
vehicle_number,maker,model,production_year,chassis_no,km,fuel,transmission,color,cc,sale_price,purchase_amount,purchase_currency,arrival_date,status,stock_status
1,Toyota,Corolla,2020,ABC123456,50000,Benzin,Otomatik,Beyaz,1600,250000,200000,TRY,2024-01-15,used,in_stock
```

**Tahmini Süre:** 2-3 gün

---

### **P0-2: Media Optimization Enhancement (WebP Conversion)** ⭐ YÜKSEK ÖNCELİK

**Hedef:** Tüm araç görsellerini WebP formatına dönüştürerek sayfa yükleme hızını artırmak.

**Gerekçe:**
- WebP formatı JPEG'e göre %25-35 daha küçük dosya boyutu
- Daha hızlı sayfa yükleme = daha iyi kullanıcı deneyimi
- Mevcut Sharp entegrasyonu var, sadece format değişikliği gerekli

**Geliştirme Adımları:**

#### **Backend**
1. ✅ `vehicleImageController.ts` içindeki `optimizeImage` fonksiyonunu güncelle
2. ✅ JPEG yerine WebP formatına dönüştür
3. ✅ Fallback mekanizması (eski tarayıcılar için JPEG)
4. ✅ Responsive image generation (farklı boyutlarda WebP)

**Tahmini Süre:** 1 gün

---

### **P1-1: Offer/Quotation Module** ⭐ YÜKSEK ÖNCELİK

**Hedef:** Müşterilere teklif/teklifname oluşturma ve yönetimi.

**Gerekçe:**
- Satış sürecini profesyonelleştirir
- Müşteri ile iletişimi kolaylaştırır
- Tekliften satışa geçişi otomatikleştirir

**Geliştirme Adımları:**

#### **Database Schema**
```sql
CREATE TABLE vehicle_quotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  customer_id INT NULL,
  quote_number VARCHAR(50) NOT NULL,
  quote_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  sale_price DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  down_payment DECIMAL(12,2) NULL,
  installment_count INT NULL,
  installment_amount DECIMAL(12,2) NULL,
  status ENUM('draft','sent','approved','rejected','expired','converted') DEFAULT 'draft',
  notes TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_tenant (tenant_id),
  INDEX idx_status (status)
);
```

#### **Backend**
1. ✅ Quote CRUD endpoints (`/api/quotes`)
2. ✅ Quote approval/rejection workflow
3. ✅ Quote to Sale conversion endpoint
4. ✅ Quote number auto-generation

#### **Frontend**
1. ✅ Yeni sayfa: `QuotesPage` veya `CustomerDetails` içinde sekme
2. ✅ Quote oluşturma formu
3. ✅ Quote listesi ve filtreleme
4. ✅ Quote detay modalı
5. ✅ "Satışa Dönüştür" butonu

**Tahmini Süre:** 3-4 gün

---

### **P1-2: Document Generation (PDF)** ⭐ YÜKSEK ÖNCELİK

**Hedef:** Satış sözleşmeleri ve faturaları PDF olarak otomatik oluşturma.

**Gerekçe:**
- Yasal gereklilikler (sözleşme, fatura)
- Profesyonel görünüm
- Müşteri memnuniyeti

**Geliştirme Adımları:**

#### **Backend**
1. ✅ PDF generation library seçimi (`pdfkit` veya `puppeteer`)
2. ✅ Sales contract template
3. ✅ Invoice template
4. ✅ Endpoint: `GET /api/vehicles/:id/sales/:sale_id/contract-pdf`
5. ✅ Endpoint: `GET /api/vehicles/:id/sales/:sale_id/invoice-pdf`
6. ✅ Branding (galeri logosu, bilgileri)

#### **Frontend**
1. ✅ Vehicle Sales Form'a "Sözleşme İndir" butonu
2. ✅ CustomerDetails'e "Fatura İndir" butonu
3. ✅ PDF preview (modal içinde)

**Tahmini Süre:** 2-3 gün

---

### **P2-1: Installment Tracking & Automatic Alerts** ⭐ ORTA ÖNCELİK

**Hedef:** Gecikmiş taksitleri otomatik tespit etme ve SMS/Email hatırlatmaları.

**Gerekçe:**
- Nakit akışını iyileştirir
- Müşteri iletişimini otomatikleştirir
- Dashboard'da görünürlük sağlar

**Geliştirme Adımları:**

#### **Backend**
1. ✅ Daily cron job (overdue detection)
2. ✅ SMS API integration (placeholder)
3. ✅ Email service integration (nodemailer)
4. ✅ Alert queue system
5. ✅ Endpoint: `POST /api/installments/:id/send-reminder`

#### **Frontend**
1. ✅ Dashboard'a "Top 5 Gecikmiş Taksitler" widget'ı
2. ✅ CustomerDetails'e "Hatırlatma Gönder" butonu
3. ✅ Alert history log

**Tahmini Süre:** 2-3 gün

---

### **P3-1: Advanced Access Control (ACL)** ⭐ DÜŞÜK ÖNCELİK

**Hedef:** Rol bazlı yetkilendirmeyi detaylandırma ve ACL yönetimi.

**Gerekçe:**
- Güvenlik iyileştirmesi
- İşletme kontrolü
- Audit trail

**Geliştirme Adımları:**

#### **Database Schema**
```sql
CREATE TABLE acl_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  role ENUM('owner','manager','sales','accounting','other') NOT NULL,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  allowed TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_role_resource_action (tenant_id, role, resource, action),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

#### **Backend**
1. ✅ ACL middleware (`checkPermission`)
2. ✅ ACL CRUD endpoints
3. ✅ Default permissions setup

#### **Frontend**
1. ✅ SettingsPage'e "Yetki Yönetimi" sekmesi
2. ✅ ACL configuration UI (matrix table)
3. ✅ Permission checks in components

**Tahmini Süre:** 3-4 gün

---

## 📅 Zaman Çizelgesi (Önerilen Sıralama)

### **Hafta 1: Operasyonel Verimlilik**
- ✅ **Gün 1-2:** Bulk Vehicle & Expense Import (Backend + Frontend)
- ✅ **Gün 3:** Media Optimization (WebP conversion)

### **Hafta 2: Satış Akışı**
- ✅ **Gün 1-3:** Offer/Quotation Module
- ✅ **Gün 4-5:** Document Generation (PDF)

### **Hafta 3: CRM & Finans**
- ✅ **Gün 1-2:** Installment Tracking & Alerts (Backend)
- ✅ **Gün 3:** Dashboard Widget & Frontend Integration

### **Hafta 4: Güvenlik & Yönetim**
- ✅ **Gün 1-3:** Advanced Access Control (ACL)

---

## 🔧 Teknik Gereksinimler

### **Yeni NPM Paketleri**

#### **Backend:**
```json
{
  "xlsx": "^0.18.5",           // Excel parsing
  "csv-parser": "^3.0.0",      // CSV parsing
  "pdfkit": "^0.14.0",         // PDF generation
  "nodemailer": "^6.9.7",      // Email sending
  "node-cron": "^3.0.3"        // Scheduled tasks
}
```

#### **Frontend:**
```json
{
  "xlsx": "^0.18.5",           // Excel generation (export)
  "react-pdf": "^7.6.0"       // PDF preview (optional)
}
```

---

## ✅ Test Stratejisi

### **Unit Tests**
- Bulk import validation logic
- PDF generation templates
- ACL permission checks

### **Integration Tests**
- Bulk import end-to-end flow
- Quote to Sale conversion
- Installment alert triggers

### **E2E Tests**
- User workflow: Import → Quote → Sale → PDF

---

## 📝 Notlar

1. **Mevcut Mimariyi Koru:** Tüm değişiklikler mevcut yapıyı bozmamalı
2. **Multi-tenant Güvenlik:** Tüm yeni endpoint'ler tenant_id kontrolü yapmalı
3. **Error Handling:** Kapsamlı hata yönetimi ve kullanıcı geri bildirimi
4. **Performance:** Bulk işlemler için transaction ve batch insert kullan
5. **UX:** Loading states, progress indicators, success/error messages

---

## 🎯 Başarı Metrikleri

- **Bulk Import:** Araç giriş süresi %70 azalma
- **WebP Optimization:** Sayfa yükleme süresi %30 iyileşme
- **Quote Module:** Tekliften satışa dönüşüm oranı %20 artış
- **PDF Generation:** Manuel belge oluşturma süresi %90 azalma
- **Installment Alerts:** Gecikmiş ödeme oranı %40 azalma

---

**Son Güncelleme:** 2025-01-XX
**Versiyon:** 1.0.0

