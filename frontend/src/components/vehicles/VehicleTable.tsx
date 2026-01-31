import { Vehicle } from "@/hooks/useVehiclesData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Eye, Edit, Trash2, FileText, CheckCircle, XCircle, 
  AlertCircle, Image as ImageIcon, TrendingUp, Pencil, Search
} from "lucide-react";
import { getInstallmentStatus, getInstallmentOverdueDays } from "@/utils/vehicleUtils";
import { getApiBaseUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { VehicleGridSkeleton, VehicleTableSkeleton } from "./VehicleSkeleton";
import { useCurrency } from "@/hooks/useCurrency";

interface VehicleTableProps {
  vehicles: Vehicle[];
  loading: boolean;
  viewMode: 'table' | 'grid';
  currency: (amount: number | null) => string;
  onDetailClick: (vehicle: Vehicle) => void;
  onEditClick: (vehicle: Vehicle) => void;
  onQuoteClick: (vehicle: Vehicle) => void;
  onSellClick: (vehicle: Vehicle) => void;
  onDeleteClick: (id: number) => void;
  totalCount?: number;
  inStockCount?: number;
}

const getStatusBadge = (vehicle: Vehicle) => {
  const status = getInstallmentStatus(vehicle);
  
  if (vehicle.is_sold) {
    if (status.isInstallment) {
      return (
        <>
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500/20 font-medium">
            Taksitle Satıldı
          </Badge>
          {status.isOverdue && (
            <Badge className="bg-red-500/10 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-500/20 dark:hover:bg-red-900/30 font-medium">
              Gecikmiş
            </Badge>
          )}
        </>
      );
    }
    return (
      <Badge className="bg-slate-500/10 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-500/20 dark:hover:bg-slate-700/40 font-medium">
        Satıldı
      </Badge>
    );
  }
  
  if (vehicle.stock_status === 'reserved') {
    return (
      <Badge className="bg-blue-500/10 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-500/20 dark:hover:bg-blue-900/30 font-medium">
        Rezerve
      </Badge>
    );
  }
  
  return (
    <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500/20 font-medium">
      Stokta
    </Badge>
  );
};

const calculateProfit = (vehicle: Vehicle): number => {
  const salePrice = vehicle.sale_price || 0;
  const totalCosts = vehicle.total_costs || 0;
  return salePrice - totalCosts;
};

export const VehicleTable = ({
  vehicles,
  loading,
  viewMode,
  currency,
  onDetailClick,
  onEditClick,
  onQuoteClick,
  onSellClick,
  onDeleteClick,
  totalCount,
  inStockCount,
}: VehicleTableProps) => {
  const { formatCurrencyWithCurrency } = useCurrency();
  if (viewMode === 'grid') {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          <div className="col-span-full text-center py-16">
            <p className="text-foreground font-semibold text-lg">Yükleniyor...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="col-span-full bg-card rounded-2xl shadow-sm border border-border p-16 text-center">
            <div className="text-muted-foreground/50 mb-3">
              <ImageIcon className="h-16 w-16 mx-auto" />
            </div>
            <p className="text-foreground font-semibold text-lg">Araç bulunamadı</p>
            <p className="text-sm text-muted-foreground mt-1">Arama kriterlerinizi değiştirmeyi deneyin</p>
          </div>
        ) : (
          vehicles.map((vehicle) => {
            const profit = calculateProfit(vehicle);
            const imageUrl = vehicle.primary_image_url 
              ? (vehicle.primary_image_url.startsWith('http') 
                  ? vehicle.primary_image_url 
                  : vehicle.primary_image_url.startsWith('/uploads')
                  ? `${getApiBaseUrl()}${vehicle.primary_image_url}`
                  : vehicle.primary_image_url)
              : null;

            return (
              <div
                key={vehicle.id}
                className="group bg-card rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300 hover:-translate-y-1"
              >
                {/* Image */}
                <div className="relative h-56 bg-muted overflow-hidden">
                  {imageUrl ? (
                    <>
                      {/* Skeleton Loader */}
                      <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/50 to-muted animate-pulse" />
                      <img
                        src={imageUrl}
                        alt={`${vehicle.maker} ${vehicle.model}`}
                        className="relative w-full h-full object-cover group-hover:scale-110 transition-all duration-500 opacity-0 animate-fade-in"
                        loading="lazy"
                        onLoad={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.classList.remove('opacity-0');
                          img.classList.add('opacity-100');
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <ImageIcon className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4">{getStatusBadge(vehicle)}</div>
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-card/90 text-foreground border-0 backdrop-blur-sm">
                      {vehicle.vehicle_number ? `#${vehicle.vehicle_number}` : `#${vehicle.id}`}
                    </Badge>
                  </div>
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                    <Button 
                      size="icon" 
                      className="rounded-xl bg-card text-foreground hover:bg-muted h-11 w-11"
                      onClick={() => onDetailClick(vehicle)}
                    >
                      <Eye className="h-5 w-5" />
                    </Button>
                    {!vehicle.is_sold && (
                      <Button 
                        size="icon" 
                        className="rounded-xl bg-card text-foreground hover:bg-muted h-11 w-11"
                        onClick={() => onEditClick(vehicle)}
                      >
                        <Pencil className="h-5 w-5" />
                      </Button>
                    )}
                    <Button 
                      size="icon" 
                      className="rounded-xl bg-card text-destructive hover:bg-destructive/10 h-11 w-11"
                      onClick={() => onDeleteClick(vehicle.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">
                        {vehicle.maker || "-"} {vehicle.model || ""}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {vehicle.production_year || "-"} • {vehicle.color || "-"} • {vehicle.fuel || "-"}
                      </p>
                    </div>
                  </div>

                  {/* Specs */}
                  <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b">
                    <div>
                      <p className="text-xs text-muted-foreground">Kilometre</p>
                      <p className="text-sm font-semibold text-foreground">
                        {vehicle.km ? vehicle.km.toLocaleString("tr-TR") : "0"} km
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Şasi No</p>
                      <p className="text-sm font-semibold text-foreground truncate font-mono">
                        {vehicle.chassis_no || "-"}
                      </p>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Satış Fiyatı</span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrencyWithCurrency(vehicle.sale_price, vehicle.sale_currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Kar</span>
                      <span className={cn(
                        "font-semibold",
                        profit >= 0 ? "text-success dark:text-success" : "text-destructive dark:text-destructive"
                      )}>
                        {profit >= 0 ? '+' : ''}{currency(profit)}
                      </span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      className="flex-1 rounded-xl bg-transparent"
                      onClick={() => onDetailClick(vehicle)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Detay
                    </Button>
                    {!vehicle.is_sold && (
                      <Button 
                        className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={() => onSellClick(vehicle)}
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Satış
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  // Table View
  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
      {/* Statistics */}
      {(totalCount !== undefined || inStockCount !== undefined) && (
        <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-muted/50 to-muted">
          <div className="flex items-center gap-6 text-sm">
            {totalCount !== undefined && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-gray-600">Toplam: </span>
                <span className="font-semibold text-foreground">{totalCount} araç</span>
              </div>
            )}
            {inStockCount !== undefined && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-gray-600">Stokta: </span>
                <span className="font-semibold text-foreground">{inStockCount} araç</span>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold text-foreground">Araç</TableHead>
              <TableHead className="font-semibold text-foreground">Bilgiler</TableHead>
              <TableHead className="font-semibold text-foreground">Şasi No</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Satış Fiyatı</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Maliyet</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Kar</TableHead>
              <TableHead className="font-semibold text-foreground">Durum</TableHead>
              <TableHead className="font-semibold text-foreground text-center">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <VehicleTableSkeleton />
            ) : vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                    <Search className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Araç bulunamadı</h3>
                  <p className="text-sm text-gray-600">Arama kriterlerinizi değiştirmeyi deneyin</p>
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((vehicle) => {
                const profit = calculateProfit(vehicle);
                const imageUrl = vehicle.primary_image_url 
                  ? (vehicle.primary_image_url.startsWith('http') 
                      ? vehicle.primary_image_url 
                      : vehicle.primary_image_url.startsWith('/uploads')
                      ? `${getApiBaseUrl()}${vehicle.primary_image_url}`
                      : vehicle.primary_image_url)
                  : null;

                return (
                  <TableRow key={vehicle.id} className="hover:bg-muted/50 transition-colors duration-150">
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-24 rounded-xl bg-muted flex-shrink-0 overflow-hidden">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={`${vehicle.maker} ${vehicle.model}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            {vehicle.maker || "-"} {vehicle.model || ""}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {vehicle.vehicle_number ? `#${vehicle.vehicle_number}` : `#${vehicle.id}`}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm text-foreground">
                          {vehicle.production_year || "-"} • {vehicle.color || "-"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {vehicle.km ? vehicle.km.toLocaleString("tr-TR") : "0"} km • {vehicle.fuel || "-"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-foreground">
                      {vehicle.chassis_no || "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrencyWithCurrency(vehicle.sale_price, vehicle.sale_currency)}
                    </TableCell>
                    <TableCell className="text-right text-gray-600">
                      {formatCurrencyWithCurrency(vehicle.purchase_amount || vehicle.total_costs, vehicle.purchase_currency)}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-semibold",
                      profit >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {profit >= 0 ? '+' : ''}{currency(profit)}
                    </TableCell>
                    <TableCell>{getStatusBadge(vehicle)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-info dark:text-info hover:text-info/80 hover:bg-info/10 rounded-lg"
                          onClick={() => onDetailClick(vehicle)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!vehicle.is_sold && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                              onClick={() => onEditClick(vehicle)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-success dark:text-success hover:text-success/80 hover:bg-success/10 rounded-lg"
                              onClick={() => onSellClick(vehicle)}
                              title="Hızlı Satış"
                            >
                              <TrendingUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-info dark:text-info hover:text-info/80 hover:bg-info/10 rounded-lg"
                              onClick={() => onQuoteClick(vehicle)}
                              title="Teklif Oluştur"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive dark:text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded-lg"
                          onClick={() => onDeleteClick(vehicle.id)}
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
