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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Trash2, Play, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { BrandProfit, TopProfitable, SalesDuration } from "@/types/analytics";
import { BrandProfitChart } from "@/components/charts/BrandProfitChart";
import { TopProfitableChart } from "@/components/charts/TopProfitableChart";
import { SalesDurationChart } from "@/components/charts/SalesDurationChart";
import { BrandProfitTable } from "@/components/tables/BrandProfitTable";
import { TopProfitableTable } from "@/components/tables/TopProfitableTable";
import { SalesDurationTable } from "@/components/tables/SalesDurationTable";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

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

  // Vehicle Reports States (moved from VehiclesPage)
  const [vehicleReportsLoading, setVehicleReportsLoading] = useState(false);
  const [vehicleBrandProfit, setVehicleBrandProfit] = useState<any[]>([]);
  const [vehicleModelProfit, setVehicleModelProfit] = useState<any[]>([]);
  const [vehicleTopProfitable, setVehicleTopProfitable] = useState<any[]>([]);
  const [vehicleSalesDuration, setVehicleSalesDuration] = useState<any>(null);
  const [vehicleMonthlyComparison, setVehicleMonthlyComparison] = useState<any[]>([]);
  const [vehicleCategoryCosts, setVehicleCategoryCosts] = useState<any[]>([]);

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

  const fetchVehicleReports = async () => {
    setVehicleReportsLoading(true);
    try {
      const [brandRes, modelRes, topRes, durationRes, monthlyRes, categoryRes] = await Promise.all([
        api.get('/vehicles/analytics/brand-profit?limit=10'),
        api.get('/vehicles/analytics/model-profit?limit=10'),
        api.get('/vehicles/analytics/top-profitable?limit=10'),
        api.get('/vehicles/analytics/sales-duration'),
        api.get('/vehicles/analytics/monthly-comparison?months=12'),
        api.get('/vehicles/analytics/category-costs')
      ]);
      setVehicleBrandProfit(brandRes.data || []);
      setVehicleModelProfit(modelRes.data || []);
      setVehicleTopProfitable(topRes.data || []);
      setVehicleSalesDuration(durationRes.data || null);
      setVehicleMonthlyComparison(monthlyRes.data || []);
      setVehicleCategoryCosts(categoryRes.data || []);
    } catch (e: any) {
      console.error('Rapor yükleme hatası:', e);
      toast({
        title: "Hata",
        description: "Raporlar yüklenemedi.",
        variant: "destructive"
      });
    } finally {
      setVehicleReportsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="pt-4">
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pt-4">
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-card border border-border rounded-xl p-1.5 shadow-sm h-auto mb-6">
            <TabsTrigger 
              value="analytics"
              className="flex items-center justify-center px-6 py-4 text-base font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-colors duration-200 ease-in-out min-h-[3.5rem] data-[state=active]:bg-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:bg-muted/70"
            >
              Analitikler
            </TabsTrigger>
            <TabsTrigger 
              value="vehicle-reports"
              onClick={fetchVehicleReports}
              className="flex items-center justify-center px-6 py-4 text-base font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-colors duration-200 ease-in-out min-h-[3.5rem] data-[state=active]:bg-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:bg-muted/70"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Araç Raporları
            </TabsTrigger>
            <TabsTrigger 
              value="reports"
              className="flex items-center justify-center px-6 py-4 text-base font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-colors duration-200 ease-in-out min-h-[3.5rem] data-[state=active]:bg-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:bg-muted/70"
            >
              Özelleştirilmiş Raporlar
            </TabsTrigger>
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

        <TabsContent value="vehicle-reports" className="space-y-6">
          {vehicleReportsLoading ? (
            <div className="text-center py-12">Raporlar yükleniyor...</div>
          ) : (
            <>
              {/* Ortalama Satış Süresi */}
              {vehicleSalesDuration && (
                <Card>
                  <CardHeader>
                    <CardTitle>Ortalama Satış Süresi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold">{vehicleSalesDuration.avg_days ? Math.round(vehicleSalesDuration.avg_days) : 0}</div>
                        <div className="text-sm text-muted-foreground">Ortalama Gün</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold">{vehicleSalesDuration.min_days || 0}</div>
                        <div className="text-sm text-muted-foreground">En Kısa Süre</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div className="text-2xl font-bold">{vehicleSalesDuration.max_days || 0}</div>
                        <div className="text-sm text-muted-foreground">En Uzun Süre</div>
                      </div>
                    </div>
                    <div className="mt-4 text-center text-sm text-muted-foreground">
                      Toplam Satış: {vehicleSalesDuration.total_sales || 0}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Marka Bazlı Kar Analizi */}
              <Card>
                <CardHeader>
                  <CardTitle>Marka Bazlı Kar Analizi</CardTitle>
                </CardHeader>
                <CardContent>
                  {vehicleBrandProfit.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={300} minHeight={300}>
                        <BarChart data={vehicleBrandProfit}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="brand" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => `${parseFloat(value).toFixed(2)} TL`} />
                          <Legend />
                          <Bar dataKey="total_profit" fill="#8884d8" name="Toplam Kar" />
                          <Bar dataKey="total_revenue" fill="#82ca9d" name="Toplam Gelir" />
                        </BarChart>
                      </ResponsiveContainer>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Marka</TableHead>
                            <TableHead>Araç Sayısı</TableHead>
                            <TableHead>Satılan</TableHead>
                            <TableHead>Toplam Gelir</TableHead>
                            <TableHead>Toplam Maliyet</TableHead>
                            <TableHead>Toplam Kar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vehicleBrandProfit.map((brand, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{brand.brand || '-'}</TableCell>
                              <TableCell>{brand.vehicle_count}</TableCell>
                              <TableCell>{brand.sold_count}</TableCell>
                              <TableCell>{currency(brand.total_revenue)}</TableCell>
                              <TableCell>{currency(brand.total_costs)}</TableCell>
                              <TableCell className="font-semibold">{currency(brand.total_profit)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">Marka bazlı veri bulunamadı.</div>
                  )}
                </CardContent>
              </Card>

              {/* Model Bazlı Kar Analizi */}
              <Card>
                <CardHeader>
                  <CardTitle>Model Bazlı Kar Analizi</CardTitle>
                </CardHeader>
                <CardContent>
                  {vehicleModelProfit.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={300} minHeight={300}>
                        <BarChart data={vehicleModelProfit}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="model" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => `${parseFloat(value).toFixed(2)} TL`} />
                          <Legend />
                          <Bar dataKey="total_profit" fill="#8884d8" name="Toplam Kar" />
                        </BarChart>
                      </ResponsiveContainer>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Marka</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead>Araç Sayısı</TableHead>
                            <TableHead>Satılan</TableHead>
                            <TableHead>Toplam Kar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vehicleModelProfit.map((model, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{model.brand || '-'}</TableCell>
                              <TableCell>{model.model || '-'}</TableCell>
                              <TableCell>{model.vehicle_count}</TableCell>
                              <TableCell>{model.sold_count}</TableCell>
                              <TableCell className="font-semibold">{currency(model.total_profit)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">Model bazlı veri bulunamadı.</div>
                  )}
                </CardContent>
              </Card>

              {/* En Karlı Araçlar */}
              <Card>
                <CardHeader>
                  <CardTitle>En Karlı Araçlar</CardTitle>
                </CardHeader>
                <CardContent>
                  {vehicleTopProfitable.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Marka/Model</TableHead>
                          <TableHead>Yıl</TableHead>
                          <TableHead>Şasi No</TableHead>
                          <TableHead>Satış Fiyatı</TableHead>
                          <TableHead>Toplam Maliyet</TableHead>
                          <TableHead>Kar</TableHead>
                          <TableHead>Satış Tarihi</TableHead>
                          <TableHead>Müşteri</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vehicleTopProfitable.map((vehicle) => (
                          <TableRow key={vehicle.id}>
                            <TableCell>{vehicle.maker || '-'} {vehicle.model || ''}</TableCell>
                            <TableCell>{vehicle.year || '-'}</TableCell>
                            <TableCell>{vehicle.chassis_no || '-'}</TableCell>
                            <TableCell>{currency(vehicle.sale_price)}</TableCell>
                            <TableCell>{currency(vehicle.total_costs)}</TableCell>
                            <TableCell className="font-semibold text-green-600">{currency(vehicle.profit)}</TableCell>
                            <TableCell>{formatDateTime(vehicle.sale_date)}</TableCell>
                            <TableCell>{vehicle.customer_name || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">En karlı araç verisi bulunamadı.</div>
                  )}
                </CardContent>
              </Card>

              {/* Aylık Karşılaştırma */}
              <Card>
                <CardHeader>
                  <CardTitle>Aylık Karşılaştırma</CardTitle>
                </CardHeader>
                <CardContent>
                  {vehicleMonthlyComparison.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={400} minHeight={400}>
                        <LineChart data={vehicleMonthlyComparison}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => `${parseFloat(value).toFixed(2)} TL`} />
                          <Legend />
                          <Line type="monotone" dataKey="total_revenue" stroke="#8884d8" name="Toplam Gelir" />
                          <Line type="monotone" dataKey="total_costs" stroke="#ff7300" name="Toplam Maliyet" />
                          <Line type="monotone" dataKey="total_profit" stroke="#82ca9d" name="Toplam Kar" />
                        </LineChart>
                      </ResponsiveContainer>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ay</TableHead>
                            <TableHead>Satış Sayısı</TableHead>
                            <TableHead>Toplam Gelir</TableHead>
                            <TableHead>Toplam Maliyet</TableHead>
                            <TableHead>Toplam Kar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vehicleMonthlyComparison.map((month, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{month.month}</TableCell>
                              <TableCell>{month.sales_count}</TableCell>
                              <TableCell>{currency(month.total_revenue)}</TableCell>
                              <TableCell>{currency(month.total_costs)}</TableCell>
                              <TableCell className="font-semibold">{currency(month.total_profit)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">Aylık karşılaştırma verisi bulunamadı.</div>
                  )}
                </CardContent>
              </Card>

              {/* Kategori Bazlı Harcama Analizi */}
              <Card>
                <CardHeader>
                  <CardTitle>Kategori Bazlı Harcama Analizi</CardTitle>
                </CardHeader>
                <CardContent>
                  {vehicleCategoryCosts.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={300} minHeight={300}>
                        <BarChart data={vehicleCategoryCosts}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category_name" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => `${parseFloat(value).toFixed(2)} TL`} />
                          <Legend />
                          <Bar dataKey="total_amount" fill="#8884d8" name="Toplam Tutar" />
                        </BarChart>
                      </ResponsiveContainer>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kategori</TableHead>
                            <TableHead>Harcama Sayısı</TableHead>
                            <TableHead>Toplam Tutar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vehicleCategoryCosts.map((cat, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{cat.category_name || cat.category || '-'}</TableCell>
                              <TableCell>{cat.cost_count || 0}</TableCell>
                              <TableCell className="font-semibold">{currency(cat.total_amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">Kategori bazlı veri bulunamadı.</div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
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
                <Card key={report.id}>
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
      </div>

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
