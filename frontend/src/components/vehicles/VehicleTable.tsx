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
            <Badge className="bg-red-500/10 text-red-700 border-red-200 hover:bg-red-500/20 font-medium">
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
  }
  
  if (vehicle.stock_status === 'reserved') {
    return (
      <Badge className="bg-blue-500/10 text-blue-700 border-blue-200 hover:bg-blue-500/20 font-medium">
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
            <p className="text-gray-900 font-semibold text-lg">Yükleniyor...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl shadow-sm border p-16 text-center">
            <div className="text-gray-300 mb-3">
              <ImageIcon className="h-16 w-16 mx-auto" />
            </div>
            <p className="text-gray-900 font-semibold text-lg">Araç bulunamadı</p>
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
                className="group bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:border-[#003d82]/20 transition-all duration-300 hover:-translate-y-1"
              >
                {/* Image */}
                <div className="relative h-56 bg-gray-100 overflow-hidden">
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
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <ImageIcon className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4">{getStatusBadge(vehicle)}</div>
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-white/90 text-gray-900 border-0 backdrop-blur-sm">
                      {vehicle.vehicle_number ? `#${vehicle.vehicle_number}` : `#${vehicle.id}`}
                    </Badge>
                  </div>
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                    <Button 
                      size="icon" 
                      className="rounded-xl bg-white text-gray-900 hover:bg-gray-100 h-11 w-11"
                      onClick={() => onDetailClick(vehicle)}
                    >
                      <Eye className="h-5 w-5" />
                    </Button>
                    {!vehicle.is_sold && (
                      <Button 
                        size="icon" 
                        className="rounded-xl bg-white text-gray-900 hover:bg-gray-100 h-11 w-11"
                        onClick={() => onEditClick(vehicle)}
                      >
                        <Pencil className="h-5 w-5" />
                      </Button>
                    )}
                    <Button 
                      size="icon" 
                      className="rounded-xl bg-white text-red-600 hover:bg-red-50 h-11 w-11"
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
                      <h3 className="text-xl font-bold text-gray-900">
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
                      <span className="text-lg font-bold text-[#003d82]">
                        {formatCurrencyWithCurrency(vehicle.sale_price, vehicle.sale_currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Kar</span>
                      <span className={cn(
                        "font-semibold",
                        profit >= 0 ? "text-emerald-600" : "text-red-600"
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
                        className="flex-1 rounded-xl bg-[#003d82] hover:bg-[#003d82]/90 text-white"
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Statistics */}
      {(totalCount !== undefined || inStockCount !== undefined) && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center gap-6 text-sm">
            {totalCount !== undefined && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#003d82]" />
                <span className="text-gray-600">Toplam: </span>
                <span className="font-semibold text-gray-900">{totalCount} araç</span>
              </div>
            )}
            {inStockCount !== undefined && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-gray-600">Stokta: </span>
                <span className="font-semibold text-gray-900">{inStockCount} araç</span>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead className="font-semibold text-gray-900">Araç</TableHead>
              <TableHead className="font-semibold text-gray-900">Bilgiler</TableHead>
              <TableHead className="font-semibold text-gray-900">Şasi No</TableHead>
              <TableHead className="font-semibold text-gray-900 text-right">Satış Fiyatı</TableHead>
              <TableHead className="font-semibold text-gray-900 text-right">Maliyet</TableHead>
              <TableHead className="font-semibold text-gray-900 text-right">Kar</TableHead>
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
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                    <Search className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Araç bulunamadı</h3>
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
                  <TableRow key={vehicle.id} className="hover:bg-gray-50/80 transition-colors duration-150">
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-24 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
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
                          <div className="font-semibold text-gray-900">
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
                    <TableCell className="text-right font-bold text-[#003d82]">
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
                          className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                          onClick={() => onDetailClick(vehicle)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!vehicle.is_sold && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg"
                              onClick={() => onEditClick(vehicle)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg"
                              onClick={() => onSellClick(vehicle)}
                              title="Hızlı Satış"
                            >
                              <TrendingUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
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
                          className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
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
