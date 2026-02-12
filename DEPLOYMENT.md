# Production Deployment Guide - CloudPanel

Bu dokümantasyon, Otogaleri (AkıllıGaleri) projesini CloudPanel kurulu Ubuntu server'da production ortamına deploy etmek için gereken adımları içerir.

## Domain Mimarisi (Production)

| Domain | Rol | İçerik |
|--------|-----|--------|
| **https://akilligaleri.com** | Landing (Tanıtım) | Statik tanıtım sitesi (`landing/dist`) |
| **https://app.akilligaleri.com** | Frontend (Uygulama) | SPA dashboard (`frontend/dist`) |
| **https://api.akilligaleri.com** | Backend (API) | Node.js API + Nginx proxy → `localhost:5005` |

CORS ve şifre sıfırlama linkleri bu domain’lere göre yapılandırılmalıdır.

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
OTG_DB_HOST=localhost
OTG_DB_PORT=3306
OTG_DB_USER=otogaleri_user
OTG_DB_PASSWORD=güçlü_şifre_buraya
OTG_DB_NAME=otogaleri

# Server
PORT=5005
NODE_ENV=production

# JWT (Minimum 64 karakter, güçlü bir secret kullanın)
JWT_SECRET=çok_güvenli_ve_uzun_jwt_secret_key_buraya_minimum_64_karakter_olmalı

# Frontend & CORS (şifre sıfırlama linki + CORS izinleri)
FRONTEND_URL=https://app.akilligaleri.com
ALLOWED_ORIGINS=https://akilligaleri.com,https://app.akilligaleri.com
ALLOWED_SUBDOMAINS=akilligaleri.com,app.akilligaleri.com,api.akilligaleri.com

# Mail (SMTP) – şifre sıfırlama, taksit hatırlatma vb. için (opsiyonel; boş bırakılırsa mail gönderilmez)
SMTP_HOST=email-smtp.eu-north-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@akilligaleri.com
# AWS SES Sandbox test: tüm mailleri tek adrese yönlendir (production'da boş bırakın)
# MAIL_SANDBOX_OVERRIDE_TO=test@example.com
# Sadece konsola yaz, gerçek gönderim yapma (geliştirme)
# MAIL_DEV_LOG_ONLY=true

# FreeCurrencyAPI (Opsiyonel - kur analizi için)
FREECURRENCY_API_KEY=your_api_key_here
FREECURRENCY_API_BASE=https://api.freecurrencyapi.com/v1
```

Mail yapılandırması ve production checklist için: `backend/MAIL_PRODUCTION_READINESS_REPORT.md`.

### Veritabanı Migration
```bash
cd /home/cloudpanel/htdocs/otogaleri/backend

# Schema'yı yükle (temel tablolar)
mysql -u otogaleri_user -p otogaleri < schema.sql

# Migration'ları sırayla çalıştır (ÖNEMLİ: Tüm migration'ları çalıştırın)
mysql -u otogaleri_user -p otogaleri < migrations/add_vehicle_images.sql
mysql -u otogaleri_user -p otogaleri < migrations/add_tenant_settings.sql
mysql -u otogaleri_user -p otogaleri < migrations/add_installment_sales.sql
mysql -u otogaleri_user -p otogaleri < migrations/add_inventory_tables.sql
mysql -u otogaleri_user -p otogaleri < migrations/add_followup_and_documents.sql
mysql -u otogaleri_user -p otogaleri < migrations/add_track_stock_to_inventory.sql
mysql -u otogaleri_user -p otogaleri < migrations/remove_ps_tw_add_plate_number.sql
mysql -u otogaleri_user -p otogaleri < migrations/014_add_engine_no.sql
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
# Production: API ayrı domain'de (build zamanında embed edilir)
VITE_API_BASE=https://api.akilligaleri.com/api
```

### Frontend Build
```bash
npm run build
```

## 3. CloudPanel Yapılandırması

### Site Oluşturma (Üç Domain)

Üç ayrı site (veya tek sitede üç server block) kullanın:

| Site | Domain | Document Root / Rol |
|------|--------|---------------------|
| Landing | **akilligaleri.com** | `/home/cloudpanel/htdocs/otogaleri/landing/dist` (statik) |
| Uygulama (Frontend) | **app.akilligaleri.com** | `/home/cloudpanel/htdocs/otogaleri/frontend/dist` (SPA) |
| API (Backend proxy) | **api.akilligaleri.com** | Nginx ile `proxy_pass` → `http://127.0.0.1:5005` |

