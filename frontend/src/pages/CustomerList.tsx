import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Search, Phone, UserPlus, Filter, List, Table, X, Grid3x3 } from "lucide-react";
import { api } from "@/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";

interface CustomerSegment {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  total_spent_base: number;
  sale_count: number;
  last_sale_date?: string | null;
  first_sale_date?: string | null;
  created_at: string;
  vehicles_purchased?: string | null;
  chassis_numbers?: string | null;
}

const CustomerList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const [allCustomers, setAllCustomers] = useState<CustomerSegment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "table">("table");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  
  // KPI States
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [newCustomers, setNewCustomers] = useState(0);
  const [activeInstallmentCustomers, setActiveInstallmentCustomers] = useState(0);

  const [filters, setFilters] = useState({
    minSpent: "",
    maxSpent: "",
    minSales: "",
    maxSales: "",
    lastSaleDays: "all",
    sortBy: "name",
    sortOrder: "asc",
  });

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    fetchAllCustomers();
    fetchKPIs();
  }, []);

  const fetchKPIs = async () => {
    try {
      // Tüm müşteriler - pagination ile tümünü çek
      let allCustomersData: CustomerSegment[] = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const customersRes = await api.get(`/customers?limit=100&page=${page}`);
        const customers = customersRes.data?.customers || [];
        allCustomersData = [...allCustomersData, ...customers];
        
        const pagination = customersRes.data?.pagination;
        if (!pagination || page >= pagination.totalPages || customers.length === 0) {
          hasMore = false;
        } else {
          page++;
        }
      }
      
      setTotalCustomers(allCustomersData.length);

      // Yeni müşteriler (son 1 ay)
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const newCustomersCount = allCustomersData.filter((c: CustomerSegment) => {
        const createdDate = new Date(c.created_at);
        return createdDate >= oneMonthAgo;
      }).length;
      setNewCustomers(newCustomersCount);

      // Taksidi devam eden müşteriler
      const activeInstallmentsRes = await api.get("/installments/active").catch(() => ({ data: [] }));
      const activeInstallments = activeInstallmentsRes.data || [];
      const uniqueCustomerIds = new Set(
        activeInstallments
          .map((inst: any) => inst.customer_id)
          .filter((id: any) => id !== null && id !== undefined)
      );
      setActiveInstallmentCustomers(uniqueCustomerIds.size);
    } catch (error) {
      console.error("KPI fetch error:", error);
    }
  };

  const fetchAllCustomers = async () => {
    try {
      const response = await api.get("/customers");
      const customers = response.data?.customers || [];
      setAllCustomers(customers);
      setLoading(false);
    } catch (error) {
      console.error("All customers error:", error);
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string | null) =>
    dateString ? new Date(dateString).toLocaleDateString("tr-TR") : "Yok";

  const filterCustomers = (customers: CustomerSegment[]) => {
    let filteredCustomers = [...customers];

    if (searchTerm) {
      const st = searchTerm.toLowerCase();
      filteredCustomers = filteredCustomers.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(st) ||
          (c.phone || "").includes(searchTerm) ||
          (c.email || "").toLowerCase().includes(st)
      );
    }

    if (filters.minSpent) filteredCustomers = filteredCustomers.filter((c) => c.total_spent_base >= parseFloat(filters.minSpent));
    if (filters.maxSpent) filteredCustomers = filteredCustomers.filter((c) => c.total_spent_base <= parseFloat(filters.maxSpent));
    if (filters.minSales) filteredCustomers = filteredCustomers.filter((c) => c.sale_count >= parseInt(filters.minSales));
    if (filters.maxSales) filteredCustomers = filteredCustomers.filter((c) => c.sale_count <= parseInt(filters.maxSales));

    if (filters.lastSaleDays && filters.lastSaleDays !== "all") {
      const daysAgo = parseInt(filters.lastSaleDays);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      filteredCustomers = filteredCustomers.filter((c) => {
        if (!c.last_sale_date) return false;
        return new Date(c.last_sale_date) >= cutoffDate;
      });
    }

    filteredCustomers.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortBy) {
        case "name":
          aValue = (a.name || "").toLowerCase();
          bValue = (b.name || "").toLowerCase();
          break;
        case "total_spent":
          aValue = a.total_spent_base || 0;
          bValue = b.total_spent_base || 0;
          break;
        case "sale_count":
          aValue = a.sale_count || 0;
          bValue = b.sale_count || 0;
          break;
        case "last_sale":
          aValue = a.last_sale_date ? new Date(a.last_sale_date).getTime() : 0;
          bValue = b.last_sale_date ? new Date(b.last_sale_date).getTime() : 0;
          break;
        default:
          aValue = (a.name || "").toLowerCase();
          bValue = (b.name || "").toLowerCase();
      }

      if (filters.sortOrder === "desc") {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    });

    return filteredCustomers;
  };

  const renderCustomerCard = (customer: CustomerSegment) => {
    return (
      <Card key={customer.id} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
                <span className="text-primary font-bold text-lg">{(customer.name || "").charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{customer.name}</h3>
                <p className="text-sm text-muted-foreground">{customer.phone || "-"}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Harcama</p>
              <p className="font-bold text-green-600 dark:text-green-400">{formatCurrency(customer.total_spent_base)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Satış Sayısı</p>
              <p className="font-bold text-primary">{customer.sale_count}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Telefon</p>
              <p className="font-semibold text-foreground text-sm">{customer.phone || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Son Satış</p>
              <p className="font-semibold text-foreground text-sm">{formatDate(customer.last_sale_date)}</p>
            </div>
          </div>

          <div className="flex space-x-2 pt-4 border-t border-border">
            <Button variant="outline" className="flex-1" onClick={() => navigate(`/customers/${customer.id}`)}>
              Detayları Gör
            </Button>
            {customer.phone && (
              <Button variant="outline" size="icon" onClick={() => window.open(`tel:${customer.phone}`, '_self')}>
                <Phone className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCustomerTable = (customers: CustomerSegment[]) => {
    return (
      <Card className="rounded-xl shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left p-4 font-medium text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <span>Müşteri</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        sortBy: "name",
                        sortOrder: filters.sortBy === "name" && filters.sortOrder === "asc" ? "desc" : "asc",
                      })
                    }
                    className="h-6 w-6 p-0 hover:bg-muted/50"
                  >
                    {filters.sortBy === "name" ? (filters.sortOrder === "asc" ? "↑" : "↓") : "↕"}
                  </Button>
                </div>
              </th>
              <th className="text-left p-4 font-medium text-muted-foreground">İletişim</th>
              <th className="text-left p-4 font-medium text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <span>Harcama</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        sortBy: "total_spent",
                        sortOrder: filters.sortBy === "total_spent" && filters.sortOrder === "asc" ? "desc" : "asc",
                      })
                    }
                    className="h-6 w-6 p-0 hover:bg-muted/50"
                  >
                    {filters.sortBy === "total_spent" ? (filters.sortOrder === "asc" ? "↑" : "↓") : "↕"}
                  </Button>
                </div>
              </th>
              <th className="text-left p-4 font-medium text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <span>Satış Sayısı</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        sortBy: "sale_count",
                        sortOrder: filters.sortBy === "sale_count" && filters.sortOrder === "asc" ? "desc" : "asc",
                      })
                    }
                    className="h-6 w-6 p-0 hover:bg-muted/50"
                  >
                    {filters.sortBy === "sale_count" ? (filters.sortOrder === "asc" ? "↑" : "↓") : "↕"}
                  </Button>
                </div>
              </th>
              <th className="text-left p-4 font-medium text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <span>Son Satış</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        sortBy: "last_sale",
                        sortOrder: filters.sortBy === "last_sale" && filters.sortOrder === "asc" ? "desc" : "asc",
                      })
                    }
                    className="h-6 w-6 p-0 hover:bg-muted/50"
                  >
                    {filters.sortBy === "last_sale" ? (filters.sortOrder === "asc" ? "↑" : "↓") : "↕"}
                  </Button>
                </div>
              </th>
              <th className="text-left p-4 font-medium text-muted-foreground">Aksiyonlar</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, index) => (
              <tr
                key={customer.id}
                  className={`border-b hover:bg-gray-50/80 transition-colors duration-150 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
              >
                <td className="p-4">
                  <p className="font-medium text-foreground">{customer.name}</p>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <p className="text-sm text-foreground">{customer.phone || "-"}</p>
                    {customer.email && <p className="text-xs text-muted-foreground">{customer.email}</p>}
                  </div>
                </td>
                <td className="p-4">
                  <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(customer.total_spent_base)}</span>
                </td>
                <td className="p-4">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {customer.sale_count} satış
                  </Badge>
                </td>
                <td className="p-4">
                  <span className="text-sm text-muted-foreground">
                    {customer.last_sale_date ? formatDate(customer.last_sale_date) : "Henüz satış yok"}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                      className="text-primary hover:text-primary/80 hover:bg-primary/10"
                    >
                      Detay
                    </Button>
                    {customer.phone && (
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted/50" onClick={() => window.open(`tel:${customer.phone}`, '_self')}>
                        <Phone className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </Card>
    );
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast({
        title: "Uyarı",
        description: "Lütfen müşteri adını giriniz",
        variant: "destructive"
      });
      return;
    }
    try {
      await api.post("/customers", newCustomer);
      await fetchAllCustomers();
      await fetchKPIs();
      setShowNewCustomer(false);
      setNewCustomer({ name: "", phone: "", email: "", address: "", notes: "" });
      toast({
        title: "Başarılı",
        description: "Müşteri eklendi"
      });
    } catch (error: any) {
      console.error("Müşteri ekleme hatası:", error);
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Müşteri eklenirken bir hata oluştu",
        variant: "destructive"
      });
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilters({
      minSpent: "",
      maxSpent: "",
      minSales: "",
      maxSales: "",
      lastSaleDays: "all",
      sortBy: "name",
      sortOrder: "asc",
    });
  };

  const hasActiveFilters = searchTerm || filters.minSpent || filters.maxSpent || filters.minSales || filters.maxSales || filters.lastSaleDays !== "all" || filters.sortBy !== "name" || filters.sortOrder !== "asc";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const filteredCustomers = filterCustomers(allCustomers);

  return (
    <>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tüm Müşteriler</p>
                  <p className="text-3xl font-bold mt-3">{totalCustomers}</p>
                  <p className="text-sm text-green-600 mt-2">Toplam müşteri sayısı</p>
                    </div>
                <div className="rounded-xl p-4 bg-blue-100">
                  <UserPlus className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Yeni Müşteriler</p>
                  <p className="text-3xl font-bold mt-3">{newCustomers}</p>
                  <p className="text-sm text-green-600 mt-2">Son 1 ayda sisteme eklenen müşteriler</p>
                    </div>
                <div className="rounded-xl p-4 bg-green-100">
                  <UserPlus className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taksidi Devam Eden Müşteriler</p>
                  <p className="text-3xl font-bold mt-3">{activeInstallmentCustomers}</p>
                  <p className="text-sm text-green-600 mt-2">
                    {activeInstallmentCustomers > 0 ? `${activeInstallmentCustomers} aktif` : "Taksit yok"}
                  </p>
                    </div>
                <div className="rounded-xl p-4 bg-orange-100">
                  <Phone className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Müşteri ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 rounded-xl border-gray-200 hover:border-gray-300 focus-visible:ring-[#003d82] focus-visible:border-[#003d82] transition-colors"
                  />
                </div>

            {/* Filter Button */}
            <Button 
              variant="outline" 
              className="h-12 rounded-xl border-gray-200 hover:border-gray-300 transition-colors"
              onClick={() => setShowAdvancedFilters(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Gelişmiş Filtre
                </Button>

            {/* Clear Filters */}
            {hasActiveFilters && (
                  <Button
                    variant="outline"
                className="h-12 rounded-xl text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300 bg-orange-50 hover:bg-orange-100"
                onClick={clearAllFilters}
                  >
                <X className="w-4 h-4 mr-2" />
                Temizle
                  </Button>
                )}
              </div>

          {/* Action Bar */}
          <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-200 min-h-[60px]">
            {/* Left Section */}
            <div className="flex gap-2 flex-wrap items-center sm:flex-1 sm:justify-start">
              <Button onClick={() => setShowNewCustomer(true)} className="gap-2 rounded-xl h-11">
                <UserPlus className="h-4 w-4" />
                  Yeni Müşteri
                </Button>
            </div>

            {/* Right Section - View Mode Switch */}
            <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Görünüm:</span>
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                    <Button
                      variant={viewMode === "table" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("table")}
                  className={cn(
                    "h-9 px-4 rounded-lg transition-all",
                    viewMode === "table" 
                      ? "bg-[#003d82] text-white shadow-sm" 
                      : "text-gray-600 hover:bg-gray-200"
                  )}
                    >
                      <Table className="w-4 h-4 mr-2" />
                      Tablo
                    </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "h-9 px-4 rounded-lg transition-all",
                    viewMode === "list" 
                      ? "bg-[#003d82] text-white shadow-sm" 
                      : "text-gray-600 hover:bg-gray-200"
                  )}
                >
                  <Grid3x3 className="w-4 h-4 mr-2" />
                  Liste
                </Button>
                  </div>
                </div>
              </div>
            </div>

        {/* Customer List/Table */}
            {viewMode === "table" ? (
          filteredCustomers.length > 0 ? (
            renderCustomerTable(filteredCustomers)
            ) : (
            <Card className="rounded-xl shadow-sm border border-gray-200">
              <CardContent className="py-16 text-center">
                <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-600 mb-2">Müşteri bulunamadı</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {hasActiveFilters ? "Filtreleri temizleyip tekrar deneyin" : "Henüz müşteri eklenmemiş"}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearAllFilters}>
                    Filtreleri Temizle
                          </Button>
                      )}
                  </CardContent>
                </Card>
          )
        ) : (
          filteredCustomers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((c) => renderCustomerCard(c))}
                          </div>
          ) : (
            <Card className="rounded-xl shadow-sm border border-gray-200">
              <CardContent className="py-16 text-center">
                <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-600 mb-2">Müşteri bulunamadı</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {hasActiveFilters ? "Filtreleri temizleyip tekrar deneyin" : "Henüz müşteri eklenmemiş"}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearAllFilters}>
                    Filtreleri Temizle
                  </Button>
                      )}
                  </CardContent>
                </Card>
          )
              )}
      </div>

      {/* New Customer Modal */}
      <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Müşteri Ekle</DialogTitle>
            <DialogDescription>Müşteri bilgilerini giriniz</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Ad Soyad *</label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Müşteri adı"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Telefon</label>
              <Input
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="Telefon numarası"
              />
            </div>
            <div>
              <label className="text-sm font-medium">E-posta</label>
              <Input
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="E-posta adresi"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Adres</label>
              <Input
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                placeholder="Adres"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notlar</label>
              <Input
                value={newCustomer.notes}
                onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                placeholder="Müşteri notları"
              />
            </div>
            <div className="flex space-x-3 pt-4 border-t">
              <Button onClick={handleCreateCustomer} className="flex-1">
                Müşteri Ekle
              </Button>
              <Button variant="outline" onClick={() => setShowNewCustomer(false)} className="flex-1">
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Advanced Filters Modal */}
      <Dialog open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-primary" />
              <span>Gelişmiş Filtreler</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Harcama Miktarı</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">Min (TL)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minSpent}
                    onChange={(e) => setFilters({ ...filters, minSpent: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Max (TL)</label>
                  <Input
                    type="number"
                    placeholder="∞"
                    value={filters.maxSpent}
                    onChange={(e) => setFilters({ ...filters, maxSpent: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Satış Sayısı</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">Min</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minSales}
                    onChange={(e) => setFilters({ ...filters, minSales: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Max</label>
                  <Input
                    type="number"
                    placeholder="∞"
                    value={filters.maxSales}
                    onChange={(e) => setFilters({ ...filters, maxSales: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Son Satış</h4>
              <div>
                <label className="text-sm text-muted-foreground">Son X gün içinde</label>
                <Select value={filters.lastSaleDays} onValueChange={(value) => setFilters({ ...filters, lastSaleDays: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hepsi</SelectItem>
                    <SelectItem value="7">Son 7 gün</SelectItem>
                    <SelectItem value="30">Son 30 gün</SelectItem>
                    <SelectItem value="90">Son 90 gün</SelectItem>
                    <SelectItem value="180">Son 6 ay</SelectItem>
                    <SelectItem value="365">Son 1 yıl</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Sıralama</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">Sırala</label>
                  <Select value={filters.sortBy} onValueChange={(value) => setFilters({ ...filters, sortBy: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">İsim</SelectItem>
                      <SelectItem value="total_spent">Toplam Harcama</SelectItem>
                      <SelectItem value="sale_count">Satış Sayısı</SelectItem>
                      <SelectItem value="last_sale">Son Satış</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Yön</label>
                  <Select value={filters.sortOrder} onValueChange={(value) => setFilters({ ...filters, sortOrder: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">A-Z / Artan</SelectItem>
                      <SelectItem value="desc">Z-A / Azalan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() =>
                  setFilters({
                    minSpent: "",
                    maxSpent: "",
                    minSales: "",
                    maxSales: "",
                    lastSaleDays: "all",
                    sortBy: "name",
                    sortOrder: "asc",
                  })
                }
              >
                Temizle
              </Button>
              <Button onClick={() => setShowAdvancedFilters(false)}>Uygula</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomerList;
