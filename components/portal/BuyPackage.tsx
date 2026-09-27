"use client";

import { useActionState } from "react";
import { buyPackage } from "@/app/actions/packages";
import { FormMessage, SubmitButton } from "./FormBits";

export function BuyPackageButton({ packageId, label }: { packageId: number; label: string }) {
  const [state, action] = useActionState(buyPackage.bind(null, packageId), undefined);
  return (
    <form action={action}>
      <SubmitButton pendingLabel="Opening secure payment…">{label}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
