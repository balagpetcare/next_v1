"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plus,
  Filter,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Package,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns/format";
import { useAuthStore } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/constants";

interface WriteOffRequest {
  id: number;
  orgId: number;
  locationId: number;
  reason: "DAMAGE" | "THEFT" | "OBSOLETE" | "SAMPLE" | "OTHER";
  status: "PENDING" | "APPROVED" | "REJECTED" | "POSTED";
  note: string | null;
  totalQty: number;
  totalCost: string | null;
  requestedByUserId: number;
  approvedByUserId: number | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionNote: string | null;
  postedAt: string | null;
  createdAt: string;
  updatedAt: string;
  location: {
    id: number;
    name: string;
    type: string;
  };
  requestedBy: {
    id: number;
    profile: {
      displayName: string;
    };
  };
  approvedBy?: {
    id: number;
    profile: {
      displayName: string;
    };
  } | null;
  _count: {
    lines: number;
  };
}

const reasonLabels: Record<string, string> = {
  DAMAGE: "Damage",
  THEFT: "Theft",
  OBSOLETE: "Obsolete",
  SAMPLE: "Sample",
  OTHER: "Other",
};

const reasonColors: Record<string, string> = {
  DAMAGE: "bg-red-100 text-red-800",
  THEFT: "bg-red-100 text-red-800",
  OBSOLETE: "bg-yellow-100 text-yellow-800",
  SAMPLE: "bg-blue-100 text-blue-800",
  OTHER: "bg-gray-100 text-gray-800",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  POSTED: "bg-blue-100 text-blue-800",
};

export default function WriteOffsPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") || user?.ownedOrg?.id;

  const [requests, setRequests] = useState<WriteOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchWriteOffRequests();
  }, [orgId, statusFilter, pagination.page]);

  async function fetchWriteOffRequests() {
    if (!orgId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("orgId", orgId);
      if (statusFilter) params.append("status", statusFilter);
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());

      const res = await fetch(
        `${API_BASE_URL}/api/v1/inventory/write-off-requests?${params}`,
        { credentials: "include" }
      );
      const data = await res.json();

      if (data.success) {
        setRequests(data.items || []);
        setPagination(data.pagination);
      } else {
        toast.error(data.message || "Failed to load write-off requests");
      }
    } catch (err) {
      toast.error("Error loading write-off requests");
    } finally {
      setLoading(false);
    }
  }

  const filteredRequests = requests.filter(
    (req) =>
      req.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requestedBy.profile.displayName
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Write-Off Requests</h1>
          <p className="text-muted-foreground">
            Manage damage, theft, obsolete, and other stock write-offs
          </p>
        </div>
        <Link href="/owner/inventory/write-offs/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Write-Off Request
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Package className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter((r) => r.status === "PENDING").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter((r) => r.status === "APPROVED").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posted</CardTitle>
            <ArrowRight className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter((r) => r.status === "POSTED").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter((r) => r.status === "REJECTED").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="POSTED">Posted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Qty / Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    No write-off requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">#{req.id}</TableCell>
                    <TableCell>
                      <Badge className={reasonColors[req.reason]}>
                        {reasonLabels[req.reason]}
                      </Badge>
                    </TableCell>
                    <TableCell>{req.location.name}</TableCell>
                    <TableCell>{req._count.lines} items</TableCell>
                    <TableCell>
                      {req.totalQty} units
                      {req.totalCost && (
                        <span className="text-muted-foreground ml-1">
                          (${Number(req.totalCost).toFixed(2)})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[req.status]}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {req.requestedBy.profile.displayName}
                    </TableCell>
                    <TableCell>
                      {format(new Date(req.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/owner/inventory/write-offs/${req.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setPagination((p) => ({ ...p, page: p.page - 1 }))
              }
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setPagination((p) => ({ ...p, page: p.page + 1 }))
              }
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
