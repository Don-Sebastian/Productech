import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import dynamic from "next/dynamic";

const OwnerEmployees = dynamic(() => import("./components/OwnerEmployees"), {
  loading: () => <EmployeesLoader />
});
const ManagerEmployees = dynamic(() => import("./components/ManagerEmployees"), {
  loading: () => <EmployeesLoader />
});
const SupervisorEmployees = dynamic(() => import("./components/SupervisorEmployees"), {
  loading: () => <EmployeesLoader />
});

function EmployeesLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
    </div>
  );
}

export default async function EmployeesRouterPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;

  switch (role) {
    case "OWNER":
      return <OwnerEmployees />;
    case "MANAGER":
      return <ManagerEmployees />;
    case "SUPERVISOR":
      return <SupervisorEmployees />;
    default:
      redirect("/");
  }
}
