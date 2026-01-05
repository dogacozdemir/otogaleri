# 🔒 Security Hardening Risk Haritası

**Tarih**: 2024  
**Proje**: Otogaleri Multi-Tenant SaaS  
**Amaç**: Production-ready security hardening ve code sanitization

---

## 📊 RİSK HARİTASI ÖZETİ

### 🔴 KRİTİK RİSKLER (Hemen Düzeltilmeli)

#### 1. Hard-Coded Değerler
**Risk Seviyesi**: 🔴 KRİTİK

**Tespit Edilen Hard-Coded Değerler**:

| Dosya | Hard-Coded Değer | Risk | Önerilen Çözüm |
|-------|------------------|------|----------------|
| `backend/src/config/database.ts` | `"localhost"`, `3306`, `"root"`, `""` | 🔴 Yüksek | `process.env` ile değiştir |
| `backend/src/server.ts` | `5005` (port) | ⚠️ Orta | `process.env.PORT` kullan |
| `backend/src/config/currency.ts` | `"https://api.freecurrencyapi.com/v1"` | ⚠️ Orta | `process.env.FREECURRENCY_API_BASE` |
| `backend/src/middleware/subdomainTenantResolver.ts` | `'localhost'`, `'127.0.0.1'` | ⚠️ Orta | `process.env.ALLOWED_SUBDOMAINS` |
| `backend/src/scripts/runMigrations.ts` | `"localhost"`, `3306` | ⚠️ Orta | `process.env` kullan |

**Toplam Hard-Coded Değer**: 7 adet

#### 2. Database SSL/TLS Eksikliği
**Risk Seviyesi**: 🔴 KRİTİK

**Tespit**:
- `database.ts` dosyasında SSL konfigürasyonu yok
- Production'da şifrelenmemiş bağlantı riski
- `rejectUnauthorized: true` kontrolü yok

**Etkilenen Dosya**: `backend/src/config/database.ts`

#### 3. Merkezi Error Handler Eksikliği
**Risk Seviyesi**: 🔴 KRİTİK

**Tespit**:
- `errorHandler.ts` dosyası yok
- SQL hataları ve stack trace'ler production'da expose edilebilir
- Error ID tracking mekanizması yok

**Etkilenen Dosyalar**: Tüm controller'lar

---

### ⚠️ YÜKSEK RİSKLER

#### 4. RBAC & Validation Eksiklikleri
**Risk Seviyesi**: ⚠️ YÜKSEK

**Tespit Edilen Controller'lar**:

| Controller | dbPool.query Kullanımı | TenantAwareQuery | Permission Kontrolü | Zod Validation |
|------------|------------------------|------------------|---------------------|----------------|
| `customerController.ts` | ✅ 8+ kullanım | ❌ Yok | ❌ Yok | ❌ Yok |
| `staffController.ts` | ✅ 5+ kullanım | ❌ Yok | ❌ Yok | ❌ Yok |
| `branchController.ts` | ✅ 4+ kullanım | ❌ Yok | ❌ Yok | ❌ Yok |

**Toplam Risk**: 17+ dbPool.query kullanımı, hiçbirinde TenantAwareQuery yok

**Kritik Endpoint'ler**:
- `POST /customers` - Customer oluşturma
- `DELETE /customers/:id` - Customer silme
- `POST /staff` - Staff oluşturma
- `DELETE /staff/:id` - Staff silme
- `POST /branches` - Branch oluşturma
- `DELETE /branches/:id` - Branch silme

#### 5. S3 Storage Security
**Risk Seviyesi**: ⚠️ YÜKSEK

**Tespit**:
- ✅ Signed URL kullanılıyor (iyi)
- ⚠️ MIME type validation eksik (Multer seviyesinde)
- ⚠️ File size limit kontrolü eksik
- ⚠️ Malicious file upload koruması eksik

**Etkilenen Dosya**: `backend/src/controllers/vehicleImageController.ts`

---

### 📝 ORTA RİSKLER

#### 6. Security Log Webhook Eksikliği
**Risk Seviyesi**: ⚠️ ORTA

**Tespit**:
- LoggerService var ama webhook mekanizması yok
- Kritik olaylar sadece log dosyasına yazılıyor
- Real-time alerting yok

**Etkilenen Dosya**: `backend/src/services/loggerService.ts`

#### 7. .env.example Eksikliği
**Risk Seviyesi**: ⚠️ ORTA

**Tespit**:
- `.env.example` dosyası yok
- Yeni developer'lar için environment variable rehberi eksik

---

## 📋 DETAYLI RİSK ANALİZİ

### 1. Hard-Coded Değerler Detayı

#### database.ts
```typescript
// ❌ MEVCUT (RİSKLİ)
host: OTG_DB_HOST || "localhost",
port: OTG_DB_PORT ? Number(OTG_DB_PORT) : 3306,
user: OTG_DB_USER || "root",
password: OTG_DB_PASSWORD || "",
```

