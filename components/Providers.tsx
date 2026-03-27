"use client";

import { SessionProvider } from "next-auth/react";
import { CheckoutProvider } from "@/contexts/CheckoutContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CheckoutProvider>{children}</CheckoutProvider>
    </SessionProvider>
  );
}
