import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import CompaniesClientPage from "./CompaniesClientPage";

export default async function AdminCompaniesPage() {
  const session = await auth();

  // Guard: Redirect unauthenticated users
  if (!session?.user) {
    redirect("/login");
  }

  // Guard: Redirect non-admins
  const role = (session.user as any).role;
  if (role !== "ADMIN") {
    redirect("/");
  }

  return <CompaniesClientPage user={session.user} />;
}
