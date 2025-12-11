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
        api.get("/documents/vehicles/expiring?days=30").catch(() => ({ data: [] })),
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
      const overdueInstallments = overdueInstallmentsRes.data || [];
      
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
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Toplam Araç</p>
                <p className="text-3xl font-bold mt-3">{stats?.totalVehicles || 0}</p>
                <p className="text-sm text-green-600 mt-2">
                  {stats?.unsoldVehicles || 0} satılmamış
                </p>
              </div>
              <div className="rounded-xl p-4 bg-blue-100">
                <Car className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Aylık Satış */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aylık Satış</p>
                <p className="text-3xl font-bold mt-3">{monthlySales?.currentMonth || 0}</p>
                {monthlySales && (
                  <p className={`text-sm mt-2 ${monthlySales.trend === "up" ? "text-green-600" : monthlySales.trend === "down" ? "text-red-600" : "text-muted-foreground"}`}>
                    {monthlySales.trend === "up" ? "+" : ""}{monthlySales.changePercent?.toFixed(1) || 0}% geçen aya göre
                  </p>
                )}
              </div>
              <div className="rounded-xl p-4 bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Taksiti Devam Eden Araç */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aktif Taksitler</p>
                <p className="text-3xl font-bold mt-3">{stats?.activeInstallmentCount || 0}</p>
                <p className="text-sm text-green-600 mt-2">
                  {activeInstallments.length > 0 ? `${activeInstallments.length} aktif` : "Taksit yok"}
                </p>
              </div>
              <div className="rounded-xl p-4 bg-orange-100">
                <CreditCard className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Toplam Satış */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Toplam Satış</p>
                <p className="text-3xl font-bold mt-3">{stats?.totalSales || 0}</p>
                <p className="text-sm text-green-600 mt-2">
                  Tüm zamanlar
                </p>
              </div>
              <div className="rounded-xl p-4 bg-purple-100">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafikler: Sol (Bar Charts) - Sağ (Donut Charts) */}
      <div className="grid gap-6 grid-cols-12">
        {/* İlk Satır: Haftalık Araç Çıkışı (Bar Chart) - Sol */}
        <Card className="col-span-12 lg:col-span-8 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 font-semibold">Haftalık Araç Çıkışı</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklySales.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="week" stroke="#888888" fontSize={13} fontWeight={500} tick={{ dy: 5 }} />
                  <YAxis stroke="#888888" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="sales_count" fill="#003d82" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-6">
                <TrendingUp className="h-8 w-8 text-[#2d3748]/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Satış verisi yok</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Satış Performansı Donut Chart - Sağ */}
        <Card className="col-span-12 lg:col-span-4 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 font-semibold">Satış Performansı</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlySales ? (() => {
              const salesPerformanceData = [
                { name: "Bu Ay", value: monthlySales.currentMonth || 0, color: "#003d82" },
                { name: "Geçen Ay", value: monthlySales.lastMonth || 0, color: "#0066cc" },
              ];
              
              return (
                <>
                  <ResponsiveContainer width="100%" height={250}>
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
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-3 space-y-1.5">
                    {salesPerformanceData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                    {monthlySales.trend && (
                      <div className="pt-1.5 border-t mt-1.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {monthlySales.trend === "up" ? (
                            <>
                              <ArrowUp className="h-2.5 w-2.5 text-green-600" />
                              <span className="text-green-600">+{Math.abs(monthlySales.changePercent || 0).toFixed(1)}%</span>
                            </>
                          ) : monthlySales.trend === "down" ? (
                            <>
                              <ArrowDown className="h-2.5 w-2.5 text-red-600" />
                              <span className="text-red-600">{monthlySales.changePercent?.toFixed(1) || 0}%</span>
                            </>
                          ) : (
                            <span>Değişiklik yok</span>
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
                <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Satış verisi yok</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* İkinci Satır: Haftalık Ürün/Servis Çıkışı (Bar Chart) - Sol */}
        <Card className="col-span-12 lg:col-span-8 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 font-semibold">Haftalık Ürün/Servis Çıkışı</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyInventory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyInventory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="week" stroke="#888888" fontSize={13} fontWeight={500} tick={{ dy: 5 }} />
                  <YAxis stroke="#888888" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="service_count" fill="#003d82" radius={[4, 4, 0, 0]} name="Servis" barSize={40} />
                  <Bar dataKey="sale_count" fill="#0066cc" radius={[4, 4, 0, 0]} name="Satış" barSize={40} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-6">
                <Package className="h-8 w-8 text-[#2d3748]/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Stok verisi yok</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stok Durumu Donut Chart - Sağ */}
        <Card className="col-span-12 lg:col-span-4 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 font-semibold">Stok Durumu</CardTitle>
          </CardHeader>
          <CardContent>
            {inventoryStats ? (() => {
              // Stok durumu için veri hazırla - Toplam ürün ve satılan ürün karşılaştırması
              const stockData = [
                { name: "Toplam Ürün", value: inventoryStats.totalProducts || 0, color: "#003d82" },
                { name: "Satılan", value: inventoryStats.topSelling?.salesCount || 0, color: "#0066cc" },
              ];
              
              return (
                <>
                  <ResponsiveContainer width="100%" height={250}>
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
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-3 space-y-1.5">
                    {stockData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                    {inventoryStats.trend && (
                      <div className="pt-1.5 border-t mt-1.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {inventoryStats.trend === "up" ? (
                            <>
                              <ArrowUp className="h-2.5 w-2.5 text-green-600" />
                              <span className="text-green-600">+{Math.abs(inventoryStats.changePercent || 0).toFixed(1)}%</span>
                            </>
                          ) : inventoryStats.trend === "down" ? (
                            <>
                              <ArrowDown className="h-2.5 w-2.5 text-red-600" />
                              <span className="text-red-600">{inventoryStats.changePercent?.toFixed(1) || 0}%</span>
                            </>
                          ) : (
                            <span>Değişiklik yok</span>
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
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-800 font-semibold">Son Satışlar</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSales.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Araç</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Fiyat</TableHead>
                  <TableHead>Ödeme Tipi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map((sale: any) => {
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
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                          Taksitli
                        </Badge>
                      );
                    }
                    return (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        Peşin
                      </Badge>
                    );
                  };

                  return (
                    <TableRow 
                      key={sale.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/vehicles/${sale.vehicle_id}`)}
                    >
                      <TableCell>
                        {imageUrl ? (
                          <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-gray-100">
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
                          <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
                            <Car className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {sale.maker} {sale.model} {sale.year}
                      </TableCell>
                      <TableCell>{sale.customer_name || "Müşteri"}</TableCell>
                      <TableCell className="font-semibold">{formattedPrice}</TableCell>
                      <TableCell>
                        {getStatusBadge()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Car className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Satış verisi yok</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alt Bölüm: Sol (Gecikmiş Taksitler + Belgeler) ve Sağ (Aktiviteler + Görevler) */}
      <div className="grid gap-6 grid-cols-12 items-stretch">
        {/* Sol Taraf: Gecikmiş Taksitler ve Süresi Dolacak Belgeler */}
        <div className="col-span-12 lg:col-span-8 grid gap-6 grid-cols-2 items-stretch">
          {/* Gecikmiş Taksitler */}
          <Card className="rounded-xl shadow-sm h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#F0A500]" />
                Gecikmiş Taksitler
              </CardTitle>
              <div className="flex items-center gap-2">
                {topOverdueInstallments.length > 0 && (
                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{topOverdueInstallments.length}</Badge>
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
                        className="flex items-start gap-2 p-2 rounded-md hover:bg-red-50 transition-colors cursor-pointer border border-transparent hover:border-red-200"
                        onClick={() => {
                          if (installment.customer_id) {
                            navigate(`/customers/${installment.customer_id}`);
                          } else {
                            navigate("/vehicles");
                          }
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <p className="text-xs font-medium truncate">
                              {installment.customer_name || "Müşteri"}
                            </p>
                            <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0 h-4">
                              {installment.days_overdue || 0}g
                            </Badge>
                          </div>
                          <p className="text-[10px] text-sm text-muted-foreground truncate">
                            {installment.maker} {installment.model} {installment.year}
                          </p>
                          <p className="text-[10px] font-medium text-red-600 mt-0.5">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: installment.currency || 'TRY', maximumFractionDigits: 0 }).format((installment.installment_amount || 0) * (installment.fx_rate_to_base || 1))}
                          </p>
                        </div>
                        <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0 mt-0.5" />
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
          <Card className="rounded-xl shadow-sm h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#F0A500]" />
                Süresi Dolacak Belgeler
              </CardTitle>
              {expiringDocuments.length > 0 && (
                <Badge className={expiringDocuments.some((d: any) => d.days_until_expiry <= 7) ? "bg-red-100 text-red-700 hover:bg-red-100" : "bg-orange-100 text-orange-700 hover:bg-orange-100"}>
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
                        key={doc.id}
                        className="flex items-start gap-2 p-2 rounded-md hover:bg-orange-50 transition-colors cursor-pointer border border-transparent hover:border-orange-200"
                        onClick={() => navigate(`/vehicles`)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <p className="text-xs font-medium truncate">{doc.document_name}</p>
                            <Badge
                              className={
                                doc.days_until_expiry <= 7
                                  ? "bg-red-100 text-red-700 text-[10px] px-1.5 py-0 h-4"
                                  : doc.days_until_expiry <= 14
                                  ? "bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0 h-4"
                                  : "bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0 h-4"
                              }
                            >
                              {doc.days_until_expiry}g
                            </Badge>
                          </div>
                          <p className="text-[10px] text-sm text-muted-foreground truncate">
                            {doc.maker} {doc.model}
                          </p>
                          {doc.expiry_date && (
                            <p className="text-[10px] text-sm text-muted-foreground mt-0.5">
                              {format(new Date(doc.expiry_date), "dd MMM yyyy", { locale: tr })}
                            </p>
                          )}
                        </div>
                        {doc.days_until_expiry <= 7 && (
                          <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0 mt-0.5" />
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
        <Card className="col-span-12 lg:col-span-4 rounded-xl shadow-sm h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-800">Aktiviteler & Görevler</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <Tabs defaultValue="activities" className="w-full flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mx-4 mb-4 h-9">
                <TabsTrigger value="activities" className="text-xs">Aktiviteler</TabsTrigger>
                <TabsTrigger value="tasks" className="text-xs">Görevler</TabsTrigger>
              </TabsList>
              
              {/* Aktiviteler Timeline */}
              <TabsContent value="activities" className="mt-0 flex-1 flex flex-col">
                {recentActivities.length > 0 ? (
                  <div className={`flex-1 ${recentActivities.length > 5 ? 'max-h-[500px] overflow-y-auto' : ''}`}>
                    <div className="relative px-4 pb-4">
                      {/* Timeline çizgisi */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
                      <div className="space-y-3">
                        {recentActivities.map((activity: any, index: number) => {
                          const getActivityColor = () => {
                            if (activity.type === 'sale') return 'bg-green-500';
                            if (activity.type === 'payment') return 'bg-blue-500';
                            if (activity.type === 'vehicle') return 'bg-[#003d82]'; // Primary color instead of purple
                            if (activity.type === 'customer') return 'bg-orange-500';
                            return 'bg-gray-500';
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
                              className="relative flex items-start gap-3 cursor-pointer group"
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
                                <div className={`w-3 h-3 rounded-full ${getActivityColor()} border-2 border-background shadow-sm`} />
                              </div>
                              
                              {/* İçerik */}
                              <div className="flex-1 min-w-0 pb-2 group-hover:bg-accent/50 rounded-md p-1.5 -ml-1 transition-colors">
                                <div className="flex items-start gap-2">
                                  <div className={`${getActivityColor()} text-white rounded p-0.5 flex-shrink-0`}>
                                    {getActivityIcon()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{activity.title}</p>
                                    <p className="text-[10px] text-sm text-muted-foreground truncate mt-0.5">{activity.subtitle}</p>
                                    <p className="text-[10px] text-sm text-muted-foreground mt-0.5">
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
                  <div className="text-center py-8 px-4 flex-1 flex items-center justify-center">
                    <div>
                      <Activity className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-sm text-muted-foreground">Aktivite yok</p>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              {/* Görevler */}
              <TabsContent value="tasks" className="mt-0 flex-1 flex flex-col">
                {todayFollowups.length > 0 ? (
                  <div className={`flex-1 ${todayFollowups.length > 5 ? 'max-h-[500px] overflow-y-auto' : ''}`}>
                    <div className="space-y-2 px-4 pb-4">
                      {todayFollowups.map((followup: any) => (
                        <div
                          key={followup.id}
                          className="flex items-start gap-2 p-2 rounded-md hover:bg-accent transition-colors cursor-pointer border border-transparent hover:border-border"
                          onClick={() => {
                            if (followup.type === 'installment_overdue') {
                              navigate(`/vehicles`);
                            } else {
                              navigate(`/customers/${followup.customer_id}`);
                            }
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <p className="text-xs font-medium truncate">{followup.customer_name_full || followup.customer_name}</p>
                              {followup.type === 'installment_overdue' ? (
                                <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0 h-4">
                                  Gecikmiş
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0 h-4">
                                  {followup.followup_type === "call" ? "Tel" : followup.followup_type === "sms" ? "SMS" : followup.followup_type === "email" ? "Email" : followup.followup_type}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-sm text-muted-foreground truncate">
                              {followup.maker} {followup.model}
                              {followup.type === 'installment_overdue' && followup.days_overdue && (
                                <span className="text-red-600 font-medium"> - {followup.days_overdue}g</span>
                              )}
                            </p>
                            {followup.followup_time && !followup.type && (
                              <p className="text-[10px] text-sm text-muted-foreground mt-0.5">{followup.followup_time}</p>
                            )}
                          </div>
                          {followup.type === 'installment_overdue' ? (
                            <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 flex-1 flex items-center justify-center">
                    <div>
                      <MessageSquare className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-sm text-muted-foreground">Takip görevi yok</p>
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
