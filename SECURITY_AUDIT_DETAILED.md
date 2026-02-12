# 🔒 Detaylı Güvenlik Analizi Raporu
**Tarih:** 2025-01-30  
**Analist:** Software Security Engineer  
**Kapsam:** Backend, Frontend, Database, API Routes

---

## 📊 ÖZET

**Genel Güvenlik Durumu:** 🟡 ORTA-İYİ (7.5/10)

**Güçlü Yönler:**
- ✅ Multi-tenant izolasyonu (TenantAwareQuery strict mode)
- ✅ JWT token versioning
- ✅ Input validation (Zod)
- ✅ Rate limiting (5 farklı limiter)
- ✅ Helmet security headers
- ✅ SQL injection koruması (prepared statements)
- ✅ File upload validation

**Kritik Sorunlar:**
- 🔴 CSRF koruması eksik
- 🔴 CORS çok geniş (origin: true)
- 🟠 JWT secret default değer kontrolü yetersiz
- 🟠 Password policy zayıf (sadece 8 karakter)
- 🟠 Frontend'de token localStorage'da (XSS riski)

---

## 🔴 KRİTİK SORUNLAR (Hemen Düzeltilmeli)

### 1. CSRF (Cross-Site Request Forgery) Koruması Eksik
**Risk Seviyesi:** 🔴 YÜKSEK  
**Lokasyon:** `backend/src/server.ts`, Tüm POST/PUT/DELETE endpoint'leri

**Sorun:**
- CSRF token validation yok
- SameSite cookie kullanılmıyor
- CORS `origin: true` ile tüm origin'lere izin veriyor

**Etki:**
- Saldırgan, kullanıcı oturum açmışken zararlı istekler gönderebilir
- Kullanıcı farkında olmadan veri değişikliği yapılabilir

**Çözüm:**
```typescript
// 1. csrf middleware ekle
import csrf from 'csurf';
const csrfProtection = csrf({ cookie: true });

// 2. Cookie ayarları
app.use(cookieParser());
app.use(csrfProtection);

// 3. Frontend'de token gönder
// API çağrılarında X-CSRF-Token header'ı ekle
```

**Alternatif (Daha Güvenli):**
- SameSite cookie kullan (JWT yerine httpOnly cookie)
- Double Submit Cookie pattern
- Origin header validation

---

### 2. CORS Yapılandırması Çok Geniş
**Risk Seviyesi:** 🔴 YÜKSEK  
**Lokasyon:** `backend/src/server.ts:30-33`

**Sorun:**
```typescript
app.use(cors({
  origin: true,  // ⚠️ TÜM origin'lere izin veriyor!
  credentials: true,
}));
```

**Etki:**
- Herhangi bir domain'den API çağrısı yapılabilir
- XSS saldırılarından sonra API'ye erişim mümkün

**Çözüm:**
```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:5175',
  'https://akilligaleri.com',
  'https://app.akilligaleri.com'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

### 3. JWT Secret Güvenliği
**Risk Seviyesi:** 🟠 ORTA-YÜKSEK  
**Lokasyon:** `backend/src/middleware/auth.ts:6`

**Sorun:**
- Development'ta default secret kullanılıyor
- Production'da kontrol var ama yeterli değil
- Secret rotation mekanizması yok

**Mevcut Kod:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET || "otogaleri-secret-change-in-production";
```

**Çözüm:**
```typescript
// 1. Production'da kesinlikle secret olmalı
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET must be set in production');
}

// 2. Secret strength validation
if (JWT_SECRET.length < 64) {
  throw new Error('JWT_SECRET must be at least 64 characters');
}

// 3. Secret rotation için environment variable
// JWT_SECRET_OLD ve JWT_SECRET yeni token'ları doğrula
```

---

## 🟠 YÜKSEK ÖNCELİKLİ SORUNLAR

### 4. Password Policy Zayıf
**Risk Seviyesi:** 🟠 ORTA  
**Lokasyon:** `backend/src/controllers/authController.ts:169`

