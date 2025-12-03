import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SalesDuration } from "@/types/analytics";

interface SalesDurationTableProps {
  data: SalesDuration[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Table component for sales duration details
 */
export const SalesDurationTable = ({ data, open, onOpenChange }: SalesDurationTableProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Satış Süresi Analizi - Detaylar</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marka</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Ortalama Gün</TableHead>
                <TableHead className="text-right">Toplam Satış</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Veri bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.brand || "-"}</TableCell>
                    <TableCell>{item.model || "-"}</TableCell>
                    <TableCell className="text-right">
                      {Math.round(item.avg_days_to_sell || 0)} gün
                    </TableCell>
                    <TableCell className="text-right">{item.total_sales}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};
