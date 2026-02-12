# Mobil UI/UX Analiz Raporu ve Hareket Planı

**Proje:** Otogaleri (Akıllı Galeri)  
**Kapsam:** Frontend (web app) + Landing  
**Tarih:** Şubat 2025  
**Amaç:** Mobil görünümde uzmanlaşmış derinlemesine analiz; “şu an nasıl” / “nasıl olmalı” ve adım adım uygulanacak hareket planı.  
**Kısıt:** Bu döküman onaylanana kadar hiçbir dosya oluşturulmayacak ve kodda değişiklik yapılmayacak.

---

## 1. Genel Mimari ve Breakpoint Stratejisi

### 1.1 Şu an nasıl
- **Tailwind:** Varsayılan breakpoint’ler kullanılıyor (sm: 640px, md: 768px, lg: 1024px). `tailwind.config.js` içinde özel breakpoint tanımı yok.
- **use-mobile:** `768px` (MOBILE_BREAKPOINT) ile “mobil” tanımı yapılıyor; sidebar davranışı ve header bu değere göre.
- **index.css:** 640px için responsive tipografi (`.text-h1`–`.text-h4` küçülüyor), 768px’te touch target’lar (min 44px) ve safe-area sınıfları var. Container’lar sabit max-width (1400px, 1200px) ile merkezde.

### 1.2 Nasıl olmalı
- Tek bir “mobil” tanımı yerine **sm / md / lg** için tutarlı kullanım: örn. sidebar/hamburger `lg` (1024px) altında, form/table/card düzenleri `sm` ve `md`’de ayrı ele alınmalı.
- **Tailwind config:** Proje genelinde kullanılacak breakpoint’ler (isteğe bağlı) `theme.screens` ile netleştirilmeli; `use-mobile` 768px’e bağlı kalsın ama dokümanda “mobil” = ~320–768px, “tablet” = 768–1024px olarak tarif edilmeli.
- **Safe area:** Özellikle bottom bar / sticky CTA’larda `env(safe-area-inset-*)` kullanımı tüm ilgili bileşenlerde kontrol edilmeli.

---

## 2. Layout: Sidebar ve Ana İskelet

### 2.1 SidebarLayout

**Şu an nasıl**
- Sidebar: `lg:translate-x-0` ile masaüstünde sabit; mobilde `-translate-x-full` ve hamburger ile açılıyor. Overlay (backdrop) var, ESC ve dış tıklama ile kapanıyor.
- Sidebar genişliği: Daraltılmış 16 (w-16), açık 64 (w-64). Mobilde her zaman tam genişlik (açıkken).
- Header: `h-20`, `px-4 sm:px-6 lg:px-8`, sol tarafta hamburger (lg’de gizli), başlık (mobilde kısaltılmış: “Akıllı”), açıklama satırı `hidden sm:block`. Global arama: `hidden sm:block` (inline), mobilde `sm:hidden` ile sadece ikon. Sağda: arama ikonu, tema, kurulum, hızlı işlemler (mobilde sadece + ikonu), avatar.
- Main: `px-4 sm:px-6 lg:px-8 py-6`, `max-w-[1400px] mx-auto`.

**Nasıl olmalı**
- **Sidebar:** Mobilde tam ekran veya neredeyse tam ekran (örn. max-w-[85vw]) tercih edilebilir; parmakla kapatma (swipe) jesti eklenebilir.
- **Header:** Çok küçük ekranlarda (örn. <360px) başlık ve ikonlar taşmaması için `min-w-0` ve `truncate` tüm satırda garanti edilmeli; “Hızlı İşlemler” butonu mobilde sadece ikon (şu an öyle) ancak tıklanabilir alan en az 44x44px olmalı.
- **Sticky header:** Scroll’da gölge/border ile “yüzen” his verilebilir; `safe-top` ile notch’lu cihazlarda üst boşluk korunmalı.

---

## 3. Header ve Global Bileşenler

### 3.1 GlobalSearch

**Şu an nasıl**
- Mobilde `iconOnly` ile sadece ikon (h-9 w-9); Dialog açıldığında `sm:max-w-[600px]`, içerik `max-h-[400px] overflow-y-auto`. Arama input’u `h-12`, placeholder uzun. Son aramalar ve sonuçlar liste halinde.

