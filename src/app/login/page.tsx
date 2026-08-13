import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";
import { isSystemSetUp } from "@/actions/setup";

export default async function LoginPage() {
  // Check if system is set up; if not, redirect to signup
  const isSetUp = await isSystemSetUp();
  if (!isSetUp) {
    redirect("/signup");
  }

  // If already logged in, redirect to dashboard server-side
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
