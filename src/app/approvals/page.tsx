import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ApprovalsPage from "@/components/ApprovalsPage";

export default async function Approvals() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;
  if (!["OWNER", "MANAGER", "SUPERVISOR"].includes(role)) {
    redirect("/dashboard");
  }

  return <ApprovalsPage user={session.user} />;
}
