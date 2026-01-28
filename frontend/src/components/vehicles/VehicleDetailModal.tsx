import { Vehicle } from "@/hooks/useVehiclesData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import VehicleImageUpload from "@/components/VehicleImageUpload";
import { VehicleDetailInfoTab } from "./VehicleDetailInfoTab";
import { VehicleDetailDocumentsTab } from "./VehicleDetailDocumentsTab";
import { VehicleDetailCostsTab } from "./VehicleDetailCostsTab";
import { VehicleDetailCalculateTab } from "./VehicleDetailCalculateTab";
import { Car, Tag, MapPin, Package, FileText, Calculator, Image as ImageIcon, X } from "lucide-react";

interface VehicleDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  vehicleCosts: any[];
  costCalculation: any | null;
  vehicleDocuments: any[];
  currency: (amount: number | null) => string;
  onRefresh: () => void;
  onOpenCostModal: () => void;
  onOpenEditCostModal: (cost: any) => void;
  onDeleteCost: (costId: number) => void;
  onFetchCostCalculation: (id: number) => void;
  onOpenDocumentDialog: () => void;
  onFetchDocuments: (vehicleId: number) => Promise<void>;
  onEditPayment: (payment: any) => void;
  onDeletePayment: (paymentId: number) => void;
  onOpenPaymentModal: () => void;
}

