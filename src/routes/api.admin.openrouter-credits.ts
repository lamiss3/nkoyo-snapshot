import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/openrouter-credits")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { createCreditsHandler, createCreditsAuthorization } =
          await import("../admin/credits-http.server");
        const { loadCredits } = await import("../admin/credits-service.server");
        const { supabaseAdmin } = await import("../integrations/supabase/client.server");
        return createCreditsHandler({
          authorize: createCreditsAuthorization({
            getUser: (token) => supabaseAdmin.auth.getUser(token),
            getRoles: async (userId) => {
              const result = await supabaseAdmin
                .from("user_roles")
                .select("role")
                .eq("user_id", userId);
              return { data: result.data, error: result.error };
            },
          }),
          load: loadCredits,
        })(request);
      },
    },
  },
});
