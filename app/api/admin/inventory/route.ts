import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getInventory,
  saveInventory,
  updateProductMaxQuantity,
  updateProductSoldQuantity,
} from "@/lib/inventory";

async function requireAdmin(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.email) return null;
  return token;
}

export async function GET(request: NextRequest) {
  const token = await requireAdmin(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const inv = await getInventory();
    return NextResponse.json(inv);
  } catch (e) {
    console.error("Admin inventory GET error:", e);
    return NextResponse.json(
      { error: "Failed to load inventory" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const token = await requireAdmin(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();

    if (body.maxQuantity != null && body.productId) {
      const ok = await updateProductMaxQuantity(
        body.productId,
        Number(body.maxQuantity)
      );
      if (!ok) {
        return NextResponse.json(
          { error: "Product not found or invalid maxQuantity" },
          { status: 400 }
        );
      }
      const inv = await getInventory();
      return NextResponse.json(inv);
    }

    if (body.soldQuantity != null && body.productId) {
      const ok = await updateProductSoldQuantity(
        body.productId,
        Number(body.soldQuantity)
      );
      if (!ok) {
        return NextResponse.json(
          { error: "Product not found or invalid soldQuantity" },
          { status: 400 }
        );
      }
      const inv = await getInventory();
      return NextResponse.json(inv);
    }

    if (Array.isArray(body.products)) {
      const inv = await getInventory();
      inv.products = body.products.map((p: { id: string; name: string; maxQuantity: number; soldQuantity: number }) => ({
        id: p.id,
        name: p.name,
        maxQuantity: Math.max(0, Number(p.maxQuantity) ?? 0),
        soldQuantity: Math.max(0, Number(p.soldQuantity) ?? 0),
      }));
      await saveInventory(inv);
      return NextResponse.json(inv);
    }

    return NextResponse.json(
      { error: "Provide productId + maxQuantity, productId + soldQuantity, or products array" },
      { status: 400 }
    );
  } catch (e) {
    console.error("Admin inventory PUT error:", e);
    return NextResponse.json(
      { error: "Failed to update inventory" },
      { status: 500 }
    );
  }
}
