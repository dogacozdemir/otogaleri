import path from "path";
import fs from "fs";

export type JaponKiymetData = Record<
  string,
  Record<
    string,
    Record<
      string,
      {
        motor_gucu: string;
        kiymetler: Record<string, number | null>;
      }
    >
  >
>;

let cachedData: JaponKiymetData | null = null;

/**
 * Load master_japon_kiymetleri.json into memory at startup.
 * Call this once when server starts.
 */
export function loadJaponKiymetCache(): JaponKiymetData {
  if (cachedData) return cachedData;

  const dataPath = path.join(__dirname, "../data/master_japon_kiymetleri.json");
  const raw = fs.readFileSync(dataPath, "utf-8");
  cachedData = JSON.parse(raw) as JaponKiymetData;
  console.log("[japon-kiymet] Loaded master data into cache");
  return cachedData;
}

/**
 * Get cached japon kiymet data. Returns null if not loaded.
 */
export function getJaponKiymetCache(): JaponKiymetData | null {
  return cachedData;
}

/**
 * Extract CC (motor hacmi) from "1498 CC" format
 */
export function parseMotorGucuCC(motorGucu: string): number {
  const match = motorGucu?.match(/(\d+)\s*CC/i);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Get FIF rate based on motor power (CC):
 * <2000: 3%, 2000-3000: 6%, >3000: 8%
 */
export function getFIFRateFromCC(cc: number): number {
  if (cc < 2000) return 0.03;
  if (cc <= 3000) return 0.06;
  return 0.08;
}
