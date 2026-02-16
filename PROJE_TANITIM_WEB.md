# Akıllı Galeri — Proje Tanıtımı

**Üçüncü taraflara yönelik, web sitesi ve tanıtım materyali için hazırlanmış özet metin.**

---

## Projenin Amacı

**Akıllı Galeri**, KKTC (Kuzey Kıbrıs) otogaleri sektörüne özel geliştirilmiş, kurumsal düzeyde bir **SaaS (Bulut Yazılım)** çözümüdür. Oto galeri işletmelerinin envanter, satış, muhasebe ve müşteri ilişkilerini tek bir platformda toplar.

Amaç, galeri sahiplerinin ve yöneticilerinin:
- Araç stokunu ve satış süreçlerini tek yerden yönetmesi,
- **£, $, €, ₺, ¥** ile çok para birimli işlemleri güvenli ve izole biçimde yürütmesi,
- Senetli satış, taksit ve nakit akışını net görmesi,
- İthalat, gümrükleme ve koçan süreçlerini takip etmesi,
- Müşteri ve teklif süreçlerini yönetmesi,

için gereken tüm operasyonel ihtiyaçları karşılamaktır. Sistem, **multi-tenant** mimari ile her galerinin verisini birbirinden tamamen ayırarak çalışır; aynı altyapı üzerinde birden fazla galeri güvenle kullanabilir.

---

## Kimler İçin?

- **KKTC oto galeri sahipleri ve yöneticileri** — Stok, satış ve kar takibini merkezileştirmek isteyenler  
- **Çok para birimli işlem yapan galeriler** — £, $, €, ₺, ¥ ile satış, alış ve masraf takibi  
- **İthalat ve gümrükleme süreçleri olan galeriler** — Plakasız araç, koçan tipi (Şahıs/Şirket) ve maliyet kalemi bazlı takip  
- **Senetli / taksitli satış yapan galeriler** — Peşinat, taksit ödemeleri, gecikme uyarıları ve kalan borç takibi  
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

### Satış ve Taksit (Senetli Satış)
- Peşin satış kaydı (müşteri, fiyat, tarih, plaka, anahtar sayısı)
- Taksitli satış: peşinat, taksit sayısı, taksit tutarı, para birimi
- Taksit ödemelerini kaydetme ve kalan borç takibi
- Gecikmiş taksit uyarıları ve liste görünümü
- Dijital senet takibi ile nakit akışı kontrolü
- Satılan araçların ayrı sekmede listelenmesi ve filtreleme (peşin / taksitli / tamamlanmış)

### İthalat ve Gümrükleme (KKTC’ye Özel)
- Plakasız araçların gümrükleme süreçleri takibi
- Koçan tipi (Şahıs / Şirket) bazlı stok yönetimi
- Maliyet kalemi bazlı araç kartı (gümrük, vergi, nakliye vb.)
- Gümrük aşamasındaki araçların dashboard’da görünümü

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
- Çok para birimi desteği (£, $, €, ₺, ¥)

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

## Tanıtım Sitesi (Landing Page)

**akilligaleri.com** adresinde yayınlanan tanıtım sitesi, KKTC odaklı SEO ve içerik stratejisi ile hazırlanmıştır.

### Sayfa Yapısı
- **Ana Sayfa** — Hero, Özellikler, Dashboard Önizleme, Teknik Güvenlik, Lokal Fayda Tablosu, Fiyatlandırma, Referanslar, SSS, CTA
- **Blog** (`/blog`) — KKTC otogaleri, araç ithalatı, gümrükleme ve çok para birimli muhasebe konularında rehberler
- **Blog Detay** (`/blog/[slug]`) — Markdown tabanlı içerik sayfaları

### Fiyatlandırma
- **£99/ay** veya **£990/yıl** (yıllıkta £198 tasarruf)
- Tek plan, tüm özellikler dahil, gizli ücret yok

