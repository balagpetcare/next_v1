"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/apiFetch";

interface Product {
  id: number;
  name: string;
  variants: Array<{
    id: number;
    sku: string;
    title: string;
    stock: number;
  }>;
  baseStock: number;
}

interface CartItem {
  productId: number;
  variantId?: number;
  productName: string;
  variantName: string;
  quantity: number;
  price: number;
  total: number;
}

export default function ShopPOSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  useEffect(() => {
    loadBranch();
  }, []);

  const loadBranch = async () => {
    try {
      // Get user's branch
      const me = (await apiFetch("/api/v1/auth/me")) as { data?: { branches?: { id: number }[] } };
      if (me?.data?.branches && me.data.branches.length > 0) {
        const branchId = me.data.branches[0].id;
        setSelectedBranch(branchId);
        loadProducts(branchId);
      }
    } catch (e: any) {
      console.error("Load branch error:", e);
    }
  };

  const loadProducts = async (branchId: number) => {
    try {
      setLoading(true);
      const data = (await apiFetch(`/api/v1/pos/products?branchId=${branchId}`)) as unknown[] | { data?: unknown[] };
      setProducts((Array.isArray(data) ? data : (data && typeof data === "object" && "data" in data ? (data as { data: unknown[] }).data ?? [] : [])) as Product[]);
    } catch (e: any) {
      console.error("Load products error:", e);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product, variant?: any, price: number = 0) => {
    const existingIndex = cart.findIndex(
      (item) => item.productId === product.id && item.variantId === variant?.id
    );

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          variantId: variant?.id,
          productName: product.name,
          variantName: variant?.title || "Standard",
          quantity: 1,
          price: price,
          total: price,
        },
      ]);
    }
  };

  const updateCartQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }

    const updated = [...cart];
    updated[index].quantity = quantity;
    updated[index].total = updated[index].quantity * updated[index].price;
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    if (!selectedBranch) {
      alert("Branch not selected");
      return;
    }

    try {
      setProcessing(true);
      const order = (await apiFetch("/api/v1/pos/sale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branchId: selectedBranch,
          items: cart.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
          })),
          paymentMethod: paymentMethod,
        }),
      })) as { data?: { orderNumber?: string } };

      alert(`Sale completed! Order: ${order?.data?.orderNumber ?? "N/A"}`);
      clearCart();
    } catch (e: any) {
      alert(e?.message || "Failed to complete sale");
      console.error("Checkout error:", e);
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        {/* Products List */}
        <div className="col-lg-8">
          <div className="card radius-12">
            <div className="card-body">
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control radius-12"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <div className="row g-2">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="col-md-6 col-lg-4">
                      <div className="card radius-12">
                        <div className="card-body p-3">
                          <h6 className="mb-2">{product.name}</h6>
                          {product.variants && product.variants.length > 0 ? (
                            product.variants.map((variant) => (
                              <div key={variant.id} className="mb-2">
                                <div className="d-flex align-items-center justify-content-between">
                                  <div>
                                    <small className="text-muted">{variant.title}</small>
                                    <br />
                                    <small className="text-muted">SKU: {variant.sku}</small>
                                    <br />
                                    <small className={variant.stock <= 10 ? "text-danger" : "text-success"}>
                                      Stock: {variant.stock}
                                    </small>
                                  </div>
                                  <button
                                    className="btn btn-sm btn-primary radius-12"
                                    onClick={() => addToCart(product, variant, 100)} // Default price
                                    disabled={variant.stock === 0}
                                  >
                                    <i className="ri-add-line" />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="d-flex align-items-center justify-content-between">
                              <div>
                                <small className={product.baseStock <= 10 ? "text-danger" : "text-success"}>
                                  Stock: {product.baseStock}
                                </small>
                              </div>
                              <button
                                className="btn btn-sm btn-primary radius-12"
                                onClick={() => addToCart(product, null, 100)}
                                disabled={product.baseStock === 0}
                              >
                                <i className="ri-add-line" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cart */}
        <div className="col-lg-4">
          <div className="card radius-12">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="mb-0">Cart</h5>
                {cart.length > 0 && (
                  <button
                    className="btn btn-sm btn-outline-danger radius-12"
                    onClick={clearCart}
                  >
                    Clear
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p>Cart is empty</p>
                  <small>Add products to cart</small>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((item, index) => (
                          <tr key={index}>
                            <td>
                              <small>
                                <strong>{item.productName}</strong>
                                <br />
                                {item.variantName}
                              </small>
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm radius-12"
                                style={{ width: "60px" }}
                                value={item.quantity}
                                onChange={(e) =>
                                  updateCartQuantity(index, parseInt(e.target.value) || 0)
                                }
                                min="1"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm radius-12"
                                style={{ width: "80px" }}
                                value={item.price}
                                onChange={(e) => {
                                  const updated = [...cart];
                                  updated[index].price = parseFloat(e.target.value) || 0;
                                  updated[index].total = updated[index].quantity * updated[index].price;
                                  setCart(updated);
                                }}
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td>
                              <strong>{item.total.toFixed(2)}</strong>
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-light radius-12"
                                onClick={() => removeFromCart(index)}
                              >
                                <i className="ri-delete-bin-line" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-top pt-3 mt-3">
                    <div className="d-flex justify-content-between mb-3">
                      <strong>Total:</strong>
                      <strong className="text-primary" style={{ fontSize: "1.2rem" }}>
                        ৳{calculateTotal().toFixed(2)}
                      </strong>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Payment Method</label>
                      <select
                        className="form-select radius-12"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="MOBILE">Mobile (bKash/Nagad)</option>
                        <option value="ONLINE">Online</option>
                      </select>
                    </div>

                    <button
                      className="btn btn-primary radius-12 w-100"
                      onClick={handleCheckout}
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <i className="ri-check-line me-2" />
                          Complete Sale
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
