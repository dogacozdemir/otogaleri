# Update Guide - Otogaleri Production Server

Bu dosya production Ubuntu server'ınızı güncellemek için adım adım talimatlar içerir.

## Ön Hazırlık

1. **Backup Alın:**
   ```bash
   # Database backup
   mysqldump -u root -p otogaleri > backup_$(date +%Y%m%d_%H%M%S).sql
   
   # Frontend ve backend dosyalarını yedekleyin
   cp -r /home/cloudpanel/htdocs/otogaleri /home/cloudpanel/htdocs/otogaleri_backup_$(date +%Y%m%d)
   ```

2. **Git Durumunu Kontrol Edin:**
   ```bash
   cd /home/cloudpanel/htdocs/otogaleri
   git status
   git fetch origin
   git log HEAD..origin/main  # Yeni commit'leri göster
   ```

## Update Adımları

### 0. Git Güvenlik Ayarları (İlk Kez Çalıştırıyorsanız)

Eğer "dubious ownership" hatası alırsanız:

```bash
# Git'e bu dizinin güvenli olduğunu söyle
git config --global --add safe.directory /home/cloudpanel/htdocs/otogaleri

# Veya sadece bu repository için
cd /home/cloudpanel/htdocs/otogaleri
git config --add safe.directory /home/cloudpanel/htdocs/otogaleri
```

### 1. Git'ten Son Değişiklikleri Çekin

```bash
cd /home/cloudpanel/htdocs/otogaleri
git pull origin main
```

### 2. Backend Dependencies Güncelleyin

```bash
cd backend
npm install
```

### 3. Database Migrations Çalıştırın

**ÖNEMLİ:** Migration'ları çalıştırmadan önce database backup'ı aldığınızdan emin olun!

```bash
# Migration'ları çalıştır
npm run migrate

# Migration durumunu kontrol et
mysql -u root -p otogaleri -e "SELECT migration_name, executed_at, success FROM schema_migrations ORDER BY executed_at DESC LIMIT 10;"
```

**Not:** Migration sistemi otomatik olarak:
- Hangi migration'ların çalıştırıldığını takip eder
- Sadece çalışmamış migration'ları çalıştırır
- Başarısız migration'ları kaydeder

**Bu güncellemede çalışacak migration'lar:**
- `add_vehicle_quotes.sql` - Teklif yönetimi için vehicle_quotes tablosu
- `add_acl_permissions.sql` - Yetki yönetimi için acl_permissions tablosu
- `add_installment_reminder_tracking.sql` - Taksit hatırlatma takibi için kolonlar

**Eğer migration'lar daha önce manuel olarak çalıştırıldıysa:**
Migration sistemi otomatik olarak atlayacaktır. Ancak emin olmak için:
```bash
# Hangi migration'ların çalıştığını kontrol et
mysql -u root -p otogaleri -e "SELECT migration_name FROM schema_migrations WHERE migration_name IN ('add_vehicle_quotes', 'add_acl_permissions', 'add_installment_reminder_tracking');"
```

### 4. Backend Build

```bash
cd /home/cloudpanel/htdocs/otogaleri/backend
npm run build
```

**Eğer "Killed" hatası alırsanız:**
```bash
# Node.js memory limit'ini artır
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Veya swap space ekleyin
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 5. Frontend Dependencies ve Build

```bash
cd /home/cloudpanel/htdocs/otogaleri/frontend
npm install
npm run build
```

**Eğer "Killed" hatası alırsanız:**
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### 6. Backend'i Restart Edin

```bash
# PM2 process'lerini kontrol et
pm2 list

# Backend'i restart et
pm2 restart otogaleri-backend

# Logları kontrol et
pm2 logs otogaleri-backend --lines 50
```

**Eğer port 5005 zaten kullanımda hatası alırsanız:**
```bash
# PM2'deki tüm process'leri temizle
pm2 delete all
pm2 kill

# Port'u kullanan process'i bul ve kapat
sudo lsof -i :5005
sudo kill -9 <PID>

# Backend'i yeniden başlat
cd /home/cloudpanel/htdocs/otogaleri/backend
pm2 start dist/server.js --name otogaleri-backend

# PM2'yi sistem başlangıcında başlat
pm2 startup
pm2 save
```

### 7. Nginx'i Restart Edin (Gerekirse)

```bash
sudo nginx -t  # Config'i test et
sudo systemctl restart nginx
```

### 8. Test Edin

```bash
# Backend health check
curl http://localhost:5005/health

