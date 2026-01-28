import { Vehicle } from "@/hooks/useVehiclesData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown, Edit, Trash2 } from "lucide-react";
import { api } from "@/api";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateTime } from "@/utils/vehicleUtils";
import { formatCurrency } from "@/lib/formatters";

interface VehicleDetailDeliveryTabProps {
  vehicle: Vehicle;
  currency: (amount: number | null) => string;
  onEditPayment: (payment: any) => void;
  onDeletePayment: (paymentId: number) => void;
  onOpenPaymentModal: () => void;
}

export const VehicleDetailDeliveryTab = ({
  vehicle,
  currency,
  onEditPayment,
  onDeletePayment,
  onOpenPaymentModal,
}: VehicleDetailDeliveryTabProps) => {
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
    <>
      {/* Teslimat Bilgileri */}
      <div className="p-4 bg-muted rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>Teslimat Tarihi:</strong> {formatDate(vehicle.delivery_date)}
          </div>
          <div>
            <strong>Teslimat Saati:</strong> {
              vehicle.delivery_time 
                ? (vehicle.delivery_time.includes('T') 
                    ? formatDateTime(vehicle.delivery_time).split(' ')[1] 
                    : vehicle.delivery_time)
                : (vehicle.delivery_date 
                    ? formatDateTime(vehicle.delivery_date).split(' ')[1] 
                    : "-")
            }
          </div>
        </div>
      </div>

      {/* Satış Bilgileri */}
      {vehicle.sale_info && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Satış Bilgileri</h3>
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
          <div className="grid grid-cols-2 gap-2">
            <div><strong>Müşteri:</strong> {vehicle.sale_info.customer_name}</div>
            <div><strong>Telefon:</strong> {vehicle.sale_info.customer_phone || "-"}</div>
            <div><strong>Adres:</strong> {vehicle.sale_info.customer_address || "-"}</div>
            <div><strong>Plaka:</strong> {vehicle.sale_info.plate_number || "-"}</div>
            <div><strong>Anahtar Sayısı:</strong> {vehicle.sale_info.key_count || "-"}</div>
            <div><strong>Satış Tarihi:</strong> {formatDateTime(vehicle.sale_info.sale_date)}</div>
          </div>
        </div>
      )}

      {/* Taksitli Satış Bilgileri */}
      {vehicle.installment && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Taksitli Satış Bilgileri</h3>
            {vehicle.installment.status === 'active' && vehicle.installment.remaining_balance > 0 && (
              <Badge variant="outline" className="bg-orange-100 text-orange-800">
                Kalan Borç: {currency(vehicle.installment.remaining_balance)}
              </Badge>
            )}
            {vehicle.installment.status === 'completed' && (
              <Badge variant="outline" className="bg-green-100 text-green-800">
                Tamamlandı
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><strong>Toplam Satış Fiyatı:</strong> {currency(vehicle.installment.total_amount)}</div>
            <div><strong>Peşinat:</strong> {currency(vehicle.installment.down_payment)}</div>
            <div><strong>Taksit Sayısı:</strong> {vehicle.installment.installment_count}</div>
            <div><strong>Taksit Tutarı:</strong> {currency(vehicle.installment.installment_amount)}</div>
            <div><strong>Ödenen Toplam:</strong> {currency(vehicle.installment.total_paid)}</div>
            <div><strong>Kalan Borç:</strong> 
              <span className={vehicle.installment.remaining_balance > 0 ? "text-orange-600 font-semibold ml-2" : "text-green-600 font-semibold ml-2"}>
                {vehicle.installment.remaining_balance > 0 
                  ? currency(vehicle.installment.remaining_balance) 
                  : "Tamamlandı"}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Ödeme Geçmişi</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Taksit No</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Notlar</TableHead>
                  {vehicle.installment && vehicle.installment.status === 'active' && (
                    <TableHead>İşlemler</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicle.installment.payments && vehicle.installment.payments.length > 0 ? (
                  vehicle.installment.payments.map((payment: any) => (
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
                      {vehicle.installment && vehicle.installment.status === 'active' && (
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={vehicle.installment && vehicle.installment.status === 'active' ? 6 : 5} className="text-center">Ödeme kaydı bulunamadı.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {vehicle.installment && vehicle.installment.status === 'active' && vehicle.installment.remaining_balance > 0 && (
            <div className="mt-4">
              <Button onClick={onOpenPaymentModal}>
                Yeni Ödeme Ekle
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
