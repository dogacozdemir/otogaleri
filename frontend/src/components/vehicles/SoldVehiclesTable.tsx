import { Vehicle } from "@/hooks/useVehiclesData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { 
  CheckCircle, AlertCircle, Image as ImageIcon, Eye, Grid3x3, List, Search
} from "lucide-react";
import { getInstallmentStatus, getInstallmentOverdueDays } from "@/utils/vehicleUtils";
import { getApiBaseUrl } from "@/lib/utils";
import { VehicleGridSkeleton, VehicleTableSkeleton } from "./VehicleSkeleton";
import { useCurrency } from "@/hooks/useCurrency";

interface SoldVehiclesTableProps {
  vehicles: Vehicle[];
  loading: boolean;
  viewMode: 'table' | 'grid';
  currency: (amount: number | null) => string;
  onDetailClick: (vehicle: Vehicle) => void;
  onViewModeChange: (mode: 'table' | 'grid') => void;
}

export const SoldVehiclesTable = ({
  vehicles,
  loading,
  viewMode,
  currency,
  onDetailClick,
  onViewModeChange,
}: SoldVehiclesTableProps) => {
  const { formatCurrencyWithCurrency } = useCurrency();
  if (viewMode === 'table') {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-gray-900">Araç</TableHead>
                <TableHead className="font-semibold text-gray-900">Bilgiler</TableHead>
                <TableHead className="font-semibold text-gray-900">Şasi No</TableHead>
                <TableHead className="font-semibold text-gray-900 text-right">Satış Fiyatı</TableHead>
                <TableHead className="font-semibold text-gray-900 text-right">Peşinat</TableHead>
                <TableHead className="font-semibold text-gray-900 text-right">Kalan Borç</TableHead>
                <TableHead className="font-semibold text-gray-900">Durum</TableHead>
                <TableHead className="font-semibold text-gray-900 text-center">İşlemler</TableHead>
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
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Satılan araç bulunamadı</h3>
                    <p className="text-sm text-gray-600">Arama kriterlerinizi değiştirmeyi deneyin</p>
                  </TableCell>
                </TableRow>
              ) : (
                vehicles.map((vehicle) => {
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
                            <div className="font-semibold text-gray-900 flex items-center gap-2">
                              {vehicle.maker || "-"} {vehicle.model || ""}
                              {(() => {
                                const overdueDays = getInstallmentOverdueDays(vehicle);
                                if (overdueDays !== null) {
                                  return (
                                    <div className="relative group">
                                      <AlertCircle className="h-4 w-4 text-orange-500" />
                                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground border border-border text-xs rounded py-1 px-2 whitespace-nowrap z-50">
                                        Son taksit ödemesinin üzerinden {overdueDays} gün geçti.
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {vehicle.vehicle_number ? `#${vehicle.vehicle_number}` : `#${vehicle.id}`}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm text-gray-900">
                            {vehicle.production_year || "-"} • {vehicle.color || "-"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {vehicle.km ? vehicle.km.toLocaleString("tr-TR") : "0"} km • {vehicle.fuel || "-"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-600">
                        {vehicle.chassis_no || "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrencyWithCurrency(vehicle.sale_price, vehicle.sale_currency)}
                      </TableCell>
                      <TableCell className="text-right text-gray-600">
                        {vehicle.installment?.down_payment 
                          ? formatCurrencyWithCurrency(vehicle.installment.down_payment, vehicle.installment.currency || vehicle.sale_currency)
                          : formatCurrencyWithCurrency(vehicle.sale_price, vehicle.sale_currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {vehicle.installment_remaining_balance && vehicle.installment_remaining_balance > 0
                          ? (
                              <span className="text-orange-600 font-semibold">
                                {formatCurrencyWithCurrency(vehicle.installment_remaining_balance, vehicle.installment?.currency || vehicle.sale_currency)}
                              </span>
                            )
                          : vehicle.installment_sale_id
                          ? (
                              <span className="text-green-600">Tamamlandı</span>
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {(() => {
                            const status = getInstallmentStatus(vehicle);
                            if (status.isInstallment) {
                              return (
                                <>
                                  <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500/20 font-medium">
                                    Taksitle Satıldı
                                  </Badge>
                                  {status.isOverdue ? (
                                    <Badge className="bg-red-500/10 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-500/20 dark:hover:bg-red-900/30 font-medium">
                                      Gecikmiş
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-orange-500/10 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800 hover:bg-orange-500/20 dark:hover:bg-orange-900/30 font-medium">
                                      {status.paidCount}/{status.totalCount}
                                    </Badge>
                                  )}
                                </>
                              );
                            } else {
                              return (
                                <Badge className="bg-slate-500/10 text-slate-700 border-slate-200 hover:bg-slate-500/20 font-medium">
                                  Satıldı
                                </Badge>
                              );
                            }
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-info dark:text-info hover:text-info/80 hover:bg-info/10 rounded-lg"
                            onClick={() => onDetailClick(vehicle)}
                          >
                            <Eye className="h-4 w-4" />
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
  }

  // Grid view
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {loading ? (
        <VehicleGridSkeleton />
      ) : vehicles.length === 0 ? (
        <div className="col-span-full bg-card rounded-2xl shadow-sm border border-border p-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
            <Search className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Satılan araç bulunamadı</h3>
          <p className="text-sm text-gray-600 mb-6">Arama kriterlerinizi değiştirmeyi deneyin</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="rounded-xl"
            >
              Filtreleri Temizle
            </Button>
          </div>
        </div>
      ) : (
        vehicles.map((vehicle) => {
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
                  <img
                    src={imageUrl}
                    alt={`${vehicle.maker} ${vehicle.model}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                    <ImageIcon className="h-12 w-12 text-gray-300" />
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  {(() => {
                    const status = getInstallmentStatus(vehicle);
                    if (status.isInstallment) {
                      return (
                        <>
                          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500/20 font-medium mb-1">
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
                      <Badge className="bg-slate-500/10 text-slate-700 border-slate-200 hover:bg-slate-500/20 font-medium">
                        Satıldı
                      </Badge>
                    );
                  })()}
                </div>
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
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      {vehicle.maker || "-"} {vehicle.model || ""}
                      {(() => {
                        const overdueDays = getInstallmentOverdueDays(vehicle);
                        if (overdueDays !== null) {
                          return (
                            <div className="relative group">
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground border border-border text-xs rounded py-1 px-2 whitespace-nowrap z-50">
                                Son taksit ödemesinin üzerinden {overdueDays} gün geçti.
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
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
                    <p className="text-sm font-semibold text-gray-900">
                      {vehicle.km ? vehicle.km.toLocaleString("tr-TR") : "0"} km
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Şasi No</p>
                    <p className="text-sm font-semibold text-gray-900 truncate font-mono">
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
                  {vehicle.installment && vehicle.installment.remaining_balance > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Kalan Borç</span>
                      <span className="font-semibold text-orange-600">
                        {formatCurrencyWithCurrency(vehicle.installment.remaining_balance, vehicle.installment.currency || vehicle.sale_currency)}
                      </span>
                    </div>
                  )}
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
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
