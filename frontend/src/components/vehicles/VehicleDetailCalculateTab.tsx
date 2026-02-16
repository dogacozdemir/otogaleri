import { Vehicle, CostCalculation } from "@/hooks/useVehiclesData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Info, Edit } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useCurrency } from "@/hooks/useCurrency";
import { useTenant } from "@/contexts/TenantContext";
import { useViewCurrency } from "@/contexts/ViewCurrencyContext";
import { api } from "@/api";
import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/utils/vehicleUtils";

interface VehicleDetailCalculateTabProps {
  vehicle: Vehicle;
  costCalculation: CostCalculation | null;
  currency: (amount: number | null) => string;
  onFetchCostCalculation: (id: number) => void;
}

interface ConversionDetail {
  cost_name: string;
  amount: number;
  currency: string;
  cost_date: string;
  converted_amount: number;
  rate_used: number | string;
  rate_source: 'custom' | 'api';
}

interface ConversionResult {
  vehicle_id: number;
  target_currency: string;
  base_currency: string;
  total_converted: number;
  sale_price_converted?: number;
  sale_price_rate?: number;
  sale_price_rate_source?: 'custom' | 'api';
  profit_converted?: number;
  target_profit_converted?: number | null;
  conversion_details: ConversionDetail[];
}

export const VehicleDetailCalculateTab = ({
  vehicle,
  costCalculation,
  currency,
  onFetchCostCalculation,
}: VehicleDetailCalculateTabProps) => {
  const { formatCurrencyWithCurrency } = useCurrency();
  const { tenant } = useTenant();
  const { viewCurrency } = useViewCurrency();
  const targetCurrency = viewCurrency;
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [loadingConversion, setLoadingConversion] = useState(false);
  const [editingCostId, setEditingCostId] = useState<number | null>(null);
  const [customRateValue, setCustomRateValue] = useState<string>("");

  // Convert costs to target currency when costCalculation or viewCurrency changes
  useEffect(() => {
    if (costCalculation && costCalculation.costItems && Array.isArray(costCalculation.costItems) && costCalculation.costItems.length > 0) {
      convertCostsToTargetCurrency();
    }
  }, [costCalculation, targetCurrency, viewCurrency]);

  const convertCostsToTargetCurrency = async () => {
    if (!costCalculation || !vehicle.id) return;
    
    setLoadingConversion(true);
    try {
      const response = await api.post(`/vehicles/${vehicle.id}/convert-costs`, {
        target_currency: targetCurrency
      });
      setConversionResult(response.data);
    } catch (error) {
      console.error("Failed to convert costs:", error);
    } finally {
      setLoadingConversion(false);
    }
  };

  const handleCustomRateUpdate = async (costId: number, customRate: number | null) => {
    if (!costId) return;

    try {
      // Get the cost to update
      const cost = costCalculation?.costItems.find(item => item.id === costId);
      if (!cost) return;

      // Update the cost with custom rate via API
      await api.put(`/vehicles/${vehicle.id}/costs/${costId}`, {
        cost_name: cost.name,
        amount: cost.amount,
        currency: cost.currency,
        cost_date: cost.cost_date,
        category: 'other', // Default category, should be preserved from original
        custom_rate: customRate !== null && customRate !== undefined ? Number(customRate) : null
      });

      // Refresh calculation and conversion
      await onFetchCostCalculation(vehicle.id);
      await convertCostsToTargetCurrency();
      setEditingCostId(null);
      setCustomRateValue("");
    } catch (error) {
      console.error("Failed to update custom rate:", error);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center pt-2">
        <h3 className="font-semibold">Maliyet Hesaplama</h3>
        <Button onClick={() => onFetchCostCalculation(vehicle.id)}>
          <Calculator className="h-4 w-4 mr-2" />
          Hesapla
        </Button>
      </div>
      {costCalculation && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Önceden Tanımlı Kalemler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {costCalculation.costItems && Array.isArray(costCalculation.costItems) ? (
                    costCalculation.costItems.map((item, idx) => {
                      const costDate = item.cost_date ? formatDate(item.cost_date) : "Tarih yok";
                      const hasCustomRate = item.custom_rate !== null && item.custom_rate !== undefined;
                      
                      return (
                        <div key={idx} className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span>{item.name}:</span>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                    <Edit className="h-3 w-3 text-muted-foreground cursor-pointer" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Manuel Kur Düzenle</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-sm font-medium">Harcama: {item.name}</label>
                                      <p className="text-xs text-muted-foreground">
                                        {formatCurrency(item.amount, item.currency || "TRY")} ({costDate})
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium mb-2 block">
                                        Manuel Kur ({item.currency} → {tenant?.default_currency || "TRY"})
                                      </label>
                                      <Input
                                        type="number"
                                        step="0.0001"
                                        value={customRateValue}
                                        onChange={(e) => setCustomRateValue(e.target.value)}
                                        placeholder="Kur giriniz (boş bırakırsanız API'den alınır)"
                                      />
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Boş bırakırsanız, {costDate} tarihindeki kur API'den alınacaktır.
                                      </p>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setEditingCostId(null);
                                        setCustomRateValue("");
                                      }}
                                    >
                                      İptal
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        const rate = customRateValue.trim() ? Number(customRateValue) : null;
                                        if (item.id) {
                                          handleCustomRateUpdate(item.id, rate);
                                        }
                                      }}
                                    >
                                      Kaydet
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="text-xs text-muted-foreground">{costDate}</div>
                            {hasCustomRate && (
                              <div className="text-xs text-blue-600">Manuel kur: {item.custom_rate}</div>
                            )}
                          </div>
                          <span className="font-semibold">
                            {formatCurrency(item.amount, item.currency || "TRY")}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground">Önceden tanımlı kalem yok</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Özel Kalemler</CardTitle>
              </CardHeader>
              <CardContent>
                {costCalculation.customItems && Array.isArray(costCalculation.customItems) && costCalculation.customItems.length > 0 ? (
                  <div className="space-y-2">
                    {costCalculation.customItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.name}:</span>
                        <span className="font-semibold">
                          {formatCurrency(item.amount, item.currency || "TRY")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Özel kalem yok</p>
                )}
              </CardContent>
            </Card>
          </div>
          <Card className="bg-primary/10">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-lg">
                  <span>Genel Toplam:</span>
                  <div className="flex items-center gap-2">
                    {loadingConversion ? (
                      <span className="font-bold">Hesaplanıyor...</span>
                    ) : conversionResult ? (
                      <>
                        <span className="font-bold">
                          {formatCurrencyWithCurrency(
                            conversionResult.total_converted,
                            conversionResult.target_currency
                          )}
                        </span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Info className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-96">
                            <div className="space-y-2">
                              <h4 className="font-semibold">Hesaplama Detayları</h4>
                              <div className="space-y-1 text-sm">
                                {conversionResult.conversion_details.map((detail, idx) => (
                                  <div key={idx} className="border-b pb-2 last:border-0">
                                    <div className="font-medium">{detail.cost_name}</div>
                                    <div className="text-muted-foreground">
                                      {formatCurrency(detail.amount, detail.currency)} ({formatDate(detail.cost_date)})
                                    </div>
                                    <div className="text-xs">
                                      Kur: {(() => {
                                        const rate = typeof detail.rate_used === 'number' 
                                          ? detail.rate_used 
                                          : (detail.rate_used ? Number(detail.rate_used) : 0);
                                        return isNaN(rate) ? '0.0000' : rate.toFixed(4);
                                      })()} ({detail.rate_source === 'custom' ? 'Manuel' : 'API'})
                                    </div>
                                    <div className="text-xs font-semibold">
                                      → {formatCurrencyWithCurrency(detail.converted_amount, conversionResult.target_currency)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </>
                    ) : (
                      <span className="font-bold">
                        {currency(costCalculation.generalTotal)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-lg">
                  <span>Satış Fiyatı:</span>
                  <span className="font-bold">
                    {conversionResult && conversionResult.sale_price_converted !== undefined ? (
                      formatCurrencyWithCurrency(
                        conversionResult.sale_price_converted,
                        conversionResult.target_currency
                      )
                    ) : (
                      formatCurrencyWithCurrency(
                        costCalculation.salePrice,
                        costCalculation.vehicle?.sale_currency || vehicle.sale_currency
                      )
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xl border-t pt-2">
                  <span>Kar:</span>
                  <span className={`font-bold ${(conversionResult?.profit_converted ?? costCalculation.profit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {conversionResult && conversionResult.profit_converted !== undefined ? (
                      formatCurrencyWithCurrency(
                        conversionResult.profit_converted,
                        conversionResult.target_currency
                      )
                    ) : (
                      currency(costCalculation.profit)
                    )}
                  </span>
                </div>
                {costCalculation.profitMargin !== undefined && (
                  <div className="flex justify-between text-lg border-t pt-2">
                    <span>Kar Marjı:</span>
                    <span className={`font-semibold ${costCalculation.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {costCalculation.profitMargin.toFixed(2)}%
                    </span>
                  </div>
                )}
                {costCalculation.roi !== undefined && (
                  <div className="flex justify-between text-lg">
                    <span>ROI (Yatırım Getirisi):</span>
                    <span className={`font-semibold ${costCalculation.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {costCalculation.roi.toFixed(2)}%
                    </span>
                  </div>
                )}
                {costCalculation.targetProfit !== null && costCalculation.targetProfit !== undefined && (
                  <>
                    <div className="flex justify-between text-lg border-t pt-2">
                      <span>Hedef Kar:</span>
                      <span className="font-semibold text-blue-600">
                        {conversionResult && conversionResult.target_profit_converted !== null && conversionResult.target_profit_converted !== undefined ? (
                          formatCurrencyWithCurrency(
                            conversionResult.target_profit_converted,
                            conversionResult.target_currency
                          )
                        ) : (
                          currency(costCalculation.targetProfit)
                        )}
                      </span>
                    </div>
                    {costCalculation.profitVsTarget !== null && costCalculation.profitVsTarget !== undefined && (
                      <div className="flex justify-between text-lg">
                        <span>Hedef vs Gerçek:</span>
                        <span className={`font-semibold ${
                          (conversionResult?.profit_converted !== undefined && conversionResult?.target_profit_converted !== null && conversionResult?.target_profit_converted !== undefined)
                            ? ((conversionResult.profit_converted - conversionResult.target_profit_converted) >= 0 ? 'text-green-600' : 'text-red-600')
                            : (costCalculation.profitVsTarget >= 0 ? 'text-green-600' : 'text-red-600')
                        }`}>
                          {(() => {
                            if (conversionResult?.profit_converted !== undefined && conversionResult?.target_profit_converted !== null && conversionResult?.target_profit_converted !== undefined) {
                              const diff = conversionResult.profit_converted - conversionResult.target_profit_converted;
                              return `${diff >= 0 ? '+' : ''}${formatCurrencyWithCurrency(diff, conversionResult.target_currency)}`;
                            }
                            return `${costCalculation.profitVsTarget >= 0 ? '+' : ''}${currency(costCalculation.profitVsTarget)}`;
                          })()}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
