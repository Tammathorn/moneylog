// NFR-04, D-03 - money is integer satang everywhere except the screen.
export const MAX_SATANG = 1_000_000_000; // 10,000,000.00 THB (BR-02, BR-09)

const THB_TEXT = /^\d{1,8}(\.\d{1,2})?$/;

// "12.5" -> 1250. Null for anything that is not a non-negative amount with at
// most two decimals.
export function parseThb(text: string): number | null {
  const value = text.trim().replace(/,/g, "");
  if (!THB_TEXT.test(value)) return null;
  const [baht, satang = ""] = value.split(".");
  return Number(baht) * 100 + Number(satang.padEnd(2, "0"));
}

export function formatThb(satang: number): string {
  const sign = satang < 0 ? "-" : "";
  const abs = Math.abs(satang);
  const baht = Math.floor(abs / 100).toLocaleString("en-US");
  return `${sign}฿${baht}.${String(abs % 100).padStart(2, "0")}`;
}

export function isValidSatang(value: unknown, min = 1): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= MAX_SATANG;
}
