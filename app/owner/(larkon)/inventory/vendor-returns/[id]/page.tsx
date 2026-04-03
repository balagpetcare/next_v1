"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, Send, Package, DollarSign, Truck } from "lucide-react";
import { format } from "date-fns/format";
import { API_BASE_URL } from "@/lib/constants";

const STATUS_COLORS = {
  DRAFT: "bg-gray-100 text-gray-800", SUBMITTED: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800", DISPATCHED: "bg-blue-100 text-blue-800",
  RECEIVED_BY_VENDOR: "bg-purple-100 text-purple-800", CREDITED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function VendorReturnDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [request, setRequest] = useState(null as any);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [creditDialog, setCreditDialog] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");

  useEffect(() => { fetchRequest(); }, [id]);

  async function fetchRequest() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/inventory/vendor-returns/${id}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) setRequest(data.data);
      else toast.error(data.message);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  async function doAction(action: string, body?: object) {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/inventory/vendor-returns/${id}/${action}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (data.success) { toast.success(data.message); fetchRequest(); }
      else toast.error(data.message);
    } catch { toast.error("Action failed"); }
    finally { setActionLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;
  if (!request) return <div className="text-center py-16 text-muted-foreground">Return not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Link href="/owner/inventory/vendor-returns">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
          <h1 className="text-3xl font-bold">Vendor Return #{request.id}</h1>
          <Badge className={(STATUS_COLORS as any)[request.status]}>{request.status.replace(/_/g, " ")}</Badge>
        </div>
        <div className="flex gap-2">
          {request.status === "DRAFT" && (
            <Button onClick={() => doAction("submit")} disabled={actionLoading}><Send className="mr-2 h-4 w-4" />Submit</Button>
          )}
          {request.status === "SUBMITTED" && (
            <>
              <Button onClick={() => doAction("approve")} disabled={actionLoading}><CheckCircle className="mr-2 h-4 w-4" />Approve</Button>
              <Button variant="outline" onClick={() => doAction("cancel")} disabled={actionLoading}><XCircle className="mr-2 h-4 w-4" />Cancel</Button>
            </>
          )}
          {request.status === "APPROVED" && (
            <Button onClick={() => doAction("dispatch")} disabled={actionLoading}><Truck className="mr-2 h-4 w-4" />Mark Dispatched</Button>
          )}
          {request.status === "DISPATCHED" && (
            <Button onClick={() => doAction("received-by-vendor")} disabled={actionLoading}><Package className="mr-2 h-4 w-4" />Mark Received by Vendor</Button>
          )}
          {request.status === "RECEIVED_BY_VENDOR" && (
            <Button onClick={() => setCreditDialog(true)} disabled={actionLoading}><DollarSign className="mr-2 h-4 w-4" />Record Credit</Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Vendor</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{request.vendor?.name}</p>
            <p className="text-sm text-muted-foreground">{request.vendor?.contactEmail}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Location</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{request.location?.name}</p>
            <p className="text-sm text-muted-foreground">{request.location?.branch?.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Credit</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">Expected: {request.creditExpected ? `$${Number(request.creditExpected).toFixed(2)}` : "—"}</p>
            <p className="text-sm text-muted-foreground">Received: {request.creditReceived ? `$${Number(request.creditReceived).toFixed(2)}` : "—"}</p>
          </CardContent>
        </Card>
      </div>

      {request.note && (
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Reason / Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{request.reason}</p>{request.note && <p className="text-sm text-muted-foreground mt-1">{request.note}</p>}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Line Items</CardTitle><CardDescription>Stock being returned to vendor</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Ledger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {request.lines?.map((line: any) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <p className="font-medium">{line.variant?.product?.name}</p>
                    <p className="text-xs text-muted-foreground">{line.variant?.sku}</p>
                  </TableCell>
                  <TableCell>{line.lot ? `${line.lot.lotCode}` : "—"}</TableCell>
                  <TableCell>{line.quantity}</TableCell>
                  <TableCell>{line.unitCost ? `$${Number(line.unitCost).toFixed(2)}` : "—"}</TableCell>
                  <TableCell><Badge variant="outline">{line.condition}</Badge></TableCell>
                  <TableCell>{line.ledger ? <Badge className="bg-green-100 text-green-800">#{line.ledger.id}</Badge> : <Badge variant="outline">Pending</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={creditDialog} onOpenChange={setCreditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Credit Received</DialogTitle>
            <DialogDescription>Enter the credit amount received from the vendor</DialogDescription>
          </DialogHeader>
          <Input type="number" step="0.01" placeholder="Credit amount" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialog(false)}>Cancel</Button>
            <Button onClick={() => { doAction("credit", { creditReceived: parseFloat(creditAmount) }); setCreditDialog(false); }} disabled={!creditAmount}>Record Credit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
