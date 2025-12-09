import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/api";
import { Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  importType: "vehicles" | "costs";
}

export function BulkImportDialog({
  open,
  onOpenChange,
  onSuccess,
  importType,
}: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const filename = selectedFile.name.toLowerCase();
    const isValidFormat =
      filename.endsWith(".xlsx") ||
      filename.endsWith(".xls") ||
      filename.endsWith(".csv");

    if (!isValidFormat) {
      toast({
        title: "Geçersiz Dosya",
        description: "Sadece Excel (.xlsx, .xls) veya CSV dosyaları yüklenebilir.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setPreview(null);
    setErrors([]);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Dosya Seçilmedi",
        description: "Lütfen bir dosya seçin.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const endpoint =
        importType === "vehicles"
          ? "/vehicles/bulk-import"
          : "/vehicles/bulk-costs";

      const response = await api.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const result = response.data;

      if (result.validationErrors && result.validationErrors.length > 0) {
        setErrors(result.validationErrors);
      }

      if (result.insertErrors && result.insertErrors.length > 0) {
        setErrors((prev) => [...prev, ...result.insertErrors]);
      }

      if (result.inserted > 0) {
        toast({
          title: "Başarılı",
          description: `${result.inserted} kayıt başarıyla içe aktarıldı.`,
          variant: "default",
        });

        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        if (onSuccess) {
          onSuccess();
        }

        // If no errors, close dialog
        if (result.validationErrors?.length === 0 && result.insertErrors?.length === 0) {
          onOpenChange(false);
        }
      } else {
        toast({
          title: "Uyarı",
          description: "Hiçbir kayıt içe aktarılamadı. Lütfen hataları kontrol edin.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Bulk import error:", error);
      toast({
        title: "Hata",
        description:
          error?.response?.data?.error ||
          "Dosya yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const getFileIcon = () => {
    if (!file) return null;
    const filename = file.name.toLowerCase();
    if (filename.endsWith(".csv")) {
      return <FileText className="h-8 w-8 text-[#003d82]" />;
    }
    return <FileSpreadsheet className="h-8 w-8 text-[#003d82]" />;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-[#e2e8f0] shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-[#2d3748] flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#003d82]" />
            {importType === "vehicles" ? "Toplu Araç İçe Aktar" : "Toplu Masraf İçe Aktar"}
          </DialogTitle>
          <DialogDescription className="text-[#2d3748]/70">
            Excel (.xlsx, .xls) veya CSV dosyası yükleyerek toplu veri girişi yapabilirsiniz.
            {importType === "vehicles" && (
              <span className="block mt-2 text-xs">
                Gerekli sütunlar: maker, model (en az biri). Opsiyonel: vehicle_number, production_year, chassis_no, sale_price, purchase_amount, vb.
              </span>
            )}
            {importType === "costs" && (
              <span className="block mt-2 text-xs">
                Gerekli sütunlar: vehicle_number, cost_name, amount, cost_date
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div className="border-2 border-dashed border-[#e2e8f0] rounded-xl p-6 bg-[#f8f9fa]">
            <div className="flex flex-col items-center justify-center space-y-4">
              {file ? (
                <>
                  {getFileIcon()}
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#2d3748]">{file.name}</p>
                    <p className="text-xs text-[#2d3748]/60 mt-1">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="rounded-xl"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Dosyayı Kaldır
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-[#2d3748]/40" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#2d3748] mb-1">
                      Dosya seçin veya sürükleyip bırakın
                    </p>
                    <p className="text-xs text-[#2d3748]/60">
                      Excel veya CSV formatında
                    </p>
                  </div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl bg-white border-[#003d82] text-[#003d82] hover:bg-[#003d82] hover:text-white"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Dosya Seç
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Errors Display */}
          {errors.length > 0 && (
            <div className="border border-red-200 rounded-xl p-4 bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h4 className="font-semibold text-red-800">
                  {errors.length} Hata Bulundu
                </h4>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {errors.slice(0, 10).map((error, index) => (
                  <div
                    key={index}
                    className="text-xs bg-white p-2 rounded-lg border border-red-100"
                  >
                    <span className="font-medium text-red-700">Satır {error.row}:</span>{" "}
                    <span className="text-red-600">{error.error}</span>
                  </div>
                ))}
                {errors.length > 10 && (
                  <p className="text-xs text-red-600 italic">
                    ... ve {errors.length - 10} hata daha
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
            className="rounded-xl"
          >
            İptal
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-[#F0A500] hover:bg-[#d89400] text-white rounded-xl"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Yükleniyor...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                İçe Aktar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

