import { Vehicle } from "@/hooks/useVehiclesData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

export type QuoteFormData = {
  vehicle_id: string;
  customer_id: string;
  quote_date: string;
  valid_until: string;
  sale_price: string;
  currency: string;
  down_payment: string;
  installment_count: string;
  installment_amount: string;
  notes: string;
  status: "draft" | "sent" | "approved" | "rejected";
};

interface VehicleQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  quoteForm: QuoteFormData;
  customers: Array<{ id: number; name: string; phone?: string }>;
  onFormChange: (field: keyof QuoteFormData, value: any) => void;
  onSubmit: () => Promise<void>;
}

export const VehicleQuoteModal = ({
  open,
  onOpenChange,
  vehicle,
  quoteForm,
  customers,
  onFormChange,
  onSubmit,
}: VehicleQuoteModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card rounded-xl border border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Yeni Teklif Oluştur</DialogTitle>
          <DialogDescription className="text-muted-foreground/70">
            {vehicle && `${vehicle.maker} ${vehicle.model} ${vehicle.production_year}`} için teklif oluşturun
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Araç <span className="text-red-500">*</span>
              </label>
              <Input
                value={vehicle ? `${vehicle.maker} ${vehicle.model} ${vehicle.production_year} - #${vehicle.vehicle_number}` : ""}
                disabled
                className="rounded-xl bg-muted"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Müşteri</label>
              <Select
                value={quoteForm.customer_id || "none"}
                onValueChange={(value) => onFormChange('customer_id', value === "none" ? "" : value)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Müşteri seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Müşteri seçilmedi</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name} {customer.phone && `- ${customer.phone}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Teklif Tarihi <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={quoteForm.quote_date}
                onChange={(e) => onFormChange('quote_date', e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Geçerlilik Tarihi <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={quoteForm.valid_until}
                onChange={(e) => onFormChange('valid_until', e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Satış Fiyatı <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={quoteForm.sale_price}
                onChange={(e) => onFormChange('sale_price', e.target.value)}
                placeholder="0.00"
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Para Birimi</label>
              <Select
                value={quoteForm.currency}
                onValueChange={(value) => onFormChange('currency', value)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Peşinat</label>
              <Input
                type="number"
                value={quoteForm.down_payment}
                onChange={(e) => onFormChange('down_payment', e.target.value)}
                placeholder="0.00"
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Taksit Sayısı</label>
              <Input
                type="number"
                value={quoteForm.installment_count}
                onChange={(e) => onFormChange('installment_count', e.target.value)}
                placeholder="0"
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Taksit Tutarı</label>
              <Input
                type="number"
                value={quoteForm.installment_amount}
                onChange={(e) => onFormChange('installment_amount', e.target.value)}
                placeholder="0.00"
                className="rounded-xl"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Notlar</label>
            <Input
              value={quoteForm.notes}
              onChange={(e) => onFormChange('notes', e.target.value)}
              placeholder="Ek notlar..."
              className="rounded-xl"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            İptal
          </Button>
          <Button
            onClick={onSubmit}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
          >
            Oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
