# Image Editor & CDN Purge Implementation Summary

## 📋 Genel Bakış

Bu dokümantasyon, fotoğraf yönetim sistemine eklenen **Frontend Image Editor** ve **Backend CDN Purge** modüllerinin teknik detaylarını ve kullanımını açıklar.

---

## 🎨 1. Frontend Image Editor

### Kütüphane: `react-easy-crop`

**Kurulum:**
```bash
npm install react-easy-crop
```

**Bileşen:** `frontend/src/components/ImageEditor.tsx`

### Özellikler

#### Aspect Ratio Seçenekleri
- **16:9** (Geniş Ekran) - Varsayılan
- **4:3** (Klasik)
- **1:1** (Kare)
- **3:2** (Fotoğraf)
- **Serbest** (0) - Herhangi bir oran

#### Düzenleme Araçları
- **Zoom:** 1x - 3x arası slider ile kontrol
- **Rotation:** 90° artışlarla döndürme
- **Crop:** Seçilen aspect ratio'ya göre kırpma

### Kullanım Akışı

```typescript
// 1. Kullanıcı dosya seçer veya sürükler
handleFileSelect() → setImageToEdit(file) → setShowImageEditor(true)

// 2. ImageEditor modal açılır
<ImageEditor
  open={showImageEditor}
  imageFile={imageToEdit}
  onSave={handleImageEditorSave}
/>

// 3. Kullanıcı düzenleme yapar
- Aspect ratio seçer
- Zoom yapar
- Rotate yapar
- Crop alanını ayarlar

// 4. "Kaydet" butonuna tıklar
getCroppedImg() → Blob oluştur → onSave(blob)

// 5. Düzenlenmiş görsel upload akışına dahil edilir
handleImageEditorSave() → uploadFiles([editedFile])
```

### Teknik Detaylar

**Canvas-based Cropping:**
```typescript
const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<Blob> => {
  // 1. Image element oluştur
  const image = await createImage(imageSrc);
  
  // 2. Canvas oluştur ve rotation hesapla
  const canvas = document.createElement("canvas");
  const { width, height } = rotateSize(image.width, image.height, rotation);
  
  // 3. Canvas'a çiz ve crop alanını al
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, ...);
  
  // 4. Blob'a çevir
  return canvas.toBlob();
};
```

**Batch Upload Entegrasyonu:**
- Tek dosya: Direkt editörde açılır
- Çoklu dosya: İlk dosya editörde, diğerleri `pendingFiles` state'inde bekler
- Editörden kaydedildiğinde: Düzenlenmiş dosya + pending dosyalar birlikte upload edilir

---

## ☁️ 2. Backend CDN Purge (CloudFront)

### Kütüphane: `@aws-sdk/client-cloudfront`

**Kurulum:**
```bash
npm install @aws-sdk/client-cloudfront
```

**Dosya:** `backend/src/services/storage/s3StorageProvider.ts`

### Özellikler

#### Asenkron Cache Invalidation
- **Fire-and-forget:** Ana request'i bloklamaz
- **Background task:** CDN purge başarısız olsa bile ana işlem devam eder
- **Error handling:** Hatalar loglanır ama exception fırlatılmaz

#### Cost Optimization
- **İlk 1,000 path/ay:** Ücretsiz
- **Sonrası:** $0.005 per path
- **Strateji:** Sadece kritik güncellemelerde purge (update/delete)

### Kullanım

**Environment Variable:**
```bash
AWS_CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC
```

**Metod:**
```typescript
async purgeCache(key: string): Promise<boolean> {
  // 1. CloudFront client kontrolü
  if (!this.cloudFrontClient || !this.cloudFrontDistributionId) {
    return true; // Not configured, not an error
  }

  // 2. Invalidation oluştur
  const command = new CreateInvalidationCommand({
    DistributionId: this.cloudFrontDistributionId,
    InvalidationBatch: {
      Paths: { Quantity: 1, Items: [`/${cleanKey}`] },
      CallerReference: `purge-${Date.now()}-${random}`,
    },
  });

  // 3. Asenkron execute (don't await)
  this.cloudFrontClient.send(command).catch((error) => {
    console.error(`CDN purge failed:`, error);
  });

  return true;
}
```

### Otomatik Purge Noktaları

1. **Image Upload:** `uploadVehicleImage()` → Başarılı upload sonrası
2. **Image Delete:** `deleteVehicleImage()` → Başarılı delete sonrası

**Örnek:**
```typescript
// Upload sonrası
await StorageService.upload(...);
StorageService.purgeCache(key).catch(...); // Background task

// Delete sonrası
await StorageService.delete(key);
StorageService.purgeCache(key).catch(...); // Background task
```

---

## 🚀 3. Akıllı Önbellek Yönetimi

### StorageService.getUrl() Optimizasyonu

**Önceki Davranış:**
- Her zaman Signed URL üretiyordu
- CDN kullanılsa bile S3'ten signed URL dönüyordu

**Yeni Davranış:**
```typescript
async getUrl(key: string, isPublic: boolean = false): Promise<string> {
  // Public dosyalar için CDN URL kullan
  if (this.baseUrl && isPublic) {
    return `${this.baseUrl}/${cleanKey}`;
  }

  // Private dosyalar için Signed URL
  return await getSignedUrl(...);
}
```

**Kullanım:**
```typescript
// Public images (vehicle images)
const url = await StorageService.getUrl(key); // CDN URL if configured

// Private files
const url = await StorageService.getUrl(key, false); // Signed URL
```

