# Test Suite Documentation

Bu proje için kapsamlı test altyapısı. Multi-tenant otogaleri uygulamasının tüm kritik yönlerini test eder.

## Test Yapısı

```
tests/
├── setup/              # Test setup ve configuration
├── factories/          # Test data factories
├── helpers/            # Test helper functions
├── integration/       # Integration testleri
├── unit/              # Unit testleri
└── security/          # Güvenlik testleri
```

## Test Kategorileri

### 1. Tenant İzolasyonu Testleri
- Row-level isolation
- Tenant ID spoofing prevention
- Header/cookie bypass attempts
- Database query isolation
- Cross-tenant data leakage prevention

### 2. Kimlik Doğrulama ve Yetkilendirme
- JWT authentication
- Role-based authorization
- Permission escalation prevention
- Wrong tenant token handling
- Inactive user access

### 3. Veri Bütünlüğü
- Tenant-specific settings
- Cross-tenant data contamination prevention
- Cache layer tenant awareness
- Foreign key integrity
- Transaction isolation

### 4. Load, Concurrency ve Race Conditions
- Concurrent multi-tenant requests
- Race condition handling
- High load tenant isolation
- Background job tenant awareness
- Database connection pool handling

### 5. Routing ve Domain
- Subdomain to tenant mapping
- Route validation
- CORS configuration
- Host header manipulation prevention
- Path traversal prevention

### 6. Limit ve Quota
- Rate limiting per tenant
- Storage limits
- Usage tracking
- Feature flags
- Pagination limits

### 7. API ve Integration
- Tenant header requirements
- Webhook tenant context
- Service-to-service communication
- API response format
- Error handling

### 8. Güvenlik
- SQL injection prevention
- ID tampering prevention
- XSS prevention
- CSRF prevention
- SSRF prevention
- Authentication bypass attempts

### 9. Deployment ve Migration
- Schema migration impact
- New tenant addition
- Environment configuration changes
- Database connection resilience
- Data migration validation

### 10. Tenant Lifecycle
- Tenant creation
- Tenant deletion
- Data backup
- Data restore
- Tenant suspension/reactivation

## Kurulum

```bash
# Dependencies yükle
npm install

# Test database environment variables ayarla
export OTG_DB_NAME_TEST=otogaleri_test
export OTG_DB_HOST=localhost
export OTG_DB_USER=root
export OTG_DB_PASSWORD=your_password
```

## Test Çalıştırma

```bash
# Tüm testleri çalıştır
npm test

# Watch mode
npm run test:watch

# Coverage raporu
npm run test:coverage

# Sadece unit testler
npm run test:unit

# Sadece integration testler
npm run test:integration

# Sadece security testler
npm run test:security
```

## Test Factories

Test factories, test verisi oluşturmak için kullanılır:

```typescript
import { createTestTenant } from './factories/tenantFactory';
import { createTestUser } from './factories/userFactory';
import { createTestVehicle } from './factories/vehicleFactory';

const tenantId = await createTestTenant({ name: 'Test Tenant' });
const userId = await createTestUser({ tenant_id: tenantId });
const vehicleId = await createTestVehicle({ tenant_id: tenantId });
```

## Test Helpers

### Auth Helpers

```typescript
import { createAuthHeader, generateTestToken } from './helpers/auth';

const token = createAuthHeader(tenantId, userId, 'admin');
```

### Database Helpers

```typescript
import { setupTestDatabase, cleanTestDatabase } from './setup/database';

beforeAll(async () => {
  await setupTestDatabase();
});

beforeEach(async () => {
  await cleanTestDatabase();
});
```

## Best Practices

1. **Her test bağımsız olmalı**: Testler birbirine bağımlı olmamalı
2. **Test data temizliği**: Her test öncesi database temizlenmeli
3. **Tenant izolasyonu**: Her test farklı tenant ID'leri kullanmalı
4. **Mock kullanımı**: External servisler mock'lanmalı
5. **Assertion clarity**: Test assertion'ları açık ve anlaşılır olmalı

## Notlar

- Test database'i production database'inden ayrı olmalı
- Test environment variables `.env.test` dosyasında tutulmalı
- Migration testleri için ayrı bir test database kullanılmalı
- Güvenlik testleri production'da çalıştırılmamalı

