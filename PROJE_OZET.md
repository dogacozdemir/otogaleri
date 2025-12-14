# Otogaleri Yönetim Sistemi - Kapsamlı Proje Özeti

## 📋 İçindekiler
1. [Proje Genel Bakış](#proje-genel-bakış)
2. [Teknoloji Stack'i](#teknoloji-stacki)
3. [Dosya Yapısı ve Satır Sayıları](#dosya-yapısı-ve-satır-sayıları)
4. [Önemli Kod Parçaları](#önemli-kod-parçaları)
5. [Mimari Yapı](#mimari-yapı)
6. [Veritabanı Şeması](#veritabanı-şeması)
7. [API Endpoints](#api-endpoints)
8. [Özellikler ve Modüller](#özellikler-ve-modüller)

---

## Proje Genel Bakış

**Otogaleri Yönetim Sistemi**, çok şubeli, çok para birimli, profesyonel bir oto galeri yönetim yazılımıdır. Multi-tenant mimari ile her galeri kendi verileriyle izole çalışır.

### Temel Özellikler
- ✅ Multi-tenant yapı (her galeri kendi verileriyle izole)
- ✅ Çoklu şube yönetimi
- ✅ Çalışan ve prim yönetimi
- ✅ Araç yönetimi (alış, satış, masraf takibi)
- ✅ Çok para birimi desteği (TRY, USD, EUR, GBP)
- ✅ FreeCurrencyAPI entegrasyonu (otomatik kur çekme ve cache)
- ✅ Kur farkı dahil kar hesaplama
- ✅ Marka/model bazlı karlılık analizi
- ✅ Satış süresi analizi
- ✅ Taksitli satış yönetimi
- ✅ Müşteri yönetimi ve takip sistemi
- ✅ Fiyat teklifi (quote) yönetimi
- ✅ Envanter yönetimi
- ✅ Muhasebe modülü
- ✅ Raporlama ve analitik
- ✅ Çok dilli destek (TR/EN)
- ✅ Dark mode tema

---

## Teknoloji Stack'i

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Dil:** TypeScript
- **Veritabanı:** MySQL (mysql2)
- **Kimlik Doğrulama:** JWT (jsonwebtoken)
- **Güvenlik:** Helmet, bcryptjs, CORS
- **Dosya İşleme:** Multer, Sharp (görüntü işleme)
- **PDF:** PDFKit
- **Excel/CSV:** XLSX, csv-parse
- **Email:** Nodemailer
- **Cron Jobs:** node-cron
- **Validasyon:** Zod
- **Test:** Jest, Supertest

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Dil:** TypeScript
- **Routing:** React Router DOM
- **UI Kütüphanesi:** Radix UI (Headless components)
- **Styling:** Tailwind CSS
- **Grafikler:** Recharts
- **İkonlar:** Lucide React
- **Form Yönetimi:** React Hook Form (implicit)
- **HTTP Client:** Axios
- **Çoklu Dil:** i18next, react-i18next
- **Tarih:** date-fns

### Altyapı
- **Web Server:** Nginx (production)
- **Database:** MySQL
- **API:** FreeCurrencyAPI (döviz kurları)

---

## Dosya Yapısı ve Satır Sayıları

### Proje Kök Dizini
```
otogaleri/
├── backend/                    # Backend uygulaması
│   ├── src/                   # Kaynak kodlar
│   ├── dist/                  # Derlenmiş JavaScript dosyaları
│   ├── migrations/            # Veritabanı migration dosyaları
│   ├── tests/                 # Test dosyaları
│   ├── uploads/               # Yüklenen dosyalar
│   ├── schema.sql             # Veritabanı şeması (384 satır)
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # Frontend uygulaması
│   ├── src/                   # Kaynak kodlar
│   ├── dist/                  # Build çıktıları
│   ├── package.json
│   └── vite.config.ts
├── README.md                   # Ana dokümantasyon
├── PROJE_DOKUMANTASYONU.md     # Detaylı dokümantasyon
├── MULTI_CURRENCY_DOCUMENTATION.md
├── QUOTE_MODULE_SUMMARY.md
├── DEPLOYMENT.md
└── nginx-config.conf
```

### En Büyük Dosyalar (Satır Sayısına Göre)

#### Frontend
1. **VehiclesPage.tsx** - 1,376 satır (Ana araç yönetim sayfası)
2. **InventoryPage.tsx** - 1,327 satır (Envanter yönetimi)
3. **CustomerDetails.tsx** - 1,293 satır (Müşteri detay sayfası)
4. **AnalyticsPage.tsx** - 1,248 satır (Analitik ve raporlar)
5. **AccountingPage.tsx** - 1,138 satır (Muhasebe sayfası)
6. **QuotesPage.tsx** - 936 satır (Fiyat teklifleri)
7. **DashboardPage.tsx** - 862 satır (Ana dashboard)
8. **CustomerList.tsx** - 822 satır (Müşteri listesi)
9. **SidebarLayout.tsx** - 478 satır (Yan menü layout)
10. **VehicleFilters.tsx** - 465 satır (Araç filtreleme)

#### Backend
1. **accountingController.ts** - 1,308 satır (Muhasebe controller)
2. **analyticsController.ts** - 773 satır (Analitik controller)
3. **inventoryController.ts** - 765 satır (Envanter controller)
4. **installmentController.ts** - 724 satır (Taksit controller)
5. **quoteController.ts** - 582 satır (Fiyat teklifi controller)
6. **vehicleController.ts** - 517 satır (Araç controller)
7. **pdfService.ts** - 458 satır (PDF oluşturma servisi)
8. **customerController.ts** - 352 satır (Müşteri controller)
9. **bulkImportController.ts** - 346 satır (Toplu import)
10. **followupController.ts** - 320 satır (Takip controller)

### Backend Yapısı
```
backend/src/
├── config/
│   ├── database.ts            # MySQL connection pool
│   └── currency.ts            # Para birimi konfigürasyonu
├── controllers/               # 24 controller dosyası
│   ├── authController.ts      # Kimlik doğrulama
│   ├── vehicleController.ts   # Araç işlemleri (517 satır)
│   ├── analyticsController.ts # Analitik (773 satır)
│   ├── accountingController.ts # Muhasebe (1,308 satır)
│   ├── customerController.ts  # Müşteri yönetimi
│   ├── inventoryController.ts # Envanter (765 satır)
│   ├── installmentController.ts # Taksit (724 satır)
│   ├── quoteController.ts     # Fiyat teklifi (582 satır)
│   └── ... (16 diğer controller)
├── middleware/                # 6 middleware dosyası
│   ├── auth.ts                # JWT authentication
│   ├── tenantGuard.ts         # Tenant izolasyon kontrolü
│   ├── acl.ts                 # Yetkilendirme kontrolü
│   ├── inputSanitizer.ts      # Input temizleme
│   ├── paginationValidator.ts # Sayfalama validasyonu
│   └── subdomainTenantResolver.ts
├── routes/                    # 18 route dosyası
│   ├── authRoutes.ts
│   ├── vehicleRoutes.ts
│   ├── analyticsRoutes.ts
│   └── ... (15 diğer route)
├── services/                  # 6 servis dosyası
│   ├── fxCacheService.ts      # Döviz kuru cache servisi
│   ├── currencyService.ts     # Para birimi servisi
│   ├── pdfService.ts          # PDF oluşturma (458 satır)
│   ├── emailService.ts        # Email gönderimi
│   ├── installmentAlertService.ts # Taksit uyarıları
│   └── bulkImportService.ts   # Toplu import
├── scripts/
│   └── runMigrations.ts       # Migration çalıştırma
└── server.ts                  # Express server (106 satır)
```

### Frontend Yapısı
```
frontend/src/
├── api.ts                     # Axios konfigürasyonu (30 satır)
├── App.tsx                    # Ana uygulama component (62 satır)
├── main.tsx                   # Entry point
├── i18n.ts                    # Çoklu dil konfigürasyonu (322 satır)
├── index.css                  # Global stiller
├── pages/                     # 12 sayfa component
│   ├── VehiclesPage.tsx       # 1,376 satır
│   ├── InventoryPage.tsx      # 1,327 satır
│   ├── CustomerDetails.tsx    # 1,293 satır
│   ├── AnalyticsPage.tsx      # 1,248 satır
│   ├── AccountingPage.tsx     # 1,138 satır
│   ├── QuotesPage.tsx         # 936 satır
│   ├── DashboardPage.tsx       # 862 satır
│   ├── CustomerList.tsx       # 822 satır
│   ├── SettingsPage.tsx       # 457 satır
│   ├── AuthPage.tsx           # 444 satır
│   ├── BranchesPage.tsx
│   └── StaffPage.tsx
├── components/                # 56 component dosyası
│   ├── ui/                    # Radix UI wrapper components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   └── ... (15+ diğer UI component)
│   ├── vehicles/              # Araç ile ilgili components
│   │   ├── VehicleTable.tsx   # 428 satır
│   │   ├── VehicleAddEditModal.tsx # 422 satır
│   │   ├── VehicleFilters.tsx # 465 satır
│   │   ├── VehicleDetailModal.tsx
│   │   └── ... (10+ diğer component)
│   ├── charts/                # Grafik components
│   │   ├── BrandProfitChart.tsx
│   │   ├── SalesDurationChart.tsx
│   │   └── TopProfitableChart.tsx
│   ├── tables/                # Tablo components
│   ├── SidebarLayout.tsx      # 478 satır
│   ├── GlobalSearch.tsx       # 447 satır
│   ├── VehicleImageUpload.tsx # 419 satır
│   └── ... (diğer components)
├── contexts/                  # 3 context dosyası
│   ├── ThemeContext.tsx       # Tema yönetimi
│   ├── TenantContext.tsx      # Tenant bilgisi
│   └── CurrencyRatesContext.tsx # Döviz kurları
├── hooks/                     # 5 custom hook
│   ├── useVehiclesData.ts    # 341 satır (Araç veri yönetimi)
│   ├── useCurrency.ts         # Para birimi hook
│   ├── use-toast.ts           # Toast bildirimleri
│   ├── useCountUp.ts          # Sayı animasyonu
│   └── use-mobile.tsx         # Mobil cihaz kontrolü
├── lib/                       # 3 utility dosyası
│   ├── formatters.ts          # Formatlama fonksiyonları
│   ├── utils.ts               # Genel utility fonksiyonları
│   └── themes.ts              # Tema tanımları
├── types/                     # 2 type dosyası
│   ├── analytics.ts           # Analitik tipleri
│   └── dashboard.ts            # Dashboard tipleri
└── utils/                     # 1 utility dosyası
    └── vehicleUtils.ts        # Araç utility fonksiyonları
```

### Test Yapısı
```
backend/tests/
├── integration/               # 9 integration test
│   ├── tenant-lifecycle.test.ts # 321 satır
│   ├── deployment-migration.test.ts # 309 satır
│   ├── limit-quota.test.ts   # 295 satır
│   ├── data-integrity.test.ts # 295 satır
│   ├── load-concurrency.test.ts # 275 satır
│   ├── auth-authorization.test.ts # 265 satır
│   ├── tenant-isolation.test.ts # 261 satır
│   └── api-integration.test.ts # 258 satır
├── unit/                      # 2 unit test
├── security/                  # 1 security test
│   └── security.test.ts      # 365 satır
├── factories/                 # 5 factory dosyası
├── helpers/                   # 2 helper dosyası
└── setup/                     # 3 setup dosyası
```

### Migration Dosyaları
```
backend/migrations/
├── ALL_MIGRATIONS_AT_ONCE.sql # 371 satır
├── seed_data.sql              # 365 satır
├── 000_create_migration_tracking.sql
├── add_acl_permissions.sql
├── add_arrival_date.sql
├── add_custom_rate_to_vehicle_costs.sql
├── add_followup_and_documents.sql
├── add_installment_reminder_tracking.sql
├── add_installment_sales.sql
├── add_inventory_currency_support.sql
├── add_inventory_tables.sql
├── add_tenant_settings.sql
├── add_track_stock_to_inventory.sql
├── add_vehicle_images.sql
├── add_vehicle_number_index.sql
├── add_vehicle_number.sql
├── add_vehicle_quotes.sql
├── merge_month_year_to_production_date.sql
├── remove_door_seat.sql
└── remove_ps_tw_add_plate_number.sql
```

---

## Önemli Kod Parçaları

### 1. Backend - Server Başlatma (`backend/src/server.ts`)

```typescript
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { testConnection } from "./config/database";
import authRoutes from "./routes/authRoutes";
// ... diğer route importları

const app = express();

// CORS ve güvenlik ayarları
app.use(cors({
  origin: true,
  credentials: true,
}));

// Static file serving for uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      "img-src": ["'self'", "data:", "http:", "https:"],
    },
  },
}));

app.use(express.json());

// Route tanımlamaları
app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/vehicles", vehicleRoutes);
// ... diğer route'lar

const PORT = process.env.PORT || 5005;

async function start() {
  try {
    await testConnection();
    console.log("[otogaleri] Database connection OK");
  } catch (err) {
    console.error("[otogaleri] Database connection FAILED", err);
  }

  app.listen(PORT, () => {
    console.log(`Otogaleri backend listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("[otogaleri] Fatal startup error", err);
});
```

### 2. Authentication Middleware (`backend/src/middleware/auth.ts`)

```typescript
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { dbPool } from "../config/database";

const JWT_SECRET = process.env.JWT_SECRET || "otogaleri-secret-change-in-production";

// In-memory cache for user active status
const userCache = new Map<string, { isActive: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface AuthRequest extends Request {
  tenantId?: number;
  userId?: number;
  userRole?: string;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      tenantId: number;
      userId: number;
      role: string;
    };
    
    // Cache kontrolü ile performans optimizasyonu
    const cachedStatus = getCachedUserStatus(decoded.userId, decoded.tenantId);
    
    if (cachedStatus !== null) {
      if (!cachedStatus) {
        return res.status(401).json({ error: "User account is inactive" });
      }
    } else {
      // Database kontrolü
      const [userRows] = await dbPool.query(
        "SELECT is_active FROM users WHERE id = ? AND tenant_id = ?",
        [decoded.userId, decoded.tenantId]
      );
      const user = (userRows as any[])[0];
      
      if (!user || !user.is_active) {
        return res.status(401).json({ error: "User account is inactive" });
      }
      
      setCachedUserStatus(decoded.userId, decoded.tenantId, user.is_active);
    }
    
    req.tenantId = decoded.tenantId;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function generateToken(tenantId: number, userId: number, role: string): string {
  return jwt.sign({ tenantId, userId, role }, JWT_SECRET, { expiresIn: "7d" });
}
```

### 3. Döviz Kuru Cache Servisi (`backend/src/services/fxCacheService.ts`)

```typescript
import { dbPool } from "../config/database";
import { getLatestRate, getHistoricalRate, SupportedCurrency } from "./currencyService";

export async function getOrFetchRate(
  base: SupportedCurrency,
  quote: SupportedCurrency,
  date: string
): Promise<number> {
  // Aynı para birimi ise 1 döndür
  if (base === quote) {
    return 1;
  }

  // Önce cache'den kontrol et
  const [cached] = await dbPool.query(
    "SELECT rate FROM fx_rates WHERE base_currency = ? AND quote_currency = ? AND rate_date = ?",
    [base, quote, date]
  );

  if (Array.isArray(cached) && cached.length > 0) {
    return (cached[0] as any).rate;
  }

  // 7 gün içinde en yakın tarihi bul
  const [closestCached] = await dbPool.query(
    `SELECT rate, rate_date FROM fx_rates 
     WHERE base_currency = ? AND quote_currency = ? 
     AND rate_date BETWEEN DATE_SUB(?, INTERVAL 7 DAY) AND DATE_ADD(?, INTERVAL 7 DAY)
     ORDER BY ABS(DATEDIFF(rate_date, ?)) ASC
     LIMIT 1`,
    [base, quote, date, date, date]
  );

  if (Array.isArray(closestCached) && closestCached.length > 0) {
    return (closestCached[0] as any).rate;
  }

  // API'den çek ve cache'le
  let rate: number;
  const today = new Date().toISOString().slice(0, 10);

  try {
    if (date === today) {
      const fxRate = await getLatestRate(base, quote);
      rate = fxRate.rate;
    } else {
      const fxRate = await getHistoricalRate(date, base, quote);
      rate = fxRate.rate;
    }

    // Cache'e kaydet
    await dbPool.query(
      "INSERT INTO fx_rates (base_currency, quote_currency, rate, rate_date, source) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE rate = VALUES(rate)",
      [base, quote, rate, date, "freecurrencyapi"]
    );
  } catch (error: any) {
    // Fallback mekanizmaları
    // USD üzerinden dönüşüm dene
    // Son çare olarak en son kuru kullan
  }

  return rate;
}
```

### 4. Frontend - API Konfigürasyonu (`frontend/src/api.ts`)

```typescript
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5005/api";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Token ekleme
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("otogaleri_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - 401 durumunda logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("otogaleri_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

### 5. Frontend - Ana Uygulama (`frontend/src/App.tsx`)

```typescript
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TenantProvider } from "./contexts/TenantContext";
import { CurrencyRatesProvider } from "./contexts/CurrencyRatesContext";
import { Toaster } from "./components/ui/toaster";
import { ErrorBoundary } from "./components/ErrorBoundary";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import VehiclesPage from "./pages/VehiclesPage";
// ... diğer importlar
import SidebarLayout from "./components/SidebarLayout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TenantProvider>
          <CurrencyRatesProvider>
          <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/signup" element={<AuthPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <SidebarLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="vehicles" element={<VehiclesPage />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="customers" element={<CustomerList />} />
            <Route path="customers/:id" element={<CustomerDetails />} />
            <Route path="quotes" element={<QuotesPage />} />
            <Route path="accounting" element={<AccountingPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          </Routes>
          <Toaster />
          </CurrencyRatesProvider>
        </TenantProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
```

### 6. Veritabanı Bağlantı Havuzu (`backend/src/config/database.ts`)

```typescript
import mysql from "mysql2/promise";

const {
  OTG_DB_HOST,
  OTG_DB_PORT,
  OTG_DB_USER,
  OTG_DB_PASSWORD,
  OTG_DB_NAME,
} = process.env;

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
```

---

## Mimari Yapı

### Multi-Tenant Mimarisi

Proje, **multi-tenant** mimari kullanarak her galerinin (tenant) verilerini izole eder:

1. **Tenant İzolasyonu:**
   - Her tenant'ın kendi `tenant_id`'si var
   - Tüm tablolarda `tenant_id` foreign key olarak bulunur
   - Her sorgu `WHERE tenant_id = ?` ile filtrelenir
   - `tenantGuard` middleware ile ekstra güvenlik

2. **Kullanıcı Yönetimi:**
   - Her tenant'ın kendi kullanıcıları var
   - Roller: `owner`, `admin`, `manager`, `sales`, `accounting`
   - JWT token'da `tenantId`, `userId`, `role` bilgileri taşınır

3. **Veri Güvenliği:**
   - `authMiddleware` her request'te token doğrular
   - `tenantGuard` tenant varlığını kontrol eder
   - ACL (Access Control List) ile yetkilendirme

### Katmanlı Mimari

```
┌─────────────────────────────────────┐
│         Frontend (React)             │
│  - Pages, Components, Hooks          │
│  - Context API (State Management)    │
└──────────────┬──────────────────────┘
               │ HTTP/REST
┌──────────────▼──────────────────────┐
│      Backend API (Express)          │
│  ┌──────────────────────────────┐   │
│  │ Routes (Endpoint Definitions) │   │
│  └──────────┬───────────────────┘   │
│  ┌──────────▼───────────────────┐   │
│  │ Middleware (Auth, Validation) │   │
│  └──────────┬───────────────────┘   │
│  ┌──────────▼───────────────────┐   │
│  │ Controllers (Business Logic)  │   │
│  └──────────┬───────────────────┘   │
│  ┌──────────▼───────────────────┐   │
│  │ Services (External APIs, etc)│   │
│  └──────────┬───────────────────┘   │
└──────────────┬──────────────────────┘
               │ SQL Queries
┌──────────────▼──────────────────────┐
│      Database (MySQL)                │
│  - Multi-tenant tables               │
│  - FX rates cache                    │
└──────────────────────────────────────┘
```

### State Management

Frontend'de state yönetimi için:
- **React Context API:** Theme, Tenant, Currency Rates
- **Custom Hooks:** `useVehiclesData`, `useCurrency`
- **Local State:** Component bazlı `useState`, `useReducer`

---

## Veritabanı Şeması

### Ana Tablolar

1. **tenants** - Galeri bilgileri
   - `id`, `name`, `slug`, `default_currency`, `country`

2. **users** - Kullanıcılar (tenant'a bağlı)
   - `id`, `tenant_id`, `name`, `email`, `password_hash`, `role`, `is_active`

3. **branches** - Şubeler
   - `id`, `tenant_id`, `name`, `code`, `city`, `address`, `phone`

4. **staff** - Çalışanlar
   - `id`, `tenant_id`, `branch_id`, `name`, `email`, `phone`, `role`

5. **vehicles** - Araçlar (Ana tablo)
   - `id`, `tenant_id`, `vehicle_number`, `branch_id`
   - `maker`, `model`, `year`, `chassis_no`, `plate_number`
   - `purchase_amount`, `purchase_currency`, `purchase_fx_rate_to_base`
   - `purchase_date`, `arrival_date`
   - `is_sold`, `status`, `stock_status`

6. **vehicle_costs** - Araç masrafları
   - `id`, `vehicle_id`, `amount`, `currency`, `fx_rate_to_base`
   - `cost_type`, `description`, `date`

7. **vehicle_sales** - Araç satışları
   - `id`, `vehicle_id`, `sale_amount`, `sale_currency`, `sale_fx_rate_to_base`
   - `sale_date`, `customer_id`, `staff_id`

8. **vehicle_installment_sales** - Taksitli satışlar
   - `id`, `vehicle_id`, `total_amount`, `down_payment`
   - `installment_count`, `installment_amount`, `currency`
   - `status`, `sale_date`

9. **vehicle_installment_payments** - Taksit ödemeleri
   - `id`, `installment_sale_id`, `amount`, `currency`, `fx_rate_to_base`
   - `payment_date`, `installment_number`

10. **customers** - Müşteriler
    - `id`, `tenant_id`, `name`, `email`, `phone`, `address`

11. **quotes** - Fiyat teklifleri
    - `id`, `tenant_id`, `customer_id`, `vehicle_id`
    - `amount`, `currency`, `valid_until`, `status`

12. **inventory** - Envanter
    - `id`, `tenant_id`, `name`, `category`, `quantity`, `unit_price`, `currency`

13. **fx_rates** - Döviz kurları cache
    - `id`, `base_currency`, `quote_currency`, `rate`, `rate_date`, `source`

14. **documents** - Belgeler
    - `id`, `tenant_id`, `related_type`, `related_id`, `file_path`, `expiry_date`

15. **followups** - Takip görevleri
    - `id`, `tenant_id`, `customer_id`, `type`, `due_date`, `status`

---

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Yeni galeri kaydı
- `POST /api/auth/login` - Giriş

### Vehicles (Araçlar)
- `GET /api/vehicles` - Araç listesi (pagination, filter, search)
- `POST /api/vehicles` - Yeni araç ekle
- `GET /api/vehicles/:id` - Araç detayı
- `PUT /api/vehicles/:id` - Araç güncelle
- `DELETE /api/vehicles/:id` - Araç sil
- `GET /api/vehicles/:id/profit` - Araç kar hesaplama
- `POST /api/vehicles/:id/sell` - Araç satış işlemi

### Vehicle Costs (Araç Masrafları)
- `GET /api/vehicles/:id/costs` - Araç masrafları
- `POST /api/vehicles/:id/costs` - Masraf ekle
- `PUT /api/vehicles/:id/costs/:costId` - Masraf güncelle
- `DELETE /api/vehicles/:id/costs/:costId` - Masraf sil

### Vehicle Images (Araç Görselleri)
- `POST /api/vehicles/:id/images` - Görsel yükle
- `DELETE /api/vehicles/:id/images/:imageId` - Görsel sil
- `PUT /api/vehicles/:id/images/:imageId/primary` - Birincil görsel yap

### Installments (Taksitler)
- `POST /api/vehicles/:id/installments` - Taksitli satış oluştur
- `GET /api/installments` - Taksit listesi
- `POST /api/installments/:id/payments` - Taksit ödemesi ekle
- `GET /api/installments/overdue` - Geciken taksitler

### Analytics (Analitik)
- `GET /api/analytics/brand-profit` - Marka bazlı kar analizi
- `GET /api/analytics/model-profit` - Model bazlı kar analizi
- `GET /api/analytics/sales-duration` - Satış süresi analizi
- `GET /api/analytics/top-profitable` - En karlı araçlar
- `GET /api/analytics/monthly-comparison` - Aylık karşılaştırma

### Customers (Müşteriler)
- `GET /api/customers` - Müşteri listesi
- `POST /api/customers` - Müşteri ekle
- `GET /api/customers/:id` - Müşteri detayı
- `PUT /api/customers/:id` - Müşteri güncelle

### Quotes (Fiyat Teklifleri)
- `GET /api/quotes` - Teklif listesi
- `POST /api/quotes` - Teklif oluştur
- `PUT /api/quotes/:id` - Teklif güncelle
- `POST /api/quotes/:id/convert` - Teklifi satışa çevir

### Inventory (Envanter)
- `GET /api/inventory` - Envanter listesi
- `POST /api/inventory` - Ürün ekle
- `PUT /api/inventory/:id` - Ürün güncelle
- `POST /api/inventory/:id/adjust` - Stok ayarlama

### Accounting (Muhasebe)
- `GET /api/accounting/transactions` - İşlem listesi
- `POST /api/accounting/transactions` - İşlem ekle
- `GET /api/accounting/reports` - Muhasebe raporları

### Branches (Şubeler)
- `GET /api/branches` - Şube listesi
- `POST /api/branches` - Şube oluştur

### Staff (Çalışanlar)
- `GET /api/staff` - Çalışan listesi
- `POST /api/staff` - Çalışan ekle

### Currency (Para Birimi)
- `GET /api/currency/rates` - Güncel kurlar
- `POST /api/currency/rates/custom` - Özel kur tanımla

### Search (Arama)
- `GET /api/search` - Global arama

---

## Özellikler ve Modüller

### 1. Araç Yönetimi Modülü
- **Araç Ekleme/Düzenleme:** Detaylı form, görsel yükleme
- **Araç Listesi:** Filtreleme, arama, sayfalama
- **Araç Satışı:** Tek seferde veya taksitli satış
- **Masraf Takibi:** Araç bazlı masraf kayıtları
- **Kar Hesaplama:** Kur farkı dahil otomatik kar hesaplama
- **Görsel Yönetimi:** Çoklu görsel yükleme, birincil görsel seçimi

### 2. Taksitli Satış Modülü
- **Taksit Planı Oluşturma:** Peşin, kapora, taksit sayısı
- **Ödeme Takibi:** Taksit ödemelerini kaydetme
- **Gecikme Uyarıları:** Otomatik uyarı sistemi
- **Durum Takibi:** Aktif, tamamlanmış, gecikmiş

### 3. Müşteri Yönetimi Modülü
- **Müşteri Kayıtları:** Detaylı müşteri bilgileri
- **Satış Geçmişi:** Müşterinin satın aldığı araçlar
- **Takip Görevleri:** Müşteri takip listesi
- **Belge Yönetimi:** Müşteri belgeleri

### 4. Fiyat Teklifi Modülü
- **Teklif Oluşturma:** Müşteriye özel teklif
- **Teklif Yönetimi:** Onay, red, süresi dolmuş
- **Satışa Dönüştürme:** Teklifi satışa çevirme

### 5. Envanter Yönetimi Modülü
- **Ürün/Servis Kayıtları:** Kategori bazlı envanter
- **Stok Takibi:** Miktar, birim fiyat
- **Çok Para Birimi:** Her ürün için para birimi
- **Stok Ayarlamaları:** Artırma/azaltma işlemleri

### 6. Analitik ve Raporlama Modülü
- **Marka/Model Analizi:** Karlılık analizi
- **Satış Süresi Analizi:** Ortalama satış süreleri
- **En Karlı Araçlar:** Sıralama ve filtreleme
- **Aylık Karşılaştırma:** Trend analizi
- **Grafikler:** Recharts ile görselleştirme

### 7. Muhasebe Modülü
- **Gelir/Gider Kayıtları:** İşlem kayıtları
- **Raporlar:** Gelir-gider raporları
- **Para Birimi Dönüşümleri:** Otomatik kur hesaplama

### 8. Çok Para Birimi Sistemi
- **Desteklenen Para Birimleri:** TRY, USD, EUR, GBP
- **Otomatik Kur Çekme:** FreeCurrencyAPI entegrasyonu
- **Kur Cache:** Veritabanında cache'leme
- **Tarihsel Kurlar:** Geçmiş tarihli kur desteği
- **Özel Kur Tanımlama:** Manuel kur girişi

### 9. Güvenlik ve Yetkilendirme
- **JWT Authentication:** Token tabanlı kimlik doğrulama
- **Role-Based Access Control:** Rol bazlı yetkilendirme
- **Tenant Isolation:** Veri izolasyonu
- **Input Sanitization:** XSS ve SQL injection koruması
- **Helmet:** HTTP güvenlik başlıkları

### 10. Çoklu Dil Desteği
- **Desteklenen Diller:** Türkçe, İngilizce
- **i18next:** Çeviri yönetimi
- **Dinamik Dil Değişimi:** Runtime dil değiştirme

### 11. Tema Sistemi
- **Dark Mode:** Karanlık tema desteği
- **Light Mode:** Açık tema
- **Otomatik Geçiş:** Sistem tercihine göre

---

## İstatistikler

- **Toplam Dosya Sayısı:** ~195 dosya (node_modules hariç)
- **Toplam Kod Satırı:** ~37,566 satır
- **Backend Controller:** 24 dosya
- **Backend Route:** 18 dosya
- **Backend Middleware:** 6 dosya
- **Backend Service:** 6 dosya
- **Frontend Page:** 12 sayfa
- **Frontend Component:** 56 component
- **Test Dosyası:** 12+ test dosyası
- **Migration Dosyası:** 20+ migration

---

## Geliştirme Durumu

### Tamamlanan Özellikler ✅
- Multi-tenant authentication ve authorization
- Tenant (galeri) kayıt ve yönetimi
- Şube (branch) CRUD işlemleri
- Çalışan (staff) yönetimi
- Araç (vehicle) CRUD işlemleri
- Araç masraf (cost) yönetimi
- Araç satış işlemleri
- Taksitli satış sistemi
- FreeCurrencyAPI entegrasyonu ve FX rate cache
- Kur farkı dahil kar hesaplama
- Marka/model bazlı karlılık analizi
- Satış süresi analizi
- Müşteri yönetimi
- Fiyat teklifi sistemi
- Envanter yönetimi
- Muhasebe modülü
- Raporlama ve analitik
- Çok dilli destek (TR/EN)
- Dark mode tema
- Görsel yükleme ve yönetimi
- Toplu import (bulk import)

### Gelecek Geliştirmeler ⏳
- Dashboard grafikleri geliştirme
- Rapor export (PDF/Excel) iyileştirme
- Prim yönetimi ve hesaplama detaylandırma
- Gelişmiş arama ve filtreleme
- Bildirimler sistemi
- Mobil uygulama
- API dokümantasyonu (Swagger/OpenAPI)

---

## Kurulum ve Çalıştırma

### Backend
```bash
cd backend
npm install
cp .env.example .env
# .env dosyasını düzenle (DB ve API key'leri)
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Veritabanı
```bash
mysql -u root -p < backend/schema.sql
```

---

## Notlar

- Proje production-ready durumda
- Güvenlik önlemleri alınmış (JWT, input sanitization, CORS, Helmet)
- Performans optimizasyonları yapılmış (cache, connection pooling)
- Test coverage mevcut (integration, unit, security tests)
- Migration sistemi ile veritabanı versiyonlama
- TypeScript ile tip güvenliği
- Modern React patterns (hooks, context, custom hooks)

---

*Son Güncelleme: 2024*

