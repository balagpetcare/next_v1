"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Package,
  Send,
  Clock,
  User,
  MapPin,
  FileText,
} from "lucide-react";
import { format } from "date-fns/format";
import { API_BASE_URL } from "@/lib/constants";

interface WriteOffRequestDetail {
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
    branch: {
      id: number;
      name: string;
    };
  };
  requestedBy: {
    id: number;
    profile: {
      displayName: string;
      email: string;
    };
  };
  approvedBy?: {
    id: number;
    profile: {
      displayName: string;
      email: string;
    };
  } | null;
  lines: Array<{
    id: number;
    variantId: number;
    lotId: number | null;
    quantity: number;
    unitCost: string | null;
    note: string | null;
    ledgerId: number | null;
    ledger: {
      id: number;
      type: string;
      quantityDelta: number;
      createdAt: string;
    } | null;
    variant: {
      id: number;
      sku: string;
      title: string;
      product: {
        id: number;
        name: string;
      };
    };
    lot: {
      id: number;
      lotCode: string;
      expDate: string;
    } | null;
  }>;
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

export default function WriteOffDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [request, setRequest] = useState<WriteOffRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");

  useEffect(() => {
    fetchRequest();
  }, [id]);

  async function fetchRequest() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/inventory/write-off-requests/${id}`,
        { credentials: "include" }
      );
      const data = await res.json();

      if (data.success) {
        setRequest(data.data);
      } else {
        toast.error(data.message || "Failed to load write-off request");
      }
    } catch (err) {
      toast.error("Error loading write-off request");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    setActionLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/inventory/write-off-requests/${id}/approve`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await res.json();

      if (data.success) {
        toast.success("Write-off request approved");
        fetchRequest();
      } else {
        toast.error(data.message || "Failed to approve request");
      }
    } catch (err) {
      toast.error("Error approving request");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    setActionLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/inventory/write-off-requests/${id}/reject`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rejectionNote }),
        }
      );
      const data = await res.json();

      if (data.success) {
        toast.success("Write-off request rejected");
        setRejectDialogOpen(false);
        fetchRequest();
      } else {
        toast.error(data.message || "Failed to reject request");
      }
    } catch (err) {
      toast.error("Error rejecting request");
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePost() {
    setActionLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/inventory/write-off-requests/${id}/post`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await res.json();

      if (data.success) {
        toast.success("Write-off posted to ledger");
        fetchRequest();
      } else {
        toast.error(data.message || "Failed to post write-off");
      }
    } catch (err) {
      toast.error("Error posting write-off");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">Loading...</div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Write-off request not found</p>
        <Link href="/owner/inventory/write-offs">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Link href="/owner/inventory/write-offs">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Write-Offs
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            Write-Off Request #{request.id}
          </h1>
          <div className="flex items-center gap-2">
            <Badge className={reasonColors[request.reason]}>
              {reasonLabels[request.reason]}
            </Badge>
            <Badge className={statusColors[request.status]}>
              {request.status}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {request.status === "PENDING" && (
            <>
              <Button
                variant="outline"
                onClick={() => setRejectDialogOpen(true)}
                disabled={actionLoading}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </>
          )}
          {request.status === "APPROVED" && (
            <Button
              onClick={handlePost}
              disabled={actionLoading}
            >
              <Send className="mr-2 h-4 w-4" />
              Post to Ledger
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Location</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-medium">{request.location.name}</p>
            <p className="text-sm text-muted-foreground">
              {request.location.branch.name}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requested By</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-medium">
              {request.requestedBy.profile.displayName}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(request.createdAt), "MMM d, yyyy HH:mm")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Summary</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-medium">
              {request.totalQty} units
              {request.totalCost && (
                <span className="text-muted-foreground ml-1">
                  (${Number(request.totalCost).toFixed(2)})
                </span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {request.lines.length} line items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Approval Info */}
      {(request.approvedBy || request.approvedAt || request.rejectedAt) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Approval History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {request.approvedBy && request.status !== "REJECTED" && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    Approved by {request.approvedBy.profile.displayName}
                  </p>
                  {request.approvedAt && (
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(request.approvedAt), "MMM d, yyyy HH:mm")}
                    </p>
                  )}
                </div>
                <Badge className="bg-green-100 text-green-800">Approved</Badge>
              </div>
            )}
            {request.status === "REJECTED" && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    Rejected by {request.approvedBy?.profile.displayName}
                  </p>
                  {request.rejectedAt && (
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(request.rejectedAt), "MMM d, yyyy HH:mm")}
                    </p>
                  )}
                  {request.rejectionNote && (
                    <p className="text-sm text-red-600 mt-1">
                      Reason: {request.rejectionNote}
                    </p>
                  )}
                </div>
                <Badge className="bg-red-100 text-red-800">Rejected</Badge>
              </div>
            )}
            {request.postedAt && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Posted to ledger</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(request.postedAt), "MMM d, yyyy HH:mm")}
                  </p>
                </div>
                <Badge className="bg-blue-100 text-blue-800">Posted</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Note */}
      {request.note && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{request.note}</p>
          </CardContent>
        </Card>
      )}

      {/* Lines Table */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
          <CardDescription>Items to be written off</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Variant (SKU)</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {request.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">
                    {line.variant.product.name}
                  </TableCell>
                  <TableCell>{line.variant.title}</TableCell>
                  <TableCell>
                    {line.lot ? (
                      <div>
                        <p className="font-medium">{line.lot.lotCode}</p>
                        <p className="text-xs text-muted-foreground">
                          Exp: {format(new Date(line.lot.expDate), "MMM d, yyyy")}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{line.quantity}</TableCell>
                  <TableCell>
                    {line.unitCost
                      ? `$${Number(line.unitCost).toFixed(2)}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {line.ledger ? (
                      <Badge className="bg-green-100 text-green-800">
                        Posted #{line.ledger.id}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Write-Off Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this write-off request.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading || !rejectionNote.trim()}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
