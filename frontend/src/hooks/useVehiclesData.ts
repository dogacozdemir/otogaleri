import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useCurrencyRates } from "@/contexts/CurrencyRatesContext";
import { useTenant } from "@/contexts/TenantContext";
import {
  useVehiclesQuery,
  useVehicleDetailQuery,
  useVehicleCostsQuery,
  useVehicleCalculationQuery,
  useVehicleDocumentsQuery,
  useCreateVehicleMutation,
  useUpdateVehicleMutation,
  useDeleteVehicleMutation,
  vehicleKeys,
} from "./useVehiclesQuery";
import { useQueryClient } from "@tanstack/react-query";

export type Vehicle = {
  id: number;
  vehicle_number: number | null;
  maker: string | null;
  model: string | null;
  production_year: number | null;
  arrival_date: string | null;
  transmission: string | null;
  chassis_no: string | null;
  plate_number: string | null;
  km: number | null;
  fuel: string | null;
  grade: string | null;
  cc: number | null;
  color: string | null;
  other: string | null;
  sale_price: number | null;
  sale_currency?: string | null;
  paid: number | null;
  purchase_amount?: number | null;
  purchase_currency?: string | null;
  delivery_date: string | null;
  delivery_time: string | null;
  is_sold: boolean;
  status?: 'new' | 'used' | 'damaged' | 'repaired' | null;
  stock_status?: 'in_stock' | 'on_sale' | 'reserved' | 'sold' | null;
  location?: string | null;
  target_profit?: number | null;
  features?: string | object | null;
  total_costs: number;
  cost_count: number;
  created_at: string;
  primary_image_url?: string | null;
  sale_info?: {
    customer_name: string;
    customer_phone: string | null;
    customer_address: string | null;
    plate_number: string | null;
    key_count: number | null;
    sale_date: string;
  } | null;
  installment_sale_id?: number | null;
  installment_remaining_balance?: number | null;
  installment?: {
    id: number;
    total_amount: number;
    down_payment: number;
    installment_count: number;
    installment_amount: number;
    currency: string;
    status: 'active' | 'completed' | 'cancelled';
    total_paid: number;
    remaining_balance: number;
    payments: Array<{
      id: number;
      payment_type: 'down_payment' | 'installment';
      installment_number: number | null;
      amount: number;
      currency: string;
      payment_date: string;
      notes: string | null;
    }>;
  } | null;
};

export type VehicleCost = {
  id: number;
  cost_name: string;
  amount: number;
  date: string;
  currency?: string;
  category?: string;
  cost_date?: string;
};

export type CostCalculation = {
  vehicle: {
    id: number;
    maker: string | null;
    model: string | null;
    sale_price: number | null;
    sale_currency?: string | null;
    purchase_currency?: string | null;
    purchase_fx_rate_to_base?: number | null;
  };
  costItems: Array<{ id?: number; name: string; amount: number; currency?: string; amount_base?: number; cost_date?: string; custom_rate?: number | null; fx_rate_to_base?: number }>;
  customItems: Array<{ name: string; amount: number; currency?: string }>;
  generalTotal: number;
  salePrice: number;
  profit: number;
  profitMargin?: number;
  roi?: number;
  targetProfit?: number | null;
  profitVsTarget?: number | null;
};

/**
 * useVehiclesData - Refactored to use TanStack Query
 * 
 * This hook now uses TanStack Query for data fetching, caching, and state management.
 * The API remains the same for backward compatibility.
 */
