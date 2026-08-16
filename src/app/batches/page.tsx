import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import dynamic from "next/dynamic";

const SupervisorBatches = dynamic(() => import("./components/SupervisorBatches"), {
  loading: () => <BatchesLoader />
});

function BatchesLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
    </div>
  );
}

export default async function BatchesRouterPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;

  if (role === "SUPERVISOR") {
    return <SupervisorBatches />;
  }

  redirect("/");
}
