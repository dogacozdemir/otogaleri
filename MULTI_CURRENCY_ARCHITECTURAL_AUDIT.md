# Multi-Tenant, Multi-Currency Financial Flow — Architectural Audit Report

**Date:** February 15, 2025  
**Last Updated:** February 15, 2025 (audit gaps closed)  
**Scope:** Frontend & Backend integration points for cost, currency, reporting, treasury, and UI consistency.

---

## 1. Cost & Calculation Logic (Deep-Dive)

### 1.1 profitController (`backend/src/controllers/profitController.ts`)

**Flow:**
- **Total costs:** `SUM(amount * fx_rate_to_base)` from `vehicle_costs` — all costs (including purchase) are normalized to base currency.
- **Purchase handling:** Purchase is synced from `vehicles.purchase_amount` into `vehicle_costs` as a system cost (`is_system_cost = 1`) by `VehicleService.syncPurchaseCostToVehicleCosts()`. Profit uses only `vehicle_costs`, so there is no double-counting.
- **Sale amount:** For sold vehicles, **strictly** uses `vehicle_sales` (sale_amount, sale_currency, sale_fx_rate_to_base). For unsold vehicles, uses `vehicles.sale_price` etc. Zero drift with reports.
- **ROI / profit margin:** Uses `safeDivide()` to avoid division by zero.

**Normalization:** Costs are correctly normalized via `amount * fx_rate_to_base` before summing. Each cost has its own `fx_rate_to_base` and `base_currency_at_transaction`.

### 1.2 useVehicleCalculationQuery (`frontend/src/hooks/useVehiclesQuery.ts`)

- Calls `/vehicles/:id/calculate-costs` and maps backend response to `CostCalculation`.
- `generalTotal` = `totals.total_costs_base` (base currency).
- `amount_base` for each cost = `amount * (fx_rate_to_base || 1)`.
- No client-side profit/ROI calculation; all values come from the backend.

### 1.3 fxAnalysisController — ✅ FIXED (February 2025)

- **Purchase:** Derives from `vehicle_costs` where `is_system_cost = 1` and `category = 'purchase'` — single source of truth.
- **Sale:** Derives from `vehicle_sales` (sale_amount, sale_currency, sale_fx_rate_to_base) — aligned with profitController and analytics.
- **Total costs:** Uses `vehicle_costs` SUM; purchase is included via the system cost row.

### 1.4 VehicleTable — ✅ FIXED (February 2025)

**Previous issue:** Profit mixed `sale_price` (in sale_currency) with `total_costs` (in base).

**Current implementation:**
- Backend (`VehicleService.listVehicles`) now returns:
  - `total_costs` — converted to current tenant default (historical rate at `cost_date` when `base_currency_at_transaction` differs)
  - `sale_amount_in_current_base` — for sold: historical rate at `sale_date`; for unsold: today's rate
- Frontend `calculateProfit` uses `sale_amount_in_current_base - total_costs` (both in base).
- **Satış fiyatı:** Stays in original currency (`formatCurrencyWithCurrency`).
- **Maliyet & Kar:** Always in tenant default (`formatInBaseCurrency`).

---

## 2. Global Currency Handling (Context & Hooks)

### 2.1 useCurrency (`frontend/src/hooks/useCurrency.ts`)

- Uses tenant `default_currency` and locale.
- `formatCurrency(amount)` — formats in tenant base currency.
- `formatCurrencyWithCurrency(amount, recordCurrency)` — formats using the record’s currency.

### 2.2 ViewCurrencyContext (`frontend/src/contexts/ViewCurrencyContext.tsx`)

- Holds `viewCurrency` (TRY | USD | EUR | GBP | JPY).
- Resets to `baseCurrency` when tenant changes.
- No backend calls; purely client state.

### 2.3 useViewCurrencyConversion (`frontend/src/hooks/useViewCurrencyConversion.ts`) — ✅ FIXED (February 2025)

