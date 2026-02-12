import React, { useState, useEffect, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ArrowUpDown,
  BadgeDollarSign,
  Check,
  Edit2,
  RefreshCcw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/api";

// Desteklenen para birimleri
const CURRENCIES = [
  { code: "TRY", name: "Türk Lirası" },
  { code: "USD", name: "ABD Doları" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "İngiliz Sterlini" },
  { code: "JPY", name: "Japon Yeni" },
];

export function CurrencyConverterPopover() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(100);
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("TRY");

  // Kur State'leri
  const [liveRate, setLiveRate] = useState<number | null>(null);
  const [customRate, setCustomRate] = useState<number | null>(null);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Aktif kur: Kullanıcı özel kur girdiyse o, yoksa canlı kur
  const activeRate = customRate !== null ? customRate : liveRate;

  // Hesaplanan sonuç
  const calculatedResult = useMemo(() => {
    if (!activeRate || !amount) return "0.00";
    return (amount * activeRate).toFixed(2);
  }, [amount, activeRate]);

  // FreeCurrencyAPI çağrısı
  const fetchLiveRate = async () => {
    setIsLoading(true);
    try {
      // FreeCurrencyAPI JPY kullanıyor (ISO 4217 standardı)
      const from = fromCurrency;
      const to = toCurrency;

      const response = await api.get("/currency/rate", {
        params: { from, to },
      });

      if (response.data?.rate) {
        setLiveRate(response.data.rate);
      }
    } catch (error: any) {
      console.error("Kur çekme hatası:", error);
      // Hata durumunda varsayılan bir değer göster
      setLiveRate(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && customRate === null) {
      fetchLiveRate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fromCurrency, toCurrency]);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    // Swap yapıldığında özel kuru sıfırlamak mantıklı olabilir
    setCustomRate(null);
  };

  const saveCustomRate = (val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setCustomRate(num);
    }
    setIsEditingRate(false);
  };

  const resetToLiveRate = () => {
    setCustomRate(null);
    setIsEditingRate(false);
    fetchLiveRate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative min-h-[44px] min-w-[44px]" aria-label="Döviz Çevirici">
          <BadgeDollarSign className="h-[1.2rem] w-[1.2rem]" />
          {customRate && (
            // Özel kur aktifse ikonun üzerinde küçük bir belirteç
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none text-sm text-muted-foreground">Hızlı Döviz Çevirici</h4>
            <p className="text-xs text-muted-foreground">Güncel kurları görün veya kendi kurunuzu belirleyin.</p>
          </div>

          {/* Üst Kısım: Kaynak */}
          <div className="flex items-end gap-2">
            <div className="grid gap-1 flex-1">
              <Label htmlFor="amount" className="text-xs">Miktar</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="h-9"
              />
            </div>
            <CurrencySelect value={fromCurrency} onValueChange={setFromCurrency} />
          </div>

          {/* Swap Butonu */}
          <div className="flex justify-center -my-2 relative z-10">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full bg-background shadow-sm"
              onClick={handleSwap}
            >
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>

          {/* Alt Kısım: Hedef (Read-only miktar) */}
          <div className="flex items-end gap-2">
            <div className="grid gap-1 flex-1">
              <Label htmlFor="result" className="text-xs">Karşılık</Label>
              <Input
                id="result"
                type="text"
                value={calculatedResult}
                readOnly
                className="h-9 bg-muted font-medium pointer-events-none"
              />
            </div>
            <CurrencySelect value={toCurrency} onValueChange={setToCurrency} />
          </div>

          {/* Kur Bilgisi ve Düzenleme Alanı */}
          <div
            className={cn(
              "rounded-md border p-2 text-xs flex items-center justify-between bg-muted/30 transition-all",
              isEditingRate ? "border-primary/50 bg-primary/5" : ""
            )}
          >
            {isEditingRate ? (
              // Düzenleme Modu
              <div className="flex items-center gap-2 w-full animate-in fade-in">
                <span className="text-muted-foreground whitespace-nowrap">Özel Kur:</span>
                <Input
                  type="number"
                  defaultValue={activeRate?.toString()}
                  className="h-7 text-xs px-2 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveCustomRate(e.currentTarget.value);
                  }}
                  onBlur={(e) => saveCustomRate(e.target.value)}
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setIsEditingRate(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              // Görüntüleme Modu
              <>
                <div className="flex items-center gap-2">
                  {isLoading ? (
                    <RefreshCcw className="h-3 w-3 animate-spin text-muted-foreground" />
                  ) : liveRate !== null ? (
                    <span className="font-medium flex items-center gap-1">
                      1 {fromCurrency} = {activeRate?.toFixed(4)} {toCurrency}
                      {customRate !== null ? (
                        <span className="text-[10px] text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded-full ml-1 font-normal">
                          Manuel
                        </span>
                      ) : (
                        <span className="text-[10px] text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full ml-1 font-normal flex items-center gap-0.5">
                          Canlı <Check className="h-2 w-2" />
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Kur yüklenemedi</span>
                  )}
                </div>
                <div className="flex gap-0.5">
                  {customRate !== null && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={resetToLiveRate}
                      title="Canlı kura dön"
                    >
                      <RefreshCcw className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => setIsEditingRate(true)}
                    title="Kuru düzenle"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Alt Bileşen: Para Birimi Seçimi
function CurrencySelect({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[85px] h-9">
        <SelectValue placeholder="Seç" />
      </SelectTrigger>
      <SelectContent>
        {CURRENCIES.map((c) => (
          <SelectItem key={c.code} value={c.code} className="text-xs">
            <span className="font-medium">{c.code}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default CurrencyConverterPopover;
