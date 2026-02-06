"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

export default function ProducerDashboardPage() {
  const [stats, setStats] = useState({ products: 0, batches: 0, codes: 0 });
  const [loading, setLoading] = useState(true);
  const [kyc, setKyc] = useState(null);
  const [gateMessage, setGateMessage] = useState("");
  const [error, setError] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const getGateMeta = (status) => {
    if (!status) {
      return {
        tone: "warning",
        message: "আপনার Producer KYC এখনো সাবমিট করা হয়নি। KYC সাবমিট না করলে প্রোডাক্ট/ব্যাচ ম্যানেজ করতে পারবেন না।",
      };
    }
    if (status === "PENDING") {
      return {
        tone: "warning",
        message: "আপনার KYC রিভিউ চলছে। যাচাই শেষ না হওয়া পর্যন্ত প্রোডাক্ট/ব্যাচ ফিচার বন্ধ থাকবে।",
      };
    }
    if (status === "REJECTED") {
      return {
        tone: "danger",
        message: "আপনার KYC রিজেক্ট হয়েছে। প্রয়োজনীয় সংশোধন দিয়ে আবার সাবমিট করুন।",
      };
    }
    if (status === "SUSPENDED") {
      return {
        tone: "danger",
        message: "আপনার Producer Org সাসপেন্ড করা হয়েছে। সাপোর্ট টিমের সাথে যোগাযোগ করুন।",
      };
    }
    return null;
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const kycRes = await apiGet("/api/v1/producer/kyc/status");
        const org = kycRes?.data || null;
        if (!cancelled) setKyc(org);

        const gateMeta = getGateMeta(org?.status);
        if (gateMeta) {
          if (!cancelled) {
            setGateMessage(gateMeta.message);
            setStats({ products: 0, batches: 0, codes: 0 });
          }
          return;
        }
        if (!cancelled) setGateMessage("");

        const [productsRes, batchesRes] = await Promise.all([
          apiGet("/api/v1/producer/products"),
          apiGet("/api/v1/producer/batches?limit=1"),
        ]);
        const productsTotal = productsRes?.data?.length || 0;
        const batchesTotal = batchesRes?.data?.pagination?.total || 0;
        if (!cancelled) setStats({ products: productsTotal, batches: batchesTotal, codes: 0 });
      } catch (_) {
        if (!cancelled) {
          setStats({ products: 0, batches: 0, codes: 0 });
          setError("ড্যাশবোর্ড ডেটা লোড করা যাচ্ছে না।");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Producer Dashboard</h2>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {gateMessage ? (
        <div className={`alert alert-${getGateMeta(kyc?.status)?.tone || "warning"} d-flex flex-wrap gap-3 align-items-center justify-content-between`}>
          <div>
            <div className="fw-semibold">KYC Status: {kyc?.status || "NOT_SUBMITTED"}</div>
            <div className="small text-secondary">{gateMessage}</div>
          </div>
          <Link href="/producer/kyc" className="btn btn-sm btn-outline-primary">
            Update KYC
          </Link>
        </div>
      ) : null}
      <div className="card mb-4">
        <div className="card-body">
          <h6 className="mb-2">Code Search</h6>
          <div className="d-flex gap-2 flex-wrap">
            <input
              className="form-control"
              placeholder="Enter code (A-Z, 0-9)"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              style={{ maxWidth: 300 }}
            />
            <button
              className="btn btn-outline-primary"
              disabled={searchLoading || !searchCode.trim()}
              onClick={async () => {
                setSearchLoading(true);
                setSearchError("");
                setSearchResult(null);
                try {
                  const res = await apiGet(`/api/v1/producer/codes/search?code=${encodeURIComponent(searchCode.trim())}`);
                  setSearchResult(res?.data || null);
                } catch (e) {
                  setSearchError(e?.message || "Code not found");
                } finally {
                  setSearchLoading(false);
                }
              }}
            >
              {searchLoading ? "Searching..." : "Search"}
            </button>
          </div>
          <div className="text-secondary small mt-2">Length 8-15, uppercase alphanumeric only.</div>
          {searchError ? <div className="text-danger small mt-2">{searchError}</div> : null}
          {searchResult ? (
            <div className="mt-3 border rounded p-3">
              <div className="fw-semibold">Code: {searchResult.code}</div>
              <div className="text-secondary small">
                Status: {searchResult.status}
                {searchResult.isSold ? " • SOLD" : ""}
                {!searchResult.isSold && searchResult.isVerified ? " • VERIFIED" : ""}
              </div>
              <div className="mt-2">
                <div className="small"><strong>Product:</strong> {searchResult.product?.brandName} • {searchResult.product?.productName}</div>
                <div className="small"><strong>Batch:</strong> {searchResult.batch?.batchNo}</div>
                <div className="small"><strong>Verified:</strong> {searchResult.firstVerifiedAt ? new Date(searchResult.firstVerifiedAt).toLocaleString() : "—"}</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {loading ? (
        <p className="text-secondary">Loading…</p>
      ) : (
        <div className="row g-3">
          <div className="col-md-4">
            <div className="card">
              <div className="card-body">
                <h6 className="mb-1">Products</h6>
                <div className="h4 mb-0">{stats.products}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card">
              <div className="card-body">
                <h6 className="mb-1">Batches</h6>
                <div className="h4 mb-0">{stats.batches}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card">
              <div className="card-body">
                <h6 className="mb-1">Codes (MVP)</h6>
                <div className="h4 mb-0">{stats.codes}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
