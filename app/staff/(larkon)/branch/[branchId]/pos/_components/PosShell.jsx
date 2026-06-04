/* eslint-disable react/prop-types */
"use client";

const WORKSPACE_STYLE = `
            .pos-reference-workspace {
              display: flex;
              flex-direction: column;
              flex: 1 1 auto;
              min-height: 0;
              overflow: visible;
            }
            .pos-enterprise-scroll {
              width: 100%;
              height: 100%;
              overflow: visible;
              -webkit-overflow-scrolling: touch;
              flex: 1 1 auto;
              min-height: 0;
            }
            .pos-reference-workspace .pos-content-shell {
              border: 1px solid #dce3ef;
              box-shadow: 0 8px 26px rgba(15, 23, 42, 0.06);
              background: #f8fafc;
              width: 100%;
              min-width: 0;
              height: 100%;
              min-height: 0;
              display: flex;
              flex-direction: column;
              overflow: visible;
            }
            .pos-enterprise-grid {
              display: grid;
              grid-template-columns: clamp(260px, 18vw, 290px) minmax(0, 1fr) clamp(300px, 21vw, 330px);
              gap: 8px;
              flex: 1 1 auto;
              height: 100%;
              min-height: 0;
              align-items: stretch;
              background: #eef3f9;
              padding: 8px;
              overflow: visible;
            }
            .pos-reference-workspace .pos-column {
              padding: 0;
              min-height: 0;
              min-width: 0;
              display: flex;
              flex-direction: column;
              overflow: visible;
            }
            .pos-reference-workspace .pos-column-left {
              background: #fbfcfe;
            }
            .pos-reference-workspace .pos-column-center {
              background: #fff;
            }
            .pos-reference-workspace .pos-column-right {
              background: #f8fafc;
            }
            .pos-reference-workspace .card {
              border: 1px solid #e1e8f2;
              box-shadow: none;
              border-radius: 9px;
              min-height: 0;
            }
            .pos-reference-workspace .card-header {
              padding: 6px 8px;
              border-bottom: 1px solid #edf1f7;
              background: #ffffff;
            }
            .pos-reference-workspace .card-header h6 {
              font-size: 0.78rem;
              letter-spacing: 0.02em;
              line-height: 1.2;
            }
            .pos-reference-workspace .card-header .text-secondary-light {
              margin-top: 2px !important;
              font-size: 0.72rem;
              line-height: 1.3;
            }
            .pos-reference-workspace .card-body {
              padding: 7px 8px;
              min-height: 0;
            }
            .pos-reference-workspace .pos-shell-card {
              flex: 1;
              min-height: 0;
              display: flex;
              flex-direction: column;
            }
            .pos-reference-workspace .pos-shell-card > .card-body {
              flex: 1;
              min-height: 0;
              display: flex;
              flex-direction: column;
            }
            .pos-reference-workspace .pos-product-list {
              flex: 1;
              min-height: 0;
              overflow-y: auto;
              margin-right: -4px;
              padding-right: 4px;
            }
            .pos-reference-workspace .pos-product-item {
              transition: background-color 0.1s ease;
            }
            .pos-reference-workspace .pos-product-item:hover {
              background: #f1f5ff;
            }
            .pos-reference-workspace .pos-quick-search .pos-quick-search__input {
              height: 38px;
              font-size: 0.88rem;
              padding-left: 2.4rem;
              padding-right: 0.65rem;
              line-height: 1.2;
              font-weight: 500;
              border-radius: 8px;
            }
            .pos-reference-workspace .pos-quick-search .pos-quick-search__icon {
              left: 12px;
              z-index: 1;
              pointer-events: none;
              font-size: 1rem;
            }
            .pos-reference-workspace .pos-quick-search .btn {
              min-width: 40px;
              height: 38px;
              border-radius: 8px;
              padding: 0;
            }
            .pos-reference-workspace .pos-cart-workspace {
              display: flex;
              flex-direction: column;
              flex: 1 1 auto;
              min-height: 0;
              height: 100%;
              gap: 5px !important;
            }
            .pos-reference-workspace .pos-cart-table-host {
              flex: 1 1 auto;
              min-height: 0;
              display: flex;
              flex-direction: column;
              min-width: 0;
            }
            .pos-reference-workspace .pos-cart-table-wrap {
              flex: 1;
              min-height: 0;
              max-height: none;
              overflow-x: auto;
              overflow-y: auto;
              margin-right: -4px;
              padding-right: 4px;
            }
            .pos-reference-workspace .pos-cart-table {
              font-size: 0.78rem;
            }
            .pos-reference-workspace .pos-cart-table thead th {
              position: sticky;
              top: 0;
              background: #eef2f9;
              z-index: 1;
              border-bottom: 1px solid #dce3ef;
              padding-top: 4px;
              padding-bottom: 4px;
              font-size: 0.66rem;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              color: #64748b;
            }
            .pos-reference-workspace .pos-cart-table td,
            .pos-reference-workspace .pos-cart-table th {
              vertical-align: middle;
              padding-top: 5px;
              padding-bottom: 5px;
              padding-left: 6px;
              padding-right: 6px;
            }
            .pos-reference-workspace .pos-qty-pill {
              min-height: 26px;
              box-shadow: inset 0 0 0 1px rgba(226, 232, 240, 0.7);
            }
            .pos-reference-workspace .pos-right-rail {
              position: static !important;
              display: flex;
              flex-direction: column;
              flex: 1 1 auto;
              min-height: 0;
              overflow-y: auto;
              gap: 6px !important;
              margin-right: -4px;
              padding-right: 4px;
            }
            .pos-reference-workspace .pos-right-rail > .card,
            .pos-reference-workspace .pos-right-rail > .pos-payment-summary {
              flex-shrink: 0;
            }
            .pos-reference-workspace .pos-checkout-card {
              position: sticky;
              bottom: 0;
              z-index: 3;
              box-shadow: 0 -8px 18px rgba(15, 23, 42, 0.08);
            }
            .pos-reference-workspace .pos-right-card .card-body {
              padding: 7px 8px;
            }
            .pos-reference-workspace .pos-checkout-card .card-body {
              padding: 6px 8px;
            }
            .pos-reference-workspace .pos-checkout-card .pos-payment-method-grid .btn {
              min-height: 38px;
              height: 38px;
              padding-top: 0 !important;
              padding-bottom: 0 !important;
            }
            .pos-reference-workspace .pos-cart-tabs-card .card-body {
              padding: 6px 8px;
            }
            .pos-reference-workspace .pos-payment-summary {
              border-color: #dce3ef !important;
              background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%) !important;
            }
            .pos-reference-workspace .pos-catalog-card > .card-body {
              display: flex;
              flex-direction: column;
              flex: 1;
              min-height: 0;
            }
            .pos-reference-workspace .pos-cart-table-root > .card-body {
              display: flex;
              flex-direction: column;
              flex: 1;
              min-height: 0;
              padding: 5px 6px;
            }
            .pos-reference-workspace .pos-action-bar {
              margin-top: 0 !important;
            }
            .pos-reference-workspace .alert {
              padding: 6px 10px;
              margin-bottom: 8px;
              font-size: 0.78rem;
            }
            .pos-reference-workspace .btn.btn-sm {
              min-height: 28px;
            }
            .pos-reference-workspace .form-control-sm,
            .pos-reference-workspace .form-select-sm {
              min-height: 28px;
              font-size: 0.78rem;
            }
            @keyframes pos-scan-ring {
              0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.45); }
              100% { box-shadow: 0 0 0 14px rgba(37, 99, 235, 0); }
            }
            .pos-reference-workspace .pos-scanner-flash .pos-quick-search {
              animation: pos-scan-ring 0.42s ease-out 1;
            }
            .pos-reference-workspace .pos-scanner-status {
              font-size: 10px;
              letter-spacing: 0.04em;
              font-weight: 600;
              text-transform: uppercase;
            }
            .pos-reference-workspace .pos-scanner-status--ready {
              background: #e8f5e9;
              color: #1b5e20;
            }
            .pos-reference-workspace .pos-scanner-status--searching {
              background: #e3f2fd;
              color: #0d47a1;
            }
            .pos-reference-workspace .pos-scanner-status--added {
              background: #d1fae5;
              color: #065f46;
            }
            .pos-reference-workspace .pos-scanner-status--not_found {
              background: #ffebee;
              color: #b71c1c;
            }
            .pos-reference-workspace .pos-scanner-status--no_price {
              background: #fff8e1;
              color: #e65100;
            }
            @media (max-width: 1399.98px) {
              .pos-reference-workspace .pos-enterprise-grid {
                grid-template-columns: 260px minmax(0, 1fr) 300px;
              }
            }
            @media (max-width: 1199.98px) {
              .pos-enterprise-scroll {
                overflow-x: auto;
              }
              .pos-reference-workspace .pos-content-shell {
                min-width: 1040px;
                min-height: 0;
              }
              .pos-reference-workspace .pos-right-rail {
                max-height: none;
              }
            }
            @media (max-width: 991.98px) {
              .pos-enterprise-scroll {
                overflow: auto;
                height: auto;
              }
              .pos-reference-workspace .pos-content-shell {
                min-width: 0;
                height: auto;
                min-height: 0;
              }
              .pos-reference-workspace .pos-enterprise-grid {
                grid-template-columns: 1fr;
                height: auto;
                padding: 8px;
              }
              .pos-reference-workspace .pos-column-left,
              .pos-reference-workspace .pos-column-center {
                border-right: 0;
              }
            }
          `;

export default function PosShell({ successAlert, errorAlert, leftColumn, centerColumn, rightColumn, children }) {
  return (
    <div className="pos-reference-workspace">
      {successAlert}
      {errorAlert}

      <style
        dangerouslySetInnerHTML={{
          __html: WORKSPACE_STYLE,
        }}
      />

      <div className="pos-enterprise-scroll">
        <div className="card radius-12 pos-content-shell">
          <div className="pos-enterprise-grid">
            <div className="pos-column pos-column-left">{leftColumn}</div>
            <div className="pos-column pos-column-center">{centerColumn}</div>
            <div className="pos-column pos-column-right" id="pos-checkout-panel">
              {rightColumn}
            </div>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
