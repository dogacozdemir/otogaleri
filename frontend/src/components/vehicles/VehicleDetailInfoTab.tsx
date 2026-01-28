import { Vehicle } from "@/hooks/useVehiclesData";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Hash, 
  Car, 
  Calendar, 
  Gauge, 
  Fuel, 
  Palette, 
  Settings, 
  FileText,
  Tag,
  MapPin,
  Package,
  Clock,
  User,
  Phone,
  Home,
  CreditCard,
  FileDown,
  Edit,
  Trash2,
  Plus
} from "lucide-react";
import { api } from "@/api";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateTime } from "@/utils/vehicleUtils";
import { formatCurrency } from "@/lib/formatters";

interface VehicleDetailInfoTabProps {
  vehicle: Vehicle;
  currency: (amount: number | null) => string;
  onEditPayment?: (payment: any) => void;
  onDeletePayment?: (paymentId: number) => void;
  onOpenPaymentModal?: () => void;
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | null | undefined;
  highlight?: boolean;
}

const InfoItem = ({ icon, label, value, highlight }: InfoItemProps) => {
  const displayValue = value || "-";
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-muted/50 transition-colors ${highlight ? 'bg-primary/5 border-primary/20' : ''}`}>
      <div className={`p-2 rounded-lg ${highlight ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <p className={`text-sm font-semibold ${highlight ? 'text-primary' : 'text-foreground'}`}>
          {displayValue}
        </p>
      </div>
    </div>
  );
};

