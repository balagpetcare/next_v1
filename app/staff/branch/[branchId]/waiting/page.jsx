"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import PageHeader from "@/src/bpa/components/ui/PageHeader";

export default function BranchAccessWaitingPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId || ""), [params]);
  
  const [branch, setBranch] = useState(null);
  const [accessStatus, setAccessStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!branchId) return;
    loadBranchAndAccessStatus();
    
    // Check access status every 10 seconds
    const interval = setInterval(() => {
      checkAccessStatus();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [branchId]);

  async function loadBranchAndAccessStatus() {
    try {
      setLoading(true);
      
      // Load branch info
      const branchData = await apiGet(`/api/v1/branches/${branchId}`).catch(() => null);
      if (branchData?.data || branchData) {
        setBranch(branchData?.data || branchData);
      }
      
      // Check access status
      await checkAccessStatus();
    } catch (error) {
      console.error("Error loading branch:", error);
    } finally {
      setLoading(false);
    }
  }

  async function checkAccessStatus() {
    try {
      setChecking(true);
      const response = await apiGet(`/api/v1/branch-access/check/${branchId}`);
      
      if (response.success && response.data?.hasAccess) {
        // Access approved! Redirect to branch dashboard
        router.push(`/staff/branch/${branchId}`);
        return;
      }
      
      // Get detailed access status
      const requestsResponse = await apiGet("/api/v1/branch-access/my-requests");
      if (requestsResponse.success && requestsResponse.data) {
        const permission = requestsResponse.data.find(
          (p) => p.branchId === Number(branchId)
        );
        if (permission) {
          setAccessStatus(permission.status);
          
          // If approved, redirect
          if (permission.status === "APPROVED") {
            router.push(`/staff/branch/${branchId}`);
          }
        }
      }
    } catch (error) {
      console.error("Error checking access:", error);
    } finally {
      setChecking(false);
    }
  }

  if (loading) {
    return (
      <div className="container py-40">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-16 text-secondary-light">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-40">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <Card>
            <div className="text-center py-40">
              <div className="mb-30">
                <i className="ri-time-line text-warning" style={{ fontSize: "64px" }}></i>
              </div>
              
              <h3 className="mb-16">অনুগ্রহ করে অপেক্ষা করুন</h3>
              
              <p className="text-secondary-light mb-8">
                আপনার <strong>{branch?.name || "এই branch"}</strong>-এ access request করা হয়েছে।
              </p>
              
              <p className="text-secondary-light mb-30">
                Branch Manager-এর approval পাওয়ার পর আপনি এই branch-এ কাজ করতে পারবেন।
              </p>

              {accessStatus === "PENDING" && (
                <div className="alert alert-info mb-30">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="ri-information-line me-8"></i>
                    <span>আপনার request এখনও review-এর অপেক্ষায় আছে</span>
                  </div>
                </div>
              )}

              {accessStatus === "REVOKED" && (
                <div className="alert alert-danger mb-30">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="ri-close-circle-line me-8"></i>
                    <span>আপনার access revoked হয়েছে</span>
                  </div>
                </div>
              )}

              {accessStatus === "EXPIRED" && (
                <div className="alert alert-warning mb-30">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="ri-time-expired-line me-8"></i>
                    <span>আপনার access expire হয়ে গেছে</span>
                  </div>
                </div>
              )}

              <div className="d-flex gap-12 justify-content-center">
                <button
                  className="btn btn-outline-primary"
                  onClick={checkAccessStatus}
                  disabled={checking}
                >
                  {checking ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-8"></span>
                      Checking...
                    </>
                  ) : (
                    <>
                      <i className="ri-refresh-line me-8"></i>
                      আবার Check করুন
                    </>
                  )}
                </button>
                
                <button
                  className="btn btn-primary"
                  onClick={() => router.push("/staff/branches")}
                >
                  <i className="ri-arrow-left-line me-8"></i>
                  Branches-এ ফিরে যান
                </button>
              </div>

              <div className="mt-30 pt-30 border-top">
                <p className="text-secondary-light text-sm mb-0">
                  <i className="ri-information-line me-4"></i>
                  System automatically check করবে প্রতি ১০ সেকেন্ডে
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