**Sorun:**
```typescript
if (newPassword.length < 8) {
  return res.status(400).json({ error: "New password must be at least 8 characters long" });
}
```

**Eksikler:**
- Büyük/küçük harf zorunluluğu yok
- Rakam zorunluluğu yok
- Özel karakter zorunluluğu yok
- Yaygın şifre kontrolü yok

**Çözüm:**
```typescript
import zxcvbn from 'zxcvbn';

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 12) {
    return { valid: false, error: "Password must be at least 12 characters" };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain lowercase letters" };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain uppercase letters" };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain numbers" };
  }
  
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, error: "Password must contain special characters" };
  }
  
  // zxcvbn ile güçlülük kontrolü
  const strength = zxcvbn(password);
  if (strength.score < 3) {
    return { valid: false, error: "Password is too weak. Please choose a stronger password." };
  }
  
  return { valid: true };
}
```

---

### 5. Frontend Token Storage - XSS Riski
**Risk Seviyesi:** 🟠 ORTA  
**Lokasyon:** `frontend/src/api.ts:13`, `frontend/src/components/SidebarLayout.tsx:101`

**Sorun:**
- JWT token localStorage'da saklanıyor
- XSS saldırısında token çalınabilir

**Mevcut Kod:**
```typescript
const token = localStorage.getItem("otogaleri_token");
```

**Çözüm:**
```typescript
// 1. httpOnly cookie kullan (en güvenli)
// Backend'de:
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

// 2. Alternatif: sessionStorage (XSS'den daha az etkilenir)
// 3. Alternatif: Memory storage (sayfa kapanınca silinir)
```

**Not:** httpOnly cookie kullanılırsa, frontend'de token'a erişim olmayacak, bu da bazı değişiklikler gerektirir.

---

### 6. SQL Injection - Raw Query Kullanımları
**Risk Seviyesi:** 🟠 ORTA  
**Lokasyon:** Çeşitli controller'lar

**Sorun:**
- Bazı yerlerde hala `dbPool.query()` direkt kullanılıyor
- TenantAwareQuery kullanılmayan yerler var

**Örnek:**
```typescript
// authController.ts:106
const [rows] = await dbPool.query(
  "SELECT u.id, u.tenant_id, u.name, u.email, u.password_hash, u.role, u.is_active, COALESCE(u.token_version, 0) as token_version FROM users u WHERE u.email = ?",
  [email.toLowerCase().trim()]
);
```

**Çözüm:**
- Tüm query'leri TenantAwareQuery üzerinden yap
- Raw query kullanımını minimize et
- Query builder kullan (örn: Knex.js)

---

### 7. Error Handling - Bilgi Sızıntısı
**Risk Seviyesi:** 🟠 DÜŞÜK-ORTA  
**Lokasyon:** `backend/src/middleware/errorHandler.ts`

**Sorun:**
- Development modunda stack trace gösteriliyor
- Bazı hatalarda detaylı mesaj dönüyor

**İyileştirme:**
```typescript
// Production'da hiçbir zaman stack trace gösterme
if (isProduction) {
  // Sadece generic mesaj
  res.status(statusCode).json({
    error: "An error occurred",
    errorId,
  });
} else {
  // Development'ta detaylı bilgi
  res.status(statusCode).json({
    error: err.message,
    errorId,
    stack: err.stack,
  });
}
```

---

## 🟡 ORTA ÖNCELİKLİ SORUNLAR

### 8. Rate Limiting - IP Bazlı (VPN Bypass)
**Risk Seviyesi:** 🟡 DÜŞÜK  
**Lokasyon:** `backend/src/middleware/rateLimiter.ts`

**Sorun:**
- Rate limiting sadece IP bazlı
- VPN/Proxy ile bypass edilebilir
- User ID bazlı rate limiting yok

