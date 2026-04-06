"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Eye, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns/format";
import { useAuthStore } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/constants";

const STATUS_COLORS = {
  DRAFT: "bg-gray-100 text-gray-800",
  APPROVED: "bg-green-100 text-green-800",
  PICKING: "bg-yellow-100 text-yellow-800",
  IN_TRANSIT: "bg-blue-100 text-blue-800",
  RECEIVED: "bg-purple-100 text-purple-800",
  CLOSED: "bg-emerald-100 text-emerald-800",
};

export default function WarehouseTransfersPage() {
  const { user } = useAuthStore();
  const orgId = (user as any)?.ownedOrg?.id;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  useEffect(() => { fetchOrders(); }, [orgId, statusFilter, pagination.page]);

  async function fetchOrders() {
    if (!orgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ orgId: String(orgId), page: String(pagination.page), limit: "20" });
      if (statusFilter) params.append("status", statusFilter);
      const res = await fetch(`${API_BASE_URL}/api/v1/inventory/warehouse-transfer-orders?${params}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) { setOrders(data.items || []); setPagination(data.pagination); }
      else toast.error(data.message);
    } catch { toast.error("Failed to load transfer orders"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      {/* Deprecation Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="text-yellow-600 text-xl">⚠️</div>
          <div>
            <p className="font-semibold text-yellow-800">Legacy Warehouse Transfer Orders</p>
            <p className="text-sm text-yellow-700">
              This module is deprecated. For new inter-warehouse transfers, use{" "}
              <Link href="/owner/inventory/stock-requests" className="font-semibold underline">
                Stock Requests → Allocation → Dispatch
              </Link>{" "}
              which includes controlled receiving, manager confirmation, and full audit trail.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouse Transfer Orders (Legacy)</h1>
          <p className="text-muted-foreground">View existing orders — use Stock Requests for new transfers</p>
        </div>
        {/* New Transfer button redirects to canonical flow */}
        <Link href="/owner/inventory/stock-requests">
          <Button><Plus className="mr-2 h-4 w-4" />New Stock Request</Button>
        </Link>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            {Object.keys(STATUS_COLORS).map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : orders.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">No transfer orders found</TableCell></TableRow>
              ) : orders.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">#{o.id}</TableCell>
                  <TableCell>{o.fromLocation?.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                      {o.toLocation?.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={(STATUS_COLORS as any)[o.status]}>{o.status.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell>{o._count?.lines ?? 0}</TableCell>
                  <TableCell>{o.createdBy?.profile?.displayName}</TableCell>
                  <TableCell>{format(new Date(o.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/owner/inventory/warehouse-transfers/${o.id}`}>
                      <Button variant="ghost" size="sm"><Eye className="h-4 w-4 mr-1" />View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page <= 1}>Previous</Button>
            <Button variant="outline" onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= pagination.totalPages}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
