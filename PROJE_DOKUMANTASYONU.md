# Otogaleri Yönetim Sistemi - Proje Dokümantasyonu

## 📋 İçindekiler
1. [Sayfa Yapısı ve İşlevleri](#sayfa-yapısı-ve-işlevleri)
2. [Teknoloji Stack'i](#teknoloji-stacki)
3. [Tasarım Sistemi](#tasarım-sistemi)

---

## 📄 Sayfa Yapısı ve İşlevleri

### 1. **AuthPage** (`/login`, `/signup`)
**Ne İşe Yarar:**
- Kullanıcı girişi ve yeni galeri kaydı
- Multi-tenant sistem için galeri hesabı oluşturma
- JWT token tabanlı kimlik doğrulama

**Özellikler:**
- Login/Signup modları arasında geçiş
- Galeri adı, e-posta ve şifre ile kayıt
- Otomatik tenant slug oluşturma
- Güvenli form validasyonu

---

### 2. **DashboardPage** (`/dashboard`)
**Ne İşe Yarar:**
- Ana kontrol paneli ve genel bakış
- İşletme performans metrikleri
- Hızlı erişim butonları

**Özellikler:**
- **KPI Kartları:**
  - Toplam Araç (Satılmamış)
  - Toplam Satış
  - Taksiti Devam Eden Araç
  - Şube Sayısı
  
- **Haftalık Grafikler:**
  - Haftalık Araç Çıkışı (Bar Chart)
  - Haftalık Ürün/Servis Çıkışı (Bar Chart)
  
- **Performans Widget'ları:**
  - Satış Performansı (Aylık karşılaştırma, trend göstergeleri)
  - Stok Durumu (Toplam ürün, trend analizi)
  
- **Takip ve Uyarılar:**
  - Süresi Dolacak Belgeler (30 gün içinde)
  - Aktif Taksitler (Gecikmiş taksit uyarıları)
  - Takip Görevleri (Müşteri takip listesi)
  - Son Aktiviteler (Sistem aktivite logları)

**Kullanılan Teknolojiler:**
- Recharts (Bar Chart)
- date-fns (Tarih formatlama)
- React Router (Navigasyon)

---

### 3. **VehiclesPage** (`/vehicles`)
**Ne İşe Yarar:**
- Araç envanter yönetimi
- Araç ekleme, düzenleme, silme
- Araç satış işlemleri
- Araç masraf takibi
- Araç görsel yönetimi

**Özellikler:**
- Araç listesi (tablo görünümü)
- Gelişmiş filtreleme ve arama
- Araç ekleme/düzenleme formu
- Araç satış formu (peşin/taksitli)
- Araç masraf ekleme (kategori bazlı)
- Araç görsel yükleme
- Kar hesaplama ve analiz
- Kur farkı analizi
- Araç detay modalı

**Kullanılan Teknolojiler:**
- React Webcam (Görsel çekme)
- Multer (Dosya yükleme)
- Sharp (Görsel işleme - backend)

---

### 4. **CustomerList** (`/customers`)
**Ne İşe Yarar:**
- Müşteri yönetimi ve segmentasyonu
- Müşteri arama ve filtreleme
- Müşteri ekleme

**Özellikler:**
- **Segmentasyon:**
  - VIP Müşteriler (Yüksek harcama)
  - Düzenli Müşteriler
  - Yeni Müşteriler (Son 1 ay)
  
- **Görünüm Modları:**
  - Liste görünümü (Card layout)
  - Tablo görünümü (Detaylı tablo)
  
- **Filtreleme:**
  - İsim, telefon, e-posta ile arama
  - Harcama miktarına göre filtreleme
  - Satış sayısına göre filtreleme
  - Son satış tarihine göre filtreleme
  - Sıralama (isim, harcama, satış sayısı, son satış)

**KPI Metrikleri:**
- Tüm Müşteriler
- Yeni Müşteriler
- VIP Müşteriler

---

### 5. **CustomerDetails** (`/customers/:id`)
**Ne İşe Yarar:**
- Müşteri detay sayfası
- Müşteri satış geçmişi
- Müşteri takip görevleri
- Müşteri belgeleri

**Özellikler:**
- Müşteri bilgileri (İletişim, adres, notlar)
- Satın aldığı araçlar listesi
- Taksit ödeme geçmişi
- Takip görevleri (Call, SMS, Email)
- Belgeler (Sigorta, muayene vb.)
- Müşteri düzenleme

---

### 6. **AnalyticsPage** (`/analytics`)
**Ne İşe Yarar:**
- İş analitiği ve raporlama
- Performans analizleri
- Özelleştirilmiş raporlar

**Özellikler:**
- **3 Ana Sekme:**

  1. **Analitikler:**
     - Marka Bazlı Kar Analizi (Bar Chart)
     - En Karlı Araçlar (Bar Chart)
     - Satış Süresi Analizi (Bar Chart)
     - Detaylı tablo görünümleri
  
  2. **Araç Raporları:**
     - Ortalama Satış Süresi (İstatistikler)
     - Marka Bazlı Kar Analizi (Grafik + Tablo)
     - Model Bazlı Kar Analizi (Grafik + Tablo)
     - En Karlı Araçlar (Tablo)
     - Aylık Karşılaştırma (Line Chart)
     - Kategori Bazlı Harcama Analizi (Bar Chart)
  
  3. **Özelleştirilmiş Raporlar:**
     - Rapor oluşturma (PDF, Excel, CSV, HTML)
     - Zamanlanmış raporlar (Günlük, Haftalık, Aylık)
     - Rapor çalıştırma ve silme

**Kullanılan Teknolojiler:**
- Recharts (Bar Chart, Line Chart)
- Custom chart component'leri

---

### 7. **AccountingPage** (`/accounting`)
**Ne İşe Yarar:**
- Muhasebe yönetimi
- Gelir-gider takibi
- Finansal analizler

**Özellikler:**
- **3 Ana Sekme:**

  1. **Genel Bakış:**
     - Gelir ve Gider Trendi (Line Chart)
     - Yıllık Gelir-Gider Analizi (Bar Chart)
     - KPI Metrikleri:
       - Toplam Gelir
       - Toplam Gider
       - Net Gelir
       - Bugünkü Gelir
  
  2. **Gelirler:**
     - Gelir listesi (Araç satışları + Manuel gelirler)
     - Gelir ekleme/düzenleme/silme
     - Kategori bazlı filtreleme
     - Tarih bazlı filtreleme
  
  3. **Giderler:**
     - Gider listesi
     - Gider ekleme/düzenleme/silme
     - Kategori bazlı filtreleme
     - Araç bazlı gider takibi

**Tarih Filtreleme:**
- Son 7 gün
- Son 30 gün
- Son 90 gün
- Tüm tarihler
- Özel tarih aralığı

**Kullanılan Teknolojiler:**
- Recharts (Line Chart, Bar Chart)

---

### 8. **InventoryPage** (`/inventory`)
**Ne İşe Yarar:**
- Stok yönetimi
- Ürün/servis envanteri
- Stok giriş-çıkış işlemleri

**Özellikler:**
- **3 Ana Sekme:**

  1. **Ürünler:**
     - Tüm ürünler listesi
     - Ürün ekleme (SKU, kategori, birim, fiyatlar)
     - Stok takibi (Açık/Kapalı)
     - Satış/Servis için işaretleme
     - Stok giriş-çıkış işlemleri
     - Ürün geçmişi görüntüleme
     - Kritik stok uyarıları
  
  2. **Satış:**
     - Satış için işaretlenmiş ürünler
     - Satış fiyatları ve stok durumu
  
  3. **Servis:**
     - Servis için işaretlenmiş ürünler
     - Servis kullanım takibi

**KPI Metrikleri:**
- Toplam Ürün
- Kritik Stok (Düşük stoklu ürünler)
- Satış Ürünleri
- Servis Ürünleri

**Stok İşlemleri:**
- Stok Girişi (Alış fiyatı ile)
- Stok Çıkışı (Satış veya Servis kullanımı)
- Müşteri bazlı satış kaydı
- Personel bazlı servis kullanımı

---

### 9. **BranchesPage** (`/branches`)
**Ne İşe Yarar:**
- Şube yönetimi
- Çok şubeli işletme desteği

**Özellikler:**
- Şube listesi
- Şube ekleme (Ad, kod, şehir, adres, telefon, vergi bilgileri)
- Şube bilgileri görüntüleme

---

### 10. **StaffPage** (`/staff`)
**Ne İşe Yarar:**
- Personel yönetimi
- Rol bazlı yetkilendirme

**Özellikler:**
- Personel listesi
- Personel ekleme (İsim, e-posta, telefon, rol, şube)
- Rol tipleri:
  - Satış (sales)
  - Yönetici (manager)
  - Muhasebe (accounting)
  - Diğer (other)
- Aktif/Pasif durum yönetimi

---

### 11. **SettingsPage** (`/settings`)
**Ne İşe Yarar:**
- Galeri ayarları
- Sistem konfigürasyonu

**Özellikler:**
- **Galeri Bilgileri:**
  - Galeri adı
  - Telefon numarası
  - Şehir
  - Adres
  
- **Para Birimi Ayarları:**
  - Varsayılan para birimi seçimi (TRY, USD, EUR, GBP)
  
- **Dil Ayarları:**
  - Uygulama dili (Türkçe/İngilizce)

---

## 🛠 Teknoloji Stack'i

### **Frontend Teknolojileri**

#### **Core Framework & Build Tools:**
- **React 18.3.1** - UI framework
- **TypeScript 5.5.4** - Type-safe JavaScript
- **Vite 5.4.1** - Build tool ve dev server
- **React Router DOM 6.26.2** - Client-side routing

#### **UI Component Libraries:**
- **Radix UI** - Headless UI component'leri:
  - `@radix-ui/react-alert-dialog` - Alert dialog'lar
  - `@radix-ui/react-dialog` - Modal dialog'lar
  - `@radix-ui/react-dropdown-menu` - Dropdown menüler
  - `@radix-ui/react-select` - Select component'leri
  - `@radix-ui/react-tabs` - Tab component'leri
  - `@radix-ui/react-toast` - Toast bildirimleri
  - `@radix-ui/react-tooltip` - Tooltip'ler
  - `@radix-ui/react-popover` - Popover'lar
  - `@radix-ui/react-switch` - Switch toggle'lar

#### **Styling:**
- **Tailwind CSS 3.4.3** - Utility-first CSS framework
- **tailwindcss-animate 1.0.7** - Animasyonlar
- **PostCSS 8.5.6** - CSS işleme
- **Autoprefixer 10.4.21** - CSS vendor prefix'leri

#### **Data Visualization:**
- **Recharts 3.5.1** - Chart kütüphanesi
  - Bar Chart
  - Line Chart
  - Responsive container'lar

#### **Form & Input Management:**
- **class-variance-authority 0.7.1** - Component variant yönetimi
- **clsx 2.1.1** - Conditional class names
- **tailwind-merge 3.3.1** - Tailwind class birleştirme

#### **HTTP Client:**
- **Axios 1.7.2** - API istekleri

#### **Internationalization:**
- **i18next 23.11.5** - Çok dilli destek
- **react-i18next 15.5.2** - React i18n entegrasyonu

#### **Date & Time:**
- **date-fns 4.1.0** - Tarih işleme ve formatlama

#### **Icons:**
- **lucide-react 0.516.0** - Icon kütüphanesi

#### **Media:**
- **react-webcam 7.2.0** - Webcam entegrasyonu (araç görsel çekme)

---

### **Backend Teknolojileri**

#### **Core Framework:**
- **Node.js** - Runtime environment
- **Express 4.21.2** - Web framework
- **TypeScript 5.5.4** - Type-safe JavaScript

#### **Database:**
- **MySQL2 3.11.0** - MySQL veritabanı client'ı

#### **Authentication & Security:**
- **jsonwebtoken 9.0.2** - JWT token yönetimi
- **bcryptjs 2.4.3** - Şifre hash'leme
- **helmet 7.0.0** - HTTP header güvenliği
- **cors 2.8.5** - Cross-origin resource sharing

#### **File Upload:**
- **multer 2.0.2** - Dosya yükleme middleware'i
- **sharp 0.34.5** - Görsel işleme ve optimizasyon

#### **Validation:**
- **zod 3.23.8** - Schema validation

#### **External APIs:**
- **axios 1.7.2** - FreeCurrencyAPI entegrasyonu (Döviz kurları)

#### **Development Tools:**
- **nodemon 3.1.4** - Auto-reload dev server
- **ts-node 10.9.2** - TypeScript execution
- **dotenv 16.4.5** - Environment variables

#### **Testing:**
- **Jest 29.7.0** - Test framework
- **ts-jest 29.1.2** - TypeScript Jest transformer
- **supertest 7.0.0** - HTTP assertion library

---

### **Veritabanı:**
- **MySQL** - İlişkisel veritabanı
- Migration sistemi (SQL migration dosyaları)
- Multi-tenant yapı (tenant_id bazlı veri izolasyonu)

---

## 🎨 Tasarım Sistemi

### **Renk Paleti**

#### **Ana Renkler:**
- **Primary (Birincil):** `#003d82` - Güvenilir lacivert mavi
- **Primary Hover:** `#0052a3` - Hover durumunda açık mavi
- **Background:** `#f8f9fa` - Sıcak beyaz
- **Foreground:** `#2d3748` - Profesyonel koyu gri

#### **Durum Renkleri:**
- **Success:** `#16a34a` - Canlı yeşil
- **Warning:** `#f59e0b` - Canlı turuncu
- **Info:** `#3b82f6` - Canlı mavi
- **Destructive:** `#ef4444` - Canlı kırmızı

#### **Gri Tonları:**
- **Muted:** `#f1f3f4` - Çok açık gri
- **Border:** `#e2e8f0` - Açık gri border
- **Secondary:** `#6b7280` - Orta gri

### **Tipografi:**
- **Font Family:** Sistem fontları (sans-serif)
- **Font Weights:** 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- **Font Sizes:** Tailwind scale (text-xs, text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl)

### **Spacing & Layout:**
- **Border Radius:** `0.75rem` (12px) - Profesyonel köşe yuvarlama
- **Spacing:** Tailwind spacing scale (4px base unit)
- **Grid System:** CSS Grid ve Flexbox
- **Responsive Breakpoints:**
  - `sm`: 640px
  - `md`: 768px
  - `lg`: 1024px
  - `xl`: 1280px

### **Component Stilleri:**

#### **Cards:**
- Beyaz arka plan
- Yumuşak gölge (`shadow-sm`, `shadow-md`)
- Border radius: 12px
- Hover efektleri (shadow artışı, renk geçişleri)

#### **Buttons:**
- Primary: Lacivert arka plan, beyaz metin
- Outline: Şeffaf arka plan, border
- Ghost: Tamamen şeffaf, hover'da arka plan
- Destructive: Kırmızı arka plan
- Hover animasyonları (scale, shadow)

#### **Forms:**
- Temiz input tasarımı
- Focus ring: Primary renk
- Label'lar üstte, küçük font
- Placeholder metinleri açıklayıcı

#### **Tables:**
- Alternatif satır renkleri (zebra striping)
- Hover efektleri
- Sıralama butonları (↑ ↓)
- Responsive tasarım (overflow-x-auto)

#### **Charts:**
- Profesyonel renk paleti
- Tooltip'ler açıklayıcı
- Responsive container'lar
- Grid çizgileri hafif

### **Animasyonlar:**
- **Fade In:** Sayfa yüklenirken
- **Slide Up:** Kartlar için
- **Scale In:** Modal'lar için
- **Micro Bounce:** Buton tıklamaları için
- **Smooth Transitions:** Tüm hover efektleri için

### **Dark Mode:**
- Tam dark mode desteği
- CSS variables ile tema yönetimi
- Otomatik renk adaptasyonu
- Tema toggle butonu

### **Responsive Design:**
- Mobile-first yaklaşım
- Tablet ve desktop optimizasyonu
- Sidebar mobilde drawer'a dönüşür
- Tablolar mobilde scroll edilebilir
- Grid layout'lar responsive

### **Accessibility:**
- ARIA label'lar
- Keyboard navigation desteği
- Focus visible ring'ler
- Yeterli kontrast oranları
- Screen reader uyumluluğu

### **UI Patterns:**

#### **Dashboard Widget'ları:**
- KPI kartları (4 sütun grid)
- Grafik widget'ları (2 sütun grid)
- Liste widget'ları (scrollable)
- Badge'ler durum göstergeleri için

#### **Modal/Dialog'lar:**
- Merkezi konumlandırma
- Backdrop blur efekti
- Animasyonlu açılış/kapanış
- Form validasyonu

#### **Navigation:**
- Sidebar navigation (sabit)
- Breadcrumb'lar (gerekli yerlerde)
- Tab navigation (içerik bölümleri için)
- Mobile hamburger menu

---

## 📊 Veri Akışı

### **API Yapısı:**
- RESTful API tasarımı
- JWT token authentication
- Multi-tenant middleware (tenant_id otomatik eklenir)
- Pagination desteği
- Error handling ve validation

### **State Management:**
- React Context API:
  - `ThemeContext` - Tema yönetimi
  - `TenantContext` - Tenant bilgileri
  - `CurrencyRatesContext` - Döviz kurları
- Local state (useState hooks)
- API state (axios ile)

---

## 🔐 Güvenlik

- JWT token tabanlı authentication
- Password hashing (bcrypt)
- SQL injection koruması (prepared statements)
- XSS koruması (helmet)
- CORS yapılandırması
- Input sanitization middleware
- Multi-tenant veri izolasyonu

---

## 📱 Özellikler Özeti

✅ Multi-tenant yapı (Her galeri izole)
✅ Çoklu şube yönetimi
✅ Çoklu para birimi desteği (TRY, USD, EUR, GBP)
✅ Otomatik döviz kuru çekme (FreeCurrencyAPI)
✅ Araç yönetimi (Alış, satış, masraf takibi)
✅ Müşteri yönetimi ve segmentasyonu
✅ Taksitli satış takibi
✅ Stok/envanter yönetimi
✅ Muhasebe (Gelir-gider takibi)
✅ Analitik ve raporlama
✅ Çok dilli destek (TR/EN)
✅ Dark mode tema
✅ Responsive tasarım
✅ Görsel yükleme ve işleme
✅ Belgeler yönetimi (Sigorta, muayene)
✅ Takip görevleri (CRM)

---

## 🚀 Geliştirme Ortamı

### **Frontend:**
- Port: 5175
- Dev Server: Vite
- Hot Module Replacement (HMR)

### **Backend:**
- Port: 3000 (varsayılan)
- Dev Server: Nodemon
- TypeScript compilation

### **Build:**
- Frontend: `npm run build` (Vite build)
- Backend: `npm run build` (TypeScript compilation)
- Production: `npm start` (Node.js)

---

Bu dokümantasyon, projenin tüm teknik detaylarını ve yapısını kapsamaktadır. Gemini AI'ya bu dokümantasyonu vererek proje hakkında detaylı bilgi alabilirsiniz.

