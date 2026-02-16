"use client";

export default function LiveDemo() {
  return (
    <section id="live-demo" className="pl-section pl-demo" aria-labelledby="pl-demo-title">
      <h2 id="pl-demo-title" className="pl-demo-title">Live Verification Demo</h2>
      <div className="pl-container pl-demo-inner">
        <div className="pl-demo-panels">
          <div className="pl-demo-panel pl-demo-panel--verified">
            <div className="pl-demo-panel-header">VERIFIED</div>
            <div className="pl-demo-panel-body">
              <div className="pl-demo-product">
                <div className="pl-demo-product-img">
                  <div className="pl-demo-product-scan" />
                </div>
                <div className="pl-demo-meta">
                  <div><span className="pl-demo-label">Name</span><span className="pl-demo-value">Premium W... Model X</span></div>
                  <div><span className="pl-demo-label">Status</span><span className="pl-demo-value pl-demo-value--green">Authentic</span></div>
                  <div><span className="pl-demo-label">Scan Time</span><span className="pl-demo-value">Just now</span></div>
                  <div><span className="pl-demo-label">Location</span><span className="pl-demo-value">New York, USA</span></div>
                </div>
              </div>
              <div className="pl-demo-history-map-row">
                <div className="pl-demo-history-col">
                  <h4 className="pl-demo-history-title">History</h4>
                  <ul className="pl-demo-history-list pl-demo-history-list--green">
                    <li>Premium Watch Model X — New York, USA</li>
                    <li>Scanned DGT 5367 — New York, USA</li>
                    <li>Manufactured — Factory A</li>
                  </ul>
                </div>
                <div className="pl-demo-map-wrap">
                  <div className="pl-demo-map pl-demo-map--green" aria-hidden>
                    <div className="pl-demo-map-pins" />
                    <span className="pl-demo-map-dist">1.2 km</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="pl-demo-panel pl-demo-panel--duplicate">
            <div className="pl-demo-panel-header">DUPLICATE WARNING</div>
            <div className="pl-demo-panel-body">
              <div className="pl-demo-product">
                <div className="pl-demo-product-img pl-demo-product-img--red">
                  <div className="pl-demo-product-scan" />
                </div>
                <div className="pl-demo-meta">
                  <div><span className="pl-demo-label">Status</span><span className="pl-demo-value pl-demo-value--red">Duplicate / Potential Fraud</span></div>
                  <div><span className="pl-demo-label">Warning</span><span className="pl-demo-value pl-demo-value--red pl-demo-warn-text">This item has been scanned multiple times from different locations!</span></div>
                  <div><span className="pl-demo-label">Scan Time</span><span className="pl-demo-value">Just now</span></div>
                  <div><span className="pl-demo-label">Location</span><span className="pl-demo-value">Shanghai, China</span></div>
                </div>
              </div>
              <div className="pl-demo-history-map-row">
                <div className="pl-demo-history-col">
                  <h4 className="pl-demo-history-title">History</h4>
                  <ul className="pl-demo-history-list pl-demo-history-list--red">
                    <li>Scanned DGT 5367 — Shanghai, China</li>
                    <li>Scanned DGT 5367 — New York, USA</li>
                  </ul>
                </div>
                <div className="pl-demo-map-wrap">
                  <div className="pl-demo-map pl-demo-map--red" aria-hidden>
                    <div className="pl-demo-map-pins" />
                    <span className="pl-demo-map-dist">4.2 km</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
