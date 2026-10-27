import type { CreditsResult } from "./credits.ts";

type Access = "admin" | "unauthenticated" | "forbidden" | "unavailable";
type AuthClient = {
  getUser: (
    token: string,
  ) => PromiseLike<{ data: { user: { id: string } | null }; error: unknown }>;
  getRoles: (userId: string) => PromiseLike<{ data: { role: string }[] | null; error: unknown }>;
};
export function createCreditsAuthorization(client: AuthClient) {
  return async (request: Request): Promise<Access> => {
    const header = request.headers.get("authorization");
    const token = header?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!token) return "unauthenticated";
    try {
      const { data, error } = await client.getUser(token);
      if (error || !data.user) return "unauthenticated";
      const roles = await client.getRoles(data.user.id);
      if (roles.error) return "unavailable";
      return roles.data?.some((row) => row.role === "admin") ? "admin" : "forbidden";
    } catch {
      return "unavailable";
    }
  };
}

export function createCreditsHandler({
  authorize,
  load,
}: {
  authorize: (request: Request) => Promise<Access>;
  load: (force: boolean) => Promise<CreditsResult>;
}) {
  return async (request: Request) => {
    const headers = {
      "Cache-Control": "private, no-store",
      Vary: "Authorization",
      "X-Content-Type-Options": "nosniff",
    };
    try {
      // Authorization is deliberately checked before even looking at a shared cached balance.
      const access = await authorize(request);
      if (access !== "admin")
        return Response.json(
          { available: false },
          {
            status: access === "unauthenticated" ? 401 : access === "forbidden" ? 403 : 503,
            headers,
          },
        );
      const value = await load(new URL(request.url).searchParams.get("refresh") === "1");
      return Response.json(value, { headers });
    } catch {
      return Response.json({ available: false }, { status: 503, headers });
    }
  };
}
