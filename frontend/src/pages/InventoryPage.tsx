
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
import {
  Plus,
  Package,
  PackagePlus,
  PackageMinus,
  Trash2,
  Search,
  AlertTriangle,
  ShoppingCart,
  Wrench,
  TrendingUp,
  Minus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyInput, CURRENCIES } from "@/components/ui/currency-input";

type Product = {
  id: number;
  sku: string | null;
  name: string;
  category: string | null;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_price: number | null;
  cost_currency?: string | null;
  sale_price: number | null;
  sale_currency?: string | null;
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
  const { formatCurrency: currency, formatCurrencyWithCurrency } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "sale" | "service">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Product | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });

  const { tenant } = useTenant();
  const baseCurrency = tenant?.default_currency || "TRY";

  // Add Modal state
  const [openAdd, setOpenAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    sku: "",
    category: "",
    unit: "adet",
    cost_price: "",
    cost_currency: baseCurrency,
    sale_price: "",
    sale_currency: baseCurrency,
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
    cost_currency: baseCurrency,
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
    sale_currency: baseCurrency,
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
      setCustomers([]);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data } = await api.get("/staff");
      setStaff(data?.staff || []);
    } catch (e: any) {
      console.error("Personel listesi alınamadı:", e);
      setStaff([]);
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

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
    return ["all", ...cats];
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filteredProducts = products;

    // Filter by type
    if (activeFilter !== "all") {
      filteredProducts = filteredProducts.filter((p) => {
        if (activeFilter === "sale") {
          return p.is_for_sale || (p.is_for_sale && p.is_for_service);
        } else if (activeFilter === "service") {
          return p.is_for_service || (p.is_for_sale && p.is_for_service);
        }
        return true;
      });
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filteredProducts = filteredProducts.filter((p) => p.category === selectedCategory);
    }

    // Filter by search query
    if (q) {
      filteredProducts = filteredProducts.filter(
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
  }, [products, query, activeFilter, selectedCategory, sortConfig]);

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
      cost_currency: baseCurrency,
      sale_price: "",
      sale_currency: baseCurrency,
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
        cost_currency: addForm.cost_currency || baseCurrency,
        sale_price: addForm.sale_price ? Number(addForm.sale_price) : null,
        sale_currency: addForm.sale_currency || baseCurrency,
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
      cost_currency: p.cost_currency || baseCurrency,
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
      sale_currency: p.sale_currency || baseCurrency,
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
        cost_currency: entryForm.cost_currency || baseCurrency,
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
        payload.sale_currency = exitForm.sale_currency || baseCurrency;
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
        <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
          İkisi
        </Badge>
      );
    } else if (product.is_for_sale) {
      return (
        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30">
          Satış
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-100">
          Servis
        </Badge>
      );
    }
  };

  const getStockBadge = (current: number, min: number) => {
    const percentage = (current / min) * 100;
    if (percentage < 50) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {current}
        </Badge>
      );
    } else if (percentage < 100) {
      return (
        <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <Minus className="h-3 w-3" />
          {current}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30">
        <TrendingUp className="h-3 w-3" />
        {current}
      </Badge>
    );
  };

  const getFlowTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      sale: "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300",
      in: "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300",
      purchase: "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300",
      return: "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300",
      service_usage: "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300",
      service: "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300",
      correction: "bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300",
      out: "bg-muted text-muted-foreground",
    };
    const labels: Record<string, string> = {
      sale: "Satış",
      in: "Alım",
      purchase: "Alım",
      return: "İade",
      service_usage: "Servis",
      service: "Servis",
      correction: "Düzeltme",
      out: "Çıkış",
    };
    return (
      <Badge variant="secondary" className={cn("hover:bg-inherit", styles[type] || "bg-muted text-muted-foreground")}>
        {labels[type] || type}
      </Badge>
    );
  };

  const saleProducts = products.filter((p) => p.is_for_sale || (p.is_for_sale && p.is_for_service)).length;
  const serviceProducts = products.filter((p) => p.is_for_service || (p.is_for_sale && p.is_for_service)).length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6 rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Toplam Ürün</p>
              <h3 className="text-3xl font-bold mt-2">{analytics?.totalProducts || 0}</h3>
              </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            </div>
        </Card>

        <Card className="p-6 rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Kritik Stok</p>
              <h3 className="text-3xl font-bold mt-2 text-red-600">{analytics?.lowStockCount || 0}</h3>
              </div>
            <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            </div>
        </Card>

        <Card className="p-6 rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Satış Ürünleri</p>
              <h3 className="text-3xl font-bold mt-2">{saleProducts}</h3>
              </div>
            <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
            </div>
        </Card>

        <Card className="p-6 rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Servis Ürünleri</p>
              <h3 className="text-3xl font-bold mt-2">{serviceProducts}</h3>
              </div>
            <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <Wrench className="h-6 w-6 text-purple-600" />
            </div>
            </div>
        </Card>
      </div>

      {/* Filter and Action Bar */}
      <Card className="p-4 rounded-2xl shadow-sm border-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center relative">
          {/* Search Input - En Sol */}
          <div className="relative w-full lg:w-[280px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="SKU, İsim, Kategori Ara..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 rounded-xl border-0 bg-muted"
            />
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="rounded-xl border-0 bg-muted w-[140px]">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat === "all" ? "Tüm Kategoriler" : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type Filter Segments - Tam Ortada Sabit */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:block">
            <div className="inline-flex items-center rounded-xl bg-muted p-1">
              <Button
                variant={activeFilter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveFilter("all")}
                className={cn(
                  "rounded-lg px-4",
                  activeFilter === "all" && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
                  activeFilter !== "all" && "hover:bg-transparent text-muted-foreground",
                )}
              >
                Tüm Ürünler
              </Button>
              <Button
                variant={activeFilter === "sale" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveFilter("sale")}
                className={cn(
                  "rounded-lg px-4",
                  activeFilter === "sale" && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
                  activeFilter !== "sale" && "hover:bg-transparent text-muted-foreground",
                )}
              >
                Sadece Satış
              </Button>
              <Button
                variant={activeFilter === "service" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveFilter("service")}
                className={cn(
                  "rounded-lg px-4",
                  activeFilter === "service" && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
                  activeFilter !== "service" && "hover:bg-transparent text-muted-foreground",
                )}
              >
                Sadece Servis
              </Button>
            </div>
          </div>

          {/* Mobile Type Filter Segments */}
          <div className="lg:hidden">
            <div className="inline-flex items-center rounded-xl bg-muted p-1">
              <Button
                variant={activeFilter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveFilter("all")}
                className={cn(
                  "rounded-lg px-4",
                  activeFilter === "all" && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
                  activeFilter !== "all" && "hover:bg-transparent text-muted-foreground",
                )}
              >
                Tüm Ürünler
              </Button>
              <Button
                variant={activeFilter === "sale" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveFilter("sale")}
                className={cn(
                  "rounded-lg px-4",
                  activeFilter === "sale" && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
                  activeFilter !== "sale" && "hover:bg-transparent text-muted-foreground",
                )}
              >
                Sadece Satış
              </Button>
              <Button
                variant={activeFilter === "service" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveFilter("service")}
                className={cn(
                  "rounded-lg px-4",
                  activeFilter === "service" && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
                  activeFilter !== "service" && "hover:bg-transparent text-muted-foreground",
                )}
              >
                Sadece Servis
              </Button>
            </div>
          </div>

          {/* Add Button - Sağda */}
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl ml-auto" style={{ backgroundColor: "#003d82" }}>
                <Plus className="h-4 w-4" />
                Yeni Ürün Ekle
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
                  <CurrencyInput
                    value={addForm.cost_price}
                    currency={addForm.cost_currency || baseCurrency}
                    onValueChange={(value) => setAddForm({ ...addForm, cost_price: value })}
                    onCurrencyChange={(currency) => setAddForm({ ...addForm, cost_currency: currency })}
                    currencies={CURRENCIES}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Satış Fiyatı</label>
                  <CurrencyInput
                    value={addForm.sale_price}
                    currency={addForm.sale_currency || baseCurrency}
                    onValueChange={(value) => setAddForm({ ...addForm, sale_price: value })}
                    onCurrencyChange={(currency) => setAddForm({ ...addForm, sale_currency: currency })}
                    currencies={CURRENCIES}
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
                  className="border-border text-muted-foreground"
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
      </Card>

      {/* Data Table */}
      <Card className="rounded-2xl shadow-sm border-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Ürün Adı</TableHead>
              <TableHead className="font-semibold">Kategori</TableHead>
              <TableHead className="font-semibold">Türü</TableHead>
              <TableHead className="font-semibold">SKU</TableHead>
              <TableHead className="font-semibold">Mevcut Stok</TableHead>
              <TableHead className="font-semibold">Min. Stok</TableHead>
              <TableHead className="font-semibold text-right">Alış Fiyatı</TableHead>
              <TableHead className="font-semibold text-right">Satış Fiyatı</TableHead>
              <TableHead className="font-semibold text-right">Toplam Satış</TableHead>
              <TableHead className="font-semibold text-center">İşlemler</TableHead>
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
              const trackStock = p.track_stock === true || (p.track_stock as any) === 1;
              const low = trackStock && p.current_stock <= p.min_stock;
              return (
                <TableRow
                  key={p.id}
                  className={`${
                    low ? "bg-red-900/20" : ""
                  } hover:bg-muted/30 cursor-pointer transition-colors`}
                  onClick={() => {
                    setHistoryTarget(p);
                    setOpenHistory(true);
                    fetchProductHistory(p.id);
                  }}
                >
                  <TableCell>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistoryTarget(p);
                        setOpenHistory(true);
                        fetchProductHistory(p.id);
                      }}
                      className="font-medium hover:underline text-left"
                      style={{ color: "#003d82" }}
                    >
                      {p.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.category || "-"}</TableCell>
                  <TableCell>{getProductTypeBadge(p)}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{p.sku || "-"}</TableCell>
                  <TableCell>
                    {(p.track_stock === true || (p.track_stock as any) === 1) ? (
                      getStockBadge(p.current_stock, p.min_stock)
                    ) : (
                      <span className="text-2xl font-bold text-primary">∞</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {(p.track_stock === true || (p.track_stock as any) === 1) ? p.min_stock : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrencyWithCurrency(p.cost_price, p.cost_currency)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrencyWithCurrency(p.sale_price, p.sale_currency)}</TableCell>
                  <TableCell className="text-right font-medium">{p.sales_count}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-800 dark:hover:text-green-200 font-medium border border-green-200 dark:border-green-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEntryModal(p);
                        }}
                      >
                        <PackagePlus className="h-4 w-4 mr-1.5" />
                        Giriş
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 font-medium border border-purple-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          openExitModal(p);
                        }}
                      >
                        <PackageMinus className="h-4 w-4 mr-1.5" />
                        Çıkış
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

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
                <CurrencyInput
                  value={entryForm.cost_price}
                  currency={entryForm.cost_currency || baseCurrency}
                  onValueChange={(value) => setEntryForm({ ...entryForm, cost_price: value })}
                  onCurrencyChange={(currency) => setEntryForm({ ...entryForm, cost_currency: currency })}
                  currencies={CURRENCIES}
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
              className="border-border text-muted-foreground"
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
        <DialogContent className="bg-card text-card-foreground border border-border shadow-professional-xl animate-scale-in max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Ürün Akışı</DialogTitle>
          </DialogHeader>

          {historyTarget && (
            <div className="mt-6 space-y-6">
              {/* Product Info */}
              <Card className="p-4 rounded-xl bg-muted/50 border-0">
                <h3 className="font-semibold text-lg mb-2">{historyTarget.name}</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">SKU:</span>
                    <span className="ml-2 font-mono font-medium">{historyTarget.sku || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Kategori:</span>
                    <span className="ml-2 font-medium">{historyTarget.category || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mevcut Stok:</span>
                    <span className="ml-2 font-medium">
                      {(historyTarget.track_stock === true || (historyTarget.track_stock as any) === 1) 
                        ? `${historyTarget.current_stock} ${historyTarget.unit}` 
                        : "∞"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Toplam Satış:</span>
                    <span className="ml-2 font-medium">{historyTarget.sales_count}</span>
                  </div>
                </div>
              </Card>

              {/* Flow Timeline */}
              <div>
                <h4 className="font-semibold mb-4">İşlem Geçmişi</h4>
                {loadingHistory ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Geçmiş yükleniyor...</p>
                  </div>
                ) : productHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Bu ürün için henüz hareket kaydı bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {productHistory.map((flow, idx) => {
                      const movementDate = new Date(flow.movement_date);
                      const dateStr = movementDate.toLocaleDateString("tr-TR");
                      const timeStr = movementDate.toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      
                      // Calculate price based on type
                      let price = 0;
                      if (flow.type === "sale" && flow.sale_price) {
                        price = flow.sale_price * flow.quantity;
                      } else if (flow.type === "in" && flow.cost_price) {
                        price = flow.cost_price * flow.quantity;
                      }

                      return (
                        <Card key={idx} className="p-4 rounded-xl border hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getFlowTypeBadge(flow.type)}
                              <span className="text-sm text-muted-foreground">
                                {dateStr} • {timeStr}
                              </span>
                            </div>
                            {price > 0 && (
                              <span className={cn("font-semibold", price < 0 ? "text-red-600" : "text-green-600")}>
                                {price < 0 ? "" : "+"}
                                {flow.type === "sale"
                                  ? formatCurrencyWithCurrency(price, flow.sale_currency)
                                  : formatCurrencyWithCurrency(price, flow.cost_currency)}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {flow.customer_name && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Müşteri:</span>
                                <span className="font-medium">{flow.customer_name}</span>
                                {flow.customer_phone && (
                                  <span className="text-xs text-muted-foreground ml-2">({flow.customer_phone})</span>
                                )}
                              </div>
                            )}
                            {flow.staff_name && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Personel:</span>
                                <span className="font-medium">{flow.staff_name}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Miktar:</span>
                              <span className="font-medium">{flow.quantity} {historyTarget?.unit || "adet"}</span>
                            </div>
                            {flow.sale_price && flow.type === "sale" && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Birim Fiyat:</span>
                                <span className="font-medium">{formatCurrencyWithCurrency(flow.sale_price, flow.sale_currency)}</span>
                              </div>
                            )}
                            {flow.cost_price && flow.type === "in" && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Alış Fiyatı:</span>
                                <span className="font-medium">{formatCurrencyWithCurrency(flow.cost_price, flow.cost_currency)}</span>
                              </div>
                            )}
                            {flow.note && (
                              <div className="mt-2 text-sm text-muted-foreground border-t pt-2">
                                <span className="italic">{flow.note}</span>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenHistory(false)}
              className="border-border text-muted-foreground"
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
                    exitTarget?.track_stock === true || (exitTarget?.track_stock as any) === 1
                      ? exitTarget?.current_stock || 999
                      : 999999
                  }
                  value={exitForm.quantity}
                  onChange={(e) => setExitForm({ ...exitForm, quantity: e.target.value })}
                  className="bg-background border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {(exitTarget?.track_stock === true || (exitTarget?.track_stock as any) === 1) ? (
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
                  <CurrencyInput
                    value={exitForm.sale_price}
                    currency={exitForm.sale_currency || baseCurrency}
                    onValueChange={(value) => setExitForm({ ...exitForm, sale_price: value })}
                    onCurrencyChange={(currency) => setExitForm({ ...exitForm, sale_currency: currency })}
                    currencies={CURRENCIES}
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
              className="border-border text-muted-foreground"
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
