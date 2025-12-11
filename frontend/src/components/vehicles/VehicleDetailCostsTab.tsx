import { Vehicle, VehicleCost } from "@/hooks/useVehiclesData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { formatDate } from "@/utils/vehicleUtils";

interface VehicleDetailCostsTabProps {
  vehicle: Vehicle;
  vehicleCosts: VehicleCost[];
  onOpenCostModal: () => void;
  onOpenEditCostModal: (cost: VehicleCost) => void;
  onDeleteCost: (costId: number) => void;
}

const costCategories = [
  { value: 'purchase', label: 'Alış' },
  { value: 'shipping', label: 'Nakliye' },
  { value: 'customs', label: 'Gümrük' },
  { value: 'repair', label: 'Tamir' },
  { value: 'insurance', label: 'Sigorta' },
  { value: 'tax', label: 'Vergi' },
  { value: 'other', label: 'Diğer' }
];

export const VehicleDetailCostsTab = ({
  vehicle,
  vehicleCosts,
  onOpenCostModal,
  onOpenEditCostModal,
  onDeleteCost,
}: VehicleDetailCostsTabProps) => {
  const { formatCurrencyWithCurrency } = useCurrency();
  
  // Harcamaları dövizlerine göre grupla ve her döviz için toplam hesapla
  const totalsByCurrency = vehicleCosts.reduce((acc, cost) => {
    const currency = (cost as any).currency || "TRY";
    if (!acc[currency]) {
      acc[currency] = 0;
    }
    acc[currency] += cost.amount || 0;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Harcamalar</h3>
        <Button onClick={onOpenCostModal}>
          <Plus className="h-4 w-4 mr-2" />
          Harcama Ekle
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Harcama Adı</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Tutar</TableHead>
            <TableHead>Tarih</TableHead>
            <TableHead>İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicleCosts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">Harcama bulunamadı.</TableCell>
            </TableRow>
          ) : (
            vehicleCosts.map((cost) => {
              const category = (cost as any).category || 'other';
              const categoryLabel = costCategories.find(c => c.value === category)?.label || 'Diğer';
              return (
                <TableRow key={cost.id}>
                  <TableCell>{cost.cost_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{categoryLabel}</Badge>
                  </TableCell>
                  <TableCell>
                    {formatCurrencyWithCurrency(
                      cost.amount,
                      (cost as any).currency
                    )}
                  </TableCell>
                  <TableCell>{formatDate(cost.date)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenEditCostModal(cost)}
                        title="Düzenle"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteCost(cost.id)}
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
        {vehicleCosts.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="text-right font-semibold">
                Genel Toplam:
              </TableCell>
              <TableCell colSpan={3}>
                <span className="font-semibold">
                  {Object.entries(totalsByCurrency)
                    .map(([currency, total]) => formatCurrencyWithCurrency(total, currency))
                    .join(" + ")}
                </span>
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </>
  );
};
