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
  FileText, Upload, AlertCircle, FileSpreadsheet, MessageSquare,
  Car, TrendingUp, Pencil, MoreVertical
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
import { useVehiclesData, Vehicle as VehicleType } from "@/hooks/useVehiclesData";
import { VehicleFilters } from "@/components/vehicles/VehicleFilters";
import { VehicleTable } from "@/components/vehicles/VehicleTable";
import { VehicleAddEditModal, VehicleFormData } from "@/components/vehicles/VehicleAddEditModal";
import { VehicleDetailModal } from "@/components/vehicles/VehicleDetailModal";
import { VehicleSellModal, SellFormData } from "@/components/vehicles/VehicleSellModal";
import { VehicleCostModal, CostFormData } from "@/components/vehicles/VehicleCostModal";
import { VehiclePaymentModal, PaymentFormData } from "@/components/vehicles/VehiclePaymentModal";
import { VehicleQuoteModal, QuoteFormData } from "@/components/vehicles/VehicleQuoteModal";
import { VehicleDocumentModal, DocumentFormData } from "@/components/vehicles/VehicleDocumentModal";
import { SoldVehiclesTable } from "@/components/vehicles/SoldVehiclesTable";
import { getInstallmentStatus as getInstallmentStatusUtil, getInstallmentOverdueDays as getInstallmentOverdueDaysUtil } from "@/utils/vehicleUtils";
import { VehicleCost, CostCalculation } from "@/hooks/useVehiclesData";

// Use Vehicle type from hook - alias to avoid conflicts
type Vehicle = VehicleType;

import { useCurrency } from "@/hooks/useCurrency";
import { getApiBaseUrl } from "@/lib/utils";

// Use aliased utility functions
const getInstallmentStatus = getInstallmentStatusUtil;
const getInstallmentOverdueDays = getInstallmentOverdueDaysUtil;

