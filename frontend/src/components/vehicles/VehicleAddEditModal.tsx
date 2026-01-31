import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { CheckCircle } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";

export type VehicleFormData = {
  vehicle_number: string;
  maker: string;
  model: string;
  production_year: string;
  arrival_date: string;
  transmission: string;
  chassis_no: string;
  plate_number: string;
  km: string;
  fuel: string;
  grade: string;
  cc: string;
  color: string;
  engine_no: string;
  other: string;
  sale_price: string;
  sale_currency: string;
  paid: string;
  purchase_currency: string;
  delivery_date: string;
  delivery_time: string;
  status: string;
  stock_status: string;
  location: string;
  target_profit: string;
  features: Record<string, boolean>;
  contract_pdf: File | null;
};

type Currency = {
  value: string;
  label: string;
};

interface VehicleAddEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  vehicleForm: VehicleFormData;
  formErrors: Record<string, string>;
  modalStep: number;
  isSubmitting: boolean;
  currencies: Currency[];
  onFormChange: (field: keyof VehicleFormData, value: any) => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onSubmit: () => Promise<void>;
  onReset: () => void;
  trigger?: React.ReactNode;
}

export const VehicleAddEditModal = ({
  open,
  onOpenChange,
  mode,
  vehicleForm,
  formErrors,
  modalStep,
  isSubmitting,
  currencies,
  onFormChange,
  onNextStep,
  onPreviousStep,
  onSubmit,
  onReset,
  trigger,
}: VehicleAddEditModalProps) => {
  const handleClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      onReset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isSubmitting) {
            e.preventDefault();
            if (modalStep === 1) {
              onNextStep();
            } else {
              onSubmit();
            }
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Yeni Araç Ekle' : 'Araç Düzenle'}</DialogTitle>
          <DialogDescription>
            Araç bilgilerini iki adımda girin. İlk adımda temel bilgiler, ikinci adımda satış ve durum bilgileri.
          </DialogDescription>
        </DialogHeader>
        
        {/* Step Indicator */}
        <div className="mt-4 mb-6 px-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 shadow-sm ${
                modalStep >= 1 
                  ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105' 
                  : 'bg-muted border-muted-foreground/20 text-muted-foreground'
              }`}>
                {modalStep > 1 ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-bold">1</span>
                )}
              </div>
              <div className={`flex-1 h-1.5 mx-3 rounded-full transition-all duration-500 ${
                modalStep > 1 ? 'bg-primary shadow-sm' : 'bg-muted'
              }`} />
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 shadow-sm ${
                modalStep >= 2 
                  ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105' 
                  : 'bg-muted border-muted-foreground/20 text-muted-foreground'
              }`}>
                <span className="text-sm font-bold">2</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-3 px-1">
            <span className={`text-xs font-semibold transition-colors ${
              modalStep === 1 ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              Araç Bilgileri
            </span>
            <span className={`text-xs font-semibold transition-colors ${
              modalStep === 2 ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              Satış ve Durum
            </span>
          </div>
        </div>
        
        <div className="transition-all duration-300 ease-in-out">
          {modalStep === 1 ? (
            // Adım 1: Araç Bilgileri
            <div className="mt-4 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Araç No</label>
                  <Input
                    type="number"
                    value={vehicleForm.vehicle_number}
                    onChange={(e) => onFormChange('vehicle_number', e.target.value)}
                    placeholder="Otomatik"
                    className="h-8"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Marka <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={vehicleForm.maker}
                    onChange={(e) => {
                      onFormChange('maker', e.target.value);
                    }}
                    placeholder="Örn: Toyota"
                    className={`h-8 ${formErrors.maker ? 'border-destructive' : ''}`}
                  />
                  {formErrors.maker && (
                    <p className="text-xs text-destructive mt-1">{formErrors.maker}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Model <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={vehicleForm.model}
                    onChange={(e) => {
                      onFormChange('model', e.target.value);
                    }}
                    placeholder="Örn: Corolla"
                    className={`h-8 ${formErrors.model ? 'border-destructive' : ''}`}
                  />
                  {formErrors.model && (
                    <p className="text-xs text-destructive mt-1">{formErrors.model}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Üretim Yılı</label>
                  <Input
                    type="number"
                    value={vehicleForm.production_year}
                    onChange={(e) => onFormChange('production_year', e.target.value)}
                    placeholder="Örn: 2023"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Bayiye Geliş Tarihi</label>
                  <Input
                    type="date"
                    value={vehicleForm.arrival_date}
                    onChange={(e) => onFormChange('arrival_date', e.target.value)}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Vites</label>
                  <Input
                    value={vehicleForm.transmission}
                    onChange={(e) => onFormChange('transmission', e.target.value)}
                    placeholder="Örn: Otomatik"
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Şasi No</label>
                  <Input
                    value={vehicleForm.chassis_no}
                    onChange={(e) => onFormChange('chassis_no', e.target.value)}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Plaka</label>
                  <Input
                    value={vehicleForm.plate_number}
                    onChange={(e) => onFormChange('plate_number', e.target.value)}
                    placeholder="Örn: 34ABC123"
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Km</label>
                  <Input
                    type="number"
                    value={vehicleForm.km}
                    onChange={(e) => onFormChange('km', e.target.value)}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Yakıt</label>
                  <Input
                    value={vehicleForm.fuel}
                    onChange={(e) => onFormChange('fuel', e.target.value)}
                    placeholder="Örn: Benzin"
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Sınıf</label>
                  <Input
                    value={vehicleForm.grade}
                    onChange={(e) => onFormChange('grade', e.target.value)}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">CC</label>
                  <Input
                    type="number"
                    value={vehicleForm.cc}
                    onChange={(e) => onFormChange('cc', e.target.value)}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Renk</label>
                  <Input
                    value={vehicleForm.color}
                    onChange={(e) => onFormChange('color', e.target.value)}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Motor No</label>
                  <Input
                    value={vehicleForm.engine_no}
                    onChange={(e) => onFormChange('engine_no', e.target.value)}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Diğer</label>
                  <Input
                    value={vehicleForm.other}
                    onChange={(e) => onFormChange('other', e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button onClick={onNextStep}>İleri</Button>
              </DialogFooter>
            </div>
          ) : (
            // Adım 2: Satış ve Durum Bilgileri
            <div className="mt-4 animate-in fade-in slide-in-from-left-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Önerilen Satış Fiyatı</label>
                  <CurrencyInput
                    value={vehicleForm.sale_price}
                    currency={vehicleForm.sale_currency || "TRY"}
                    onValueChange={(value) => onFormChange('sale_price', value)}
                    onCurrencyChange={(value) => onFormChange('sale_currency', value)}
                    className="h-8"
                    currencies={currencies.map(c => ({ value: c.value, label: c.label }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Alış Fiyatı</label>
                  <CurrencyInput
                    value={vehicleForm.paid}
                    currency={vehicleForm.purchase_currency}
                    onValueChange={(value) => onFormChange('paid', value)}
                    onCurrencyChange={(value) => onFormChange('purchase_currency', value)}
                    className="h-8"
                    currencies={currencies.map(c => ({ value: c.value, label: c.label }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Araç Durumu</label>
                  <Select
                    value={vehicleForm.status || "used"}
                    onValueChange={(value) => onFormChange('status', value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Araç durumu seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Sıfır</SelectItem>
                      <SelectItem value="used">İkinci El</SelectItem>
                      <SelectItem value="damaged">Hasarlı</SelectItem>
                      <SelectItem value="repaired">Onarılmış</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Stok Durumu</label>
                  <Select
                    value={vehicleForm.stock_status || "in_stock"}
                    onValueChange={(value) => onFormChange('stock_status', value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Stok durumu seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_stock">Stokta</SelectItem>
                      <SelectItem value="on_sale">Satışta</SelectItem>
                      <SelectItem value="reserved">Rezerve</SelectItem>
                      <SelectItem value="sold">Satıldı</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Lokasyon</label>
                  <Input
                    value={vehicleForm.location}
                    onChange={(e) => onFormChange('location', e.target.value)}
                    placeholder="Örn: Şube A, Park Yeri 5"
                    className="h-8"
                  />
                </div>
                {mode === 'add' && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Sözleşme PDF</label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onFormChange('contract_pdf', file);
                        }
                      }}
                      className="h-8"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Araç eklenirken sözleşme PDF'i yüklenecektir</p>
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button 
                  variant="outline" 
                  onClick={onPreviousStep}
                  disabled={isSubmitting}
                >
                  Geri
                </Button>
                <Button 
                  onClick={onSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="mr-2">Yükleniyor...</span>
                    </>
                  ) : (
                    mode === 'add' ? "Ekle" : "Kaydet"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