1. CloudPanel'de **app.akilligaleri.com** için site oluşturun (frontend).
2. **akilligaleri.com** için ayrı site (landing) ve **api.akilligaleri.com** için ayrı site (API proxy) oluşturun.
3. API sitesinde **Document Root** yerine Nginx'te sadece `/api` ve `/uploads` proxy edilir (aşağıdaki Nginx örneği).

### Backend Node.js Uygulaması
1. CloudPanel'de **Node.js App** oluşturun (veya mevcut backend için).
2. **App Path:** `/home/cloudpanel/htdocs/otogaleri/backend`
3. **Start Command:** `node dist/server.js`
4. **Port:** `5005` (`.env` içinde `PORT=5005` veya `process.env.PORT || 5005`)
5. **Environment Variables:** `.env` dosyasındaki değerleri ekleyin (veya .env dosyasını kullanın).

### Frontend Static Files (app.akilligaleri.com)
1. **app.akilligaleri.com** site ayarlarına gidin.
2. **Document Root:** `/home/cloudpanel/htdocs/otogaleri/frontend/dist`
3. Nginx yapılandırmasını düzenleyin (aşağıdaki örnek).

## 4. Nginx Yapılandırması

### app.akilligaleri.com (Frontend – SPA)

CloudPanel'de **app.akilligaleri.com** site ayarları → **Nginx Config**:

```nginx
server {
    listen 80;
    server_name app.akilligaleri.com;
    
    root /home/cloudpanel/htdocs/otogaleri/frontend/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
}
```

### api.akilligaleri.com (Backend API proxy)

**api.akilligaleri.com** için ayrı site → Nginx'te tüm trafiği backend'e yönlendirin:

```nginx
server {
    listen 80;
    server_name api.akilligaleri.com;
    
    location / {
        proxy_pass http://127.0.0.1:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_pass_request_headers on;
    }
    
    location /uploads {
        proxy_pass http://127.0.0.1:5005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type";
    }
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json;
}
```

### akilligaleri.com (Landing – opsiyonel)

Landing ayrı sitede ise **Document Root:** `.../landing/dist`, `try_files $uri $uri/ /index.html;` ile SPA benzeri tek sayfa yeterlidir.

## 5. SSL Sertifikası (Let's Encrypt)

CloudPanel'de her site için (akilligaleri.com, app.akilligaleri.com, api.akilligaleri.com) **SSL** bölümünden Let's Encrypt sertifikası oluşturun.

## 6. Mail (E-posta) Yapılandırması

Uygulama şifre sıfırlama ve taksit hatırlatma mailleri için SMTP kullanır. Backend `.env` içinde **SMTP_*** (veya **MAIL_***) tanımlanmalıdır.

| Değişken | Açıklama |
|----------|----------|
| `SMTP_HOST` | SMTP sunucusu (örn. Gmail: `smtp.gmail.com`, AWS SES: `email-smtp.eu-north-1.amazonaws.com`) |
| `SMTP_PORT` | Genelde `587` |
| `SMTP_SECURE` | `false` (587 için) |
| `SMTP_USER` / `SMTP_PASS` | SMTP kimlik bilgileri |
| `SMTP_FROM` | Gönderen adresi; **AWS SES kullanıyorsanız SES’te doğrulanmış olmalı** (örn. `noreply@akilligaleri.com`) |
| `FRONTEND_URL` | Şifre sıfırlama linkinin base URL’i; production’da `https://app.akilligaleri.com` |

