import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import dynamic from "next/dynamic";

const AdminDashboard = dynamic(() => import("./components/AdminDashboard"), {
  loading: () => <DashboardLoader color="border-violet-400" />
});
const OwnerDashboard = dynamic(() => import("./components/OwnerDashboard"), {
  loading: () => <DashboardLoader color="border-emerald-400" />
});
const ManagerDashboard = dynamic(() => import("./components/ManagerDashboard"), {
  loading: () => <DashboardLoader color="border-blue-400" />
});
const SupervisorDashboard = dynamic(() => import("./components/SupervisorDashboard"), {
  loading: () => <DashboardLoader color="border-amber-400" />
});
const OperatorDashboard = dynamic(() => import("./components/OperatorDashboard"), {
  loading: () => <DashboardLoader color="border-amber-500" />
});

function DashboardLoader({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${color}`}></div>
    </div>
  );
}

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;
  const user = session.user;

  switch (role) {
    case "ADMIN":
      return <AdminDashboard user={user} />;
    case "OWNER":
      return <OwnerDashboard user={user} />;
    case "MANAGER":
      return <ManagerDashboard user={user} />;
    case "SUPERVISOR":
      return <SupervisorDashboard user={user} />;
    case "OPERATOR":
      return <OperatorDashboard user={user} />;
    default:
      redirect("/login");
  }
}
