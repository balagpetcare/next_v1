"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  Form,
  Modal,
  Nav,
  Spinner,
  Table,
} from "react-bootstrap";
import AccessDenied from "@/src/components/branch/AccessDenied";
import StaffBranchLayout from "@/src/components/branch/StaffBranchLayout";
import { useBranchContext } from "@/lib/useBranchContext";
import BarcodeLabelPreview, { type LabelPayload } from "@/app/_components/barcode/BarcodeLabelPreview";
import BarcodePrintPage from "@/app/_components/barcode/BarcodePrintPage";
import type { LabelTemplateConfig, LabelFieldKey } from "@/app/_components/barcode/labelTemplateConfig";
import {
  DEFAULT_LABEL_TEMPLATE,
  labelFieldDensityWarning,
  loadLabelTemplate,
  mapPresetToLayoutId,
  saveLabelTemplate,
  staffLabelTemplateKey,
} from "@/app/_components/barcode/labelTemplateConfig";
import {
  fetchBatchBarcodeLabel,
  fetchBranchLotsForLabels,
  fetchBranchVariantsForLabels,
  fetchBulkBarcodeLabels,
  fetchProductBarcodeLabel,
  patchLotLabelBarcodeApi,
  saveStaffBulkLabelSession,
  type BranchLotLabelRow,
  type BranchVariantLabelRow,
  type BulkLabelItem,
} from "@/lib/barcodeLabelsApi";
import { BARCODE_LABEL_PRESETS } from "@/app/_components/barcode/labelPresets";

type TabKey = "batch" | "sku" | "bulk" | "history";

type BulkRow = BulkLabelItem & { key: string };

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

function fmtMoney(n: number | null | undefined) {
  const x = Number(n);
  if (n == null || !Number.isFinite(x)) return "—";
  return x.toFixed(2);
}

function fmtDate(iso: string | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : d.toLocaleDateString();
}

