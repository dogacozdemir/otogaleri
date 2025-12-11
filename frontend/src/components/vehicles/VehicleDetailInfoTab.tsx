import { Vehicle } from "@/hooks/useVehiclesData";
import { useCurrency } from "@/hooks/useCurrency";

interface VehicleDetailInfoTabProps {
  vehicle: Vehicle;
  currency: (amount: number | null) => string;
}

export const VehicleDetailInfoTab = ({ vehicle, currency }: VehicleDetailInfoTabProps) => {
  const { formatCurrencyWithCurrency } = useCurrency();
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <div><strong>Araç No:</strong> {vehicle.vehicle_number || "-"}</div>
      <div><strong>Marka:</strong> {vehicle.maker || "-"}</div>
      <div><strong>Model:</strong> {vehicle.model || "-"}</div>
      <div><strong>Üretim Yılı:</strong> {vehicle.production_year || "-"}</div>
      <div><strong>Vites:</strong> {vehicle.transmission || "-"}</div>
      <div><strong>Şasi No:</strong> {vehicle.chassis_no || "-"}</div>
      <div><strong>Plaka:</strong> {vehicle.plate_number || "-"}</div>
      <div><strong>Km:</strong> {vehicle.km || "-"}</div>
      <div><strong>Yakıt:</strong> {vehicle.fuel || "-"}</div>
      <div><strong>Sınıf:</strong> {vehicle.grade || "-"}</div>
      <div><strong>CC:</strong> {vehicle.cc || "-"}</div>
      <div><strong>Renk:</strong> {vehicle.color || "-"}</div>
      <div><strong>Önerilen Satış Fiyatı:</strong> {formatCurrencyWithCurrency(vehicle.sale_price, vehicle.sale_currency)}</div>
      <div><strong>Ödenen:</strong> {currency(vehicle.paid)}</div>
      {vehicle.other && (
        <div className="col-span-2"><strong>Diğer:</strong> {vehicle.other}</div>
      )}
    </div>
  );
};
