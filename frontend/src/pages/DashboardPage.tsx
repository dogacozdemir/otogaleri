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
  CreditCard
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
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { api } from "../api";
import { useTranslation } from "react-i18next";
import { DashboardStats, Followup, ExpiringDocument } from "@/types/dashboard";
import { KPICard } from "@/components/KPICard";
import { SkeletonLoader } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [vehiclesRes, installmentRes, branchesRes, followupsRes, overdueInstallmentsRes, documentsRes, activeInstallmentsRes, monthlySalesRes, inventoryStatsRes, recentActivitiesRes, brandProfitRes, weeklySalesRes, weeklyInventoryRes] = await Promise.all([
        api.get("/vehicles?limit=1000"),
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
      ]);
      const vehicles = vehiclesRes.data?.vehicles || [];
      const totalVehicles = vehicles.length;
      const unsoldVehicles = vehicles.filter((v: any) => !v.is_sold).length;
      const totalSales = vehicles.filter((v: any) => v.is_sold).length;
      const activeInstallmentCount = installmentRes.data?.count || 0;
      const branches = branchesRes.data?.branches || [];
      const totalBranches = Array.isArray(branches) ? branches.length : 0;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1">{t("dashboard.title")}</h1>
          <p className="text-small text-muted-foreground mt-2">
            Oto galerinizin genel durumu ve istatistikleri
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Toplam Araç"
          value={stats?.unsoldVehicles || 0}
          subtitle="Satılmamış araç sayısı"
          icon={Car}
          iconColor="text-primary"
        />

        <KPICard
          title="Toplam Satış"
          value={stats?.totalSales || 0}
          subtitle="Satılan araç sayısı"
          icon={TrendingUp}
          iconColor="text-success"
        />

        <KPICard
          title="Taksiti Devam Eden Araç"
          value={stats?.activeInstallmentCount || 0}
          subtitle="Kalan borcu olan araç sayısı"
          icon={Clock}
          iconColor="text-warning"
        />

        <KPICard
          title="Şubeler"
          value={stats?.totalBranches || 0}
          subtitle="Aktif şube sayısı"
          icon={Building2}
          iconColor="text-primary"
        />
      </div>

      {/* Hızlı Erişim Butonları */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={() => navigate("/vehicles")}
        >
          <Plus className="h-5 w-5" />
          <span className="text-sm font-medium">Yeni Araç</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={() => navigate("/vehicles")}
        >
          <Car className="h-5 w-5" />
          <span className="text-sm font-medium">Araç Sat</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={() => navigate("/customers")}
        >
          <Users className="h-5 w-5" />
          <span className="text-sm font-medium">Müşteri Ekle</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={() => navigate("/inventory")}
        >
          <Package className="h-5 w-5" />
          <span className="text-sm font-medium">Stok</span>
        </Button>
      </div>

      {/* Haftalık Grafikler */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Haftalık Satış Grafiği */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Haftalık Araç Çıkışı
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklySales.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklySales} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fill: "#2d3748", fontSize: 11 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: "#2d3748", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => {
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                      return `${value}`;
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ 
                      color: "#2d3748", 
                      fontSize: "12px",
                      fontWeight: "500",
                      marginBottom: "4px"
                    }}
                    itemStyle={{ 
                      color: "#2d3748", 
                      fontSize: "12px"
                    }}
                    cursor={{ fill: "rgba(0, 61, 130, 0.05)" }}
                  />
                  <Bar
                    dataKey="sales_count"
                    fill="#003d82"
                    radius={[4, 4, 0, 0]}
                    name="Satış Sayısı"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-6">
                <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Satış verisi yok</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Haftalık Stok Grafiği */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-warning" />
              Haftalık Ürün/Servis Çıkışı
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyInventory.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyInventory} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fill: "#2d3748", fontSize: 11 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: "#2d3748", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => {
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                      return `${value}`;
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ 
                      color: "#2d3748", 
                      fontSize: "12px",
                      fontWeight: "500",
                      marginBottom: "4px"
                    }}
                    itemStyle={{ 
                      color: "#2d3748", 
                      fontSize: "12px"
                    }}
                    cursor={{ fill: "rgba(0, 61, 130, 0.05)" }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: "11px", color: "#2d3748" }}
                    iconType="square"
                  />
                  <Bar
                    dataKey="service_count"
                    fill="#16a34a"
                    radius={[4, 4, 0, 0]}
                    name="Servis"
                  />
                  <Bar
                    dataKey="sale_count"
                    fill="#003d82"
                    radius={[4, 4, 0, 0]}
                    name="Satış"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-6">
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Stok verisi yok</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Satış Performansı ve Stok Durumu */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Satış Performansı Widget */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Satış Performansı
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlySales ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-bold">{monthlySales.currentMonth}</span>
                    <span className="text-sm text-muted-foreground">Bu Ay Satış</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {monthlySales.trend === "up" ? (
                      <>
                        <ArrowUp className="h-4 w-4 text-success" />
                        <span className="text-sm text-success font-medium">
                          +{Math.abs(monthlySales.changePercent)}% önceki aya göre
                        </span>
                      </>
                    ) : monthlySales.trend === "down" ? (
                      <>
                        <ArrowDown className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-destructive font-medium">
                          {monthlySales.changePercent}% önceki aya göre
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Değişiklik yok</span>
                    )}
                  </div>
                </div>
                {topBrand && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">En Çok Satan Marka</p>
                    <p className="text-sm font-medium">{topBrand.brand}</p>
                    <p className="text-xs text-muted-foreground">{topBrand.sold_count} adet satıldı</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Satış verisi yok</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stok Durumu Widget */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-warning" />
              Stok Durumu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inventoryStats ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-bold">{inventoryStats.totalProducts || 0}</span>
                    <span className="text-sm text-muted-foreground">Ürün</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {inventoryStats.trend === "up" ? (
                      <>
                        <ArrowUp className="h-4 w-4 text-success" />
                        <span className="text-sm text-success font-medium">
                          +{Math.abs(inventoryStats.changePercent)}% önceki aya göre
                        </span>
                      </>
                    ) : inventoryStats.trend === "down" ? (
                      <>
                        <ArrowDown className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-destructive font-medium">
                          {inventoryStats.changePercent}% önceki aya göre
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Değişiklik yok</span>
                    )}
                  </div>
                </div>
                {inventoryStats.topSelling && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">En Çok Satılan Ürün</p>
                    <p className="text-sm font-medium">{inventoryStats.topSelling.name}</p>
                    <p className="text-xs text-muted-foreground">{inventoryStats.topSelling.salesCount} adet satıldı</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Stok verisi yok</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Süresi Dolacak Belgeler ve Taksitler */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Expiring Documents Widget */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-warning" />
              Süresi Dolacak Belgeler
            </CardTitle>
            <Badge variant={expiringDocuments.length > 0 ? "destructive" : "secondary"}>{expiringDocuments.length}</Badge>
          </CardHeader>
          <CardContent>
            {expiringDocuments.length > 0 ? (
              <div className="space-y-3">
                {expiringDocuments.slice(0, 5).map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between p-3 bg-accent/50 rounded-lg border border-border hover:bg-accent hover:shadow-sm transition-all duration-200 cursor-pointer micro-bounce"
                    onClick={() => navigate(`/vehicles`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-medium truncate">{doc.document_name}</p>
                        <Badge
                          variant={doc.days_until_expiry <= 7 ? "destructive" : doc.days_until_expiry <= 14 ? "warning" : "secondary"}
                          className="text-xs flex-shrink-0"
                        >
                          {doc.days_until_expiry} gün
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {doc.maker} {doc.model} - {doc.document_type === "insurance" ? "Sigorta" : doc.document_type === "inspection" ? "Muayene" : doc.document_type}
                      </p>
                      {doc.expiry_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(doc.expiry_date), "dd MMMM yyyy", { locale: tr })}
                        </p>
                      )}
                    </div>
                    {doc.days_until_expiry <= 7 && (
                      <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 ml-2" />
                    )}
                  </div>
                ))}
                {expiringDocuments.length > 5 && (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => navigate("/vehicles")}
                  >
                    Tümünü Gör ({expiringDocuments.length})
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Süresi dolacak belge yok</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Installments Widget */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Taksitler
            </CardTitle>
            <Badge variant={activeInstallments.length > 0 ? "secondary" : "outline"}>{activeInstallments.length}</Badge>
          </CardHeader>
          <CardContent>
            {activeInstallments.length > 0 ? (
              <div className="space-y-3">
                {activeInstallments.slice(0, 5).map((installment: any) => (
                  <div
                    key={installment.installment_sale_id}
                    className="flex items-start justify-between p-3 bg-accent/50 rounded-lg border border-border hover:bg-accent hover:shadow-sm transition-all duration-200 cursor-pointer micro-bounce"
                    onClick={() => navigate(`/vehicles`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-medium truncate">
                          {installment.customer_name_full || installment.customer_name || "Müşteri"}
                        </p>
                        <Badge
                          variant={installment.days_since_last_payment >= 30 ? "destructive" : installment.days_since_last_payment >= 15 ? "warning" : "secondary"}
                          className="text-xs flex-shrink-0"
                        >
                          {installment.days_since_last_payment || 0} gün
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {installment.maker} {installment.model} {installment.year}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Kalan: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: installment.currency || 'TRY' }).format(installment.remaining_balance || 0)}
                      </p>
                      {installment.last_payment_date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Son ödeme: {format(new Date(installment.last_payment_date), "dd MMM yyyy", { locale: tr })}
                        </p>
                      )}
                    </div>
                    {installment.days_since_last_payment >= 30 && (
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 ml-2" />
                    )}
                  </div>
                ))}
                {activeInstallments.length > 5 && (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => navigate("/vehicles")}
                  >
                    Tümünü Gör ({activeInstallments.length})
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aktif taksit yok</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Son Aktiviteler ve Takip Görevleri */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Son Aktiviteler Widget */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Son Aktiviteler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.slice(0, activitiesLimit).map((activity: any) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-2 bg-accent/50 rounded-lg hover:bg-accent transition-colors cursor-pointer"
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
                    <div className="flex-shrink-0 mt-0.5">
                      {activity.type === 'sale' && <Car className="h-4 w-4 text-success" />}
                      {activity.type === 'vehicle' && <Plus className="h-4 w-4 text-primary" />}
                      {activity.type === 'payment' && <DollarSign className="h-4 w-4 text-warning" />}
                      {activity.type === 'customer' && <Users className="h-4 w-4 text-info" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{activity.subtitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(activity.date), "dd MMM yyyy HH:mm", { locale: tr })}
                      </p>
                    </div>
                  </div>
                ))}
                {recentActivities.length > activitiesLimit && (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => setActivitiesLimit(activitiesLimit + 5)}
                  >
                    Daha Fazla Gör ({recentActivities.length - activitiesLimit} kaldı)
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aktivite yok</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Followups Widget */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Takip Görevleri
            </CardTitle>
            <Badge variant="secondary">{todayFollowups.length}</Badge>
          </CardHeader>
          <CardContent>
            {todayFollowups.length > 0 ? (
              <div className="space-y-3">
                {todayFollowups.slice(0, followupsLimit).map((followup: any) => (
                  <div
                    key={followup.id}
                    className="flex items-start justify-between p-3 bg-accent/50 rounded-lg border border-border hover:bg-accent hover:shadow-sm transition-all duration-200 cursor-pointer micro-bounce"
                    onClick={() => {
                      if (followup.type === 'installment_overdue') {
                        navigate(`/vehicles`);
                      } else {
                        navigate(`/customers/${followup.customer_id}`);
                      }
                    }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{followup.customer_name_full || followup.customer_name}</p>
                        {followup.type === 'installment_overdue' ? (
                          <Badge variant="destructive" className="text-xs">
                            Gecikmiş Taksit
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {followup.followup_type === "call" ? "Telefon" : followup.followup_type === "sms" ? "SMS" : followup.followup_type === "email" ? "E-posta" : followup.followup_type}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {followup.maker} {followup.model}
                        {followup.type === 'installment_overdue' && followup.days_overdue && (
                          <span className="text-orange-600 font-semibold"> - {followup.days_overdue} gün gecikme</span>
                        )}
                        {followup.followup_time && !followup.type && ` - ${followup.followup_time}`}
                      </p>
                    </div>
                    {followup.type === 'installment_overdue' ? (
                      <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 ml-2" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                    )}
                  </div>
                ))}
                {todayFollowups.length > followupsLimit && (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => setFollowupsLimit(followupsLimit + 5)}
                  >
                    Daha Fazla Gör ({todayFollowups.length - followupsLimit} kaldı)
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Takip görevi yok</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
