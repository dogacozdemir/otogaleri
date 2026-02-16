import { Vehicle } from "@/hooks/useVehiclesData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

export type DocumentFormData = {
  document_type: string;
  document_name: string;
  expiry_date: string;
  notes: string;
};

interface VehicleDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  documentForm: DocumentFormData;
  selectedFile: File | null;
  onFormChange: (field: keyof DocumentFormData, value: any) => void;
  onFileChange: (file: File | null) => void;
  onSubmit: () => Promise<void>;
}

export const VehicleDocumentModal = ({
  open,
  onOpenChange,
  vehicle,
  documentForm,
  selectedFile,
  onFormChange,
  onFileChange,
  onSubmit,
}: VehicleDocumentModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Belge Yükle</DialogTitle>
          <DialogDescription>Araç belgesi yükleyin (Sözleşme, Ruhsat, Sigorta, vb.)</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">Belge Türü *</label>
            <Select
              value={documentForm.document_type}
              onValueChange={(value) => onFormChange('document_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Sözleşme</SelectItem>
                <SelectItem value="registration">Ruhsat</SelectItem>
                <SelectItem value="insurance">Sigorta</SelectItem>
                <SelectItem value="inspection">Muayene</SelectItem>
                <SelectItem value="customs">Gümrük</SelectItem>
                <SelectItem value="invoice">Fatura</SelectItem>
                <SelectItem value="eksper">Eksper</SelectItem>
                <SelectItem value="grade">Grade</SelectItem>
                <SelectItem value="other">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Belge Adı *</label>
            <Input
              value={documentForm.document_name}
              onChange={(e) => onFormChange('document_name', e.target.value)}
              placeholder="Örn: Satış Sözleşmesi"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Dosya *</label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                className="flex-1"
              />
              {selectedFile && (
                <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Son Geçerlilik Tarihi</label>
            <Input
              type="date"
              value={documentForm.expiry_date}
              onChange={(e) => onFormChange('expiry_date', e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Notlar</label>
            <Input
              value={documentForm.notes}
              onChange={(e) => onFormChange('notes', e.target.value)}
              placeholder="Belge hakkında notlar"
            />
          </div>
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              onClick={onSubmit}
              className="flex-1"
            >
              Yükle
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              İptal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
