"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  staffAiReplenishmentSuggestions,
  staffAiAcceptReplenishmentSuggestion,
  staffAiDismissReplenishmentSuggestion,
  staffAiBulkDismissReplenishmentSuggestions,
  staffAiBulkAcceptReplenishmentSuggestions,
} from "@/lib/api";

export default function ReplenishmentSuggestionsPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = use(params);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const data = await staffAiReplenishmentSuggestions(branchId);
      setRows(Array.isArray(data) ? data : []);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchId]);

  function toggle(id: number) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  async function accept(id: number) {
    try {
      const res = await staffAiAcceptReplenishmentSuggestion(id);
      toast.success("Draft stock request created — review before submit");
      if ((res as any)?.data?.stockRequest?.id) {
        toast.message(`Request #${(res as any).data.stockRequest.id}`);
      }
      load();
    } catch (e: any) {
      toast.error(e?.message || "Accept failed");
    }
  }

  async function dismiss(id: number) {
    try {
      await staffAiDismissReplenishmentSuggestion(id);
      toast.success("Dismissed");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Dismiss failed");
    }
  }

  async function bulkDismiss() {
    if (!selected.size) return;
    try {
      await staffAiBulkDismissReplenishmentSuggestions(branchId, [...selected]);
      toast.success("Dismissed selected");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Bulk dismiss failed");
    }
  }

  async function bulkAccept() {
    if (!selected.size) return;
    try {
      await staffAiBulkAcceptReplenishmentSuggestions(branchId, [...selected]);
      toast.success("Draft requests created for selected lines");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Bulk accept failed");
    }
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Replenishment suggestions</h1>
        <p className="text-muted-foreground text-sm">
          Accept creates a draft stock request only. Nothing is auto-submitted or auto-approved.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle>Open suggestions</CardTitle>
            <CardDescription>Branch {branchId}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={bulkDismiss} disabled={!selected.size}>
              Dismiss selected
            </Button>
            <Button size="sm" onClick={bulkAccept} disabled={!selected.size}>
              Accept selected
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Suggested qty</TableHead>
                <TableHead>On hand</TableHead>
                <TableHead>ROP</TableHead>
                <TableHead>Why</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground">
                    {loading ? "Loading…" : "No open suggestions. Run replenishment job on API."}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.severity === "CRITICAL" ? "destructive" : "secondary"}>{r.severity}</Badge>
                  </TableCell>
                  <TableCell>{r.variant?.sku ?? r.variantId}</TableCell>
                  <TableCell>{r.suggestedQty}</TableCell>
                  <TableCell>{r.onHand}</TableCell>
                  <TableCell>{r.rop}</TableCell>
                  <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                    {Array.isArray(r.reasonLabels) && r.reasonLabels.length
                      ? r.reasonLabels.join(" · ")
                      : JSON.stringify(r.reasonCodes ?? [])}
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" onClick={() => accept(r.id)}>
                      Accept (draft)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => dismiss(r.id)}>
                      Dismiss
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
