import type { Metadata } from "next";
import { DiscoveryFlow } from "@/components/DiscoveryFlow";

export const metadata: Metadata = {
  title: "Discovery Call | Coach Skill",
  description:
    "Tell Monika about your goals and challenges before your discovery call.",
};

export default function DiscoveryCallPage() {
  return <DiscoveryFlow />;
}
