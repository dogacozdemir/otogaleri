# Mail Sistemi – Production Readiness Denetim Raporu

**Tarih:** 31 Ocak 2025  
**Kapsam:** Backend mail konfigürasyonu, gönderici kimliği, şifremi unuttum, kayıt maili, hata yönetimi, SES Sandbox farkındalığı.

---

## 1. SMTP Configuration

**İncelenen dosya:** `src/services/emailService.ts`

| Kontrol | Durum | Açıklama |
|--------|--------|----------|
| .env değişkenleri | ⚠️ İsimlendirme farkı | Kod **SMTP_HOST**, **SMTP_PORT**, **SMTP_USER**, **SMTP_PASS**, **SMTP_SECURE**, **SMTP_FROM** kullanıyor. `.env` dosyasında **MAIL_HOST**, **MAIL_PORT**, **MAIL_USER**, **MAIL_PASS**, **MAIL_FROM** tanımladıysanız bu değerler okunmaz. |
| Port 587 | ✅ | `Number(process.env.SMTP_PORT) \|\| 587` ile 587 kullanılıyor. |
| secure: false | ✅ | `process.env.SMTP_SECURE === "true"` ile varsayılan false; 587 için uygun. |
| TLS / STARTTLS | ⚠️ Opsiyonel | Port 587’de Nodemailer varsayılan olarak STARTTLS kullanır. AWS SES için açıkça `requireTLS: true` eklenmesi dokümantasyon ve davranış netliği açısından faydalı olur. |

**Eksik / Öneri (DOSYA - EKSİK - ÖNERİ):**

- **emailService.ts – EKSİK – ÖNERİ:** `.env`’de **MAIL_*** kullanıyorsanız mail hiç gitmez. Ya `.env`’de **SMTP_HOST**, **SMTP_PORT**, **SMTP_USER**, **SMTP_PASS**, **SMTP_FROM** (ve istenirse **SMTP_SECURE**) kullanın (`.env.example` ile uyumlu), ya da `emailService.ts` içinde **MAIL_HOST**, **MAIL_PORT**, **MAIL_USER**, **MAIL_PASS**, **MAIL_FROM** için fallback ekleyin (örn. `process.env.MAIL_HOST || process.env.SMTP_HOST`).
- **emailService.ts – EKSİK – ÖNERİ:** AWS SES SMTP (port 587) için Nodemailer config’e `requireTLS: true` ekleyin; böylece STARTTLS zorunlu olur ve SES ile uyum netleşir.

---

## 2. Sender Identity (Gönderen Adresi)

**İncelenen dosya:** `src/services/emailService.ts` (satır 62)

- `from` alanı: `process.env.SMTP_FROM || "noreply@otogaleri.com"`.
- Yani gönderen adresi **SMTP_FROM** ile belirleniyor. **MAIL_FROM** kullanılmıyor.
- AWS SES’te doğrulanmış adres (örn. `noreply@akilligaleri.com`) kullanılmalı; aksi halde gönderim reddedilir.

**Eksik / Öneri:**

- **emailService.ts – EKSİK – ÖNERİ:** `MAIL_FROM` kullanıyorsanız okunmuyor. Ya `.env`’de **SMTP_FROM=noreply@akilligaleri.com** tanımlayın ya da kodda `process.env.MAIL_FROM || process.env.SMTP_FROM || "noreply@otogaleri.com"` gibi bir fallback ekleyin. Tüm mail gönderenleri tek bir fonksiyon üzerinden geçtiği için şu an sadece bu dosyada `from` kullanılıyor; yeni mail türleri eklendiğinde de aynı env değişkeninin kullanılmasına dikkat edin.

---

## 3. Forgot Password (Şifremi Unuttum) Akışı

**İncelenen dosyalar:** `src/controllers/authController.ts`, `src/routes/authRoutes.ts`, `schema.sql` / migrations

| Kontrol | Durum | Açıklama |
|--------|--------|----------|
| Şifremi unuttum endpoint’i | ❌ Yok | `authController.ts` içinde yalnızca `signup`, `login`, `changePassword` var. |
| Şifre sıfırlama token’ı / tablosu | ❌ Yok | Veritabanında `password_reset_tokens` veya benzeri tablo yok. |
| Token linki ile mail gönderimi | ❌ Yok | Şifre sıfırlama maili gönderen kod yok. |
| Frontend “Şifremi unuttum” | ❌ Yok | Frontend’de ilgili sayfa/link/çağrı bulunmuyor. |

**Eksik / Öneri:**

- **authController.ts – EKSİK – ÖNERİ:** “Şifremi unuttum” için iki endpoint ekleyin: (1) e-posta alıp token üretip mail ile link gönderen (örn. `POST /api/auth/forgot-password`), (2) token + yeni şifre alıp sıfırlayan (örn. `POST /api/auth/reset-password`). Token’ı veritabanında (yeni bir tablo veya mevcut yapıya uygun alan) saklayın, süre sınırı (örn. 1 saat) koyun.
- **authRoutes.ts – EKSİK – ÖNERİ:** Yukarıdaki iki handler’ı route’lara bağlayın; forgot-password için rate limit ekleyin.
- **Veritabanı – EKSİK – ÖNERİ:** Şifre sıfırlama token’ları için migration ile tablo ekleyin (örn. `user_id`, `token_hash`, `expires_at`).
- **emailService.ts – EKSİK – ÖNERİ:** `sendPasswordResetEmail(to, resetLink)` gibi bir fonksiyon ekleyin; `from` için yine `SMTP_FROM` / `MAIL_FROM` fallback’i kullanın. Link’i production’da kullanacağınız frontend URL’ine (örn. `FRONTEND_URL` veya `APP_URL`) göre üretin; sabit localhost kullanmayın.

