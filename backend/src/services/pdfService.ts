import PDFDocument from "pdfkit";
import { Response } from "express";

interface SaleData {
  sale_id: number;
  sale_date: string;
  sale_amount: number;
  sale_currency: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  plate_number: string | null;
  vehicle: {
    maker: string | null;
    model: string | null;
    production_year: number | null;
    chassis_no: string | null;
    km: number | null;
    color: string | null;
    engine_no: string | null;
    fuel: string | null;
    transmission: string | null;
  };
  branch_name: string | null;
  staff_name: string | null;
  installment?: {
    down_payment: number;
    installment_count: number;
    installment_amount: number;
    total_amount: number;
  } | null;
  tenant_name?: string;
}

export function generateSalesContract(saleData: SaleData, res: Response): void {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  });

  // Set response headers
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="satis-sozlesmesi-${saleData.sale_id}.pdf"`
  );

  // Pipe PDF to response
  doc.pipe(res);

  // Header with branding
  doc
    .fillColor("#003d82")
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("SATIŞ SÖZLEŞMESİ", { align: "center" })
    .moveDown(0.5);

  doc
    .fillColor("#2d3748")
    .fontSize(10)
    .font("Helvetica")
    .text(`Sözleşme No: ${saleData.sale_id}`, { align: "right" })
    .text(`Tarih: ${formatDate(saleData.sale_date)}`, { align: "right" })
    .moveDown(1);

  // Tenant name if available
  if (saleData.tenant_name) {
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(saleData.tenant_name, { align: "center" })
      .moveDown(0.5);
  }

  // Section: Parties
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .fillColor("#003d82")
    .text("TARAFLAR", { underline: true })
    .moveDown(0.5);

  doc
    .fontSize(11)
    .font("Helvetica")
    .fillColor("#2d3748")
    .text("SATICI:", { continued: true })
    .font("Helvetica-Bold")
    .text(saleData.tenant_name || "Oto Galeri")
    .moveDown(0.3);

  doc
    .font("Helvetica")
    .text("ALICI:", { continued: true })
    .font("Helvetica-Bold")
    .text(saleData.customer_name);

  if (saleData.customer_phone) {
    doc.text(`Telefon: ${saleData.customer_phone}`);
  }

  if (saleData.customer_address) {
    doc.text(`Adres: ${saleData.customer_address}`);
  }

  doc.moveDown(1);

  // Section: Vehicle Details
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .fillColor("#003d82")
    .text("ARAÇ BİLGİLERİ", { underline: true })
    .moveDown(0.5);

  doc.fontSize(11).font("Helvetica").fillColor("#2d3748");

  const vehicleInfo = [
    ["Marka", saleData.vehicle.maker || "-"],
    ["Model", saleData.vehicle.model || "-"],
    ["Yıl", saleData.vehicle.production_year?.toString() || "-"],
    ["Şasi No", saleData.vehicle.chassis_no || "-"],
    ["Kilometre", saleData.vehicle.km ? `${saleData.vehicle.km.toLocaleString()} km` : "-"],
    ["Renk", saleData.vehicle.color || "-"],
    ["Motor No", saleData.vehicle.engine_no || "-"],
    ["Yakıt", saleData.vehicle.fuel || "-"],
    ["Vites", saleData.vehicle.transmission || "-"],
    ["Plaka", saleData.plate_number || "Henüz tescil edilmedi"],
  ];

  vehicleInfo.forEach(([label, value]) => {
    doc.text(`${label}: ${value}`, { indent: 20 });
  });

  doc.moveDown(1);

  // Section: Sale Details
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .fillColor("#003d82")
    .text("SATIŞ BİLGİLERİ", { underline: true })
    .moveDown(0.5);

  doc.fontSize(11).font("Helvetica").fillColor("#2d3748");

  const saleAmount = formatCurrency(saleData.sale_amount, saleData.sale_currency);
  doc.text(`Satış Fiyatı: ${saleAmount}`, { indent: 20 });

  if (saleData.installment) {
    doc.moveDown(0.3);
    doc
      .font("Helvetica-Bold")
      .fillColor("#F0A500")
      .text("Taksitli Satış Detayları:", { indent: 20 });
    doc
      .font("Helvetica")
      .fillColor("#2d3748")
      .text(`Peşinat: ${formatCurrency(saleData.installment.down_payment, saleData.sale_currency)}`, {
        indent: 40,
      })
      .text(
        `Taksit Sayısı: ${saleData.installment.installment_count} taksit`,
        { indent: 40 }
      )
      .text(
        `Taksit Tutarı: ${formatCurrency(saleData.installment.installment_amount, saleData.sale_currency)}`,
        { indent: 40 }
      )
      .text(
        `Toplam Tutar: ${formatCurrency(saleData.installment.total_amount, saleData.sale_currency)}`,
        { indent: 40 }
      );
  }

  doc.moveDown(1);

  // Section: Terms and Conditions
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .fillColor("#003d82")
    .text("ŞARTLAR VE KOŞULLAR", { underline: true })
    .moveDown(0.5);

  doc.fontSize(10).font("Helvetica").fillColor("#2d3748");

  const terms = [
    "Araç, görüldüğü gibi ve mevcut durumuyla satılmıştır.",
    "Alıcı, aracı teslim aldıktan sonra her türlü sorumluluğu üstlenir.",
    "Araçta tespit edilecek gizli ayıplar için satıcı sorumludur.",
    "Bu sözleşme taraflarca imzalandığında geçerlidir.",
    "Taksitli satışlarda, ödeme planına uyulması zorunludur.",
  ];

  terms.forEach((term, index) => {
    doc.text(`${index + 1}. ${term}`, { indent: 20 });
  });

  doc.moveDown(2);

  // Signature lines
  doc
    .fontSize(11)
    .font("Helvetica")
    .text("SATICI", { align: "left", continued: true })
    .text("ALICI", { align: "right" })
    .moveDown(2);

  doc
    .moveTo(50, doc.y)
    .lineTo(250, doc.y)
    .stroke();

  doc
    .moveTo(300, doc.y - 20)
    .lineTo(500, doc.y - 20)
    .stroke();

  doc.moveDown(0.5);
  doc.fontSize(9).text("İmza", { align: "left", continued: true }).text("İmza", { align: "right" });

  // Branch and Staff info if available
  if (saleData.branch_name || saleData.staff_name) {
    doc.moveDown(1);
    doc.fontSize(9).fillColor("#666");
    if (saleData.branch_name) {
      doc.text(`Şube: ${saleData.branch_name}`);
    }
    if (saleData.staff_name) {
      doc.text(`Satış Temsilcisi: ${saleData.staff_name}`);
    }
  }

  // Finalize PDF
  doc.end();
}

export function generateInvoice(saleData: SaleData, res: Response): void {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  });

  // Set response headers
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="fatura-${saleData.sale_id}.pdf"`
  );

  // Pipe PDF to response
  doc.pipe(res);

  // Header with branding
  doc
    .fillColor("#003d82")
    .fontSize(28)
    .font("Helvetica-Bold")
    .text("FATURA", { align: "center" })
    .moveDown(0.3);

  if (saleData.tenant_name) {
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#2d3748")
      .text(saleData.tenant_name, { align: "center" })
      .moveDown(0.5);
  }

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#666")
    .text(`Fatura No: ${saleData.sale_id}`, { align: "right" })
    .text(`Tarih: ${formatDate(saleData.sale_date)}`, { align: "right" })
    .moveDown(1.5);

  // Customer Information Box
  doc
    .rect(50, doc.y, 250, 80)
    .stroke("#003d82")
    .fillColor("#003d82")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("ALICI BİLGİLERİ", 60, doc.y + 5)
    .fillColor("#2d3748")
    .fontSize(10)
    .font("Helvetica")
    .text(saleData.customer_name, 60, doc.y + 25);

  if (saleData.customer_phone) {
    doc.text(`Tel: ${saleData.customer_phone}`, 60, doc.y + 35);
  }

  if (saleData.customer_address) {
    doc.text(`Adres: ${saleData.customer_address}`, 60, doc.y + 45);
  }

  doc.y = doc.y + 90;

  // Vehicle Information
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor("#003d82")
    .text("ARAÇ BİLGİLERİ", { underline: true })
    .moveDown(0.3);

  doc.fontSize(10).font("Helvetica").fillColor("#2d3748");

  const vehicleDetails = [
    `${saleData.vehicle.maker || ""} ${saleData.vehicle.model || ""}`,
    saleData.vehicle.production_year ? `Model Yılı: ${saleData.vehicle.production_year}` : "",
    saleData.vehicle.chassis_no ? `Şasi No: ${saleData.vehicle.chassis_no}` : "",
    saleData.vehicle.engine_no ? `Motor No: ${saleData.vehicle.engine_no}` : "",
    saleData.plate_number ? `Plaka: ${saleData.plate_number}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  doc.text(vehicleDetails);
  doc.moveDown(1);

  // Invoice Table Header
  const tableTop = doc.y;
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .rect(50, tableTop, 500, 25)
    .fill("#003d82")
    .text("Açıklama", 60, tableTop + 8)
    .text("Miktar", 350, tableTop + 8, { width: 60, align: "right" })
    .text("Birim Fiyat", 420, tableTop + 8, { width: 60, align: "right" })
    .text("Tutar", 490, tableTop + 8, { width: 60, align: "right" });

  // Invoice Item
  const itemTop = tableTop + 25;
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#2d3748")
    .rect(50, itemTop, 500, 30)
    .stroke()
    .text(
      `Araç Satışı - ${saleData.vehicle.maker || ""} ${saleData.vehicle.model || ""}`,
      60,
      itemTop + 10
    )
    .text("1", 350, itemTop + 10, { width: 60, align: "right" })
    .text(
      formatCurrency(saleData.sale_amount, saleData.sale_currency),
      420,
      itemTop + 10,
      { width: 60, align: "right" }
    )
    .text(
      formatCurrency(saleData.sale_amount, saleData.sale_currency),
      490,
      itemTop + 10,
      { width: 60, align: "right" }
    );

  // Total Section
  const totalTop = itemTop + 30;
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor("#003d82")
    .text("TOPLAM:", 350, totalTop + 10, { width: 140, align: "right" })
    .text(formatCurrency(saleData.sale_amount, saleData.sale_currency), 490, totalTop + 10, {
      width: 60,
      align: "right",
    });

  // Installment details if applicable
  if (saleData.installment) {
    doc.moveDown(1.5);
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#F0A500")
      .text("Ödeme Planı:", { underline: true })
      .moveDown(0.3);

    doc.fontSize(10).font("Helvetica").fillColor("#2d3748");
    doc.text(
      `Peşinat: ${formatCurrency(saleData.installment.down_payment, saleData.sale_currency)}`,
      { indent: 20 }
    );
    doc.text(
      `Kalan: ${formatCurrency(
        saleData.installment.total_amount - saleData.installment.down_payment,
        saleData.sale_currency
      )}`,
      { indent: 20 }
    );
    doc.text(
      `${saleData.installment.installment_count} x ${formatCurrency(
        saleData.installment.installment_amount,
        saleData.sale_currency
      )}`,
      { indent: 20 }
    );
  }

  doc.moveDown(2);

  // Footer
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#666")
    .text("Bu belge elektronik ortamda oluşturulmuştur.", { align: "center" });

  if (saleData.branch_name || saleData.staff_name) {
    doc.moveDown(0.5);
    if (saleData.branch_name) {
      doc.text(`Şube: ${saleData.branch_name}`, { align: "center" });
    }
    if (saleData.staff_name) {
      doc.text(`Satış Temsilcisi: ${saleData.staff_name}`, { align: "center" });
    }
  }

  // Finalize PDF
  doc.end();
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

function formatCurrency(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  const currencySymbols: Record<string, string> = {
    TRY: "₺",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  return `${formatted} ${currencySymbols[currency] || currency}`;
}

