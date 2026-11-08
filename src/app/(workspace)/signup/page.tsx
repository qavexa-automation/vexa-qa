import type { Metadata } from "next";
import AuthPage from "@/components/auth-page";

export const metadata: Metadata = { title: "Create account — VEXA QA" };

export default function SignupPage() {
  return <AuthPage mode="signup" />;
}
