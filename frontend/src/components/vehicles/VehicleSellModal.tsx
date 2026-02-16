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
import { CurrencyInput } from "@/components/ui/currency-input";

export type SellFormData = {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  plate_number: string;
  key_count: string;
  sale_price: string;
  sale_currency: string;
  sale_date: string;
  payment_type: "cash" | "installment";
  down_payment: string;
  installment_count: string;
  installment_amount: string;
};

interface VehicleSellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  sellForm: SellFormData;
  onFormChange: (field: keyof SellFormData, value: any) => void;
  onFormChangeBatch?: (updates: Partial<SellFormData>) => void;
  onSubmit: () => Promise<void>;
  currencies: Array<{ value: string; label: string }>;
}

export const VehicleSellModal = ({
  open,
  onOpenChange,
  vehicle,
  sellForm,
  onFormChange,
  onFormChangeBatch,
  onSubmit,
  currencies,
}: VehicleSellModalProps) => {
  const updateBatch = onFormChangeBatch ?? ((updates: Partial<SellFormData>) => {
    Object.entries(updates).forEach(([k, v]) => onFormChange(k as keyof SellFormData, v));
  });

  const handleSalePriceChange = (salePrice: string) => {
    if (sellForm.payment_type === "installment" && sellForm.down_payment && sellForm.installment_count) {
      const remaining = Number(salePrice) - Number(sellForm.down_payment);
      const count = Number(sellForm.installment_count);
      if (count > 0 && remaining > 0) {
        updateBatch({ sale_price: salePrice, installment_amount: (remaining / count).toFixed(2) });
        return;
      }
    }
    onFormChange('sale_price', salePrice);
  };

  const handleDownPaymentChange = (downPayment: string) => {
    if (sellForm.payment_type === "installment" && sellForm.sale_price && sellForm.installment_count) {
      const remaining = Number(sellForm.sale_price) - Number(downPayment);
      const count = Number(sellForm.installment_count);
      if (count > 0 && remaining > 0) {
        updateBatch({ down_payment: downPayment, installment_amount: (remaining / count).toFixed(2) });
        return;
      }
    }
    onFormChange('down_payment', downPayment);
  };

  const handleInstallmentCountChange = (installmentCount: string) => {
    if (sellForm.sale_price && sellForm.down_payment && installmentCount) {
      const remaining = Number(sellForm.sale_price) - Number(sellForm.down_payment);
      const count = Number(installmentCount);
      if (count > 0 && remaining > 0) {
        updateBatch({ installment_count: installmentCount, installment_amount: (remaining / count).toFixed(2) });
        return;
      }
    }
    onFormChange('installment_count', installmentCount);
  };

  const handleInstallmentAmountChange = (installmentAmount: string) => {
    if (sellForm.sale_price && sellForm.down_payment && installmentAmount) {
      const remaining = Number(sellForm.sale_price) - Number(sellForm.down_payment);
      const amount = Number(installmentAmount);
      if (amount > 0 && remaining > 0) {
        const count = Math.round(remaining / amount);
        updateBatch({ installment_amount: installmentAmount, installment_count: count > 0 ? String(count) : "" });
        return;
      }
    }
    onFormChange('installment_amount', installmentAmount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Araç Satışı</DialogTitle>
          <DialogDescription>
            Araç satış bilgilerini girin. Müşteri adı ve satış tarihi zorunludur.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Müşteri Adı Soyadı *</label>
              <Input
                value={sellForm.customer_name}
                onChange={(e) => onFormChange('customer_name', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Müşteri Telefon</label>
              <Input
                value={sellForm.customer_phone}
                onChange={(e) => onFormChange('customer_phone', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Müşteri Adres</label>
            <Input
              value={sellForm.customer_address}
              onChange={(e) => onFormChange('customer_address', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Araç Plaka</label>
              <Input
                value={sellForm.plate_number}
                onChange={(e) => onFormChange('plate_number', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Anahtar Sayısı</label>
              <Input
                type="number"
                value={sellForm.key_count}
                onChange={(e) => onFormChange('key_count', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Satış Fiyatı *</label>
            <CurrencyInput
              value={sellForm.sale_price}
              currency={sellForm.sale_currency || "TRY"}
              onValueChange={handleSalePriceChange}
              onCurrencyChange={(value) => onFormChange('sale_currency', value)}
              placeholder="Satış fiyatını girin"
              currencies={currencies.map(c => ({ value: c.value, label: c.label }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Ödeme Tipi *</label>
              <Select
                value={sellForm.payment_type}
                onValueChange={(value) => onFormChange('payment_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ödeme tipi seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Peşin</SelectItem>
                  <SelectItem value="installment">Taksitli</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Satış Tarihi *</label>
              <Input
                type="date"
                value={sellForm.sale_date}
                onChange={(e) => onFormChange('sale_date', e.target.value)}
              />
            </div>
          </div>
          {sellForm.payment_type === "installment" && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Peşinat *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={sellForm.down_payment}
                  onChange={(e) => handleDownPaymentChange(e.target.value)}
                  placeholder="Peşinat tutarını girin"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Taksit Sayısı *</label>
                <Input
                  type="number"
                  value={sellForm.installment_count}
                  onChange={(e) => handleInstallmentCountChange(e.target.value)}
                  placeholder="Taksit sayısını girin"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Taksit Tutarı</label>
                <Input
                  type="number"
                  step="0.01"
                  value={sellForm.installment_amount}
                  onChange={(e) => handleInstallmentAmountChange(e.target.value)}
                  placeholder="Tutar veya taksit sayısı girin"
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={onSubmit}>Satıldı Olarak İşaretle</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