**Nasıl olmalı**
- Mobilde dialog **tam genişlik** (örn. `w-[100vw] max-w-[100vw]` veya `inset-0` sheet benzeri) ve mümkünse **alt yarıdan slide-up** (drawer) ile açılabilir; klavye açıldığında içerik scroll’lanabilir.
- Arama butonu (ikon) en az 44x44px touch target olmalı; Dialog açıldığında mobilde klavye otomatik focus ile açılabileceği için input’a focus gecikmesi (100ms) uygun.
- Son aramalar / sonuç satırları: Satır yüksekliği en az 44px (veya padding ile tıklanabilir alan 44px) olmalı.

### 3.2 ThemeToggle, CurrencyConverterPopover, Dropdown’lar

**Şu an nasıl**
- ThemeToggle ve CurrencyConverterPopover header’da; DropdownMenu “Hızlı İşlemler” ve kullanıcı menüsü için kullanılıyor. İçerik `align="end"`, `w-56` / `w-64`.

**Nasıl olmalı**
- Tüm dropdown/popover’lar mobilde **tam genişlik veya ekran genişliğine yakın** açılabilir; Radix’in “modal” davranışı küçük ekranda daha iyi. Trigger (ikon/avatar) 44x44px minimum.
- Currency popover: Mobilde sayfa genişliğine uyumlu, büyük touch target’lı liste.

---

## 4. Sayfa Sayfa Analiz

### 4.1 AuthPage (Login / Register)

**Şu an nasıl**
- `max-w-md`, `p-4`, ortada kart. Tabs (Giriş/Kayıt) grid 2 kolon. Input’lar `pl-10` (ikonlu), butonlar `size="lg"`. Şifre gereksinimleri ve güç göstergesi kayıt formunda.

**Nasıl olmalı**
- Mobilde kart `w-full` ve yan padding (örn. 16px) ile sınırlı; `min-height` ile klavye açıldığında viewport’un küçülmesi hesaba katılmalı (örn. `min-h-[100dvh]` veya scroll).
- Input’lar: Yükseklik en az 48px (touch); “Şifrenizi mi unuttunuz?” linki tıklanabilir alanı yeterli olmalı.
- Tabs: Mobilde tam genişlik, font biraz büyük (okunaklı).

### 4.2 DashboardPage

**Şu an nasıl**
- KPI kartları: `grid gap-6 md:grid-cols-2 lg:grid-cols-4` — mobilde 1 kolon.
- Grafik alanları: `col-span-12 lg:col-span-8` ve `lg:col-span-4`; ResponsiveContainer ile genişlik %100, yükseklik 250–300px.
- Tablolar: “Son Satışlar” için standart `<Table>`; başlıklar: Araç, Model, Müşteri, Fiyat, Ödeme Tipi.
- Alt bölüm: `grid-cols-12`, sol `lg:col-span-8` (içinde 2 kolon grid), sağ `lg:col-span-4`. Tabs (Aktiviteler / Görevler).

**Nasıl olmalı**
- KPI kartları: Mobilde 2’li grid (2x2) düşünülebilir; font ve ikon boyutları küçülmeden okunaklı kalmalı.
- Grafikler: Mobilde yükseklik 200–250px yeterli; XAxis/YAxis font ve tick sayısı azaltılabilir (recharts’ta responsive).
- “Son Satışlar” tablosu: Mobilde **kart listesi** veya **yatay scroll** ile korunan tablo; her satır tek dokunuşla detaya gidebilmeli, hücreler wrap/truncate ile taşma önlenmeli.
- Gecikmiş taksitler / Belgeler / Aktiviteler: Mobilde tek kolon, kartlar tam genişlik; liste öğeleri min 44px touch.

### 4.3 VehiclesPage ve Araç Modülleri

#### VehicleFilters

**Şu an nasıl**
- Üst: Arama input’u `flex-1`, `pl-12 h-12`; yanında Select’ler `w-full lg:w-[160px]` — mobilde `flex-wrap` ile satır kırılıyor.
- “Mevcut Araçlar / Satılan Araçlar” tab switch: Masaüstünde ortada `absolute`, mobilde `sm:hidden order-last w-full pt-2` ile ayrı satırda.
- Action bar: Sol (toplu aktar, dışa aktar, masraf aktar), sağ (görünüm toggle, yeni araç). Mobilde `flex-col sm:flex-row` ve wrap.

