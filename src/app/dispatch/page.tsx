import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import dynamic from "next/dynamic";

const OwnerDispatchHistory = dynamic(() => import("./components/OwnerDispatchHistory"), {
  loading: () => <DispatchLoader color="border-emerald-400" />
});
const ManagerDispatch = dynamic(() => import("./components/ManagerDispatch"), {
  loading: () => <DispatchLoader color="border-cyan-400" />
});
const SupervisorDispatch = dynamic(() => import("./components/SupervisorDispatch"), {
  loading: () => <DispatchLoader color="border-amber-400" />
});

function DispatchLoader({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${color}`} />
    </div>
  );
}

export default async function DispatchRouterPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;

  switch (role) {
    case "OWNER":
      return <OwnerDispatchHistory />;
    case "MANAGER":
      return <ManagerDispatch />;
    case "SUPERVISOR":
      return <SupervisorDispatch />;
    default:
      redirect("/");
  }
}
