import React, { useEffect, useState } from "react";
import { api, getToken } from "@/api";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Phone,
  MessageSquare,
  Car,
  User,
  Edit,
  ArrowLeft,
  Mail,
  MapPin,
  CheckCircle,
  FileText,
  Upload,
  Trash2,
  Star,
  Eye,
  ArrowRight,
  Download,
  Bell,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { useTenant } from "@/contexts/TenantContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  total_spent_base: number;
  sale_count: number;
  last_sale_date: string | null;
  first_sale_date: string | null;
  created_at: string;
}

interface VehicleSale {
  id: number;
  customer_name: string;
  customer_phone: string | null;
  sale_amount: number;
  sale_currency: string;
  sale_fx_rate_to_base: number;
  sale_date: string;
  plate_number: string | null;
  maker: string | null;
  model: string | null;
  year: number | null;
  chassis_no: string | null;
  primary_image_url: string | null;
  branch_name: string | null;
  staff_name: string | null;
  vehicle_id?: number | null;
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
}

const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const { tenant } = useTenant();
  const targetCurrency = tenant?.default_currency || "TRY";
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [convertedTotalSpent, setConvertedTotalSpent] = useState<number | null>(null);
  const [sales, setSales] = useState<VehicleSale[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [openQuoteDialog, setOpenQuoteDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [followups, setFollowups] = useState<any[]>([]);
  const [customerDocuments, setCustomerDocuments] = useState<any[]>([]);
  const [showFollowupDialog, setShowFollowupDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [followupForm, setFollowupForm] = useState({
    sale_id: "",
    vehicle_id: "",
    followup_type: "call",
    followup_date: new Date().toISOString().split("T")[0],
    followup_time: "",
    notes: "",
    next_followup_date: "",
  });
  const [documentForm, setDocumentForm] = useState({
    document_type: "id_card",
    document_name: "",
    expiry_date: "",
    notes: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);


  const fetchCustomer = async (customerId: string) => {
    try {
      const res = await api.get(`/customers/${customerId}`);
      if (res.data) {
        const apiCustomer = res.data.customer || {};
        const apiSales: any[] = res.data.sales || [];

        setCustomer({
          ...apiCustomer,
          total_spent_base: Number(apiCustomer.total_spent_base) || 0,
          sale_count: Number(apiCustomer.sale_count) || 0,
        } as Customer);
        setSales(apiSales);
        
        // Convert customer's total spent to target currency
        if (apiSales && apiSales.length > 0) {
          try {
            // Get all sale dates for conversion
            const saleDates = apiSales
              .map((sale: any) => sale.sale_date)
              .filter(Boolean);
            
            if (saleDates.length > 0) {
              const minDate = saleDates.reduce((a: string, b: string) => a < b ? a : b);
              const maxDate = saleDates.reduce((a: string, b: string) => a > b ? a : b);
              
              // Convert all customer's sales to target currency
              const convertRes = await api.post("/accounting/convert-incomes", {
                target_currency: targetCurrency,
                startDate: minDate,
                endDate: maxDate,
              });
              
              // Filter conversion details for this customer's sales (vehicle_sales.id matches)
              const customerSaleIds = apiSales.map((s: any) => s.id).filter((id: any) => id !== null && id !== undefined);
              const customerConvertedTotal = convertRes.data.conversion_details
                .filter((detail: any) => detail.type === 'vehicle_sale' && customerSaleIds.includes(detail.id))
                .reduce((sum: number, detail: any) => sum + (Number(detail.converted_amount) || 0), 0);
              
              setConvertedTotalSpent(customerConvertedTotal);
            }
          } catch (convertError) {
            console.error("Failed to convert customer total spent:", convertError);
            setConvertedTotalSpent(null);
          }
        } else {
          setConvertedTotalSpent(null);
        }
        setEditForm({
          name: apiCustomer.name || "",
          phone: apiCustomer.phone || "",
          email: apiCustomer.email || "",
          address: apiCustomer.address || "",
          notes: apiCustomer.notes || "",
        });
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error("fetchCustomer hatası:", error);
      setNotFound(true);
    }
  };

  const fetchFollowups = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/followups`, { params: { customer_id: id } });
      setFollowups(res.data || []);
    } catch (error) {
      console.error("Followups fetch error:", error);
    }
  };

  const fetchCustomerQuotes = async () => {
    if (!id) return;
    try {
      const response = await api.get(`/quotes?customer_id=${id}&limit=100`);
      setQuotes(response.data.quotes || []);
    } catch (error) {
      console.error("Failed to fetch quotes", error);
    }
  };

  const fetchCustomerDocuments = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/documents/customers/${id}`);
      setCustomerDocuments(res.data || []);
    } catch (error) {
      console.error("Documents fetch error:", error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCustomer(id);
      fetchFollowups();
      fetchCustomerDocuments();
      fetchCustomerQuotes();
    }
  }, [id]);

  const handleUpdateCustomer = async () => {
    if (!id) return;
    try {
      await api.put(`/customers/${id}`, editForm);
      await fetchCustomer(id);
      setShowEditDialog(false);
      toast({
        title: "Başarılı",
        description: "Müşteri bilgileri güncellendi",
      });
    } catch (error: any) {
      console.error("Müşteri güncelleme hatası:", error);
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Müşteri güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "-";
    return format(new Date(isoString), "dd MMMM yyyy", { locale: tr });
  };

  // Tarih formatlama fonksiyonu: 2025-12-04T21:00:00.000Z -> 4/12/2025 21:00
  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return "-";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      return dateString;
    }
  };

  const getCustomerSegment = (totalSpent: number, saleCount: number) => {
    if (totalSpent > 50000 && saleCount > 3) return { name: "VIP", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400" };
    if (totalSpent > 10000 && saleCount > 1) return { name: "Düzenli", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400" };
    return { name: "Yeni", color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" };
  };

  const downloadPDF = async (saleId: number, type: "contract" | "invoice") => {
    try {
      const token = getToken();
      const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5005/api";
      const endpoint = type === "contract" ? `/documents/sales-contract/${saleId}` : `/documents/invoice/${saleId}`;
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("PDF indirilemedi");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type === "contract" ? "satis-sozlesmesi" : "fatura"}-${saleId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Başarılı",
        description: `${type === "contract" ? "Satış sözleşmesi" : "Fatura"} indirildi`,
      });
    } catch (error: any) {
      console.error("PDF indirme hatası:", error);
      toast({
        title: "Hata",
        description: error?.message || "PDF indirilemedi",
        variant: "destructive",
      });
    }
  };

  if (notFound) {
    return (
      <div className="p-6 bg-background min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Müşteri Bulunamadı</h1>
          <Button onClick={() => navigate("/customers")} className="bg-primary hover:bg-primary/90">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri Dön
          </Button>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 bg-background min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-foreground mt-4">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const displayTotalSpent = convertedTotalSpent !== null ? convertedTotalSpent : customer.total_spent_base;
  const segment = getCustomerSegment(displayTotalSpent, customer.sale_count);
  const averageSaleAmount = customer.sale_count > 0 ? displayTotalSpent / customer.sale_count : 0;

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate("/customers")} className="text-muted-foreground hover:text-foreground hover:bg-accent">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-card-foreground">{customer.name}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Müşteri Detayları</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={segment.color}>{segment.name}</Badge>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowEditDialog(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Düzenle
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-2">Toplam Harcama</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(convertedTotalSpent !== null ? convertedTotalSpent : customer.total_spent_base)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-2">Toplam Satış</p>
              <p className="text-2xl font-bold text-primary">{customer.sale_count}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-2">Ortalama Satış</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(averageSaleAmount)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-2">İlk Satış</p>
              <p className="text-lg font-bold text-info">{customer.first_sale_date ? formatDate(customer.first_sale_date) : "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-2">Son Satış</p>
              <p className="text-lg font-bold text-info">{customer.last_sale_date ? formatDate(customer.last_sale_date) : "-"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2 text-primary" />
                Müşteri Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <a href={`tel:${customer.phone}`} className="text-gray-600 dark:text-gray-400 hover:text-primary">
                    {customer.phone}
                  </a>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <a href={`mailto:${customer.email}`} className="text-gray-600 dark:text-gray-400 hover:text-primary">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">{customer.address}</span>
                </div>
              )}
              {customer.notes && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{customer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Communication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-primary" />
                İletişim
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.phone && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(`tel:${customer.phone}`, "_self")}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Ara
                </Button>
              )}
              {customer.email && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(`mailto:${customer.email}`, "_self")}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  E-posta Gönder
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs - Sales, Followups, Documents */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <Tabs defaultValue="sales" className="w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Car className="w-5 h-5 mr-2 text-primary" />
                    Müşteri Detayları
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="sales">Satışlar</TabsTrigger>
                  <TabsTrigger value="quotes">Teklifler</TabsTrigger>
                  <TabsTrigger value="followups">Satış Sonrası Takip</TabsTrigger>
                  <TabsTrigger value="documents">Belgeler</TabsTrigger>
                </TabsList>

                {/* Sales Tab */}
                <TabsContent value="sales" className="space-y-4">
                  {sales.length > 0 ? (
                    sales.map((sale) => (
                      <div key={sale.id} className="flex items-start gap-4 p-4 bg-accent/50 rounded-lg border border-border">
                        <div className="flex-shrink-0">
                          {sale.primary_image_url ? (
                            <img
                              src={sale.primary_image_url.startsWith('http') 
                                ? sale.primary_image_url 
                                : sale.primary_image_url.startsWith('/uploads')
                                ? `${getApiBaseUrl()}${sale.primary_image_url}`
                                : sale.primary_image_url}
                              alt={`${sale.maker} ${sale.model}`}
                              className="w-24 h-24 object-cover rounded-lg"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                              <Car className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-card-foreground text-lg">
                                {sale.maker && sale.model ? `${sale.maker} ${sale.model}` : "Araç Satışı"}
                                {sale.year && ` (${sale.year})`}
                              </h4>
                              {sale.chassis_no && (
                                <p className="text-sm text-muted-foreground mt-1">Şasi: {sale.chassis_no}</p>
                              )}
                            </div>
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              {formatCurrency(sale.sale_amount * sale.sale_fx_rate_to_base)}
                            </Badge>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 space-x-4 flex-wrap gap-2">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(sale.sale_date)}
                            </div>
                            {sale.plate_number && (
                              <div className="flex items-center">
                                <span>Plaka: {sale.plate_number}</span>
                              </div>
                            )}
                            {sale.branch_name && (
                              <div className="flex items-center">
                                <span>Şube: {sale.branch_name}</span>
                              </div>
                            )}
                            {sale.staff_name && (
                              <div className="flex items-center">
                                <User className="w-4 h-4 mr-1" />
                                {sale.staff_name}
                              </div>
                            )}
                          </div>
                          {/* PDF Download Buttons */}
                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadPDF(sale.id, "contract")}
                              className="rounded-xl border-[#003d82] text-[#003d82] hover:bg-[#003d82] hover:text-white"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Sözleşme İndir
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadPDF(sale.id, "invoice")}
                              className="rounded-xl border-[#F0A500] text-[#F0A500] hover:bg-[#F0A500] hover:text-white"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Fatura İndir
                            </Button>
                          </div>
                          {/* Taksitli Satış Bilgileri */}
                          {sale.installment && (
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold">Taksitli Satış Bilgileri</h3>
                                <div className="flex items-center gap-2">
                                  {sale.installment.status === 'active' && sale.installment.remaining_balance > 0 && (
                                    <>
                                      <Badge variant="outline" className="bg-orange-100 text-orange-800">
                                        Kalan Borç: {formatCurrency(sale.installment.remaining_balance)}
                                      </Badge>
                                      {sale.installment_sale_id && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={async () => {
                                            try {
                                              await api.post(`/installments/${sale.installment_sale_id}/send-reminder`, {
                                                send_email: true,
                                                send_sms: false,
                                              });
                                              toast({
                                                title: "Başarılı",
                                                description: "Hatırlatma gönderildi",
                                              });
                                            } catch (error: any) {
                                              toast({
                                                title: "Hata",
                                                description: error?.response?.data?.error || "Hatırlatma gönderilemedi",
                                                variant: "destructive",
                                              });
                                            }
                                          }}
                                          className="rounded-xl border-[#F0A500] text-[#F0A500] hover:bg-[#F0A500] hover:text-white"
                                        >
                                          <Bell className="h-4 w-4 mr-2" />
                                          Hatırlatma Gönder
                                        </Button>
                                      )}
                                    </>
                                  )}
                                  {sale.installment.status === 'completed' && (
                                    <Badge variant="outline" className="bg-green-100 text-green-800">
                                      Tamamlandı
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div><strong>Toplam Satış Fiyatı:</strong> {formatCurrency(sale.installment.total_amount)}</div>
                                <div><strong>Peşinat:</strong> {formatCurrency(sale.installment.down_payment)}</div>
                                <div><strong>Taksit Sayısı:</strong> {sale.installment.installment_count}</div>
                                <div><strong>Taksit Tutarı:</strong> {formatCurrency(sale.installment.installment_amount)}</div>
                                <div><strong>Ödenen Toplam:</strong> {formatCurrency(sale.installment.total_paid)}</div>
                                <div><strong>Kalan Borç:</strong> 
                                  <span className={sale.installment.remaining_balance > 0 ? "text-orange-600 font-semibold ml-2" : "text-green-600 font-semibold ml-2"}>
                                    {sale.installment.remaining_balance > 0 
                                      ? formatCurrency(sale.installment.remaining_balance) 
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
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sale.installment.payments && sale.installment.payments.length > 0 ? (
                                      sale.installment.payments.map((payment: any) => (
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
                                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                                          <TableCell>{payment.notes || '-'}</TableCell>
                                        </TableRow>
                                      ))
                                    ) : (
                                      <TableRow>
                                        <TableCell colSpan={5} className="text-center">Ödeme kaydı bulunamadı.</TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Henüz satış kaydı bulunmuyor</p>
                    </div>
                  )}
                </TabsContent>

                {/* Quotes Tab */}
                <TabsContent value="quotes" className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-[#2d3748]">Müşteri Teklifleri</h3>
                    <Button
                      onClick={() => navigate(`/quotes`)}
                      className="bg-[#F0A500] hover:bg-[#d89400] text-white rounded-xl"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Yeni Teklif
                    </Button>
                  </div>
                  {quotes.length === 0 ? (
                    <Card className="bg-white rounded-xl border border-[#e2e8f0]">
                      <CardContent className="p-8 text-center">
                        <FileText className="h-12 w-12 text-[#2d3748]/40 mx-auto mb-4" />
                        <p className="text-[#2d3748]/60">Bu müşteri için henüz teklif oluşturulmamış.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {quotes.map((quote) => (
                        <Card key={quote.id} className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-semibold text-[#2d3748]">{quote.quote_number}</h4>
                                  <Badge
                                    className={`rounded-xl px-2 py-0.5 text-xs ${
                                      quote.status === "approved"
                                        ? "bg-green-600 text-white"
                                        : quote.status === "rejected"
                                        ? "bg-red-500 text-white"
                                        : quote.status === "sent"
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-500 text-white"
                                    }`}
                                  >
                                    {quote.status === "approved"
                                      ? "Onaylandı"
                                      : quote.status === "rejected"
                                      ? "Reddedildi"
                                      : quote.status === "sent"
                                      ? "Gönderildi"
                                      : "Taslak"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-[#2d3748] mb-1">
                                  <strong>Araç:</strong> {quote.maker} {quote.model} {quote.production_year}
                                </p>
                                <p className="text-lg font-bold text-[#003d82] mb-1">
                                  {formatCurrency(quote.sale_price * quote.fx_rate_to_base)}
                                </p>
                                <div className="flex gap-4 text-xs text-[#2d3748]/60">
                                  <span>
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    {format(new Date(quote.quote_date), "dd MMM yyyy", { locale: tr })}
                                  </span>
                                  <span>
                                    Geçerlilik: {format(new Date(quote.valid_until), "dd MMM yyyy", { locale: tr })}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/quotes`)}
                                  className="rounded-xl"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {quote.status === "approved" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(`/quotes`)}
                                    className="rounded-xl text-green-600 hover:text-green-700"
                                    title="Satışa Dönüştür"
                                  >
                                    <ArrowRight className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Followups Tab */}
                <TabsContent value="followups" className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Satış Sonrası Takip</h3>
                    <Button onClick={() => setShowFollowupDialog(true)} size="sm">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Yeni Takip
                    </Button>
                  </div>
                  {followups.length > 0 ? (
                    <div className="space-y-3">
                      {followups.map((followup) => (
                        <div key={followup.id} className="p-4 bg-accent/50 rounded-lg border border-border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  variant={
                                    followup.status === "completed"
                                      ? "default"
                                      : followup.status === "cancelled"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                >
                                  {followup.status === "completed" ? "Tamamlandı" : followup.status === "cancelled" ? "İptal" : "Bekliyor"}
                                </Badge>
                                <Badge variant="outline">{followup.followup_type}</Badge>
                                {followup.satisfaction_score && (
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-4 h-4 ${
                                          i < followup.satisfaction_score
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "text-gray-300"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                {formatDate(followup.followup_date)}
                                {followup.followup_time && ` - ${followup.followup_time}`}
                              </p>
                              {followup.notes && <p className="text-sm mt-2">{followup.notes}</p>}
                              {followup.feedback && (
                                <p className="text-sm mt-2 italic text-muted-foreground">"{followup.feedback}"</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Henüz takip kaydı bulunmuyor</p>
                    </div>
                  )}
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Müşteri Belgeleri</h3>
                    <Button onClick={() => setShowDocumentDialog(true)} size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Belge Yükle
                    </Button>
                  </div>
                  {customerDocuments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {customerDocuments.map((doc) => (
                        <div key={doc.id} className="p-4 bg-accent/50 rounded-lg border border-border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-5 h-5 text-primary" />
                                <h4 className="font-semibold">{doc.document_name}</h4>
                                {doc.is_verified ? (
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                    Doğrulandı
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Doğrulanmadı</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                {doc.document_type === "id_card"
                                  ? "Kimlik"
                                  : doc.document_type === "driving_license"
                                  ? "Ehliyet"
                                  : doc.document_type === "passport"
                                  ? "Pasaport"
                                  : doc.document_type}
                              </p>
                              {doc.expiry_date && (
                                <p className="text-xs text-muted-foreground">
                                  Son Geçerlilik: {formatDate(doc.expiry_date)}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`${getApiBaseUrl()}${doc.file_path}`, "_blank")}
                              >
                                Görüntüle
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (confirm("Bu belgeyi silmek istediğinize emin misiniz?")) {
                                    try {
                                      await api.delete(`/documents/customers/${doc.id}`);
                                      fetchCustomerDocuments();
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
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Henüz belge yüklenmemiş</p>
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Edit Customer Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Müşteri Düzenle</DialogTitle>
            <DialogDescription>Müşteri bilgilerini güncelleyin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Ad Soyad *</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Müşteri adı"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Telefon</label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="Telefon numarası"
              />
            </div>
            <div>
              <label className="text-sm font-medium">E-posta</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="E-posta adresi"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Adres</label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                placeholder="Adres"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notlar</label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Müşteri notları"
                rows={4}
              />
            </div>
            <div className="flex space-x-3 pt-4 border-t">
              <Button onClick={handleUpdateCustomer} className="flex-1">
                Güncelle
              </Button>
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Followup Dialog */}
      <Dialog open={showFollowupDialog} onOpenChange={setShowFollowupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Takip Oluştur</DialogTitle>
            <DialogDescription>Satış sonrası takip görevi oluşturun</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Satış *</label>
              <Select
                value={followupForm.sale_id}
                onValueChange={(value) => {
                  const sale = sales.find((s) => s.id.toString() === value);
                  setFollowupForm({
                    ...followupForm,
                    sale_id: value,
                    vehicle_id: sale?.id?.toString() || "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Satış seçin" />
                </SelectTrigger>
                <SelectContent>
                  {sales.map((sale) => (
                    <SelectItem key={sale.id} value={sale.id.toString()}>
                      {sale.maker} {sale.model} - {formatDate(sale.sale_date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Takip Türü *</label>
              <Select
                value={followupForm.followup_type}
                onValueChange={(value) => setFollowupForm({ ...followupForm, followup_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Telefon</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">E-posta</SelectItem>
                  <SelectItem value="visit">Ziyaret</SelectItem>
                  <SelectItem value="other">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tarih *</label>
                <Input
                  type="date"
                  value={followupForm.followup_date}
                  onChange={(e) => setFollowupForm({ ...followupForm, followup_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Saat</label>
                <Input
                  type="time"
                  value={followupForm.followup_time}
                  onChange={(e) => setFollowupForm({ ...followupForm, followup_time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notlar</label>
              <Textarea
                value={followupForm.notes}
                onChange={(e) => setFollowupForm({ ...followupForm, notes: e.target.value })}
                placeholder="Takip notları"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Sonraki Takip Tarihi</label>
              <Input
                type="date"
                value={followupForm.next_followup_date}
                onChange={(e) => setFollowupForm({ ...followupForm, next_followup_date: e.target.value })}
              />
            </div>
            <div className="flex space-x-3 pt-4 border-t">
              <Button
                onClick={async () => {
                  if (!followupForm.sale_id || !followupForm.followup_date) {
                    toast({
                      title: "Uyarı",
                      description: "Satış ve tarih zorunludur",
                      variant: "destructive",
                    });
                    return;
                  }
                  try {
                    const sale = sales.find((s) => s.id.toString() === followupForm.sale_id);
                    await api.post("/followups", {
                      ...followupForm,
                      customer_id: id,
                      vehicle_id: sale?.id || followupForm.vehicle_id,
                    });
                    toast({ title: "Başarılı", description: "Takip oluşturuldu" });
                    setShowFollowupDialog(false);
                    setFollowupForm({
                      sale_id: "",
                      vehicle_id: "",
                      followup_type: "call",
                      followup_date: new Date().toISOString().split("T")[0],
                      followup_time: "",
                      notes: "",
                      next_followup_date: "",
                    });
                    fetchFollowups();
                  } catch (error: any) {
                    toast({
                      title: "Hata",
                      description: error?.response?.data?.error || "Takip oluşturulamadı",
                      variant: "destructive",
                    });
                  }
                }}
                className="flex-1"
              >
                Oluştur
              </Button>
              <Button variant="outline" onClick={() => setShowFollowupDialog(false)} className="flex-1">
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Upload Dialog */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Belge Yükle</DialogTitle>
            <DialogDescription>Müşteri belgesi yükleyin (Kimlik, Ehliyet, vb.)</DialogDescription>
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
                  <SelectItem value="id_card">Kimlik</SelectItem>
                  <SelectItem value="driving_license">Ehliyet</SelectItem>
                  <SelectItem value="passport">Pasaport</SelectItem>
                  <SelectItem value="address_proof">Adres Belgesi</SelectItem>
                  <SelectItem value="bank_statement">Banka Ekstresi</SelectItem>
                  <SelectItem value="other">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Belge Adı *</label>
              <Input
                value={documentForm.document_name}
                onChange={(e) => setDocumentForm({ ...documentForm, document_name: e.target.value })}
                placeholder="Örn: Kimlik Ön Yüz"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Dosya *</label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                {selectedFile && (
                  <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
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
              <Textarea
                value={documentForm.notes}
                onChange={(e) => setDocumentForm({ ...documentForm, notes: e.target.value })}
                placeholder="Belge hakkında notlar"
                rows={3}
              />
            </div>
            <div className="flex space-x-3 pt-4 border-t">
              <Button
                onClick={async () => {
                  if (!documentForm.document_name || !selectedFile) {
                    toast({
                      title: "Uyarı",
                      description: "Belge adı ve dosya zorunludur",
                      variant: "destructive",
                    });
                    return;
                  }
                  try {
                    const formData = new FormData();
                    formData.append("file", selectedFile);
                    formData.append("document_type", documentForm.document_type);
                    formData.append("document_name", documentForm.document_name);
                    if (documentForm.expiry_date) formData.append("expiry_date", documentForm.expiry_date);
                    if (documentForm.notes) formData.append("notes", documentForm.notes);

                    await api.post(`/documents/customers/${id}`, formData, {
                      headers: { "Content-Type": "multipart/form-data" },
                    });
                    toast({ title: "Başarılı", description: "Belge yüklendi" });
                    setShowDocumentDialog(false);
                    setDocumentForm({
                      document_type: "id_card",
                      document_name: "",
                      expiry_date: "",
                      notes: "",
                    });
                    setSelectedFile(null);
                    fetchCustomerDocuments();
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
    </div>
  );
};

export default CustomerDetails;

