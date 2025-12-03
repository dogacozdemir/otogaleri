import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Search, Edit, Trash2, 
  Calculator, CheckCircle, XCircle, Image as ImageIcon, FileDown, BarChart3, List, Grid3x3, Eye,
  FileText, Upload
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import VehicleImageUpload from "@/components/VehicleImageUpload";

type Vehicle = {
  id: number;
  maker: string | null;
  model: string | null;
  year: number | null;
  transmission: string | null;
  door_seat: string | null;
  chassis_no: string | null;
  plate_number: string | null;
  km: number | null;
  month: number | null;
  fuel: string | null;
  grade: string | null;
  cc: number | null;
  color: string | null;
  other: string | null;
  sale_price: number | null;
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
};

type VehicleCost = {
  id: number;
  cost_name: string;
  amount: number;
  date: string;
  currency?: string;
  category?: string;
  cost_date?: string;
};

type CostCalculation = {
  vehicle: {
    id: number;
    maker: string | null;
    model: string | null;
    sale_price: number | null;
  };
  costItems: Array<{ name: string; amount: number }>;
  customItems: Array<{ name: string; amount: number }>;
  generalTotal: number;
  salePrice: number;
  profit: number;
  profitMargin?: number;
  roi?: number;
  targetProfit?: number | null;
  profitVsTarget?: number | null;
};

import { useCurrency } from "@/hooks/useCurrency";

