import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCurrencyRates } from "@/contexts/CurrencyRatesContext"
import { api } from "@/api"
import { Edit2, X, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CurrencyRateEditorProps {
  fromCurrency: string
  toCurrency: string
  baseCurrency: string
  onRateChange?: (rate: number | null) => void
  customRate?: number | null // Form-specific rate (overrides global context)
}

export function CurrencyRateEditor({ 
  fromCurrency, 
  toCurrency, 
  baseCurrency,
  onRateChange,
  customRate: formCustomRate
}: CurrencyRateEditorProps) {
  const { getCustomRate, setCustomRate, clearCustomRate } = useCurrencyRates()
  const { toast } = useToast()
  const [open, setOpen] = React.useState(false)
  const [rateInput, setRateInput] = React.useState("")
  const [liveRate, setLiveRate] = React.useState<number | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  // Use form-specific rate if provided, otherwise use global context
  const globalCustomRate = getCustomRate(fromCurrency, toCurrency)
  const customRate = formCustomRate !== undefined ? formCustomRate : globalCustomRate
  const activeRate = customRate ?? liveRate

  // Load custom rate on mount or when formCustomRate changes
  React.useEffect(() => {
    if (customRate !== null) {
      setRateInput(customRate.toString())
    } else if (liveRate !== null && customRate === null) {
      setRateInput(liveRate.toString())
    }
  }, [customRate, liveRate])

  // Fetch live rate when popover opens
  React.useEffect(() => {
    if (open && customRate === null) {
      fetchLiveRate()
    }
  }, [open, fromCurrency, toCurrency])

  const fetchLiveRate = async () => {
    if (fromCurrency === toCurrency) {
      setLiveRate(1)
      return
    }

    setIsLoading(true)
    try {
      // ISO 4217 standardı: JPY kullanılır
      const from = fromCurrency === "YEN" ? "JPY" : fromCurrency
      const to = toCurrency === "YEN" ? "JPY" : toCurrency

      const response = await api.get("/currency/rate", {
        params: { from, to },
      })

      if (response.data?.rate) {
        setLiveRate(response.data.rate)
        if (!customRate) {
          setRateInput(response.data.rate.toString())
        }
      }
    } catch (error: any) {
      console.error("Kur çekme hatası:", error)
      toast({
        title: "Hata",
        description: "Kur bilgisi alınamadı. Lütfen manuel olarak girin.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = () => {
    const rate = parseFloat(rateInput)
    if (isNaN(rate) || rate <= 0) {
      toast({
        title: "Geçersiz Kur",
        description: "Kur değeri 0'dan büyük olmalıdır.",
        variant: "destructive",
      })
      return
    }

    // If onRateChange is provided, use form-specific rate (don't save to global context)
    if (onRateChange) {
      onRateChange(rate)
    } else {
      // Otherwise, save to global context
      setCustomRate(fromCurrency, toCurrency, rate)
    }
    setOpen(false)
    toast({
      title: "Kur Kaydedildi",
      description: `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`,
    })
  }

  const handleClear = () => {
    // If onRateChange is provided, clear form-specific rate
    if (onRateChange) {
      onRateChange(null)
    } else {
      // Otherwise, clear from global context
      clearCustomRate(fromCurrency, toCurrency)
    }
    setRateInput(liveRate?.toString() || "")
    setOpen(false)
    toast({
      title: "Kur Temizlendi",
      description: "Varsayılan kur kullanılacak.",
    })
  }

  const handleRefresh = () => {
    fetchLiveRate()
    if (!customRate) {
      setRateInput(liveRate?.toString() || "")
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-accent"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(true)
          }}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-1">Kur Düzenle</h4>
            <p className="text-xs text-muted-foreground">
              1 {fromCurrency} = ? {toCurrency}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.0001"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                placeholder={liveRate?.toFixed(4) || "0.0000"}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {liveRate !== null && (
              <p className="text-xs text-muted-foreground">
                Güncel kur: {liveRate.toFixed(4)} {toCurrency}
                {customRate && (
                  <span className="ml-2 text-orange-600">
                    (Manuel: {customRate.toFixed(4)})
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSave}
              className="flex-1"
            >
              Kaydet
            </Button>
            {customRate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
              >
                <X className="h-4 w-4 mr-1" />
                Temizle
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

