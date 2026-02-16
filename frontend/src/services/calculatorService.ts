/**
 * Japon Araç Gümrük Hesaplama Servisi
 *
 * Genel Toplam = 4 kalem:
 * 1. Kalem: Stopaj + KDV + FIF + İthalat-İhracat + GK Güç Fonu + Bandrol + Gümrük Resmi (hepsi kalem fiyat üzerinden)
 * 2. Kalem: Kayıt parası (kalem fiyat × %4 hybrid/elektrik veya %6 benzin/dizel)
 * 3. Kalem: Gümrük komisyonu
 * 4. Kalem: Ağırlık katsayısı (kg × birim) veya iş aracı sabit 11.400 TL
 *
 * Fatura = (Gümrük bedeli + Kalem fiyat) + Vergi
 */

export type FuelType = "benzinli" | "dizel" | "hybrid" | "elektrikli" | "is_araci";
export type InputMode = "vehicle_select" | "chassis_query" | "manual";

export type JaponKiymetData = Record<
  string,
  Record<
    string,
    Record<
      string,
      { motor_gucu: string; kiymetler: Record<string, number | null> }
    >
  >
>;

/** Ağırlığa göre katsayı tablosu: [minWeight, maxWeight, birim] - Miktar = Ağırlık (KG) × Birim */
const AGIRLIK_KATSAYILARI: Record<Exclude<FuelType, "is_araci">, Array<[number, number, number]>> = {
  benzinli: [
    [0, 1016, 1.5],
    [1017, 1270, 2.6],
    [1271, 1524, 6.3],
    [1525, 99999, 9.0],
  ],
  dizel: [
    [0, 1016, 2.17],
    [1017, 1270, 3.83],
    [1271, 1524, 9.62],
    [1525, 99999, 13.4],
  ],
  hybrid: [
    [0, 1016, 1.3],
    [1017, 1270, 2.1],
    [1271, 1524, 4.6],
    [1525, 99999, 6.4],
  ],
  elektrikli: [
    [0, 1366, 0.84],
    [1367, 1670, 1.47],
    [1671, 1974, 3.14],
    [1975, 99999, 4.6],
  ],
};

/** İş aracı (çift kabin, panel van) sabit ücreti - TL */
const IS_ARACI_SABIT_TL = 11400;

/** Motor gücüne göre F.İ.F oranı: <2000cc %3, 2000-3000cc %6, >3000cc %8 */
export function getFIFRateFromCC(cc: number): number {
  if (cc < 2000) return 0.03;
  if (cc <= 3000) return 0.06;
  return 0.08;
}

/** "1498 CC" formatından CC sayısını çıkar */
export function parseMotorGucuCC(motorGucu: string): number {
  const match = motorGucu?.match(/(\d+)\s*CC/i);
  return match ? parseInt(match[1], 10) : 0;
}

/** Ağırlık ve yakıt tipine göre birim (katsayı) değeri */
function getAgirlikKatsayisi(agirlikKg: number, yakıtTipi: Exclude<FuelType, "is_araci">): number {
  const brackets = AGIRLIK_KATSAYILARI[yakıtTipi];
  for (const [min, max, katsayı] of brackets) {
    if (agirlikKg >= min && agirlikKg <= max) return katsayı;
  }
  return brackets[brackets.length - 1][2];
}

/** 4. Kalem: Ağırlığa göre katsayı hesabı (TL). İş aracı: sabit 11.400 TL. Diğerleri: Ağırlık × Birim */
function calculateAgirlikKatsayisi(
  agirlikKg: number,
  yakıtTipi: FuelType,
  isIsAraci: boolean
): number {
  if (isIsAraci || yakıtTipi === "is_araci") return IS_ARACI_SABIT_TL;
  const katsayı = getAgirlikKatsayisi(agirlikKg, yakıtTipi as Exclude<FuelType, "is_araci">);
  return agirlikKg * katsayı; // Ağırlık (KG) × Birim = TL
}

/** 2. Kalem: Kayıt parası oranı. Benzin/Dizel %6, Hybrid/Elektrikli %4. İş aracı: alt yakıt tipine göre */
function calculateKayitParasiOrani(
  yakıtTipi: FuelType,
  isAraciYakitTipi?: "benzinli" | "dizel" | "hybrid" | "elektrikli"
): number {
  if (yakıtTipi === "is_araci") {
    const alt = isAraciYakitTipi ?? "dizel";
    return alt === "benzinli" || alt === "dizel" ? 0.06 : 0.04;
  }
  if (yakıtTipi === "benzinli" || yakıtTipi === "dizel") return 0.06;
  return 0.04; // hybrid, elektrikli
}