**Nasıl olmalı**
- Filtreler mobilde **tek kolon** veya **drawer/sheet** içinde toplanabilir; “Filtrele” butonu ile açılıp seçimler chip olarak gösterilebilir.
- Tab switch: Mobilde tam genişlik, switch veya segment control; dokunma alanları 44px.
- “Yeni Araç Ekle” butonu mobilde sabit (sticky bottom veya FAB) veya en azından fold’un hemen altında görünür olmalı.

#### VehicleTable (Grid / Table)

**Şu an nasıl**
- **Grid:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, kartlar h-56 resim, overlay’da hover’da aksiyonlar (Detay, Düzenle, Sil). Mobilde overlay hover olmadığı için aksiyonlar kartın altında “Detay” ve “Satış” butonları ile.
- **Table:** `overflow-x-auto`, 8 kolon (Araç, Bilgiler, Şasi No, Satış Fiyatı, Maliyet, Kar, Durum, İşlemler). Hücrelerde resim + metin, İşlemler’de ikon butonları (h-9 w-9).

**Nasıl olmalı**
- **Grid:** Mobilde tek kolon; kart yüksekliği orantılı (örn. 48vw veya max-height). Overlay yerine mobilde **her zaman görünür** aksiyonlar (ikonlar veya “Detay”/“Satış” butonları); tıklanabilir alan 44px.
- **Table:** Mobilde **tablo yerine kart listesi** (her satır bir kart: resim, başlık, 2–3 bilgi, tek “Detay” veya menü). Alternatif: tabloyu yatay kaydırmalı tutup ilk kolonu (Araç) sticky yapmak; kolon başlıkları kısaltılabilir veya gizlenebilir (sadece Araç + Fiyat + İşlemler).

#### VehicleDetailModal

**Şu an nasıl**
- `max-w-5xl h-[90vh]`, içerik scroll. Üst: grid 12 kolon, resim `col-span-12 md:col-span-4`, bilgi `col-span-12 md:col-span-8`. Quick stats `grid-cols-2 md:grid-cols-4`. Tabs: `TabsList` **grid-cols-5** (Bilgiler, Fotoğraflar, Belgeler, Maliyet, Hesapla).

**Nasıl olmalı**
- Mobilde modal **tam ekran** (max-w-none, h-[100dvh] veya h-screen) veya neredeyse tam ekran; kapatma (X) sağ üstte ve 44px alan.
- Tabs: Mobilde **grid-cols-5** yerine **scrollable horizontal tabs** (flex overflow-x-auto) veya **dropdown/select** ile sekmeler arası geçiş; metin kısaltılabilir veya sadece ikon (Bilgiler, Fotoğraflar, vb.).
- İçerik (bilgi, maliyet, belgeler): Mobilde tek kolon, padding yeterli (16px).

#### VehicleAddEditModal, VehicleCostModal, VehicleSellModal, VehicleQuoteModal, VehiclePaymentModal, VehicleDocumentModal

**Şu an nasıl**
- AddEdit: `max-w-4xl max-h-[90vh] overflow-y-auto`, 2 adım, form alanları grid’lerde.
- Diğer modaller benzer: Orta boy dialog, form alanları.

**Nasıl olmalı**
- Tüm form modalleri mobilde **tam genişlik / tam yükseklik** veya bottom sheet tarzı; içerik `overflow-y-auto` ve klavye açıldığında scroll. Input/Select yükseklikleri 48px. Adım göstergesi (step indicator) mobilde kompakt.
- Onay / İptal butonları footer’da sticky veya her zaman görünür; 44px touch.

### 4.4 AnalyticsPage

**Şu an nasıl**
- Tabs (Araç / Stok analitiği), tarih aralığı ve tip seçimi, KPI kartları, grafikler (Bar, Line, Pie, Area), tablolar. Çok sayıda veri ve karmaşık layout.

**Nasıl olmalı**
- Mobilde **önce özet KPI’lar**, sonra grafikler tek kolon; her grafik kartı tam genişlik. Tablolar için Dashboard’dakiyle aynı strateji: kart listesi veya yatay scroll + sticky ilk kolon.
- Tabs ve filtreler: Üstte tek satırda sığmıyorsa drawer veya accordion ile toplanmalı.

### 4.5 SettingsPage

**Şu an nasıl**
- Tabs (Genel, ACL, vb.), form alanları (şirket adı, telefon, adres, para birimi, dil), tablolar (ACL).

