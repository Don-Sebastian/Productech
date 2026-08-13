import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AccountPage from "@/components/AccountPage";

export default async function AccountRouterPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return <AccountPage user={session.user} />;
}
