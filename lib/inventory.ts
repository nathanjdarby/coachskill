import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

export type ProductInventory = {
  id: string;
  name: string;
  maxQuantity: number;
  soldQuantity: number;
};

export type InventoryData = {
  products: ProductInventory[];
  updatedAt: string;
};

const defaultInventory: InventoryData = {
  products: [
    {
      id: "workshop-deposit",
      name: "Value Selling Workshop — Deposit",
      maxQuantity: 5,
      soldQuantity: 0,
    },
  ],
  updatedAt: new Date().toISOString(),
};

function getDataPath(): string {
  return path.join(process.cwd(), "data", "inventory.json");
}

export async function getInventory(): Promise<InventoryData> {
  try {
    const filePath = getDataPath();
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as InventoryData;
    if (!data.products || !Array.isArray(data.products)) return defaultInventory;
    return data;
  } catch {
    return defaultInventory;
  }
}

export async function saveInventory(data: InventoryData): Promise<void> {
  const dir = path.join(process.cwd(), "data");
  await mkdir(dir, { recursive: true });
  const filePath = getDataPath();
  const next: InventoryData = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(filePath, JSON.stringify(next, null, 2), "utf-8");
}

export async function getProductById(id: string): Promise<ProductInventory | null> {
  const inv = await getInventory();
  return inv.products.find((p) => p.id === id) ?? null;
}

export async function getSpotsLeft(productId: string): Promise<number | null> {
  const p = await getProductById(productId);
  if (!p) return null;
  return Math.max(0, p.maxQuantity - p.soldQuantity);
}

export async function incrementSold(productId: string): Promise<boolean> {
  const inv = await getInventory();
  const idx = inv.products.findIndex((p) => p.id === productId);
  if (idx === -1) return false;
  inv.products[idx].soldQuantity += 1;
  await saveInventory(inv);
  return true;
}

export async function updateProductMaxQuantity(
  productId: string,
  maxQuantity: number
): Promise<boolean> {
  if (maxQuantity < 0) return false;
  const inv = await getInventory();
  const idx = inv.products.findIndex((p) => p.id === productId);
  if (idx === -1) return false;
  inv.products[idx].maxQuantity = maxQuantity;
  await saveInventory(inv);
  return true;
}

export async function updateProductSoldQuantity(
  productId: string,
  soldQuantity: number
): Promise<boolean> {
  if (soldQuantity < 0) return false;
  const inv = await getInventory();
  const idx = inv.products.findIndex((p) => p.id === productId);
  if (idx === -1) return false;
  inv.products[idx].soldQuantity = soldQuantity;
  await saveInventory(inv);
  return true;
}
