# Otogaleri Yönetim Sistemi — Proje Tanıtımı

**Üçüncü taraflara yönelik, web sitesi ve tanıtım materyali için hazırlanmış özet metin.**

---

## Projenin Amacı

**Otogaleri Yönetim Sistemi**, oto galeri işletmelerinin envanter, satış, muhasebe ve müşteri ilişkilerini tek bir platformda toplayan, kurumsal düzeyde bir **SaaS (Bulut Yazılım)** çözümüdür.

Amaç, galeri sahiplerinin ve yöneticilerinin:
- Araç stokunu ve satış süreçlerini tek yerden yönetmesi,
- Çok para birimli ve çok şubeli işlemleri güvenli ve izole biçimde yürütmesi,
- Kar, taksit ve nakit akışını net görmesi,
- Müşteri ve teklif süreçlerini takip etmesi,

için gereken tüm operasyonel ihtiyaçları karşılamaktır. Sistem, **multi-tenant** mimari ile her galerinin verisini birbirinden tamamen ayırarak çalışır; aynı altyapı üzerinde birden fazla galeri güvenle kullanabilir.

---

## Kimler İçin?

- **Oto galeri sahipleri ve yöneticileri** — Stok, satış ve kar takibini merkezileştirmek isteyenler  
- **Çok şubeli galeriler** — Tüm şubeleri tek panelden yönetmek isteyenler  
- **İthalat / ihracat yapan galeriler** — TRY, USD, EUR, GBP ile işlem ve kur farkı dahil kar hesaplamak isteyenler  
- **Taksitli satış yapan galeriler** — Peşinat, taksit ve ödeme takibini otomatikleştirmek isteyenler  
- **Müşteri ve teklif odaklı satış ekipleri** — CRM, teklif ve takip süreçlerini tek sistemde toplamak isteyenler  

---

## Neler Yapabilirsiniz?

### Araç ve Stok Yönetimi
- Araç ekleme, düzenleme, listeleme (tablo ve grid görünümü)
- Marka, model, şasi no, plaka, araç numarası ile arama ve filtreleme
- Stok durumu: Stokta, satışta, rezerve, satıldı
- Araç görselleri yükleme, düzenleme, birincil görsel seçimi
- Araç masrafları (alış, nakliye, gümrük, tamir vb.) ve kategori bazlı takip
- Kur farkı dahil otomatik kar hesaplama
- Toplu araç ve masraf içe aktarma (Excel/CSV)
- Sözleşme ve belge yükleme, süre takibi

### Satış ve Taksit
- Peşin satış kaydı (müşteri, fiyat, tarih, plaka, anahtar sayısı)
- Taksitli satış: peşinat, taksit sayısı, taksit tutarı, para birimi
- Taksit ödemelerini kaydetme ve kalan borç takibi
- Gecikmiş taksit uyarıları ve liste görünümü
- Satılan araçların ayrı sekmede listelenmesi ve filtreleme (peşin / taksitli / tamamlanmış)

### Müşteri ve Teklif (CRM)
- Müşteri kayıtları: ad, iletişim, adres
- Müşteri detay sayfası: satış geçmişi, taksit durumu, belgeler
- Takip görevleri (follow-up) ve hatırlatmalar
- Fiyat teklifi (quote) oluşturma, onay/red, süre takibi
- Onaylanan teklifi tek tıkla satışa dönüştürme

### Muhasebe ve Envanter
- Gelir–gider işlemleri, kategori bazlı takip
- Muhasebe raporları ve trend grafikleri
- Envanter modülü: servis/satış ürünleri, stok miktarı, birim fiyat, para birimi
- Kritik stok seviyesi uyarıları
- Çok para birimi desteği (TRY, USD, EUR, GBP)

### Raporlama ve Analitik
- Dashboard: toplam araç, aylık satış, aktif taksitler, KPI kartları
- Marka ve model bazlı karlılık analizi
- En karlı araçlar listesi
- Satış süresi analizi (ortalama stokta kalma süresi)
- Aylık karşılaştırma ve trend grafikleri
- Kur farkı etkisi analizi
- Haftalık araç çıkışı, stok durumu grafikleri

