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

export type CostFormData = {
  cost_name: string;
  amount: string;
  currency: string;
  date: string;
  category: string;
  customRate: number | null;
};

interface VehicleCostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  costForm: CostFormData;
  onFormChange: (field: keyof CostFormData, value: any) => void;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  defaultCostItems: string[];
  costCategories: Array<{ value: string; label: string }>;
  currencies: Array<{ value: string; label: string }>;
}

export const VehicleCostModal = ({
  open,
  onOpenChange,
  mode,
  costForm,
  onFormChange,
  onSubmit,
  onCancel,
  defaultCostItems,
  costCategories,
  currencies,
}: VehicleCostModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Harcama Ekle' : 'Harcama Düzenle'}</DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? 'Araç için yeni bir harcama ekleyin. Tüm alanlar zorunludur.'
              : 'Harcama bilgilerini güncelleyin. Tüm alanlar zorunludur.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">Harcama Adı *</label>
            <Select
              value={costForm.cost_name && defaultCostItems.includes(costForm.cost_name) ? costForm.cost_name : ""}
              onValueChange={(value) => onFormChange('cost_name', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Harcama seçin veya yeni ekleyin" />
              </SelectTrigger>
              <SelectContent>
                {defaultCostItems.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="mt-2"
              placeholder="Veya yeni harcama adı yazın"
              value={costForm.cost_name}
              onChange={(e) => onFormChange('cost_name', e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Tutar *</label>
            <CurrencyInput
              value={costForm.amount}
              currency={costForm.currency || "TRY"}
              onValueChange={(value) => onFormChange('amount', value)}
              onCurrencyChange={(value) => onFormChange('currency', value)}
              currencies={currencies.map(c => ({ value: c.value, label: c.label }))}
              customRate={costForm.customRate}
              onCustomRateChange={(rate) => onFormChange('customRate', rate)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Tarih</label>
            <Input
              type="date"
              value={costForm.date}
              onChange={(e) => onFormChange('date', e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Kategori</label>
            <Select
              value={costForm.category || "other"}
              onValueChange={(value) => onFormChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kategori seçin" />
              </SelectTrigger>
              <SelectContent>
                {costCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>İptal</Button>
          <Button onClick={onSubmit}>{mode === 'add' ? 'Ekle' : 'Güncelle'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
