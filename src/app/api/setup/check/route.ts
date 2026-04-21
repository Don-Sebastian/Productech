import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Check if the system has been set up (any users exist)
export async function GET() {
  try {
    const userCount = await prisma.user.count({ take: 1 });
    return NextResponse.json({ isSetUp: userCount > 0 });
  } catch (error) {
    console.error("Setup check error:", error);
    return NextResponse.json({ isSetUp: false });
  }
}
