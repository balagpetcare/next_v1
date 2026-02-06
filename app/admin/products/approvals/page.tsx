"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/apiFetch";

export default function ProductApprovalsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/api/v1/products?approvalStatus=PENDING_APPROVAL");
      setProducts(Array.isArray(data) ? data : data?.items || []);
    } catch (error: any) {
      console.error("Load approvals error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (productId: number) => {
    if (!confirm("Approve this product?")) return;

    try {
      await apiFetch(`/api/v1/products/${productId}/approve`, {
        method: "POST",
      });
      alert("Product approved");
      loadPendingApprovals();
    } catch (error: any) {
      alert(error?.message || "Failed to approve product");
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Product Approvals</h1>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variants</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap">{product.id}</td>
                <td className="px-6 py-4 whitespace-nowrap">{product.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{product.slug}</td>
                <td className="px-6 py-4 whitespace-nowrap">{product.variants?.length || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleApprove(product.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
