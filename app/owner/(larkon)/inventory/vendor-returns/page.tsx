"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Eye, Filter } from "lucide-react";
import { format } from "date-fns/format";
import { useAuthStore } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/constants";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SUBMITTED: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  DISPATCHED: "bg-blue-100 text-blue-800",
  RECEIVED_BY_VENDOR: "bg-purple-100 text-purple-800",
  CREDITED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function VendorReturnsPage() {
  const { user } = useAuthStore();
  const orgId = (user as any)?.ownedOrg?.id;
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  useEffect(() => { fetchReturns(); }, [orgId, statusFilter, pagination.page]);

  async function fetchReturns() {
    if (!orgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ orgId: String(orgId), page: String(pagination.page), limit: "20" });
      if (statusFilter) params.append("status", statusFilter);
      const res = await fetch(`${API_BASE_URL}/api/v1/inventory/vendor-returns?${params}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) { setReturns(data.items || []); setPagination(data.pagination); }
      else toast.error(data.message);
    } catch { toast.error("Failed to load vendor returns"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendor Returns</h1>
          <p className="text-muted-foreground">Return stock to suppliers and track credits</p>
        </div>
        <Link href="/owner/inventory/vendor-returns/new">
          <Button><Plus className="mr-2 h-4 w-4" />New Return</Button>
        </Link>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
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
                <TableHead>Vendor</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Credit Expected</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : returns.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">No vendor returns found</TableCell></TableRow>
              ) : returns.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">#{r.id}</TableCell>
                  <TableCell>{r.vendor?.name}</TableCell>
                  <TableCell>{r.location?.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.reason}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[r.status]}>{r.status.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell>{r.creditExpected ? `$${Number(r.creditExpected).toFixed(2)}` : "-"}</TableCell>
                  <TableCell>{format(new Date(r.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/owner/inventory/vendor-returns/${r.id}`}>
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
