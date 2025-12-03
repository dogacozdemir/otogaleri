import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TopProfitable } from "@/types/analytics";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useTenant } from "@/contexts/TenantContext";

interface TopProfitableTableProps {
  data: TopProfitable[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Table component for top profitable vehicles details
 */
export const TopProfitableTable = ({ data, open, onOpenChange }: TopProfitableTableProps) => {
  const { tenant } = useTenant();
  const currency = tenant?.default_currency || "TRY";
  const locale = tenant?.language === "en" ? "en-US" : "tr-TR";
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>En Karlı Araçlar - Detaylar</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Araç</TableHead>
                <TableHead className="text-right">Satış Fiyatı</TableHead>
                <TableHead className="text-right">Kar</TableHead>
                <TableHead>Satış Tarihi</TableHead>
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
                data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.maker || "-"} {item.model || ""} {item.year || ""}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.sale_price || 0, currency, locale)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      {formatCurrency(item.profit || item.profit_base || 0, currency, locale)}
                    </TableCell>
                    <TableCell>
                      {formatDate(item.sale_date)}
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