**Risk**: Production'da default değerler kullanılabilir

#### server.ts
```typescript
// ❌ MEVCUT (RİSKLİ)
const PORT = process.env.PORT || 5005;
```

**Risk**: Port hard-coded, production'da farklı port gerekebilir

#### currency.ts
```typescript
// ❌ MEVCUT (RİSKLİ)
export const FREECURRENCY_API_BASE = "https://api.freecurrencyapi.com/v1";
```

**Risk**: API URL değişirse kod değişikliği gerekir

### 2. Database SSL Detayı

**Mevcut Durum**:
```typescript
export const dbPool = mysql.createPool({
  host: OTG_DB_HOST || "localhost",
  // ❌ SSL konfigürasyonu yok
});
```

**Gerekli**:
```typescript
export const dbPool = mysql.createPool({
  // ...
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: process.env.DB_SSL_CA ? fs.readFileSync(process.env.DB_SSL_CA) : undefined,
  } : false,
});
```

### 3. Error Handler Detayı

**Mevcut Durum**: Yok

**Gerekli Özellikler**:
- Production'da generic error mesajları
- Error ID generation (UUID)
- LoggerService ile detaylı logging
- Stack trace sadece development'ta

### 4. RBAC Eksiklikleri Detayı

#### customerController.ts
- `listCustomers`: dbPool.query ✅ → TenantAwareQuery ❌
- `createCustomer`: dbPool.query ✅ → TenantAwareQuery ❌, Permission ❌, Validation ❌
- `updateCustomer`: dbPool.query ✅ → TenantAwareQuery ❌, Permission ❌, Validation ❌
- `deleteCustomer`: dbPool.query ✅ → TenantAwareQuery ❌, Permission ❌

#### staffController.ts
- `listStaff`: dbPool.query ✅ → TenantAwareQuery ❌
- `createStaff`: dbPool.query ✅ → TenantAwareQuery ❌, Permission ❌, Validation ❌
- `updateStaff`: dbPool.query ✅ → TenantAwareQuery ❌, Permission ❌, Validation ❌
- `deleteStaff`: dbPool.query ✅ → TenantAwareQuery ❌, Permission ❌

#### branchController.ts
- `listBranches`: dbPool.query ✅ → TenantAwareQuery ❌
- `createBranch`: dbPool.query ✅ → TenantAwareQuery ❌, Permission ❌, Validation ❌
- `updateBranch`: dbPool.query ✅ → TenantAwareQuery ❌, Permission ❌, Validation ❌
- `deleteBranch`: dbPool.query ✅ → TenantAwareQuery ❌, Permission ❌

### 5. S3 Storage Security Detayı

**Mevcut Durum**:
- ✅ Signed URL kullanılıyor (1 saatlik)
- ❌ MIME type validation eksik
- ❌ File size limit kontrolü eksik
- ❌ File content validation eksik

**Gerekli**:
- Multer fileFilter ile MIME type kontrolü
- File size limit (örn: 10MB)
- Magic number validation (dosya içeriği kontrolü)

---

## 🎯 ÖNCELİKLİ AKSİYON PLANI

### Faz 1: Kritik Güvenlik (Hemen)
1. ✅ Hard-coded değerleri temizle
2. ✅ Database SSL ekle
3. ✅ Error handler oluştur

### Faz 2: RBAC & Validation (1-2 Gün)
4. ✅ CustomerController refactoring
5. ✅ StaffController refactoring
6. ✅ BranchController refactoring

### Faz 3: Storage & Monitoring (1 Gün)
7. ✅ S3 security hardening
8. ✅ Security log webhook iskeleti
9. ✅ .env.example oluştur

---

## 📊 RİSK SKORU

| Kategori | Risk Seviyesi | Etkilenen Dosya Sayısı |
|----------|---------------|------------------------|
| Hard-Coded Values | 🔴 Kritik | 5 dosya |
| Database SSL | 🔴 Kritik | 1 dosya |
| Error Handler | 🔴 Kritik | Tüm controller'lar |
| RBAC Eksiklikleri | ⚠️ Yüksek | 3 controller |
| Storage Security | ⚠️ Yüksek | 1 controller |
| Webhook | ⚠️ Orta | 1 dosya |

**Toplam Kritik Risk**: 3  
**Toplam Yüksek Risk**: 2  
**Toplam Orta Risk**: 1

---

## ✅ ONAY BEKLİYOR

Bu risk haritasını gözden geçirdikten sonra kodlamaya geçebiliriz. Onayınızı bekliyorum.

**Önerilen Sıralama**:
1. Hard-coded değerleri temizle + .env.example
2. Database SSL + Error Handler
3. RBAC & Validation (Customer, Staff, Branch)
4. S3 Security + Webhook

