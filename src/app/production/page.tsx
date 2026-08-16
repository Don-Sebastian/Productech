import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import dynamic from "next/dynamic";

const OwnerProduction = dynamic(() => import("./components/OwnerProduction"), {
  loading: () => <ProductionLoader color="border-emerald-400" />
});
const ManagerProduction = dynamic(() => import("./components/ManagerProduction"), {
  loading: () => <ProductionLoader color="border-cyan-400" />
});
const SupervisorProduction = dynamic(() => import("./components/SupervisorProduction"), {
  loading: () => <ProductionLoader color="border-amber-400" />
});

function ProductionLoader({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${color}`}></div>
    </div>
  );
}

export default async function ProductionRouter() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;

  switch (role) {
    case "OWNER":
      return <OwnerProduction />;
    case "MANAGER":
      return <ManagerProduction />;
    case "SUPERVISOR":
      return <SupervisorProduction />;
    default:
      redirect("/");
  }
}
