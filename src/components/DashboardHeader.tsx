"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { Menu, LogOut, Settings } from "lucide-react";

interface User {
  name?: string | null;
  email?: string | null;
}

export default function DashboardHeader({ user }: { user: User }) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center">
            <h1 className="text-2xl font-bold text-blue-600">CRPLY</h1>
            <span className="ml-2 text-sm text-gray-600">
              Production Manager
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-gray-700 hover:text-blue-600"
            >
              Dashboard
            </Link>
            <Link
              href="/production"
              className="text-gray-700 hover:text-blue-600"
            >
              Production
            </Link>
            <Link
              href="/inventory"
              className="text-gray-700 hover:text-blue-600"
            >
              Inventory
            </Link>
            <Link
              href="/settings"
              className="text-gray-700 hover:text-blue-600"
            >
              <Settings size={20} />
            </Link>

            <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
              <div className="text-sm">
                <p className="font-semibold">{user.name}</p>
                <p className="text-gray-600 text-xs">{user.email}</p>
              </div>
              <button
                onClick={() =>
                  signOut({ redirect: true, callbackUrl: "/login" })
                }
                className="text-gray-600 hover:text-red-600 transition"
              >
                <LogOut size={20} />
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
