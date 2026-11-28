// F-16 FR-22 (contract docs/sprints/sprint-3/F-16-credentials.md §3 steps 2-3). Pure: no DB.
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

export function checkNewPassword(current: unknown, next: unknown): { ok: true; value: string } | { ok: false; fields: Record<string, string> } {
  if (typeof current !== "string" || !current) return { ok: false, fields: { currentPassword: "Enter your current password." } };
  if (typeof next !== "string" || next.length < PASSWORD_MIN || next.length > PASSWORD_MAX) {
    return { ok: false, fields: { newPassword: `Use ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.` } };
  }
  if (next === current) return { ok: false, fields: { newPassword: "Choose a password different from the current one." } };
  return { ok: true, value: next };
}
