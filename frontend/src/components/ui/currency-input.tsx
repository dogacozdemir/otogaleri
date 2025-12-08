import * as React from "react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import { CurrencyRateEditor } from "@/components/CurrencyRateEditor"
import { useTenant } from "@/contexts/TenantContext"

const CURRENCY_ICONS: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
  YEN: "¥",
}

const CURRENCIES = [
  { value: "TRY", label: "Türk Lirası", icon: "₺" },
  { value: "USD", label: "Amerikan Doları", icon: "$" },
  { value: "EUR", label: "Euro", icon: "€" },
  { value: "GBP", label: "İngiliz Sterlini", icon: "£" },
  { value: "YEN", label: "Japon Yeni", icon: "¥" },
]

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: string | null
  currency: string
  onValueChange: (value: string) => void
  onCurrencyChange: (currency: string) => void
  currencies?: Array<{ value: string; label: string; icon?: string }>
  customRate?: number | null
  onCustomRateChange?: (rate: number | null) => void
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, currency, onValueChange, onCurrencyChange, currencies = CURRENCIES, onChange, customRate, onCustomRateChange, ...props }, ref) => {
    const [open, setOpen] = React.useState(false)
    const { tenant } = useTenant()
    const baseCurrency = tenant?.default_currency || "TRY"
    
    const selectedCurrency = currencies.find(c => c.value === currency) || currencies[0]
    const currencyIcon = selectedCurrency.icon || CURRENCY_ICONS[selectedCurrency.value] || selectedCurrency.value
    
    // Ensure value is always a string to prevent controlled/uncontrolled warning
    // Convert to string explicitly to handle all edge cases
    const inputValue = typeof value === 'string' ? value : (value != null ? String(value) : "")

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="number"
          step="0.01"
          value={inputValue}
          onChange={(e) => {
            onValueChange(e.target.value)
            onChange?.(e)
          }}
          className={cn("pr-20", className)}
          {...props}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2 hover:bg-accent"
            >
              <span className="text-base font-medium mr-1">{currencyIcon}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="grid gap-1">
              {currencies.map((curr) => {
                const icon = curr.icon || CURRENCY_ICONS[curr.value] || curr.value
                const isSelected = curr.value === currency
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
                      onClick={() => {
                        onCurrencyChange(curr.value)
                        setOpen(false)
                      }}
                    >
                      <span className="text-base font-medium w-6">{icon}</span>
                      <span className="flex-1">{curr.label}</span>
                    </button>
                    {curr.value !== baseCurrency && (
                      <CurrencyRateEditor
                        fromCurrency={curr.value}
                        toCurrency={baseCurrency}
                        baseCurrency={baseCurrency}
                        customRate={isSelected && customRate !== undefined ? customRate : undefined}
                        onRateChange={isSelected && onCustomRateChange ? onCustomRateChange : undefined}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)
CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput, CURRENCIES }