const VehiclesPage = () => {
  const { formatCurrency: currency } = useCurrency();
  const location = useLocation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [isSoldFilter, setIsSoldFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table');

  // Modal states
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [openCost, setOpenCost] = useState(false);
  const [openEditCost, setOpenEditCost] = useState(false);
  const [openCalculate, setOpenCalculate] = useState(false);
  const [openSell, setOpenSell] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicleCosts, setVehicleCosts] = useState<VehicleCost[]>([]);
  const [costCalculation, setCostCalculation] = useState<CostCalculation | null>(null);
  const [vehicleDocuments, setVehicleDocuments] = useState<any[]>([]);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    document_type: "contract",
    document_name: "",
    expiry_date: "",
    notes: "",
  });
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);

  // Rapor state'leri
  const [brandProfit, setBrandProfit] = useState<any[]>([]);
  const [modelProfit, setModelProfit] = useState<any[]>([]);
  const [topProfitable, setTopProfitable] = useState<any[]>([]);
  const [salesDuration, setSalesDuration] = useState<any>(null);
  const [monthlyComparison, setMonthlyComparison] = useState<any[]>([]);
  const [categoryCosts, setCategoryCosts] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Form states
  const [vehicleForm, setVehicleForm] = useState({
    maker: "",
    model: "",
    year: "",
    transmission: "",
    door_seat: "",
    chassis_no: "",
    plate_number: "",
    km: "",
    month: "",
    fuel: "",
    grade: "",
    cc: "",
    color: "",
    other: "",
    sale_price: "",
    paid: "",
    purchase_currency: "TRY",
    delivery_date: "",
    delivery_time: "",
    status: "used",
    stock_status: "in_stock",
    location: "",
    target_profit: "",
    features: {} as Record<string, boolean>,
    contract_pdf: null as File | null
  });

  const [costForm, setCostForm] = useState({
    cost_name: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    category: "other"
  });
  const [costCategoryFilter, setCostCategoryFilter] = useState<string>("");
  const [editingCost, setEditingCost] = useState<VehicleCost | null>(null);

  const [sellForm, setSellForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    plate_number: "",
    key_count: "",
    sale_price: "",
    sale_date: new Date().toISOString().split('T')[0]
  });

  const { toast } = useToast();

  // Default cost items
  const defaultCostItems = [
    'Alınış fiyatı',
    'Gemi parası',
    'Nakliye',
    'Havale',
    'Temizlik',
    'Gümrük+Gümrük Komisyonu',
    'Kayıt',
    'Servis',
    'Benzin',
    'Plaka',
    'Antrepo',
    'Ortalama masraf',
    'Hızlı kayıt'
  ];

  // Harcama kategorileri
  const costCategories = [
    { value: 'purchase', label: 'Alış' },
    { value: 'shipping', label: 'Nakliye' },
    { value: 'customs', label: 'Gümrük' },
    { value: 'repair', label: 'Tamir' },
    { value: 'insurance', label: 'Sigorta' },
    { value: 'tax', label: 'Vergi' },
    { value: 'other', label: 'Diğer' }
  ];

  useEffect(() => {
    fetchVehicles();
  }, [pagination.page, isSoldFilter, statusFilter, stockStatusFilter, query]);

  // Filtreler değiştiğinde sayfayı sıfırla
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [isSoldFilter, statusFilter, stockStatusFilter]);

  // Search'ten gelen vehicle ID'yi kontrol et
  useEffect(() => {
    const state = location.state as { selectedVehicleId?: number } | null;
    if (state?.selectedVehicleId && vehicles.length > 0) {
      const vehicle = vehicles.find(v => v.id === Number(state.selectedVehicleId));
      if (vehicle) {
        openDetailModal(vehicle);
        // State'i temizle
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, vehicles]);

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
      // Eğer tablo yoksa veya başka bir hata varsa boş liste göster
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

  const fetchVehicleDetail = async (id: number, category?: string) => {
    try {
      const response = await api.get(`/vehicles/${id}`);
      const vehicleData = response.data;
      // Backend'den gelen veri yapısını düzelt
      setSelectedVehicle({
        ...vehicleData,
        sale_info: vehicleData.sale_info || null
      });
      
      // Harcamaları getir (kategori filtresi ile)
      const filterCategory = category !== undefined ? category : costCategoryFilter;
      const costsParams = filterCategory ? `?category=${filterCategory}` : '';
      const costsResponse = await api.get(`/vehicles/${id}/costs${costsParams}`);
      setVehicleCosts(costsResponse.data || []);
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.message || "Araç detayı yüklenemedi.", 
        variant: "destructive" 
      });
    }
  };

  const fetchVehicleDocuments = async (vehicleId: number) => {
    try {
      const response = await api.get(`/documents/vehicles/${vehicleId}`);
      setVehicleDocuments(response.data || []);
    } catch (error) {
      console.error("Vehicle documents fetch error:", error);
    }
  };

  const fetchCostCalculation = async (id: number) => {
    try {
      const response = await api.get(`/vehicles/${id}/calculate-costs`);
      const data = response.data;
      
      // Backend response'unu frontend formatına dönüştür
      const costsArray = Array.isArray(data.costs) ? data.costs : [];
      const costItems = costsArray.map((cost: any) => ({
        name: cost.cost_name || cost.name || 'Harcama',
        amount: cost.amount_base || cost.amount || 0
      }));
      
      const transformedData: CostCalculation = {
        vehicle: data.vehicle || {
          id: id,
          maker: null,
          model: null,
          sale_price: null
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
      
      setCostCalculation(transformedData);
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.message || "Maliyet hesaplanamadı.", 
        variant: "destructive" 
      });
      setCostCalculation(null);
    }
  };

  const resetVehicleForm = () => {
    setVehicleForm({
      maker: "",
      model: "",
      year: "",
      transmission: "",
      door_seat: "",
      chassis_no: "",
      plate_number: "",
      km: "",
      month: "",
      fuel: "",
      grade: "",
      cc: "",
      color: "",
      other: "",
      sale_price: "",
      paid: "",
      purchase_currency: "TRY",
      delivery_date: "",
      delivery_time: "",
      status: "used",
      stock_status: "in_stock",
      location: "",
      target_profit: "",
      features: {},
      contract_pdf: null
    });
  };

  const handleAddVehicle = async () => {
    try {
      const payload: any = {};
      const contractPdf = vehicleForm.contract_pdf;
      
      Object.keys(vehicleForm).forEach(key => {
        const value = vehicleForm[key as keyof typeof vehicleForm];
        if (key === 'contract_pdf') {
          // PDF'i ayrı işleyeceğiz
          return;
        }
        if (key === 'paid') {
          // paid alanını purchase_amount olarak gönder
          if (value) {
            payload.purchase_amount = Number(value);
          }
          return;
        }
        if (key === 'purchase_currency') {
          // purchase_currency'yi ekle
          payload.purchase_currency = value;
          // purchase_date için delivery_date kullan, yoksa bugünün tarihini kullan
          payload.purchase_date = vehicleForm.delivery_date || new Date().toISOString().split('T')[0];
          return;
        }
        if (key === 'features') {
          // Features objesini JSON string'e çevir
          const featuresObj = value as Record<string, boolean>;
          const hasFeatures = Object.values(featuresObj).some(v => v === true);
          if (hasFeatures) {
            payload[key] = featuresObj;
          }
        } else if (value) {
          if (['year', 'km', 'month', 'cc', 'sale_price', 'target_profit'].includes(key)) {
            payload[key] = Number(value);
          } else {
            payload[key] = value;
          }
        }
      });

      // Önce araç oluştur
      const response = await api.post("/vehicles", payload);
      const vehicleId = response.data.id;

      // Eğer PDF varsa yükle
      if (contractPdf) {
        try {
          const formData = new FormData();
          formData.append('contract_pdf', contractPdf);
          await api.post(`/vehicles/${vehicleId}/contract/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        } catch (pdfError: any) {
          console.error('PDF yükleme hatası:', pdfError);
          toast({
            title: "Uyarı",
            description: "Araç eklendi ancak sözleşme PDF'i yüklenemedi. Daha sonra tekrar deneyebilirsiniz.",
            variant: "default"
          });
        }
      }

      toast({ title: "Başarılı", description: "Araç eklendi." });
      setOpenAdd(false);
      resetVehicleForm();
      fetchVehicles();
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.message || "Araç eklenemedi.", 
        variant: "destructive" 
      });
    }
  };

  const handleEditVehicle = async () => {
    if (!selectedVehicle) return;
    try {
      const payload: any = {};
      Object.keys(vehicleForm).forEach(key => {
        const value = vehicleForm[key as keyof typeof vehicleForm];
        if (key === 'paid') {
          // paid alanını purchase_amount olarak gönder
          if (value) {
            payload.purchase_amount = Number(value);
          }
          return;
        }
        if (key === 'purchase_currency') {
          // purchase_currency'yi ekle
          payload.purchase_currency = value;
          // purchase_date için delivery_date kullan, yoksa bugünün tarihini kullan
          payload.purchase_date = vehicleForm.delivery_date || new Date().toISOString().split('T')[0];
          return;
        }
        if (key === 'features') {
          // Features objesini JSON string'e çevir
          const featuresObj = value as Record<string, boolean>;
          const hasFeatures = Object.values(featuresObj).some(v => v === true);
          if (hasFeatures) {
            payload[key] = featuresObj;
          }
        } else if (value) {
          if (['year', 'km', 'month', 'cc', 'sale_price', 'target_profit'].includes(key)) {
            payload[key] = Number(value);
          } else {
            payload[key] = value;
          }
        }
      });

      await api.put(`/vehicles/${selectedVehicle.id}`, payload);
      toast({ title: "Başarılı", description: "Araç güncellendi." });
      setOpenEdit(false);
      resetVehicleForm();
      fetchVehicles();
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.message || "Araç güncellenemedi.", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!confirm("Bu aracı silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/vehicles/${id}`);
      toast({ title: "Silindi", description: "Araç silindi." });
      fetchVehicles();
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.message || "Araç silinemedi.", 
        variant: "destructive" 
      });
    }
  };

  const openDetailModal = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setOpenDetail(true);
    await fetchVehicleDetail(vehicle.id);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    
    // Features'ı parse et
    let featuresObj: Record<string, boolean> = {};
    if (vehicle.features) {
      try {
        featuresObj = typeof vehicle.features === 'string' 
          ? JSON.parse(vehicle.features) 
          : vehicle.features;
      } catch {
        featuresObj = {};
      }
    }

    setVehicleForm({
      maker: vehicle.maker || "",
      model: vehicle.model || "",
      year: vehicle.year?.toString() || "",
      transmission: vehicle.transmission || "",
      door_seat: vehicle.door_seat || "",
      chassis_no: vehicle.chassis_no || "",
      plate_number: vehicle.plate_number || "",
      km: vehicle.km?.toString() || "",
      month: vehicle.month?.toString() || "",
      fuel: vehicle.fuel || "",
      grade: vehicle.grade || "",
      cc: vehicle.cc?.toString() || "",
      color: vehicle.color || "",
      other: vehicle.other || "",
      sale_price: vehicle.sale_price?.toString() || "",
      paid: (vehicle.purchase_amount || vehicle.paid)?.toString() || "",
      purchase_currency: vehicle.purchase_currency || "TRY",
      delivery_date: vehicle.delivery_date || "",
      delivery_time: vehicle.delivery_time || "",
      status: vehicle.status || "used",
      stock_status: vehicle.stock_status || "in_stock",
      location: vehicle.location || "",
      target_profit: vehicle.target_profit?.toString() || "",
      features: featuresObj,
      contract_pdf: null
    });
    setOpenEdit(true);
  };

  const openCostModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setCostForm({
      cost_name: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
      category: "other"
    });
    setOpenCost(true);
  };

  const openCalculateModal = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setOpenCalculate(true);
    await fetchCostCalculation(vehicle.id);
    await fetchVehicleDocuments(vehicle.id);
  };

  const openSellModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setSellForm({
      customer_name: "",
      customer_phone: "",
      customer_address: "",
      plate_number: "",
      key_count: "",
      sale_price: vehicle.sale_price?.toString() || "",
      sale_date: new Date().toISOString().split('T')[0]
    });
    setOpenSell(true);
  };

  const handleAddCost = async () => {
    if (!selectedVehicle || !costForm.cost_name || !costForm.amount || !costForm.date) {
      toast({ 
        title: "Uyarı", 
        description: "Harcama adı, tutarı ve tarihi zorunludur." 
      });
      return;
    }
    try {
      const payload = {
        cost_name: costForm.cost_name,
        amount: Number(costForm.amount),
        cost_date: costForm.date,
        category: costForm.category || "other",
        currency: "TRY" // Default currency, can be made configurable later
      };
      await api.post(`/vehicles/${selectedVehicle.id}/costs`, payload);
      toast({ title: "Başarılı", description: "Harcama eklendi." });
      setOpenCost(false);
      setCostForm({
        cost_name: "",
        amount: "",
        date: new Date().toISOString().split('T')[0],
        category: "other"
      });
      if (openDetail) {
        await fetchVehicleDetail(selectedVehicle.id);
      }
      fetchVehicles();
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.error || e?.response?.data?.message || "Harcama eklenemedi.", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteCost = async (costId: number) => {
    if (!selectedVehicle) return;
    if (!confirm("Bu harcamayı silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/vehicles/${selectedVehicle.id}/costs/${costId}`);
      toast({ title: "Silindi", description: "Harcama silindi." });
      await fetchVehicleDetail(selectedVehicle.id);
      fetchVehicles();
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.message || "Harcama silinemedi.", 
        variant: "destructive" 
      });
    }
  };

  const openEditCostModal = (cost: VehicleCost) => {
    setEditingCost(cost);
    setCostForm({
      cost_name: cost.cost_name,
      amount: cost.amount.toString(),
      date: cost.cost_date || cost.date,
      category: cost.category || "other"
    });
    setOpenEditCost(true);
  };

  const handleUpdateCost = async () => {
    if (!selectedVehicle || !editingCost || !costForm.cost_name || !costForm.amount || !costForm.date) {
      toast({ 
        title: "Uyarı", 
        description: "Harcama adı, tutarı ve tarihi zorunludur." 
      });
      return;
    }
    try {
      const payload = {
        cost_name: costForm.cost_name,
        amount: Number(costForm.amount),
        cost_date: costForm.date,
        category: costForm.category || "other",
        currency: editingCost.currency || "TRY" // Use existing currency or default to TRY
      };
      await api.put(`/vehicles/${selectedVehicle.id}/costs/${editingCost.id}`, payload);
      toast({ title: "Başarılı", description: "Harcama güncellendi." });
      setOpenEditCost(false);
      setEditingCost(null);
      setCostForm({
        cost_name: "",
        amount: "",
        date: new Date().toISOString().split('T')[0],
        category: "other"
      });
      await fetchVehicleDetail(selectedVehicle.id);
      fetchVehicles();
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.error || e?.response?.data?.message || "Harcama güncellenemedi.", 
        variant: "destructive" 
      });
    }
  };

  const handleSell = async () => {
    if (!selectedVehicle || !sellForm.customer_name || !sellForm.sale_date) {
      toast({ 
        title: "Uyarı", 
        description: "Müşteri adı ve satış tarihi zorunludur." 
      });
      return;
    }
    if (!sellForm.sale_price) {
      toast({ 
        title: "Uyarı", 
        description: "Satış fiyatı zorunludur." 
      });
      return;
    }
    try {
      const payload: any = {
        customer_name: sellForm.customer_name,
        sale_date: sellForm.sale_date,
        sale_amount: Number(sellForm.sale_price)
      };
      if (sellForm.customer_phone) payload.customer_phone = sellForm.customer_phone;
      if (sellForm.customer_address) payload.customer_address = sellForm.customer_address;
      if (sellForm.plate_number) payload.plate_number = sellForm.plate_number;
      if (sellForm.key_count) payload.key_count = Number(sellForm.key_count);

      await api.post(`/vehicles/${selectedVehicle.id}/sell`, payload);
      toast({ title: "Başarılı", description: "Araç satıldı olarak işaretlendi." });
      setOpenSell(false);
      fetchVehicles();
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.error || e?.response?.data?.message || "Satış işlemi gerçekleştirilemedi.", 
        variant: "destructive" 
      });
    }
  };

  const filteredVehicles = useMemo(() => {
    return vehicles;
  }, [vehicles, query]);

  // Rapor verilerini yükle
  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const [brandRes, modelRes, topRes, durationRes, monthlyRes, categoryRes] = await Promise.all([
        api.get('/vehicles/analytics/brand-profit?limit=10'),
        api.get('/vehicles/analytics/model-profit?limit=10'),
        api.get('/vehicles/analytics/top-profitable?limit=10'),
        api.get('/vehicles/analytics/sales-duration'),
        api.get('/vehicles/analytics/monthly-comparison?months=12'),
        api.get('/vehicles/analytics/category-costs')
      ]);
      setBrandProfit(brandRes.data || []);
      setModelProfit(modelRes.data || []);
      setTopProfitable(topRes.data || []);
      setSalesDuration(durationRes.data || null);
      setMonthlyComparison(monthlyRes.data || []);
      setCategoryCosts(categoryRes.data || []);
    } catch (e: any) {
      console.error('Rapor yükleme hatası:', e);
      toast({
        title: "Hata",
        description: "Raporlar yüklenemedi.",
        variant: "destructive"
      });
    } finally {
      setReportsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Tabs defaultValue="vehicles" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="vehicles">Araçlar</TabsTrigger>
          <TabsTrigger value="reports" onClick={fetchReports}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Raporlar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Oto Galeri</h1>
          <p className="text-muted-foreground mt-2">Araç yönetimi ve satış takibi</p>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button onClick={resetVehicleForm}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Araç Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Araç Ekle</DialogTitle>
              <DialogDescription>
                Tüm alanlar opsiyoneldir, istediğiniz bilgileri girebilirsiniz.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium">Marka</label>
                <Input
                  value={vehicleForm.maker}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, maker: e.target.value })}
                  placeholder="Örn: Toyota"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Model</label>
                <Input
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                  placeholder="Örn: Corolla"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Yıl</label>
                <Input
                  type="number"
                  value={vehicleForm.year}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                  placeholder="Örn: 2023"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Vites</label>
                <Input
                  value={vehicleForm.transmission}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, transmission: e.target.value })}
                  placeholder="Örn: Otomatik"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kapı/Koltuk</label>
                <Input
                  value={vehicleForm.door_seat}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, door_seat: e.target.value })}
                  placeholder="Örn: 5/5"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Şasi No</label>
                <Input
                  value={vehicleForm.chassis_no}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, chassis_no: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Plaka</label>
                <Input
                  value={vehicleForm.plate_number}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })}
                  placeholder="Örn: 34ABC123"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Km</label>
                <Input
                  type="number"
                  value={vehicleForm.km}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, km: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Ay</label>
                <Input
                  type="number"
                  value={vehicleForm.month}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, month: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Yakıt</label>
                <Input
                  value={vehicleForm.fuel}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, fuel: e.target.value })}
                  placeholder="Örn: Benzin"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Sınıf</label>
                <Input
                  value={vehicleForm.grade}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, grade: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">CC</label>
                <Input
                  type="number"
                  value={vehicleForm.cc}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, cc: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Renk</label>
                <Input
                  value={vehicleForm.color}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Diğer</label>
                <Input
                  value={vehicleForm.other}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, other: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Önerilen Satış Fiyatı</label>
                <Input
                  type="number"
                  step="0.01"
                  value={vehicleForm.sale_price}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, sale_price: e.target.value })}
                  placeholder="Önerilen satış fiyatı (opsiyonel)"
                />
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Ödenen</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={vehicleForm.paid}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, paid: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Döviz</label>
                  <Select
                    value={vehicleForm.purchase_currency}
                    onValueChange={(value) => setVehicleForm({ ...vehicleForm, purchase_currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Döviz seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRY">TRY</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Teslimat Tarihi</label>
                <Input
                  type="date"
                  value={vehicleForm.delivery_date}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, delivery_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Teslimat Saati</label>
                <Input
                  type="time"
                  value={vehicleForm.delivery_time}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, delivery_time: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Araç Durumu</label>
                <Select
                  value={vehicleForm.status || "used"}
                  onValueChange={(value) => setVehicleForm({ ...vehicleForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Araç durumu seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Sıfır</SelectItem>
                    <SelectItem value="used">İkinci El</SelectItem>
                    <SelectItem value="damaged">Hasarlı</SelectItem>
                    <SelectItem value="repaired">Onarılmış</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Stok Durumu</label>
                <Select
                  value={vehicleForm.stock_status || "in_stock"}
                  onValueChange={(value) => setVehicleForm({ ...vehicleForm, stock_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Stok durumu seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">Stokta</SelectItem>
                    <SelectItem value="on_sale">Satışta</SelectItem>
                    <SelectItem value="reserved">Rezerve</SelectItem>
                    <SelectItem value="sold">Satıldı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Lokasyon</label>
                <Input
                  value={vehicleForm.location}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, location: e.target.value })}
                  placeholder="Örn: Şube A, Park Yeri 5"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Hedef Kar (Opsiyonel)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={vehicleForm.target_profit}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, target_profit: e.target.value })}
                  placeholder="Hedef kar tutarı"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Sözleşme PDF (Opsiyonel)</label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Önce araç oluştur, sonra PDF yükle
                      // Bu işlem handleAddVehicle içinde yapılacak
                      setVehicleForm({ ...vehicleForm, contract_pdf: file });
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">Araç eklenirken sözleşme PDF'i yüklenecektir</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAdd(false)}>İptal</Button>
              <Button onClick={handleAddVehicle}>Ekle</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Araç ara (marka, model, şasi no)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={isSoldFilter || "all"} onValueChange={(value) => setIsSoldFilter(value === "all" ? "" : value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Satış Durumu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="false">Satılmamış</SelectItem>
            <SelectItem value="true">Satılmış</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Araç Durumu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="new">Sıfır</SelectItem>
            <SelectItem value="used">İkinci El</SelectItem>
            <SelectItem value="damaged">Hasarlı</SelectItem>
            <SelectItem value="repaired">Onarılmış</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stockStatusFilter || "all"} onValueChange={(value) => setStockStatusFilter(value === "all" ? "" : value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Stok Durumu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="in_stock">Stokta</SelectItem>
            <SelectItem value="on_sale">Satışta</SelectItem>
            <SelectItem value="reserved">Rezerve</SelectItem>
            <SelectItem value="sold">Satıldı</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vehicles Table/List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Araç Listesi</CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Grid3x3 className={`h-4 w-4 ${viewMode === 'list' ? 'text-primary' : 'text-muted-foreground'}`} />
                <Switch
                  checked={viewMode === 'list'}
                  onCheckedChange={(checked) => setViewMode(checked ? 'list' : 'table')}
                />
                <List className={`h-4 w-4 ${viewMode === 'table' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marka/Model</TableHead>
                <TableHead>Yıl</TableHead>
                <TableHead>Şasi No</TableHead>
                <TableHead>Satış Fiyatı</TableHead>
                <TableHead>Toplam Maliyet</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Yükleniyor...</TableCell>
                </TableRow>
              ) : filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Araç bulunamadı.</TableCell>
                </TableRow>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {vehicle.primary_image_url ? (
                          <img
                            src={vehicle.primary_image_url.startsWith('http') 
                              ? vehicle.primary_image_url 
                              : vehicle.primary_image_url.startsWith('/uploads')
                              ? `http://localhost:5005${vehicle.primary_image_url}`
                              : vehicle.primary_image_url}
                            alt={`${vehicle.maker} ${vehicle.model}`}
                            className="w-16 h-16 object-cover rounded"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">
                            {vehicle.maker || "-"} {vehicle.model || ""}
                          </div>
                          {vehicle.chassis_no && (
                            <div className="text-sm text-muted-foreground">
                              {vehicle.chassis_no}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{vehicle.year || "-"}</TableCell>
                    <TableCell>{vehicle.chassis_no || "-"}</TableCell>
                    <TableCell>{currency(vehicle.sale_price)}</TableCell>
                    <TableCell>{currency(vehicle.total_costs)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {vehicle.is_sold ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Satıldı
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Satılmadı
                          </Badge>
                        )}
                        {vehicle.stock_status && (
                          <Badge 
                            variant="outline" 
                            className={
                              vehicle.stock_status === 'sold' ? 'bg-green-100 text-green-800' :
                              vehicle.stock_status === 'on_sale' ? 'bg-blue-100 text-blue-800' :
                              vehicle.stock_status === 'reserved' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {vehicle.stock_status === 'in_stock' ? 'Stokta' :
                             vehicle.stock_status === 'on_sale' ? 'Satışta' :
                             vehicle.stock_status === 'reserved' ? 'Rezerve' :
                             vehicle.stock_status === 'sold' ? 'Satıldı' : vehicle.stock_status}
                          </Badge>
                        )}
                        {vehicle.location && (
                          <span className="text-xs text-muted-foreground">{vehicle.location}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailModal(vehicle)}
                          title="Detay"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!vehicle.is_sold && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(vehicle)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openSellModal(vehicle)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-full text-center py-12">Yükleniyor...</div>
              ) : filteredVehicles.length === 0 ? (
                <div className="col-span-full text-center py-12">Araç bulunamadı.</div>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <Card key={vehicle.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative">
                      {vehicle.primary_image_url ? (
                        <img
                          src={vehicle.primary_image_url.startsWith('http') 
                            ? vehicle.primary_image_url 
                            : vehicle.primary_image_url.startsWith('/uploads')
                            ? `http://localhost:5005${vehicle.primary_image_url}`
                            : vehicle.primary_image_url}
                          alt={`${vehicle.maker} ${vehicle.model}`}
                          className="w-full h-48 object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-48 bg-muted flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        {vehicle.is_sold ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Satıldı
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Satılmadı
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {vehicle.maker || "-"} {vehicle.model || ""}
                          </h3>
                          {vehicle.year && (
                            <p className="text-sm text-muted-foreground">{vehicle.year}</p>
                          )}
                        </div>
                        {vehicle.chassis_no && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Şasi No: </span>
                            <span className="font-medium">{vehicle.chassis_no}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Satış Fiyatı:</span>
                            <div className="font-semibold">{currency(vehicle.sale_price)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Toplam Maliyet:</span>
                            <div className="font-semibold">{currency(vehicle.total_costs)}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {vehicle.stock_status && (
                            <Badge 
                              variant="outline" 
                              className={
                                vehicle.stock_status === 'sold' ? 'bg-green-100 text-green-800' :
                                vehicle.stock_status === 'on_sale' ? 'bg-blue-100 text-blue-800' :
                                vehicle.stock_status === 'reserved' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }
                            >
                              {vehicle.stock_status === 'in_stock' ? 'Stokta' :
                               vehicle.stock_status === 'on_sale' ? 'Satışta' :
                               vehicle.stock_status === 'reserved' ? 'Rezerve' :
                               vehicle.stock_status === 'sold' ? 'Satıldı' : vehicle.stock_status}
                            </Badge>
                          )}
                          {vehicle.location && (
                            <Badge variant="outline" className="text-xs">
                              📍 {vehicle.location}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetailModal(vehicle)}
                            title="Detay"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!vehicle.is_sold && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(vehicle)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openSellModal(vehicle)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVehicle(vehicle.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal - Bu modal araç detaylarını, harcamaları ve maliyet hesaplamayı gösterir */}
      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="max-w-4xl h-[70vh] p-0 flex flex-col">
          {selectedVehicle && (
            <Tabs defaultValue="info" className="w-full flex flex-col flex-1 min-h-0">
              <div className="px-6 pt-6 pb-0 flex-shrink-0">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="info">Bilgiler</TabsTrigger>
                  <TabsTrigger value="images">Fotoğraflar</TabsTrigger>
                  <TabsTrigger value="documents">Belgeler</TabsTrigger>
                  <TabsTrigger value="costs">Harcamalar</TabsTrigger>
                  <TabsTrigger value="calculate">Maliyet Hesaplama</TabsTrigger>
                </TabsList>
              </div>
              <div className="px-6 pb-6 flex-1 overflow-y-auto min-h-0">
              
              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><strong>Marka:</strong> {selectedVehicle.maker || "-"}</div>
                  <div><strong>Model:</strong> {selectedVehicle.model || "-"}</div>
                  <div><strong>Yıl:</strong> {selectedVehicle.year || "-"}</div>
                  <div><strong>Vites:</strong> {selectedVehicle.transmission || "-"}</div>
                  <div><strong>Kapı/Koltuk:</strong> {selectedVehicle.door_seat || "-"}</div>
                  <div><strong>Şasi No:</strong> {selectedVehicle.chassis_no || "-"}</div>
                  <div><strong>Plaka:</strong> {selectedVehicle.plate_number || "-"}</div>
                  <div><strong>Km:</strong> {selectedVehicle.km || "-"}</div>
                  <div><strong>Ay:</strong> {selectedVehicle.month || "-"}</div>
                  <div><strong>Yakıt:</strong> {selectedVehicle.fuel || "-"}</div>
                  <div><strong>Sınıf:</strong> {selectedVehicle.grade || "-"}</div>
                  <div><strong>CC:</strong> {selectedVehicle.cc || "-"}</div>
                  <div><strong>Renk:</strong> {selectedVehicle.color || "-"}</div>
                  <div><strong>Önerilen Satış Fiyatı:</strong> {currency(selectedVehicle.sale_price)}</div>
                  <div><strong>Ödenen:</strong> {currency(selectedVehicle.paid)}</div>
                  <div><strong>Teslimat Tarihi:</strong> {selectedVehicle.delivery_date || "-"}</div>
                  <div><strong>Teslimat Saati:</strong> {selectedVehicle.delivery_time || "-"}</div>
                  {selectedVehicle.other && (
                    <div className="col-span-2"><strong>Diğer:</strong> {selectedVehicle.other}</div>
                  )}
                </div>
                {selectedVehicle.sale_info && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">Satış Bilgileri</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await api.get(`/vehicles/${selectedVehicle.id}/invoice`, {
                                responseType: 'blob'
                              });
                              const url = window.URL.createObjectURL(new Blob([response.data]));
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', `arac-satis-faturasi-${selectedVehicle.id}.pdf`);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              window.URL.revokeObjectURL(url);
                              toast({ title: "Başarılı", description: "Fatura indirildi." });
                            } catch (e: any) {
                              toast({
                                title: "Hata",
                                description: e?.response?.data?.message || "Fatura indirilemedi.",
                                variant: "destructive"
                              });
                            }
                          }}
                        >
                          <FileDown className="h-4 w-4 mr-2" />
                          Fatura İndir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await api.get(`/vehicles/${selectedVehicle.id}/contract`, {
                                responseType: 'blob'
                              });
                              const url = window.URL.createObjectURL(new Blob([response.data]));
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', `arac-satis-sozlesmesi-${selectedVehicle.id}.pdf`);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              window.URL.revokeObjectURL(url);
                              toast({ title: "Başarılı", description: "Sözleşme indirildi." });
                            } catch (e: any) {
                              toast({
                                title: "Hata",
                                description: e?.response?.data?.message || "Sözleşme indirilemedi.",
                                variant: "destructive"
                              });
                            }
                          }}
                        >
                          <FileDown className="h-4 w-4 mr-2" />
                          Sözleşme İndir
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><strong>Müşteri:</strong> {selectedVehicle.sale_info.customer_name}</div>
                      <div><strong>Telefon:</strong> {selectedVehicle.sale_info.customer_phone || "-"}</div>
                      <div><strong>Adres:</strong> {selectedVehicle.sale_info.customer_address || "-"}</div>
                      <div><strong>Plaka:</strong> {selectedVehicle.sale_info.plate_number || "-"}</div>
                      <div><strong>Anahtar Sayısı:</strong> {selectedVehicle.sale_info.key_count || "-"}</div>
                      <div><strong>Satış Tarihi:</strong> {selectedVehicle.sale_info.sale_date}</div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="images" className="space-y-4 mt-4">
                <VehicleImageUpload 
                  vehicleId={selectedVehicle.id} 
                  onUpdate={() => {
                    fetchVehicleDetail(selectedVehicle.id);
                    fetchVehicles();
                  }}
                />
              </TabsContent>

              <TabsContent value="documents" className="space-y-4 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Araç Belgeleri</h3>
                  <Button onClick={() => setShowDocumentDialog(true)} size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Belge Yükle
                  </Button>
                </div>
                {vehicleDocuments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicleDocuments.map((doc) => (
                      <Card key={doc.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-5 h-5 text-primary" />
                              <h4 className="font-semibold">{doc.document_name}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {doc.document_type === "contract"
                                ? "Sözleşme"
                                : doc.document_type === "registration"
                                ? "Ruhsat"
                                : doc.document_type === "insurance"
                                ? "Sigorta"
                                : doc.document_type === "inspection"
                                ? "Muayene"
                                : doc.document_type === "customs"
                                ? "Gümrük"
                                : doc.document_type === "invoice"
                                ? "Fatura"
                                : "Diğer"}
                            </p>
                            {doc.expiry_date && (
                              <p className="text-xs text-muted-foreground">
                                Son Geçerlilik: {new Date(doc.expiry_date).toLocaleDateString("tr-TR")}
                              </p>
                            )}
                            {doc.notes && (
                              <p className="text-sm mt-2 text-muted-foreground">{doc.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`http://localhost:5005${doc.file_path}`, "_blank")}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (confirm("Bu belgeyi silmek istediğinize emin misiniz?")) {
                                  try {
                                    await api.delete(`/documents/vehicles/${doc.id}`);
                                    await fetchVehicleDocuments(selectedVehicle!.id);
                                    toast({ title: "Başarılı", description: "Belge silindi" });
                                  } catch (error: any) {
                                    toast({
                                      title: "Hata",
                                      description: error?.response?.data?.error || "Belge silinemedi",
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Henüz belge yüklenmemiş</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="costs" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Harcamalar</h3>
                  <div className="flex gap-2">
                    <Select value={costCategoryFilter || "all"} onValueChange={(value) => {
                      const filterValue = value === "all" ? "" : value;
                      setCostCategoryFilter(filterValue);
                      if (selectedVehicle) {
                        fetchVehicleDetail(selectedVehicle.id, filterValue);
                      }
                    }}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Kategori Filtrele" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        {costCategories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => openCostModal(selectedVehicle)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Harcama Ekle
                    </Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Harcama Adı</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Tutar</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead>İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicleCosts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">Harcama bulunamadı.</TableCell>
                      </TableRow>
                    ) : (
                      vehicleCosts.map((cost) => {
                        const category = (cost as any).category || 'other';
                        const categoryLabel = costCategories.find(c => c.value === category)?.label || 'Diğer';
                        return (
                        <TableRow key={cost.id}>
                          <TableCell>{cost.cost_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{categoryLabel}</Badge>
                          </TableCell>
                          <TableCell>{currency(cost.amount)}</TableCell>
                          <TableCell>{cost.date}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditCostModal(cost)}
                                title="Düzenle"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCost(cost.id)}
                                title="Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="calculate" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Maliyet Hesaplama</h3>
                  <Button onClick={() => fetchCostCalculation(selectedVehicle.id)}>
                    <Calculator className="h-4 w-4 mr-2" />
                    Hesapla
                  </Button>
                </div>
                {costCalculation && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Önceden Tanımlı Kalemler</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {costCalculation.costItems && Array.isArray(costCalculation.costItems) ? (
                              costCalculation.costItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <span>{item.name}:</span>
                                  <span className="font-semibold">{currency(item.amount)}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-muted-foreground">Önceden tanımlı kalem yok</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Özel Kalemler</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {costCalculation.customItems && Array.isArray(costCalculation.customItems) && costCalculation.customItems.length > 0 ? (
                            <div className="space-y-2">
                              {costCalculation.customItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <span>{item.name}:</span>
                                  <span className="font-semibold">{currency(item.amount)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">Özel kalem yok</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    <Card className="bg-primary/10">
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex justify-between text-lg">
                            <span>Genel Toplam:</span>
                            <span className="font-bold">{currency(costCalculation.generalTotal)}</span>
                          </div>
                          <div className="flex justify-between text-lg">
                            <span>Satış Fiyatı:</span>
                            <span className="font-bold">{currency(costCalculation.salePrice)}</span>
                          </div>
                          <div className="flex justify-between text-xl border-t pt-2">
                            <span>Kar:</span>
                            <span className={`font-bold ${costCalculation.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {currency(costCalculation.profit)}
                            </span>
                          </div>
                          {costCalculation.profitMargin !== undefined && (
                            <div className="flex justify-between text-lg border-t pt-2">
                              <span>Kar Marjı:</span>
                              <span className={`font-semibold ${costCalculation.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {costCalculation.profitMargin.toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {costCalculation.roi !== undefined && (
                            <div className="flex justify-between text-lg">
                              <span>ROI (Yatırım Getirisi):</span>
                              <span className={`font-semibold ${costCalculation.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {costCalculation.roi.toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {costCalculation.targetProfit !== null && costCalculation.targetProfit !== undefined && (
                            <>
                              <div className="flex justify-between text-lg border-t pt-2">
                                <span>Hedef Kar:</span>
                                <span className="font-semibold text-blue-600">
                                  {currency(costCalculation.targetProfit)}
                                </span>
                              </div>
                              {costCalculation.profitVsTarget !== null && costCalculation.profitVsTarget !== undefined && (
                                <div className="flex justify-between text-lg">
                                  <span>Hedef vs Gerçek:</span>
                                  <span className={`font-semibold ${costCalculation.profitVsTarget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {costCalculation.profitVsTarget >= 0 ? '+' : ''}{currency(costCalculation.profitVsTarget)}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Araç Düzenle</DialogTitle>
            <DialogDescription>
              Tüm alanlar opsiyoneldir, istediğiniz bilgileri güncelleyebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium">Marka</label>
              <Input
                value={vehicleForm.maker}
                onChange={(e) => setVehicleForm({ ...vehicleForm, maker: e.target.value })}
                placeholder="Örn: Toyota"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Model</label>
              <Input
                value={vehicleForm.model}
                onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                placeholder="Örn: Corolla"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Yıl</label>
              <Input
                type="number"
                value={vehicleForm.year}
                onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                placeholder="Örn: 2023"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Vites</label>
              <Input
                value={vehicleForm.transmission}
                onChange={(e) => setVehicleForm({ ...vehicleForm, transmission: e.target.value })}
                placeholder="Örn: Otomatik"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Kapı/Koltuk</label>
              <Input
                value={vehicleForm.door_seat}
                onChange={(e) => setVehicleForm({ ...vehicleForm, door_seat: e.target.value })}
                placeholder="Örn: 5/5"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Şasi No</label>
              <Input
                value={vehicleForm.chassis_no}
                onChange={(e) => setVehicleForm({ ...vehicleForm, chassis_no: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Plaka</label>
              <Input
                value={vehicleForm.plate_number}
                onChange={(e) => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })}
                placeholder="Örn: 34ABC123"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Km</label>
              <Input
                type="number"
                value={vehicleForm.km}
                onChange={(e) => setVehicleForm({ ...vehicleForm, km: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Ay</label>
              <Input
                type="number"
                value={vehicleForm.month}
                onChange={(e) => setVehicleForm({ ...vehicleForm, month: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Yakıt</label>
              <Input
                value={vehicleForm.fuel}
                onChange={(e) => setVehicleForm({ ...vehicleForm, fuel: e.target.value })}
                placeholder="Örn: Benzin"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Sınıf</label>
              <Input
                value={vehicleForm.grade}
                onChange={(e) => setVehicleForm({ ...vehicleForm, grade: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">CC</label>
              <Input
                type="number"
                value={vehicleForm.cc}
                onChange={(e) => setVehicleForm({ ...vehicleForm, cc: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Renk</label>
              <Input
                value={vehicleForm.color}
                onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Diğer</label>
              <Input
                value={vehicleForm.other}
                onChange={(e) => setVehicleForm({ ...vehicleForm, other: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Önerilen Satış Fiyatı</label>
              <Input
                type="number"
                step="0.01"
                value={vehicleForm.sale_price}
                onChange={(e) => setVehicleForm({ ...vehicleForm, sale_price: e.target.value })}
                placeholder="Önerilen satış fiyatı (opsiyonel)"
              />
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Ödenen</label>
                <Input
                  type="number"
                  step="0.01"
                  value={vehicleForm.paid}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, paid: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Döviz</label>
                <Select
                  value={vehicleForm.purchase_currency}
                  onValueChange={(value) => setVehicleForm({ ...vehicleForm, purchase_currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Döviz seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Teslimat Tarihi</label>
              <Input
                type="date"
                value={vehicleForm.delivery_date}
                onChange={(e) => setVehicleForm({ ...vehicleForm, delivery_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Teslimat Saati</label>
              <Input
                type="time"
                value={vehicleForm.delivery_time}
                onChange={(e) => setVehicleForm({ ...vehicleForm, delivery_time: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Araç Durumu</label>
              <Select
                value={vehicleForm.status || "used"}
                onValueChange={(value) => setVehicleForm({ ...vehicleForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Araç durumu seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Sıfır</SelectItem>
                  <SelectItem value="used">İkinci El</SelectItem>
                  <SelectItem value="damaged">Hasarlı</SelectItem>
                  <SelectItem value="repaired">Onarılmış</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Stok Durumu</label>
              <Select
                value={vehicleForm.stock_status || "in_stock"}
                onValueChange={(value) => setVehicleForm({ ...vehicleForm, stock_status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Stok durumu seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">Stokta</SelectItem>
                  <SelectItem value="on_sale">Satışta</SelectItem>
                  <SelectItem value="reserved">Rezerve</SelectItem>
                  <SelectItem value="sold">Satıldı</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Lokasyon</label>
              <Input
                value={vehicleForm.location}
                onChange={(e) => setVehicleForm({ ...vehicleForm, location: e.target.value })}
                placeholder="Örn: Şube A, Park Yeri 5"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Hedef Kar (Opsiyonel)</label>
              <Input
                type="number"
                step="0.01"
                value={vehicleForm.target_profit}
                onChange={(e) => setVehicleForm({ ...vehicleForm, target_profit: e.target.value })}
                placeholder="Hedef kar tutarı"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)}>İptal</Button>
            <Button onClick={handleEditVehicle}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cost Modal - Add */}
      <Dialog open={openCost} onOpenChange={setOpenCost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Harcama Ekle</DialogTitle>
            <DialogDescription>
              Araç için yeni bir harcama ekleyin. Tüm alanlar zorunludur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Harcama Adı *</label>
              <Select
                value={costForm.cost_name && defaultCostItems.includes(costForm.cost_name) ? costForm.cost_name : ""}
                onValueChange={(value) => setCostForm({ ...costForm, cost_name: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Harcama seçin veya yeni ekleyin" />
                </SelectTrigger>
                <SelectContent>
                  {defaultCostItems.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                placeholder="Veya yeni harcama adı yazın"
                value={costForm.cost_name}
                onChange={(e) => setCostForm({ ...costForm, cost_name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tutar *</label>
              <Input
                type="number"
                step="0.01"
                value={costForm.amount}
                onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tarih</label>
              <Input
                type="date"
                value={costForm.date}
                onChange={(e) => setCostForm({ ...costForm, date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Kategori</label>
              <Select
                value={costForm.category || "other"}
                onValueChange={(value) => setCostForm({ ...costForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {costCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCost(false)}>İptal</Button>
            <Button onClick={handleAddCost}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cost Modal - Edit */}
      <Dialog open={openEditCost} onOpenChange={setOpenEditCost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Harcama Düzenle</DialogTitle>
            <DialogDescription>
              Harcama bilgilerini güncelleyin. Tüm alanlar zorunludur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Harcama Adı *</label>
              <Select
                value={costForm.cost_name && defaultCostItems.includes(costForm.cost_name) ? costForm.cost_name : ""}
                onValueChange={(value) => setCostForm({ ...costForm, cost_name: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Harcama seçin veya yeni ekleyin" />
                </SelectTrigger>
                <SelectContent>
                  {defaultCostItems.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                placeholder="Veya yeni harcama adı yazın"
                value={costForm.cost_name}
                onChange={(e) => setCostForm({ ...costForm, cost_name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tutar *</label>
              <Input
                type="number"
                step="0.01"
                value={costForm.amount}
                onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tarih</label>
              <Input
                type="date"
                value={costForm.date}
                onChange={(e) => setCostForm({ ...costForm, date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Kategori</label>
              <Select
                value={costForm.category || "other"}
                onValueChange={(value) => setCostForm({ ...costForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {costCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setOpenEditCost(false);
              setEditingCost(null);
              setCostForm({
                cost_name: "",
                amount: "",
                date: new Date().toISOString().split('T')[0],
                category: "other"
              });
            }}>İptal</Button>
            <Button onClick={handleUpdateCost}>Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sell Modal */}
      <Dialog open={openSell} onOpenChange={setOpenSell}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Araç Satışı</DialogTitle>
            <DialogDescription>
              Araç satış bilgilerini girin. Müşteri adı ve satış tarihi zorunludur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Müşteri Adı Soyadı *</label>
              <Input
                value={sellForm.customer_name}
                onChange={(e) => setSellForm({ ...sellForm, customer_name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Müşteri Telefon</label>
              <Input
                value={sellForm.customer_phone}
                onChange={(e) => setSellForm({ ...sellForm, customer_phone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Müşteri Adres</label>
              <Input
                value={sellForm.customer_address}
                onChange={(e) => setSellForm({ ...sellForm, customer_address: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Araç Plaka</label>
              <Input
                value={sellForm.plate_number}
                onChange={(e) => setSellForm({ ...sellForm, plate_number: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Anahtar Sayısı</label>
              <Input
                type="number"
                value={sellForm.key_count}
                onChange={(e) => setSellForm({ ...sellForm, key_count: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Satış Fiyatı</label>
              <Input
                type="number"
                step="0.01"
                value={sellForm.sale_price}
                onChange={(e) => setSellForm({ ...sellForm, sale_price: e.target.value })}
                placeholder="Satış fiyatını girin"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Satış Tarihi *</label>
              <Input
                type="date"
                value={sellForm.sale_date}
                onChange={(e) => setSellForm({ ...sellForm, sale_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSell(false)}>İptal</Button>
            <Button onClick={handleSell}>Satıldı Olarak İşaretle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Upload Dialog */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Belge Yükle</DialogTitle>
            <DialogDescription>Araç belgesi yükleyin (Sözleşme, Ruhsat, Sigorta, vb.)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Belge Türü *</label>
              <Select
                value={documentForm.document_type}
                onValueChange={(value) => setDocumentForm({ ...documentForm, document_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Sözleşme</SelectItem>
                  <SelectItem value="registration">Ruhsat</SelectItem>
                  <SelectItem value="insurance">Sigorta</SelectItem>
                  <SelectItem value="inspection">Muayene</SelectItem>
                  <SelectItem value="customs">Gümrük</SelectItem>
                  <SelectItem value="invoice">Fatura</SelectItem>
                  <SelectItem value="other">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Belge Adı *</label>
              <Input
                value={documentForm.document_name}
                onChange={(e) => setDocumentForm({ ...documentForm, document_name: e.target.value })}
                placeholder="Örn: Satış Sözleşmesi"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Dosya *</label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setSelectedDocumentFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                {selectedDocumentFile && (
                  <span className="text-sm text-muted-foreground">{selectedDocumentFile.name}</span>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Son Geçerlilik Tarihi</label>
              <Input
                type="date"
                value={documentForm.expiry_date}
                onChange={(e) => setDocumentForm({ ...documentForm, expiry_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notlar</label>
              <Input
                value={documentForm.notes}
                onChange={(e) => setDocumentForm({ ...documentForm, notes: e.target.value })}
                placeholder="Belge hakkında notlar"
              />
            </div>
            <div className="flex space-x-3 pt-4 border-t">
              <Button
                onClick={async () => {
                  if (!documentForm.document_name || !selectedDocumentFile || !selectedVehicle) {
                    toast({
                      title: "Uyarı",
                      description: "Belge adı, dosya ve araç seçimi zorunludur",
                      variant: "destructive",
                    });
                    return;
                  }
                  try {
                    const formData = new FormData();
                    formData.append("file", selectedDocumentFile);
                    formData.append("document_type", documentForm.document_type);
                    formData.append("document_name", documentForm.document_name);
                    if (documentForm.expiry_date) formData.append("expiry_date", documentForm.expiry_date);
                    if (documentForm.notes) formData.append("notes", documentForm.notes);

                    await api.post(`/documents/vehicles/${selectedVehicle.id}`, formData, {
                      headers: { "Content-Type": "multipart/form-data" },
                    });
                    toast({ title: "Başarılı", description: "Belge yüklendi" });
                    setShowDocumentDialog(false);
                    setDocumentForm({
                      document_type: "contract",
                      document_name: "",
                      expiry_date: "",
                      notes: "",
                    });
                    setSelectedDocumentFile(null);
                    await fetchVehicleDocuments(selectedVehicle.id);
                  } catch (error: any) {
                    toast({
                      title: "Hata",
                      description: error?.response?.data?.error || "Belge yüklenemedi",
                      variant: "destructive",
                    });
                  }
                }}
                className="flex-1"
              >
                Yükle
              </Button>
              <Button variant="outline" onClick={() => setShowDocumentDialog(false)} className="flex-1">
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {reportsLoading ? (
            <div className="text-center py-12">Raporlar yükleniyor...</div>
          ) : (
            <>
              {/* Ortalama Satış Süresi */}
              {salesDuration && (
                <Card>
                  <CardHeader>
                    <CardTitle>Ortalama Satış Süresi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold">{salesDuration.avg_days ? Math.round(salesDuration.avg_days) : 0}</div>
                        <div className="text-sm text-muted-foreground">Ortalama Gün</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold">{salesDuration.min_days || 0}</div>
                        <div className="text-sm text-muted-foreground">En Kısa Süre</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div className="text-2xl font-bold">{salesDuration.max_days || 0}</div>
                        <div className="text-sm text-muted-foreground">En Uzun Süre</div>
                      </div>
                    </div>
                    <div className="mt-4 text-center text-sm text-muted-foreground">
                      Toplam Satış: {salesDuration.total_sales || 0}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Marka Bazlı Kar Analizi */}
              <Card>
                <CardHeader>
                  <CardTitle>Marka Bazlı Kar Analizi</CardTitle>
                </CardHeader>
                <CardContent>
                  {brandProfit.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={brandProfit}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="brand" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => `${parseFloat(value).toFixed(2)} TL`} />
                          <Legend />
                          <Bar dataKey="total_profit" fill="#8884d8" name="Toplam Kar" />
                          <Bar dataKey="total_revenue" fill="#82ca9d" name="Toplam Gelir" />
                        </BarChart>
                      </ResponsiveContainer>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Marka</TableHead>
                            <TableHead>Araç Sayısı</TableHead>
                            <TableHead>Satılan</TableHead>
                            <TableHead>Toplam Gelir</TableHead>
                            <TableHead>Toplam Maliyet</TableHead>
                            <TableHead>Toplam Kar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {brandProfit.map((brand, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{brand.brand || '-'}</TableCell>
                              <TableCell>{brand.vehicle_count}</TableCell>
                              <TableCell>{brand.sold_count}</TableCell>
                              <TableCell>{currency(brand.total_revenue)}</TableCell>
                              <TableCell>{currency(brand.total_costs)}</TableCell>
                              <TableCell className="font-semibold">{currency(brand.total_profit)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">Marka bazlı veri bulunamadı.</div>
                  )}
                </CardContent>
              </Card>

              {/* Model Bazlı Kar Analizi */}
              <Card>
                <CardHeader>
                  <CardTitle>Model Bazlı Kar Analizi</CardTitle>
                </CardHeader>
                <CardContent>
                  {modelProfit.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={modelProfit}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="model" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => `${parseFloat(value).toFixed(2)} TL`} />
                          <Legend />
                          <Bar dataKey="total_profit" fill="#8884d8" name="Toplam Kar" />
                        </BarChart>
                      </ResponsiveContainer>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Marka</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead>Araç Sayısı</TableHead>
                            <TableHead>Satılan</TableHead>
                            <TableHead>Toplam Kar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {modelProfit.map((model, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{model.brand || '-'}</TableCell>
                              <TableCell>{model.model || '-'}</TableCell>
                              <TableCell>{model.vehicle_count}</TableCell>
                              <TableCell>{model.sold_count}</TableCell>
                              <TableCell className="font-semibold">{currency(model.total_profit)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">Model bazlı veri bulunamadı.</div>
                  )}
                </CardContent>
              </Card>

              {/* En Karlı Araçlar */}
              <Card>
                <CardHeader>
                  <CardTitle>En Karlı Araçlar</CardTitle>
                </CardHeader>
                <CardContent>
                  {topProfitable.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Marka/Model</TableHead>
                          <TableHead>Yıl</TableHead>
                          <TableHead>Şasi No</TableHead>
                          <TableHead>Satış Fiyatı</TableHead>
                          <TableHead>Toplam Maliyet</TableHead>
                          <TableHead>Kar</TableHead>
                          <TableHead>Satış Tarihi</TableHead>
                          <TableHead>Müşteri</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topProfitable.map((vehicle) => (
                          <TableRow key={vehicle.id}>
                            <TableCell>{vehicle.maker || '-'} {vehicle.model || ''}</TableCell>
                            <TableCell>{vehicle.year || '-'}</TableCell>
                            <TableCell>{vehicle.chassis_no || '-'}</TableCell>
                            <TableCell>{currency(vehicle.sale_price)}</TableCell>
                            <TableCell>{currency(vehicle.total_costs)}</TableCell>
                            <TableCell className="font-semibold text-green-600">{currency(vehicle.profit)}</TableCell>
                            <TableCell>{vehicle.sale_date ? new Date(vehicle.sale_date).toLocaleDateString('tr-TR') : '-'}</TableCell>
                            <TableCell>{vehicle.customer_name || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">En karlı araç verisi bulunamadı.</div>
                  )}
                </CardContent>
              </Card>

              {/* Aylık Karşılaştırma */}
              <Card>
                <CardHeader>
                  <CardTitle>Aylık Karşılaştırma</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyComparison.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={monthlyComparison}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => `${parseFloat(value).toFixed(2)} TL`} />
                          <Legend />
                          <Line type="monotone" dataKey="total_revenue" stroke="#8884d8" name="Toplam Gelir" />
                          <Line type="monotone" dataKey="total_costs" stroke="#ff7300" name="Toplam Maliyet" />
                          <Line type="monotone" dataKey="total_profit" stroke="#82ca9d" name="Toplam Kar" />
                        </LineChart>
                      </ResponsiveContainer>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ay</TableHead>
                            <TableHead>Satış Sayısı</TableHead>
                            <TableHead>Toplam Gelir</TableHead>
                            <TableHead>Toplam Maliyet</TableHead>
                            <TableHead>Toplam Kar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthlyComparison.map((month, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{month.month}</TableCell>
                              <TableCell>{month.sales_count}</TableCell>
                              <TableCell>{currency(month.total_revenue)}</TableCell>
                              <TableCell>{currency(month.total_costs)}</TableCell>
                              <TableCell className="font-semibold">{currency(month.total_profit)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">Aylık karşılaştırma verisi bulunamadı.</div>
                  )}
                </CardContent>
              </Card>

              {/* Kategori Bazlı Harcama Analizi */}
              <Card>
                <CardHeader>
                  <CardTitle>Kategori Bazlı Harcama Analizi</CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryCosts.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={categoryCosts}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category_name" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => `${parseFloat(value).toFixed(2)} TL`} />
                          <Legend />
                          <Bar dataKey="total_amount" fill="#8884d8" name="Toplam Tutar" />
                        </BarChart>
                      </ResponsiveContainer>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kategori</TableHead>
                            <TableHead>Harcama Sayısı</TableHead>
                            <TableHead>Toplam Tutar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categoryCosts.map((cat, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{cat.category_name || cat.category || '-'}</TableCell>
                              <TableCell>{cat.cost_count || 0}</TableCell>
                              <TableCell className="font-semibold">{currency(cat.total_amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">Kategori bazlı veri bulunamadı.</div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VehiclesPage;