export const useVehiclesData = () => {
  const { formatCurrency: currency } = useCurrency();
  const { getCustomRate } = useCurrencyRates();
  const { tenant } = useTenant();
  const baseCurrency = tenant?.default_currency || "TRY";
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter states
  const [query, setQuery] = useState("");
  const [isSoldFilter, setIsSoldFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("");
  const [soldVehiclesFilter, setSoldVehiclesFilter] = useState<string>("all");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // View mode states
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table');
  const [soldViewMode, setSoldViewMode] = useState<'table' | 'list'>('table');
  const [activeTab, setActiveTab] = useState<string>("vehicles");

  // Selected vehicle state
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

  // TanStack Query hooks
  const vehiclesQuery = useVehiclesQuery({
    page: pagination.page,
    limit: 50,
    search: query,
    is_sold: isSoldFilter,
    status: statusFilter,
    stock_status: stockStatusFilter,
  });

  const vehicleDetailQuery = useVehicleDetailQuery(selectedVehicleId);
  const vehicleCostsQuery = useVehicleCostsQuery(selectedVehicleId);
  const vehicleCalculationQuery = useVehicleCalculationQuery(selectedVehicleId);
  const vehicleDocumentsQuery = useVehicleDocumentsQuery(selectedVehicleId);

  // Mutations
  const createVehicleMutation = useCreateVehicleMutation();
  const updateVehicleMutation = useUpdateVehicleMutation();
  const deleteVehicleMutation = useDeleteVehicleMutation();

  // Reset pagination when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [isSoldFilter, statusFilter, stockStatusFilter]);

  // Handle location state for selected vehicle
  useEffect(() => {
    const state = location.state as { selectedVehicleId?: number } | null;
    if (state?.selectedVehicleId) {
      setSelectedVehicleId(state.selectedVehicleId);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Update pagination when query data changes
  useEffect(() => {
    if (vehiclesQuery.data?.pagination) {
      setPagination(vehiclesQuery.data.pagination);
    }
  }, [vehiclesQuery.data?.pagination]);

  // Computed values
  const vehicles = vehiclesQuery.data?.vehicles || [];
  const loading = vehiclesQuery.isLoading || vehiclesQuery.isFetching;
  const selectedVehicle = vehicleDetailQuery.data || null;
  const vehicleCosts = vehicleCostsQuery.data || [];
  const costCalculation = vehicleCalculationQuery.data || null;
  const vehicleDocuments = vehicleDocumentsQuery.data || [];

  const filteredVehicles = useMemo(() => {
    return vehicles;
  }, [vehicles, query]);

  const soldVehicles = useMemo(() => {
    return vehicles.filter((v: Vehicle) => v.is_sold);
  }, [vehicles]);

  const filteredSoldVehicles = useMemo(() => {
    let filtered = soldVehicles;
    
    if (query) {
      const searchLower = query.toLowerCase();
      filtered = filtered.filter((v: Vehicle) => 
        (v.maker && v.maker.toLowerCase().includes(searchLower)) ||
        (v.model && v.model.toLowerCase().includes(searchLower)) ||
        (v.chassis_no && v.chassis_no.toLowerCase().includes(searchLower)) ||
        (v.plate_number && v.plate_number.toLowerCase().includes(searchLower))
      );
    }
    
    if (soldVehiclesFilter === "cash") {
      filtered = filtered.filter((v: Vehicle) => !v.installment_sale_id);
    } else if (soldVehiclesFilter === "installment_pending") {
      filtered = filtered.filter((v: Vehicle) => 
        v.installment_sale_id && 
        v.installment_remaining_balance && 
        v.installment_remaining_balance > 0
      );
    } else if (soldVehiclesFilter === "installment_completed") {
      filtered = filtered.filter((v: Vehicle) => 
        v.installment_sale_id && 
        (!v.installment_remaining_balance || v.installment_remaining_balance <= 0)
      );
    }
    
    return filtered;
  }, [soldVehicles, soldVehiclesFilter, query]);

  // API functions (wrappers for backward compatibility)
  const fetchVehicles = async () => {
    await vehiclesQuery.refetch();
  };

  const fetchVehicleDetail = async (id: number) => {
    setSelectedVehicleId(id);
    // Queries will automatically fetch when selectedVehicleId changes
  };

  const fetchVehicleDocuments = async (vehicleId: number) => {
    // Invalidate and refetch documents
    await queryClient.invalidateQueries({ queryKey: vehicleKeys.documents(vehicleId) });
  };

  const fetchCostCalculation = async (id: number) => {
    // Invalidate and refetch calculation
    await queryClient.invalidateQueries({ queryKey: vehicleKeys.calculation(id) });
  };

  return {
    // Data
    vehicles,
    loading,
    pagination,
    selectedVehicle,
    vehicleCosts,
    costCalculation,
    vehicleDocuments,
    
    // Filtered data
    filteredVehicles,
    soldVehicles,
    filteredSoldVehicles,
    
    // Filter states
    query,
    setQuery,
    isSoldFilter,
    setIsSoldFilter,
    statusFilter,
    setStatusFilter,
    stockStatusFilter,
    setStockStatusFilter,
    soldVehiclesFilter,
    setSoldVehiclesFilter,
    
    // View mode states
    viewMode,
    setViewMode,
    soldViewMode,
    setSoldViewMode,
    activeTab,
    setActiveTab,
    
    // Pagination
    setPagination,
    
    // API functions (backward compatible)
    fetchVehicles,
    fetchVehicleDetail,
    fetchVehicleDocuments,
    fetchCostCalculation,
    
    // Mutations
    createVehicle: createVehicleMutation.mutate,
    updateVehicle: (id: number, data: any) => updateVehicleMutation.mutate({ id, data }),
    deleteVehicle: deleteVehicleMutation.mutate,
    
    // Setters
    setSelectedVehicle: (vehicle: Vehicle | null) => {
      setSelectedVehicleId(vehicle?.id || null);
    },
    setVehicleCosts: () => {}, // No longer needed, managed by query
    setCostCalculation: () => {}, // No longer needed, managed by query
    setVehicleDocuments: () => {}, // No longer needed, managed by query
    
    // Utils
    currency,
    getCustomRate,
    baseCurrency,
    toast
  };
};
