import { Vehicle } from "@/hooks/useVehiclesData";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Eye, Trash2, FileText } from "lucide-react";
import { api } from "@/api";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/utils";

interface VehicleDetailDocumentsTabProps {
  vehicle: Vehicle;
  vehicleDocuments: any[];
  onOpenDocumentDialog: () => void;
  onFetchDocuments: (vehicleId: number) => Promise<void>;
}

export const VehicleDetailDocumentsTab = ({
  vehicle,
  vehicleDocuments,
  onOpenDocumentDialog,
  onFetchDocuments,
}: VehicleDetailDocumentsTabProps) => {
  const { toast } = useToast();

  const handleDeleteDocument = async (docId: number) => {
    if (confirm("Bu belgeyi silmek istediğinize emin misiniz?")) {
      try {
        await api.delete(`/documents/vehicles/${docId}`);
        await onFetchDocuments(vehicle.id);
        toast({ title: "Başarılı", description: "Belge silindi" });
      } catch (error: any) {
        toast({
          title: "Hata",
          description: error?.response?.data?.error || "Belge silinemedi",
          variant: "destructive",
        });
      }
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      contract: "Sözleşme",
      registration: "Ruhsat",
      insurance: "Sigorta",
      inspection: "Muayene",
      customs: "Gümrük",
      invoice: "Fatura",
    };
    return labels[type] || "Diğer";
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Araç Belgeleri</h3>
        <Button onClick={onOpenDocumentDialog} size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Belge Yükle
        </Button>
      </div>
      {vehicleDocuments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vehicleDocuments.map((doc) => (
            <Card key={doc.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">{doc.document_name}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {getDocumentTypeLabel(doc.document_type)}
                  </p>
                  {doc.expiry_date && (
                    <p className="text-xs text-muted-foreground">
                      Son Geçerlilik: {new Date(doc.expiry_date).toLocaleDateString("tr-TR")}
                    </p>
                  )}
                  {doc.notes && (
                    <p className="text-sm mt-2 text-muted-foreground">{doc.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`${getApiBaseUrl()}${doc.file_path}`, "_blank")}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDocument(doc.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Henüz belge yüklenmemiş</p>
        </div>
      )}
    </>
  );
};
