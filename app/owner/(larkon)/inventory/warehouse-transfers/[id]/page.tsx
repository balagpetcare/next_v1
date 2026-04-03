"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, Truck, PackageCheck, Lock } from "lucide-react";
import { format } from "date-fns/format";
import { API_BASE_URL } from "@/lib/constants";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  APPROVED: "bg-green-100 text-green-800",
  PICKING: "bg-yellow-100 text-yellow-800",
  IN_TRANSIT: "bg-blue-100 text-blue-800",
  RECEIVED: "bg-purple-100 text-purple-800",
  CLOSED: "bg-emerald-100 text-emerald-800",
};

export default function WarehouseTransferDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [receivedQtys, setReceivedQtys] = useState<Record<number, number>>({});

  useEffect(() => { fetchOrder(); }, [id]);

  async function fetchOrder() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/inventory/warehouse-transfer-orders/${id}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
        const init: Record<number, number> = {};
        data.data.lines?.forEach((l: any) => { init[l.id] = l.requestedQty; });
        setReceivedQtys(init);
      } else toast.error(data.message);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  async function doAction(action: string, body?: object) {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/inventory/warehouse-transfer-orders/${id}/${action}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (data.success) { toast.success(data.message); fetchOrder(); }
      else toast.error(data.message);
    } catch { toast.error("Action failed"); }
    finally { setActionLoading(false); }
  }

  function handleReceive() {
    const receivedLines = Object.entries(receivedQtys).map(([lineId, receivedQty]) => ({
      lineId: parseInt(lineId), receivedQty,
    }));
    doAction("receive", { receivedLines });
  }

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;
  if (!order) return <div className="text-center py-16 text-muted-foreground">Transfer order not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Link href="/owner/inventory/warehouse-transfers">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
          <h1 className="text-3xl font-bold">Transfer Order #{order.id}</h1>
          <Badge className={STATUS_COLORS[order.status] ?? ""}>{order.status.replace(/_/g, " ")}</Badge>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {order.status === "DRAFT" && (
            <Button onClick={() => doAction("approve")} disabled={actionLoading}>
              <CheckCircle className="mr-2 h-4 w-4" />Approve
            </Button>
          )}
          {["APPROVED", "PICKING"].includes(order.status) && (
            <Button onClick={() => doAction("dispatch")} disabled={actionLoading}>
              <Truck className="mr-2 h-4 w-4" />Dispatch
            </Button>
          )}
          {order.status === "IN_TRANSIT" && (
            <Button onClick={handleReceive} disabled={actionLoading}>
              <PackageCheck className="mr-2 h-4 w-4" />Confirm Received
            </Button>
          )}
          {order.status === "RECEIVED" && (
            <Button onClick={() => doAction("close")} disabled={actionLoading} variant="outline">
              <Lock className="mr-2 h-4 w-4" />Close Order
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">From Location</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{order.fromLocation?.name}</p>
            <p className="text-sm text-muted-foreground">{order.fromLocation?.branch?.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">To Location</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{order.toLocation?.name}</p>
            <p className="text-sm text-muted-foreground">{order.toLocation?.branch?.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Created: {format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}</p>
            {order.approvedAt && <p>Approved: {format(new Date(order.approvedAt), "MMM d, yyyy HH:mm")}</p>}
            {order.dispatchedAt && <p>Dispatched: {format(new Date(order.dispatchedAt), "MMM d, yyyy HH:mm")}</p>}
            {order.receivedAt && <p>Received: {format(new Date(order.receivedAt), "MMM d, yyyy HH:mm")}</p>}
          </CardContent>
        </Card>
      </div>

      {order.note && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{order.note}</p></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transfer Lines</CardTitle>
          <CardDescription>
            {order.status === "IN_TRANSIT" ? "Enter received quantities to confirm receipt" : "Items being transferred"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Picked</TableHead>
                {order.status === "IN_TRANSIT" ? (
                  <TableHead>Received (enter)</TableHead>
                ) : (
                  <TableHead>Received</TableHead>
                )}
                <TableHead>Outbound</TableHead>
                <TableHead>Inbound</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.lines?.map((line: any) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <p className="font-medium">{line.variant?.product?.name}</p>
                    <p className="text-xs text-muted-foreground">{line.variant?.sku}</p>
                  </TableCell>
                  <TableCell>{line.lot?.lotCode ?? "—"}</TableCell>
                  <TableCell>{line.requestedQty}</TableCell>
                  <TableCell>{line.pickedQty}</TableCell>
                  <TableCell>
                    {order.status === "IN_TRANSIT" ? (
                      <Input
                        type="number"
                        min={0}
                        max={line.pickedQty || line.requestedQty}
                        value={receivedQtys[line.id] ?? line.requestedQty}
                        onChange={(e) => setReceivedQtys(prev => ({ ...prev, [line.id]: parseInt(e.target.value) || 0 }))}
                        className="w-20"
                      />
                    ) : line.receivedQty}
                  </TableCell>
                  <TableCell>
                    {line.outboundLedger ? <Badge className="bg-red-100 text-red-800">-{Math.abs(line.outboundLedger.quantityDelta)}</Badge> : "—"}
                  </TableCell>
                  <TableCell>
                    {line.inboundLedger ? <Badge className="bg-green-100 text-green-800">+{line.inboundLedger.quantityDelta}</Badge> : "—"}
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