# Frontend erişilebilirliğini kontrol et
curl -I https://galeri.calenius.io
```

## Migration Yönetimi

### Yeni Migration Eklendiğinde

1. Git'ten migration dosyasını çekin
2. `npm run migrate` çalıştırın
3. Sistem otomatik olarak sadece yeni migration'ı çalıştırır

### Migration Durumunu Kontrol Etme

```bash
mysql -u root -p otogaleri -e "
SELECT 
  migration_name,
  executed_at,
  execution_time_ms,
  success,
  LEFT(error_message, 100) as error_preview
FROM schema_migrations
ORDER BY executed_at DESC
LIMIT 20;"
```

### Migration Başarısız Olursa

1. Hata mesajını kontrol edin:
   ```bash
   mysql -u root -p otogaleri -e "SELECT * FROM schema_migrations WHERE success = FALSE ORDER BY executed_at DESC LIMIT 1;"
   ```

2. Hatayı düzeltin ve migration dosyasını güncelleyin

3. Migration kaydını silin (tekrar çalıştırmak için):
   ```bash
   mysql -u root -p otogaleri -e "DELETE FROM schema_migrations WHERE migration_name = 'migration_name_here';"
   ```

4. Tekrar çalıştırın:
   ```bash
   npm run migrate
   ```

## Sorun Giderme

### Backend Başlamıyor

```bash
# PM2 loglarını kontrol et
pm2 logs otogaleri-backend

# Port'un kullanılabilir olduğunu kontrol et
netstat -tulpn | grep 5005

# .env dosyasını kontrol et
cat backend/.env

# Backend'i manuel restart et
cd /home/cloudpanel/htdocs/otogaleri/backend
pm2 restart otogaleri-backend
```

### Port 5005 Zaten Kullanımda (EADDRINUSE)

Eğer "address already in use :::5005" hatası alırsanız:

```bash
# 1. Port 5005'i kullanan process'i bul
sudo lsof -i :5005
# veya
sudo netstat -tulpn | grep 5005

# 2. PM2'deki tüm process'leri temizle
pm2 delete all
pm2 kill

# 3. Port'u kullanan process'i zorla kapat (eğer PM2 dışındaysa)
# Önce process ID'yi bul (yukarıdaki komutlardan)
sudo kill -9 <PID>

# 4. Backend'i yeniden başlat
cd /home/cloudpanel/htdocs/otogaleri/backend
pm2 start dist/server.js --name otogaleri-backend

# 5. PM2'yi sistem başlangıcında başlat (eğer yapmadıysanız)
pm2 startup
pm2 save

# 6. Durumu kontrol et
pm2 status
pm2 logs otogaleri-backend --lines 20
```

### Build Process "Killed" Hatası

Bu genellikle memory yetersizliğinden kaynaklanır:

```bash
# Çözüm 1: Node.js memory limit'ini artır
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Çözüm 2: Swap space ekle
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Swap'i kalıcı yapmak için /etc/fstab'a ekle
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Sonra tekrar build dene
npm run build
```

### Migration Hataları

```bash
# Son migration'ı kontrol et
mysql -u root -p otogaleri -e "SELECT * FROM schema_migrations ORDER BY executed_at DESC LIMIT 1;"

# Migration'ı tekrar çalıştırmak için kaydı sil
mysql -u root -p otogaleri -e "DELETE FROM schema_migrations WHERE migration_name = 'migration_name';"

# Tekrar çalıştır
npm run migrate
```

### Backend 500 Hataları ve SQL Syntax Hataları

Eğer endpoint'ler 500 hatası veriyorsa:

```bash
# 1. Backend loglarını kontrol et
pm2 logs otogaleri-backend --lines 100

# 2. MySQL versiyonunu kontrol et (ROW_NUMBER() MySQL 8.0+ gerektirir)
mysql --version
# veya
mysql -u root -p -e "SELECT VERSION();"

# 3. Eğer MySQL 8.0'dan eskiyse, ROW_NUMBER() kullanan sorguları düzeltmek gerekir
# Geçici çözüm: Eski MySQL için alternatif sorgular kullanılabilir
```

**MySQL 8.0'dan eski versiyon kullanıyorsanız:**

Optimizasyonlarda kullanılan `ROW_NUMBER()` window function MySQL 8.0+ gerektirir. Eğer eski versiyon kullanıyorsanız:

1. MySQL versiyonunu yükseltin (önerilen)
2. Veya alternatif sorgular kullanın (subquery ile)

**Backend'i restart etmeyi unutmayın:**

```bash
# Build sonrası mutlaka restart edin
cd /home/cloudpanel/htdocs/otogaleri/backend
npm run build
pm2 restart otogaleri-backend

# Logları kontrol edin
pm2 logs otogaleri-backend --lines 50
```

### 404 Hataları (Endpoint Bulunamadı)

Eğer `/api/vehicles/next-number` gibi endpoint'ler 404 veriyorsa:

```bash
# 1. Backend'in çalıştığını kontrol et
pm2 status
pm2 logs otogaleri-backend --lines 20

