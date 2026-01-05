# refactoring

# OTOGALERI PROJECT CONSTITUTION

## Core Architecture Principles
- **No Logic in Controllers:** Controllers must only handle request validation and response formatting. All business logic MUST reside in the `@services/` layer.
- **Service Responsibility:** Each service should have a single responsibility (e.g., `CurrencyService` only handles FX, `AccountingService` handles ledgers).
- **Multi-Tenancy Safety:** Every database query MUST include a `tenant_id` filter. Never select across tenants.
- **Financial Integrity:** - Use `currency.js` for all monetary calculations. 
    - Never use native JS `+` or `-` for prices.
    - Database decimals must be handled as strings or specialized objects to avoid precision loss.

## Coding Standards
- **TypeScript:** Strict typing is mandatory. Avoid `any`. Define interfaces for all service responses.
- **Error Handling:** Use a centralized error handling middleware. Services should throw custom error classes (e.g., `ValidationError`, `NotFoundError`).
- **File Length:** If a file exceeds 500 lines, it's a candidate for splitting.
- **Naming:** Services should end with `Service.ts`, Controllers with `Controller.ts`.

## Tech Stack Specifics
- **Backend:** Express, Node.js, MySQL (mysql2/promise).
- **Frontend:** React 18, TanStack Query (for data fetching), Tailwind CSS.
- **Storage:** Use `StorageProvider` interface for S3-compatible storage. No local disk writes.

## Refactoring Workflow
1. Before changing a file, analyze its dependencies.
2. If moving logic to a service, ensure all previous controller tests (if any) are updated or rewritten for the service.
3. Always check `tenant_id` isolation during refactoring.