import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import OrdersPage from "@/components/OrdersPage";

export default async function Orders() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;
  if (!["OWNER", "MANAGER", "SUPERVISOR"].includes(role)) {
    redirect("/dashboard");
  }

  return <OrdersPage user={session.user} />;
}
