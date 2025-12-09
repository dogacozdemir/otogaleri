import { useEffect, useState, useMemo } from "react";
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
  Calculator, CheckCircle, XCircle, Image as ImageIcon, FileDown, List, Grid3x3, Eye,
  FileText, Upload, AlertCircle, FileSpreadsheet, MessageSquare
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
import { formatCurrency } from "@/lib/formatters";
import VehicleImageUpload from "@/components/VehicleImageUpload";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useCurrencyRates } from "@/contexts/CurrencyRatesContext";
import { useTenant } from "@/contexts/TenantContext";
import { BulkImportDialog } from "@/components/BulkImportDialog";

type Vehicle = {
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
  costItems: Array<{ name: string; amount: number; currency?: string; amount_base?: number }>;
  customItems: Array<{ name: string; amount: number; currency?: string }>;
  generalTotal: number;
  salePrice: number;
  profit: number;
  profitMargin?: number;
  roi?: number;
  targetProfit?: number | null;
  profitVsTarget?: number | null;
};

import { useCurrency } from "@/hooks/useCurrency";
import { getApiBaseUrl } from "@/lib/utils";

// Tarih formatlama fonksiyonu: 2025-12-04T21:00:00.000Z -> 4/12/2025 21:00
const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Geçersiz tarih ise olduğu gibi döndür
    
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    return dateString; // Hata durumunda orijinal değeri döndür
  }
};

// Sadece tarih formatlama: 2025-12-04T21:00:00.000Z -> 4/12/2025
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return dateString;
  }
};

// Ödenen taksit sayısını hesapla (peşinat hariç, sadece taksit ödemeleri)
const getPaidInstallmentCount = (vehicle: Vehicle): number => {
  if (!vehicle.installment || !vehicle.installment.payments || vehicle.installment.payments.length === 0) {
    return 0;
  }
  
  // Sadece 'installment' tipindeki ödemeleri say (peşinat hariç)
  const installmentPayments = vehicle.installment.payments.filter(
    (p: any) => p.payment_type === 'installment'
  );
  
  return installmentPayments.length;
};

// Taksit gecikmesi kontrolü - son taksit ödemesi 30+ gün geçmişse gün sayısını döner
const getInstallmentOverdueDays = (vehicle: Vehicle): number | null => {
  if (!vehicle.installment || !vehicle.installment.payments || vehicle.installment.payments.length === 0) {
    return null;
  }
  
  // Sadece taksit ödemelerini al (peşinat hariç)
  const installmentPayments = vehicle.installment.payments.filter(
    (p: any) => p.payment_type === 'installment'
  );
  
  if (installmentPayments.length === 0) {
    // Eğer hiç taksit ödemesi yoksa, peşinat tarihini kontrol et
    const downPayment = vehicle.installment.payments.find((p: any) => p.payment_type === 'down_payment');
    if (!downPayment) return null;
    
    const downPaymentDate = new Date(downPayment.payment_date);
    const today = new Date();
    const diffTime = today.getTime() - downPaymentDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Eğer peşinat tarihinden 30+ gün geçtiyse ve hiç taksit ödemesi yoksa, gecikmiş sayılır
    return diffDays >= 30 ? diffDays : null;
  }
  
  // Son taksit ödeme tarihini bul
  const lastInstallmentPayment = installmentPayments
    .map(p => new Date(p.payment_date))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  
  if (!lastInstallmentPayment) return null;
  
  const today = new Date();
  const diffTime = today.getTime() - lastInstallmentPayment.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 30 ? diffDays : null;
};

// Taksit durum bilgisini döner
const getInstallmentStatus = (vehicle: Vehicle): {
  isInstallment: boolean;
  paidCount: number;
  totalCount: number;
  isOverdue: boolean;
  overdueDays: number | null;
} => {
  const isInstallment = !!vehicle.installment_sale_id;
  
  // Eğer installment bilgisi yoksa, sadece isInstallment döndür
  if (!vehicle.installment) {
    return {
      isInstallment,
      paidCount: 0,
      totalCount: 0,
      isOverdue: false,
      overdueDays: null,
    };
  }
  
  const paidCount = getPaidInstallmentCount(vehicle);
  const totalCount = vehicle.installment.installment_count || 0;
  const overdueDays = getInstallmentOverdueDays(vehicle);
  const isOverdue = overdueDays !== null;
  
  return {
    isInstallment,
    paidCount,
    totalCount,
    isOverdue,
    overdueDays,
  };
};

