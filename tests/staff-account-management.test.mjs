import assert from "node:assert/strict";
import test from "node:test";
import { createStaffAccountService } from "../src/staff/account-service.server.ts";
const actor = "11111111-1111-4111-8111-111111111111",
  target = "22222222-2222-4222-8222-222222222222";
function client(role = "admin", options = {}) {
  const calls = [];
  const db = {
    calls,
    from(table) {
      let operation = "read",
        values;
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        in() {
          return query;
        },
        insert(v) {
          operation = "insert";
          values = v;
          return query;
        },
        update(v) {
          operation = "update";
          values = v;
          return query;
        },
        then(resolve) {
          calls.push({ table, operation, values });
          return Promise.resolve({
            error: options.roleError ? {} : null,
            data: table === "user_roles" ? [{ user_id: actor, role }] : [],
          }).then(resolve);
        },
      };
      return query;
    },
    async rpc(name, args) {
      calls.push({ rpc: name, args });
      return { error: options.rpcError ? {} : null };
    },
    auth: {
      admin: {
        async createUser(values) {
          calls.push({ createUser: values });
          return options.duplicate
            ? { error: {}, data: { user: null } }
            : { data: { user: { id: target } } };
        },
        async deleteUser(id) {
          calls.push({ deleteUser: id });
          return { error: options.deleteError ?? null };
        },
        async getUserById(id) {
          calls.push({ getUserById: id });
          return {
            data: {
              user: {
                id,
                email: "staff@example.invalid",
                created_at: "2026-10-07T00:00:00Z",
                user_metadata: {},
              },
            },
          };
        },
      },
    },
  };
  return db;
}
test("ordinary staff and failed role reads cannot list, create or delete accounts", async () => {
  for (const c of [client("staff"), client("admin", { roleError: true })]) {
    const service = createStaffAccountService(c);
    await assert.rejects(service.list(actor), /Administrator/);
    await assert.rejects(
      service.create(actor, { email: "new@example.invalid", name: "Test" }),
      /Administrator/,
    );
    await assert.rejects(
      service.remove(actor, { id: target, confirmEmail: "staff@example.invalid" }),
      /Administrator/,
    );
    assert.ok(c.calls.every((call) => call.table === "user_roles" && call.operation === "read"));
  }
});
test("new accounts receive a random password and only a transactional staff role grant", async () => {
  const c = client(),
    service = createStaffAccountService(c);
  const result = await service.create(actor, { email: "new@example.invalid", name: "Test" });
  assert.ok(result.password.length >= 24);
  assert.equal(c.calls.find((call) => call.createUser).createUser.email_confirm, true);
  assert.deepEqual(c.calls.find((call) => call.rpc).args, {
    p_actor: actor,
    p_target: target,
    p_email: "new@example.invalid",
  });
  assert.equal(c.calls.find((call) => call.rpc).rpc, "grant_new_staff_account");
  assert.ok(!JSON.stringify(c.calls.filter((call) => !call.createUser)).includes(result.password));
});
test("duplicate emails are not silently granted access or assigned another password", async () => {
  const c = client("admin", { duplicate: true });
  await assert.rejects(
    createStaffAccountService(c).create(actor, { email: "existing@example.invalid", name: "" }),
    /already has an account/,
  );
  assert.ok(!c.calls.some((call) => call.rpc || call.deleteUser));
});
test("self deletion and a rejected database deletion guard never reach Auth deletion", async () => {
  const c = client();
  await assert.rejects(
    createStaffAccountService(c).remove(actor, {
      id: actor,
      confirmEmail: "owner@example.invalid",
    }),
    /own account/,
  );
  assert.ok(!c.calls.some((call) => call.rpc || call.deleteUser));
  const rejected = client("admin", { rpcError: true });
  await assert.rejects(
    createStaffAccountService(rejected).remove(actor, {
      id: target,
      confirmEmail: "wrong@example.invalid",
    }),
    /not authorized/,
  );
  assert.ok(!rejected.calls.some((call) => call.deleteUser));
});
test("access is revoked before Auth deletion and failed deletion stays revoked and retryable", async () => {
  const c = client("admin", { deleteError: { code: "unexpected_failure" } });
  await assert.rejects(
    createStaffAccountService(c).remove(actor, {
      id: target,
      confirmEmail: "staff@example.invalid",
    }),
    /needs a retry/,
  );
  assert.ok(
    c.calls.findIndex((call) => call.rpc === "begin_staff_account_deletion") <
      c.calls.findIndex((call) => call.deleteUser),
  );
  assert.ok(
    c.calls.some(
      (call) => call.table === "staff_account_deletions" && call.values.status === "failed",
    ),
  );
  assert.ok(!c.calls.some((call) => call.table === "user_roles" && call.operation === "insert"));
});
test("a known already-deleted Auth identity completes a previously interrupted deletion", async () => {
  const c = client("admin", { deleteError: { code: "user_not_found" } });
  assert.deepEqual(
    await createStaffAccountService(c).remove(actor, {
      id: target,
      confirmEmail: "staff@example.invalid",
    }),
    { deleted: true },
  );
  assert.ok(
    c.calls.some(
      (call) => call.table === "staff_account_deletions" && call.values.status === "deleted",
    ),
  );
});
