import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/email-jobs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { cronAuthorized } = await import("../assessment-v2/email-job-policy.server");
        if (!cronAuthorized(request.headers.get("authorization"), process.env["CRON_SECRET"]))
          return new Response("Unauthorized", { status: 401 });
        try {
          const { processEmailJob } = await import("../assessment-v2/email-jobs.server");
          const result = await processEmailJob();
          return Response.json(result, { headers: { "Cache-Control": "no-store" } });
        } catch {
          return new Response("Email worker failed", {
            status: 503,
            headers: { "Cache-Control": "no-store" },
          });
        }
      },
    },
  },
});
