import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "../integrations/supabase/auth-middleware";

const email = z
  .string()
  .trim()
  .email()
  .max(255)
  .transform((value) => value.toLowerCase());
export const getStaffAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) =>
    (await (await import("./account-service.server")).staffAccountService()).list(context.userId),
  );
export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({ email, name: z.string().trim().max(100) })
      .strict()
      .parse(data),
  )
  .handler(async ({ context, data }) =>
    (await (await import("./account-service.server")).staffAccountService()).create(
      context.userId,
      data,
    ),
  );
export const deleteStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ id: z.string().uuid(), confirmEmail: email }).strict().parse(data),
  )
  .handler(async ({ context, data }) =>
    (await (await import("./account-service.server")).staffAccountService()).remove(
      context.userId,
      data,
    ),
  );
