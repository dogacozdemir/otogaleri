import { useEffect, useMemo, useState } from "react";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Package,
  PackagePlus,
  PackageMinus,
  Trash2,
  Search,
  AlertTriangle,
  Activity,
  ShoppingCart,
  Wrench,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";

type Product = {
  id: number;
  sku: string | null;
  name: string;
  category: string | null;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_price: number | null;
  sale_price: number | null;
  sales_count: number;
  is_for_sale: boolean;
  is_for_service: boolean;
  track_stock: boolean;
  created_at: string;
  updated_at: string;
};

interface AnalyticsData {
  totalProducts: number;
  lowStockCount: number;
  totalValue: number;
  categoryStats: Array<{ category: string; count: number }>;
  recentMovements: Array<{ type: string; count: number; total_quantity: number }>;
  usageStats: {
    for_sale_count: number;
    for_service_count: number;
    both_count: number;
  };
}

const InventoryPage = () => {
  const { formatCurrency: currency } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState("products");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Product | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });

  // Add Modal state
  const [openAdd, setOpenAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    sku: "",
    category: "",
    unit: "adet",
    cost_price: "",
    sale_price: "",
    min_stock: "0",
    initial_stock: "0",
    is_for_sale: false,
    is_for_service: true,
    track_stock: true,
  });

  // Entry Modal state
  const [openEntry, setOpenEntry] = useState(false);
  const [entryTarget, setEntryTarget] = useState<Product | null>(null);
  const [entryForm, setEntryForm] = useState({
    cost_price: "",
    quantity: "1",
  });

  // Exit Modal state
  const [openExit, setOpenExit] = useState(false);
  const [exitTarget, setExitTarget] = useState<Product | null>(null);
  const [exitForm, setExitForm] = useState({
    type: "service", // "service" or "sale"
    quantity: "1",
    customer_id: "",
    sale_price: "",
    staff_id: "",
  });

  // Customer list for sales
  const [customers, setCustomers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  // Product History Modal state
  const [openHistory, setOpenHistory] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<Product | null>(null);
  const [productHistory, setProductHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const { toast } = useToast();

  const fetchList = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/inventory");
      setProducts(data);
    } catch (e: any) {
      toast({
        title: "Hata",
        description: "Stok listesi alınamadı.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data } = await api.get("/inventory/analytics/overview");
      setAnalytics(data);
    } catch (e: any) {
      console.error("Analytics alınamadı:", e);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get("/customers");
      setCustomers(data?.customers || []);
    } catch (e: any) {
      console.error("Müşteriler alınamadı:", e);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data } = await api.get("/staff");
      setStaff(data || []);
    } catch (e: any) {
      console.error("Personel listesi alınamadı:", e);
    }
  };

  const fetchProductHistory = async (productId: number) => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get(`/inventory/${productId}/movements`);
      setProductHistory(data);
    } catch (e: any) {
      toast({
        title: "Hata",
        description: "Ürün geçmişi alınamadı.",
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchList();
    fetchAnalytics();
    fetchCustomers();
    fetchStaff();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filteredProducts = products;

    if (q) {
      filteredProducts = products.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      );
    }

    // Sıralama uygula
    if (sortConfig.key) {
      filteredProducts = [...filteredProducts].sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];

        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;

        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortConfig.direction === "asc"
            ? aVal.localeCompare(bVal, "tr")
            : bVal.localeCompare(aVal, "tr");
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }

        if (typeof aVal === "boolean" && typeof bVal === "boolean") {
          return sortConfig.direction === "asc"
            ? aVal === bVal
              ? 0
              : aVal
              ? -1
              : 1
            : aVal === bVal
            ? 0
            : aVal
            ? 1
            : -1;
        }

        return 0;
      });
    }

    return filteredProducts;
  }, [products, query, sortConfig]);

  const handleSort = (key: keyof Product) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const resetAddForm = () =>
    setAddForm({
      name: "",
      sku: "",
      category: "",
      unit: "adet",
      cost_price: "",
      sale_price: "",
      min_stock: "0",
      initial_stock: "0",
      is_for_sale: false,
      is_for_service: true,
      track_stock: true,
    });

  const handleAdd = async () => {
    if (!addForm.name.trim()) {
      toast({ title: "Uyarı", description: "Ürün adı zorunludur." });
      return;
    }
    try {
      const payload = {
        name: addForm.name.trim(),
        sku: addForm.sku.trim(),
        category: addForm.category.trim(),
        unit: addForm.unit,
        cost_price: addForm.cost_price ? Number(addForm.cost_price) : null,
        sale_price: addForm.sale_price ? Number(addForm.sale_price) : null,
        min_stock: addForm.track_stock ? Number(addForm.min_stock || 0) : 0,
        initial_stock: addForm.track_stock ? Number(addForm.initial_stock || 0) : 0,
        is_for_sale: addForm.is_for_sale,
        is_for_service: addForm.is_for_service,
        track_stock: addForm.track_stock,
      };
      await api.post("/inventory", payload);
      toast({ title: "Başarılı", description: "Ürün eklendi." });
      setOpenAdd(false);
      resetAddForm();
      await fetchList();
      await fetchAnalytics();
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Ürün eklenemedi.";
      toast({ title: "Hata", description: msg, variant: "destructive" });
    }
  };

  const openEntryModal = (p: Product) => {
    setEntryTarget(p);
    setEntryForm({
      cost_price: p.cost_price ? String(p.cost_price) : "",
      quantity: "1",
    });
    setOpenEntry(true);
  };

  const openExitModal = (p: Product) => {
    setExitTarget(p);
    setExitForm({
      type: "service",
      quantity: "1",
      customer_id: "",
      sale_price: p.sale_price ? String(p.sale_price) : "",
      staff_id: "",
    });
    setOpenExit(true);
  };

  const handleEntry = async () => {
    if (!entryTarget) return;
    const qty = Number(entryForm.quantity);
    const costPrice = entryForm.cost_price ? Number(entryForm.cost_price) : null;

    if (!Number.isInteger(qty) || qty <= 0) {
      toast({ title: "Uyarı", description: "Miktar pozitif tamsayı olmalı." });
      return;
    }

    try {
      await api.post(`/inventory/${entryTarget.id}/entry`, {
        quantity: qty,
        cost_price: costPrice,
      });
      toast({ title: "Başarılı", description: "Stok girişi yapıldı." });
      setOpenEntry(false);
      await fetchList();
      await fetchAnalytics();
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Stok girişi yapılamadı.";
      toast({ title: "Hata", description: msg, variant: "destructive" });
    }
  };

  const handleExit = async () => {
    if (!exitTarget) return;
    const qty = Number(exitForm.quantity);

    if (!Number.isInteger(qty) || qty <= 0) {
      toast({ title: "Uyarı", description: "Miktar pozitif tamsayı olmalı." });
      return;
    }

    if (exitForm.type === "sale") {
      if (!exitForm.customer_id) {
        toast({ title: "Uyarı", description: "Satış için müşteri seçmelisiniz." });
        return;
      }
      if (!exitForm.sale_price) {
        toast({ title: "Uyarı", description: "Satış fiyatı girmelisiniz." });
        return;
      }
    }

    try {
      const payload: any = {
        type: exitForm.type,
        quantity: qty,
      };

      if (exitForm.staff_id) {
        payload.staff_id = Number(exitForm.staff_id);
      }

      if (exitForm.type === "sale") {
        payload.customer_id = Number(exitForm.customer_id);
        payload.sale_price = Number(exitForm.sale_price);
      }

      await api.post(`/inventory/${exitTarget.id}/exit`, payload);
      toast({
        title: "Başarılı",
        description: exitForm.type === "sale" ? "Satış kaydedildi." : "Servis kullanımı kaydedildi.",
      });
      setOpenExit(false);
      await fetchList();
      await fetchAnalytics();
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Stok çıkışı yapılamadı.";
      toast({ title: "Hata", description: msg, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu ürünü silmek istediğine emin misin?")) return;
    try {
      await api.delete(`/inventory/${id}`);
      toast({ title: "Silindi", description: "Ürün silindi." });
      await fetchList();
      await fetchAnalytics();
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Ürün silinemedi.";
      toast({ title: "Hata", description: msg, variant: "destructive" });
    }
  };

  const getProductTypeBadge = (product: Product) => {
    if (product.is_for_sale && product.is_for_service) {
      return (
        <Badge variant="secondary" className="status-info">
          Satış + Servis
        </Badge>
      );
    } else if (product.is_for_sale) {
      return (
        <Badge variant="secondary" className="status-success">
          Sadece Satış
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="status-info">
          Sadece Servis
        </Badge>
      );
    }
  };

  return (
    <div className="space-professional-lg animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-display text-primary">Stok Takibi</h1>
          <p className="text-body text-muted-foreground mt-2">Ürün yönetimi ve stok analizi</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="status-success px-4 py-2 rounded-xl">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span className="font-semibold text-sm">Canlı</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card-professional p-6 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-small text-muted-foreground font-medium mb-2">Toplam Ürün</p>
              <p className="text-2xl font-bold">{analytics?.totalProducts || 0}</p>
              <div className="flex items-center mt-2">
                <Package className="w-4 h-4 text-primary mr-1" />
                <span className="text-sm text-primary">Stokta</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
              <Package className="w-7 h-7 text-primary" />
            </div>
          </div>
        </div>

        <div className="card-professional p-6 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-small text-muted-foreground font-medium mb-2">Kritik Stok</p>
              <p className="text-2xl font-bold">{analytics?.lowStockCount || 0}</p>
              <div className="flex items-center mt-2">
                <AlertTriangle className="w-4 h-4 text-destructive mr-1" />
                <span className="text-sm text-destructive">Düşük Stok</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-destructive/10 to-destructive/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
          </div>
        </div>

        <div className="card-professional p-6 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-small text-muted-foreground font-medium mb-2">Satış Ürünleri</p>
              <p className="text-2xl font-bold">{analytics?.usageStats?.for_sale_count || 0}</p>
              <div className="flex items-center mt-2">
                <ShoppingCart className="w-4 h-4 text-success mr-1" />
                <span className="text-sm text-success">Aktif</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-success/10 to-success/20 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-7 h-7 text-success" />
            </div>
          </div>
        </div>

        <div className="card-professional p-6 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-small text-muted-foreground font-medium mb-2">Servis Ürünleri</p>
              <p className="text-2xl font-bold">{analytics?.usageStats?.for_service_count || 0}</p>
              <div className="flex items-center mt-2">
                <Wrench className="w-4 h-4 text-info mr-1" />
                <span className="text-sm text-info">Aktif</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-info/10 to-info/20 rounded-xl flex items-center justify-center">
              <Wrench className="w-7 h-7 text-info" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-professional-lg">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border rounded-xl p-1 shadow-professional-sm h-auto">
          <TabsTrigger
            value="products"
            className="flex flex-col items-center space-y-1 px-3 py-3 text-muted-foreground data-[state=active]:bg-gradient-trustworthy data-[state=active]:text-white data-[state=active]:shadow-professional-sm rounded-lg font-semibold min-h-[3rem]"
          >
            <Package className="w-4 h-4" />
            <span className="text-xs">Ürünler</span>
          </TabsTrigger>
          <TabsTrigger
            value="sales"
            className="flex flex-col items-center space-y-1 px-3 py-3 text-muted-foreground data-[state=active]:bg-gradient-trustworthy data-[state=active]:text-white data-[state=active]:shadow-professional-sm rounded-lg font-semibold min-h-[3rem]"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="text-xs">Satış</span>
          </TabsTrigger>
          <TabsTrigger
            value="service"
            className="flex flex-col items-center space-y-1 px-3 py-3 text-muted-foreground data-[state=active]:bg-gradient-trustworthy data-[state=active]:text-white data-[state=active]:shadow-professional-sm rounded-lg font-semibold min-h-[3rem]"
          >
            <Wrench className="w-4 h-4" />
            <span className="text-xs">Servis</span>
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <div className="card-professional p-6">
            <div className="pb-4 border-b border-border flex flex-row items-center justify-between">
              <h3 className="text-heading text-primary flex items-center gap-2">
                <Package className="h-5 w-5" /> Tüm Ürünler
              </h3>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8 w-56 bg-background border-border text-foreground"
                    placeholder="Ara (isim, SKU, kategori)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

                <Dialog open={openAdd} onOpenChange={setOpenAdd}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2 btn-primary">
                      <Plus className="h-4 w-4" />
                      Ürün Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card text-card-foreground border border-border shadow-professional-xl animate-scale-in">
                    <DialogHeader>
                      <DialogTitle>Ürün Ekle</DialogTitle>
                      <DialogDescription>Stoğa yeni ürün ekleyin.</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-sm text-muted-foreground">Ürün Adı *</label>
                        <Input
                          value={addForm.name}
                          onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                          className="bg-background border-border text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">SKU (opsiyonel)</label>
                        <Input
                          value={addForm.sku}
                          onChange={(e) => setAddForm({ ...addForm, sku: e.target.value })}
                          className="bg-background border-border text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Kategori</label>
                        <Input
                          value={addForm.category}
                          onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                          className="bg-background border-border text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Birim</label>
                        <Select
                          value={addForm.unit}
                          onValueChange={(v) => setAddForm({ ...addForm, unit: v })}
                        >
                          <SelectTrigger className="bg-background border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            <SelectItem value="adet" className="text-foreground">
                              adet
                            </SelectItem>
                            <SelectItem value="kutu" className="text-foreground">
                              kutu
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {addForm.track_stock && (
                        <>
                          <div>
                            <label className="text-sm text-muted-foreground">Min Stok</label>
                            <Input
                              type="number"
                              value={addForm.min_stock}
                              onChange={(e) => setAddForm({ ...addForm, min_stock: e.target.value })}
                              className="bg-background border-border text-foreground"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground">Başlangıç Stoku</label>
                            <Input
                              type="number"
                              value={addForm.initial_stock}
                              onChange={(e) => setAddForm({ ...addForm, initial_stock: e.target.value })}
                              className="bg-background border-border text-foreground"
                            />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="text-sm text-muted-foreground">Alış Fiyatı</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={addForm.cost_price}
                          onChange={(e) => setAddForm({ ...addForm, cost_price: e.target.value })}
                          className="bg-background border-border text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Satış Fiyatı</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={addForm.sale_price}
                          onChange={(e) => setAddForm({ ...addForm, sale_price: e.target.value })}
                          className="bg-background border-border text-foreground"
                        />
                      </div>

                      <div className="col-span-2 flex flex-col gap-3">
                        <div className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="is_for_sale"
                              checked={addForm.is_for_sale}
                              onChange={(e) => setAddForm({ ...addForm, is_for_sale: e.target.checked })}
                              className="rounded"
                            />
                            <label htmlFor="is_for_sale" className="text-sm text-muted-foreground">
                              Satış için
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="is_for_service"
                              checked={addForm.is_for_service}
                              onChange={(e) =>
                                setAddForm({ ...addForm, is_for_service: e.target.checked })
                              }
                              className="rounded"
                            />
                            <label htmlFor="is_for_service" className="text-sm text-muted-foreground">
                              Servis için
                            </label>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg border border-border">
                          <input
                            type="checkbox"
                            id="track_stock"
                            checked={!addForm.track_stock}
                            onChange={(e) => setAddForm({ ...addForm, track_stock: !e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="track_stock" className="text-sm font-medium text-foreground">
                            Stok takibi yapılmasın
                          </label>
                          <span className="text-xs text-muted-foreground ml-2">
                            (Servis gibi stok takibi gerektirmeyen ürünler için)
                          </span>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setOpenAdd(false)}
                        className="border-gray-600 text-muted-foreground"
                      >
                        İptal
                      </Button>
                      <Button onClick={handleAdd} className="btn-primary">
                        Ekle
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="pt-4">
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead
                        className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("sku")}
                      >
                        <div className="flex items-center justify-between">
                          <span>SKU</span>
                          <span className="ml-2 text-xs">
                            {sortConfig.key === "sku" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                          </span>
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center justify-between">
                          <span>Ürün</span>
                          <span className="ml-2 text-xs">
                            {sortConfig.key === "name" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                          </span>
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("category")}
                      >
                        <div className="flex items-center justify-between">
                          <span>Kategori</span>
                          <span className="ml-2 text-xs">
                            {sortConfig.key === "category"
                              ? sortConfig.direction === "asc"
                                ? "↑"
                                : "↓"
                              : "↕"}
                          </span>
                        </div>
                      </TableHead>
                      <TableHead className="text-muted-foreground">Tür</TableHead>
                      <TableHead
                        className="text-muted-foreground text-right cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("current_stock")}
                      >
                        <div className="flex items-center justify-end">
                          <span>Stok</span>
                          <span className="ml-2 text-xs">
                            {sortConfig.key === "current_stock"
                              ? sortConfig.direction === "asc"
                                ? "↑"
                                : "↓"
                              : "↕"}
                          </span>
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-muted-foreground text-right cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("min_stock")}
                      >
                        <div className="flex items-center justify-end">
                          <span>Min</span>
                          <span className="ml-2 text-xs">
                            {sortConfig.key === "min_stock"
                              ? sortConfig.direction === "asc"
                                ? "↑"
                                : "↓"
                              : "↕"}
                          </span>
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-muted-foreground text-right cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("sales_count")}
                      >
                        <div className="flex items-center justify-end">
                          <span>Satış (Toplam)</span>
                          <span className="ml-2 text-xs">
                            {sortConfig.key === "sales_count"
                              ? sortConfig.direction === "asc"
                                ? "↑"
                                : "↓"
                              : "↕"}
                          </span>
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-muted-foreground text-right cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("cost_price")}
                      >
                        <div className="flex items-center justify-end">
                          <span>Alış</span>
                          <span className="ml-2 text-xs">
                            {sortConfig.key === "cost_price"
                              ? sortConfig.direction === "asc"
                                ? "↑"
                                : "↓"
                              : "↕"}
                          </span>
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-muted-foreground text-right cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("sale_price")}
                      >
                        <div className="flex items-center justify-end">
                          <span>Satış</span>
                          <span className="ml-2 text-xs">
                            {sortConfig.key === "sale_price"
                              ? sortConfig.direction === "asc"
                                ? "↑"
                                : "↓"
                              : "↕"}
                          </span>
                        </div>
                      </TableHead>
                      <TableHead className="text-muted-foreground text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!loading && filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          Kayıt bulunamadı.
                        </TableCell>
                      </TableRow>
                    )}

                    {filtered.map((p) => {
                      const trackStock = p.track_stock === true || p.track_stock === 1;
                      const low = trackStock && p.current_stock <= p.min_stock;
                      return (
                        <TableRow
                          key={p.id}
                          className={`${
                            low ? "bg-red-900/20" : "border-border hover:bg-gray-100"
                          } cursor-pointer transition-colors`}
                          onClick={() => {
                            setHistoryTarget(p);
                            setOpenHistory(true);
                            fetchProductHistory(p.id);
                          }}
                        >
                          <TableCell className="font-mono text-muted-foreground">
                            {p.sku || "-"}
                          </TableCell>
                          <TableCell className="font-medium flex items-center gap-2">
                            <span className="text-foreground">{p.name}</span>
                            {low && <Badge variant="destructive">Düşük Stok</Badge>}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{p.category || "-"}</TableCell>
                          <TableCell>{getProductTypeBadge(p)}</TableCell>
                          <TableCell className="text-right text-foreground">
                            {p.track_stock === true || p.track_stock === 1 ? (
                              `${p.current_stock} ${p.unit}`
                            ) : (
                              <span className="text-2xl font-bold text-primary">∞</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {p.track_stock === true || p.track_stock === 1 ? p.min_stock : "-"}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {p.sales_count}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {currency(p.cost_price)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {currency(p.sale_price)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEntryModal(p);
                                }}
                                className="flex items-center gap-1 bg-success/10 border-success/30 text-success hover:bg-success/20"
                              >
                                <PackagePlus className="h-4 w-4" /> Giriş
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openExitModal(p);
                                }}
                                className="flex items-center gap-1 bg-info/10 border-info/30 text-info hover:bg-info/20"
                              >
                                <PackageMinus className="h-4 w-4" /> Çıkış
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(p.id);
                                }}
                                className="flex items-center gap-1"
                              >
                                <Trash2 className="h-4 w-4" /> Sil
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Sales Products Tab */}
        <TabsContent value="sales" className="space-y-6">
          <div className="card-professional p-6">
            <div className="pb-4 border-b border-border">
              <h3 className="text-heading text-primary flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" /> Satış Ürünleri
              </h3>
            </div>
            <div className="pt-4">
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Ürün</TableHead>
                      <TableHead className="text-muted-foreground">Kategori</TableHead>
                      <TableHead className="text-muted-foreground text-right">Stok</TableHead>
                      <TableHead className="text-muted-foreground text-right">Satış Fiyatı</TableHead>
                      <TableHead className="text-muted-foreground text-right">Toplam Satış</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products
                      .filter((p) => p.is_for_sale)
                      .map((p) => (
                        <TableRow
                          key={p.id}
                          className="border-border hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => {
                            setHistoryTarget(p);
                            setOpenHistory(true);
                            fetchProductHistory(p.id);
                          }}
                        >
                          <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                          <TableCell className="text-muted-foreground">{p.category || "-"}</TableCell>
                          <TableCell className="text-right text-foreground">
                            {p.track_stock === true || p.track_stock === 1 ? (
                              `${p.current_stock} ${p.unit}`
                            ) : (
                              <span className="text-2xl font-bold text-primary">∞</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-success">{currency(p.sale_price)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {p.sales_count}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Service Products Tab */}
        <TabsContent value="service" className="space-y-6">
          <div className="card-professional p-6">
            <div className="pb-4 border-b border-border">
              <h3 className="text-heading text-primary flex items-center gap-2">
                <Wrench className="h-5 w-5" /> Servis Ürünleri
              </h3>
            </div>
            <div className="pt-4">
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Ürün</TableHead>
                      <TableHead className="text-muted-foreground">Kategori</TableHead>
                      <TableHead className="text-muted-foreground text-right">Stok</TableHead>
                      <TableHead className="text-muted-foreground text-right">Min Stok</TableHead>
                      <TableHead className="text-muted-foreground text-right">Alış Fiyatı</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products
                      .filter((p) => p.is_for_service)
                      .map((p) => (
                        <TableRow
                          key={p.id}
                          className="border-border hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => {
                            setHistoryTarget(p);
                            setOpenHistory(true);
                            fetchProductHistory(p.id);
                          }}
                        >
                          <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                          <TableCell className="text-muted-foreground">{p.category || "-"}</TableCell>
                          <TableCell className="text-right text-foreground">
                            {p.track_stock === true || p.track_stock === 1 ? (
                              `${p.current_stock} ${p.unit}`
                            ) : (
                              <span className="text-2xl font-bold text-primary">∞</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {p.track_stock === true || p.track_stock === 1 ? p.min_stock : "-"}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {currency(p.cost_price)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Entry Modal */}
      <Dialog open={openEntry} onOpenChange={setOpenEntry}>
        <DialogContent className="bg-card text-card-foreground border border-border shadow-professional-xl animate-scale-in">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-success" />
              Stok Girişi {entryTarget ? `— ${entryTarget.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              Ürün stoğuna giriş yapın. Farklı alış fiyatı girilirse ortalama alınacak.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Alış Fiyatı</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={`Mevcut: ₺${entryTarget?.cost_price || 0}`}
                  value={entryForm.cost_price}
                  onChange={(e) => setEntryForm({ ...entryForm, cost_price: e.target.value })}
                  className="bg-background border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Farklı fiyat girilirse ortalama hesaplanır
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Miktar</label>
                <Input
                  type="number"
                  min="1"
                  value={entryForm.quantity}
                  onChange={(e) => setEntryForm({ ...entryForm, quantity: e.target.value })}
                  className="bg-background border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">Mevcut stok üzerine eklenecek</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenEntry(false)}
              className="border-gray-600 text-muted-foreground"
            >
              İptal
            </Button>
            <Button onClick={handleEntry} className="bg-success text-white hover:bg-success/90">
              <PackagePlus className="w-4 h-4 mr-2" />
              Stok Girişi Yap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product History Modal */}
      <Dialog open={openHistory} onOpenChange={setOpenHistory}>
        <DialogContent className="bg-card text-card-foreground border border-border shadow-professional-xl animate-scale-in max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Ürün Geçmişi — {historyTarget?.name}
            </DialogTitle>
            <DialogDescription>
              {historyTarget?.name} ürününün tüm stok hareketleri ve satış geçmişi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loadingHistory ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Geçmiş yükleniyor...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {productHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Bu ürün için henüz hareket kaydı bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {productHistory.map((movement, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-accent rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              movement.type === "in"
                                ? "bg-success"
                                : movement.type === "sale"
                                ? "bg-primary"
                                : "bg-info"
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {movement.type === "in"
                                  ? "Stok Girişi"
                                  : movement.type === "sale"
                                  ? "Satış"
                                  : movement.type === "service_usage"
                                  ? "Servis Kullanımı"
                                  : movement.type === "correction"
                                  ? "Düzeltme"
                                  : "Diğer"}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {movement.quantity} {historyTarget?.unit}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {movement.note}
                              {movement.staff_name && ` • ${movement.staff_name}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            {new Date(movement.movement_date).toLocaleDateString("tr-TR")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(movement.movement_date).toLocaleTimeString("tr-TR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenHistory(false)}
              className="border-gray-600 text-muted-foreground"
            >
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Modal */}
      <Dialog open={openExit} onOpenChange={setOpenExit}>
        <DialogContent className="bg-card text-card-foreground border border-border shadow-professional-xl animate-scale-in max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageMinus className="w-5 h-5 text-info" />
              Stok Çıkışı {exitTarget ? `— ${exitTarget.name}` : ""}
            </DialogTitle>
            <DialogDescription>Satış veya servis kullanımı için stok çıkışı yapın.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Çıkış Tipi</label>
                <Select
                  value={exitForm.type}
                  onValueChange={(v) => setExitForm({ ...exitForm, type: v as "service" | "sale" })}
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="service" className="text-foreground">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        Servis Kullanımı
                      </div>
                    </SelectItem>
                    <SelectItem value="sale" className="text-foreground">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Müşteri Satışı
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Miktar</label>
                <Input
                  type="number"
                  min="1"
                  max={
                    exitTarget?.track_stock === true || exitTarget?.track_stock === 1
                      ? exitTarget?.current_stock || 999
                      : 999999
                  }
                  value={exitForm.quantity}
                  onChange={(e) => setExitForm({ ...exitForm, quantity: e.target.value })}
                  className="bg-background border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {exitTarget?.track_stock === true || exitTarget?.track_stock === 1 ? (
                    `Mevcut: ${exitTarget?.current_stock || 0} ${exitTarget?.unit}`
                  ) : (
                    "Stok takibi yapılmıyor"
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Personel</label>
                <Select
                  value={exitForm.staff_id}
                  onValueChange={(v) => setExitForm({ ...exitForm, staff_id: v })}
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Personel seçin" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)} className="text-foreground">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">İşlemi yapan personel</p>
              </div>
            </div>

            {exitForm.type === "sale" && (
              <div className="grid grid-cols-2 gap-3 p-4 bg-primary/10 rounded-lg border border-primary/30">
                <div>
                  <label className="text-sm font-medium text-primary">Müşteri</label>
                  <Select
                    value={exitForm.customer_id}
                    onValueChange={(v) => setExitForm({ ...exitForm, customer_id: v })}
                  >
                    <SelectTrigger className="bg-popover border-border text-foreground">
                      <SelectValue placeholder="Müşteri seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={String(customer.id)} className="text-foreground">
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-primary">Satış Fiyatı (Birim)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={`Önerilen: ₺${exitTarget?.sale_price || 0}`}
                    value={exitForm.sale_price}
                    onChange={(e) => setExitForm({ ...exitForm, sale_price: e.target.value })}
                    className="bg-popover border-border text-foreground"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenExit(false)}
              className="border-gray-600 text-muted-foreground"
            >
              İptal
            </Button>
            <Button onClick={handleExit} className="bg-info text-white hover:bg-info/90">
              <PackageMinus className="w-4 h-4 mr-2" />
              {exitForm.type === "sale" ? "Satış Yap" : "Servis Kullan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPage;
