import { z } from "zod";

const thresholds = z.object({
  low: z.number().finite().nonnegative(),
  critical: z.number().finite().nonnegative(),
});
const common = {
  thresholds,
  lastSuccessfulRefresh: z.string().datetime().nullable(),
  nextManualRefreshAt: z.string().datetime().nullable(),
};
export const creditsResultSchema = z.discriminatedUnion("available", [
  z.object({
    ...common,
    available: z.literal(true),
    remaining: z.number().finite(),
    totalCredits: z.number().finite().nonnegative(),
    totalUsage: z.number().finite().nonnegative(),
    status: z.enum(["healthy", "low", "critical"]),
  }),
  z.object({ ...common, available: z.literal(false) }),
]);
export type CreditsResult = z.infer<typeof creditsResultSchema>;

export function creditStatus(remaining: number, limits: { low: number; critical: number }) {
  return remaining < limits.critical ? "critical" : remaining <= limits.low ? "low" : "healthy";
}
export function creditDollars(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}
