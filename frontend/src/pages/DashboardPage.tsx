import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Car, 
  TrendingUp, 
  DollarSign, 
  Building2,
  MessageSquare,
  FileText,
  Clock,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { api } from "../api";
import { useTranslation } from "react-i18next";
import { DashboardStats, Followup, ExpiringDocument } from "@/types/dashboard";
import { formatCurrency } from "@/lib/formatters";
import { KPICard } from "@/components/KPICard";
import { SkeletonLoader } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayFollowups, setTodayFollowups] = useState<Followup[]>([]);
  const [expiringDocuments, setExpiringDocuments] = useState<ExpiringDocument[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [vehiclesRes, topRes, branchesRes, followupsRes, documentsRes] = await Promise.all([
        api.get("/vehicles?limit=1000"),
        api.get("/analytics/top-profitable?limit=1"),
        api.get("/branches").catch(() => ({ data: { branches: [] } })),
        api.get("/followups/today").catch(() => ({ data: [] })),
        api.get("/documents/vehicles/expiring?days=30").catch(() => ({ data: [] })),
      ]);
      const vehicles = vehiclesRes.data?.vehicles || [];
      const totalVehicles = vehicles.length;
      const unsoldVehicles = vehicles.filter((v: any) => !v.is_sold).length;
      const totalSales = vehicles.filter((v: any) => v.is_sold).length;
      const totalProfit = topRes.data?.reduce((sum: number, v: any) => sum + (v.profit_base || 0), 0) || 0;
      const branches = branchesRes.data?.branches || [];
      const totalBranches = Array.isArray(branches) ? branches.length : 0;

      setStats({
        totalVehicles,
        unsoldVehicles,
        totalSales,
        totalProfit,
        totalBranches,
      });
      setTodayFollowups(followupsRes.data || []);
      setExpiringDocuments(documentsRes.data || []);
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
          value={stats?.totalVehicles || 0}
          subtitle={`${stats?.unsoldVehicles || 0} satılmamış`}
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
          title="Toplam Kar"
          value={formatCurrency(stats?.totalProfit || 0)}
          subtitle="Toplam kâr marjı"
          icon={DollarSign}
          iconColor="text-success"
          animate={false}
        />

        <KPICard
          title="Şubeler"
          value={stats?.totalBranches || 0}
          subtitle="Aktif şube sayısı"
          icon={Building2}
          iconColor="text-primary"
        />
      </div>

      {/* Widgets Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's Followups Widget */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Bugünkü Takip Görevleri
            </CardTitle>
            <Badge variant="secondary">{todayFollowups.length}</Badge>
          </CardHeader>
          <CardContent>
            {todayFollowups.length > 0 ? (
              <div className="space-y-3">
                {todayFollowups.slice(0, 5).map((followup: any) => (
                  <div
                    key={followup.id}
                    className="flex items-start justify-between p-3 bg-accent/50 rounded-lg border border-border hover:bg-accent hover:shadow-sm transition-all duration-200 cursor-pointer micro-bounce"
                    onClick={() => navigate(`/customers/${followup.customer_id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{followup.customer_name_full || followup.customer_name}</p>
                        <Badge variant="outline" className="text-xs">
                          {followup.followup_type === "call" ? "Telefon" : followup.followup_type === "sms" ? "SMS" : followup.followup_type === "email" ? "E-posta" : followup.followup_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {followup.maker} {followup.model}
                        {followup.followup_time && ` - ${followup.followup_time}`}
                      </p>
                    </div>
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                  </div>
                ))}
                {todayFollowups.length > 5 && (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => navigate("/customers")}
                  >
                    Tümünü Gör ({todayFollowups.length})
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Bugün için takip görevi yok</p>
              </div>
            )}
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}
