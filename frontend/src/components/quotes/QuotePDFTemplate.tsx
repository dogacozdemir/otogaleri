import React, { forwardRef } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { formatCurrency } from "@/lib/formatters";
import { safeDivide } from "@/lib/safeDivide";

export type QuotePDFData = {
  quote_number: string;
  quote_date: string;
  valid_until: string;
  updated_at?: string;
  status: string;
  sale_price: number;
  discount_amount?: number | null;
  currency: string;
  down_payment?: number | null;
  installment_count?: number | null;
  installment_amount?: number | null;
  maker: string | null;
  model: string | null;
  production_year: number | null;
  transmission?: string | null;
  km?: number | null;
  fuel?: string | null;
  cc?: number | null;
  color?: string | null;
  chassis_no: string | null;
  primary_image_url?: string | null;
  customer_name_full?: string | null;
  customer_phone_full?: string | null;
  notes?: string | null;
};

export type QuoteSettingsData = {
  gallery_name?: string | null;
  gallery_logo_url?: string | null;
  terms_conditions?: string | null;
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
  contact_address?: string | null;
};

interface QuotePDFTemplateProps {
  quote: QuotePDFData;
  settings?: QuoteSettingsData | null;
  locale?: string;
}

const QuotePDFTemplate = forwardRef<HTMLDivElement, QuotePDFTemplateProps>(
  ({ quote, settings, locale = "tr-TR" }, ref) => {
    const listPrice = quote.sale_price;
    const discount = quote.discount_amount ?? 0;
    const finalPrice = Math.max(0, listPrice - discount);
    const hasInstallment =
      quote.installment_count &&
      quote.installment_count > 0 &&
      quote.installment_amount &&
      quote.installment_amount > 0;
    const installmentTotal = hasInstallment
      ? safeDivide(quote.installment_count!, 1) * (quote.installment_amount ?? 0)
      : 0;

    const showWatermark =
      quote.status === "draft" || quote.status === "rejected";

    return (
      <div
        ref={ref}
        className="bg-white text-gray-900 p-8 max-w-[210mm] mx-auto print:p-6 print:max-w-none"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        {showWatermark && (
          <div
            className="fixed inset-0 flex items-center justify-center pointer-events-none print:block"
            style={{
              transform: "rotate(-30deg)",
              fontSize: "4rem",
              fontWeight: 700,
              color: "rgba(0,0,0,0.06)",
              zIndex: 0,
            }}
          >
            {quote.status === "draft" ? "TASLAK" : "REDDEDİLDİ"}
          </div>
        )}

        <div className="relative z-10">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-200 pb-4 mb-6">
            <div className="flex items-center gap-4">
              {settings?.gallery_logo_url && (
                <img
                  src={settings.gallery_logo_url}
                  alt="Logo"
                  className="h-14 object-contain"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  {settings?.gallery_name || "Satış Teklifi"}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Teklif No: <span className="font-semibold text-slate-700">{quote.quote_number}</span>
                </p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p>
                <span className="text-slate-500">Tarih:</span>{" "}
                {format(new Date(quote.quote_date), "dd MMMM yyyy", {
                  locale: tr,
                })}
              </p>
              <p>
                <span className="text-slate-500">Geçerlilik:</span>{" "}
                {format(new Date(quote.valid_until), "dd MMMM yyyy", {
                  locale: tr,
                })}
              </p>
            </div>
          </div>

          {/* Hero Image */}
          {quote.primary_image_url && (
            <div className="mb-6 rounded-lg overflow-hidden bg-slate-100">
              <img
                src={quote.primary_image_url}
                alt={`${quote.maker} ${quote.model}`}
                className="w-full h-64 object-cover"
              />
            </div>
          )}

          {/* Technical Specs Grid */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">
              Araç Bilgileri
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <SpecRow label="Marka" value={quote.maker} />
              <SpecRow label="Model" value={quote.model} />
              <SpecRow label="Yıl" value={quote.production_year} />
              <SpecRow label="Yakıt" value={quote.fuel} />
              <SpecRow label="Vites" value={quote.transmission} />
              <SpecRow
                label="Kilometre"
                value={quote.km != null ? `${quote.km.toLocaleString("tr-TR")} km` : null}
              />
              <SpecRow
                label="Motor Hacmi"
                value={quote.cc != null ? `${quote.cc} cc` : null}
              />
              <SpecRow label="Renk" value={quote.color} />
            </div>
          </div>

          {/* Customer */}
          {(quote.customer_name_full || quote.customer_phone_full) && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-2">
                Müşteri
              </h2>
              <p className="text-sm">
                {quote.customer_name_full}
                {quote.customer_phone_full && ` • ${quote.customer_phone_full}`}
              </p>
            </div>
          )}

          {/* Financial Table */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">
              Fiyat Detayı
            </h2>
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-2 text-slate-600">Liste Fiyatı</td>
                  <td className="py-2 text-right font-medium">
                    {formatCurrency(listPrice, quote.currency, locale)}
                  </td>
                </tr>
                {discount > 0 && (
                  <tr className="border-b border-slate-200">
                    <td className="py-2 text-slate-600">İndirim</td>
                    <td className="py-2 text-right text-emerald-600 font-medium">
                      -{formatCurrency(discount, quote.currency, locale)}
                    </td>
                  </tr>
                )}
                {quote.down_payment != null && quote.down_payment > 0 && (
                  <tr className="border-b border-slate-200">
                    <td className="py-2 text-slate-600">Peşinat</td>
                    <td className="py-2 text-right">
                      {formatCurrency(quote.down_payment, quote.currency, locale)}
                    </td>
                  </tr>
                )}
                {hasInstallment && (
                  <tr className="border-b border-slate-200">
                    <td className="py-2 text-slate-600">
                      Taksit ({quote.installment_count} x{" "}
                      {formatCurrency(
                        quote.installment_amount,
                        quote.currency,
                        locale
                      )})
                    </td>
                    <td className="py-2 text-right">
                      {formatCurrency(
                        installmentTotal,
                        quote.currency,
                        locale
                      )}
                    </td>
                  </tr>
                )}
                <tr className="border-t-2 border-slate-300 bg-slate-50">
                  <td className="py-3 font-semibold text-slate-800">
                    Toplam
                  </td>
                  <td className="py-3 text-right font-bold text-lg text-slate-900">
                    {formatCurrency(finalPrice, quote.currency, locale)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-1">Notlar</h2>
              <p className="text-sm text-slate-600">{quote.notes}</p>
            </div>
          )}

          {/* Legal Footer */}
          <div className="border-t border-slate-200 pt-6 mt-8 text-xs text-slate-500 space-y-2">
            <p>
              Bu teklif{" "}
              {Math.ceil(
                (new Date(quote.valid_until).getTime() -
                  new Date(quote.quote_date).getTime()) /
                  (1000 * 60 * 60 * 24)
              )}{" "}
              gün geçerlidir.
            </p>
            {settings?.terms_conditions && (
              <p className="mt-2">{settings.terms_conditions}</p>
            )}
            {(settings?.contact_phone ||
              settings?.contact_whatsapp ||
              settings?.contact_address) && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                {settings.contact_phone && (
                  <p>Tel: {settings.contact_phone}</p>
                )}
                {settings.contact_whatsapp && (
                  <p>WhatsApp: {settings.contact_whatsapp}</p>
                )}
                {settings.contact_address && (
                  <p>Adres: {settings.contact_address}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

QuotePDFTemplate.displayName = "QuotePDFTemplate";

function SpecRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | number | null | undefined;
  className?: string;
}) {
  return (
    <div
      className={`flex justify-between py-2 px-3 rounded bg-slate-50 ${className}`}
    >
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">
        {value ?? "-"}
      </span>
    </div>
  );
}

export default QuotePDFTemplate;
