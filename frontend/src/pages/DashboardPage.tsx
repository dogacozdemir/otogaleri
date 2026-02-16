import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Car, 
  TrendingUp, 
  Building2,
  MessageSquare,
  FileText,
  Clock,
  AlertCircle,
  Plus,
  DollarSign,
  Users,
  Package,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Activity,
  CreditCard,
  CheckCircle
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { api } from "../api";
import { useTranslation } from "react-i18next";
import { DashboardStats, Followup, ExpiringDocument } from "@/types/dashboard";
import { SkeletonLoader } from "@/components/ui/skeleton";
import { getApiBaseUrl } from "@/lib/utils";
import { useTenant } from "@/contexts/TenantContext";
import { useCurrency } from "@/hooks/useCurrency";

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { formatCurrency } = useCurrency();
  const targetCurrency = tenant?.default_currency || "TRY";
  
  // Clear any leftover dashboard layout data from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dashboard-layout');
    }
  }, []);
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayFollowups, setTodayFollowups] = useState<Followup[]>([]);
  const [expiringDocuments, setExpiringDocuments] = useState<ExpiringDocument[]>([]);
  const [activeInstallments, setActiveInstallments] = useState<any[]>([]);
  const [monthlySales, setMonthlySales] = useState<any>(null);
  const [inventoryStats, setInventoryStats] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [topBrand, setTopBrand] = useState<any>(null);
  const [activitiesLimit, setActivitiesLimit] = useState(5);
  const [followupsLimit, setFollowupsLimit] = useState(5);
  const [weeklySales, setWeeklySales] = useState<any[]>([]);
  const [weeklyInventory, setWeeklyInventory] = useState<any[]>([]);
  const [topOverdueInstallments, setTopOverdueInstallments] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [vehiclesRes, installmentRes, branchesRes, followupsRes, overdueInstallmentsRes, documentsRes, activeInstallmentsRes, monthlySalesRes, inventoryStatsRes, recentActivitiesRes, brandProfitRes, weeklySalesRes, weeklyInventoryRes, topOverdueRes, recentSalesRes] = await Promise.all([
        api.get("/vehicles?limit=100"),
        api.get("/analytics/active-installment-count").catch(() => ({ data: { count: 0 } })),
        api.get("/branches").catch(() => ({ data: { branches: [] } })),
        api.get("/followups/today").catch(() => ({ data: [] })),
        api.get("/installments/overdue").catch(() => ({ data: [] })),
        api.get("/documents/expiring?days=30").catch(() => ({ data: [] })),
        api.get("/installments/active").catch(() => ({ data: [] })),
        api.get("/analytics/monthly-sales").catch(() => ({ data: null })),
        api.get("/inventory/analytics/stats").catch(() => ({ data: null })),
        api.get("/analytics/recent-activities?limit=8").catch(() => ({ data: [] })),
        api.get("/analytics/brand-profit?limit=1").catch(() => ({ data: [] })),
        api.get("/analytics/weekly-sales").catch(() => ({ data: [] })),
        api.get("/analytics/weekly-inventory").catch(() => ({ data: [] })),
        api.get("/installments/overdue/top").catch(() => ({ data: [] })),
        api.get("/analytics/recent-sales?limit=10").catch(() => ({ data: [] })),
      ]);
      const vehicles = vehiclesRes.data?.vehicles || [];
      const totalVehicles = vehicles.length;
      const unsoldVehicles = vehicles.filter((v: any) => !v.is_sold).length;
      const totalSales = vehicles.filter((v: any) => v.is_sold).length;
      const activeInstallmentCount = installmentRes.data?.count || 0;
      // Use pagination.total if available, otherwise count branches array
      const branches = branchesRes.data?.branches || [];
      const totalBranches = branchesRes.data?.pagination?.total ?? (Array.isArray(branches) ? branches.length : 0);

      // Takip görevlerini ve gecikmiş taksitleri birleştir
      const followups = followupsRes.data || [];
      const overdueInstallmentsRaw = overdueInstallmentsRes.data || [];
      // Backend JOIN'leri aynı installment_sale_id için birden fazla satır döndürebilir - deduplicate
      const seenSaleIds = new Set<number>();
      const overdueInstallments = overdueInstallmentsRaw.filter((i: any) => {
        const id = i.installment_sale_id;
        if (seenSaleIds.has(id)) return false;
        seenSaleIds.add(id);
        return true;
      });
      
      // Gecikmiş taksitleri takip görevi formatına çevir
      const installmentFollowups = overdueInstallments.map((installment: any) => ({
        id: `installment-${installment.installment_sale_id}`,
        type: 'installment_overdue',
        customer_name: installment.customer_name || installment.customer_name_full,
        customer_id: installment.customer_id,
        maker: installment.maker,
        model: installment.model,
        year: installment.year,
        days_overdue: installment.days_overdue,
        remaining_balance: installment.remaining_balance,
        last_payment_date: installment.last_payment_date,
        followup_date: installment.last_payment_date,
      }));

      // Tüm görevleri birleştir ve tarihe göre sırala
      const allFollowups = [...followups, ...installmentFollowups].sort((a: any, b: any) => {
        const dateA = new Date(a.followup_date || a.followup_date || 0);
        const dateB = new Date(b.followup_date || b.followup_date || 0);
        return dateA.getTime() - dateB.getTime();
      });

      setStats({
        totalVehicles,
        unsoldVehicles,
        totalSales,
        totalProfit: 0, // Artık kullanılmıyor ama interface uyumluluğu için
        totalBranches,
        activeInstallmentCount,
      });
      setTodayFollowups(allFollowups);
      setExpiringDocuments(documentsRes.data || []);
      setActiveInstallments(activeInstallmentsRes.data || []);
      setMonthlySales(monthlySalesRes.data);
      setInventoryStats(inventoryStatsRes.data);
      setRecentActivities(recentActivitiesRes.data || []);
      setTopBrand(brandProfitRes.data?.[0] || null);
      setWeeklySales(weeklySalesRes.data || []);
      setWeeklyInventory(weeklyInventoryRes.data || []);
      setTopOverdueInstallments(topOverdueRes.data || []);
      setRecentSales(recentSalesRes.data || []);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <SkeletonLoader type="text" className="h-9 w-64 mb-2" />
            <SkeletonLoader type="text" className="h-4 w-96" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SkeletonLoader type="card" count={4} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonLoader type="card" count={2} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Toplam Araç */}
        <Card className="rounded-2xl border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Araç</CardTitle>
            <div className="rounded-xl bg-blue-100 dark:bg-blue-900/20 p-2">
              <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalVehicles || 0}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{stats?.unsoldVehicles || 0} satılmamış</span>
            </div>
          </CardContent>
        </Card>

        {/* Aylık Satış */}
        <Card className="rounded-2xl border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aylık Satış</CardTitle>
            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/20 p-2">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlySales?.currentMonth || 0}</div>
            {monthlySales && (
              <div className={`flex items-center gap-1 text-xs ${monthlySales.trend === "up" ? "text-emerald-600" : monthlySales.trend === "down" ? "text-red-600" : "text-muted-foreground"}`}>
                {monthlySales.trend === "up" && <TrendingUp className="h-3 w-3" />}
                {monthlySales.trend === "down" && <ArrowDown className="h-3 w-3" />}
                <span className="font-medium">{monthlySales.trend === "up" ? "+" : ""}{monthlySales.changePercent?.toFixed(1) || 0}%</span>
                <span className="text-muted-foreground">geçen aya göre</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Taksiti Devam Eden Araç */}
        <Card className="rounded-2xl border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Taksitler</CardTitle>
            <div className="rounded-xl bg-amber-100 dark:bg-amber-900/20 p-2">
              <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeInstallmentCount || 0}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{activeInstallments.length > 0 ? `${activeInstallments.length} aktif` : "Taksit yok"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Toplam Satış */}
        <Card className="rounded-2xl border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Satış</CardTitle>
            <div className="rounded-xl bg-purple-100 dark:bg-purple-900/20 p-2">
              <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSales || 0}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Tüm zamanlar</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafikler: Sol (Bar Charts) - Sağ (Donut Charts) */}
      <div className="grid gap-6 grid-cols-12">
        {/* İlk Satır: Haftalık Araç Çıkışı (Bar Chart) - Sol */}
        <Card className="col-span-12 lg:col-span-8 rounded-2xl border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 dark:bg-blue-900/20 p-2 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/30 transition-colors">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-base font-semibold text-foreground">Haftalık Araç Çıkışı</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {weeklySales.length > 0 ? (
              <div className="h-[220px] sm:h-[300px] min-h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%" minHeight={200} initialDimension={{ width: 100, height: 200 }}>
                <BarChart data={weeklySales}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#003d82" />
                      <stop offset="100%" stopColor="#0066cc" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="week" stroke="#888888" fontSize={13} fontWeight={500} tick={{ dy: 5 }} />
                  <YAxis stroke="#888888" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Bar dataKey="sales_count" name="Satış:" fill="url(#salesGradient)" radius={[8, 8, 0, 0]} barSize={45} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/20 p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Satış verisi yok</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Veri geldiğinde burada görünecek</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Satış Performansı Donut Chart - Sağ */}
        <Card className="col-span-12 lg:col-span-4 rounded-2xl border-l-4 border-l-emerald-500 shadow-md hover:shadow-lg transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/20 p-2 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/30 transition-colors">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-base font-semibold text-foreground">Satış Performansı</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {monthlySales ? (() => {
              const salesPerformanceData = [
                { name: "Bu Ay", value: monthlySales.currentMonth || 0, color: "#10b981" },
                { name: "Geçen Ay", value: monthlySales.lastMonth || 0, color: "#34d399" },
              ];
              
              return (
                <>
                  <ResponsiveContainer width="100%" height={250} minHeight={200} initialDimension={{ width: 100, height: 200 }}>
                    <PieChart>
                      <Pie
                        data={salesPerformanceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {salesPerformanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "12px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                          padding: "8px 12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {salesPerformanceData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-medium text-foreground">{item.name}</span>
                        </div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.value}</span>
                      </div>
                    ))}
                    {monthlySales.trend && (
                      <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/50 mt-2">
                        <div className="flex items-center gap-1.5 text-xs">
                          {monthlySales.trend === "up" ? (
                            <>
                              <ArrowUp className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="font-bold text-emerald-600">+{Math.abs(monthlySales.changePercent || 0).toFixed(1)}%</span>
                            </>
                          ) : monthlySales.trend === "down" ? (
                            <>
                              <ArrowDown className="h-3.5 w-3.5 text-red-600" />
                              <span className="font-bold text-red-600">{monthlySales.changePercent?.toFixed(1) || 0}%</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Değişiklik yok</span>
                          )}
                          <span className="text-muted-foreground">geçen aya göre</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })() : (
              <div className="text-center py-12">
                <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/20 p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <DollarSign className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Satış verisi yok</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Veri geldiğinde burada görünecek</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* İkinci Satır: Haftalık Ürün/Servis Çıkışı (Bar Chart) - Sol */}
        <Card className="col-span-12 lg:col-span-8 rounded-2xl border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-100 dark:bg-purple-900/20 p-2 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/30 transition-colors">
                <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-base font-semibold text-foreground">Haftalık Ürün/Servis Çıkışı</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {weeklyInventory.length > 0 ? (
              <div className="h-[220px] sm:h-[300px] min-h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%" minHeight={200} initialDimension={{ width: 100, height: 200 }}>
                <BarChart data={weeklyInventory}>
                  <defs>
                    <linearGradient id="serviceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#003d82" />
                      <stop offset="100%" stopColor="#0066cc" />
                    </linearGradient>
                    <linearGradient id="saleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0066cc" />
                      <stop offset="100%" stopColor="#0088ff" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="week" stroke="#888888" fontSize={13} fontWeight={500} tick={{ dy: 5 }} />
                  <YAxis stroke="#888888" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Bar dataKey="service_count" fill="url(#serviceGradient)" radius={[8, 8, 0, 0]} name="Servis" barSize={45} />
                  <Bar dataKey="sale_count" fill="url(#saleGradient)" radius={[8, 8, 0, 0]} name="Satış" barSize={45} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="rounded-full bg-purple-100 dark:bg-purple-900/20 p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <Package className="h-8 w-8 text-purple-500 dark:text-purple-400" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Stok verisi yok</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Veri geldiğinde burada görünecek</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stok Durumu Donut Chart - Sağ */}
        <Card className="col-span-12 lg:col-span-4 rounded-2xl border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-100 dark:bg-amber-900/20 p-2 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/30 transition-colors">
                <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-base font-semibold text-foreground">Stok Durumu</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {inventoryStats ? (() => {
              // Stok durumu için veri hazırla - Toplam ürün ve satılan ürün karşılaştırması
              const stockData = [
                { name: "Toplam Ürün", value: inventoryStats.totalProducts || 0, color: "#f59e0b" },
                { name: "Satılan", value: inventoryStats.topSelling?.salesCount || 0, color: "#fbbf24" },
              ];
              
              return (
                <>
                  <ResponsiveContainer width="100%" height={250} minHeight={200} initialDimension={{ width: 100, height: 200 }}>
                    <PieChart>
                      <Pie
                        data={stockData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {stockData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "12px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                          padding: "8px 12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {stockData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 dark:bg-amber-900/10">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-medium text-foreground">{item.name}</span>
                        </div>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{item.value}</span>
                      </div>
                    ))}
                    {inventoryStats.trend && (
                      <div className="pt-2 border-t border-amber-200 dark:border-amber-800/50 mt-2">
                        <div className="flex items-center gap-1.5 text-xs">
                          {inventoryStats.trend === "up" ? (
                            <>
                              <ArrowUp className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="font-bold text-emerald-600">+{Math.abs(inventoryStats.changePercent || 0).toFixed(1)}%</span>
                            </>
                          ) : inventoryStats.trend === "down" ? (
                            <>
                              <ArrowDown className="h-3.5 w-3.5 text-red-600" />
                              <span className="font-bold text-red-600">{inventoryStats.changePercent?.toFixed(1) || 0}%</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Değişiklik yok</span>
                          )}
                          <span className="text-muted-foreground">geçen aya göre</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })() : (
              <div className="text-center py-6">
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Stok verisi yok</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales Table */}
      <Card className="rounded-2xl border-l-4 border-l-emerald-500 shadow-md hover:shadow-lg transition-all duration-300 group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/20 p-2 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/30 transition-colors">
              <Car className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle className="text-base font-semibold text-foreground">Son Satışlar</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {recentSales.length > 0 ? (
            <div className="space-y-4">
            <div className="w-full min-w-0 overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[120px]">Araç</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Fiyat</TableHead>
                  <TableHead>Ödeme Tipi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.slice(0, 5).map((sale: any) => {
                  const imageUrl = sale.image 
                    ? `${getApiBaseUrl()}${sale.image}` 
                    : null;
                  const formattedPrice = new Intl.NumberFormat('tr-TR', {
                    style: 'currency',
                    currency: sale.currency || 'TRY',
                    maximumFractionDigits: 0,
                  }).format(sale.price || 0);
                  
                  const getStatusBadge = () => {
                    if (sale.payment_type === 'Taksitli') {
                      return (
                        <Badge className="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30">
                          Taksitli
                        </Badge>
                      );
                    }
                    return (
                      <Badge className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30">
                        Peşin
                      </Badge>
                    );
                  };

                  return (
                    <TableRow 
                      key={sale.id}
                      className="cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all duration-200 border-b border-border/50"
                      onClick={() => navigate(`/vehicles/${sale.vehicle_id}`)}
                    >
                      <TableCell className="sticky left-0 bg-card z-10">
                        {imageUrl ? (
                          <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-muted ring-2 ring-border/50 hover:ring-emerald-500/30 transition-all">
                            <img 
                              src={imageUrl} 
                              alt={`${sale.maker} ${sale.model}`}
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder.svg';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 flex items-center justify-center ring-2 ring-border/50">
                            <Car className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {sale.maker} {sale.model} {sale.year}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{sale.customer_name || "Müşteri"}</TableCell>
                      <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">{formattedPrice}</TableCell>
                      <TableCell>
                        {getStatusBadge()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
            {recentSales.length > 5 && (
              <Button
                variant="outline"
                className="w-full rounded-xl border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                onClick={() => navigate("/vehicles")}
              >
                Daha fazla gör
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/20 p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <Car className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Satış verisi yok</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Satış yapıldığında burada görünecek</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alt Bölüm: Sol (Gecikmiş Taksitler + Belgeler) ve Sağ (Aktiviteler + Görevler) */}
      <div className="grid gap-6 grid-cols-12 items-stretch">
        {/* Sol Taraf: Gecikmiş Taksitler ve Süresi Dolacak Belgeler */}
        <div className="col-span-12 lg:col-span-8 grid gap-6 grid-cols-1 sm:grid-cols-2 items-stretch">
          {/* Gecikmiş Taksitler */}
          <Card className="rounded-2xl border-l-4 border-l-red-500 shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col group">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-red-100 dark:bg-red-900/20 p-2 group-hover:bg-red-200 dark:group-hover:bg-red-900/30 transition-colors">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">Gecikmiş Taksitler</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {topOverdueInstallments.length > 0 && (
                  <Badge className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30">{topOverdueInstallments.length}</Badge>
                )}
                {topOverdueInstallments.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => navigate("/vehicles?tab=sold")}
                  >
                    View All →
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {topOverdueInstallments.length > 0 ? (
                <div className={`flex-1 ${topOverdueInstallments.length > 5 ? 'max-h-[500px] overflow-y-auto' : ''}`}>
                  <div className="space-y-2 px-4 pb-4">
                    {topOverdueInstallments.map((installment: any) => (
                      <div
                        key={installment.installment_sale_id}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-red-50/80 dark:hover:bg-red-900/20 transition-all duration-200 cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-800/50 hover:shadow-sm group/item"
                        onClick={() => {
                          if (installment.customer_id) {
                            navigate(`/customers/${installment.customer_id}`);
                          } else {
                            navigate("/vehicles");
                          }
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-semibold text-foreground truncate group-hover/item:text-red-600 dark:group-hover/item:text-red-400 transition-colors">
                              {installment.customer_name || "Müşteri"}
                            </p>
                            <Badge className="bg-red-500 text-white text-xs px-2 py-0.5 h-5 font-semibold shadow-sm">
                              {installment.days_overdue || 0}g
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-1">
                            {installment.maker} {installment.model} {installment.year}
                          </p>
                          <p className="text-sm font-bold text-red-600 dark:text-red-400">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: installment.currency || 'TRY', maximumFractionDigits: 0 }).format((installment.installment_amount || 0) * (installment.fx_rate_to_base || 1))}
                          </p>
                        </div>
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-1 group-hover/item:scale-110 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 px-4 flex-1 flex items-center justify-center">
                  <div>
                    <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    <p className="text-xs text-sm text-muted-foreground">Gecikmiş taksit yok</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Süresi Dolacak Belgeler */}
          <Card className="rounded-2xl border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col group">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 dark:bg-amber-900/20 p-2 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/30 transition-colors">
                  <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">Süresi Dolacak Belgeler</CardTitle>
              </div>
              {expiringDocuments.length > 0 && (
                <Badge className={expiringDocuments.some((d: any) => d.days_until_expiry <= 7) ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30" : "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/30"}>
                  {expiringDocuments.length}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {expiringDocuments.length > 0 ? (
                <div className={`flex-1 ${expiringDocuments.length > 5 ? 'max-h-[500px] overflow-y-auto' : ''}`}>
                  <div className="space-y-2 px-4 pb-4">
                    {expiringDocuments.map((doc: any) => (
                      <div
                        key={`${doc.source}-${doc.id}`}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-amber-50/80 dark:hover:bg-amber-900/20 transition-all duration-200 cursor-pointer border border-transparent hover:border-amber-200 dark:hover:border-amber-800/50 hover:shadow-sm group/item"
                        onClick={() =>
                          doc.source === "vehicle"
                            ? navigate(`/vehicles`, { state: { selectedVehicleId: doc.vehicle_id } })
                            : navigate(`/customers/${doc.customer_id}`)
                        }
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-semibold text-foreground truncate group-hover/item:text-amber-600 dark:group-hover/item:text-amber-400 transition-colors">{doc.document_name}</p>
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-4 font-medium"
                            >
                              {doc.source === "vehicle" ? "Araç" : "Müşteri"}
                            </Badge>
                            <Badge
                              className={
                                doc.days_until_expiry <= 7
                                  ? "bg-red-500 text-white text-xs px-2 py-0.5 h-5 font-semibold shadow-sm"
                                  : doc.days_until_expiry <= 14
                                  ? "bg-amber-500 text-white text-xs px-2 py-0.5 h-5 font-semibold shadow-sm"
                                  : "bg-muted text-muted-foreground text-xs px-2 py-0.5 h-5"
                              }
                            >
                              {doc.days_until_expiry}g
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-1">
                            {doc.source === "vehicle"
                              ? `${doc.maker || ""} ${doc.model || ""} ${doc.production_year || ""}`.trim()
                              : doc.customer_name || "Müşteri"}
                          </p>
                          {doc.expiry_date && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(doc.expiry_date), "dd MMM yyyy", { locale: tr })}
                            </p>
                          )}
                        </div>
                        {doc.days_until_expiry <= 7 && (
                          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-1 group-hover/item:scale-110 transition-transform" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 px-4 flex-1 flex items-center justify-center">
                  <div>
                    <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-sm text-muted-foreground">Süresi dolacak belge yok</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sağ Taraf: Aktiviteler ve Görevler (Sekmeli) */}
        <Card className="col-span-12 lg:col-span-4 rounded-2xl border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col min-h-0 overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-100 dark:bg-purple-900/20 p-2 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/30 transition-colors">
                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-base font-semibold text-foreground">Aktiviteler & Görevler</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
            <Tabs defaultValue="activities" className="w-full flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">
              <TabsList className="grid w-full grid-cols-2 mx-4 mb-2 sm:mb-4 h-10 bg-muted/50 flex-shrink-0 shrink-0">
                <TabsTrigger value="activities" className="text-sm font-medium data-[state=active]:bg-purple-500 data-[state=active]:text-white transition-all">Aktiviteler</TabsTrigger>
                <TabsTrigger value="tasks" className="text-sm font-medium data-[state=active]:bg-purple-500 data-[state=active]:text-white transition-all">Görevler</TabsTrigger>
              </TabsList>
              
              {/* Aktiviteler Timeline */}
              <TabsContent value="activities" forceMount className="mt-0 flex-1 flex flex-col min-h-0 overflow-hidden data-[state=inactive]:hidden data-[state=inactive]:pointer-events-none">
                {recentActivities.length > 0 ? (
                  <div className={`flex-1 min-h-0 ${recentActivities.length > 5 ? 'overflow-y-auto max-h-[500px]' : 'overflow-y-auto'}`}>
                    <div className="relative px-4 pb-4">
                      {/* Timeline çizgisi */}
                      <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-purple-400 to-purple-500" />
                      <div className="space-y-3">
                        {recentActivities.map((activity: any, index: number) => {
                          const getActivityColor = () => {
                            if (activity.type === 'sale') return 'bg-success';
                            if (activity.type === 'payment') return 'bg-info';
                            if (activity.type === 'vehicle') return 'bg-primary'; // Primary color instead of purple
                            if (activity.type === 'customer') return 'bg-warning';
                            return 'bg-muted-foreground';
                          };
                          
                          const getActivityIcon = () => {
                            if (activity.type === 'sale') return <Car className="h-3 w-3" />;
                            if (activity.type === 'vehicle') return <Plus className="h-3 w-3" />;
                            if (activity.type === 'payment') return <DollarSign className="h-3 w-3" />;
                            if (activity.type === 'customer') return <Users className="h-3 w-3" />;
                            return <Activity className="h-3 w-3" />;
                          };
                          
                          return (
                            <div
                              key={activity.id}
                              className="relative flex items-start gap-3 cursor-pointer group/item"
                              onClick={() => {
                                if (activity.type === 'sale' || activity.type === 'vehicle') {
                                  navigate("/vehicles");
                                } else if (activity.type === 'customer') {
                                  navigate("/customers");
                                } else {
                                  navigate("/vehicles");
                                }
                              }}
                            >
                              {/* Timeline noktası */}
                              <div className="relative z-10 flex-shrink-0 mt-0.5">
                                <div className={`w-5 h-5 rounded-full ${getActivityColor()} border-2 border-background shadow-lg group-hover/item:scale-125 group-hover/item:shadow-xl transition-all duration-200 ring-2 ring-purple-200/50 dark:ring-purple-800/50`} />
                              </div>
                              
                              {/* İçerik */}
                              <div className="flex-1 min-w-0 pb-2 group-hover/item:bg-purple-50/80 dark:group-hover/item:bg-purple-900/20 rounded-xl p-2.5 -ml-1 transition-all duration-200 border border-transparent group-hover/item:border-purple-200 dark:group-hover/item:border-purple-800/50 group-hover/item:shadow-sm">
                                <div className="flex items-start gap-2.5">
                                  <div className={`${getActivityColor()} text-white rounded-lg p-2 flex-shrink-0 shadow-md group-hover/item:scale-110 transition-transform`}>
                                    {getActivityIcon()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate text-foreground group-hover/item:text-purple-600 dark:group-hover/item:text-purple-400 transition-colors">{activity.title}</p>
                                    <p className="text-xs text-muted-foreground truncate mt-1">{activity.subtitle}</p>
                                    <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                                      {format(new Date(activity.date), "dd MMM HH:mm", { locale: tr })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 px-4 flex-1 flex items-center justify-center">
                    <div>
                      <div className="rounded-full bg-purple-100 dark:bg-purple-900/20 p-3 w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                        <Activity className="h-7 w-7 text-purple-500 dark:text-purple-400" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">Aktivite yok</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Yeni aktiviteler burada görünecek</p>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              {/* Görevler */}
              <TabsContent value="tasks" forceMount className="mt-0 flex-1 flex flex-col min-h-0 overflow-hidden data-[state=inactive]:hidden data-[state=inactive]:pointer-events-none">
                {todayFollowups.length > 0 ? (
                  <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden ${todayFollowups.length > 5 ? 'max-h-[500px]' : ''}`}>
                    <div className="space-y-2 px-4 pb-4">
                      {todayFollowups.map((followup: any) => (
                        <div
                          key={followup.id}
                          className="flex items-start gap-3 p-3 rounded-xl hover:bg-purple-50/80 dark:hover:bg-purple-900/20 transition-all duration-200 cursor-pointer border border-transparent hover:border-purple-200 dark:hover:border-purple-800/50 hover:shadow-sm group/item"
                          onClick={() => {
                            if (followup.type === 'installment_overdue') {
                              navigate(`/vehicles`);
                            } else {
                              navigate(`/customers/${followup.customer_id}`);
                            }
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-sm font-semibold truncate text-foreground group-hover/item:text-purple-600 dark:group-hover/item:text-purple-400 transition-colors">{followup.customer_name_full || followup.customer_name}</p>
                              {followup.type === 'installment_overdue' ? (
                                <Badge className="bg-red-500 text-white text-xs px-2 py-0.5 h-5 font-semibold shadow-sm">
                                  Gecikmiş
                                </Badge>
                              ) : (
                                <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 h-5 font-medium">
                                  {followup.followup_type === "call" ? "Tel" : followup.followup_type === "sms" ? "SMS" : followup.followup_type === "email" ? "Email" : followup.followup_type}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mb-1">
                              {followup.maker} {followup.model}
                              {followup.type === 'installment_overdue' && followup.days_overdue && (
                                <span className="text-red-600 font-semibold"> - {followup.days_overdue}g</span>
                              )}
                            </p>
                            {followup.followup_time && !followup.type && (
                              <p className="text-xs text-muted-foreground">{followup.followup_time}</p>
                            )}
                          </div>
                          {followup.type === 'installment_overdue' ? (
                            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-1 group-hover/item:scale-110 transition-transform" />
                          ) : (
                            <Clock className="h-4 w-4 text-purple-500 flex-shrink-0 mt-1 group-hover/item:scale-110 transition-transform" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 px-4 flex-1 flex items-center justify-center">
                    <div>
                      <div className="rounded-full bg-purple-100 dark:bg-purple-900/20 p-3 w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                        <MessageSquare className="h-7 w-7 text-purple-500 dark:text-purple-400" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">Takip görevi yok</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Yeni görevler burada görünecek</p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
