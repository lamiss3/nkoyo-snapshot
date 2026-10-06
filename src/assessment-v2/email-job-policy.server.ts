import { createHash, timingSafeEqual } from "node:crypto";

export function assertFixedEmailTestAllowed(
  mode: string | undefined,
  email: string,
  allowlist: string | undefined,
) {
  const allowed = (allowlist ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (mode !== "test" || !allowed.includes(email.toLowerCase()))
    throw new Error(
      "Fixed email tests require Kit test mode and an explicitly allowed test address.",
    );
}

export function verifyEmailCapability(token: string, savedHash: string) {
  if (!/^[a-f0-9]{64}$/.test(token) || !/^[a-f0-9]{64}$/.test(savedHash))
    throw new Error("Invalid report request.");
  const wanted = createHash("sha256").update(token).digest();
  if (!timingSafeEqual(wanted, Buffer.from(savedHash, "hex")))
    throw new Error("This assessment belongs to another session.");
}
export function cronAuthorized(header: string | null, secret: string | undefined) {
  if (!secret || secret.length < 32 || !header) return false;
  const actual = Buffer.from(header),
    expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function safeJobError(error: unknown): string {
  // No provider bodies, answers, API keys or network request details in user-facing errors.
  if (
    error instanceof Error &&
    /Gemini (email generation failed \(\d{3}\)|returned|changed|cited)/.test(error.message)
  )
    return error.message.slice(0, 200);
  return "Email preparation failed. Staff can inspect the model log and retry.";
}
