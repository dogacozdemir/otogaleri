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

export type PaymentFormData = {
  installment_sale_id: string;
  payment_type: "down_payment" | "installment";
  installment_number: string;
  amount: string;
  currency: string;
  payment_date: string;
  notes: string;
};

interface VehiclePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  paymentForm: PaymentFormData;
  onFormChange: (field: keyof PaymentFormData, value: any) => void;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  currencies: Array<{ value: string; label: string }>;
}

export const VehiclePaymentModal = ({
  open,
  onOpenChange,
  mode,
  paymentForm,
  onFormChange,
  onSubmit,
  onCancel,
  currencies,
}: VehiclePaymentModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Taksit Ödemesi Ekle' : 'Taksit Ödemesi Düzenle'}</DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? 'Taksit ödemesi bilgilerini girin.'
              : 'Taksit ödemesi bilgilerini düzenleyin.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">Ödeme Tipi *</label>
            <Select
              value={paymentForm.payment_type}
              onValueChange={(value) => onFormChange('payment_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ödeme tipi seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="down_payment">Peşinat</SelectItem>
                <SelectItem value="installment">Taksit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {paymentForm.payment_type === "installment" && (
            <div>
              <label className="text-sm font-medium">Taksit Numarası *</label>
              <Input
                type="number"
                value={paymentForm.installment_number}
                onChange={(e) => onFormChange('installment_number', e.target.value)}
                placeholder="Taksit numarasını girin"
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Tutar *</label>
            <CurrencyInput
              value={paymentForm.amount}
              currency={paymentForm.currency}
              onValueChange={(value) => onFormChange('amount', value)}
              onCurrencyChange={(value) => onFormChange('currency', value)}
              placeholder="Ödeme tutarını girin"
              currencies={currencies.map(c => ({ value: c.value, label: c.label }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Ödeme Tarihi *</label>
            <Input
              type="date"
              value={paymentForm.payment_date}
              onChange={(e) => onFormChange('payment_date', e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Notlar</label>
            <Input
              value={paymentForm.notes}
              onChange={(e) => onFormChange('notes', e.target.value)}
              placeholder="Opsiyonel notlar"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>İptal</Button>
          <Button onClick={onSubmit}>{mode === 'add' ? 'Kaydet' : 'Güncelle'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
