import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BrandProfit } from "@/types/analytics";
import { formatCurrency } from "@/lib/formatters";
import { useTenant } from "@/contexts/TenantContext";

interface BrandProfitTableProps {
  data: BrandProfit[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Table component for brand profit details
 */
export const BrandProfitTable = ({ data, open, onOpenChange }: BrandProfitTableProps) => {
  const { tenant } = useTenant();
  const currency = tenant?.default_currency || "TRY";
  const locale = tenant?.language === "en" ? "en-US" : "tr-TR";
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Marka Bazlı Kar Analizi - Detaylar</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marka</TableHead>
                <TableHead className="text-right">Toplam Araç</TableHead>
                <TableHead className="text-right">Satılan Araç</TableHead>
                <TableHead className="text-right">Toplam Kar</TableHead>
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
                    <TableCell className="text-right">{item.vehicle_count}</TableCell>
                    <TableCell className="text-right">{item.sold_count}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(item.total_profit || 0, currency, locale)}
                    </TableCell>
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
