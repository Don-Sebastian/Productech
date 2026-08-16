import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import dynamic from "next/dynamic";

const OwnerAttendance = dynamic(() => import("./components/OwnerAttendance"), {
  loading: () => <AttendanceLoader />
});
const ManagerAttendance = dynamic(() => import("./components/ManagerAttendance"), {
  loading: () => <AttendanceLoader />
});
const SupervisorAttendance = dynamic(() => import("./components/SupervisorAttendance"), {
  loading: () => <AttendanceLoader />
});

function AttendanceLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
    </div>
  );
}

export default async function AttendanceRouterPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;

  switch (role) {
    case "OWNER":
      return <OwnerAttendance />;
    case "MANAGER":
      return <ManagerAttendance />;
    case "SUPERVISOR":
      return <SupervisorAttendance />;
    default:
      redirect("/");
  }
}
