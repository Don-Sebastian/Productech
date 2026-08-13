import { redirect } from "next/navigation";
import { isSystemSetUp } from "@/actions/setup";
import SignupForm from "@/components/SignupForm";

export default async function SignupPage() {
  // Check setup status server-side
  const isSetUp = await isSystemSetUp();

  // If already set up, redirect to login instantly
  if (isSetUp) {
    redirect("/login");
  }

  return <SignupForm />;
}
