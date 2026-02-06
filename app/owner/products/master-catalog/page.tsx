"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/src/lib/apiFetch";

interface MasterProduct {
  id: number;
  name: string;
  slug: string;
  description?: string;
  suggestedPrice?: number;
  currency?: string;
  variantsJson?: any;
  metaJson?: any;
  brand?: {
    id: number;
    name: string;
    slug: string;
  };
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  isActive: boolean;
  isVerified: boolean;
}

interface Brand {
  id: number;
  name: string;
  slug: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

export default function MasterCatalogPage() {
  const router = useRouter();
  const [products, setProducts] = useState<MasterProduct[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cloningId, setCloningId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    loadMasterCatalog();
    loadFilters();
  }, [page, search, selectedBrand, selectedCategory]);

  const loadMasterCatalog = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
        ...(selectedBrand && { brandId: selectedBrand.toString() }),
        ...(selectedCategory && { categoryId: selectedCategory.toString() }),
      });

      const res = (await apiFetch(
        `/api/v1/products/master-catalog?${params.toString()}`
      )) as {
        success?: boolean;
        data?: MasterProduct[];
        items?: MasterProduct[];
        pagination?: { page: number; totalPages: number; total: number };
      };

      const items = res?.data || res?.items || [];
      setProducts(items);
      if (res?.pagination) {
        setTotalPages(res.pagination.totalPages);
      }
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load master catalog");
      console.error("Load master catalog error:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadFilters = async () => {
    try {
      const [brandRes, catRes] = await Promise.all([
        apiFetch("/api/v1/meta/brands"),
        apiFetch("/api/v1/meta/categories"),
      ]);

      const brandsData = Array.isArray(brandRes)
        ? brandRes
        : (brandRes as any)?.data || [];
      const categoriesData = Array.isArray(catRes)
        ? catRes
        : (catRes as any)?.data || [];

      setBrands(brandsData);
      setCategories(categoriesData);
    } catch (e) {
      console.error("Load filters error:", e);
    }
  };

  const handleClone = async (productId: number) => {
    if (!confirm("Add this product to your organization?")) return;

    try {
      setCloningId(productId);
      const res = (await apiFetch(`/api/v1/products/master-catalog/${productId}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })) as { success?: boolean; data?: { id: number }; message?: string };

      if (res?.success && res?.data?.id) {
        alert("Product added successfully! Redirecting to product page...");
        router.push(`/owner/products/${res.data.id}`);
      } else {
        alert(res?.message || "Product cloned successfully");
        router.push("/owner/products");
      }
    } catch (e: any) {
      alert(e?.message || "Failed to add product");
      console.error("Clone product error:", e);
    } finally {
      setCloningId(null);
    }
  };

  const getVariantsCount = (product: MasterProduct) => {
    if (product.variantsJson && Array.isArray(product.variantsJson)) {
      return product.variantsJson.length;
    }
    return 0;
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedBrand(null);
    setSelectedCategory(null);
    setPage(1);
  };

  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        <div className="col-12">
          <div className="card radius-12">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                  <h5 className="mb-1">Master Product Catalog</h5>
                  <small className="text-muted">
                    Browse and add pre-configured pet food products to your organization
                  </small>
                </div>
                <Link href="/owner/products" className="btn btn-outline-primary radius-12">
                  ← Back to Products
                </Link>
              </div>

              {/* Search and Filters */}
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <input
                    type="text"
                    className="form-control radius-12"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select radius-12"
                    value={selectedBrand || ""}
                    onChange={(e) => {
                      setSelectedBrand(e.target.value ? parseInt(e.target.value) : null);
                      setPage(1);
                    }}
                  >
                    <option value="">All Brands</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select radius-12"
                    value={selectedCategory || ""}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value ? parseInt(e.target.value) : null);
                      setPage(1);
                    }}
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <div className="d-flex gap-2">
                    <button
                      className={`btn radius-12 ${viewMode === "grid" ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() => setViewMode("grid")}
                      title="Grid View"
                    >
                      <i className="ri-grid-line" />
                    </button>
                    <button
                      className={`btn radius-12 ${viewMode === "list" ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() => setViewMode("list")}
                      title="List View"
                    >
                      <i className="ri-list-check" />
                    </button>
                    {(search || selectedBrand || selectedCategory) && (
                      <button
                        className="btn btn-outline-secondary radius-12"
                        onClick={resetFilters}
                        title="Reset Filters"
                      >
                        <i className="ri-close-line" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger radius-12 mb-3" role="alert">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p>No products found. Try adjusting your filters.</p>
                </div>
              ) : viewMode === "grid" ? (
                <>
                  <div className="row g-3">
                    {products.map((product) => (
                      <div key={product.id} className="col-md-6 col-lg-4">
                        <div className="card radius-12 h-100">
                          <div className="card-body">
                            <div className="d-flex align-items-start justify-content-between mb-2">
                              <div className="flex-grow-1">
                                <h6 className="mb-1 fw-semibold">{product.name}</h6>
                                {product.brand && (
                                  <small className="text-muted d-block">
                                    <i className="ri-store-line me-1" />
                                    {product.brand.name}
                                  </small>
                                )}
                                {product.category && (
                                  <small className="text-muted d-block">
                                    <i className="ri-folder-line me-1" />
                                    {product.category.name}
                                  </small>
                                )}
                              </div>
                              {product.isVerified && (
                                <span className="badge bg-success-focus text-success-main radius-12">
                                  <i className="ri-check-line me-1" />
                                  Verified
                                </span>
                              )}
                            </div>

                            {product.description && (
                              <p className="text-muted small mb-2" style={{ fontSize: "0.85rem" }}>
                                {product.description.length > 100
                                  ? `${product.description.substring(0, 100)}...`
                                  : product.description}
                              </p>
                            )}

                            <div className="d-flex align-items-center justify-content-between mb-3">
                              <div>
                                {getVariantsCount(product) > 0 && (
                                  <span className="badge bg-info-focus text-info-main radius-12 me-2">
                                    {getVariantsCount(product)} variant
                                    {getVariantsCount(product) > 1 ? "s" : ""}
                                  </span>
                                )}
                                {product.suggestedPrice && (
                                  <span className="text-primary fw-semibold">
                                    {product.currency || "BDT"} {product.suggestedPrice.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              className="btn btn-primary radius-12 w-100"
                              onClick={() => handleClone(product.id)}
                              disabled={cloningId === product.id}
                            >
                              {cloningId === product.id ? (
                                <>
                                  <span
                                    className="spinner-border spinner-border-sm me-2"
                                    role="status"
                                  />
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <i className="ri-add-line me-2" />
                                  Add to My Products
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-center mt-4">
                      <nav>
                        <ul className="pagination">
                          <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                            <button
                              className="page-link radius-12"
                              onClick={() => setPage(page - 1)}
                              disabled={page === 1}
                            >
                              Previous
                            </button>
                          </li>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                              <button className="page-link radius-12" onClick={() => setPage(p)}>
                                {p}
                              </button>
                            </li>
                          ))}
                          <li className={`page-item ${page === totalPages ? "disabled" : ""}`}>
                            <button
                              className="page-link radius-12"
                              onClick={() => setPage(page + 1)}
                              disabled={page === totalPages}
                            >
                              Next
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Brand</th>
                        <th>Category</th>
                        <th>Variants</th>
                        <th>Price</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id}>
                          <td>
                            <div className="fw-semibold">{product.name}</div>
                            {product.description && (
                              <small className="text-muted">
                                {product.description.length > 80
                                  ? `${product.description.substring(0, 80)}...`
                                  : product.description}
                              </small>
                            )}
                          </td>
                          <td>{product.brand?.name || "-"}</td>
                          <td>{product.category?.name || "-"}</td>
                          <td>
                            <span className="badge bg-info-focus text-info-main radius-12">
                              {getVariantsCount(product)}
                            </span>
                          </td>
                          <td>
                            {product.suggestedPrice ? (
                              <span className="text-primary fw-semibold">
                                {product.currency || "BDT"} {product.suggestedPrice.toLocaleString()}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-primary radius-12"
                              onClick={() => handleClone(product.id)}
                              disabled={cloningId === product.id}
                            >
                              {cloningId === product.id ? (
                                <span
                                  className="spinner-border spinner-border-sm"
                                  role="status"
                                />
                              ) : (
                                <>
                                  <i className="ri-add-line me-1" />
                                  Add
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
