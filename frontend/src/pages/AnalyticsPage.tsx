import { useEffect, useState } from "react";
import { api } from "../api";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Trash2, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BrandProfit, TopProfitable, SalesDuration } from "@/types/analytics";
import { BrandProfitChart } from "@/components/charts/BrandProfitChart";
import { TopProfitableChart } from "@/components/charts/TopProfitableChart";
import { SalesDurationChart } from "@/components/charts/SalesDurationChart";
import { BrandProfitTable } from "@/components/tables/BrandProfitTable";
import { TopProfitableTable } from "@/components/tables/TopProfitableTable";
import { SalesDurationTable } from "@/components/tables/SalesDurationTable";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [brandProfit, setBrandProfit] = useState<BrandProfit[]>([]);
  const [topProfitable, setTopProfitable] = useState<TopProfitable[]>([]);
  const [salesDuration, setSalesDuration] = useState<SalesDuration[]>([]);
  const [loading, setLoading] = useState(true);
  const [customReports, setCustomReports] = useState<any[]>([]);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBrandTable, setShowBrandTable] = useState(false);
  const [showTopProfitableTable, setShowTopProfitableTable] = useState(false);
  const [showSalesDurationTable, setShowSalesDurationTable] = useState(false);
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
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [brandRes, topRes, durationRes, reportsRes] = await Promise.all([
        api.get("/analytics/brand-profit?limit=10"),
        api.get("/analytics/top-profitable?limit=10"),
        api.get("/analytics/sales-duration"),
        api.get("/reports").catch(() => ({ data: [] })),
      ]);
      setBrandProfit(Array.isArray(brandRes.data) ? brandRes.data : []);
      setTopProfitable(Array.isArray(topRes.data) ? topRes.data : []);
      setSalesDuration(Array.isArray(durationRes.data) ? durationRes.data : []);
      setCustomReports(reportsRes.data || []);
    } catch (err) {
      console.error("Failed to fetch analytics", err);
      toast({
        title: "Hata",
        description: "Analitik veriler yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t("analytics.title")}</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-64 bg-muted animate-pulse rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("analytics.title")}</h1>
        <p className="text-muted-foreground mt-1">Analitik ve raporlar</p>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analytics">Analitikler</TabsTrigger>
          <TabsTrigger value="reports">Özelleştirilmiş Raporlar</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          {/* Brand Profit Chart */}
          <BrandProfitChart
            data={brandProfit}
            onViewDetails={() => setShowBrandTable(true)}
          />

          {/* Top Profitable Chart */}
          <TopProfitableChart
            data={topProfitable}
            onViewDetails={() => setShowTopProfitableTable(true)}
          />

          {/* Sales Duration Chart */}
          <SalesDurationChart
            data={salesDuration}
            onViewDetails={() => setShowSalesDurationTable(true)}
          />

          {/* Table Dialogs */}
          <BrandProfitTable
            data={brandProfit}
            open={showBrandTable}
            onOpenChange={setShowBrandTable}
          />
          <TopProfitableTable
            data={topProfitable}
            open={showTopProfitableTable}
            onOpenChange={setShowTopProfitableTable}
          />
          <SalesDurationTable
            data={salesDuration}
            open={showSalesDurationTable}
            onOpenChange={setShowSalesDurationTable}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Özelleştirilmiş Raporlar</h2>
            <Button onClick={() => setShowReportDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Yeni Rapor
            </Button>
          </div>

          {customReports.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {customReports.map((report) => (
                <Card key={report.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{report.name}</CardTitle>
                      <Badge variant={report.is_active ? "default" : "secondary"}>
                        {report.is_active ? "Aktif" : "Pasif"}
                      </Badge>
                    </div>
                    {report.description && (
                      <p className="text-sm text-muted-foreground mt-2">{report.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tür:</span>
                        <Badge variant="outline">{report.report_type}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Format:</span>
                        <span>{report.format?.toUpperCase()}</span>
                      </div>
                      {report.schedule_type && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Zamanlama:</span>
                          <span>
                            {report.schedule_type === "daily" ? "Günlük" : 
                             report.schedule_type === "weekly" ? "Haftalık" : 
                             report.schedule_type === "monthly" ? "Aylık" : report.schedule_type}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
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
                        <Play className="w-4 h-4 mr-2" />
                        Çalıştır
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReportToDelete(report.id);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Henüz özelleştirilmiş rapor oluşturulmamış</p>
                <Button onClick={() => setShowReportDialog(true)} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  İlk Raporu Oluştur
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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
                    query_config: {}, // Basit versiyon - ileride geliştirilebilir
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
                  fetchAnalytics();
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
              fetchAnalytics();
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