export default function StaffBarcodePrintingClient() {
  const params = useParams();
  const branchId = String(params?.branchId ?? "");
  const bid = Number(branchId);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);
  const branchName = (branch as { name?: string } | null)?.name ?? "";

  const templateKey = useMemo(() => staffLabelTemplateKey(branchId), [branchId]);
  const [template, setTemplate] = useState<LabelTemplateConfig>(DEFAULT_LABEL_TEMPLATE);
  useEffect(() => {
    setTemplate(loadLabelTemplate(templateKey));
  }, [templateKey]);

  const persistTemplate = useCallback(
    (next: LabelTemplateConfig) => {
      setTemplate(next);
      saveLabelTemplate(templateKey, next);
    },
    [templateKey]
  );

  const [tab, setTab] = useState<TabKey>("batch");
  const [search, setSearch] = useState("");
  const [stockGt0, setStockGt0] = useState(false);
  const [nearExpiry, setNearExpiry] = useState(false);
  const [expired, setExpired] = useState(false);
  const [hasLabel, setHasLabel] = useState(false);
  const [missingLabel, setMissingLabel] = useState(false);
  const [lots, setLots] = useState<BranchLotLabelRow[]>([]);
  const [lotsWarn, setLotsWarn] = useState<string | null>(null);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [lotsErr, setLotsErr] = useState("");

  const [skuQ, setSkuQ] = useState("");
  const [variants, setVariants] = useState<BranchVariantLabelRow[]>([]);
  const [skuLoading, setSkuLoading] = useState(false);
  const [skuErr, setSkuErr] = useState("");

  const [selBatch, setSelBatch] = useState<Set<number>>(() => new Set());
  const [selSku, setSelSku] = useState<Set<number>>(() => new Set());
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkPreview, setBulkPreview] = useState<LabelPayload[]>([]);
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState(false);

  const [previewPayload, setPreviewPayload] = useState<LabelPayload | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [editLot, setEditLot] = useState<BranchLotLabelRow | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editErr, setEditErr] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const perms = myAccess?.permissions ?? [];
  const canInventory = Array.isArray(perms) && (perms.includes("inventory.read") || perms.includes("pos.view"));
  const canAdjust = Array.isArray(perms) && perms.includes("inventory.adjust");

  const presetId = mapPresetToLayoutId(template.sizePreset);
  const densityWarn = labelFieldDensityWarning(presetId, template);

  const loadLots = useCallback(async () => {
    if (!bid) return;
    setLotsLoading(true);
    setLotsErr("");
    try {
      const data = await fetchBranchLotsForLabels(bid, {
        q: search || undefined,
        stockGt0,
        nearExpiry,
        expired,
        hasLabelBarcode: hasLabel,
        missingLabelBarcode: missingLabel,
      });
      setLots(data.items);
      setLotsWarn(data.warning === "NO_SHOP" ? "This branch has no default SHOP location; batch list may be empty." : null);
    } catch (e) {
      setLotsErr(e instanceof Error ? e.message : "Failed to load");
      setLots([]);
    } finally {
      setLotsLoading(false);
    }
  }, [bid, search, stockGt0, nearExpiry, expired, hasLabel, missingLabel]);

  useEffect(() => {
    if (tab === "batch" && canInventory && !ctxLoading) void loadLots();
  }, [tab, canInventory, ctxLoading, loadLots]);

  const loadSku = useCallback(async () => {
    if (!bid) return;
    setSkuLoading(true);
    setSkuErr("");
    try {
      const rows = await fetchBranchVariantsForLabels(bid, skuQ, 60);
      setVariants(rows);
    } catch (e) {
      setSkuErr(e instanceof Error ? e.message : "Failed");
      setVariants([]);
    } finally {
      setSkuLoading(false);
    }
  }, [bid, skuQ]);

  useEffect(() => {
    if (tab === "sku" && canInventory && !ctxLoading) void loadSku();
  }, [tab, canInventory, ctxLoading, loadSku]);

  const openPreviewBatch = async (lotId: number) => {
    try {
      const data = (await fetchBatchBarcodeLabel(lotId, bid)) as LabelPayload;
      setPreviewPayload({ ...data, branchName });
      setPreviewOpen(true);
    } catch {
      setPreviewPayload(null);
    }
  };

  const openPreviewSku = async (variantId: number) => {
    try {
      const data = (await fetchProductBarcodeLabel(variantId, bid)) as LabelPayload;
      setPreviewPayload({ ...data, branchName, variantId });
      setPreviewOpen(true);
    } catch {
      setPreviewPayload(null);
    }
  };

  const mergeBulkFromSelections = () => {
    setBulkRows((prev) => {
      const map = new Map<string, BulkRow>();
      prev.forEach((r) => map.set(r.key, r));
      selBatch.forEach((lotId) => {
        const k = `b-${lotId}`;
        const prevRow = map.get(k);
        map.set(k, { type: "BATCH", lotId, copies: prevRow?.copies ?? 1, key: k });
      });
      selSku.forEach((variantId) => {
        const k = `s-${variantId}`;
        const prevRow = map.get(k);
        map.set(k, { type: "SKU", variantId, copies: prevRow?.copies ?? 1, key: k });
      });
      return Array.from(map.values());
    });
    setTab("bulk");
  };

  const refreshBulkPreview = async () => {
    if (!bid || bulkRows.length === 0) {
      setBulkPreview([]);
      return;
    }
    setBulkPreviewLoading(true);
    try {
      const items: BulkLabelItem[] = bulkRows.map((r) => ({
        type: r.type,
        lotId: r.lotId,
        variantId: r.variantId,
        copies: Math.min(100, Math.max(1, Number(r.copies) || 1)),
      }));
      const data = await fetchBulkBarcodeLabels({ branchId: bid, items });
      const labs = Array.isArray(data.labels) ? (data.labels as LabelPayload[]) : [];
      setBulkPreview(labs.map((lb) => ({ ...lb, branchName })));
    } catch {
      setBulkPreview([]);
    } finally {
      setBulkPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "bulk" && bulkRows.length > 0) void refreshBulkPreview();
  }, [tab, bulkRows]);

  const openPrintTab = () => {
    if (!bid || bulkRows.length === 0) return;
    const items: BulkLabelItem[] = bulkRows.map((r) => ({
      type: r.type,
      lotId: r.lotId,
      variantId: r.variantId,
      copies: Math.min(100, Math.max(1, Number(r.copies) || 1)),
    }));
    saveStaffBulkLabelSession(bid, { branchId: bid, items });
    window.open(`/staff/branch/${branchId}/inventory/labels/bulk`, "_blank", "noopener,noreferrer");
  };

  const saveEditLabel = async () => {
    if (!editLot) return;
    setEditSaving(true);
    setEditErr("");
    try {
      await patchLotLabelBarcodeApi(editLot.lotId, bid, editValue.trim() === "" ? null : editValue.trim());
      setEditLot(null);
      await loadLots();
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setEditSaving(false);
    }
  };

  const clearEditLabel = async () => {
    if (!editLot) return;
    setEditSaving(true);
    setEditErr("");
    try {
      await patchLotLabelBarcodeApi(editLot.lotId, bid, null);
      setEditLot(null);
      await loadLots();
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : "Clear failed");
    } finally {
      setEditSaving(false);
    }
  };

  if (ctxLoading) return <p className="text-muted small p-3">Loading…</p>;
  if (errorCode === "forbidden" || !branch) return <AccessDenied />;
  if (!hasViewPermission) return <AccessDenied />;
  if (!canInventory) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <AccessDenied />
      </StaffBranchLayout>
    );
  }

  return (
    <StaffBranchLayout branchId={branchId} requiredPermission={null}>
      <div className="dashboard-main-body">
        <div className="px-3 pb-3">
          <div className="mb-3">
            <h5 className="fw-semibold mb-1">Barcode Printing</h5>
            <p className="small text-muted mb-0">Labels, bulk print, and batch barcode assignment</p>
          </div>
          <Nav variant="tabs" className="mb-3 flex-nowrap overflow-auto">
            <Nav.Item>
              <Nav.Link active={tab === "batch"} onClick={() => setTab("batch")}>
                Batch Labels
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link active={tab === "sku"} onClick={() => setTab("sku")}>
                SKU Labels
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link active={tab === "bulk"} onClick={() => setTab("bulk")}>
                Bulk Print
                {bulkRows.length ? (
                  <Badge bg="secondary" className="ms-1">
                    {bulkRows.length}
                  </Badge>
                ) : null}
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link active={tab === "history"} onClick={() => setTab("history")}>
                Recent Prints
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {densityWarn ? (
            <Alert variant="warning" className="py-2 small">
              {densityWarn}
            </Alert>
          ) : null}
          {lotsWarn ? (
            <Alert variant="info" className="py-2 small">
              {lotsWarn}
            </Alert>
          ) : null}

          {tab === "batch" ? (
            <>
              <div className="sticky-top bg-white pt-2 pb-2 border-bottom mb-2" style={{ zIndex: 100 }}>
                <div className="d-flex flex-wrap gap-2 align-items-end">
                  <Form.Control
                    placeholder="Search product, SKU, lot, barcode…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="radius-12"
                    style={{ maxWidth: 280 }}
                  />
                  <Form.Check type="switch" label="Stock &gt; 0" checked={stockGt0} onChange={(e) => setStockGt0(e.target.checked)} />
                  <Form.Check type="switch" label="Near expiry" checked={nearExpiry} onChange={(e) => setNearExpiry(e.target.checked)} />
                  <Form.Check type="switch" label="Expired" checked={expired} onChange={(e) => setExpired(e.target.checked)} />
                  <Form.Check type="switch" label="Has label barcode" checked={hasLabel} onChange={(e) => setHasLabel(e.target.checked)} />
                  <Form.Check
                    type="switch"
                    label="Missing label barcode"
                    checked={missingLabel}
                    onChange={(e) => setMissingLabel(e.target.checked)}
                  />
                  <Button size="sm" className="radius-12" onClick={() => void loadLots()} disabled={lotsLoading}>
                    Apply
                  </Button>
                  <span className="small text-muted ms-auto">Selected: {selBatch.size}</span>
                  <Button size="sm" variant="outline-primary" className="radius-12" disabled={!selBatch.size} onClick={mergeBulkFromSelections}>
                    Add batches to bulk
                  </Button>
                </div>
              </div>
              {lotsErr ? <Alert variant="danger">{lotsErr}</Alert> : null}
              {lotsLoading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <div className="table-responsive">
                  <Table size="sm" bordered hover className="mb-0 small align-middle">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: 36 }}>
                          <Form.Check
                            checked={lots.length > 0 && selBatch.size === lots.length}
                            onChange={(e) => {
                              if (e.target.checked) setSelBatch(new Set(lots.map((r) => r.lotId)));
                              else setSelBatch(new Set());
                            }}
                          />
                        </th>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Lot</th>
                        <th>Label bc</th>
                        <th>Supplier bc</th>
                        <th className="text-end">Stock</th>
                        <th className="text-end">MRP / price</th>
                        <th>Expiry</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {lots.map((row) => (
                        <tr key={row.lotId}>
                          <td>
                            <Form.Check
                              checked={selBatch.has(row.lotId)}
                              onChange={(e) => {
                                const n = new Set(selBatch);
                                if (e.target.checked) n.add(row.lotId);
                                else n.delete(row.lotId);
                                setSelBatch(n);
                              }}
                            />
                          </td>
                          <td className="text-truncate" style={{ maxWidth: 160 }} title={row.productName}>
                            {row.productName}
                          </td>
                          <td className="font-monospace text-truncate">{row.sku}</td>
                          <td>{row.lotCode}</td>
                          <td className="font-monospace small">{row.labelBarcode || "—"}</td>
                          <td className="font-monospace small text-muted">{row.supplierBarcode || "—"}</td>
                          <td className="text-end">{row.availableQty ?? "—"}</td>
                          <td className="text-end">
                            {fmtMoney(row.mrp)} / {fmtMoney(row.effectiveSellPrice ?? row.sellPrice)}
                          </td>
                          <td>{fmtDate(row.expDate)}</td>
                          <td>
                            <Badge bg={row.status === "EXPIRED" ? "danger" : row.status === "NEAR" ? "warning" : "secondary"}>
                              {row.status}
                            </Badge>
                          </td>
                          <td className="text-nowrap">
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              className="me-1"
                              onClick={() => window.open(`/staff/branch/${branchId}/inventory/labels/batch/${row.lotId}/print`, "_blank")}
                            >
                              Print
                            </Button>
                            <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => void openPreviewBatch(row.lotId)}>
                              Preview
                            </Button>
                            {canAdjust ? (
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => {
                                  setEditLot(row);
                                  setEditValue(row.labelBarcode || "");
                                  setEditErr("");
                                }}
                              >
                                Set label
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </>
          ) : null}

          {tab === "sku" ? (
            <>
              <div className="sticky-top bg-white pt-2 pb-2 border-bottom mb-2 d-flex flex-wrap gap-2 align-items-center" style={{ zIndex: 100 }}>
                <Form.Control
                  placeholder="Search SKU, name, barcode…"
                  value={skuQ}
                  onChange={(e) => setSkuQ(e.target.value)}
                  className="radius-12"
                  style={{ maxWidth: 320 }}
                />
                <Button size="sm" className="radius-12" onClick={() => void loadSku()}>
                  Search
                </Button>
                <span className="small text-muted ms-auto">Selected: {selSku.size}</span>
                <Button size="sm" variant="outline-primary" disabled={!selSku.size} onClick={mergeBulkFromSelections}>
                  Add SKUs to bulk
                </Button>
              </div>
              {skuErr ? <Alert variant="danger">{skuErr}</Alert> : null}
              {skuLoading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <div className="table-responsive">
                  <Table size="sm" bordered hover className="mb-0 small">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: 36 }}>
                          <Form.Check
                            checked={variants.length > 0 && selSku.size === variants.length}
                            onChange={(e) => {
                              if (e.target.checked) setSelSku(new Set(variants.map((r) => r.variantId)));
                              else setSelSku(new Set());
                            }}
                          />
                        </th>
                        <th>Product</th>
                        <th>Variant</th>
                        <th>SKU</th>
                        <th>Barcode</th>
                        <th className="text-end">MRP / list</th>
                        <th>Active</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((row) => (
                        <tr key={row.variantId}>
                          <td>
                            <Form.Check
                              checked={selSku.has(row.variantId)}
                              onChange={(e) => {
                                const n = new Set(selSku);
                                if (e.target.checked) n.add(row.variantId);
                                else n.delete(row.variantId);
                                setSelSku(n);
                              }}
                            />
                          </td>
                          <td className="text-truncate" style={{ maxWidth: 160 }}>
                            {row.productName}
                          </td>
                          <td className="text-truncate">{row.variantTitle}</td>
                          <td className="font-monospace">{row.sku}</td>
                          <td className="font-monospace small">{row.barcode || "—"}</td>
                          <td className="text-end">
                            {fmtMoney(row.mrp)} / {fmtMoney(row.listPrice)}
                          </td>
                          <td>{row.isActive ? "Yes" : "No"}</td>
                          <td className="text-nowrap">
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              className="me-1"
                              onClick={() =>
                                window.open(`/staff/branch/${branchId}/inventory/labels/product/${row.variantId}/print`, "_blank")
                              }
                            >
                              Print
                            </Button>
                            <Button size="sm" variant="outline-secondary" onClick={() => void openPreviewSku(row.variantId)}>
                              Preview
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
              {!skuLoading && variants.length === 0 ? (
                <p className="text-muted small">No variants — run a search or broaden terms.</p>
              ) : null}
            </>
          ) : null}

          {tab === "bulk" ? (
            <div>
              {bulkRows.length === 0 ? (
                <Alert variant="light" className="border">
                  No items in bulk queue. Select rows on Batch or SKU tabs and use “Add … to bulk”.
                </Alert>
              ) : (
                <>
                  <div className="table-responsive mb-3">
                    <Table size="sm" bordered className="mb-0 small">
                      <thead className="table-light">
                        <tr>
                          <th>Type</th>
                          <th>ID</th>
                          <th>Copies</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.map((r, idx) => (
                          <tr key={r.key}>
                            <td>{r.type}</td>
                            <td>{r.type === "BATCH" ? r.lotId : r.variantId}</td>
                            <td style={{ maxWidth: 120 }}>
                              <Form.Control
                                type="number"
                                min={1}
                                max={100}
                                size="sm"
                                value={r.copies ?? 1}
                                onChange={(e) => {
                                  const n = [...bulkRows];
                                  n[idx] = { ...r, copies: Math.min(100, Math.max(1, Number(e.target.value) || 1)) };
                                  setBulkRows(n);
                                }}
                              />
                            </td>
                            <td>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => setBulkRows(bulkRows.filter((_, i) => i !== idx))}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <div className="small fw-semibold mb-2">Template size</div>
                      <Form.Select
                        size="sm"
                        value={template.sizePreset}
                        onChange={(e) =>
                          persistTemplate({
                            ...template,
                            sizePreset: e.target.value as LabelTemplateConfig["sizePreset"],
                          })
                        }
                        className="radius-12"
                      >
                        {BARCODE_LABEL_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </Form.Select>
                    </div>
                    <div className="col-md-4">
                      <div className="small fw-semibold mb-2">Code mode</div>
                      <Form.Select
                        size="sm"
                        value={template.codeMode}
                        onChange={(e) =>
                          persistTemplate({
                            ...template,
                            codeMode: e.target.value as LabelTemplateConfig["codeMode"],
                          })
                        }
                      >
                        <option value="BARCODE_ONLY">Barcode only</option>
                        <option value="QR_ONLY">QR only</option>
                        <option value="BARCODE_AND_QR">Barcode + QR</option>
                      </Form.Select>
                    </div>
                    <div className="col-md-4">
                      <div className="small fw-semibold mb-2">Font scale</div>
                      <Form.Select
                        size="sm"
                        value={template.fontScale}
                        onChange={(e) => persistTemplate({ ...template, fontScale: e.target.value as LabelTemplateConfig["fontScale"] })}
                      >
                        <option value="small">Small</option>
                        <option value="normal">Normal</option>
                        <option value="large">Large</option>
                      </Form.Select>
                    </div>
                  </div>
                  <Form.Check
                    type="switch"
                    className="mb-2"
                    label="Compact mode"
                    checked={template.compactMode}
                    onChange={(e) => persistTemplate({ ...template, compactMode: e.target.checked })}
                  />
                  <div className="small fw-semibold mb-2">Field visibility</div>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {(Object.keys(FIELD_LABELS) as LabelFieldKey[]).map((k) => (
                      <Form.Check
                        key={k}
                        type="checkbox"
                        id={`fld-${k}`}
                        label={FIELD_LABELS[k]}
                        checked={template.fields[k]}
                        onChange={(e) =>
                          persistTemplate({
                            ...template,
                            fields: { ...template.fields, [k]: e.target.checked },
                          })
                        }
                      />
                    ))}
                  </div>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    <Button size="sm" onClick={() => void refreshBulkPreview()} disabled={bulkPreviewLoading}>
                      Refresh preview
                    </Button>
                    <Button size="sm" variant="primary" onClick={openPrintTab}>
                      Open print page
                    </Button>
                  </div>
                  {bulkPreviewLoading ? <Spinner animation="border" size="sm" /> : null}
                  {bulkPreview.length > 0 ? (
                    <BarcodePrintPage
                      labels={bulkPreview}
                      presetId={presetId}
                      onPresetChange={() => {}}
                      title="Bulk preview"
                      template={template}
                      printDate={new Date().toISOString().slice(0, 10)}
                    />
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {tab === "history" ? (
            <div className="card border radius-12">
              <div className="card-body text-muted small">
                <h6 className="fw-semibold text-body">Print history</h6>
                <p className="mb-0">Coming soon — no print audit API wired yet.</p>
              </div>
            </div>
          ) : null}

          <Modal show={previewOpen} onHide={() => setPreviewOpen(false)} size="lg" centered>
            <Modal.Header closeButton>
              <Modal.Title>Label preview</Modal.Title>
            </Modal.Header>
            <Modal.Body className="bg-light">
              {previewPayload ? (
                <BarcodeLabelPreview label={previewPayload} presetId={presetId} template={template} />
              ) : null}
            </Modal.Body>
          </Modal>

          <Modal show={!!editLot} onHide={() => !editSaving && setEditLot(null)} centered>
            <Modal.Header closeButton>
              <Modal.Title>Set label barcode — lot #{editLot?.lotId}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {editErr ? <Alert variant="danger py-2 small">{editErr}</Alert> : null}
              <Form.Label className="small">Label barcode</Form.Label>
              <Form.Control
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="font-monospace"
                placeholder="Scan or type code"
              />
              <div className="d-flex gap-2 mt-3">
                <Button onClick={() => void saveEditLabel()} disabled={editSaving}>
                  Save
                </Button>
                <Button variant="outline-warning" onClick={() => void clearEditLabel()} disabled={editSaving}>
                  Clear barcode
                </Button>
                <Button variant="outline-secondary" onClick={() => setEditLot(null)} disabled={editSaving}>
                  Cancel
                </Button>
              </div>
            </Modal.Body>
          </Modal>

          <div className="mt-3 small text-muted">
            <Link href={`/staff/branch/${branchId}/inventory`}>← Inventory</Link>
            {" · "}
            <Link href={`/staff/branch/${branchId}/inventory/batch-pricing`}>Batch pricing</Link>
          </div>
        </div>
      </div>
    </StaffBranchLayout>
  );
}