**Çözüm:**
```typescript
// User ID bazlı rate limiting ekle
export const userRateLimiter = rateLimit({
  keyGenerator: (req: AuthRequest) => {
    return req.userId?.toString() || req.ip || 'unknown';
  },
  windowMs: 15 * 60 * 1000,
  max: 100,
});
```

---

### 9. File Upload - Magic Number Validation Eksik
**Risk Seviyesi:** 🟡 DÜŞÜK  
**Lokasyon:** `backend/src/controllers/vehicleImageController.ts`

**Sorun:**
- Sadece MIME type ve extension kontrolü var
- Magic number (file signature) kontrolü yok
- Dosya içeriği doğrulanmıyor

**Çözüm:**
```typescript
import fileType from 'file-type';

async function validateFileContent(buffer: Buffer, expectedMime: string): Promise<boolean> {
  const detectedType = await fileType.fromBuffer(buffer);
  
  if (!detectedType) {
    return false;
  }
  
  const mimeMap: Record<string, string[]> = {
    'image/jpeg': ['image/jpeg'],
    'image/png': ['image/png'],
    'image/webp': ['image/webp'],
  };
  
  return mimeMap[expectedMime]?.includes(detectedType.mime) || false;
}
```

---

### 10. Database Connection - SSL Zorunluluğu
**Risk Seviyesi:** 🟡 DÜŞÜK  
**Lokasyon:** `backend/src/config/database.ts:14-41`

**Sorun:**
- Production'da SSL uyarı veriyor ama bağlantıyı engellemiyor
- SSL olmadan production'a izin veriliyor

**Çözüm:**
```typescript
if (process.env.NODE_ENV === 'production') {
  if (!dbSslConfig.enabled) {
    throw new Error('CRITICAL: SSL is REQUIRED for production database connections');
  }
}
```

---

### 11. Input Sanitization - Regex Injection Riski
**Risk Seviyesi:** 🟡 DÜŞÜK  
**Lokasyon:** `backend/src/middleware/inputSanitizer.ts`

**Sorun:**
- Regex kullanımlarında ReDoS (Regular Expression Denial of Service) riski var

**Örnek:**
```typescript
.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
```

**Çözüm:**
- DOMPurify gibi kütüphane kullan
- Regex timeout ekle
- Whitelist-based sanitization

---

### 12. Logging - Hassas Bilgi Loglama
**Risk Seviyesi:** 🟡 DÜŞÜK  
**Lokasyon:** `backend/src/services/loggerService.ts`

**Kontrol Edilmesi Gerekenler:**
- Password hash'ler loglanıyor mu?
- Credit card bilgileri loglanıyor mu?
- JWT token'lar loglanıyor mu?

**Çözüm:**
```typescript
function sanitizeLogData(data: any): any {
  const sensitiveFields = ['password', 'password_hash', 'token', 'credit_card', 'ssn'];
  // Recursively remove sensitive fields
}
```

---

## 🟢 DÜŞÜK ÖNCELİKLİ / İYİLEŞTİRME ÖNERİLERİ

### 13. Security Headers - Ek Başlıklar
**Öneri:**
```typescript
app.use(helmet({
  // ... mevcut ayarlar
  permissionsPolicy: {
    features: {
      geolocation: ["'self'"],
      camera: ["'none'"],
      microphone: ["'none'"],
    },
  },
}));
```

---

### 14. API Versioning
**Öneri:**
- API versioning ekle (`/api/v1/`, `/api/v2/`)
- Breaking changes için hazırlık

---

### 15. Request ID Tracking
**Öneri:**
```typescript
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});
```

---

### 16. Database Query Logging (Production'da Kapalı)
**Kontrol:**
- Production'da SQL query'ler loglanıyor mu?
- Hassas veriler loglara yazılıyor mu?

---

### 17. Dependency Security Scanning
**Öneri:**
```bash
npm audit
npm audit fix
# veya
snyk test
```

---

## 📋 ÖNCELİK SIRASI İLE AKSIYON PLANI