export interface CalculatorInput {
  kiymetJPY: number | null;
  manuelKiymetJPY?: number;
  gemiParasiJPY: number;
  jpyTryKuru: number;
  motorGucuCC: number;
  agirlikKg: number;
  yakıtTipi: FuelType;
  isIsAraci: boolean;
  /** İş aracı ise alt yakıt tipi (benzin/dizel/hybrid/elektrik). Yoksa dizel varsayılır. */
  isAraciYakitTipi?: "benzinli" | "dizel" | "hybrid" | "elektrikli";
  kdvOrani: number;
  gumrukKomisyonu: number;
}

export interface CalculatorResult {
  /** Kalem Fiyatı (CIF) = araç kıymeti + navlun, TRY */
  cifTRY: number;
  /** 1. Kalem alt bileşenleri (kalem fiyat üzerinden hesaplanan, eklenmeyen) */
  stopaj: number;
  kdv: number;
  fif: number;
  ithalatIhracat: number;
  gkGucFonu: number;
  bandrol: number;
  gumrukResmi: number;
  /** 1. Kalem toplamı */
  birinciKalem: number;
  /** 2. Kalem: Kayıt parası */
  kayitParasi: number;
  /** 3. Kalem: Gümrük komisyonu */
  gumrukKomisyonu: number;
  /** 4. Kalem: Ağırlık katsayısı */
  agirlikKatsayisi: number;
  /** Genel Toplam = 1. + 2. + 3. + 4. kalem */
  genelToplam: number;
  /** Fatura: (Gümrük bedeli + Kalem fiyat) + Vergi */
  faturaMatrah: number;
  faturaVergi: number;
  faturaToplam: number;
  error?: string;
}

/**
 * Genel Toplam = 4 kalem:
 * 1. Kalem: Stopaj + KDV + FIF + İthalat-İhracat + GK Güç Fonu + Bandrol + Gümrük Resmi (kalem fiyat üzerinden)
 * 2. Kalem: Kayıt parası (kalem fiyat × %4 hybrid/elektrik veya %6 benzin/dizel)
 * 3. Kalem: Gümrük komisyonu
 * 4. Kalem: Ağırlık katsayısı (kg × birim) veya iş aracı sabit 11.400 TL
 */
export function calculateCustomsTax(input: CalculatorInput): CalculatorResult {
  const {
    kiymetJPY,
    manuelKiymetJPY,
    gemiParasiJPY,
    jpyTryKuru,
    motorGucuCC,
    agirlikKg,
    yakıtTipi,
    isIsAraci,
    isAraciYakitTipi,
    kdvOrani,
    gumrukKomisyonu,
  } = input;

  const baseKiymetJPY = kiymetJPY ?? manuelKiymetJPY ?? 0;
  if (baseKiymetJPY <= 0) {
    return zeroResult({ error: "Lütfen kıymet bilgisini giriniz (JPY)." });
  }
  if (gemiParasiJPY < 0) {
    return zeroResult({ error: "Lütfen navlun bilgisini giriniz (JPY)." });
  }
  if (!jpyTryKuru || jpyTryKuru <= 0) {
    return zeroResult({ error: "Lütfen JPY/TRY kur bilgisini giriniz veya kuru yükleyiniz." });
  }
  if (motorGucuCC <= 0 && !input.manuelKiymetJPY) {
    return zeroResult({ error: "Lütfen motor gücü (CC) bilgisini giriniz." });
  }
  if (agirlikKg <= 0) {
    return zeroResult({ error: "Lütfen ağırlık bilgisini giriniz (kg)." });
  }

  // Kalem Fiyatı (CIF) = araç kıymeti + navlun
  const kalemFiyat = (baseKiymetJPY + gemiParasiJPY) * jpyTryKuru;

  // 1. Kalem: Kalem fiyat üzerinden hesaplanan kalemler (eklenmez, toplanır)
  const stopaj = kalemFiyat * 0.04; // %4
  const kdv = kalemFiyat * kdvOrani; // Kullanıcı seçimi
  const fifOrani = getFIFRateFromCC(motorGucuCC);
  const fif = kalemFiyat * fifOrani;
  const ithalatIhracat = kalemFiyat * 0.044; // %4.4
  const gkGucFonu = kalemFiyat * 0.025; // %2.5
  const bandrol = 50; // Sabit
  const gumrukResmi = kalemFiyat * 0.1; // %10
  const birinciKalem = stopaj + kdv + fif + ithalatIhracat + gkGucFonu + bandrol + gumrukResmi;

  // 2. Kalem: Kayıt parası
  const kayitParasiOrani = calculateKayitParasiOrani(yakıtTipi, isAraciYakitTipi);
  const kayitParasi = kalemFiyat * kayitParasiOrani;

  // 3. Kalem: Gümrük komisyonu
  const gumrukKomisyonuTL = gumrukKomisyonu;

  // 4. Kalem: Ağırlık katsayısı
  const agirlikKatsayisi = calculateAgirlikKatsayisi(agirlikKg, yakıtTipi, isIsAraci);

  // Genel Toplam = 1. + 2. + 3. + 4. kalem
  const genelToplam = birinciKalem + kayitParasi + gumrukKomisyonuTL + agirlikKatsayisi;

  // Fatura = (CIF + 1. kalem) + KDV
  const faturaMatrah = kalemFiyat + birinciKalem;
  const faturaVergi = faturaMatrah * kdvOrani;
  const faturaToplam = faturaMatrah + faturaVergi;

  return {
    cifTRY: kalemFiyat,
    stopaj,
    kdv,
    fif,
    ithalatIhracat,
    gkGucFonu,
    bandrol,
    gumrukResmi,
    birinciKalem,
    kayitParasi,
    gumrukKomisyonu: gumrukKomisyonuTL,
    agirlikKatsayisi,
    genelToplam,
    faturaMatrah,
    faturaVergi,
    faturaToplam,
  };
}

