"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface InventoryItem {
  id: string;
  productType: { name: string };
  quantity: number;
  minimumThreshold: number;
}

export default function InventoryOverview() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch("/api/inventory");
        const data = await response.json();
        setInventory(data.slice(0, 5));
      } catch (error) {
        console.error("Error fetching inventory:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  if (loading) return <div>Loading inventory...</div>;

  const lowStockItems = inventory.filter(
    (item) => item.quantity <= item.minimumThreshold,
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-6">Inventory Status</h2>

      {inventory.length === 0 ? (
        <p className="text-gray-600 text-center py-8">No inventory items yet</p>
      ) : (
        <div className="space-y-4">
          {inventory.map((item) => {
            const isLow = item.quantity <= item.minimumThreshold;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-lg border-l-4 ${
                  isLow
                    ? "border-red-500 bg-red-50"
                    : "border-green-500 bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">
                      {item.productType.name}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Stock: <span className="font-bold">{item.quantity}</span>{" "}
                      units
                    </p>
                  </div>
                  {isLow && (
                    <AlertTriangle size={18} className="text-red-600" />
                  )}
                </div>
              </div>
            );
          })}

          {lowStockItems.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-semibold">
                ⚠️ {lowStockItems.length} item(s) low on stock
              </p>
            </div>
          )}
        </div>
      )}

      <Link
        href="/inventory"
        className="block mt-6 pt-6 border-t border-gray-200 text-blue-600 hover:text-blue-700 font-semibold text-center"
      >
        View full inventory
      </Link>
    </div>
  );
}