- When `viewCurrency !== baseCurrency`, fetches `/currency/rate?from=base&to=viewCurrency`.
- `formatInViewCurrency(amount)` = `amount * rate` — assumes `amount` is in base. **Guards:** `amount == null` or `!Number.isFinite(amount)` → `"-"`; `rate` non-finite → uses 1; `converted` non-finite → localized `"0"`.
- `convertAmount(amount)` = `amount * rate`. **Guards:** non-finite inputs → `0`.
- Conversion is client-side using a single rate; no re-fetch of vehicle or cost data.

**Summary:** View currency changes do not trigger backend re-fetch. The UI multiplies base-currency amounts by the current rate. This is correct only when amounts are already in base currency.

### 2.4 Currency Rate API — ✅ Enhanced (February 2025)

- **Endpoint:** `GET /currency/rate?from=X&to=Y&date=YYYY-MM-DD`
- **Historical rates:** Optional `date` param fetches rate at that date (via `getHistoricalRate`).
- **Latest rate:** When `date` omitted, returns current rate.
- Used by backend for cost/sale conversion when tenant `default_currency` changes.

---

## 3. Reporting & Analytics Integration

### 3.1 Sold Vehicles — Frozen vs Live Rates

**Analytics (analyticsController.ts):**
- Uses `vehicle_sales` with `vs.sale_amount * vs.sale_fx_rate_to_base`.
- Uses frozen rates at sale time.
- `getBrandProfit`, `getModelProfit`, `getTopProfitable`, `getMonthlyComparison` all use `vehicle_sales` and frozen rates.

**profitController:** ✅ FIXED (February 2025)
- For sold vehicles, uses `vehicle_sales` exclusively — no drift with analytics.

### 3.2 Monthly Profit Aggregation

**analyticsController.getMonthlyComparison:**
```sql
SUM(vs.sale_amount * vs.sale_fx_rate_to_base) as total_revenue
SUM(...(SELECT SUM(amount * fx_rate_to_base) FROM vehicle_costs WHERE vehicle_id = v.id)...) as total_costs
```

- Revenue and costs are both in base currency.
- Uses frozen sale rates and cost rates at transaction time.

### 3.3 base_currency_at_transaction — ✅ Addressed (February 2025)

- `vehicle_costs` has `base_currency_at_transaction`.
- **Vehicle list:** When `base_currency_at_transaction` ≠ current tenant default, backend converts each cost to current base using historical rate at `cost_date` (`getOrFetchRate`).
- **Vehicle costs list:** Each cost now includes `amount_in_current_base` (converted when base differs).
- **Historical accuracy:** Transactions always use the rate at transaction date — no retroactive rate changes.

---

## 4. Treasury (Kasa) & Accounting Flow

### 4.1 Trigger Mechanism

- **Vehicle cost:** `vehicleCostController.addVehicleCost` inserts into `vehicle_costs` only. No direct entry into `expenses` or a ledger.
- **Vehicle sale:** `vehicleSaleController.markVehicleAsSold` inserts into `vehicle_sales` and updates `vehicles`. No direct entry into `income` or a ledger.
- **Accounting aggregates:** `AccountingService` reads from `vehicle_sales`, `vehicle_costs`, `expenses`, `income`, `inventory_movements` and aggregates them for reporting.

### 4.2 Ledger / Transactions

- No double-entry ledger table.
- No `transactions` or `journal_entries` table.
- Accounting is aggregate-based: income vs expense by date/category.

### 4.3 Data Flow

- **Income:** `vehicle_sales` (sale_amount * sale_fx_rate_to_base), `income`, `inventory_movements` (sale type).
- **Expenses:** `expenses`, `vehicle_costs` (amount * fx_rate_to_base).
- All amounts are converted to base for aggregation.

### 4.4 Kasa Currency Handling