---

## 4. Registration / Welcome Mail

**İncelenen dosya:** `src/controllers/authController.ts` – `signup` fonksiyonu

- Kayıt sonrası sadece DB’ye kullanıcı ekleniyor ve token dönülüyor; e-posta gönderimi yok.
- Karşılama / doğrulama maili tetiklenmiyor.

**Eksik / Öneri:**

- **authController.ts – EKSİK – ÖNERİ:** `signup` içinde, `conn.commit()` ve token üretiminden hemen sonra (ve mümkünse commit’ten sonra) `emailService.sendWelcomeEmail(ownerEmail, { name: ownerName || tenantName })` gibi bir çağrı ekleyin. Mail gönderimi başarısız olsa bile kayıt başarılı sayılsın (fire-and-forget veya try/catch ile loglayıp devam edin); böylece mail hatası kayıt akışını kırmaz.
- **emailService.ts – EKSİK – ÖNERİ:** `sendWelcomeEmail(to, { name })` fonksiyonu ekleyin; `from` yine `SMTP_FROM` / `MAIL_FROM` fallback ile tek kaynaktan gelsin.

---

## 5. Error Handling (Mail Gönderimi Hataları)

**İncelenen dosyalar:** `src/services/emailService.ts`, `src/services/installmentAlertService.ts`

| Kontrol | Durum | Açıklama |
|--------|--------|----------|
| sendInstallmentReminderEmail try/catch | ✅ | Fonksiyon try/catch ile sarılı; hata durumunda `{ success: false, error }` dönüyor, exception fırlatmıyor. |
| Çağıran serviste crash riski | ✅ | `installmentAlertService.ts` sonucu kontrol edip sadece `console.error` yapıyor; rethrow yok, uygulama çökmüyor. |
| SES kota / bağlantı hataları | ✅ | Nodemailer hataları catch içinde yakalanıp string olarak dönüldüğü için kota veya bağlantı hatalarında uygulama crash olmaz. |

**Eksik / Öneri:**

- Bu kısımda kritik bir eksik yok. İleride yeni mail türleri (welcome, reset password) eklendiğinde de aynı pattern kullanılmalı: try/catch, `{ success, error }` dönüşü, çağıran tarafta rethrow yapılmaması.

---

## 6. Sandbox Awareness (AWS SES Sandbox Test Modu)

**İncelenen:** Tüm backend; `emailService.ts`, `.env.example`, config dosyaları

- **MAIL_SANDBOX**, **SES_SANDBOX**, **TEST_MODE** veya alıcıyı `nerdyreptile@gmail.com` yapan bir override yok.
- SES Sandbox’ta yalnızca doğrulanmış e-posta adreslerine gönderim yapılır; rastgele müşteri adreslerine gönderim reddedilir.

**Eksik / Öneri:**

- **emailService.ts – EKSİK – ÖNERİ:** Sandbox’ta test için alıcı override’ı ekleyin. Örn. `.env`’de `MAIL_SANDBOX_OVERRIDE_TO=nerdyreptile@gmail.com` (veya `SES_SANDBOX_TO`) tanımlıysa, tüm maillerde `to` adresini bu değerle değiştirin; `from` aynı kalsın. Böylece gerçek müşteri adresine gitmeden tek adrese test maili gönderebilirsiniz. Production’da bu değişkeni boş bırakın veya kaldırın.

---

## Özet Tablo (DOSYA – EKSİK – ÖNERİ)

| # | Dosya | Eksik | Öneri |
|---|--------|--------|--------|
| 1 | emailService.ts | MAIL_* env isimleri kullanılmıyor | SMTP_* kullanın veya MAIL_* fallback ekleyin |
| 2 | emailService.ts | AWS SES için açık requireTLS yok | Port 587 config’e `requireTLS: true` ekleyin |
| 3 | emailService.ts | MAIL_FROM okunmuyor | SMTP_FROM kullanın veya MAIL_FROM fallback ekleyin |
| 4 | authController.ts | Şifremi unuttum akışı yok | forgot-password + reset-password endpoint ve token + mail entegrasyonu ekleyin |
| 5 | authRoutes.ts | Forgot/reset route’ları yok | Forgot-password ve reset-password route’larını ekleyin |
| 6 | Veritabanı (migrations) | Şifre sıfırlama token tablosu yok | password_reset_tokens (veya eşdeğer) migration ekleyin |
| 7 | emailService.ts | Şifre sıfırlama maili yok | sendPasswordResetEmail(to, resetLink) ekleyin; link prod URL’e göre üretin |
| 8 | authController.ts | Kayıt sonrası karşılama maili yok | signup sonrası sendWelcomeEmail çağrısı ekleyin (hata olsa da kayıt başarılı kalsın) |
| 9 | emailService.ts | Welcome mail fonksiyonu yok | sendWelcomeEmail(to, { name }) ekleyin |
| 10 | emailService.ts | Sandbox alıcı override yok | MAIL_SANDBOX_OVERRIDE_TO ile tüm mailleri tek adrese yönlendirme seçeneği ekleyin |

---

## .env Örnek (Mevcut Proje Convention: SMTP_*)

Kod ve `.env.example` **SMTP_*** ile uyumlu. AWS SES SMTP için örnek:

```env
SMTP_HOST=email-smtp.eu-north-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<SES SMTP kullanıcı adı>
SMTP_PASS=<SES SMTP şifre>
SMTP_FROM=noreply@akilligaleri.com
```

`MAIL_*` kullanmak isterseniz yukarıdaki “emailService.ts – MAIL_* fallback” önerilerini uygulayabilirsiniz.
