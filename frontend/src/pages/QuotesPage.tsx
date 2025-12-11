import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  FileText,
  Eye,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useCurrency } from "@/hooks/useCurrency";
import { useTenant } from "@/contexts/TenantContext";

type Quote = {
  id: number;
  quote_number: string;
  vehicle_id: number;
  customer_id: number | null;
  quote_date: string;
  valid_until: string;
  sale_price: number;
  currency: string;
  fx_rate_to_base: number;
  down_payment: number | null;
  installment_count: number | null;
  installment_amount: number | null;
  status: "draft" | "sent" | "approved" | "rejected" | "expired" | "converted";
  notes: string | null;
  maker: string | null;
  model: string | null;
  production_year: number | null;
  chassis_no: string | null;
  vehicle_number: number | null;
  customer_name_full: string | null;
  customer_phone_full: string | null;
  created_by_name: string | null;
};

type Vehicle = {
  id: number;
  vehicle_number: number | null;
  maker: string | null;
  model: string | null;
  production_year: number | null;
  chassis_no: string | null;
  sale_price: number | null;
};

type Customer = {
  id: number;
  name: string;
  phone: string | null;
};

export default function QuotesPage() {
  const { formatCurrency: currency } = useCurrency();
  const { tenant } = useTenant();
  const locale = tenant?.language === "en" ? "en-US" : "tr-TR";
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [openConvert, setOpenConvert] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

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

  useEffect(() => {
    fetchQuotes();
    fetchVehicles();
    fetchCustomers();
  }, [pagination.page, statusFilter, query]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: "50",
      });
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

      const response = await api.get(`/quotes?${params}`);
      setQuotes(response.data.quotes || []);
      setPagination(response.data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Teklifler yüklenemedi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await api.get("/vehicles?limit=100&is_sold=false");
      setVehicles(response.data.vehicles || []);
    } catch (error) {
      console.error("Failed to fetch vehicles", error);
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
        customer_id: quoteForm.customer_id === "none" ? "" : quoteForm.customer_id,
      };
      await api.post("/quotes", payload);
      toast({
        title: "Başarılı",
        description: "Teklif oluşturuldu.",
      });
      setOpenAdd(false);
      resetForm();
      fetchQuotes();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Teklif oluşturulamadı.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateQuote = async () => {
    if (!selectedQuote) return;

    try {
      const payload = {
        ...quoteForm,
        customer_id: quoteForm.customer_id === "none" ? "" : quoteForm.customer_id,
      };
      await api.put(`/quotes/${selectedQuote.id}`, payload);
      toast({
        title: "Başarılı",
        description: "Teklif güncellendi.",
      });
      setOpenEdit(false);
      resetForm();
      fetchQuotes();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Teklif güncellenemedi.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuote = async (id: number) => {
    if (!confirm("Bu teklifi silmek istediğinize emin misiniz?")) return;

    try {
      await api.delete(`/quotes/${id}`);
      toast({
        title: "Başarılı",
        description: "Teklif silindi.",
      });
      fetchQuotes();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Teklif silinemedi.",
        variant: "destructive",
      });
    }
  };

  const handleApproveQuote = async (id: number) => {
    try {
      await api.put(`/quotes/${id}`, { status: "approved" });
      toast({
        title: "Başarılı",
        description: "Teklif onaylandı.",
      });
      fetchQuotes();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Teklif onaylanamadı.",
        variant: "destructive",
      });
    }
  };

  const handleRejectQuote = async (id: number) => {
    try {
      await api.put(`/quotes/${id}`, { status: "rejected" });
      toast({
        title: "Başarılı",
        description: "Teklif reddedildi.",
      });
      fetchQuotes();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Teklif reddedilemedi.",
        variant: "destructive",
      });
    }
  };

  const handleConvertToSale = async () => {
    if (!selectedQuote) return;

    try {
      await api.post(`/quotes/${selectedQuote.id}/convert-to-sale`, {
        sale_date: new Date().toISOString().split("T")[0],
      });
      toast({
        title: "Başarılı",
        description: "Teklif satışa dönüştürüldü.",
      });
      setOpenConvert(false);
      fetchQuotes();
      navigate("/vehicles");
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Teklif satışa dönüştürülemedi.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
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
  };

  const openEditModal = (quote: Quote) => {
    setSelectedQuote(quote);
    setQuoteForm({
      vehicle_id: quote.vehicle_id.toString(),
      customer_id: quote.customer_id?.toString() || "none",
      quote_date: quote.quote_date,
      valid_until: quote.valid_until,
      sale_price: quote.sale_price.toString(),
      currency: quote.currency,
      down_payment: quote.down_payment?.toString() || "",
      installment_count: quote.installment_count?.toString() || "",
      installment_amount: quote.installment_amount?.toString() || "",
      notes: quote.notes || "",
      status: quote.status === "converted" || quote.status === "expired" ? "draft" : quote.status,
    });
    setOpenEdit(true);
  };

  const openDetailModal = async (quote: Quote) => {
    try {
      const response = await api.get(`/quotes/${quote.id}`);
      setSelectedQuote(response.data);
      setOpenDetail(true);
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Teklif detayı yüklenemedi.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: "Taslak", className: "bg-gray-500 text-white" },
      sent: { label: "Gönderildi", className: "bg-blue-500 text-white" },
      approved: { label: "Onaylandı", className: "bg-green-600 text-white" },
      rejected: { label: "Reddedildi", className: "bg-red-500 text-white" },
      expired: { label: "Süresi Doldu", className: "bg-orange-500 text-white" },
      converted: { label: "Satışa Dönüştü", className: "bg-[#003d82] text-white" },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <Badge className={`${config.className} rounded-xl px-2 py-0.5 text-xs`}>
        {config.label}
      </Badge>
    );
  };

  const filteredQuotes = quotes.filter((quote) => {
    if (query) {
      const searchTerm = query.toLowerCase();
      return (
        quote.quote_number.toLowerCase().includes(searchTerm) ||
        quote.maker?.toLowerCase().includes(searchTerm) ||
        quote.model?.toLowerCase().includes(searchTerm) ||
        quote.customer_name_full?.toLowerCase().includes(searchTerm)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2d3748]">Teklif Yönetimi</h1>
          <p className="text-sm text-[#2d3748]/60 mt-1">
            Araç satış tekliflerini oluşturun, yönetin ve takip edin
          </p>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              className="bg-[#F0A500] hover:bg-[#d89400] text-white rounded-xl shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Teklif
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-white rounded-xl border border-[#e2e8f0]">
            <DialogHeader>
              <DialogTitle className="text-[#2d3748]">Yeni Teklif Oluştur</DialogTitle>
              <DialogDescription className="text-[#2d3748]/70">
                Müşteriye gönderilecek satış teklifini oluşturun
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#2d3748] mb-2 block">
                    Araç <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={quoteForm.vehicle_id}
                    onValueChange={(value) => {
                      setQuoteForm({ ...quoteForm, vehicle_id: value });
                      const vehicle = vehicles.find((v) => v.id === Number(value));
                      if (vehicle?.sale_price) {
                        setQuoteForm((prev) => ({
                          ...prev,
                          sale_price: vehicle.sale_price!.toString(),
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Araç seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                          {vehicle.maker} {vehicle.model} {vehicle.production_year} - #{vehicle.vehicle_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <Button variant="outline" onClick={() => setOpenAdd(false)} className="rounded-xl">
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

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#2d3748]/40" />
          <Input
            className="pl-8 rounded-xl"
            placeholder="Teklif ara (numara, araç, müşteri)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] rounded-xl">
            <SelectValue placeholder="Durum Filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="draft">Taslak</SelectItem>
            <SelectItem value="sent">Gönderildi</SelectItem>
            <SelectItem value="approved">Onaylandı</SelectItem>
            <SelectItem value="rejected">Reddedildi</SelectItem>
            <SelectItem value="expired">Süresi Doldu</SelectItem>
            <SelectItem value="converted">Satışa Dönüştü</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quotes Table */}
      <Card className="bg-white rounded-xl border border-[#e2e8f0] shadow-md">
        <CardContent className="p-0">
          <div className="rounded-xl overflow-hidden border border-[#e2e8f0]">
            <Table className="table-zebra">
              <TableHeader className="bg-[#f8f9fa] sticky top-0 z-10">
                <TableRow className="border-b border-[#e2e8f0] hover:bg-transparent">
                  <TableHead className="text-[#2d3748] font-semibold">Teklif No</TableHead>
                  <TableHead className="text-[#2d3748] font-semibold">Araç</TableHead>
                  <TableHead className="text-[#2d3748] font-semibold">Müşteri</TableHead>
                  <TableHead className="text-[#2d3748] font-semibold">Fiyat</TableHead>
                  <TableHead className="text-[#2d3748] font-semibold">Tarih</TableHead>
                  <TableHead className="text-[#2d3748] font-semibold">Geçerlilik</TableHead>
                  <TableHead className="text-[#2d3748] font-semibold">Durum</TableHead>
                  <TableHead className="text-[#2d3748] font-semibold">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-[#2d3748]">
                      Yükleniyor...
                    </TableCell>
                  </TableRow>
                ) : filteredQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-[#2d3748]">
                      Teklif bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotes.map((quote, index) => (
                    <TableRow
                      key={quote.id}
                      className={`table-row-modern border-b border-[#e2e8f0] ${
                        index % 2 === 0 ? "bg-white" : "bg-[#f8f9fa]"
                      }`}
                    >
                      <TableCell className="text-[#2d3748] font-medium">
                        {quote.quote_number}
                      </TableCell>
                      <TableCell className="text-[#2d3748]">
                        {quote.maker} {quote.model} {quote.production_year}
                      </TableCell>
                      <TableCell className="text-[#2d3748]">
                        {quote.customer_name_full || "-"}
                      </TableCell>
                      <TableCell className="text-[#2d3748] font-medium">
                        {formatCurrency(quote.sale_price, quote.currency, locale)}
                      </TableCell>
                      <TableCell className="text-[#2d3748]">
                        {format(new Date(quote.quote_date), "dd MMM yyyy", { locale: tr })}
                      </TableCell>
                      <TableCell className="text-[#2d3748]">
                        {format(new Date(quote.valid_until), "dd MMM yyyy", { locale: tr })}
                      </TableCell>
                      <TableCell>{getStatusBadge(quote.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetailModal(quote)}
                            className="rounded-xl"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {quote.status === "approved" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedQuote(quote);
                                setOpenConvert(true);
                              }}
                              className="rounded-xl text-green-600 hover:text-green-700"
                              title="Satışa Dönüştür"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          )}
                          {quote.status !== "converted" && (
                            <>
                              {quote.status === "draft" || quote.status === "sent" ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleApproveQuote(quote.id)}
                                    className="rounded-xl text-green-600 hover:text-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRejectQuote(quote.id)}
                                    className="rounded-xl text-red-600 hover:text-red-700"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : null}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(quote)}
                                className="rounded-xl"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteQuote(quote.id)}
                                className="rounded-xl text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-[#e2e8f0]">
          <DialogHeader>
            <DialogTitle className="text-[#2d3748]">Teklifi Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#2d3748] mb-2 block">Araç</label>
                <Select
                  value={quoteForm.vehicle_id}
                  onValueChange={(value) => {
                    setQuoteForm({ ...quoteForm, vehicle_id: value });
                    const vehicle = vehicles.find((v) => v.id === Number(value));
                    if (vehicle?.sale_price) {
                      setQuoteForm((prev) => ({
                        ...prev,
                        sale_price: vehicle.sale_price!.toString(),
                      }));
                    }
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Araç seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                        {vehicle.maker} {vehicle.model} {vehicle.production_year} - #{vehicle.vehicle_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#2d3748] mb-2 block">Müşteri</label>
                <Select
                  value={quoteForm.customer_id || "none"}
                  onValueChange={(value) => setQuoteForm({ ...quoteForm, customer_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Müşteri seçin" />
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
                <label className="text-sm font-medium text-[#2d3748] mb-2 block">Teklif Tarihi</label>
                <Input
                  type="date"
                  value={quoteForm.quote_date}
                  onChange={(e) => setQuoteForm({ ...quoteForm, quote_date: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#2d3748] mb-2 block">Geçerlilik Tarihi</label>
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
                <label className="text-sm font-medium text-[#2d3748] mb-2 block">Satış Fiyatı</label>
                <Input
                  type="number"
                  value={quoteForm.sale_price}
                  onChange={(e) => setQuoteForm({ ...quoteForm, sale_price: e.target.value })}
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
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#2d3748] mb-2 block">Taksit Sayısı</label>
                <Input
                  type="number"
                  value={quoteForm.installment_count}
                  onChange={(e) => setQuoteForm({ ...quoteForm, installment_count: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#2d3748] mb-2 block">Taksit Tutarı</label>
                <Input
                  type="number"
                  value={quoteForm.installment_amount}
                  onChange={(e) => setQuoteForm({ ...quoteForm, installment_amount: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#2d3748] mb-2 block">Durum</label>
              <Select
                value={quoteForm.status}
                onValueChange={(value) => setQuoteForm({ ...quoteForm, status: value as any })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Taslak</SelectItem>
                  <SelectItem value="sent">Gönderildi</SelectItem>
                  <SelectItem value="approved">Onaylandı</SelectItem>
                  <SelectItem value="rejected">Reddedildi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-[#2d3748] mb-2 block">Notlar</label>
              <Input
                value={quoteForm.notes}
                onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)} className="rounded-xl">
              İptal
            </Button>
            <Button
              onClick={handleUpdateQuote}
              className="bg-[#003d82] hover:bg-[#0052a3] text-white rounded-xl"
            >
              Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Sale Dialog */}
      <Dialog open={openConvert} onOpenChange={setOpenConvert}>
        <DialogContent className="max-w-md bg-white rounded-xl border border-[#e2e8f0]">
          <DialogHeader>
            <DialogTitle className="text-[#2d3748]">Teklifi Satışa Dönüştür</DialogTitle>
            <DialogDescription className="text-[#2d3748]/70">
              Bu işlem teklifi onaylı bir satışa dönüştürecektir. Devam etmek istiyor musunuz?
            </DialogDescription>
          </DialogHeader>
          {selectedQuote && (
            <div className="py-4 space-y-2">
              <p className="text-sm text-[#2d3748]">
                <strong>Teklif No:</strong> {selectedQuote.quote_number}
              </p>
              <p className="text-sm text-[#2d3748]">
                <strong>Araç:</strong> {selectedQuote.maker} {selectedQuote.model}
              </p>
              <p className="text-sm text-[#2d3748]">
                <strong>Fiyat:</strong> {formatCurrency(selectedQuote.sale_price, selectedQuote.currency, locale)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenConvert(false)} className="rounded-xl">
              İptal
            </Button>
            <Button
              onClick={handleConvertToSale}
              className="bg-[#F0A500] hover:bg-[#d89400] text-white rounded-xl"
            >
              Satışa Dönüştür
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