- No separate bank/cash accounts.
- No explicit handling of “paying a GBP cost from a TRY account.”
- FX differences are implicit: each cost/sale stores its own `fx_rate_to_base`; there is no separate FX gain/loss ledger entry.

**Recommendation:** If full treasury is needed, introduce:
- `accounts` (e.g. Kasa TRY, Bank USD)
- `ledger_entries` with debit/credit and currency
- FX gain/loss entries when settlement currency differs from transaction currency

---

## 5. UI/UX Consistency

### 5.1 VehicleDetail Tabs vs ViewCurrency — ✅ Updated (February 2025)

| Component                 | Currency Source              | Uses ViewCurrency? | Notes |
|--------------------------|------------------------------|--------------------|-------|
| VehicleTable (list)      | `formatInBaseCurrency` for Maliyet & Kar | No — always base | Satış fiyatı: original currency |
| VehicleDetailModal       | `currency` prop = `displayCurrency`    | Yes (prop)        | |
| VehicleDetailCostsTab    | `formatCurrency(totalBase)`            | No — always base  | Genel toplam in base |
| VehicleDetailCostsTab    | `formatCurrencyWithCurrency` per cost   | No                | Each cost in its currency |
| VehicleDetailCalculateTab| `tenant.default_currency`              | No                | |

- **Harcamalar (Costs):** Each cost row shows in its own currency. **Genel toplam** uses `amount_in_current_base` (backend) → always in tenant default.
- **Vehicle list:** Satış fiyatı stays in original currency; Maliyet & Kar always in tenant default.
- **Hesaplama (Calculate):** Uses `targetCurrency = tenant.default_currency` and `/vehicles/:id/convert-costs`.

### 5.2 Accounting Page

- Uses `targetCurrency = tenant?.default_currency`.
- No ViewCurrency; always base.
- Total balance = `totalConvertedIncome - totalConvertedExpense` in base.
- No multi-account breakdown; single aggregate in base currency.

---

## 6. Inconsistencies Summary

| # | Location                    | Status | Issue / Resolution |
|---|-----------------------------|--------|--------------------|
| 1 | VehicleTable.calculateProfit| ✅ Fixed | Backend returns `sale_amount_in_current_base`, `total_costs` in base |
| 2 | fxAnalysisController        | ✅ Fixed | Purchase from vehicle_costs; sale from vehicle_sales |
| 3 | VehicleDetailCostsTab       | ✅ Fixed | Genel toplam uses `amount_in_current_base` → always base |
| 4 | VehicleDetailCalculateTab   | By design | Uses tenant default; no ViewCurrency |
| 5 | profitController vs vehicle_sales | ✅ Fixed | Uses vehicle_sales for sold vehicles — zero drift |

---

## 7. NaN / Infinity Risks

| Location              | Risk                          | Mitigation                          |
|-----------------------|-------------------------------|-------------------------------------|
| profitController      | ROI / margin division by zero | `safeDivide()` used                 |
| fxAnalysisController  | fx_impact_percent             | `safeDivide()` used                 |
| analyticsController   | Sales change %               | `safeDivide()` used                 |
| VehicleTable          | profit display                | No division; but profit can be NaN if inputs are NaN |
| useViewCurrencyConversion | amount * rate             | ✅ `Number.isFinite` guards; non-finite rate → 1; non-finite result → 0 or localized "0" |
| formatInViewCurrency   | NaN amount                   | ✅ `amount == null` or `!Number.isFinite(amount)` → "-"; non-finite converted → localized "0" |

---

## 8. Data-Locking Recommendations

1. **Sale rate freeze:** Already implemented — `vehicle_sales.sale_fx_rate_to_base`, `base_currency_at_sale`.
2. **Cost rate freeze:** Already implemented — `vehicle_costs.fx_rate_to_base`, `base_currency_at_transaction`.
3. **profitController sale source:** ✅ Done — uses `vehicle_sales` for sold vehicles.
4. **cost_summary tenant filter:** ✅ Done — `tenant_id` in subquery and `cost_summary.tenant_id = v.tenant_id` in JOIN (vehicleService, analyticsController).
5. **Accounting period lock:** Consider a “period closed” flag to prevent edits to past accounting data.
6. **Audit trail:** Add `created_at`, `updated_at`, and optionally `updated_by` for critical financial tables if not already present.