const VehiclesPage = () => {
  const { formatCurrency: currency } = useCurrency();
  const { getCustomRate } = useCurrencyRates();
  const { tenant } = useTenant();
  const baseCurrency = tenant?.default_currency || "TRY";
  const location = useLocation();
  
  // Use the extracted hook for data management
  const vehiclesData = useVehiclesData();
  
  // Local state for modals and forms (not yet extracted)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [soldViewMode, setSoldViewMode] = useState<'table' | 'grid'>('grid');

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
  const [quoteForm, setQuoteForm] = useState<QuoteFormData>({
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
  const [customers, setCustomers] = useState<any[]>([]);
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    installment_sale_id: "",
    payment_type: "installment",
    installment_number: "",
    amount: "",
    currency: "TRY",
    payment_date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  // Note: selectedVehicle is now managed by useVehiclesData hook
  // vehicleCosts and costCalculation are now managed by useVehiclesData hook
  // const [vehicleCosts, setVehicleCosts] = useState<VehicleCost[]>([]);
  // const [costCalculation, setCostCalculation] = useState<CostCalculation | null>(null);
  const [vehicleDocuments, setVehicleDocuments] = useState<any[]>([]);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [documentForm, setDocumentForm] = useState<DocumentFormData>({
    document_type: "contract",
    document_name: "",
    expiry_date: "",
    notes: "",
  });
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);

  // Rapor state'leri

  // Form states
  const [vehicleForm, setVehicleForm] = useState<VehicleFormData>({
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
    sale_currency: "TRY",
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

  const [costForm, setCostForm] = useState<CostFormData>({
    cost_name: "",
    amount: "",
    currency: "TRY",
    date: new Date().toISOString().split('T')[0],
    category: "other",
    customRate: null
  });
  const [editingCost, setEditingCost] = useState<VehicleCost | null>(null);

  const [sellForm, setSellForm] = useState<SellFormData>({
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

  // Note: fetchVehicles and effects are now handled by useVehiclesData hook

  const fetchCustomers = async () => {
    try {
      const response = await api.get("/customers?limit=100");
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error("Failed to fetch customers", error);
    }
  };

  const openQuoteModal = (vehicle: Vehicle) => {
      vehiclesData.setSelectedVehicle(vehicle);
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

  // Note: fetchVehicleDetail is now provided by useVehiclesData hook
  // We use vehiclesData.fetchVehicleDetail directly

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
          id: id,
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
      
      vehiclesData.setCostCalculation(transformedData);
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.message || "Maliyet hesaplanamadı.", 
        variant: "destructive" 
      });
      vehiclesData.setCostCalculation(null);
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
      sale_currency: "TRY",
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
      vehiclesData.fetchVehicles();
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
    if (!vehiclesData.selectedVehicle) return;
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

      await api.put(`/vehicles/${vehiclesData.selectedVehicle!.id}`, payload);
      toast({ title: "Başarılı", description: "Araç güncellendi." });
      setOpenEdit(false);
      setEditModalStep(1);
      resetVehicleForm();
      vehiclesData.fetchVehicles();
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
      vehiclesData.fetchVehicles();
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
      vehiclesData.setSelectedVehicle(vehicle);
      // Modal'ı aç
      setOpenDetail(true);
      // Detayları arka planda yükle
      vehiclesData.fetchVehicleDetail(vehicle.id).catch((error: any) => {
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
    vehiclesData.setSelectedVehicle(vehicle);
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
      sale_currency: vehicle.sale_currency || "TRY",
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
    vehiclesData.setSelectedVehicle(vehicle);
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
    vehiclesData.setSelectedVehicle(vehicle);
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
    if (!vehiclesData.selectedVehicle || !costForm.cost_name || !costForm.amount || !costForm.date) {
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
      await api.post(`/vehicles/${vehiclesData.selectedVehicle!.id}/costs`, payload);
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
      // Always refresh vehicle detail to update costs list in the modal
      if (vehiclesData.selectedVehicle) {
        await vehiclesData.fetchVehicleDetail(vehiclesData.selectedVehicle.id);
      }
      vehiclesData.fetchVehicles();
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.error || e?.response?.data?.message || "Harcama eklenemedi.", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteCost = async (costId: number) => {
    if (!vehiclesData.selectedVehicle) return;
    if (!confirm("Bu harcamayı silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/vehicles/${vehiclesData.selectedVehicle!.id}/costs/${costId}`);
      toast({ title: "Silindi", description: "Harcama silindi." });
      await vehiclesData.fetchVehicleDetail(vehiclesData.selectedVehicle.id);
      vehiclesData.fetchVehicles();
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
    if (!vehiclesData.selectedVehicle || !editingCost || !costForm.cost_name || !costForm.amount || !costForm.date) {
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
      await api.put(`/vehicles/${vehiclesData.selectedVehicle!.id}/costs/${editingCost.id}`, payload);
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
      await vehiclesData.fetchVehicleDetail(vehiclesData.selectedVehicle.id);
      vehiclesData.fetchVehicles();
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.error || e?.response?.data?.message || "Harcama güncellenemedi.", 
        variant: "destructive" 
      });
    }
  };

  const handleSell = async () => {
    if (!vehiclesData.selectedVehicle || !sellForm.customer_name || !sellForm.sale_date) {
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

      await api.post(`/vehicles/${vehiclesData.selectedVehicle!.id}/sell`, payload);
      toast({ title: "Başarılı", description: "Araç satıldı olarak işaretlendi." });
      setOpenSell(false);
      vehiclesData.fetchVehicles();
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.error || e?.response?.data?.message || "Satış işlemi gerçekleştirilemedi.", 
        variant: "destructive" 
      });
    }
  };

  // Note: filteredVehicles and soldVehicles are now provided by useVehiclesData hook

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
      if (vehiclesData.selectedVehicle) {
        await vehiclesData.fetchVehicleDetail(vehiclesData.selectedVehicle.id);
      }
      vehiclesData.fetchVehicles();
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
      if (vehiclesData.selectedVehicle) {
        await vehiclesData.fetchVehicleDetail(vehiclesData.selectedVehicle.id);
      }
      vehiclesData.fetchVehicles();
    } catch (e: any) {
      toast({ 
        title: "Hata", 
        description: e?.response?.data?.error || e?.response?.data?.message || "Ödeme silinemedi.", 
        variant: "destructive" 
      });
    }
  };

  const handleEditPayment = (payment: any) => {
    if (vehiclesData.selectedVehicle?.installment) {
      setEditingPaymentId(payment.id);
      setPaymentForm({
        installment_sale_id: vehiclesData.selectedVehicle.installment.id.toString(),
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

  // Note: vehiclesData.filteredSoldVehicles is now provided by useVehiclesData hook

  // Rapor verilerini yükle

  // Calculate statistics
  const activeVehiclesCount = vehiclesData.filteredVehicles.length;
  const soldVehiclesCount = vehiclesData.filteredSoldVehicles.length;
  const inStockCount = vehiclesData.filteredVehicles.filter(v => !v.is_sold && v.stock_status === 'in_stock').length;

  return (
    <div className="space-y-6">
      <Tabs value={vehiclesData.activeTab} onValueChange={vehiclesData.setActiveTab} className="w-full">
        {/* Search and Filters - Using extracted component */}
        <VehicleFilters
          query={vehiclesData.query}
          setQuery={vehiclesData.setQuery}
          isSoldFilter={vehiclesData.isSoldFilter}
          setIsSoldFilter={vehiclesData.setIsSoldFilter}
          statusFilter={vehiclesData.statusFilter}
          setStatusFilter={vehiclesData.setStatusFilter}
          stockStatusFilter={vehiclesData.stockStatusFilter}
          setStockStatusFilter={vehiclesData.setStockStatusFilter}
          soldVehiclesFilter={vehiclesData.soldVehiclesFilter}
          setSoldVehiclesFilter={vehiclesData.setSoldVehiclesFilter}
          activeTab={vehiclesData.activeTab}
          vehicles={vehiclesData.activeTab === "vehicles" ? vehiclesData.filteredVehicles : vehiclesData.filteredSoldVehicles}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onBulkImportClick={(type) => {
            setBulkImportType(type);
                  setOpenBulkImport(true);
                }}
          onExportClick={() => {
            // Export functionality can be added here
          }}
          onActiveTabChange={(tab) => vehiclesData.setActiveTab(tab)}
          activeVehiclesCount={activeVehiclesCount}
          soldVehiclesCount={soldVehiclesCount}
          addVehicleButton={
            <VehicleAddEditModal
              open={openAdd}
              onOpenChange={(open) => {
                setOpenAdd(open);
                if (!open) {
                  setAddModalStep(1);
                  setFormErrors({});
                } else {
                  setFormErrors({});
                }
              }}
              mode="add"
              vehicleForm={vehicleForm}
              formErrors={formErrors}
              modalStep={addModalStep}
              isSubmitting={isSubmitting}
              currencies={currencies}
              onFormChange={(field, value) => {
                setVehicleForm({ ...vehicleForm, [field]: value });
                if (formErrors[field]) {
                  setFormErrors({ ...formErrors, [field]: "" });
                }
              }}
              onNextStep={handleNextStep}
              onPreviousStep={() => {
                setAddModalStep(1);
                setFormErrors({});
              }}
              onSubmit={handleAddVehicle}
              onReset={resetVehicleForm}
              trigger={
                        <Button 
                          onClick={() => {
                    resetVehicleForm();
                            setAddModalStep(1);
                            setFormErrors({});
                          }}
                  className="gap-2 rounded-xl h-11 bg-[#003d82] hover:bg-[#003d82]/90 text-white shadow-lg"
                        >
                  <Plus className="h-4 w-4" />
                  Yeni Araç Ekle
                        </Button>
              }
            />
          }
        />

        <TabsContent value="vehicles" className="space-y-6">
          {/* Vehicles Table/Grid */}
          <VehicleTable
            vehicles={vehiclesData.filteredVehicles}
            loading={vehiclesData.loading}
            viewMode={viewMode}
            currency={currency}
            onDetailClick={openDetailModal}
            onEditClick={openEditModal}
            onQuoteClick={openQuoteModal}
            onSellClick={openSellModal}
            onDeleteClick={handleDeleteVehicle}
            totalCount={activeVehiclesCount}
            inStockCount={inStockCount}
          />
        </TabsContent>

      {/* Detail Modal */}
      <VehicleDetailModal
        open={openDetail} 
        onOpenChange={setOpenDetail}
        vehicle={vehiclesData.selectedVehicle}
        vehicleCosts={vehiclesData.vehicleCosts}
        costCalculation={vehiclesData.costCalculation}
        vehicleDocuments={vehicleDocuments}
        currency={currency}
        onRefresh={() => {
          if (vehiclesData.selectedVehicle) {
            vehiclesData.fetchVehicleDetail(vehiclesData.selectedVehicle.id);
            vehiclesData.fetchVehicles();
          }
        }}
        onOpenCostModal={() => vehiclesData.selectedVehicle && openCostModal(vehiclesData.selectedVehicle)}
        onOpenEditCostModal={openEditCostModal}
        onDeleteCost={handleDeleteCost}
        onFetchCostCalculation={fetchCostCalculation}
        onOpenDocumentDialog={() => setShowDocumentDialog(true)}
        onFetchDocuments={fetchVehicleDocuments}
        onEditPayment={handleEditPayment}
        onDeletePayment={handleDeletePayment}
        onOpenPaymentModal={() => {
          if (vehiclesData.selectedVehicle?.installment) {
                              setEditingPaymentId(null);
                              setPaymentForm({
              installment_sale_id: vehiclesData.selectedVehicle.installment.id.toString(),
                                payment_type: "installment",
                                installment_number: "",
              amount: vehiclesData.selectedVehicle.installment.installment_amount.toString(),
              currency: vehiclesData.selectedVehicle.installment.currency,
                                payment_date: new Date().toISOString().split('T')[0],
                                notes: ""
                              });
                              setOpenPayment(true);
                            }
                          }}
      />

      {/* Edit Modal */}
      <VehicleAddEditModal
        open={openEdit}
        onOpenChange={(open) => {
        setOpenEdit(open);
        if (!open) {
          setEditModalStep(1);
          setFormErrors({});
        } else {
          setFormErrors({});
        }
        }}
        mode="edit"
        vehicleForm={vehicleForm}
        formErrors={formErrors}
        modalStep={editModalStep}
        isSubmitting={isSubmitting}
        currencies={currencies}
        onFormChange={(field, value) => {
          setVehicleForm({ ...vehicleForm, [field]: value });
          if (formErrors[field]) {
            setFormErrors({ ...formErrors, [field]: "" });
          }
        }}
        onNextStep={() => setEditModalStep(2)}
        onPreviousStep={() => {
                    setEditModalStep(1);
                    setFormErrors({});
                  }}
        onSubmit={handleEditVehicle}
        onReset={resetVehicleForm}
              />

      {/* Cost Modal */}
      <VehicleCostModal
        open={openCost || openEditCost}
        onOpenChange={(open) => {
          if (!open) {
            setOpenCost(false);
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
          }
        }}
        mode={openEditCost ? 'edit' : 'add'}
        costForm={costForm}
        onFormChange={(field, value) => {
          setCostForm({ ...costForm, [field]: value });
        }}
        onSubmit={openEditCost ? handleUpdateCost : handleAddCost}
        onCancel={() => {
          setOpenCost(false);
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
        }}
        defaultCostItems={defaultCostItems}
        costCategories={costCategories}
        currencies={currencies}
      />

      {/* Sell Modal */}
      <VehicleSellModal
        open={openSell}
        onOpenChange={setOpenSell}
        vehicle={vehiclesData.selectedVehicle}
        sellForm={sellForm}
        onFormChange={(field, value) => {
          setSellForm({ ...sellForm, [field]: value });
        }}
        onSubmit={handleSell}
        currencies={currencies}
      />

      {/* Payment Modal */}
      <VehiclePaymentModal
        open={openPayment}
        onOpenChange={(open) => {
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
        }}
        mode={editingPaymentId ? 'edit' : 'add'}
        paymentForm={paymentForm}
        onFormChange={(field, value) => {
          setPaymentForm({ ...paymentForm, [field]: value });
        }}
        onSubmit={handleAddPayment}
        onCancel={() => {
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
        }}
        currencies={currencies}
      />

      {/* Document Upload Dialog */}
      <VehicleDocumentModal
        open={showDocumentDialog}
        onOpenChange={setShowDocumentDialog}
        vehicle={vehiclesData.selectedVehicle}
        documentForm={documentForm}
        selectedFile={selectedDocumentFile}
        onFormChange={(field, value) => {
          setDocumentForm({ ...documentForm, [field]: value });
        }}
        onFileChange={(file) => setSelectedDocumentFile(file)}
        onSubmit={async () => {
          if (!documentForm.document_name || !selectedDocumentFile || !vehiclesData.selectedVehicle) {
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

            await api.post(`/documents/vehicles/${vehiclesData.selectedVehicle.id}`, formData, {
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
            await fetchVehicleDocuments(vehiclesData.selectedVehicle.id);
                  } catch (error: any) {
                    toast({
                      title: "Hata",
                      description: error?.response?.data?.error || "Belge yüklenemedi",
                      variant: "destructive",
                    });
                  }
                }}
      />

        <TabsContent value="sold" className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex gap-1 border rounded-xl p-1 bg-gray-50">
                            <Button
                  variant={soldViewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setSoldViewMode("grid")}
                  className="h-9 w-9 rounded-lg"
                            >
                  <Grid3x3 className="h-4 w-4" />
                            </Button>
                              <Button
                  variant={soldViewMode === "table" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setSoldViewMode("table")}
                  className="h-9 w-9 rounded-lg"
                              >
                  <List className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                </div>

          {/* Sold Vehicles Table/Grid */}
          <SoldVehiclesTable
            vehicles={vehiclesData.filteredSoldVehicles}
            loading={vehiclesData.loading}
            viewMode={soldViewMode}
            currency={currency}
            onDetailClick={openDetailModal}
            onViewModeChange={(mode) => setSoldViewMode(mode)}
          />
        </TabsContent>
        </Tabs>

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={openBulkImport}
        onOpenChange={setOpenBulkImport}
        importType={bulkImportType}
        onSuccess={() => {
          vehiclesData.fetchVehicles();
        }}
      />

      {/* Quote Dialog */}
      <VehicleQuoteModal
        open={openQuote}
        onOpenChange={setOpenQuote}
        vehicle={vehiclesData.selectedVehicle}
        quoteForm={quoteForm}
        customers={customers}
        onFormChange={(field, value) => {
          setQuoteForm({ ...quoteForm, [field]: value });
        }}
        onSubmit={handleCreateQuote}
      />
    </div>
  );
};

export default VehiclesPage;