const VehiclesPage = () => {
  const { formatCurrency: currency } = useCurrency();
  const { getCustomRate } = useCurrencyRates();
  const { tenant } = useTenant();
  const baseCurrency = tenant?.default_currency || "TRY";
  const location = useLocation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [isSoldFilter, setIsSoldFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table');
  const [soldViewMode, setSoldViewMode] = useState<'table' | 'list'>('table');
  const [activeTab, setActiveTab] = useState<string>("vehicles");
  const [soldVehiclesFilter, setSoldVehiclesFilter] = useState<string>("all");

  // Modal states
  const [openAdd, setOpenAdd] = useState(false);
  const [addModalStep, setAddModalStep] = useState(1);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editModalStep, setEditModalStep] = useState(1);
  const [openDetail, setOpenDetail] = useState(false);
  const [openCost, setOpenCost] = useState(false);
  const [openEditCost, setOpenEditCost] = useState(false);
  // const [openCalculate, setOpenCalculate] = useState(false); // Unused - keeping for potential future use
  const [openSell, setOpenSell] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [openBulkImport, setOpenBulkImport] = useState(false);
  const [bulkImportType, setBulkImportType] = useState<"vehicles" | "costs">("vehicles");
  const [openQuote, setOpenQuote] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    vehicle_id: "",
    customer_id: "",
    quote_date: new Date().toISOString().split("T")[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    sale_price: "",
    currency: "TRY",
    down_payment: "",
    installment_count: "",
    installment_amount: "",
    notes: "",
    status: "draft" as "draft" | "sent" | "approved" | "rejected",
  });
  const [customers, setCustomers] = useState<any[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    installment_sale_id: "",
    payment_type: "installment",
    installment_number: "",
    amount: "",
    currency: "TRY",
    payment_date: new Date().toISOString().split('T')[0],
    notes: ""
  });

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

  // Form states
  const [vehicleForm, setVehicleForm] = useState({
    vehicle_number: "",
    maker: "",
    model: "",
    production_year: "",
    arrival_date: "",
    transmission: "",
    chassis_no: "",
    plate_number: "",
    km: "",
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
    currency: "TRY",
    date: new Date().toISOString().split('T')[0],
    category: "other",
    customRate: null as number | null
  });
  const [editingCost, setEditingCost] = useState<VehicleCost | null>(null);

  const [sellForm, setSellForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    plate_number: "",
    key_count: "",
    sale_price: "",
    sale_currency: "TRY",
    sale_date: new Date().toISOString().split('T')[0],
    payment_type: "cash",
    down_payment: "",
    installment_count: "",
    installment_amount: ""
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

  // Para birimleri
  const currencies = [
    { value: "TRY", label: "Türk Lirası (TRY)" },
    { value: "USD", label: "Amerikan Doları (USD)" },
    { value: "EUR", label: "Euro (EUR)" },
    { value: "GBP", label: "İngiliz Sterlini (GBP)" },
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

  const fetchCustomers = async () => {
    try {
      const response = await api.get("/customers?limit=100");
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error("Failed to fetch customers", error);
    }
  };

  const openQuoteModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setQuoteForm({
      vehicle_id: vehicle.id.toString(),
      customer_id: "",
      quote_date: new Date().toISOString().split("T")[0],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      sale_price: vehicle.sale_price?.toString() || "",
      currency: "TRY",
      down_payment: "",
      installment_count: "",
      installment_amount: "",
      notes: "",
      status: "draft",
    });
    fetchCustomers();
    setOpenQuote(true);
  };

  const handleCreateQuote = async () => {
    if (!quoteForm.vehicle_id || !quoteForm.sale_price) {
      toast({
        title: "Uyarı",
        description: "Araç ve satış fiyatı zorunludur.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        ...quoteForm,
        customer_id: quoteForm.customer_id === "none" || !quoteForm.customer_id ? "" : quoteForm.customer_id,
      };
      await api.post("/quotes", payload);
      toast({
        title: "Başarılı",
        description: "Teklif oluşturuldu.",
      });
      setOpenQuote(false);
      setQuoteForm({
        vehicle_id: "",
        customer_id: "",
        quote_date: new Date().toISOString().split("T")[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        sale_price: "",
        currency: "TRY",
        down_payment: "",
        installment_count: "",
        installment_amount: "",
        notes: "",
        status: "draft",
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Teklif oluşturulamadı.",
        variant: "destructive",
      });
    }
  };

  const fetchVehicleDetail = async (id: number) => {
    try {
      const response = await api.get(`/vehicles/${id}`);
      const vehicleData = response.data;
      // Backend'den gelen veri yapısını düzelt
      setSelectedVehicle({
        ...vehicleData,
        sale_info: vehicleData.sale_info || null,
        installment: vehicleData.installment || null
      });

      // Harcamaları getir (tüm kategoriler)
      const costsResponse = await api.get(`/vehicles/${id}/costs`);
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
        amount: cost.amount || 0, // Orijinal tutar (kendi para biriminde)
        currency: cost.currency || "TRY", // Para birimi
        amount_base: cost.amount_base || (cost.amount * (cost.fx_rate_to_base || 1)) // Base currency'deki tutar
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

  const fetchNextVehicleNumber = async () => {
    try {
      const response = await api.get("/vehicles/next-number");
      return response.data.next_vehicle_number || "";
    } catch (error) {
      console.error("Failed to fetch next vehicle number", error);
      return "";
    }
  };

  const resetVehicleForm = async () => {
    const nextNumber = await fetchNextVehicleNumber();
    setVehicleForm({
      vehicle_number: nextNumber.toString(),
      maker: "",
      model: "",
      production_year: "",
      arrival_date: "",
      transmission: "",
      chassis_no: "",
      plate_number: "",
      km: "",
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
    setFormErrors({});
  };

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!vehicleForm.maker?.trim()) {
      errors.maker = "Marka zorunludur";
    }
    if (!vehicleForm.model?.trim()) {
      errors.model = "Model zorunludur";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Step 2 için zorunlu alan yok, hepsi opsiyonel
    setFormErrors(errors);
    return true;
  };

  const handleNextStep = () => {
    if (addModalStep === 1) {
      if (validateStep1()) {
        setAddModalStep(2);
      }
    }
  };

  const handleAddVehicle = async () => {
    if (!validateStep2()) {
      return;
    }
    
    setIsSubmitting(true);
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
          if (['km', 'cc', 'sale_price', 'target_profit'].includes(key)) {
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

      toast({ 
        title: "Başarılı", 
        description: "Araç başarıyla eklendi.",
        variant: "default"
      });
      setOpenAdd(false);
      setAddModalStep(1);
      resetVehicleForm();
      fetchVehicles();
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.message || "Araç eklenemedi.", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
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
          if (['km', 'cc', 'sale_price', 'target_profit', 'vehicle_number', 'production_year'].includes(key)) {
            payload[key] = Number(value);
          } else {
            payload[key] = value;
          }
        }
      });

      await api.put(`/vehicles/${selectedVehicle.id}`, payload);
      toast({ title: "Başarılı", description: "Araç güncellendi." });
      setOpenEdit(false);
      setEditModalStep(1);
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
    try {
      // Önce selectedVehicle'ı set et
      setSelectedVehicle(vehicle);
      // Modal'ı aç
      setOpenDetail(true);
      // Detayları arka planda yükle
      fetchVehicleDetail(vehicle.id).catch((error: any) => {
        console.error("Error fetching vehicle detail:", error);
        toast({
          title: "Uyarı",
          description: "Araç detayları yüklenirken bir hata oluştu. Bazı bilgiler eksik olabilir.",
          variant: "default"
        });
      });
    } catch (error: any) {
      console.error("Error opening detail modal:", error);
      toast({
        title: "Hata",
        description: "Modal açılırken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  const openEditModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setEditModalStep(1);
    
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
      vehicle_number: vehicle.vehicle_number?.toString() || "",
      maker: vehicle.maker || "",
      model: vehicle.model || "",
      production_year: vehicle.production_year?.toString() || "",
      arrival_date: vehicle.arrival_date ? vehicle.arrival_date.split('T')[0] : "",
      transmission: vehicle.transmission || "",
      chassis_no: vehicle.chassis_no || "",
      plate_number: vehicle.plate_number || "",
      km: vehicle.km?.toString() || "",
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
      currency: "TRY",
      date: new Date().toISOString().split('T')[0],
      category: "other",
      customRate: null
    });
    setOpenCost(true);
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
      sale_currency: "TRY",
      sale_date: new Date().toISOString().split('T')[0],
      payment_type: "cash",
      down_payment: "",
      installment_count: "",
      installment_amount: ""
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
      const costCurrency = costForm.currency || "TRY";
      // Use form-specific customRate if set, otherwise use global context
      const customRate = costForm.customRate !== null 
        ? costForm.customRate 
        : (costCurrency !== baseCurrency ? getCustomRate(costCurrency, baseCurrency) : null);

      const payload = {
        cost_name: costForm.cost_name,
        amount: Number(costForm.amount),
        currency: costCurrency,
        cost_date: costForm.date,
        category: costForm.category || "other",
        ...(customRate !== null && { custom_rate: customRate })
      };
      await api.post(`/vehicles/${selectedVehicle.id}/costs`, payload);
      toast({ title: "Başarılı", description: "Harcama eklendi." });
      setOpenCost(false);
      setCostForm({
        cost_name: "",
        amount: "",
        currency: "TRY",
        date: new Date().toISOString().split('T')[0],
        category: "other",
        customRate: null
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
      currency: (cost as any).currency || "TRY",
      date: cost.cost_date || cost.date,
      category: cost.category || "other",
      customRate: null // Reset on edit, user can set new rate if needed
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
      const costCurrency = costForm.currency || "TRY";
      // Use form-specific customRate if set, otherwise use global context
      const customRate = costForm.customRate !== null 
        ? costForm.customRate 
        : (costCurrency !== baseCurrency ? getCustomRate(costCurrency, baseCurrency) : null);

      const payload = {
        cost_name: costForm.cost_name,
        amount: Number(costForm.amount),
        currency: costCurrency,
        cost_date: costForm.date,
        category: costForm.category || "other",
        ...(customRate !== null && { custom_rate: customRate })
      };
      await api.put(`/vehicles/${selectedVehicle.id}/costs/${editingCost.id}`, payload);
      toast({ title: "Başarılı", description: "Harcama güncellendi." });
      setOpenEditCost(false);
      setEditingCost(null);
      setCostForm({
        cost_name: "",
        amount: "",
        currency: "TRY",
        date: new Date().toISOString().split('T')[0],
        category: "other",
        customRate: null
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
    if (sellForm.payment_type === "installment") {
      if (!sellForm.down_payment || !sellForm.installment_count || !sellForm.installment_amount) {
        toast({ 
          title: "Uyarı", 
          description: "Taksitli satış için peşinat, taksit sayısı ve taksit tutarı zorunludur." 
        });
        return;
      }
    }
    try {
      const saleCurrency = sellForm.sale_currency || "TRY";
      const customRate = saleCurrency !== baseCurrency 
        ? getCustomRate(saleCurrency, baseCurrency) 
        : null;

      const payload: any = {
        customer_name: sellForm.customer_name,
        sale_date: sellForm.sale_date,
        sale_amount: Number(sellForm.sale_price),
        sale_currency: saleCurrency,
        payment_type: sellForm.payment_type,
        ...(customRate !== null && { custom_rate: customRate })
      };
      if (sellForm.customer_phone) payload.customer_phone = sellForm.customer_phone;
      if (sellForm.customer_address) payload.customer_address = sellForm.customer_address;
      if (sellForm.plate_number) payload.plate_number = sellForm.plate_number;
      if (sellForm.key_count) payload.key_count = Number(sellForm.key_count);
      if (sellForm.payment_type === "installment") {
        payload.down_payment = Number(sellForm.down_payment);
        payload.installment_count = Number(sellForm.installment_count);
        payload.installment_amount = Number(sellForm.installment_amount);
      }

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

  const soldVehicles = useMemo(() => {
    return vehicles.filter(v => v.is_sold);
  }, [vehicles]);

  const handleAddPayment = async () => {
    if (!paymentForm.installment_sale_id || !paymentForm.amount || !paymentForm.payment_date) {
      toast({ 
        title: "Uyarı", 
        description: "Taksit satış ID, tutar ve ödeme tarihi zorunludur." 
      });
      return;
    }
    if (paymentForm.payment_type === "installment" && !paymentForm.installment_number) {
      toast({ 
        title: "Uyarı", 
        description: "Taksit numarası zorunludur." 
      });
      return;
    }
    try {
      const payload: any = {
        installment_sale_id: Number(paymentForm.installment_sale_id),
        payment_type: paymentForm.payment_type,
        amount: Number(paymentForm.amount),
        currency: paymentForm.currency,
        payment_date: paymentForm.payment_date
      };
      if (paymentForm.payment_type === "installment") {
        payload.installment_number = Number(paymentForm.installment_number);
      }
      if (paymentForm.notes) {
        payload.notes = paymentForm.notes;
      }

      if (editingPaymentId) {
        await api.put(`/installments/payments/${editingPaymentId}`, payload);
        toast({ title: "Başarılı", description: "Ödeme güncellendi." });
      } else {
        await api.post(`/installments/payments`, payload);
        toast({ title: "Başarılı", description: "Ödeme kaydedildi." });
      }
      setOpenPayment(false);
      setEditingPaymentId(null);
      setPaymentForm({
        installment_sale_id: "",
        payment_type: "installment",
        installment_number: "",
        amount: "",
        currency: "TRY",
        payment_date: new Date().toISOString().split('T')[0],
        notes: ""
      });
      if (selectedVehicle) {
        await fetchVehicleDetail(selectedVehicle.id);
      }
      fetchVehicles();
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.error || e?.response?.data?.message || "Ödeme kaydedilemedi.", 
        variant: "destructive" 
      });
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm("Bu ödemeyi silmek istediğinize emin misiniz?")) {
      return;
    }
    try {
      await api.delete(`/installments/payments/${paymentId}`);
      toast({ title: "Başarılı", description: "Ödeme silindi." });
      if (selectedVehicle) {
        await fetchVehicleDetail(selectedVehicle.id);
      }
      fetchVehicles();
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.error || e?.response?.data?.message || "Ödeme silinemedi.", 
        variant: "destructive" 
      });
    }
  };

  const handleEditPayment = (payment: any) => {
    if (selectedVehicle?.installment) {
      setEditingPaymentId(payment.id);
      setPaymentForm({
        installment_sale_id: selectedVehicle.installment.id.toString(),
        payment_type: payment.payment_type,
        installment_number: payment.installment_number?.toString() || "",
        amount: payment.amount.toString(),
        currency: payment.currency,
        payment_date: payment.payment_date.split('T')[0],
        notes: payment.notes || ""
      });
      setOpenPayment(true);
    }
  };

  const filteredSoldVehicles = useMemo(() => {
    let filtered = soldVehicles;
    
    // Search query filtresi
    if (query) {
      const searchLower = query.toLowerCase();
      filtered = filtered.filter(v => 
        (v.maker && v.maker.toLowerCase().includes(searchLower)) ||
        (v.model && v.model.toLowerCase().includes(searchLower)) ||
        (v.chassis_no && v.chassis_no.toLowerCase().includes(searchLower)) ||
        (v.plate_number && v.plate_number.toLowerCase().includes(searchLower))
      );
    }
    
    // Satış tipi filtresi
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

  // Rapor verilerini yükle

  return (
    <div className="space-y-6">
      <div className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-card border border-border rounded-xl p-1.5 shadow-sm h-auto mb-6">
          <TabsTrigger 
            value="vehicles"
            className="flex items-center justify-center px-6 py-4 text-base font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-colors duration-200 ease-in-out min-h-[3.5rem] data-[state=active]:bg-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:bg-muted/70"
          >
            Araçlar
          </TabsTrigger>
          <TabsTrigger 
            value="sold"
            className="flex items-center justify-center px-6 py-4 text-base font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-colors duration-200 ease-in-out min-h-[3.5rem] data-[state=active]:bg-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:bg-muted/70"
          >
            Satılan Araçlar
          </TabsTrigger>
        </TabsList>

        {/* Search and Filters - Shared for both tabs */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Araç ara (marka, model, şasi no)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {activeTab === "vehicles" && (
            <>
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
            </>
          )}
          {activeTab === "sold" && (
            <Select value={soldVehiclesFilter} onValueChange={setSoldVehiclesFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="cash">Peşin Satılanlar</SelectItem>
                <SelectItem value="installment_pending">Taksitli - Kalan Borç Var</SelectItem>
                <SelectItem value="installment_completed">Taksitli - Tamamlandı</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="vehicles" className="space-y-6">
      {/* Vehicles Table/List */}
      <Card className="bg-white rounded-xl border border-[#e2e8f0] shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-[#2d3748]">Araç Listesi</CardTitle>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setBulkImportType("vehicles");
                  setOpenBulkImport(true);
                }}
                className="rounded-xl border-[#003d82] text-[#003d82] hover:bg-[#003d82] hover:text-white"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Toplu İçe Aktar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setBulkImportType("costs");
                  setOpenBulkImport(true);
                }}
                className="rounded-xl border-[#003d82] text-[#003d82] hover:bg-[#003d82] hover:text-white"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Masraf İçe Aktar
              </Button>
              <Dialog open={openAdd} onOpenChange={(open) => {
                setOpenAdd(open);
                if (!open) {
                  setAddModalStep(1);
                  setFormErrors({});
                } else {
                  setFormErrors({});
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => {
                      resetVehicleForm();
                      setAddModalStep(1);
                      setFormErrors({});
                    }}
                    className="bg-[#F0A500] hover:bg-[#d89400] text-white shadow-md hover:shadow-lg rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Araç Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent 
                  className="max-w-4xl max-h-[90vh] overflow-y-auto"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSubmitting) {
                      e.preventDefault();
                      if (addModalStep === 1) {
                        handleNextStep();
                      } else {
                        handleAddVehicle();
                      }
                    }
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>Yeni Araç Ekle</DialogTitle>
                    <DialogDescription>
                      Araç bilgilerini iki adımda girin. İlk adımda temel bilgiler, ikinci adımda satış ve durum bilgileri.
                    </DialogDescription>
                  </DialogHeader>
                  {/* Step Indicator */}
                  <div className="mt-4 mb-6 px-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 shadow-sm ${
                          addModalStep >= 1 
                            ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105' 
                            : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                        }`}>
                          {addModalStep > 1 ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <span className="text-sm font-bold">1</span>
                          )}
                        </div>
                        <div className={`flex-1 h-1.5 mx-3 rounded-full transition-all duration-500 ${
                          addModalStep > 1 ? 'bg-primary shadow-sm' : 'bg-muted'
                        }`} />
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 shadow-sm ${
                          addModalStep >= 2 
                            ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105' 
                            : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                        }`}>
                          <span className="text-sm font-bold">2</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between mt-3 px-1">
                      <span className={`text-xs font-semibold transition-colors ${
                        addModalStep === 1 ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        Araç Bilgileri
                      </span>
                      <span className={`text-xs font-semibold transition-colors ${
                        addModalStep === 2 ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        Satış ve Durum
                      </span>
                    </div>
                  </div>
                  
                  <div className="transition-all duration-300 ease-in-out">
                  {addModalStep === 1 ? (
                    // Adım 1: Araç Bilgileri
                    <div className="mt-4 animate-in fade-in slide-in-from-right-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Araç No</label>
                          <Input
                            type="number"
                            value={vehicleForm.vehicle_number}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_number: e.target.value })}
                            placeholder="Otomatik"
                            className="h-8"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">
                            Marka <span className="text-destructive">*</span>
                          </label>
                          <Input
                            value={vehicleForm.maker}
                            onChange={(e) => {
                              setVehicleForm({ ...vehicleForm, maker: e.target.value });
                              if (formErrors.maker) {
                                setFormErrors({ ...formErrors, maker: "" });
                              }
                            }}
                            placeholder="Örn: Toyota"
                            className={`h-8 ${formErrors.maker ? 'border-destructive' : ''}`}
                          />
                          {formErrors.maker && (
                            <p className="text-xs text-destructive mt-1">{formErrors.maker}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">
                            Model <span className="text-destructive">*</span>
                          </label>
                          <Input
                            value={vehicleForm.model}
                            onChange={(e) => {
                              setVehicleForm({ ...vehicleForm, model: e.target.value });
                              if (formErrors.model) {
                                setFormErrors({ ...formErrors, model: "" });
                              }
                            }}
                            placeholder="Örn: Corolla"
                            className={`h-8 ${formErrors.model ? 'border-destructive' : ''}`}
                          />
                          {formErrors.model && (
                            <p className="text-xs text-destructive mt-1">{formErrors.model}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Üretim Yılı</label>
                          <Input
                            type="number"
                            value={vehicleForm.production_year}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, production_year: e.target.value })}
                            placeholder="Örn: 2023"
                            min="1900"
                            max={new Date().getFullYear() + 1}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Bayiye Geliş Tarihi</label>
                          <Input
                            type="date"
                            value={vehicleForm.arrival_date}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, arrival_date: e.target.value })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Vites</label>
                          <Input
                            value={vehicleForm.transmission}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, transmission: e.target.value })}
                            placeholder="Örn: Otomatik"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Şasi No</label>
                          <Input
                            value={vehicleForm.chassis_no}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, chassis_no: e.target.value })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Plaka</label>
                          <Input
                            value={vehicleForm.plate_number}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })}
                            placeholder="Örn: 34ABC123"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Km</label>
                          <Input
                            type="number"
                            value={vehicleForm.km}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, km: e.target.value })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Yakıt</label>
                          <Input
                            value={vehicleForm.fuel}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, fuel: e.target.value })}
                            placeholder="Örn: Benzin"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Sınıf</label>
                          <Input
                            value={vehicleForm.grade}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, grade: e.target.value })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">CC</label>
                          <Input
                            type="number"
                            value={vehicleForm.cc}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, cc: e.target.value })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Renk</label>
                          <Input
                            value={vehicleForm.color}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Diğer</label>
                          <Input
                            value={vehicleForm.other}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, other: e.target.value })}
                            className="h-8"
                          />
                        </div>
                      </div>
                      <DialogFooter className="mt-4">
                        <Button onClick={handleNextStep}>İleri</Button>
                      </DialogFooter>
                    </div>
                  ) : (
                    // Adım 2: Satış ve Durum Bilgileri
                    <div className="mt-4 animate-in fade-in slide-in-from-left-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Önerilen Satış Fiyatı</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={vehicleForm.sale_price}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, sale_price: e.target.value })}
                            placeholder="Önerilen satış fiyatı (opsiyonel)"
                            className="h-8"
                            autoFocus
                          />
                        </div>
                          <div>
                          <label className="text-sm font-medium mb-1 block">Alış Fiyatı</label>
                          <CurrencyInput
                              value={vehicleForm.paid}
                            currency={vehicleForm.purchase_currency}
                            onValueChange={(value) => setVehicleForm({ ...vehicleForm, paid: value })}
                            onCurrencyChange={(value) => setVehicleForm({ ...vehicleForm, purchase_currency: value })}
                              className="h-8"
                            currencies={currencies.map(c => ({ value: c.value, label: c.label }))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Araç Durumu</label>
                          <Select
                            value={vehicleForm.status || "used"}
                            onValueChange={(value) => setVehicleForm({ ...vehicleForm, status: value })}
                          >
                            <SelectTrigger className="h-8">
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
                          <label className="text-sm font-medium mb-1 block">Stok Durumu</label>
                          <Select
                            value={vehicleForm.stock_status || "in_stock"}
                            onValueChange={(value) => setVehicleForm({ ...vehicleForm, stock_status: value })}
                          >
                            <SelectTrigger className="h-8">
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
                          <label className="text-sm font-medium mb-1 block">Lokasyon</label>
                          <Input
                            value={vehicleForm.location}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, location: e.target.value })}
                            placeholder="Örn: Şube A, Park Yeri 5"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Sözleşme PDF</label>
                          <Input
                            type="file"
                            accept=".pdf"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setVehicleForm({ ...vehicleForm, contract_pdf: file });
                              }
                            }}
                            className="h-8"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Araç eklenirken sözleşme PDF'i yüklenecektir</p>
                        </div>
                      </div>
                      <DialogFooter className="mt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setAddModalStep(1);
                            setFormErrors({});
                          }}
                          disabled={isSubmitting}
                        >
                          Geri
                        </Button>
                        <Button 
                          onClick={handleAddVehicle}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <span className="mr-2">Yükleniyor...</span>
                            </>
                          ) : (
                            "Ekle"
                          )}
                        </Button>
                      </DialogFooter>
                    </div>
                  )}
                  </div>
                </DialogContent>
              </Dialog>
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
          <div className="rounded-xl overflow-hidden border border-[#e2e8f0]">
            <Table className="table-zebra">
              <TableHeader className="bg-[#f8f9fa] sticky top-0 z-10">
                <TableRow className="border-b border-[#e2e8f0] hover:bg-transparent">
                  <TableHead className="text-[#2d3748] font-semibold">Araç No</TableHead>
                  <TableHead className="text-[#2d3748] font-semibold">Marka/Model</TableHead>
                  <TableHead className="text-[#2d3748] font-semibold">Yıl</TableHead>
                  <TableHead className="text-[#2d3748] font-semibold">Şasi No</TableHead>
                  <TableHead className="text-[#2d3748] font-semibold">Satış Fiyatı</TableHead>
                  <TableHead className="text-[#2d3748] font-semibold">Toplam Maliyet</TableHead>
                  <TableHead className="text-[#2d3748] font-semibold">Durum</TableHead>
                  <TableHead className="text-[#2d3748] font-semibold">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-[#2d3748]">Yükleniyor...</TableCell>
                  </TableRow>
                ) : filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-[#2d3748]">Araç bulunamadı.</TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map((vehicle, index) => (
                    <TableRow 
                      key={vehicle.id}
                      className={`table-row-modern border-b border-[#e2e8f0] ${
                        index % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'
                      }`}
                    >
                      <TableCell className="text-[#2d3748]">{vehicle.vehicle_number || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {vehicle.primary_image_url ? (
                            <img
                              src={vehicle.primary_image_url.startsWith('http') 
                                ? vehicle.primary_image_url 
                                : vehicle.primary_image_url.startsWith('/uploads')
                                ? `${getApiBaseUrl()}${vehicle.primary_image_url}`
                                : vehicle.primary_image_url}
                              alt={`${vehicle.maker} ${vehicle.model}`}
                              className="w-[60px] h-[40px] object-cover rounded-xl border border-[#e2e8f0] shadow-sm"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-[60px] h-[40px] bg-[#f8f9fa] rounded-xl border border-[#e2e8f0] flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-[#2d3748]/40" />
                            </div>
                          )}
                        <div>
                          <div className="font-medium flex items-center gap-2 text-[#2d3748]">
                            {vehicle.maker || "-"} {vehicle.model || ""}
                            {(() => {
                              const overdueDays = getInstallmentOverdueDays(vehicle);
                              if (overdueDays !== null) {
                                return (
                                  <div className="relative group">
                                    <AlertCircle className="h-4 w-4 text-[#F0A500]" />
                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-[#2d3748] text-white text-xs rounded-xl py-1 px-2 whitespace-nowrap z-50 shadow-lg">
                                      Son taksit ödemesinin üzerinden {overdueDays} gün geçti.
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          {vehicle.chassis_no && (
                            <div className="text-sm text-[#2d3748]/60">
                              {vehicle.chassis_no}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#2d3748]">{vehicle.production_year || "-"}</TableCell>
                    <TableCell className="text-[#2d3748]">{vehicle.chassis_no || "-"}</TableCell>
                    <TableCell className="text-[#2d3748] font-medium">{currency(vehicle.sale_price)}</TableCell>
                    <TableCell className="text-[#2d3748] font-medium">{currency(vehicle.total_costs)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const status = getInstallmentStatus(vehicle);
                          if (vehicle.is_sold) {
                            if (status.isInstallment) {
                              return (
                                <>
                                  <Badge className="bg-green-600 text-white rounded-xl px-2 py-0.5 text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Taksitle Satıldı
                                  </Badge>
                                  {status.isOverdue ? (
                                    <Badge className="bg-red-500 text-white rounded-xl px-2 py-0.5 text-xs flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      Gecikmiş Taksit
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-[#F0A500] text-white rounded-xl px-2 py-0.5 text-xs">
                                      {status.paidCount}/{status.totalCount}
                                    </Badge>
                                  )}
                                </>
                              );
                            } else {
                              return (
                                <Badge className="bg-green-600 text-white rounded-xl px-2 py-0.5 text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Satıldı
                                </Badge>
                              );
                            }
                          } else {
                            return (
                              <Badge className="bg-[#003d82] text-white rounded-xl px-2 py-0.5 text-xs">
                                <XCircle className="h-3 w-3 mr-1" />
                                Stokta
                              </Badge>
                            );
                          }
                        })()}
                        {vehicle.stock_status && !getInstallmentStatus(vehicle).isInstallment && (
                          <Badge 
                            className={`rounded-xl px-2 py-0.5 text-xs ${
                              vehicle.stock_status === 'sold' ? 'bg-green-600 text-white' :
                              vehicle.stock_status === 'on_sale' ? 'bg-[#003d82] text-white' :
                              vehicle.stock_status === 'reserved' ? 'bg-[#F0A500] text-white' :
                              'bg-[#003d82] text-white'
                            }`}
                          >
                            {vehicle.stock_status === 'in_stock' ? 'Stokta' :
                             vehicle.stock_status === 'on_sale' ? 'Satışta' :
                             vehicle.stock_status === 'reserved' ? 'Rezerve' :
                             vehicle.stock_status === 'sold' ? 'Satıldı' : vehicle.stock_status}
                          </Badge>
                        )}
                        {vehicle.location && (
                          <span className="text-xs text-[#2d3748]/60">{vehicle.location}</span>
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
                              title="Düzenle"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openQuoteModal(vehicle)}
                              title="Teklif Oluştur"
                              className="text-[#F0A500] hover:text-[#d89400]"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openSellModal(vehicle)}
                              title="Sat"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                          title="Sil"
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
          </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-full text-center py-12">Yükleniyor...</div>
              ) : filteredVehicles.length === 0 ? (
                <div className="col-span-full text-center py-12">Araç bulunamadı.</div>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <Card key={vehicle.id} className="overflow-hidden">
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
                      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        {(() => {
                          const status = getInstallmentStatus(vehicle);
                          if (vehicle.is_sold) {
                            if (status.isInstallment) {
                              return (
                                <>
                                  <Badge variant="default" className="bg-green-500">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Taksitle Satıldı
                                  </Badge>
                                  {status.isOverdue ? (
                                    <Badge variant="destructive" className="flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      Gecikmiş
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-orange-100 text-orange-800">
                                      {status.paidCount}/{status.totalCount}
                                    </Badge>
                                  )}
                                </>
                              );
                            } else {
                              return (
                                <Badge variant="default" className="bg-green-500">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Satıldı
                                </Badge>
                              );
                            }
                          } else {
                            return (
                              <Badge variant="secondary">
                                <XCircle className="h-3 w-3 mr-1" />
                                Satılmadı
                              </Badge>
                            );
                          }
                        })()}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            {vehicle.maker || "-"} {vehicle.model || ""}
                            {(() => {
                              const overdueDays = getInstallmentOverdueDays(vehicle);
                              if (overdueDays !== null) {
                                return (
                                  <div className="relative group">
                                    <AlertCircle className="h-4 w-4 text-orange-500" />
                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-50">
                                      Son taksit ödemesinin üzerinden {overdueDays} gün geçti.
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </h3>
                          {vehicle.production_year && (
                            <p className="text-sm text-muted-foreground">{vehicle.production_year}</p>
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
                          {(() => {
                            const status = getInstallmentStatus(vehicle);
                            if (vehicle.is_sold && status.isInstallment) {
                              if (status.isOverdue) {
                                return (
                                  <Badge variant="destructive" className="flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Gecikmiş Taksit
                                  </Badge>
                                );
                              } else {
                                return (
                                  <Badge variant="outline" className="bg-orange-100 text-orange-800">
                                    {status.paidCount}/{status.totalCount}
                                  </Badge>
                                );
                              }
                            }
                            return null;
                          })()}
                          {vehicle.stock_status && !getInstallmentStatus(vehicle).isInstallment && (
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
        </TabsContent>

      {/* Detail Modal - Bu modal araç detaylarını, harcamaları ve maliyet hesaplamayı gösterir */}
      <Dialog 
        open={openDetail} 
        onOpenChange={setOpenDetail}
      >
        <DialogContent className="max-w-4xl h-[70vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>
              {selectedVehicle ? `${selectedVehicle.maker || ""} ${selectedVehicle.model || ""}`.trim() || "Araç Detayları" : "Araç Detayları"}
            </DialogTitle>
            <DialogDescription>
              Araç bilgileri, satış detayları ve taksit takibi
            </DialogDescription>
          </DialogHeader>
          {selectedVehicle ? (
            <Tabs defaultValue="info" className="w-full flex flex-col flex-1 min-h-0">
              <div className="px-6 pt-4 pb-0 flex-shrink-0">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="info">Bilgiler</TabsTrigger>
                  <TabsTrigger value="delivery">Satış</TabsTrigger>
                  <TabsTrigger value="images">Fotoğraflar</TabsTrigger>
                  <TabsTrigger value="documents">Belgeler</TabsTrigger>
                  <TabsTrigger value="costs">Harcamalar</TabsTrigger>
                  <TabsTrigger value="calculate">Maliyet Hesaplama</TabsTrigger>
                </TabsList>
              </div>
              <div className="px-6 pb-6 flex-1 overflow-y-auto min-h-0">
              
              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><strong>Araç No:</strong> {selectedVehicle.vehicle_number || "-"}</div>
                  <div><strong>Marka:</strong> {selectedVehicle.maker || "-"}</div>
                  <div><strong>Model:</strong> {selectedVehicle.model || "-"}</div>
                  <div><strong>Üretim Yılı:</strong> {selectedVehicle.production_year || "-"}</div>
                  <div><strong>Vites:</strong> {selectedVehicle.transmission || "-"}</div>
                  <div><strong>Şasi No:</strong> {selectedVehicle.chassis_no || "-"}</div>
                  <div><strong>Plaka:</strong> {selectedVehicle.plate_number || "-"}</div>
                  <div><strong>Km:</strong> {selectedVehicle.km || "-"}</div>
                  <div><strong>Yakıt:</strong> {selectedVehicle.fuel || "-"}</div>
                  <div><strong>Sınıf:</strong> {selectedVehicle.grade || "-"}</div>
                  <div><strong>CC:</strong> {selectedVehicle.cc || "-"}</div>
                  <div><strong>Renk:</strong> {selectedVehicle.color || "-"}</div>
                  <div><strong>Önerilen Satış Fiyatı:</strong> {currency(selectedVehicle.sale_price)}</div>
                  <div><strong>Ödenen:</strong> {currency(selectedVehicle.paid)}</div>
                  {selectedVehicle.other && (
                    <div className="col-span-2"><strong>Diğer:</strong> {selectedVehicle.other}</div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="delivery" className="space-y-4 mt-4">
                {/* Teslimat Bilgileri */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong>Teslimat Tarihi:</strong> {formatDate(selectedVehicle.delivery_date)}
                    </div>
                    <div>
                      <strong>Teslimat Saati:</strong> {
                        selectedVehicle.delivery_time 
                          ? (selectedVehicle.delivery_time.includes('T') 
                              ? formatDateTime(selectedVehicle.delivery_time).split(' ')[1] 
                              : selectedVehicle.delivery_time)
                          : (selectedVehicle.delivery_date 
                              ? formatDateTime(selectedVehicle.delivery_date).split(' ')[1] 
                              : "-")
                      }
                    </div>
                  </div>
                </div>

                {/* Satış Bilgileri */}
                {selectedVehicle.sale_info && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
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
                      <div><strong>Satış Tarihi:</strong> {formatDateTime(selectedVehicle.sale_info.sale_date)}</div>
                    </div>
                  </div>
                )}

                {/* Taksitli Satış Bilgileri */}
                {selectedVehicle.installment && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold">Taksitli Satış Bilgileri</h3>
                      {selectedVehicle.installment.status === 'active' && selectedVehicle.installment.remaining_balance > 0 && (
                        <Badge variant="outline" className="bg-orange-100 text-orange-800">
                          Kalan Borç: {currency(selectedVehicle.installment.remaining_balance)}
                        </Badge>
                      )}
                      {selectedVehicle.installment.status === 'completed' && (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          Tamamlandı
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div><strong>Toplam Satış Fiyatı:</strong> {currency(selectedVehicle.installment.total_amount)}</div>
                      <div><strong>Peşinat:</strong> {currency(selectedVehicle.installment.down_payment)}</div>
                      <div><strong>Taksit Sayısı:</strong> {selectedVehicle.installment.installment_count}</div>
                      <div><strong>Taksit Tutarı:</strong> {currency(selectedVehicle.installment.installment_amount)}</div>
                      <div><strong>Ödenen Toplam:</strong> {currency(selectedVehicle.installment.total_paid)}</div>
                      <div><strong>Kalan Borç:</strong> 
                        <span className={selectedVehicle.installment.remaining_balance > 0 ? "text-orange-600 font-semibold ml-2" : "text-green-600 font-semibold ml-2"}>
                          {selectedVehicle.installment.remaining_balance > 0 
                            ? currency(selectedVehicle.installment.remaining_balance) 
                            : "Tamamlandı"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Ödeme Geçmişi</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tarih</TableHead>
                            <TableHead>Tip</TableHead>
                            <TableHead>Taksit No</TableHead>
                            <TableHead>Tutar</TableHead>
                            <TableHead>Notlar</TableHead>
                            {selectedVehicle.installment && selectedVehicle.installment.status === 'active' && (
                              <TableHead>İşlemler</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedVehicle.installment.payments && selectedVehicle.installment.payments.length > 0 ? (
                            selectedVehicle.installment.payments.map((payment: any) => (
                              <TableRow key={payment.id}>
                                <TableCell>{formatDateTime(payment.payment_date)}</TableCell>
                                <TableCell>
                                  <Badge variant={payment.payment_type === 'down_payment' ? 'default' : 'secondary'}>
                                    {payment.payment_type === 'down_payment' ? 'Peşinat' : 'Taksit'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {payment.installment_number !== null && payment.installment_number !== undefined 
                                    ? payment.installment_number 
                                    : '-'}
                                </TableCell>
                                <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
                                <TableCell>{payment.notes || '-'}</TableCell>
                                {selectedVehicle.installment && selectedVehicle.installment.status === 'active' && (
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditPayment(payment)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeletePayment(payment.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={selectedVehicle.installment && selectedVehicle.installment.status === 'active' ? 6 : 5} className="text-center">Ödeme kaydı bulunamadı.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {selectedVehicle.installment && selectedVehicle.installment.status === 'active' && selectedVehicle.installment.remaining_balance > 0 && (
                      <div className="mt-4">
                        <Button
                          onClick={() => {
                            if (selectedVehicle.installment) {
                              setEditingPaymentId(null);
                              setPaymentForm({
                                installment_sale_id: selectedVehicle.installment.id.toString(),
                                payment_type: "installment",
                                installment_number: "",
                                amount: selectedVehicle.installment.installment_amount.toString(),
                                currency: selectedVehicle.installment.currency,
                                payment_date: new Date().toISOString().split('T')[0],
                                notes: ""
                              });
                              setOpenPayment(true);
                            }
                          }}
                        >
                          Yeni Ödeme Ekle
                        </Button>
                      </div>
                    )}
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
                              onClick={() => window.open(`${getApiBaseUrl()}${doc.file_path}`, "_blank")}
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
                  <Button onClick={() => openCostModal(selectedVehicle)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Harcama Ekle
                  </Button>
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
                          <TableCell>
                            {formatCurrency(
                              cost.amount,
                              (cost as any).currency || "TRY"
                            )}
                          </TableCell>
                          <TableCell>{formatDate(cost.date)}</TableCell>
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
                                  <span className="font-semibold">
                                    {formatCurrency(item.amount, item.currency || "TRY")}
                                  </span>
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
                                  <span className="font-semibold">
                                    {formatCurrency(item.amount, item.currency || "TRY")}
                                  </span>
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
          ) : (
            <div className="p-6 text-center">
              <p>Yükleniyor...</p>
              <p className="text-sm text-muted-foreground mt-2">Araç bilgileri yükleniyor...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={openEdit} onOpenChange={(open) => {
        setOpenEdit(open);
        if (!open) {
          setEditModalStep(1);
          setFormErrors({});
        } else {
          setFormErrors({});
        }
      }}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isSubmitting) {
              e.preventDefault();
              if (editModalStep === 1) {
                setEditModalStep(2);
              } else {
                handleEditVehicle();
              }
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Araç Düzenle</DialogTitle>
            <DialogDescription>
              Araç bilgilerini iki adımda güncelleyin. İlk adımda temel bilgiler, ikinci adımda satış ve durum bilgileri.
            </DialogDescription>
          </DialogHeader>
          {/* Step Indicator */}
          <div className="mt-4 mb-6 px-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 shadow-sm ${
                  editModalStep >= 1 
                    ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105' 
                    : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                }`}>
                  {editModalStep > 1 ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-bold">1</span>
                  )}
                </div>
                <div className={`flex-1 h-1.5 mx-3 rounded-full transition-all duration-500 ${
                  editModalStep > 1 ? 'bg-primary shadow-sm' : 'bg-muted'
                }`} />
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 shadow-sm ${
                  editModalStep >= 2 
                    ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105' 
                    : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                }`}>
                  <span className="text-sm font-bold">2</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-3 px-1">
              <span className={`text-xs font-semibold transition-colors ${
                editModalStep === 1 ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                Araç Bilgileri
              </span>
              <span className={`text-xs font-semibold transition-colors ${
                editModalStep === 2 ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                Satış ve Durum
              </span>
            </div>
          </div>
          
          <div className="transition-all duration-300 ease-in-out">
          {editModalStep === 1 ? (
            // Adım 1: Araç Bilgileri
            <div className="mt-4 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Araç No</label>
                  <Input
                    type="number"
                    value={vehicleForm.vehicle_number}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_number: e.target.value })}
                    placeholder="Otomatik"
                    className="h-8"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Marka</label>
                  <Input
                    value={vehicleForm.maker}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, maker: e.target.value })}
                    placeholder="Örn: Toyota"
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Model</label>
                  <Input
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    placeholder="Örn: Corolla"
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Üretim Yılı</label>
                  <Input
                    type="number"
                    value={vehicleForm.production_year}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, production_year: e.target.value })}
                    placeholder="Örn: 2023"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Bayiye Geliş Tarihi</label>
                  <Input
                    type="date"
                    value={vehicleForm.arrival_date}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, arrival_date: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Vites</label>
                  <Input
                    value={vehicleForm.transmission}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, transmission: e.target.value })}
                    placeholder="Örn: Otomatik"
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Şasi No</label>
                  <Input
                    value={vehicleForm.chassis_no}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, chassis_no: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Plaka</label>
                  <Input
                    value={vehicleForm.plate_number}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })}
                    placeholder="Örn: 34ABC123"
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Km</label>
                  <Input
                    type="number"
                    value={vehicleForm.km}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, km: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Yakıt</label>
                  <Input
                    value={vehicleForm.fuel}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, fuel: e.target.value })}
                    placeholder="Örn: Benzin"
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Sınıf</label>
                  <Input
                    value={vehicleForm.grade}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, grade: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">CC</label>
                  <Input
                    type="number"
                    value={vehicleForm.cc}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, cc: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Renk</label>
                  <Input
                    value={vehicleForm.color}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Diğer</label>
                  <Input
                    value={vehicleForm.other}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, other: e.target.value })}
                    className="h-8"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button onClick={() => setEditModalStep(2)}>İleri</Button>
              </DialogFooter>
            </div>
          ) : (
            // Adım 2: Satış ve Durum Bilgileri
            <div className="mt-4 animate-in fade-in slide-in-from-left-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Önerilen Satış Fiyatı</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={vehicleForm.sale_price}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, sale_price: e.target.value })}
                    placeholder="Önerilen satış fiyatı (opsiyonel)"
                    className="h-8"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Alış Fiyatı</label>
                  <CurrencyInput
                    value={vehicleForm.paid}
                    currency={vehicleForm.purchase_currency}
                    onValueChange={(value) => setVehicleForm({ ...vehicleForm, paid: value })}
                    onCurrencyChange={(value) => setVehicleForm({ ...vehicleForm, purchase_currency: value })}
                    className="h-8"
                    currencies={currencies.map(c => ({ value: c.value, label: c.label }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Teslimat Tarihi</label>
                  <Input
                    type="date"
                    value={vehicleForm.delivery_date}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, delivery_date: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Teslimat Saati</label>
                  <Input
                    type="time"
                    value={vehicleForm.delivery_time}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, delivery_time: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Araç Durumu</label>
                  <Select
                    value={vehicleForm.status || "used"}
                    onValueChange={(value) => setVehicleForm({ ...vehicleForm, status: value })}
                  >
                    <SelectTrigger className="h-8">
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
                  <label className="text-sm font-medium mb-1 block">Stok Durumu</label>
                  <Select
                    value={vehicleForm.stock_status || "in_stock"}
                    onValueChange={(value) => setVehicleForm({ ...vehicleForm, stock_status: value })}
                  >
                    <SelectTrigger className="h-8">
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
                  <label className="text-sm font-medium mb-1 block">Lokasyon</label>
                  <Input
                    value={vehicleForm.location}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, location: e.target.value })}
                    placeholder="Örn: Şube A, Park Yeri 5"
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Hedef Kar (Opsiyonel)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={vehicleForm.target_profit}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, target_profit: e.target.value })}
                    placeholder="Hedef kar tutarı"
                    className="h-8"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditModalStep(1);
                    setFormErrors({});
                  }}
                  disabled={isSubmitting}
                >
                  Geri
                </Button>
                <Button 
                  onClick={handleEditVehicle}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="mr-2">Yükleniyor...</span>
                    </>
                  ) : (
                    "Kaydet"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
          </div>
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
              <CurrencyInput
                value={costForm.amount}
                currency={costForm.currency || "TRY"}
                onValueChange={(value) => setCostForm({ ...costForm, amount: value })}
                onCurrencyChange={(value) => setCostForm({ ...costForm, currency: value, customRate: null })}
                currencies={currencies.map(c => ({ value: c.value, label: c.label }))}
                customRate={costForm.customRate}
                onCustomRateChange={(rate) => setCostForm({ ...costForm, customRate: rate })}
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
              <CurrencyInput
                value={costForm.amount}
                currency={costForm.currency || "TRY"}
                onValueChange={(value) => setCostForm({ ...costForm, amount: value })}
                onCurrencyChange={(value) => setCostForm({ ...costForm, currency: value, customRate: null })}
                currencies={currencies.map(c => ({ value: c.value, label: c.label }))}
                customRate={costForm.customRate}
                onCustomRateChange={(rate) => setCostForm({ ...costForm, customRate: rate })}
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
                currency: "TRY",
                date: new Date().toISOString().split('T')[0],
                category: "other",
                customRate: null
              });
            }}>İptal</Button>
            <Button onClick={handleUpdateCost}>Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sell Modal */}
      <Dialog open={openSell} onOpenChange={setOpenSell}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Araç Satışı</DialogTitle>
            <DialogDescription>
              Araç satış bilgilerini girin. Müşteri adı ve satış tarihi zorunludur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div>
              <label className="text-sm font-medium">Müşteri Adres</label>
              <Input
                value={sellForm.customer_address}
                onChange={(e) => setSellForm({ ...sellForm, customer_address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            </div>
              <div>
                <label className="text-sm font-medium">Satış Fiyatı *</label>
              <CurrencyInput
                  value={sellForm.sale_price}
                currency={sellForm.sale_currency || "TRY"}
                onValueChange={(salePrice) => {
                    setSellForm({ ...sellForm, sale_price: salePrice });
                    // Taksit tutarını otomatik hesapla
                    if (sellForm.payment_type === "installment" && sellForm.down_payment && sellForm.installment_count) {
                      const remaining = Number(salePrice) - Number(sellForm.down_payment);
                      const installmentAmount = remaining / Number(sellForm.installment_count);
                      setSellForm(prev => ({ ...prev, sale_price: salePrice, installment_amount: installmentAmount.toFixed(2) }));
                    }
                  }}
                onCurrencyChange={(value) => setSellForm({ ...sellForm, sale_currency: value })}
                  placeholder="Satış fiyatını girin"
                currencies={currencies.map(c => ({ value: c.value, label: c.label }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Ödeme Tipi *</label>
                <Select
                  value={sellForm.payment_type}
                  onValueChange={(value) => setSellForm({ ...sellForm, payment_type: value, down_payment: "", installment_count: "", installment_amount: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ödeme tipi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Peşin</SelectItem>
                    <SelectItem value="installment">Taksitli</SelectItem>
                  </SelectContent>
                </Select>
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
            {sellForm.payment_type === "installment" && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Peşinat *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={sellForm.down_payment}
                    onChange={(e) => {
                      const downPayment = e.target.value;
                      setSellForm({ ...sellForm, down_payment: downPayment });
                      // Taksit tutarını otomatik hesapla
                      if (sellForm.sale_price && sellForm.installment_count) {
                        const remaining = Number(sellForm.sale_price) - Number(downPayment);
                        const installmentAmount = remaining / Number(sellForm.installment_count);
                        setSellForm(prev => ({ ...prev, down_payment: downPayment, installment_amount: installmentAmount.toFixed(2) }));
                      }
                    }}
                    placeholder="Peşinat tutarını girin"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Taksit Sayısı *</label>
                  <Input
                    type="number"
                    value={sellForm.installment_count}
                    onChange={(e) => {
                      const installmentCount = e.target.value;
                      setSellForm({ ...sellForm, installment_count: installmentCount });
                      // Taksit tutarını otomatik hesapla
                      if (sellForm.sale_price && sellForm.down_payment) {
                        const remaining = Number(sellForm.sale_price) - Number(sellForm.down_payment);
                        const installmentAmount = remaining / Number(installmentCount);
                        setSellForm(prev => ({ ...prev, installment_count: installmentCount, installment_amount: installmentAmount.toFixed(2) }));
                      }
                    }}
                    placeholder="Taksit sayısını girin"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Taksit Tutarı</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={sellForm.installment_amount}
                    readOnly
                    placeholder="Otomatik hesaplanır"
                    className="bg-muted"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSell(false)}>İptal</Button>
            <Button onClick={handleSell}>Satıldı Olarak İşaretle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={openPayment} onOpenChange={(open) => {
        setOpenPayment(open);
        if (!open) {
          setEditingPaymentId(null);
          setPaymentForm({
            installment_sale_id: "",
            payment_type: "installment",
            installment_number: "",
            amount: "",
            currency: "TRY",
            payment_date: new Date().toISOString().split('T')[0],
            notes: ""
          });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPaymentId ? "Taksit Ödemesi Düzenle" : "Taksit Ödemesi Ekle"}</DialogTitle>
            <DialogDescription>
              {editingPaymentId ? "Taksit ödemesi bilgilerini düzenleyin." : "Taksit ödemesi bilgilerini girin."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Ödeme Tipi *</label>
              <Select
                value={paymentForm.payment_type}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_type: value, installment_number: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ödeme tipi seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="down_payment">Peşinat</SelectItem>
                  <SelectItem value="installment">Taksit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentForm.payment_type === "installment" && (
              <div>
                <label className="text-sm font-medium">Taksit Numarası *</label>
                <Input
                  type="number"
                  value={paymentForm.installment_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, installment_number: e.target.value })}
                  placeholder="Taksit numarasını girin"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Tutar *</label>
              <CurrencyInput
                value={paymentForm.amount}
                currency={paymentForm.currency}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, amount: value })}
                onCurrencyChange={(value) => setPaymentForm({ ...paymentForm, currency: value })}
                placeholder="Ödeme tutarını girin"
                currencies={currencies.map(c => ({ value: c.value, label: c.label }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Ödeme Tarihi *</label>
              <Input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notlar</label>
              <Input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Opsiyonel notlar"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setOpenPayment(false);
              setEditingPaymentId(null);
              setPaymentForm({
                installment_sale_id: "",
                payment_type: "installment",
                installment_number: "",
                amount: "",
                currency: "TRY",
                payment_date: new Date().toISOString().split('T')[0],
                notes: ""
              });
            }}>İptal</Button>
            <Button onClick={handleAddPayment}>{editingPaymentId ? "Güncelle" : "Kaydet"}</Button>
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

        <TabsContent value="sold" className="space-y-6">
          {/* Sold Vehicles Table/List */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Satılan Araç Listesi</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Grid3x3 className={`h-4 w-4 ${soldViewMode === 'list' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <Switch
                      checked={soldViewMode === 'list'}
                      onCheckedChange={(checked) => setSoldViewMode(checked ? 'list' : 'table')}
                    />
                    <List className={`h-4 w-4 ${soldViewMode === 'table' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {soldViewMode === 'table' ? (
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marka/Model</TableHead>
                    <TableHead>Yıl</TableHead>
                    <TableHead>Şasi No</TableHead>
                    <TableHead>Satış Fiyatı</TableHead>
                    <TableHead>Peşinat</TableHead>
                    <TableHead>Kalan Borç</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">Yükleniyor...</TableCell>
                    </TableRow>
                  ) : filteredSoldVehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">Satılan araç bulunamadı.</TableCell>
                    </TableRow>
                  ) : (
                    filteredSoldVehicles.map((vehicle) => (
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
                              <div className="font-medium flex items-center gap-2">
                                {vehicle.maker || "-"} {vehicle.model || ""}
                                {(() => {
                                  const overdueDays = getInstallmentOverdueDays(vehicle);
                                  if (overdueDays !== null) {
                                    return (
                                      <div className="relative group">
                                        <AlertCircle className="h-4 w-4 text-orange-500" />
                                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-50">
                                          Son taksit ödemesinin üzerinden {overdueDays} gün geçti.
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              {vehicle.chassis_no && (
                                <div className="text-sm text-muted-foreground">
                                  {vehicle.chassis_no}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{vehicle.production_year || "-"}</TableCell>
                        <TableCell>{vehicle.chassis_no || "-"}</TableCell>
                        <TableCell>{currency(vehicle.sale_price)}</TableCell>
                        <TableCell>
                          {vehicle.installment?.down_payment 
                            ? currency(vehicle.installment.down_payment)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {vehicle.installment_remaining_balance && vehicle.installment_remaining_balance > 0
                            ? (
                              <span className="text-orange-600 font-semibold">
                                {currency(vehicle.installment_remaining_balance)}
                              </span>
                            )
                            : vehicle.installment_sale_id
                            ? (
                              <span className="text-green-600">Tamamlandı</span>
                            )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {(() => {
                              const status = getInstallmentStatus(vehicle);
                              if (status.isInstallment) {
                                return (
                                  <>
                                    <Badge variant="default" className="bg-green-500">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Taksitle Satıldı
                                    </Badge>
                                    {status.isOverdue ? (
                                      <Badge variant="destructive" className="flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Gecikmiş Taksit
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-orange-100 text-orange-800">
                                        {status.paidCount}/{status.totalCount}
                                      </Badge>
                                    )}
                                  </>
                                );
                              } else {
                                return (
                                  <Badge variant="default" className="bg-green-500">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Satıldı
                                  </Badge>
                                );
                              }
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openDetailModal(vehicle);
                              }}
                              title="Detay"
                            >
                              <Eye className="h-4 w-4" />
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
                  ) : filteredSoldVehicles.length === 0 ? (
                    <div className="col-span-full text-center py-12">Satılan araç bulunamadı.</div>
                  ) : (
                    filteredSoldVehicles.map((vehicle) => (
                      <Card key={vehicle.id} className="overflow-hidden">
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
                          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                            {(() => {
                              const status = getInstallmentStatus(vehicle);
                              if (status.isInstallment) {
                                return (
                                  <>
                                    <Badge variant="default" className="bg-green-500">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Taksitle Satıldı
                                    </Badge>
                                    {status.isOverdue ? (
                                      <Badge variant="destructive" className="flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Gecikmiş
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-orange-100 text-orange-800">
                                        {status.paidCount}/{status.totalCount}
                                      </Badge>
                                    )}
                                  </>
                                );
                              } else {
                                return (
                                  <Badge variant="default" className="bg-green-500">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Satıldı
                                  </Badge>
                                );
                              }
                            })()}
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div>
                              <h3 className="font-semibold text-lg flex items-center gap-2">
                                {vehicle.maker || "-"} {vehicle.model || ""}
                                {(() => {
                                  const overdueDays = getInstallmentOverdueDays(vehicle);
                                  if (overdueDays !== null) {
                                    return (
                                      <div className="relative group">
                                        <AlertCircle className="h-4 w-4 text-orange-500" />
                                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-50">
                                          Son taksit ödemesinin üzerinden {overdueDays} gün geçti.
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </h3>
                              {vehicle.production_year && (
                                <p className="text-sm text-muted-foreground">{vehicle.production_year}</p>
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
                                <span className="text-muted-foreground">Peşinat:</span>
                                <div className="font-semibold">
                                  {vehicle.installment ? currency(vehicle.installment.down_payment) : currency(vehicle.sale_price)}
                                </div>
                              </div>
                            </div>
                            {vehicle.installment && vehicle.installment.remaining_balance > 0 && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Kalan Borç: </span>
                                <span className="font-semibold text-orange-600">{currency(vehicle.installment.remaining_balance)}</span>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                const status = getInstallmentStatus(vehicle);
                                if (status.isInstallment) {
                                  if (status.isOverdue) {
                                    return (
                                      <Badge variant="destructive" className="flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Gecikmiş Taksit
                                      </Badge>
                                    );
                                  } else {
                                    return (
                                      <Badge variant="outline" className="bg-orange-100 text-orange-800">
                                        {status.paidCount}/{status.totalCount}
                                      </Badge>
                                    );
                                  }
                                }
                                return null;
                              })()}
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
                                className="flex-1"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Detay
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
        </TabsContent>

        </Tabs>
      </div>

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={openBulkImport}
        onOpenChange={setOpenBulkImport}
        importType={bulkImportType}
        onSuccess={() => {
          fetchVehicles();
        }}
      />

      {/* Quote Dialog */}
      <Dialog open={openQuote} onOpenChange={setOpenQuote}>
        <DialogContent className="max-w-2xl bg-white rounded-xl border border-[#e2e8f0]">
          <DialogHeader>
            <DialogTitle className="text-[#2d3748]">Yeni Teklif Oluştur</DialogTitle>
            <DialogDescription className="text-[#2d3748]/70">
              {selectedVehicle && `${selectedVehicle.maker} ${selectedVehicle.model} ${selectedVehicle.production_year}`} için teklif oluşturun
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#2d3748] mb-2 block">
                  Araç <span className="text-red-500">*</span>
                </label>
                <Input
                  value={selectedVehicle ? `${selectedVehicle.maker} ${selectedVehicle.model} ${selectedVehicle.production_year} - #${selectedVehicle.vehicle_number}` : ""}
                  disabled
                  className="rounded-xl bg-gray-50"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#2d3748] mb-2 block">Müşteri</label>
                <Select
                  value={quoteForm.customer_id || "none"}
                  onValueChange={(value) => setQuoteForm({ ...quoteForm, customer_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Müşteri seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Müşteri seçilmedi</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name} {customer.phone && `- ${customer.phone}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#2d3748] mb-2 block">
                  Teklif Tarihi <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={quoteForm.quote_date}
                  onChange={(e) => setQuoteForm({ ...quoteForm, quote_date: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#2d3748] mb-2 block">
                  Geçerlilik Tarihi <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={quoteForm.valid_until}
                  onChange={(e) => setQuoteForm({ ...quoteForm, valid_until: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#2d3748] mb-2 block">
                  Satış Fiyatı <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={quoteForm.sale_price}
                  onChange={(e) => setQuoteForm({ ...quoteForm, sale_price: e.target.value })}
                  placeholder="0.00"
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#2d3748] mb-2 block">Para Birimi</label>
                <Select
                  value={quoteForm.currency}
                  onValueChange={(value) => setQuoteForm({ ...quoteForm, currency: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-[#2d3748] mb-2 block">Peşinat</label>
                <Input
                  type="number"
                  value={quoteForm.down_payment}
                  onChange={(e) => setQuoteForm({ ...quoteForm, down_payment: e.target.value })}
                  placeholder="0.00"
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#2d3748] mb-2 block">Taksit Sayısı</label>
                <Input
                  type="number"
                  value={quoteForm.installment_count}
                  onChange={(e) => setQuoteForm({ ...quoteForm, installment_count: e.target.value })}
                  placeholder="0"
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#2d3748] mb-2 block">Taksit Tutarı</label>
                <Input
                  type="number"
                  value={quoteForm.installment_amount}
                  onChange={(e) => setQuoteForm({ ...quoteForm, installment_amount: e.target.value })}
                  placeholder="0.00"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#2d3748] mb-2 block">Notlar</label>
              <Input
                value={quoteForm.notes}
                onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                placeholder="Ek notlar..."
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenQuote(false)} className="rounded-xl">
              İptal
            </Button>
            <Button
              onClick={handleCreateQuote}
              className="bg-[#003d82] hover:bg-[#0052a3] text-white rounded-xl"
            >
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehiclesPage;