export const VehicleDetailInfoTab = ({ 
  vehicle, 
  currency,
  onEditPayment,
  onDeletePayment,
  onOpenPaymentModal
}: VehicleDetailInfoTabProps) => {
  const { formatCurrencyWithCurrency } = useCurrency();
  const { toast } = useToast();

  const handleDownloadInvoice = async () => {
    try {
      const response = await api.get(`/vehicles/${vehicle.id}/invoice`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `arac-satis-faturasi-${vehicle.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Başarılı", description: "Fatura indirildi." });
    } catch (e: any) {
      toast({
        title: "Hata",
        description: e?.response?.data?.message || "Fatura indirilemedi.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadContract = async () => {
    try {
      const response = await api.get(`/vehicles/${vehicle.id}/contract`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `arac-satis-sozlesmesi-${vehicle.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Başarılı", description: "Sözleşme indirildi." });
    } catch (e: any) {
      toast({
        title: "Hata",
        description: e?.response?.data?.message || "Sözleşme indirilemedi.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="space-y-6 pt-2">
      {/* Basic Information */}
      <Card className="border border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Temel Bilgiler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoItem
              icon={<Hash className="h-4 w-4" />}
              label="Araç No"
              value={vehicle.vehicle_number}
            />
            <InfoItem
              icon={<Car className="h-4 w-4" />}
              label="Marka"
              value={vehicle.maker}
            />
            <InfoItem
              icon={<Car className="h-4 w-4" />}
              label="Model"
              value={vehicle.model}
            />
            <InfoItem
              icon={<Calendar className="h-4 w-4" />}
              label="Üretim Yılı"
              value={vehicle.production_year}
            />
            <InfoItem
              icon={<Settings className="h-4 w-4" />}
              label="Vites"
              value={vehicle.transmission}
            />
            <InfoItem
              icon={<FileText className="h-4 w-4" />}
              label="Şasi No"
              value={vehicle.chassis_no}
            />
            <InfoItem
              icon={<FileText className="h-4 w-4" />}
              label="Plaka"
              value={vehicle.plate_number}
            />
            <InfoItem
              icon={<Gauge className="h-4 w-4" />}
              label="Kilometre"
              value={vehicle.km ? `${vehicle.km.toLocaleString('tr-TR')} km` : null}
            />
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card className="border border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Teknik Özellikler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoItem
              icon={<Fuel className="h-4 w-4" />}
              label="Yakıt Tipi"
              value={vehicle.fuel}
            />
            <InfoItem
              icon={<Car className="h-4 w-4" />}
              label="Sınıf"
              value={vehicle.grade}
            />
            <InfoItem
              icon={<Gauge className="h-4 w-4" />}
              label="Motor Hacmi (CC)"
              value={vehicle.cc ? `${vehicle.cc} cc` : null}
            />
            <InfoItem
              icon={<Palette className="h-4 w-4" />}
              label="Renk"
              value={vehicle.color}
            />
          </div>
        </CardContent>
      </Card>

      {/* Financial Information */}
      <Card className="border border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Finansal Bilgiler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoItem
              icon={<Tag className="h-4 w-4" />}
              label="Satış Fiyatı"
              value={vehicle.sale_price ? formatCurrencyWithCurrency(vehicle.sale_price, vehicle.sale_currency) : null}
              highlight
            />
            <InfoItem
              icon={<Tag className="h-4 w-4" />}
              label="Ödenen Tutar"
              value={vehicle.paid ? currency(vehicle.paid) : null}
            />
            {vehicle.target_profit && (
              <InfoItem
                icon={<Tag className="h-4 w-4" />}
                label="Hedef Kar"
                value={currency(vehicle.target_profit)}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location & Other */}
      {(vehicle.location || vehicle.other) && (
        <Card className="border border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Diğer Bilgiler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vehicle.location && (
                <InfoItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Konum"
                  value={vehicle.location}
                />
              )}
              {vehicle.other && (
                <div className="p-3 rounded-xl border border-border/50 bg-card">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Diğer Notlar</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{vehicle.other}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery Information */}
      {(vehicle.delivery_date || vehicle.delivery_time) && (
        <Card className="border border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Teslimat Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoItem
                icon={<Calendar className="h-4 w-4" />}
                label="Teslimat Tarihi"
                value={vehicle.delivery_date ? formatDate(vehicle.delivery_date) : null}
              />
              <InfoItem
                icon={<Clock className="h-4 w-4" />}
                label="Teslimat Saati"
                value={
                  vehicle.delivery_time 
                    ? (vehicle.delivery_time.includes('T') 
                        ? formatDateTime(vehicle.delivery_time).split(' ')[1] 
                        : vehicle.delivery_time)
                    : (vehicle.delivery_date 
                        ? formatDateTime(vehicle.delivery_date).split(' ')[1] 
                        : null)
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sale Information */}
      {vehicle.sale_info && (
        <Card className="border border-border/50 shadow-sm bg-green-50/50 dark:bg-green-900/10">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                Satış Bilgileri
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadInvoice}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Fatura İndir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadContract}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Sözleşme İndir
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoItem
                icon={<User className="h-4 w-4" />}
                label="Müşteri"
                value={vehicle.sale_info.customer_name}
              />
              <InfoItem
                icon={<Phone className="h-4 w-4" />}
                label="Telefon"
                value={vehicle.sale_info.customer_phone}
              />
              <InfoItem
                icon={<Home className="h-4 w-4" />}
                label="Adres"
                value={vehicle.sale_info.customer_address}
              />
              <InfoItem
                icon={<FileText className="h-4 w-4" />}
                label="Plaka"
                value={vehicle.sale_info.plate_number}
              />
              <InfoItem
                icon={<Settings className="h-4 w-4" />}
                label="Anahtar Sayısı"
                value={vehicle.sale_info.key_count}
              />
              <InfoItem
                icon={<Calendar className="h-4 w-4" />}
                label="Satış Tarihi"
                value={vehicle.sale_info.sale_date ? formatDateTime(vehicle.sale_info.sale_date) : null}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Installment Information */}
      {vehicle.installment && (
        <Card className="border border-border/50 shadow-sm bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Taksitli Satış Bilgileri
              </CardTitle>
              {vehicle.installment?.status === 'active' && vehicle.installment?.remaining_balance > 0 && (
                <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                  Kalan Borç: {currency(vehicle.installment.remaining_balance)}
                </Badge>
              )}
              {vehicle.installment?.status === 'completed' && (
                <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  Tamamlandı
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <InfoItem
                icon={<Tag className="h-4 w-4" />}
                label="Toplam Satış Fiyatı"
                value={currency(vehicle.installment?.total_amount)}
                highlight
              />
              <InfoItem
                icon={<Tag className="h-4 w-4" />}
                label="Peşinat"
                value={currency(vehicle.installment?.down_payment)}
              />
              <InfoItem
                icon={<CreditCard className="h-4 w-4" />}
                label="Taksit Sayısı"
                value={vehicle.installment?.installment_count}
              />
              <InfoItem
                icon={<Tag className="h-4 w-4" />}
                label="Taksit Tutarı"
                value={currency(vehicle.installment?.installment_amount)}
              />
              <InfoItem
                icon={<Tag className="h-4 w-4" />}
                label="Ödenen Toplam"
                value={currency(vehicle.installment?.total_paid)}
              />
              <InfoItem
                icon={<Tag className="h-4 w-4" />}
                label="Kalan Borç"
                value={
                  (vehicle.installment?.remaining_balance ?? 0) > 0 
                    ? currency(vehicle.installment.remaining_balance) 
                    : "Tamamlandı"
                }
                highlight={(vehicle.installment?.remaining_balance ?? 0) > 0}
              />
            </div>
            
            {vehicle.installment?.payments && vehicle.installment.payments.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-3 text-foreground">Ödeme Geçmişi</h4>
                <div className="border border-border/50 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Tip</TableHead>
                        <TableHead>Taksit No</TableHead>
                        <TableHead>Tutar</TableHead>
                        <TableHead>Notlar</TableHead>
                        {vehicle.installment?.status === 'active' && onEditPayment && onDeletePayment && (
                          <TableHead>İşlemler</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicle.installment.payments.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDateTime(payment.payment_date)}</TableCell>
                          <TableCell>
                            <Badge variant={payment.payment_type === 'down_payment' ? 'default' : 'secondary'}>
                              {payment.payment_type === 'down_payment' ? 'Peşinat' : 'Taksit'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {payment.installment_number !== null && payment.installment_number !== undefined 
                              ? payment.installment_number 
                              : '-'}
                          </TableCell>
                          <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
                          <TableCell>{payment.notes || '-'}</TableCell>
                          {vehicle.installment?.status === 'active' && onEditPayment && onDeletePayment && (
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onEditPayment(payment)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onDeletePayment(payment.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            
            {vehicle.installment?.status === 'active' && (vehicle.installment?.remaining_balance ?? 0) > 0 && onOpenPaymentModal && (
              <div className="mt-4">
                <Button onClick={onOpenPaymentModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Ödeme Ekle
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
