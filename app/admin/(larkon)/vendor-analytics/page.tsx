"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminVendorAnalyticsApi } from "@/lib/adminApi";

export default function AdminVendorAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminVendorAnalyticsApi.summary();
        setData((res as any)?.data ?? res);
      } catch (e: any) {
        setErr(e?.message || "Failed to load");
      }
    })();
  }, []);

  const totals = data?.totals;
  const top = data?.topVendors ?? [];

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vendor analytics</h1>
        <p className="text-muted-foreground">Aggregate GRN and return counts by vendor (admin).</p>
      </div>
      {err && <p className="text-destructive text-sm">{err}</p>}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vendors</CardDescription>
            <CardTitle className="text-2xl">{totals?.vendorCount ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>GRNs</CardDescription>
            <CardTitle className="text-2xl">{totals?.grnCount ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Returns</CardDescription>
            <CardTitle className="text-2xl">{totals?.returnCount ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active listings</CardDescription>
            <CardTitle className="text-2xl">{totals?.activeListings ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Top vendors (recent)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Org</TableHead>
                <TableHead>GRNs</TableHead>
                <TableHead>Returns</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.orgId}</TableCell>
                  <TableCell>{v.grnCount}</TableCell>
                  <TableCell>{v.returnCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
