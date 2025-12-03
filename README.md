# Otogaleri Yönetim Sistemi

Çok şubeli, çok para birimli, profesyonel oto galeri yazılımı.

## Özellikler

- ✅ Multi-tenant yapı (her galeri kendi verileriyle izole)
- ✅ Çoklu şube yönetimi
- ✅ Çalışan ve prim yönetimi
- ✅ Araç yönetimi (alış, satış, masraf takibi)
- ✅ Çok para birimi desteği (TRY, USD, EUR, GBP)
- ✅ FreeCurrencyAPI entegrasyonu (otomatik kur çekme ve cache)
- ✅ Kur farkı dahil kar hesaplama
- ✅ Marka/model bazlı karlılık analizi
- ✅ Satış süresi analizi
- ✅ Çok dilli destek (TR/EN)
- ✅ Dark mode tema

## Kurulum

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

## API Endpoints

- `POST /api/auth/signup` - Yeni galeri kaydı
- `POST /api/auth/login` - Giriş
- `GET /api/branches` - Şube listesi
- `POST /api/branches` - Şube oluştur
- `GET /api/staff` - Çalışan listesi
- `POST /api/staff` - Çalışan ekle
- `GET /api/vehicles` - Araç listesi
- `POST /api/vehicles` - Araç ekle
- `GET /api/vehicles/:id/profit` - Araç kar hesaplama
- `POST /api/vehicles/:id/sell` - Araç satış işlemi
- `GET /api/analytics/brand-profit` - Marka bazlı kar analizi
- `GET /api/analytics/model-profit` - Model bazlı kar analizi
- `GET /api/analytics/sales-duration` - Satış süresi analizi
- `GET /api/analytics/top-profitable` - En karlı araçlar
- `GET /api/analytics/monthly-comparison` - Aylık karşılaştırma

## Geliştirme Durumu

### Tamamlanan Özellikler ✅

**Backend:**
- ✅ Multi-tenant authentication ve authorization
- ✅ Tenant (galeri) kayıt ve yönetimi
- ✅ Şube (branch) CRUD işlemleri
- ✅ Çalışan (staff) yönetimi
- ✅ Araç (vehicle) CRUD işlemleri
- ✅ Araç masraf (cost) yönetimi
- ✅ Araç satış işlemleri
- ✅ FreeCurrencyAPI entegrasyonu ve FX rate cache
- ✅ Kur farkı dahil kar hesaplama
- ✅ Marka/model bazlı karlılık analizi
- ✅ Satış süresi analizi
- ✅ Kur farkı etkisi analizi

**Frontend:**
- ✅ Login/Signup sayfaları
- ✅ Dashboard (istatistikler)
- ✅ Araç listesi ve yönetimi
- ✅ Araç ekleme/düzenleme formu
- ✅ Araç satış formu
- ✅ Araç masraf ekleme
- ✅ Araç detay ve kar hesaplama modalı
- ✅ Kur farkı analizi görüntüleme
- ✅ Şube yönetimi sayfası
- ✅ Çalışan yönetimi sayfası
- ✅ Raporlar ve analizler sayfası
- ✅ Çok dilli destek (TR/EN)
- ✅ Dark mode tema

### Gelecek Geliştirmeler ⏳

- ⏳ Dashboard grafikleri (chart.js veya recharts ile)
- ⏳ Rapor export (PDF/Excel)
- ⏳ Prim yönetimi ve hesaplama
- ⏳ Müşteri yönetimi sayfası
- ⏳ Muhasebe (gelir/gider) sayfaları
- ⏳ Gelişmiş arama ve filtreleme
- ⏳ Bildirimler sistemi
