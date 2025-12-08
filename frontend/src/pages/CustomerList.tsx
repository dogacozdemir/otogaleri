import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Phone, UserPlus, Filter, List, Table, X } from "lucide-react";
import { api } from "@/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";

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

interface CustomerSegments {
  vip: CustomerSegment[];
  regular: CustomerSegment[];
  new: CustomerSegment[];
}

const CustomerList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const [segments, setSegments] = useState<CustomerSegments | null>(null);
  const [allCustomers, setAllCustomers] = useState<CustomerSegment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "table">("table");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
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
    fetchCustomerSegments();
    fetchAllCustomers();
  }, []);

  const fetchCustomerSegments = async () => {
    try {
      const response = await api.get("/customers/segments");
      setSegments(response.data || null);
    } catch (error) {
      console.error("Customer segments error:", error);
    }
  };

  const fetchAllCustomers = async () => {
    try {
      const response = await api.get("/customers");
      // Backend returns { customers: [...], pagination: {...} }
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

  const renderCustomerCard = (customer: CustomerSegment, segmentType: string, keyPrefix?: string) => {
    const getSegmentStyle = (type: string) => {
      switch (type) {
        case "vip":
          return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
        case "regular":
          return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
        case "new":
          return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
        default:
          return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      }
    };

    const getSegmentLabel = (type: string) => {
      switch (type) {
        case "vip":
          return "VIP";
        case "regular":
          return "Düzenli";
        case "new":
          return "Yeni";
        default:
          return "Müşteri";
      }
    };

    return (
      <Card key={keyPrefix ? `${keyPrefix}-${customer.id}` : customer.id}>
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
            <Badge className={getSegmentStyle(segmentType)}>
              {getSegmentLabel(segmentType)}
            </Badge>
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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
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
              <th className="text-left p-4 font-medium text-muted-foreground">Satılan Araba</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Şasi Numarası</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Aksiyonlar</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, index) => (
              <tr
                key={customer.id}
                className={`border-b hover:bg-muted/30 transition-colors ${index % 2 === 0 ? "bg-background" : "bg-muted/10"}`}
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
                  <span className="text-sm text-foreground">
                    {customer.vehicles_purchased ? (
                      <span className="max-w-xs truncate block" title={customer.vehicles_purchased}>
                        {customer.vehicles_purchased}
                      </span>
                    ) : (
                      "-"
                    )}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-sm text-foreground">
                    {customer.chassis_numbers ? (
                      <span className="max-w-xs truncate block" title={customer.chassis_numbers}>
                        {customer.chassis_numbers}
                      </span>
                    ) : (
                      "-"
                    )}
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
      await fetchCustomerSegments();
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
                      <List className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-lg font-semibold text-primary">Tüm Müşteriler</span>
                  </div>
                  <p className="text-3xl font-bold text-primary">{allCustomers.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Toplam müşteri sayısı</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500/10 to-green-500/20 rounded-xl flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-lg font-semibold text-primary">Yeni Müşteriler</span>
                  </div>
                  <p className="text-3xl font-bold text-primary">{segments?.new?.length || 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">Son 1 ayda sisteme eklenen müşteriler</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500/10 to-yellow-500/20 rounded-xl flex items-center justify-center">
                      <Phone className="w-5 h-5 text-yellow-600" />
                    </div>
                    <span className="text-lg font-semibold text-primary">VIP Müşteriler</span>
                  </div>
                  <p className="text-3xl font-bold text-primary">{segments?.vip?.length || 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">VIP müşteri sayısı</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-card border border-border rounded-xl p-1.5 shadow-sm h-auto mb-6">
            <TabsTrigger
              value="all"
              className="flex items-center justify-center px-6 py-4 text-base font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-colors duration-200 ease-in-out min-h-[3.5rem] data-[state=active]:bg-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:bg-muted/70"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Tümü ({allCustomers.length})
            </TabsTrigger>
            <TabsTrigger
              value="segments"
              className="flex items-center justify-center px-6 py-4 text-base font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-colors duration-200 ease-in-out min-h-[3.5rem] data-[state=active]:bg-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:bg-muted/70"
            >
              <Filter className="w-4 h-4 mr-2" />
              Segment
            </TabsTrigger>
          </TabsList>

          {/* All Customers */}
          <TabsContent value="all" className="space-y-4">
            <div className="flex items-center justify-between space-x-4 bg-card rounded-lg border p-4">
              <div className="flex items-center space-x-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Müşteri ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowAdvancedFilters(true)} className="flex items-center space-x-2">
                  <Filter className="w-4 h-4" />
                  <span>Gelişmiş Filtre</span>
                </Button>

                {(searchTerm ||
                  filters.minSpent ||
                  filters.maxSpent ||
                  filters.minSales ||
                  filters.maxSales ||
                  filters.lastSaleDays !== "all" ||
                  filters.sortBy !== "name" ||
                  filters.sortOrder !== "asc") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
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
                    }}
                    className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-400"
                  >
                    <X className="w-4 h-4" />
                    <span>Temizle</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <Button onClick={() => setShowNewCustomer(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Yeni Müşteri
                </Button>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Görünüm:</span>
                  <div className="flex bg-muted rounded-lg p-1">
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="h-8 px-3"
                    >
                      <List className="w-4 h-4 mr-2" />
                      Liste
                    </Button>
                    <Button
                      variant={viewMode === "table" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("table")}
                      className="h-8 px-3"
                    >
                      <Table className="w-4 h-4 mr-2" />
                      Tablo
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {viewMode === "table" ? (
              <Card>
                <CardContent className="p-0">
                  {renderCustomerTable(filterCustomers(allCustomers))}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterCustomers(allCustomers).map((c) => renderCustomerCard(c, "all"))}
              </div>
            )}
          </TabsContent>

          {/* Segments */}
          <TabsContent value="segments" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {segments?.vip && segments.vip.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>VIP Müşteriler</span>
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                        {segments.vip.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {segments.vip.slice(0, 5).map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                          <div>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-sm text-muted-foreground">{formatCurrency(c.total_spent_base)}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/customers/${c.id}`)}>
                            Detay
                          </Button>
                        </div>
                      ))}
                      {segments.vip.length > 5 && (
                        <p className="text-sm text-muted-foreground text-center pt-2">
                          +{segments.vip.length - 5} daha fazla
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {segments?.regular && segments.regular.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Düzenli Müşteriler</span>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        {segments.regular.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {segments.regular.slice(0, 5).map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                          <div>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-sm text-muted-foreground">{formatCurrency(c.total_spent_base)}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/customers/${c.id}`)}>
                            Detay
                          </Button>
                        </div>
                      ))}
                      {segments.regular.length > 5 && (
                        <p className="text-sm text-muted-foreground text-center pt-2">
                          +{segments.regular.length - 5} daha fazla
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {segments?.new && segments.new.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Yeni Müşteriler</span>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        {segments.new.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {segments.new.slice(0, 5).map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                          <div>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(c.created_at)}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/customers/${c.id}`)}>
                            Detay
                          </Button>
                        </div>
                      ))}
                      {segments.new.length > 5 && (
                        <p className="text-sm text-muted-foreground text-center pt-2">
                          +{segments.new.length - 5} daha fazla
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
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

