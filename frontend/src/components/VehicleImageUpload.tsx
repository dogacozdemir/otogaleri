import React, { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Star, GripVertical, Trash2, Camera, RotateCcw, Image as ImageIcon, CheckCircle2, AlertCircle, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import Webcam from "react-webcam";
import ImageEditor from "./ImageEditor";

type VehicleImage = {
  id: number;
  image_path: string;
  image_filename: string;
  url: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
};

type UploadProgress = {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
};

interface VehicleImageUploadProps {
  vehicleId: number;
  onUpdate?: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 20;

const VehicleImageUpload: React.FC<VehicleImageUploadProps> = ({ vehicleId, onUpdate }) => {
  const [images, setImages] = useState<VehicleImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isDragging, setIsDragging] = useState(false);
  const [imageLoadStates, setImageLoadStates] = useState<Record<number, 'loading' | 'loaded' | 'error'>>({});
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<File | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const uploadedFileNames = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  // Fotoğrafları yükle
  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/vehicles/${vehicleId}/images`);
      const fetchedImages = response.data || [];
      setImages(fetchedImages);
      // Uploaded file names'i güncelle (duplicate kontrolü için)
      uploadedFileNames.current = new Set(fetchedImages.map((img: VehicleImage) => img.image_filename));
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

  // Dosya validasyonu
  const validateFile = (file: File): string | null => {
    // Dosya boyutu kontrolü
    if (file.size > MAX_FILE_SIZE) {
      return `Dosya boyutu çok büyük. Maksimum ${MAX_FILE_SIZE / 1024 / 1024}MB olmalıdır.`;
    }

    // Dosya tipi kontrolü
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Sadece JPG, PNG veya WEBP formatları desteklenmektedir.';
    }

    // Duplicate kontrolü
    if (uploadedFileNames.current.has(file.name)) {
      return 'Bu dosya daha önce yüklenmiş.';
    }

    return null;
  };

  // Image Editor'dan düzenlenmiş görseli al
  const handleImageEditorSave = useCallback((croppedBlob: Blob) => {
    // Blob'u File'a çevir
    const editedFile = new File([croppedBlob], imageToEdit?.name || `edited-${Date.now()}.jpg`, {
      type: croppedBlob.type || 'image/jpeg',
      lastModified: Date.now(),
    });

    // Eğer pending files varsa, düzenlenmiş dosyayı ekle ve upload et
    if (pendingFiles.length > 0) {
      uploadFiles([editedFile, ...pendingFiles]);
      setPendingFiles([]);
    } else {
      // Tek dosya upload
      uploadFiles([editedFile]);
    }
    
    setImageToEdit(null);
  }, [imageToEdit, pendingFiles]);

  // Batch upload fonksiyonu
  const uploadFiles = async (files: File[]) => {
    // Validasyon
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    // Hataları göster
    if (errors.length > 0) {
      toast({
        title: "Yükleme Hatası",
        description: errors.slice(0, 3).join('\n') + (errors.length > 3 ? `\n...ve ${errors.length - 3} dosya daha` : ''),
        variant: "destructive",
        duration: 5000,
      });
    }

    if (validFiles.length === 0) return;

    // Upload queue oluştur
    const queue: UploadProgress[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }));

    setUploadQueue(queue);
    setUploading(true);

    // Paralel upload (3'erli gruplar halinde)
    const BATCH_SIZE = 3;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
      const batch = queue.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (item, batchIndex) => {
          const globalIndex = i + batchIndex;
          
          // Status'u uploading yap
          setUploadQueue(prev => {
            const updated = [...prev];
            updated[globalIndex] = { ...updated[globalIndex], status: 'uploading', progress: 10 };
            return updated;
          });

          try {
            const formData = new FormData();
            formData.append('image', item.file);

            // Upload with progress tracking
            const uploadPromise = api.post(`/vehicles/${vehicleId}/images`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              },
            });

            // Simulate progress (since axios doesn't expose onUploadProgress in our wrapper)
            // In production, you could use XMLHttpRequest for real progress tracking
            const progressInterval = setInterval(() => {
              setUploadQueue(prev => {
                const updated = [...prev];
                if (updated[globalIndex] && updated[globalIndex].status === 'uploading') {
                  const currentProgress = updated[globalIndex].progress;
                  if (currentProgress < 90) {
                    updated[globalIndex] = { ...updated[globalIndex], progress: currentProgress + 10 };
                  }
                }
                return updated;
              });
            }, 200);

            await uploadPromise;
            clearInterval(progressInterval);

            // Success
            setUploadQueue(prev => {
              const updated = [...prev];
              updated[globalIndex] = { ...updated[globalIndex], status: 'success', progress: 100 };
              return updated;
            });
            successCount++;
            uploadedFileNames.current.add(item.file.name);
          } catch (error: any) {
            const errorMessage = error?.response?.data?.message || 'Yükleme başarısız';
            setUploadQueue(prev => {
              const updated = [...prev];
              updated[globalIndex] = { 
                ...updated[globalIndex], 
                status: 'error', 
                error: errorMessage,
                progress: 0 
              };
              return updated;
            });
            errorCount++;
          }
        })
      );
    }

    // Sonuçları göster
    if (successCount > 0) {
      toast({
        title: "Başarılı",
        description: `${successCount} fotoğraf başarıyla yüklendi.`,
        variant: "default"
      });
      await fetchImages();
      if (onUpdate) onUpdate();
    }

    if (errorCount > 0) {
      toast({
        title: "Hata",
        description: `${errorCount} fotoğraf yüklenemedi.`,
        variant: "destructive"
      });
    }

    // Queue'yu temizle (2 saniye sonra)
    setTimeout(() => {
      setUploadQueue([]);
      setUploading(false);
    }, 2000);
  };

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/')
    );

    if (files.length === 0) {
      toast({
        title: "Geçersiz Dosya",
        description: "Lütfen sadece görsel dosyaları sürükleyin.",
        variant: "destructive"
      });
      return;
    }

    if (files.length > MAX_FILES) {
      toast({
        title: "Çok Fazla Dosya",
        description: `Maksimum ${MAX_FILES} dosya yükleyebilirsiniz.`,
        variant: "destructive"
      });
      return;
    }

    // İlk dosyayı editörde aç, diğerlerini pending'e ekle
    if (files.length === 1) {
      setImageToEdit(files[0]);
      setShowImageEditor(true);
    } else {
      setImageToEdit(files[0]);
      setPendingFiles(files.slice(1));
      setShowImageEditor(true);
    }
  }, [toast]);

  // File input handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    if (fileArray.length > MAX_FILES) {
      toast({
        title: "Çok Fazla Dosya",
        description: `Maksimum ${MAX_FILES} dosya yükleyebilirsiniz.`,
        variant: "destructive"
      });
      return;
    }

    // İlk dosyayı editörde aç, diğerlerini pending'e ekle
    if (fileArray.length === 1) {
      setImageToEdit(fileArray[0]);
      setShowImageEditor(true);
    } else {
      // Çoklu dosya: İlk dosyayı editörde aç, diğerlerini beklet
      setImageToEdit(fileArray[0]);
      setPendingFiles(fileArray.slice(1));
      setShowImageEditor(true);
    }
    
    // Input'u temizle
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

    // Kameradan çekilen fotoğrafı editörde aç
    setImageToEdit(file);
    setShowCamera(false);
    setShowImageEditor(true);
  }, [toast]);

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

  // Sıralama güncelle
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];

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
    if (!url.startsWith('/')) {
      const baseURL = import.meta.env.VITE_API_BASE 
        ? import.meta.env.VITE_API_BASE.replace('/api', '')
        : 'http://localhost:5005';
      return `${baseURL}/uploads/vehicles/${url}`;
    }
    return url;
  };

  // Image load handler
  const handleImageLoad = (imageId: number) => {
    setImageLoadStates(prev => ({ ...prev, [imageId]: 'loaded' }));
  };

  const handleImageError = (imageId: number) => {
    setImageLoadStates(prev => ({ ...prev, [imageId]: 'error' }));
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Drag & Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 transition-all duration-200
          ${isDragging 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-muted-foreground/25 hover:border-primary/50 bg-muted/30'
          }
          ${uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        `}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="vehicle-image-upload"
        />
        
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className={`
            p-4 rounded-full transition-colors
            ${isDragging ? 'bg-primary/10' : 'bg-muted'}
          `}>
            <Upload className={`h-8 w-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className="text-sm font-medium">
              {isDragging ? 'Dosyaları buraya bırakın' : 'Dosyaları sürükleyip bırakın veya tıklayın'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Maksimum {MAX_FILES} dosya, her biri en fazla {MAX_FILE_SIZE / 1024 / 1024}MB (JPG, PNG, WEBP)
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadQueue.length > 0 && (
        <Card className="p-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Yükleme Durumu</h4>
            {uploadQueue.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate flex-1 mr-2">{item.file.name}</span>
                  <div className="flex items-center gap-2">
                    {item.status === 'success' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {item.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-xs ${
                      item.status === 'success' ? 'text-green-500' :
                      item.status === 'error' ? 'text-red-500' :
                      'text-muted-foreground'
                    }`}>
                      {item.status === 'success' ? 'Tamamlandı' :
                       item.status === 'error' ? 'Hata' :
                       `${item.progress}%`}
                    </span>
                  </div>
                </div>
                {item.status === 'uploading' && (
                  <Progress value={item.progress} className="h-1.5" />
                )}
                {item.status === 'error' && item.error && (
                  <p className="text-xs text-red-500">{item.error}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          variant="outline"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Yükleniyor..." : "Dosya Seç"}
        </Button>
        <Button
          onClick={() => setShowCamera(true)}
          disabled={uploading}
          variant="default"
        >
          <Camera className="h-4 w-4 mr-2" />
          Kamera ile Çek
        </Button>
      </div>

      {/* Image Editor Modal */}
      <ImageEditor
        open={showImageEditor}
        onOpenChange={(open) => {
          setShowImageEditor(open);
          if (!open) {
            setImageToEdit(null);
            setPendingFiles([]);
          }
        }}
        imageFile={imageToEdit}
        onSave={handleImageEditorSave}
      />

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="relative group overflow-hidden">
              <div className="aspect-square relative bg-muted">
                <Skeleton className="w-full h-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : images.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Henüz fotoğraf yüklenmemiş</p>
            <p className="text-xs mt-2">Yukarıdaki alana dosyaları sürükleyip bırakın</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => {
            const loadState = imageLoadStates[image.id] || 'loading';
            const imageUrl = getImageUrl(image.url);

            return (
              <Card key={image.id} className="relative group overflow-hidden">
                <div className="aspect-square relative bg-muted overflow-hidden">
                  {/* Skeleton Loader */}
                  {loadState === 'loading' && (
                    <div className="absolute inset-0 z-10">
                      <Skeleton className="w-full h-full" />
                    </div>
                  )}

                  {/* Blur-up Placeholder */}
                  {loadState === 'loading' && (
                    <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/50 to-muted animate-pulse" />
                  )}

                  {/* Actual Image */}
                  <img
                    src={imageUrl}
                    alt={`Araç fotoğrafı ${index + 1}`}
                    className={`
                      w-full h-full object-cover transition-all duration-500
                      ${loadState === 'loaded' ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}
                    `}
                    loading="lazy"
                    onLoad={() => handleImageLoad(image.id)}
                    onError={() => handleImageError(image.id)}
                  />

                  {/* Error State */}
                  {loadState === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm">
                      <div className="text-center">
                        <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Yüklenemedi</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Overlay - Hover'da görünür */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
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
                    <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 z-10">
                      <Star className="h-3 w-3 fill-white" />
                      Ön Kapak
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VehicleImageUpload;
