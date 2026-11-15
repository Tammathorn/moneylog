import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// NFR-02 / system SDS section 6. Stored as scrypt$N$r$p$saltHex$hashHex so the
// cost parameters travel with the hash.
const N = 16_384;
const R = 8;
const P = 1;
const KEY_BYTES = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_BYTES, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("hex"), hash.toString("hex")].join("$");
}

const DECOY_SALT = Buffer.alloc(16);
let decoy: Buffer | null = null;

// True only for the right password. A null/unreadable hash still costs one
// scrypt derivation so an unknown e-mail cannot be detected by timing (BR-24).
export function verifyPassword(stored: string | null, password: string): boolean {
  const parts = stored?.split("$");
  if (parts && parts.length === 6 && parts[0] === "scrypt") {
    const [n, r, p] = parts.slice(1, 4).map(Number);
    const salt = Buffer.from(parts[4], "hex");
    const expected = Buffer.from(parts[5], "hex");
    try {
      const derived = scryptSync(password, salt, expected.length, { N: n, r, p });
      return expected.length > 0 && timingSafeEqual(derived, expected);
    } catch {
      // fall through to the decoy
    }
  }
  decoy ??= scryptSync("", DECOY_SALT, KEY_BYTES, { N, r: R, p: P });
  timingSafeEqual(scryptSync(password, DECOY_SALT, KEY_BYTES, { N, r: R, p: P }), decoy);
  return false;
}
