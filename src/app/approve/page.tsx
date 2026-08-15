import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ApprovePage from "@/components/ApprovePage";

export default async function Approve() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;
  if (!["OWNER", "MANAGER", "SUPERVISOR"].includes(role)) {
    redirect("/dashboard");
  }

  return <ApprovePage user={session.user} />;
}