### Hemen (Bu Hafta)
1. ✅ CSRF koruması ekle
2. ✅ CORS yapılandırmasını daralt
3. ✅ JWT secret validation güçlendir
4. ✅ Password policy güçlendir

### Kısa Vadede (Bu Ay)
5. ✅ Frontend token storage güvenliği (httpOnly cookie)
6. ✅ SQL injection - TenantAwareQuery kullanımı
7. ✅ Error handling - bilgi sızıntısı önleme
8. ✅ File upload - magic number validation

### Orta Vadede (3 Ay)
9. ✅ Rate limiting - user ID bazlı
10. ✅ Database SSL zorunluluğu
11. ✅ Input sanitization iyileştirme
12. ✅ Logging - hassas bilgi filtreleme

### Uzun Vadede (6 Ay)
13. ✅ Security headers genişletme
14. ✅ API versioning
15. ✅ Dependency security scanning otomasyonu
16. ✅ Penetration testing

---

## ✅ GÜÇLÜ YÖNLER (Korunmalı)

1. **TenantAwareQuery Strict Mode** - Multi-tenant izolasyonu mükemmel
2. **JWT Token Versioning** - Token invalidation desteği var
3. **Zod Validation** - Type-safe input validation
4. **Rate Limiting** - 5 farklı limiter ile iyi korunma
5. **Helmet** - Security headers aktif
6. **Prepared Statements** - SQL injection koruması
7. **File Upload Validation** - MIME type ve size kontrolü
8. **Error Handling** - Production-safe error messages
9. **Logging Service** - Güvenlik olayları loglanıyor
10. **Password Hashing** - bcrypt kullanılıyor

---

## 📊 RİSK MATRİSİ

| Risk | Olasılık | Etki | Öncelik | Durum |
|------|----------|------|---------|-------|
| CSRF | Yüksek | Yüksek | 🔴 Kritik | ❌ Eksik |
| CORS | Yüksek | Orta | 🔴 Kritik | ⚠️ Çok Geniş |
| JWT Secret | Orta | Yüksek | 🟠 Yüksek | ⚠️ İyileştirilmeli |
| Password Policy | Yüksek | Orta | 🟠 Yüksek | ⚠️ Zayıf |
| Token Storage | Orta | Orta | 🟠 Yüksek | ⚠️ localStorage |
| SQL Injection | Düşük | Yüksek | 🟡 Orta | ✅ İyi (çoğunlukla) |
| Rate Limiting | Orta | Düşük | 🟡 Orta | ✅ İyi |
| File Upload | Düşük | Orta | 🟡 Orta | ⚠️ İyileştirilebilir |
| Error Handling | Düşük | Düşük | 🟡 Orta | ✅ İyi |
| SSL | Düşük | Yüksek | 🟡 Orta | ⚠️ Zorunlu değil |

---

## 🔧 HIZLI DÜZELTME KODLARI

### CSRF Koruması
```typescript
// backend/src/server.ts
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

app.use(cookieParser());
const csrfProtection = csrf({ cookie: true });

// Tüm POST/PUT/DELETE route'larına ekle
app.use('/api', csrfProtection);
```

### CORS Düzeltmesi
```typescript
// backend/src/server.ts
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:5175'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

### Password Policy
```typescript
// backend/src/controllers/authController.ts
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 12) {
    return { valid: false, error: "Password must be at least 12 characters" };
  }
  // ... diğer kontroller
}
```

---

## 📝 SONUÇ

Proje genel olarak **iyi bir güvenlik seviyesine** sahip, ancak **kritik eksiklikler** var. Özellikle:

1. **CSRF koruması** mutlaka eklenmeli
2. **CORS** daraltılmalı
3. **Password policy** güçlendirilmeli
4. **Token storage** güvenliği artırılmalı

Bu düzeltmeler yapıldıktan sonra proje **production-ready** güvenlik seviyesine ulaşacaktır.

**Önerilen Güvenlik Skoru:** 7.5/10 → 9/10 (düzeltmelerden sonra)

