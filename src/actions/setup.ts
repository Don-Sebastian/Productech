"use server";

import { prisma } from "@/lib/prisma";

/**
 * Checks if the system is set up (i.e. at least one user exists in the database).
 * This runs entirely on the server-side.
 */
export async function isSystemSetUp(): Promise<boolean> {
  try {
    const userCount = await prisma.user.count({ take: 1 });
    return userCount > 0;
  } catch (error) {
    console.error("Error checking system setup:", error);
    return false;
  }
}