function zeroResult(extra: { error?: string }): CalculatorResult {
  return {
    cifTRY: 0,
    stopaj: 0,
    kdv: 0,
    fif: 0,
    ithalatIhracat: 0,
    gkGucFonu: 0,
    bandrol: 0,
    gumrukResmi: 0,
    birinciKalem: 0,
    kayitParasi: 0,
    gumrukKomisyonu: 0,
    agirlikKatsayisi: 0,
    genelToplam: 0,
    faturaMatrah: 0,
    faturaVergi: 0,
    faturaToplam: 0,
    ...extra,
  };
}

/** Eski calculateKayitParasi - ağırlık katsayısı için (geriye uyumluluk, artık kullanılmıyor) */
export function calculateKayitParasi(
  agirlikKg: number,
  yakıtTipi: FuelType,
  isIsAraci: boolean
): number {
  return calculateAgirlikKatsayisi(agirlikKg, yakıtTipi, isIsAraci);
}

/**
 * Şasi numarasında kod ara – JSON'daki TÜM kodları tara.
 */
/** Boşlukları kaldırarak şasi/kod karşılaştırması: "E 12" ve "E12" aynı sayılır */
function normalizeChassis(s: string): string {
  return (s || "").trim().replace(/\s+/g, "").toUpperCase();
}

export function findChassisMatchInJson(
  chassis: string,
  data: JaponKiymetData
): { marka: string; model: string; kod: string; motor_gucu: string; kiymetler: Record<string, number | null> } | null {
  const normalizedChassis = normalizeChassis(chassis);
  if (!normalizedChassis || !data) return null;

  let bestMatch: { marka: string; model: string; kod: string; motor_gucu: string; kiymetler: Record<string, number | null> } | null = null;
  let bestKodLength = 0;

  for (const [marka, models] of Object.entries(data)) {
    for (const [model, codes] of Object.entries(models)) {
      for (const [kod, vehicleData] of Object.entries(codes)) {
        const normalizedKod = normalizeChassis(kod);
        if (normalizedChassis.includes(normalizedKod) && normalizedKod.length > bestKodLength) {
          bestKodLength = normalizedKod.length;
          bestMatch = {
            marka,
            model,
            kod,
            motor_gucu: vehicleData.motor_gucu,
            kiymetler: vehicleData.kiymetler,
          };
        }
      }
    }
  }
  return bestMatch;
}

export function getFirstCodeForModel(
  data: JaponKiymetData,
  marka: string,
  model: string
): string | null {
  const codes = data?.[marka]?.[model];
  if (!codes) return null;
  const keys = Object.keys(codes);
  return keys.length > 0 ? keys[0] : null;
}
