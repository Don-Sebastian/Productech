import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import dynamic from "next/dynamic";

const OwnerInventory = dynamic(() => import("./components/OwnerInventory"), {
  loading: () => <InventoryLoader color="border-emerald-400" />
});
const ManagerInventory = dynamic(() => import("./components/ManagerInventory"), {
  loading: () => <InventoryLoader color="border-blue-400" />
});

function InventoryLoader({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${color}`} />
    </div>
  );
}

export default async function InventoryRouterPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;

  switch (role) {
    case "OWNER":
      return <OwnerInventory />;
    case "MANAGER":
      return <ManagerInventory />;
    default:
      redirect("/");
  }
}
