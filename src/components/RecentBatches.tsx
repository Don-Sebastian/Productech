"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Batch {
  id: string;
  batchNumber: string;
  status: string;
  quantity: number;
  productType: { name: string };
  startDate: string;
}

export default function RecentBatches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await fetch("/api/batches");
        const data = await response.json();
        setBatches(data.slice(0, 5));
      } catch (error) {
        console.error("Error fetching batches:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      INITIATED: "bg-yellow-100 text-yellow-800",
      IN_PROGRESS: "bg-blue-100 text-blue-800",
      COMPLETED: "bg-green-100 text-green-800",
      QUALITY_CHECK: "bg-purple-100 text-purple-800",
      FAILED: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) return <div>Loading batches...</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-6">Recent Production Batches</h2>

      {batches.length === 0 ? (
        <p className="text-gray-600 text-center py-8">
          No batches yet. Create your first batch!
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Batch #
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Product
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Qty
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr
                  key={batch.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-4 px-4 font-medium">{batch.batchNumber}</td>
                  <td className="py-4 px-4">{batch.productType.name}</td>
                  <td className="py-4 px-4">{batch.quantity} units</td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(batch.status)}`}
                    >
                      {batch.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">
                    {new Date(batch.startDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Link
        href="/production"
        className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 text-blue-600 hover:text-blue-700 font-semibold"
      >
        View all batches
        <ArrowRight size={20} />
      </Link>
    </div>
  );
}
