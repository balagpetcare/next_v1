"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/constants";

export default function ReconciliationPage() {
  const { user } = useAuthStore();
  const orgId = (user as any)?.ownedOrg?.id;
  const [locationId, setLocationId] = useState("");
  const [result, setResult] = useState(null as any);
  const [loading, setLoading] = useState(false);

  async function runReconciliation() {
    if (!orgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ orgId: String(orgId) });
      if (locationId) params.append("locationId", locationId);
      const res = await fetch(`${API_BASE_URL}/api/v1/inventory/reconciliation?${params}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        if (data.data.clean) toast.success("All balances reconciled — no variances detected");
        else toast.warning(`${data.data.varianceCount} variance(s) detected`);
      } else {
        toast.error(data.message);
      }
    } catch { toast.error("Reconciliation failed"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stock Reconciliation</h1>
        <p className="text-muted-foreground">Compare stock balances against ledger entries to detect variances</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Run Reconciliation</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>Location ID (optional)</Label>
              <Input
                type="number"
                placeholder="All locations"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-48"
              />
            </div>
            <Button onClick={runReconciliation} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Running..." : "Run Reconciliation"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Checked</CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{result.totalChecked}</div><p className="text-xs text-muted-foreground">variant-location pairs</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Variances Found</CardTitle>
                {result.varianceCount > 0 ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${result.varianceCount > 0 ? "text-yellow-600" : "text-green-600"}`}>{result.varianceCount}</div>
                <p className="text-xs text-muted-foreground">balance mismatches</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                {result.clean ? (
                  <Badge className="bg-green-100 text-green-800 text-sm"><CheckCircle2 className="mr-1 h-3 w-3" />Clean</Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-800 text-sm"><AlertTriangle className="mr-1 h-3 w-3" />Needs Review</Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {result.variances && result.variances.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Variance Details</CardTitle>
                <CardDescription>
                  These variant-location pairs have balance records that do not match their ledger sum
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead>Variant ID</TableHead>
                      <TableHead>Balance (On Hand)</TableHead>
                      <TableHead>Ledger Sum</TableHead>
                      <TableHead>On-Hand Variance</TableHead>
                      <TableHead>Balance (Reserved)</TableHead>
                      <TableHead>Ledger Reserved</TableHead>
                      <TableHead>Reserve Variance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.variances.map((v: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{v.locationName}</TableCell>
                        <TableCell className="font-mono">{v.variantId}</TableCell>
                        <TableCell>{v.balanceOnHand}</TableCell>
                        <TableCell>{v.ledgerOnHand}</TableCell>
                        <TableCell>
                          <Badge className={v.variance === 0 ? "bg-gray-100 text-gray-800" : v.variance > 0 ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}>
                            {v.variance > 0 ? `+${v.variance}` : v.variance}
                          </Badge>
                        </TableCell>
                        <TableCell>{v.balanceReserved}</TableCell>
                        <TableCell>{v.ledgerReserved}</TableCell>
                        <TableCell>
                          <Badge className={v.reserveVariance === 0 ? "bg-gray-100 text-gray-800" : "bg-orange-100 text-orange-800"}>
                            {v.reserveVariance > 0 ? `+${v.reserveVariance}` : v.reserveVariance}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {result.clean && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold">All Balances Match</h3>
                <p className="text-muted-foreground mt-2">Every stock balance record is consistent with its corresponding ledger entries.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
