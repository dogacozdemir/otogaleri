import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput, CURRENCIES } from "@/components/ui/currency-input";
import { CurrencyRateEditor } from "@/components/CurrencyRateEditor";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Calculator, AlertTriangle, RefreshCw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCurrencyRates } from "@/contexts/CurrencyRatesContext";
import {
  calculateCustomsTax,
  parseMotorGucuCC,
  getFIFRateFromCC,
  findChassisMatchInJson,
  getFirstCodeForModel,
  type FuelType,
  type InputMode,
  type JaponKiymetData,
} from "@/services/calculatorService";
import { cn } from "@/lib/utils";

const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: "benzinli", label: "Benzinli" },
  { value: "dizel", label: "Dizel" },
  { value: "hybrid", label: "Hybrid" },
  { value: "elektrikli", label: "Elektrikli" },
  { value: "is_araci", label: "İş Aracı (Çift Kabin/Panel Van)" },
];

const KUR_CACHE_KEY = "japon_calc_jpy_try_rate";
const KUR_CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 saat

function formatTRY(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Genel toplam değeri - KDV slider değişince akıcı güncelleme */
function AnimatedValue({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    setDisplay(value);
  }, [value]);
  return <span className={cn("transition-opacity duration-200", className)}>{formatTRY(display)}</span>;
}

const CURRENCIES_OPTIONS = CURRENCIES.map((c) => ({ value: c.value, label: c.label }));

const CURRENCY_ICONS: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

function formatInCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function JapaneseCalculatorPage() {
  const isMobile = useIsMobile();
  const { getCustomRate } = useCurrencyRates();
  const [inputMode, setInputMode] = useState<InputMode>("vehicle_select");
  const [chassisNo, setChassisNo] = useState("");
  const [gemiParasiAmount, setGemiParasiAmount] = useState("");
  const [gemiParasiCurrency, setGemiParasiCurrency] = useState("JPY");
  const [gemiParasiCustomRate, setGemiParasiCustomRate] = useState<number | null>(null);
  const [agirlikKg, setAgirlikKg] = useState(0);
  const [yakıtTipi, setYakıtTipi] = useState<FuelType>("benzinli");
  const [isIsAraci, setIsIsAraci] = useState(false);
  const [kdvOrani, setKdvOrani] = useState(0.18); // %18 default
  const [gumrukAmount, setGumrukAmount] = useState("5000");
  const [gumrukCurrency, setGumrukCurrency] = useState("TRY");
  const [gumrukCustomRate, setGumrukCustomRate] = useState<number | null>(null);
  const [ardiyeAmount, setArdiyeAmount] = useState("");
  const [ardiyeCurrency, setArdiyeCurrency] = useState("TRY");
  const [ardiyeCustomRate, setArdiyeCustomRate] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Kıymet gösterimi: döviz seçimi + kur düzenleme (JPY->TRY)
  const [kiymetDisplayCurrency, setKiymetDisplayCurrency] = useState("JPY");
  const [kiymetCustomRate, setKiymetCustomRate] = useState<number | null>(null);
  const [isAraciYakitTipi, setIsAraciYakitTipi] = useState<"benzinli" | "dizel" | "hybrid" | "elektrikli">("dizel");

  // Vehicle select state (Kod kullanıcıya gösterilmez, otomatik seçilir)
  const [selectedMarka, setSelectedMarka] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedYil, setSelectedYil] = useState<string>("");

  // Manual state
  const [manuelKiymetJPY, setManuelKiymetJPY] = useState<number>(0);
  const [manuelMotorCC, setManuelMotorCC] = useState<number>(0);
  const [manuelKur, setManuelKur] = useState<string>("");

  // Kur state (API + 1hr cache)
  const [cachedKur, setCachedKur] = useState<{ rate: number; ts: number } | null>(null);

  const fetchJpyTryRate = useCallback(async () => {
    const cached = localStorage.getItem(KUR_CACHE_KEY);
    if (cached) {
      try {
        const { rate, ts } = JSON.parse(cached);
        if (Date.now() - ts < KUR_CACHE_EXPIRY_MS) {
          setCachedKur({ rate, ts });
          return rate;
        }
      } catch (_) {}
    }
    const { data } = await api.get("/currency/rate", {
      params: { from: "JPY", to: "TRY" },
    });
    const rate = data?.rate ?? 0;
    const entry = { rate, ts: Date.now() };
    localStorage.setItem(KUR_CACHE_KEY, JSON.stringify(entry));
    setCachedKur(entry);
    return rate;
  }, []);

  const { data: kiymetData, isLoading: kiymetLoading } = useQuery({
    queryKey: ["japon-kiymet"],
    queryFn: async () => {
      const { data } = await api.get("/japon-kiymet/master");
      return data as JaponKiymetData;
    },
    staleTime: Infinity,
  });

  const { data: jpyTryRate, isLoading: kurLoading, refetch: refetchKur } = useQuery({
    queryKey: ["jpy-try-rate"],
    queryFn: fetchJpyTryRate,
    staleTime: KUR_CACHE_EXPIRY_MS,
  });

  // Kur oranları: döviz -> TRY (gümrük ücretleri için)
  const fetchRate = useCallback(async (from: string, to: string) => {
    if (from === to) return 1;
    const { data } = await api.get("/currency/rate", { params: { from, to } });
    return data?.rate ?? 1;
  }, []);

  const { data: gemiRateToTry } = useQuery({
    queryKey: ["currency-rate", gemiParasiCurrency, "TRY"],
    queryFn: () => fetchRate(gemiParasiCurrency, "TRY"),
    enabled: !!gemiParasiCurrency && gemiParasiCurrency !== "TRY",
  });
  const { data: gumrukRateToTry } = useQuery({
    queryKey: ["currency-rate", gumrukCurrency, "TRY"],
    queryFn: () => fetchRate(gumrukCurrency, "TRY"),
    enabled: !!gumrukCurrency && gumrukCurrency !== "TRY",
  });
  const { data: ardiyeRateToTry } = useQuery({
    queryKey: ["currency-rate", ardiyeCurrency, "TRY"],
    queryFn: () => fetchRate(ardiyeCurrency, "TRY"),
    enabled: !!ardiyeCurrency && ardiyeCurrency !== "TRY",
  });

  const jpyTryKuru = inputMode === "manual" && manuelKur
    ? parseFloat(manuelKur) || 0
    : (jpyTryRate ?? 0);

  // Kıymet için efektif JPY->TRY kuru (düzenlenebilir)
  const effectiveJpyTryKuru = kiymetCustomRate ?? jpyTryKuru;

  // Kıymet gösterimi için JPY->diğer döviz kurları
  const { data: jpyToDisplayRate, isLoading: jpyToDisplayRateLoading } = useQuery({
    queryKey: ["currency-rate", "JPY", kiymetDisplayCurrency],
    queryFn: () => fetchRate("JPY", kiymetDisplayCurrency),
    enabled: !!kiymetDisplayCurrency && kiymetDisplayCurrency !== "JPY" && kiymetDisplayCurrency !== "TRY",
  });

  // Manuel seçim: Marka -> Model -> Yıl (Kod otomatik, ilk kod seçilir)
  const markalar = useMemo(() => (kiymetData ? Object.keys(kiymetData) : []), [kiymetData]);
  const modeller = useMemo(() => {
    if (!kiymetData || !selectedMarka) return [];
    return Object.keys(kiymetData[selectedMarka] || {});
  }, [kiymetData, selectedMarka]);
  const autoSelectedKod = useMemo(() => {
    if (!kiymetData || !selectedMarka || !selectedModel) return null;
    return getFirstCodeForModel(kiymetData, selectedMarka, selectedModel);
  }, [kiymetData, selectedMarka, selectedModel]);
  const yillar = useMemo(() => {
    if (!kiymetData || !selectedMarka || !selectedModel || !autoSelectedKod) return [];
    const kiymetler = kiymetData[selectedMarka]?.[selectedModel]?.[autoSelectedKod]?.kiymetler;
    return kiymetler ? Object.keys(kiymetler).sort() : [];
  }, [kiymetData, selectedMarka, selectedModel, autoSelectedKod]);

  const selectedVehicleData = useMemo(() => {
    if (!kiymetData || !selectedMarka || !selectedModel || !autoSelectedKod) return null;
    return kiymetData[selectedMarka]?.[selectedModel]?.[autoSelectedKod] ?? null;
  }, [kiymetData, selectedMarka, selectedModel, autoSelectedKod]);

  // Şasi sorgusu: Tüm JSON'da chassis.includes(kod) ile tarama
  const chassisMatch = useMemo(() => {
    if (inputMode !== "chassis_query" || !chassisNo.trim() || !kiymetData) return null;
    return findChassisMatchInJson(chassisNo, kiymetData);
  }, [inputMode, chassisNo, kiymetData]);

  // Şasi eşleşmesi değişince yıl seçimini sıfırla (yeni araçta farklı yıllar olabilir)
  useEffect(() => {
    if (chassisMatch && selectedYil && !chassisMatch.kiymetler[selectedYil]) {
      setSelectedYil("");
    }
  }, [chassisMatch, selectedYil]);

  const kiymetJPY = useMemo(() => {
    if (inputMode === "manual") return null;
    if (inputMode === "vehicle_select" && selectedVehicleData && selectedYil) {
      const k = selectedVehicleData.kiymetler[selectedYil];
      return typeof k === "number" ? k : null;
    }
    return null;
  }, [inputMode, selectedVehicleData, selectedYil]);

  const chassisKiymetJPY = useMemo(() => {
    if (!chassisMatch || !selectedYil) return null;
    const k = chassisMatch.kiymetler[selectedYil];
    return typeof k === "number" ? k : null;
  }, [chassisMatch, selectedYil]);

  const effectiveKiymetJPY = inputMode === "chassis_query" ? chassisKiymetJPY : kiymetJPY;

  const motorGucuCC = useMemo(() => {
    if (inputMode === "manual") return manuelMotorCC;
    if (inputMode === "chassis_query" && chassisMatch)
      return parseMotorGucuCC(chassisMatch.motor_gucu);
    return selectedVehicleData ? parseMotorGucuCC(selectedVehicleData.motor_gucu) : 0;
  }, [inputMode, manuelMotorCC, selectedVehicleData, chassisMatch]);

  const kiymetNullUyarisi =
    (inputMode === "vehicle_select" &&
      selectedVehicleData &&
      selectedYil &&
      selectedVehicleData.kiymetler[selectedYil] === null) ||
    (inputMode === "chassis_query" &&
      chassisMatch &&
      selectedYil &&
      chassisMatch.kiymetler[selectedYil] === null);

  const gemiParasiJPY = useMemo(() => {
    const amt = parseFloat(gemiParasiAmount) || 0;
    if (amt <= 0) return 0;
    let rateToTry = 1;
    if (gemiParasiCurrency === "TRY") rateToTry = 1;
    else if (gemiParasiCurrency === "JPY") rateToTry = effectiveJpyTryKuru;
    else rateToTry = gemiParasiCustomRate ?? getCustomRate(gemiParasiCurrency, "TRY") ?? gemiRateToTry ?? 1;
    return (amt * rateToTry) / (effectiveJpyTryKuru || 1);
  }, [gemiParasiAmount, gemiParasiCurrency, gemiParasiCustomRate, gemiRateToTry, effectiveJpyTryKuru, getCustomRate]);

  const gumrukKomisyonuTRY = useMemo(() => {
    const amt = parseFloat(gumrukAmount) || 0;
    const rateToTry = gumrukCurrency === "TRY" ? 1 : gumrukCustomRate ?? getCustomRate(gumrukCurrency, "TRY") ?? gumrukRateToTry ?? 1;
    return amt * rateToTry;
  }, [gumrukAmount, gumrukCurrency, gumrukCustomRate, gumrukRateToTry, getCustomRate]);

  const ardiyeTRY = useMemo(() => {
    const amt = parseFloat(ardiyeAmount) || 0;
    const rateToTry = ardiyeCurrency === "TRY" ? 1 : ardiyeCustomRate ?? getCustomRate(ardiyeCurrency, "TRY") ?? ardiyeRateToTry ?? 1;
    return amt * rateToTry;
  }, [ardiyeAmount, ardiyeCurrency, ardiyeCustomRate, ardiyeRateToTry, getCustomRate]);

  const result = useMemo(() => {
    return calculateCustomsTax({
      kiymetJPY: effectiveKiymetJPY ?? null,
      manuelKiymetJPY: inputMode === "manual" ? manuelKiymetJPY : undefined,
      gemiParasiJPY,
      jpyTryKuru: effectiveJpyTryKuru,
      motorGucuCC,
      agirlikKg,
      yakıtTipi,
      isIsAraci,
      isAraciYakitTipi: yakıtTipi === "is_araci" ? isAraciYakitTipi : undefined,
      kdvOrani,
      gumrukKomisyonu: gumrukKomisyonuTRY,
      ardiye: ardiyeTRY,
    });
  }, [
    effectiveKiymetJPY,
    inputMode,
    manuelKiymetJPY,
    gemiParasiJPY,
    effectiveJpyTryKuru,
    motorGucuCC,
    agirlikKg,
    yakıtTipi,
    isIsAraci,
    isAraciYakitTipi,
    kdvOrani,
    gumrukKomisyonuTRY,
    ardiyeTRY,
  ]);

  // Hesaplama için 4 zorunlu bilgi: Kıymet, Gemi Parası, Ağırlık, Yakıt Tipi (+ Kur + Motor manuel için)
  const hasKiymet = Boolean(effectiveKiymetJPY ?? (inputMode === "manual" && manuelKiymetJPY > 0));
  const hasGemiParasi = (parseFloat(gemiParasiAmount) || 0) > 0;
  const hasAgirlik = agirlikKg > 0;
  const hasYakitTipi = true; // Her zaman seçili (default)
  const hasKur = effectiveJpyTryKuru > 0;
  const hasMotor = motorGucuCC > 0 || inputMode === "manual";

  const canCalculate = hasKiymet && hasGemiParasi && hasAgirlik && hasYakitTipi && hasKur && hasMotor;

  const eksikKiyim = !hasKiymet;
  const eksikGemiParasi = !hasGemiParasi;
  const eksikAgirlik = agirlikKg <= 0;
  const eksikKur = !hasKur;

  const handleYakıtChange = (v: FuelType) => {
    setYakıtTipi(v);
    setIsIsAraci(v === "is_araci");
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol: Girdiler */}
        <div className="lg:col-span-2 space-y-4">
          {/* Giriş modu */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Giriş Modu</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(["vehicle_select", "chassis_query", "manual"] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={inputMode === mode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setInputMode(mode);
                    setSelectedMarka("");
                    setSelectedModel("");
                    setSelectedYil("");
                    setChassisNo("");
                  }}
                >
                  {mode === "vehicle_select" && "Araç Seçimi"}
                  {mode === "chassis_query" && "Şasi No ile Sorgula"}
                  {mode === "manual" && "Tamamen Manuel Giriş"}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Araç seçimi: Marka -> Model -> Yıl (Kod otomatik) */}
          {inputMode === "vehicle_select" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Araç Bilgisi</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Marka</Label>
                  <Select value={selectedMarka} onValueChange={(v) => { setSelectedMarka(v); setSelectedModel(""); setSelectedYil(""); }}>
                    <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent>
                      {markalar.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Model</Label>
                  <Select value={selectedModel} onValueChange={(v) => { setSelectedModel(v); setSelectedYil(""); }} disabled={!selectedMarka}>
                    <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent>
                      {modeller.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Yıl</Label>
                  <Select value={selectedYil} onValueChange={setSelectedYil} disabled={!autoSelectedKod}>
                    <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent>
                      {yillar.map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              {selectedVehicleData && (
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  Motor: {selectedVehicleData.motor_gucu} • F.İ.F: %{(getFIFRateFromCC(parseMotorGucuCC(selectedVehicleData.motor_gucu)) * 100).toFixed(0)}
                </CardContent>
              )}
              {inputMode === "vehicle_select" && eksikKiyim && (selectedMarka || selectedModel) && (
                <CardContent className="pt-0">
                  <p className="text-xs text-amber-600">Lütfen araç ve yıl seçiniz.</p>
                </CardContent>
              )}
            </Card>
          )}

          {/* Şasi sorgulama: chassis.includes(kod) ile tüm JSON taranır */}
          {inputMode === "chassis_query" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Şasi No</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Şasi / VIN Numarası</Label>
                  <Input
                    placeholder="Örn: FK7KAWI4283"
                    value={chassisNo}
                    onChange={(e) => setChassisNo(e.target.value.toUpperCase())}
                  />
                </div>
                {chassisNo.trim() && (
                  chassisMatch ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        Aracınız: {chassisMatch.marka} {chassisMatch.model} ({chassisMatch.kod})
                      </p>
                      <div>
                        <Label>Yıl</Label>
                        <Select value={selectedYil} onValueChange={setSelectedYil}>
                          <SelectTrigger><SelectValue placeholder="Yıl seçin" /></SelectTrigger>
                          <SelectContent>
                            {chassisMatch.kiymetler
                              ? Object.keys(chassisMatch.kiymetler).sort().map((y) => (
                                  <SelectItem key={y} value={y}>{y}</SelectItem>
                                ))
                              : null}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Araç kodu şasi numarasında bulunamadı, lütfen manuel seçim yapın.
                    </p>
                  )
                )}
              </CardContent>
            </Card>
          )}

          {/* Manuel giriş */}
          {inputMode === "manual" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Manuel Değerler</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Kıymet (JPY)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={manuelKiymetJPY || ""}
                    onChange={(e) => setManuelKiymetJPY(parseFloat(e.target.value) || 0)}
                    placeholder="Örn: 1500000"
                    className={eksikKiyim ? "border-amber-500" : ""}
                  />
                  {eksikKiyim && (
                    <p className="text-xs text-amber-600 mt-1">Lütfen kıymet giriniz.</p>
                  )}
                </div>
                <div>
                  <Label>Motor Hacmi (CC)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={manuelMotorCC || ""}
                    onChange={(e) => setManuelMotorCC(parseInt(e.target.value, 10) || 0)}
                    placeholder="Örn: 1997"
                  />
                </div>
                <div>
                  <Label>JPY/TRY Kur</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    min={0}
                    value={manuelKur}
                    onChange={(e) => setManuelKur(e.target.value)}
                    placeholder={jpyTryRate ? `Güncel: ${jpyTryRate.toFixed(4)}` : "Kur girin"}
                    className={inputMode === "manual" && eksikKur ? "border-amber-500" : ""}
                  />
                  {inputMode === "manual" && eksikKur && (
                    <p className="text-xs text-amber-600 mt-1">Lütfen kur giriniz.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ortak alanlar - Kıymet, Gemi Parası, Ağırlık, Yakıt Tipi zorunlu */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Diğer Bilgiler</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Devletin belirlediği kıymet - döviz seçimi + kur düzenleme */}
              {(effectiveKiymetJPY ?? (inputMode === "manual" && manuelKiymetJPY > 0)) && (
                <div className="sm:col-span-2">
                  <Label className="text-muted-foreground">Devletin seçilen araç için belirlediği kıymet</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono font-medium">
                      {jpyToDisplayRateLoading ? (
                        "Yükleniyor..."
                      ) : (
                        formatInCurrency(
                          (() => {
                            const k = effectiveKiymetJPY ?? manuelKiymetJPY ?? 0;
                            if (kiymetDisplayCurrency === "JPY") return k;
                            if (kiymetDisplayCurrency === "TRY") return k * effectiveJpyTryKuru;
                            return k * (jpyToDisplayRate ?? 1);
                          })(),
                          kiymetDisplayCurrency
                        )
                      )}
                    </span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2" align="start">
                        <div className="grid gap-1">
                          {CURRENCIES_OPTIONS.map((curr) => {
                            const isSelected = curr.value === kiymetDisplayCurrency;
                            const icon = CURRENCY_ICONS[curr.value] || curr.value;
                            return (
                              <div
                                key={curr.value}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                                  "hover:bg-accent hover:text-accent-foreground",
                                  isSelected && "bg-accent text-accent-foreground font-medium"
                                )}
                              >
                                <button
                                  type="button"
                                  className="flex items-center gap-2 flex-1 text-left"
                                  onClick={() => setKiymetDisplayCurrency(curr.value)}
                                >
                                  <span className="text-base font-medium w-6">{icon}</span>
                                  <span className="flex-1">{curr.label}</span>
                                </button>
                                {(curr.value === "JPY" || curr.value === "TRY") && (
                                  <CurrencyRateEditor
                                    fromCurrency="JPY"
                                    toCurrency="TRY"
                                    baseCurrency="TRY"
                                    customRate={kiymetCustomRate ?? undefined}
                                    onRateChange={setKiymetCustomRate}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
              <div>
                <Label>Gemi Parası</Label>
                <CurrencyInput
                  value={gemiParasiAmount}
                  currency={gemiParasiCurrency}
                  onValueChange={setGemiParasiAmount}
                  onCurrencyChange={setGemiParasiCurrency}
                  customRate={gemiParasiCustomRate}
                  onCustomRateChange={setGemiParasiCustomRate}
                  currencies={CURRENCIES_OPTIONS}
                  className={eksikGemiParasi && (hasKiymet || inputMode === "manual") ? "border-amber-500" : ""}
                />
                {eksikGemiParasi && (hasKiymet || inputMode === "manual") && (
                  <p className="text-xs text-amber-600 mt-1">Lütfen gemi parası giriniz.</p>
                )}
              </div>
              <div>
                <Label>Ağırlık (kg)</Label>
                <Input
                  type="number"
                  min={0}
                  value={agirlikKg || ""}
                  onChange={(e) => setAgirlikKg(parseInt(e.target.value, 10) || 0)}
                  placeholder="Örn: 1400"
                  className={eksikAgirlik && (hasKiymet || inputMode === "manual") ? "border-amber-500" : ""}
                />
                {eksikAgirlik && (hasKiymet || inputMode === "manual") && (
                  <p className="text-xs text-amber-600 mt-1">Lütfen ağırlık giriniz.</p>
                )}
              </div>
              <div>
                <Label>Yakıt Tipi</Label>
                <Select value={yakıtTipi} onValueChange={(v) => handleYakıtChange(v as FuelType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {yakıtTipi === "is_araci" && (
                <div>
                  <Label>İş Aracı Alt Yakıt Tipi</Label>
                  <Select value={isAraciYakitTipi} onValueChange={(v) => setIsAraciYakitTipi(v as typeof isAraciYakitTipi)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="benzinli">Benzinli</SelectItem>
                      <SelectItem value="dizel">Dizel</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="elektrikli">Elektrikli</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-end gap-2">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isIsAraci}
                    onChange={(e) => setIsIsAraci(e.target.checked)}
                    className="rounded border-input"
                  />
                  İş Aracı (Çift Kabin / Panel Van)
                </Label>
              </div>
              <div>
                <Label>Gümrük Komisyonu</Label>
                <CurrencyInput
                  value={gumrukAmount}
                  currency={gumrukCurrency}
                  onValueChange={setGumrukAmount}
                  onCurrencyChange={setGumrukCurrency}
                  customRate={gumrukCustomRate}
                  onCustomRateChange={setGumrukCustomRate}
                  currencies={CURRENCIES_OPTIONS}
                />
              </div>
              <div>
                <Label>Ardiye</Label>
                <CurrencyInput
                  value={ardiyeAmount}
                  currency={ardiyeCurrency}
                  onValueChange={setArdiyeAmount}
                  onCurrencyChange={setArdiyeCurrency}
                  customRate={ardiyeCustomRate}
                  onCustomRateChange={setArdiyeCustomRate}
                  currencies={CURRENCIES_OPTIONS}
                />
              </div>
            </CardContent>
          </Card>

          {/* Kur bilgisi */}
          {inputMode !== "manual" && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">JPY/TRY:</span>
                {kurLoading ? (
                  <span>Yükleniyor...</span>
                ) : (
                  <>
                    <span className="font-mono">{jpyTryKuru > 0 ? jpyTryKuru.toFixed(4) : "-"}</span>
                    <Button variant="ghost" size="sm" onClick={() => refetchKur()} className="h-8 w-8 p-0">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              {eksikKur && !kurLoading && hasKiymet && (
                <p className="text-xs text-amber-600">Lütfen kur bilgisini yükleyiniz (yenile butonuna tıklayın).</p>
              )}
            </div>
          )}

          {/* KDV Slider */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">KDV Oranı: %{(kdvOrani * 100).toFixed(0)}</CardTitle>
            </CardHeader>
            <CardContent>
              <Slider
                value={[kdvOrani * 100]}
                min={0}
                max={40}
                step={1}
                onValueChange={([v]) => setKdvOrani((v ?? 0) / 100)}
                className="w-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sağ: Sonuç - masaüstünde yan panel, mobilde en altta sticky */}
        <div className={cn("lg:col-span-1", isMobile && "order-last")}>
          <Card className={cn(isMobile && "sticky bottom-4 z-10 shadow-lg")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Genel Toplam
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{result.error}</span>
                </div>
              )}
              {kiymetNullUyarisi && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>Bu model/yıl için kıymet değerlemesi yapılmamıştır.</span>
                </div>
              )}
              <div className="text-2xl font-bold">
                <AnimatedValue value={result.genelToplam} className="text-primary" />
              </div>

              {/* Collapsible detay */}
              <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    Detayları Gör
                    {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-4 space-y-2 text-sm border rounded-lg p-4 bg-muted/30">
                    <div className="font-medium text-muted-foreground">Kalem Fiyatı (CIF)</div>
                    <DetailRow label="Araç kıymeti + Gemi parası" value={result.cifTRY} />
                    <div className="border-t pt-2 mt-2 font-medium text-muted-foreground">1. Kalem (kalem fiyat üzerinden)</div>
                    <DetailRowWithOran label="Stopaj" oran={4} value={result.stopaj} />
                    <DetailRowWithOran label="KDV" oran={kdvOrani * 100} value={result.kdv} />
                    <DetailRowWithOran label="FİF salon arabalar" oran={getFIFRateFromCC(motorGucuCC) * 100} value={result.fif} />
                    <DetailRowWithOran label="İthalat-İhracat" oran={4.4} value={result.ithalatIhracat} />
                    <DetailRowWithOran label="GK Güç Fonu" oran={2.5} value={result.gkGucFonu} />
                    <DetailRow label="Bandrol (sabit)" value={result.bandrol} />
                    <DetailRowWithOran label="Gümrük Resmi" oran={10} value={result.gumrukResmi} />
                    <div className="font-medium">1. Kalem Toplam: {formatTRY(result.birinciKalem)}</div>
                    <div className="border-t pt-2 mt-2">
                      <DetailRow label="2. Kayıt Parası" value={result.kayitParasi} />
                      <DetailRow label="3. Gümrük Komisyonu" value={result.gumrukKomisyonu} />
                      <DetailRow label="4. Ağırlık Katsayısı" value={result.agirlikKatsayisi} />
                    </div>
                    <div className="border-t pt-2 mt-2 font-bold">Genel Toplam: {formatTRY(result.genelToplam)}</div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Fatura Hesaplama - (CIF + 1. kalem) + KDV */}
          <Card className={cn(isMobile && "mt-4", "mt-4")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Fatura Hesaplama
              </CardTitle>
              <p className="text-xs text-muted-foreground font-normal">
                (CIF + 1. kalem) + KDV
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.error ? (
                <p className="text-sm text-muted-foreground">Hesaplama yapılamadı</p>
              ) : (
                <>
                  <div className="space-y-2 text-sm">
                    <DetailRow label="CIF (Kalem fiyat)" value={result.cifTRY} />
                    <DetailRow label="1. Kalem" value={result.birinciKalem} />
                    <div className="border-t pt-2">
                      <DetailRow label="Matrah" value={result.faturaMatrah} />
                      <DetailRow label={`KDV (%${(kdvOrani * 100).toFixed(0)})`} value={result.faturaVergi} />
                    </div>
                    <div className="border-t pt-2 mt-2 font-bold text-primary">
                      Fatura Toplam: {formatTRY(result.faturaToplam)}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{formatTRY(value)}</span>
    </div>
  );
}

function DetailRowWithOran({ label, oran, value }: { label: string; oran: number; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label} (%{oran.toFixed(1)})</span>
      <span className="font-mono">{formatTRY(value)}</span>
    </div>
  );
}
