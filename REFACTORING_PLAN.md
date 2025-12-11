# VehiclesPage.tsx Refactoring Plan

## Overview
The 4500+ line `VehiclesPage.tsx` file has been refactored into modular components and hooks to improve maintainability and code organization.

## Completed Extractions

### 1. ✅ `useVehiclesData.ts` Hook
**Location:** `frontend/src/hooks/useVehiclesData.ts`

**Extracted:**
- All state management (vehicles, loading, pagination, filters, modals)
- All API calls (fetchVehicles, fetchVehicleDetail, etc.)
- Filtering and sorting logic (useMemo hooks)
- Pagination state management

**Usage:**
```typescript
const vehiclesData = useVehiclesData();
// Access: vehiclesData.vehicles, vehiclesData.loading, vehiclesData.fetchVehicles, etc.
```

### 2. ✅ `vehicleUtils.ts` Utilities
**Location:** `frontend/src/utils/vehicleUtils.ts`

**Extracted:**
- `getPaidInstallmentCount()` - Calculate paid installment count
- `getInstallmentOverdueDays()` - Check for overdue installments
- `getInstallmentStatus()` - Get installment status info
- `formatDateTime()` - Format date with time
- `formatDate()` - Format date only

### 3. ✅ `VehicleFilters.tsx` Component
**Location:** `frontend/src/components/vehicles/VehicleFilters.tsx`

**Extracted:**
- Search input
- Filter dropdowns (isSoldFilter, statusFilter, stockStatusFilter)
- Sold vehicles filter dropdown

## Remaining Work

### 4. `VehicleTable.tsx` Component (Partially Complete)
**Location:** `frontend/src/components/vehicles/VehicleTable.tsx`

**Needs to extract:**
- Table view rendering (lines ~1775-1974)
- List/Card view rendering (lines ~1975-2200+)
- Action buttons (Detail, Edit, Quote, Sell, Delete)
- Status badges rendering

**Props needed:**
- `vehicles: Vehicle[]`
- `loading: boolean`
- `viewMode: 'table' | 'list'`
- `onDetailClick: (vehicle: Vehicle) => void`
- `onEditClick: (vehicle: Vehicle) => void`
- `onQuoteClick: (vehicle: Vehicle) => void`
- `onSellClick: (vehicle: Vehicle) => void`
- `onDeleteClick: (id: number) => void`
- `currency: (amount: number) => string`

### 5. `VehicleAddEditModal.tsx` Component
**Location:** `frontend/src/components/vehicles/VehicleAddEditModal.tsx`

**Needs to extract:**
- Add vehicle form (lines ~1409-1759)
- Edit vehicle form (lines ~2200-2800+)
- Form validation logic
- Multi-step form handling
- Form state management

**Props needed:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `mode: 'add' | 'edit'`
- `vehicle?: Vehicle`
- `onSubmit: (data: VehicleFormData) => Promise<void>`
- `currencies: Currency[]`
- `defaultCostItems: string[]`

### 6. `vehicleColumns.tsx` (Optional - Column Definitions)
**Location:** `frontend/src/components/vehicles/vehicleColumns.tsx`

**Purpose:** Define table column structure (if using a DataTable library)

**Note:** Current implementation uses inline TableHead components, so this may not be necessary unless migrating to a column-based table library.

## Refactoring Steps

### Step 1: Update VehiclesPage.tsx
1. Import the hook: `import { useVehiclesData } from "@/hooks/useVehiclesData"`
2. Replace all state declarations with hook call
3. Import and use VehicleFilters component
4. Import and use VehicleTable component
5. Import and use VehicleAddEditModal component
6. Remove extracted code sections
7. Keep only modal handlers and orchestration logic

### Step 2: Handle Modal States
The following modal states and handlers should remain in VehiclesPage or be extracted to separate modal components:
- Detail Modal (very large, ~1000+ lines)
- Cost Modal
- Sell Modal
- Payment Modal
- Quote Modal
- Document Modal

**Recommendation:** Extract these modals into separate components:
- `VehicleDetailModal.tsx`
- `VehicleCostModal.tsx`
- `VehicleSellModal.tsx`
- `VehiclePaymentModal.tsx`
- `VehicleQuoteModal.tsx`
- `VehicleDocumentModal.tsx`

### Step 3: Test Each Component
1. Test VehicleFilters component independently
2. Test VehicleTable component with mock data
3. Test VehicleAddEditModal component
4. Test integration in VehiclesPage

## File Structure After Refactoring

```
frontend/src/
├── hooks/
│   └── useVehiclesData.ts ✅
├── utils/
│   └── vehicleUtils.ts ✅
├── components/
│   └── vehicles/
│       ├── VehicleFilters.tsx ✅
│       ├── VehicleTable.tsx (TODO)
│       ├── VehicleAddEditModal.tsx (TODO)
│       ├── VehicleDetailModal.tsx (TODO)
│       ├── VehicleCostModal.tsx (TODO)
│       ├── VehicleSellModal.tsx (TODO)
│       ├── VehiclePaymentModal.tsx (TODO)
│       ├── VehicleQuoteModal.tsx (TODO)
│       └── VehicleDocumentModal.tsx (TODO)
└── pages/
    └── VehiclesPage.tsx (Refactored - ~500-800 lines)
```

## Key Considerations

1. **Data Flow:** All data flows through `useVehiclesData` hook to maintain single source of truth
2. **Props Passing:** Components receive only necessary props (no prop drilling)
3. **Modal Management:** Consider using a modal context or keeping modal state in VehiclesPage
4. **Form Handling:** VehicleAddEditModal should manage its own form state
5. **Error Handling:** Toast notifications should be handled in the hook or passed as callbacks

## Next Steps

1. Complete VehicleTable.tsx extraction
2. Complete VehicleAddEditModal.tsx extraction
3. Extract remaining modal components
4. Update VehiclesPage.tsx to use all extracted components
5. Test thoroughly
6. Remove unused imports and code
