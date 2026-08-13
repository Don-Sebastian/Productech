import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  // Check if system is set up; if not, redirect to signup
  try {
    const userCount = await prisma.user.count({ take: 1 });
    if (userCount === 0) {
      redirect("/signup");
    }
  } catch (error) {
    console.error("Setup check error on login page:", error);
  }

  // If already logged in, redirect to dashboard server-side
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
