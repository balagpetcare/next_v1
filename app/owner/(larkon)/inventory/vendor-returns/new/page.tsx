"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/constants";

export default function NewVendorReturnPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const orgId = (user as any)?.ownedOrg?.id;

  const [vendors, setVendors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    vendorId: "", locationId: "", reason: "", note: "", creditExpected: "", referenceNumber: "",
  });

  const [lines, setLines] = useState([
    { variantId: "", lotId: "", quantity: 1, unitCost: "", condition: "RESELLABLE", note: "" },
  ]);

  useEffect(() => {
    if (!orgId) return;
    fetchVendors();
    fetchLocations();
  }, [orgId]);

  async function fetchVendors() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/vendors?orgId=${orgId}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) setVendors(data.items || data.data || []);
    } catch {}
  }

  async function fetchLocations() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/inventory/locations?orgId=${orgId}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) setLocations(data.items || data.data || []);
    } catch {}
  }

  function addLine() {
    setLines(prev => [...prev, { variantId: "", lotId: "", quantity: 1, unitCost: "", condition: "RESELLABLE", note: "" }]);
  }

  function removeLine(i: number) {
    setLines(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateLine(i: number, field: string, value: any) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vendorId || !form.locationId || !form.reason) {
      toast.error("Vendor, location, and reason are required");
      return;
    }
    if (lines.some(l => !l.variantId || l.quantity < 1)) {
      toast.error("All lines must have a variant ID and quantity");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/inventory/vendor-returns`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          vendorId: parseInt(form.vendorId),
          locationId: parseInt(form.locationId),
          reason: form.reason,
          note: form.note || undefined,
          creditExpected: form.creditExpected ? parseFloat(form.creditExpected) : undefined,
          referenceNumber: form.referenceNumber || undefined,
          lines: lines.map(l => ({
            variantId: parseInt(l.variantId),
            lotId: l.lotId ? parseInt(l.lotId) : undefined,
            quantity: Number(l.quantity),
            unitCost: l.unitCost ? parseFloat(l.unitCost) : undefined,
            condition: l.condition,
            note: l.note || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Vendor return created");
        router.push(`/owner/inventory/vendor-returns/${data.data.id}`);
      } else {
        toast.error(data.message);
      }
    } catch { toast.error("Failed to create return"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/owner/inventory/vendor-returns">
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </Link>
        <h1 className="text-3xl font-bold mt-2">New Vendor Return</h1>
        <p className="text-muted-foreground">Create a return request to send stock back to a supplier</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Return Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Vendor *</Label>
              <Select value={form.vendorId} onValueChange={v => setForm(f => ({ ...f, vendorId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  {vendors.map((v: any) => (
                    <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Source Location *</Label>
              <Select value={form.locationId} onValueChange={v => setForm(f => ({ ...f, locationId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l: any) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Reason *</Label>
              <Textarea placeholder="Reason for returning to vendor" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1">
              <Label>Expected Credit (optional)</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.creditExpected} onChange={e => setForm(f => ({ ...f, creditExpected: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Reference Number (optional)</Label>
              <Input placeholder="Vendor RMA #, etc." value={form.referenceNumber} onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Additional Notes</Label>
              <Textarea placeholder="Optional notes" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
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
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell><Input type="number" value={line.variantId} onChange={e => updateLine(i, "variantId", e.target.value)} className="w-24" /></TableCell>
                    <TableCell><Input type="number" value={line.lotId} onChange={e => updateLine(i, "lotId", e.target.value)} className="w-20" placeholder="opt." /></TableCell>
                    <TableCell><Input type="number" min={1} value={line.quantity} onChange={e => updateLine(i, "quantity", parseInt(e.target.value) || 1)} className="w-20" /></TableCell>
                    <TableCell><Input type="number" step="0.0001" value={line.unitCost} onChange={e => updateLine(i, "unitCost", e.target.value)} className="w-24" placeholder="opt." /></TableCell>
                    <TableCell>
                      <Select value={line.condition} onValueChange={v => updateLine(i, "condition", v)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RESELLABLE">Resellable</SelectItem>
                          <SelectItem value="DAMAGED">Damaged</SelectItem>
                          <SelectItem value="EXPIRED">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
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
          <Link href="/owner/inventory/vendor-returns">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Return"}</Button>
        </div>
      </form>
    </div>
  );
}
