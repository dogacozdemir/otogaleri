import React, { useState, useCallback, useRef } from "react";
import Cropper, { Area, Point } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCw, ZoomIn, ZoomOut, Check, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface ImageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageFile: File | null;
  onSave: (croppedBlob: Blob) => void;
  aspectRatios?: { value: number; label: string }[];
}

const DEFAULT_ASPECT_RATIOS = [
  { value: 16 / 9, label: "16:9 (Geniş Ekran)" },
  { value: 4 / 3, label: "4:3 (Klasik)" },
  { value: 1 / 1, label: "1:1 (Kare)" },
  { value: 3 / 2, label: "3:2 (Fotoğraf)" },
  { value: 0, label: "Serbest" },
];

const ImageEditor: React.FC<ImageEditorProps> = ({
  open,
  onOpenChange,
  imageFile,
  onSave,
  aspectRatios = DEFAULT_ASPECT_RATIOS,
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);
  const [cropReady, setCropReady] = useState(false); // Cropper'ı modal layout bittikten sonra mount et
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Görseli önce yükle, decode olduktan sonra state'e yaz (siyah ekranı önlemek için)
  React.useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      setImageLoadError(null);
      return;
    }
    setImageLoadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        setImageSrc(dataUrl);
      };
      img.onerror = () => {
        setImageSrc(null);
        setImageLoadError("Görsel yüklenemedi.");
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setImageSrc(null);
      setImageLoadError("Dosya okunamadı.");
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  // Modal açıldıktan sonra Cropper'ı bir frame gecikmeyle mount et (layout 0x0 siyah ekranı önler)
  React.useEffect(() => {
    if (!open || !imageSrc) {
      setCropReady(false);
      return;
    }
    const t = requestAnimationFrame(() => {
      setCropReady(true);
    });
    return () => cancelAnimationFrame(t);
  }, [open, imageSrc]);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setAspectRatio(16 / 9);
      setCroppedAreaPixels(null);
      setCropReady(false);
      setIsProcessing(false);
    }
  }, [open]);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.src = url;
    });
  };

  const getRadianAngle = (degreeValue: number) => {
    return (degreeValue * Math.PI) / 180;
  };

  const rotateSize = (width: number, height: number, rotation: number) => {
    const rotRad = getRadianAngle(rotation);
    return {
      width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
      height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
  };

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    if (!image.width || !image.height) {
      throw new Error("Geçersiz görsel boyutu");
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas context not available");
    }

    const rotRad = getRadianAngle(rotation);

    // Integer dimensions; guard against NaN/undefined (react-easy-crop can return floats)
    const cropW = Math.max(1, Math.round(Number(pixelCrop.width) || 1));
    const cropH = Math.max(1, Math.round(Number(pixelCrop.height) || 1));
    const cropX = Math.round(Number(pixelCrop.x) || 0);
    const cropY = Math.round(Number(pixelCrop.y) || 0);

    const srcX = Math.max(0, Math.min(cropX, image.width - 1));
    const srcY = Math.max(0, Math.min(cropY, image.height - 1));
    const srcW = Math.max(1, Math.min(cropW, image.width - srcX));
    const srcH = Math.max(1, Math.min(cropH, image.height - srcY));

    if (rotation === 0) {
      // No rotation: direct crop, most reliable for toBlob
      canvas.width = cropW;
      canvas.height = cropH;
      ctx.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, cropW, cropH);
    } else {
      // With rotation: output canvas = bounding box of rotated crop so content fits and toBlob succeeds
      const { width: outW, height: outH } = rotateSize(cropW, cropH, rotation);
      const outWidth = Math.max(1, Math.round(outW));
      const outHeight = Math.max(1, Math.round(outH));
      canvas.width = outWidth;
      canvas.height = outHeight;
      ctx.translate(outWidth / 2, outHeight / 2);
      ctx.rotate(rotRad);
      ctx.translate(-cropW / 2, -cropH / 2);
      ctx.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, cropW, cropH);
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob"));
          }
        },
        "image/jpeg",
        0.95
      );
    });
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation
      );
      onSave(croppedBlob);
      onOpenChange(false);
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Görsel Düzenle</DialogTitle>
          <DialogDescription>
            Görseli kırpın, döndürün ve ölçeklendirin
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
          {/* Crop Area: Sabit yükseklik (modal içinde 0x0 siyah ekranı önler); Cropper sadece görsel yüklendikten ve layout bittikten sonra mount edilir */}
          <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ height: 400 }}>
            {imageLoadError && (
              <div className="absolute inset-0 flex items-center justify-center text-white bg-black/80 rounded-lg">
                {imageLoadError}
              </div>
            )}
            {imageSrc && cropReady && !imageLoadError && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspectRatio || undefined}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                style={{
                  containerStyle: {
                    width: "100%",
                    height: "100%",
                    position: "relative",
                  },
                }}
              />
            )}
            {imageSrc && !cropReady && !imageLoadError && (
              <div className="absolute inset-0 flex items-center justify-center text-white/80">
                Yükleniyor…
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-4 border-t pt-4">
            {/* Aspect Ratio Selector */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium min-w-[120px]">En-Boy Oranı:</label>
              <Select
                value={aspectRatio === 0 ? "free" : aspectRatio.toString()}
                onValueChange={(value) => {
                  setAspectRatio(value === "free" ? 0 : parseFloat(value));
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aspectRatios.map((ratio) => (
                    <SelectItem
                      key={ratio.value === 0 ? "free" : ratio.value.toString()}
                      value={ratio.value === 0 ? "free" : ratio.value.toString()}
                    >
                      {ratio.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Zoom Control */}
            <div className="flex items-center gap-4">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(value) => setZoom(value[0])}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground min-w-[50px] text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Rotation Control */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotate}
                className="gap-2"
              >
                <RotateCw className="h-4 w-4" />
                Döndür (90°)
              </Button>
              <span className="text-sm text-muted-foreground">
                Döndürme: {rotation}°
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            İptal
          </Button>
          <Button onClick={handleSave} disabled={isProcessing || !croppedAreaPixels}>
            <Check className="h-4 w-4 mr-2" />
            {isProcessing ? "İşleniyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageEditor;