export const VehicleDetailModal = ({
  open,
  onOpenChange,
  vehicle,
  vehicleCosts,
  costCalculation,
  vehicleDocuments,
  currency,
  onRefresh,
  onOpenCostModal,
  onOpenEditCostModal,
  onDeleteCost,
  onFetchCostCalculation,
  onOpenDocumentDialog,
  onFetchDocuments,
  onEditPayment,
  onDeletePayment,
  onOpenPaymentModal,
}: VehicleDetailModalProps) => {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new': return 'default';
      case 'used': return 'secondary';
      case 'damaged': return 'destructive';
      case 'repaired': return 'outline';
      default: return 'secondary';
    }
  };

  const getStockStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'in_stock': return 'default';
      case 'on_sale': return 'default';
      case 'reserved': return 'secondary';
      case 'sold': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'new': 'Sıfır',
      'used': 'İkinci El',
      'damaged': 'Hasarlı',
      'repaired': 'Tamirli',
      'in_stock': 'Stokta',
      'on_sale': 'Satışta',
      'reserved': 'Rezerve',
      'sold': 'Satıldı'
    };
    return labels[status] || status;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col overflow-hidden">
        {vehicle ? (
          <>
            {/* Modern Header with Image and Info */}
            <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b border-border">
              <div className="grid grid-cols-12 gap-6 p-6">
                {/* Vehicle Image */}
                <div className="col-span-12 md:col-span-4">
                  <Card className="overflow-hidden border-2 border-primary/20 shadow-lg h-full">
                    {vehicle.primary_image_url ? (
                      <div className="aspect-video relative bg-muted h-full">
                        <img
                          src={(() => {
                            const imageUrl = vehicle.primary_image_url || '';
                            if (imageUrl.startsWith('http')) {
                              return imageUrl;
                            }
                            // Backend returns path like /uploads/vehicles/filename.webp
                            // We need to prepend API base URL
                            const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:5005';
                            return `${apiBase}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
                          })()}
                          alt={`${vehicle.maker} ${vehicle.model}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // If image fails to load, show placeholder
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center h-full">
                                  <svg class="h-16 w-16 text-primary/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                  </svg>
                                </div>
                              `;
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center h-full">
                        <Car className="h-16 w-16 text-primary/30" />
                      </div>
                    )}
                  </Card>
                </div>

                {/* Vehicle Info */}
                <div className="col-span-12 md:col-span-8 space-y-4">
                  <div>
                    <DialogTitle className="text-2xl font-bold mb-2 flex items-center gap-2">
                      <Car className="h-6 w-6 text-primary" />
                      {vehicle.maker && vehicle.model 
                        ? `${vehicle.maker} ${vehicle.model}` 
                        : vehicle.maker || vehicle.model || "Araç Detayları"}
                      {vehicle.production_year && (
                        <span className="text-lg font-normal text-muted-foreground">
                          ({vehicle.production_year})
                        </span>
                      )}
                    </DialogTitle>
                    <DialogDescription className="text-base">
                      Araç bilgileri, satış detayları ve taksit takibi
                    </DialogDescription>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2">
                    {vehicle.status && (
                      <Badge 
                        variant={getStatusBadgeVariant(vehicle.status)}
                        className="px-3 py-1 text-sm font-medium"
                      >
                        {getStatusLabel(vehicle.status)}
                      </Badge>
                    )}
                    {vehicle.stock_status && (
                      <Badge 
                        variant={getStockStatusBadgeVariant(vehicle.stock_status)}
                        className="px-3 py-1 text-sm font-medium"
                      >
                        {getStatusLabel(vehicle.stock_status)}
                      </Badge>
                    )}
                    {vehicle.vehicle_number && (
                      <Badge variant="outline" className="px-3 py-1 text-sm font-medium">
                        Araç No: {vehicle.vehicle_number}
                      </Badge>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {vehicle.sale_price && (
                      <Card className="p-3 bg-card border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Tag className="h-4 w-4 text-primary" />
                          <span className="text-xs text-muted-foreground">Satış Fiyatı</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {currency(vehicle.sale_price)}
                        </p>
                      </Card>
                    )}
                    {vehicle.total_costs !== undefined && (
                      <Card className="p-3 bg-card border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="text-xs text-muted-foreground">Toplam Maliyet</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {currency(vehicle.total_costs)}
                        </p>
                      </Card>
                    )}
                    {vehicle.cost_count !== undefined && (
                      <Card className="p-3 bg-card border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-xs text-muted-foreground">Harcama</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {vehicle.cost_count} adet
                        </p>
                      </Card>
                    )}
                    {vehicle.location && (
                      <Card className="p-3 bg-card border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="text-xs text-muted-foreground">Konum</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground truncate">
                          {vehicle.location}
                        </p>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs Section */}
            <Tabs defaultValue="info" className="w-full flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="px-6 pt-4 pb-0 flex-shrink-0 border-b border-border bg-background">
                <TabsList className="grid w-full grid-cols-5 h-auto bg-transparent p-0 gap-1">
                  <TabsTrigger 
                    value="info" 
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-xl px-4 py-2.5"
                  >
                    <Car className="h-4 w-4 mr-2" />
                    Bilgiler
                  </TabsTrigger>
                  <TabsTrigger 
                    value="images"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-xl px-4 py-2.5"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Fotoğraflar
                  </TabsTrigger>
                  <TabsTrigger 
                    value="documents"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-xl px-4 py-2.5"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Belgeler
                  </TabsTrigger>
                  <TabsTrigger 
                    value="costs"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-xl px-4 py-2.5"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Harcamalar
                  </TabsTrigger>
                  <TabsTrigger 
                    value="calculate"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-xl px-4 py-2.5"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Hesaplama
                  </TabsTrigger>
                </TabsList>
              </div>
              <div className="px-6 pb-6 flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-background">
                <TabsContent value="info" className="space-y-4 mt-6 m-0">
                  <VehicleDetailInfoTab 
                    vehicle={vehicle} 
                    currency={currency}
                    onEditPayment={onEditPayment}
                    onDeletePayment={onDeletePayment}
                    onOpenPaymentModal={onOpenPaymentModal}
                  />
                </TabsContent>

                <TabsContent value="images" className="space-y-4 mt-6 m-0">
                  <VehicleImageUpload 
                    vehicleId={vehicle.id} 
                    onUpdate={onRefresh}
                  />
                </TabsContent>

                <TabsContent value="documents" className="space-y-4 mt-6 m-0">
                  <VehicleDetailDocumentsTab
                    vehicle={vehicle}
                    vehicleDocuments={vehicleDocuments}
                    onOpenDocumentDialog={onOpenDocumentDialog}
                    onFetchDocuments={onFetchDocuments}
                  />
                </TabsContent>

                <TabsContent value="costs" className="space-y-4 mt-6 m-0">
                  <VehicleDetailCostsTab
                    vehicle={vehicle}
                    vehicleCosts={vehicleCosts}
                    onOpenCostModal={onOpenCostModal}
                    onOpenEditCostModal={onOpenEditCostModal}
                    onDeleteCost={onDeleteCost}
                  />
                </TabsContent>

                <TabsContent value="calculate" className="space-y-4 mt-6 m-0">
                  <VehicleDetailCalculateTab
                    vehicle={vehicle}
                    costCalculation={costCalculation}
                    currency={currency}
                    onFetchCostCalculation={onFetchCostCalculation}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </>
        ) : (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Car className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <p className="text-lg font-semibold text-foreground">Yükleniyor...</p>
            <p className="text-sm text-muted-foreground mt-2">Araç bilgileri yükleniyor...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