**Nasıl olmalı**
- Mobilde tek kolon form; tab’lar yatay kaydırmalı veya dropdown. Tablo varsa kart listesi veya scroll.

### 4.6 CustomerList, CustomerDetails

**Şu an nasıl**
- Liste: Arama, filtreler, view mode (list/table), KPI’lar, müşteri kartları veya tablo.
- Detay: Müşteri bilgileri ve ilişkili veriler.

**Nasıl olmalı**
- Liste: Mobilde kart listesi öncelikli; filtreler drawer’da. Tablo kullanılıyorsa araç sayfasındaki kurallar aynı.
- Detay: Tek kolon, bölümler accordion veya dikey kartlar.

### 4.7 QuotesPage, AccountingPage, InventoryPage, BranchesPage, StaffPage

**Şu an nasıl**
- Genelde PageHeader + tablo veya kart grid’leri; bazı sayfalarda form ve filtreler.

**Nasıl olmalı**
- Tutarlı kural: Mobilde tablo → kart listesi veya scroll + sticky kolon; formlar tam genişlik, 48px input; header’daki aksiyonlar (örn. “Yeni teklif”) görünür ve 44px touch.

---

## 5. Ortak UI Bileşenleri

### 5.1 Dialog (ui/dialog)

**Şu an nasıl**
- Varsayılan `max-w-lg`, ortada. DialogContent’e geçilen `className` ile büyük modaller (max-w-4xl, max-w-5xl) kullanılıyor. Kapatma sağ üstte (X).

**Nasıl olmalı**
- Mobilde (örn. `max-sm:` veya useIsMobile) tüm dialog’lar **tam ekran** veya `w-[calc(100vw-32px)] max-h-[90dvh]` benzeri; köşe yuvarlakları üstte (sheet hissi). Kapatma butonu 44px.

### 5.2 Table (ui/table)

**Şu an nasıl**
- `overflow-auto` ile sarmalanıyor; hücreler `p-4`, başlıklar `h-12`.

**Nasıl olmalı**
- Sayfa seviyesinde: Mobilde tablo kullanımı azaltılıp kart listesi tercih edilmeli. Tablo kullanıldığında: `min-width` ile yatay scroll garanti; başlık/hücre metinleri `truncate` veya `line-clamp`; ilk kolon sticky yapılabilir.

### 5.3 Button, Input, Select

**Şu an nasıl**
- index.css’te 768px altında button/link min-height/min-width 44px. Form input’lar `form-input-professional` ile min-height 44px. Select trigger’lar bazen daha küçük.

**Nasıl olmalı**
- Tüm tıklanabilir öğeler (buton, link, select trigger, tab) **en az 44x44px**; input’lar 48px yükseklik. Select dropdown içeriği mobilde tam genişlik veya büyük liste öğeleri.

### 5.4 Tabs (ui/tabs)

**Şu an nasıl**
- TabsList genelde grid veya flex; VehicleDetailModal’da grid-cols-5.

**Nasıl olmalı**
- Mobilde çok sekmeli yerlerde: **scrollable tabs** (flex + overflow-x-auto, gap) veya **dropdown/select** ile sekmeler arası geçiş. Aktif sekme her zaman görünür ve vurgulu.

### 5.5 ConfirmationDialog / AlertDialog

**Şu an nasıl**
- `sm:max-w-md`, ortada. Butonlar footer’da.

**Nasıl olmalı**
- Mobilde tam genişlik (margin’li), butonlar tam genişlik veya yan yana; 44px yükseklik.

---

## 6. Landing Sayfası

### 6.1 Header

**Şu an nasıl**
- `fixed`, `h-16`, nav `hidden sm:flex` — mobilde menü görünmüyor; sadece “Ücretsiz Demoyu Başlat” ve “Uygulamaya Git” linkleri.

**Nasıl olmalı**
- Mobilde **hamburger menü** ile tüm linkler (Özellikler, Teknik Güvenlik, Fiyat, SSS, vb.) tek menüde; CTA butonları korunmalı veya menü içinde.

### 6.2 Hero, Features, Pricing, FAQ, Footer

**Şu an nasıl**
- Hero: `min-h-[90vh]`, başlık `text-4xl sm:text-5xl md:text-6xl`, butonlar wrap. Features/Pricing/FAQ: grid’ler ve `sm:` breakpoint’lerle düzen.