# 2. Route'ların doğru mount edildiğini kontrol et
# backend/src/server.ts dosyasında route'ların doğru import edildiğinden emin olun

# 3. Backend'i restart et
pm2 restart otogaleri-backend

# 4. Health check yap
curl http://localhost:5005/health

# 5. Yeni endpoint'leri test et (opsiyonel)
# curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5005/api/quotes
# curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5005/api/documents/vehicles/expiring?days=30
```

### Vehicle Number Oluşmuyor

Araç ekle modalında vehicle number otomatik oluşmuyorsa:

```bash
# 1. Backend loglarını kontrol et
pm2 logs otogaleri-backend --lines 50 | grep -i "vehicle\|next-number"

# 2. Endpoint'i manuel test et
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5005/api/vehicles/next-number

# 3. Frontend console'da hata var mı kontrol et (browser dev tools)

# 4. Backend'i restart et
pm2 restart otogaleri-backend
```

## Hızlı Update Komutu (Tüm Adımlar)

```bash
#!/bin/bash
# update.sh - Tüm update adımlarını otomatik çalıştırır

set -e  # Hata durumunda dur

echo "=== Otogaleri Update Başlatılıyor ==="

# 1. Git pull
cd /home/cloudpanel/htdocs/otogaleri
echo "Git pull yapılıyor..."
git pull origin main

# 2. Backend dependencies
cd backend
echo "Backend dependencies güncelleniyor..."
npm install

# 3. Migrations
echo "Database migrations çalıştırılıyor..."
npm run migrate

# 4. Backend build
echo "Backend build ediliyor..."
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# 5. Frontend dependencies ve build
cd ../frontend
echo "Frontend dependencies güncelleniyor..."
npm install
echo "Frontend build ediliyor..."
npm run build

# 6. Backend restart
cd ../backend
echo "Backend restart ediliyor..."
pm2 restart otogaleri-backend

echo "=== Update Tamamlandı ==="
pm2 logs otogaleri-backend --lines 10
```

Bu script'i `update.sh` olarak kaydedip çalıştırabilirsiniz:
```bash
chmod +x update.sh
./update.sh
```

## Bu Güncellemedeki Yeni Özellikler

### 1. Teklif Yönetimi Modülü
- Araçlar sayfasında işlemler sütununa teklif ikonu eklendi
- Teklif oluşturma, düzenleme ve satışa dönüştürme özellikleri
- `/quotes` sayfasında teklif listesi ve yönetimi
- Müşteri detay sayfasında teklifler sekmesi

### 2. Gelişmiş Yetki Yönetimi (ACL)
- Settings sayfasında yetki yönetimi sekmesi
- Rol bazlı izin yönetimi (Sales, Accounting, Manager)
- Kaynak ve aksiyon bazlı izin kontrolü

### 3. Toplu İçe Aktarma
- Araçlar ve masraflar için Excel/CSV toplu içe aktarma
- Veri doğrulama ve hata raporlama

### 4. PDF Belge Üretimi
- Satış sözleşmesi PDF'i
- Fatura PDF'i
- Müşteri detay sayfasından indirme

### 5. Taksit Hatırlatma Sistemi
- Dashboard'da gecikmiş taksitler widget'ı
- Manuel hatırlatma gönderme
- Email hatırlatma servisi

### 6. UI/UX İyileştirmeleri
- Araç düzenleme modalı iki aşamalı hale getirildi
- Accounting sayfasında tarih filtreleme tabların altına taşındı
- Expiring documents endpoint'i eklendi
- Vehicle cost kur yönetimi düzeltmeleri (orijinal tarihin kuru kullanılıyor)

### 7. Bug Fixes
- StaffPage'de branches API hatası düzeltildi
- Vehicle cost düzenlemede kur yönetimi düzeltildi

## Önemli Notlar

1. **Her zaman backup alın** migration çalıştırmadan önce
2. **Migration'ları test ortamında test edin** production'a almadan önce
3. **PM2 loglarını kontrol edin** restart sonrası
4. **Migration durumunu kontrol edin** her update sonrası
5. **Yeni endpoint'ler:**
   - `/api/quotes` - Teklif yönetimi
   - `/api/acl` - Yetki yönetimi
   - `/api/documents/vehicles/expiring` - Süresi dolacak belgeler
   - `/api/vehicles/bulk-import` - Toplu araç içe aktarma
   - `/api/vehicles/bulk-costs` - Toplu masraf içe aktarma
6. **Yeni bağımlılıklar:**
   - `xlsx` - Excel dosya okuma
   - `csv-parse` - CSV dosya okuma
   - `pdfkit` - PDF üretimi
   - `nodemailer` - Email gönderimi
