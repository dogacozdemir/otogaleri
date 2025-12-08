# Production Güncelleme Rehberi

Bu dokümantasyon, production ortamındaki Otogaleri projesini güncellemek için gereken adımları içerir.

## Ön Hazırlık

### 1. Yedekleme (ÖNEMLİ!)

Güncelleme öncesi mutlaka yedek alın:

```bash
# Veritabanı yedeği
cd /home/cloudpanel/htdocs/otogaleri/backend
mysqldump -u otogaleri_user -p otogaleri > backup_$(date +%Y%m%d_%H%M%S).sql

# Proje dosyalarının yedeği (opsiyonel ama önerilir)
cd /home/cloudpanel/htdocs/otogaleri
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz .
```

### 2. Mevcut Durumu Kontrol Et

```bash
cd /home/cloudpanel/htdocs/otogaleri

# Git durumunu kontrol et
git status

# Mevcut branch'i kontrol et
git branch

# Son commit'i kontrol et
git log -1
```

## Güncelleme Adımları

### 1. Değişiklikleri Çek

```bash
cd /home/cloudpanel/htdocs/otogaleri

# Değişiklikleri çek (main branch için)
git pull origin main

# Eğer farklı bir branch kullanıyorsanız:
# git pull origin <branch-name>
```

**Not:** Eğer local değişiklikler varsa, önce bunları commit edin veya stash edin:
```bash
# Değişiklikleri geçici olarak sakla
git stash

# Güncellemeleri çek
git pull origin main

# Saklanan değişiklikleri geri getir (eğer gerekirse)
git stash pop
```

### 2. Backend Güncellemeleri

```bash
cd /home/cloudpanel/htdocs/otogaleri/backend

# Yeni bağımlılıkları yükle
npm install --production

# TypeScript build
npm run build

# PM2 ile restart (eğer PM2 kullanıyorsanız)
pm2 restart otogaleri-backend

# Veya CloudPanel Node.js App'i restart edin
```

### 3. Veritabanı Migration'ları (Eğer Varsa)

Yeni migration dosyaları varsa, bunları sırayla çalıştırın:

```bash
cd /home/cloudpanel/htdocs/otogaleri/backend

# Migration dosyalarını kontrol et
ls -la migrations/

# Yeni migration'ları çalıştır (sadece daha önce çalıştırılmamış olanları)
# Örnek: Eğer yeni migration'lar varsa
mysql -u otogaleri_user -p otogaleri < migrations/add_arrival_date.sql
mysql -u otogaleri_user -p otogaleri < migrations/add_vehicle_number.sql
mysql -u otogaleri_user -p otogaleri < migrations/add_vehicle_number_index.sql
mysql -u otogaleri_user -p otogaleri < migrations/merge_month_year_to_production_date.sql
mysql -u otogaleri_user -p otogaleri < migrations/remove_door_seat.sql
```

**ÖNEMLİ:** Migration'ları çalıştırmadan önce:
1. Veritabanı yedeğinizi aldığınızdan emin olun
2. Migration dosyalarını inceleyin
3. Test ortamında önce deneyin (mümkünse)

### 4. Frontend Güncellemeleri

```bash
cd /home/cloudpanel/htdocs/otogaleri/frontend

# Yeni bağımlılıkları yükle
npm install

# Production build
npm run build

# Build başarılı olduğunda, Nginx otomatik olarak yeni build'i serve edecek
```

### 5. Environment Variables Kontrolü

Yeni environment variable'lar eklenmişse, bunları kontrol edin:

```bash
# Backend .env kontrolü
cd /home/cloudpanel/htdocs/otogaleri/backend
cat .env

# Frontend .env kontrolü
cd /home/cloudpanel/htdocs/otogaleri/frontend
cat .env
```

**Yeni eklenen environment variable'lar:**
- Backend: Herhangi bir yeni değişken var mı kontrol edin
- Frontend: `VITE_API_BASE` doğru mu kontrol edin

### 6. Dosya İzinleri (Eğer Gerekirse)

```bash
# Uploads klasörü izinleri
chmod -R 755 /home/cloudpanel/htdocs/otogaleri/backend/uploads
chown -R cloudpanel:cloudpanel /home/cloudpanel/htdocs/otogaleri/backend/uploads
```

## Test ve Doğrulama

### 1. Backend Health Check

```bash
# Backend'in çalıştığını kontrol et
curl http://localhost:5005/api/health

# Veya browser'dan
# https://yourdomain.com/api/health
```

### 2. Frontend Kontrolü

1. Browser'dan siteyi açın: `https://yourdomain.com`
2. Login sayfasının yüklendiğini kontrol edin
3. Giriş yapıp dashboard'u kontrol edin

### 3. Önemli Özellikleri Test Et

