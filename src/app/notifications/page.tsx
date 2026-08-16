import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import dynamic from "next/dynamic";

const OwnerNotifications = dynamic(() => import("./components/OwnerNotifications"), {
  loading: () => <NotificationsLoader />
});
const ManagerNotifications = dynamic(() => import("./components/ManagerNotifications"), {
  loading: () => <NotificationsLoader />
});
const SupervisorNotifications = dynamic(() => import("./components/SupervisorNotifications"), {
  loading: () => <NotificationsLoader />
});

function NotificationsLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
    </div>
  );
}

export default async function NotificationsRouter() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;

  switch (role) {
    case "OWNER":
      return <OwnerNotifications />;
    case "MANAGER":
      return <ManagerNotifications />;
    case "SUPERVISOR":
      return <SupervisorNotifications />;
    default:
      redirect("/");
  }
}
