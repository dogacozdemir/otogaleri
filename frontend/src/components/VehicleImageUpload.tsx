import React, { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Star, GripVertical, Trash2, Camera, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import Webcam from "react-webcam";

type VehicleImage = {
  id: number;
  image_path: string;
  image_filename: string;
  url: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
};

interface VehicleImageUploadProps {
  vehicleId: number;
  onUpdate?: () => void;
}

const VehicleImageUpload: React.FC<VehicleImageUploadProps> = ({ vehicleId, onUpdate }) => {
  const [images, setImages] = useState<VehicleImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const { toast } = useToast();

  // Fotoğrafları yükle
  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/vehicles/${vehicleId}/images`);
      setImages(response.data || []);
    } catch (error: any) {
      console.error('Fotoğraflar yüklenemedi:', error);
      toast({
        title: "Hata",
        description: "Fotoğraflar yüklenemedi.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Component mount olduğunda fotoğrafları yükle
  useEffect(() => {
    if (vehicleId) {
      fetchImages();
    }
  }, [vehicleId]);

  // Fotoğraf yükle
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('image', file);

        await api.post(`/vehicles/${vehicleId}/images`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      toast({ title: "Başarılı", description: "Fotoğraf(lar) yüklendi." });
      await fetchImages();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.message || "Fotoğraf yüklenemedi.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Kamera ile fotoğraf çek
  const capturePhoto = useCallback(async () => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      toast({
        title: "Hata",
        description: "Fotoğraf çekilemedi.",
        variant: "destructive"
      });
      return;
    }

    // Base64'ü Blob'a dönüştür
    const response = await fetch(imageSrc);
    const blob = await response.blob();
    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

    // Fotoğrafı yükle
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      await api.post(`/vehicles/${vehicleId}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast({ title: "Başarılı", description: "Fotoğraf çekildi ve yüklendi." });
      setShowCamera(false);
      await fetchImages();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.message || "Fotoğraf yüklenemedi.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  }, [vehicleId, toast, onUpdate, fetchImages]);

  // Ön kapak fotoğrafı seç
  const handleSetPrimary = async (imageId: number) => {
    try {
      await api.put(`/vehicles/${vehicleId}/images/${imageId}/primary`);
      toast({ title: "Başarılı", description: "Ön kapak fotoğrafı güncellendi." });
      await fetchImages();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.message || "Ön kapak fotoğrafı güncellenemedi.",
        variant: "destructive"
      });
    }
  };

  // Fotoğraf sil
  const handleDelete = async (imageId: number) => {
    if (!confirm("Bu fotoğrafı silmek istediğinize emin misiniz?")) return;

    try {
      await api.delete(`/vehicles/${vehicleId}/images/${imageId}`);
      toast({ title: "Başarılı", description: "Fotoğraf silindi." });
      await fetchImages();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.message || "Fotoğraf silinemedi.",
        variant: "destructive"
      });
    }
  };

  // Sıralama güncelle (basit versiyon - drag & drop için daha gelişmiş kütüphane gerekebilir)
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];

    // Display order'ları güncelle
    const imageOrders = newImages.map((img, idx) => ({
      imageId: img.id,
      display_order: idx
    }));

    try {
      await api.put(`/vehicles/${vehicleId}/images/order`, { imageOrders });
      setImages(newImages);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: "Sıralama güncellenemedi.",
        variant: "destructive"
      });
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === images.length - 1) return;

    const newImages = [...images];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];

    const imageOrders = newImages.map((img, idx) => ({
      imageId: img.id,
      display_order: idx
    }));

    try {
      await api.put(`/vehicles/${vehicleId}/images/order`, { imageOrders });
      setImages(newImages);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: "Sıralama güncellenemedi.",
        variant: "destructive"
      });
    }
  };

  // API base URL'ini al
  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads')) {
      const baseURL = import.meta.env.VITE_API_BASE 
        ? import.meta.env.VITE_API_BASE.replace('/api', '')
        : 'http://localhost:5005';
      return `${baseURL}${url}`;
    }
    // Eğer sadece dosya adı varsa, /uploads/vehicles/ ekle
    if (!url.startsWith('/')) {
      const baseURL = import.meta.env.VITE_API_BASE 
        ? import.meta.env.VITE_API_BASE.replace('/api', '')
        : 'http://localhost:5005';
      return `${baseURL}/uploads/vehicles/${url}`;
    }
    return url;
  };

  return (
    <div className="space-y-4">
      {/* Yükleme Butonları */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={handleUpload}
          className="hidden"
          id="vehicle-image-upload"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          variant="outline"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Yükleniyor..." : "Dosyadan Yükle"}
        </Button>
        <Button
          onClick={() => setShowCamera(true)}
          disabled={uploading}
          variant="default"
        >
          <Camera className="h-4 w-4 mr-2" />
          Kamera ile Çek
        </Button>
        <span className="text-sm text-muted-foreground">
          Maksimum 5MB, JPG, PNG veya WEBP
        </span>
      </div>

      {/* Kamera Modal */}
      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kamera ile Fotoğraf Çek</DialogTitle>
            <DialogDescription>
              Kameranızı kullanarak araç fotoğrafı çekin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  facingMode: facingMode,
                  width: { ideal: 1280 },
                  height: { ideal: 720 }
                }}
                className="w-full h-auto"
              />
            </div>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setFacingMode(facingMode === "user" ? "environment" : "user")}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Kamerayı Değiştir
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCamera(false)}>
                  İptal
                </Button>
                <Button onClick={capturePhoto} disabled={uploading}>
                  <Camera className="h-4 w-4 mr-2" />
                  {uploading ? "Yükleniyor..." : "Fotoğraf Çek"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fotoğraf Galerisi */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
      ) : images.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Henüz fotoğraf yüklenmemiş
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <Card key={image.id} className="relative group overflow-hidden">
              <div className="aspect-square relative bg-muted">
                <img
                  src={getImageUrl(image.url)}
                  alt={`Araç fotoğrafı ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                    const placeholder = img.nextElementSibling as HTMLElement;
                    if (placeholder) {
                      placeholder.style.display = 'flex';
                    }
                  }}
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    const placeholder = img.nextElementSibling as HTMLElement;
                    if (placeholder) {
                      placeholder.style.display = 'none';
                    }
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm" style={{ display: 'none' }}>
                  Resim yüklenemedi
                </div>
                
                {/* Overlay - Hover'da görünür */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSetPrimary(image.id)}
                    title={image.is_primary ? "Ön kapak fotoğrafı" : "Ön kapak yap"}
                  >
                    <Star className={`h-4 w-4 ${image.is_primary ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  </Button>
                  {index > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleMoveUp(index)}
                      title="Yukarı taşı"
                    >
                      <GripVertical className="h-4 w-4" />
                    </Button>
                  )}
                  {index < images.length - 1 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleMoveDown(index)}
                      title="Aşağı taşı"
                    >
                      <GripVertical className="h-4 w-4 rotate-90" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(image.id)}
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Ön kapak badge */}
                {image.is_primary && (
                  <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                    <Star className="h-3 w-3 fill-white" />
                    Ön Kapak
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VehicleImageUpload;