### Teknik Özellikler (Landing)
- **Stack:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Blog:** Markdown tabanlı SSG; `content/blog/` dizinindeki `.md` dosyalarından içerik üretimi
- **SEO:** Dinamik meta etiketleri, Open Graph, JSON-LD (SoftwareApplication, FAQPage, BlogPosting, BreadcrumbList)
- **Teknik Dosyalar:** `sitemap.xml`, `robots.txt` (build sırasında otomatik üretilir)
- **Deploy:** Vercel, Netlify veya statik sunucu ile dağıtılabilir

---

## Teknik Özet (Solutions Architect Bakışı)

### Mimari
- **Multi-tenant SaaS:** Tenant bazlı veri izolasyonu, şube ve rol yönetimi ile kurumsal kullanıma uygun.
- **Ürün Yapısı:** `backend` (API), `frontend` (dashboard uygulaması), `landing` (tanıtım sitesi) ayrı paketler olarak yönetilir.

### Backend
- Node.js, Express, TypeScript
- REST API; JWT, Helmet, bcrypt ile güvenlik
- MySQL ile kalıcı veri

### Frontend (Dashboard)
- React 18, TypeScript, Vite
- Radix UI + Tailwind CSS
- Recharts ile grafikler
- TanStack Query ile sunucu state yönetimi

### Landing
- React 18, TypeScript, Vite
- React Router ile `/`, `/blog`, `/blog/:slug` rotaları
- Markdown → JSON build pipeline (gray-matter, marked)
- react-helmet-async ile dinamik SEO

### Entegrasyonlar
- FreeCurrencyAPI ile döviz kurları
- Kur cache’i ve tarihsel kur ile kar/rapor hesaplama

### Veri Bütünlüğü
- Tenant-aware sorgular, migration’lar ve validasyon (Zod) ile tutarlı veri yönetimi

### Dağıtım
- Nginx, Node, MySQL ile production deploy
- Opsiyonel S3 ile dosya depolama
- Landing: statik build (Vercel, Netlify vb.)

Bu yapı, tek bir ürün olarak hem küçük galeriler hem de çok şubeli / çok para birimli işletmeler için ölçeklenebilir bir temel sunar.

---

## Sağladığı Faydalar (Özet)

| Fayda | Açıklama |
|-------|----------|
| **Tek platform** | Araç, satış, taksit, müşteri, teklif, muhasebe ve envanter tek uygulamada. |
| **Çok para birimi** | £, $, €, ₺, ¥ ile işlem; otomatik kur ve kur farkı dahil kar. |
| **KKTC’ye özel** | Senetli satış, gümrükleme, ithalat ve koçan yönetimi adaya özel modüller. |
| **Çok şube** | Tüm şubeler tek hesap altında, veri izole ve güvenli. |
| **Taksit takibi** | Peşinat ve taksit ödemeleri, kalan borç, gecikme uyarıları, dijital senet. |
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
6. **KKTC ithalat süreci:** Plakasız araç gümrükleme, koçan tipi seçimi, maliyet kalemi bazlı araç kartı takibi.

---

## Özet Cümleler (Web / Broşür İçin)

- **Tek cümle:** Akıllı Galeri, KKTC otogalerileri için £, $, €, ₺, ¥ ile çok para birimli işlem, senetli satış ve gümrükleme takibini tek platformda toplayan SaaS yönetim sistemidir.
- **Üç nokta:** KKTC’ye özel • Çok para birimi ve senet/gümrük takibi • Multi-tenant güvenlik ve izolasyon.
- **Hedef kitle:** KKTC oto galeri sahipleri, yöneticileri ve ithalat / gümrükleme süreçleri olan galeriler.

---

*Bu metin, proje tanıtım web sitesi ve üçüncü taraflara (yatırımcı, iş ortağı, müşteri) yönelik materyallerde kullanılmak üzere, Solutions Architect perspektifinde hazırlanmıştır.*
