import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import { useToast } from "@/hooks/use-toast";
import { Vehicle, VehicleCost, CostCalculation } from "./useVehiclesData";

/**
 * Query keys for vehicles data
 */
export const vehicleKeys = {
  all: ['vehicles'] as const,
  lists: () => [...vehicleKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...vehicleKeys.lists(), filters] as const,
  details: () => [...vehicleKeys.all, 'detail'] as const,
  detail: (id: number) => [...vehicleKeys.details(), id] as const,
  costs: (id: number) => [...vehicleKeys.detail(id), 'costs'] as const,
  calculation: (id: number) => [...vehicleKeys.detail(id), 'calculation'] as const,
  documents: (id: number) => [...vehicleKeys.detail(id), 'documents'] as const,
};

/**
 * Fetch vehicles list with filters
 */
export const useVehiclesQuery = (filters: {
  page?: number;
  limit?: number;
  search?: string;
  is_sold?: string;
  status?: string;
  stock_status?: string;
  branch_id?: string;
}) => {
  const { toast } = useToast();

  return useQuery({
    queryKey: vehicleKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.is_sold && filters.is_sold !== "all") params.append('is_sold', filters.is_sold);
      if (filters.status && filters.status !== "all") params.append('status', filters.status);
      if (filters.stock_status && filters.stock_status !== "all") params.append('stock_status', filters.stock_status);
      if (filters.branch_id) params.append('branch_id', filters.branch_id);

      try {
        const response = await api.get(`/vehicles?${params}`);
        return {
          vehicles: response.data.vehicles || [],
          pagination: response.data.pagination || { page: 1, totalPages: 1, total: 0 },
        };
      } catch (e: any) {
        if (e?.response?.status === 500) {
          console.error('Backend error:', e?.response?.data);
          toast({
            title: "Bilgi",
            description: "Veritabanı tabloları henüz oluşturulmamış olabilir. Lütfen migration dosyasını çalıştırın.",
            variant: "default"
          });
          return { vehicles: [], pagination: { page: 1, totalPages: 1, total: 0 } };
        }
        throw e;
      }
    },
  });
};

/**
 * Fetch vehicle detail
 */
export const useVehicleDetailQuery = (vehicleId: number | null) => {
  return useQuery({
    queryKey: vehicleKeys.detail(vehicleId!),
    queryFn: async () => {
      if (!vehicleId) return null;
      const response = await api.get(`/vehicles/${vehicleId}`);
      return response.data as Vehicle;
    },
    enabled: !!vehicleId,
  });
};

/**
 * Fetch vehicle costs
 */
export const useVehicleCostsQuery = (vehicleId: number | null) => {
  return useQuery({
    queryKey: vehicleKeys.costs(vehicleId!),
    queryFn: async () => {
      if (!vehicleId) return [];
      const response = await api.get(`/vehicles/${vehicleId}/costs`);
      return response.data as VehicleCost[];
    },
    enabled: !!vehicleId,
  });
};

/**
 * Fetch vehicle cost calculation
 */
export const useVehicleCalculationQuery = (vehicleId: number | null) => {
  return useQuery({
    queryKey: vehicleKeys.calculation(vehicleId!),
    queryFn: async () => {
      if (!vehicleId) return null;
      const response = await api.get(`/vehicles/${vehicleId}/calculate-costs`);
      const data = response.data;
      
      // Backend response'unu frontend formatına dönüştür
      const costsArray = Array.isArray(data.costs) ? data.costs : [];
      const costItems = costsArray.map((cost: any) => ({
        id: cost.id, // Cost ID for editing
        name: cost.cost_name || cost.name || 'Harcama',
        amount: cost.amount || 0, // Orijinal tutar (kendi para biriminde)
        currency: cost.currency || "TRY", // Para birimi
        amount_base: cost.amount_base || (cost.amount * (cost.fx_rate_to_base || 1)), // Base currency'deki tutar
        cost_date: cost.cost_date, // Harcama tarihi
        custom_rate: cost.custom_rate, // Manuel kur (varsa)
        fx_rate_to_base: cost.fx_rate_to_base // Base currency'ye çevrim kuru
      }));
      
      const transformedData: CostCalculation = {
        vehicle: data.vehicle || {
          id: vehicleId,
          maker: null,
          model: null,
          sale_price: null,
          sale_currency: null,
          purchase_currency: null,
          purchase_fx_rate_to_base: null
        },
        costItems: costItems,
        customItems: [], // Backend'de custom items ayrımı yok, şimdilik boş
        generalTotal: data.totals?.total_costs_base || 0,
        salePrice: data.totals?.sale_amount_base || data.vehicle?.sale_price || 0,
        profit: data.totals?.profit_base || 0,
        profitMargin: data.totals?.profit_margin_percent,
        roi: data.totals?.roi_percent,
        targetProfit: data.target_profit,
        profitVsTarget: data.target_profit ? (data.totals?.profit_base || 0) - data.target_profit : null
      };
      
      return transformedData;
    },
    enabled: !!vehicleId,
  });
};

/**
 * Fetch vehicle documents
 */
export const useVehicleDocumentsQuery = (vehicleId: number | null) => {
  return useQuery({
    queryKey: vehicleKeys.documents(vehicleId!),
    queryFn: async () => {
      if (!vehicleId) return [];
      const response = await api.get(`/documents/vehicles/${vehicleId}`);
      return response.data as any[];
    },
    enabled: !!vehicleId,
  });
};

/**
 * Create vehicle mutation
 */
export const useCreateVehicleMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/vehicles', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate vehicles list to refetch
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
      toast({
        title: "Başarılı",
        description: "Araç başarıyla oluşturuldu.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Araç oluşturulamadı.",
        variant: "destructive",
      });
    },
  });
};

/**
 * Update vehicle mutation
 */
export const useUpdateVehicleMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await api.put(`/vehicles/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific vehicle detail and list
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
      toast({
        title: "Başarılı",
        description: "Araç başarıyla güncellendi.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Araç güncellenemedi.",
        variant: "destructive",
      });
    },
  });
};

/**
 * Delete vehicle mutation
 */
export const useDeleteVehicleMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/vehicles/${id}`);
      return id;
    },
    onSuccess: () => {
      // Invalidate vehicles list to refetch
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
      toast({
        title: "Başarılı",
        description: "Araç başarıyla silindi.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Araç silinemedi.",
        variant: "destructive",
      });
    },
  });
};


