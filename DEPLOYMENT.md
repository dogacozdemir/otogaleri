# Production Deployment Guide - CloudPanel

Bu dokümantasyon, Otogaleri projesini CloudPanel kurulu Ubuntu server'da production ortamına deploy etmek için gereken adımları içerir.

## Ön Gereksinimler

- Ubuntu Server (CloudPanel kurulu)
- Node.js 18+ ve npm
- MySQL 8.0+
- Nginx (CloudPanel ile birlikte gelir)

## 1. Sunucu Hazırlığı

### Node.js Kurulumu
```bash
# Node.js 20.x LTS kurulumu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Versiyon kontrolü
node --version
npm --version
```

### MySQL Kurulumu ve Veritabanı Oluşturma
```bash
# MySQL'e bağlan
mysql -u root -p

# Veritabanı oluştur
CREATE DATABASE otogaleri CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'otogaleri_user'@'localhost' IDENTIFIED BY 'güçlü_şifre_buraya';
GRANT ALL PRIVILEGES ON otogaleri.* TO 'otogaleri_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 2. Proje Kurulumu

### Projeyi Sunucuya Aktar
```bash
# Git ile clone (veya FTP/SFTP ile upload)
cd /home/cloudpanel/htdocs
git clone https://github.com/dogacozdemir/otogaleri.git
cd otogaleri
```

### Backend Kurulumu
```bash
cd backend
npm install

# Environment dosyası oluştur
cp .env.example .env
nano .env
```

**Backend .env Örneği:**
```env
# Database
DB_HOST=localhost
DB_USER=otogaleri_user
DB_PASSWORD=güçlü_şifre_buraya
DB_NAME=otogaleri

# Server
PORT=5005
NODE_ENV=production

# JWT
JWT_SECRET=çok_güvenli_ve_uzun_jwt_secret_key_buraya

# FreeCurrencyAPI (Opsiyonel - kur analizi için)
FREECURRENCY_API_KEY=your_api_key_here
```

### Veritabanı Migration
```bash
# Schema'yı yükle
mysql -u otogaleri_user -p otogaleri < schema.sql

# Migration'ları sırayla çalıştır (ÖNEMLİ: Tüm migration'ları çalıştırın)
cd /home/cloudpanel/htdocs/otogaleri/backend
mysql -u otogaleri_user -p otogaleri < migrations/add_vehicle_images.sql
mysql -u otogaleri_user -p otogaleri < migrations/add_tenant_settings.sql
mysql -u otogaleri_user -p otogaleri < migrations/add_installment_sales.sql
mysql -u otogaleri_user -p otogaleri < migrations/add_inventory_tables.sql
mysql -u otogaleri_user -p otogaleri < migrations/add_followup_and_documents.sql
mysql -u otogaleri_user -p otogaleri < migrations/add_track_stock_to_inventory.sql
mysql -u otogaleri_user -p otogaleri < migrations/remove_ps_tw_add_plate_number.sql
```

### Seed Data (Test Verileri - Opsiyonel)
Test amaçlı örnek veriler yüklemek için:
```bash
cd /home/cloudpanel/htdocs/otogaleri/backend
mysql -u otogaleri_user -p otogaleri < migrations/seed_data.sql
```

**Not:** Seed data şunları içerir:
- 2 şube (Merkez ve Ankara)
- 5 personel
- 15 müşteri
- 25 araç (10 satılmış, 10 stokta, 5 rezerve)
- Araç maliyetleri
- 10 satış kaydı
- 5 taksitli satış
- 15 envanter ürünü
- Gelir/gider kayıtları
- Satış sonrası takip kayıtları

### Backend Build
```bash
cd backend
npm run build
```

### Frontend Kurulumu
```bash
cd ../frontend
npm install

