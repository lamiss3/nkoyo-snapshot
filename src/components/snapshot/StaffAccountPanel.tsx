import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStaffAccounts, createStaffAccount, deleteStaffAccount } from "@/staff/account-actions";

const button =
  "rounded-full border border-border px-4 py-2 text-sm font-bold disabled:opacity-50 hover:bg-muted";
const input = "mt-2 w-full rounded-xl border border-input bg-card px-4 py-3";
export function StaffAccountPanel({ currentUserId }: { currentUserId: string }) {
  const query = useQuery({
    queryKey: ["staff-accounts", currentUserId],
    queryFn: () => getStaffAccounts(),
    refetchInterval: 30000,
  });
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [target, setTarget] = useState<{ id: string; email: string } | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    setCreated(null);
    try {
      setCreated(await createStaffAccount({ data: { email, name } }));
      setEmail("");
      setName("");
      await query.refetch();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (event: FormEvent) => {
    event.preventDefault();
    if (!target) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await deleteStaffAccount({ data: { id: target.id, confirmEmail: confirmation } });
      setNotice(`Account deleted: ${target.email}`);
      setTarget(null);
      setConfirmation("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete the account.");
    } finally {
      await query.refetch();
      setBusy(false);
    }
  };
  return (
    <section
      id="staff-accounts"
      className="card-elevated mt-10 p-6 sm:p-9"
      aria-labelledby="staff-accounts-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="staff-accounts-title" className="text-2xl font-black">
          Staff accounts
        </h2>
        <button className={button} onClick={() => void query.refetch()}>
          Refresh accounts
        </button>
      </div>
      <p className="mt-3 text-muted-foreground">
        Administrators manage accounts here. Staff can read private assessment records, captured
        emails and model logs.
      </p>
      {(error || query.error) && (
        <p role="alert" className="mt-4 text-destructive">
          {error || query.error?.message}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4">
          {notice}
        </p>
      )}
      <form onSubmit={create} className="mt-6 rounded-xl border border-border p-5">
        <h3 className="font-bold">Create a staff account</h3>
        <label htmlFor="staff-name" className="mt-4 block text-sm font-semibold">
          Name (optional)
        </label>
        <input
          id="staff-name"
          className={input}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
        />
        <label htmlFor="staff-email" className="mt-4 block text-sm font-semibold">
          Staff email
        </label>
        <input
          id="staff-email"
          type="email"
          required
          className={input}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={255}
        />
        <p className="mt-3 text-sm text-muted-foreground">
          A random password is shown once after creation. Share it privately with the intended staff
          member.
        </p>
        <button type="submit" className={`${button} mt-4`} disabled={busy}>
          {busy ? "Working…" : "Create staff account"}
        </button>
      </form>
      {created && (
        <div role="status" className="mt-5 rounded-xl bg-muted p-5">
          <p className="font-bold">Account created for {created.email}</p>
          <p className="mt-2 text-sm">Save this password before closing this message.</p>
          <code className="mt-3 block break-all select-all">{created.password}</code>
          <button className={`${button} mt-4`} onClick={() => setCreated(null)}>
            Hide password
          </button>
        </div>
      )}
      {query.isPending && (
        <p role="status" className="mt-5">
          Loading accounts…
        </p>
      )}
      <div className="mt-6 space-y-3">
        {query.data?.map((account) => (
          <div
            key={account.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-4"
          >
            <div className="min-w-0">
              <p className="font-bold break-all">{account.email}</p>
              <p className="mt-1 text-sm">
                {account.name ? `${account.name} · ` : ""}
                {account.role === "admin" ? "Administrator" : "Staff"}
                {account.id === currentUserId ? " · Your account" : ""} ·{" "}
                {account.status.replaceAll("_", " ")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Last sign-in:{" "}
                {account.lastSignInAt ? new Date(account.lastSignInAt).toLocaleString() : "Never"}
              </p>
            </div>
            <button
              className={`${button} text-destructive`}
              disabled={
                busy ||
                account.id === currentUserId ||
                (account.role === "admin" &&
                  query.data!.filter((item) => item.role === "admin").length <= 1)
              }
              onClick={() => {
                setTarget({ id: account.id, email: account.email });
                setConfirmation("");
                setError("");
              }}
            >
              {account.status === "deletion_pending" ? "Retry deletion" : "Delete account"}
            </button>
          </div>
        ))}
      </div>
      {target && (
        <form
          onSubmit={remove}
          className="mt-6 rounded-xl border border-destructive p-5"
          aria-label="Confirm account deletion"
        >
          <h3 className="font-bold">Delete {target.email}?</h3>
          <p className="mt-3 text-sm">
            This permanently deletes the sign-in account and removes dashboard access. Assessment
            records and reports are retained. This cannot be undone.
          </p>
          <label htmlFor="staff-delete-confirm" className="mt-4 block text-sm font-semibold">
            Type the account email to confirm
          </label>
          <input
            id="staff-delete-confirm"
            type="email"
            required
            className={input}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              className={`${button} text-destructive`}
              disabled={busy || confirmation.trim().toLowerCase() !== target.email.toLowerCase()}
            >
              Permanently delete account
            </button>
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => setTarget(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
