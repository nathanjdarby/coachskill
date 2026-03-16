import { NextResponse } from "next/server";
import { getInventory } from "@/lib/inventory";

export async function GET() {
  try {
    const inv = await getInventory();
    const publicList = inv.products.map((p) => ({
      id: p.id,
      name: p.name,
      maxQuantity: p.maxQuantity,
      soldQuantity: p.soldQuantity,
      spotsLeft: Math.max(0, p.maxQuantity - p.soldQuantity),
    }));
    return NextResponse.json({ products: publicList });
  } catch (e) {
    console.error("Inventory GET error:", e);
    return NextResponse.json(
      { error: "Failed to load inventory" },
      { status: 500 }
    );
  }
}
