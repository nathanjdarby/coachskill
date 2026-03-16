"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  maxQuantity: number;
  soldQuantity: number;
};

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editing, setEditing] = useState<Record<string, { maxQuantity: number; soldQuantity: number }>>({});

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/inventory");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setProducts(data.products ?? []);
      setEditing({});
    } catch {
      setMessage({ type: "error", text: "Failed to load inventory." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const setProductEdit = (id: string, field: "maxQuantity" | "soldQuantity", value: number) => {
    setEditing((prev) => ({
      ...prev,
      [id]: {
        maxQuantity: prev[id]?.maxQuantity ?? products.find((p) => p.id === id)?.maxQuantity ?? 0,
        soldQuantity: prev[id]?.soldQuantity ?? products.find((p) => p.id === id)?.soldQuantity ?? 0,
        [field]: value,
      },
    }));
  };

  const saveProduct = async (productId: string) => {
    const edit = editing[productId];
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const maxQ = edit?.maxQuantity ?? product.maxQuantity;
    const soldQ = edit?.soldQuantity ?? product.soldQuantity;
    setMessage(null);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: products.map((p) => (p.id === productId ? { ...p, maxQuantity: maxQ, soldQuantity: soldQ } : p)) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Update failed");
      }
      const data = await res.json();
      setProducts(data.products ?? []);
      setEditing((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      setMessage({ type: "success", text: "Saved." });
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to save." });
    }
  };

  if (loading) {
    return (
      <div className="admin-layout">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <header className="admin-layout-header">
        <h1>Manage product quantities</h1>
        <nav className="admin-layout-nav">
          <Link href="/">View site</Link>
          <span>·</span>
          <button type="button" onClick={() => signOut({ callbackUrl: "/admin/login" })}>
            Sign out
          </button>
        </nav>
      </header>

      {message && (
        <p className={`admin-message ${message.type}`} role="alert">
          {message.text}
        </p>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Max quantity</th>
              <th>Sold</th>
              <th>Spots left</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const maxQ = editing[p.id]?.maxQuantity ?? p.maxQuantity;
              const soldQ = editing[p.id]?.soldQuantity ?? p.soldQuantity;
              const spotsLeft = Math.max(0, maxQ - soldQ);
              const hasChanges =
                maxQ !== p.maxQuantity || soldQ !== p.soldQuantity;
              return (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <br />
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{p.id}</span>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={maxQ}
                      onChange={(e) =>
                        setProductEdit(p.id, "maxQuantity", parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={soldQ}
                      onChange={(e) =>
                        setProductEdit(p.id, "soldQuantity", parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </td>
                  <td>{spotsLeft}</td>
                  <td className="admin-save-cell">
                    <button
                      type="button"
                      className="admin-save-btn"
                      disabled={!hasChanges}
                      onClick={() => saveProduct(p.id)}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 24, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
        Max quantity is the limit for this product (e.g. workshop places). Sold is incremented when a
        payment completes (via Stripe webhook). You can correct sold manually here. The checkout
        button is hidden when spots left is 0.
      </p>
    </div>
  );
}
