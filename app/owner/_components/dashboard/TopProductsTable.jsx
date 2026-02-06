"use client";

import Link from "next/link";

export default function TopProductsTable({ products = [], loading = false, limit = 10 }) {
  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold">Top Selling Products</h6>
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Product</th>
                  <th className="text-end">Quantity</th>
                  <th className="text-end">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td>
                      <span className="placeholder col-2" />
                    </td>
                    <td>
                      <span className="placeholder col-8" />
                    </td>
                    <td className="text-end">
                      <span className="placeholder col-4" />
                    </td>
                    <td className="text-end">
                      <span className="placeholder col-6" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold">Top Selling Products</h6>
          <div className="text-center text-secondary py-4">No product sales data available</div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return `৳${Number(amount).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const sliced = products.slice(0, limit);

  return (
    <div className="card radius-12">
      <div className="card-body p-24">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="mb-0 fw-semibold">Top Selling Products</h6>
          <Link href="/owner/products" className="btn btn-outline-primary btn-sm">
            View All
          </Link>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Rank</th>
                <th>Product</th>
                <th className="text-end">Quantity</th>
                <th className="text-end">Revenue</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {sliced.map((product, index) => (
                <tr key={product.id || index}>
                  <td>
                    <span className="badge bg-primary-subtle text-primary">#{index + 1}</span>
                  </td>
                  <td>
                    <div className="fw-semibold">{product.name || product.productName || "—"}</div>
                    {product.category && <div className="text-muted small">{product.category}</div>}
                  </td>
                  <td className="text-end">
                    <span className="fw-semibold">{product.quantity || product.totalQuantity || 0}</span>
                  </td>
                  <td className="text-end">
                    <span className="fw-semibold text-success">{formatCurrency(product.revenue || product.sales || 0)}</span>
                  </td>
                  <td className="text-end">
                    {product.id && (
                      <Link href={`/owner/products/${product.id}`} className="btn btn-outline-primary btn-sm">
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