# Environment dosyası oluştur
cp .env.example .env
nano .env
```

**Frontend .env Örneği:**
```env
# Production API URL (CloudPanel'de oluşturacağınız site URL'i)
VITE_API_BASE=https://yourdomain.com/api
```

### Frontend Build
```bash
npm run build
```

## 3. CloudPanel Yapılandırması

### Site Oluşturma
1. CloudPanel'de yeni bir site oluşturun
2. PHP yerine **Node.js** seçin
3. Domain adınızı girin (örn: otogaleri.yourdomain.com)

### Backend Node.js Uygulaması
1. CloudPanel'de **Node.js App** oluşturun
2. **App Path:** `/home/cloudpanel/htdocs/otogaleri/backend`
3. **Start Command:** `node dist/server.js`
4. **Port:** `5005` (veya .env'de belirlediğiniz port)
5. **Environment Variables:** .env dosyasındaki değerleri ekleyin

### Frontend Static Files
1. CloudPanel'de site ayarlarına gidin
2. **Document Root:** `/home/cloudpanel/htdocs/otogaleri/frontend/dist`
3. Nginx yapılandırmasını düzenleyin (aşağıdaki örnek)

## 4. Nginx Yapılandırması

CloudPanel'de site ayarlarından **Nginx Config** bölümüne gidin ve şu yapılandırmayı ekleyin:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Frontend static files
    root /home/cloudpanel/htdocs/otogaleri/frontend/dist;
    index index.html;
    
    # Frontend routing (SPA için)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API proxy
    location /api {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static file serving (uploads)
    location /uploads {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type";
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

## 5. SSL Sertifikası (Let's Encrypt)

CloudPanel'de site ayarlarından **SSL** bölümüne gidin ve Let's Encrypt sertifikası oluşturun.

## 6. PM2 ile Process Management (Opsiyonel)

Backend uygulamasını PM2 ile yönetmek için:

```bash
# PM2 kurulumu
npm install -g pm2

# Backend'i PM2 ile başlat
cd /home/cloudpanel/htdocs/otogaleri/backend
pm2 start dist/server.js --name otogaleri-backend

# PM2'yi sistem başlangıcında başlat
pm2 startup
pm2 save
```

## 7. Dosya İzinleri

```bash
# Uploads klasörü için yazma izni
chmod -R 755 /home/cloudpanel/htdocs/otogaleri/backend/uploads
chown -R cloudpanel:cloudpanel /home/cloudpanel/htdocs/otogaleri/backend/uploads
```

## 8. Firewall Ayarları

```bash
# Sadece HTTP (80) ve HTTPS (443) portlarını açık tutun
# Backend portu (5005) sadece localhost'tan erişilebilir olmalı
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 9. Test ve Doğrulama

1. **Frontend:** `https://yourdomain.com` adresine gidin
2. **Backend Health Check:** `https://yourdomain.com/api/health` adresine gidin
3. **Login:** Yeni bir galeri hesabı oluşturun ve giriş yapın

## 10. Güncelleme İşlemi

```bash
cd /home/cloudpanel/htdocs/otogaleri

# Değişiklikleri çek
git pull origin main

# Backend
cd backend
npm install --production
npm run build
pm2 restart otogaleri-backend

# Frontend
cd ../frontend
npm install
npm run build
# Nginx otomatik olarak yeni build'i serve edecek
```

## Sorun Giderme

### Backend başlamıyor
- `.env` dosyasının doğru yapılandırıldığından emin olun
- Port'un kullanılabilir olduğunu kontrol edin: `netstat -tulpn | grep 5005`
- Logları kontrol edin: `pm2 logs otogaleri-backend`

### Frontend API'ye bağlanamıyor
- `VITE_API_BASE` environment variable'ının doğru olduğundan emin olun
- Nginx proxy yapılandırmasını kontrol edin
- Browser console'da hataları kontrol edin

### Resimler görünmüyor
- `/uploads` klasörünün izinlerini kontrol edin
- Nginx'te `/uploads` location'ının doğru yapılandırıldığından emin olun

## Güvenlik Notları

1. **JWT_SECRET:** Güçlü ve rastgele bir secret key kullanın
2. **Database Password:** Güçlü bir şifre kullanın
3. **Environment Variables:** `.env` dosyalarını asla git'e commit etmeyin
4. **HTTPS:** Production'da mutlaka SSL kullanın
5. **Firewall:** Sadece gerekli portları açık tutun

## Performans Optimizasyonları

1. **Nginx Caching:** Statik dosyalar için cache ekleyin
2. **Gzip:** Nginx'te gzip compression aktif
3. **PM2 Cluster Mode:** Yüksek trafik için PM2 cluster mode kullanın
4. **Database Indexing:** Sık kullanılan sorgular için index'ler ekleyin
