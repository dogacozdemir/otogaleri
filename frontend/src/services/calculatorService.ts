/**
 * Japon Araç Gümrük Hesaplama Servisi
 * Verginin vergisi matrah mantığına tam uyumlu.
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

/** Kayıt parası katsayıları: [minWeight, maxWeight, katsayı] - katsayı × 1000 = TL */
const KAYIT_KATSAYILARI: Record<Exclude<FuelType, "is_araci">, Array<[number, number, number]>> = {
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

const BANDROL_TL = 50;

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

/** Ağırlık ve yakıt tipine göre kayıt parası katsayısı (×1000 = TL) */
function getKayitKatsayisi(agirlikKg: number, yakıtTipi: Exclude<FuelType, "is_araci">): number {
  const brackets = KAYIT_KATSAYILARI[yakıtTipi];
  for (const [min, max, katsayı] of brackets) {
    if (agirlikKg >= min && agirlikKg <= max) return katsayı;
  }
  return brackets[brackets.length - 1][2];
}

/** Kayıt parası hesapla (TL). İş aracı: sabit 11.400 TL. */
export function calculateKayitParasi(
  agirlikKg: number,
  yakıtTipi: FuelType,
  isIsAraci: boolean
): number {
  if (isIsAraci || yakıtTipi === "is_araci") return 11400;
  const katsayı = getKayitKatsayisi(agirlikKg, yakıtTipi as Exclude<FuelType, "is_araci">);
  return katsayı * 1000; // Katsayı × 1000 = TL
}

export interface CalculatorInput {
  /** JSON kıymet (JPY) - vehicle select veya chassis query'den */
  kiymetJPY: number | null;
  /** Manuel girişte kullanıcının girdiği kıymet */
  manuelKiymetJPY?: number;
  gemiParasiJPY: number;
  jpyTryKuru: number;
  motorGucuCC: number;
  agirlikKg: number;
  yakıtTipi: FuelType;
  isIsAraci: boolean;
  kdvOrani: number; // 0-40 arası (0.10 = %10)
  gumrukKomisyonu: number;
  ardiye: number;
}

export interface CalculatorResult {
  cifTRY: number;
  gumrukResmi: number;
  fif: number;
  rihtim: number;
  gucFonu: number;
  bandrol: number;
  kayitParasi: number;
  kdvMatrahi: number;
  kdv: number;
  stopaj: number;
  gumrukKomisyonu: number;
  ardiye: number;
  genelToplam: number;
  /** Hesaplama yapılamadıysa sebep */
  error?: string;
}

/**
 * Hassas vergi hesaplama zinciri.
 * Sıra: CIF → Gümrük Resmi → F.İ.F → Rıhtım, Güç Fonu → KDV Matrahı → KDV, Stopaj → Genel Toplam
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
    kdvOrani,
    gumrukKomisyonu,
    ardiye,
  } = input;

  const baseKiymetJPY = kiymetJPY ?? manuelKiymetJPY ?? 0;
  if (baseKiymetJPY <= 0) {
    return zeroResult({ error: "Lütfen kıymet bilgisini giriniz (JPY)." });
  }
  if (gemiParasiJPY < 0) {
    return zeroResult({ error: "Lütfen gemi parası bilgisini giriniz (JPY)." });
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

  // 1. CIF Bedeli (TRY)
  const toplamJPY = baseKiymetJPY + gemiParasiJPY;
  const cifTRY = toplamJPY * jpyTryKuru;

  // 2. Gümrük Resmi: CIF × %10
  const gumrukResmi = cifTRY * 0.1;

  // 3. F.İ.F: Motor gücüne göre × CIF
  const fifRate = getFIFRateFromCC(motorGucuCC);
  const fif = cifTRY * fifRate;

  // 4. Rıhtım (%4.4) ve Güç Fonu (%2.5): CIF üzerinden
  const rihtim = cifTRY * 0.044;
  const gucFonu = cifTRY * 0.025;

  // 5. Bandrol ve Kayıt Parası
  const bandrol = BANDROL_TL;
  const kayitParasi = calculateKayitParasi(agirlikKg, yakıtTipi, isIsAraci);

  // 6. KDV Matrahı = CIF + Gümrük Resmi + F.İ.F + Rıhtım + Güç Fonu + Bandrol + Kayıt Parası
  const kdvMatrahi =
    cifTRY + gumrukResmi + fif + rihtim + gucFonu + bandrol + kayitParasi;

  // 7. Stopaj (%4): CIF üzerinden - KDV matrahına DAHİL DEĞİL
  const stopaj = cifTRY * 0.04;

  // 8. KDV: KDV Matrahı × Slider oranı
  const kdv = kdvMatrahi * kdvOrani;

  // 9. Genel Toplam = KDV Matrahı + KDV + Stopaj + Gümrük Komisyonu + Ardiye
  const genelToplam =
    kdvMatrahi + kdv + stopaj + gumrukKomisyonu + ardiye;

  return {
    cifTRY,
    gumrukResmi,
    fif,
    rihtim,
    gucFonu,
    bandrol,
    kayitParasi,
    kdvMatrahi,
    kdv,
    stopaj,
    gumrukKomisyonu,
    ardiye,
    genelToplam,
  };
}

function zeroResult(extra: { error?: string }): CalculatorResult {
  return {
    cifTRY: 0,
    gumrukResmi: 0,
    fif: 0,
    rihtim: 0,
    gucFonu: 0,
    bandrol: 0,
    kayitParasi: 0,
    kdvMatrahi: 0,
    kdv: 0,
    stopaj: 0,
    gumrukKomisyonu: 0,
    ardiye: 0,
    genelToplam: 0,
    ...extra,
  };
}

/**
 * Şasi numarasında kod ara – JSON'daki TÜM kodları tara.
 * chassis.includes(kod) mantığıyla metin içi arama.
 * En uzun eşleşen kodu döndür (daha spesifik).
 */
export function findChassisMatchInJson(
  chassis: string,
  data: JaponKiymetData
): { marka: string; model: string; kod: string; motor_gucu: string; kiymetler: Record<string, number | null> } | null {
  const upper = chassis.trim().toUpperCase();
  if (!upper || !data) return null;

  let bestMatch: { marka: string; model: string; kod: string; motor_gucu: string; kiymetler: Record<string, number | null> } | null = null;
  let bestKodLength = 0;

  for (const [marka, models] of Object.entries(data)) {
    for (const [model, codes] of Object.entries(models)) {
      for (const [kod, vehicleData] of Object.entries(codes)) {
        if (upper.includes(kod) && kod.length > bestKodLength) {
          bestKodLength = kod.length;
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

/**
 * Model için ilk (veya tek) kodu döndür – kullanıcı Kod seçmez.
 */
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
