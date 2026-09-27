import type { Metadata } from "next";
import { DiscoveryFlow } from "@/components/DiscoveryFlow";

export const metadata: Metadata = {
  title: "Get in touch | Coach Skill",
  description:
    "Tell us what you're looking for — training, coaching or support for you or your team — and Monika will get back to you personally.",
};

export default function DiscoveryCallPage() {
  return <DiscoveryFlow />;
}
