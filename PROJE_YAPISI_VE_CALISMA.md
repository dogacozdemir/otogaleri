# Proje Yapısı ve Çalışma Mantığı

Bu dokümanda **backend**, **frontend** ve **landing** uygulamalarının hiyerarşisi, nasıl çalıştığı ve API yapısı özetlenir.

---

## 1. Genel Hiyerarşi

Proje **üç ayrı uygulama** içerir; hepsi aynı repo kökünde yan yana durur:

```
otogaleri/
├── backend/      → Node.js + Express API (tek kaynak)
├── frontend/     → React SPA (dashboard / uygulama arayüzü)
└── landing/      → React statik site (tanıtım / pazarlama sayfası)
```

| Uygulama   | Teknoloji           | Rolü |
|-----------|---------------------|------|
| **Backend**  | Node.js, Express, TypeScript, MySQL | Tek API sunucusu; veritabanı, auth, iş kuralları |
| **Frontend** | React, Vite, TypeScript, Tailwind  | Giriş yapan kullanıcının kullandığı uygulama (dashboard) |
| **Landing**  | React, Vite, TypeScript, Tailwind  | Ürün tanıtımı; API çağırmaz, sadece statik içerik + linkler |

**Önemli:** Sadece **frontend** backend API’yi kullanır. **Landing** bağımsız bir site olup API’ye istek atmaz; “Uygulamaya Git” gibi linklerle frontend’e (veya harici URL’e) yönlendirir.

---

## 2. Nasıl Çalıştırılır?

### Backend

- **Geliştirme:** `cd backend && npm run dev` → **Nodemon** ile `src/server.ts` çalışır (dosya değişince yeniden başlar).
- **Port:** `.env` içinde `PORT`; yoksa **5005**.
- **Veritabanı:** MySQL; `.env` ile `OTG_DB_*` değişkenleri kullanılır.
- **Production:** `npm run build` (TypeScript → `dist/`), ardından `npm start` (`node dist/server.js`).

### Frontend

- **Geliştirme:** `cd frontend && npm run dev` → **Vite** dev server (varsayılan **5173**).
- **API adresi:** `VITE_API_BASE` (frontend `.env`) yoksa `http://localhost:5005/api` kullanılır.
- **Production:** `npm run build` → `dist/` çıktısı; bu klasör bir web sunucusuna (Nginx, CloudPanel vb.) servis ettirilir.

### Landing

- **Geliştirme:** `cd landing && npm run dev` → **Vite** dev server (genelde **5174** veya bir sonraki boş port).
- **API kullanmaz;** sadece React + statik sayfalar. Production’da ayrı bir domain/alt dizinde yayınlanabilir (örn. `akilligaleri.com` ana sayfa, `app.akilligaleri.com` frontend).

---

## 3. İletişim: Frontend ↔ Backend

- Frontend tüm veri işlemleri için **tek bir API base URL** kullanır: `VITE_API_BASE` veya varsayılan `http://localhost:5005/api`.
- **Axios** instance’ı (`frontend/src/api.ts`):
  - `baseURL`: bu API base.
  - Her istekte `Authorization: Bearer <token>` header’ı eklenir (token varsa).
  - 401 yanıtında token silinir ve kullanıcı `/login` sayfasına yönlendirilir.
- **CORS:** Backend, sadece `.env`’deki `ALLOWED_ORIGINS` / `ALLOWED_SUBDOMAINS` ile tanımlı origin’lere izin verir. Production’da frontend domain’i buraya eklenmelidir.

---

## 4. Backend API Yapısı

Tüm API route’ları **`/api`** prefix’i altında mount edilir (health ve static hariç).

### Base URL

- Geliştirme: `http://localhost:5005`
- API istekleri: `http://localhost:5005/api/...`

### Route Özeti (server.ts’e göre)

