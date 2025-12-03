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

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [todayFollowups, setTodayFollowups] = useState<any[]>([]);
  const [expiringDocuments, setExpiringDocuments] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [vehiclesRes, topRes, followupsRes, documentsRes] = await Promise.all([
        api.get("/vehicles?limit=1000"),
        api.get("/analytics/top-profitable?limit=1"),
        api.get("/followups/today").catch(() => ({ data: [] })),
        api.get("/documents/vehicles/expiring?days=30").catch(() => ({ data: [] })),
      ]);
      const vehicles = vehiclesRes.data?.vehicles || [];
      const totalVehicles = vehicles.length;
      const unsoldVehicles = vehicles.filter((v: any) => !v.is_sold).length;
      const totalSales = vehicles.filter((v: any) => v.is_sold).length;
      const totalProfit = topRes.data?.reduce((sum: number, v: any) => sum + (v.profit_base || 0), 0) || 0;

      setStats({
        totalVehicles,
        unsoldVehicles,
        totalSales,
        totalProfit,
      });
      setTodayFollowups(followupsRes.data || []);
      setExpiringDocuments(documentsRes.data || []);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground mt-1">
            Oto galerinizin genel durumu ve istatistikleri
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Toplam Araç
            </CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalVehicles || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.unsoldVehicles || 0} satılmamış
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Toplam Satış
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSales || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Satılan araç sayısı
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Toplam Kar
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(stats?.totalProfit || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Toplam kâr marjı
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Şubeler
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aktif şube sayısı
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Widgets Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's Followups Widget */}
        <Card>
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
                    className="flex items-start justify-between p-3 bg-accent/50 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer"
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
                    <Clock className="h-4 w-4 text-muted-foreground" />
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" />
              Süresi Dolacak Belgeler
            </CardTitle>
            <Badge variant="destructive">{expiringDocuments.length}</Badge>
          </CardHeader>
          <CardContent>
            {expiringDocuments.length > 0 ? (
              <div className="space-y-3">
                {expiringDocuments.slice(0, 5).map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between p-3 bg-accent/50 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => navigate(`/vehicles`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{doc.document_name}</p>
                        <Badge
                          variant={doc.days_until_expiry <= 7 ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {doc.days_until_expiry} gün
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {doc.maker} {doc.model} - {doc.document_type === "insurance" ? "Sigorta" : doc.document_type === "inspection" ? "Muayene" : doc.document_type}
                      </p>
                      {doc.expiry_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(doc.expiry_date), "dd MMMM yyyy", { locale: tr })}
                        </p>
                      )}
                    </div>
                    {doc.days_until_expiry <= 7 && (
                      <AlertCircle className="h-4 w-4 text-orange-500" />
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
