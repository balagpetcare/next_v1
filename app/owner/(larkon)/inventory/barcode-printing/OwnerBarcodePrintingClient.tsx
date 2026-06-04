"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { Nav, Form, Button, Table, Alert, Spinner, Badge } from "react-bootstrap";
import BarcodeLabelPreview, { type LabelPayload } from "@/app/_components/barcode/BarcodeLabelPreview";
import type { LabelTemplateConfig, LabelFieldKey } from "@/app/_components/barcode/labelTemplateConfig";
import {
  DEFAULT_LABEL_TEMPLATE,
  labelFieldDensityWarning,
  loadOwnerLabelTemplate,
  mapPresetToLayoutId,
  saveOwnerLabelTemplate,
} from "@/app/_components/barcode/labelTemplateConfig";
import { BARCODE_LABEL_PRESETS } from "@/app/_components/barcode/labelPresets";
import {
  fetchBranchLotsForLabels,
  fetchProductBarcodeLabel,
  fetchBatchBarcodeLabel,
  type BranchLotLabelRow,
} from "@/lib/barcodeLabelsApi";

type Location = { id: number; name: string; branch?: { id: number; name?: string } };

type ProductRow = {
  id: number;
  name: string;
  variants?: Array<{ id: number; sku: string; title: string; barcode?: string | null; isActive?: boolean }>;
};

const FIELD_LABELS: Record<LabelFieldKey, string> = {
  productName: "Product Name",
  variantTitle: "Variant Title",
  brand: "Brand",
  sku: "SKU",
  barcodeText: "Barcode Text",
  mrp: "MRP",
  sellingPrice: "Selling Price",
  batchNo: "Batch / Lot No",
  mfgDate: "MFG Date",
  expiryDate: "Expiry Date",
  producerName: "Producer",
  importerName: "Importer",
  supplierName: "Supplier",
  manufacturerName: "Manufacturer",
  originCountry: "Origin Country",
  packSize: "Pack / Net Weight",
  branchName: "Branch Name",
  orgName: "Company / Org",
  printDate: "Print Date",
  customText1: "Custom Text 1",
  customText2: "Custom Text 2",
};