| Mount path        | Dosya / modül        | Açıklama |
|-------------------|----------------------|----------|
| `GET /health`     | server.ts            | Sağlık kontrolü (API prefix’siz) |
| `GET/POST /uploads/*` | server.ts         | Yüklenen dosyalar (statik) |
| ` /api/auth`      | authRoutes           | Giriş, kayıt, şifre değiştir, forgot/reset password |
| ` /api/branches`  | branchRoutes         | Şubeler |
| ` /api/staff`     | staffRoutes          | Personel |
| ` /api/vehicles`  | vehicleRoutes        | Araçlar (CRUD, görsel, maliyet vb.) |
| ` /api/analytics` | analyticsRoutes      | Analitik veriler |
| ` /api`           | fxAnalysisRoutes     | FX analiz (kendi path’leri bu prefix altında) |
| ` /api/customers` | customerRoutes       | Müşteriler |
| ` /api/accounting`| accountingRoutes     | Muhasebe |
| ` /api/followups`  | followupRoutes       | Takip kayıtları |
| ` /api/documents` | documentRoutes       | Dökümanlar |
| ` /api/reports`   | reportRoutes         | Raporlar |
| ` /api/search`    | searchRoutes         | Global arama |
| ` /api/inventory` | inventoryRoutes      | Envanter |
| ` /api/tenant`    | tenantRoutes         | Tenant / galeri ayarları |
| ` /api/installments` | installmentRoutes | Taksitler |
| ` /api/currency`  | currencyRoutes       | Kur bilgileri |
| ` /api/quotes`    | quoteRoutes          | Teklifler |
| ` /api/acl`       | aclRoutes            | Yetkilendirme (ACL) |

### Kimlik Doğrulama (Auth)

- **Public:** `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- **Korunan:** Diğer tüm `/api/*` istekleri `authMiddleware` ve (ilgili route’larda) `tenantGuard` ile korunur; **JWT** `Authorization: Bearer <token>` ile gönderilir.
- Token frontend’de `sessionStorage` (ve gerekirse `localStorage` fallback) içinde tutulur; key: `otogaleri_token`.

---

## 5. Veri Akışı (Özet)

1. **Kullanıcı** tarayıcıda frontend’i açar (örn. `http://localhost:5173` veya production’da `app.akilligaleri.com`).
2. **Giriş yoksa** `/login` veya `/signup`’a yönlendirilir; frontend `POST /api/auth/login` veya `signup` ile token alır ve kaydeder.
3. **Giriş sonrası** tüm isteklerde `api` (axios) otomatik `Authorization: Bearer <token>` ekler; backend JWT’yi doğrular, tenant bilgisini çıkarır.
4. **Backend** MySQL’e bağlanır; çoğu işlem **tenant_id** ile filtrelenir (multi-tenant).
5. **Landing** sadece tanıtım sayfasıdır; “Uygulamaya Git” gibi linklerle frontend veya harici URL’e gider; backend’e HTTP isteği yapmaz.

---

## 6. Özet Diyagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Kullanıcı (Tarayıcı)                       │
└─────────────────────────────────────────────────────────────────┘
     │                                      │
     │  Tanıtım / pazarlama                 │  Uygulama (dashboard)
     ▼                                      ▼
┌─────────────────┐                  ┌─────────────────┐
│     LANDING     │                  │    FRONTEND     │
│  (React, Vite)  │  "Uygulamaya Git" │  (React, Vite)  │
│  Statik sayfa   │ ────────────────►│  SPA            │
│  API yok        │                  │  VITE_API_BASE  │
└─────────────────┘                  └────────┬────────┘
                                             │
                                             │  HTTP + JWT
                                             │  (axios, /api/*)
                                             ▼
                                    ┌─────────────────┐
                                    │    BACKEND      │
                                    │ (Express, TS)   │
                                    │ Port: 5005      │
                                    │ /api/*          │
                                    └────────┬────────┘
                                             │
                                             │  MySQL (tenant_id)
                                             ▼
                                    ┌─────────────────┐
                                    │    MySQL DB     │
                                    │  (otogaleri)    │
                                    └─────────────────┘
```

---

## 7. Ortam Değişkenleri (Özet)

| Ortam   | Dosya           | Önemli değişkenler |
|---------|-----------------|--------------------|
| Backend | `backend/.env`  | `PORT`, `OTG_DB_*`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `SMTP_*` / `MAIL_*`, `FRONTEND_URL`, `STORAGE_PROVIDER`, AWS_* |
| Frontend| `frontend/.env` | `VITE_API_BASE` (backend API base URL) |
| Landing | `landing/.env`  | Genelde sadece build/domain ile ilgili; API yok |

Bu yapı sayesinde backend tek merkezde çalışır, frontend sadece bu API’yi tüketir; landing ise tamamen ayrı bir statik site olarak konumlandırılır.
