import { Vehicle } from "@/hooks/useVehiclesData";

// Ödenen taksit sayısını hesapla (peşinat hariç, sadece taksit ödemeleri)
export const getPaidInstallmentCount = (vehicle: Vehicle): number => {
  if (!vehicle.installment || !vehicle.installment.payments || vehicle.installment.payments.length === 0) {
    return 0;
  }
  
  const installmentPayments = vehicle.installment.payments.filter(
    (p: any) => p.payment_type === 'installment'
  );
  
  return installmentPayments.length;
};

// Taksit gecikmesi kontrolü - son taksit ödemesi 30+ gün geçmişse gün sayısını döner
export const getInstallmentOverdueDays = (vehicle: Vehicle): number | null => {
  if (!vehicle.installment || !vehicle.installment.payments || vehicle.installment.payments.length === 0) {
    return null;
  }
  
  const installmentPayments = vehicle.installment.payments.filter(
    (p: any) => p.payment_type === 'installment'
  );
  
  if (installmentPayments.length === 0) {
    const downPayment = vehicle.installment.payments.find((p: any) => p.payment_type === 'down_payment');
    if (!downPayment) return null;
    
    const downPaymentDate = new Date(downPayment.payment_date);
    const today = new Date();
    const diffTime = today.getTime() - downPaymentDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 30 ? diffDays : null;
  }
  
  const lastInstallmentPayment = installmentPayments
    .map(p => new Date(p.payment_date))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  
  if (!lastInstallmentPayment) return null;
  
  const today = new Date();
  const diffTime = today.getTime() - lastInstallmentPayment.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 30 ? diffDays : null;
};

// Taksit durum bilgisini döner
export const getInstallmentStatus = (vehicle: Vehicle): {
  isInstallment: boolean;
  paidCount: number;
  totalCount: number;
  isOverdue: boolean;
  overdueDays: number | null;
} => {
  const isInstallment = !!vehicle.installment_sale_id;
  
  if (!vehicle.installment) {
    return {
      isInstallment,
      paidCount: 0,
      totalCount: 0,
      isOverdue: false,
      overdueDays: null,
    };
  }
  
  const paidCount = getPaidInstallmentCount(vehicle);
  const totalCount = vehicle.installment.installment_count || 0;
  const overdueDays = getInstallmentOverdueDays(vehicle);
  const isOverdue = overdueDays !== null;
  
  return {
    isInstallment,
    paidCount,
    totalCount,
    isOverdue,
    overdueDays,
  };
};

// Tarih formatlama fonksiyonu: 2025-12-04T21:00:00.000Z -> 4/12/2025 21:00
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    return dateString;
  }
};

// Sadece tarih formatlama: 2025-12-04T21:00:00.000Z -> 4/12/2025
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return dateString;
  }
};
