import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/api";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useCurrencyRates } from "@/contexts/CurrencyRatesContext";
import { useTenant } from "@/contexts/TenantContext";

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

export const useVehiclesData = () => {
  const { formatCurrency: currency } = useCurrency();
  const { getCustomRate } = useCurrencyRates();
  const { tenant } = useTenant();
  const baseCurrency = tenant?.default_currency || "TRY";
  const location = useLocation();
  const { toast } = useToast();

  // Main data state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Filter states
  const [query, setQuery] = useState("");
  const [isSoldFilter, setIsSoldFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("");
  const [soldVehiclesFilter, setSoldVehiclesFilter] = useState<string>("all");

  // View mode states
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table');
  const [soldViewMode, setSoldViewMode] = useState<'table' | 'list'>('table');
  const [activeTab, setActiveTab] = useState<string>("vehicles");

  // Selected vehicle state
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicleCosts, setVehicleCosts] = useState<VehicleCost[]>([]);
  const [costCalculation, setCostCalculation] = useState<CostCalculation | null>(null);
  const [vehicleDocuments, setVehicleDocuments] = useState<any[]>([]);

  // API Functions
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: "50"
      });
      if (query) params.append('search', query);
      if (isSoldFilter && isSoldFilter !== "all") params.append('is_sold', isSoldFilter);
      if (statusFilter && statusFilter !== "all") params.append('status', statusFilter);
      if (stockStatusFilter && stockStatusFilter !== "all") params.append('stock_status', stockStatusFilter);

      const response = await api.get(`/vehicles?${params}`);
      setVehicles(response.data.vehicles || []);
      setPagination(response.data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (e: any) {
      if (e?.response?.status === 500) {
        console.error('Backend error:', e?.response?.data);
        setVehicles([]);
        setPagination({ page: 1, totalPages: 1, total: 0 });
        toast({ 
          title: "Bilgi", 
          description: "Veritabanı tabloları henüz oluşturulmamış olabilir. Lütfen migration dosyasını çalıştırın.", 
          variant: "default" 
        });
      } else {
        toast({ 
          title: "Hata", 
          description: e?.response?.data?.message || "Araçlar yüklenemedi.", 
          variant: "destructive" 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleDetail = async (id: number) => {
    try {
      const response = await api.get(`/vehicles/${id}`);
      setSelectedVehicle(response.data);
      
      // Fetch related data
      const [costsRes, calculationRes, documentsRes] = await Promise.all([
        api.get(`/vehicles/${id}/costs`).catch(() => ({ data: [] })),
        api.get(`/vehicles/${id}/calculate-costs`).catch(() => ({ data: null })),
        api.get(`/documents/vehicles/${id}`).catch(() => ({ data: [] }))
      ]);
      
      setVehicleCosts(costsRes.data || []);
      setCostCalculation(calculationRes.data || null);
      setVehicleDocuments(documentsRes.data || []);
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.message || "Araç detayları yüklenemedi.", 
        variant: "destructive" 
      });
    }
  };

  const fetchVehicleDocuments = async (vehicleId: number) => {
    try {
      const response = await api.get(`/documents/vehicles/${vehicleId}`);
      setVehicleDocuments(response.data || []);
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.message || "Belgeler yüklenemedi.", 
        variant: "destructive" 
      });
    }
  };

  const fetchCostCalculation = async (id: number) => {
    try {
      const response = await api.get(`/vehicles/${id}/calculate-costs`);
      setCostCalculation(response.data);
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.message || "Maliyet hesaplaması yüklenemedi.", 
        variant: "destructive" 
      });
    }
  };

  // Computed values
  const filteredVehicles = useMemo(() => {
    return vehicles;
  }, [vehicles, query]);

  const soldVehicles = useMemo(() => {
    return vehicles.filter(v => v.is_sold);
  }, [vehicles]);

  const filteredSoldVehicles = useMemo(() => {
    let filtered = soldVehicles;
    
    if (query) {
      const searchLower = query.toLowerCase();
      filtered = filtered.filter(v => 
        (v.maker && v.maker.toLowerCase().includes(searchLower)) ||
        (v.model && v.model.toLowerCase().includes(searchLower)) ||
        (v.chassis_no && v.chassis_no.toLowerCase().includes(searchLower)) ||
        (v.plate_number && v.plate_number.toLowerCase().includes(searchLower))
      );
    }
    
    if (soldVehiclesFilter === "cash") {
      filtered = filtered.filter(v => !v.installment_sale_id);
    } else if (soldVehiclesFilter === "installment_pending") {
      filtered = filtered.filter(v => 
        v.installment_sale_id && 
        v.installment_remaining_balance && 
        v.installment_remaining_balance > 0
      );
    } else if (soldVehiclesFilter === "installment_completed") {
      filtered = filtered.filter(v => 
        v.installment_sale_id && 
        (!v.installment_remaining_balance || v.installment_remaining_balance <= 0)
      );
    }
    
    return filtered;
  }, [soldVehicles, soldVehiclesFilter, query]);

  // Effects
  useEffect(() => {
    fetchVehicles();
  }, [pagination.page, isSoldFilter, statusFilter, stockStatusFilter, query]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [isSoldFilter, statusFilter, stockStatusFilter]);

  useEffect(() => {
    const state = location.state as { selectedVehicleId?: number } | null;
    if (state?.selectedVehicleId && vehicles.length > 0) {
      const vehicle = vehicles.find(v => v.id === Number(state.selectedVehicleId));
      if (vehicle) {
        setSelectedVehicle(vehicle);
        fetchVehicleDetail(vehicle.id);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, vehicles]);

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
    
    // API functions
    fetchVehicles,
    fetchVehicleDetail,
    fetchVehicleDocuments,
    fetchCostCalculation,
    
    // Setters
    setSelectedVehicle,
    setVehicleCosts,
    setCostCalculation,
    setVehicleDocuments,
    
    // Utils
    currency,
    getCustomRate,
    baseCurrency,
    toast
  };
};
