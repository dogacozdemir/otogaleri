# AkıllıGaleri — Tanıtım Sayfası (Landing Page)

Otogaleri / AkıllıGaleri projesi için profesyonel tanıtım sitesi. Ana projeden bağımsız çalışır; proje kodunu değiştirmez.

## Teknoloji

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (koyu tema, kurumsal mavi/lacivert)
- **Framer Motion** (animasyonlar)
- **Lucide React** (ikonlar)

## Çalıştırma

```bash
cd landing
npm install
npm run dev
```

Tarayıcıda `http://localhost:5173` açılır.

## Build

```bash
npm run build
```

Çıktı: `dist/` — statik dosyalar herhangi bir web sunucusuna (Nginx, Netlify, Vercel vb.) deploy edilebilir.

## Sayfa Yapısı

1. **Hero** — Ana başlık, alt metin, "Hemen Başlayın" / "Demoyu İzleyin"
2. **Özellikler** — Araç/Stok, Satış/Taksit, Çok Para Birimi, CRM/Teklif
3. **Teknik Mimari** — Multi-tenant, JWT, döviz kuru entegrasyonu
4. **Faydalar Tablosu** — Proje tanıtımındaki faydalar
5. **Kullanım Senaryoları** — 4 senaryo kartı
6. **Dashboard Önizleme** — KPI ve grafik mockup
7. **CTA** — İletişime geçin / Demo
8. **Footer** — Linkler, iletişim, © 2026

## Not

Bu site yalnızca tanıtım amaçlıdır. Ana uygulama (frontend/backend) `otogaleri` kök dizinindedir.
