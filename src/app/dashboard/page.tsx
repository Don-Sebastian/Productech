"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardStats from "@/components/DashboardStats";
import RecentBatches from "@/components/RecentBatches";
import InventoryOverview from "@/components/InventoryOverview";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ["batches"],
    queryFn: () => fetch("/api/batches").then((res) => res.json()),
    enabled: !!session?.user,
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => fetch("/api/inventory").then((res) => res.json()),
    enabled: !!session?.user,
  });

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={session.user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Section */}
        <DashboardStats batches={batches} inventory={inventory} loading={batchesLoading || inventoryLoading} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Recent Production Batches */}
          <div className="lg:col-span-2">
            <RecentBatches batches={batches} loading={batchesLoading} />
          </div>

          {/* Inventory Overview */}
          <div className="lg:col-span-1">
            <InventoryOverview inventory={inventory} loading={inventoryLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
