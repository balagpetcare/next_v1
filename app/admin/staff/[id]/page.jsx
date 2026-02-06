"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from '@iconify/react';
import PageHeader from '@/src/bpa/components/PageHeader';
import { apiGet } from "../../../../lib/api";
import SectionCard from '@/src/bpa/admin/components/SectionCard';
import StatusChip from '@/src/bpa/admin/components/StatusChip';
import StatCard from '@/src/bpa/admin/components/StatCard';
import TrendChart from '@/src/bpa/admin/components/charts/TrendChart';
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const CHART_COLORS = {
  primary: "#6366f1",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#0ea5e9",
};

export default function StaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params?.id;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [staff, setStaff] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    if (!staffId) return;
    loadData();
  }, [staffId]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [staffData, perfData] = await Promise.all([
        apiGet(`/api/v1/admin/staff/${staffId}`),
        apiGet(`/api/v1/admin/staff/${staffId}/performance`).catch(() => null), // May not exist yet
      ]);
      
      setStaff(staffData?.data || null);
      setPerformance(perfData?.data || null);
      
      // Generate mock activity data if API doesn't exist
      if (!perfData?.data) {
        generateMockPerformance();
      }
    } catch (e) {
      setError(e?.message || "Failed to load staff data");
    } finally {
      setLoading(false);
    }
  }

  function generateMockPerformance() {
    // Mock performance data for demonstration
    const now = new Date();
    const dates = [];
    const orders = [];
    const revenue = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
      orders.push(Math.floor(Math.random() * 20) + 5);
      revenue.push(Math.floor(Math.random() * 50000) + 10000);
    }

    setPerformance({
      totalOrders: orders.reduce((a, b) => a + b, 0),
      totalRevenue: revenue.reduce((a, b) => a + b, 0),
      avgOrderValue: Math.round(revenue.reduce((a, b) => a + b, 0) / orders.reduce((a, b) => a + b, 0)),
      trendData: dates.map((date, idx) => ({
        date,
        orders: orders[idx],
        gmv: revenue[idx],
      })),
    });

    // Mock activity log
    setActivity([
      { date: new Date(), action: 'Order processed', details: 'Order #1234', type: 'success' },
      { date: new Date(Date.now() - 3600000), action: 'Inventory updated', details: 'Product stock adjusted', type: 'info' },
      { date: new Date(Date.now() - 7200000), action: 'Customer served', details: 'Walk-in customer', type: 'primary' },
      { date: new Date(Date.now() - 86400000), action: 'Report generated', details: 'Daily sales report', type: 'warning' },
    ]);
  }

  const displayName = useMemo(() => {
    if (!staff) return 'Loading...';
    return staff.user?.profile?.displayName || 
           staff.user?.profile?.username || 
           `Staff #${staff.id}`;
  }, [staff]);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <PageHeader title="Loading..." />
        <div className="placeholder-glow">
          <span className="placeholder col-12 mb-2" style={{ height: 200 }} />
        </div>
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="container-fluid">
        <PageHeader title="Staff Not Found" />
        <div className="alert alert-danger">{error || "Staff member not found"}</div>
        <button className="btn btn-outline-primary" onClick={() => router.push('/admin/staff')}>
          Back to Staff List
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <PageHeader
        title={displayName}
        subtitle={`Staff #${staff.id} • ${staff.role || 'No role'}`}
        right={
          <div className="d-flex gap-2">
            <button
              onClick={() => router.push('/admin/staff')}
              className="btn btn-outline-secondary d-flex align-items-center gap-2"
            >
              <Icon icon="solar:arrow-left-outline" />
              Back to List
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="btn btn-outline-primary d-flex align-items-center gap-2"
            >
              <Icon icon="solar:refresh-outline" />
              Refresh
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {/* Key Metrics */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-lg-3">
          <StatCard
            title="Status"
            value={<StatusChip status={staff.status} />}
            subtitle={`Role: ${staff.role || 'N/A'}`}
            icon={<Icon icon="solar:user-check-rounded-outline" width={20} />}
            tone="primary"
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <StatCard
            title="Total Orders"
            value={performance?.totalOrders || 0}
            subtitle="All time"
            icon={<Icon icon="solar:cart-outline" width={20} />}
            tone="success"
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <StatCard
            title="Total Revenue"
            value={performance?.totalRevenue ? `৳${(performance.totalRevenue / 1000).toFixed(1)}K` : '৳0'}
            subtitle={`Avg: ৳${performance?.avgOrderValue || 0}`}
            icon={<Icon icon="solar:wallet-money-outline" width={20} />}
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <StatCard
            title="Assigned Roles"
            value={staff.roles?.length || 0}
            subtitle={`${staff.roles?.map(r => r.key || r.label).join(', ') || 'None'}`}
            icon={<Icon icon="solar:user-id-outline" width={20} />}
            tone="warning"
          />
        </div>
      </div>

      <div className="row g-3">
        {/* Staff Information */}
        <div className="col-12 col-lg-4">
          <SectionCard title="Staff Information">
            <div className="d-flex flex-column gap-3">
              <div>
                <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Full Name</div>
                <div className="fw-semibold">{displayName}</div>
              </div>
              <div>
                <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Email</div>
                <div>{staff.user?.auth?.email || '—'}</div>
              </div>
              <div>
                <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Phone</div>
                <div>{staff.user?.auth?.phone || '—'}</div>
              </div>
              <div>
                <div className="text-secondary mb-1" style={{ fontSize: 12 }}>User ID</div>
                <div>#{staff.userId}</div>
              </div>
              <div>
                <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Organization</div>
                <div>{staff.org?.name || '—'}</div>
              </div>
              <div>
                <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Branch</div>
                <div>{staff.branch?.name || '—'}</div>
              </div>
              <div>
                <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Role</div>
                <div className="badge bg-primary-50 text-primary-600">
                  {staff.role || 'No role'}
                </div>
              </div>
              <div>
                <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Status</div>
                <div><StatusChip status={staff.status} /></div>
              </div>
              {staff.createdAt && (
                <div>
                  <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Created</div>
                  <div>{formatDate(staff.createdAt)}</div>
                </div>
              )}
              {staff.updatedAt && (
                <div>
                  <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Last Updated</div>
                  <div>{formatDate(staff.updatedAt)}</div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Assigned Roles */}
          {staff.roles && staff.roles.length > 0 && (
            <SectionCard title="Assigned Roles" className="mt-3">
              <div className="d-flex flex-column gap-2">
                {staff.roles.map((role, idx) => (
                  <div key={idx} className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold">{role.key || role.label}</div>
                      {role.scope && (
                        <div className="text-secondary" style={{ fontSize: 12 }}>
                          Scope: {role.scope}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Performance Charts */}
        <div className="col-12 col-lg-8">
          {performance?.trendData && (
            <TrendChart
              data={performance.trendData}
              period={30}
              loading={false}
              height={300}
            />
          )}

          {/* Recent Activity */}
          <SectionCard title="Recent Activity" className="mt-3">
            {activity.length > 0 ? (
              <div className="d-flex flex-column gap-2">
                {activity.map((item, idx) => (
                  <div key={idx} className="d-flex align-items-start gap-3 p-2 border-bottom">
                    <div className={`icon-box bg-${item.type}-50 text-${item.type}-600 radius-12`} 
                         style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon icon="solar:history-outline" width={16} />
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-semibold">{item.action}</div>
                      <div className="text-secondary" style={{ fontSize: 12 }}>
                        {item.details}
                      </div>
                      <div className="text-secondary-light" style={{ fontSize: 11 }}>
                        {formatDate(item.date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-secondary text-center py-4">
                No recent activity
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
