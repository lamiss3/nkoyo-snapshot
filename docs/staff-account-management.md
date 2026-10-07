# Staff account management

The public `/auth` page is sign-in only. Supabase **Allow new users to sign up** is disabled separately in the project dashboard; removing the form alone would not block direct registration calls. Anonymous assessments and report capture do not require an Auth account.

Administrators can open **Staff accounts** inside `/admin` to list staff/admin identities, create a staff account and permanently delete another account. Ordinary staff retain assessment/report access and cannot manage identities. The authenticated server checks the current administrator role for every action; client visibility is not the access control.

New staff accounts receive a cryptographically random password, returned once over the authenticated server response. Passwords are never stored in application tables or account audit events. The server creates the Auth identity, then atomically grants only the staff role and records the creation. Existing emails are rejected, not granted extra access or reset silently. Nkoyo's initial owner account has the administrator role so she can manage other staff.

Deletion requires typing the exact account email. The database serializes role changes, rejects self deletion and protects the last administrator, records the deletion request and revokes all roles before deleting the Auth identity. Role revocation stops old access tokens from reading private data. Assessment records, reports and account audit history remain. A failed Auth deletion keeps access revoked and appears as a retryable deletion; the application does not restore access automatically.

Migration `0004_staff_account_management.sql` creates private administrator-only audit/deletion tables and service-role-only grant/deletion functions. No browser role can execute these privileged RPCs directly. Administrative server functions also use the application's existing CSRF protection.

Six focused tests verify staff/role-read denial, generated credentials, duplicate email rejection, self-deletion/guard rejection, access revocation before Auth deletion, and safe recovery when the Auth identity has already been removed. Live verification uses a disposable, manually created test identity without sending an email; existing accounts are not deleted for testing.

Official APIs: [createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser), [registration configuration](https://supabase.com/docs/guides/auth/general-configuration).
