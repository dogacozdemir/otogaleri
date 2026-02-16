import React, { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import html2pdf from "html2pdf.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Printer, Download, MessageCircle } from "lucide-react";
import QuotePDFTemplate, {
  type QuotePDFData,
  type QuoteSettingsData,
} from "./QuotePDFTemplate";
import { formatCurrency } from "@/lib/formatters";

interface QuoteDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuotePDFData | null;
  settings: QuoteSettingsData | null;
  locale?: string;
}

export function QuoteDetailModal({
  open,
  onOpenChange,
  quote,
  settings,
  locale = "tr-TR",
}: QuoteDetailModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: quote ? `Teklif-${quote.quote_number}` : "Teklif",
    pageStyle: `
      @page { margin: 15mm; size: A4; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `,
  });

  const handleDownloadPDF = async () => {
    if (!printRef.current || !quote) return;
    setIsDownloading(true);
    try {
      await html2pdf()
        .set({
          margin: 10,
          filename: `Teklif-${quote.quote_number}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(printRef.current)
        .save();
    } finally {
      setIsDownloading(false);
    }
  };

  const getWhatsAppMessage = () => {
    if (!quote) return "";
    const vehicle = `${quote.maker || ""} ${quote.model || ""} ${quote.production_year || ""}`.trim();
    const price = formatCurrency(
      Math.max(0, (quote.sale_price ?? 0) - (quote.discount_amount ?? 0)),
      quote.currency,
      locale
    );
    return `Merhaba,\n\n${vehicle} aracı için hazırladığımız teklif:\n\n• Teklif No: ${quote.quote_number}\n• Fiyat: ${price}\n\nDetayları incelemek için lütfen bizimle iletişime geçin.`;
  };

  const openWhatsApp = () => {
    if (!settings?.contact_whatsapp) return;
    const phone = settings.contact_whatsapp.replace(/\D/g, "");
    const msg = encodeURIComponent(getWhatsAppMessage());
    window.open(
      `https://wa.me/${phone.startsWith("90") ? phone : `90${phone}`}?text=${msg}`,
      "_blank"
    );
  };

  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Teklif Detayı - {quote.quote_number}
          </DialogTitle>
          <DialogDescription>
            Teklifi yazdırabilir veya PDF olarak indirebilirsiniz
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            onClick={handlePrint}
            variant="default"
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Yazdır
          </Button>
          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            className="gap-2"
            disabled={isDownloading}
          >
            <Download className="h-4 w-4" />
            {isDownloading ? "İndiriliyor..." : "PDF İndir"}
          </Button>
          {settings?.contact_whatsapp && (
            <Button
              onClick={openWhatsApp}
              variant="outline"
              className="gap-2 text-green-600 border-green-600 hover:bg-green-50"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp ile Gönder
            </Button>
          )}
        </div>

        <div
          ref={printRef}
          className="quote-pdf-print-area bg-white rounded-lg border border-border p-4"
        >
          <QuotePDFTemplate
            quote={quote}
            settings={settings}
            locale={locale}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
