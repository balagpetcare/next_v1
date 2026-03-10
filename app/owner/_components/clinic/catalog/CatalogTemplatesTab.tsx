"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  ownerClinicCatalogTemplatesList,
  ownerClinicCatalogInstallPreview,
  ownerClinicCatalogInstall,
  ownerClinicCatalogInstallHistory,
} from "@/app/owner/_lib/ownerApi";

type TemplateRow = { id: number; name: string; slug: string; description?: string | null; version?: string };
type InstallBatchRow = {
  id: number;
  templateId: number;
  templateVersion?: string | null;
  status: string;
  categoryCount: number;
  itemCount: number;
  createdAt: string;
  template?: { id: number; name: string; slug: string; version: string };
  installedBy?: { id: number; email?: string; name?: string };
};

type CatalogTemplatesTabProps = { branchId: string };

export default function CatalogTemplatesTab({ branchId }: CatalogTemplatesTabProps) {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [installHistory, setInstallHistory] = useState<InstallBatchRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [installStep, setInstallStep] = useState<0 | 1 | 2 | 3>(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [installing, setInstalling] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (!branchId) return;
    setTemplatesLoading(true);
    try {
      const list = (await ownerClinicCatalogTemplatesList(branchId)) as TemplateRow[];
      setTemplates(list);
    } catch {
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, [branchId]);

  const loadHistory = useCallback(async () => {
    if (!branchId) return;
    setHistoryLoading(true);
    try {
      const list = (await ownerClinicCatalogInstallHistory(branchId, 20)) as InstallBatchRow[];
      setInstallHistory(list);
    } catch {
      setInstallHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleStartInstall = (templateId: number) => {
    setSelectedTemplateId(templateId);
    setInstallStep(1);
    setPreview(null);
  };

  const handlePreviewInstall = useCallback(async () => {
    if (!branchId || selectedTemplateId == null) return;
    try {
      const data = await ownerClinicCatalogInstallPreview(branchId, { templateId: selectedTemplateId });
      setPreview(data);
      setInstallStep(2);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Preview failed");
    }
  }, [branchId, selectedTemplateId]);

  const handleConfirmInstall = useCallback(async () => {
    if (!branchId || selectedTemplateId == null) return;
    setInstalling(true);
    try {
      const result = await ownerClinicCatalogInstall(branchId, {
        templateId: selectedTemplateId,
        overwriteExisting: false,
      });
      toast.success(`Installed: ${result.categoryCount} categories, ${result.itemCount} items.`);
      setInstallStep(0);
      setSelectedTemplateId(null);
      setPreview(null);
      loadHistory();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Install failed");
    } finally {
      setInstalling(false);
    }
  }, [branchId, selectedTemplateId, loadHistory]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="card radius-12">
      <div className="card-body">
        <h6 className="mb-3">Master catalog templates</h6>
        <p className="text-muted small mb-4">
          Install a standard catalog (categories and items) in a few steps. Choose a template, review the preview, then install. Existing items linked to the same master are skipped unless you choose to overwrite.
        </p>

        {installStep === 0 && (
          <>
            {templatesLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status" />
                <p className="text-muted small mt-2 mb-0">Loading templates…</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-4">
                <i className="ri-file-text-line fs-1 text-muted d-block mb-3" aria-hidden />
                <p className="text-muted mb-0">No master catalog templates available. Run seed on the API to populate templates.</p>
              </div>
            ) : (
              <div className="row g-3">
                {templates.map((t) => (
                  <div key={t.id} className="col-12 col-md-6 col-lg-4">
                    <div className="border rounded-3 p-3 h-100">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">{t.name}</h6>
                          {t.description && <p className="small text-muted mb-2">{t.description}</p>}
                          {t.version && <span className="badge bg-secondary-subtle text-secondary-emphasis radius-8">v{t.version}</span>}
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary radius-8"
                          onClick={() => handleStartInstall(t.id)}
                        >
                          Install
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <hr className="my-4" />
            <h6 className="mb-2">Install history</h6>
            <button type="button" className="btn btn-sm btn-outline-secondary radius-8 mb-3" onClick={loadHistory} disabled={historyLoading}>
              {historyLoading ? "Loading…" : "Refresh"}
            </button>
            {installHistory.length === 0 ? (
              <p className="text-muted small mb-0">No installs yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Template</th>
                      <th className="text-center">Categories</th>
                      <th className="text-center">Items</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installHistory.map((b) => (
                      <tr key={b.id}>
                        <td className="small">{new Date(b.createdAt).toLocaleString()}</td>
                        <td>{b.template?.name ?? `Template #${b.templateId}`} {b.templateVersion && <span className="text-muted small">v{b.templateVersion}</span>}</td>
                        <td className="text-center">{b.categoryCount}</td>
                        <td className="text-center">{b.itemCount}</td>
                        <td className="small">{b.installedBy?.email ?? b.installedBy?.name ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {installStep === 1 && selectedTemplate && (
          <div>
            <p className="mb-3">
              Template: <strong>{selectedTemplate.name}</strong> (v{selectedTemplate.version ?? "1.0.0"})
            </p>
            <p className="text-muted small mb-3">Click Preview to see how many categories and items will be created. Existing items linked to the same master will be skipped.</p>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-primary radius-12" onClick={handlePreviewInstall}>
                Preview install
              </button>
              <button type="button" className="btn btn-outline-secondary radius-12" onClick={() => { setInstallStep(0); setSelectedTemplateId(null); }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {installStep === 2 && preview && (
          <div>
            <h6 className="mb-2">Install summary</h6>
            <ul className="list-unstyled mb-4">
              <li>Categories to create: <strong>{(preview.categoriesToCreate as number) ?? 0}</strong></li>
              <li>Items to create: <strong>{(preview.itemsToCreate as number) ?? 0}</strong></li>
              <li className="text-muted small">Skipped (already installed): {(preview.categoriesSkipped as number) ?? 0} categories, {(preview.itemsSkipped as number) ?? 0} items</li>
            </ul>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-primary radius-12" onClick={handleConfirmInstall} disabled={installing}>
                {installing ? "Installing…" : "Confirm and install"}
              </button>
              <button type="button" className="btn btn-outline-secondary radius-12" onClick={() => setInstallStep(1)} disabled={installing}>
                Back
              </button>
              <button type="button" className="btn btn-outline-secondary radius-12" onClick={() => { setInstallStep(0); setSelectedTemplateId(null); setPreview(null); }} disabled={installing}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