---

## 9. Recommended Fixes (Priority Order)

1. ~~**High:** Fix `VehicleTable.calculateProfit` to use base currency for sold vehicles.~~ ✅ Done
2. ~~**High:** Add NaN/Infinity guards in `useViewCurrencyConversion`.~~ ✅ Done
3. ~~**Medium:** Align `fxAnalysisController` with `vehicle_costs` for purchase amount.~~ ✅ Done
4. ~~**Medium:** Use `vehicle_sales` in `profitController` for sold vehicles.~~ ✅ Done
5. ~~**Low:** Add ViewCurrency support to VehicleDetailCostsTab and VehicleDetailCalculateTab.~~ By design: cost/profit always in base
6. ~~**Low:** Add `tenant_id` to cost_summary subqueries for stricter multi-tenant isolation.~~ ✅ Done

---

## 10. Implemented Improvements (February 2025)

### 10.1 Backend: Vehicle List Conversion

**VehicleService.listVehicles:**
- **total_costs:** Converted to current tenant default. When `base_currency_at_transaction` ≠ current base, uses `getOrFetchRate(storedBase, currentBase, cost_date)` — historical rate at transaction date.
- **sale_amount_in_current_base (sold):** From `vehicle_sales`; converts using rate at `sale_date`.
- **sale_amount_in_current_base (unsold):** Converts `sale_price` (in `sale_currency`) to base using today's rate.
- Rate cache per request to avoid duplicate API calls.

### 10.2 Backend: Vehicle Costs List

**vehicleCostController.listVehicleCosts:**
- Each cost gets `amount_in_current_base` — converted to current tenant default when `base_currency_at_transaction` differs.
- Uses historical rate at `cost_date` for conversion.

### 10.3 Backend: Currency API

**currencyController.getCurrencyRate:**
- Added optional `date` query param for historical rates.
- `GET /currency/rate?from=TRY&to=USD&date=2025-01-15` returns rate at that date.

### 10.4 Frontend: VehicleTable

- **Satış fiyatı:** `formatCurrencyWithCurrency(sale_price, sale_currency)` — original currency.
- **Maliyet:** `formatInBaseCurrency(total_costs)` — always base.
- **Kar:** `formatInBaseCurrency(sale_amount_in_current_base - total_costs)` — both in base.

### 10.5 Frontend: VehicleDetailCostsTab

- **Genel toplam:** Uses `amount_in_current_base` when available; falls back to `amount * fx_rate_to_base`.
- Display: `formatCurrency(totalBase)` — always in tenant default.

### 10.6 Audit Gaps Closed (February 2025)

| Gap | Resolution |
|-----|------------|
| **profitController** | `calculateVehicleProfit` and `convertCostsToCurrency` use `vehicle_sales` for sold vehicles; `vehicles` only for unsold. Zero drift with reports. |
| **fxAnalysisController** | Purchase from `vehicle_costs` (is_system_cost=1, category='purchase'); sale from `vehicle_sales`. |
| **useViewCurrencyConversion** | `Number.isFinite` guards on amount, rate, and converted result; non-finite → localized `"0"` or `"-"`. |
| **tenant_id isolation** | `cost_summary` subqueries in `vehicleService` and `analyticsController` include `tenant_id` in SELECT, GROUP BY, and JOIN (`cost_summary.tenant_id = v.tenant_id`). |
| **Schema deprecation** | `vehicles.sale_price`, `sale_currency`, `sale_fx_rate_to_base`, `sale_date` marked `@deprecated` — prefer `vehicle_sales` table. |
