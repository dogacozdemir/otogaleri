# Database Migrations

Bu klasör database migration dosyalarını içerir. Migration'lar otomatik olarak takip edilir ve sıralı olarak çalıştırılır.

## Migration Dosya İsimlendirme

Migration dosyaları şu formatta olmalıdır:
- `000_create_migration_tracking.sql` (ilk migration - tracking tablosu)
- `001_add_vehicle_number.sql`
- `002_add_installment_sales.sql`
- vb.

**Önemli:** Dosya isimlerinde numara prefix'i kullanın (örn: `001_`, `002_`) böylece sıralı çalıştırılırlar.

## Migration Çalıştırma

### Lokal Ortam (Development)
```bash
npm run migrate
```

### Production Ortam
```bash
# Build et
npm run build

# Migration'ları çalıştır
node dist/scripts/runMigrations.js
```

## Migration Takibi

Migration'lar `schema_migrations` tablosunda takip edilir:
- Hangi migration'lar çalıştırıldı
- Ne zaman çalıştırıldı
- Başarılı mı başarısız mı
- Hata mesajları (varsa)

## Yeni Migration Oluşturma

1. Yeni bir SQL dosyası oluştur: `migrations/XXX_description.sql`
2. Dosya ismini numara ile başlat (sıralı olmalı)
3. Migration SQL'ini yaz
4. **Önemli:** Migration'ları idempotent yapın (IF NOT EXISTS, IF EXISTS gibi kullanın)

### Örnek Migration

```sql
-- Migration: Add new column
-- Description: Adds status column to vehicles table

USE otogaleri;

-- Idempotent: Only add if doesn't exist
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'vehicles'
    AND COLUMN_NAME = 'status'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE vehicles ADD COLUMN status VARCHAR(50) DEFAULT "active"',
  'SELECT "Column already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration completed successfully' as message;
```

## Test ve Production Senkronizasyonu

### Senaryo 1: Test'te yeni migration oluşturdunuz

1. Migration dosyasını oluşturun: `migrations/015_new_feature.sql`
2. Test ortamında çalıştırın: `npm run migrate`
3. Git'e commit edin
4. Production'a deploy edin
5. Production'da çalıştırın: `npm run migrate` (sadece yeni migration çalışır)

### Senaryo 2: Production'da migration çalıştırmak istiyorsunuz

1. Git'ten en son migration'ları çekin
2. `npm run migrate` çalıştırın
3. Sistem otomatik olarak sadece çalışmamış migration'ları çalıştırır

## Migration Durumunu Kontrol Etme

Migration'ların durumunu görmek için:

```sql
SELECT 
  migration_name,
  executed_at,
  execution_time_ms,
  success,
  error_message
FROM schema_migrations
ORDER BY executed_at DESC;
```

## Rollback (Geri Alma)

Migration sistemi otomatik rollback yapmaz. Eğer bir migration'ı geri almak isterseniz:

1. Yeni bir migration dosyası oluşturun (örn: `016_rollback_015.sql`)
2. Geri alma SQL'ini yazın
3. Çalıştırın

## Best Practices

1. **Idempotent Migration'lar:** Her migration'ı idempotent yapın (birden fazla kez çalıştırılabilir)
2. **Açıklayıcı İsimler:** Migration dosya isimlerini açıklayıcı yapın
3. **Küçük Migration'lar:** Her migration'ı küçük ve odaklı tutun
4. **Test Edin:** Migration'ları test ortamında mutlaka test edin
5. **Backup:** Production'da migration çalıştırmadan önce backup alın

## Sorun Giderme

### Migration başarısız oldu

1. `schema_migrations` tablosunda hata mesajını kontrol edin
2. Hatayı düzeltin
3. Migration dosyasını güncelleyin
4. Tekrar çalıştırın (sistem başarısız migration'ı tekrar çalıştıracak)

### Migration'ı tekrar çalıştırmak istiyorum

```sql
-- schema_migrations tablosundan migration kaydını silin
DELETE FROM schema_migrations WHERE migration_name = 'migration_name_here';
```

Sonra tekrar `npm run migrate` çalıştırın.

