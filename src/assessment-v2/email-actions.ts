import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "../integrations/supabase/auth-middleware";

const owner = z.object({
  sessionId: z.string().uuid(),
  traceToken: z.string().regex(/^[a-f0-9]{64}$/),
});
export const requestPersonalizedEmails = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    owner
      .extend({
        email: z
          .string()
          .trim()
          .email()
          .max(255)
          .transform((value) => value.toLowerCase()),
        consent: z.boolean(),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }) => (await import("./email-jobs.server")).captureEmailRequest(data));
export const prepareOwnedEmailDrafts = createServerFn({ method: "POST" })
  .validator((data: unknown) => owner.strict().parse(data))
  .handler(async ({ data }) => (await import("./email-jobs.server")).processOwnedEmail(data));
export const getEmailJourneys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const jobs = await import("./email-jobs.server");
    await jobs.requireEmailStaff(context.supabase, context.userId);
    return {
      jobs: await jobs.listEmailJobs(),
      kitConfigured: Boolean(
        process.env["KIT_API_KEY"] &&
        process.env["KIT_SENDER_EMAIL"] &&
        process.env["KIT_CLASSIC_TEMPLATE_ID"],
      ),
      kitMode: process.env["KIT_MODE"] === "production" ? "production" : "test",
      deliveryEnabled: false,
      fixedTestEnabled:
        process.env["KIT_MODE"] === "test" && Boolean(process.env["KIT_TEST_EMAILS"]),
    };
  });
export const prepareFixedTestEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        sessionId: z.string().uuid(),
        email: z
          .string()
          .trim()
          .email()
          .max(255)
          .transform((value) => value.toLowerCase()),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const jobs = await import("./email-jobs.server");
    await jobs.requireEmailStaff(context.supabase, context.userId);
    return jobs.createFixedTestEmailJob(data.sessionId, data.email, context.userId);
  });
export const manageEmailJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({ id: z.string().uuid(), action: z.enum(["generate", "approve", "kit_drafts"]) })
      .strict()
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const jobs = await import("./email-jobs.server");
    await jobs.requireEmailStaff(context.supabase, context.userId);
    if (data.action === "generate") return jobs.processEmailJob(data.id, true);
    if (data.action === "approve") return jobs.approveEmailJob(data.id, context.userId);
    return (await import("./kit-jobs.server")).prepareKitJob(data.id, context.userId);
  });