- **AWS SES Sandbox:** Sadece doğrulanmış adreslere mail gider. Test için `.env`’de `MAIL_SANDBOX_OVERRIDE_TO=test@example.com` ile tüm mailleri tek adrese yönlendirebilirsiniz; production’da bu değişkeni boş bırakın.
- **Geliştirme:** `MAIL_DEV_LOG_ONLY=true` ile gerçek gönderim yapılmaz, içerik konsola yazılır.
- Ayrıntılı kontrol listesi: `backend/MAIL_PRODUCTION_READINESS_REPORT.md`.

## 7. PM2 ile Process Management (Opsiyonel)

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

## 8. Dosya İzinleri

```bash
# Uploads klasörü için yazma izni
chmod -R 755 /home/cloudpanel/htdocs/otogaleri/backend/uploads
chown -R cloudpanel:cloudpanel /home/cloudpanel/htdocs/otogaleri/backend/uploads
```

## 9. Firewall Ayarları

```bash
# Sadece HTTP (80) ve HTTPS (443) portlarını açık tutun
# Backend portu (5005) sadece localhost'tan erişilebilir olmalı
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 10. Test ve Doğrulama

1. **Landing:** `https://akilligaleri.com` — tanıtım sayfası açılmalı.
2. **Frontend (Uygulama):** `https://app.akilligaleri.com` — giriş/kayıt sayfası; yeni galeri hesabı oluşturup giriş yapın.
3. **Backend Health Check:** `https://api.akilligaleri.com/health` — yanıt: `{"status":"ok","service":"otogaleri-backend"}`

4. **Şifre sıfırlama:** “Şifremi unuttum” ile mail gelmeli; link `https://app.akilligaleri.com/reset-password?token=...` formatında olmalı (FRONTEND_URL doğru ise).

## 11. Güncelleme İşlemi

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

### CORS Hatası (Not allowed by CORS)
- Backend `.env` dosyasında `ALLOWED_ORIGINS` ayarlı olmalı: `ALLOWED_ORIGINS=https://akilligaleri.com,https://app.akilligaleri.com`
- `FRONTEND_URL=https://app.akilligaleri.com` şifre sıfırlama linkleri için gerekli
- Backend’i yeniden başlatın: `pm2 restart otogaleri-backend`

### Resimler görünmüyor
- `/uploads` klasörünün izinlerini kontrol edin
- Nginx'te `/uploads` location'ının doğru yapılandırıldığından emin olun

## Güvenlik Notları

1. **JWT_SECRET:** Güçlü ve rastgele bir secret key kullanın (minimum 64 karakter)
   ```bash
   openssl rand -base64 64
   ```
2. **ALLOWED_ORIGINS:** Production’da sadece kullandığınız domain’leri ekleyin: `https://akilligaleri.com,https://app.akilligaleri.com`. Wildcard (`*.akilligaleri.com`) kullanmak isterseniz backend `appConfig` CORS’un bunu desteklediğini doğrulayın.
3. **FRONTEND_URL:** Şifre sıfırlama linki için `https://app.akilligaleri.com` olmalı; yanlış domain güvenlik ve kullanıcı deneyimi sorunlarına yol açar.
4. **SMTP_FROM (Mail):** AWS SES kullanıyorsanız gönderen adresi SES’te doğrulanmış olmalı (örn. `noreply@akilligaleri.com`).
5. **Database Password:** Güçlü bir şifre kullanın.
6. **Environment Variables:** `.env` dosyalarını asla git’e commit etmeyin.
7. **HTTPS:** Tüm domain’lerde (akilligaleri.com, app, api) SSL kullanın.
8. **Firewall:** Sadece 80/443 açık; backend portu (5005) sadece localhost’tan erişilebilir olmalı.

## Performans Optimizasyonları

1. **Nginx Caching:** Statik dosyalar için cache ekleyin
2. **Gzip:** Nginx'te gzip compression aktif
3. **PM2 Cluster Mode:** Yüksek trafik için PM2 cluster mode kullanın
4. **Database Indexing:** Sık kullanılan sorgular için index'ler ekleyin
