import { useEffect, useState } from "react";
import { api } from "../api";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Car,
  Percent,
  Download,
  FileText,
  Calendar,
  Target,
  Package,
  AlertTriangle,
  ShoppingCart,
  PackageCheck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Pie,
  PieChart,
  Area,
  AreaChart,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useTenant } from "@/contexts/TenantContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Play } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
};

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { formatCurrency: currency } = useCurrency();
  const { tenant } = useTenant();
  const targetCurrency = tenant?.default_currency || "TRY";
  const [dateRange, setDateRange] = useState("30");
  const [analyticsType, setAnalyticsType] = useState<"vehicle" | "inventory">("vehicle");
  const [loading, setLoading] = useState(true);

  // Vehicle Analytics States
  const [vehicleKPIs, setVehicleKPIs] = useState({
    totalRevenue: 0,
    totalRevenueChange: 0,
    soldVehicles: 0,
    soldVehiclesChange: 0,
    avgSalePrice: 0,
    avgSalePriceChange: 0,
    netProfitMargin: 0,
    netProfitMarginChange: 0,
  });
  const [weeklyRevenue, setWeeklyRevenue] = useState<any[]>([]);
  const [topProfitable, setTopProfitable] = useState<any[]>([]);
  const [topProfitableConverted, setTopProfitableConverted] = useState<any[]>([]);
  const [brandProfit, setBrandProfit] = useState<any[]>([]);
  const [customReports, setCustomReports] = useState<any[]>([]);

  // Inventory Analytics States
  const [inventoryKPIs, setInventoryKPIs] = useState({
    totalValue: 0,
    totalValueChange: 0,
    lowStockCount: 0,
    totalProducts: 0,
    totalProductsChange: 0,
    monthlyUsage: 0,
    monthlyUsageChange: 0,
  });
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [usageTypeData, setUsageTypeData] = useState<any[]>([]);

  // Report Dialog States
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<number | null>(null);
  const [reportForm, setReportForm] = useState({
    name: "",
    description: "",
    report_type: "sales",
    format: "pdf",
    schedule_type: "",
    recipients: "",
  });

  useEffect(() => {
    if (analyticsType === "vehicle") {
      fetchVehicleAnalytics();
    } else {
      fetchInventoryAnalytics();
    }
  }, [analyticsType, dateRange]);

  const fetchVehicleAnalytics = async () => {
    try {
      setLoading(true);
      const [weeklyRes, topRes, brandRes, reportsRes] = await Promise.all([
        api.get("/analytics/weekly-revenue"),
        api.get("/analytics/top-profitable?limit=5"),
        api.get("/analytics/brand-profit?limit=10"),
        api.get("/reports").catch(() => ({ data: [] })),
      ]);

      setWeeklyRevenue(weeklyRes.data || []);
      setTopProfitable(topRes.data || []);
      setBrandProfit(brandRes.data || []);
      setCustomReports(reportsRes.data || []);
      
      // Convert top profitable vehicles to target currency
      if (topRes.data && topRes.data.length > 0) {
        try {
          // Get all sale dates for conversion
          const saleDates = topRes.data
            .map((v: any) => v.sale_date)
            .filter(Boolean);
          
          if (saleDates.length > 0) {
            const minDate = saleDates.reduce((a: string, b: string) => a < b ? a : b);
            const maxDate = saleDates.reduce((a: string, b: string) => a > b ? a : b);
            
            // Convert all sales to target currency
            const convertRes = await api.post("/accounting/convert-incomes", {
              target_currency: targetCurrency,
              startDate: minDate,
              endDate: maxDate,
            });
            
            // Create a map of vehicle sale IDs to converted amounts
            const convertedMap = new Map<number, number>();
            if (convertRes.data.conversion_details && Array.isArray(convertRes.data.conversion_details)) {
              convertRes.data.conversion_details.forEach((detail: any) => {
                if (detail.type === 'vehicle_sale' && detail.id) {
                  convertedMap.set(detail.id, Number(detail.converted_amount) || 0);
                }
              });
            }
            
            // Convert each vehicle's profit using sale_id
            const convertedVehicles = topRes.data.map((vehicle: any) => {
              const salePriceBase = vehicle.sale_price || 0;
              const profitBase = vehicle.profit || 0;
              let convertedProfit = profitBase;
              
              // Use sale_id if available, otherwise fallback to date matching
              if (vehicle.sale_id && convertedMap.has(vehicle.sale_id)) {
                const convertedSalePrice = convertedMap.get(vehicle.sale_id)!;
                if (salePriceBase > 0) {
                  const conversionRate = convertedSalePrice / salePriceBase;
                  convertedProfit = profitBase * conversionRate;
                }
                
                return {
                  ...vehicle,
                  profit: convertedProfit,
                  sale_price: convertedSalePrice,
                };
              }
              
              // Fallback: use original values if conversion not found
              return {
                ...vehicle,
                profit: profitBase,
                sale_price: salePriceBase,
              };
            });
            
            setTopProfitableConverted(convertedVehicles);
          } else {
            setTopProfitableConverted(topRes.data);
          }
        } catch (convertError) {
          console.error("Failed to convert top profitable vehicles:", convertError);
          setTopProfitableConverted(topRes.data);
        }
      } else {
        setTopProfitableConverted([]);
      }

      // Calculate KPIs
      const currentMonth = new Date();
      const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const lastMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);

      const [currentMonthRes, lastMonthRes] = await Promise.all([
        api.get(`/analytics/monthly-comparison?months=1`),
        api.get(`/analytics/monthly-comparison?months=2`),
      ]);

      const currentData = currentMonthRes.data?.[0] || { total_revenue: 0, sales_count: 0, total_profit: 0, total_costs: 0 };
      const lastData = lastMonthRes.data?.[1] || { total_revenue: 0, sales_count: 0, total_profit: 0, total_costs: 0 };

      // Convert revenue and costs to target currency
      let totalRevenue = currentData.total_revenue || 0;
      let totalCosts = currentData.total_costs || 0;
      let lastTotalRevenue = lastData.total_revenue || 0;
      let lastTotalCosts = lastData.total_costs || 0;
      
      // Get current month date range for conversion (using existing currentMonth variable)
      const currentMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      try {
        // Convert current month revenue
        const convertCurrentRevenueRes = await api.post("/accounting/convert-incomes", {
          target_currency: targetCurrency,
          startDate: currentMonthStart.toISOString().split("T")[0],
          endDate: currentMonthEnd.toISOString().split("T")[0],
        });
        if (convertCurrentRevenueRes.data.total_converted !== undefined) {
          totalRevenue = Number(convertCurrentRevenueRes.data.total_converted) || 0;
        }
        
        // Convert last month revenue
        const convertLastRevenueRes = await api.post("/accounting/convert-incomes", {
          target_currency: targetCurrency,
          startDate: lastMonthStart.toISOString().split("T")[0],
          endDate: lastMonthEnd.toISOString().split("T")[0],
        });
        if (convertLastRevenueRes.data.total_converted !== undefined) {
          lastTotalRevenue = Number(convertLastRevenueRes.data.total_converted) || 0;
        }
        
        // Convert current month costs (expenses)
        const convertCurrentCostsRes = await api.post("/accounting/convert-expenses", {
          target_currency: targetCurrency,
          startDate: currentMonthStart.toISOString().split("T")[0],
          endDate: currentMonthEnd.toISOString().split("T")[0],
        });
        if (convertCurrentCostsRes.data.total_converted !== undefined) {
          totalCosts = Number(convertCurrentCostsRes.data.total_converted) || 0;
        }
        
        // Convert last month costs
        const convertLastCostsRes = await api.post("/accounting/convert-expenses", {
          target_currency: targetCurrency,
          startDate: lastMonthStart.toISOString().split("T")[0],
          endDate: lastMonthEnd.toISOString().split("T")[0],
        });
        if (convertLastCostsRes.data.total_converted !== undefined) {
          lastTotalCosts = Number(convertLastCostsRes.data.total_converted) || 0;
        }
      } catch (convertError) {
        console.error("Failed to convert analytics data:", convertError);
        // Continue with base currency values
      }
      const totalRevenueChange = lastTotalRevenue > 0 
        ? ((totalRevenue - lastTotalRevenue) / lastTotalRevenue) * 100 
        : 0;

      const soldVehicles = currentData.sales_count || 0;
      const soldVehiclesChange = lastData.sales_count > 0 
        ? ((soldVehicles - lastData.sales_count) / lastData.sales_count) * 100 
        : 0;

      const avgSalePrice = soldVehicles > 0 ? totalRevenue / soldVehicles : 0;
      const lastAvgSalePrice = lastData.sales_count > 0 ? lastTotalRevenue / lastData.sales_count : 0;
      const avgSalePriceChange = lastAvgSalePrice > 0 
        ? ((avgSalePrice - lastAvgSalePrice) / lastAvgSalePrice) * 100 
        : 0;

      // Calculate profit from converted revenue and costs
      const currentProfit = totalRevenue - totalCosts;
      const lastProfit = lastTotalRevenue - lastTotalCosts;
      
      const netProfitMargin = totalRevenue > 0 ? (currentProfit / totalRevenue) * 100 : 0;
      const lastNetProfitMargin = lastTotalRevenue > 0 
        ? (lastProfit / lastTotalRevenue) * 100 
        : 0;
      const netProfitMarginChange = lastNetProfitMargin > 0 
        ? ((netProfitMargin - lastNetProfitMargin) / lastNetProfitMargin) * 100 
        : 0;

      setVehicleKPIs({
        totalRevenue,
        totalRevenueChange,
        soldVehicles,
        soldVehiclesChange,
        avgSalePrice,
        avgSalePriceChange,
        netProfitMargin,
        netProfitMarginChange,
      });
    } catch (err) {
      console.error("Failed to fetch vehicle analytics", err);
      toast({
        title: "Hata",
        description: "Analitik veriler yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsRes, weeklyRes] = await Promise.all([
        api.get("/inventory/analytics/overview"),
        api.get("/analytics/weekly-inventory"),
      ]);

      const analytics = analyticsRes.data || {};
      setInventoryKPIs({
        totalValue: analytics.totalValue || 0,
        totalValueChange: 12, // Mock - backend'de hesaplanabilir
        lowStockCount: analytics.lowStockCount || 0,
        totalProducts: analytics.totalProducts || 0,
        totalProductsChange: 45, // Mock - backend'de hesaplanabilir
        monthlyUsage: 54000, // Mock - backend'de hesaplanabilir
        monthlyUsageChange: -5, // Mock - backend'de hesaplanabilir
      });

      // Transform weekly inventory data
      const weeklyData = weeklyRes.data || [];
      const transformedWeekly = weeklyData.map((week: any) => ({
        week: week.week,
        stockValue: analytics.totalValue || 0, // Mock - gerçek hesaplama gerekli
        usage: (week.service_count || 0) + (week.sale_count || 0),
      }));
      setInventoryData(transformedWeekly);

      // Category breakdown
      const categories = analytics.categoryStats || [];
      const totalCategoryValue = categories.reduce((sum: number, cat: any) => sum + (cat.count || 0), 0);
      const categoryBreakdownData = categories.map((cat: any) => ({
        name: cat.category || "Diğer",
        value: (cat.count || 0) * 1000, // Mock - gerçek değer hesaplanmalı
        percentage: totalCategoryValue > 0 ? ((cat.count || 0) / totalCategoryValue) * 100 : 0,
        items: cat.count || 0,
      }));
      setCategoryBreakdown(categoryBreakdownData);

      // Usage type data
      const usageStats = analytics.usageStats || {};
      setUsageTypeData([
        { type: "Satış", value: (usageStats.for_sale_count || 0) * 1000, count: usageStats.for_sale_count || 0, color: "#003d82" },
        { type: "Servis", value: (usageStats.for_service_count || 0) * 1000, count: usageStats.for_service_count || 0, color: "#10b981" },
        { type: "Her İkisi", value: (usageStats.both_count || 0) * 1000, count: usageStats.both_count || 0, color: "#f59e0b" },
      ]);

      // Low stock items - Mock data, backend'de gerçek veri gerekli
      setLowStockItems([
        { sku: "MP-1024", name: "Yağ Filtresi", current: 12, min: 20, status: "critical" },
        { sku: "KB-5612", name: "Ön Tampon", current: 3, min: 5, status: "critical" },
        { sku: "EL-8934", name: "Far Ampülü", current: 28, min: 30, status: "warning" },
        { sku: "FR-2341", name: "Fren Balatası", current: 15, min: 18, status: "warning" },
        { sku: "MP-7823", name: "Hava Filtresi", current: 22, min: 25, status: "warning" },
      ]);
    } catch (err) {
      console.error("Failed to fetch inventory analytics", err);
      toast({
        title: "Hata",
        description: "Envanter analitik veriler yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      toast({
        title: "Bilgi",
        description: "Rapor indirme özelliği yakında eklenecek",
      });
    } catch (err) {
      toast({
        title: "Hata",
        description: "Rapor indirilemedi",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="sticky top-0 z-10 bg-[#f8f9fa] pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 rounded-xl bg-white p-1.5 shadow-sm border">
              <div className="h-10 w-32 bg-gray-200 animate-pulse rounded-lg" />
              <div className="h-10 w-32 bg-gray-200 animate-pulse rounded-lg" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-40 bg-gray-200 animate-pulse rounded-lg" />
              <div className="h-10 w-32 bg-gray-200 animate-pulse rounded-lg" />
            </div>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="rounded-xl shadow-sm">
                <CardContent className="p-6">
                <div className="h-32 bg-gray-200 animate-pulse rounded-lg" />
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-[#f8f9fa] pb-4">
        <div className="flex items-center justify-between gap-4">
          {/* Segmented Control for Analytics Type */}
          <div className="flex items-center gap-2 rounded-xl bg-white p-1.5 shadow-sm border">
            <button
              onClick={() => setAnalyticsType("vehicle")}
              className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
                analyticsType === "vehicle" ? "bg-[#003d82] text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Car className="h-4 w-4" />
              Araç Analitiği
            </button>
            <button
              onClick={() => setAnalyticsType("inventory")}
              className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
                analyticsType === "inventory" ? "bg-[#003d82] text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Package className="h-4 w-4" />
              Envanter Analitiği
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px] bg-white">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Son 7 Gün</SelectItem>
                <SelectItem value="30">Son 30 Gün</SelectItem>
                <SelectItem value="90">Son 90 Gün</SelectItem>
                <SelectItem value="365">Bu Yıl</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-[#003d82] hover:bg-[#002d62]" onClick={handleDownloadReport}>
              <Download className="mr-2 h-4 w-4" />
              Rapor İndir
            </Button>
                      </div>
                      </div>
                      </div>

      {analyticsType === "vehicle" ? (
        <>
          {/* Vehicle Analytics KPI Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-xl shadow-sm border-l-4 border-l-[#003d82]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Toplam Gelir (Bu Ay)</p>
                    <p className="text-3xl font-bold mt-2">{currency(vehicleKPIs.totalRevenue)}</p>
                    <p className={`text-sm mt-1 flex items-center gap-1 ${vehicleKPIs.totalRevenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {vehicleKPIs.totalRevenueChange >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(vehicleKPIs.totalRevenueChange).toFixed(1)}% geçen aya göre
                    </p>
                    </div>
                  <div className="rounded-xl p-3 bg-blue-100">
                    <DollarSign className="h-6 w-6 text-[#003d82]" />
                  </div>
                    </div>
                  </CardContent>
                </Card>

            <Card className="rounded-xl shadow-sm border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Satılan Araçlar</p>
                    <p className="text-3xl font-bold mt-2">{vehicleKPIs.soldVehicles}</p>
                    <p className={`text-sm mt-1 flex items-center gap-1 ${vehicleKPIs.soldVehiclesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {vehicleKPIs.soldVehiclesChange >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(vehicleKPIs.soldVehiclesChange).toFixed(1)}% geçen aya göre
                    </p>
                    </div>
                  <div className="rounded-xl p-3 bg-green-100">
                    <Car className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                </CardContent>
              </Card>

            <Card className="rounded-xl shadow-sm border-l-4 border-l-orange-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ortalama Satış Fiyatı</p>
                    <p className="text-3xl font-bold mt-2">{currency(vehicleKPIs.avgSalePrice)}</p>
                    <p className={`text-sm mt-1 flex items-center gap-1 ${vehicleKPIs.avgSalePriceChange >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {vehicleKPIs.avgSalePriceChange >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(vehicleKPIs.avgSalePriceChange).toFixed(1)}% geçen aya göre
                    </p>
                    </div>
                  <div className="rounded-xl p-3 bg-orange-100">
                    <Target className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                </CardContent>
              </Card>

            <Card className="rounded-xl shadow-sm border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Net Kar Marjı</p>
                    <p className="text-3xl font-bold mt-2">{vehicleKPIs.netProfitMargin.toFixed(1)}%</p>
                    <p className={`text-sm mt-1 flex items-center gap-1 ${vehicleKPIs.netProfitMarginChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {vehicleKPIs.netProfitMarginChange >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(vehicleKPIs.netProfitMarginChange).toFixed(1)}% geçen aya göre
                    </p>
                  </div>
                  <div className="rounded-xl p-3 bg-purple-100">
                    <Percent className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                </CardContent>
              </Card>
          </div>

          {/* Core Analysis - 2 Column Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Revenue Trend Chart - 66% width */}
            <Card className="rounded-xl shadow-sm lg:col-span-2">
                <CardHeader>
                <CardTitle className="text-lg">Gelir Trendi (Haftalık)</CardTitle>
                </CardHeader>
                <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={weeklyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="week" stroke="#6b7280" style={{ fontSize: "12px" }} />
                    <YAxis
                      stroke="#6b7280"
                      style={{ fontSize: "12px" }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      formatter={(value: number) => currency(value)}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                          <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#003d82"
                      strokeWidth={3}
                      name="Toplam Gelir"
                      dot={{ fill: "#003d82", r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="#ef4444"
                      strokeWidth={3}
                      name="Toplam Maliyet"
                      dot={{ fill: "#ef4444", r: 4 }}
                    />
                        </LineChart>
                      </ResponsiveContainer>
                </CardContent>
              </Card>

            {/* Top 5 Profitable Vehicles - 33% width */}
            <Card className="rounded-xl shadow-sm">
                <CardHeader>
                <CardTitle className="text-lg">En Karlı 5 Araç</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                  {topProfitableConverted.length > 0 ? (
                    topProfitableConverted.map((vehicle, index) => (
                      <div key={vehicle.id || index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#003d82] text-xs text-white">
                              {index + 1}
                            </span>
                            {vehicle.maker} {vehicle.model}
                          </span>
                          <span className="font-bold text-green-600">{currency(vehicle.profit || 0)}</span>
                    </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full bg-[#003d82]"
                            style={{
                              width: `${topProfitableConverted[0]?.profit > 0 ? ((vehicle.profit || 0) / topProfitableConverted[0].profit) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">Veri bulunamadı</div>
                  )}
                </div>
                </CardContent>
              </Card>
          </div>

          {/* Bottom Section - Tabbed Interface */}
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-6">
              <Tabs defaultValue="detailed" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger
                    value="detailed"
                    className="data-[state=active]:bg-[#003d82] data-[state=active]:text-white"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Detaylı Raporlar
                  </TabsTrigger>
                  <TabsTrigger
                    value="custom"
                    className="data-[state=active]:bg-[#003d82] data-[state=active]:text-white"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Özelleştirilmiş Raporlar
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="detailed" className="mt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Marka Bazlı Kar Analizi</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={brandProfit}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="brand" stroke="#6b7280" style={{ fontSize: "12px" }} />
                        <YAxis
                          stroke="#6b7280"
                          style={{ fontSize: "12px" }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                        />
                        <Tooltip
                          formatter={(value: number) => currency(value)}
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="total_profit" name="Kar" radius={[8, 8, 0, 0]}>
                          {brandProfit.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="#003d82" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
        </TabsContent>

                <TabsContent value="custom" className="mt-6">
                  <div className="space-y-4">
          <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Kayıtlı Özel Raporlar</h3>
                      <Button variant="outline" size="sm" onClick={() => setShowReportDialog(true)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Yeni Rapor Oluştur
            </Button>
          </div>
          {customReports.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="pb-3 text-left text-sm font-semibold">Rapor Adı</th>
                              <th className="pb-3 text-left text-sm font-semibold">Format</th>
                              <th className="pb-3 text-left text-sm font-semibold">Son Çalıştırma</th>
                              <th className="pb-3 text-left text-sm font-semibold">Durum</th>
                              <th className="pb-3 text-right text-sm font-semibold">İşlemler</th>
                            </tr>
                          </thead>
                          <tbody>
              {customReports.map((report) => (
                              <tr key={report.id} className="border-b last:border-0">
                                <td className="py-4 text-sm font-medium">{report.name}</td>
                                <td className="py-4 text-sm">
                                  <Badge variant="outline" className="font-mono">
                                    {report.format?.toUpperCase() || "PDF"}
                      </Badge>
                                </td>
                                <td className="py-4 text-sm text-muted-foreground">
                                  {formatDateTime(report.last_run_at)}
                                </td>
                                <td className="py-4">
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                    {report.is_active ? "Hazır" : "Pasif"}
                                  </Badge>
                                </td>
                                <td className="py-4 text-right">
                                  <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                                      variant="ghost"
                        onClick={async () => {
                          try {
                            await api.post(`/reports/${report.id}/run`);
                            toast({ title: "Başarılı", description: "Rapor çalıştırıldı" });
                          } catch (error: any) {
                            toast({
                              title: "Hata",
                              description: error?.response?.data?.error || "Rapor çalıştırılamadı",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Çalıştır
                      </Button>
                      <Button
                        size="sm"
                                      variant="ghost"
                        onClick={() => {
                          setReportToDelete(report.id);
                          setShowDeleteConfirm(true);
                        }}
                      >
                                      <Download className="h-4 w-4" />
                      </Button>
                    </div>
                                </td>
                              </tr>
              ))}
                          </tbody>
                        </table>
            </div>
          ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Henüz özelleştirilmiş rapor oluşturulmamış</p>
                <Button onClick={() => setShowReportDialog(true)} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  İlk Raporu Oluştur
                </Button>
                      </div>
          )}
                  </div>
        </TabsContent>
        </Tabs>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Inventory KPI Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-xl shadow-sm border-l-4 border-l-[#003d82]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Toplam Envanter Değeri</p>
                    <p className="text-3xl font-bold mt-2">{currency(inventoryKPIs.totalValue)}</p>
                    <p className={`text-sm mt-1 flex items-center gap-1 ${inventoryKPIs.totalValueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {inventoryKPIs.totalValueChange >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(inventoryKPIs.totalValueChange)}% geçen aya göre
                    </p>
      </div>
                  <div className="rounded-xl p-3 bg-blue-100">
                    <Package className="h-6 w-6 text-[#003d82]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-sm border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Düşük Stok Uyarısı</p>
                    <p className="text-3xl font-bold mt-2">{inventoryKPIs.lowStockCount}</p>
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Acil sipariş gerekli
                    </p>
                  </div>
                  <div className="rounded-xl p-3 bg-red-100">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-sm border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Toplam Ürün Çeşidi</p>
                    <p className="text-3xl font-bold mt-2">{inventoryKPIs.totalProducts}</p>
                    <p className={`text-sm mt-1 flex items-center gap-1 ${inventoryKPIs.totalProductsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {inventoryKPIs.totalProductsChange >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      +{inventoryKPIs.totalProductsChange} yeni ürün
                    </p>
                  </div>
                  <div className="rounded-xl p-3 bg-green-100">
                    <PackageCheck className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-sm border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Aylık Kullanım</p>
                    <p className="text-3xl font-bold mt-2">{currency(inventoryKPIs.monthlyUsage)}</p>
                    <p className={`text-sm mt-1 flex items-center gap-1 ${inventoryKPIs.monthlyUsageChange >= 0 ? 'text-green-600' : 'text-purple-600'}`}>
                      {inventoryKPIs.monthlyUsageChange >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(inventoryKPIs.monthlyUsageChange)}% geçen aya göre
                    </p>
                  </div>
                  <div className="rounded-xl p-3 bg-purple-100">
                    <ShoppingCart className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Inventory Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Stock Value Trend - 66% width */}
            <Card className="rounded-xl shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Envanter Değeri ve Kullanım Trendi</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={inventoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="week" stroke="#6b7280" style={{ fontSize: "12px" }} />
                    <YAxis
                      stroke="#6b7280"
                      style={{ fontSize: "12px" }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      formatter={(value: number) => currency(value)}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="stockValue"
                      stroke="#003d82"
                      fill="#003d82"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name="Stok Değeri"
                    />
                    <Area
                      type="monotone"
                      dataKey="usage"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name="Kullanım"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Usage Type Distribution - 33% width */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Kullanım Tipi Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={usageTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {usageTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => currency(value)}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {usageTypeData.map((item) => (
                    <div key={item.type} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-medium">{item.type}</span>
                        <span className="text-muted-foreground">({item.count} ürün)</span>
                      </div>
                      <span className="font-bold">{currency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown and Low Stock Items */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Category Breakdown */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Kategori Bazlı Envanter Değeri</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={categoryBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        type="number"
                        stroke="#6b7280"
                        style={{ fontSize: "12px" }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                      />
                      <YAxis dataKey="name" type="category" stroke="#6b7280" style={{ fontSize: "12px" }} width={120} />
                      <Tooltip
                        formatter={(value: number) => currency(value)}
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="value" name="Değer" radius={[0, 8, 8, 0]}>
                        {categoryBreakdown.map((entry, index) => {
                          const COLORS = ["#003d82", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
                          return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">Kategori verisi bulunamadı</div>
                )}
              </CardContent>
            </Card>

            {/* Low Stock Items */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Düşük Stok Uyarıları</CardTitle>
                <Badge variant="destructive" className="text-xs">
                  {lowStockItems.filter((i) => i.status === "critical").length} Kritik
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lowStockItems.map((item) => (
                    <div key={item.sku} className="space-y-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>
                          <Badge variant={item.status === "critical" ? "destructive" : "outline"} className="text-xs">
                            {item.status === "critical" ? "Kritik" : "Uyarı"}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm mt-1">{item.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>Mevcut: {item.current}</span>
                          <span>•</span>
                          <span>Min: {item.min}</span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full ${item.status === "critical" ? "bg-red-500" : "bg-orange-500"}`}
                          style={{
                            width: `${Math.min((item.current / item.min) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Create Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Rapor Oluştur</DialogTitle>
            <DialogDescription>Özelleştirilmiş rapor oluşturun</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Rapor Adı *</label>
              <Input
                value={reportForm.name}
                onChange={(e) => setReportForm({ ...reportForm, name: e.target.value })}
                placeholder="Örn: Aylık Satış Raporu"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Açıklama</label>
              <Textarea
                value={reportForm.description}
                onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                placeholder="Rapor hakkında açıklama"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Rapor Türü *</label>
                <Select
                  value={reportForm.report_type}
                  onValueChange={(value) => setReportForm({ ...reportForm, report_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Satış</SelectItem>
                    <SelectItem value="profit">Kar</SelectItem>
                    <SelectItem value="inventory">Envanter</SelectItem>
                    <SelectItem value="customer">Müşteri</SelectItem>
                    <SelectItem value="staff">Personel</SelectItem>
                    <SelectItem value="financial">Finansal</SelectItem>
                    <SelectItem value="custom">Özel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Format *</label>
                <Select
                  value={reportForm.format}
                  onValueChange={(value) => setReportForm({ ...reportForm, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Zamanlama (Opsiyonel)</label>
              <Select
                value={reportForm.schedule_type || "none"}
                onValueChange={(value) => setReportForm({ ...reportForm, schedule_type: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zamanlama seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Zamanlanmamış</SelectItem>
                  <SelectItem value="daily">Günlük</SelectItem>
                  <SelectItem value="weekly">Haftalık</SelectItem>
                  <SelectItem value="monthly">Aylık</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">E-posta Alıcıları (virgülle ayırın) *</label>
              <Input
                value={reportForm.recipients}
                onChange={(e) => setReportForm({ ...reportForm, recipients: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
      </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={async () => {
                if (!reportForm.name || !reportForm.recipients) {
                  toast({
                    title: "Uyarı",
                    description: "Rapor adı ve alıcılar zorunludur",
                    variant: "destructive",
                  });
                  return;
                }
                try {
                  const recipientsArray = reportForm.recipients.split(",").map((e) => e.trim()).filter(Boolean);
                  await api.post("/reports", {
                    ...reportForm,
                    query_config: {},
                    recipients: recipientsArray,
                    schedule_config: reportForm.schedule_type ? {} : null,
                  });
                  toast({ title: "Başarılı", description: "Rapor oluşturuldu" });
                  setShowReportDialog(false);
                  setReportForm({
                    name: "",
                    description: "",
                    report_type: "sales",
                    format: "pdf",
                    schedule_type: "",
                    recipients: "",
                  });
                  fetchVehicleAnalytics();
                } catch (error: any) {
                  toast({
                    title: "Hata",
                    description: error?.response?.data?.error || "Rapor oluşturulamadı",
                    variant: "destructive",
                  });
                }
              }}
            >
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={async () => {
          if (reportToDelete) {
            try {
              await api.delete(`/reports/${reportToDelete}`);
              toast({ title: "Başarılı", description: "Rapor silindi" });
              fetchVehicleAnalytics();
            } catch (error: any) {
              toast({
                title: "Hata",
                description: error?.response?.data?.error || "Rapor silinemedi",
                variant: "destructive",
              });
            }
          }
        }}
        title="Raporu Sil"
        description="Bu raporu silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Sil"
        cancelText="İptal"
        variant="destructive"
      />
    </div>
  );
}
