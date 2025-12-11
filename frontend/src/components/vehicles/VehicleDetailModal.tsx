import { Vehicle } from "@/hooks/useVehiclesData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VehicleImageUpload from "@/components/VehicleImageUpload";
import { VehicleDetailInfoTab } from "./VehicleDetailInfoTab";
import { VehicleDetailDeliveryTab } from "./VehicleDetailDeliveryTab";
import { VehicleDetailDocumentsTab } from "./VehicleDetailDocumentsTab";
import { VehicleDetailCostsTab } from "./VehicleDetailCostsTab";
import { VehicleDetailCalculateTab } from "./VehicleDetailCalculateTab";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[70vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>
            {vehicle ? `${vehicle.maker || ""} ${vehicle.model || ""}`.trim() || "Araç Detayları" : "Araç Detayları"}
          </DialogTitle>
          <DialogDescription>
            Araç bilgileri, satış detayları ve taksit takibi
          </DialogDescription>
        </DialogHeader>
        {vehicle ? (
          <Tabs defaultValue="info" className="w-full flex flex-col flex-1 min-h-0">
            <div className="px-6 pt-4 pb-0 flex-shrink-0">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="info">Bilgiler</TabsTrigger>
                <TabsTrigger value="delivery">Satış</TabsTrigger>
                <TabsTrigger value="images">Fotoğraflar</TabsTrigger>
                <TabsTrigger value="documents">Belgeler</TabsTrigger>
                <TabsTrigger value="costs">Harcamalar</TabsTrigger>
                <TabsTrigger value="calculate">Maliyet Hesaplama</TabsTrigger>
              </TabsList>
            </div>
            <div className="px-6 pb-6 flex-1 overflow-y-auto min-h-0">
              <TabsContent value="info" className="space-y-4 mt-4">
                <VehicleDetailInfoTab vehicle={vehicle} currency={currency} />
              </TabsContent>

              <TabsContent value="delivery" className="space-y-4 mt-4">
                <VehicleDetailDeliveryTab
                  vehicle={vehicle}
                  currency={currency}
                  onEditPayment={onEditPayment}
                  onDeletePayment={onDeletePayment}
                  onOpenPaymentModal={onOpenPaymentModal}
                />
              </TabsContent>

              <TabsContent value="images" className="space-y-4 mt-4">
                <VehicleImageUpload 
                  vehicleId={vehicle.id} 
                  onUpdate={onRefresh}
                />
              </TabsContent>

              <TabsContent value="documents" className="space-y-4 mt-4">
                <VehicleDetailDocumentsTab
                  vehicle={vehicle}
                  vehicleDocuments={vehicleDocuments}
                  onOpenDocumentDialog={onOpenDocumentDialog}
                  onFetchDocuments={onFetchDocuments}
                />
              </TabsContent>

              <TabsContent value="costs" className="space-y-4 mt-4">
                <VehicleDetailCostsTab
                  vehicle={vehicle}
                  vehicleCosts={vehicleCosts}
                  onOpenCostModal={onOpenCostModal}
                  onOpenEditCostModal={onOpenEditCostModal}
                  onDeleteCost={onDeleteCost}
                />
              </TabsContent>

              <TabsContent value="calculate" className="space-y-4 mt-4">
                <VehicleDetailCalculateTab
                  vehicle={vehicle}
                  costCalculation={costCalculation}
                  currency={currency}
                  onFetchCostCalculation={onFetchCostCalculation}
                />
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="p-6 text-center">
            <p>Yükleniyor...</p>
            <p className="text-sm text-muted-foreground mt-2">Araç bilgileri yükleniyor...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