- ✅ Şube sayısı dashboard'da doğru görünüyor mu?
- ✅ CurrencyInput component'i çalışıyor mu?
- ✅ Manuel kur girişi çalışıyor mu?
- ✅ Maliyet ekleme/düzenleme çalışıyor mu?
- ✅ Satış işlemleri çalışıyor mu?

### 4. Log Kontrolü

```bash
# PM2 logları (eğer PM2 kullanıyorsanız)
pm2 logs otogaleri-backend --lines 50

# Veya CloudPanel'de Node.js App loglarını kontrol edin
```

## Hızlı Güncelleme Komutu (Tek Satır)

Tüm adımları tek seferde yapmak için:

```bash
cd /home/cloudpanel/htdocs/otogaleri && \
git pull origin main && \
cd backend && npm install --production && npm run build && pm2 restart otogaleri-backend && \
cd ../frontend && npm install && npm run build && \
echo "Güncelleme tamamlandı!"
```

## Sorun Giderme

### Git Pull Hatası

Eğer `git pull` sırasında conflict hatası alırsanız:

```bash
# Değişiklikleri stash et
git stash

# Tekrar pull yap
git pull origin main

# Conflict'leri çöz (eğer varsa)
# Dosyaları düzenleyip commit edin
```

### Build Hatası

```bash
# Node modules'ı temizle ve yeniden yükle
cd backend  # veya frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Backend Başlamıyor

```bash
# PM2 loglarını kontrol et
pm2 logs otogaleri-backend

# Port'un kullanılabilir olduğunu kontrol et
netstat -tulpn | grep 5005

# .env dosyasını kontrol et
cat backend/.env
```

### Frontend Build Hatası

```bash
# Cache'i temizle
cd frontend
rm -rf node_modules dist .vite
npm install
npm run build
```

### Veritabanı Migration Hatası

Eğer migration sırasında hata alırsanız:

1. Migration'ı durdurun
2. Veritabanı yedeğinizden geri yükleyin
3. Migration dosyasını kontrol edin
4. Sorunu çözüp tekrar deneyin

```bash
# Veritabanını geri yükle
mysql -u otogaleri_user -p otogaleri < backup_YYYYMMDD_HHMMSS.sql
```

## Rollback (Geri Alma)

Eğer güncelleme sonrası sorun yaşarsanız:

```bash
cd /home/cloudpanel/htdocs/otogaleri

# Önceki commit'e geri dön
git log  # Commit hash'ini bulun
git checkout <previous-commit-hash>

# Backend'i rebuild ve restart
cd backend
npm install --production
npm run build
pm2 restart otogaleri-backend

# Frontend'i rebuild
cd ../frontend
npm install
npm run build

# Veritabanını geri yükle (eğer migration yaptıysanız)
mysql -u otogaleri_user -p otogaleri < backup_YYYYMMDD_HHMMSS.sql
```

## Önemli Notlar

1. **Yedekleme:** Her güncelleme öncesi mutlaka yedek alın
2. **Test:** Mümkünse önce test ortamında deneyin
3. **Maintenance Mode:** Yüksek trafikli sitelerde maintenance mode açmayı düşünün
4. **Downtime:** Güncelleme sırasında kısa bir downtime olabilir (1-2 dakika)
5. **Monitoring:** Güncelleme sonrası logları ve performansı izleyin

## Son Güncelleme Notları (2025-01-XX)

Bu güncellemede yapılan değişiklikler:

### Yeni Özellikler
- ✅ CurrencyInput component'i eklendi (miktar ve döviz birleşik input)
- ✅ Manuel kur girişi özelliği eklendi
- ✅ Her maliyet için ayrı kur desteği
- ✅ CurrencyRatesContext eklendi (localStorage ile kur saklama)

### Düzeltmeler
- ✅ Dashboard'da şube sayısı düzeltildi (pagination.total kullanımı)
- ✅ Tarih formatı hatası düzeltildi (MySQL DATE formatı)
- ✅ Controlled/uncontrolled input uyarısı düzeltildi
- ✅ JSX syntax hatası düzeltildi

### Backend Değişiklikleri
- ✅ `addVehicleCost` - custom_rate parametresi eklendi
- ✅ `updateVehicleCost` - custom_rate parametresi eklendi
- ✅ `markVehicleAsSold` - custom_rate parametresi eklendi
- ✅ Tarih formatı düzeltmeleri

### Frontend Değişiklikleri
- ✅ CurrencyInput component'i oluşturuldu
- ✅ CurrencyRateEditor component'i oluşturuldu
- ✅ CurrencyRatesContext eklendi
- ✅ VehiclesPage modalları güncellendi
- ✅ DashboardPage şube sayısı düzeltildi

### Migration'lar
Bu güncellemede yeni migration yok. Mevcut migration'ları zaten çalıştırmış olmalısınız.

## İletişim ve Destek

Sorun yaşarsanız:
1. Logları kontrol edin
2. Yedekten geri yükleyin
3. Git issue açın veya geliştirici ile iletişime geçin

