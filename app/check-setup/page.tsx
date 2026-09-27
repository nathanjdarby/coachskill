import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { SetupCheck } from "@/components/SetupCheck";

export const metadata: Metadata = {
  title: "Check your camera & mic | Coach Skill",
  robots: { index: false, follow: false },
};

export default function CheckSetupPage() {
  return (
    <AuthShell wide title="Check your camera & mic" subtitle="A 30-second check before your call with Monika.">
      <SetupCheck />
    </AuthShell>
  );
}
