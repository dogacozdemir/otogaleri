# Multi-Currency Sistem Dokümantasyonu

## ⚠️ ÖNEMLİ UYARILAR VE BİLİNEN SORUNLAR

### 🛑 Kritik Sorun 1: Base Currency Değişimi ve Raporlama

**Problem**: Base currency değiştirildiğinde, mevcut `amount_base` değerleri eski base currency'ye göre hesaplanmış olarak kalır. Raporlar yeni base currency ile formatlanır, ancak toplanan değerler eski base currency'ye aittir.

**Örnek Senaryo:**
```
1. Base Currency: TRY
2. Gelir kaydı: 1,000 USD → amount_base = 32,500 TRY (USD/TRY = 32.5)
3. Base Currency → EUR olarak değiştirildi
4. Rapor: amount_base (32,500) EUR olarak gösterilir → "€32,500.00"
   ❌ YANLIŞ: 32,500 TRY ≠ 32,500 EUR (gerçekte ~950 EUR olmalı)
```

**Mevcut Durum**: 
- Sistem `amount_base` değerlerini kullanarak raporlar oluşturur
- Base currency değiştiğinde bu değerler güncellenmez (tarihsel veri bütünlüğü için)
- **Sonuç**: Base currency değiştiğinde, mevcut raporlar yanlış sonuçlar gösterebilir

**Çözüm Önerileri**:
1. **Önerilen**: Base currency değiştirildiğinde kullanıcıya uyarı gösterin
2. **Gelecek İyileştirme**: Raporlama anında orijinal `amount` ve `currency` değerlerini kullanarak yeni base currency'ye çevrim yapın

**⚠️ UYARI**: Base currency değiştirmeden önce mevcut raporları kaydedin veya export edin.

---

### ✅ Çözüldü: Inventory Ortalama Fiyat Hesaplama

**Önceki Problem**: Farklı currency ile stok girişi yapıldığında, ortalama fiyat hesaplaması karmaşık hale geliyordu.

**Çözüm**:
1. Mevcut stok ve yeni giriş base currency'ye çevrilir
2. Ortalama base currency'de hesaplanır
3. **Her zaman base currency'de saklanır** (`cost_price` ve `cost_currency`)

