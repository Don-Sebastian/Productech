"use client";

import { useEffect, useState } from "react";
import { BarChart3, Package, TrendingUp, AlertCircle } from "lucide-react";

interface Stats {
  totalBatches: number;
  completedBatches: number;
  totalInventory: number;
  defectRate: number;
}

export default function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    totalBatches: 0,
    completedBatches: 0,
    totalInventory: 0,
    defectRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [batchesRes, inventoryRes] = await Promise.all([
          fetch("/api/batches"),
          fetch("/api/inventory"),
        ]);

        const batches = await batchesRes.json();
        const inventory = await inventoryRes.json();

        const completedBatches = batches.filter(
          (b: any) => b.status === "COMPLETED",
        ).length;

        const totalInventory = inventory.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0,
        );

        const totalDefective = batches.reduce(
          (sum: number, b: any) => sum + b.defectiveUnits,
          0,
        );
        const totalProduced = batches.reduce(
          (sum: number, b: any) => sum + b.quantity,
          0,
        );

        setStats({
          totalBatches: batches.length,
          completedBatches,
          totalInventory,
          defectRate:
            totalProduced > 0 ? (totalDefective / totalProduced) * 100 : 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      label: "Total Batches",
      value: stats.totalBatches,
      icon: BarChart3,
      color: "bg-blue-500",
    },
    {
      label: "Completed",
      value: stats.completedBatches,
      icon: TrendingUp,
      color: "bg-green-500",
    },
    {
      label: "Current Stock",
      value: stats.totalInventory,
      icon: Package,
      color: "bg-purple-500",
    },
    {
      label: "Defect Rate",
      value: `${stats.defectRate.toFixed(2)}%`,
      icon: AlertCircle,
      color: "bg-red-500",
    },
  ];

  if (loading) return <div>Loading stats...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{card.label}</p>
                <p className="text-3xl font-bold mt-2 text-gray-600">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <Icon size={24} className="text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
