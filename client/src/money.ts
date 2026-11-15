// Same rules as server/src/domain/money.ts (NFR-04). The server re-validates.
const THB_TEXT = /^\d{1,8}(\.\d{1,2})?$/;

export function parseThb(text: string): number | null {
  const value = text.trim().replace(/,/g, "");
  if (!THB_TEXT.test(value)) return null;
  const [baht, satang = ""] = value.split(".");
  return Number(baht) * 100 + Number(satang.padEnd(2, "0"));
}

export function formatThb(satang: number): string {
  const sign = satang < 0 ? "-" : "";
  const abs = Math.abs(satang);
  return `${sign}฿${Math.floor(abs / 100).toLocaleString("en-US")}.${String(abs % 100).padStart(2, "0")}`;
}

export const todayBangkok = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

export const TYPE_LABEL: Record<string, string> = {
  CASH: "Cash & bank", LOAN_TAKEN: "Loans taken & credit cards", LOAN_GIVEN: "Loans given (owed to you)", INCOME: "Income", EXPENSE: "Expenses",
};
