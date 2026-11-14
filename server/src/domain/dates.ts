// BR-10, AS-02 - calendar dates as YYYY-MM-DD strings, "today" in Asia/Bangkok.
export const MIN_DATE = "2000-01-01";

export function todayInBangkok(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// A real date inside [2000-01-01, today in Bangkok].
export function isAllowedDate(value: unknown, now = new Date()): value is string {
  return isCalendarDate(value) && value >= MIN_DATE && value <= todayInBangkok(now);
}

export function toDbDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function fromDbDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