**Mevcut Mantık**:
- `cost_price`: Her zaman base currency'de saklanır
- `cost_currency`: Her zaman base currency (tenant'ın `default_currency`)
- `cost_fx_rate_to_base`: Her zaman 1.0 (base currency'de olduğu için)
- Gösterim: Base currency ile formatlanır

**Avantajlar**:
- ✅ Tutarlı maliyet takibi
- ✅ Kullanıcı karmaşası yok
- ✅ Gösterim ve veri tutarlı

---

### 🛑 Kritik Sorun 3: Kur Riski ve Tarihsel Hesaplamalar

**Problem**: Araç maliyeti hesaplanırken, maliyetin hesaplandığı andaki kurlar kullanılır. Satış aylar sonra gerçekleşirse, kur farkı kâr hesaplamasını etkiler.

**Örnek**:
```
1. Araç alışı: 50,000 USD × 32.5 = 1,625,000 TRY (maliyet)
2. 3 ay sonra satış: 55,000 USD × 35.0 = 1,925,000 TRY (gelir)
3. Hesaplanan Kâr: 1,925,000 - 1,625,000 = 300,000 TRY
   Ancak gerçek kâr: 5,000 USD × 35.0 = 175,000 TRY
```

**Not**: Bu bir iş kararıdır. Tarihsel maliyet vs. güncel kur kullanımı arasında seçim yapılmalıdır.

---

### ⚠️ Teknik Sorun: FX Rate Tarih/Saat

**Problem**: Kurlar sadece tarih (YYYY-MM-DD) bazlı çekilir. Gün içinde yapılan işlemler aynı kurdan kaydedilir.

**Risk**: Volatil piyasalarda gün içi kur değişiklikleri yansıtılmaz.

**Gelecek İyileştirme**: Timestamp bazlı kur çekme ve cache'leme.

---

## Genel Bakış

Bu uygulama **multi-currency** (çoklu para birimi) desteğine sahiptir. Her kayıt kendi para birimiyle kaydedilir ve gösterilir. Toplam hesaplamalar (KPI kartları, raporlar) ise tenant'ın varsayılan para birimine çevrilerek gösterilir.

## Temel Prensipler

### 1. Kayıt Bazlı Currency
- Her kayıt (araç, harcama, gelir, gider, envanter ürünü) kendi para birimiyle kaydedilir
- Örnek: Bir araç USD ile, diğer araç TRY ile satılabilir
- Her harcama kendi para birimiyle kaydedilir

### 2. Base Currency (Temel Para Birimi)
- Her tenant'ın bir `default_currency` değeri vardır (genellikle TRY)
- Toplam hesaplamalar bu para birimine çevrilir
- `amount_base` alanı: Kayıt tutarının base currency'ye çevrilmiş hali
- `fx_rate_to_base`: Base currency'ye çevrim kuru

### 3. Gösterim Mantığı
- **Liste görünümleri**: Her kayıt kendi currency'siyle gösterilir
- **Toplam hesaplamalar**: Base currency'ye çevrilmiş değerler gösterilir
- **Raporlar**: Base currency kullanılır

---

## Sayfa Bazlı Detaylar

### 1. VehiclesPage (`/vehicles`)

#### Nasıl Çalışır?
- Her araç `purchase_currency` ve `sale_currency` alanlarına sahiptir
- Araç eklerken/düzenlerken currency seçimi yapılır
- Tabloda fiyatlar kendi currency'leriyle gösterilir

#### Veri Kaydetme
```typescript
// Araç ekleme/düzenleme
{
  purchase_amount: 50000,
  purchase_currency: "USD",  // Seçilen currency
  sale_price: 55000,
  sale_currency: "EUR"       // Seçilen currency
}
```

Backend'de:
- `purchase_fx_rate_to_base`: USD → TRY kuru hesaplanır
- `sale_fx_rate_to_base`: EUR → TRY kuru hesaplanır
- Bu kurlar `fxCacheService` ile otomatik alınır

#### Döviz Değiştirme
- **Ayarlar sayfasından para birimi değiştirilirse**: Sadece yeni kayıtlar için varsayılan currency değişir
- **Mevcut kayıtlar**: Kendi currency'leriyle kalmaya devam eder
- **Örnek**: 
  - Araç 1: USD ile kaydedilmiş → USD olarak gösterilir
  - Araç 2: TRY ile kaydedilmiş → TRY olarak gösterilir
  - Ayarlardan EUR seçilse bile, mevcut araçlar kendi currency'leriyle gösterilir

#### Harcamalar (Vehicle Costs)
- Her harcama kendi `currency` alanına sahiptir
- Harcama eklerken currency seçilir
- Harcamalar tabında her harcama kendi currency'siyle gösterilir
- Maliyet hesaplama: Tüm harcamalar base currency'ye çevrilerek toplanır

**Örnek Senaryo:**
```
Araç: 50,000 USD (purchase)
Harcama 1: 1,000 USD (repair)
Harcama 2: 5,000 TRY (insurance)

Maliyet Hesaplama (Base: TRY):
- Purchase: 50,000 USD × 32.5 = 1,625,000 TRY
- Harcama 1: 1,000 USD × 32.5 = 32,500 TRY
- Harcama 2: 5,000 TRY × 1.0 = 5,000 TRY
Toplam: 1,662,500 TRY
```

---

### 2. AccountingPage (`/accounting`)

#### Nasıl Çalışır?
- **Gelir/Gider Listeleri**: Her kayıt kendi currency'siyle gösterilir
- **KPI Kartları**: Toplamlar base currency'ye çevrilmiş (`amount_base`) gösterilir
- **Grafikler**: Base currency kullanılır

#### Veri Kaydetme
```typescript
// Gelir ekleme
{
  amount: 1000,           // Orijinal tutar
  currency: "USD",        // Seçilen currency
  amount_base: 32500,     // TRY'ye çevrilmiş (otomatik hesaplanır)
  fx_rate_to_base: 32.5   // USD → TRY kuru
}

// Gider ekleme
{
  amount: 500,
  currency: "EUR",
  amount_base: 17500,     // EUR → TRY çevrimi
  fx_rate_to_base: 35.0
}
```

#### Döviz Değiştirme
- **Liste görünümü**: Her kayıt kendi currency'siyle gösterilir (değişmez)
- **KPI kartları**: `amount_base` değerleri kullanılır, base currency ile formatlanır
- **Grafikler**: `amount_base` değerleri kullanılır

**Örnek Senaryo:**
```
Gelir Listesi:
- Gelir 1: 1,000 USD (kendi currency'siyle gösterilir)
- Gelir 2: 5,000 TRY (kendi currency'siyle gösterilir)
- Gelir 3: 500 EUR (kendi currency'siyle gösterilir)

Toplam Gelir KPI Kartı:
- amount_base değerleri toplanır: 32,500 + 5,000 + 17,500 = 55,000 TRY
- Base currency (TRY) ile formatlanır: "₺55.000,00"
```

---

### 3. InventoryPage (`/inventory`)

#### Nasıl Çalışır?
- Her ürün `cost_currency` ve `sale_currency` alanlarına sahiptir
- **ÖNEMLİ**: `cost_price` ve `cost_currency` her zaman base currency'de saklanır
- Ürün eklerken alış fiyatı farklı currency ile girilse bile, base currency'ye çevrilerek kaydedilir
- Satış fiyatı (`sale_price`, `sale_currency`) kendi currency'siyle saklanır
- Tabloda `cost_price` base currency ile, `sale_price` kendi currency'siyle gösterilir

#### Veri Kaydetme
```typescript
// Ürün ekleme (Frontend'den)
{
  cost_price: 100,
  cost_currency: "USD",    // Kullanıcı USD seçti
  sale_price: 150,
  sale_currency: "EUR"    // Satış fiyatı currency'si
}
```

Backend'de (Base Currency: TRY):
- `cost_price`: 3,250 TRY (100 USD × 32.5) - Base currency'ye çevrilmiş
- `cost_currency`: "TRY" - Her zaman base currency
- `cost_fx_rate_to_base`: 1.0 - Base currency'de olduğu için
- `sale_price`: 150 EUR - Kendi currency'siyle saklanır
- `sale_fx_rate_to_base`: 35.0 - EUR → TRY kuru

#### Stok Girişi (Entry)
- Giriş yaparken `cost_price` ve `cost_currency` seçilir
- Farklı currency ile giriş yapılırsa, ortalama fiyat base currency'ye çevrilerek hesaplanır
- **ÖNEMLİ**: Ortalama hesaplama sonucu her zaman base currency'de saklanır
- Ürünün `cost_price` ve `cost_currency` alanları her zaman base currency olarak güncellenir

**Örnek Senaryo:**
```
Mevcut Stok: 10 adet, 100 USD/adet (cost_currency: TRY, cost_price: 3,250 TRY - base currency'de)
Yeni Giriş: 5 adet, 3,200 TRY/adet (cost_currency: TRY, giriş anındaki fiyat)

Ortalama Hesaplama (Base: TRY):
- Mevcut: 10 × 3,250 TRY = 32,500 TRY
- Yeni: 5 × 3,200 TRY = 16,000 TRY
- Toplam: 48,500 TRY / 15 adet = 3,233.33 TRY/adet

Güncelleme:
- cost_price: 3,233.33 TRY (her zaman base currency'de saklanır)
- cost_currency: "TRY" (her zaman base currency)
- cost_fx_rate_to_base: 1.0 (base currency'de olduğu için)

⚠️ NOT: Ürünün ortalama maliyeti daima tenant'ın Base Currency'sinde (TRY) gösterilir. 
Farklı bir currency ile giriş yapılsa dahi, ortalama maliyet Base Currency'ye çevrilir ve 
Base Currency ile formatlanır. (Maliyet takibinde tutarlılık esas alınır.)
```

#### Stok Çıkışı (Exit)
- Çıkış yaparken `sale_price` ve `sale_currency` seçilir
- Satış için müşteri seçilir ve fiyat kaydedilir

#### Döviz Değiştirme
- **Ürün listesi**: 
  - `cost_price`: Her zaman base currency ile gösterilir (çünkü base currency'de saklanır)
  - `sale_price`: Kendi currency'siyle gösterilir
- **Ayarlardan currency değiştirilse**: 
  - Sadece yeni ürünler için varsayılan currency değişir
  - Mevcut ürünlerin `cost_price` değerleri base currency'de kalmaya devam eder
  - `sale_price` kendi currency'siyle kalmaya devam eder

---

### 4. AnalyticsPage (`/analytics`)

#### Nasıl Çalışır?
- Tüm raporlar ve hesaplamalar base currency kullanır
- Backend'den gelen veriler zaten `amount_base` formatındadır
- Grafikler ve KPI kartları base currency ile formatlanır

#### Veri Hesaplama
```sql
-- Backend'de örnek sorgu
SELECT 
  SUM(vs.sale_amount * vs.sale_fx_rate_to_base) as total_revenue,
  SUM(v.purchase_amount * v.purchase_fx_rate_to_base) as total_costs
FROM vehicle_sales vs
JOIN vehicles v ON vs.vehicle_id = v.id
```

- Tüm tutarlar base currency'ye çevrilerek toplanır
- Frontend'de base currency ile formatlanır

#### Döviz Değiştirme
- ⚠️ **KRİTİK UYARI**: Base currency değiştirildiğinde, mevcut `amount_base` değerleri eski base currency'ye göre hesaplanmış olarak kalır
- Raporlar yeni base currency ile formatlanır, ancak toplanan değerler eski base currency'ye aittir
- **Sonuç**: Base currency değiştiğinde raporlar yanlış sonuçlar gösterebilir
- **Öneri**: Base currency değiştirmeden önce mevcut raporları export edin veya yeni base currency'ye göre yeniden hesaplanması gerektiğini unutmayın

---

## Backend Veri Yapısı

### Tablolar ve Currency Alanları

#### `vehicles`
```sql
purchase_currency VARCHAR(3)           -- Alış para birimi
purchase_fx_rate_to_base DECIMAL      -- Alış kuru → base
sale_currency VARCHAR(3)               -- Satış para birimi
sale_fx_rate_to_base DECIMAL          -- Satış kuru → base
```

#### `vehicle_costs`
```sql
currency VARCHAR(3)                    -- Harcama para birimi
fx_rate_to_base DECIMAL               -- Kur → base
amount DECIMAL                         -- Orijinal tutar
-- amount_base hesaplanır: amount × fx_rate_to_base
```

#### `income` / `expenses`
```sql
currency VARCHAR(3)                    -- Para birimi
fx_rate_to_base DECIMAL               -- Kur → base
amount DECIMAL                         -- Orijinal tutar
amount_base DECIMAL                   -- Base currency'ye çevrilmiş tutar
```

#### `inventory_products`
```sql
cost_currency VARCHAR(3)              -- Her zaman base currency (tenant'ın default_currency)
cost_fx_rate_to_base DECIMAL         -- Her zaman 1.0 (base currency'de olduğu için)
cost_price DECIMAL                    -- Her zaman base currency'de saklanır
sale_currency VARCHAR(3)              -- Satış fiyatı para birimi (kendi currency'siyle saklanır)
sale_fx_rate_to_base DECIMAL         -- Satış kuru → base
```

**ÖNEMLİ**: `cost_price` ve `cost_currency` her zaman base currency'de saklanır. Farklı currency ile giriş yapılsa bile, base currency'ye çevrilerek kaydedilir.

#### `inventory_movements`
```sql
cost_currency VARCHAR(3)              -- Giriş fiyatı para birimi
cost_fx_rate_to_base DECIMAL         -- Giriş kuru → base
cost_amount_base DECIMAL             -- Giriş tutarı (base)
sale_currency VARCHAR(3)             -- Çıkış fiyatı para birimi
sale_fx_rate_to_base DECIMAL         -- Çıkış kuru → base
sale_amount_base DECIMAL              -- Çıkış tutarı (base)
```

---

## Frontend Gösterim Mantığı

### formatCurrencyWithCurrency Fonksiyonu

```typescript
// lib/formatters.ts
export const formatCurrencyWithCurrency = (
  amount: number | null | undefined | string,
  recordCurrency: string | null | undefined,
  locale: string = "tr-TR"
): string => {
  const currency = recordCurrency || "TRY";
  return formatCurrency(amount, currency, locale);
};
```

**Kullanım:**
```typescript
// Araç satış fiyatı
formatCurrencyWithCurrency(vehicle.sale_price, vehicle.sale_currency)
// → "$55,000.00" (eğer sale_currency = "USD")

// Harcama tutarı
formatCurrencyWithCurrency(cost.amount, cost.currency)
// → "₺5,000.00" (eğer currency = "TRY")
```

### useCurrency Hook

```typescript
// hooks/useCurrency.ts
export const useCurrency = () => {
  const { tenant } = useTenant();
  const currency = tenant?.default_currency || "TRY";
  
  const formatCurrency = (amount: number | null | undefined | string): string => {
    return baseFormatCurrency(amount, currency, locale);
  };
  
  return { formatCurrency, currency, locale };
};
```

**Kullanım:**
```typescript
// Toplam hesaplamalar için (base currency)
const { formatCurrency } = useCurrency();
formatCurrency(totalAmount) // → Base currency ile formatlanır
```

---

## FX Rate Hesaplama

### Otomatik Kur Çekme

Backend'de `fxCacheService` kullanılır:

```typescript
// backend/src/services/fxCacheService.ts
export async function getOrFetchRate(
  from: SupportedCurrency,
  to: SupportedCurrency,
  date: string
): Promise<number> {
  // 1. Önce cache'den kontrol et
  // 2. Yoksa FreeCurrencyAPI'den çek
  // 3. Cache'e kaydet
  // 4. Döndür
}
```

**Kur Hesaplama Senaryoları:**

1. **Aynı Currency**: `from === to` → `1.0` döner
2. **Base Currency'ye Çevrim**: `from → baseCurrency` → API'den çekilir
3. **Tarihli Kur**: Satış tarihine göre kur çekilir (tarihsel doğruluk)

---

## Senaryo Örnekleri

### Senaryo 1: Araç Satışı

```
1. Araç Ekleme:
   - Purchase: 50,000 USD
   - Sale: 55,000 EUR
   - Backend: 
     * purchase_fx_rate_to_base = 32.5 (USD → TRY)
     * sale_fx_rate_to_base = 35.0 (EUR → TRY)

2. Harcama Ekleme:
   - Repair: 1,000 USD
   - Insurance: 5,000 TRY
   - Backend:
     * Repair: fx_rate_to_base = 32.5
     * Insurance: fx_rate_to_base = 1.0

3. Satış:
   - Sale: 55,000 EUR
   - Backend:
     * sale_fx_rate_to_base = 35.0

4. Gösterim:
   - VehiclesPage: 
     * Purchase: "$50,000.00"
     * Sale: "€55,000.00"
     * Costs: "$1,000.00" ve "₺5,000.00"
   - AnalyticsPage:
     * Revenue: 55,000 × 35 = 1,925,000 TRY
     * Costs: (50,000 × 32.5) + (1,000 × 32.5) + 5,000 = 1,637,500 TRY
     * Profit: 287,500 TRY
```

### Senaryo 2: Envanter Yönetimi

```
1. Ürün Ekleme:
   - Cost: 100 USD/adet (Frontend'den girildi)
   - Sale: 150 EUR/adet
   - Backend (Base Currency: TRY):
     * cost_price = 3,250 TRY (100 USD × 32.5) - Base currency'ye çevrilmiş
     * cost_currency = "TRY" - Her zaman base currency
     * cost_fx_rate_to_base = 1.0 - Base currency'de olduğu için
     * sale_price = 150 EUR - Kendi currency'siyle saklanır
     * sale_currency = "EUR"
     * sale_fx_rate_to_base = 35.0 (EUR → TRY)

2. Stok Girişi:
   - 10 adet, 100 USD/adet (giriş anında)
   - Backend:
     * Movement kaydı: cost_price = 100 USD, cost_currency = "USD", cost_amount_base = 3,250 TRY
     * Ürün: cost_price = 3,250 TRY, cost_currency = "TRY" (base currency'de saklanır)

3. Stok Girişi (Farklı Currency):
   - 5 adet, 3,200 TRY/adet
   - Backend:
     * Ortalama hesaplanır (base currency'ye çevrilerek):
       - Mevcut: 10 × 3,250 TRY = 32,500 TRY
       - Yeni: 5 × 3,200 TRY = 16,000 TRY
       - Ortalama: 48,500 TRY / 15 adet = 3,233.33 TRY/adet
     * Yeni cost_price = 3,233.33 TRY (base currency'de)
     * cost_currency = "TRY" (her zaman base currency)
     * cost_fx_rate_to_base = 1.0

4. Stok Çıkışı (Satış):
   - 2 adet, 150 EUR/adet
   - Müşteri: Ahmet Yılmaz
   - Backend:
     * sale_price = 150, sale_currency = "EUR"
     * sale_amount_base = 150 × 35 = 5,250 TRY

5. Gösterim:
   - InventoryPage:
     * Cost: "₺3,233.33" (Base Currency - TRY)
     * Sale: "€150.00" (Kendi Currency'si - EUR)
```

### Senaryo 3: Muhasebe (Accounting)

```
1. Gelir Ekleme:
   - 1,000 USD
   - Backend:
     * amount = 1,000
     * currency = "USD"
     * fx_rate_to_base = 32.5
     * amount_base = 32,500

2. Gider Ekleme:
   - 500 EUR
   - Backend:
     * amount = 500
     * currency = "EUR"
     * fx_rate_to_base = 35.0
     * amount_base = 17,500

3. Gösterim:
   - Gelir Listesi:
     * "1,000 USD" (kendi currency'siyle)
   - Gider Listesi:
     * "500 EUR" (kendi currency'siyle)
   - KPI Kartları:
     * Toplam Gelir: "₺32,500.00" (amount_base toplamı)
     * Toplam Gider: "₺17,500.00" (amount_base toplamı)
     * Net Gelir: "₺15,000.00"
```

---

## Ayarlar Sayfasından Currency Değiştirme

### Ne Değişir?
1. **Yeni Kayıtlar**: Varsayılan currency değişir
2. **Mevcut Kayıtlar**: Kendi currency'leriyle kalmaya devam eder
3. **Toplam Hesaplamalar**: Yeni base currency ile formatlanır (ancak `amount_base` değerleri eski base currency'ye göre hesaplanmış olabilir)

### Örnek:
```
Önceki Durum:
- Base Currency: TRY
- Araç 1: 50,000 USD (sale_currency = "USD", amount_base = 1,625,000 TRY)
- Araç 2: 100,000 TRY (sale_currency = "TRY", amount_base = 100,000 TRY)

Ayarlardan Base Currency → EUR yapıldı:

Sonraki Durum:
- Base Currency: EUR
- Araç 1: Hala "50,000 USD" olarak gösterilir (kendi currency'si) ✅
- Araç 2: Hala "100,000 TRY" olarak gösterilir (kendi currency'si) ✅
- Yeni Araç: Varsayılan olarak EUR ile kaydedilir ✅
- Raporlar: 
  ❌ Toplam Gelir: "€1,725,000.00" gösterilir (YANLIŞ!)
  ✅ Doğrusu: amount_base değerleri (1,725,000 TRY) EUR'ye çevrilmeli
  ✅ Gerçek değer: ~49,285 EUR (1,725,000 TRY ÷ 35.0)
```

**⚠️ KRİTİK UYARI**: Base currency değiştiğinde, mevcut `amount_base` değerleri güncellenmez. Bu tarihsel veri bütünlüğü için önemlidir, ancak raporların yanlış sonuçlar gösterebileceği anlamına gelir. Base currency değiştirmeden önce mevcut raporları export edin.

---

## Teknik Detaylar

### Backend Currency Service

```typescript
// backend/src/services/fxCacheService.ts
export async function getOrFetchRate(
  from: SupportedCurrency,
  to: SupportedCurrency,
  date: string
): Promise<number> {
  // 1. Cache kontrolü (fx_rates tablosu)
  // 2. FreeCurrencyAPI'den çek
  // 3. Cache'e kaydet
  // 4. Döndür
}
```

### Frontend Currency Input Component

```typescript
// components/ui/currency-input.tsx
<CurrencyInput
  value={amount}
  currency={selectedCurrency}
  onValueChange={(value) => setAmount(value)}
  onCurrencyChange={(currency) => setCurrency(currency)}
  currencies={CURRENCIES}
/>
```

**Desteklenen Currency'ler:**
- TRY (Türk Lirası) - ISO 4217: TRY
- USD (Amerikan Doları) - ISO 4217: USD
- EUR (Euro) - ISO 4217: EUR
- GBP (İngiliz Sterlini) - ISO 4217: GBP
- JPY (Japon Yeni) - ISO 4217: JPY

**Not**: Frontend'de "YEN" olarak gösterilse de, backend'de ISO 4217 standardına uygun olarak "JPY" kullanılır. API çağrılarında otomatik dönüşüm yapılır.

---

## Önemli Notlar

### 1. Tarihsel Veri Bütünlüğü
- `amount_base` değerleri kayıt anındaki base currency'ye göre hesaplanır
- Base currency değişse bile, eski kayıtların `amount_base` değerleri değişmez
- Bu, tarihsel raporların doğruluğu için önemlidir

### 2. Kur Güncellemeleri
- Kurlar `fx_rates` tablosunda cache'lenir
- Aynı tarih için aynı kur tekrar çekilmez
- ⚠️ **Sınırlama**: Kurlar sadece tarih (YYYY-MM-DD) bazlı çekilir, saat bilgisi yoktur
- Gün içinde yapılan işlemler aynı kurdan kaydedilir (volatilite riski)
- Kur güncellemesi için cache temizlenmeli veya yeni tarih kullanılmalı

### 3. Ortalama Fiyat Hesaplama (Inventory)
- ✅ **ÇÖZÜLDÜ**: Envanter'de farklı currency ile giriş yapıldığında, ortalama base currency'ye çevrilerek hesaplanır
- Sonuç **her zaman base currency'de saklanır** (`cost_price` ve `cost_currency`)
- **Avantaj**: Tutarlı maliyet takibi, kullanıcı karmaşası yok, gösterim ve veri tutarlı
- **Gösterim**: `cost_price` her zaman base currency ile formatlanır

### 4. Null/Undefined Currency
- Currency belirtilmezse, tenant'ın `default_currency` değeri kullanılır
- Frontend'de `formatCurrencyWithCurrency` fonksiyonu null/undefined durumunda tenant'ın base currency'sini kullanır (hard-coded "TRY" değil)
- `useCurrency` hook'u kullanıldığında, `formatCurrencyWithCurrency` otomatik olarak base currency'yi fallback olarak kullanır

---

## Sorun Giderme

### Problem: Currency gösterilmiyor
**Çözüm**: 
- Backend'de currency alanının döndürüldüğünden emin olun
- Frontend'de `formatCurrencyWithCurrency` kullanıldığından emin olun

### Problem: Kur hesaplanmıyor
**Çözüm**:
- `fxCacheService` loglarını kontrol edin
- FreeCurrencyAPI anahtarının geçerli olduğundan emin olun
- Cache'de kur var mı kontrol edin

### Problem: amount_base yanlış hesaplanıyor
**Çözüm**:
- `fx_rate_to_base` değerinin doğru kaydedildiğinden emin olun
- Kur hesaplama tarihinin doğru olduğundan emin olun
- Backend'de `getOrFetchRate` fonksiyonunun çalıştığından emin olun

---

## Sonuç

Multi-currency sistemi, her kaydın kendi para birimiyle saklanmasını ve gösterilmesini sağlar. Toplam hesaplamalar base currency'ye çevrilir, ancak liste görünümlerinde her kayıt kendi currency'siyle gösterilir. Bu sayede:

1. ✅ Farklı currency'lerle işlem yapılabilir
2. ✅ Tarihsel veri bütünlüğü korunur
3. ✅ Raporlar tutarlı bir currency ile gösterilir
4. ✅ Kullanıcı her kaydın orijinal currency'sini görebilir

## ⚠️ Bilinen Sınırlamalar ve Gelecek İyileştirmeler

1. **Base Currency Değişimi**: Base currency değiştiğinde, mevcut `amount_base` değerleri güncellenmez. Raporlar yanlış sonuçlar gösterebilir.
2. **FX Rate Tarih/Saat**: Kurlar sadece tarih bazlı çekilir, saat bilgisi yoktur.
3. ✅ **Inventory Ortalama Hesaplama**: ÇÖZÜLDÜ - Ortalama maliyet her zaman base currency'de saklanır.
4. **Kur Riski**: Tarihsel maliyetler ile güncel satış gelirleri arasındaki kur farkı kâr hesaplamasını etkiler.

**Önerilen İyileştirmeler**:
- Base currency değiştiğinde kullanıcıya uyarı göster
- Raporlama anında orijinal `amount` ve `currency` değerlerini kullanarak yeni base currency'ye çevrim yap
- Timestamp bazlı kur çekme ve cache'leme