**Nasıl olmalı**
- Hero: Mobilde `min-h-[100dvh]` veya `min-h-[80vh]`, başlık tek satıra sığmıyorsa 2 satır; butonlar tam genişlik veya 2’li stack. Safe area (notch) için üst padding.
- Tüm bölümler: Mobilde tek kolon, padding 16–24px; tablolar (BenefitsTable vb.) yatay scroll veya kartlara dönüştürülebilir.
- Footer: Linkler ve metinler wrap; tıklanabilir alanlar 44px.

---

## 7. Performans ve Dokunma Deneyimi

### 7.1 Şu an
- Touch’a özel (hover’sız) stiller index.css’te `(hover: hover) and (pointer: fine)` ile ayrılmış; kart hover’ları mobilde devre dışı.
- Bazı butonlar h-9 w-9 (36px) — 44px’in altında.

### 7.2 Nasıl olmalı
- Tüm etkileşimli öğeler 44x44px minimum; `:active` state’leri (hafif scale veya opacity) mobilde geri bildirim için kullanılmalı.
- Scroll: `-webkit-overflow-scrolling: touch` gerekirse kullanılmalı; body scroll’u kilitleme (modal açıkken) mobilde düzgün (Radix genelde halleder).

---

## 8. Hareket Planı (Aşamalar)

Aşağıdaki sırayla ilerlenmesi önerilir. Her aşama tamamlandıktan sonra test (gerçek cihaz + Chrome DevTools) yapılmalı; onay sonrası bir sonraki aşamaya geçilebilir.

---

### Aşama 1: Temel layout ve header (SidebarLayout + global)

- **1.1** Sidebar: Mobilde tam ekran veya 85vw; overlay ve ESC/dış tıklama mevcut.
- **1.2** Header: Başlık ve tüm ikonların taşmaması (truncate, min-w-0); hamburger ve “Hızlı İşlemler” trigger 44x44px.
- **1.3** Main content: px değerleri mobilde 16px; safe-top/safe-bottom gerekli yerlere eklenmesi.
- **1.4** use-mobile ve breakpoint: Dokümante edilmiş “mobil” tanımı (768px); gerekirse tailwind.config’e screens notu.

**Kabul kriteri:** Tüm sayfalarda header ve sidebar mobilde düzgün; scroll ve overlay sorunsuz.

---

### Aşama 2: Dialog ve form modalleri

- **2.1** ui/dialog: Mobilde (max-width < 640 veya useIsMobile) DialogContent tam genişlik / tam yükseklik veya sheet benzeri (rounded sadece üst); kapatma 44px.
- **2.2** GlobalSearch dialog: Mobilde tam genişlik; arama sonuçları ve son aramalar satırları min 44px yükseklik.
- **2.3** VehicleAddEditModal, VehicleCostModal, VehicleSellModal, VehicleQuoteModal, VehiclePaymentModal, VehicleDocumentModal: Mobilde tam ekran veya sheet; form alanları 48px; footer butonları sticky ve 44px.
- **2.4** ConfirmationDialog / AlertDialog: Mobilde genişlik ve buton yüksekliği 44px.

**Kabul kriteri:** Tüm modaller küçük ekranda açılıp kapanıyor; formlar kullanılabilir; klavye açıldığında içerik scroll’lanıyor.

---

### Aşama 3: Araç sayfası (VehiclesPage)

- **3.1** VehicleFilters: Mobilde filtreler tek kolon veya “Filtrele” drawer; tab switch (Mevcut/Satılan) tam genişlik ve 44px; “Yeni Araç Ekle” her zaman erişilebilir.
- **3.2** VehicleTable grid: Mobilde tek kolon; kart aksiyonları (Detay, Satış, Sil) her zaman görünür ve 44px.
- **3.3** VehicleTable table: Mobilde kart listesi (her araç bir kart) VEYA yatay scroll + sticky ilk kolon + kısaltılmış kolonlar; işlem ikonları 44px.
- **3.4** VehicleDetailModal: Mobilde tam ekran; TabsList scrollable yatay veya dropdown; içerik tek kolon.

**Kabul kriteri:** Araç listesi, filtreler ve detay modal mobilde rahat kullanılabiliyor.

---

### Aşama 4: Dashboard ve veri ağırlıklı sayfalar