### Organizasyon ve Güvenlik
- Çoklu şube: şube bazlı araç ve işlem takibi
- Çalışan (staff) tanımlama ve rol atama
- Rol tabanlı yetkilendirme (ACL): owner, admin, manager, sales, accounting
- Multi-tenant izolasyon: her galeri yalnızca kendi verisini görür ve yönetir
- JWT tabanlı oturum, güvenli API erişimi

### Kullanıcı Deneyimi
- Türkçe / İngilizce dil desteği
- Açık ve koyu tema (dark mode)
- Responsive arayüz: masaüstü ve mobil uyumlu
- Global arama: araç, müşteri, teklif vb. tek yerden

---

## Teknik Özet (Solutions Architect Bakışı)

- **Mimari:** Multi-tenant SaaS; tenant bazlı veri izolasyonu, şube ve rol yönetimi ile kurumsal kullanıma uygun.
- **Backend:** Node.js, Express, TypeScript; REST API; JWT, Helmet, bcrypt ile güvenlik; MySQL ile kalıcı veri.
- **Frontend:** React 18, TypeScript, Vite; Radix UI + Tailwind CSS; Recharts ile grafikler; TanStack Query ile sunucu state yönetimi.
- **Entegrasyonlar:** FreeCurrencyAPI ile döviz kurları; kur cache’i ve tarihsel kur ile kar/rapor hesaplama.
- **Veri bütünlüğü:** Tenant-aware sorgular, migration’lar ve validasyon (Zod) ile tutarlı veri yönetimi.
- **Dağıtım:** Nginx, Node, MySQL ile production deploy; opsiyonel S3 ile dosya depolama.

Bu yapı, tek bir ürün olarak hem küçük galeriler hem de çok şubeli / çok para birimli işletmeler için ölçeklenebilir bir temel sunar.

---

## Sağladığı Faydalar (Özet)

| Fayda | Açıklama |
|-------|----------|
| **Tek platform** | Araç, satış, taksit, müşteri, teklif, muhasebe ve envanter tek uygulamada. |
| **Çok para birimi** | TRY, USD, EUR, GBP ile işlem; otomatik kur ve kur farkı dahil kar. |
| **Çok şube** | Tüm şubeler tek hesap altında, veri izole ve güvenli. |
| **Taksit takibi** | Peşinat ve taksit ödemeleri, kalan borç, gecikme uyarıları. |
| **Kar görünürlüğü** | Araç bazlı ve marka/model bazlı karlılık, raporlar ve grafikler. |
| **Veri güvenliği** | Multi-tenant izolasyon, rol tabanlı erişim, güvenli API. |
| **Zaman tasarrufu** | Tekrarlayan işlemlerin merkezileşmesi ve otomasyon ile operasyonel verimlilik. |

---

## Kullanım Senaryoları (Örnekler)

1. **Galeri günlük operasyonu:** Yeni araç ekleme, masraf girişi, satış (peşin/taksit) kaydı, müşteri ve teklif takibi tek ekrandan.
2. **Finansal kontrol:** Araç bazlı kar, marka/model karlılığı, aylık karşılaştırma ve taksit nakit akışı raporları.
3. **Çok şubeli yönetim:** Merkez ve şubelerin stok ve satış verilerinin rol bazlı erişimle yönetilmesi.
4. **Dövizli işlemler:** Farklı para biriminde alış/satış/masraf; otomatik kur ve raporlarda tek para birimine çeviri.
5. **Müşteri ilişkileri:** Müşteri kartı, satış geçmişi, taksit durumu, takip görevleri ve tekliften satışa dönüşüm.

---

## Özet Cümleler (Web / Broşür İçin)

- **Tek cümle:** Otogaleri, oto galerileri için araç, satış, taksit, müşteri ve muhasebeyi tek platformda toplayan, çok para birimli ve çok şubeli SaaS yönetim sistemidir.
- **Üç nokta:** Tek platform • Çok para birimi ve çok şube • Multi-tenant güvenlik ve izolasyon.
- **Hedef kitle:** Oto galeri sahipleri, yöneticileri ve çok şubeli / ithalat–ihracat yapan galeriler.

---

*Bu metin, proje tanıtım web sitesi ve üçüncü taraflara (yatırımcı, iş ortağı, müşteri) yönelik materyallerde kullanılmak üzere, Solutions Architect perspektifinde hazırlanmıştır.*
