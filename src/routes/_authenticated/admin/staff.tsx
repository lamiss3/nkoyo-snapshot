import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdminAccess } from "@/admin/access";
import { Card, adminButton } from "@/admin/ui";
import { StaffAccountPanel } from "@/components/snapshot/StaffAccountPanel";
export const Route = createFileRoute("/_authenticated/admin/staff")({ component: StaffPage });
function StaffPage() {
  const { user, isAdmin } = useAdminAccess();
  return isAdmin ? (
    <StaffAccountPanel currentUserId={user.id} />
  ) : (
    <Card>
      <h2 className="text-xl font-black">Administrator access required</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Only administrators can view or manage staff accounts. Your existing staff permissions have
        not changed.
      </p>
      <Link to="/admin" className={`${adminButton} mt-5`}>
        Back to Dashboard
      </Link>
    </Card>
  );
}
