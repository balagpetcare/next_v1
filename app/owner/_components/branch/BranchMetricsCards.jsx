"use client";

export default function BranchMetricsCards({ metrics, loading }) {
  if (loading) {
    return (
      <div className="row g-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="col-md-6 col-lg-3">
            <div className="card radius-12">
              <div className="card-body p-24">
                <div className="placeholder-glow">
                  <span className="placeholder col-6 mb-2 d-block" />
                  <span className="placeholder col-10" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return `৳${Number(amount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (num) => {
    return Number(num || 0).toLocaleString("en-BD");
  };

  const cards = [
    {
      title: "Today's Sales",
      value: formatCurrency(metrics?.todaySales || 0),
      icon: "ri-money-dollar-circle-line",
      color: "success",
      change: metrics?.todaySalesChange,
      changeLabel: "vs yesterday",
    },
    {
      title: "This Week's Sales",
      value: formatCurrency(metrics?.weekSales || 0),
      icon: "ri-calendar-line",
      color: "primary",
      change: metrics?.weekSalesChange,
      changeLabel: "vs last week",
    },
    {
      title: "Total Profit",
      value: formatCurrency(metrics?.totalProfit || 0),
      icon: "ri-profit-line",
      color: "info",
      change: metrics?.profitChange,
      changeLabel: "vs last month",
    },
    {
      title: "Total Orders",
      value: formatNumber(metrics?.totalOrders || 0),
      icon: "ri-shopping-bag-line",
      color: "warning",
      change: metrics?.ordersChange,
      changeLabel: "vs last month",
    },
  ];

  return (
    <div className="row g-4">
      {cards.map((card, idx) => (
        <div key={idx} className="col-md-6 col-lg-3">
          <div className="card radius-12">
            <div className="card-body p-24">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <div className="text-secondary-light mb-1" style={{ fontSize: 13 }}>
                    {card.title}
                  </div>
                  <h4 className="mb-0 fw-bold">{card.value}</h4>
                </div>
                <div className={`text-${card.color}`} style={{ fontSize: 32 }}>
                  <i className={card.icon} />
                </div>
              </div>
              {card.change !== undefined && card.change !== null && (
                <div className="d-flex align-items-center">
                  <span
                    className={`badge bg-${card.change >= 0 ? "success" : "danger"}-light radius-8 me-2`}
                    style={{ fontSize: 11 }}
                  >
                    <i className={`ri-arrow-${card.change >= 0 ? "up" : "down"}-line me-1`} />
                    {Math.abs(card.change).toFixed(1)}%
                  </span>
                  <span className="text-secondary-light" style={{ fontSize: 12 }}>
                    {card.changeLabel}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
