"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/constants";

/**
 * @deprecated This page creates legacy WarehouseTransferOrders.
 * Users should use Stock Requests → Allocation → Dispatch flow instead.
 */
export default function NewWarehouseTransferPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const orgId = (user as any)?.ownedOrg?.id;

  const [locations, setLocations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fromLocationId: "", toLocationId: "", note: "" });
  const [lines, setLines] = useState([{ variantId: "", lotId: "", requestedQty: 1, note: "" }]);
  const [showDeprecatedForm, setShowDeprecatedForm] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    fetch(`${API_BASE_URL}/api/v1/inventory/locations?orgId=${orgId}`, { credentials: "include" })
      .then(r => r.json()).then(d => { if (d.success) setLocations(d.items || d.data || []); });
  }, [orgId]);

  function addLine() {
    setLines(prev => [...prev, { variantId: "", lotId: "", requestedQty: 1, note: "" }]);
  }

  function removeLine(i: number) {
    setLines(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateLine(i: number, field: string, value: any) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fromLocationId || !form.toLocationId) {
      toast.error("Source and destination locations are required");
      return;
    }
    if (form.fromLocationId === form.toLocationId) {
      toast.error("Source and destination must be different locations");
      return;
    }
    if (lines.some(l => !l.variantId || l.requestedQty < 1)) {
      toast.error("All lines must have a variant ID and quantity ≥ 1");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/inventory/warehouse-transfer-orders`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          fromLocationId: parseInt(form.fromLocationId),
          toLocationId: parseInt(form.toLocationId),
          note: form.note || undefined,
          lines: lines.map(l => ({
            variantId: parseInt(l.variantId),
            lotId: l.lotId ? parseInt(l.lotId) : undefined,
            requestedQty: Number(l.requestedQty),
            note: l.note || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Transfer order created");
        router.push(`/owner/inventory/warehouse-transfers/${data.data.id}`);
      } else {
        toast.error(data.message);
      }
    } catch { toast.error("Failed to create transfer order"); }
    finally { setSaving(false); }
  }

  // Show deprecation notice by default, with option to proceed
  if (!showDeprecatedForm) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/owner/inventory/warehouse-transfers">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
          <h1 className="text-3xl font-bold mt-2">New Warehouse Transfer</h1>
          <p className="text-muted-foreground">Move stock between warehouse locations</p>
        </div>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Legacy Feature - Use Stock Requests Instead
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-yellow-700">
              Warehouse Transfer Orders are <strong>deprecated</strong>. For new transfers, please use the
              modern Stock Request → Allocation → Dispatch workflow which provides:
            </p>
            <ul className="list-disc list-inside text-yellow-700 space-y-1">
              <li>Manager confirmation before stock posts</li>
              <li>Controlled receiving with discrepancy tracking</li>
              <li>Full audit trail with transport/challan details</li>
              <li>Integration with allocation plans and pick lists</li>
            </ul>
            <div className="flex gap-2 pt-4">
              <Link href="/owner/inventory/stock-requests">
                <Button>Create Stock Request (Recommended)</Button>
              </Link>
              <Button variant="outline" onClick={() => setShowDeprecatedForm(true)}>
                Continue with Legacy Transfer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/owner/inventory/warehouse-transfers">
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </Link>
        <div className="flex items-center gap-2 mt-2">
          <h1 className="text-3xl font-bold">New Warehouse Transfer</h1>
          <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">Legacy</span>
        </div>
        <p className="text-muted-foreground">Move stock between warehouse locations</p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
        <strong>Note:</strong> This is a legacy feature. Consider using{" "}
        <Link href="/owner/inventory/stock-requests" className="underline font-semibold">Stock Requests</Link>{" "}
        for better control and audit trail.
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Transfer Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>From Location *</Label>
              <Select value={form.fromLocationId} onValueChange={v => setForm(f => ({ ...f, fromLocationId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l: any) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>To Location *</Label>
              <Select value={form.toLocationId} onValueChange={v => setForm(f => ({ ...f, toLocationId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                <SelectContent>
                  {locations.filter((l: any) => String(l.id) !== form.fromLocationId).map((l: any) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="Reason for transfer, special instructions..." value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transfer Lines</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="mr-2 h-4 w-4" />Add Line
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant ID *</TableHead>
                  <TableHead>Lot ID</TableHead>
                  <TableHead>Qty *</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell><Input type="number" value={line.variantId} onChange={e => updateLine(i, "variantId", e.target.value)} className="w-28" placeholder="e.g. 42" /></TableCell>
                    <TableCell><Input type="number" value={line.lotId} onChange={e => updateLine(i, "lotId", e.target.value)} className="w-24" placeholder="opt." /></TableCell>
                    <TableCell><Input type="number" min={1} value={line.requestedQty} onChange={e => updateLine(i, "requestedQty", parseInt(e.target.value) || 1)} className="w-20" /></TableCell>
                    <TableCell><Input value={line.note} onChange={e => updateLine(i, "note", e.target.value)} placeholder="opt." /></TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(i)} disabled={lines.length === 1}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/owner/inventory/warehouse-transfers">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Transfer Order"}</Button>
        </div>
      </form>
    </div>
  );
}