### CDN vs Signed URL Karar Matrisi

| Durum | AWS_S3_BASE_URL | makePublic | Sonuç |
|-------|----------------|------------|-------|
| CDN configured | ✅ | ✅ | CDN URL |
| CDN configured | ✅ | ❌ | Signed URL |
| No CDN | ❌ | ✅ | Signed URL |
| No CDN | ❌ | ❌ | Signed URL |

---

## 📦 Yeni Bağımlılıklar

### Frontend
```json
{
  "dependencies": {
    "react-easy-crop": "^5.0.0"  // Image cropping library
  }
}
```

### Backend
```json
{
  "dependencies": {
    "@aws-sdk/client-cloudfront": "^3.948.0"  // CloudFront SDK
  }
}
```

**Kurulum Komutları:**
```bash
# Frontend
cd frontend && npm install react-easy-crop

# Backend
cd backend && npm install @aws-sdk/client-cloudfront
```

---

## 🔄 Sistem Akışı

### Image Upload Flow (with Editor)

```
1. User selects/drops files
   ↓
2. ImageEditor opens (first file)
   ↓
3. User crops/rotates/zooms
   ↓
4. User clicks "Save"
   ↓
5. getCroppedImg() → Blob
   ↓
6. uploadFiles([editedBlob, ...pendingFiles])
   ↓
7. Backend: Sharp optimization (WebP)
   ↓
8. S3 Upload
   ↓
9. DB Insert (transaction)
   ↓
10. CDN Purge (background)
   ↓
11. Response with Signed URL/CDN URL
```

### Image Delete Flow (with Purge)

```
1. User clicks delete
   ↓
2. DB Delete (transaction)
   ↓
3. S3 Delete
   ↓
4. CDN Purge (background)
   ↓
5. Response success
```

---

## ⚙️ Environment Variables

### Backend (.env)

```bash
# Existing
AWS_S3_BUCKET=your-bucket-name
AWS_S3_BASE_URL=https://cdn.yourdomain.com  # CloudFront URL
AWS_REGION=us-east-1

# New
AWS_CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC
```

**Bulma:**
1. AWS Console → CloudFront
2. Distribution seç
3. "General" tab → "Distribution ID" kopyala

---

## 🎯 Best Practices

### Image Editor
1. **Aspect Ratio:** Varsayılan 16:9 (galeri için optimal)
2. **Quality:** Canvas toBlob quality: 0.95 (yüksek kalite)
3. **Batch:** İlk dosya editörde, diğerleri otomatik upload

### CDN Purge
1. **Frequency:** Sadece update/delete'te purge
2. **Error Handling:** Background task, ana flow'u etkilemez
3. **Cost:** Aylık 1,000 path limitini takip et
4. **Monitoring:** CloudWatch ile invalidation metriklerini izle

### Performance
1. **CDN URL:** Public dosyalar için CDN kullan (daha hızlı)
2. **Signed URL:** Private dosyalar için (güvenlik)
3. **Lazy Loading:** Frontend'de `loading="lazy"` kullan
4. **Batch Upload:** 3'erli gruplar halinde paralel upload

---

## 🐛 Troubleshooting

### Image Editor
**Problem:** Crop sonrası görsel bozuk
- **Çözüm:** Canvas rotation hesaplamasını kontrol et
- **Kontrol:** `rotateSize()` fonksiyonu doğru çalışıyor mu?

**Problem:** Blob oluşturulamıyor
- **Çözüm:** Canvas toBlob() callback kontrolü
- **Kontrol:** Image type ve quality parametreleri

### CDN Purge
**Problem:** Purge çalışmıyor
- **Kontrol:** `AWS_CLOUDFRONT_DISTRIBUTION_ID` set edilmiş mi?
- **Kontrol:** IAM permissions (cloudfront:CreateInvalidation)
- **Log:** Console'da "CDN cache purge initiated" mesajı var mı?

**Problem:** Purge çok yavaş
- **Not:** Normal! CloudFront invalidation 1-5 dakika sürebilir
- **Optimizasyon:** Batch invalidation kullan (multiple paths)

---

## 📊 Monitoring

### CloudFront Metrics (AWS Console)
- **Invalidation Requests:** Aylık purge sayısı
- **Invalidation Status:** Başarılı/başarısız oranı
- **Cost:** İlk 1,000'den sonra maliyet

### Application Logs
```
[S3Storage] CDN cache purge initiated for: /tenants/1/vehicles/...
[S3Storage] Failed to purge CDN cache for ...: Error message
```

---

## 🔐 Security Considerations

1. **IAM Permissions:** CloudFront invalidation için minimum yetki
2. **Signed URLs:** Private dosyalar için mutlaka signed URL
3. **CDN Security:** CloudFront signed URLs (gelecek özellik)
4. **File Validation:** Frontend'de crop öncesi validasyon

---

## 📝 Sonuç

Bu implementasyon ile:
- ✅ Kullanıcılar görselleri düzenleyebilir (crop, rotate, zoom)
- ✅ CDN cache otomatik temizlenir (update/delete sonrası)
- ✅ Public dosyalar CDN'den servis edilir (daha hızlı)
- ✅ Private dosyalar signed URL ile korunur (güvenlik)
- ✅ Background tasks ana flow'u bloklamaz (performans)

**Production'a Hazır:** ✅