export default function OwnerBarcodePrintingClient() {
  const [tab, setTab] = useState<"sku" | "batch" | "templates" | "history">("sku");
  const [template, setTemplate] = useState<LabelTemplateConfig>(DEFAULT_LABEL_TEMPLATE);
  useEffect(() => {
    setTemplate(loadOwnerLabelTemplate());
  }, []);

  const persistTemplate = (next: LabelTemplateConfig) => {
    setTemplate(next);
    saveOwnerLabelTemplate(next);
  };

  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [branchId, setBranchId] = useState<number | null>(null);
  const [branchName, setBranchName] = useState("");

  const [prodQ, setProdQ] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [prodLoading, setProdLoading] = useState(false);

  const [lots, setLots] = useState<BranchLotLabelRow[]>([]);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [lotsErr, setLotsErr] = useState("");
  const [batchSearch, setBatchSearch] = useState("");

  const [policyNote, setPolicyNote] = useState<string | null>(null);

  const presetId = mapPresetToLayoutId(template.sizePreset);

  useEffect(() => {
    void (async () => {
      try {
        const res = await ownerGet<{ data: Location[] }>("/api/v1/inventory/locations");
        const list = Array.isArray(res?.data) ? res.data : [];
        setLocations(list);
        setLocationId((prev) => prev || (list.length ? String(list[0].id) : ""));
      } catch {
        setLocations([]);
      }
    })();
  }, []);

  useEffect(() => {
    const loc = locations.find((l) => String(l.id) === locationId);
    const bid = loc?.branch?.id;
    if (bid != null && Number.isFinite(Number(bid))) {
      setBranchId(Number(bid));
      setBranchName(loc?.branch?.name ?? "");
    } else {
      setBranchId(null);
      setBranchName("");
    }
  }, [locations, locationId]);

  useEffect(() => {
    if (tab !== "templates") {
      setPolicyNote(null);
      return;
    }
    setPolicyNote(
      "Branch barcode policy is managed in backend branch settings. Field visibility and template defaults below are stored in this browser only."
    );
  }, [tab]);

  const loadProducts = useCallback(async () => {
    setProdLoading(true);
    try {
      const q = prodQ.trim() ? `&search=${encodeURIComponent(prodQ.trim())}` : "";
      const res = await ownerGet<{ data?: { items?: ProductRow[] } }>(`/api/v1/products?limit=80${q}`);
      setProducts(Array.isArray(res?.data?.items) ? res.data.items : []);
    } catch {
      setProducts([]);
    } finally {
      setProdLoading(false);
    }
  }, [prodQ]);

  useEffect(() => {
    if (tab === "sku") void loadProducts();
  }, [tab, loadProducts]);

  const loadLots = useCallback(async () => {
    if (!branchId) return;
    setLotsLoading(true);
    setLotsErr("");
    try {
      const data = await fetchBranchLotsForLabels(branchId, { q: batchSearch || undefined });
      setLots(data.items);
    } catch (e) {
      setLotsErr(e instanceof Error ? e.message : "Failed");
      setLots([]);
    } finally {
      setLotsLoading(false);
    }
  }, [branchId, batchSearch]);

  useEffect(() => {
    if (tab === "batch" && branchId) void loadLots();
  }, [tab, branchId, loadLots]);

  const flatSkus = useMemo(() => {
    const rows: { productName: string; variantId: number; sku: string; title: string; barcode: string | null }[] = [];
    for (const p of products) {
      for (const v of p.variants || []) {
        rows.push({
          productName: p.name,
          variantId: v.id,
          sku: v.sku,
          title: v.title,
          barcode: v.barcode ?? null,
        });
      }
    }
    return rows;
  }, [products]);

  const densityWarn = labelFieldDensityWarning(presetId, template);

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Barcode Printing"
        subtitle="SKU and batch labels; template defaults stored in this browser"
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Barcode Printing", href: "/owner/inventory/barcode-printing" },
        ]}
      />
      <div className="px-3 pb-4">
        {densityWarn ? <Alert variant="warning">{densityWarn}</Alert> : null}
        <div className="mb-3 d-flex flex-wrap gap-2 align-items-center">
          <span className="small text-muted">Context location</span>
          <Form.Select
            size="sm"
            style={{ maxWidth: 280 }}
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="radius-12"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Form.Select>
          {branchId ? (
            <Badge bg="secondary">
              Branch #{branchId} {branchName ? `— ${branchName}` : ""}
            </Badge>
          ) : (
            <span className="small text-danger">Pick a location tied to a branch for label APIs.</span>
          )}
        </div>

        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link active={tab === "sku"} onClick={() => setTab("sku")}>
              SKU Labels
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link active={tab === "batch"} onClick={() => setTab("batch")}>
              Batch Labels
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link active={tab === "templates"} onClick={() => setTab("templates")}>
              Templates / Settings
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link active={tab === "history"} onClick={() => setTab("history")}>
              History
            </Nav.Link>
          </Nav.Item>
        </Nav>

        {tab === "sku" ? (
          <>
            <div className="d-flex gap-2 mb-2">
              <Form.Control size="sm" placeholder="Search products…" value={prodQ} onChange={(e) => setProdQ(e.target.value)} />
              <Button size="sm" onClick={() => void loadProducts()}>
                Search
              </Button>
            </div>
            {prodLoading ? <Spinner size="sm" animation="border" /> : null}
            <Table size="sm" bordered hover responsive className="small">
              <thead className="table-light">
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {flatSkus.map((r) => (
                  <tr key={r.variantId}>
                    <td>{r.productName}</td>
                    <td>{r.title}</td>
                    <td className="font-monospace">{r.sku}</td>
                    <td className="font-monospace">{r.barcode || "—"}</td>
                    <td>
                      {branchId ? (
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() =>
                            window.open(
                              `/owner/inventory/labels/product/${r.variantId}/print?branchId=${branchId}`,
                              "_blank"
                            )
                          }
                        >
                          Print
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        ) : null}

        {tab === "batch" ? (
          <>
            <div className="d-flex gap-2 mb-2">
              <Form.Control
                size="sm"
                placeholder="Filter batches…"
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
              />
              <Button size="sm" onClick={() => void loadLots()} disabled={!branchId}>
                Apply
              </Button>
            </div>
            {lotsErr ? <Alert variant="danger">{lotsErr}</Alert> : null}
            {lotsLoading ? <Spinner size="sm" animation="border" /> : null}
            <Table size="sm" bordered responsive className="small">
              <thead className="table-light">
                <tr>
                  <th>Product</th>
                  <th>Lot</th>
                  <th>Label bc</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lots.map((row) => (
                  <tr key={row.lotId}>
                    <td>{row.productName}</td>
                    <td>{row.lotCode}</td>
                    <td className="font-monospace">{row.labelBarcode || "—"}</td>
                    <td>
                      {branchId ? (
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() =>
                            window.open(`/owner/inventory/labels/batch/${row.lotId}/print?branchId=${branchId}`, "_blank")
                          }
                        >
                          Print
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        ) : null}

        {tab === "templates" ? (
          <div className="card border radius-12">
            <div className="card-body">
              {policyNote ? <p className="small text-muted">{policyNote}</p> : null}
              <div className="row g-2 mb-3">
                <div className="col-md-4">
                  <Form.Label className="small">Default size</Form.Label>
                  <Form.Select
                    value={template.sizePreset}
                    onChange={(e) =>
                      persistTemplate({ ...template, sizePreset: e.target.value as LabelTemplateConfig["sizePreset"] })
                    }
                  >
                    {BARCODE_LABEL_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </Form.Select>
                </div>
                <div className="col-md-4">
                  <Form.Label className="small">Code mode</Form.Label>
                  <Form.Select
                    value={template.codeMode}
                    onChange={(e) =>
                      persistTemplate({ ...template, codeMode: e.target.value as LabelTemplateConfig["codeMode"] })
                    }
                  >
                    <option value="BARCODE_ONLY">Barcode</option>
                    <option value="QR_ONLY">QR</option>
                    <option value="BARCODE_AND_QR">Barcode + QR</option>
                  </Form.Select>
                </div>
              </div>
              <Form.Check
                type="switch"
                label="Compact"
                checked={template.compactMode}
                onChange={(e) => persistTemplate({ ...template, compactMode: e.target.checked })}
                className="mb-2"
              />
              <div className="d-flex flex-wrap gap-2">
                {(Object.keys(FIELD_LABELS) as LabelFieldKey[]).map((k) => (
                  <Form.Check
                    key={k}
                    type="checkbox"
                    label={FIELD_LABELS[k]}
                    checked={template.fields[k]}
                    onChange={(e) =>
                      persistTemplate({ ...template, fields: { ...template.fields, [k]: e.target.checked } })
                    }
                  />
                ))}
              </div>
              {branchId ? (
                <div className="mt-3">
                  <p className="small fw-semibold mb-2">Live preview (sample SKU)</p>
                  <SampleOwnerPreview branchId={branchId} presetId={presetId} template={template} />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "history" ? (
          <Alert variant="light" className="border">
            Print history is not available yet — no audit API connected.
          </Alert>
        ) : null}

        <div className="mt-3 small">
          <Link href="/owner/inventory/batches">Batches</Link> · <Link href="/owner/inventory">Inventory</Link>
        </div>
      </div>
    </div>
  );
}

function SampleOwnerPreview({
  branchId,
  presetId,
  template,
}: {
  branchId: number;
  presetId: string;
  template: LabelTemplateConfig;
}) {
  const [label, setLabel] = useState<LabelPayload | null>(null);
  useEffect(() => {
    let c = false;
    void (async () => {
      try {
        const rows = await fetchBranchLotsForLabels(branchId, { stockGt0: true });
        const first = rows.items[0];
        if (first?.lotId) {
          const dto = (await fetchBatchBarcodeLabel(first.lotId, branchId)) as LabelPayload;
          if (!c) setLabel(dto);
        } else {
          if (!c) setLabel(null);
        }
      } catch {
        if (!c) setLabel(null);
      }
    })();
    return () => {
      c = true;
    };
  }, [branchId]);
  if (!label) {
    return (
      <p className="text-muted small mb-0">
        No in-stock batch preview — try a branch with SHOP stock or open a SKU print instead.
      </p>
    );
  }
  return <BarcodeLabelPreview label={label} presetId={presetId} template={template} />;
}
