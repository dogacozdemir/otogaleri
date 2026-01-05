# Tenant Safety Guide

## Overview

The `TenantAwareQuery` class ensures that ALL database queries automatically include `tenant_id` filtering to prevent cross-tenant data leakage. This is a critical security feature for multi-tenant applications.

## Usage

### Basic Usage

```typescript
import { TenantAwareQuery } from "../repositories/tenantAwareQuery";

// In a service or controller
const query = new TenantAwareQuery(tenantId);

// SELECT with automatic tenant_id filtering
const vehicles = await query.select('vehicles', { status: 'active' });

// SELECT one
const vehicle = await query.selectOne('vehicles', { id: vehicleId });

// COUNT
const count = await query.count('vehicles', { is_sold: false });

// INSERT (tenant_id automatically added)
const newId = await query.insert('vehicles', {
  maker: 'Toyota',
  model: 'Corolla',
  // tenant_id is automatically added
});

// UPDATE (tenant_id automatically added to WHERE clause)
await query.update('vehicles', 
  { status: 'sold' }, 
  { id: vehicleId }
);

// DELETE (tenant_id automatically added to WHERE clause)
await query.delete('vehicles', { id: vehicleId });
```

### Using with Request Middleware

The `tenantGuard` middleware automatically attaches `TenantAwareQuery` to the request:

```typescript
// In a controller
export async function listVehicles(req: AuthRequest, res: Response) {
  const query = req.tenantQuery!; // Automatically available after tenantGuard
  
  const vehicles = await query.select('vehicles', {
    status: req.query.status as string,
  });
  
  res.json(vehicles);
}
```

### Complex Queries

For complex queries with JOINs:

```typescript
const vehicles = await query.select('vehicles', {}, {
  fields: ['v.*', 'b.name as branch_name'],
  joins: [
    {
      table: 'branches b',
      on: 'v.branch_id = b.id',
      type: 'LEFT'
    }
  ],
  orderBy: 'v.created_at',
  orderDirection: 'DESC',
  limit: 50,
  offset: 0
});
```

### Transactions

```typescript
await query.transaction(async (txQuery) => {
  // All queries in transaction automatically include tenant_id
  const vehicleId = await txQuery.insert('vehicles', { maker: 'Toyota' });
  await txQuery.insert('vehicle_costs', {
    vehicle_id: vehicleId,
    cost_name: 'Purchase',
    amount: 100000
  });
});
```

### Raw Queries (Use with Caution)

For complex queries that can't use the simple methods:

```typescript
// This will throw an error if tenant_id is not in the query
const [rows] = await query.executeRaw(
  `SELECT v.*, b.name 
   FROM vehicles v 
   LEFT JOIN branches b ON v.branch_id = b.id 
   WHERE v.tenant_id = ? AND v.status = ?`,
  [tenantId, 'active'], // tenant_id must be in params
  true // requiredTenantId = true (default)
);
```

## Migration Guide

### Before (Unsafe)

```typescript
// ❌ BAD: Manual tenant_id, easy to forget
const [rows] = await dbPool.query(
  "SELECT * FROM vehicles WHERE id = ? AND tenant_id = ?",
  [vehicleId, req.tenantId]
);
```

### After (Safe)

```typescript
// ✅ GOOD: Automatic tenant_id enforcement
const query = new TenantAwareQuery(req.tenantId);
const vehicle = await query.selectOne('vehicles', { id: vehicleId });
```

## Safety Features

1. **Automatic tenant_id injection**: All queries automatically include `tenant_id` in WHERE clauses
2. **INSERT protection**: `tenant_id` is automatically added to INSERT statements
3. **UPDATE protection**: `tenant_id` is automatically added to WHERE clause in UPDATE statements
4. **DELETE protection**: `tenant_id` is automatically added to WHERE clause in DELETE statements
5. **Raw query validation**: `executeRaw` checks that `tenant_id` is present in complex queries
6. **Transaction safety**: All queries in transactions automatically include `tenant_id`

## Best Practices

1. **Always use TenantAwareQuery** for tenant-aware tables
2. **Never bypass tenant_id** - if you need a system-wide query, use a separate service
3. **Use req.tenantQuery** in controllers (automatically available after tenantGuard)
4. **Prefer simple methods** (select, update, delete) over raw queries
5. **Test tenant isolation** - ensure queries don't leak data between tenants

## Tenant-Aware Tables

The following tables are tenant-aware and should use `TenantAwareQuery`:

- `vehicles`
- `vehicle_costs`
- `vehicle_sales`
- `vehicle_images`
- `customers`
- `branches`
- `staff`
- `income`
- `expenses`
- `inventory_products`
- `inventory_movements`
- `vehicle_quotes`
- `vehicle_installment_sales`
- `vehicle_installment_payments`
- `followups`
- `documents`

## Error Handling

If you try to use `TenantAwareQuery` without a valid tenant ID:

```typescript
// Throws: "Valid tenantId is required for TenantAwareQuery"
const query = new TenantAwareQuery(0);
```

If you try to execute a raw query without `tenant_id`:

```typescript
// Throws: "Query on tenant-aware table must include tenant_id filter"
await query.executeRaw("SELECT * FROM vehicles WHERE id = ?", [vehicleId]);
```