- **4.1** DashboardPage: KPI kartları mobilde 2x2; grafikler tek kolon, yükseklik 200–250px; “Son Satışlar” kart listesi veya scroll tablo; Gecikmiş Taksitler / Belgeler / Aktiviteler tek kolon, liste öğeleri 44px.
- **4.2** AnalyticsPage: KPI ve grafikler tek kolon; tablolar kart listesi veya scroll; tabs/filtreler drawer veya tek satır wrap.
- **4.3** CustomerList / CustomerDetails: Liste kart veya scroll tablo; detay tek kolon.
- **4.4** QuotesPage, AccountingPage, InventoryPage, BranchesPage, StaffPage: Aynı kurallar (tablo → kart/scroll; form 48px; aksiyonlar 44px).

**Kabul kriteri:** Tüm veri sayfaları mobilde okunabilir ve etkileşimler 44px.

---

### Aşama 5: Auth ve diğer sayfalar

- **5.1** AuthPage: Kart tam genişlik (padding’li); input 48px; “Şifrenizi unuttunuz” ve tab’lar dokunulabilir.
- **5.2** ForgotPasswordPage, ResetPasswordPage: Aynı form kuralları.
- **5.3** SettingsPage: Tabs yatay scroll veya dropdown; formlar tek kolon.

**Kabul kriteri:** Giriş, kayıt ve şifre sıfırlama mobilde sorunsuz.

---

### Aşama 6: Landing

- **6.1** Header: Mobilde hamburger menü; tüm linkler ve CTA’lar menüde veya görünür.
- **6.2** Hero: Başlık ve butonlar mobilde okunaklı; safe area.
- **6.3** Features, Pricing, FAQ, Footer: Tek kolon; tablolar scroll veya kart; link/buton 44px.

**Kabul kriteri:** Landing mobilde gezinilebilir ve CTA’lar tıklanabilir.

---

### Aşama 7: UI bileşenleri ve polish

- **7.1** Button, Input, Select: Tüm kullanımlarda min 44px (trigger/buton) ve 48px (input); Select içerik mobilde uyumlu.
- **7.2** Tabs (ui/tabs): Çok sekmeli yerlerde scrollable veya dropdown; dokümantasyon.
- **7.3** Table (ui/table): Dokümantasyonda “mobilde kart listesi tercih edin” notu; gerekli sayfalarda kart listesi bileşenleri kullanılmış olmalı.
- **7.4** Son kontroller: Safe area, 44px touch, klavye açılınca scroll, yatay taşma yok.

**Kabul kriteri:** Tüm uygulama mobilde tam uyumlu ve tutarlı hissediliyor.

---

## 9. Özet Tablo

| Alan | Şu an (kısa) | Hedef (kısa) |
|------|----------------|--------------|
| Breakpoint | 768px (use-mobile), Tailwind varsayılan | Tutarlı sm/md/lg; mobil 320–768px |
| Sidebar | Mobilde overlay, lg’de sabit | Mobilde tam/85vw, swipe (opsiyonel) |
| Header | Sıkışık olabilir, arama ikon | 44px tüm ikonlar, safe area |
| Dialog/Modal | Orta boy, bazen büyük | Mobilde tam ekran / sheet |
| VehicleFilters | Wrap, tab ayrı satırda | Drawer veya tek kolon; tab 44px |
| VehicleTable | Grid 1–2–3; table yatay scroll | Grid 1 kolon; table → kart veya scroll+sticky |
| VehicleDetailModal | 5 sekme, grid | Tam ekran; sekmeler scroll/dropdown |
| Dashboard/Analytics | Grid + tablolar | 2x2 KPI; grafik tek kolon; tablo → kart |
| Auth | max-w-md | Tam genişlik, 48px input |
| Landing header | Nav gizli mobilde | Hamburger menü |
| Buton/Input/Select | Bazı 36px | Min 44px trigger, 48px input |

---

## 10. Notlar

- Bu döküman **onaylanana kadar** hiçbir dosyada değişiklik yapılmayacak; sadece bu rapor oluşturulmuştur.
- Onay sonrası hareket planı **Aşama 1**’den başlayarak adım adım uygulanacak; her aşama sonunda sizin onayınızla bir sonrakine geçilecektir.
- İsterseniz önce yalnızca belirli sayfalar (örn. VehiclesPage + VehicleDetailModal) ile pilot uygulama yapılıp, kabul edildikten sonra tüm projeye yayılabilir.
