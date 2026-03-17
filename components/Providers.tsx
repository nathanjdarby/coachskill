"use client";

import { CheckoutProvider } from "@/contexts/CheckoutContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CheckoutProvider>{children}</CheckoutProvider>
  );
}
