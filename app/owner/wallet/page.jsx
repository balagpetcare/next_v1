"use client";

import { useEffect, useState } from "react";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import StatusBadge from "@/app/owner/_components/StatusBadge";

function formatCurrency(amount) {
  return `৳${Number(amount).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OwnerWalletPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("BANK");
  const [withdrawAccount, setWithdrawAccount] = useState("");

  async function loadWallet() {
    setLoading(true);
    setError("");
    try {
      const [walletRes, transactionsRes, withdrawRes] = await Promise.all([
        ownerGet("/api/v1/wallet/me").catch(() => ({ success: false, data: null })),
        ownerGet("/api/v1/wallet/transactions?limit=50").catch(() => ({ success: false, data: null })),
        ownerGet("/api/v1/wallet/withdraw/requests?limit=20").catch(() => ({ success: false, data: null })),
      ]);

      if (walletRes?.success && walletRes.data) {
        setWallet(walletRes.data);
      }

      if (transactionsRes?.success && transactionsRes.data) {
        const items = transactionsRes.data.items || transactionsRes.data || [];
        setTransactions(Array.isArray(items) ? items : []);
      }

      if (withdrawRes?.success && withdrawRes.data) {
        const items = withdrawRes.data.items || withdrawRes.data || [];
        setWithdrawRequests(Array.isArray(items) ? items : []);
      }
    } catch (e) {
      setError(e?.message || "Failed to load wallet data");
      console.error("Wallet load error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWallet();
  }, []);

  async function handleWithdrawRequest() {
    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (Number(withdrawAmount) > Number(wallet?.balance || 0)) {
      setError("Insufficient balance");
      return;
    }

    try {
      setError("");
      await ownerPost("/api/v1/wallet/withdraw/requests", {
        amount: Number(withdrawAmount),
        method: withdrawMethod,
        accountDetails: withdrawAccount,
      });
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setWithdrawAccount("");
      await loadWallet();
    } catch (e) {
      setError(e?.message || "Failed to create withdraw request");
    }
  }

  return (
    <div className="container py-3">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="mb-1">Wallet</h2>
          <div className="text-secondary">Manage your wallet balance and transactions</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowWithdrawModal(true)} disabled={loading || !wallet || Number(wallet.balance || 0) <= 0}>
          <i className="solar:wallet-money-outline me-1" />
          Request Withdrawal
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Wallet Balance Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="card radius-12 bg-success-focus">
            <div className="card-body p-24">
              <div className="text-muted small mb-1">Available Balance</div>
              <div className="fw-bold fs-4 text-success-main">
                {loading ? "—" : formatCurrency(wallet?.balance || 0)}
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card radius-12 bg-warning-focus">
            <div className="card-body p-24">
              <div className="text-muted small mb-1">Pending Balance</div>
              <div className="fw-bold fs-4 text-warning-main">
                {loading ? "—" : formatCurrency(wallet?.pendingBalance || 0)}
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card radius-12 bg-primary-focus">
            <div className="card-body p-24">
              <div className="text-muted small mb-1">Total Balance</div>
              <div className="fw-bold fs-4 text-primary-main">
                {loading
                  ? "—"
                  : formatCurrency(Number(wallet?.balance || 0) + Number(wallet?.pendingBalance || 0))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Withdraw Requests */}
      {withdrawRequests.length > 0 && (
        <div className="card radius-12 mb-4">
          <div className="card-body p-24">
            <h6 className="mb-3 fw-semibold">Recent Withdraw Requests</h6>
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawRequests.map((req) => (
                    <tr key={req.id}>
                      <td className="fw-semibold">#{req.id}</td>
                      <td>{formatCurrency(req.amount || 0)}</td>
                      <td>{req.method || "—"}</td>
                      <td>
                        <StatusBadge status={req.status || "PENDING"} />
                      </td>
                      <td className="text-muted small">{formatDate(req.createdAt)}</td>
                      <td className="text-end">
                        {req.status === "PENDING" && (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={async () => {
                              try {
                                await ownerPost(`/api/v1/wallet/withdraw/requests/${req.id}/cancel`, {});
                                await loadWallet();
                              } catch (e) {
                                setError(e?.message || "Failed to cancel request");
                              }
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold">Transaction History</h6>
          {loading ? (
            <div className="text-center text-secondary py-4">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-secondary py-4">No transactions yet</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th className="text-end">Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="text-muted small">{formatDate(tx.createdAt)}</td>
                      <td>
                        <span className={`badge ${tx.type === "CREDIT" ? "bg-success" : "bg-danger"}`}>
                          {tx.type || "—"}
                        </span>
                      </td>
                      <td>{tx.description || tx.sourceType || "Transaction"}</td>
                      <td className={`text-end fw-semibold ${tx.type === "CREDIT" ? "text-success" : "text-danger"}`}>
                        {tx.type === "CREDIT" ? "+" : "-"}
                        {formatCurrency(Math.abs(tx.amount || 0))}
                      </td>
                      <td>
                        <StatusBadge status={tx.status || "COMPLETED"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Request Withdrawal</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawAmount("");
                    setWithdrawAccount("");
                    setError("");
                  }}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="0"
                    max={wallet?.balance || 0}
                  />
                  <div className="form-text">Available: {formatCurrency(wallet?.balance || 0)}</div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Payment Method</label>
                  <select className="form-select" value={withdrawMethod} onChange={(e) => setWithdrawMethod(e.target.value)}>
                    <option value="BANK">Bank Transfer</option>
                    <option value="MOBILE">Mobile Banking</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Account Details</label>
                  <textarea
                    className="form-control"
                    value={withdrawAccount}
                    onChange={(e) => setWithdrawAccount(e.target.value)}
                    placeholder="Enter account number, bank name, etc."
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawAmount("");
                    setWithdrawAccount("");
                    setError("");
                  }}
                >
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleWithdrawRequest}>
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
